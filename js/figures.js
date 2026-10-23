/* 授業の説明や確認テストの解説で使う図（地図・グラフ・模式図）
   F.xxx(...) は「図をつくる関数」を返す。表示するときに fig() でつくる。 */

let FIG_ID = 0;
const FIG_BOX = { eastasia: [73, 18, 146, 54], seasia: [92, -11, 141, 24], sasia: [60, 5, 98, 37], wasia: [25, 12, 90, 55], nafrica: [-18, 15, 37, 38], safrica: [-18, -35, 52, 18], europe: [-11, 35, 40, 71], russia: [27, 41, 180, 78], namerica: [-168, 24, -52, 72], lamerica: [-118, -56, -34, 33], oceania: [110, -48, 180, -8], japan: [126, 26, 148, 46] };

function figWrap(node, cap, legend) {
  const f = el('<figure class="fig"></figure>');
  f.appendChild(node);
  if (legend || cap) f.appendChild(el(`<figcaption>${legend ? `<span class="legend">${legend.map(([c, n]) => `<span><i style="background:${c}"></i>${n}</span>`).join('')}</span>` : ''}${cap ? `<span>${cap}</span>` : ''}</figcaption>`));
  return f;
}
function fsvg(W, H) { return d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'figsvg'); }
function ftext(g, x, y, t, o = {}) {
  return g.append('text').attr('x', x).attr('y', y).text(t).attr('text-anchor', o.a || 'start').style('font-size', (o.s || 12) + 'px')
    .style('font-weight', o.b ? 700 : 400).style('fill', o.c || 'var(--ink)').style('font-family', 'var(--font-body)')
    .style('paint-order', o.halo === false ? null : 'stroke').style('stroke', o.halo === false ? null : 'var(--panel)').style('stroke-width', o.halo === false ? null : 3).style('stroke-linejoin', 'round');
}
function arrowDef(svg, color) {
  const id = 'fa' + (++FIG_ID);
  svg.append('defs').append('marker').attr('id', id).attr('viewBox', '0 0 10 10').attr('refX', 7).attr('refY', 5).attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
    .append('path').attr('d', 'M0,0L10,5L0,10z').attr('fill', color);
  return `url(#${id})`;
}
function boxProj(box, W, H, pad = 6) {
  const [a, b, c, d] = box, pts = [];
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) pts.push([a + (c - a) * i / 4, b + (d - b) * j / 4]);
  return (box === FIG_BOX.japan ? d3.geoMercator() : d3.geoNaturalEarth1().rotate([-(a + c) / 2, 0])).fitExtent([[pad, pad], [W - pad, H - pad]], { type: 'MultiPoint', coordinates: pts });
}

const F = {
  // 世界地図（国をぬる・地点・線・矢印）
  world(o = {}) {
    return () => {
      const W = 480, H = o.box || o.region ? 280 : 250;
      const svg = fsvg(W, H);
      const box = o.region ? FIG_BOX[o.region] : typeof o.box === 'string' ? FIG_BOX[o.box] : o.box;
      const proj = box ? boxProj(box, W, H) : d3.geoNaturalEarth1().rotate([o.rot ?? -10, 0]).fitExtent([[4, 4], [W - 4, H - 4]], { type: 'Sphere' });
      const base = drawBaseMap(svg, proj, { antarctica: !!o.ant });
      const col = {};
      if (o.region && !o.hl) COUNTRIES.filter(c => c.reg === o.region).forEach(c => { col[c.id] = 'color-mix(in srgb, var(--accent) 35%, var(--land))'; });
      if (Array.isArray(o.hl)) o.hl.forEach(id => { col[id] = o.color || 'var(--shu)'; });
      else if (o.hl) Object.assign(col, o.hl);
      base.countries.attr('fill', f => col[f.id] || 'var(--land)');
      const path = base.path, g = base.g;
      (o.lines || []).forEach(L => g.append('path').datum({ type: 'LineString', coordinates: L.c || L }).attr('d', path).attr('fill', 'none').attr('stroke', L.color || 'var(--shu)').attr('stroke-width', L.w || 2.5).attr('stroke-dasharray', L.dash || null).attr('stroke-linecap', 'round').attr('stroke-opacity', L.op || 1));
      (o.arrows || []).forEach(([a, b, lab, color]) => {
        const p = proj(a), q = proj(b), c = color || 'var(--accent)';
        const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2 - Math.hypot(q[0] - p[0], q[1] - p[1]) * 0.18;
        g.append('path').attr('d', `M${p}Q${mx},${my} ${q}`).attr('fill', 'none').attr('stroke', c).attr('stroke-width', 2.5).attr('marker-end', arrowDef(svg, c));
        if (lab) ftext(g, mx, my - 3, lab, { a: 'middle', s: 11, c, b: true });
      });
      if (o.names) (o.names === true ? Object.keys(col) : o.names).forEach(id => {
        const f = WORLD.countries.find(x => x.id === id); if (!f) return;
        const p = proj(mainCentroid(f)); ftext(g, p[0], p[1] + 4, countryName(id), { a: 'middle', s: 11, b: true });
      });
      (o.pts || []).forEach(([lon, lat, lab, c]) => {
        const p = proj([lon, lat]);
        g.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 4.5).attr('fill', c || 'var(--shu)').attr('stroke', 'var(--panel)').attr('stroke-width', 1.5);
        if (lab) ftext(g, p[0] + 6, p[1] + 4, lab, { s: 11, b: true });
      });
      (o.labels || []).forEach(([lon, lat, lab, c, s]) => { const p = proj([lon, lat]); ftext(g, p[0], p[1], lab, { a: 'middle', s: s || 11, c: c || 'var(--accent)', b: true }); });
      return figWrap(svg.node(), o.cap, o.legend);
    };
  },
  // 統計の階級区分図（相対値）または図形表現図（絶対値）
  choro(key, o = {}) {
    return () => {
      const I = INDICATORS.find(i => i.key === key);
      const W = 480, H = o.region ? 280 : 250, svg = fsvg(W, H);
      const proj = o.region ? boxProj(FIG_BOX[o.region], W, H) : d3.geoNaturalEarth1().rotate([-10, 0]).fitExtent([[4, 4], [W - 4, H - 4]], { type: 'Sphere' });
      const base = drawBaseMap(svg, proj, { antarctica: false });
      const circle = o.style === 'circle';
      const vals = COUNTRIES.map(c => indicatorValue(c, I)).sort((a, b) => a - b);
      const br = I.breaks || [1, 2, 3, 4, 5].map(k => +d3.quantileSorted(vals, k / 6).toPrecision(2));
      base.countries.attr('fill', f => { const c = C_BY_ID[f.id]; if (!c) return 'var(--nodata)'; return circle ? 'var(--land)' : CHORO[d3.bisectRight(br, indicatorValue(c, I))]; });
      if (circle) {
        const r = d3.scaleSqrt().domain([0, vals[vals.length - 1]]).range([0, 30]);
        COUNTRIES.map(c => ({ c, v: indicatorValue(c, I), p: proj(mainCentroid(WORLD.countries.find(f => f.id === c.id))) })).sort((a, b) => b.v - a.v)
          .forEach(d => base.g.append('circle').attr('cx', d.p[0]).attr('cy', d.p[1]).attr('r', r(d.v)).attr('fill', 'rgba(200,68,42,.45)').attr('stroke', 'var(--shu)'));
      }
      const legend = circle ? null : CHORO.map((c, i) => [c, (i === 0 ? `〜${br[0]}` : i === 5 ? `${br[4]}〜` : `${br[i - 1]}〜${br[i]}`) + (i === 5 && I.unit ? I.unit : '')]);
      return figWrap(svg.node(), o.cap || `${I.name}（${I.unit || '—'}）${circle ? '・円の大きさで表した図形表現図' : '・階級区分図'}`, legend);
    };
  },
  // 宗教の分布
  religion(o = {}) {
    return () => {
      const W = 480, H = o.region ? 280 : 250, svg = fsvg(W, H);
      const proj = o.region ? boxProj(FIG_BOX[o.region], W, H) : d3.geoNaturalEarth1().rotate([-10, 0]).fitExtent([[4, 4], [W - 4, H - 4]], { type: 'Sphere' });
      const base = drawBaseMap(svg, proj, { antarctica: false });
      base.countries.attr('fill', f => C_BY_ID[f.id] ? relCategory(C_BY_ID[f.id]).c : 'var(--nodata)');
      if (o.names) o.names.forEach(id => { const f = WORLD.countries.find(x => x.id === id); const p = proj(mainCentroid(f)); ftext(base.g, p[0], p[1], countryName(id), { a: 'middle', s: 11, b: true }); });
      return figWrap(svg.node(), o.cap || '主な宗教（データのある国）', REL_CAT.map(x => [x.c, x.k]));
    };
  },
  // 地図の表し方のくらべ（同じ人口のデータを2通りで）
  mapTypes() {
    return () => {
      const d = el('<div class="fig2"></div>');
      d.appendChild(F.choro('pop', { cap: '× 人口を階級区分図にすると、広い国が目立つ' })());
      d.appendChild(F.choro('pop', { style: 'circle', cap: '○ 図形表現図なら量が正しく伝わる' })());
      return d;
    };
  },
  // 図法（ゆがみの円・2地点の線）
  proj(id, o = {}) {
    return () => {
      const def = PROJS.find(p => p.id === id);
      const circ = ['globe', 'azeq', 'gnomonic'].includes(id);
      const W = circ ? 300 : 480, H = circ ? 300 : 260, svg = fsvg(W, H);
      const proj = def.make();
      if (circ) { const c = o.center || [139.7, 35.7]; proj.rotate(o.rotate || [-c[0], -c[1]]); }
      else proj.rotate([o.lon0 ?? -150, 0]);
      if (id === 'mercator') proj.scale(W / (2 * Math.PI)).translate([W / 2, H / 2 + 22]).clipExtent([[0, 0], [W, H]]);
      else if (id === 'gnomonic') proj.scale(130).translate([W / 2, H / 2]);
      else proj.fitExtent([[4, 4], [W - 4, H - 4]], { type: 'Sphere' });
      const base = drawBaseMap(svg, proj, { antarctica: true });
      const path = base.path;
      if (o.tissot) {
        const cg = d3.geoCircle().radius(5);
        for (let lat = -60; lat <= 75; lat += 30) for (let lon = -180; lon < 180; lon += 40) base.g.append('path').attr('d', path(cg.center([lon, lat])())).attr('fill', 'rgba(200,68,42,.4)').attr('stroke', 'var(--shu)').attr('stroke-width', .8);
      }
      if (o.route) {
        const [A, B] = o.route.map(k => PLACE[k]);
        base.g.append('path').datum({ type: 'LineString', coordinates: [[A.lon, A.lat], [B.lon, B.lat]] }).attr('d', path).attr('fill', 'none').attr('stroke', 'var(--shu)').attr('stroke-width', 2.5);
        if (o.rhumb) {
          const Y = p => Math.log(Math.tan(Math.PI / 4 + p * Math.PI / 360)), dl = ((B.lon - A.lon + 540) % 360) - 180;
          const pts = d3.range(0, 1.001, 0.02).map(t => [((A.lon + dl * t + 540) % 360) - 180, (2 * Math.atan(Math.exp(Y(A.lat) + (Y(B.lat) - Y(A.lat)) * t)) - Math.PI / 2) * 180 / Math.PI]);
          base.g.append('path').datum({ type: 'LineString', coordinates: pts }).attr('d', path).attr('fill', 'none').attr('stroke', '#2c9a58').attr('stroke-width', 2.5).attr('stroke-dasharray', '6 4');
        }
        [A, B].forEach(P => { const p = proj([P.lon, P.lat]); if (!p) return; base.g.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 4).attr('fill', 'var(--shu)'); ftext(base.g, p[0] + 5, p[1] - 4, P.name, { s: 11, b: true }); });
      }
      if (o.east) {
        const a = [139.7, 35.7];
        base.g.append('path').datum({ type: 'LineString', coordinates: d3.range(0, 19800, 300).map(d => gcDestination(a, 90, d)) }).attr('d', path).attr('fill', 'none').attr('stroke', 'var(--shu)').attr('stroke-width', 2.5);
        [5000, 10000, 15000].forEach(d => base.g.append('path').datum(d3.geoCircle().center(a).radius(d / R_EARTH * 180 / Math.PI)()).attr('d', path).attr('fill', 'none').attr('stroke', 'var(--muted)').attr('stroke-dasharray', '3 3'));
        const p = proj(a); base.g.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 4).attr('fill', 'var(--shu)'); ftext(base.g, p[0] + 5, p[1] - 5, '東京', { s: 11, b: true });
        const q = proj(gcDestination(a, 90, 6000)); ftext(base.g, q[0], q[1] - 6, '真東', { s: 12, b: true, c: 'var(--shu)', a: 'middle' });
      }
      return figWrap(svg.node(), o.cap || def.name, o.legend);
    };
  },
  // 緯度と経度
  latlon() {
    return () => {
      const W = 300, H = 300, svg = fsvg(W, H);
      const proj = d3.geoOrthographic().rotate([-60, -25]).fitExtent([[10, 10], [W - 10, H - 10]], { type: 'Sphere' }).clipAngle(90);
      const base = drawBaseMap(svg, proj, { antarctica: true, graticule: false });
      const path = base.path;
      base.g.append('path').datum(d3.geoGraticule().step([30, 30])()).attr('d', path).attr('fill', 'none').attr('stroke', 'var(--accent)').attr('stroke-opacity', .35);
      base.g.append('path').datum({ type: 'LineString', coordinates: d3.range(-180, 181, 5).map(x => [x, 0]) }).attr('d', path).attr('fill', 'none').attr('stroke', 'var(--shu)').attr('stroke-width', 2.5);
      base.g.append('path').datum({ type: 'LineString', coordinates: d3.range(-90, 91, 5).map(y => [0, y]) }).attr('d', path).attr('fill', 'none').attr('stroke', 'var(--accent)').attr('stroke-width', 2.5);
      const t = (lonlat, s, o) => { const p = proj(lonlat); ftext(base.g, p[0], p[1], s, o); };
      t([75, 2], '赤道（緯度0°）', { b: true, c: 'var(--shu)', s: 12 });
      t([2, 40], '本初子午線', { b: true, c: 'var(--accent)', s: 11 });
      t([2, 33], '（経度0°）', { c: 'var(--accent)', s: 10 });
      [30, 60].forEach(l => t([100, l + 1], `北緯${l}°`, { s: 10, c: 'var(--muted)' }));
      t([100, -29], '南緯30°', { s: 10, c: 'var(--muted)' });
      const tk = proj([139.7, 35.7]); base.g.append('circle').attr('cx', tk[0]).attr('cy', tk[1]).attr('r', 4).attr('fill', 'var(--shu)');
      t([132, 40], '東京（北緯36°・東経140°）', { s: 10, b: true });
      return figWrap(svg.node(), '緯度は南北の位置、経度は東西の位置を表す');
    };
  },
  // 時差の模式図（経度15°＝1時間）
  timezones() {
    return () => {
      const W = 480, H = 230, svg = fsvg(W, H);
      const proj = d3.geoEquirectangular().rotate([-150, 0]).fitExtent([[0, 18], [W, H]], { type: 'Sphere' });
      const base = drawBaseMap(svg, proj, { antarctica: false, graticule: false });
      const path = base.path;
      for (let k = -12; k <= 12; k += 2) { const lo = k * 15 - 7.5, hi = k * 15 + 7.5; base.g.insert('path', ':nth-child(2)').attr('d', path({ type: 'Polygon', coordinates: [[[lo, -85], [lo, 85], [hi, 85], [hi, -85], [lo, -85]].map(([x, y]) => [clamp(x, -180, 180), y])] })).attr('fill', 'rgba(31,95,139,.1)'); }
      for (let lon = -165; lon <= 180; lon += 30) { const p = proj([lon, 0]); const tz = Math.round(((lon + 540) % 360 - 180) / 15); ftext(svg, p[0], 13, lon === 180 ? '±12' : (tz > 0 ? '+' : '') + tz, { a: 'middle', s: 10, c: 'var(--muted)', halo: false }); }
      base.g.append('path').datum({ type: 'LineString', coordinates: DATELINE }).attr('d', path).attr('fill', 'none').attr('stroke', '#8a5bd0').attr('stroke-width', 2).attr('stroke-dasharray', '5 3');
      [[135, 'var(--shu)', '東経135°（日本）'], [0, 'var(--accent)', '経度0°（ロンドン）']].forEach(([lon, c, n]) => { base.g.append('path').datum({ type: 'LineString', coordinates: [[lon, -80], [lon, 80]] }).attr('d', path).attr('stroke', c).attr('stroke-width', 2).attr('fill', 'none'); const p = proj([lon, -45]); ftext(base.g, p[0] + 3, p[1], n, { s: 11, b: true, c }); });
      const p = proj([-172, 30]); ftext(base.g, p[0], p[1], '日付変更線', { s: 11, b: true, c: '#8a5bd0', a: 'middle' });
      return figWrap(svg.node(), '上の数字は UTC（ロンドンの時刻）との差。経度15°ごとに1時間ずつ変わる');
    };
  },
  climate(id, cmp, o = {}) { return () => { const c = CITIES.find(x => x.id === id); const k = koppen(c); return figWrap(climateChart(c, { compare: cmp ? CITIES.find(x => x.id === cmp) : null }), o.cap || `${c.name}（${climateGroupOf(c) === 'H' ? 'H 高山気候' : k.code + ' ' + k.name}）${cmp ? `と${CITIES.find(x => x.id === cmp).name}（点線）` : ''}`); }; },
  hyther(id, cmp) { return () => { const c = CITIES.find(x => x.id === id); return figWrap(hytherChart(c, { compare: cmp ? CITIES.find(x => x.id === cmp) : null }), `${c.name}のハイサーグラフ（数字は月）`); }; },
  // 気候区のイメージ（雨温図の都市を色分け）
  koppenMap(o = {}) {
    return () => {
      const W = 480, H = 250, svg = fsvg(W, H);
      const proj = d3.geoNaturalEarth1().rotate([-10, 0]).fitExtent([[4, 4], [W - 4, H - 4]], { type: 'Sphere' });
      const base = drawBaseMap(svg, proj, { antarctica: true });
      // 緯度ごとの気候帯の帯（おおよそ）
      CITIES.forEach(c => { const p = proj([c.lon, c.lat]); const g = climateGroupOf(c); base.g.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 5).attr('fill', KG_COLOR[g]).attr('stroke', 'var(--panel)').attr('stroke-width', 1.5); if (o.names) ftext(base.g, p[0] + 6, p[1] + 4, c.name.replace(/（.*）/, ''), { s: 9 }); });
      return figWrap(svg.node(), o.cap || '都市の気候帯（点の色）', Object.keys(KG_COLOR).map(k => [KG_COLOR[k], `${k} ${KG_NAME[k]}`]));
    };
  },
  // 大気の大循環（気圧帯と風）
  circulation() {
    return () => {
      const W = 480, H = 260, svg = fsvg(W, H);
      const belts = [[90, '極高圧帯', '#9fb7d0'], [60, '亜寒帯低圧帯', '#cfe0b0'], [30, '亜熱帯高圧帯', '#f2d58f'], [0, '熱帯収束帯（赤道低圧帯）', '#f3b0a0'], [-30, '亜熱帯高圧帯', '#f2d58f'], [-60, '亜寒帯低圧帯', '#cfe0b0']];
      const y = lat => 130 - lat * 1.35;
      svg.append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', H).attr('fill', 'var(--panel)');
      belts.forEach(([lat, n, c]) => { svg.append('rect').attr('x', 60).attr('y', y(lat) - 9).attr('width', 260).attr('height', 18).attr('fill', c).attr('rx', 4); ftext(svg, 190, y(lat) + 4, n, { a: 'middle', s: 11, b: true, halo: false, c: '#333' }); ftext(svg, 54, y(lat) + 4, lat === 0 ? '0°' : `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`, { a: 'end', s: 10, c: 'var(--muted)', halo: false }); });
      const mk = arrowDef(svg, 'var(--accent)');
      const wind = (lat, dir, n) => { const yy = y(lat); const x1 = dir > 0 ? 340 : 440, x2 = dir > 0 ? 440 : 340; svg.append('line').attr('x1', x1).attr('x2', x2).attr('y1', yy).attr('y2', yy).attr('stroke', 'var(--accent)').attr('stroke-width', 3).attr('marker-end', mk); ftext(svg, 390, yy - 5, n, { a: 'middle', s: 11, b: true, c: 'var(--accent)' }); };
      wind(45, 1, '偏西風'); wind(15, -1, '貿易風（北東）'); wind(-15, -1, '貿易風（南東）'); wind(-45, 1, '偏西風'); wind(75, -1, '極東風');
      ftext(svg, 190, 252, '上昇気流の所は雨が多く、下降気流の所は乾燥する', { a: 'middle', s: 11, c: 'var(--muted)', halo: false });
      return figWrap(svg.node(), '気圧帯は夏には高緯度側へ、冬には低緯度側へ移動する');
    };
  },
  // プレートと大地形
  plates(o = {}) {
    return () => {
      const W = 480, H = o.japan ? 300 : 250, svg = fsvg(W, H);
      const proj = o.japan ? d3.geoMercator().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'MultiPoint', coordinates: [[122, 23], [154, 47]] }) : d3.geoNaturalEarth1().rotate([-150, 0]).fitExtent([[4, 4], [W - 4, H - 4]], { type: 'Sphere' });
      const base = drawBaseMap(svg, proj, { antarctica: !o.japan });
      const path = base.path, g = base.g, line = c => ({ type: 'LineString', coordinates: c });
      const leg = [];
      if (o.japan) {
        JP.bounds.forEach(b => g.append('path').attr('d', path(line(b.line))).attr('fill', 'none').attr('stroke', BOUND_STYLE[b.type].c).attr('stroke-width', 3).attr('stroke-dasharray', b.type === 'other' ? '6 4' : null));
        JP.plates.forEach(p => { const q = proj(p.c); ftext(g, q[0], q[1], p.name, { a: 'middle', s: 12, b: true, c: 'var(--accent)' }); });
        if (o.quakes) JP.quakes.forEach(q => { const p = proj(q.c); g.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 6).attr('fill', 'rgba(63,127,192,.3)').attr('stroke', '#3f7fc0').attr('stroke-width', 2); });
        if (o.volc) JP.volcanoes.forEach(v => { const p = proj(v.c); g.append('path').attr('transform', `translate(${p})`).attr('d', 'M0,-6L5,4H-5Z').attr('fill', '#c8442a'); });
        leg.push(['#d9473b', '海溝・トラフ'], ['#8a5bd0', 'その他の境界']);
      } else {
        if (o.shield !== false) LF.shields.forEach(s => g.append('path').attr('d', path(d3.geoCircle().center(s.c).radius(s.r)())).attr('fill', 'rgba(140,110,60,.3)').attr('stroke', '#8c6d3f').attr('stroke-dasharray', '2 2'));
        if (o.old !== false) LF.oldBelts.forEach(b => g.append('path').attr('d', path(line(b.line))).attr('fill', 'none').attr('stroke', '#2c8350').attr('stroke-width', 4).attr('stroke-linecap', 'round'));
        if (o.newb !== false) LF.newBelts.forEach(b => g.append('path').attr('d', path(line(b.line))).attr('fill', 'none').attr('stroke', '#c8442a').attr('stroke-width', 8).attr('stroke-opacity', .4).attr('stroke-linecap', 'round'));
        if (o.bounds && o.newb === false) LF.newBelts.forEach(b => g.append('path').attr('d', path(line(b.line))).attr('fill', 'none').attr('stroke', BOUND_STYLE.con.c).attr('stroke-width', 2.5));
        if (o.bounds) LF.bounds.forEach(b => g.append('path').attr('d', path(line(b.line))).attr('fill', 'none').attr('stroke', BOUND_STYLE[b.type].c).attr('stroke-width', 2.5).attr('stroke-dasharray', b.type === 'tra' ? '5 3' : null));
        if (o.volc) LF.volcanoes.forEach(v => { const p = proj(v.c); g.append('path').attr('transform', `translate(${p})`).attr('d', 'M0,-6L5,4H-5Z').attr('fill', '#c8442a'); });
        if (o.quakes) LF.quakes.forEach(q => { const p = proj(q.c); g.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 5).attr('fill', 'rgba(63,127,192,.3)').attr('stroke', '#3f7fc0').attr('stroke-width', 2); });
        (o.labels || []).forEach(([lon, lat, n, c]) => { const p = proj([lon, lat]); ftext(g, p[0], p[1], n, { a: 'middle', s: 11, b: true, c: c || 'var(--ink)' }); });
        if (o.newb !== false) leg.push(['rgba(200,68,42,.5)', '新期造山帯']);
        if (o.old !== false) leg.push(['#2c8350', '古期造山帯']);
        if (o.shield !== false) leg.push(['rgba(140,110,60,.45)', '安定陸塊']);
        if (o.bounds) leg.push(['#e3a63a', '広がる境界'], ['#d9473b', '狭まる境界'], ['#3f7fc0', 'ずれる境界']);
      }
      return figWrap(svg.node(), (o.cap || '') + '（線の位置はおおよその模式）', leg);
    };
  },
  plateAnim(kind) { return () => plateAnim(kind); },
  // 架空の地形図（等高線）。line: 断面の線 [[x,y],[x,y]]（マス目）
  topo(key, o = {}) {
    return () => {
      const T = TERRAINS[key], grid = makeGrid(T), sx = 3.2, W = T.w * sx, H = T.h * sx;
      const svg = fsvg(W, H);
      const max = d3.max(grid), iv = 10;
      const cs = d3.contours().size([T.w, T.h]).thresholds(d3.range(Math.floor(d3.min(grid) / iv) * iv, max + iv, iv))(Array.from(grid));
      const gp = d3.geoPath(d3.geoIdentity().scale(sx));
      svg.append('image').attr('href', reliefCanvas(grid, T.w, T.h, T.cell, { colorAt: k => hypso(grid[k], max) }).toDataURL()).attr('width', W).attr('height', H).attr('preserveAspectRatio', 'none');
      svg.append('g').selectAll('path').data(cs).join('path').attr('d', gp).attr('fill', 'none').attr('stroke', d => d.value <= 0 ? '#2f78c4' : '#8b5a2b').attr('stroke-width', d => d.value % 50 === 0 ? 1.3 : .5);
      (o.labels || []).forEach(([x, y, t]) => ftext(svg, x * sx, y * sx, t, { a: 'middle', s: 12, b: true, c: '#7a2a10' }));
      if (o.line) { const [[x1, y1], [x2, y2]] = o.line; svg.append('line').attr('x1', x1 * sx).attr('y1', y1 * sx).attr('x2', x2 * sx).attr('y2', y2 * sx).attr('stroke', 'var(--shu)').attr('stroke-width', 2.5); ftext(svg, x1 * sx, y1 * sx - 4, 'A', { s: 12, b: true, c: 'var(--shu)' }); ftext(svg, x2 * sx, y2 * sx - 4, 'B', { s: 12, b: true, c: 'var(--shu)' }); }
      const node = el('<div></div>'); node.appendChild(svg.node());
      if (o.line) {
        const [[x1, y1], [x2, y2]] = o.line, n = 100;
        const pts = d3.range(n + 1).map(k => { const x = x1 + (x2 - x1) * k / n, y = y1 + (y2 - y1) * k / n; return [k, grid[Math.round(y) * T.w + Math.round(x)]]; });
        const W2 = 480, H2 = 110, ps = fsvg(W2, H2);
        const xs = d3.scaleLinear().domain([0, n]).range([20, W2 - 20]), ys = d3.scaleLinear().domain([Math.min(0, d3.min(pts, p => p[1])), d3.max(pts, p => p[1]) * 1.1]).range([H2 - 14, 8]);
        ps.append('path').attr('d', d3.area().x(p => xs(p[0])).y0(H2 - 14).y1(p => ys(p[1]))(pts)).attr('fill', '#c49a6c').attr('stroke', '#8b5a2b');
        ftext(ps, 20, H2 - 2, 'A', { s: 11, b: true, c: 'var(--shu)' }); ftext(ps, W2 - 20, H2 - 2, 'B', { s: 11, b: true, c: 'var(--shu)', a: 'end' }); ftext(ps, W2 / 2, H2 - 2, '断面図', { s: 10, a: 'middle', c: 'var(--muted)' });
        node.appendChild(ps.node());
      }
      return figWrap(node, o.cap || `${T.name}の地形図（架空・等高線10mごと）`);
    };
  },
  // 地形の模式図（横から見た図）
  // 2つの図を並べる（例：リアス海岸とフィヨルド）
  pair(a, b) { return () => { const d = el('<div class="fig2"></div>'); d.appendChild(a()); d.appendChild(b()); return d; }; },
  scheme(kind) {
    return () => {
      const W = 480, H = 220, svg = fsvg(W, H);
      svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'var(--panel)');
      const sky = 'var(--sea)', land = '#c9b48a', water = '#5ea0d8';
      const P = (d, c, s) => svg.append('path').attr('d', d).attr('fill', c).attr('stroke', s || 'none');
      const lab = (x, y, t, o = {}) => ftext(svg, x, y, t, Object.assign({ s: 12, b: true, a: 'middle' }, o));
      const cap = {
        river: '川の上流から河口までの地形（模式図）', floodplain: '氾濫原の断面（模式図）。自然堤防の上に集落、後背湿地に水田', fan: '扇状地（上から見た模式図）', coast: '沈水海岸（上から見た模式図）',
        urban: '都市の内部と人口の動き（模式図）', thunen: 'チューネンの孤立国（模式図）', weber: '工業の立地（模式図）', transition: '人口転換（出生率・死亡率の変化の模式図）', pushpull: '人口移動のしくみ',
        terrace: '河岸段丘の断面（模式図）', symbols: '主な地図記号', scale: '縮尺の計算（2万5千分の1）', karst: 'カルスト地形（模式図）', glacier: '氷河地形（模式図）', survey: '地域調査の流れ', help: '防災の3つの「助」', territory: '国家の領域と排他的経済水域（模式図・長さは実際の比率ではない）', altitude: 'アンデスの高度による土地利用（模式図）', hazardmap: 'ハザードマップの浸水の深さの目安'
      }[kind];
      if (kind === 'river') {
        P(`M0,40 L90,60 L150,140 L250,160 L360,175 L420,180 L480,182 L480,${H} L0,${H}Z`, land);
        P(`M380,182 L480,182 L480,${H} L380,${H}Z`, water);
        P('M0,40 L30,90 L60,40 L90,60 Z', '#a8875a');
        P('M120,110 Q170,150 230,158', 'none', water).attr('stroke-width', 3).attr('fill', 'none');
        lab(45, 30, 'V字谷'); lab(140, 108, '扇状地'); lab(290, 150, '氾濫原'); lab(400, 170, '三角州'); lab(450, 205, '海', { c: '#fff', halo: false });
        lab(60, 200, '上流（けずる）', { s: 11, c: 'var(--muted)' }); lab(240, 200, '中流（運ぶ）', { s: 11, c: 'var(--muted)' }); lab(380, 215, '下流（ためる）', { s: 11, c: 'var(--muted)' });
      } else if (kind === 'floodplain') {
        P(`M0,150 L120,150 Q150,128 175,128 L185,160 L235,160 L245,128 Q270,128 300,150 L480,150 L480,${H} L0,${H}Z`, land);
        P('M185,148 L235,148 L235,160 L185,160Z', water);
        [150, 270].forEach(x => { svg.append('rect').attr('x', x - 8).attr('y', 116).attr('width', 14).attr('height', 12).attr('fill', '#6b5d50'); });
        for (let x = 20; x < 110; x += 18) svg.append('line').attr('x1', x).attr('x2', x).attr('y1', 140).attr('y2', 148).attr('stroke', '#4f9b4a').attr('stroke-width', 2);
        for (let x = 330; x < 470; x += 18) svg.append('line').attr('x1', x).attr('x2', x).attr('y1', 140).attr('y2', 148).attr('stroke', '#4f9b4a').attr('stroke-width', 2);
        lab(160, 100, '自然堤防'); lab(160, 86, '集落・畑', { s: 10, c: 'var(--muted)', b: false }); lab(60, 125, '後背湿地'); lab(60, 112, '水田', { s: 10, c: 'var(--muted)', b: false }); lab(400, 125, '後背湿地'); lab(210, 180, '川');
        lab(240, 30, '洪水のとき、川ぞいに砂がたまって少し高くなる（自然堤防）', { s: 11, b: false, c: 'var(--muted)' });
        lab(240, 48, '細かい泥はその外側の低い所に広がる（後背湿地）', { s: 11, b: false, c: 'var(--muted)' });
      } else if (kind === 'fan') {
        P('M0,0 L480,0 L480,40 L0,40Z', '#a8875a');
        P('M240,40 L60,200 Q240,240 420,200 Z', '#e8cf9a', '#b8945a');
        svg.append('path').attr('d', 'M240,0 L240,40 L238,90').attr('stroke', water).attr('stroke-width', 3).attr('fill', 'none');
        svg.append('path').attr('d', 'M238,90 L236,150').attr('stroke', water).attr('stroke-width', 2).attr('stroke-dasharray', '4 4').attr('fill', 'none');
        [[90, 205], [170, 214], [310, 214], [390, 205]].forEach(([x, y]) => svg.append('circle').attr('cx', x).attr('cy', y).attr('r', 6).attr('fill', water));
        lab(240, 60, '扇頂'); lab(240, 125, '扇央（水無川・果樹園や畑）', { s: 12 }); lab(240, 192, '扇端（湧水・集落や水田）', { s: 12 }); lab(240, 26, '山地', { c: '#fff', halo: false });
      } else if (kind === 'coast') {
        P('M0,0 L230,0 L230,220 L0,220Z', 'var(--sea)'); P('M250,0 L480,0 L480,220 L250,220Z', 'var(--sea)');
        P('M0,0 L230,0 L230,90 L200,60 L185,95 L160,55 L140,100 L115,60 L95,105 L70,65 L50,110 L25,70 L0,100Z', land);
        P('M250,0 L480,0 L480,70 L445,70 L440,190 L425,190 L420,70 L380,70 L376,160 L362,160 L358,70 L320,70 L316,140 L302,140 L298,70 L250,70Z', '#b8a77e');
        lab(115, 150, 'リアス海岸'); lab(115, 168, 'V字谷が沈んだ・入り江が多い', { s: 10, b: false, c: 'var(--muted)' });
        lab(370, 210, 'フィヨルド'); lab(365, 30, 'U字谷が沈んだ・細長く深い湾', { s: 10, b: false, c: 'var(--muted)' });
      } else if (kind === 'terrace') {
        P(`M0,40 L70,40 L80,90 L150,90 L160,140 L215,140 L225,175 L255,175 L265,140 L320,140 L330,90 L400,90 L410,40 L480,40 L480,${H} L0,${H}Z`, land);
        P('M225,165 L255,165 L255,175 L225,175Z', water);
        lab(110, 82, '段丘面'); lab(185, 132, '段丘面'); lab(76, 70, '段丘崖', { s: 10, c: 'var(--muted)' }); lab(240, 200, '川');
        lab(240, 24, '平らな段丘面は洪水を受けにくい。急な段丘崖は森林', { s: 11, b: false, c: 'var(--muted)' });
      } else if (kind === 'urban') {
        [[200, '#f6ead0', '郊外（住宅地・ニュータウン）'], [130, '#f0d8b0', 'インナーシティ（古い市街地）'], [60, '#e6b98a', '都心（CBD）']].forEach(([r, c, n], i) => { svg.append('circle').attr('cx', 170).attr('cy', 110).attr('r', r / 2).attr('fill', c).attr('stroke', '#b8945a'); ftext(svg, 170, 110 - r / 2 + 14 + (i === 2 ? 14 : 0), n, { a: 'middle', s: 10.5, b: true }); });
        const mk = arrowDef(svg, 'var(--shu)');
        svg.append('line').attr('x1', 190).attr('y1', 110).attr('x2', 262).attr('y2', 110).attr('stroke', 'var(--shu)').attr('stroke-width', 3).attr('marker-end', mk);
        ftext(svg, 300, 70, 'ドーナツ化現象', { s: 13, b: true, c: 'var(--shu)' }); ftext(svg, 300, 90, '都心の人口が減り、', { s: 11 }); ftext(svg, 300, 106, '郊外の人口が増える', { s: 11 });
        ftext(svg, 300, 140, '都心回帰', { s: 13, b: true, c: 'var(--accent)' }); ftext(svg, 300, 160, '再開発で高層マンション', { s: 11 }); ftext(svg, 300, 176, 'ができ、都心に人がもどる', { s: 11 });
      } else if (kind === 'territory') {
        // 領空・領土・領海・接続水域・排他的経済水域・公海
        P('M0,120 L70,120 L90,140 L480,140 L480,220 L0,220Z', 'var(--sea)');
        P('M0,95 Q30,80 60,100 L90,140 L0,140Z', land);
        svg.append('rect').attr('x', 0).attr('y', 40).attr('width', 150).attr('height', 52).attr('fill', 'color-mix(in srgb, var(--accent) 14%, transparent)').attr('stroke', 'var(--accent)').attr('stroke-dasharray', '4 3');
        lab(75, 62, '領空'); lab(40, 128, '領土', { s: 12 });
        const seg = (x1, x2, y, c, t, sub) => { svg.append('line').attr('x1', x1).attr('x2', x2).attr('y1', y).attr('y2', y).attr('stroke', c).attr('stroke-width', 8); lab((x1 + x2) / 2, y - 9, t, { s: 11.5, c }); if (sub) lab((x1 + x2) / 2, y + 18, sub, { s: 10, b: false, c: 'var(--muted)' }); };
        seg(90, 150, 160, '#c8442a', '領海'); lab(120, 180, '12海里', { s: 10, b: false, c: 'var(--muted)' });
        seg(150, 400, 160, '#2f6fb0', '排他的経済水域（EEZ）'); lab(300, 180, '200海里（約370km）まで：資源を利用できる', { s: 10, b: false, c: 'var(--muted)' });
        svg.append('line').attr('x1', 150).attr('x2', 200).attr('y1', 200).attr('y2', 200).attr('stroke', '#e3a63a').attr('stroke-width', 6); lab(175, 216, '接続水域（24海里まで）', { s: 10, c: '#b07a10' });
        lab(445, 160, '公海', { s: 12, c: 'var(--muted)' }); lab(445, 178, 'どの国も自由', { s: 10, b: false, c: 'var(--muted)' });
        svg.append('line').attr('x1', 90).attr('x2', 90).attr('y1', 140).attr('y2', 205).attr('stroke', 'var(--muted)').attr('stroke-dasharray', '2 2'); lab(62, 210, '海岸線', { s: 10, b: false, c: 'var(--muted)' });
        lab(320, 28, '国家の主権がおよぶ「領域」＝領土・領海・領空', { s: 11, b: false, c: 'var(--muted)' });
      } else if (kind === 'altitude') {
        const bands = [[200, '#9fcf7a', '〜1000m バナナ・さとうきび'], [150, '#d8d27a', '〜2500m とうもろこし'], [100, '#c9b48a', '〜4000m じゃがいも'], [55, '#b9a99a', '4000m〜 リャマ・アルパカ']];
        svg.append('clipPath').attr('id', 'altc').append('path').attr('d', 'M10,215 L150,25 L290,215Z');
        const gg = svg.append('g').attr('clip-path', 'url(#altc)');
        bands.forEach(([y, c], i) => gg.append('rect').attr('x', 0).attr('y', [160, 110, 65, 0][i]).attr('width', 480).attr('height', [60, 50, 45, 65][i]).attr('fill', c));
        P('M10,215 L150,25 L290,215', 'none', '#7a6a4a').attr('fill', 'none');
        P('M128,55 L150,25 L172,55 L160,50 L150,60 L140,50Z', '#fff');
        bands.forEach(([, c, t], i) => { const y = [190, 135, 88, 45][i]; svg.append('line').attr('x1', 150 + (y - 25) * 140 / 190 - 6).attr('x2', 268).attr('y1', y).attr('y2', y).attr('stroke', '#7a6a4a').attr('stroke-dasharray', '2 3'); ftext(svg, 272, y + 4, t, { s: 11, b: true }); });
        ftext(svg, 8, 22, '標高100mごとに気温が約0.6℃下がる', { s: 10.5, c: 'var(--muted)' });
      } else if (kind === 'thunen') {
        const rings = [[200, '#f3ead7', '牧畜'], [160, '#e9dcb0', '穀物（三圃式など）'], [120, '#cfe0b0', '林業'], [80, '#b8d8a0', '酪農・園芸']];
        rings.forEach(([r, c]) => svg.append('circle').attr('cx', 150).attr('cy', 110).attr('r', r / 2).attr('fill', c).attr('stroke', '#999'));
        svg.append('circle').attr('cx', 150).attr('cy', 110).attr('r', 10).attr('fill', 'var(--shu)'); ftext(svg, 150, 114, '都市', { a: 'middle', s: 10, b: true });
        rings.forEach(([r, c, n], i) => { svg.append('line').attr('x1', 150 + r / 2 - 6).attr('x2', 290).attr('y1', 110 - i * 3).attr('y2', 40 + i * 40).attr('stroke', '#999'); ftext(svg, 295, 44 + i * 40, n, { s: 12, b: true }); });
        ftext(svg, 295, 200, '都市から遠いほど、運ぶ費用がかかる', { s: 10.5, c: 'var(--muted)' });
      } else if (kind === 'weber') {
        const node = (x, y, t, c) => { svg.append('rect').attr('x', x - 46).attr('y', y - 16).attr('width', 92).attr('height', 32).attr('rx', 8).attr('fill', c); ftext(svg, x, y + 5, t, { a: 'middle', s: 12, b: true, halo: false, c: '#fff' }); };
        const mk = arrowDef(svg, 'var(--muted)');
        ftext(svg, 10, 30, '原料指向型：原料が重く、製品になると軽くなる（セメント）→ 原料の産地に工場', { s: 11.5 });
        node(70, 60, '原料産地', '#8c6d3f'); node(200, 60, '工場', '#c8442a'); node(400, 60, '市場', '#1f5f8b');
        svg.append('line').attr('x1', 118).attr('x2', 150).attr('y1', 60).attr('y2', 60).attr('stroke', '#8c6d3f').attr('stroke-width', 8);
        svg.append('line').attr('x1', 248).attr('x2', 350).attr('y1', 60).attr('y2', 60).attr('stroke', '#1f5f8b').attr('stroke-width', 2).attr('marker-end', mk);
        ftext(svg, 10, 120, '市場指向型：製品が重い・鮮度が大切（ビール）→ 消費地に工場', { s: 11.5 });
        node(70, 150, '原料産地', '#8c6d3f'); node(270, 150, '工場', '#c8442a'); node(400, 150, '市場', '#1f5f8b');
        svg.append('line').attr('x1', 118).attr('x2', 220).attr('y1', 150).attr('y2', 150).attr('stroke', '#8c6d3f').attr('stroke-width', 2).attr('marker-end', mk);
        svg.append('line').attr('x1', 318).attr('x2', 352).attr('y1', 150).attr('y2', 150).attr('stroke', '#1f5f8b').attr('stroke-width', 8);
        ftext(svg, 10, 200, '線の太さ＝運ぶものの重さ。重いものを運ぶ距離が短くなる場所に工場ができる', { s: 10.5, c: 'var(--muted)' });
      } else if (kind === 'transition') {
        const x = d3.scaleLinear().domain([0, 4]).range([50, 460]), y = d3.scaleLinear().domain([0, 50]).range([180, 20]);
        const birth = [[0, 42], [1, 42], [1.8, 40], [2.6, 25], [3.2, 13], [4, 11]], death = [[0, 38], [1, 36], [1.6, 20], [2.4, 12], [3.2, 10], [4, 11]];
        [1, 2, 3].forEach(k => svg.append('line').attr('x1', x(k)).attr('x2', x(k)).attr('y1', 15).attr('y2', 180).attr('stroke', 'var(--line)').attr('stroke-dasharray', '3 3'));
        svg.append('path').attr('d', d3.area().curve(d3.curveMonotoneX).x(p => x(p[0])).y0((p, i) => y(death[i][1])).y1(p => y(p[1]))(birth)).attr('fill', 'rgba(227,166,58,.3)');
        svg.append('path').attr('d', d3.line().curve(d3.curveMonotoneX).x(p => x(p[0])).y(p => y(p[1]))(birth)).attr('stroke', '#d9473b').attr('stroke-width', 3).attr('fill', 'none');
        svg.append('path').attr('d', d3.line().curve(d3.curveMonotoneX).x(p => x(p[0])).y(p => y(p[1]))(death)).attr('stroke', '#3f7fc0').attr('stroke-width', 3).attr('fill', 'none');
        ftext(svg, x(0.1), y(46), '出生率', { s: 12, b: true, c: '#d9473b' }); ftext(svg, x(0.1), y(32), '死亡率', { s: 12, b: true, c: '#3f7fc0' });
        ftext(svg, x(2), y(30), '人口が急増', { s: 11, b: true, c: '#b07a10', a: 'middle' });
        ['多産多死', '多産少死', '少産少死へ', '少産少死'].forEach((t, i) => ftext(svg, x(i + 0.5), 205, t, { a: 'middle', s: 12, b: true }));
        ftext(svg, 470, 214, '時代 →', { a: 'end', s: 10, c: 'var(--muted)' });
      } else if (kind === 'pushpull') {
        const box = (x, t, items, c) => { svg.append('rect').attr('x', x).attr('y', 30).attr('width', 180).attr('height', 150).attr('rx', 10).attr('fill', c); ftext(svg, x + 90, 52, t, { a: 'middle', s: 13, b: true, halo: false }); items.forEach((it, i) => ftext(svg, x + 14, 80 + i * 22, '・' + it, { s: 11.5, halo: false })); };
        box(10, '出身地（プッシュ要因）', ['仕事が少ない・賃金が低い', '貧困', '紛争・迫害', '災害'], 'color-mix(in srgb, #d9473b 15%, var(--panel))');
        box(290, '移動先（プル要因）', ['仕事がある・賃金が高い', '安全', '教育・医療', '家族や仲間がいる'], 'color-mix(in srgb, #3f7fc0 15%, var(--panel))');
        const mk = arrowDef(svg, 'var(--ink)'); svg.append('line').attr('x1', 196).attr('x2', 282).attr('y1', 105).attr('y2', 105).attr('stroke', 'var(--ink)').attr('stroke-width', 4).attr('marker-end', mk);
        ftext(svg, 240, 96, '移動', { a: 'middle', s: 12, b: true });
        ftext(svg, 240, 206, '押し出す力と引きつける力の両方で人は移動する', { a: 'middle', s: 11, c: 'var(--muted)' });
      } else if (kind === 'karst') {
        P(`M0,80 Q60,80 80,110 Q100,80 160,80 Q200,80 220,120 Q240,80 300,80 L480,80 L480,${H} L0,${H}Z`, '#d6d2c4');
        svg.append('ellipse').attr('cx', 360).attr('cy', 150).attr('rx', 60).attr('ry', 25).attr('fill', 'var(--panel)').attr('stroke', '#999');
        for (let x = 320; x < 400; x += 16) svg.append('path').attr('d', `M${x},127 l4,14 l4,-14`).attr('fill', '#bbb');
        lab(80, 70, 'ドリーネ'); lab(220, 70, 'ドリーネ'); lab(360, 190, '鍾乳洞'); lab(400, 60, '石灰岩の台地');
        lab(240, 214, '石灰岩が二酸化炭素をふくむ雨水にとけてできる（秋吉台など）', { s: 11, b: false, c: 'var(--muted)' });
      } else if (kind === 'glacier') {
        P(`M0,30 L120,30 Q140,180 240,180 Q340,180 360,30 L480,30 L480,${H} L0,${H}Z`, land);
        P(`M0,30 L120,30 L160,${H} L0,${H}Z`, 'none');
        lab(240, 160, 'U字谷'); lab(240, 20, '氷河がけずった谷は、底が広いU字形', { s: 11, b: false, c: 'var(--muted)' });
        lab(60, 120, '（川がけずるとV字谷）', { s: 10, b: false, c: 'var(--muted)' });
      } else if (kind === 'survey' || kind === 'help') {
        const items = kind === 'survey'
          ? [['① 課題を見つける', '身近な地域の「なぜ？」'], ['② 仮説を立てる', '「〜だからではないか」'], ['③ 調べる', '地形図・統計・GIS、聞き取り・観察'], ['④ まとめる', '主題図・グラフで仮説を確かめる'], ['⑤ 発表・提案する', '解決策を考えて発信する']]
          : [['自助', '自分と家族を守る（備蓄・避難経路の確認）'], ['共助', '地域で助け合う（声かけ・自主防災組織）'], ['公助', '国・自治体の対策（堤防・ハザードマップ）']];
        const n = items.length, rh = (H - 10) / n;
        const mk = arrowDef(svg, 'var(--muted)');
        items.forEach(([t, d], i) => {
          const y = 5 + i * rh;
          svg.append('rect').attr('x', 10).attr('y', y + 2).attr('width', 150).attr('height', rh - 10).attr('rx', 8).attr('fill', `color-mix(in srgb, var(--accent) ${18 + i * 10}%, var(--panel))`);
          ftext(svg, 85, y + rh / 2 + 1, t, { a: 'middle', s: 14, b: true, halo: false });
          ftext(svg, 172, y + rh / 2 + 1, d, { s: 13, halo: false });
          if (i < n - 1 && kind === 'survey') svg.append('line').attr('x1', 85).attr('x2', 85).attr('y1', y + rh - 8).attr('y2', y + rh + 4).attr('stroke', 'var(--muted)').attr('stroke-width', 2).attr('marker-end', mk);
        });
      } else if (kind === 'symbols') {
        const items = [['文', '小・中学校'], ['卍', '寺院'], ['⛩', '神社'], ['〒', '郵便局'], ['⊗', '警察署'], ['', '自然災害伝承碑']];
        items.forEach(([sym, n], i) => {
          const x = 40 + (i % 3) * 150, y = 60 + Math.floor(i / 3) * 90;
          svg.append('rect').attr('x', x - 26).attr('y', y - 34).attr('width', 52).attr('height', 52).attr('rx', 8).attr('fill', 'var(--bg)').attr('stroke', 'var(--line)');
          if (sym) ftext(svg, x, y + 2, sym, { a: 'middle', s: 30, b: true, halo: false });
          else { svg.append('path').attr('d', `M${x - 10},${y + 10} L${x - 10},${y - 14} Q${x - 4},${y - 22} ${x + 2},${y - 14} L${x + 2},${y + 10} Z`).attr('fill', 'none').attr('stroke', 'var(--ink)').attr('stroke-width', 2.5); svg.append('line').attr('x1', x + 10).attr('x2', x + 10).attr('y1', y - 18).attr('y2', y + 10).attr('stroke', 'var(--ink)').attr('stroke-width', 2.5); }
          ftext(svg, x + 36, y - 2, n, { s: 13, b: true });
        });
      } else if (kind === 'scale') {
        svg.append('rect').attr('x', 40).attr('y', 60).attr('width', 400).attr('height', 34).attr('fill', 'var(--bg)').attr('stroke', 'var(--ink)');
        for (let i = 0; i <= 4; i++) { svg.append('line').attr('x1', 40 + i * 100).attr('x2', 40 + i * 100).attr('y1', 60).attr('y2', i % 4 ? 80 : 94).attr('stroke', 'var(--ink)').attr('stroke-width', 2); ftext(svg, 40 + i * 100, 52, `${i}cm`, { a: 'middle', s: 12 }); }
        ftext(svg, 240, 130, '地図上の 4cm × 25000 ＝ 100000cm', { a: 'middle', s: 15, b: true });
        ftext(svg, 240, 160, '＝ 1000m ＝ 1km', { a: 'middle', s: 18, b: true, c: 'var(--shu)' });
        ftext(svg, 240, 196, '実際の距離 ＝ 地図上の長さ × 縮尺の分母', { a: 'middle', s: 12, c: 'var(--muted)' });
      } else if (kind === 'hazardmap') {
        const lv = [[0.5, '#fff3a0', '0.5m未満：大人のひざ'], [3, '#f7c8d0', '0.5〜3m：1階がつかる'], [5, '#ef9fb1', '3〜5m：2階がつかる'], [8, '#c37ac9', '5m以上：2階の屋根をこえる']];
        svg.append('path').attr('d', 'M22,34 L65,8 L108,34 Z').attr('fill', 'var(--chip)').attr('stroke', 'var(--ink)');
        svg.append('rect').attr('x', 30).attr('y', 30).attr('width', 70).attr('height', 160).attr('fill', 'var(--panel)').attr('stroke', 'var(--ink)');
        [80, 130].forEach(y => svg.append('line').attr('x1', 30).attr('x2', 100).attr('y1', y).attr('y2', y).attr('stroke', 'var(--ink)'));
        ftext(svg, 65, 60, '2階', { a: 'middle', s: 11 }); ftext(svg, 65, 160, '1階', { a: 'middle', s: 11 });
        lv.forEach(([d, c, t], i) => { svg.append('rect').attr('x', 140).attr('y', 30 + i * 42).attr('width', 26).attr('height', 26).attr('fill', c); ftext(svg, 175, 48 + i * 42, t, { s: 12, b: true }); });
        svg.append('rect').attr('x', 31).attr('y', 154).attr('width', 68).attr('height', 35).attr('fill', 'rgba(239,159,177,.55)');
        ftext(svg, 65, 210, '浸水 約1.8m の例', { a: 'middle', s: 10, c: 'var(--muted)' });
      }
      return figWrap(svg.node(), cap);
    };
  },
  // 架空の町の地形分類図
  town(o = {}) {
    return () => {
      const { w, h, kind } = TOWN, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d'), im = ctx.createImageData(w, h);
      const shd = shadeOf(TOWN.v, w, h, TOWN.cell, 3);
      for (let k = 0; k < w * h; k++) { const c = [4, 5].includes(kind[k]) ? d3.rgb(KIND[kind[k]].c) : mix(KIND[kind[k]].c, 0.62 + 0.5 * shd[k]); im.data.set([Math.min(255, c.r), Math.min(255, c.g), Math.min(255, c.b), 255], k * 4); }
      ctx.putImageData(im, 0, 0);
      const svg = fsvg(w * 3, h * 3);
      svg.append('image').attr('href', cv.toDataURL()).attr('width', w * 3).attr('height', h * 3).attr('preserveAspectRatio', 'none');
      const names = [[20, 12, '山地'], [55, 33, '扇状地'], [135, 60, '台地'], [30, 60, '後背湿地'], [52, 50, '旧河道'], [85, 104, '海']];
      names.forEach(([x, y, t]) => ftext(svg, x * 3, y * 3, t, { a: 'middle', s: 13, b: true }));
      return figWrap(svg.node(), o.cap || '架空の町の地形分類図', KIND.filter((k, i) => ![4, 5].includes(i)).map(k => [k.c, k.n]));
    };
  },
  pyramid(id, o = {}) { return () => figWrap(miniPyramid(buildPreset(id)), o.cap || `${POP_PRESETS[id].name}の人口ピラミッド（${id === 'japan' ? '2020年' : 'モデル'}）・${popStats(buildPreset(id)).type}`); },
  pyramids(ids = ['ethiopia', 'usa', 'japan']) {
    return () => {
      const d = el('<div class="fig3"></div>');
      ids.forEach(id => { const P = buildPreset(id); d.appendChild(figWrap(miniPyramid(P), `${POP_PRESETS[id].name}：${popStats(P).type.replace(/（.*）/, '')}`)); });
      return d;
    };
  },
  // 統計の棒グラフ（48か国から）
  rank(key, o = {}) {
    return () => {
      const I = INDICATORS.find(i => i.key === key);
      let list = (o.ids ? o.ids.map(id => C_BY_ID[id]) : COUNTRIES.slice()).map(c => ({ c, v: indicatorValue(c, I) }));
      list.sort((a, b) => o.asc ? a.v - b.v : b.v - a.v); if (!o.ids) list = list.slice(0, o.n || 8);
      const W = 480, rowH = 22, H = list.length * rowH + 16, svg = fsvg(W, H);
      const x = d3.scaleLinear().domain([0, d3.max(list, d => d.v)]).range([0, W - 190]);
      list.forEach((d, i) => {
        const y = 8 + i * rowH, hl = (o.hl || []).includes(d.c.id);
        ftext(svg, 110, y + 14, d.c.jp, { a: 'end', s: 12, b: hl, halo: false });
        svg.append('rect').attr('x', 116).attr('y', y + 3).attr('width', x(d.v)).attr('height', rowH - 7).attr('rx', 3).attr('fill', hl ? 'var(--shu)' : REG_COLOR[d.c.reg]);
        ftext(svg, 122 + x(d.v), y + 14, `${I.fmt(d.v)}${I.unit === '%' ? '%' : ''}`, { s: 11, halo: false, c: 'var(--muted)' });
      });
      return figWrap(svg.node(), o.cap || `${I.name}${I.unit && I.unit !== '%' ? `（${I.unit}）` : ''}（おおよその値）`);
    };
  },
  scatter(xk, yk, o = {}) {
    return () => {
      const X = INDICATORS.find(i => i.key === xk), Y = INDICATORS.find(i => i.key === yk);
      const W = 480, H = 260, m = { l: 44, r: 12, t: 10, b: 34 }, svg = fsvg(W, H);
      const lg = k => LOG_KEYS.includes(k);
      const ex = I => { const e = d3.extent(COUNTRIES, c => indicatorValue(c, I)); return lg(I.key) ? [e[0] * .8, e[1] * 1.2] : [0, e[1] * 1.08]; };
      const x = (lg(xk) ? d3.scaleLog() : d3.scaleLinear()).domain(ex(X)).range([m.l, W - m.r]);
      const y = (lg(yk) ? d3.scaleLog() : d3.scaleLinear()).domain(ex(Y)).range([H - m.b, m.t]);
      svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5, lg(xk) ? '~s' : undefined));
      svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5, lg(yk) ? '~s' : undefined));
      svg.attr('class', 'figsvg chart');
      COUNTRIES.forEach(c => { const px = x(indicatorValue(c, X)), py = y(indicatorValue(c, Y)); svg.append('circle').attr('cx', px).attr('cy', py).attr('r', 4).attr('fill', REG_COLOR[c.reg]); if ((o.names || []).includes(c.id)) ftext(svg, px + 5, py + 4, c.jp, { s: 10, b: true }); });
      ftext(svg, (W + m.l) / 2, H - 2, `${X.name}${lg(xk) ? '（10倍ごとの目盛り）' : ''}`, { a: 'middle', s: 11, halo: false });
      ftext(svg, m.l + 4, m.t + 8, Y.name, { s: 11, halo: false });
      return figWrap(svg.node(), o.cap || `${X.name}と${Y.name}の関係（点の色は地域）`);
    };
  }
};

// 図をつくる（失敗しても授業は続ける）
function fig(spec) {
  if (!spec) return null;
  try { return typeof spec === 'function' ? spec() : null; } catch (e) { console.warn('図をつくれませんでした', e); return null; }
}
