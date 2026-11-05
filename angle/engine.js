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

  var CH_NAME = { 1: '角的概念', 2: '角的比较', 3: '角平分线', 4: '余角与补角' };
  var CH_SUB = { 1: '顶点 · 两条边 · 五类角', 2: '谁大谁小，比一比', 3: '把角分成两半', 4: '凑够 90° 和 180°' };
  var CH_NUM = { 1: '一', 2: '二', 3: '三', 4: '四' };

  var CHAPTERS = [
    { ch: 1, ready: true },
    { ch: 2, ready: false },
    { ch: 3, ready: false },
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
    /* 2. 顶点与边 */
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
    else if (lv.kind === 'quiz') this.deg = lv.qs[0].deg;
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
  AngleGame.prototype.quizButtons = function () {
    var w = (DW - 48 - 2 * 8) / 3, h = 40, y0 = 470;
    var out = [];
    for (var i = 0; i < 5; i++) {
      var row = i < 3 ? 0 : 1;
      var col = i < 3 ? i : i - 3;
      var n = row === 0 ? 3 : 2;
      var ww = row === 0 ? w : (DW - 48 - 8) / 2;
      var total = n * ww + (n - 1) * 8;
      var x0 = (DW - total) / 2;
      out.push({ i: i, x: x0 + col * (ww + 8), y: y0 + row * (h + 10), w: ww, h: h });
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
    else if (lv.kind === 'quiz') { this.qi = lv.qs.length - 1; this.deg = lv.qs[this.qi].deg; }
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
    if (lv.kind === 'drag') return { answer: '∠AOB = ' + lv.target + '°', note: lv.note || '' };
    if (lv.kind === 'quiz') return { answer: '锐角 · 直角 · 钝角 · 平角 · 周角', note: lv.note || '' };
    if (lv.kind === 'pick') return { answer: '两条射线 + 公共端点 = 角', note: lv.note || '' };
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
        this.deg = lv.qs[this.qi].deg;
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
    ctx.fillText('角的定义 · 五类角 · 角平分线', DW / 2, 94);

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
    ctx.fillText(lv.kind === 'quiz' ? '判断' : '问题', 40, 94);

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

    var btns = this.quizButtons();
    for (var i = 0; i < btns.length; i++) this.drawOptButton(btns[i], lv.opts[i]);

    var footer = { text: '判断它属于哪一类角', color: PAL.ink3 };
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
