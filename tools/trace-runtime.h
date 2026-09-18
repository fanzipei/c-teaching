/* Offline trace instrumentation only; never shipped as a browser dependency. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <stdint.h>

typedef void (*ct_serializer)(const void *);
typedef struct { const char *name, *type; void *addr; size_t size; int depth, scope; ct_serializer serialize; } ct_variable;
static ct_variable ct_variables[256];
static int ct_count, ct_depth = -1, ct_scope, ct_event_count;
static const char *ct_frames[64];
static unsigned char *ct_initialized[32768];
static int ct_init_count;
static char ct_output[32768];
static size_t ct_output_length;
static const char *ct_files[32];
static int ct_file_count;
static char ct_return_text[128];

static void ct_string(const char *s) {
    fputc('"', stderr);
    for (; *s; s++) {
        unsigned char c = (unsigned char)*s;
        if (c == '"' || c == '\\') fprintf(stderr, "\\%c", c);
        else if (c < 32) fprintf(stderr, "\\u%04x", c);
        else fputc(c, stderr);
    }
    fputc('"', stderr);
}
static void ct_forget(void *p, size_t size) {
    for (int i = ct_init_count - 1; i >= 0; i--)
        if ((uintptr_t)ct_initialized[i] >= (uintptr_t)p && (uintptr_t)ct_initialized[i] < (uintptr_t)p + size)
            ct_initialized[i] = ct_initialized[--ct_init_count];
}
static int ct_defined(const void *p, size_t size) {
    for (size_t j = 0; j < size; j++) {
        int found = 0;
        for (int i = 0; i < ct_init_count; i++) if (ct_initialized[i] == (unsigned char *)p + j) { found = 1; break; }
        if (!found) return 0;
    }
    return 1;
}
static int ct_any_defined(const void *p, size_t size) {
    for (int i=0;i<ct_init_count;i++)
        if ((uintptr_t)ct_initialized[i]>=(uintptr_t)p && (uintptr_t)ct_initialized[i]<(uintptr_t)p+size) return 1;
    return 0;
}
static void *ct_allocations[64];
static size_t ct_allocation_sizes[64];
static int ct_alloc_count;
static size_t ct_allocation_size(const void *p) {
    for(int i=0;i<ct_alloc_count;i++) if(ct_allocations[i]==p) return ct_allocation_sizes[i];
    return 0;
}
static void *ct_malloc(size_t size) {
    void *p=malloc(size);
    ct_allocations[ct_alloc_count]=p;ct_allocation_sizes[ct_alloc_count++]=size;
    ct_forget(p,size);return p;
}
static void ct_free(void *p) {
    for(int i=0;i<ct_alloc_count;i++) if(ct_allocations[i]==p) {ct_forget(p,ct_allocation_sizes[i]);ct_allocations[i]=NULL;}
    free(p);
}
static void ct_mark(void *p, size_t size) {
    for (size_t j = 0; j < size; j++) {
        if (!ct_defined((unsigned char *)p + j, 1)) ct_initialized[ct_init_count++] = (unsigned char *)p + j;
        if (ct_init_count >= 32768) abort();
    }
}
static void ct_register(const char *name, const char *type, void *addr, size_t size, ct_serializer fn, int initialized) {
    if (ct_count >= 256) abort();
    ct_forget(addr, size);
    ct_variables[ct_count++] = (ct_variable){name, type, addr, size, ct_depth, ct_scope, fn};
    if (initialized) ct_mark(addr, size);
}
static void ct_enter(const char *name) { ct_frames[++ct_depth] = name; }
static void ct_leave(void) {
    while (ct_count && ct_variables[ct_count-1].depth == ct_depth) ct_count--;
    ct_depth--;
}
static void ct_scope_leave(int scope) {
    while (ct_count && ct_variables[ct_count-1].scope >= scope && ct_variables[ct_count-1].depth == ct_depth) ct_count--;
    ct_scope--;
}
static int ct_printf(const char *format, ...) {
    va_list args; va_start(args, format);
    int n = vsnprintf(ct_output + ct_output_length, sizeof(ct_output)-ct_output_length, format, args);
    va_end(args); ct_output_length += n; return n;
}
static int ct_putchar(int ch) { ct_printf("%c", ch); return ch; }
static int ct_puts(const char *s) { return ct_printf("%s\n", s); }
static FILE *ct_fopen(const char *name, const char *mode) {
    int found = 0;
    for (int i=0;i<ct_file_count;i++) if (!strcmp(ct_files[i],name)) found=1;
    if (!found) ct_files[ct_file_count++]=name;
    return fopen(name,mode);
}
static void ct_snapshot(int line, const char *phase, const char *expression, int result) {
    if (++ct_event_count > 10000) abort();
    fflush(NULL);
    fprintf(stderr,"{\"line\":%d,\"phase\":",line); ct_string(phase);
    fprintf(stderr,",\"expression\":"); ct_string(expression);
    fprintf(stderr,",\"return\":");ct_string(ct_return_text);ct_return_text[0]=0;
    fprintf(stderr,",\"result\":%d,\"depth\":%d,\"frames\":[",result,ct_depth);
    for (int i=0;i<=ct_depth;i++) { if(i)fputc(',',stderr); ct_string(ct_frames[i]); }
    fprintf(stderr,"],\"variables\":[");
    for (int i=0;i<ct_count;i++) {
        ct_variable v=ct_variables[i];
        if(i)fputc(',',stderr);
        fprintf(stderr,"{\"name\":");ct_string(v.name);
        fprintf(stderr,",\"type\":");ct_string(v.type);
        fprintf(stderr,",\"addr\":\"%p\",\"size\":%llu,\"depth\":%d,\"value\":",v.addr,(unsigned long long)v.size,v.depth);
        v.serialize(v.addr); fputc('}',stderr);
    }
    fprintf(stderr,"],\"output\":");ct_string(ct_output);
    fprintf(stderr,",\"files\":{");
    int printed=0;
    for(int i=0;i<ct_file_count;i++) {
        FILE *fp=fopen(ct_files[i],"r");if(!fp)continue;
        char content[1024];size_t n=fread(content,1,1023,fp);content[n]=0;fclose(fp);
        if(printed++)fputc(',',stderr);ct_string(ct_files[i]);fputc(':',stderr);ct_string(content);
    }
    fprintf(stderr,"}}\n");
}
#define printf ct_printf
#define putchar ct_putchar
#define puts ct_puts
#define fopen ct_fopen
#define malloc ct_malloc
#define free ct_free
