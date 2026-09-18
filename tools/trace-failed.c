#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "C:/Users/fanzi/Documents/work/c-teaching/c-teaching-web/tools/trace-runtime.h"
struct Point
{
  int x;
  int y;
};
typedef struct Point ct_type_0;
typedef struct Point *ct_type_1;
typedef struct Point *ct_type_2;
typedef struct Point *ct_type_3;
static void ct_ser_0(const void *addr){const ct_type_0 *v=(const ct_type_0*)addr;fputc('{',stderr);ct_string("x");fputc(':',stderr);if(!ct_defined(&(((*v)).x),sizeof(((*v)).x))) ct_string("未初始化"); else fprintf(stderr,"%lld",(long long)(((*v)).x));fputc(',',stderr);ct_string("y");fputc(':',stderr);if(!ct_defined(&(((*v)).y),sizeof(((*v)).y))) ct_string("未初始化"); else fprintf(stderr,"%lld",(long long)(((*v)).y));fputc('}',stderr);}
static void ct_ser_1(const void *addr){const ct_type_1 *v=(const ct_type_1*)addr;if(!ct_defined(&((*v)),sizeof((*v)))) ct_string("未初始化"); else {fprintf(stderr,"{\"pointer\":\"%p\"",(void*)((*v)));if(((*v)) && ct_any_defined((*v),sizeof(*((*v))))){fprintf(stderr,",\"target\":");fputc('{',stderr);ct_string("x");fputc(':',stderr);if(!ct_defined(&((*((*v))).x),sizeof((*((*v))).x))) ct_string("未初始化"); else fprintf(stderr,"%lld",(long long)((*((*v))).x));fputc(',',stderr);ct_string("y");fputc(':',stderr);if(!ct_defined(&((*((*v))).y),sizeof((*((*v))).y))) ct_string("未初始化"); else fprintf(stderr,"%lld",(long long)((*((*v))).y));fputc('}',stderr);}fputc('}',stderr);}}
static void ct_ser_2(const void *addr){const ct_type_2 *v=(const ct_type_2*)addr;if(!ct_defined(&((*v)),sizeof((*v)))) ct_string("未初始化"); else {fprintf(stderr,"{\"pointer\":\"%p\"",(void*)((*v)));if(((*v)) && ct_any_defined((*v),sizeof(*((*v))))){fprintf(stderr,",\"target\":");fputc('{',stderr);ct_string("x");fputc(':',stderr);if(!ct_defined(&((*((*v))).x),sizeof((*((*v))).x))) ct_string("未初始化"); else fprintf(stderr,"%lld",(long long)((*((*v))).x));fputc(',',stderr);ct_string("y");fputc(':',stderr);if(!ct_defined(&((*((*v))).y),sizeof((*((*v))).y))) ct_string("未初始化"); else fprintf(stderr,"%lld",(long long)((*((*v))).y));fputc('}',stderr);}fputc('}',stderr);}}
static void ct_ser_3(const void *addr){const ct_type_3 *v=(const ct_type_3*)addr;if(!ct_defined(&((*v)),sizeof((*v)))) ct_string("未初始化"); else {fprintf(stderr,"{\"pointer\":\"%p\"",(void*)((*v)));if(((*v)) && ct_any_defined((*v),sizeof(*((*v))))){fprintf(stderr,",\"target\":");fputc('{',stderr);ct_string("x");fputc(':',stderr);if(!ct_defined(&((*((*v))).x),sizeof((*((*v))).x))) ct_string("未初始化"); else fprintf(stderr,"%lld",(long long)((*((*v))).x));fputc(',',stderr);ct_string("y");fputc(':',stderr);if(!ct_defined(&((*((*v))).y),sizeof((*((*v))).y))) ct_string("未初始化"); else fprintf(stderr,"%lld",(long long)((*((*v))).y));fputc('}',stderr);}fputc('}',stderr);}}
struct Point *create_wrong(){int _ct_saved_scope=ct_scope;ct_enter("create_wrong");ct_snapshot(5, "enter", "create_wrong()", 0);{ int _ct_block_scope=++ct_scope;
struct Point p = 1, 2;ct_register("p","struct Point",&p,sizeof(p),ct_ser_0,1);ct_snapshot(6, "declaration", "struct Point p = {1, 2}", 0);
{__auto_type _ct_ret=(&(p));snprintf(ct_return_text,sizeof(ct_return_text),"%p",(void*)_ct_ret);ct_snapshot(7, "return", "return &p;", 0);ct_leave();ct_scope=_ct_saved_scope;return _ct_ret;}
ct_scope_leave(_ct_block_scope); }}
struct Point *create_right(){int _ct_saved_scope=ct_scope;ct_enter("create_right");ct_snapshot(10, "enter", "create_right()", 0);{ int _ct_block_scope=++ct_scope;
struct Point *p = malloc(sizeof(struct Point));ct_register("p","struct Point *",&p,sizeof(p),ct_ser_1,1);ct_snapshot(11, "declaration", "struct Point *p = malloc(sizeof(struct Point))", 0);
({ __auto_type _ct_p = &(p->x); __auto_type _ct_value = (3); *_ct_p = _ct_value; ct_mark(_ct_p,sizeof(*_ct_p)); *_ct_p; });ct_snapshot(12, "statement", "p->x = 3", 0);
({ __auto_type _ct_p = &(p->y); __auto_type _ct_value = (4); *_ct_p = _ct_value; ct_mark(_ct_p,sizeof(*_ct_p)); *_ct_p; });ct_snapshot(13, "statement", "p->y = 4", 0);
{__auto_type _ct_ret=(p);snprintf(ct_return_text,sizeof(ct_return_text),"%p",(void*)_ct_ret);ct_snapshot(14, "return", "return p;", 0);ct_leave();ct_scope=_ct_saved_scope;return _ct_ret;}
ct_scope_leave(_ct_block_scope); }}
int main(){int _ct_saved_scope=ct_scope;ct_enter("main");ct_snapshot(17, "enter", "main()", 0);{ int _ct_block_scope=++ct_scope;
struct Point *a = ({ct_snapshot(18, "call", "create_wrong()", 0);__auto_type _ct_call_result=create_wrong();ct_snapshot(18, "resume", "create_wrong()", 0);_ct_call_result;});ct_register("a","struct Point *",&a,sizeof(a),ct_ser_2,1);ct_snapshot(18, "declaration", "struct Point *a = create_wrong()", 0);
struct Point *b = ({ct_snapshot(19, "call", "create_right()", 0);__auto_type _ct_call_result=create_right();ct_snapshot(19, "resume", "create_right()", 0);_ct_call_result;});ct_register("b","struct Point *",&b,sizeof(b),ct_ser_3,1);ct_snapshot(19, "declaration", "struct Point *b = create_right()", 0);
printf("b=(%d,%d)\n", b->x, b->y);ct_snapshot(20, "statement", "printf(\"b=(%d,%d)\\n\", b->x, b->y)", 0);
free(b);ct_snapshot(21, "statement", "free(b)", 0);
{__auto_type _ct_ret=(0);snprintf(ct_return_text,sizeof(ct_return_text),"%.12g",(double)_ct_ret);ct_snapshot(22, "return", "return 0;", 0);ct_leave();ct_scope=_ct_saved_scope;return _ct_ret;}
ct_scope_leave(_ct_block_scope); }}