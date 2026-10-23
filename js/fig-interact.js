/* 図をさわって動かせるようにする（ボタンは増やさず、図そのものをなぞる・さわる）
   ・地図：国や点をさわると名前や数値
   ・図法／地球儀：ドラッグで回す
   ・時差：横になぞると時間が進み、昼と夜が動く
   ・大気の大循環：上下になぞると季節が変わり、気圧帯が動く
   ・地形図：A・B をドラッグすると断面図が変わる。さわると標高
   ・人口ピラミッド：横になぞると将来の形へ
   ・模式図：水位・目盛りなどをなぞって動かす */

// --- 共通の部品 ---
function figTip(f) {
  f.classList.add('fx');
  const t = el('<div class="ftip" hidden></div>'); f.appendChild(t);
  let timer = 0;
  return {
    show(e, html, stay) {
      const r = f.getBoundingClientRect();
      t.innerHTML = ''; if (typeof html === 'string') t.innerHTML = html; else t.appendChild(html);
      t.hidden = false;
      const y = e.clientY - r.top, half = Math.min(t.offsetWidth, r.width - 8) / 2;
      const x = clamp(e.clientX - r.left, half + 4, r.width - half - 4);
      t.style.maxWidth = (r.width - 8) + 'px';
      t.style.left = x + 'px'; t.style.top = y + 'px';
      t.classList.toggle('below', y < 70);
      clearTimeout(timer); if (e.pointerType !== 'mouse' && !stay) timer = setTimeout(() => { t.hidden = true; }, 3000);
    },
    hide() { t.hidden = true; }
  };
}
function figHint(f, text) {
  f.classList.add('fx');
  const h = el(`<span class="fhint">${text}</span>`); f.appendChild(h);
  const off = () => h.classList.add('used');
  f.addEventListener('pointerdown', off, { once: true });
}
// ドラッグ（axis: 'x' 横だけ／'y' たてだけ／'xy' 自由）。move(dx, dy, e) は画面の px、tap(e) は動かさずにさわったとき
function onDrag(node, axis, { start, move, end, tap }) {
  node.style.touchAction = axis === 'x' ? 'pan-y' : axis === 'y' ? 'pan-x' : 'none';
  node.style.cursor = axis === 'x' ? 'ew-resize' : axis === 'y' ? 'ns-resize' : 'grab';
  let st = null, raf = 0, last = null;
  node.addEventListener('pointerdown', e => {
    if (e.button && e.button !== 0) return;
    st = { x: e.clientX, y: e.clientY, moved: false };
    try { node.setPointerCapture(e.pointerId); } catch (err) { /* 古いブラウザ */ }
    start && start(e);
  });
  node.addEventListener('pointermove', e => {
    if (!st) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.moved && Math.hypot(dx, dy) < 5) return;
    st.moved = true; last = [dx, dy, e];
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (last) move && move(...last); });
  });
  const up = e => { if (!st) return; const m = st.moved; st = null; if (!m && tap) tap(e); end && end(e); };
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', () => { st = null; });
}
function vbScale(svgNode) { const r = svgNode.getBoundingClientRect(); return svgNode.viewBox.baseVal.width / (r.width || 1); }
function swapSvg(f, newFig) { const o = f.querySelector('svg'), n = newFig.querySelector('svg'); o.replaceWith(n); return n; }
function setCap(f, html) { let c = f.querySelector('figcaption .dyn'); if (!c) { let fc = f.querySelector('figcaption'); if (!fc) { fc = el('<figcaption></figcaption>'); f.appendChild(fc); } c = el('<b class="dyn"></b>'); fc.prepend(c); } c.innerHTML = html; }

// 地図の国をさわると名前（と数値）
function tipCountries(f, info) {
  const t = figTip(f);
  let cur = null;
  const show = e => {
    const p = e.target.closest && e.target.closest('path.country');
    if (cur && cur !== p) cur.classList.remove('hov');
    if (!p || !p.__data__ || !p.__data__.jp) { cur = null; return t.hide(); }
    cur = p; p.classList.add('hov');
    const d = p.__data__;
    t.show(e, `<b>${d.jp}</b>${info ? info(d) : ''}`);
  };
  f.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') show(e); });
  f.addEventListener('click', show);
  f.addEventListener('pointerleave', () => { if (cur) cur.classList.remove('hov'); t.hide(); });
  return t;
}
const statLine = d => { const c = C_BY_ID[d.id]; return c ? `<br><span>首都 ${c.cap}・人口 ${INDICATORS[0].fmt(c.pop)}百万人</span>` : ''; };

// 指の近くの点をさがす（小さな点でもさわりやすく）
function nearestDot(svgNode, dots, e, r = 16) {
  const p = svgPoint(svgNode, e); let best = null, bd = r * vbScale(svgNode);
  dots.forEach(d => { const dd = Math.hypot(+d.getAttribute('cx') - p.x, +d.getAttribute('cy') - p.y); if (dd < bd) { bd = dd; best = d; } });
  return best;
}

// --- 元の図に、さわる動きを足す ---
const F0 = Object.assign({}, F);

F.world = o => () => { const f = F0.world(o)(); tipCountries(f, statLine); figHint(f, '👆 国をさわる'); return f; };
F.religion = o => () => { const f = F0.religion(o)(); tipCountries(f, d => C_BY_ID[d.id] ? `<br>${C_BY_ID[d.id].rel}` : ''); figHint(f, '👆 国をさわる'); return f; };
F.choro = (key, o = {}) => () => {
  const f = F0.choro(key, o)(); const I = INDICATORS.find(i => i.key === key);
  tipCountries(f, d => C_BY_ID[d.id] ? `<br>${I.name}：${I.fmt(indicatorValue(C_BY_ID[d.id], I))} ${I.unit}` : '<br>（データなし）');
  figHint(f, '👆 国をさわる'); return f;
};
F.plates = o => () => { const f = F0.plates(o)(); tipCountries(f); return f; };

// 図法・地球儀：ドラッグで回す
F.proj = (id, o = {}) => () => {
  const circ = ['globe', 'azeq', 'gnomonic'].includes(id);
  const c0 = o.center || [139.7, 35.7];
  let rot = o.rotate || [-c0[0], -c0[1], 0], lon0 = o.lon0 ?? -150, base;
  const f = F0.proj(id, o)();
  const svgNode = f.querySelector('svg');
  onDrag(svgNode, circ ? 'xy' : 'x', {
    start() { base = { rot: rot.slice(), lon0 }; },
    move(dx, dy) {
      const k = vbScale(svgNode) * (circ ? 0.45 : 0.6);
      if (circ) rot = [base.rot[0] + dx * k, clamp(base.rot[1] - dy * k, -90, 90), 0]; else lon0 = base.lon0 + dx * k;
      const nf = F0.proj(id, Object.assign({}, o, { rotate: rot, lon0 }))();
      svgNode.innerHTML = nf.querySelector('svg').innerHTML;
    }
  });
  figHint(f, circ ? '✥ ドラッグで回す' : '↔ ドラッグで動かす');
  return f;
};

// 緯度と経度：回す・さわると緯度経度
F.latlon = () => () => {
  const W = 300, H = 300;
  let rot = [-60, -25], base, mark = null;
  const f = figWrap(fsvg(W, H).node(), '緯度は南北の位置、経度は東西の位置を表す');
  const svgNode = f.querySelector('svg'), svg = d3.select(svgNode);
  const t = figTip(f);
  let proj;
  const draw = () => {
    svg.selectAll('*').remove();
    proj = d3.geoOrthographic().rotate(rot).fitExtent([[10, 10], [W - 10, H - 10]], { type: 'Sphere' }).clipAngle(90);
    const b = drawBaseMap(svg, proj, { antarctica: true, graticule: false }), path = b.path;
    b.g.append('path').datum(d3.geoGraticule().step([30, 30])()).attr('d', path).attr('fill', 'none').attr('stroke', 'var(--accent)').attr('stroke-opacity', .35);
    b.g.append('path').datum({ type: 'LineString', coordinates: d3.range(-180, 181, 5).map(x => [x, 0]) }).attr('d', path).attr('fill', 'none').attr('stroke', 'var(--shu)').attr('stroke-width', 2.5);
    b.g.append('path').datum({ type: 'LineString', coordinates: d3.range(-90, 91, 5).map(y => [0, y]) }).attr('d', path).attr('fill', 'none').attr('stroke', 'var(--accent)').attr('stroke-width', 2.5);
    const vis = ll => d3.geoDistance(ll, [-rot[0], -rot[1]]) < Math.PI / 2 - 0.05;
    const tx = (ll, s, o) => { if (!vis(ll)) return; const p = proj(ll); ftext(b.g, p[0], p[1], s, o); };
    tx([-rot[0] + 15, 2], '赤道（緯度0°）', { b: true, c: 'var(--shu)', s: 12 });
    tx([2, 40], '本初子午線（経度0°）', { b: true, c: 'var(--accent)', s: 11 });
    const tk = [139.7, 35.7];
    if (vis(tk)) { const p = proj(tk); b.g.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 4).attr('fill', 'var(--shu)'); ftext(b.g, p[0] + 5, p[1] - 4, '東京', { s: 11, b: true }); }
    if (mark && vis(mark)) { const p = proj(mark); b.g.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 6).attr('fill', 'none').attr('stroke', 'var(--ink)').attr('stroke-width', 2.5); }
  };
  const fmtLL = ([lon, lat]) => `${lat >= 0 ? '北緯' : '南緯'}${Math.abs(Math.round(lat))}°・${lon >= 0 ? '東経' : '西経'}${Math.abs(Math.round(lon))}°`;
  draw();
  onDrag(svgNode, 'xy', {
    start() { base = rot.slice(); t.hide(); },
    move(dx, dy) { const k = vbScale(svgNode) * 0.45; rot = [base[0] + dx * k, clamp(base[1] - dy * k, -80, 80)]; draw(); },
    tap(e) {
      const p = svgPoint(svgNode, e), ll = proj.invert([p.x, p.y]);
      if (!ll || d3.geoDistance(ll, [-rot[0], -rot[1]]) > Math.PI / 2) return;
      mark = ll; draw();
      const c = WORLD.countries.find(x => d3.geoContains(x, ll));
      t.show(e, `<b>${fmtLL(ll)}</b>${c && c.jp ? `<br>${c.jp}` : ''}`, true);
    }
  });
  figHint(f, '✥ 回す・👆 さわると緯度経度');
  return f;
};

// 時差：横になぞると時間が進む
F.timezones = () => () => {
  const f = F0.timezones()();
  const svgNode = f.querySelector('svg'), svg = d3.select(svgNode);
  const proj = d3.geoEquirectangular().rotate([-150, 0]).fitExtent([[0, 18], [480, 230]], { type: 'Sphere' }), path = d3.geoPath(proj);
  const ov = svg.select('g.mapsvg').append('g');
  let utc = 3, base;
  const hhmm = h => fmtClock(h);
  const draw = () => {
    ov.selectAll('*').remove();
    const sunLon = ((-(utc - 12) * 15) % 360 + 540) % 360 - 180;
    ov.append('path').datum(d3.geoCircle().center([sunLon + 180, -10]).radius(90)()).attr('d', path).attr('fill', 'rgba(10,20,45,.38)');
    const sp = proj([sunLon, 10]); ov.append('circle').attr('cx', sp[0]).attr('cy', sp[1]).attr('r', 8).attr('fill', '#ffcc33').attr('stroke', '#e39b00').attr('stroke-width', 2);
    [['東京', 139.7, 35.7, 9], ['ロンドン', -0.1, 51.5, 0], ['ニューヨーク', -74, 40.7, -5]].forEach(([n, lon, lat, tz]) => {
      const p = proj([lon, lat]), loc = utc + tz, ds = Math.floor(loc / 24);
      ov.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 3.5).attr('fill', 'var(--shu)');
      ftext(ov, p[0] + 5, p[1] - 4, `${n} ${hhmm(loc)}${ds < 0 ? '（前日）' : ds > 0 ? '（翌日）' : ''}`, { s: 11, b: true });
    });
    setCap(f, `東京 ${hhmm(utc + 9)}／ロンドン ${hhmm(utc)}`);
  };
  draw();
  onDrag(svgNode, 'x', { start() { base = utc; }, move(dx) { utc = (((base + dx * vbScale(svgNode) * 24 / 480) % 24) + 24) % 24; draw(); } });
  figHint(f, '↔ なぞると時間が進む');
  return f;
};

// 大気の大循環：上下になぞると季節（気圧帯の位置）が変わる
F.circulation = () => () => {
  const W = 480, H = 260;
  const f = figWrap(fsvg(W, H).node(), '気圧帯は夏には高緯度側へ、冬には低緯度側へ移動する');
  const svgNode = f.querySelector('svg'), svg = d3.select(svgNode);
  let sh = 0, base;
  const y = lat => 130 - lat * 1.35;
  const draw = () => {
    svg.selectAll('*').remove();
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'var(--panel)');
    const belts = [[90, '極高圧帯', '#9fb7d0'], [60, '亜寒帯低圧帯', '#cfe0b0'], [30, '亜熱帯高圧帯', '#f2d58f'], [0, '熱帯収束帯（赤道低圧帯）', '#f3b0a0'], [-30, '亜熱帯高圧帯', '#f2d58f'], [-60, '亜寒帯低圧帯', '#cfe0b0']];
    belts.forEach(([lat, n, c]) => { const L = lat === 90 ? lat : lat + sh; svg.append('rect').attr('x', 60).attr('y', y(L) - 9).attr('width', 260).attr('height', 18).attr('fill', c).attr('rx', 4); ftext(svg, 190, y(L) + 4, n, { a: 'middle', s: 11, b: true, halo: false, c: '#333' }); });
    [60, 30, 0, -30, -60].forEach(l => ftext(svg, 54, y(l) + 4, l === 0 ? '0°' : `${Math.abs(l)}°${l > 0 ? 'N' : 'S'}`, { a: 'end', s: 10, c: 'var(--muted)', halo: false }));
    const mk = arrowDef(svg, 'var(--accent)');
    [[45, 1, '偏西風'], [15, -1, '貿易風'], [-15, -1, '貿易風'], [-45, 1, '偏西風']].forEach(([lat, dir, n]) => { const yy = y(lat + sh); svg.append('line').attr('x1', dir > 0 ? 340 : 440).attr('x2', dir > 0 ? 440 : 340).attr('y1', yy).attr('y2', yy).attr('stroke', 'var(--accent)').attr('stroke-width', 3).attr('marker-end', mk); ftext(svg, 390, yy - 5, n, { a: 'middle', s: 11, b: true, c: 'var(--accent)' }); });
    // ローマ（北緯42°）
    const ry = y(42);
    svg.append('line').attr('x1', 52).attr('x2', 330).attr('y1', ry).attr('y2', ry).attr('stroke', 'var(--shu)').attr('stroke-width', 2).attr('stroke-dasharray', '5 3');
    svg.append('circle').attr('cx', 330).attr('cy', ry).attr('r', 5).attr('fill', 'var(--shu)');
    const dry = Math.abs(42 - (30 + sh)) <= 9;
    ftext(svg, 472, 236, sh > 3 ? '7月ごろ（北半球の夏）' : sh < -3 ? '1月ごろ（北半球の冬）' : '3月・9月ごろ', { s: 13, b: true, c: 'var(--accent)', a: 'end' });
    ftext(svg, 472, 254, `ローマ（北緯42°）：${dry ? '亜熱帯高圧帯におおわれて乾燥する' : '偏西風・前線の影響で雨が降る'}`, { a: 'end', s: 12, b: true, c: 'var(--shu)' });
  };
  draw();
  onDrag(svgNode, 'y', { start() { base = sh; }, move(dx, dy) { sh = clamp(base - dy * vbScale(svgNode) / 1.35 * 0.8, -10, 10); draw(); } });
  figHint(f, '↕ 上下になぞると季節が変わる');
  return f;
};

// 地形図：A・B を動かすと断面図が変わる／さわると標高
F.topo = (key, o = {}) => () => {
  const T = TERRAINS[key], grid = makeGrid(T), sx = 3.2;
  const f = F0.topo(key, Object.assign({}, o, { line: null }))();
  const svgNode = f.querySelector('svg'), svg = d3.select(svgNode);
  const Hb = (x, y) => { x = clamp(x, 0, T.w - 1.001); y = clamp(y, 0, T.h - 1.001); const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, g = (a, b) => grid[b * T.w + a]; return g(i, j) * (1 - fx) * (1 - fy) + g(i + 1, j) * fx * (1 - fy) + g(i, j + 1) * (1 - fx) * fy + g(i + 1, j + 1) * fx * fy; };
  const t = figTip(f);
  let line = o.line ? o.line.map(p => p.slice()) : null, drag = null;
  const lg = svg.append('g');
  let ps = null;
  const draw = () => {
    lg.selectAll('*').remove();
    if (!line) return;
    const [[x1, y1], [x2, y2]] = line;
    lg.append('line').attr('x1', x1 * sx).attr('y1', y1 * sx).attr('x2', x2 * sx).attr('y2', y2 * sx).attr('stroke', 'var(--shu)').attr('stroke-width', 2.5);
    [[x1, y1, 'A'], [x2, y2, 'B']].forEach(([x, y, n]) => { lg.append('circle').attr('cx', x * sx).attr('cy', y * sx).attr('r', 9).attr('fill', 'var(--panel)').attr('stroke', 'var(--shu)').attr('stroke-width', 3); ftext(lg, x * sx, y * sx + 4, n, { a: 'middle', s: 11, b: true, c: 'var(--shu)', halo: false }); });
    const n = 120, pts = d3.range(n + 1).map(k => [k, Hb(x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n)]);
    const W2 = 480, H2 = 110;
    if (!ps) { ps = fsvg(W2, H2); svgNode.after(ps.node()); }
    ps.selectAll('*').remove();
    const xs = d3.scaleLinear().domain([0, n]).range([20, W2 - 20]);
    const lo = Math.min(0, d3.min(grid)), hi = d3.max(grid) * 1.05;
    const ys = d3.scaleLinear().domain([lo, hi]).range([H2 - 14, 6]);
    ps.append('path').attr('d', d3.area().x(p => xs(p[0])).y0(H2 - 14).y1(p => ys(p[1]))(pts)).attr('fill', '#c49a6c').attr('stroke', '#8b5a2b');
    const dist = Math.hypot(x2 - x1, y2 - y1) * T.cell;
    ftext(ps, 20, H2 - 2, 'A', { s: 11, b: true, c: 'var(--shu)' }); ftext(ps, W2 - 20, H2 - 2, 'B', { s: 11, b: true, c: 'var(--shu)', a: 'end' });
    ftext(ps, W2 / 2, H2 - 2, `断面図（距離 約${Math.round(dist)}m・最高 約${Math.round(d3.max(pts, p => p[1]))}m）`, { s: 10, a: 'middle', c: 'var(--muted)' });
  };
  draw();
  const toGrid = e => { const p = svgPoint(svgNode, e); return [p.x / sx, p.y / sx]; };
  onDrag(svgNode, line ? 'xy' : 'x', {
    start(e) {
      drag = null; if (!line) return;
      const q = toGrid(e), k = vbScale(svgNode) / sx;
      line.forEach((p, i) => { if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 14 * k) drag = i; });
      if (drag === null) drag = Math.hypot(line[0][0] - q[0], line[0][1] - q[1]) < Math.hypot(line[1][0] - q[0], line[1][1] - q[1]) ? 0 : 1;
    },
    move(dx, dy, e) { if (!line || drag === null) return; const q = toGrid(e); line[drag] = [clamp(q[0], 1, T.w - 2), clamp(q[1], 1, T.h - 2)]; draw(); t.hide(); },
    tap(e) { const q = toGrid(e); t.show(e, `標高 約<b>${Math.round(Hb(q[0], q[1]))}</b> m`); }
  });
  f.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !e.buttons) { const q = toGrid(e); if (q[0] >= 0 && q[1] >= 0 && q[0] < T.w && q[1] < T.h) t.show(e, `標高 約<b>${Math.round(Hb(q[0], q[1]))}</b> m`); } });
  f.addEventListener('pointerleave', () => t.hide());
  figHint(f, line ? '✥ A・Bを動かす' : '👆 さわると標高');
  return f;
};

// 雨温図・ハイサーグラフ：月をさわると数値
function monthTip(f, c, cmp, hyther) {
  const svgNode = f.querySelector('svg'), t = figTip(f);
  const hl = d3.select(svgNode).append('rect').attr('y', 14).attr('height', 230 - 40).attr('width', 24).attr('fill', 'var(--accent)').attr('opacity', 0).style('pointer-events', 'none');
  const show = e => {
    const p = svgPoint(svgNode, e);
    let m;
    if (hyther) {
      // いちばん近い月
      const pMax = Math.max(300, Math.ceil(d3.max([c, cmp].filter(Boolean), x => d3.max(x.p)) / 100) * 100);
      const tMin = Math.min(-10, Math.floor(d3.min([c, cmp].filter(Boolean), x => d3.min(x.t)) / 10) * 10), tMax = Math.max(30, Math.ceil(d3.max([c, cmp].filter(Boolean), x => d3.max(x.t)) / 10) * 10);
      const X = v => 34 + v / pMax * (360 - 48), Y = v => 200 - (v - tMin) / (tMax - tMin) * 186;
      m = d3.minIndex(d3.range(12), i => Math.hypot(X(c.p[i]) - p.x, Y(c.t[i]) - p.y));
    } else {
      m = Math.floor((p.x - 34) / 24); if (m < 0 || m > 11) { hl.attr('opacity', 0); return t.hide(); }
      hl.attr('x', 34 + m * 24).attr('opacity', .12);
    }
    t.show(e, `<b>${m + 1}月</b>　${c.name} ${c.t[m]}℃・${c.p[m]}mm${cmp ? `<br>${cmp.name} ${cmp.t[m]}℃・${cmp.p[m]}mm` : ''}`);
  };
  f.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') show(e); });
  f.addEventListener('click', show);
  f.addEventListener('pointerleave', () => { hl.attr('opacity', 0); t.hide(); });
  figHint(f, '👆 月をさわる');
}
F.climate = (id, cmp, o = {}) => () => { const f = F0.climate(id, cmp, o)(); monthTip(f, CITIES.find(x => x.id === id), cmp ? CITIES.find(x => x.id === cmp) : null, false); return f; };
F.hyther = (id, cmp) => () => { const f = F0.hyther(id, cmp)(); monthTip(f, CITIES.find(x => x.id === id), cmp ? CITIES.find(x => x.id === cmp) : null, true); return f; };

// 気候帯の地図：都市をさわると小さな雨温図
F.koppenMap = (o = {}) => () => {
  const f = F0.koppenMap(o)(), t = figTip(f);
  const dots = Array.from(f.querySelectorAll('svg g.mapsvg > circle'));
  dots.forEach((d, i) => { d.style.cursor = 'pointer'; d.setAttribute('r', 6); d.__city = CITIES[i]; });
  const show = e => {
    const d = nearestDot(f.querySelector('svg'), dots, e); if (!d) return t.hide();
    const c = d.__city, k = koppen(c), box = el(`<div><b>${c.name}</b> ${climateGroupOf(c) === 'H' ? 'H 高山気候' : `${k.code} ${k.name}`}</div>`);
    const ch = climateChart(c); ch.style.width = '190px'; ch.style.display = 'block'; box.appendChild(ch);
    t.show(e, box, true);
  };
  f.addEventListener('click', show);
  f.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') show(e); });
  f.addEventListener('pointerleave', () => t.hide());
  figHint(f, '👆 都市の点をさわる');
  return f;
};

// 架空の町：さわると地形の名前と注意
const KIND_NOTE = ['水がたまりやすい。洪水で深く浸水しやすい', '少し高く、浸水しにくい。古くからの集落', '高く水はけがよい。洪水・津波に強い', '急な斜面は土砂災害に注意', '川', '海', '昔の川の跡。水がたまりやすく液状化しやすい', '谷の出口は土石流に注意', '低い海岸。津波・高潮に注意'];
F.town = (o = {}) => () => {
  const f = F0.town(o)(), svgNode = f.querySelector('svg'), t = figTip(f);
  const show = e => { const p = svgPoint(svgNode, e), i = Math.floor(p.x / 3), j = Math.floor(p.y / 3); if (i < 0 || j < 0 || i >= TOWN.w || j >= TOWN.h) return t.hide(); const k = TOWN.kind[j * TOWN.w + i]; t.show(e, `<b>${KIND[k].n}</b>　標高 約${Math.max(0, Math.round(TOWN.v[j * TOWN.w + i]))}m<br>${KIND_NOTE[k]}`); };
  f.addEventListener('click', show);
  f.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') show(e); });
  f.addEventListener('pointerleave', () => t.hide());
  figHint(f, '👆 土地をさわる');
  return f;
};

// 散布図：点をさわると国名
F.scatter = (xk, yk, o = {}) => () => {
  const f = F0.scatter(xk, yk, o)(), t = figTip(f);
  const X = INDICATORS.find(i => i.key === xk), Y = INDICATORS.find(i => i.key === yk);
  const dots = Array.from(f.querySelectorAll('svg > circle'));
  dots.forEach((d, i) => { d.__c = COUNTRIES[i]; d.setAttribute('r', 5); d.style.cursor = 'pointer'; });
  const show = e => { const d = nearestDot(f.querySelector('svg'), dots, e, 12); if (!d) return t.hide(); const c = d.__c; t.show(e, `<b>${c.jp}</b><br>${X.name} ${X.fmt(indicatorValue(c, X))}・${Y.name} ${Y.fmt(indicatorValue(c, Y))}`); };
  f.addEventListener('click', show);
  f.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') show(e); });
  f.addEventListener('pointerleave', () => t.hide());
  figHint(f, '👆 点をさわる');
  return f;
};

// 人口ピラミッド：横になぞると将来の形へ
F.pyramid = (id, o = {}) => () => {
  const pr = POP_PRESETS[id];
  const frames = [buildPreset(id)];
  for (let y = pr.year; y < 2100; y += 5) frames.push(popStep(frames[frames.length - 1], pr.now[0], pr.now[1], pr.now[2], pr.now[3]));
  let i = 0, base;
  const f = figWrap(miniPyramid(frames[0]), o.cap || `${pr.name}の人口ピラミッド（今の出生率・平均寿命が続いた場合のモデル）`);
  let svgNode = f.querySelector('svg');
  const draw = () => {
    const n = miniPyramid(frames[i]);
    const yr = pr.year + i * 5, st = popStats(frames[i]);
    ftext(d3.select(n), 6, 16, `${yr}年`, { s: 15, b: true });
    n.style.touchAction = 'pan-y';
    // 同じ svg を使い続ける（ドラッグを切らないため）
    svgNode.setAttribute('viewBox', n.getAttribute('viewBox')); svgNode.innerHTML = n.innerHTML;
    setCap(f, `${yr}年：${st.type.replace(/（.*）/, '')}・65歳以上 ${st.old.toFixed(0)}%・人口 ${st.tot >= 10000 ? (st.tot / 10000).toFixed(2) + '億' : Math.round(st.tot).toLocaleString() + '万'}人`);
  };
  draw();
  onDrag(svgNode, 'x', { start() { base = i; }, move(dx) { i = clamp(base + Math.round(dx / 14), 0, frames.length - 1); draw(); } });
  figHint(f, '↔ なぞると未来へ');
  return f;
};

// 模式図のうち、動かせるもの
F.scheme = kind => () => {
  if (kind === 'floodplain') return floodplainFig();
  if (kind === 'hazardmap') return hazardmapFig();
  if (kind === 'scale') return scaleFig();
  if (kind === 'transition') return transitionFig();
  return F0.scheme(kind)();
};

function floodplainFig() {
  const W = 480, H = 220;
  const f = figWrap(fsvg(W, H).node(), '氾濫原の断面（模式図）。自然堤防の上に集落、後背湿地に水田');
  const svgNode = f.querySelector('svg'), svg = d3.select(svgNode);
  let wl = 151, base;
  const land = '#c9b48a';
  const draw = () => {
    svg.selectAll('*').remove();
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'var(--panel)');
    svg.append('rect').attr('x', 0).attr('y', wl).attr('width', W).attr('height', H - wl).attr('fill', '#7db6e3').attr('opacity', .85);
    svg.append('path').attr('d', `M0,150 L120,150 Q150,128 175,128 L185,160 L235,160 L245,128 Q270,128 300,150 L480,150 L480,${H} L0,${H}Z`).attr('fill', land);
    svg.append('rect').attr('x', 185).attr('y', Math.min(wl, 148)).attr('width', 50).attr('height', 160 - Math.min(wl, 148)).attr('fill', '#5ea0d8');
    [150, 270].forEach(x => svg.append('rect').attr('x', x - 8).attr('y', 116).attr('width', 14).attr('height', 12).attr('fill', '#6b5d50'));
    [[20, 110], [330, 470]].forEach(([a, b]) => { for (let x = a; x < b; x += 18) svg.append('line').attr('x1', x).attr('x2', x).attr('y1', 140).attr('y2', 148).attr('stroke', '#4f9b4a').attr('stroke-width', 2); });
    const lab = (x, y, t, o = {}) => ftext(svg, x, y, t, Object.assign({ s: 12, b: true, a: 'middle' }, o));
    lab(160, 104, '自然堤防（集落）'); lab(60, 128, '後背湿地（水田）'); lab(400, 128, '後背湿地（水田）'); lab(210, 196, '川');
    svg.append('line').attr('x1', 0).attr('x2', W).attr('y1', wl).attr('y2', wl).attr('stroke', '#1f5f8b').attr('stroke-width', 2).attr('stroke-dasharray', '6 4');
    ftext(svg, 8, 20, wl > 149 ? 'ふだん：水は川の中' : wl > 128 ? '洪水：低い後背湿地が水につかる。自然堤防の集落は無事' : '大洪水：自然堤防もこえて集落まで浸水', { s: 12.5, b: true, c: wl > 149 ? 'var(--ink)' : 'var(--shu)' });
  };
  draw();
  onDrag(svgNode, 'y', { start() { base = wl; }, move(dx, dy) { wl = clamp(base + dy * vbScale(svgNode), 112, 156); draw(); } });
  figHint(f, '↕ 水位を上下に動かす');
  return f;
}

function hazardmapFig() {
  const W = 480, H = 220;
  const f = figWrap(fsvg(W, H).node(), 'ハザードマップの浸水の深さの目安');
  const svgNode = f.querySelector('svg'), svg = d3.select(svgNode);
  const lv = [[0.5, '#fff3a0', '0.5m未満：大人のひざまで'], [3, '#f7c8d0', '0.5〜3m：1階がつかる'], [5, '#ef9fb1', '3〜5m：2階がつかる'], [99, '#c37ac9', '5m以上：2階の屋根をこえる']];
  let d = 1.8, base;
  const draw = () => {
    svg.selectAll('*').remove();
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'var(--panel)');
    const k = lv.findIndex(x => d < x[0]);
    const top = Math.max(16, 190 - d * 20);
    svg.append('path').attr('d', 'M22,34 L65,8 L108,34 Z').attr('fill', 'var(--chip)').attr('stroke', 'var(--ink)');
    svg.append('rect').attr('x', 30).attr('y', 30).attr('width', 70).attr('height', 160).attr('fill', 'var(--bg)').attr('stroke', 'var(--ink)');
    svg.append('rect').attr('x', 6).attr('y', top).attr('width', 118).attr('height', 190 - top).attr('fill', lv[k][1]).attr('opacity', .85);
    [80, 130].forEach(y => svg.append('line').attr('x1', 30).attr('x2', 100).attr('y1', y).attr('y2', y).attr('stroke', 'var(--ink)'));
    ftext(svg, 65, 60, '2階', { a: 'middle', s: 11 }); ftext(svg, 65, 160, '1階', { a: 'middle', s: 11 });
    svg.append('line').attr('x1', 6).attr('x2', 124).attr('y1', top).attr('y2', top).attr('stroke', '#1f5f8b').attr('stroke-width', 2.5);
    ftext(svg, 65, Math.max(14, top - 5), `約${d.toFixed(1)}m`, { a: 'middle', s: 13, b: true, c: '#1f5f8b' });
    lv.forEach(([v, c, tx], i) => {
      svg.append('rect').attr('x', 140).attr('y', 30 + i * 42).attr('width', 26).attr('height', 26).attr('fill', c).attr('stroke', i === k ? 'var(--ink)' : 'none').attr('stroke-width', 2.5);
      ftext(svg, 175, 48 + i * 42, tx, { s: i === k ? 13.5 : 12, b: i === k, c: i === k ? 'var(--ink)' : 'var(--muted)' });
    });
    ftext(svg, 140, 208, d >= 0.5 ? '歩いての避難は危険。早めの避難か、高い所へ' : 'ひざまででも流れがあると歩きにくい', { s: 11, c: 'var(--shu)', b: true });
  };
  draw();
  onDrag(svgNode, 'y', { start() { base = d; }, move(dx, dy) { d = clamp(base - dy * vbScale(svgNode) / 20, 0.1, 8.5); draw(); } });
  figHint(f, '↕ 水の高さを動かす');
  return f;
}

function scaleFig() {
  const W = 480, H = 220;
  const f = figWrap(fsvg(W, H).node(), '縮尺の計算：実際の距離 ＝ 地図上の長さ × 縮尺の分母');
  const svgNode = f.querySelector('svg'), svg = d3.select(svgNode);
  let cm = 4, base;
  const draw = () => {
    svg.selectAll('*').remove();
    svg.append('rect').attr('x', 40).attr('y', 60).attr('width', 400).attr('height', 34).attr('fill', 'var(--bg)').attr('stroke', 'var(--ink)');
    svg.append('rect').attr('x', 40).attr('y', 60).attr('width', cm * 100).attr('height', 34).attr('fill', 'color-mix(in srgb, var(--shu) 30%, transparent)');
    for (let i = 0; i <= 4; i++) { svg.append('line').attr('x1', 40 + i * 100).attr('x2', 40 + i * 100).attr('y1', 60).attr('y2', 78).attr('stroke', 'var(--ink)').attr('stroke-width', 2); ftext(svg, 40 + i * 100, 52, `${i}cm`, { a: 'middle', s: 12 }); }
    svg.append('circle').attr('cx', 40 + cm * 100).attr('cy', 77).attr('r', 10).attr('fill', 'var(--shu)');
    const km25 = cm * 25000 / 100000, km50 = cm * 50000 / 100000;
    ftext(svg, 240, 132, `地図上の ${cm.toFixed(1)}cm`, { a: 'middle', s: 15, b: true });
    ftext(svg, 240, 162, `2万5千分の1 → ${km25 >= 1 ? km25.toFixed(2) + 'km' : Math.round(km25 * 1000) + 'm'}`, { a: 'middle', s: 16, b: true, c: 'var(--shu)' });
    ftext(svg, 240, 190, `5万分の1 → ${km50 >= 1 ? km50.toFixed(2) + 'km' : Math.round(km50 * 1000) + 'm'}`, { a: 'middle', s: 15, b: true, c: 'var(--accent)' });
  };
  draw();
  onDrag(svgNode, 'x', { start() { base = cm; }, move(dx) { cm = Math.round(clamp(base + dx * vbScale(svgNode) / 100, 0.5, 4) * 10) / 10; draw(); } });
  figHint(f, '↔ 赤い点を動かす');
  return f;
}

function transitionFig() {
  const W = 480, H = 220;
  const f = figWrap(fsvg(W, H).node(), '人口転換（出生率・死亡率の変化の模式図）');
  const svgNode = f.querySelector('svg'), svg = d3.select(svgNode);
  const x = d3.scaleLinear().domain([0, 4]).range([50, 460]), y = d3.scaleLinear().domain([0, 50]).range([180, 20]);
  const birth = [[0, 42], [1, 42], [1.8, 40], [2.6, 25], [3.2, 13], [4, 11]], death = [[0, 38], [1, 36], [1.6, 20], [2.4, 12], [3.2, 10], [4, 11]];
  const at = (arr, t) => { for (let i = 1; i < arr.length; i++) if (t <= arr[i][0]) { const [a, b] = [arr[i - 1], arr[i]]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); } return arr[arr.length - 1][1]; };
  let tt = 1.8, base;
  const names = ['多産多死', '多産少死', '少産少死へ', '少産少死'];
  const draw = () => {
    svg.selectAll('*').remove();
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'var(--panel)');
    [1, 2, 3].forEach(k => svg.append('line').attr('x1', x(k)).attr('x2', x(k)).attr('y1', 15).attr('y2', 180).attr('stroke', 'var(--line)').attr('stroke-dasharray', '3 3'));
    svg.append('path').attr('d', d3.area().x(p => x(p[0])).y0((p, i) => y(death[i][1])).y1(p => y(p[1]))(birth)).attr('fill', 'rgba(227,166,58,.25)');
    svg.append('path').attr('d', d3.line().x(p => x(p[0])).y(p => y(p[1]))(birth)).attr('stroke', '#d9473b').attr('stroke-width', 3).attr('fill', 'none');
    svg.append('path').attr('d', d3.line().x(p => x(p[0])).y(p => y(p[1]))(death)).attr('stroke', '#3f7fc0').attr('stroke-width', 3).attr('fill', 'none');
    const b = at(birth, tt), d = at(death, tt), st = Math.min(3, Math.floor(tt));
    svg.append('line').attr('x1', x(tt)).attr('x2', x(tt)).attr('y1', 12).attr('y2', 182).attr('stroke', 'var(--ink)').attr('stroke-width', 2);
    svg.append('circle').attr('cx', x(tt)).attr('cy', y(b)).attr('r', 5).attr('fill', '#d9473b');
    svg.append('circle').attr('cx', x(tt)).attr('cy', y(d)).attr('r', 5).attr('fill', '#3f7fc0');
    svg.append('circle').attr('cx', x(tt)).attr('cy', 182).attr('r', 9).attr('fill', 'var(--ink)');
    const g = b - d;
    ftext(svg, 8, 14, `出生率 ${Math.round(b)}‰・死亡率 ${Math.round(d)}‰ → 人口が${g > 15 ? '急に増える（人口爆発）' : g > 5 ? '増える' : 'ほとんど増えない'}`, { s: 12.5, b: true, c: g > 15 ? 'var(--shu)' : 'var(--ink)' });
    names.forEach((t, i) => ftext(svg, x(i + 0.5), 205, t, { a: 'middle', s: i === st ? 13.5 : 12, b: i === st, c: i === st ? 'var(--shu)' : 'var(--muted)' }));
  };
  draw();
  onDrag(svgNode, 'x', { start() { base = tt; }, move(dx) { tt = clamp(base + dx * vbScale(svgNode) / ((460 - 50) / 4), 0, 4); draw(); } });
  figHint(f, '↔ 時代を動かす');
  return f;
}
