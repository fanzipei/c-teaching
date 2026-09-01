/* ========== demo6: 字符串连接（手工实现 strcat） ========== */
createDemo("demo6", {
  title: "字符数组与字符串：连接",
  subtitle: "字符串就是以 '\\0' 结尾的字符数组——手工实现 strcat",
  code: `#include <stdio.h>

int main() {
    char dest[12] = "Hello";
    char src[] = "World";
    int i = 0, j = 0;
    while (dest[i] != '\\0') i++;
    while (src[j] != '\\0') {
        dest[i] = src[j];
        i++;
        j++;
    }
    dest[i] = '\\0';
    printf("%s\\n", dest);
    return 0;
}`,
  vizTypes: ["vars","array","console"],
  steps: [
    { line: 2, info: "main() 开始" },
    { line: 3, vars: {dest:{value:"char[12]",type:"array"}}, array: {name:"dest", cells:[{val:"H"},{val:"e"},{val:"l"},{val:"l"},{val:"o"},{val:"\\0"},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true}]}, info: "dest 是 12 格的字符数组，存 \"Hello\"；编译器自动在第 5 格补上 '\\0'（字符串结束标志）" },
    { line: 4, vars: {src:{value:"char[6]",type:"array"}}, array: {name:"src", cells:[{val:"W"},{val:"o"},{val:"r"},{val:"l"},{val:"d"},{val:"\\0"}]}, info: "src 存 \"World\"，长度 6（含 '\\0'）" },
    { line: 5, vars: {i:{value:0,type:"int"},j:{value:0,type:"int"}}, info: "i、j 都从 0 开始" },
    { line: 6, vars: {i:{value:5,type:"int"}}, array: {name:"dest", cells:[{val:"H"},{val:"e"},{val:"l"},{val:"l"},{val:"o"},{val:"\\0",highlight:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true}], markers:[{index:5,label:"i"}]}, info: "第一个 while：i 一路走到第一个 '\\0' 的位置——i=5，即 dest 的末尾" },
    { line: 7, array: {name:"src", cells:[{val:"W",highlight:true},{val:"o"},{val:"r"},{val:"l"},{val:"d"},{val:"\\0"}], markers:[{index:0,label:"j"}]}, info: "第二个 while：src[0] 不是 '\\0'，开始逐字符拷贝" },
    { line: 8, vars: {i:{value:6,type:"int"},j:{value:1,type:"int"}}, array: {name:"dest", cells:[{val:"H"},{val:"e"},{val:"l"},{val:"l"},{val:"o"},{val:"W",highlight:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true}], markers:[{index:5,label:"i"}]}, info: "dest[5] = src[0] = 'W'；随后 i、j 各加 1" },
    { line: 8, vars: {i:{value:7,type:"int"},j:{value:2,type:"int"}}, array: {name:"dest", cells:[{val:"H"},{val:"e"},{val:"l"},{val:"l"},{val:"o"},{val:"W"},{val:"o",highlight:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true}], markers:[{index:6,label:"i"}]}, info: "dest[6] = src[1] = 'o'；i、j 各加 1" },
    { line: 8, vars: {i:{value:8,type:"int"},j:{value:3,type:"int"}}, array: {name:"dest", cells:[{val:"H"},{val:"e"},{val:"l"},{val:"l"},{val:"o"},{val:"W"},{val:"o"},{val:"r",highlight:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true}], markers:[{index:7,label:"i"}]}, info: "dest[7] = src[2] = 'r'；i、j 各加 1" },
    { line: 8, vars: {i:{value:9,type:"int"},j:{value:4,type:"int"}}, array: {name:"dest", cells:[{val:"H"},{val:"e"},{val:"l"},{val:"l"},{val:"o"},{val:"W"},{val:"o"},{val:"r"},{val:"l",highlight:true},{val:null,empty:true},{val:null,empty:true},{val:null,empty:true}], markers:[{index:8,label:"i"}]}, info: "dest[8] = src[3] = 'l'；i、j 各加 1" },
    { line: 8, vars: {i:{value:10,type:"int"},j:{value:5,type:"int"}}, array: {name:"dest", cells:[{val:"H"},{val:"e"},{val:"l"},{val:"l"},{val:"o"},{val:"W"},{val:"o"},{val:"r"},{val:"l"},{val:"d",highlight:true},{val:null,empty:true},{val:null,empty:true}], markers:[{index:9,label:"i"}]}, info: "dest[9] = src[4] = 'd'；i、j 各加 1" },
    { line: 7, array: {name:"src", cells:[{val:"W"},{val:"o"},{val:"r"},{val:"l"},{val:"d"},{val:"\\0",highlight:true}], markers:[{index:5,label:"j"}]}, info: "src[5] 是 '\\0'，拷贝循环结束" },
    { line: 12, array: {name:"dest", cells:[{val:"H"},{val:"e"},{val:"l"},{val:"l"},{val:"o"},{val:"W"},{val:"o"},{val:"r"},{val:"l"},{val:"d"},{val:"\\0",highlight:true},{val:null,empty:true}], markers:[{index:10,label:"i"}]}, info: "关键一步：给 dest 末尾补上 '\\0'，它才是一个合法的字符串" },
    { line: 13, output: "HelloWorld", info: "printf 用 %s 从首字符一直输出到 '\\0' 为止" },
    { line: 14, info: "程序结束" }
  ]
});
/* ========== demo7: 字符串比较（手工实现 strcmp） ========== */
createDemo("demo7", {
  title: "字符数组与字符串：比较",
  subtitle: "逐字符比较，遇到第一个不同就出结果——手工实现 strcmp",
  code: `#include <stdio.h>

int main() {
    char s1[] = "apple";
    char s2[] = "apply";
    int i = 0;
    while (s1[i] != '\\0' && s2[i] != '\\0' && s1[i] == s2[i]) i++;
    printf("%d\\n", s1[i] - s2[i]);
    return 0;
}`,
  vizTypes: ["vars","array","console"],
  steps: [
    { line: 2, info: "main() 开始" },
    { line: 3, vars: {s1:{value:"char[6]",type:"array"}}, array: {name:"s1", cells:[{val:"a"},{val:"p"},{val:"p"},{val:"l"},{val:"e"},{val:"\\0"}]}, info: "s1 = \"apple\"" },
    { line: 4, vars: {s2:{value:"char[6]",type:"array"}}, array: {name:"s2", cells:[{val:"a"},{val:"p"},{val:"p"},{val:"l"},{val:"y"},{val:"\\0"}]}, info: "s2 = \"apply\"——前 4 个字符相同，最后一个不同" },
    { line: 5, vars: {i:{value:0,type:"int"}}, info: "i = 0，从下标 0 开始逐字符比较" },
    { line: 6, array: [{name:"s1", cells:[{val:"a",highlight:true},{val:"p"},{val:"p"},{val:"l"},{val:"e"},{val:"\\0"}], markers:[{index:0,label:"i"}]}, {name:"s2", cells:[{val:"a",highlight:true},{val:"p"},{val:"p"},{val:"l"},{val:"y"},{val:"\\0"}], markers:[{index:0,label:"i"}]}], info: "s1[0]='a' == s2[0]='a'，继续" },
    { line: 6, vars: {i:{value:1,type:"int"}}, array: [{name:"s1", cells:[{val:"a"},{val:"p",highlight:true},{val:"p"},{val:"l"},{val:"e"},{val:"\\0"}], markers:[{index:1,label:"i"}]}, {name:"s2", cells:[{val:"a"},{val:"p",highlight:true},{val:"p"},{val:"l"},{val:"y"},{val:"\\0"}], markers:[{index:1,label:"i"}]}], info: "s1[1]='p' == s2[1]='p'，继续" },
    { line: 6, vars: {i:{value:2,type:"int"}}, array: [{name:"s1", cells:[{val:"a"},{val:"p"},{val:"p",highlight:true},{val:"l"},{val:"e"},{val:"\\0"}], markers:[{index:2,label:"i"}]}, {name:"s2", cells:[{val:"a"},{val:"p"},{val:"p",highlight:true},{val:"l"},{val:"y"},{val:"\\0"}], markers:[{index:2,label:"i"}]}], info: "s1[2]='p' == s2[2]='p'，继续" },
    { line: 6, vars: {i:{value:3,type:"int"}}, array: [{name:"s1", cells:[{val:"a"},{val:"p"},{val:"p"},{val:"l",highlight:true},{val:"e"},{val:"\\0"}], markers:[{index:3,label:"i"}]}, {name:"s2", cells:[{val:"a"},{val:"p"},{val:"p"},{val:"l",highlight:true},{val:"y"},{val:"\\0"}], markers:[{index:3,label:"i"}]}], info: "s1[3]='l' == s2[3]='l'，继续" },
    { line: 6, vars: {i:{value:4,type:"int"}}, array: [{name:"s1", cells:[{val:"a"},{val:"p"},{val:"p"},{val:"l"},{val:"e",highlight:true},{val:"\\0"}], markers:[{index:4,label:"i"}]}, {name:"s2", cells:[{val:"a"},{val:"p"},{val:"p"},{val:"l"},{val:"y",highlight:true},{val:"\\0"}], markers:[{index:4,label:"i"}]}], info: "s1[4]='e' ≠ s2[4]='y'——遇到第一个不同的字符，循环停止，i=4" },
    { line: 7, output: "-20", info: "s1[4]-s2[4] = 'e'-'y' = 101-121 = -20。结果小于 0，说明 \"apple\" < \"apply\"（字典序）" },
    { line: 8, info: "程序结束。strcmp 的规则：逐字符比较，遇不同就返回差值（负=前者小，正=前者大），完全相同返回 0" }
  ]
});
/* ========== demo8: 字符串查找（手工实现子串查找） ========== */
createDemo("demo8", {
  title: "字符数组与字符串：查找子串",
  subtitle: "外层挑起点、内层逐字符比对——手工实现 strstr",
  code: `#include <stdio.h>

int main() {
    char text[] = "hello world";
    char pat[] = "wor";
    int i, j;
    int found;
    int pos = -1;
    for (i = 0; text[i] != '\\0'; i++) {
        found = 1;
        for (j = 0; pat[j] != '\\0'; j++) {
            if (text[i + j] != pat[j]) {
                found = 0;
                break;
            }
        }
        if (found == 1) {
            pos = i;
            break;
        }
    }
    printf("位置 = %d\\n", pos);
    return 0;
}`,
  vizTypes: ["vars","array","loop","console"],
  steps: [
    { line: 2, info: "main() 开始" },
    { line: 3, vars: {text:{value:"char[12]",type:"array"}}, array: {name:"text", cells:[{val:"h"},{val:"e"},{val:"l"},{val:"l"},{val:"o"},{val:" "},{val:"w"},{val:"o"},{val:"r"},{val:"l"},{val:"d"},{val:"\\0"}]}, info: "text = \"hello world\"（注意第 5 格是空格）" },
    { line: 4, vars: {pat:{value:"char[4]",type:"array"}}, array: {name:"pat", cells:[{val:"w"},{val:"o"},{val:"r"},{val:"\\0"}]}, info: "pat = \"wor\"——要在 text 里找它第一次出现的位置" },
    { line: 6, vars: {pos:{value:-1,type:"int"}}, info: "pos = -1：先假设找不到" },
    { line: 7, vars: {i:{value:0,type:"int"}}, loop: [{label:"i=0",active:true}], array: {name:"text", cells:[{val:"h",highlight:true},{val:"e"},{val:"l"},{val:"l"},{val:"o"},{val:" "},{val:"w"},{val:"o"},{val:"r"},{val:"l"},{val:"d"},{val:"\\0"}], markers:[{index:0,label:"i"}]}, info: "i=0：以 text[0] 为起点试配" },
    { line: 10, vars: {found:{value:0,type:"int"}}, info: "text[0]='h' ≠ pat[0]='w'，失败（found=0，break 出内层）" },
    { line: 10, vars: {i:{value:1,type:"int"},found:{value:1,type:"int"}}, loop: [{label:"i=1",active:true}], array: {name:"text", cells:[{val:"h"},{val:"e",highlight:true},{val:"l"},{val:"l"},{val:"o"},{val:" "},{val:"w"},{val:"o"},{val:"r"},{val:"l"},{val:"d"},{val:"\\0"}], markers:[{index:1,label:"i"}]}, info: "i=1：text[1]='e' ≠ 'w'，失败" },
    { line: 10, vars: {i:{value:2,type:"int"}}, loop: [{label:"i=2",active:true}], array: {name:"text", cells:[{val:"h"},{val:"e"},{val:"l",highlight:true},{val:"l"},{val:"o"},{val:" "},{val:"w"},{val:"o"},{val:"r"},{val:"l"},{val:"d"},{val:"\\0"}], markers:[{index:2,label:"i"}]}, info: "i=2：text[2]='l' ≠ 'w'，失败" },
    { line: 10, vars: {i:{value:3,type:"int"}}, loop: [{label:"i=3",active:true}], array: {name:"text", cells:[{val:"h"},{val:"e"},{val:"l"},{val:"l",highlight:true},{val:"o"},{val:" "},{val:"w"},{val:"o"},{val:"r"},{val:"l"},{val:"d"},{val:"\\0"}], markers:[{index:3,label:"i"}]}, info: "i=3：'l' ≠ 'w'，失败" },
    { line: 10, vars: {i:{value:4,type:"int"}}, loop: [{label:"i=4",active:true}], array: {name:"text", cells:[{val:"h"},{val:"e"},{val:"l"},{val:"l"},{val:"o",highlight:true},{val:" "},{val:"w"},{val:"o"},{val:"r"},{val:"l"},{val:"d"},{val:"\\0"}], markers:[{index:4,label:"i"}]}, info: "i=4：'o' ≠ 'w'，失败" },
    { line: 10, vars: {i:{value:5,type:"int"}}, loop: [{label:"i=5",active:true}], array: {name:"text", cells:[{val:"h"},{val:"e"},{val:"l"},{val:"l"},{val:"o"},{val:" ",highlight:true},{val:"w"},{val:"o"},{val:"r"},{val:"l"},{val:"d"},{val:"\\0"}], markers:[{index:5,label:"i"}]}, info: "i=5：空格 ≠ 'w'，失败" },
    { line: 7, vars: {i:{value:6,type:"int"}}, loop: [{label:"i=6",active:true}], array: {name:"text", cells:[{val:"h"},{val:"e"},{val:"l"},{val:"l"},{val:"o"},{val:" "},{val:"w",highlight:true},{val:"o"},{val:"r"},{val:"l"},{val:"d"},{val:"\\0"}], markers:[{index:6,label:"i"}]}, info: "i=6：text[6]='w'，有戏！进入内层逐字符比对" },
    { line: 8, vars: {found:{value:1,type:"int"}}, info: "先假设能配上：found = 1" },
    { line: 9, vars: {j:{value:0,type:"int"}}, loop: [{label:"i=6 j=0",active:true}], array: [{name:"text", cells:[{val:"h"},{val:"e"},{val:"l"},{val:"l"},{val:"o"},{val:" "},{val:"w",highlight:true},{val:"o"},{val:"r"},{val:"l"},{val:"d"},{val:"\\0"}], markers:[{index:6,label:"i"}]}, {name:"pat", cells:[{val:"w",highlight:true},{val:"o"},{val:"r"},{val:"\\0"}], markers:[{index:0,label:"j"}]}], info: "j=0：text[6]='w' == pat[0]='w' ✓" },
    { line: 9, vars: {j:{value:1,type:"int"}}, loop: [{label:"i=6 j=1",active:true}], array: [{name:"text", cells:[{val:"h"},{val:"e"},{val:"l"},{val:"l"},{val:"o"},{val:" "},{val:"w"},{val:"o",highlight:true},{val:"r"},{val:"l"},{val:"d"},{val:"\\0"}], markers:[{index:7,label:"i+j"}]}, {name:"pat", cells:[{val:"w"},{val:"o",highlight:true},{val:"r"},{val:"\\0"}], markers:[{index:1,label:"j"}]}], info: "j=1：text[7]='o' == pat[1]='o' ✓" },
    { line: 9, vars: {j:{value:2,type:"int"}}, loop: [{label:"i=6 j=2",active:true}], array: [{name:"text", cells:[{val:"h"},{val:"e"},{val:"l"},{val:"l"},{val:"o"},{val:" "},{val:"w"},{val:"o"},{val:"r",highlight:true},{val:"l"},{val:"d"},{val:"\\0"}], markers:[{index:8,label:"i+j"}]}, {name:"pat", cells:[{val:"w"},{val:"o"},{val:"r",highlight:true},{val:"\\0"}], markers:[{index:2,label:"j"}]}], info: "j=2：text[8]='r' == pat[2]='r' ✓" },
    { line: 9, vars: {j:{value:3,type:"int"}}, info: "j=3：pat[3] 是 '\\0'，内层循环结束——整个模式串都配上了，found 仍是 1" },
    { line: 16, vars: {pos:{value:6,type:"int"}}, info: "found == 1 成立：pos = 6，break 跳出外层循环" },
    { line: 20, output: "位置 = 6", info: "子串 \"wor\" 从 text[6] 开始" },
    { line: 21, info: "程序结束" }
  ]
});
