/* 見る：地球儀と図法（ゆがみ・大圏航路・等角航路・正距方位図法で方位を調べる） */

function mollweideRaw(l, p) {
  let t = p;
  if (Math.abs(Math.abs(p) - Math.PI / 2) < 1e-9) t = p;
  else {
    const k = Math.PI * Math.sin(p);
    for (let i = 0; i < 30; i++) { const d = (2 * t + Math.sin(2 * t) - k) / (2 + 2 * Math.cos(2 * t)); t -= d; if (Math.abs(d) < 1e-8) break; }
  }
  return [2 * Math.SQRT2 / Math.PI * l * Math.cos(t), Math.SQRT2 * Math.sin(t)];
}
function sinusoidalRaw(l, p) { return [l * Math.cos(p), p]; }

const PROJS = [
  { id: 'globe', name: '地球儀', make: () => d3.geoOrthographic().clipAngle(90), sph: true, prop: { 角: '○', 面積: '○', 距離: '○', 方位: '○' }, use: '本物の地球と同じ形。ただし一度に半分しか見えない。', drag: 'rotate' },
  { id: 'mercator', name: 'メルカトル図法', make: () => d3.geoMercator(), prop: { 角: '○', 面積: '×', 距離: '×', 方位: '×' }, use: '角度が正しい（正角図法）。2点を結ぶ直線が等角航路になるので、むかしから航海図に使われる。高緯度ほど面積が大きく表される。', drag: 'lon' },
  { id: 'azeq', name: '正距方位図法', make: () => d3.geoAzimuthalEquidistant().clipAngle(179.9), sph: true, prop: { 角: '×', 面積: '×', 距離: '中心から○', 方位: '中心から○' }, use: '図の中心からの距離と方位が正しい。中心から引いた直線は最短コース（大圏航路）。航空図や国連のマークに使われる。外側ほど形がゆがむ。', drag: 'center' },
  { id: 'mollweide', name: 'モルワイデ図法', make: () => d3.geoProjection(mollweideRaw), sph: true, prop: { 角: '×', 面積: '○', 距離: '×', 方位: '×' }, use: '面積が正しい（正積図法）。高緯度のゆがみが小さめで、世界の分布図に使われる。', drag: 'lon' },
  { id: 'sinusoidal', name: 'サンソン図法', make: () => d3.geoProjection(sinusoidalRaw), sph: true, prop: { 角: '×', 面積: '○', 距離: '×', 方位: '×' }, use: '正積図法。緯線が等間隔の直線。低緯度のゆがみが小さく、アフリカや南アメリカなど赤道付近の地図に向く。', drag: 'lon' },
  { id: 'equirect', name: '正距円筒図法', make: () => d3.geoEquirectangular(), sph: true, prop: { 角: '×', 面積: '×', 距離: '経線上○', 方位: '×' }, use: '経線と緯線が等間隔の直角の格子。時差の地図や、コンピュータの地図データの基本。', drag: 'lon' },
  { id: 'gnomonic', name: '心射図法', make: () => d3.geoGnomonic().clipAngle(65), sph: false, prop: { 角: '×', 面積: '×', 距離: '×', 方位: '中心から○' }, use: 'どの2点を結んだ直線も大圏航路（最短コース）になる。メルカトル図法と組み合わせて航海の計画に使われた。中心から遠いほど大きくゆがみ、半球も描けない。', drag: 'center' }
];

registerTool('globe', {
  name: '地球儀と図法',
  render(container, params = {}) {
    const S = {
      proj: params.proj || 'globe', rotate: [-135, -25, 0],
      from: params.from || 'tokyo', to: params.to || 'newyork',
      tissot: params.tissot ?? false, great: true, rhumb: params.rhumb ?? (params.proj === 'mercator'), compass: params.compass ?? false
    };
    const ui = toolShell(container, { foot: true });
    let W = 960; const H = 560;
    const svg = d3.select(ui.wrap).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const tip = el('<div class="tip" hidden></div>'); ui.wrap.appendChild(tip);

    // 上のバー：図法の切りかえ
    const projSeg = seg(PROJS.map(p => ({ v: p.id, label: p.name })), S.proj, v => { S.proj = v; if (v === 'mercator') S.rhumb = true; setupProj(); draw(); renderSide(); });
    ui.bar.appendChild(projSeg);
    ui.foot.innerHTML = '<span>ドラッグで回す（図法によっては中心を動かす）</span><span>・赤い線＝大圏航路（最短コース）</span><span>・緑の線＝等角航路（同じ方位で進む）</span>';

    let proj;
    function setupProj() {
      const def = PROJS.find(p => p.id === S.proj);
      W = MOBILE.matches && ['globe', 'azeq', 'gnomonic'].includes(S.proj) ? H : 960;
      svg.attr('viewBox', `0 0 ${W} ${H}`);
      proj = def.make();
      if (def.drag === 'center' || def.drag === 'rotate') {
        if (def.drag === 'center') { const c = PLACE[S.from]; S.rotate = [-c.lon, -c.lat, 0]; }
        proj.rotate(S.rotate);
      } else proj.rotate([S.rotate[0], 0, 0]);
      if (S.proj === 'mercator') { proj.scale(W / (2 * Math.PI) * 0.98).translate([W / 2, H / 2 + 40]).clipExtent([[0, 0], [W, H]]); }
      else if (S.proj === 'gnomonic') { proj.scale(W < 900 ? 220 : 260).translate([W / 2, H / 2]); }
      else proj.fitExtent([[12, 12], [W - 12, H - 12]], { type: 'Sphere' });
    }

    function rhumbLine(a, b) {
      // メルカトル図法の上で直線になる線（等角航路）。経度は近い方の向きに進む
      const dl = ((b[0] - a[0] + 540) % 360) - 180;
      const Y = p => Math.log(Math.tan(Math.PI / 4 + p * Math.PI / 360));
      const ya = Y(a[1]), yb = Y(b[1]);
      const pts = d3.range(0, 1.0001, 1 / 160).map(t => {
        const lon = ((a[0] + dl * t + 540) % 360) - 180;
        const lat = (2 * Math.atan(Math.exp(ya + (yb - ya) * t)) - Math.PI / 2) * 180 / Math.PI;
        return [lon, lat];
      });
      return { type: 'LineString', coordinates: pts };
    }

    function draw() {
      svg.selectAll('*').remove();
      const base = drawBaseMap(svg, proj, { antarctica: true });
      const path = base.path;
      const A = PLACE[S.from], B = PLACE[S.to];
      const a = [A.lon, A.lat], b = [B.lon, B.lat];
      const g = base.g;
      if (S.tissot) {
        const circ = d3.geoCircle().radius(4.5);
        const centers = [];
        for (let lat = -75; lat <= 75; lat += 25) for (let lon = -165; lon <= 180; lon += 30) centers.push([lon, lat]);
        g.append('g').selectAll('path').data(centers).join('path').attr('d', c => path(circ.center(c)())).attr('fill', 'rgba(200,68,42,.35)').attr('stroke', 'var(--shu)').attr('stroke-width', .8);
      }
      if (S.compass && (S.proj === 'azeq' || S.proj === 'globe' || S.proj === 'gnomonic')) {
        // 中心の都市から、東西南北へ大圏で進む線
        const dirs = [[0, '北'], [90, '東'], [180, '南'], [270, '西']];
        dirs.forEach(([brg, nm]) => {
          const line = { type: 'LineString', coordinates: d3.range(0, 19800, 300).map(d => gcDestination(a, brg, d)) };
          g.append('path').datum(line).attr('d', path).attr('fill', 'none').attr('stroke', brg === 90 ? 'var(--shu)' : 'var(--accent)').attr('stroke-width', brg === 90 ? 3 : 1.6).attr('stroke-dasharray', brg === 90 ? null : '6 4');
          const lp = proj(gcDestination(a, brg, 2600));
          if (lp) g.append('text').attr('class', 'lbl').attr('x', lp[0]).attr('y', lp[1]).attr('text-anchor', 'middle').style('font-weight', 700).text(`真${nm}`);
        });
        if (S.proj === 'azeq') {
          [5000, 10000, 15000].forEach(d => {
            g.append('path').datum(d3.geoCircle().center(a).radius(d / R_EARTH * 180 / Math.PI)()).attr('d', path).attr('fill', 'none').attr('stroke', 'var(--muted)').attr('stroke-dasharray', '3 4');
            const lp = proj(gcDestination(a, 0, d));
            if (lp) g.append('text').attr('class', 'lbl').attr('x', lp[0] + 4).attr('y', lp[1] - 3).text(`${d / 1000}千km`);
          });
        }
      }
      if (S.rhumb) g.append('path').datum(rhumbLine(a, b)).attr('d', path).attr('fill', 'none').attr('stroke', '#2c9a58').attr('stroke-width', 3).attr('stroke-dasharray', '8 5');
      if (S.great) g.append('path').datum({ type: 'LineString', coordinates: [a, b] }).attr('d', path).attr('fill', 'none').attr('stroke', 'var(--shu)').attr('stroke-width', 3.2);
      // 都市
      const visible = c => { const def = PROJS.find(p => p.id === S.proj); if (!def.sph && S.proj !== 'gnomonic') return true; const r = proj.rotate(); return d3.geoDistance([c.lon, c.lat], [-r[0], -r[1]]) < (S.proj === 'gnomonic' ? 1.1 : Math.PI / 2 + (S.proj === 'globe' ? 0 : 2)); };
      PLACES.forEach(c => {
        if ((S.proj === 'globe' || S.proj === 'gnomonic') && !visible(c)) return;
        const p = proj([c.lon, c.lat]); if (!p || !isFinite(p[0])) return;
        const on = c.id === S.from || c.id === S.to;
        g.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', on ? 6 : 3.5).attr('fill', on ? 'var(--shu)' : 'var(--ink)').attr('stroke', 'var(--panel)').attr('stroke-width', 1.5)
          .style('cursor', 'pointer').on('click', ev => { ev.stopPropagation(); if (c.id !== S.from) { S.to = c.id; draw(); renderSide(); } });
        if (on || S.proj !== 'globe') g.append('text').attr('class', 'lbl').attr('x', p[0] + 7).attr('y', p[1] + 4).style('font-weight', on ? 700 : 400).style('font-size', on ? '13px' : '10px').text(c.name);
      });
      base.countries.on('mousemove', (ev, d) => { if (!d.jp) return; const pt = svgPoint(svg.node(), ev); tip.hidden = false; tip.textContent = d.jp; const r = ui.wrap.getBoundingClientRect(); tip.style.left = (ev.clientX - r.left) + 'px'; tip.style.top = (ev.clientY - r.top) + 'px'; })
        .on('mouseleave', () => { tip.hidden = true; });
    }

    // ドラッグで回す
    let start = null;
    svg.call(d3.drag()
      .on('start', ev => { start = { x: ev.x, y: ev.y, r: S.rotate.slice() }; })
      .on('drag', ev => {
        const def = PROJS.find(p => p.id === S.proj);
        const k = def.drag === 'lon' ? 0.4 : 0.3;
        S.rotate = [start.r[0] + (ev.x - start.x) * k, def.drag === 'lon' ? 0 : clamp(start.r[1] - (ev.y - start.y) * k, -90, 90), 0];
        if (def.drag === 'center') { proj.rotate(S.rotate); } else if (def.drag === 'rotate') proj.rotate(S.rotate); else proj.rotate([S.rotate[0], 0, 0]);
        draw();
      }));

    function renderSide() {
      const def = PROJS.find(p => p.id === S.proj);
      const A = PLACE[S.from], B = PLACE[S.to];
      const d = gcDistance([A.lon, A.lat], [B.lon, B.lat]);
      const brg = gcBearing([A.lon, A.lat], [B.lon, B.lat]);
      ui.side.innerHTML = `
        <h2>${def.name}</h2>
        <p class="lead">地球は丸いので、平らな地図にすると必ずどこかがゆがむ。目的に合わせて図法を選ぶ。</p>
        <table class="tbl"><tr>${Object.keys(def.prop).map(k => `<th>${k}</th>`).join('')}</tr><tr>${Object.values(def.prop).map(v => `<td>${v}</td>`).join('')}</tr></table>
        <p style="font-size:14px">${def.use}</p>
        <h3>表示</h3><div class="row toggles"></div>
        <h3>2地点を結ぶ</h3>
        <div class="row"><span class="small muted">出発</span><span class="from"></span><span class="small muted">到着</span><span class="to"></span></div>
        <dl class="kv"><dt>最短距離</dt><dd>約 ${Math.round(d / 100) * 100} km</dd><dt>出発の方位</dt><dd class="t">${bearingName(brg)}（${Math.round(brg)}°）</dd></dl>
        <p class="small muted">地図上の都市をクリックすると到着地を変えられます。</p>
        <div class="think"></div>
        <details class="more"><summary>図法のまとめ（くらべる）</summary>
          <table class="tbl"><tr><th>図法</th><th>正しいもの</th><th>おもな使い道</th></tr>
          <tr><td>メルカトル</td><td>角度（正角）</td><td>航海図</td></tr>
          <tr><td>正距方位</td><td>中心からの距離・方位</td><td>航空図</td></tr>
          <tr><td>モルワイデ・サンソン</td><td>面積（正積）</td><td>分布図</td></tr>
          <tr><td>心射</td><td>直線＝大圏航路</td><td>航路の計画</td></tr></table></details>`;
      const tg = $('.toggles', ui.side);
      tg.appendChild(toggleChip('ゆがみの円', S.tissot, v => { S.tissot = v; draw(); }));
      tg.appendChild(toggleChip('大圏航路', S.great, v => { S.great = v; draw(); }));
      tg.appendChild(toggleChip('等角航路', S.rhumb, v => { S.rhumb = v; draw(); }));
      if (['azeq', 'globe', 'gnomonic'].includes(S.proj)) tg.appendChild(toggleChip('出発地から東西南北', S.compass, v => { S.compass = v; draw(); }));
      const opts = PLACES.map(p => ({ v: p.id, label: p.name }));
      $('.from', ui.side).appendChild(selectBox(opts, S.from, v => { S.from = v; if (S.to === v) S.to = v === 'tokyo' ? 'newyork' : 'tokyo'; setupProj(); draw(); renderSide(); }));
      $('.to', ui.side).appendChild(selectBox(opts, S.to, v => { S.to = v; draw(); renderSide(); }));
      const th = $('.think', ui.side);
      if (S.proj === 'mercator') th.appendChild(thinkCard({ id: 'globe-merc', views: ['pos'], q: '「ゆがみの円」をONにしよう。メルカトル図法でグリーンランドはオーストラリアと同じくらいに見えるが、実際の面積はどうだろう。円の大きさの変化から理由も説明しよう。', hint: '赤道付近と高緯度で、同じ大きさのはずの円がどう見えるか。', answer: '実際の面積はグリーンランド約217万km²、オーストラリア約769万km²で、オーストラリアが約3.5倍。メルカトル図法は角度を正しくするために、高緯度ほど東西にも南北にも拡大して描くので、高緯度のグリーンランドが実際より大きく見える。' }));
      else if (S.proj === 'azeq') th.appendChild(thinkCard({ id: 'globe-east', views: ['pos'], q: '出発地を東京にして「出発地から東西南北」をONにしよう。東京から真東へまっすぐ進むと、最初にどの大陸に着くだろう。メルカトル図法で見たときの予想とくらべよう。', hint: '正距方位図法では、中心からの方位が正しい。赤い太い線が真東。', answer: '東京から真東に進むと、南アメリカ大陸（チリ・アルゼンチン付近）に着く。メルカトル図法では真横（東）に北アメリカがあるように見えるが、メルカトル図法の横線は「同じ方位で進み続ける線（等角航路）」ではあっても「最初に真東へ向かう大圏」ではない。地球は丸いので、真東に出発した大圏はしだいに南へ曲がっていく。' }));
      else if (S.proj === 'globe') th.appendChild(thinkCard({ id: 'globe-route', views: ['pos', 'inter'], q: '東京からニューヨークへの飛行機は、アラスカやカナダの上空を通ることが多い。地球儀で大圏航路を確かめ、その理由を説明しよう。', answer: '地球儀の上で2点を結ぶ最短コース（大圏航路）は、北極に近い北まわりの線になるから。平面のメルカトル図法では遠まわりに見えるが、球面では最短で、燃料や時間を節約できる。' }));
      else if (S.proj === 'mollweide' || S.proj === 'sinusoidal') th.appendChild(thinkCard({ id: 'globe-area', views: ['pos'], q: '世界の森林の分布や人口の分布を地図に表すとき、メルカトル図法ではなく正積図法を使うのはなぜだろう。', answer: '分布図では「どこにどれだけ広がっているか」をくらべるので、面積が正しくないと誤解を生む。メルカトル図法は高緯度ほど面積が大きくなるため、ロシアやカナダの森林が実際より多く見えてしまう。' }));
    }

    setupProj(); draw(); renderSide();
    return () => {};
  }
});
