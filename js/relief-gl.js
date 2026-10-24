/* 立体のブロック図を WebGL でなめらかに回す（ドラッグで左右に一周・上下にかたむける。指をはなしても少しすべる）
   ・1つの WebGL をみんなで使い、できた絵を図ごとのキャンバスに写す（図がたくさんあっても重くならない）
   ・名前や家の記号は、上に重ねた SVG に毎回位置を計算してかく
   ・WebGL が使えないときは、これまでの描き方（relief.js の F.block）のまま */

const F0block = F.block;
const GL3D = (() => {
  const cv = document.createElement('canvas');
  const gl = cv.getContext('webgl', { antialias: true, preserveDrawingBuffer: false }) || cv.getContext('experimental-webgl');
  if (!gl) return null;
  const uint = gl.getExtension('OES_element_index_uint');
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, `
    attribute vec3 p; attribute vec3 c; uniform vec4 r; uniform vec3 s; uniform vec2 o; varying vec3 v;
    void main() {
      float x1 = p.x * r.x - p.y * r.y, y1 = p.x * r.y + p.y * r.x;
      float sx = x1, sy = y1 * r.w - p.z * r.z, d = y1 * r.z + p.z * r.w;
      gl_Position = vec4(sx * s.x + o.x, -sy * s.y + o.y, -d * s.z, 1.0); v = c;
    }`));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `precision mediump float; varying vec3 v; void main() { gl_FragColor = vec4(v, 1.0); }`));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  const loc = { p: gl.getAttribLocation(prog, 'p'), c: gl.getAttribLocation(prog, 'c'), r: gl.getUniformLocation(prog, 'r'), s: gl.getUniformLocation(prog, 's'), o: gl.getUniformLocation(prog, 'o') };
  const cache = new Map();

  // ブロック図の形（面の点・色・三角形）をつくる。単位は「マス」、高さもマスに直す
  function build(B) {
    if (cache.has(B)) return cache.get(B);
    const { w, h, cell, z, water } = B;
    const zmax = d3.max(z), zmin = Math.min(0, d3.min(z)), relief = Math.max(30, zmax - zmin);
    const vz = (h * (B.vshare || 0.34)) / relief, base = zmin - relief * 0.18, zmid = (zmax + base) / 2;
    const surf = k => (B.sea && z[k] < 0) ? 0 : water[k] ? z[k] + 2 : z[k];
    const shd = shadeOf(z, w, h, cell, 2.2);
    const colorK = k => {
      if (B.sea && z[k] < 0) return mix('#4f8fcb', clamp(1 + z[k] / (relief * 1.2), 0.55, 1));
      if (water[k]) return mix('#5f9fd6', 0.9 + 0.12 * shd[k]);
      if (B.dry && B.dry[k]) return mix('#c49a62', 0.6 + 0.5 * shd[k]);
      if (B.bands) { let bc = B.bands[0][1]; B.bands.forEach(([t, col]) => { if (z[k] >= t) bc = col; }); return mix(bc, 0.5 + 0.62 * shd[k]); }
      let c = B.rock === 'lime' ? d3.interpolateRgb('#c9d6a6', '#e8e4d6')(clamp((z[k] - 50) / 25, 0, 1)) : HYPSO(clamp(z[k] / Math.max(zmax, 80), 0, 1));
      if (B.snow && z[k] > B.snow) c = '#f6f6f4';
      return mix(c, 0.5 + 0.62 * shd[k]);
    };
    const P = [], C = [], I = [];
    const X = i => i - (w - 1) / 2, Y = j => j - (h - 1) / 2, Z = zz => (zz - zmid) * vz;
    const push = (x, y, zz, col) => { P.push(x, y, zz); C.push(col.r / 255, col.g / 255, col.b / 255); return P.length / 3 - 1; };
    // 地表
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = j * w + i; push(X(i), Y(j), Z(surf(k)), d3.rgb(colorK(k))); }
    for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) { const a = j * w + i; I.push(a, a + 1, a + w, a + 1, a + w + 1, a + w); }
    // 側面（地層のしま）。4つの面をつくり、回すとどの面も見える
    const layers = B.rock === 'lime' ? ['#d9d4c4', '#c8c2b0', '#d9d4c4', '#bdb6a2'] : ['#c9a978', '#b48f60', '#c2a170', '#9c7b55', '#8a7560'];
    const th = (relief * 1.25) / layers.length;
    const bands = B.bands ? B.bands.map(([t, col], n) => [n === 0 ? base : t, n + 1 < B.bands.length ? B.bands[n + 1][0] : zmax + 50, col])
      : d3.range(layers.length + 2).map(n => [zmax + 5 - (n + 1) * th, zmax + 5 - n * th, layers[n % layers.length]]);
    const wave = (B.bands || B.flat) ? () => 0 : x => 3 * Math.sin(x / 9);
    const quad = (a, b, c2, d, col) => { const n = P.length / 3; [a, b, c2, d].forEach(q => push(q[0], q[1], q[2], col)); I.push(n, n + 1, n + 2, n, n + 2, n + 3); };
    const side = (pts, dark) => {
      for (let n = 0; n < pts.length - 1; n++) {
        const [i1, j1] = pts[n], [i2, j2] = pts[n + 1], k1 = j1 * w + i1, k2 = j2 * w + i2;
        const t1 = B.sea && z[k1] < 0 ? z[k1] : surf(k1), t2 = B.sea && z[k2] < 0 ? z[k2] : surf(k2);
        bands.forEach(([lo, hi, col]) => {
          const l1 = Math.max(base, lo + wave(i1 + j1)), h1 = Math.min(t1, hi + wave(i1 + j1)), l2 = Math.max(base, lo + wave(i2 + j2)), h2 = Math.min(t2, hi + wave(i2 + j2));
          if (h1 <= l1 && h2 <= l2) return;
          const cc = d3.rgb(mix(col, dark));
          quad([X(i1), Y(j1), Z(l1)], [X(i1), Y(j1), Z(Math.max(l1, h1))], [X(i2), Y(j2), Z(Math.max(l2, h2))], [X(i2), Y(j2), Z(l2)], cc);
        });
        // 海の断面（水）
        if (B.sea && (z[k1] < 0 || z[k2] < 0)) quad([X(i1), Y(j1), Z(Math.min(0, z[k1]))], [X(i1), Y(j1), Z(0)], [X(i2), Y(j2), Z(0)], [X(i2), Y(j2), Z(Math.min(0, z[k2]))], d3.rgb(mix('#6aa6dc', dark)));
      }
    };
    side(d3.range(w).map(i => [i, h - 1]), 1);          // 手前
    side(d3.range(w).map(i => [i, 0]), 0.86);           // 奥
    side(d3.range(h).map(j => [0, j]), 0.78);           // 左
    side(d3.range(h).map(j => [w - 1, j]), 0.9);        // 右
    // 鍾乳洞（カルスト）：手前の面に黒い穴
    if (B.cave) {
      const cx = X(w * 0.55), cy = Y(h - 1) + 0.08, cz = Z(zmin + relief * 0.18), rx = w * 0.05, rz = relief * 0.06 * vz, n0 = P.length / 3;
      push(cx, cy, cz, d3.rgb('#3d3a33'));
      for (let a = 0; a <= 24; a++) { const t = a / 24 * Math.PI * 2; push(cx + rx * Math.cos(t), cy, cz + rz * Math.sin(t), d3.rgb('#3d3a33')); }
      for (let a = 1; a <= 24; a++) I.push(n0, n0 + a, n0 + a + 1);
    }
    const nv = P.length / 3, big = nv > 65535;
    if (big && !uint) return null;
    const bp = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bp); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(P), gl.STATIC_DRAW);
    const bc = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bc); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(C), gl.STATIC_DRAW);
    const bi = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bi); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, big ? new Uint32Array(I) : new Uint16Array(I), gl.STATIC_DRAW);
    const M = { bp, bc, bi, n: I.length, type: big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, w, h, vz, zmid, base, zmax, surf,
      X, Y, Z, ext: [(w - 1) / 2, (h - 1) / 2, (zmax - base) * vz / 2] };
    cache.set(B, M);
    return M;
  }

  // 画面への写し方。どの向きに回してもはみ出さない大きさにする
  function view(M, yaw, pitch, Wc, Hc) {
    const r = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch)];
    // 大きさは、いまのかたむきで一周回してもはみ出さないように決める（かたむきは0.05きざみで記憶）
    const pk = Math.round(pitch * 20) / 20;
    if (!M._fit || M._fit.W !== Wc || M._fit.H !== Hc || M._fit.p !== pk) {
      let mx = 0, my = 0;
      const [ex, ey, ez] = M.ext;
      for (let a = 0; a < 360; a += 10) for (const pt of [pk]) {
        const cy = Math.cos(a * Math.PI / 180), sy = Math.sin(a * Math.PI / 180), cp = Math.cos(pt), sp = Math.sin(pt);
        for (const [x, y, zz] of [[-ex, -ey, -ez], [ex, -ey, -ez], [ex, ey, -ez], [-ex, ey, -ez], [-ex, -ey, ez], [ex, -ey, ez], [ex, ey, ez], [-ex, ey, ez]]) {
          const x1 = x * cy - y * sy, y1 = x * sy + y * cy;
          mx = Math.max(mx, Math.abs(x1)); my = Math.max(my, Math.abs(y1 * sp - zz * cp));
        }
      }
      const k = Math.min(Wc / (2 * mx), Hc / (2 * my)) * 0.96;
      M._fit = { W: Wc, H: Hc, p: pk, k, depth: 1 / Math.hypot(...M.ext) };
    }
    return { r, k: M._fit.k, depth: M._fit.depth };
  }
  function render(M, yaw, pitch, Wc, Hc, dpr) {
    const Wp = Math.max(1, Math.round(Wc * dpr)), Hp = Math.max(1, Math.round(Hc * dpr));
    if (cv.width !== Wp || cv.height !== Hp) { cv.width = Wp; cv.height = Hp; }
    const V = view(M, yaw, pitch, Wc, Hc);
    gl.viewport(0, 0, Wp, Hp);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.useProgram(prog);
    gl.uniform4f(loc.r, ...V.r);
    gl.uniform3f(loc.s, V.k * 2 / Wc, V.k * 2 / Hc, V.depth);
    gl.uniform2f(loc.o, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, M.bp); gl.enableVertexAttribArray(loc.p); gl.vertexAttribPointer(loc.p, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, M.bc); gl.enableVertexAttribArray(loc.c); gl.vertexAttribPointer(loc.c, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, M.bi);
    gl.drawElements(gl.TRIANGLES, M.n, M.type, 0);
    // 画面の上の位置（CSS px）を返す関数
    return (x, y, zz) => {
      const X = M.X(x), Y = M.Y(y), Z = M.Z(zz), [c, s, cp, sp] = V.r;
      const x1 = X * c - Y * s, y1 = X * s + Y * c;
      return [Wc / 2 + x1 * V.k, Hc / 2 + (y1 * sp - Z * cp) * V.k, y1 * cp + Z * sp];
    };
  }
  return { cv, build, render };
})();

if (GL3D) {
  F.block = (key, o = {}) => () => {
    const B = BLOCKS[key];
    const M = GL3D.build(B);
    if (!M) return F0block(key, o)();
    const box = el('<div class="gl3d"><canvas></canvas><svg data-own-labels="1"></svg></div>');
    const f = figWrap(box, o.cap || B.title);
    const can = $('canvas', box), svg = d3.select($('svg', box));
    let yaw = o.yaw ?? -0.35, pitch = o.pitch ?? 0.6, vy = 0, vp = 0, raf = 0, Wc = 0, Hc = 0;
    function draw() {
      raf = 0;
      const r = box.getBoundingClientRect(); Wc = r.width; Hc = r.height; if (!Wc || !Hc) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const proj = GL3D.render(M, yaw, pitch, Wc, Hc, dpr);
      if (can.width !== GL3D.cv.width || can.height !== GL3D.cv.height) { can.width = GL3D.cv.width; can.height = GL3D.cv.height; }
      const ctx = can.getContext('2d'); ctx.clearRect(0, 0, can.width, can.height); ctx.drawImage(GL3D.cv, 0, 0);
      // 記号と名前
      svg.attr('viewBox', `0 0 ${Wc} ${Hc}`);
      svg.selectAll('*').remove();
      const fs = clamp(Wc / 38, 10.5, 14);
      (B.marks || []).forEach(m => {
        const [x, y] = proj(m.x, m.y, M.surf(clamp(Math.round(m.y), 0, B.h - 1) * B.w + clamp(Math.round(m.x), 0, B.w - 1)));
        const g = svg.append('g').attr('transform', `translate(${x},${y})`);
        if (m.t === 'house') g.append('path').attr('d', 'M-3.5,0 v-4.5 l3.5,-3.5 l3.5,3.5 v4.5 z').attr('fill', '#fff').attr('stroke', '#6b4a2b').attr('stroke-width', 1);
        else if (m.t === 'spring') g.append('circle').attr('cy', -1).attr('r', 2.8).attr('fill', '#2f8fe0').attr('stroke', '#fff');
        else if (m.t === 'orchard') g.append('circle').attr('cy', -2.5).attr('r', 2.6).attr('fill', '#4f8a3a').attr('stroke', '#2d5a20');
        else if (m.t === 'rice') g.append('text').attr('text-anchor', 'middle').style('font-size', '10px').style('fill', '#2f6f2a').text('〃〃');
        else if (m.t === 'field') g.append('text').attr('text-anchor', 'middle').style('font-size', '10px').style('fill', '#7a5a2a').text('∨∨');
        else if (m.t === 'fish') g.append('text').attr('text-anchor', 'middle').style('font-size', '11px').text('🐟');
      });
      // 名前：重なるときは、引き出し線をのばして上へずらす
      const placed = [];
      (B.labels || []).forEach(([x, y, t]) => {
        const [px, py] = proj(x, y, M.surf(clamp(Math.round(y), 0, B.h - 1) * B.w + clamp(Math.round(x), 0, B.w - 1)));
        const tw = t.length * fs * 0.98, tx = clamp(px, 4 + tw / 2, Wc - 4 - tw / 2);
        let L = fs * 1.2, ty;
        for (let n = 0; n < 6; n++) {
          ty = Math.max(fs + 2, py - L - 3);
          const bx = [tx - tw / 2, ty - fs, tx + tw / 2, ty + 3];
          if (!placed.some(b => bx[0] < b[2] && bx[2] > b[0] && bx[1] < b[3] && bx[3] > b[1])) { placed.push(bx); break; }
          L += fs + 4;
        }
        svg.append('line').attr('x1', px).attr('y1', py).attr('x2', px).attr('y2', ty + 2).attr('stroke', 'var(--ink)').attr('stroke-width', 1.1);
        svg.append('circle').attr('cx', px).attr('cy', py).attr('r', 2.2).attr('fill', 'var(--ink)');
        ftext(svg, tx, ty, t, { a: 'middle', s: fs, b: true }).style('stroke-width', fs / 3.5);
      });
    }
    const ask = () => { if (!raf) raf = requestAnimationFrame(draw); };
    // すべるように回す（慣性）
    let spin = 0;
    const coast = () => {
      spin = 0;
      if (Math.abs(vy) < 0.0004 && Math.abs(vp) < 0.0004) return;
      yaw += vy; pitch = clamp(pitch + vp, 0.25, 1.35); vy *= 0.92; vp *= 0.85;
      draw(); spin = requestAnimationFrame(coast);
    };
    let last = null;
    can.style.touchAction = 'none';
    box.addEventListener('pointerdown', e => { if (e.button) return; cancelAnimationFrame(spin); vy = vp = 0; last = { x: e.clientX, y: e.clientY, t: performance.now() }; try { box.setPointerCapture(e.pointerId); } catch (err) { /* 古いブラウザ */ } });
    box.addEventListener('pointermove', e => {
      if (!last) return;
      const dx = e.clientX - last.x, dy = e.clientY - last.y, dt = Math.max(8, performance.now() - last.t);
      const ky = 3.2 / Math.max(240, Wc), kp = 1.6 / Math.max(200, Hc);
      yaw -= dx * ky; pitch = clamp(pitch + dy * kp, 0.25, 1.35);
      vy = -dx * ky * 16 / dt; vp = dy * kp * 16 / dt;
      last = { x: e.clientX, y: e.clientY, t: performance.now() };
      ask();
    });
    // 指を止めてからはなしたときは、すべらせない
    const up = () => { if (!last) return; if (performance.now() - last.t > 90) vy = vp = 0; last = null; spin = requestAnimationFrame(coast); };
    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    new ResizeObserver(ask).observe(box);
    figHint(f, '✥ ドラッグで回して見る（一周できる）');
    requestAnimationFrame(draw);
    return f;
  };
}
