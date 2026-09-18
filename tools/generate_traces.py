"""Build statement-level demo traces with GCC; pycparser locates C statements.

Arguments: browser configuration JSON, output trace JSON (temporary build files).
The generated C runs only in a temporary directory. No browser C execution.
"""
from pathlib import Path
import copy
import json
import os
import re
import subprocess
import tempfile
import ast
import sys
import shutil
from pycparser import c_ast as A, c_parser, c_generator

ROOT = Path(__file__).resolve().parent.parent
GEN = c_generator.CGenerator()
def q(s): return json.dumps(s, ensure_ascii=False)

class Instrument:
    def __init__(self, config):
        self.config=config
        self.source=config['code']
        clean=re.sub(r'^\s*#.*$', '', self.source, flags=re.M)
        clean=re.sub(r'//[^\n]*','',clean)
        clean=re.sub(r'/\*.*?\*/',lambda m:'\n'*m[0].count('\n'),clean,flags=re.S)
        self.ast=c_parser.CParser().parse('typedef int FILE; typedef unsigned long size_t;\n'+clean)
        self.serializers=[];self.types=[];self.counter=0;self.loops=[];self.functions={}
        self.structs={};self.aliases={}
        for node in self.ast.ext[2:]:
            if isinstance(node,A.FuncDef):self.functions[node.decl.name]=node
            if isinstance(node,A.Typedef):self.aliases[node.name]=node.type
            for _,child in node.children(): self.find_structs(child)
        self.globals=[n for n in self.ast.ext[2:] if isinstance(n,A.Decl) and n.name and not isinstance(n.type,A.FuncDecl)]

    def find_structs(self,node):
        if isinstance(node,A.Struct) and node.name and node.decls:self.structs[node.name]=node
        for _,child in node.children():self.find_structs(child)

    def line(self,node): return node.coord.line-2
    def text(self,node):return GEN.visit(node) if node else ''
    def snap(self,node,phase='statement',result='0',text=None):
        return f'ct_snapshot({self.line(node)}, {q(phase)}, {q(self.text(node) if text is None else text)}, {result});'

    def expr(self,n):
        if n is None:return ''
        if isinstance(n,A.InitList):return '{'+', '.join(self.expr(x) for x in n.exprs)+'}'
        if isinstance(n,A.Assignment):
            return '({ __auto_type _ct_p = &('+self.expr(n.lvalue)+'); __auto_type _ct_value = ('+self.expr(n.rvalue)+'); *_ct_p '+n.op+' _ct_value; ct_mark(_ct_p,sizeof(*_ct_p)); *_ct_p; })'
        if isinstance(n,A.UnaryOp) and n.op in ('p++','p--','++','--'):
            op='++' if '+' in n.op else '--'
            value='(*_ct_p)'+op if n.op.startswith('p') else op+'(*_ct_p)'
            return '({ __auto_type _ct_p=&('+self.expr(n.expr)+'); __auto_type _ct_value='+value+'; ct_mark(_ct_p,sizeof(*_ct_p)); _ct_value; })'
        if isinstance(n,A.BinaryOp):return '('+self.expr(n.left)+' '+n.op+' '+self.expr(n.right)+')'
        if isinstance(n,A.UnaryOp):
            if n.op=='sizeof':return 'sizeof('+self.text(n.expr)+')'
            return n.op+'('+self.expr(n.expr)+')'
        if isinstance(n,A.Cast):return '('+self.text(n.to_type)+')('+self.expr(n.expr)+')'
        if isinstance(n,A.TernaryOp):return '('+self.expr(n.cond)+' ? '+self.expr(n.iftrue)+' : '+self.expr(n.iffalse)+')'
        if isinstance(n,A.FuncCall):
            name=self.text(n.name);call=name+'('+self.expr(n.args)+')'
            if name in self.functions:
                returns=self.resolve(self.functions[name].decl.type.type)
                void=isinstance(returns,A.IdentifierType) and returns.names==['void']
                return '({'+self.snap(n,'call')+('' if void else '__auto_type _ct_call_result=')+call+';'+self.snap(n,'resume')+('' if void else '_ct_call_result;')+'})'
            return call
        if isinstance(n,A.ExprList):return ', '.join(self.expr(x) for x in n.exprs)
        if isinstance(n,A.ArrayRef):return self.expr(n.name)+'['+self.expr(n.subscript)+']'
        if isinstance(n,A.StructRef):return self.expr(n.name)+n.type+self.text(n.field)
        return self.text(n)

    def condition(self,node):
        return '({ int _ct_condition=!!('+self.expr(node)+'); '+self.snap(node,'condition','_ct_condition')+' _ct_condition; })'

    def resolve(self,t):
        if isinstance(t,A.TypeDecl):
            if isinstance(t.type,A.IdentifierType) and len(t.type.names)==1 and t.type.names[0] in self.aliases:return self.resolve(self.aliases[t.type.names[0]])
            return self.resolve(t.type)
        if isinstance(t,A.Struct) and not t.decls:return self.structs[t.name]
        return t

    def ser(self,t,expr,depth=0):
        t=self.resolve(t)
        if isinstance(t,A.ArrayDecl):
            size=self.text(t.dim) if t.dim else f'(sizeof({expr})/sizeof(({expr})[0]))'
            self.counter+=1; i=f'_ct_i{self.counter}'
            return f'fputc(\'[\',stderr); for(int {i}=0;{i}<{size};{i}++){{if({i})fputc(\',\',stderr);'+self.ser(t.type,f'({expr})[{i}]',depth)+"}fputc(']',stderr);"
        if isinstance(t,A.Struct):
            code="fputc('{',stderr);"
            for i,d in enumerate(t.decls):
                if i:code+="fputc(',',stderr);"
                code+='ct_string('+q(d.name)+");fputc(':',stderr);"+self.ser(d.type,f'({expr}).{d.name}',depth)
            return code+"fputc('}',stderr);"
        check=f'if(!ct_defined(&({expr}),sizeof({expr}))) ct_string("未初始化"); else '
        if isinstance(t,A.PtrDecl):
            code=check+'{fprintf(stderr,"{\\"pointer\\":\\"%p\\"",(void*)('+expr+'));'
            target=self.resolve(t.type)
            if isinstance(target,A.IdentifierType) and target.names==['char']:
                code+='if('+expr+'){fprintf(stderr,",\\"text\\":");ct_string('+expr+');}'
            elif depth<2 and not (isinstance(target,A.IdentifierType) and target.names in (['FILE'],['void'])):
                code+='if(('+expr+') && ct_any_defined('+expr+',sizeof(*('+expr+')))){fprintf(stderr,",\\"target\\":");'+self.ser(t.type,'*('+expr+')',depth+1)+'}'
                if isinstance(target,A.IdentifierType):
                    code+='if(ct_allocation_size('+expr+')){fprintf(stderr,",\\"elements\\":[");for(size_t _ct_heap_i=0;_ct_heap_i<ct_allocation_size('+expr+')/sizeof(*('+expr+'));_ct_heap_i++){if(_ct_heap_i)fputc(\',\',stderr);'+self.ser(t.type,'('+expr+')[_ct_heap_i]',depth+1)+"}fputc(']',stderr);}"
            return code+"fputc('}',stderr);}"
        names=t.names if isinstance(t,A.IdentifierType) else []
        if 'float' in names or 'double' in names:return check+f'fprintf(stderr,"%.12g",(double)({expr}));'
        return check+f'fprintf(stderr,"%lld",(long long)({expr}));'

    def register(self,d,param=False,global_=False):
        if not d.name:return ''
        t=copy.deepcopy(d.type)
        if param and isinstance(t,A.ArrayDecl):t=A.PtrDecl([],t.type)
        if isinstance(t,A.ArrayDecl) and t.dim is None:
            size=len(ast.literal_eval(d.init.value).encode('utf-8'))+1 if isinstance(d.init,A.Constant) else len(d.init.exprs)
            t.dim=A.Constant('int',str(size))
        idx=len(self.types);name=f'ct_type_{idx}';fn=f'ct_ser_{idx}'
        leaf=t
        while not isinstance(leaf,A.TypeDecl):leaf=leaf.type
        leaf.declname=name
        if isinstance(leaf.type,A.Struct) and leaf.type.name:leaf.type.decls=None
        typedef=A.Typedef(name,[],['typedef'],t)
        self.types.append(self.text(typedef)+';')
        self.serializers.append(f'static void {fn}(const void *addr){{const {name} *v=(const {name}*)addr;'+self.ser(t,'(*v)')+'}')
        initialized=param or global_ or d.init is not None
        typename=self.text(d.type)
        return f'ct_register({q(d.name)},{q(typename)},&{d.name},sizeof({d.name}),{fn},{int(initialized)});'

    def stmt(self,n,phase='statement'):
        if n is None:return ''
        if isinstance(n,A.Compound):
            return '{ int _ct_block_scope=++ct_scope;\n'+ '\n'.join(self.stmt(x) for x in (n.block_items or []))+'\nct_scope_leave(_ct_block_scope); }'
        if isinstance(n,A.Decl):
            if not n.name:return self.text(n)+';'
            declaration=copy.deepcopy(n);declaration.init=None
            code=self.text(declaration)+(' = '+self.expr(n.init) if n.init else '')
            return code+';'+self.register(n)+self.snap(n,'declaration')
        if isinstance(n,A.DeclList):return '\n'.join(self.stmt(x) for x in n.decls)
        if isinstance(n,A.If):return 'if('+self.condition(n.cond)+') '+self.body(n.iftrue)+(' else '+self.body(n.iffalse) if n.iffalse else '')
        if isinstance(n,(A.For,A.While,A.DoWhile,A.Switch)):
            self.counter+=1;scope=f'_ct_loop_scope{self.counter}'
            self.loops.append(scope)
            if isinstance(n,A.For):
                init=self.stmt(n.init,'initialize')
                update=self.expr(n.next)+';'+self.snap(n.next,'update') if n.next else ''
                code=init+'for(;'+(self.condition(n.cond) if n.cond else '1')+';({'+update+'}))'+self.body(n.stmt)
            elif isinstance(n,A.While):code='while('+self.condition(n.cond)+')'+self.body(n.stmt)
            elif isinstance(n,A.DoWhile):code='do '+self.body(n.stmt)+' while('+self.condition(n.cond)+');'
            else:
                expr='({int _ct_switch='+self.expr(n.cond)+';'+self.snap(n.cond,'switch','_ct_switch')+'_ct_switch;})'
                code='switch('+expr+')'+self.body(n.stmt)
            self.loops.pop()
            return '{int '+scope+'=ct_scope;'+code+'}'
        if isinstance(n,(A.Case,A.Default)):
            label='case '+self.text(n.expr) if isinstance(n,A.Case) else 'default'
            return label+':;'+self.snap(n,'case',text=label)+''.join(self.stmt(x) for x in n.stmts)
        if isinstance(n,(A.Break,A.Continue)):
            return self.snap(n,phase)+f'while(ct_scope>{self.loops[-1]})ct_scope_leave(ct_scope);'+self.text(n)+';'
        if isinstance(n,A.Return):
            pre=''
            value='__auto_type _ct_ret=('+self.expr(n.expr)+');' if n.expr else ''
            result=('snprintf(ct_return_text,sizeof(ct_return_text),"%p",(void*)_ct_ret);' if isinstance(self.return_type,A.PtrDecl) else 'snprintf(ct_return_text,sizeof(ct_return_text),"%.12g",(double)_ct_ret);') if n.expr else ''
            return '{'+pre+value+result+self.snap(n,'return')+'ct_leave();ct_scope=_ct_saved_scope;return'+(' _ct_ret' if n.expr else '')+';}'
        if isinstance(n,A.EmptyStatement):return ';'
        pre=''
        return pre+self.expr(n)+';'+self.snap(n,phase)

    def body(self,n):return self.stmt(n) if isinstance(n,A.Compound) else '{'+self.stmt(n)+'}'
    def walk(self,n):
        if n:
            yield n
            for _,child in n.children():yield from self.walk(child)

    def build(self):
        top=[];functions=[]
        for n in self.ast.ext[2:]:
            if not isinstance(n,A.FuncDef):top.append(self.text(n)+';');continue
            params=n.decl.type.args.params if n.decl.type.args else []
            self.return_type=n.decl.type.type
            register=''.join(self.register(p,param=True) for p in params if isinstance(p,A.Decl))
            global_init=''.join(self.register(d,global_=True) for d in self.globals) if n.decl.name=='main' else ''
            body=self.stmt(n.body)
            endline=max(x.coord.line for x in self.walk(n.body) if x.coord)-2
            # The closing brace is the implicit return of a void function.
            if isinstance(self.resolve(n.decl.type.type),A.IdentifierType) and self.resolve(n.decl.type.type).names==['void']:
                tail=f'ct_snapshot({endline+1},"return","return",0);ct_leave();ct_scope=_ct_saved_scope;'
            else:tail=''
            functions.append(self.text(n.decl)+'{int _ct_saved_scope=ct_scope;'+global_init+f'ct_enter({q(n.decl.name)});'+register+self.snap(n,'enter',text=n.decl.name+'()')+body+tail+'}')
        defines='\n'.join(line for line in self.source.splitlines() if line.lstrip().startswith('#define'))
        return '#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n'+defines+'\n#include "'+str(ROOT/'tools/trace-runtime.h').replace('\\','/')+'"\n'+'\n'.join(top+self.types+self.serializers+functions)

def main():
    if len(sys.argv)!=3:raise SystemExit('Usage: generate_traces.py INPUT_JSON OUTPUT_JSON (or npm run build:traces)')
    input_path=Path(sys.argv[1])
    output_path=Path(sys.argv[2])
    configs=json.loads(input_path.read_text(encoding='utf-8'))
    results={};errors=[]
    env=dict(os.environ)
    compiler=shutil.which('gcc')
    if not compiler:raise SystemExit('gcc is required to rebuild execution traces')
    env['PATH']=str(Path(compiler).parent)+os.pathsep+env.get('PATH','')
    with tempfile.TemporaryDirectory(prefix='cteaching-trace-') as temp:
        folder=Path(temp)
        for page,items in configs.items():
            for id,cfg in items.items():
                if cfg.get('input') or (page=='datatype.html' and id=='demo4'):continue
                key=page+':'+id
                try:
                    instrument=Instrument(cfg);code=instrument.build()
                    (folder/'trace.c').write_text(code,encoding='utf-8')
                    exe=folder/('trace.exe' if os.name=='nt' else 'trace')
                    compiled=subprocess.run(['gcc','-std=gnu11','-O0','-w',str(folder/'trace.c'),'-o',str(exe)],capture_output=True,env=env)
                    if compiled.returncode:raise RuntimeError(compiled.stderr.decode('utf-8',errors='replace')[:2200])
                    run=subprocess.run([str(exe)],cwd=folder,capture_output=True,timeout=10,env=env)
                    if run.returncode:raise RuntimeError(f'exit {run.returncode}: '+run.stderr.decode('utf-8',errors='replace')[-600:])
                    trace=[json.loads(line) for line in run.stderr.decode('utf-8').splitlines()]
                    results[key]=trace
                    print(key,len(trace),flush=True)
                except Exception as error:
                    errors.append(key);print('FAIL',key,error,flush=True)
    if errors:raise SystemExit('Trace generation failed: '+', '.join(errors))
    output_path.write_text(json.dumps(results,ensure_ascii=False),encoding='utf-8')
    print('Failures:',errors)

if __name__=='__main__':main()
