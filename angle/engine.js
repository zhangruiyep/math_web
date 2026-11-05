/* 角与角度 · 小游戏引擎
 * 与「绝对距离」同一套架构：375×667 设计坐标、等比缩放 letterbox、选关页 + 关卡内两态。
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

  /* 场景几何：顶点 O，射线 OA 固定水平向右，OB 可拖动 */
  var O = { x: 172, y: 466 };
  var R = 150;          // 射线长度
  var ARC_R = 64;       // 角的弧半径
  var TOL = 1.5;        // 过关容差（度）
  var GHOST_DELAY = 10; // 幽灵目标射线出现时间

  var CH_NAME = { 1: '角的度量', 2: '角的比较', 3: '角平分线', 4: '余角与补角' };
  var CH_SUB = { 1: '张开多大，就是多少度', 2: '谁大谁小，比一比', 3: '把角分成两半', 4: '凑够 90° 和 180°' };
  var CH_NUM = { 1: '一', 2: '二', 3: '三', 4: '四' };

  var CHAPTERS = [
    { ch: 1, ready: true },
    { ch: 2, ready: false },
    { ch: 3, ready: false },
    { ch: 4, ready: false }
  ];

  /* 关卡：target 目标度数，start 初始度数 */
  var LEVELS = [
    { ch: 1, target: 60, start: 24, note: '比直角小的角叫锐角，60° 就是锐角' },
    { ch: 1, target: 90, start: 32, note: '90° 是直角——两条边正好互相垂直' },
    { ch: 1, target: 145, start: 40, note: '比直角大、比 180° 小的角叫钝角' }
  ];

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

  function AngleGame(ctx) {
    this.ctx = ctx;
    this.cw = DW; this.ch = DH;
    this.scale = 1; this.ox = 0; this.oy = 0;
    this.t = 0;
    this.index = 0;
    this.deg = LEVELS[0].start;
    this.mode = 'menu';
    this.dragging = false;
    this.solved = false;
    this.solvedAt = -1;
    this.overlayAt = -1;
    this.misses = 0;
    this.done = loadDone();
    this.pressed = -1;
    this.toast = null;      // {text, at}
    this.flash = null;      // {diff, at} 未命中时的差值提示
    this.resetAt = -1;
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

  AngleGame.prototype.loadLevel = function (i) {
    this.index = clamp(i, 0, LEVELS.length - 1);
    var lv = this.level();
    this.deg = lv.start;
    this.levelStartAt = this.t;
    this.solved = false;
    this.solvedAt = -1;
    this.overlayAt = -1;
    this.misses = 0;
    this.dragging = false;
    this.flash = null;
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

  /* ---------- 几何辅助 ---------- */
  AngleGame.prototype.bEnd = function () {
    var a = this.deg * Math.PI / 180;
    return { x: O.x + R * Math.cos(a), y: O.y - R * Math.sin(a) };
  };
  AngleGame.prototype.ptAt = function (deg, rad) {
    var a = deg * Math.PI / 180;
    return { x: O.x + rad * Math.cos(a), y: O.y - rad * Math.sin(a) };
  };
  AngleGame.prototype.diff = function () { return this.level().target - this.deg; };
  AngleGame.prototype.angleType = function () {
    var d = this.deg;
    if (d <= TOL) return '零角';
    if (Math.abs(d - 90) <= TOL) return '直角';
    if (d < 90) return '锐角';
    if (d < 180 - TOL) return '钝角';
    return '平角';
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

    if (type === 'down') {
      var b = this.bEnd();
      var dx = p.x - b.x, dy = p.y - b.y;
      if (dx * dx + dy * dy <= 34 * 34) {
        this.dragging = true;
        this.moveTo(p);
        tone(600, 0.05, 0.02);
      }
      return;
    }
    if (type === 'move') {
      if (this.dragging) this.moveTo(p);
      return;
    }
    if (type === 'up') {
      if (!this.dragging) return;
      this.dragging = false;
      this.check();
    }
  };

  AngleGame.prototype.moveTo = function (p) {
    var dx = p.x - O.x, dy = O.y - p.y;
    var a = Math.atan2(dy, dx) * 180 / Math.PI;
    this.deg = clamp(Math.round(a), 0, 180);
  };

  /* 只在松手时判过关 */
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

  AngleGame.prototype.solve = function () {
    this.solved = true;
    this.solvedAt = this.t;
    this.overlayAt = this.t;
    var n = this.starCount();
    this.done[this.index] = Math.max(this.done[this.index] || 0, n);
    saveDone(this.done);
    tone(720, 0.09, 0.04);
    var self = this;
    setTimeout(function () { tone(960, 0.12, 0.035); }, 110);
    return self;
  };
  AngleGame.prototype.autoSolve = function () {
    this.deg = this.level().target;
    this.solve();
  };
  AngleGame.prototype.advance = function () {
    if (this.index + 1 >= LEVELS.length) this.loadLevel(0);
    else this.loadLevel(this.index + 1);
  };
  AngleGame.prototype.starCount = function () {
    if (this.misses === 0) return 3;
    if (this.misses <= 3) return 2;
    return 1;
  };
  AngleGame.prototype.verdict = function () {
    var n = this.starCount();
    if (n === 3) return { main: '太棒了！', sub: '一次就调准了' };
    if (n === 2) return { main: '不错，有进步', sub: '多试几次，手感就来了' };
    return { main: '过关了', sub: '角的大小只看张开多少，和边长无关' };
  };
  AngleGame.prototype.overlayText = function () {
    var lv = this.level();
    return { answer: '∠AOB = ' + lv.target + '°', note: lv.note || '' };
  };

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
  AngleGame.prototype.frame = function (dt) {
    this.t += dt;
    if (this.solved && this.overlayAt < 0) this.overlayAt = this.t;
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

    this.drawHeader();
    this.drawTopCard();
    this.drawScene();
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
    ctx.fillText('角 · 度 · 角平分线', DW / 2, 94);

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

    // 章节序号
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

  /* ---------- 目标卡 + 实时读数 ---------- */
  AngleGame.prototype.drawTopCard = function () {
    var ctx = this.ctx;
    var lv = this.level();
    var dif = Math.abs(this.deg - lv.target);
    var near = dif <= 4, hit = dif <= TOL;

    rr(ctx, 24, 72, DW - 48, 86, 16);
    ctx.fillStyle = PAL.card;
    ctx.fill();
    ctx.strokeStyle = hit ? PAL.teal : PAL.rule;
    ctx.lineWidth = hit ? 1.6 : 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PAL.ink3;
    ctx.font = font(10.5, 500);
    ctx.fillText('目标', 40, 96);

    ctx.fillStyle = PAL.ink;
    ctx.font = font(21, 500);
    ctx.fillText('∠AOB = ' + lv.target + '°', 40, 126);

    // 右侧：实时读数 + 角的类型
    ctx.textAlign = 'right';
    ctx.fillStyle = PAL.ink3;
    ctx.font = font(10.5, 500);
    ctx.fillText('当前', DW - 40, 96);

    ctx.fillStyle = hit ? PAL.teal : (near ? PAL.amber : PAL.ink);
    ctx.font = font(21, 500);
    ctx.fillText(this.deg + '°', DW - 40, 126);

    // 类型标签
    var tag = this.angleType();
    ctx.font = font(10, 500);
    var tw = ctx.measureText(tag).width + 16;
    ctx.textAlign = 'center';
    rr(ctx, DW - 40 - tw, 134, tw, 17, 8.5);
    ctx.fillStyle = hit ? PAL.tealBg : PAL.bg;
    ctx.fill();
    ctx.fillStyle = hit ? PAL.teal : PAL.ink3;
    ctx.fillText(tag, DW - 40 - tw / 2, 146);
  };

  /* ---------- 场景 ---------- */
  AngleGame.prototype.drawScene = function () {
    var ctx = this.ctx;
    var lv = this.level();
    var ga = clamp((this.t - this.levelStartAt - GHOST_DELAY) / 0.6, 0, 1);

    // 刻度圈：每 15° 一个小刻度，30° 的略长
    var i, a, p1, p2;
    for (i = 0; i <= 180; i += 15) {
      a = i === 0 || i === 180;
      p1 = this.ptAt(i, R + 4);
      p2 = this.ptAt(i, R + (a ? 12 : (i % 30 === 0 ? 11 : 7)));
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = PAL.rule;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 幽灵目标射线（10 秒后出现）
    if (ga > 0) {
      ctx.save();
      ctx.globalAlpha = ga * 0.9;
      var gt = this.ptAt(lv.target, R);
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = PAL.ghost;
      ctx.lineWidth = 1.6;
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
      ctx.restore();
    }

    // 射线 OA（固定）
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(O.x, O.y);
    ctx.lineTo(O.x + R, O.y);
    ctx.stroke();

    // 射线 OB（可拖）
    var b = this.bEnd();
    ctx.strokeStyle = PAL.teal;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(O.x, O.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // 角弧
    var mid = this.deg / 2;
    ctx.beginPath();
    ctx.arc(O.x, O.y, ARC_R, 0, -this.deg * Math.PI / 180, true);
    ctx.strokeStyle = this.t < this.levelStartAt + 1 ? PAL.ink3 : PAL.ink;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 弧上的度数
    var lab = this.ptAt(mid, ARC_R + 22);
    ctx.fillStyle = PAL.ink;
    ctx.font = font(15, 500);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.deg + '°', lab.x, lab.y);

    // 顶点与字母
    ctx.beginPath();
    ctx.arc(O.x, O.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = PAL.ink;
    ctx.fill();
    ctx.font = font(13.5, 500);
    ctx.fillStyle = PAL.ink;
    ctx.fillText('O', O.x - 16, O.y + 18);

    ctx.fillText('A', O.x + R + 14, O.y + 5);

    // B 手柄
    var activeH = this.dragging;
    ctx.beginPath();
    ctx.arc(b.x, b.y, activeH ? 19 : 17, 0, Math.PI * 2);
    ctx.fillStyle = PAL.teal;
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(13, 500);
    ctx.fillText('B', b.x, b.y + 1);

    // 拖动提示：手柄外一段双向弧箭头，第一次进关时闪
    if (!this.solved && this.misses === 0 && !this.dragging) {
      var pul = 0.55 + 0.45 * Math.sin(this.t * 3);
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.35 * pul;
      ctx.strokeStyle = PAL.teal;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(O.x, O.y, R + 20, -0.02 * Math.PI, -0.5 * Math.PI - 0.02 * Math.PI, true);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 底部提示
    var hintY = 578;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    var hint = this.footerHint();
    ctx.fillStyle = hint.color;
    ctx.font = font(11.5, 500);
    this.wrapCenter(hint.text, DW / 2, hintY, DW - 56, 16);
  };

  AngleGame.prototype.footerHint = function () {
    var lv = this.level();
    var dif = Math.abs(this.deg - lv.target);
    if (this.flash && this.t - this.flash.at < 1.6) {
      var d = Math.max(1, Math.round(Math.abs(this.flash.diff)));
      return {
        text: this.flash.diff > 0 ? ('张得太开了 · 收回 ' + d + '°') : ('还差 ' + d + '° · 再张开一点'),
        color: PAL.wrong
      };
    }
    if (dif <= TOL) return { text: '正好！松开手就过关', color: PAL.teal };
    if (this.t - this.levelStartAt > GHOST_DELAY) {
      return { text: '把 B 点往虚线那边转 ' + Math.round(dif) + '°', color: PAL.ink3 };
    }
    return { text: '拖动 B 点，改变角张开的大小', color: PAL.ink3 };
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
    this.wrap(t.note, DW / 2, y + 180, 300, 16);

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
