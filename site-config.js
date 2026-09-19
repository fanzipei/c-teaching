/* 全站章节元数据：导航、首页进度与自动化测试共用。 */
(function exposeChapterConfig(root, factory) {
  var chapters = factory();
  if (root) root.CTEACHING_CHAPTERS = chapters;
  if (typeof module === 'object' && module.exports) module.exports = chapters;
})(typeof window !== 'undefined' ? window : null, function createChapterConfig() {
  return Object.freeze([
    Object.freeze({ page: 'intro.html', title: '认识C程序', shortTitle: '认识C程序', demo: 7, quiz: 0 }),
    Object.freeze({ page: 'datatype.html', title: '数据类型与赋值语句', shortTitle: '数据类型与赋值语句', demo: 11, quiz: 6 }),
    Object.freeze({ page: 'condition.html', title: '条件语句', shortTitle: '条件语句', demo: 6, quiz: 6 }),
    Object.freeze({ page: 'loop.html', title: '循环语句', shortTitle: '循环语句', demo: 10, quiz: 6 }),
    Object.freeze({ page: 'array1.html', title: '数组1', shortTitle: '数组1', demo: 10, quiz: 4 }),
    Object.freeze({ page: 'array2.html', title: '数组2', shortTitle: '数组2', demo: 7, quiz: 4 }),
    Object.freeze({ page: 'function.html', title: '函数', shortTitle: '函数', demo: 11, quiz: 6 }),
    Object.freeze({ page: 'pointer1.html', title: '指针1', shortTitle: '指针1', demo: 7, quiz: 6 }),
    Object.freeze({ page: 'pointer2.html', title: '指针2', shortTitle: '指针2', demo: 9, quiz: 6 }),
    Object.freeze({ page: 'struct.html', title: '结构体', shortTitle: '结构体', demo: 10, quiz: 6 }),
    Object.freeze({ page: 'file.html', title: '文件操作', shortTitle: '文件操作', demo: 4, quiz: 4 })
  ]);
});

// 数组章拆分后的旧链接与进度映射；保留原记录，仅迁移内容相同的项目。
(function migrateArrayChapter(root) {
  if (!root) return;
  var mapping = {
  "demo0": [
    "array1.html",
    "demo0"
  ],
  "demo1": [
    "array1.html",
    "demo1"
  ],
  "demo2": [
    "array1.html",
    "demo2"
  ],
  "demo3": [
    "array1.html",
    "demo3"
  ],
  "demo4": [
    "array1.html",
    "demo4"
  ],
  "demo5": [
    "array1.html",
    "demo5"
  ],
  "demo6": [
    "array1.html",
    "demo6"
  ],
  "demo7": [
    "array1.html",
    "demo7"
  ],
  "demo8": [
    "array2.html",
    "demo0"
  ],
  "demo9": [
    "array2.html",
    "demo1"
  ],
  "demo10": [
    "array2.html",
    "demo2"
  ],
  "demo11": [
    "array2.html",
    "demo3"
  ],
  "demo12": [
    "array2.html",
    "demo4"
  ],
  "quiz0": [
    "array1.html",
    "quiz0"
  ],
  "quiz1": [
    "array1.html",
    "quiz1"
  ],
  "quiz2": [
    "array2.html",
    "quiz0"
  ],
  "quiz3": [
    "array1.html",
    "quiz2"
  ],
  "quiz4": [
    "array2.html",
    "quiz1"
  ],
  "quiz5": [
    "array2.html",
    "quiz2"
  ]
};
  root.CTEACHING_ARRAY_LEGACY = mapping;
  try {
    var marker = 'cteaching:migration:arrays-split-v1';
    if (root.localStorage.getItem(marker) === '1') return;
    Object.keys(mapping).forEach(function (id) {
      var target = mapping[id];
      if (root.localStorage.getItem('cteaching:done:array.html:' + id) === '1') {
        root.localStorage.setItem('cteaching:done:' + target[0] + ':' + target[1], '1');
      }
    });
    root.localStorage.setItem(marker, '1');
  } catch (e) { /* 无法使用本地存储时仍可正常学习。 */ }
})(typeof window !== 'undefined' ? window : null);

// 指针章拆分后的旧链接与进度映射；保留原记录，仅迁移内容相同的项目。
(function migratePointerChapter(root) {
  if (!root) return;
  var mapping = {
  "demo0": [
    "pointer1.html",
    "demo0"
  ],
  "demo1": [
    "pointer1.html",
    "demo1"
  ],
  "demo2": [
    "pointer1.html",
    "demo2"
  ],
  "demo3": [
    "pointer1.html",
    "demo3"
  ],
  "demo4": [
    "pointer2.html",
    "demo0"
  ],
  "demo5": [
    "pointer2.html",
    "demo1"
  ],
  "demo6": [
    "pointer2.html",
    "demo2"
  ],
  "demo7": [
    "pointer2.html",
    "demo3"
  ],
  "demo8": [
    "pointer2.html",
    "demo4"
  ],
  "demo9": [
    "pointer2.html",
    "demo5"
  ],
  "quiz0": [
    "pointer1.html",
    "quiz0"
  ],
  "quiz1": [
    "pointer1.html",
    "quiz1"
  ],
  "quiz3": [
    "pointer1.html",
    "quiz2"
  ],
  "quiz2": [
    "pointer2.html",
    "quiz0"
  ],
  "quiz4": [
    "pointer2.html",
    "quiz1"
  ],
  "quiz5": [
    "pointer2.html",
    "quiz2"
  ]
};
  root.CTEACHING_POINTER_LEGACY = mapping;
  try {
    var marker = 'cteaching:migration:pointers-split-v1';
    if (root.localStorage.getItem(marker) === '1') return;
    Object.keys(mapping).forEach(function (id) {
      var target = mapping[id];
      if (root.localStorage.getItem('cteaching:done:pointer.html:' + id) === '1') {
        root.localStorage.setItem('cteaching:done:' + target[0] + ':' + target[1], '1');
      }
    });
    root.localStorage.setItem(marker, '1');
  } catch (e) { /* 无法使用本地存储时仍可正常学习。 */ }
})(typeof window !== 'undefined' ? window : null);
