/*
 * 绝对距离 · Distance
 * 用数轴讲「绝对值」与「线段上的动点」的拖拽解谜小游戏
 * 纯 Canvas 2D，不依赖任何框架，浏览器和微信小游戏共用同一份逻辑
 *
 * 两套场景共用同一骨架：
 *   dist —— 到锚点距离 = d（章一~三）
 *   seg  —— 线段 AB 上拖动 C，D、E 按比例跟随，观察 DE（章四~七）
 */
;(function (root) {
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
    axis: '#C4BCA8',
    teal: '#1D9E75',
    tealBg: '#E1F5EE',
    amber: '#C4872B',
    amberBg: '#FAEEDA',
    star: '#DDA43A'
  };

  var AXIS = { y: 360, x0: 34, x1: 341 };   // 水平范围固定，数值范围按关卡切换
  var PILL_Y = AXIS.y - 62;                  // dist：实时数值气泡中心 y
  var HINT_Y = AXIS.y + 58;                  // dist：拖动提示 / 距离括号所在行
  var SEG_BRACKET_Y = AXIS.y + 56;           // seg：DE 括号行
  var SEG_CHIP_Y = AXIS.y + 86;              // seg：提示 / 实验记录行
  var SEG_BTN_Y = 250;                       // seg：比例切换按钮（目标区下方空档）
  var GHOST_DELAY = 10;                      // 幽灵提示：进关后多少秒才出现
  var GHOST_FADE = 0.8;

  var CH_NAME = {
    1: '距离就是绝对值',
    2: '离 A 有多远',
    3: '相反数的绝对值',
    4: '中点的秘密',
    5: '三等分与四等分',
    6: '未知数登场',
    7: '不变量实验室'
  };
  var CH_NUM = ['', '一', '二', '三', '四', '五', '六', '七'];
  var CH_SUB = {
    1: '距离相同，左右各一个',
    2: '锚点换个位置再看',
    3: '只有符号不同，绝对值一样',
    4: 'D、E 都是中点，看 DE',
    5: '三分之一、四分之一处取点',
    6: 'AC = x，CB = y',
    7: '自由拖动，验证不变量'
  };

  var LEVELS = [
    /* ---- 章一：距离就是绝对值 ---- */
    { ch: 1, anchor: 0, d: 3, sol: [3, -3] },
    { ch: 1, anchor: 0, d: 5, sol: [5, -5] },
    { ch: 1, anchor: 0, d: 1, sol: [1, -1] },
    { ch: 1, anchor: 0, d: 0, sol: [0] },
    { ch: 1, anchor: 0, d: 7, sol: [7, -7] },
    /* ---- 章二：离 A 有多远 ---- */
    { ch: 2, anchor: 2, d: 3, sol: [5, -1] },
    { ch: 2, anchor: -1, d: 4, sol: [3, -5] },
    { ch: 2, anchor: 6, d: 4, sol: [10, 2] },
    { ch: 2, anchor: -2, d: 2, sol: [0, -4] },
    { ch: 2, anchor: 3, d: 0, sol: [3] },
    /* ---- 章三：相反数的绝对值 ---- */
    { ch: 3, anchor: 0, d: 4, sol: [-4], pinned: [4] },
    { ch: 3, anchor: 0, d: 6, sol: [6], pinned: [-6] },
    { ch: 3, anchor: 0, d: 7, sol: [-7], pinned: [7] },

    /* ---- 章四：中点的秘密（D、E 都是中点）---- */
    { ch: 4, kind: 'seg', a: 0, b: 12, t: 0.5, target: { kind: 'ac', v: 8 } },
    { ch: 4, kind: 'seg', a: 0, b: 12, t: 0.5, target: { kind: 'ac', v: 5 } },
    { ch: 4, kind: 'seg', a: 0, b: 10, t: 0.5, target: { kind: 'ac', v: 4 } },
    { ch: 4, kind: 'seg', a: 0, b: 16, t: 0.5, target: { kind: 'ac', v: 6 } },
    { ch: 4, kind: 'seg', a: 0, b: 12, t: 0.5, target: { kind: 'ac', v: 6 } },

    /* ---- 章五：三等分与四等分 ---- */
    { ch: 5, kind: 'seg', a: 0, b: 12, t: 1 / 3, target: { kind: 'ac', v: 6 } },
    { ch: 5, kind: 'seg', a: 0, b: 12, t: 1 / 3, target: { kind: 'ac', v: 9 } },
    { ch: 5, kind: 'seg', a: 0, b: 12, t: 1 / 4, target: { kind: 'ac', v: 4 } },
    { ch: 5, kind: 'seg', a: 0, b: 18, t: 1 / 3, target: { kind: 'ac', v: 7.5 } },

    /* ---- 章六：未知数登场（AC = x，CB = y）---- */
    { ch: 6, kind: 'seg', a: 0, b: 12, t: 0.5, algebra: true, target: { kind: 'ac', v: 5 } },
    { ch: 6, kind: 'seg', a: 0, b: 12, t: 0.5, algebra: true, target: { kind: 'ac', v: 8 } },
    { ch: 6, kind: 'seg', a: 0, b: 12, t: 0.5, algebra: true, target: { kind: 'ac', v: 2.5 } },
    { ch: 6, kind: 'seg', a: 0, b: 12, t: 0.5, algebra: true, target: { kind: 'cb', v: 9 } },

    /* ---- 章七：不变量实验室（自由拖动验证）---- */
    { ch: 7, kind: 'seg', a: 0, b: 12, t: 0.5, explore: true, need: 3 },
    { ch: 7, kind: 'seg', a: 0, b: 12, t: 1 / 3, explore: true, need: 3 },
    { ch: 7, kind: 'seg', a: 0, b: 12, t: 0.5, explore: true, need: 3, ratios: [0.5, 1 / 3, 0.25] }
  ];

  function unit() { return (AXIS.x1 - AXIS.x0); }
  function snap(v) { return Math.round(v * 2) / 2; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* 按章切分关卡：返回 [{ch, from, to}] */
  function chapterGroups() {
    var out = [];
    for (var i = 0; i < LEVELS.length; i++) {
      var c = LEVELS[i].ch;
      if (!out.length || out[out.length - 1].ch !== c) out.push({ ch: c, from: i, to: i });
      else out[out.length - 1].to = i;
    }
    return out;
  }

  /* 进度存档（浏览器用 localStorage，取不到就只记在内存里） */
  var STORE_KEY = 'bound.progress.v1';
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
  function fmt(v) {
    var r = Math.round(v * 10) / 10;
    return String(r).replace('-', '\u2212');
  }
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

  function BoundGame(ctx) {
    this.ctx = ctx;
    this.cw = DW;
    this.ch = DH;
    this.scale = 1;
    this.ox = 0;
    this.oy = 0;
    this.t = 0;
    this.index = 0;
    this.handles = [];
    this.pinned = [];
    this.dragging = -1;
    this.active = 0;
    this.solved = false;
    this.solvedAt = -1;
    this.overlayAt = -1;
    this.everDragged = false;
    this.c = 3;
    this.records = [];
    this.ratioTried = {};
    this.ratioIndex = -1;
    this.mode = 'menu';          // 'menu' 选关页 / 'play' 关卡内
    this.pressed = -1;           // 选关页按下的章节行
    this.resetAt = -1;           // 「清空进度」按下态
    this.done = loadDone();      // 每关最好星数
    this.loadLevel(0);
    this.mode = 'menu';
  }

  BoundGame.prototype.resize = function (w, h) {
    this.cw = w; this.ch = h;
    this.scale = Math.min(w / DW, h / DH);
    this.ox = (w - DW * this.scale) / 2;
    this.oy = (h - DH * this.scale) / 2;
  };

  BoundGame.prototype.level = function () { return LEVELS[this.index]; };
  BoundGame.prototype.isSeg = function () { return this.level().kind === 'seg'; };

  /* ---------- 坐标映射：数值范围随关卡切换 ---------- */
  BoundGame.prototype.setAxisRange = function () {
    var lv = this.level();
    if (lv.kind === 'seg') {
      this.axMin = lv.a - 0.6;
      this.axMax = lv.b + 0.6;
    } else {
      this.axMin = -10;
      this.axMax = 10;
    }
  };
  BoundGame.prototype.vx = function (v) {
    return AXIS.x0 + (v - this.axMin) * unit() / (this.axMax - this.axMin);
  };
  BoundGame.prototype.xv = function (px) {
    return this.axMin + (px - AXIS.x0) * (this.axMax - this.axMin) / unit();
  };

  BoundGame.prototype.loadLevel = function (i) {
    this.index = clamp(i, 0, LEVELS.length - 1);
    var lv = LEVELS[this.index];
    this.setAxisRange();

    this.handles = [];
    this.pinned = (lv.pinned || []).slice();

    if (lv.kind === 'seg') {
      var start = snap(lv.a + (lv.b - lv.a) * 0.2);
      var tgt = this.targetValue();
      if (tgt !== null && Math.abs((start - lv.a) - tgt) < 1) start = snap(lv.a + (lv.b - lv.a) * 0.6);
      this.c = clamp(start, lv.a + 0.5, lv.b - 0.5);
      this.ratio = lv.t;
      this.records = [];
      this.ratioTried = {};
      this.ratioIndex = -1;
    } else {
      var park = [8, -8];
      for (var k = 0; k < lv.sol.length; k++) {
        var st = park[k % 2];
        if (Math.abs(st - lv.sol[k]) < 1) st = st > 0 ? -6 : 6;
        this.handles.push({ v: st });
      }
    }

    this.levelStartAt = this.t;
    this.drags = 0;
    this.dragging = -1;
    this.active = 0;
    this.solved = false;
    this.solvedAt = -1;
    this.overlayAt = -1;
    this.everDragged = false;
    this.mode = 'play';
  };

  BoundGame.prototype.targetValue = function () {
    var lv = this.level();
    if (lv.kind !== 'seg' || !lv.target) return null;
    return lv.target.v;
  };

  BoundGame.prototype.targetC = function () {
    var lv = this.level();
    if (lv.kind !== 'seg' || !lv.target) return null;
    return lv.target.kind === 'ac' ? lv.a + lv.target.v : lv.b - lv.target.v;
  };

  BoundGame.prototype.dPos = function () {
    var lv = this.level();
    return lv.a + this.ratio * (this.c - lv.a);
  };
  BoundGame.prototype.ePos = function () {
    var lv = this.level();
    return lv.b - this.ratio * (lv.b - this.c);
  };
  BoundGame.prototype.deLen = function () {
    return this.ePos() - this.dPos();
  };

  BoundGame.prototype.toDesign = function (px, py) {
    return { x: (px - this.ox) / this.scale, y: (py - this.oy) / this.scale };
  };

  /* ---------- 比例按钮（章七最后一关）---------- */
  BoundGame.prototype.ratioButtons = function () {
    var lv = this.level();
    if (!lv.ratios) return null;
    var w = 62, h = 34, gap = 10;
    var total = lv.ratios.length * w + (lv.ratios.length - 1) * gap;
    var x0 = DW / 2 - total / 2;
    var out = [];
    for (var i = 0; i < lv.ratios.length; i++) {
      out.push({ i: i, x: x0 + i * (w + gap), y: SEG_BTN_Y, w: w, h: h, t: lv.ratios[i] });
    }
    return out;
  };

  BoundGame.prototype.ratioLabel = function (t) {
    if (Math.abs(t - 0.5) < 1e-6) return '1/2';
    if (Math.abs(t - 1 / 3) < 1e-6) return '1/3';
    if (Math.abs(t - 0.25) < 1e-6) return '1/4';
    return String(t);
  };

  /* ---------- 指针 ---------- */
  BoundGame.prototype.hitBack = function (p) {
    return p.x >= 12 && p.x <= 80 && p.y >= 24 && p.y <= 64;
  };
  BoundGame.prototype.hitOverlayMenu = function (p) {
    return Math.abs(p.x - DW / 2) <= 52 && p.y >= 466 && p.y <= 504;
  };

  BoundGame.prototype.openMenu = function () {
    this.mode = 'menu';
    this.pressed = -1;
    this.resetAt = -1;
    this.dragging = -1;
    this.solved = false;
    this.solvedAt = -1;
    this.overlayAt = -1;
  };

  BoundGame.prototype.pointer = function (type, px, py) {
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

    if (this.isSeg()) this.pointerSeg(type, p);
    else this.pointerDist(type, p);
  };

  /* ---------- 选关页 ---------- */
  BoundGame.prototype.menuRows = function () {
    var groups = chapterGroups();
    var x = 26, w = DW - 52, h = 56, gap = 10, y0 = 124;
    var out = [];
    for (var i = 0; i < groups.length; i++) {
      out.push({
        ch: groups[i].ch, from: groups[i].from, to: groups[i].to,
        x: x, y: y0 + i * (h + gap), w: w, h: h
      });
    }
    return out;
  };

  BoundGame.prototype.hitReset = function (p) {
    return p.x >= DW - 96 && p.x <= DW - 20 && p.y >= 596 && p.y <= 626;
  };

  BoundGame.prototype.pointerMenu = function (type, p) {
    var rows = this.menuRows();
    var hit = -1;
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
    if (type === 'move') return;
    if (type !== 'up') return;

    var was = this.pressed, wasReset = this.resetAt;
    this.pressed = -1;
    this.resetAt = -1;
    if (hit >= 0 && hit === was) {
      tone(700, 0.1, 0.04);
      this.loadLevel(rows[hit].from);
      return;
    }
    if (hit < 0 && wasReset > 0 && this.hitReset(p)) {
      this.done = {};
      saveDone(this.done);
      tone(320, 0.12, 0.03);
    }
  };

  /* ---------- 场景一：到锚点的距离 ---------- */
  BoundGame.prototype.pointerDist = function (type, p) {
    if (type === 'down') {
      var best = -1, bd = 1e9;
      for (var i = 0; i < this.handles.length; i++) {
        var dist = Math.abs(this.vx(this.handles[i].v) - p.x);
        if (dist < 50 && dist < bd) { bd = dist; best = i; }
      }
      if (best < 0 && Math.abs(p.y - AXIS.y) < 95) {
        var nb = -1, nd = 1e9;
        for (var j = 0; j < this.handles.length; j++) {
          var d2 = Math.abs(this.vx(this.handles[j].v) - p.x);
          if (d2 < nd) { nd = d2; nb = j; }
        }
        best = nb;
      }
      if (best >= 0) {
        this.dragging = best;
        this.active = best;
        this.drags++;
        this.moveTo(p.x);
      }
    } else if (type === 'move') {
      if (this.dragging >= 0) this.moveTo(p.x);
    } else if (type === 'up') {
      if (this.dragging >= 0) {
        this.dragging = -1;
        this.check();
      }
    }
  };

  BoundGame.prototype.moveTo = function (px) {
    var v = clamp(this.xv(px), this.axMin, this.axMax);
    v = snap(v);
    var h = this.handles[this.dragging];
    if (h && h.v !== v) {
      h.v = v;
      this.everDragged = true;
      tone(560 + Math.abs(v) * 8, 0.05, 0.02);
      // 拖动过程中只更新视觉反馈，不做过关判断——松手才算数
    }
  };

  /* ---------- 场景二：线段上的动点 ---------- */
  BoundGame.prototype.pointerSeg = function (type, p) {
    if (type === 'down') {
      var btns = this.ratioButtons();
      if (btns) {
        for (var b = 0; b < btns.length; b++) {
          var bt = btns[b];
          if (p.x >= bt.x - 6 && p.x <= bt.x + bt.w + 6 && p.y >= bt.y - 10 && p.y <= bt.y + bt.h + 10) {
            if (this.ratioIndex !== bt.i) {
              this.ratioIndex = bt.i;
              this.ratio = bt.t;
              this.records = [];
              tone(520, 0.07, 0.03);
            }
            return;
          }
        }
      }

      var nearC = Math.abs(this.vx(this.c) - p.x) < 46;
      if (nearC || Math.abs(p.y - AXIS.y) < 95) {
        this.dragging = 0;
        this.drags++;
        this.moveC(p.x);
      }
    } else if (type === 'move') {
      if (this.dragging === 0) this.moveC(p.x);
    } else if (type === 'up') {
      if (this.dragging === 0) {
        this.dragging = -1;
        this.checkSeg();
      }
    }
  };

  BoundGame.prototype.moveC = function (px) {
    var lv = this.level();
    var v = snap(clamp(this.xv(px), lv.a, lv.b));
    v = clamp(v, lv.a + 0.5, lv.b - 0.5);
    if (v !== this.c) {
      this.c = v;
      this.everDragged = true;
      tone(540 + v * 6, 0.04, 0.018);
    }
  };

  BoundGame.prototype.checkSeg = function () {
    var lv = this.level();

    if (lv.explore) {
      if (lv.ratios) {
        this.ratioTried[String(this.ratio)] = true;
        var cnt = Object.keys(this.ratioTried).length;
        this.records.push({ t: this.ratio, de: this.deLen(), c: this.c });
        if (cnt >= lv.need) this.solve();
        return;
      }
      var last = this.records[this.records.length - 1];
      if (!last || Math.abs(this.c - last.c) >= 2) {
        this.records.push({ t: this.ratio, de: this.deLen(), c: this.c });
        tone(700, 0.09, 0.035);
      }
      if (this.records.length >= lv.need) this.solve();
      return;
    }

    var val = lv.target.kind === 'ac' ? (this.c - lv.a) : (lv.b - this.c);
    if (Math.abs(val - lv.target.v) < 0.35) this.solve();
  };

  BoundGame.prototype.solve = function () {
    if (this.solved) return;
    this.solved = true;
    this.solvedAt = this.t;
    this.overlayAt = this.t + 0.05;
    this.dragging = -1;
    var notes = [659, 831, 988];
    var n = this.starCount();
    if (!this.done[this.index] || this.done[this.index] < n) {
      this.done[this.index] = n;
      saveDone(this.done);
    }
    for (var s = 0; s < n; s++) {
      (function (idx) {
        setTimeout(function () { tone(notes[idx], 0.16, 0.05); }, 95 * idx);
      })(s);
    }
  };

  BoundGame.prototype.matchedCount = function () {
    var lv = this.level();
    var used = {}, n = 0;
    for (var i = 0; i < this.handles.length; i++) {
      for (var j = 0; j < lv.sol.length; j++) {
        if (used[j]) continue;
        if (Math.abs(this.handles[i].v - lv.sol[j]) < 0.35) { used[j] = true; n++; break; }
      }
    }
    return n;
  };

  BoundGame.prototype.check = function (silent) {
    var lv = this.level();
    var ok = this.matchedCount() === lv.sol.length && this.handles.length === lv.sol.length;
    if (ok) {
      if (!this.solved) this.solve();
    } else if (!silent && this.solved) {
      this.solved = false;
    }
  };

  // 三星：没等提示就过了；两星：看了提示但没怎么折腾；一星：提示 + 反复试
  BoundGame.prototype.starCount = function () {
    var lv = this.level();
    if (lv.explore) {
      return this.drags <= 4 ? 3 : (this.drags <= 8 ? 2 : 1);
    }
    var used = Math.max(0, this.solvedAt - this.levelStartAt);
    if (used < GHOST_DELAY) return 3;
    return this.drags > 5 ? 1 : 2;
  };

  BoundGame.prototype.verdict = function () {
    var n = this.starCount();
    if (n === 3) return { main: '太棒了！', sub: '没等提示就找到了' };
    if (n === 2) return { main: '不错，有进步', sub: '看过提示后自己动手，一样算数' };
    return { main: '过关了', sub: '在数轴上多走两遍，下一关会更快' };
  };

  BoundGame.prototype.advance = function () {
    if (this.index + 1 >= LEVELS.length) this.loadLevel(0);
    else this.loadLevel(this.index + 1);
  };

  BoundGame.prototype.update = function () {};

  BoundGame.prototype.frame = function (dt) {
    this.t += dt;
    this.update(dt);
    this.draw();
  };

  BoundGame.prototype.draw = function () {
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
    if (this.isSeg()) {
      this.drawGoalSeg();
      this.drawAxisSeg();
      this.drawFootSeg();
    } else {
      this.drawGoal();
      this.drawMeasure();
      this.drawAxis();
      this.drawFootRow();
    }
    this.drawDots();
    this.drawHandles();

    if (this.solved) this.drawOverlay();

    ctx.restore();
  };

  /* ---------- 选关页 ---------- */
  BoundGame.prototype.drawMenu = function () {
    var ctx = this.ctx;

    ctx.textAlign = 'center';
    ctx.fillStyle = PAL.ink;
    ctx.font = font(27, 500);
    ctx.fillText('绝对距离', DW / 2, 76);

    ctx.fillStyle = PAL.ink3;
    ctx.font = font(11.5);
    ctx.fillText('数轴与线段 · 点一章直接进入', DW / 2, 100);

    var rows = this.menuRows();
    for (var i = 0; i < rows.length; i++) this.drawMenuRow(rows[i], i);

    var doneN = Object.keys(this.done).length;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PAL.ink3;
    ctx.font = font(10.5);
    ctx.fillText('共 ' + LEVELS.length + ' 关 · 已通过 ' + doneN + ' 关', DW / 2 - 22, 612);

    if (doneN > 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = this.resetAt > 0 ? PAL.ink : PAL.ink3;
      ctx.font = font(10.5);
      ctx.fillText('清空进度', DW - 26, 612);
    }
  };

  BoundGame.prototype.drawMenuRow = function (r, i) {
    var ctx = this.ctx;
    var total = r.to - r.from + 1;
    var passed = 0;
    for (var k = r.from; k <= r.to; k++) if (this.done[k]) passed++;
    var active = this.pressed === i;
    var full = passed === total;

    rr(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.fillStyle = active ? PAL.tealBg : PAL.card;
    ctx.fill();
    ctx.strokeStyle = active ? PAL.teal : PAL.rule;
    ctx.lineWidth = active ? 1.4 : 1;
    ctx.stroke();

    rr(ctx, r.x + 13, r.y + 11, 32, 32, 9);
    ctx.fillStyle = full ? PAL.teal : PAL.tealBg;
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = full ? '#FFFFFF' : PAL.teal;
    ctx.font = font(15, 500);
    ctx.fillText(CH_NUM[r.ch], r.x + 29, r.y + 28);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PAL.ink;
    ctx.font = font(15, 500);
    ctx.fillText(CH_NAME[r.ch], r.x + 58, r.y + 25);

    ctx.fillStyle = PAL.ink3;
    ctx.font = font(10.5);
    ctx.fillText(CH_SUB[r.ch], r.x + 58, r.y + 42);

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = font(11.5, 500);
    ctx.fillStyle = passed > 0 ? PAL.teal : PAL.ink3;
    ctx.fillText(passed > 0 ? passed + '/' + total : total + ' 关', r.x + r.w - 30, r.y + r.h / 2 + 1);

    ctx.strokeStyle = PAL.ink3;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawChevron(ctx, r.x + r.w - 18, r.y + r.h / 2, 1);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  };

  /* ---------- 顶部：进度 ---------- */
  BoundGame.prototype.drawHeader = function () {
    var ctx = this.ctx;
    var lv = this.level();

    // 返回选关
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

  function drawTargetIcon(ctx, x, cy) {
    ctx.strokeStyle = PAL.ink3;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(x + 10, cy, 8.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 10, cy, 3.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 10, cy, 1.1, 0, Math.PI * 2);
    ctx.fillStyle = PAL.ink3;
    ctx.fill();
  }

  /* ---------- 场景一：目标区 ---------- */
  BoundGame.prototype.explain = function () {
    var lv = this.level();
    if (lv.ch === 1) {
      return lv.d === 0 ? '把离原点距离是 0 的位置点亮' : '把离原点距离 ' + fmt(lv.d) + ' 的位置都点亮';
    }
    if (lv.ch === 2) {
      return 'A 在 ' + fmt(lv.anchor) + '，把离 A 距离 ' + fmt(lv.d) + ' 的位置都点亮';
    }
    return '已经有一个点在 ' + fmt(lv.pinned[0]) + '，再放一个绝对值一样的点';
  };

  BoundGame.prototype.drawGoal = function () {
    var ctx = this.ctx;
    var lv = this.level();

    var label = '目标距离';
    ctx.font = font(12.5);
    var lw = ctx.measureText(label).width;
    var total = 20 + 8 + lw;
    var x = DW / 2 - total / 2;
    var cy = 92;

    drawTargetIcon(ctx, x, cy);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PAL.ink3;
    ctx.font = font(12.5);
    ctx.fillText(label, x + 28, cy + 1);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PAL.ink;
    ctx.font = font(46, 500);
    ctx.fillText(fmt(lv.d), DW / 2, 150);

    ctx.fillStyle = PAL.ink2;
    ctx.font = font(12.5);
    this.wrapCenter(this.explain(), DW / 2, 178, DW - 56, 19);

    if (lv.sol.length > 1) {
      var n = this.matchedCount();
      ctx.fillStyle = n > 0 ? PAL.teal : PAL.ink3;
      ctx.font = font(12, 500);
      ctx.fillText('已点亮 ' + n + ' / ' + lv.sol.length, DW / 2, 208);
    }
  };

  /* ---------- 场景二：目标区 ---------- */
  BoundGame.prototype.drawGoalSeg = function () {
    var ctx = this.ctx;
    var lv = this.level();
    var label = lv.explore ? '实验目标' : '目标长度';

    ctx.font = font(12.5);
    var lw = ctx.measureText(label).width;
    var total = 20 + 8 + lw;
    var x = DW / 2 - total / 2;
    var cy = 92;

    drawTargetIcon(ctx, x, cy);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PAL.ink3;
    ctx.font = font(12.5);
    ctx.fillText(label, x + 28, cy + 1);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    if (lv.explore) {
      ctx.fillStyle = PAL.ink;
      ctx.font = font(32, 500);
      ctx.fillText('自由拖动', DW / 2, 146);
      ctx.fillStyle = PAL.ink2;
      ctx.font = font(12.5);
      this.wrapCenter(this.explainSeg(), DW / 2, 176, DW - 56, 19);

      var done = lv.ratios ? Object.keys(this.ratioTried).length : this.records.length;
      ctx.fillStyle = done > 0 ? PAL.teal : PAL.ink3;
      ctx.font = font(12, 500);
      ctx.fillText('已记录 ' + done + ' / ' + lv.need, DW / 2, 206);
      return;
    }

    var isCB = lv.target.kind === 'cb';
    ctx.fillStyle = PAL.ink;
    ctx.font = font(20, 500);
    var head = (isCB ? 'CB' : 'AC') + ' = ';
    var hv = fmt(lv.target.v);
    ctx.font = font(44, 500);
    var vw = ctx.measureText(hv).width;
    ctx.font = font(20, 500);
    var hw = ctx.measureText(head).width;
    var startX = DW / 2 - (hw + vw) / 2;
    ctx.textAlign = 'left';
    ctx.fillStyle = PAL.ink3;
    ctx.fillText(head, startX, 150);
    ctx.fillStyle = PAL.ink;
    ctx.font = font(44, 500);
    ctx.fillText(hv, startX + hw + 2, 150);

    ctx.textAlign = 'center';
    ctx.fillStyle = PAL.ink2;
    ctx.font = font(12.5);
    this.wrapCenter(this.explainSeg(), DW / 2, 178, DW - 56, 19);

    if (lv.algebra) {
      var xv = this.c - lv.a, yv = lv.b - this.c;
      ctx.fillStyle = PAL.ink2;
      ctx.font = font(12.5);
      this.wrapCenter('x = ' + fmt(xv) + '　　y = ' + fmt(yv) + '　　x + y = ' + fmt(lv.b - lv.a), DW / 2, 208, DW - 56, 19);
    }
  };

  BoundGame.prototype.explainSeg = function () {
    var lv = this.level();
    if (lv.explore) {
      if (lv.ratios) return '切换比例各拖一次，看 DE 怎么变';
      return '把 C 拖到 3 个不同的位置，每次松手都看看 DE';
    }
    var who = Math.abs(lv.t - 0.5) < 1e-6 ? '中点' : this.ratioLabel(lv.t) + ' 处';
    var base = 'AB = ' + fmt(lv.b - lv.a);
    if (lv.algebra) {
      return base + '，AC = x，CB = y，把 C 拖到 ' + (lv.target.kind === 'cb' ? 'CB' : 'AC') + ' = ' + fmt(lv.target.v);
    }
    return base + '，把 C 拖到 ' + (lv.target.kind === 'cb' ? 'CB' : 'AC') + ' = ' + fmt(lv.target.v)
      + '（D 是 AC 的' + who + '，E 是 CB 的' + who + '）';
  };

  /* ---------- 场景一：实时数值 ---------- */
  BoundGame.prototype.drawMeasure = function () {
    if (this.solved) return;
    var ctx = this.ctx;
    var lv = this.level();
    var h = this.handles[this.active];
    if (!h) return;

    var ax = this.vx(lv.anchor);
    var hx = this.vx(h.v);
    var dist = Math.abs(h.v - lv.anchor);
    var near = Math.abs(dist - lv.d) < 0.35;
    var col = near ? PAL.teal : PAL.ink3;

    if (Math.abs(hx - ax) > 1) {
      ctx.strokeStyle = near ? PAL.teal : PAL.ink3;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(Math.min(ax, hx), AXIS.y);
      ctx.lineTo(Math.max(ax, hx), AXIS.y);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(ax, PILL_Y);
    ctx.lineTo(hx, PILL_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(ax, PILL_Y - 5); ctx.lineTo(ax, PILL_Y + 5);
    ctx.moveTo(hx, PILL_Y - 5); ctx.lineTo(hx, PILL_Y + 5);
    ctx.stroke();

    var label = lv.ch === 1 ? '|x| = ' : '距离 ';
    var val = fmt(dist);
    ctx.font = font(11.5);
    var lw = ctx.measureText(label).width;
    ctx.font = font(16, 500);
    var vw = ctx.measureText(val).width;
    var padX = 11, gap = 5;
    var pw = Math.max(lw + gap + vw, 52) + padX * 2;
    var ph = 30;
    var cx = clamp(hx, pw / 2 + 10, DW - pw / 2 - 10);
    var top = PILL_Y - ph / 2;

    ctx.strokeStyle = near ? PAL.teal : PAL.rule;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, top + ph);
    ctx.lineTo(hx, AXIS.y - 20);
    ctx.stroke();

    rr(ctx, cx - pw / 2, top, pw, ph, 15);
    ctx.fillStyle = near ? PAL.teal : PAL.card;
    ctx.fill();
    if (!near) {
      ctx.strokeStyle = PAL.rule;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = font(11.5);
    ctx.fillStyle = near ? 'rgba(255,255,255,0.85)' : PAL.ink3;
    var tx = cx - (lw + gap + vw) / 2;
    ctx.fillText(label, tx, PILL_Y + 1);
    ctx.font = font(16, 500);
    ctx.fillStyle = near ? '#FFFFFF' : PAL.ink;
    ctx.fillText(val, tx + lw + gap, PILL_Y + 1);
  };

  /* ---------- 场景一：数轴 ---------- */
  BoundGame.prototype.drawAxis = function () {
    var ctx = this.ctx;
    var y = AXIS.y;
    var lv = this.level();

    ctx.strokeStyle = PAL.axis;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(AXIS.x0 - 10, y);
    ctx.lineTo(AXIS.x1 + 10, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(AXIS.x0 - 10, y);
    ctx.lineTo(AXIS.x0 - 2, y - 4);
    ctx.moveTo(AXIS.x0 - 10, y);
    ctx.lineTo(AXIS.x0 - 2, y + 4);
    ctx.moveTo(AXIS.x1 + 10, y);
    ctx.lineTo(AXIS.x1 + 2, y - 4);
    ctx.moveTo(AXIS.x1 + 10, y);
    ctx.lineTo(AXIS.x1 + 2, y + 4);
    ctx.stroke();

    var ghostA = clamp((this.t - this.levelStartAt - GHOST_DELAY) / GHOST_FADE, 0, 1);
    if (ghostA > 0) {
      ctx.save();
      ctx.globalAlpha = ghostA;
      ctx.setLineDash([3, 4]);
      for (var s = 0; s < lv.sol.length; s++) {
        var gx = this.vx(lv.sol[s]);
        var hit = false;
        for (var q = 0; q < this.handles.length; q++) {
          if (Math.abs(this.handles[q].v - lv.sol[s]) < 0.35) hit = true;
        }
        if (hit) continue;
        ctx.strokeStyle = PAL.ghost;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(gx, y, 17, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(gx, y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = PAL.ghost;
        ctx.fill();
      }
      ctx.restore();
    }

    for (var v = -10; v <= 10; v++) {
      var x = this.vx(v);
      var zero = v === 0;
      ctx.strokeStyle = zero ? PAL.ink2 : PAL.rule;
      ctx.lineWidth = zero ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x, y + (zero ? 11 : 7));
      ctx.stroke();

      if (v % 2 === 0) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.font = font(11);
        ctx.fillStyle = zero ? PAL.ink2 : PAL.ink3;
        ctx.fillText(fmt(v), x, y + 28);
      }
    }

    if (lv.ch === 2) {
      var axv = this.vx(lv.anchor);
      ctx.fillStyle = PAL.amber;
      ctx.beginPath();
      ctx.moveTo(axv, y - 3);
      ctx.lineTo(axv - 5, y - 11);
      ctx.lineTo(axv + 5, y - 11);
      ctx.closePath();
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = font(11, 500);
      ctx.fillStyle = PAL.amber;
      ctx.fillText('A', axv, y - 14);
    }

    for (var i = 0; i < this.pinned.length; i++) {
      var px = this.vx(this.pinned[i]);
      ctx.beginPath();
      ctx.arc(px, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = PAL.ink;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, y, 12, 0, Math.PI * 2);
      ctx.strokeStyle = PAL.card;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  };

  /* ---------- 场景二：数轴 + 线段 ---------- */
  BoundGame.prototype.drawAxisSeg = function () {
    var ctx = this.ctx;
    var y = AXIS.y;
    var lv = this.level();

    var ax = this.vx(lv.a), bx = this.vx(lv.b), cx = this.vx(this.c);
    var dx = this.vx(this.dPos()), ex = this.vx(this.ePos());

    ctx.strokeStyle = PAL.axis;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(AXIS.x0 - 10, y);
    ctx.lineTo(AXIS.x1 + 10, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(AXIS.x0 - 10, y);
    ctx.lineTo(AXIS.x0 - 2, y - 4);
    ctx.moveTo(AXIS.x0 - 10, y);
    ctx.lineTo(AXIS.x0 - 2, y + 4);
    ctx.moveTo(AXIS.x1 + 10, y);
    ctx.lineTo(AXIS.x1 + 2, y - 4);
    ctx.moveTo(AXIS.x1 + 10, y);
    ctx.lineTo(AXIS.x1 + 2, y + 4);
    ctx.stroke();

    ctx.lineCap = 'round';
    ctx.strokeStyle = PAL.teal;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ax, y);
    ctx.lineTo(cx, y);
    ctx.stroke();
    ctx.strokeStyle = PAL.amber;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(bx, y);
    ctx.stroke();
    ctx.lineCap = 'butt';

    var ghostA = clamp((this.t - this.levelStartAt - GHOST_DELAY) / GHOST_FADE, 0, 1);
    var tc = this.targetC();
    if (ghostA > 0 && tc !== null) {
      ctx.save();
      ctx.globalAlpha = ghostA;
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = PAL.ghost;
      ctx.lineWidth = 1.4;
      var gx = this.vx(tc);
      ctx.beginPath();
      ctx.arc(gx, y, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(gx, y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = PAL.ghost;
      ctx.fill();
      ctx.restore();
    }

    var labelStep = (lv.b - lv.a) <= 12 ? 2 : 3;
    for (var v = lv.a; v <= lv.b + 1e-6; v += 1) {
      var x = this.vx(v);
      var end = Math.abs(v - lv.a) < 1e-6 || Math.abs(v - lv.b) < 1e-6;
      ctx.strokeStyle = end ? PAL.ink2 : PAL.rule;
      ctx.lineWidth = end ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x, y + (end ? 11 : 7));
      ctx.stroke();

      if (end || Math.abs(v % labelStep) < 1e-6) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.font = font(11);
        ctx.fillStyle = end ? PAL.ink2 : PAL.ink3;
        ctx.fillText(fmt(v), x, y + 28);
      }
    }

    var mid = (dx + ex) / 2;
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = PAL.teal;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(dx, SEG_BRACKET_Y);
    ctx.lineTo(ex, SEG_BRACKET_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(dx, SEG_BRACKET_Y - 5); ctx.lineTo(dx, SEG_BRACKET_Y + 5);
    ctx.moveTo(ex, SEG_BRACKET_Y - 5); ctx.lineTo(ex, SEG_BRACKET_Y + 5);
    ctx.stroke();

    var de = this.deLen();
    var txt = lv.algebra ? 'DE = (x + y) ÷ 2 = ' + fmt(de) : 'DE = ' + fmt(de);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = font(lv.algebra ? 11.5 : 12.5, 500);
    var tw = ctx.measureText(txt).width;
    var padX = 7;
    ctx.fillStyle = PAL.card;
    rr(ctx, mid - tw / 2 - padX, SEG_BRACKET_Y - 10, tw + padX * 2, 20, 10);
    ctx.fill();
    ctx.fillStyle = PAL.teal;
    ctx.fillText(txt, mid, SEG_BRACKET_Y + 4);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = font(12, 500);
    ctx.fillStyle = PAL.ink;
    ctx.fillText('A', ax, y - 16);
    ctx.fillText('B', bx, y - 16);

    ctx.font = font(11.5, 500);
    ctx.strokeStyle = PAL.teal;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dx, y - 30);
    ctx.lineTo(dx, y - 12);
    ctx.stroke();
    ctx.fillStyle = PAL.teal;
    ctx.fillText('D', dx, y - 34);

    ctx.strokeStyle = PAL.amber;
    ctx.beginPath();
    ctx.moveTo(ex, y - 30);
    ctx.lineTo(ex, y - 12);
    ctx.stroke();
    ctx.fillStyle = PAL.amber;
    ctx.fillText('E', ex, y - 34);
  };

  /* ---------- 场景一：提示 / 括号 ---------- */
  BoundGame.prototype.drawFootRow = function () {
    var ctx = this.ctx;
    var lv = this.level();

    if (this.solved) {
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      var y = HINT_Y + 36;
      var ax = this.vx(lv.anchor);
      for (var i = 0; i < lv.sol.length; i++) {
        var sx = this.vx(lv.sol[i]);
        if (Math.abs(sx - ax) < 2) continue;
        ctx.strokeStyle = PAL.teal;
        ctx.beginPath();
        ctx.moveTo(ax, y);
        ctx.lineTo(sx, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(sx, y - 4); ctx.lineTo(sx, y + 4);
        ctx.stroke();
        ctx.setLineDash([4, 4]);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.font = font(11.5, 500);
        ctx.fillStyle = PAL.teal;
        ctx.fillText(fmt(lv.d), (ax + sx) / 2, y - 7);
        y += 26;
      }
      ctx.setLineDash([]);
      return;
    }

    if (this.everDragged) return;

    var breathe = 1.6 + Math.sin(this.t * 2.6) * 1.6;
    var text = '左右拖动圆点';
    ctx.font = font(12, 500);
    var tw = ctx.measureText(text).width;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PAL.ink2;
    ctx.fillText(text, DW / 2, HINT_Y);

    ctx.strokeStyle = PAL.ink2;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var y0 = HINT_Y - 4.5;
    drawChevron(ctx, DW / 2 - tw / 2 - 14 - breathe, y0, -1);
    drawChevron(ctx, DW / 2 + tw / 2 + 14 + breathe, y0, 1);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  };

  /* ---------- 场景二：提示 / 实验记录 / 比例按钮 ---------- */
  BoundGame.prototype.drawFootSeg = function () {
    var ctx = this.ctx;
    var lv = this.level();

    if (!this.solved && !this.everDragged) {
      var breathe = 1.6 + Math.sin(this.t * 2.6) * 1.6;
      var text = '左右拖动 C';
      ctx.font = font(12, 500);
      var tw = ctx.measureText(text).width;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = PAL.ink2;
      ctx.fillText(text, DW / 2, SEG_CHIP_Y);
      ctx.strokeStyle = PAL.ink2;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawChevron(ctx, DW / 2 - tw / 2 - 14 - breathe, SEG_CHIP_Y - 4.5, -1);
      drawChevron(ctx, DW / 2 + tw / 2 + 14 + breathe, SEG_CHIP_Y - 4.5, 1);
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
    }

    if (lv.explore && this.records.length) {
      var chips = this.records.slice(-3);
      var cw = 108, chh = 40, gap = 8;
      var total = chips.length * cw + (chips.length - 1) * gap;
      var x0 = DW / 2 - total / 2;
      for (var i = 0; i < chips.length; i++) {
        var r = chips[i];
        var x = x0 + i * (cw + gap);
        rr(ctx, x, SEG_CHIP_Y - 22, cw, chh, 9);
        ctx.fillStyle = PAL.card;
        ctx.fill();
        ctx.strokeStyle = PAL.rule;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = PAL.ink3;
        ctx.font = font(10);
        ctx.fillText('C = ' + fmt(r.c), x + cw / 2, SEG_CHIP_Y - 8);
        ctx.fillStyle = PAL.teal;
        ctx.font = font(12, 500);
        ctx.fillText('DE = ' + fmt(r.de), x + cw / 2, SEG_CHIP_Y + 10);
      }
    }

    var btns = this.ratioButtons();
    if (btns) {
      for (var b = 0; b < btns.length; b++) {
        var bt = btns[b];
        var active = this.ratioIndex === b;
        rr(ctx, bt.x, bt.y, bt.w, bt.h, 17);
        ctx.fillStyle = active ? PAL.teal : PAL.card;
        ctx.fill();
        if (!active) {
          ctx.strokeStyle = PAL.rule;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = font(13, 500);
        ctx.fillStyle = active ? '#FFFFFF' : PAL.ink2;
        ctx.fillText(this.ratioLabel(bt.t), bt.x + bt.w / 2, bt.y + bt.h / 2 + 1);
      }
    }
  };

  function drawChevron(ctx, x, y, dir) {
    // dir=1 尖头朝右 ›，dir=-1 尖头朝左 ‹
    ctx.beginPath();
    ctx.moveTo(x - dir * 4, y - 5);
    ctx.lineTo(x + dir * 2, y);
    ctx.lineTo(x - dir * 4, y + 5);
    ctx.stroke();
  }

  function starPath(ctx, cx, cy, R, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + i * Math.PI / 5;
      var rad = i % 2 === 0 ? R : r;
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

  /* 进度点：按章分组 */
  BoundGame.prototype.drawDots = function () {
    var ctx = this.ctx;
    var groups = chapterGroups();

    var within = 6.5, between = 9, r = 2.4;
    var total = 0;
    for (var g = 0; g < groups.length; g++) {
      var n = groups[g].to - groups[g].from + 1;
      total += (n - 1) * within + (g < groups.length - 1 ? between : 0);
    }
    var x = DW / 2 - total / 2;
    var y = 512;

    for (var gi = 0; gi < groups.length; gi++) {
      var gr = groups[gi];
      for (var k = gr.from; k <= gr.to; k++) {
        var cur = k === this.index;
        ctx.beginPath();
        ctx.arc(x, y, cur ? 4 : r, 0, Math.PI * 2);
        ctx.fillStyle = k < this.index ? PAL.teal : (cur ? PAL.ink : PAL.rule);
        ctx.fill();
        x += within;
      }
      x += between - within + within;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PAL.ink3;
    ctx.font = font(11);
    ctx.fillText(
      this.isSeg() ? '线段上的动点 · 找不变量' : '距离相同 · 绝对值相等',
      DW / 2, 578
    );
  };

  BoundGame.prototype.drawHandles = function () {
    var ctx = this.ctx;
    if (this.isSeg()) { this.drawHandlesSeg(); return; }
    var lv = this.level();

    for (var i = 0; i < this.handles.length; i++) {
      var h = this.handles[i];
      var x = this.vx(h.v);
      var near = false;
      for (var j = 0; j < lv.sol.length; j++) {
        if (Math.abs(h.v - lv.sol[j]) < 0.35) near = true;
      }
      var active = i === this.dragging;

      if (!this.everDragged && i === this.active) {
        var off = 26 + Math.sin(this.t * 2.6) * 1.6;
        var lx = x - off, rx = x + off;
        ctx.strokeStyle = PAL.ink3;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (lx > AXIS.x0 + 2 && lx < x - 23) drawChevron(ctx, lx, AXIS.y, -1);
        if (rx < AXIS.x1 - 2 && rx > x + 23) drawChevron(ctx, rx, AXIS.y, 1);
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
      }

      ctx.beginPath();
      ctx.arc(x, AXIS.y, active ? 19 : 17, 0, Math.PI * 2);
      ctx.fillStyle = near ? PAL.teal : PAL.card;
      ctx.fill();
      ctx.lineWidth = near ? 0 : 2;
      ctx.strokeStyle = PAL.ink;
      ctx.stroke();

      if (!near) {
        ctx.beginPath();
        ctx.arc(x, AXIS.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = PAL.ink;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(x - 5.5, AXIS.y);
        ctx.lineTo(x - 1.5, AXIS.y + 4.5);
        ctx.lineTo(x + 6, AXIS.y - 5);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
      }
    }
  };

  BoundGame.prototype.drawHandlesSeg = function () {
    var ctx = this.ctx;
    var y = AXIS.y;
    var lv = this.level();

    var ax = this.vx(lv.a), bx = this.vx(lv.b), cx = this.vx(this.c);
    var dx = this.vx(this.dPos()), ex = this.vx(this.ePos());

    for (var i = 0; i < 2; i++) {
      var px = i === 0 ? ax : bx;
      ctx.beginPath();
      ctx.arc(px, y, 11, 0, Math.PI * 2);
      ctx.fillStyle = PAL.ink;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, y, 11, 0, Math.PI * 2);
      ctx.strokeStyle = PAL.card;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    var pts = [
      { x: dx, col: PAL.teal },
      { x: ex, col: PAL.amber }
    ];
    for (var k = 0; k < pts.length; k++) {
      ctx.beginPath();
      ctx.arc(pts[k].x, y, 8.5, 0, Math.PI * 2);
      ctx.fillStyle = pts[k].col;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pts[k].x, y, 8.5, 0, Math.PI * 2);
      ctx.strokeStyle = PAL.card;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    var active = this.dragging === 0;
    if (!this.everDragged) {
      var off = 26 + Math.sin(this.t * 2.6) * 1.6;
      ctx.strokeStyle = PAL.ink3;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (cx - off > ax + 12) drawChevron(ctx, cx - off, y, -1);
      if (cx + off < bx - 12) drawChevron(ctx, cx + off, y, 1);
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
    }

    ctx.beginPath();
    ctx.arc(cx, y, active ? 18 : 16, 0, Math.PI * 2);
    ctx.fillStyle = PAL.card;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = PAL.ink;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = PAL.ink;
    ctx.fill();
  };

  /* ---------- 结算文案 ---------- */
  BoundGame.prototype.overlayText = function () {
    var lv = this.level();

    if (lv.kind === 'seg') {
      var de = this.deLen();
      var ab = lv.b - lv.a;
      if (lv.explore) {
        if (lv.ratios) {
          return {
            answer: 'DE 随比例变：' + fmt(ab * 0.5) + ' → ' + fmt(ab * (1 - 1 / 3)) + ' → ' + fmt(ab * 0.75),
            note: '比例越大，两边让出的越多，DE 就越短；但每个比例下 DE 都固定'
          };
        }
        return {
          answer: 'DE = ' + fmt(de) + '，和 C 的位置无关',
          note: 'C 换了三个地方，DE 一次都没变——它只看 AB 和比例'
        };
      }
      if (Math.abs(lv.t - 0.5) < 1e-6) {
        return {
          answer: 'DE = ' + fmt(de) + ' = AB ÷ 2',
          note: 'D、E 各走一半，中间剩下的正好是另一半'
        };
      }
      var parts = Math.round(1 / lv.t);
      return {
        answer: 'DE = ' + fmt(de) + ' = AB × ' + this.ratioLabel(1 - lv.t),
        note: '两边各让出 1/' + parts + '，中间就剩下 ' + this.ratioLabel(1 - lv.t) + ' 个 AB'
      };
    }

    var main, note;
    if (lv.ch === 3) {
      main = fmt(lv.pinned[0]) + ' 和 ' + fmt(lv.sol[0]) + ' 互为相反数';
      note = '只有符号不同，绝对值一定相等';
    } else if (lv.sol.length === 1) {
      main = 'x = ' + fmt(lv.sol[0]);
      note = lv.d === 0 ? '距离是 0 的点只有它自己' : '只有一个位置满足条件';
    } else {
      main = 'x = ' + fmt(lv.sol[0]) + ' 或 x = ' + fmt(lv.sol[1]);
      note = lv.ch === 1
        ? '两个点到原点的距离都是 ' + fmt(lv.d) + '，绝对值当然相等'
        : '到 A 的距离都是 ' + fmt(lv.d) + '，一个在左，一个在右';
    }
    return { answer: main, note: note };
  };

  BoundGame.prototype.drawOverlay = function () {
    var ctx = this.ctx;
    var k = clamp((this.t - this.solvedAt) / 0.28, 0, 1);
    var ease = 1 - Math.pow(1 - k, 3);

    ctx.save();
    ctx.fillStyle = 'rgba(247,243,234,' + (0.9 * ease) + ')';
    ctx.fillRect(0, 0, DW, DH);

    var h = 256;
    var y = 200 + (1 - ease) * 14;
    ctx.globalAlpha = ease;

    rr(ctx, 28, y, DW - 56, h, 18);
    ctx.fillStyle = PAL.card;
    ctx.fill();
    ctx.strokeStyle = PAL.rule;
    ctx.lineWidth = 1;
    ctx.stroke();

    var n = this.starCount();
    var gap = 36;
    for (var i = 0; i < 3; i++) {
      var sk = clamp((this.t - this.solvedAt - 0.16 - i * 0.13) / 0.3, 0, 1);
      if (sk <= 0) continue;
      var sc = Math.max(0.01, easeOutBack(sk));
      ctx.save();
      ctx.translate(DW / 2 + (i - 1) * gap, y + 50);
      ctx.scale(sc, sc);
      starPath(ctx, 0, 0, 13.5, 5.8);
      if (i < n) {
        ctx.fillStyle = PAL.star;
        ctx.fill();
      } else {
        ctx.strokeStyle = PAL.rule;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ctx.restore();
    }

    var v = this.verdict();
    var t = this.overlayText();

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

    // 选关入口（点这里回章节目录）
    ctx.textAlign = 'center';
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

  BoundGame.prototype.wrap = function (text, cx, y, maxW, lh) {
    var ctx = this.ctx;
    var line = '', lines = [];
    for (var i = 0; i < text.length; i++) {
      var test = line + text[i];
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = text[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    for (var j = 0; j < lines.length; j++) ctx.fillText(lines[j], cx, y + j * lh);
  };

  /* 按需换行并围绕 cy 垂直居中（提示行用：通常 1 行，超宽自动变 2 行） */
  var BREAK_AFTER = '，。、；：？！）】》';
  BoundGame.prototype.wrapCenter = function (text, cx, cy, maxW, lh) {
    var ctx = this.ctx;
    if (ctx.measureText(text).width <= maxW) {
      ctx.fillText(text, cx, cy);
      return;
    }
    var line = '', lines = [];
    for (var i = 0; i < text.length; i++) {
      var test = line + text[i];
      if (ctx.measureText(test).width > maxW && line) {
        // 优先在标点后断行，且断点不早于行首 40%
        var cut = -1;
        for (var k = line.length - 1; k >= Math.floor(line.length * 0.4); k--) {
          if (BREAK_AFTER.indexOf(line[k]) >= 0) { cut = k + 1; break; }
        }
        if (cut > 0 && cut < line.length) {
          lines.push(line.slice(0, cut));
          line = line.slice(cut) + text[i];
        } else {
          lines.push(line);
          line = text[i];
        }
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    var y0 = cy - (lines.length - 1) * lh / 2;
    for (var j = 0; j < lines.length; j++) ctx.fillText(lines[j], cx, y0 + j * lh);
  };

  /* 测试钩子：两种场景都用它直接通关 */
  BoundGame.prototype.autoSolve = function () {
    var lv = this.level();
    if (lv.kind === 'seg') {
      if (lv.explore) {
        if (lv.ratios) {
          for (var r = 0; r < lv.ratios.length; r++) {
            this.ratio = lv.ratios[r];
            this.ratioTried[String(this.ratio)] = true;
            this.records.push({ t: this.ratio, de: this.deLen(), c: this.c });
          }
          this.ratioIndex = 0;
          this.ratio = lv.ratios[0];
        } else {
          for (var i = 0; i < lv.need; i++) {
            this.c = clamp(lv.a + 1.5 + i * 3, lv.a + 0.5, lv.b - 0.5);
            this.records.push({ t: this.ratio, de: this.deLen(), c: this.c });
          }
        }
        this.solve();
      } else {
        var tc = this.targetC();
        this.c = Math.round(tc * 2) / 2;
        this.checkSeg();
      }
      return;
    }
    for (var q = 0; q < lv.sol.length; q++) this.handles[q].v = lv.sol[q];
    this.check();
  };

  root.BoundGame = BoundGame;
  root.BOUND_LEVELS = LEVELS;
  if (typeof module !== 'undefined' && module.exports) module.exports = BoundGame;
})(typeof window !== 'undefined' ? window : (typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis));
