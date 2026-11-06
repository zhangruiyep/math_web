/* 角与角度 · 小游戏引擎
 * 与「绝对距离」同一套架构：375×667 设计坐标、等比缩放 letterbox、选关页 + 关卡内两态。
 * 第一章：角的概念 —— 定义（两条射线 + 公共端点）、顶点与边、
 *          锐角 / 直角 / 钝角 / 平角 / 周角。
 * 题型 kind：pick（选图形）· tap（点顶点）· drag（转射线凑度数）· quiz（判断类型）
 * 浏览器与小程序共用：挂在 root.AngleGame，同时 module.exports。
 */
(function (root) {
  'use strict';

  var DW = 375, DH = 667;

  var PAL = {
    bg: '#F7F3EA',
    card: '#FFFDF8',
    ink: '#2B2A26',
    ink2: '#6B6760',
    ink3: '#A9A294',
    ghost: '#CFC6B2',
    rule: '#DCD5C6',
    teal: '#1D9E75',
    tealBg: '#E1F5EE',
    amber: '#C4872B',
    amberBg: '#FAEEDA',
    wrong: '#C0553C',
    wrongBg: '#F6E3DB',
    star: '#DDA43A'
  };

  /* 场景几何：顶点 O，射线 OA 固定水平向右，OB 可绕 O 旋转 */
  var O = { x: 172, y: 380 };
  var R = 118;          // 射线长度
  var ARC_R = 52;       // 角的弧半径
  var TOL = 1.5;        // 过关容差（度）
  var GHOST_DELAY = 10; // 幽灵目标出现时间

  var CH_NAME = { 1: '角的概念', 2: '角的度量与换算', 3: '角的表示与计数', 4: '角平分线' };
  var CH_SUB = { 1: '顶点 · 两条边 · 五类角', 2: '度 · 分 · 秒，六十进制', 3: '找全图中所有小于平角的角', 4: '把角分成两半' };
  var CH_NUM = { 1: '一', 2: '二', 3: '三', 4: '四' };

  /* 第三章用的图形（点坐标在 300×150 的虚拟框里，绘制时缩放居中） */
  var FIGS = {
    /* 纯三角形 ABC */
    tri0: {
      pts: {
        A: { x: 150, y: 18, dx: 0, dy: -10 },
        B: { x: 28, y: 132, dx: -14, dy: 4 },
        C: { x: 252, y: 132, dx: 10, dy: 12 }
      },
      segs: [['A', 'B'], ['B', 'C'], ['C', 'A']]
    },
    /* 三角形 ABC，E 在 AC 上，连 BE（教材图 1） */
    tri: {
      pts: {
        A: { x: 150, y: 18, dx: 0, dy: -10 },
        B: { x: 28, y: 132, dx: -14, dy: 4 },
        C: { x: 252, y: 132, dx: 10, dy: 12 },
        E: { x: 201, y: 75, dx: 15, dy: 4 }
      },
      segs: [['A', 'B'], ['B', 'C'], ['C', 'A'], ['B', 'E']]
    },
    /* 三角形 ABC，D 在 BC 上，连 AD、CE，BC 延长到 F（教材图 2） */
    fig2: {
      pts: {
        A: { x: 140, y: 15, dx: 0, dy: -10 },
        B: { x: 22, y: 132, dx: -14, dy: 4 },
        D: { x: 105, y: 132, dx: 0, dy: 16 },
        C: { x: 195, y: 132, dx: 0, dy: 16 },
        F: { x: 285, y: 132, dx: 10, dy: 4 },
        E: { x: 247, y: 32, dx: 14, dy: 0 }
      },
      segs: [['A', 'B'], ['A', 'D'], ['A', 'C'], ['C', 'E'], ['B', 'F']]
    }
  };

  var CHAPTERS = [
    { ch: 1, ready: true },
    { ch: 2, ready: true },
    { ch: 3, ready: true },
    { ch: 4, ready: false }
  ];

  var TYPE_OPTS = ['锐角', '直角', '钝角', '平角', '周角'];

  /* ---------------- 关卡 ---------------- */
  var LEVELS = [
    /* 1. 角的定义：两条有公共端点的射线 */
    {
      ch: 1, kind: 'pick', q: '下面哪个图形是角？', ans: 0,
      tip: '角 = 两条射线 + 一个公共端点',
      note: '两条射线、一个公共端点，缺一不可',
      figs: [{ kind: 'angle' }, { kind: 'loose' }, { kind: 'dotray' }],
      why: { 1: '两条射线没有公共端点，不是角', 2: '只有一条射线，还差一条' }
    },
    /* 2. 多选：哪些图形是角（含直线 vs 平角 的辨析） */
    {
      ch: 1, kind: 'multi', q: '下面哪些图形是角？全都找出来', ans: [0, 3],
      tip: '两条射线 + 一个公共端点，缺一不可',
      note: '平角的边成一条直线，但有顶点，是角；直线没有顶点，不是角',
      figs: [{ kind: 'angle' }, { kind: 'loose' }, { kind: 'line' }, { kind: 'straight' }],
      why: {
        1: '两条射线没有公共端点，不是角',
        2: '直线没有顶点，不是角——平角才有顶点',
        3: '漏了它！平角也有公共端点，是 180° 的角'
      }
    },
    /* 3. 顶点与边 */
    {
      ch: 1, kind: 'tap', q: '∠AOB 的顶点在哪？点一下', deg: 52, ans: 'O',
      tip: '两条边的公共端点就是顶点',
      note: '顶点 O，两条边是 OA 和 OB',
      why: { A: 'A 在边上，不是顶点', B: 'B 也在边上，不是顶点' }
    },
    /* 3-7. 转射线：张开多大就是多少度 */
    {
      ch: 1, kind: 'drag', target: 45, start: 8,
      tip: '张开不到 90° 就是锐角',
      note: '小于 90° 的角叫锐角——越张越大，但仍然不到直角'
    },
    {
      ch: 1, kind: 'drag', target: 90, start: 20,
      tip: '两条边互相垂直，是直角',
      note: '90° 是直角，直角的两条边互相垂直'
    },
    {
      ch: 1, kind: 'drag', target: 135, start: 32,
      tip: '过了直角、还没到直线，是钝角',
      note: '大于 90° 而小于 180° 的角叫钝角'
    },
    {
      ch: 1, kind: 'drag', target: 180, start: 62,
      tip: '两条边成一条直线，是平角',
      note: '平角的两条边在同一条直线上，正好 180°'
    },
    {
      ch: 1, kind: 'drag', target: 360, start: 210,
      tip: '绕 O 转一整圈，是周角',
      note: '周角是射线绕端点旋转一周形成的角，两条边重合，360°'
    },
    /* 8. 判断类型 */
    {
      ch: 1, kind: 'quiz', q: '它是什么角？', opts: TYPE_OPTS,
      tip: '先看度数，再定类型',
      note: '锐角＜90°、直角＝90°、钝角在 90°~180° 之间、平角＝180°、周角＝360°',
      qs: [
        { deg: 32, ans: 0, why: '不到 90°，是锐角' },
        { deg: 90, ans: 1, why: '正好 90°，是直角' },
        { deg: 126, ans: 2, why: '超过 90° 但不到 180°，是钝角' },
        { deg: 180, ans: 3, why: '两条边成一条直线，是平角' },
        { deg: 360, ans: 4, why: '绕了一整圈回到原处，是周角' }
      ]
    },

    /* ================= 第二章 角的度量与换算 ================= */
    /* 10. 度分秒的意义：六十进制 */
    {
      ch: 2, kind: 'quiz', scene: 'expr', label: '进率',
      q: '度、分、秒的进率是多少？',
      answer: '1° = 60′ = 3600″',
      tip: '六十进制：度化分乘 60，分化秒再乘 60',
      note: '度分秒是六十进制：1° = 60′ = 3600″',
      qs: [
        { q: '1° 等于多少分？', expr: '1° = ?′', opts: ['60′', '100′', '10′'], ans: 0,
          why: '1° = 60′，度化分要乘 60', done: '1° = 60′' },
        { q: '1′ 等于多少秒？', expr: '1′ = ?″', opts: ['60″', '100″', '10″'], ans: 0,
          why: '1′ = 60″，分化秒也要乘 60', done: '1′ = 60″' },
        { q: '1° 等于多少秒？', expr: '1° = ?″', opts: ['3600″', '600″', '360″'], ans: 0,
          why: '60 × 60 = 3600，所以 1° = 3600″', done: '1° = 3600″' },
        { q: '下面哪个式子是对的？', expr: '1° = 60′ = 3600″', opts: ['1° = 60′ = 3600″', '1° = 100′ = 10000″', '1° = 60′ = 600″'], ans: 0,
          why: '度、分、秒是六十进制，一级一级乘 60' }
      ]
    },
    /* 11. 度 → 分 */
    {
      ch: 2, kind: 'quiz', scene: 'expr', label: '换算',
      q: '把度化成分',
      answer: '度化分：乘 60（1° = 60′）',
      tip: '度化分：乘 60',
      note: '度化分乘 60：小数部分的小数点后两位，乘 60 就是分',
      qs: [
        { q: '2° 是多少分？', expr: '2° = ?′', opts: ['120′', '20′', '200′'], ans: 0,
          why: '2 × 60 = 120，所以是 120′', done: '2° = 120′' },
        { q: '0.5° 是多少分？', expr: '0.5° = ?′', opts: ['30′', '50′', '5′'], ans: 0,
          why: '0.5 × 60 = 30，不满 1 度就是 30′', done: '0.5° = 30′' },
        { q: '0.1° 是多少分？', expr: '0.1° = ?′', opts: ['6′', '10′', '1′'], ans: 0,
          why: '0.1 × 60 = 6，所以是 6′', done: '0.1° = 6′' },
        { q: '1.5° 是多少分？', expr: '1.5° = ?′', opts: ['90′', '75′', '150′'], ans: 0,
          why: '1.5 × 60 = 90，也就是 1°30′' }
      ]
    },
    /* 12. 小数度 → 度分秒（分是整数） */
    {
      ch: 2, kind: 'quiz', scene: 'expr', label: '换算',
      q: '把 36.4° 化成度分秒',
      answer: '36.4° = 36°24′',
      tip: '整数部分留作度，小数部分 ×60 化分',
      note: '36.4° = 36° + 0.4° = 36° + 24′',
      qs: [
        { q: '整数部分是多少度？', expr: '36.4° = 36° + 0.4°', opts: ['36°', '37°', '0.4°'], ans: 0,
          why: '整数部分 36 就是 36°，剩下 0.4° 再化成分', done: '整数部分 36°' },
        { q: '0.4° 化成多少分？', expr: '0.4 × 60 = ?′', opts: ['24′', '40′', '4′'], ans: 0,
          why: '0.4 × 60 = 24，所以是 24′', done: '0.4° = 24′' },
        { q: '合起来怎么写？', expr: '36.4° = ?', opts: ['36°24′', '36°40′', '36°4′'], ans: 0,
          why: '36° 加上 24′，就是 36°24′，分不用再化秒了' }
      ]
    },
    /* 13. 小数度 → 度分秒（带秒） */
    {
      ch: 2, kind: 'quiz', scene: 'expr', label: '换算',
      q: '把 20.32° 化成度分秒',
      answer: '20.32° = 20°19′12″',
      tip: '分还有小数，就再乘 60 化成秒',
      note: '20.32° = 20°19′12″：分的小数部分再乘 60 得秒',
      qs: [
        { q: '整数部分是多少度？', expr: '20.32° = 20° + 0.32°', opts: ['20°', '32°', '0.32°'], ans: 0,
          why: '整数部分 20 就是 20°，0.32° 继续往下化', done: '整数部分 20°' },
        { q: '0.32° 化成多少分？', expr: '0.32 × 60 = ?′', opts: ['19.2′', '32′', '19′'], ans: 0,
          why: '0.32 × 60 = 19.2，注意还有 0.2′ 没化完', done: '0.32° = 19.2′' },
        { q: '0.2′ 化成多少秒？', expr: '0.2 × 60 = ?″', opts: ['12″', '2″', '20″'], ans: 0,
          why: '0.2 × 60 = 12，所以是 12″', done: '0.2′ = 12″' },
        { q: '最后写成度分秒？', expr: '20.32° = ?', opts: ['20°19′12″', '20°19′2″', '20°20′12″'], ans: 0,
          why: '20° + 19′ + 12″，就是 20°19′12″' }
      ]
    },
    /* 14. 度分秒 → 度（只到分） */
    {
      ch: 2, kind: 'quiz', scene: 'expr', label: '换算',
      q: '把 45°15′ 化成度',
      answer: '45°15′ = 45.25°',
      tip: '分化度：除以 60',
      note: '度分秒化度：分 ÷ 60，再和度相加',
      qs: [
        { q: '15′ 是多少度？', expr: '15 ÷ 60 = ?°', opts: ['0.25°', '0.15°', '0.4°'], ans: 0,
          why: '分化度除以 60：15 ÷ 60 = 0.25', done: '15′ = 0.25°' },
        { q: '30°30′ 化成度是多少？', expr: '30°30′ = 30° + ?°', opts: ['30.5°', '30.3°', '30.05°'], ans: 0,
          why: '30 ÷ 60 = 0.5，所以是 30.5°', done: '30°30′ = 30.5°' },
        { q: '1°15′ 等于多少度？', expr: '1°15′ = ?', opts: ['1.25°', '1.15°', '1.5°'], ans: 0,
          why: '15′ = 0.25°，所以是 1.25°', done: '1°15′ = 1.25°' },
        { q: '最后把 45°15′ 化成度？', expr: '45°15′ = 45 + 15 ÷ 60', opts: ['45.25°', '45.15°', '45.4°'], ans: 0,
          why: '15 ÷ 60 = 0.25，加上 45 得 45.25°' }
      ]
    },
    /* 15. 度分秒 → 度（带秒） */
    {
      ch: 2, kind: 'quiz', scene: 'expr', label: '换算',
      q: '把 20°15′36″ 化成度',
      answer: '20°15′36″ = 20.26°',
      tip: '逐级换算：先把秒化成分，再把分化成度',
      note: '20°15′36″：秒 → 分 → 度，每级除以 60',
      qs: [
        { q: '第一步：36″ 化成多少分？', expr: '36″ = ?′', opts: ['0.6′', '6′', '0.36′'], ans: 0,
          why: '秒化分除以 60：36 ÷ 60 = 0.6，是 0.6′', done: '36″ = 0.6′' },
        { q: '和原来的 15′ 合起来是多少分？', expr: '15′ + 0.6′ = ?′', opts: ['15.6′', '15.06′', '21′'], ans: 0,
          why: '15 + 0.6 = 15.6，一共 15.6′', done: '15′36″ = 15.6′' },
        { q: '第二步：15.6′ 化成多少度？', expr: '15.6′ = ?°', opts: ['0.26°', '0.256°', '0.6°'], ans: 0,
          why: '分化度也除以 60：15.6 ÷ 60 = 0.26，是 0.26°', done: '15.6′ = 0.26°' },
        { q: '加上整的 20°，最后结果？', expr: '20° + 0.26° = ?', opts: ['20.26°', '20.6°', '20.256°'], ans: 0,
          why: '20 + 0.26 = 20.26，所以是 20.26°' }
      ]
    },
    /* 16. 加法：分满 60 进位 */
    {
      ch: 2, kind: 'quiz', scene: 'expr', label: '加法',
      q: '计算 32°15′ + 21°48′',
      answer: '32°15′ + 21°48′ = 54°3′',
      tip: '度加度、分加分，分满 60 进 1 度',
      note: '加法：分满 60′ 就向度进 1',
      qs: [
        { q: '先加度：32 + 21 = ?', expr: '32°15′ + 21°48′', opts: ['53°', '52°', '51°'], ans: 0,
          why: '32 + 21 = 53，先记下 53°', done: '度相加 53°' },
        { q: '再加分：15′ + 48′ = ?', expr: '15′ + 48′ = ?′', opts: ['63′', '53′', '93′'], ans: 0,
          why: '15 + 48 = 63，分相加得 63′', done: '分相加 63′' },
        { q: '63′ 满 60′，怎么处理？', expr: '63′ = ?', opts: ['1°3′', '63°', '6°3′'], ans: 0,
          why: '60′ = 1°，余 3′，所以进 1° 留 3′', done: '63′ = 1°3′' },
        { q: '最后结果是多少？', expr: '32°15′ + 21°48′ = ?', opts: ['54°3′', '53°3′', '54°63′'], ans: 0,
          why: '53° 再加进位的 1° 得 54°，还剩 3′' }
      ]
    },
    /* 17. 减法：向度借 1° = 60′ */
    {
      ch: 2, kind: 'quiz', scene: 'expr', label: '减法',
      q: '计算 90° − 37°26′',
      answer: '90° − 37°26′ = 52°34′',
      tip: '分不够减，就向度借 1° 当 60′',
      note: '减法：借 1° = 60′，度减 1、分加 60',
      qs: [
        { q: '90° 没有分，借 1° 当 60′ 写成？', expr: '90° = 89°?′', opts: ['89°60′', '90°60′', '89°0′'], ans: 0,
          why: '借 1° 就是 60′，度减 1、分加 60', done: '90° = 89°60′' },
        { q: '分相减：60′ − 26′ = ?', expr: '60′ − 26′ = ?′', opts: ['34′', '44′', '36′'], ans: 0,
          why: '60 − 26 = 34，得 34′', done: '分得 34′' },
        { q: '度相减：89 − 37 = ?', expr: '89° − 37° = ?°', opts: ['52°', '53°', '51°'], ans: 0,
          why: '89 − 37 = 52，得 52°', done: '度得 52°' },
        { q: '结果是多少？', expr: '90° − 37°26′ = ?', opts: ['52°34′', '52°44′', '53°34′'], ans: 0,
          why: '52° 和 34′ 合起来就是 52°34′' }
      ]
    },
    /* 18. 乘法：分乘后满 60 进位 */
    {
      ch: 2, kind: 'quiz', scene: 'expr', label: '乘法',
      q: '计算 15°24′ × 3',
      answer: '15°24′ × 3 = 46°12′',
      tip: '度、分分别乘，分满 60 进 1 度',
      note: '乘法：度、分分别乘，分满 60′ 进位',
      qs: [
        { q: '分乘：24′ × 3 = ?', expr: '24′ × 3 = ?′', opts: ['72′', '62′', '82′'], ans: 0,
          why: '24 × 3 = 72，得 72′', done: '分得 72′' },
        { q: '72′ 满 60′，等于？', expr: '72′ = ?', opts: ['1°12′', '1°2′', '72°'], ans: 0,
          why: '72 − 60 = 12，进 1° 留 12′', done: '72′ = 1°12′' },
        { q: '度乘：15° × 3 = ?', expr: '15° × 3 = ?°', opts: ['45°', '48°', '35°'], ans: 0,
          why: '15 × 3 = 45，得 45°', done: '度得 45°' },
        { q: '加上进位的 1°，结果是多少？', expr: '15°24′ × 3 = ?', opts: ['46°12′', '45°12′', '46°72′'], ans: 0,
          why: '45° + 1° = 46°，还剩 12′，得 46°12′' }
      ]
    },
    /* 19. 除法：度除不尽，余数化成分 */
    {
      ch: 2, kind: 'quiz', scene: 'expr', label: '除法',
      q: '计算 45°36′ ÷ 2',
      answer: '45°36′ ÷ 2 = 22°48′',
      tip: '度除不尽，余数乘 60 化成分再除',
      note: '除法：余下的度 ×60 化成分，和原来的分合起来再除',
      qs: [
        { q: '45° ÷ 2 能除尽吗？', expr: '45 ÷ 2 = 22 …… 1', opts: ['不能，余 1°', '能，得 22.5°', '能，得 21°'], ans: 0,
          why: '45 除以 2 商 22 余 1，余下 1° 要继续化成分', done: '商 22° 余 1°' },
        { q: '余下的 1° 化成多少分？', expr: '1° = ?′', opts: ['60′', '100′', '6′'], ans: 0,
          why: '1° = 60′，余下的度要乘 60', done: '1° = 60′' },
        { q: '和原来的 36′ 合起来共多少分？', expr: '60′ + 36′ = ?′', opts: ['96′', '86′', '66′'], ans: 0,
          why: '60 + 36 = 96，一共 96′', done: '共 96′' },
        { q: '96′ ÷ 2 = ?，最后结果？', expr: '45°36′ ÷ 2 = ?', opts: ['22°48′', '22°36′', '21°48′'], ans: 0,
          why: '96 ÷ 2 = 48，度是 22°，得 22°48′' }
      ]
    },
    /* 20. 混合运算：先乘后减 */
    {
      ch: 2, kind: 'quiz', scene: 'expr', label: '综合',
      q: '计算 2 × 18°27′ − 15°54′',
      answer: '2 × 18°27′ − 15°54′ = 21°',
      tip: '先算乘法，再算减法，每一步盯住 60 进制',
      note: '混合运算：先乘除后加减，分相减正好为 0',
      qs: [
        { q: '先算 2 倍：27′ × 2 = ?', expr: '2 × 18°27′', opts: ['54′', '44′', '57′'], ans: 0,
          why: '27 × 2 = 54，得 54′', done: '分得 54′' },
        { q: '18° × 2 = ?，合起来是？', expr: '2 × 18°27′ = ?', opts: ['36°54′', '36°44′', '18°54′'], ans: 0,
          why: '18 × 2 = 36，加上 54′，得 36°54′', done: '2 × 18°27′ = 36°54′' },
        { q: '再减分：54′ − 54′ = ?', expr: '36°54′ − 15°54′', opts: ['0′', '9′', '18′'], ans: 0,
          why: '54 − 54 = 0，分正好减完，不用借位', done: '分相减为 0' },
        { q: '度相减：36 − 15 = ?', expr: '36°54′ − 15°54′ = ?', opts: ['21°', '21°18′', '20°'], ans: 0,
          why: '36 − 15 = 21，分是 0，所以结果是 21°' }
      ]
    },

    /* ================= 第三章 角的表示与计数 ================= */
    /* 21. 三角形：图中有几个角 */
    {
      ch: 3, kind: 'list', fig: 'tri0',
      q: '图中有几个角？全都选出来',
      names: ['∠A', '∠B', '∠C', '∠D', '∠AB'], ans: [0, 1, 2],
      answer: '三角形有 3 个角：∠A、∠B、∠C',
      tip: '每个顶点一个角，三角形的三个顶点各有一个',
      note: '△ABC 有 3 个角；一个角要用一个字母或三个字母表示',
      why: {
        3: '图中没有点 D',
        4: '两个字母不能表示角，要用一个字母（∠A）或三个字母（∠BAC）'
      }
    },
    /* 22. 同一个角的多种写法 */
    {
      ch: 3, kind: 'list', fig: 'tri0',
      q: '图中的 ∠A，可以写成下面哪些？',
      names: ['∠BAC', '∠CAB', '∠A', '∠ABC', '∠BCA', '∠B'], ans: [0, 1, 2],
      answer: '∠A = ∠BAC = ∠CAB',
      tip: '顶点字母必须写在中间；顶点处只有一个角时可以用一个字母',
      note: '同一个角有多种写法，顶点字母永远在中间',
      why: {
        3: '∠ABC 的顶点是 B，那不是 ∠A',
        4: '∠BCA 的顶点是 C，那是 ∠C',
        5: '∠B 是 B 处的角，不是 A 处的'
      }
    },
    /* 23. 教材图 1：三角形 + 一条内线，全列出（7 个） */
    {
      ch: 3, kind: 'list', fig: 'tri',
      q: '列出图中所有小于平角的角',
      names: ['∠BAE', '∠ABE', '∠EBC', '∠ABC', '∠BCA', '∠AEB', '∠BEC', '∠AEC', '∠BED'],
      ans: [0, 1, 2, 3, 4, 5, 6],
      answer: '共 7 个：∠BAE、∠ABE、∠EBC、∠ABC、∠BCA、∠AEB、∠BEC',
      tip: '每个顶点都要查：2 条射线 1 个角，3 条射线 3 个角',
      note: '7 个角：B 处 3 个、E 处 2 个、A 和 C 各 1 个',
      why: {
        7: 'A、E、C 三点共线，∠AEC 正好是平角，不能算',
        8: '图中没有点 D，∠BED 不存在'
      }
    },
    /* 24. 教材图 1：按顶点系统数 */
    {
      ch: 3, kind: 'quiz', scene: 'fig', fig: 'tri', label: '数角',
      q: '按顶点数一数图中的角',
      answer: '共 7 个：A 处 1、B 处 3、C 处 1、E 处 2',
      tip: '顶点处 n 条射线，小于平角的角最多 n 取 2 组合数',
      note: '数角要按顶点一个一个数，才不会漏',
      qs: [
        { q: '图中小于平角的角共有几个？', opts: ['7 个', '5 个', '6 个'], ans: 0,
          why: 'A 处 1 个、B 处 3 个、C 处 1 个、E 处 2 个，共 7 个' },
        { q: '以 B 为顶点的有几个？', opts: ['3 个', '2 个', '1 个'], ans: 0,
          why: 'B 处有 3 条射线 BA、BE、BC，两两配对得 ∠ABE、∠EBC、∠ABC 共 3 个' },
        { q: '以 E 为顶点的有几个？', opts: ['2 个', '3 个', '1 个'], ans: 0,
          why: 'E 处 3 条射线配 3 组，但 EA 和 EC 合成平角，去掉后剩 2 个' },
        { q: '∠AEC 要不要列进去？', opts: ['不要，它是平角', '要，它小于平角', '要，它是周角'], ans: 0,
          why: 'A、E、C 三点共线，∠AEC 是平角，题目只要小于平角的' }
      ]
    },
    /* 25. 教材图 2：以 A、B、D 为顶点列角（6 个） */
    {
      ch: 3, kind: 'list', fig: 'fig2',
      q: '列出以 A、B、D 为顶点的所有角',
      names: ['∠BAD', '∠DAC', '∠BAC', '∠ABD', '∠ADB', '∠ADC', '∠BDC', '∠ECF', '∠DAF'],
      ans: [0, 1, 2, 3, 4, 5],
      answer: '共 6 个：∠BAD、∠DAC、∠BAC、∠ABD、∠ADB、∠ADC',
      tip: '只要小于平角的角；先看顶点引出几条射线',
      note: 'A 处 3 条射线配 3 个角；D 处 ∠BDC 是平角要去掉',
      why: {
        6: 'B、D、C 在一条直线上，∠BDC 是平角，不能算',
        7: '这一问只要 A、B、D 做顶点的角，∠ECF 的顶点是 C',
        8: 'A 和 F 之间没有连线，这个角不存在'
      }
    },
    /* 26. 教材图 2：数总数（11 个） */
    {
      ch: 3, kind: 'quiz', scene: 'fig', fig: 'fig2', label: '数角',
      q: '数一数：图中共有几个小于平角的角？',
      answer: '共 11 个：A 处 3、B 处 1、D 处 2、C 处 5',
      tip: 'C 处射线最多，最容易漏——4 条射线两两配对有 6 组',
      note: '按顶点数：A:3、B:1、D:2、C:5，共 11 个',
      qs: [
        { q: '以 C 为顶点的小于平角的角有几个？', opts: ['5 个', '3 个', '6 个'], ans: 0,
          why: 'C 处 4 条射线 CB、CA、CE、CF 配 6 组，去掉平角 ∠BCF 剩 5 个' },
        { q: '以 D 为顶点的有几个？', opts: ['2 个', '3 个', '1 个'], ans: 0,
          why: 'D 处 3 条射线 DB、DA、DC，DB 和 DC 合成平角去掉，剩 2 个' },
        { q: '图中小于平角的角共有几个？', opts: ['11 个', '8 个', '13 个'], ans: 0,
          why: 'A 处 3 个、B 处 1 个、D 处 2 个、C 处 5 个，共 11 个' },
        { q: 'E 处有没有要列的角？', opts: ['没有，E 只引出一条射线', '有 1 个', '有 2 个'], ans: 0,
          why: '一个角要两条射线，E 处只有 EC 一条，构不成角' }
      ]
    }
  ];

  /* ---------------- 小工具 ---------------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function font(size, weight) {
    return (weight || 400) + ' ' + size + 'px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function drawChevron(ctx, x, y, dir) {
    ctx.beginPath();
    ctx.moveTo(x - dir * 4, y - 5);
    ctx.lineTo(x + dir * 2, y);
    ctx.lineTo(x - dir * 4, y + 5);
    ctx.stroke();
  }
  function starPath(ctx, cx, cy, R2, r2) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + i * Math.PI / 5;
      var rad = i % 2 === 0 ? R2 : r2;
      var x = cx + Math.cos(ang) * rad;
      var y = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  function easeOutBack(x) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }
  function classify(d) {
    if (d < TOL) return '零角';
    if (d < 90 - TOL) return '锐角';
    if (d <= 90 + TOL) return '直角';
    if (d < 180 - TOL) return '钝角';
    if (d <= 180 + TOL) return '平角';
    if (d < 360 - TOL) return '超过平角';
    return '周角';
  }

  var AC = null;
  function tone(freq, dur, vol) {
    try {
      if (typeof window === 'undefined') return;
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      if (!AC) AC = new Ctor();
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.value = 0;
      o.connect(g); g.connect(AC.destination);
      var now = AC.currentTime;
      g.gain.linearRampToValueAtTime(vol || 0.05, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.start(now); o.stop(now + dur + 0.02);
    } catch (e) {}
  }

  var STORE_KEY = 'angle.progress.v1';
  function loadDone() {
    try {
      if (typeof localStorage === 'undefined') return {};
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? (JSON.parse(raw) || {}) : {};
    } catch (e) { return {}; }
  }
  function saveDone(o) {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(STORE_KEY, JSON.stringify(o));
    } catch (e) {}
  }

  /* ---------------- 主体 ---------------- */
  function AngleGame(ctx) {
    this.ctx = ctx;
    this.cw = DW; this.ch = DH;
    this.scale = 1; this.ox = 0; this.oy = 0;
    this.t = 0;
    this.index = 0;
    this.deg = 45;
    this.mode = 'menu';
    this.dragging = false;
    this.solved = false;
    this.solvedAt = -1;
    this.overlayAt = -1;
    this.misses = 0;
    this.done = loadDone();
    this.pressed = -1;
    this.toast = null;
    this.flash = null;
    this.resetAt = -1;
    this.qi = 0;
    this.qWrong = 0;
    this.qFlash = null;
    this.qWhy = '';
    this.qNextAt = 0;
    this.picked = -1;
    this.pickBad = -1;
    this.multiSel = {};
    this.multiShakeAt = -1;
    this.doneAt = 0;
    this.loadLevel(0);
    this.mode = 'menu';
  }

  AngleGame.prototype.resize = function (w, h) {
    this.cw = w; this.ch = h;
    this.scale = Math.min(w / DW, h / DH);
    this.ox = (w - DW * this.scale) / 2;
    this.oy = (h - DH * this.scale) / 2;
  };
  AngleGame.prototype.toDesign = function (px, py) {
    return { x: (px - this.ox) / this.scale, y: (py - this.oy) / this.scale };
  };
  AngleGame.prototype.level = function () { return LEVELS[this.index]; };
  AngleGame.prototype.curQ = function () {
    var lv = this.level();
    if (!lv.qs) return null;
    return lv.qs[Math.min(this.qi, lv.qs.length - 1)];
  };

  AngleGame.prototype.loadLevel = function (i) {
    this.index = clamp(i, 0, LEVELS.length - 1);
    var lv = this.level();
    if (lv.kind === 'drag') this.deg = lv.start;
    else if (lv.kind === 'tap') this.deg = lv.deg;
    else if (lv.kind === 'quiz') this.deg = lv.qs[0].deg != null ? lv.qs[0].deg : 45;
    else this.deg = 45;

    this.levelStartAt = this.t;
    this.solved = false;
    this.solvedAt = -1;
    this.overlayAt = -1;
    this.misses = 0;
    this.dragging = false;
    this.flash = null;
    this.qi = 0;
    this.qWrong = 0;
    this.qFlash = null;
    this.qWhy = '';
    this.qNextAt = 0;
    this.picked = -1;
    this.pickBad = -1;
    this.multiSel = {};
    this.multiShakeAt = -1;
    this.doneAt = 0;
  };

  AngleGame.prototype.openMenu = function () {
    this.mode = 'menu';
    this.pressed = -1;
    this.resetAt = -1;
    this.dragging = false;
    this.solved = false;
    this.solvedAt = -1;
    this.overlayAt = -1;
  };

  /* ---------- 几何 ---------- */
  AngleGame.prototype.bEnd = function () {
    var a = this.deg * Math.PI / 180;
    return { x: O.x + R * Math.cos(a), y: O.y - R * Math.sin(a) };
  };
  AngleGame.prototype.ptAt = function (deg, rad) {
    var a = deg * Math.PI / 180;
    return { x: O.x + rad * Math.cos(a), y: O.y - rad * Math.sin(a) };
  };

  /* ---------- 输入 ---------- */
  AngleGame.prototype.pointer = function (type, px, py) {
    var p = this.toDesign(px, py);
    if (this.mode === 'menu') { this.pointerMenu(type, p); return; }

    if (type === 'down' && this.hitBack(p)) {
      tone(430, 0.06, 0.025);
      this.openMenu();
      return;
    }
    if (this.solved && this.overlayAt > 0 && this.t - this.overlayAt > 0.35) {
      if (type === 'down') {
        if (this.hitOverlayMenu(p)) { tone(430, 0.06, 0.025); this.openMenu(); }
        else this.advance();
      }
      return;
    }
    if (this.solved) return;

    var lv = this.level();
    if (lv.kind === 'drag') this.pointerDrag(type, p);
    else if (lv.kind === 'quiz') this.pointerQuiz(type, p);
    else if (lv.kind === 'multi') this.pointerMulti(type, p);
    else if (lv.kind === 'list') this.pointerList(type, p);
    else if (lv.kind === 'pick') this.pointerPick(type, p);
    else this.pointerTap(type, p);
  };

  /* ---------- 拖射线 ---------- */
  AngleGame.prototype.pointerDrag = function (type, p) {
    if (type === 'down') {
      var b = this.bEnd();
      var dx = p.x - b.x, dy = p.y - b.y;
      if (dx * dx + dy * dy <= 34 * 34 || this.onRay(p)) {
        this.dragging = true;
        this.moveTo(p);
        tone(600, 0.05, 0.02);
      }
      return;
    }
    if (type === 'move') { if (this.dragging) this.moveTo(p); return; }
    if (type === 'up') {
      if (!this.dragging) return;
      this.dragging = false;
      this.check();
    }
  };
  AngleGame.prototype.onRay = function (p) {
    var dx = p.x - O.x, dy = p.y - O.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 30 || dist > R + 26) return false;
    var want = this.deg * Math.PI / 180;
    var ang = Math.atan2(-dy, dx);
    var d = Math.abs(ang - want);
    while (d > Math.PI) d = Math.abs(d - 2 * Math.PI);
    return d < 0.18;
  };
  AngleGame.prototype.moveTo = function (p) {
    var dx = p.x - O.x, dy = O.y - p.y;
    var raw = Math.atan2(dy, dx) * 180 / Math.PI;
    /* 展开到离当前角度最近的一圈，才能超过 180° 继续转 */
    var base = raw;
    while (base - this.deg > 180) base -= 360;
    while (this.deg - base > 180) base += 360;
    this.deg = clamp(Math.round(base), 0, 360);
  };
  AngleGame.prototype.check = function () {
    var lv = this.level();
    if (Math.abs(this.deg - lv.target) <= TOL) {
      this.solve();
    } else {
      this.misses++;
      this.flash = { diff: this.deg - lv.target, at: this.t };
      tone(220, 0.12, 0.03);
    }
  };

  /* ---------- 选图形 ---------- */
  AngleGame.prototype.pickBoxes = function () {
    var w = 98, gap = 14, y = 214, h = 118;
    var x0 = (DW - (3 * w + 2 * gap)) / 2;
    var out = [];
    for (var i = 0; i < 3; i++) out.push({ i: i, x: x0 + i * (w + gap), y: y, w: w, h: h });
    return out;
  };
  AngleGame.prototype.pointerPick = function (type, p) {
    if (type !== 'down' || this.doneAt) return;
    var boxes = this.pickBoxes(), lv = this.level();
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (p.x >= b.x - 4 && p.x <= b.x + b.w + 4 && p.y >= b.y - 4 && p.y <= b.y + b.h + 4) {
        if (i === lv.ans) {
          this.picked = i;
          this.doneAt = this.t + 0.65;
          tone(720, 0.09, 0.04);
        } else {
          this.pickBad = i;
          this.misses++;
          this.qWhy = (lv.why && lv.why[i]) || '';
          tone(220, 0.12, 0.03);
        }
        return;
      }
    }
  };

  /* ---------- 多选：哪些是角 ---------- */
  AngleGame.prototype.multiBoxes = function () {
    var w = (DW - 48 - 12) / 2, h = 112, gx = 12, gy = 12, y0 = 208;
    var out = [];
    for (var i = 0; i < 4; i++) {
      out.push({
        i: i,
        x: 24 + (i % 2) * (w + gx),
        y: y0 + Math.floor(i / 2) * (h + gy),
        w: w, h: h
      });
    }
    return out;
  };
  AngleGame.prototype.multiConfirmBtn = function () {
    return { x: DW / 2 - 70, y: 470, w: 140, h: 42 };
  };
  AngleGame.prototype.pointerMulti = function (type, p) {
    if (type !== 'down' || this.doneAt) return;
    var lv = this.level(), boxes = this.multiBoxes(), btn = this.multiConfirmBtn();

    if (p.x >= btn.x && p.x <= btn.x + btn.w && p.y >= btn.y && p.y <= btn.y + btn.h) {
      var sel = Object.keys(this.multiSel).map(Number).sort();
      var ans = lv.ans.slice().sort();
      var ok = sel.length === ans.length;
      if (ok) for (var k = 0; k < sel.length; k++) if (sel[k] !== ans[k]) { ok = false; break; }
      if (ok) {
        this.doneAt = this.t + 0.6;
        this.qWhy = '';
        tone(720, 0.09, 0.04);
      } else {
        this.misses++;
        var msg = '';
        for (var s = 0; s < sel.length; s++) {
          if (lv.ans.indexOf(sel[s]) < 0) { msg = (lv.why && lv.why[sel[s]]) || '这个图形不是角'; break; }
        }
        if (!msg) {
          for (var a = 0; a < ans.length; a++) {
            if (sel.indexOf(ans[a]) < 0) { msg = (lv.why && lv.why[ans[a]]) || '漏了一个角，再找找'; break; }
          }
        }
        this.qWhy = msg || '选得不对，再想想';
        this.multiShakeAt = this.t;
        tone(220, 0.12, 0.03);
      }
      return;
    }

    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (p.x >= b.x - 4 && p.x <= b.x + b.w + 4 && p.y >= b.y - 4 && p.y <= b.y + b.h + 4) {
        if (this.multiSel[i]) delete this.multiSel[i];
        else this.multiSel[i] = true;
        this.qWhy = '';
        tone(this.multiSel[i] ? 560 : 440, 0.05, 0.02);
        return;
      }
    }
  };

  /* ---------- 点顶点 ---------- */
  AngleGame.prototype.tapDots = function () {
    var b = this.bEnd();
    return [
      { k: 'A', x: O.x + R, y: O.y },
      { k: 'O', x: O.x, y: O.y },
      { k: 'B', x: b.x, y: b.y }
    ];
  };
  AngleGame.prototype.pointerTap = function (type, p) {
    if (type !== 'down' || this.doneAt) return;
    var lv = this.level(), dots = this.tapDots();
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      var dx = p.x - d.x, dy = p.y - d.y;
      if (dx * dx + dy * dy <= 26 * 26) {
        if (d.k === lv.ans) {
          this.picked = i;
          this.doneAt = this.t + 0.6;
          tone(720, 0.09, 0.04);
        } else {
          this.pickBad = i;
          this.misses++;
          this.qWhy = (lv.why && lv.why[d.k]) || '';
          tone(220, 0.12, 0.03);
        }
        return;
      }
    }
  };

  /* ---------- 判断类型 ---------- */
  AngleGame.prototype.curOpts = function () {
    var lv = this.level(), q = this.curQ();
    return (q && q.opts) ? q.opts : (lv.opts || []);
  };
  AngleGame.prototype.quizButtons = function () {
    var n = this.curOpts().length, h = 40, y0 = 470, out = [], i;
    // 测量最长选项文字，放不下就改成竖排（一行一个，占满宽度）
    var ctx = this.ctx;
    ctx.font = font(14, 500);
    var maxW = 0;
    var opts = this.curOpts();
    for (i = 0; i < n; i++) maxW = Math.max(maxW, ctx.measureText(opts[i]).width);
    var stack = false;
    if (n <= 3 && maxW > (DW - 48 - (n - 1) * 8) / n - 14) stack = true;
    if (n === 4 && maxW > (DW - 48 - 10) / 2 - 14) stack = true;
    if (stack) {
      var sh = 38, gap = 8;
      // 整块底部对齐到 570（footer 在 578），同时不高于 420
      var sy = Math.max(420, 560 - (n * (sh + gap) - gap));
      for (i = 0; i < n; i++) out.push({ i: i, x: 24, y: sy + i * (sh + gap), w: DW - 48, h: sh });
      return out;
    }
    if (n <= 3) {
      var bw = n === 1 ? 200 : (DW - 48 - (n - 1) * 8) / n;
      var total = n * bw + (n - 1) * 8, x0 = (DW - total) / 2;
      for (i = 0; i < n; i++) out.push({ i: i, x: x0 + i * (bw + 8), y: y0, w: bw, h: h });
      return out;
    }
    if (n === 4) {
      var w4 = (DW - 48 - 10) / 2, y4 = this.level().scene === 'expr' ? 452 : 470;
      for (i = 0; i < 4; i++) {
        out.push({ i: i, x: 24 + (i % 2) * (w4 + 10), y: y4 + Math.floor(i / 2) * (h + 10), w: w4, h: h });
      }
      return out;
    }
    var w3 = (DW - 48 - 2 * 8) / 3;
    for (i = 0; i < n; i++) {
      var row = i < 3 ? 0 : 1;
      var col = i < 3 ? i : i - 3;
      var cnt = row === 0 ? 3 : n - 3;
      var ww = row === 0 ? w3 : (DW - 48 - 8) / Math.max(cnt, 1);
      var tt = cnt * ww + (cnt - 1) * 8;
      out.push({ i: i, x: (DW - tt) / 2 + col * (ww + 8), y: y0 + row * (h + 10), w: ww, h: h });
    }
    return out;
  };
  AngleGame.prototype.pointerQuiz = function (type, p) {
    if (type !== 'down' || this.qNextAt) return;
    var btns = this.quizButtons();
    var q = this.curQ();
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (p.x >= b.x - 3 && p.x <= b.x + b.w + 3 && p.y >= b.y - 3 && p.y <= b.y + b.h + 3) {
        if (i === q.ans) {
          this.qFlash = { ok: true, i: i };
          this.qNextAt = this.t + 0.55;
          tone(720, 0.09, 0.04);
        } else {
          this.qFlash = { ok: false, i: i };
          this.qWrong++;
          this.qWhy = q.why || '';
          tone(220, 0.12, 0.03);
        }
        return;
      }
    }
  };

  /* ---------- 过关 ---------- */
  AngleGame.prototype.solve = function () {
    if (this.solved) return;
    this.solved = true;
    this.solvedAt = this.t;
    this.overlayAt = this.t;
    var n = this.starCount();
    this.done[this.index] = Math.max(this.done[this.index] || 0, n);
    saveDone(this.done);
    tone(720, 0.09, 0.04);
    setTimeout(function () { tone(960, 0.12, 0.035); }, 110);
  };
  AngleGame.prototype.autoSolve = function () {
    var lv = this.level();
    if (lv.kind === 'drag') this.deg = lv.target;
    else if (lv.kind === 'quiz') { this.qi = lv.qs.length - 1; if (lv.qs[this.qi].deg != null) this.deg = lv.qs[this.qi].deg; }
    else if (lv.kind === 'multi' || lv.kind === 'list') { for (var k = 0; k < lv.ans.length; k++) this.multiSel[lv.ans[k]] = true; }
    this.solve();
  };
  AngleGame.prototype.advance = function () {
    if (this.index + 1 >= LEVELS.length) this.loadLevel(0);
    else this.loadLevel(this.index + 1);
  };
  AngleGame.prototype.starCount = function () {
    var lv = this.level();
    if (lv.kind === 'quiz') return this.qWrong === 0 ? 3 : (this.qWrong <= 2 ? 2 : 1);
    if (this.misses === 0) return 3;
    if (this.misses <= 2) return 2;
    return 1;
  };
  AngleGame.prototype.verdict = function () {
    var n = this.starCount(), lv = this.level();
    if (n === 3) {
      return {
        main: '太棒了！',
        sub: lv.kind === 'drag' ? '一次就调准了' : (lv.kind === 'quiz' ? '每一问都判断对了' : '一眼就认准了')
      };
    }
    if (n === 2) return { main: '不错，有进步', sub: '想清楚再动手，会更快' };
    return { main: '过关了', sub: '角的大小只看张开多少，和边画多长无关' };
  };
  AngleGame.prototype.overlayText = function () {
    var lv = this.level();
    if (lv.answer) return { answer: lv.answer, note: lv.note || '' };
    if (lv.kind === 'drag') return { answer: '∠AOB = ' + lv.target + '°', note: lv.note || '' };
    if (lv.kind === 'quiz') return { answer: '锐角 · 直角 · 钝角 · 平角 · 周角', note: lv.note || '' };
    if (lv.kind === 'pick') return { answer: '两条射线 + 公共端点 = 角', note: lv.note || '' };
    if (lv.kind === 'multi') return { answer: '角 = 公共端点 + 两条射线（平角也是角）', note: lv.note || '' };
    return { answer: '顶点 O · 边 OA 和 OB', note: lv.note || '' };
  };

  /* ---------- 命中区 ---------- */
  AngleGame.prototype.hitBack = function (p) { return p.x >= 12 && p.x <= 80 && p.y >= 22 && p.y <= 60; };
  AngleGame.prototype.hitOverlayMenu = function (p) {
    return p.x >= DW / 2 - 46 && p.x <= DW / 2 + 46 && p.y >= 470 && p.y <= 505;
  };

  /* ---------- 选关页 ---------- */
  AngleGame.prototype.menuRows = function () {
    var w = (DW - 52 - 10) / 2, h = 64, gx = 10, gy = 10, y0 = 132;
    var out = [];
    for (var i = 0; i < CHAPTERS.length; i++) {
      out.push({
        ch: CHAPTERS[i].ch, ready: CHAPTERS[i].ready,
        x: 26 + (i % 2) * (w + gx), y: y0 + Math.floor(i / 2) * (h + gy), w: w, h: h
      });
    }
    return out;
  };
  AngleGame.prototype.hitReset = function (p) {
    return p.x >= DW - 96 && p.x <= DW - 20 && p.y >= 596 && p.y <= 626;
  };
  AngleGame.prototype.firstLevelOf = function (ch) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].ch === ch) return i;
    return -1;
  };
  AngleGame.prototype.pointerMenu = function (type, p) {
    var rows = this.menuRows(), hit = -1;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (p.x >= r.x - 4 && p.x <= r.x + r.w + 4 && p.y >= r.y - 4 && p.y <= r.y + r.h + 4) hit = i;
    }
    if (type === 'down') {
      this.pressed = hit;
      this.resetAt = hit < 0 && this.hitReset(p) ? 1 : -1;
      if (hit >= 0) tone(560 + hit * 24, 0.05, 0.02);
      return;
    }
    if (type !== 'up') return;

    var was = this.pressed, wasReset = this.resetAt;
    this.pressed = -1;
    this.resetAt = -1;

    if (wasReset === 1 && this.hitReset(p)) {
      this.done = {};
      saveDone(this.done);
      tone(300, 0.1, 0.03);
      return;
    }
    if (was < 0 || was !== hit) return;

    var row = rows[hit];
    if (!row.ready) {
      this.toast = { text: '章' + CH_NUM[row.ch] + '还在建设中', at: this.t };
      tone(300, 0.1, 0.03);
      return;
    }
    var li = this.firstLevelOf(row.ch);
    if (li >= 0) {
      this.loadLevel(li);
      this.mode = 'play';
      tone(660, 0.07, 0.03);
    }
  };

  /* ---------- 帧 ---------- */
  AngleGame.prototype.update = function () {
    if (this.qNextAt && this.t >= this.qNextAt) {
      var lv = this.level();
      this.qNextAt = 0;
      this.qFlash = null;
      this.qWhy = '';
      if (this.qi + 1 >= lv.qs.length) {
        this.solve();
      } else {
        this.qi++;
        if (lv.qs[this.qi].deg != null) this.deg = lv.qs[this.qi].deg;
      }
    }
    if (this.doneAt && this.t >= this.doneAt) {
      this.doneAt = 0;
      this.solve();
    }
  };
  AngleGame.prototype.frame = function (dt) {
    this.t += dt;
    this.update();
    this.draw();
  };

  AngleGame.prototype.draw = function () {
    var ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = PAL.bg;
    ctx.fillRect(0, 0, this.cw, this.ch);
    ctx.translate(this.ox, this.oy);
    ctx.scale(this.scale, this.scale);

    if (this.mode === 'menu') {
      this.drawMenu();
      ctx.restore();
      return;
    }

    var lv = this.level();
    this.drawHeader();
    this.drawTopCard();
    if (lv.kind === 'drag') this.drawDragScene();
    else if (lv.kind === 'quiz') this.drawQuizScene();
    else if (lv.kind === 'pick') this.drawPickScene();
    else if (lv.kind === 'multi') this.drawMultiScene();
    else if (lv.kind === 'list') this.drawListScene();
    else this.drawTapScene();

    if (this.solved) this.drawOverlay();
    ctx.restore();
  };

  /* ---------- 选关页 ---------- */
  AngleGame.prototype.drawMenu = function () {
    var ctx = this.ctx;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PAL.ink;
    ctx.font = font(27, 500);
    ctx.fillText('角与角度', DW / 2, 70);

    ctx.fillStyle = PAL.ink3;
    ctx.font = font(11.5);
    ctx.fillText('角的定义 · 五类角 · 度分秒换算', DW / 2, 94);

    var rows = this.menuRows();
    for (var i = 0; i < rows.length; i++) this.drawMenuRow(rows[i], i);

    var doneN = 0;
    for (var k in this.done) if (this.done[k] > 0) doneN++;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PAL.ink3;
    ctx.font = font(10.5);
    ctx.fillText('共 ' + LEVELS.length + ' 关 · 已通过 ' + doneN + ' 关', DW / 2 - (doneN ? 22 : 0), 610);

    if (doneN > 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = this.resetAt > 0 ? PAL.ink : PAL.ink3;
      ctx.font = font(10.5);
      ctx.fillText('清空进度', DW - 26, 610);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = PAL.ink3;
    ctx.font = font(10.5);
    ctx.fillText('更多章节陆续上线', DW / 2, 640);

    if (this.toast && this.t - this.toast.at < 2) this.drawToast();
  };

  AngleGame.prototype.drawMenuRow = function (r, idx) {
    var ctx = this.ctx;
    var lvls = [];
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].ch === r.ch) lvls.push(i);
    var total = lvls.length, passed = 0;
    for (var j = 0; j < lvls.length; j++) if (this.done[lvls[j]]) passed++;
    var active = this.pressed === idx;
    var dim = !r.ready;

    rr(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.fillStyle = active ? PAL.tealBg : PAL.card;
    ctx.fill();
    ctx.strokeStyle = dim ? PAL.rule : (active ? PAL.teal : PAL.rule);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = dim ? PAL.ghost : PAL.teal;
    ctx.font = font(10, 500);
    ctx.fillText('章 ' + CH_NUM[r.ch], r.x + 14, r.y + 21);

    ctx.fillStyle = dim ? PAL.ink3 : PAL.ink;
    ctx.font = font(15, 500);
    ctx.fillText(CH_NAME[r.ch], r.x + 14, r.y + 42);

    ctx.fillStyle = dim ? PAL.ghost : PAL.ink3;
    ctx.font = font(9.5);
    ctx.fillText(dim ? '建设中' : (passed > 0 ? '已通过 ' + passed + '/' + total : total + ' 关'),
      r.x + 14, r.y + 56);
  };

  AngleGame.prototype.drawToast = function () {
    var ctx = this.ctx;
    var k = clamp((this.t - this.toast.at) / 0.18, 0, 1);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var w = ctx.measureText(this.toast.text).width + 34;
    rr(ctx, DW / 2 - w / 2, 556, w, 34, 17);
    ctx.fillStyle = 'rgba(43,42,38,0.9)';
    ctx.fill();
    ctx.fillStyle = '#FFFDF8';
    ctx.font = font(11.5, 500);
    ctx.fillText(this.toast.text, DW / 2, 573);
    ctx.restore();
  };

  /* ---------- 顶部 ---------- */
  AngleGame.prototype.drawHeader = function () {
    var ctx = this.ctx;
    var lv = this.level();

    ctx.strokeStyle = PAL.ink3;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawChevron(ctx, 30, 41, -1);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PAL.ink3;
    ctx.font = font(11.5);
    ctx.fillText('选关', 40, 45);

    ctx.strokeStyle = PAL.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(74, 32);
    ctx.lineTo(74, 50);
    ctx.stroke();

    ctx.fillText('章 ' + CH_NUM[lv.ch] + ' · ' + CH_NAME[lv.ch], 86, 45);

    ctx.textAlign = 'right';
    ctx.fillText('第 ' + (this.index + 1) + ' / ' + LEVELS.length + ' 关', 349, 45);
  };

  AngleGame.prototype.drawTopCard = function () {
    var ctx = this.ctx;
    var lv = this.level();

    if (lv.kind === 'drag') {
      var dif = Math.abs(this.deg - lv.target);
      var hit = dif <= TOL;
      rr(ctx, 24, 70, DW - 48, 102, 16);
      ctx.fillStyle = PAL.card;
      ctx.fill();
      ctx.strokeStyle = hit ? PAL.teal : PAL.rule;
      ctx.lineWidth = hit ? 1.6 : 1;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = PAL.ink3;
      ctx.font = font(10.5, 500);
      ctx.fillText('目标', 40, 94);

      ctx.fillStyle = PAL.ink;
      ctx.font = font(20, 500);
      ctx.fillText('∠AOB = ' + lv.target + '°', 40, 122);

      ctx.textAlign = 'right';
      ctx.fillStyle = PAL.ink3;
      ctx.font = font(10.5, 500);
      ctx.fillText('当前', DW - 40, 94);

      ctx.fillStyle = hit ? PAL.teal : (dif <= 6 ? PAL.amber : PAL.ink);
      ctx.font = font(20, 500);
      ctx.fillText(this.deg + '°', DW - 40, 122);

      var tag = classify(this.deg);
      ctx.font = font(9.5, 500);
      var tw = ctx.measureText(tag).width + 14;
      ctx.textAlign = 'center';
      rr(ctx, DW - 40 - tw, 129, tw, 16, 8);
      ctx.fillStyle = hit ? PAL.tealBg : PAL.bg;
      ctx.fill();
      ctx.fillStyle = hit ? PAL.teal : PAL.ink3;
      ctx.fillText(tag, DW - 40 - tw / 2, 140);

      ctx.textAlign = 'left';
      ctx.fillStyle = PAL.ink3;
      ctx.font = font(10.5);
      ctx.fillText(lv.tip || '', 40, 158);
      return;
    }

    /* 判断题 / 选择题：卡里放问题 */
    rr(ctx, 24, 70, DW - 48, 96, 16);
    ctx.fillStyle = PAL.card;
    ctx.fill();
    ctx.strokeStyle = PAL.rule;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PAL.ink3;
    ctx.font = font(10.5, 500);
    ctx.fillText(lv.label || (lv.kind === 'quiz' ? '判断' : (lv.kind === 'multi' ? '多选' : '问题')), 40, 94);

    if (lv.kind === 'quiz') {
      ctx.textAlign = 'right';
      ctx.fillStyle = PAL.ink3;
      ctx.font = font(10.5);
      ctx.fillText('第 ' + (this.qi + 1) + ' / ' + lv.qs.length + ' 问', DW - 40, 94);
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = PAL.ink;
    ctx.font = font(17, 500);
    this.wrap(lv.q, 40, 120, DW - 80, 22);

    ctx.fillStyle = PAL.ink3;
    ctx.font = font(10.5);
    ctx.fillText(lv.tip || '', 40, 154);
  };

  /* ---------- 刻度圈 / 通用 ---------- */
  AngleGame.prototype.drawTicks = function () {
    var ctx = this.ctx, i, p1, p2;
    for (i = 0; i <= 360; i += 15) {
      var long = (i % 45 === 0);
      p1 = this.ptAt(i, R + 5);
      p2 = this.ptAt(i, R + (long ? 13 : 9));
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = long ? PAL.ghost : PAL.rule;
      ctx.lineWidth = long ? 1.4 : 1;
      ctx.stroke();
    }
  };

  AngleGame.prototype.drawRays = function (opts) {
    var ctx = this.ctx;
    opts = opts || {};
    var b = this.bEnd();

    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(O.x, O.y);
    ctx.lineTo(O.x + R, O.y);
    ctx.stroke();

    ctx.strokeStyle = PAL.teal;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(O.x, O.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.lineCap = 'butt';

    /* 旋转方向：说明「角是转出来的」 */
    if (opts.sweep !== false && this.deg > 12) {
      var rr2 = R * 0.62;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = PAL.teal;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(O.x, O.y, rr2, 0, -this.deg * Math.PI / 180, true);
      ctx.stroke();
      ctx.setLineDash([]);
      var tip = this.ptAt(this.deg, rr2);
      var dir = this.deg * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(tip.x - 6 * Math.cos(dir - 0.5), tip.y + 6 * Math.sin(dir - 0.5));
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(tip.x - 6 * Math.cos(dir + 0.5), tip.y + 6 * Math.sin(dir + 0.5));
      ctx.stroke();
      ctx.restore();
    }
  };

  AngleGame.prototype.drawAngleArc = function (opts) {
    var ctx = this.ctx;
    opts = opts || {};
    ctx.beginPath();
    ctx.arc(O.x, O.y, opts.r || ARC_R, 0, -this.deg * Math.PI / 180, true);
    ctx.strokeStyle = opts.color || PAL.ink;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    if (opts.label !== false) {
      var mid = this.deg / 2;
      var lab = this.ptAt(mid, (opts.r || ARC_R) + 20);
      ctx.fillStyle = opts.color || PAL.ink;
      ctx.font = font(15, 500);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.deg + '°', lab.x, lab.y);
    }
  };

  AngleGame.prototype.drawVertex = function (opts) {
    var ctx = this.ctx;
    opts = opts || {};
    ctx.beginPath();
    ctx.arc(O.x, O.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = PAL.ink;
    ctx.fill();
    if (opts.labels !== false) {
      ctx.font = font(13.5, 500);
      ctx.fillStyle = PAL.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('O', O.x + 17, O.y + 24);
      ctx.fillText('A', O.x + R + 14, O.y + 6);
    }
  };

  AngleGame.prototype.drawRightMark = function () {
    if (Math.abs(this.deg - 90) > TOL) return;
    var ctx = this.ctx, s = 13;
    ctx.strokeStyle = PAL.ink3;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(O.x + s, O.y);
    ctx.lineTo(O.x + s, O.y - s);
    ctx.lineTo(O.x, O.y - s);
    ctx.stroke();
  };

  /* ---------- 拖射线场景 ---------- */
  AngleGame.prototype.drawDragScene = function () {
    var ctx = this.ctx;
    var lv = this.level();
    var ga = clamp((this.t - this.levelStartAt - GHOST_DELAY) / 0.6, 0, 1);

    this.drawTicks();

    if (ga > 0) {
      ctx.save();
      ctx.globalAlpha = ga * 0.95;
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = PAL.ghost;
      ctx.lineWidth = 1.6;
      if (lv.target >= 359) {
        ctx.beginPath();
        ctx.arc(O.x, O.y, R * 0.84, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = PAL.ink3;
        ctx.font = font(10.5, 500);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('绕一整圈', O.x, O.y - R * 0.84 - 12);
      } else {
        var gt = this.ptAt(lv.target, R);
        ctx.beginPath();
        ctx.moveTo(O.x, O.y);
        ctx.lineTo(gt.x, gt.y);
        ctx.stroke();
        ctx.setLineDash([]);
        var gl = this.ptAt(lv.target, R + 26);
        ctx.fillStyle = PAL.ink3;
        ctx.font = font(10.5, 500);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('目标 ' + lv.target + '°', gl.x, gl.y);
      }
      ctx.restore();
    }

    this.drawRays();
    this.drawAngleArc();
    this.drawRightMark();
    this.drawVertex();

    var b = this.bEnd();
    ctx.beginPath();
    ctx.arc(b.x, b.y, this.dragging ? 15 : 13, 0, Math.PI * 2);
    ctx.fillStyle = PAL.teal;
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(11.5, 500);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B', b.x, b.y + 0.5);

    if (!this.solved && this.misses === 0 && !this.dragging) {
      var pul = 0.55 + 0.45 * Math.sin(this.t * 3);
      ctx.save();
      ctx.globalAlpha = 0.3 + 0.3 * pul;
      ctx.strokeStyle = PAL.teal;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.arc(O.x, O.y, R + 22, -0.03 * Math.PI, -0.55 * Math.PI, true);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    this.drawFooter(this.footerHint());
  };

  AngleGame.prototype.footerHint = function () {
    var lv = this.level();
    var dif = Math.abs(this.deg - lv.target);
    if (this.flash && this.t - this.flash.at < 1.6) {
      var d = Math.max(1, Math.round(Math.abs(this.flash.diff)));
      return {
        text: this.flash.diff > 0 ? ('转多了 · 收回 ' + d + '°') : ('还差 ' + d + '° · 接着张开'),
        color: PAL.wrong
      };
    }
    if (dif <= TOL) return { text: '正好！松开手就过关', color: PAL.teal };
    if (this.t - this.levelStartAt > GHOST_DELAY) {
      return { text: '往虚线方向转 ' + Math.round(dif) + '°', color: PAL.ink3 };
    }
    return {
      text: lv.target >= 359 ? '拖动 B 点，绕 O 转一整圈' : '拖动 B 点（绿色边上的圆点）改变张开大小',
      color: PAL.ink3
    };
  };

  AngleGame.prototype.drawFooter = function (hint) {
    var ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = hint.color;
    ctx.font = font(11.5, 500);
    this.wrapCenter(hint.text, DW / 2, 578, DW - 56, 16);
  };

  /* ---------- 判断类型场景 ---------- */
  AngleGame.prototype.drawQuizScene = function () {
    var ctx = this.ctx;
    var lv = this.level();
    var q = this.curQ();

    if (lv.scene === 'expr') { this.drawExprScene(); return; }
    if (lv.scene === 'fig') { this.drawFigQuizScene(); return; }

    var savedDeg = this.deg;
    this.deg = q.deg;

    this.drawTicks();
    this.drawRays({ sweep: false });
    this.drawAngleArc({ label: false });
    this.drawRightMark();
    this.drawVertex();

    if (q.deg >= 359) {
      ctx.save();
      ctx.strokeStyle = PAL.teal;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(O.x, O.y, R * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    this.deg = savedDeg;

    var btns = this.quizButtons(), opts = this.curOpts();
    for (var i = 0; i < btns.length; i++) this.drawOptButton(btns[i], opts[i]);

    var footer = { text: '判断它属于哪一类角', color: PAL.ink3 };
    if (this.qWhy) footer = { text: this.qWhy, color: PAL.wrong };
    else if (this.t - this.levelStartAt > GHOST_DELAY) footer = { text: lv.tip || '', color: PAL.ink3 };
    this.drawFooter(footer);
  };

  /* ---------- 换算题场景：题面是算式，不是角 ---------- */
  AngleGame.prototype.drawExprScene = function () {
    var ctx = this.ctx;
    var lv = this.level();
    var q = this.curQ();
    var top = 186, bot = 424;

    rr(ctx, 24, top, DW - 48, bot - top, 16);
    ctx.fillStyle = PAL.card;
    ctx.fill();
    ctx.strokeStyle = this.qFlash && this.qFlash.ok ? PAL.teal : PAL.rule;
    ctx.lineWidth = this.qFlash && this.qFlash.ok ? 1.5 : 1;
    ctx.stroke();

    /* 这一问的问题文字（算式场景没它选项就没有上下文） */
    if (q.q) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = PAL.ink;
      ctx.font = font(14, 500);
      ctx.fillText(q.q, DW / 2, 218);
    }

    /* 大字算式 */
    var text = q.expr || '';
    var size = 30;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PAL.ink;
    ctx.font = font(size, 500);
    while (ctx.measureText(text).width > DW - 86 && size > 16) {
      size -= 2;
      ctx.font = font(size, 500);
    }
    ctx.fillText(text, DW / 2, 254);

    if (q.sub) {
      ctx.fillStyle = PAL.ink3;
      ctx.font = font(11.5);
      ctx.fillText(q.sub, DW / 2, 284);
    }

    /* 已完成的步骤（本关是链式的，后一步要用前一步的结论） */
    var lines = [], k;
    for (k = 0; k < this.qi; k++) if (lv.qs[k].done) lines.push(lv.qs[k].done);
    if (lines.length) {
      ctx.strokeStyle = PAL.rule;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(46, 306);
      ctx.lineTo(DW - 46, 306);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = PAL.ink3;
      ctx.font = font(10, 500);
      ctx.fillText('前面算出的', 46, 324);

      for (k = 0; k < lines.length && k < 3; k++) {
        ctx.fillStyle = PAL.teal;
        ctx.beginPath();
        ctx.arc(52, 342 + k * 22 - 4, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PAL.teal;
        ctx.font = font(12.5, 500);
        ctx.fillText(lines[k], 62, 342 + k * 22);
      }
    } else {
      ctx.fillStyle = PAL.ink3;
      ctx.font = font(10.5);
      ctx.fillText(lv.hintline || '一步一步来，先想想这一步算什么', DW / 2, 300);
    }

    var btns = this.quizButtons(), opts = this.curOpts();
    for (var i = 0; i < btns.length; i++) this.drawOptButton(btns[i], opts[i]);

    var footer = { text: '选一个正确答案', color: PAL.ink3 };
    if (this.qWhy) footer = { text: this.qWhy, color: PAL.wrong };
    else if (this.t - this.levelStartAt > GHOST_DELAY) footer = { text: lv.tip || '', color: PAL.ink3 };
    this.drawFooter(footer);
  };

  /* ---------- 图形绘制（第三章 数角） ---------- */
  AngleGame.prototype.drawFigure = function (key, x, y, w, h) {
    var ctx = this.ctx;
    var fig = FIGS[key];
    if (!fig) return;
    var xs = [], ys = [], k;
    for (k in fig.pts) { xs.push(fig.pts[k].x); ys.push(fig.pts[k].y); }
    var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs);
    var miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
    var s = Math.min((w - 30) / (maxx - minx), (h - 30) / (maxy - miny));
    var ox = x + (w - (maxx - minx) * s) / 2, oy = y + (h - (maxy - miny) * s) / 2;
    function P(p) {
      return { x: ox + (p.x - minx) * s, y: oy + (p.y - miny) * s };
    }
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var i = 0; i < fig.segs.length; i++) {
      var p1 = P(fig.pts[fig.segs[i][0]]), p2 = P(fig.pts[fig.segs[i][1]]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = PAL.ink;
    for (k in fig.pts) {
      var pt = P(fig.pts[k]);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = font(13, 500);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(k, pt.x + fig.pts[k].dx, pt.y + fig.pts[k].dy);
    }
  };

  /* ---------- 列角题：勾选图中所有小于平角的角 ---------- */
  AngleGame.prototype.listChips = function () {
    var lv = this.level();
    var n = lv.names.length;
    var per = 3, w = (DW - 48 - 2 * 8) / 3, h = 36, gx = 8, gy = 8, y0 = 352;
    var out = [];
    for (var i = 0; i < n; i++) {
      var row = Math.floor(i / per), col = i % per;
      var inRow = Math.min(per, n - row * per);
      var x0 = (DW - (inRow * w + (inRow - 1) * gx)) / 2;
      out.push({ i: i, x: x0 + col * (w + gx), y: y0 + row * (h + gy), w: w, h: h });
    }
    return out;
  };
  AngleGame.prototype.listConfirmBtn = function () {
    var rows = Math.ceil(this.level().names.length / 3);
    var y = 352 + rows * 36 + (rows - 1) * 8 + 14;
    return { x: DW / 2 - 70, y: y, w: 140, h: 42 };
  };
  AngleGame.prototype.pointerList = function (type, p) {
    if (type !== 'down' || this.doneAt) return;
    var lv = this.level(), chips = this.listChips(), btn = this.listConfirmBtn();

    if (p.x >= btn.x && p.x <= btn.x + btn.w && p.y >= btn.y && p.y <= btn.y + btn.h) {
      var sel = Object.keys(this.multiSel).map(Number).sort();
      var ans = lv.ans.slice().sort();
      var ok = sel.length === ans.length;
      if (ok) for (var k = 0; k < sel.length; k++) if (sel[k] !== ans[k]) { ok = false; break; }
      if (ok) {
        this.doneAt = this.t + 0.6;
        this.qWhy = '';
        tone(720, 0.09, 0.04);
      } else {
        this.misses++;
        var msg = '';
        for (var s = 0; s < sel.length; s++) {
          if (lv.ans.indexOf(sel[s]) < 0) { msg = (lv.why && lv.why[sel[s]]) || '这个不是图中要列的角'; break; }
        }
        if (!msg) {
          for (var a = 0; a < ans.length; a++) {
            if (sel.indexOf(ans[a]) < 0) { msg = (lv.why && lv.why[ans[a]]) || '还漏了角，每个顶点都再检查一遍'; break; }
          }
        }
        this.qWhy = msg || '选得不对，再想想';
        this.multiShakeAt = this.t;
        tone(220, 0.12, 0.03);
      }
      return;
    }

    for (var i = 0; i < chips.length; i++) {
      var b = chips[i];
      if (p.x >= b.x - 4 && p.x <= b.x + b.w + 4 && p.y >= b.y - 4 && p.y <= b.y + b.h + 4) {
        if (this.multiSel[i]) delete this.multiSel[i];
        else this.multiSel[i] = true;
        this.qWhy = '';
        tone(this.multiSel[i] ? 560 : 440, 0.05, 0.02);
        return;
      }
    }
  };
  AngleGame.prototype.drawListScene = function () {
    var ctx = this.ctx;
    var lv = this.level();
    var chips = this.listChips();
    var btn = this.listConfirmBtn();
    var shake = 0;
    if (this.multiShakeAt > 0 && this.t - this.multiShakeAt < 0.32) {
      shake = Math.sin((this.t - this.multiShakeAt) * 60) * 2.5;
    }

    /* 图形面板 */
    rr(ctx, 24, 182, DW - 48, 152, 16);
    ctx.fillStyle = PAL.card;
    ctx.fill();
    ctx.strokeStyle = PAL.rule;
    ctx.lineWidth = 1;
    ctx.stroke();
    this.drawFigure(lv.fig, 34, 190, DW - 68, 136);

    /* 角名 chips */
    var nSel = Object.keys(this.multiSel).length;
    for (var i = 0; i < chips.length; i++) {
      var b = chips[i];
      var on = !!this.multiSel[i];
      var bx = b.x + shake;
      rr(ctx, bx, b.y, b.w, b.h, 10);
      ctx.fillStyle = on ? PAL.tealBg : PAL.card;
      ctx.fill();
      ctx.strokeStyle = on ? PAL.teal : PAL.rule;
      ctx.lineWidth = on ? 1.6 : 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = on ? PAL.teal : PAL.ink;
      ctx.font = font(12.5, 500);
      ctx.fillText(lv.names[i], bx + b.w / 2, b.y + b.h / 2 + 0.5);

      if (on) {
        ctx.strokeStyle = PAL.teal;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(bx + 14, b.y + b.h / 2, 5.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + 11.5, b.y + b.h / 2 + 0.5);
        ctx.lineTo(bx + 13.5, b.y + b.h / 2 + 2.8);
        ctx.lineTo(bx + 17.5, b.y + b.h / 2 - 2.5);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
    }

    /* 确认按钮 */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    rr(ctx, btn.x, btn.y, btn.w, btn.h, 21);
    ctx.fillStyle = nSel > 0 ? PAL.teal : PAL.rule;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = font(15, 500);
    ctx.fillText(nSel > 0 ? '确认（已选 ' + nSel + ' 个）' : '确认', DW / 2, btn.y + btn.h / 2 + 0.5);

    if (this.qWhy) this.drawFooter({ text: this.qWhy, color: PAL.wrong });
    else this.drawFooter({ text: '点选所有符合的角，再按“确认”', color: PAL.ink3 });
  };

  /* ---------- 数角题（图形 + 选择题） ---------- */
  AngleGame.prototype.drawFigQuizScene = function () {
    var ctx = this.ctx;
    var lv = this.level();

    rr(ctx, 24, 186, DW - 48, 234, 16);
    ctx.fillStyle = PAL.card;
    ctx.fill();
    ctx.strokeStyle = PAL.rule;
    ctx.lineWidth = 1;
    ctx.stroke();
    this.drawFigure(lv.fig, 34, 196, DW - 68, 214);

    var btns = this.quizButtons(), opts = this.curOpts();
    for (var i = 0; i < btns.length; i++) this.drawOptButton(btns[i], opts[i]);

    var footer = { text: '选一个正确答案', color: PAL.ink3 };
    if (this.qWhy) footer = { text: this.qWhy, color: PAL.wrong };
    else if (this.t - this.levelStartAt > GHOST_DELAY) footer = { text: lv.tip || '', color: PAL.ink3 };
    this.drawFooter(footer);
  };

  AngleGame.prototype.drawOptButton = function (b, label) {
    var ctx = this.ctx;
    var f = this.qFlash, state = 0;
    if (f && f.i === b.i) state = f.ok ? 1 : 2;

    rr(ctx, b.x, b.y, b.w, b.h, 12);
    ctx.fillStyle = state === 1 ? PAL.teal : (state === 2 ? PAL.wrongBg : PAL.card);
    ctx.fill();
    ctx.strokeStyle = state === 1 ? PAL.teal : (state === 2 ? PAL.wrong : PAL.rule);
    ctx.lineWidth = state ? 1.6 : 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = state === 1 ? '#FFFFFF' : (state === 2 ? PAL.wrong : PAL.ink);
    ctx.font = font(14, 500);
    ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 0.5);
  };

  /* ---------- 多选场景 ---------- */
  AngleGame.prototype.drawMultiScene = function () {
    var ctx = this.ctx;
    var lv = this.level();
    var boxes = this.multiBoxes();
    var btn = this.multiConfirmBtn();
    var shake = 0;
    if (this.multiShakeAt > 0 && this.t - this.multiShakeAt < 0.32) {
      shake = Math.sin((this.t - this.multiShakeAt) * 60) * 2.5;
    }

    var nSel = Object.keys(this.multiSel).length;
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      var on = !!this.multiSel[i];
      var bx = b.x + shake;

      rr(ctx, bx, b.y, b.w, b.h, 14);
      ctx.fillStyle = on ? PAL.tealBg : PAL.card;
      ctx.fill();
      ctx.strokeStyle = on ? PAL.teal : PAL.rule;
      ctx.lineWidth = on ? 1.8 : 1;
      ctx.stroke();

      this.drawFig(lv.figs[i].kind, { x: bx, y: b.y, w: b.w, h: b.h }, false);

      /* 右上角勾选圆点 */
      ctx.beginPath();
      ctx.arc(bx + b.w - 16, b.y + 16, 9.5, 0, Math.PI * 2);
      ctx.fillStyle = on ? PAL.teal : PAL.card;
      ctx.fill();
      ctx.strokeStyle = on ? PAL.teal : PAL.rule;
      ctx.lineWidth = on ? 1.4 : 1.2;
      ctx.stroke();
      if (on) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx + b.w - 20, b.y + 16);
        ctx.lineTo(bx + b.w - 17, b.y + 19.5);
        ctx.lineTo(bx + b.w - 12, b.y + 12);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }

      /* 左上角编号 */
      ctx.fillStyle = PAL.ink3;
      ctx.font = font(11);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('A B C D'.charAt(i * 2), bx + 12, b.y + 16);
    }

    /* 确认按钮 */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    rr(ctx, btn.x, btn.y, btn.w, btn.h, 21);
    ctx.fillStyle = nSel > 0 ? PAL.teal : PAL.rule;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = font(15, 500);
    ctx.fillText(nSel > 0 ? '确认（已选 ' + nSel + ' 个）' : '确认', DW / 2, btn.y + btn.h / 2 + 0.5);

    if (this.qWhy) this.drawFooter({ text: this.qWhy, color: PAL.wrong });
    else this.drawFooter({ text: '点选所有是角的图形，再按“确认”', color: PAL.ink3 });
  };

  /* ---------- 选图形场景 ---------- */
  AngleGame.prototype.drawPickScene = function () {
    var lv = this.level();
    var boxes = this.pickBoxes();

    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      var state = 0;
      if (i === this.picked) state = 1;
      else if (i === this.pickBad) state = 2;

      rr(this.ctx, b.x, b.y, b.w, b.h, 14);
      this.ctx.fillStyle = state === 1 ? PAL.tealBg : PAL.card;
      this.ctx.fill();
      this.ctx.strokeStyle = state === 1 ? PAL.teal : (state === 2 ? PAL.wrong : PAL.rule);
      this.ctx.lineWidth = state ? 1.8 : 1;
      this.ctx.stroke();

      this.drawFig(lv.figs[i].kind, b, state === 2);
    }

    if (this.qWhy) this.drawFooter({ text: this.qWhy, color: PAL.wrong });
    else this.drawFooter({ text: '点一下你认为是角的那个图形', color: PAL.ink3 });
  };

  AngleGame.prototype.drawFig = function (kind, b, bad) {
    var ctx = this.ctx;
    var line = bad ? PAL.wrong : PAL.ink;
    var x = b.x, y = b.y;

    ctx.strokeStyle = line;
    ctx.fillStyle = line;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    if (kind === 'angle') {
      var vx = x + 49, vy = y + 90;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(x + 18, y + 40);
      ctx.moveTo(vx, vy);
      ctx.lineTo(x + 82, y + 46);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(vx, vy, 3.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'loose') {
      ctx.beginPath();
      ctx.moveTo(x + 26, y + 94);
      ctx.lineTo(x + 26, y + 48);
      ctx.moveTo(x + 58, y + 34);
      ctx.lineTo(x + 80, y + 68);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 26, y + 94, 3, 0, Math.PI * 2);
      ctx.arc(x + 58, y + 34, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'line') {
      /* 一条直线：没有顶点 */
      ctx.beginPath();
      ctx.moveTo(x + 16, y + 30);
      ctx.lineTo(x + 84, y + 88);
      ctx.stroke();
    } else if (kind === 'straight') {
      /* 平角：顶点在中间，两条边成一条直线 */
      ctx.beginPath();
      ctx.moveTo(x + 14, y + 62);
      ctx.lineTo(x + 86, y + 62);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 50, y + 62, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = font(11, 500);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('O', x + 50, y + 78);
    } else {
      ctx.beginPath();
      ctx.arc(x + 38, y + 86, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 54, y + 58);
      ctx.lineTo(x + 80, y + 30);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  };

  /* ---------- 点顶点场景 ---------- */
  AngleGame.prototype.drawTapScene = function () {
    var ctx = this.ctx;
    var dots = this.tapDots();

    this.drawTicks();
    this.drawRays({ sweep: false });
    this.drawAngleArc();
    this.drawVertex({ labels: false });

    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      var state = 0;
      if (i === this.picked) state = 1;
      else if (i === this.pickBad) state = 2;

      ctx.beginPath();
      ctx.arc(d.x, d.y, 13, 0, Math.PI * 2);
      ctx.fillStyle = state === 1 ? PAL.tealBg : (state === 2 ? PAL.wrongBg : PAL.card);
      ctx.fill();
      ctx.strokeStyle = state === 1 ? PAL.teal : (state === 2 ? PAL.wrong : PAL.ink3);
      ctx.lineWidth = state ? 1.8 : 1.2;
      ctx.stroke();

      ctx.fillStyle = state === 1 ? PAL.teal : (state === 2 ? PAL.wrong : PAL.ink);
      ctx.font = font(12.5, 500);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.k, d.x, d.y + 0.5);
    }

    if (this.qWhy) this.drawFooter({ text: this.qWhy, color: PAL.wrong });
    else this.drawFooter({ text: '顶点是两条边共用的那个点', color: PAL.ink3 });
  };

  /* ---------- 结算 ---------- */
  AngleGame.prototype.drawOverlay = function () {
    var ctx = this.ctx;
    var k = clamp((this.t - this.solvedAt) / 0.28, 0, 1);
    var ease = 1 - Math.pow(1 - k, 3);

    ctx.save();
    ctx.fillStyle = 'rgba(247,243,234,' + (0.9 * ease) + ')';
    ctx.fillRect(0, 0, DW, DH);

    var h = 256, y = 200 + (1 - ease) * 14;
    ctx.globalAlpha = ease;

    rr(ctx, 28, y, DW - 56, h, 18);
    ctx.fillStyle = PAL.card;
    ctx.fill();
    ctx.strokeStyle = PAL.rule;
    ctx.lineWidth = 1;
    ctx.stroke();

    var n = this.starCount(), i;
    for (i = 0; i < 3; i++) {
      var sk = clamp((this.t - this.solvedAt - 0.16 - i * 0.13) / 0.3, 0, 1);
      if (sk <= 0) continue;
      var sc = Math.max(0.01, easeOutBack(sk));
      ctx.save();
      ctx.translate(DW / 2 + (i - 1) * 36, y + 50);
      ctx.scale(sc, sc);
      starPath(ctx, 0, 0, 13.5, 5.8);
      if (i < n) { ctx.fillStyle = PAL.star; ctx.fill(); }
      else { ctx.strokeStyle = PAL.rule; ctx.lineWidth = 1.6; ctx.stroke(); }
      ctx.restore();
    }

    var v = this.verdict(), t = this.overlayText();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = PAL.ink;
    ctx.font = font(23, 500);
    ctx.fillText(v.main, DW / 2, y + 104);

    ctx.fillStyle = PAL.ink3;
    ctx.font = font(11.5);
    ctx.fillText(v.sub, DW / 2, y + 126);

    ctx.fillStyle = PAL.ink2;
    ctx.font = font(14, 500);
    this.wrap(t.answer, DW / 2, y + 156, 300, 18);

    ctx.fillStyle = PAL.ink3;
    ctx.font = font(11.5);
    this.wrap(t.note, DW / 2, y + 182, 300, 15);

    rr(ctx, DW / 2 - 78, y + h - 56, 156, 40, 20);
    ctx.fillStyle = PAL.ink;
    ctx.fill();
    ctx.fillStyle = '#FFFDF8';
    ctx.font = font(14, 500);
    ctx.fillText(this.index + 1 >= LEVELS.length ? '再来一轮' : '继续', DW / 2, y + h - 30);

    ctx.textBaseline = 'middle';
    ctx.fillStyle = PAL.ink3;
    ctx.font = font(11.5);
    ctx.fillText('选关', DW / 2 + 4, 486);
    ctx.strokeStyle = PAL.ink3;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawChevron(ctx, DW / 2 - 20, 486, -1);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    ctx.globalAlpha = 1;
    ctx.restore();
  };

  /* ---------- 文本换行 ---------- */
  var BREAK_AFTER = '，。、；：？！）】》';
  AngleGame.prototype.wrap = function (text, cx, y, maxW, lh) {
    var ctx = this.ctx;
    var line = '', lines = [];
    for (var i = 0; i < text.length; i++) {
      var test = line + text[i];
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = text[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    for (var j = 0; j < lines.length; j++) ctx.fillText(lines[j], cx, y + j * lh);
  };
  AngleGame.prototype.wrapCenter = function (text, cx, cy, maxW, lh) {
    var ctx = this.ctx;
    if (ctx.measureText(text).width <= maxW) { ctx.fillText(text, cx, cy); return; }
    var line = '', lines = [];
    for (var i = 0; i < text.length; i++) {
      var test = line + text[i];
      if (ctx.measureText(test).width > maxW && line) {
        var cut = -1;
        for (var k = line.length - 1; k >= Math.floor(line.length * 0.4); k--) {
          if (BREAK_AFTER.indexOf(line[k]) >= 0) { cut = k + 1; break; }
        }
        if (cut > 0 && cut < line.length) { lines.push(line.slice(0, cut)); line = line.slice(cut) + text[i]; }
        else { lines.push(line); line = text[i]; }
      } else line = test;
    }
    if (line) lines.push(line);
    var y0 = cy - (lines.length - 1) * lh / 2;
    for (var j = 0; j < lines.length; j++) ctx.fillText(lines[j], cx, y0 + j * lh);
  };

  root.AngleGame = AngleGame;
  if (typeof module !== 'undefined' && module.exports) module.exports = AngleGame;
})(typeof window !== 'undefined' ? window : global);
