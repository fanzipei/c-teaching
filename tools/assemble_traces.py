"""Turn compiler snapshots into the existing demo-engine visualization schema."""
from pathlib import Path
import copy
import json
import re
import hashlib
import sys

ROOT=Path(__file__).resolve().parent.parent
def address(s):
    try:return int(s,16)
    except (ValueError,TypeError):return 0
def plain(v):
    if isinstance(v,dict):return v.get('text',v.get('pointer',str(v)))
    return v

def assemble(cfg,raw):
    steps=[];address_regions=[];previous={};last_output='';last_flow=None;freed_targets=set();object_memory={}
    tree=[];tree_edges=[];tree_stack=[];pegs={'A':[3,2,1],'B':[],'C':[]}
    vt=cfg['vizTypes'];source=cfg['code'].splitlines()
    flow=cfg.get('flowchart',{});nodes={n['id']:n for n in flow.get('nodes',[])}
    old_flow={}
    for s in cfg['steps']:
        if s.get('flow',{}).get('node') in nodes:old_flow.setdefault(s['line'],[]).append(s['flow']['node'])

    def register_address(s,size=1):
        n=address(s)
        if not n:return
        if any(base<=n and n+size<=base+length for base,length,_ in address_regions):return
        virtual=0x1000 if not address_regions else max(v+((length+31)//32)*32 for _,length,v in address_regions)
        address_regions.append((n,size,virtual))
    def addr(s):
        n=address(s)
        if not n:return 'NULL'
        register_address(s)
        base,_,virtual=next(region for region in reversed(address_regions) if region[0]<=n<region[0]+region[1])
        return hex(virtual+n-base)
    def display(value,char=False):
        if isinstance(value,dict):
            if 'pointer' in value:return value.get('text',addr(value['pointer']))
            return '{'+', '.join(k+'='+str(display(v)) for k,v in value.items())+'}'
        if char and isinstance(value,int):return '\\0' if value==0 else chr(value)
        if isinstance(value,list):return '['+', '.join(str(display(v,char)) for v in value)+']'
        return value
    def fields(value,prefix=''):
        out=[]
        for k,v in value.items():
            if k=='name' and isinstance(v,list):v=''.join(chr(c) for c in v[:v.index(0) if 0 in v else len(v)] if isinstance(c,int))
            if isinstance(v,dict) and 'pointer' not in v:out.extend(fields(v,prefix+k+'.'))
            else:out.append({'name':prefix+k,'value':display(v)})
        return out

    for event in raw:
        line=event['line'];phase=event['phase'];expr=event['expression']
        assert 0<=line<len(source),(cfg['title'],event)
        visible={v['name']:v for v in event['variables']}
        # Keep caller objects visible when a callee shadows their names.
        # The innermost name stays unqualified for expression/index evaluation.
        for v in event['variables']:
            if visible[v['name']] is not v:
                visible[f'{event["frames"][v["depth"]]}[{v["depth"]}].{v["name"]}']=v
        for v in event['variables']:
            register_address(v['addr'],v['size'])
        for v in event['variables']:
            value=v['value']
            if isinstance(value,dict) and 'pointer' in value:
                if 'elements' in value:freed_targets.discard(address(value['pointer']))
                if 'text' in value:register_address(value['pointer'],len(value['text'].encode())+1)
                elif 'elements' in value:register_address(value['pointer'],len(value['elements'])*4)
        released=re.fullmatch(r'free\((\w+)\)',expr) if phase=='statement' else None
        if released:
            value=visible.get(released[1],{}).get('value',{})
            if isinstance(value,dict) and address(value.get('pointer')):
                freed_targets.add(address(value['pointer']))
                object_memory.pop(addr(value['pointer']),None)
        scalars={k:v['value'] for k,v in visible.items() if isinstance(v['value'],(int,float))}
        variables={};arrays=[];matrices=[];pointers=[];structs=[];memory=[];memory_targets=set()
        touched=re.findall(r'\b([a-zA-Z_]\w*)\s*\[([^\]]+)\](?:\s*\[([^\]]+)\])?',expr)
        accesses={}
        for name,a,b in touched:
            indexes=[]
            try:
                for item in [a,b] if b else [a]:
                    item=re.sub(r'\b[A-Za-z_]\w*\b',lambda m:str(scalars.get(m[0],'?')),item)
                    if not re.fullmatch(r'[\d\s()+*/%.-]+',item):raise ValueError()
                    indexes.append(int(eval(item,{'__builtins__':{}},{})))
                accesses.setdefault(name,[]).append(indexes)
            except (ValueError,SyntaxError,ZeroDivisionError):pass
        for name,v in visible.items():
            value=v['value'];typ=v['type'];char=bool(re.search(r'\bchar\b',typ))
            variables[name]={'value':display(value,char and not isinstance(value,dict)),'type':typ}
            pointer_value=isinstance(value,dict) and 'pointer' in value
            if pointer_value:variables[name]['value']=addr(value['pointer'])
            memory.append({'name':name,'addr':addr(v['addr']),'val':addr(value['pointer']) if pointer_value else display(value,char),'storage':('静态存储期' if v['depth']<0 else '调用帧：'+event['frames'][v['depth']]),'highlight':previous.get(name)!=value})
            if pointer_value and address(value['pointer']) in freed_targets:
                variables[name]['value']='失效指针'
                memory[-1]['val']='失效指针'
            if isinstance(value,list):
                if value and isinstance(value[0],list):
                    cells=[]
                    for i,row in enumerate(value):
                        cells.append([{'val':display(x,char),'highlight':[i,j] in accesses.get(name,[]) or previous.get(name,[[]]*len(value))[i][j:j+1]!=[x]} for j,x in enumerate(row)])
                    matrices.append({'name':name,'rows':len(value),'cols':len(value[0]),'cells':cells})
                    variables[name]['value']=f'{len(value)} × {len(value[0])}'
                elif value and isinstance(value[0],dict) and 'pointer' not in value[0]:
                    for i,item in enumerate(value):structs.append({'name':f'{name}[{i}]','fields':fields(item)})
                    variables[name]['value']=f'{len(value)} 个结构体'
                else:
                    old=previous.get(name,[])
                    cells=[{'val':display(x,char),'highlight':[i] in accesses.get(name,[]) or i>=len(old) or old[i]!=x,'empty':x=='未初始化'} for i,x in enumerate(value)]
                    # Stack and queue validity is defined by their indices, not the bytes left in memory.
                    if name in ('stack','s') and 'top' in scalars:
                        for i,cell in enumerate(cells):cell['empty']=i>scalars['top']
                    if name=='queue' and 'front' in scalars and 'rear' in scalars:
                        for i,cell in enumerate(cells):cell['empty']=not scalars['front']<=i<scalars['rear']
                    markers=[]
                    index_names=set(re.findall(r'\b'+re.escape(name)+r'\s*\[\s*([A-Za-z_]\w*)\s*\]',cfg['code']))
                    if name=='stack':index_names.add('top')
                    if name=='queue':index_names.update(['front','rear'])
                    for index_name in sorted(index_names):
                        if index_name in scalars and 0<=scalars[index_name]<len(cells):markers.append({'index':scalars[index_name],'label':index_name})
                    for index in accesses.get(name,[]):
                        if len(index)==1 and 0<=index[0]<len(cells) and not any(m['index']==index[0] for m in markers):markers.append({'index':index[0],'label':'当前访问'})
                    arrays.append({'name':name,'cells':cells,'markers':markers})
                    variables[name]['value']=f'{len(value)} 个元素'
            elif isinstance(value,dict) and 'pointer' not in value:
                structs.append({'name':name,'addr':addr(v['addr']),'fields':fields(value)})
                variables[name]['value']=typ
            elif isinstance(value,dict) and 'pointer' in value:
                pointer=value['pointer'];target=value.get('target','未初始化或不可访问')
                if 'text' in value:target=value['text'][0] if value['text'] else '\\0'
                target_name=next((label for label,other in visible.items() if address(other['addr'])==address(pointer)), '')
                array_backed=False
                for other in event['variables']:
                    if isinstance(other['value'],list) and address(other['addr'])<=address(pointer)<address(other['addr'])+other['size']:
                        count=len(other['value']);offset=(address(pointer)-address(other['addr']))//(other['size']//count)
                        target_name=f'{other["name"]}[{offset}]'
                        array_backed=True
                        for a in arrays:
                            if a['name']==other['name']:a.setdefault('markers',[]).append({'index':offset,'label':name})
                if not address(pointer):target='无目标对象'
                if address(pointer) in freed_targets:
                    target_name='已释放的对象';target='不可访问（已释放）'
                if 'elements' in value:
                    target_name=target_name or '动态分配的对象（堆）'
                    if pointer not in memory_targets:
                        memory.append({'name':'动态分配的对象','addr':addr(pointer),'val':display(value['elements']),'storage':'堆：直到 free 释放','highlight':previous.get(name)!=value})
                        memory_targets.add(pointer)
                if 'text' in value and not array_backed and pointer not in memory_targets:
                    target_name=target_name or '字符串字面量'
                    memory.append({'name':'字符串字面量','addr':addr(pointer),'val':value['text']+'\\0','storage':'静态存储期，不可修改','highlight':previous.get(name)!=value})
                    memory_targets.add(pointer)
                target_type=re.sub(r'\*\s*(?:(?:const|volatile|restrict)\s*)*$','',typ).strip()
                if target_type==typ:
                    target_type=re.sub(r'\s*\(\s*\*\s*(?:(?:const|volatile|restrict)\s*)*\)(?=\[)','',typ)
                pointers.append({'name':name,'type':typ,'addr':addr(v['addr']),'value':'失效指针' if address(pointer) in freed_targets else addr(pointer),'targetName':target_name or ('NULL' if not address(pointer) else '指向的对象'),'targetAddr':addr(pointer),'targetValue':display(target,char),'targetType':target_type})
                if isinstance(target,dict) and 'pointer' not in target:structs.append({'name':'*'+name,'addr':addr(pointer),'fields':fields(target)})
                if 'text' in value and 'array' in vt and not array_backed:
                    arrays.append({'name':name,'cells':[{'val':c} for c in value['text']]+[{'val':'\\0'}]})
                if 'elements' in value and 'array' in vt:
                    arrays.append({'name':name+'（堆）','cells':[{'val':display(c),'empty':c=='未初始化','highlight':[i] in accesses.get(name,[])} for i,c in enumerate(value['elements'])]})
        if 'str' in visible and 'p' in visible and isinstance(visible['str']['value'],dict) and isinstance(visible['p']['value'],dict):
            offset=address(visible['p']['value'].get('pointer'))-address(visible['str']['value'].get('pointer'))
            for a in arrays:
                if a['name']=='str' and 0<=offset<len(a['cells']):a['markers']=[{'index':offset,'label':'p'}];a['cells'][offset]['highlight']=True
        # Objects outlive pointer variables: retain literals, and heap blocks until free.
        for cell in memory:
            if cell['name'] in ('动态分配的对象','字符串字面量'):
                object_memory[cell['addr']]=copy.deepcopy(cell)
        current_addresses={cell['addr'] for cell in memory}
        for location,cell in object_memory.items():
            if location not in current_addresses:memory.append({**cell,'highlight':False})
        for a in arrays:
            grouped={}
            for marker in a.get('markers',[]):grouped.setdefault(marker['index'],[]).append(marker['label'])
            if grouped:a['markers']=[{'index':index,'label':' / '.join(dict.fromkeys(labels))} for index,labels in grouped.items()]
        for filename,content in event.get('files',{}).items():variables[filename]={'type':'文件内容','value':content.replace('\n','\\n') or '空'}
        info={'enter':'进入函数：','declaration':'声明：','initialize':'循环初始化：','update':'循环更新：','statement':'执行：','call':'调用函数：','resume':'调用返回：','return':'返回：','switch':'选择分支：','case':'进入分支：'}.get(phase,'执行：')+expr
        if phase=='condition':info='判断 '+expr+'：'+('真，继续相应分支。' if event['result'] else '假，跳过相应分支或退出循环。')
        if phase=='return' and event.get('return'):info+='，返回值 '+event['return']
        if phase=='declaration' and any(v['value']=='未初始化' for v in variables.values()):info+='；未赋初值的变量显示为“未初始化”。'
        note=cfg.get('stepNotes',{}).get(source[line].strip())
        if note and phase not in ('call','resume'):info+='。'+note
        # Values are complete snapshots; leaving a scope must remove its locals.
        s={'line':line,'phase':phase,'info':info,'stateComplete':True,'vars':variables}
        for key,data in [('array',arrays),('matrix',matrices),('pointer',pointers),('struct',structs),('memory',memory)]:
            if key in vt:s[key]=data
        if event['output']!=last_output:s['output']=event['output'];s['outputMode']='replace'
        if 'stack' in vt:
            s['stack']=[]
            for depth,name in enumerate(event['frames']):
                values=[]
                for v in event['variables']:
                    if v['depth']!=depth:continue
                    value=v['value']
                    if isinstance(value,dict) and 'pointer' in value:
                        text='失效指针' if address(value['pointer']) in freed_targets else addr(value['pointer'])
                    else:text=str(display(value))
                    values.append(v['name']+'='+text)
                frame={'name':name,'value':', '.join(values),'highlight':depth==event['depth']}
                if phase=='return' and depth==event['depth'] and event.get('return'):frame['ret']=event['return']
                s['stack'].append(frame)
        if 'loop' in vt:s['loop']=[{'label':name+'='+str(scalars[name]),'active':True} for name in ['i','j','k','n','steps','top','front','rear'] if name in scalars]
        if 'branch' in vt:
            s['branch']=[{'label':expr+' → 真','active':bool(event['result'])},{'label':expr+' → 假','active':not event['result']}] if phase=='condition' else []
        if 'flowchart' in vt:
            candidates=list(dict.fromkeys(old_flow.get(line,[])))
            candidates=[id for id in candidates if (nodes[id]['type']=='decision')==(phase in ('condition','switch'))]
            if phase=='update':candidates=[id for id in candidates if 'update' in id.lower() or '++' in nodes[id]['label'] or '--' in nodes[id]['label']]
            elif phase in ('initialize','condition'):candidates=[id for id in candidates if 'update' not in id.lower()]
            if phase=='return' and event['depth']==0:candidates=[id for id,n in nodes.items() if n['type']=='end']
            node=candidates[0] if candidates else None
            s['flow']={'node':node,'detail':f'第 {line+1} 行 · '+info}
            if node and last_flow and node!=last_flow and any(e['from']==last_flow and e['to']==node for e in flow.get('edges',[])):s['flow']['edge']={'from':last_flow,'to':node}
            if node:last_flow=node
        if 'linkedlist' in vt:
            ns={address(v['addr']):v for v in event['variables'] if isinstance(v['value'],dict) and 'data' in v['value']}
            head=visible.get('head',{}).get('value',{});p=visible.get('p',{}).get('value',{})
            order=[];cursor=address(head.get('pointer')) if isinstance(head,dict) else 0
            while cursor in ns and cursor not in order:
                order.append(cursor);cursor=address(ns[cursor]['value']['next']['pointer'])
            if 'head' not in visible:order=list(reversed(list(ns)))
            s['linkedlist']=[{'label':ns[a]['name']+(' ← p' if isinstance(p,dict) and address(p.get('pointer'))==a else ''),'data':ns[a]['value']['data'],'addr':addr(ns[a]['addr']),'nextNull':not address(ns[a]['value']['next']['pointer']),'highlight':isinstance(p,dict) and address(p.get('pointer'))==a} for a in order]
        if 'hanoi' in vt:
            addition=event['output'][len(last_output):]
            for start,end in re.findall(r'([ABC]) -> ([ABC])',addition):pegs[end].append(pegs[start].pop())
            s['hanoi']=[{'peg':name,'disks':list(disks)} for name,disks in pegs.items()]
        if 'graph' in vt:
            if 'g' in visible and isinstance(visible['g']['value'],list):
                matrix=visible['g']['value'];graph_nodes=[{'id':chr(65+i),'label':chr(65+i),'x':30+140*(i%2),'y':20+120*(i//2),'highlight':scalars.get('i')==i} for i in range(len(matrix))]
                s['graph']={'nodes':graph_nodes,'edges':[{'from':chr(65+i),'to':chr(65+j)} for i in range(len(matrix)) for j in range(i+1,len(matrix)) if matrix[i][j]==1]}
            elif event['frames'][-1:] == ['fib'] or tree:
                if phase=='enter' and event['frames'][-1]=='fib':
                    while len(tree_stack)>=event['depth']:tree_stack.pop()
                    node={'id':'call'+str(len(tree)),'label':'fib('+str(scalars.get('n'))+')','x':0,'y':60*(event['depth']-1),'highlight':True}
                    if tree_stack:tree_edges.append({'from':tree_stack[-1],'to':node['id']})
                    tree.append(node);tree_stack.append(node['id'])
                for n in tree:n['highlight']=bool(tree_stack and n['id']==tree_stack[-1] and event['depth']>0)
                if phase=='return' and event['frames'][-1]=='fib':
                    node=next(n for n in tree if n['id']==tree_stack[-1]);node['done']=True;node['sub']='= '+event.get('return','');tree_stack.pop()
                s['graph']={'nodes':copy.deepcopy(tree),'edges':copy.deepcopy(tree_edges)}
            else:s['graph']={'nodes':[],'edges':[]}
        previous={name:copy.deepcopy(v['value']) for name,v in visible.items()};last_output=event['output'];steps.append(s)
    if tree:
        positions={};leaf=[0]
        def place(id):
            children=[e['to'] for e in tree_edges if e['from']==id]
            if children:positions[id]=sum(place(c) for c in children)/len(children)
            else:positions[id]=20+leaf[0]*58;leaf[0]+=1
            return positions[id]
        place(tree[0]['id'])
        for s in steps:
            for n in s.get('graph',{}).get('nodes',[]):n['x']=positions[n['id']]
    return steps

def main():
    if len(sys.argv)!=3:raise SystemExit('Usage: assemble_traces.py INPUT_JSON RAW_JSON (or npm run build:traces)')
    input_path=Path(sys.argv[1])
    raw_path=Path(sys.argv[2])
    configs=json.loads(input_path.read_text(encoding='utf8'))
    raw=json.loads(raw_path.read_text(encoding='utf8'))
    result={}
    for key,events in raw.items():
        page,id=key.split(':');result[key]=assemble(configs[page][id],events)
    hashes={key:hashlib.sha256(configs[key.split(':')[0]][key.split(':')[1]]['code'].encode()).hexdigest() for key in result}
    text='/* Generated by npm run build:traces. Do not edit snapshots by hand. */\nwindow.CTeachingTraceSources = '+json.dumps(hashes,indent=2)+';\nwindow.CTeachingTraces = {\n'
    text+=',\n'.join(json.dumps(key)+': [\n'+',\n'.join(json.dumps(step,ensure_ascii=False,separators=(',',':')) for step in steps)+'\n]' for key,steps in result.items())+'\n};\n'
    (ROOT/'demo-traces.js').write_text(text,encoding='utf8')
    print(len(result),'traces;',sum(len(s) for s in result.values()),'steps')

if __name__=='__main__':main()
