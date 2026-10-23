/* 見る：地形と災害（大地形・プレート境界・火山と地震。日本付近のプレート） */

const LF = {
  newBelts: [
    { name: '環太平洋造山帯', line: [[-70, -55], [-74, -50], [-73, -42], [-71, -33], [-70, -25], [-71, -18], [-76, -14], [-80, -6], [-78, 0], [-80, 5], [-84, 10], [-88, 13], [-95, 15], [-104, 19], [-110, 25], [-117, 32], [-122, 38], [-124, 45], [-130, 52], [-138, 58], [-150, 60], [-160, 55], [-175, 52], [170, 53], [162, 56], [155, 50], [146, 43], [141, 36], [131, 31], [127, 27], [121, 22], [124, 14], [126, 7], [128, 0], [141, -3], [150, -6], [160, -10], [168, -16], [178, -17], [-175, -22], [178, -35], [174, -41], [168, -46]] },
    { name: 'アルプス＝ヒマラヤ造山帯', line: [[-8, 31], [2, 36], [7, 45.8], [13, 47], [19, 42], [24, 38], [33, 38], [44, 38], [50, 33], [60, 28], [67, 33], [73, 36], [80, 32], [87, 28], [95, 28], [97, 22], [96, 15], [95, 6], [100, -2], [106, -7], [115, -8.5], [122, -9], [128, -7], [132, -4]] }
  ],
  oldBelts: [
    { name: 'アパラチア山脈', line: [[-85, 34], [-79, 38], [-75, 41], [-68, 46]] },
    { name: 'ウラル山脈', line: [[59, 51], [59, 56], [60, 61], [65, 67]] },
    { name: 'グレートディヴァイディング山脈', line: [[146, -38], [150, -33], [151, -27], [146, -20], [145, -16]] },
    { name: 'スカンディナヴィア山脈', line: [[6, 59], [10, 63], [15, 67], [20, 69.5]] },
    { name: 'ドラケンスバーグ山脈', line: [[27, -32], [29, -29.5], [30, -27]] },
    { name: 'テンシャン山脈', line: [[70, 41], [78, 42], [86, 43], [92, 43]] }
  ],
  shields: [
    { name: 'カナダ楯状地', c: [-90, 58], r: 12 }, { name: 'バルト楯状地', c: [27, 64], r: 6 }, { name: 'シベリア卓状地', c: [105, 64], r: 10 },
    { name: 'アフリカ楯状地', c: [20, 2], r: 16 }, { name: 'ブラジル楯状地', c: [-50, -12], r: 11 }, { name: 'オーストラリア楯状地', c: [127, -25], r: 10 },
    { name: 'インド半島（デカン高原）', c: [77, 18], r: 6 }, { name: 'アラビア半島', c: [45, 23], r: 7 }, { name: '中国東部の卓状地', c: [112, 34], r: 6 }
  ],
  bounds: [
    { type: 'div', name: '大西洋中央海嶺', line: [[-18, 66], [-30, 55], [-29, 45], [-38, 30], [-45, 18], [-33, 5], [-14, -2], [-13, -20], [-14, -35], [-12, -50]] },
    { type: 'div', name: '東太平洋海嶺', line: [[-108, 22], [-104, 10], [-104, -5], [-112, -20], [-114, -35], [-117, -50]] },
    { type: 'div', name: 'アフリカ大地溝帯', line: [[39, 14], [40, 9], [37, 2], [36, -4], [34.5, -10], [35, -15]] },
    { type: 'tra', name: 'サンアンドレアス断層', line: [[-124.5, 40.5], [-122, 37], [-118, 34.5], [-115.5, 32.5]] },
    { type: 'tra', name: '北アナトリア断層', line: [[27, 40.7], [33, 41], [40, 39.6], [43, 39]] },
    { type: 'con', name: 'ヒマラヤ（大陸どうしの衝突）', line: [[73, 35], [80, 30.5], [88, 27.5], [95, 28.5]] }
  ],
  volcanoes: [
    { name: '富士山', c: [138.7, 35.4], note: '日本最高峰の成層火山。1707年の宝永噴火が最後。' },
    { name: 'キラウエア山', c: [-155.3, 19.4], note: 'ハワイ島。プレートの境界ではなく、マントルからマグマがわき出すホットスポットの火山。' },
    { name: 'エトナ山', c: [15.0, 37.75], note: 'イタリア・シチリア島。ヨーロッパでもっとも活発な火山。' },
    { name: 'ベスビオ山', c: [14.4, 40.8], note: '79年の噴火でポンペイの町が埋まった。' },
    { name: 'セントヘレンズ山', c: [-122.2, 46.2], note: 'アメリカ。1980年に山体崩壊をともなう大噴火。' },
    { name: 'ピナトゥボ山', c: [120.35, 15.1], note: 'フィリピン。1991年の大噴火で世界の気温が一時下がった。' },
    { name: 'クラカタウ', c: [105.4, -6.1], note: 'インドネシア。1883年の噴火で大津波が発生。' },
    { name: 'アイスランドの火山', c: [-19.6, 63.6], note: '広がる境界（大西洋中央海嶺）が陸上に現れた島。ギャオ（大地の割れ目）が見られる。' },
    { name: 'キリマンジャロ山', c: [37.35, -3.07], note: 'アフリカ最高峰。アフリカ大地溝帯の近くにある火山。' },
    { name: 'コトパクシ山', c: [-78.4, -0.7], note: 'エクアドル・アンデス山脈の成層火山。' }
  ],
  quakes: [
    { name: '東北地方太平洋沖地震（2011年）', c: [142.4, 38.1], m: 9.0, note: '太平洋プレートが沈みこむ日本海溝付近で発生。大津波で大きな被害（東日本大震災）。' },
    { name: 'スマトラ島沖地震（2004年）', c: [95.9, 3.3], m: 9.1, note: 'インド洋大津波でインド洋沿岸の各国に被害。' },
    { name: 'チリ地震（1960年）', c: [-73.0, -38.2], m: 9.5, note: '観測史上最大。津波が約1日かけて日本にも到達した。' },
    { name: 'トルコ・シリア地震（2023年）', c: [37.0, 37.2], m: 7.8, note: 'プレートがずれる境界（東アナトリア断層）付近。' },
    { name: 'ネパール地震（2015年）', c: [84.7, 28.2], m: 7.8, note: 'インド＝オーストラリアプレートとユーラシアプレートの衝突帯。' },
    { name: 'サンフランシスコ地震（1906年）', c: [-122.5, 37.7], m: 7.9, note: 'サンアンドレアス断層（ずれる境界）による地震。' }
  ]
};

const JP = {
  bounds: [
    { name: '千島海溝・日本海溝', type: 'con', line: [[153, 47], [147, 42.5], [144.5, 40], [143.6, 37], [142.3, 34.6]] },
    { name: '伊豆・小笠原海溝', type: 'con', line: [[142.3, 34.6], [142, 30], [142.8, 26]] },
    { name: '相模トラフ', type: 'con', line: [[139.6, 34.9], [140.8, 34.3], [142.3, 34.6]] },
    { name: '南海トラフ', type: 'con', line: [[138.6, 34.9], [137.8, 34], [136, 33.2], [134, 32.6], [132.3, 31.7]] },
    { name: '南西諸島海溝（琉球海溝）', type: 'con', line: [[132.3, 31.7], [131, 29.5], [128.8, 26.8], [126, 24.5], [123, 23.3]] },
    { name: '日本海東縁・糸魚川－静岡構造線付近', type: 'other', line: [[140, 47], [139.3, 43], [139.2, 40], [138.6, 38], [137.8, 36.8], [138.3, 35.3], [138.6, 34.9]] }
  ],
  plates: [{ name: '太平洋プレート', c: [148, 34] }, { name: 'フィリピン海プレート', c: [135.5, 28] }, { name: '北アメリカプレート', c: [144, 44.5] }, { name: 'ユーラシアプレート', c: [129, 38] }],
  volcanoes: [
    { name: '富士山', c: [138.73, 35.36] }, { name: '浅間山', c: [138.52, 36.41] }, { name: '御嶽山', c: [137.48, 35.89] }, { name: '桜島', c: [130.66, 31.58] },
    { name: '阿蘇山', c: [131.1, 32.88] }, { name: '雲仙岳', c: [130.3, 32.76] }, { name: '有珠山', c: [140.84, 42.54] }, { name: '三宅島', c: [139.53, 34.08] }
  ],
  quakes: [
    { name: '関東大震災（1923年）', c: [139.3, 35.3], note: '相模トラフ付近（海溝型）。火災の被害が大きかった。' },
    { name: '阪神・淡路大震災（1995年）', c: [135.0, 34.6], note: '活断層による直下型地震。建物の倒壊が多かった。' },
    { name: '東日本大震災（2011年）', c: [142.4, 38.1], note: '日本海溝付近（海溝型）。巨大津波と原子力発電所の事故。' },
    { name: '熊本地震（2016年）', c: [130.8, 32.8], note: '活断層による地震。震度7が2回観測された。' },
    { name: '能登半島地震（2024年）', c: [137.3, 37.5], note: '活断層による地震。土地の隆起や津波、火災が発生した。' }
  ]
};

const BOUND_STYLE = { div: { c: '#e3a63a', n: '広がる境界' }, con: { c: '#d9473b', n: '狭まる境界' }, tra: { c: '#3f7fc0', n: 'ずれる境界' }, other: { c: '#8a5bd0', n: 'プレートの境界（はっきりしない所もある）' } };

// --- プレート境界の動き（模式図アニメーション） ---
function plateAnim(kind) {
  let raf = 0;
  const box = el('<div class="card" style="background:var(--panel)"></div>');
  const W2 = 340, H2 = 170;
  const s = d3.select(box).append('svg').attr('viewBox', `0 0 ${W2} ${H2}`).style('width', '100%');
  const cap = el('<p class="small" style="margin:4px 0 0"></p>'); box.appendChild(cap);
  const sea = 'var(--sea2)';
  let t0 = performance.now();
  let started = false;
  const frame = now => {
    if (started && !box.isConnected) return; // 画面から消えたら止める
    started = true;
    const t = ((now - t0) / 4000) % 1;
    s.selectAll('*').remove();
    if (kind === 'diverge') {
      s.append('rect').attr('width', W2).attr('height', 60).attr('fill', sea);
      const gap = 6 + t * 40;
      s.append('rect').attr('x', 0).attr('y', 60).attr('width', W2 / 2 - gap / 2).attr('height', 40).attr('fill', '#8c7a5b');
      s.append('rect').attr('x', W2 / 2 + gap / 2).attr('y', 60).attr('width', W2 / 2).attr('height', 40).attr('fill', '#8c7a5b');
      s.append('rect').attr('x', W2 / 2 - gap / 2).attr('y', 54).attr('width', gap).attr('height', 46).attr('fill', '#e0533d');
      s.append('path').attr('d', `M${W2 / 2},${H2} L${W2 / 2},100`).attr('stroke', '#e0533d').attr('stroke-width', 14);
      s.append('rect').attr('y', 100).attr('width', W2).attr('height', 70).attr('fill', 'rgba(224,83,61,.25)');
      s.append('text').attr('x', 40).attr('y', 85).attr('fill', '#fff').attr('font-size', 12).text('← プレート');
      s.append('text').attr('x', W2 - 110).attr('y', 85).attr('fill', '#fff').attr('font-size', 12).text('プレート →');
      s.append('text').attr('x', W2 / 2).attr('y', 45).attr('text-anchor', 'middle').attr('font-size', 12).attr('fill', 'var(--ink)').text('海嶺：マグマが上がり新しい海底ができる');
      cap.innerHTML = '<b>広がる境界</b>：プレートが両側に離れていく。海底では<b>海嶺</b>（大西洋中央海嶺など）、陸上では<b>地溝帯</b>（アフリカ大地溝帯）ができる。アイスランドは海嶺が陸上に出た島。';
    } else if (kind === 'subduct') {
      s.append('rect').attr('width', W2).attr('height', 70).attr('fill', sea);
      const off = t * 60;
      s.append('path').attr('d', 'M0,70 L170,70 L330,170 L280,170 L150,90 L0,90Z').attr('fill', '#5d6a7a');
      for (let i = 0; i < 4; i++) { const x = ((i * 50 + off) % 200); s.append('text').attr('x', x).attr('y', 84).attr('font-size', 11).attr('fill', '#fff').text('→'); }
      s.append('path').attr('d', `M180,70 L340,70 L340,170 L330,170 L180,75Z`).attr('fill', '#8c7a5b');
      s.append('path').attr('d', `M235,70 L255,${48 - 6 * Math.sin(t * Math.PI)} L275,70Z`).attr('fill', '#8c7a5b');
      s.append('circle').attr('cx', 255).attr('cy', 120).attr('r', 9 + 2 * Math.sin(t * 6.28)).attr('fill', '#e0533d');
      s.append('path').attr('d', 'M255,111 L255,60').attr('stroke', '#e0533d').attr('stroke-width', 3).attr('stroke-dasharray', '3 3');
      const star = (x, y) => s.append('text').attr('x', x).attr('y', y).attr('font-size', 16).attr('fill', '#ffd34d').text('✦');
      if (t > 0.6) star(195, 92); if (t > 0.8) star(230, 112);
      s.append('text').attr('x', 160).attr('y', 64).attr('font-size', 11).attr('fill', 'var(--ink)').text('海溝');
      s.append('text').attr('x', 10).attr('y', 20).attr('font-size', 12).attr('fill', 'var(--ink)').text('海のプレート（重い）');
      s.append('text').attr('x', 230).attr('y', 30).attr('font-size', 12).attr('fill', 'var(--ink)').text('火山');
      s.append('text').attr('x', 270).attr('y', 100).attr('font-size', 11).attr('fill', '#fff').text('陸のプレート');
      cap.innerHTML = '<b>狭まる境界（沈みこみ）</b>：重い海のプレートが陸のプレートの下に沈みこむ。<b>海溝</b>ができ、ひずみがたまって<b>海溝型地震・津波</b>が起こる。沈みこんだ所の上ではマグマができて<b>火山</b>が並ぶ（日本列島・アンデス山脈）。';
    } else if (kind === 'collide') {
      const p = Math.min(t * 1.2, 1);
      s.append('rect').attr('x', 0).attr('y', 90).attr('width', 160 + p * 8).attr('height', 50).attr('fill', '#8c7a5b');
      s.append('rect').attr('x', 180 - p * 8).attr('y', 90).attr('width', 170).attr('height', 50).attr('fill', '#9c8a6b');
      s.append('path').attr('d', `M110,90 L170,${90 - 70 * p} L230,90Z`).attr('fill', '#7a6a4b');
      s.append('path').attr('d', `M150,${90 - 50 * p} L170,${90 - 70 * p} L190,${90 - 50 * p}Z`).attr('fill', '#fff');
      s.append('text').attr('x', 20).attr('y', 120).attr('fill', '#fff').attr('font-size', 12).text('インド → ');
      s.append('text').attr('x', 240).attr('y', 120).attr('fill', '#fff').attr('font-size', 12).text('← ユーラシア');
      cap.innerHTML = '<b>狭まる境界（衝突）</b>：大陸のプレートどうしがぶつかると、どちらも沈みこみにくいので押し上げられ、<b>高く険しい山脈</b>ができる（ヒマラヤ山脈・アルプス山脈）。今も少しずつ高くなっている。';
    } else {
      const d = (t < .5 ? t : 1 - t) * 60;
      s.append('rect').attr('width', W2).attr('height', H2).attr('fill', '#b9c79a');
      s.append('line').attr('x1', W2 / 2).attr('x2', W2 / 2).attr('y1', 0).attr('y2', H2).attr('stroke', '#7a5a2a').attr('stroke-width', 3).attr('stroke-dasharray', '8 4');
      s.append('path').attr('d', `M20,${85 - d} L${W2 / 2},${85 - d}`).attr('stroke', '#5d4a2a').attr('stroke-width', 5);
      s.append('path').attr('d', `M${W2 / 2},${85 + d} L${W2 - 20},${85 + d}`).attr('stroke', '#5d4a2a').attr('stroke-width', 5);
      s.append('text').attr('x', 60).attr('y', 30).attr('font-size', 13).attr('fill', '#333').text('↑ プレート');
      s.append('text').attr('x', W2 / 2 + 40).attr('y', H2 - 20).attr('font-size', 13).attr('fill', '#333').text('プレート ↓');
      s.append('text').attr('x', 30).attr('y', 75 - d).attr('font-size', 11).attr('fill', '#333').text('道路・川');
      cap.innerHTML = '<b>ずれる境界</b>（上から見た図）：プレートどうしが横にすれちがう。道路や川が断層をはさんでずれる。アメリカの<b>サンアンドレアス断層</b>が有名。';
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return box;
}

registerTool('landform', {
  name: '地形と災害',
  render(container, params = {}) {
    const S = { area: params.area || 'world', layers: { newb: true, oldb: true, shield: true, bounds: params.bounds ?? false, volc: true, quake: true }, anim: params.anim || 'subduct', info: null };
    const ui = toolShell(container, { foot: true });
    const W = 960, H = 500;
    const svg = d3.select(ui.wrap).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const tip = el('<div class="tip" hidden></div>'); ui.wrap.appendChild(tip);
    const showTip = (ev, t) => { const r = ui.wrap.getBoundingClientRect(); tip.hidden = false; tip.textContent = t; tip.style.left = (ev.clientX - r.left) + 'px'; tip.style.top = (ev.clientY - r.top) + 'px'; };

    ui.bar.appendChild(seg([{ v: 'world', label: '世界の大地形' }, { v: 'japan', label: '日本付近のプレート' }], S.area, v => { S.area = v; S.info = null; draw(); renderSide(); }));
    const lbar = el('<span class="row" style="gap:4px;flex-wrap:nowrap"></span>'); ui.bar.appendChild(lbar);
    function layerChips() {
      lbar.innerHTML = '';
      const L = S.area === 'world' ? [['newb', '新期造山帯'], ['oldb', '古期造山帯'], ['shield', '安定陸塊'], ['bounds', 'プレート境界'], ['volc', '火山'], ['quake', '大地震']] : [['volc', '火山'], ['quake', '大地震']];
      L.forEach(([k, n]) => lbar.appendChild(toggleChip(n, S.layers[k], v => { S.layers[k] = v; draw(); })));
    }

    function line(coords) { return { type: 'LineString', coordinates: coords }; }
    function draw() {
      svg.selectAll('*').remove(); tip.hidden = true; layerChips();
      const isW = S.area === 'world';
      const proj = isW ? d3.geoNaturalEarth1().rotate([-150, 0]).fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' })
        : d3.geoMercator().fitExtent([[10, 10], [W - 10, H - 10]], { type: 'MultiPoint', coordinates: [[122, 23], [154, 47]] });
      const base = drawBaseMap(svg, proj, { antarctica: isW });
      const path = base.path, g = base.g;
      const clickInfo = (sel, getInfo) => sel.style('cursor', 'pointer').on('click', (ev, d) => { S.info = getInfo(d); renderSide(); }).on('mousemove', (ev, d) => showTip(ev, d.name)).on('mouseleave', () => { tip.hidden = true; });
      if (isW) {
        if (S.layers.shield) {
          const sh = g.append('g').selectAll('g').data(LF.shields).join('g');
          sh.append('path').attr('d', d => path(d3.geoCircle().center(d.c).radius(d.r)())).attr('fill', 'rgba(140,110,60,.25)').attr('stroke', '#8c6d3f').attr('stroke-dasharray', '3 3');
          clickInfo(sh, d => ({ t: d.name, b: '安定陸塊：先カンブリア時代（約5億4千万年以上前）にできた古い陸地。長い間の侵食で平らな楯状地・卓状地になっている。<b>鉄鉱石</b>の産地が多い。' }));
          sh.append('text').attr('class', 'lbl').attr('x', d => proj(d.c)[0]).attr('y', d => proj(d.c)[1]).attr('text-anchor', 'middle').style('font-size', '10px').style('fill', '#7a5a2a').text(d => d.name);
        }
        if (S.layers.oldb) {
          const ob = g.append('g').selectAll('g').data(LF.oldBelts).join('g');
          ob.append('path').attr('d', d => path(line(d.line))).attr('fill', 'none').attr('stroke', '#2c8350').attr('stroke-width', 7).attr('stroke-linecap', 'round').attr('stroke-opacity', .65);
          clickInfo(ob, d => ({ t: d.name, b: '古期造山帯：古生代（約5億4千万〜2億5千万年前）の造山運動でできた山地。長い間けずられて、なだらかな山が多い。<b>石炭</b>の産地が多い。' + (d.name === 'テンシャン山脈' ? '（テンシャン山脈は、のちに再び隆起したため高く険しい）' : '') }));
        }
        if (S.layers.newb) {
          const nb = g.append('g').selectAll('g').data(LF.newBelts).join('g');
          nb.append('path').attr('d', d => path(line(d.line))).attr('fill', 'none').attr('stroke', '#c8442a').attr('stroke-width', 13).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round').attr('stroke-opacity', .38);
          clickInfo(nb, d => ({ t: d.name, b: '新期造山帯：中生代〜新生代（約2億5千万年前〜現在）に造山運動が始まり、今も活動している。高く険しい山脈が多く、<b>地震・火山が多い</b>。<b>石油・銅</b>などの資源も見られる。' + (d.name === '環太平洋造山帯' ? 'アンデス山脈・ロッキー山脈・日本列島・ニュージーランドなど。' : 'アルプス山脈・ヒマラヤ山脈・インドネシアの島々など。') }));
        }
        if (S.layers.bounds) {
          const bd = g.append('g').selectAll('g').data(LF.bounds).join('g');
          bd.append('path').attr('d', d => path(line(d.line))).attr('fill', 'none').attr('stroke', d => BOUND_STYLE[d.type].c).attr('stroke-width', 3.5).attr('stroke-dasharray', d => d.type === 'tra' ? '7 4' : null);
          bd.append('path').attr('d', d => path(line(d.line))).attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 14);
          clickInfo(bd, d => ({ t: d.name, b: `${BOUND_STYLE[d.type].n}。` + { div: 'プレートどうしが離れていく所。海底では海嶺、陸上では地溝帯ができる。', con: 'プレートどうしが近づく所。大陸どうしがぶつかると、ヒマラヤのような高い山脈ができる。', tra: 'プレートどうしが横にすれちがう所。大きな断層ができ、地震が起こる。' }[d.type], anim: d.type === 'div' ? 'diverge' : d.type === 'tra' ? 'transform' : 'collide' }));
          LF.newBelts.length && g.append('text').attr('class', 'lbl').attr('x', 12).attr('y', H - 14).style('font-size', '11px').text('※ 線の位置はおおよその模式。');
        }
      } else {
        const bd = g.append('g').selectAll('g').data(JP.bounds).join('g');
        bd.append('path').attr('d', d => path(line(d.line))).attr('fill', 'none').attr('stroke', d => BOUND_STYLE[d.type].c).attr('stroke-width', 4).attr('stroke-dasharray', d => d.type === 'other' ? '8 5' : null);
        bd.append('path').attr('d', d => path(line(d.line))).attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 16);
        clickInfo(bd, d => ({ t: d.name, b: d.type === 'con' ? '海のプレートが陸のプレートの下に沈みこむ所（海溝・トラフ）。ここで巨大な海溝型地震が起こり、津波が発生しやすい。' : '北アメリカプレートとユーラシアプレートの境界と考えられている。日本海側で起こる地震や、フォッサマグナとの関係が研究されている。', anim: d.type === 'con' ? 'subduct' : null }));
        JP.plates.forEach(p => { const q = proj(p.c); g.append('text').attr('class', 'lbl').attr('x', q[0]).attr('y', q[1]).attr('text-anchor', 'middle').style('font-size', '15px').style('font-weight', 700).style('fill', 'var(--accent)').text(p.name); });
        const arrows = [[[152, 36], [146, 37.2]], [[138, 30], [136, 32]]];
        arrows.forEach(([a, b]) => { const p = proj(a), q = proj(b); g.append('line').attr('x1', p[0]).attr('y1', p[1]).attr('x2', q[0]).attr('y2', q[1]).attr('stroke', 'var(--accent)').attr('stroke-width', 4).attr('marker-end', 'url(#arr)'); });
        svg.append('defs').append('marker').attr('id', 'arr').attr('viewBox', '0 0 10 10').attr('refX', 5).attr('refY', 5).attr('markerWidth', 4).attr('markerHeight', 4).attr('orient', 'auto').append('path').attr('d', 'M0,0L10,5L0,10z').attr('fill', 'var(--accent)');
        g.append('text').attr('class', 'lbl').attr('x', 12).attr('y', H - 14).style('font-size', '11px').text('※ 境界の位置はおおよその模式。矢印はプレートの動く向き。');
      }
      const V = isW ? LF.volcanoes : JP.volcanoes, Q = isW ? LF.quakes : JP.quakes;
      if (S.layers.volc) {
        const vg = g.append('g').selectAll('path').data(V).join('path').attr('transform', d => `translate(${proj(d.c)})`).attr('d', 'M0,-8L7,5H-7Z').attr('fill', '#c8442a').attr('stroke', 'var(--panel)').attr('stroke-width', 1.5);
        clickInfo(vg, d => ({ t: d.name, b: d.note || 'プレートが沈みこむ所の上で、とけたマグマが上がってきてできる火山。' }));
      }
      if (S.layers.quake) {
        const qg = g.append('g').selectAll('g').data(Q).join('g').attr('transform', d => `translate(${proj(d.c)})`);
        qg.append('circle').attr('r', 9).attr('fill', 'rgba(63,127,192,.25)').attr('stroke', '#3f7fc0').attr('stroke-width', 2);
        qg.append('circle').attr('r', 3).attr('fill', '#3f7fc0');
        clickInfo(qg, d => ({ t: d.name, b: (d.m ? `マグニチュード ${d.m}。` : '') + d.note }));
      }
      ui.foot.innerHTML = isW
        ? '<div class="legend"><span><i style="background:rgba(200,68,42,.5)"></i>新期造山帯</span><span><i style="background:#2c8350"></i>古期造山帯</span><span><i style="background:rgba(140,110,60,.35)"></i>安定陸塊</span><span><i style="background:#e3a63a"></i>広がる境界</span><span><i style="background:#d9473b"></i>狭まる境界</span><span><i style="background:#3f7fc0"></i>ずれる境界</span><span>▲火山 ◎大地震</span></div>'
        : '<div class="legend"><span><i style="background:#d9473b"></i>海溝・トラフ（沈みこみ）</span><span><i style="background:#8a5bd0"></i>その他の境界</span><span>▲火山 ◎大地震</span></div>';
    }

    function renderSide() {
      const isW = S.area === 'world';
      ui.side.innerHTML = `<h2>${isW ? '世界の大地形' : '日本付近のプレート'}</h2>
        <p class="lead">${isW ? '地図の線・印をクリックすると説明が出ます。地球の表面は十数枚のプレートにおおわれ、少しずつ動いている。' : '日本列島は4枚のプレートが集まる所にあり、地震や火山が非常に多い。'}</p>
        <div class="info"></div>
        <h3>プレート境界のしくみ（動く模式図）</h3><div class="aseg"></div><div class="anim"></div>
        ${isW ? `<h3>大地形と資源</h3><table class="tbl"><tr><th>大地形</th><th>できた時代</th><th>地形</th><th>資源</th></tr>
          <tr><td>安定陸塊</td><td>先カンブリア時代</td><td>平らな楯状地・卓状地</td><td>鉄鉱石</td></tr>
          <tr><td>古期造山帯</td><td>古生代</td><td>なだらかな山地</td><td>石炭</td></tr>
          <tr><td>新期造山帯</td><td>中生代〜新生代</td><td>高く険しい山脈・地震や火山が多い</td><td>石油・銅・銀</td></tr></table>` : ''}
        <div class="think"></div>`;
      if (S.info) { $('.info', ui.side).innerHTML = `<div class="card"><b>${S.info.t}</b><p style="margin:4px 0 0;font-size:14px">${S.info.b}</p></div>`; if (S.info.anim) S.anim = S.info.anim; }
      const kinds = [{ v: 'diverge', label: '広がる' }, { v: 'subduct', label: '沈みこむ' }, { v: 'collide', label: 'ぶつかる' }, { v: 'transform', label: 'ずれる' }];
      $('.aseg', ui.side).appendChild(seg(kinds, S.anim, v => { S.anim = v; $('.anim', ui.side).innerHTML = ''; $('.anim', ui.side).appendChild(plateAnim(v)); }));
      $('.anim', ui.side).appendChild(plateAnim(S.anim));
      $('.think', ui.side).appendChild(isW
        ? thinkCard({ id: 'landform-world', views: ['pos', 'env'], q: '「新期造山帯」と「火山」「大地震」のレイヤーを重ねよう。火山や大地震の分布にはどのような特徴があるか。また、オーストラリアやアフリカ南部で大地震が少ない理由を説明しよう。', answer: '火山や大地震は、新期造山帯（環太平洋造山帯・アルプス＝ヒマラヤ造山帯）にそって帯のように分布している。そこはプレートが沈みこんだりぶつかったりする狭まる境界にあたるから。オーストラリアやアフリカ南部はプレートの境界から遠い安定陸塊なので、大地震や火山が少ない。' })
        : thinkCard({ id: 'landform-japan', views: ['pos', 'env', 'place'], q: '日本の太平洋側の沿岸では、なぜ巨大地震や津波への備えがとくに必要なのだろう。プレート境界の位置から説明しよう。', answer: '太平洋側の沖合には、太平洋プレートやフィリピン海プレートが沈みこむ日本海溝・南海トラフなどがある。ここでは陸のプレートが引きずりこまれてひずみがたまり、はね上がるときに巨大な海溝型地震が起こり、海底が動いて津波が発生する。南海トラフ地震は今後30年以内に起こる確率が高いとされ、避難計画や堤防などの備えが進められている。' }));
    }

    draw(); renderSide();
    return () => {};
  }
});
