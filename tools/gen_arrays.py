# -*- coding: utf-8 -*-
import os

NAV_TEMPLATE = '''<nav>
  <div class="logo">C语言<span>教学演示</span></div>
  <div class="nav-links">
    <a href="index.html">首页</a>
    <a href="datatype.html"{a0}>数据类型与输入输出</a>
    <a href="assignment.html"{a1}>赋值语句</a>
    <a href="condition.html"{a2}>条件语句</a>
    <a href="loop.html"{a3}>循环语句</a>
    <a href="function.html"{a4}>函数</a>
    <a href="array1d.html"{a5}>一维数组</a>
    <a href="array2d.html"{a6}>二维数组</a>
    <a href="pointer.html"{a7}>指针</a>
    <a href="struct.html"{a8}>结构体</a>
  </div>
</nav>'''

HEAD = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} - C语言教学演示</title>
<link rel="stylesheet" href="style.css?v=2">
</head>
<body>
'''

FOOT = '''
<script src="demo-engine.js?v=2"></script>
<script>
{scripts}
</script>
</body>
</html>
'''

def write_page(filename, title, nav_active, intro, demos_js):
    nav = NAV_TEMPLATE.format(**nav_active)
    head = HEAD.format(title=title)
    scripts = '\n'.join(demos_js)
    foot = FOOT.format(scripts=scripts)
    body = f'<div class="container">\n<h1>{title}</h1>\n{intro}\n<div class="demo-grid">\n'
    for i in range(len(demos_js)):
        body += f'  <div id="demo{i}"></div>\n'
    body += '</div>\n</div>\n'
    content = head + nav + body + foot
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Generated {filename}')

# ===== 数据类型与输入输出 =====
nav_dt = {f'a{i}': '' for i in range(9)}
nav_dt['a0'] = ' class="active"'
intro_dt = '''<div class="intro">
<p><strong>数据类型与输入输出</strong>是C语言编程的基石。核心知识点：</p>
<ul>
<li>基本类型：<code>int</code>（整数）、<code>float</code>（单精度浮点）、<code>double</code>（双精度浮点）、<code>char</code>（字符）</li>
<li><code>sizeof</code> 运算符可以查看类型在当前平台占用的字节数</li>
<li><code>printf</code> 格式化输出：常用 <code>%d</code>（int）、<code>%f</code>（float/double）、<code>%c</code>（char）、<code>%s</code>（字符串）</li>
<li><code>scanf</code> 格式化输入：变量前必须加 <code>&</code> 取地址符（数组名除外）</li>
<li>类型转换：自动隐式转换（小范围→大范围）和强制类型转换 <code>(type)expr</code></li>
<li>转义字符：<code>\n</code>（换行）、<code>\\t</code>（制表符）、<code>\\</code>（反斜杠）、<code>\\"</code>（双引号）</li>
<li>常量：<code>#define PI 3.14</code>（宏定义，编译时替换）和 <code>const int MAX = 100;</code>（只读变量）</li>
</ul>
</div>'''

demos_dt = [
'''createDemo("demo0", {
  title: "基本数据类型",
  subtitle: "int / float / double / char 的声明与大小",
  code: `int main() {
    int a = 10;
    float f = 3.14;
    double d = 3.1415926535;
    char c = 'A';
    printf("int=%d bytes, float=%d bytes\\\\n, (int)sizeof(a), (int)sizeof(f));
    printf("double=%d bytes, char=%d bytes\\\\n, (int)sizeof(d), (int)sizeof(c));
    printf("a=%d, f=%.2f, d=%.10f, c=%c\\\\n, a, f, d, c);
    return 0;
}`,
  vizTypes: ["vars","console"],
  steps: [
    { line: 1, info: "main() 开始" },
    { line: 2, vars: {a:{value:10,type:"int"}}, info: "声明 int 变量 a = 10，通常占 4 字节" },
    { line: 3, vars: {f:{value:3.14,type:"float"}}, info: "声明 float 变量 f = 3.14，通常占 4 字节" },
    { line: 4, vars: {d:{value:3.1415926535,type:"double"}}, info: "声明 double 变量 d，通常占 8 字节，精度更高" },
    { line: 5, vars: {c:{value:"'A'",type:"char"}}, info: "声明 char 变量 c = 'A'，占 1 字节" },
    { line: 6, output: "int=4 bytes, float=4 bytes", info: "sizeof 返回各类型占用的字节数" },
    { line: 7, output: "int=4 bytes, float=4 bytes\\ndouble=8 bytes, char=1 bytes", info: "double 占 8 字节，char 占 1 字节" },
    { line: 8, output: "int=4 bytes, float=4 bytes\\ndouble=8 bytes, char=1 bytes\\na=10, f=3.14, d=3.1415926535, c=A", info: "输出各变量的值" },
    { line: 9, info: "程序结束" }
  ]
});''',
'''createDemo("demo1", {
  title: "printf 格式化输出",
  subtitle: "掌握常用格式控制符",
  code: `int main() {
    int age = 20;
    float pi = 3.14159;
    char grade = 'A';
    printf("age = %d\\\\n, age);
    printf("pi = %.2f\\\\n, pi);
    printf("grade = %c, ASCII = %d\\\\n, grade, grade);
    return 0;
}`,
  vizTypes: ["vars","console"],
  steps: [
    { line: 1, info: "main() 开始" },
    { line: 2, vars: {age:{value:20,type:"int"}}, info: "age = 20" },
    { line: 3, vars: {pi:{value:3.14159,type:"float"}}, info: "pi = 3.14159" },
    { line: 4, vars: {grade:{value:"'A'",type:"char"}}, info: "grade = 'A'" },
    { line: 5, output: "age = 20", info: "%d 输出整数" },
    { line: 6, output: "age = 20\\npi = 3.14", info: "%.2f 保留两位小数输出浮点数" },
    { line: 7, output: "age = 20\\npi = 3.14\\ngrade = A, ASCII = 65", info: "%c 输出字符，%d 输出其 ASCII 码 65" },
    { line: 8, info: "程序结束" }
  ]
});''',
'''createDemo("demo2", {
  title: "scanf 读取输入",
  subtitle: "从键盘读取数据到变量（注意 & 取地址符）",
  code: `int main() {
    int age;
    float score;
    char grade;
    printf("请输入年龄、成绩、等级：");
    scanf("%d %f %c", &age, &score, &grade);
    printf("age=%d, score=%.1f, grade=%c\\\\n, age, score, grade);
    return 0;
}`,
  vizTypes: ["vars","console"],
  steps: [
    { line: 1, info: "main() 开始" },
    { line: 2, vars: {age:{value:"?",type:"int"}}, info: "声明未初始化的 int 变量 age" },
    { line: 3, vars: {score:{value:"?",type:"float"}}, info: "声明未初始化的 float 变量 score" },
    { line: 4, vars: {grade:{value:"?",type:"char"}}, info: "声明未初始化的 char 变量 grade" },
    { line: 5, output: "请输入年龄、成绩、等级：", info: "提示用户输入" },
    { line: 6, vars: {age:{value:18,type:"int"},score:{value:92.5,type:"float"},grade:{value:"'B'",type:"char"}}, info: "模拟输入：18 92.5 B。注意 &age 是 age 的地址" },
    { line: 7, output: "age=18, score=92.5, grade=B", info: "输出读取到的值" },
    { line: 8, info: "程序结束" }
  ]
});''',
'''createDemo("demo3", {
  title: "类型转换",
  subtitle: "隐式转换 vs 强制转换",
  code: `int main() {
    int a = 5;
    int b = 2;
    float f1 = a / b;
    float f2 = (float)a / b;
    int c = (int)3.99;
    printf("f1=%.2f, f2=%.2f, c=%d\\\\n, f1, f2, c);
    return 0;
}`,
  vizTypes: ["vars","console"],
  steps: [
    { line: 1, info: "main() 开始" },
    { line: 2, vars: {a:{value:5,type:"int"}}, info: "a = 5" },
    { line: 3, vars: {b:{value:2,type:"int"}}, info: "b = 2" },
    { line: 4, vars: {f1:{value:2.0,type:"float"}}, info: "a/b 先按 int 计算得 2，再隐式转为 float，f1 = 2.0" },
    { line: 5, vars: {f2:{value:2.5,type:"float"}}, info: "(float)a 先强制转换，再除以 b 得 2.5" },
    { line: 6, vars: {c:{value:3,type:"int"}}, info: "(int)3.99 强制截断小数部分，c = 3" },
    { line: 7, output: "f1=2.00, f2=2.50, c=3", info: "输出结果，注意 f1 和 f2 的区别" },
    { line: 8, info: "程序结束" }
  ]
});''',
'''createDemo("demo4", {
  title: "转义字符",
  subtitle: "\\n、\\t、\\\\、\\\" 等特殊字符",
  code: `int main() {
    printf("Hello\\\\norld\\\\n);
    printf("Name\\\\nge\\\\ncore\\\\n);
    printf("He said \\\\nK\\\\n\\\\n");
    printf("Path: C:\\Windows\\\\n);
    return 0;
}`,
  vizTypes: ["console"],
  steps: [
    { line: 1, info: "main() 开始" },
    { line: 2, output: "Hello\\nWorld\\n", info: "\\n 换行：输出分两行显示" },
    { line: 3, output: "Hello\\nWorld\\n\\nName\\tAge\\tScore\\n", info: "\\t 制表符：对齐列" },
    { line: 4, output: "Hello\\nWorld\\n\\nName\\tAge\\tScore\\n\\nHe said \\"OK\\"\\n", info: "\\" 输出双引号" },
    { line: 5, output: "Hello\\nWorld\\n\\nName\\tAge\\tScore\\n\\nHe said \\"OK\\"\\n\\nPath: C:\\Windows\\n", info: "\\ 输出单个反斜杠" },
    { line: 6, info: "程序结束" }
  ]
});''',
'''createDemo("demo5", {
  title: "常量与宏定义",
  subtitle: "#define 与 const 的区别",
  code: `#define PI 3.14159
#define MAX 100
int main() {
    const int MIN = 1;
    double r = 5.0;
    double area = PI * r * r;
    printf("MAX=%d, MIN=%d, area=%.2f\\\\n, MAX, MIN, area);
    return 0;
}`,
  vizTypes: ["vars","console"],
  steps: [
    { line: 1, info: "预处理：#define PI 3.14159，编译时所有 PI 会被替换" },
    { line: 2, info: "预处理：#define MAX 100" },
    { line: 3, info: "main() 开始" },
    { line: 4, vars: {MIN:{value:1,type:"const int"}}, info: "const 声明只读变量 MIN = 1" },
    { line: 5, vars: {r:{value:5.0,type:"double"}}, info: "r = 5.0" },
    { line: 6, vars: {area:{value:78.53975,type:"double"}}, info: "area = PI * r * r ≈ 78.54" },
    { line: 7, output: "MAX=100, MIN=1, area=78.54", info: "MAX 是宏替换，MIN 是 const 变量" },
    { line: 8, info: "程序结束" }
  ]
});'''
]

write_page('datatype.html', '数据类型与输入输出', nav_dt, intro_dt, demos_dt)

# ===== 一维数组 =====
nav_1d = {f'a{i}': '' for i in range(9)}
nav_1d['a5'] = ' class="active"'
intro_1d = '''<div class="intro">
<p><strong>一维数组</strong>是相同类型数据的连续存储集合。核心知识点：</p>
<ul>
<li>定义：<code>int arr[5];</code> 分配 5 个连续的 int 空间，下标从 0 开始</li>
<li>初始化：<code>int arr[5] = {1,2,3,4,5};</code> 部分初始化时其余自动为 0</li>
<li>数组名是<strong>首元素地址</strong>（常量指针）：<code>arr[i]</code> 等价于 <code>*(arr+i)</code></li>
<li>越界访问是未定义行为：访问 <code>arr[-1]</code> 或 <code>arr[5]</code> 可能崩溃</li>
<li>数组长度必须用常量或宏定义，不能用变量（C99 前）</li>
<li>数组作为函数参数<strong>退化为指针</strong>，函数内无法通过 sizeof 获得长度</li>
</ul>
</div>'''

demos_1d = [
'''createDemo("demo0", {
  title: "数组的定义与初始化",
  subtitle: "多种初始化方式对比",
  code: `int main() {
    int a[5] = {10, 20, 30, 40, 50};
    int b[5] = {1, 2};
    int c[] = {5, 6, 7};
    printf("a[0]=%d, b[4]=%d, c[2]=%d\\\\n", a[0], b[4], c[2]);
    return 0;
}`,
  vizTypes: ["vars","array","console"],
  steps: [
    { line: 1, info: "main() 开始" },
    { line: 2, vars: {a:{value:"int[5]",type:"array"}}, array: [{val:10},{val:20},{val:30},{val:40},{val:50}], info: "完全初始化：a = {10,20,30,40,50}" },
    { line: 3, vars: {b:{value:"int[5]",type:"array"}}, array: [{val:1},{val:2},{val:0},{val:0},{val:0}], info: "部分初始化：b = {1,2}，其余自动补 0" },
    { line: 4, vars: {c:{value:"int[3]",type:"array"}}, array: [{val:5},{val:6},{val:7}], info: "省略长度，编译器自动推算 c 长度为 3" },
    { line: 5, output: "a[0]=10, b[4]=0, c[2]=7", info: "输出：b[4] 被自动初始化为 0" },
    { line: 6, info: "程序结束" }
  ]
});''',
'''createDemo("demo1", {
  title: "数组遍历",
  subtitle: "用循环逐个访问元素",
  code: `int main() {
    int arr[5] = {10, 20, 30, 40, 50};
    for (int i = 0; i < 5; i++) {
        printf("arr[%d] = %d\\\\n", i, arr[i]);
    }
    return 0;
}`,
  vizTypes: ["vars","array","loop","console"],
  steps: [
    { line: 1, info: "main() 开始" },
    { line: 2, vars: {arr:{value:"int[5]",type:"array"}}, array: [{val:10},{val:20},{val:30},{val:40},{val:50}], info: "定义数组 arr = {10,20,30,40,50}" },
    { line: 3, vars: {i:{value:0,type:"int"}}, loop: [{label:"i=0",active:true}], info: "i=0，开始遍历" },
    { line: 4, output: "arr[0] = 10", info: "访问 arr[0]" },
    { line: 3, vars: {i:{value:1,type:"int"}}, loop: [{label:"i=1",active:true}], array: [{val:10,highlight:true},{val:20},{val:30},{val:40},{val:50}], info: "i=1" },
    { line: 4, output: "arr[0] = 10\\\\narr[1] = 20", info: "访问 arr[1]" },
    { line: 3, vars: {i:{value:2,type:"int"}}, loop: [{label:"i=2",active:true}], array: [{val:10},{val:20,highlight:true},{val:30},{val:40},{val:50}], info: "i=2" },
    { line: 4, output: "arr[0] = 10\\\\narr[1] = 20\\\\narr[2] = 30", info: "访问 arr[2]" },
    { line: 3, vars: {i:{value:3,type:"int"}}, loop: [{label:"i=3",active:true}], array: [{val:10},{val:20},{val:30,highlight:true},{val:40},{val:50}], info: "i=3" },
    { line: 4, output: "arr[0] = 10\\\\narr[1] = 20\\\\narr[2] = 30\\\\narr[3] = 40", info: "访问 arr[3]" },
    { line: 3, vars: {i:{value:4,type:"int"}}, loop: [{label:"i=4",active:true}], array: [{val:10},{val:20},{val:30},{val:40,highlight:true},{val:50}], info: "i=4" },
    { line: 4, output: "arr[0] = 10\\\\narr[1] = 20\\\\narr[2] = 30\\\\narr[3] = 40\\\\narr[4] = 50", info: "访问 arr[4]" },
    { line: 3, loop: [{label:"i=4",active:false}], info: "i=5，循环结束" },
    { line: 6, info: "程序结束" }
  ]
});''',
'''createDemo("demo2", {
  title: "数组元素的修改",
  subtitle: "通过下标读取和写入",
  code: `int main() {
    int arr[5] = {1, 2, 3, 4, 5};
    arr[0] = 100;
    arr[2] = arr[0] + arr[1];
    arr[4] *= 10;
    printf("%d %d %d %d %d\\\\n", arr[0], arr[1], arr[2], arr[3], arr[4]);
    return 0;
}`,
  vizTypes: ["vars","array","console"],
  steps: [
    { line: 1, info: "main() 开始" },
    { line: 2, vars: {arr:{value:"int[5]",type:"array"}}, array: [{val:1},{val:2},{val:3},{val:4},{val:5}], info: "初始数组 {1,2,3,4,5}" },
    { line: 3, vars: {arr:{value:"int[5]",type:"array"}}, array: [{val:100},{val:2},{val:3},{val:4},{val:5}], info: "arr[0] = 100" },
    { line: 4, vars: {arr:{value:"int[5]",type:"array"}}, array: [{val:100},{val:2},{val:102},{val:4},{val:5}], info: "arr[2] = arr[0] + arr[1] = 100 + 2 = 102" },
    { line: 5, vars: {arr:{value:"int[5]",type:"array"}}, array: [{val:100},{val:2},{val:102},{val:4},{val:50}], info: "arr[4] *= 10，即 arr[4] = 5 * 10 = 50" },
    { line: 6, output: "100 2 102 4 50", info: "输出修改后的数组" },
    { line: 7, info: "程序结束" }
  ]
});''',
'''createDemo("demo3", {
  title: "求和与求最值",
  subtitle: "遍历数组完成统计",
  code: `int main() {
    int arr[6] = {3, 7, 2, 9, 1, 5};
    int sum = 0;
    int max = arr[0];
    int min = arr[0];
    for (int i = 0; i < 6; i++) {
        sum += arr[i];
        if (arr[i] > max) max = arr[i];
        if (arr[i] < min) min = arr[i];
    }
    printf("sum=%d max=%d min=%d\\\\n", sum, max, min);
    return 0;
}`,
  vizTypes: ["vars","array","console"],
  steps: [
    { line: 1, info: "main() 开始" },
    { line: 2, vars: {arr:{value:"int[6]",type:"array"}}, array: [{val:3},{val:7},{val:2},{val:9},{val:1},{val:5}], info: "数组 {3,7,2,9,1,5}" },
    { line: 3, vars: {sum:{value:0,type:"int"}}, info: "sum = 0" },
    { line: 4, vars: {max:{value:3,type:"int"}}, info: "max 初始化为 arr[0] = 3" },
    { line: 5, vars: {min:{value:3,type:"int"}}, info: "min 初始化为 arr[0] = 3" },
    { line: 6, vars: {i:{value:0,type:"int"}}, loop: [{label:"i=0",active:true}], array: [{val:3,highlight:true},{val:7},{val:2},{val:9},{val:1},{val:5}], info: "i=0：arr[0]=3，sum=3，max=3，min=3" },
    { line: 6, vars: {i:{value:1,type:"int"},sum:{value:10,type:"int"},max:{value:7,type:"int"}}, loop: [{label:"i=1",active:true}], array: [{val:3},{val:7,highlight:true},{val:2},{val:9},{val:1},{val:5}], info: "i=1：arr[1]=7，sum=10，max=7" },
    { line: 6, vars: {i:{value:2,type:"int"},sum:{value:12,type:"int"},min:{value:2,type:"int"}}, loop: [{label:"i=2",active:true}], array: [{val:3},{val:7},{val:2,highlight:true},{val:9},{val:1},{val:5}], info: "i=2：arr[2]=2，sum=12，min=2" },
    { line: 6, vars: {i:{value:3,type:"int"},sum:{value:21,type:"int"},max:{value:9,type:"int"}}, loop: [{label:"i=3",active:true}], array: [{val:3},{val:7},{val:2},{val:9,highlight:true},{val:1},{val:5}], info: "i=3：arr[3]=9，sum=21，max=9" },
    { line: 6, vars: {i:{value:4,type:"int"},sum:{value:22,type:"int"},min:{value:1,type:"int"}}, loop: [{label:"i=4",active:true}], array: [{val:3},{val:7},{val:2},{val:9},{val:1,highlight:true},{val:5}], info: "i=4：arr[4]=1，sum=22，min=1" },
    { line: 6, vars: {i:{value:5,type:"int"},sum:{value:27,type:"int"}}, loop: [{label:"i=5",active:true}], array: [{val:3},{val:7},{val:2},{val:9},{val:1},{val:5,highlight:true}], info: "i=5：arr[5]=5，sum=27" },
    { line: 10, output: "sum=27 max=9 min=1", info: "最终结果" },
    { line: 11, info: "程序结束" }
  ]
});''',
'''createDemo("demo4", {
  title: "冒泡排序",
  subtitle: "两两比较，逐渐把最大的元素「冒泡」到末尾",
  code: `int main() {
    int arr[5] = {5, 3, 4, 1, 2};
    for (int i = 0; i < 4; i++) {
        for (int j = 0; j < 4 - i; j++) {
            if (arr[j] > arr[j+1]) {
                int tmp = arr[j];
                arr[j] = arr[j+1];
                arr[j+1] = tmp;
            }
        }
    }
    printf("%d %d %d %d %d\\\\n", arr[0], arr[1], arr[2], arr[3], arr[4]);
    return 0;
}`,
  vizTypes: ["vars","array","console"],
  steps: [
    { line: 1, info: "main() 开始" },
    { line: 2, vars: {arr:{value:"int[5]",type:"array"}}, array: [{val:5},{val:3},{val:4},{val:1},{val:2}], info: "初始数组 {5,3,4,1,2}" },
    { line: 3, vars: {i:{value:0,type:"int"}}, loop: [{label:"i=0",active:true}], info: "外层 i=0，把最大元素冒泡到末尾" },
    { line: 4, vars: {j:{value:0,type:"int"}}, loop: [{label:"j=0",active:true}], info: "内层 j=0：arr[0]=5 > arr[1]=3，交换" },
    { line: 5, vars: {arr:{value:"int[5]",type:"array"}}, array: [{val:3},{val:5},{val:4},{val:1},{val:2}], info: "交换后 {3,5,4,1,2}" },
    { line: 4, vars: {j:{value:1,type:"int"}}, loop: [{label:"j=1",active:true}], array: [{val:3},{val:4},{val:5},{val:1},{val:2}], info: "j=1：arr[1]=5 > arr[2]=4，交换" },
    { line: 4, vars: {j:{value:2,type:"int"}}, loop: [{label:"j=2",active:true}], array: [{val:3},{val:4},{val:1},{val:5},{val:2}], info: "j=2：arr[2]=5 > arr[3]=1，交换" },
    { line: 4, vars: {j:{value:3,type:"int"}}, loop: [{label:"j=3",active:true}], array: [{val:3},{val:4},{val:1},{val:2},{val:5}], info: "j=3：arr[3]=5 > arr[4]=2，交换。最大元素 5 已就位" },
    { line: 3, vars: {i:{value:1,type:"int"}}, loop: [{label:"i=1",active:true}], info: "外层 i=1，第二大的元素冒泡" },
    { line: 4, vars: {j:{value:0,type:"int"}}, loop: [{label:"j=0",active:true}], array: [{val:3},{val:1},{val:4},{val:2},{val:5}], info: "j=0：3>1 交换" },
    { line: 4, vars: {j:{value:1,type:"int"}}, loop: [{label:"j=1",active:true}], array: [{val:3},{val:1},{val:2},{val:4},{val:5}], info: "j=1：4>2 交换。4 就位" },
    { line: 3, vars: {i:{value:2,type:"int"}}, loop: [{label:"i=2",active:true}], info: "外层 i=2" },
    { line: 4, vars: {j:{value:0,type:"int"}}, loop: [{label:"j=0",active:true}], array: [{val:1},{val:3},{val:2},{val:4},{val:5}], info: "j=0：3>1 交换" },
    { line: 4, vars: {j:{value:1,type:"int"}}, loop: [{label:"j=1",active:true}], array: [{val:1},{val:2},{val:3},{val:4},{val:5}], info: "j=1：3>2 交换。3 就位，数组已有序" },
    { line: 3, vars: {i:{value:3,type:"int"}}, loop: [{label:"i=3",active:true}], info: "外层 i=3，最后一轮检查" },
    { line: 12, output: "1 2 3 4 5", info: "排序完成，输出有序数组" },
    { line: 13, info: "程序结束" }
  ]
});''',
'''createDemo("demo5", {
  title: "数组作为函数参数",
  subtitle: "传递的是首地址，函数内可修改原数组",
  code: `void double_arr(int arr[], int n) {
    for (int i = 0; i < n; i++) {
        arr[i] *= 2;
    }
}
int main() {
    int a[4] = {1, 2, 3, 4};
    double_arr(a, 4);
    printf("%d %d %d %d\\\\n", a[0], a[1], a[2], a[3]);
    return 0;
}`,
  vizTypes: ["vars","array","stack","console"],
  steps: [
    { line: 7, info: "main() 开始" },
    { line: 8, vars: {a:{value:"int[4]",type:"array"}}, array: [{val:1},{val:2},{val:3},{val:4}], info: "定义数组 a = {1,2,3,4}" },
    { line: 9, info: "调用 double_arr(a, 4)，传递数组首地址" },
    { line: 1, stack: [{name:"main",value:"a[4]"},{name:"double_arr",value:"arr=a,n=4",highlight:true}], vars: {n:{value:4,type:"int"}}, info: "进入 double_arr，arr 获得 a 的首地址" },
    { line: 2, vars: {i:{value:0,type:"int"}}, loop: [{label:"i=0",active:true}], array: [{val:2,highlight:true},{val:2},{val:3},{val:4}], info: "i=0：arr[0]*=2 => 2" },
    { line: 2, vars: {i:{value:1,type:"int"}}, loop: [{label:"i=1",active:true}], array: [{val:2},{val:4,highlight:true},{val:3},{val:4}], info: "i=1：arr[1]*=2 => 4" },
    { line: 2, vars: {i:{value:2,type:"int"}}, loop: [{label:"i=2",active:true}], array: [{val:2},{val:4},{val:6,highlight:true},{val:4}], info: "i=2：arr[2]*=2 => 6" },
    { line: 2, vars: {i:{value:3,type:"int"}}, loop: [{label:"i=3",active:true}], array: [{val:2},{val:4},{val:6},{val:8,highlight:true}], info: "i=3：arr[3]*=2 => 8" },
    { line: 4, stack: [{name:"main",value:"a[4]",highlight:true}], info: "double_arr 结束，返回 main" },
    { line: 9, vars: {a:{value:"int[4]",type:"array"}}, array: [{val:2},{val:4},{val:6},{val:8}], info: "main 中的 a 已经被修改" },
    { line: 10, output: "2 4 6 8", info: "输出修改后的数组" },
    { line: 11, info: "程序结束" }
  ]
});'''
]

write_page('array1d.html', '一维数组', nav_1d, intro_1d, demos_1d)

# ===== 二维数组 =====
nav_2d = {f'a{i}': '' for i in range(9)}
nav_2d['a6'] = ' class="active"'
intro_2d = '''<div class="intro">
<p><strong>二维数组</strong>本质是「数组的数组」，常用于表示矩阵、表格。核心知识点：</p>
<ul>
<li>定义：<code>int a[3][4];</code> 表示 3 行 4 列的矩阵，在内存中按<strong>行优先</strong>连续存储</li>
<li>初始化：<code>int a[2][3] = {{1,2,3}, {4,5,6}};</code> 内层大括号代表每一行</li>
<li>访问元素：<code>a[i][j]</code>，下标从 0 开始</li>
<li>遍历需要<strong>嵌套循环</strong>：外层控制行，内层控制列</li>
<li>二维数组名 <code>a</code> 是指向首行（一维数组）的指针，<code>a[i]</code> 指向第 i 行首元素</li>
<li>函数参数可写成 <code>int a[][4]</code> 或 <code>int (*a)[4]</code>，必须指定列数</li>
</ul>
</div>'''

demos_2d = [
'''createDemo("demo0", {
  title: "二维数组的定义与初始化",
  subtitle: "矩阵在内存中按行连续存放",
  code: `int main() {
    int a[2][3] = {{1, 2, 3}, {4, 5, 6}};
    int b[3][3] = {{1, 2}, {3}};
    printf("a[1][2]=%d, b[2][0]=%d\\\\n", a[1][2], b[2][0]);
    return 0;
}`,
  vizTypes: ["vars","console"],
  steps: [
    { line: 1, info: "main() 开始" },
    { line: 2, vars: {a:{value:"int[2][3]",type:"array"}}, info: "完全初始化 2x3 矩阵 a = {{1,2,3},{4,5,6}}" },
    { line: 3, vars: {b:{value:"int[3][3]",type:"array"}}, info: "部分初始化 3x3 矩阵 b，未指定的元素自动为 0" },
    { line: 4, output: "a[1][2]=6, b[2][0]=0", info: "b[2][0] 被自动初始化为 0" },
    { line: 5, info: "程序结束" }
  ]
});''',
'''createDemo("demo1", {
  title: "二维数组的遍历",
  subtitle: "外层循环行，内层循环列",
  code: `int main() {
    int a[2][3] = {{1, 2, 3}, {4, 5, 6}};
    for (int i = 0; i < 2; i++) {
        for (int j = 0; j < 3; j++) {
            printf("%d ", a[i][j]);
        }
        printf("\\\\n");
    }
    return 0;
}`,
  vizTypes: ["vars","loop","console"],
  steps: [
    { line: 1, info: "main() 开始" },
    { line: 2, vars: {a:{value:"int[2][3]",type:"array"}}, info: "定义 2x3 矩阵" },
    { line: 3, vars: {i:{value:0,type:"int"}}, loop: [{label:"i=0",active:true}], info: "外层 i=0（第 0 行）" },
    { line: 4, vars: {j:{value:0,type:"int"}}, loop: [{label:"i=0 j=0",active:true}], info: "内层 j=0，访问 a[0][0]=1" },
    { line: 5, output: "1 ", info: "打印 1" },
    { line: 4, vars: {j:{value:1,type:"int"}}, loop: [{label:"i=0 j=1",active:true}], info: "j=1，访问 a[0][1]=2" },
    { line: 5, output: "1 2 ", info: "打印 2" },
    { line: 4, vars: {j:{value:2,type:"int"}}, loop: [{label:"i=0 j=2",active:true}], info: "j=2，访问 a[0][2]=3" },
    { line: 5, output: "1 2 3 ", info: "打印 3" },
    { line: 7, output: "1 2 3 \\\\n", info: "第 0 行结束，换行" },
    { line: 3, vars: {i:{value:1,type:"int"}}, loop: [{label:"i=1",active:true}], info: "外层 i=1（第 1 行）" },
    { line: 4, vars: {j:{value:0,type:"int"}}, loop: [{label:"i=1 j=0",active:true}], info: "j=0，访问 a[1][0]=4" },
    { line: 5, output: "1 2 3 \\\\n4 ", info: "打印 4" },
    { line: 4, vars: {j:{value:1,type:"int"}}, loop: [{label:"i=1 j=1",active:true}], info: "j=1，访问 a[1][1]=5" },
    { line: 5, output: "1 2 3 \\\\n4 5 ", info: "打印 5" },
    { line: 4, vars: {j:{value:2,type:"int"}}, loop: [{label:"i=1 j=2",active:true}], info: "j=2，访问 a[1][2]=6" },
    { line: 5, output: "1 2 3 \\\\n4 5 6 ", info: "打印 6" },
    { line: 7, output: "1 2 3 \\\\n4 5 6 \\\\n", info: "第 1 行结束，换行" },
    { line: 9, info: "程序结束" }
  ]
});''',
'''createDemo("demo2", {
  title: "矩阵转置",
  subtitle: "行列互换：b[j][i] = a[i][j]",
  code: `int main() {
    int a[2][3] = {{1, 2, 3}, {4, 5, 6}};
    int b[3][2];
    for (int i = 0; i < 2; i++) {
        for (int j = 0; j < 3; j++) {
            b[j][i] = a[i][j];
        }
    }
    printf("%d %d\\\\n%d %d\\\\n%d %d\\\\n", b[0][0], b[0][1], b[1][0], b[1][1], b[2][0], b[2][1]);
    return 0;
}`,
  vizTypes: ["vars","loop","console"],
  steps: [
    { line: 1, info: "main() 开始" },
    { line: 2, vars: {a:{value:"int[2][3]",type:"array"}}, info: "原矩阵 a（2行3列）" },
    { line: 3, vars: {b:{value:"int[3][2]",type:"array"}}, info: "转置矩阵 b（3行2列）" },
    { line: 4, vars: {i:{value:0,type:"int"}}, loop: [{label:"i=0",active:true}], info: "外层 i=0" },
    { line: 5, vars: {j:{value:0,type:"int"}}, loop: [{label:"i=0 j=0",active:true}], info: "b[0][0] = a[0][0] = 1" },
    { line: 5, vars: {j:{value:1,type:"int"}}, loop: [{label:"i=0 j=1",active:true}], info: "b[1][0] = a[0][1] = 2" },
    { line: 5, vars: {j:{value:2,type:"int"}}, loop: [{label:"i=0 j=2",active:true}], info: "b[2][0] = a[0][2] = 3" },
    { line: 4, vars: {i:{value:1,type:"int"}}, loop: [{label:"i=1",active:true}], info: "外层 i=1" },
    { line: 5, vars: {j:{value:0,type:"int"}}, loop: [{label:"i=1 j=0",active:true}], info: "b[0][1] = a[1][0] = 4" },
    { line: 5, vars: {j:{value:1,type:"int"}}, loop: [{label:"i=1 j=1",active:true}], info: "b[1][1] = a[1][1] = 5" },
    { line: 5, vars: {j:{value:2,type:"int"}}, loop: [{label:"i=1 j=2",active:true}], info: "b[2][1] = a[1][2] = 6" },
    { line: 8, output: "1 4\\\\n2 5\\\\n3 6", info: "输出转置后的矩阵" },
    { line: 9, info: "程序结束" }
  ]
});''',
'''createDemo("demo3", {
  title: "行和与列和",
  subtitle: "分别对每行、每列求和",
  code: `int main() {
    int a[3][3] = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
    int row_sum[3] = {0};
    int col_sum[3] = {0};
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            row_sum[i] += a[i][j];
            col_sum[j] += a[i][j];
        }
    }
    printf("row: %d %d %d\\\\n", row_sum[0], row_sum[1], row_sum[2]);
    printf("col: %d %d %d\\\\n", col_sum[0], col_sum[1], col_sum[2]);
    return 0;
}`,
  vizTypes: ["vars","loop","console"],
  steps: [
    { line: 1, info: "main() 开始" },
    { line: 2, vars: {a:{value:"int[3][3]",type:"array"}}, info: "3x3 矩阵" },
    { line: 3, vars: {row_sum:{value:"int[3]",type:"array"}}, info: "row_sum 初始化为 {0,0,0}" },
    { line: 4, vars: {col_sum:{value:"int[3]",type:"array"}}, info: "col_sum 初始化为 {0,0,0}" },
    { line: 5, vars: {i:{value:0,type:"int"}}, loop: [{label:"i=0",active:true}], info: "外层 i=0" },
    { line: 6, vars: {j:{value:0,type:"int"}}, loop: [{label:"i=0 j=0",active:true}], info: "a[0][0]=1：row_sum[0]=1, col_sum[0]=1" },
    { line: 6, vars: {j:{value:1,type:"int"}}, loop: [{label:"i=0 j=1",active:true}], info: "a[0][1]=2：row_sum[0]=3, col_sum[1]=2" },
    { line: 6, vars: {j:{value:2,type:"int"}}, loop: [{label:"i=0 j=2",active:true}], info: "a[0][2]=3：row_sum[0]=6, col_sum[2]=3" },
    { line: 5, vars: {i:{value:1,type:"int"}}, loop: [{label:"i=1",active:true}], info: "外层 i=1" },
    { line: 6, vars: {j:{value:0,type:"int"}}, loop: [{label:"i=1 j=0",active:true}], info: "a[1][0]=4：row_sum[1]=4, col_sum[0]=5" },
    { line: 6, vars: {j:{value:1,type:"int"}}, loop: [{label:"i=1 j=1",active:true}], info: "a[1][1]=5：row_sum[1]=9, col_sum[1]=7" },
    { line: 6, vars: {j:{value:2,type:"int"}}, loop: [{label:"i=1 j=2",active:true}], info: "a[1][2]=6：row_sum[1]=15, col_sum[2]=9" },
    { line: 5, vars: {i:{value:2,type:"int"}}, loop: [{label:"i=2",active:true}], info: "外层 i=2" },
    { line: 6, vars: {j:{value:0,type:"int"}}, loop: [{label:"i=2 j=0",active:true}], info: "a[2][0]=7：row_sum[2]=7, col_sum[0]=12" },
    { line: 6, vars: {j:{value:1,type:"int"}}, loop: [{label:"i=2 j=1",active:true}], info: "a[2][1]=8：row_sum[2]=15, col_sum[1]=15" },
    { line: 6, vars: {j:{value:2,type:"int"}}, loop: [{label:"i=2 j=2",active:true}], info: "a[2][2]=9：row_sum[2]=24, col_sum[2]=18" },
    { line: 9, output: "row: 6 15 24", info: "每行之和" },
    { line: 10, output: "row: 6 15 24\\\\ncol: 12 15 18", info: "每列之和" },
    { line: 11, info: "程序结束" }
  ]
});''',
'''createDemo("demo4", {
  title: "二维数组与指针",
  subtitle: "a[i][j] 等价于 *(*(a+i)+j)",
  code: `int main() {
    int a[2][3] = {{1, 2, 3}, {4, 5, 6}};
    int *p = a[0];
    printf("a[0][0]=%d, *p=%d\\\\n", a[0][0], *p);
    printf("a[1][1]=%d, *(p+4)=%d\\\\n", a[1][1], *(p+4));
    return 0;
}`,
  vizTypes: ["vars","console"],
  steps: [
    { line: 1, info: "main() 开始" },
    { line: 2, vars: {a:{value:"int[2][3]",type:"array"}}, info: "定义 2x3 矩阵" },
    { line: 3, vars: {p:{value:"0x1000",type:"int*"}}, info: "p = a[0]，指向第 0 行首元素" },
    { line: 4, output: "a[0][0]=1, *p=1", info: "*p 即 a[0][0]" },
    { line: 5, output: "a[0][0]=1, *p=1\\\\na[1][1]=5, *(p+4)=5", info: "p+4 跳过 4 个 int，到达 a[1][1]（行优先存储）" },
    { line: 6, info: "程序结束" }
  ]
});''',
'''createDemo("demo5", {
  title: "二维数组作为函数参数",
  subtitle: "必须指定列数，传递首行地址",
  code: `void print_matrix(int m[][3], int rows) {
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < 3; j++) {
            printf("%d ", m[i][j]);
        }
        printf("\\\\n");
    }
}
int main() {
    int a[2][3] = {{1, 2, 3}, {4, 5, 6}};
    print_matrix(a, 2);
    return 0;
}`,
  vizTypes: ["vars","loop","stack","console"],
  steps: [
    { line: 9, info: "main() 开始" },
    { line: 10, vars: {a:{value:"int[2][3]",type:"array"}}, info: "定义矩阵 a" },
    { line: 11, info: "调用 print_matrix(a, 2)" },
    { line: 1, stack: [{name:"main",value:"a[2][3]"},{name:"print_matrix",value:"m=a,rows=2",highlight:true}], info: "进入函数，m 获得 a 的首地址，必须知道列数 3 才能正确计算偏移" },
    { line: 2, vars: {i:{value:0,type:"int"}}, loop: [{label:"i=0",active:true}], info: "外层 i=0" },
    { line: 3, vars: {j:{value:0,type:"int"}}, loop: [{label:"j=0",active:true}], info: "内层 j=0，m[0][0]=1" },
    { line: 4, output: "1 ", info: "打印 1" },
    { line: 3, vars: {j:{value:1,type:"int"}}, loop: [{label:"j=1",active:true}], info: "j=1，m[0][1]=2" },
    { line: 4, output: "1 2 ", info: "打印 2" },
    { line: 3, vars: {j:{value:2,type:"int"}}, loop: [{label:"j=2",active:true}], info: "j=2，m[0][2]=3" },
    { line: 4, output: "1 2 3 ", info: "打印 3" },
    { line: 6, output: "1 2 3 \\\\n", info: "换行" },
    { line: 2, vars: {i:{value:1,type:"int"}}, loop: [{label:"i=1",active:true}], info: "外层 i=1" },
    { line: 3, vars: {j:{value:0,type:"int"}}, loop: [{label:"j=0",active:true}], info: "j=0，m[1][0]=4" },
    { line: 4, output: "1 2 3 \\\\n4 ", info: "打印 4" },
    { line: 3, vars: {j:{value:1,type:"int"}}, loop: [{label:"j=1",active:true}], info: "j=1，m[1][1]=5" },
    { line: 4, output: "1 2 3 \\\\n4 5 ", info: "打印 5" },
    { line: 3, vars: {j:{value:2,type:"int"}}, loop: [{label:"j=2",active:true}], info: "j=2，m[1][2]=6" },
    { line: 4, output: "1 2 3 \\\\n4 5 6 ", info: "打印 6" },
    { line: 6, output: "1 2 3 \\\\n4 5 6 \\\\n", info: "换行" },
    { line: 7, stack: [{name:"main",value:"a[2][3]",highlight:true}], info: "函数结束" },
    { line: 11, info: "程序结束" }
  ]
});'''
]

write_page('array2d.html', '二维数组', nav_2d, intro_2d, demos_2d)
