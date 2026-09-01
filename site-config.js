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
    Object.freeze({ page: 'array.html', title: '数组', shortTitle: '数组', demo: 13, quiz: 6 }),
    Object.freeze({ page: 'function.html', title: '函数', shortTitle: '函数', demo: 11, quiz: 6 }),
    Object.freeze({ page: 'pointer.html', title: '指针', shortTitle: '指针', demo: 10, quiz: 6 }),
    Object.freeze({ page: 'struct.html', title: '结构体', shortTitle: '结构体', demo: 10, quiz: 6 })
  ]);
});
