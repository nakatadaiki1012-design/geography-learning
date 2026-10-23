/* 動かす：地形図を読む（等高線・断面図・標高の読み取り）と、防災シミュレーション（ハザードマップ・避難経路） */

// --- 地形をつくる（架空の地形。1マス＝ cell m） ---
const DELTA_COAST = x => 46 + 28 * Math.max(0, 1 - ((x - 75) / 54) ** 2) ** 1.5 + Math.sin(x / 3);
const TERRAINS = {
  ridge: { name: '尾根と谷', w: 150, h: 100, cell: 20, desc: '山の等高線が低い方へ張り出している所が尾根、高い方へ食いこんでいる所が谷。', f: (x, y) => {
    const peak = 520 * Math.exp(-(((x - 70) / 45) ** 2 + ((y - 45) / 38) ** 2));
    const valleys = 55 * Math.sin(Math.atan2(y - 45, x - 70) * 5) * Math.min(1, Math.hypot(x - 70, y - 45) / 25);
    return Math.max(20, 60 + peak + valleys * Math.exp(-((Math.hypot(x - 70, y - 45) / 60) ** 2)) + 30 * Math.sin(x / 9) * Math.cos(y / 11));
  } },
  fan: { name: '扇状地', w: 150, h: 100, cell: 20, desc: '山地から平地に出る谷口に、川が運んだ砂や石がたまってできた扇形の地形。等高線が谷口を中心に同心円状（扇形）に並ぶ。点線の川は水無川（扇央で水が地下にしみこむ）。', f: (x, y) => {
    const mount = y < 22 ? 260 + (22 - y) * 18 + 25 * Math.sin(x / 6) : 0;
    const d = Math.hypot(x - 75, y - 20);
    const fan = d < 70 && y >= 20 ? 230 - d * 2.6 : 0;
    const plain = Math.max(25, 60 - (y - 20) * 0.3);
    let hgt = Math.max(mount, fan, plain);
    if (y < 22) hgt -= 90 * Math.exp(-(((x - 75) / 4) ** 2)) * Math.min(1, (22 - y) / 4 + .5);
    return hgt;
  }, rivers: [{ p: [[75, 0], [75, 22]] }, { p: [[75, 22], [74, 40], [76, 60], [75, 88]], dry: true }, { p: [[75, 88], [79, 94], [74, 100]] }, { p: [[40, 79], [36, 90], [38, 100]] }, { p: [[112, 77], [116, 88], [114, 100]] }] },
  volcano: { name: '火山', w: 150, h: 100, cell: 25, desc: '円すい形の成層火山。山頂に火口があり、等高線がほぼ同心円になる。火口の部分は等高線の内側が低い。', f: (x, y) => {
    const d = Math.hypot(x - 75, y - 50);
    let hgt = 120 + 900 * Math.exp(-d / 26);
    if (d < 6) hgt -= (6 - d) * 22;
    return hgt + 12 * Math.sin(Math.atan2(y - 50, x - 75) * 9) * Math.min(1, d / 15);
  } },
  terrace: { name: '河岸段丘', w: 150, h: 100, cell: 15, desc: '川の両側に階段状の平らな面（段丘面）と急ながけ（段丘崖）が並ぶ。土地の隆起や海面の低下で、川が何度も下へけずりこんでできた。', f: (x, y) => {
    const rx = 75 + 8 * Math.sin(y / 14), d = Math.abs(x - rx);
    const step = (a, b, h) => h / (1 + Math.exp(-(d - a) / 1.2));
    return 100 + y * 0.6 + step(6, 0, 25) + step(22, 0, 30) + step(42, 0, 35) + (d > 60 ? (d - 60) * 6 : 0);
  }, rivers: [{ p: d3.range(0, 101, 4).map(y => [75 + 8 * Math.sin(y / 14), y]) }] },
  coast: { name: '三角州と海岸', w: 150, h: 100, cell: 20, desc: '川が海に出る所で、川がいくつにも分かれ（分流）、運んだ細かい砂や泥がたまって海に張り出した三角州。標高がほとんど0〜10mで等高線が少なく、洪水や高潮の被害を受けやすい。', f: (x, y) => {
    const c = DELTA_COAST(x);
    if (y > c) return Math.max(-20, -1 - (y - c) * 0.6);
    const hill = 140 * Math.exp(-(((x - 16) / 16) ** 2 + ((y - 12) / 14) ** 2)) + 110 * Math.exp(-(((x - 136) / 15) ** 2 + ((y - 10) / 12) ** 2));
    return Math.max(1 + (c - y) * 0.12, hill + 6 * Math.sin(x / 5) * Math.cos(y / 6) * Math.min(1, hill / 40));
  }, rivers: (() => {
    const bez = (a, c, b) => d3.range(0, 1.001, 0.05).map(t => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]);
    const main = d3.range(0, 41, 2).map(y => [75 + 3 * Math.sin(y / 6), y]), F0 = main[main.length - 1];
    return [{ p: main }].concat([38, 58, 92, 112].map(x => ({ p: bez(F0, [(F0[0] + x) / 2, (F0[1] + DELTA_COAST(x)) / 2 - 6], [x, DELTA_COAST(x) + 1]) })));
  })() }
};

// 地形図の川（水無川は点線）
function drawRivers(g, T, sx) {
  (T.rivers || []).forEach(r => g.append('path').attr('d', d3.line().curve(d3.curveCatmullRom)(r.p.map(([x, y]) => [x * sx, y * sx])))
    .attr('fill', 'none').attr('stroke', '#2f78c4').attr('stroke-width', r.dry ? 1.6 : 2.6).attr('stroke-dasharray', r.dry ? '5 4' : null).attr('stroke-linecap', 'round'));
}

function makeGrid(T) {
  const { w, h } = T, v = new Float64Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) v[j * w + i] = T.f(i, j);
  return v;
}

function hypso(hgt, max) {
  if (hgt < 0) return 'var(--sea)';
  const t = clamp(hgt / max, 0, 1);
  return d3.interpolateRgbBasis(['#cfe3b4', '#e8e0a6', '#dcc086', '#c49a6c', '#a57c5b', '#f3efe8'])(t);
}

registerTool('topo', {
  name: '地形図を読む',
  render(container, params = {}) {
    const S = { t: params.terrain || 'ridge', scale: 25000, color: true, a: null, b: null, ve: 2, readout: true, task: null };
    const ui = toolShell(container, { foot: true });
    const svgNode = d3.select(ui.wrap).append('svg');
    const tip = el('<div class="tip" hidden></div>'); ui.wrap.appendChild(tip);
    ui.bar.appendChild(seg(Object.keys(TERRAINS).map(k => ({ v: k, label: TERRAINS[k].name })), S.t, v => { S.t = v; S.a = S.b = null; S.task = null; build(); renderSide(); }));
    let T, grid, Wv, Hv, sx;
    function H(i, j) { i = clamp(Math.round(i), 0, T.w - 1); j = clamp(Math.round(j), 0, T.h - 1); return grid[j * T.w + i]; }
    function Hb(x, y) { // なめらかな標高
      x = clamp(x, 0, T.w - 1.001); y = clamp(y, 0, T.h - 1.001);
      const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
      const g = (a, b) => grid[b * T.w + a];
      return g(i, j) * (1 - fx) * (1 - fy) + g(i + 1, j) * fx * (1 - fy) + g(i, j + 1) * (1 - fx) * fy + g(i + 1, j + 1) * fx * fy;
    }
    function build() {
      T = TERRAINS[S.t]; grid = makeGrid(T);
      sx = 6; Wv = T.w * sx; Hv = T.h * sx;
      svgNode.attr('viewBox', `0 0 ${Wv} ${Hv}`);
      draw();
    }
    function draw() {
      svgNode.selectAll('*').remove();
      const interval = S.scale === 25000 ? 10 : 20;
      const max = d3.max(grid);
      const th = d3.range(Math.floor(d3.min(grid) / interval) * interval, max + interval, interval);
      const contours = d3.contours().size([T.w, T.h]).thresholds(th)(Array.from(grid));
      const gp = d3.geoPath(d3.geoIdentity().scale(sx));
      const g = svgNode.append('g');
      g.append('rect').attr('width', Wv).attr('height', Hv).attr('fill', S.color ? '#cfe3b4' : '#fffdf7');
      if (S.color) g.append('image').attr('href', reliefCanvas(grid, T.w, T.h, T.cell, { colorAt: k => hypso(grid[k], max) }).toDataURL()).attr('width', Wv).attr('height', Hv).attr('preserveAspectRatio', 'none');
      g.append('g').selectAll('path').data(contours).join('path').attr('d', gp).attr('fill', 'none')
        .attr('stroke', d => d.value <= 0 ? '#2f78c4' : '#8b5a2b').attr('stroke-width', d => d.value % (interval * 5) === 0 ? 1.9 : 0.75);
      drawRivers(g, T, sx);
      // 計曲線の数字
      contours.filter(c => c.value % (interval * 5) === 0 && c.value > 0).forEach(c => {
        const ring = c.coordinates.flat(1).sort((a, b) => b.length - a.length)[0];
        if (!ring || ring.length < 20) return;
        const p = ring[Math.floor(ring.length * 0.3)];
        g.append('text').attr('x', p[0] * sx).attr('y', p[1] * sx).attr('font-size', 11).attr('fill', '#8b5a2b').attr('text-anchor', 'middle').attr('font-family', 'var(--font-data)').style('paint-order', 'stroke').style('stroke', S.color ? '#efe7c8' : '#fffdf7').style('stroke-width', 3).text(c.value);
      });
      // 縮尺
      const kmPx = 1000 / T.cell * sx;
      const sb = g.append('g').attr('transform', `translate(14,${Hv - 18})`);
      sb.append('rect').attr('x', -6).attr('y', -16).attr('width', kmPx / 2 + 70).attr('height', 26).attr('fill', 'rgba(255,253,247,.85)').attr('rx', 4);
      sb.append('rect').attr('width', kmPx / 2).attr('height', 5).attr('fill', '#222');
      sb.append('text').attr('x', kmPx / 2 + 6).attr('y', 6).attr('font-size', 11).attr('fill', '#222').text('500 m');
      g.append('text').attr('x', Wv - 10).attr('y', 16).attr('text-anchor', 'end').attr('font-size', 11).attr('fill', '#222').style('paint-order', 'stroke').style('stroke', '#fffdf7').style('stroke-width', 3).text(`主曲線 ${interval}m ごと・計曲線 ${interval * 5}m ごと`);
      g.append('text').attr('x', Wv - 10).attr('y', 32).attr('text-anchor', 'end').attr('font-size', 15).attr('fill', '#222').text('N ↑');
      // 断面の線
      if (S.a) {
        g.append('circle').attr('cx', S.a[0] * sx).attr('cy', S.a[1] * sx).attr('r', 6).attr('fill', 'var(--shu)');
        g.append('text').attr('x', S.a[0] * sx + 8).attr('y', S.a[1] * sx - 6).attr('font-weight', 700).attr('fill', '#c8442a').text('A');
      }
      if (S.a && S.b) {
        g.append('line').attr('x1', S.a[0] * sx).attr('y1', S.a[1] * sx).attr('x2', S.b[0] * sx).attr('y2', S.b[1] * sx).attr('stroke', 'var(--shu)').attr('stroke-width', 3);
        g.append('circle').attr('cx', S.b[0] * sx).attr('cy', S.b[1] * sx).attr('r', 6).attr('fill', 'var(--shu)');
        g.append('text').attr('x', S.b[0] * sx + 8).attr('y', S.b[1] * sx - 6).attr('font-weight', 700).attr('fill', '#c8442a').text('B');
      }
      if (S.task) {
        const [px, py] = S.task.p;
        g.append('circle').attr('cx', px * sx).attr('cy', py * sx).attr('r', 7).attr('fill', '#fff').attr('stroke', '#1f5f8b').attr('stroke-width', 3);
        g.append('text').attr('x', px * sx + 10).attr('y', py * sx + 5).attr('font-weight', 700).attr('fill', '#1f5f8b').style('paint-order', 'stroke').style('stroke', '#fff').style('stroke-width', 3).text('P');
      }
    }
    svgNode.on('click', ev => {
      const p = svgPoint(svgNode.node(), ev); const q = [p.x / sx, p.y / sx];
      if (!S.a || (S.a && S.b)) { S.a = q; S.b = null; } else S.b = q;
      draw(); renderProfile();
      // 2点目を選んだら、断面図のタブを開く
      if (S.b) revealPane($('.profile', ui.side));
    }).on('mousemove', ev => {
      if (!S.readout) return tip.hidden = true;
      const p = svgPoint(svgNode.node(), ev); const v = Hb(p.x / sx, p.y / sx);
      const r = ui.wrap.getBoundingClientRect(); tip.hidden = false; tip.textContent = `標高 約${Math.round(v)} m`; tip.style.left = (ev.clientX - r.left) + 'px'; tip.style.top = (ev.clientY - r.top) + 'px';
    }).on('mouseleave', () => { tip.hidden = true; });
    ui.foot.innerHTML = `<span>地図を2回${TAP}（A→B）すると、その線にそった断面図をかく</span>`;

    function renderProfile() {
      const box = $('.profile', ui.side); if (!box) return;
      box.innerHTML = '';
      if (!S.a || !S.b) { box.innerHTML = `<p class="small muted">${S.a ? `もう1点（B）を${TAP}` : `地図の上で A 地点を${TAP}`}</p>`; return; }
      const n = 160, pts = d3.range(n + 1).map(k => { const x = S.a[0] + (S.b[0] - S.a[0]) * k / n, y = S.a[1] + (S.b[1] - S.a[1]) * k / n; return { d: Math.hypot(x - S.a[0], y - S.a[1]) * T.cell, h: Hb(x, y) }; });
      const total = pts[n].d;
      const W2 = 360, H2 = 190, m = { l: 40, r: 10, t: 12, b: 26 };
      const hMin = Math.min(0, Math.floor(d3.min(pts, p => p.h) / 50) * 50), hMax0 = Math.ceil(d3.max(pts, p => p.h) / 50) * 50;
      // たての倍率：横の長さに対する高さの強調
      const hRange = Math.max(hMax0 - hMin, total * (H2 - m.t - m.b) / (W2 - m.l - m.r) / S.ve);
      const x = d3.scaleLinear().domain([0, total]).range([m.l, W2 - m.r]);
      const y = d3.scaleLinear().domain([hMin, hMin + hRange]).range([H2 - m.b, m.t]);
      const s = d3.select(box).append('svg').attr('viewBox', `0 0 ${W2} ${H2}`).attr('class', 'chart').style('width', '100%');
      s.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W2 - m.l - m.r))).call(g => g.selectAll('.tick line').attr('stroke-opacity', .4));
      s.append('g').attr('class', 'axis').attr('transform', `translate(0,${H2 - m.b})`).call(d3.axisBottom(x).ticks(5).tickFormat(d => d + 'm'));
      s.append('path').datum(pts).attr('d', d3.area().x(p => x(p.d)).y0(H2 - m.b).y1(p => y(Math.max(p.h, hMin)))).attr('fill', '#c49a6c').attr('stroke', '#8b5a2b').attr('stroke-width', 1.5);
      if (hMin < 0) s.append('rect').attr('x', m.l).attr('width', W2 - m.l - m.r).attr('y', y(0)).attr('height', y(hMin) - y(0)).attr('fill', 'rgba(47,120,196,.25)');
      s.append('text').attr('x', m.l + 2).attr('y', m.t + 10).attr('fill', '#c8442a').attr('font-weight', 700).text('A');
      s.append('text').attr('x', W2 - m.r - 10).attr('y', m.t + 10).attr('fill', '#c8442a').attr('font-weight', 700).text('B');
      const hi = d3.max(pts, p => p.h), lo = d3.min(pts, p => p.h);
      const slope = Math.atan(d3.max(d3.pairs(pts), ([p, q]) => Math.abs(q.h - p.h) / (q.d - p.d))) * 180 / Math.PI;
      box.appendChild(el(`<p class="small" style="margin:2px 0">距離 約${Math.round(total)} m・最高 約${Math.round(hi)} m・最低 約${Math.round(lo)} m・もっとも急な所の傾き 約${Math.round(slope)}°（たての倍率 ×${S.ve}）</p>`));
    }

    function newTask() {
      let p, v;
      for (let k = 0; k < 50; k++) { p = [10 + Math.random() * (T.w - 20), 10 + Math.random() * (T.h - 20)]; v = Hb(p[0], p[1]); if (v > 30) break; }
      S.task = { p, v }; S.readout = false; draw(); renderSide();
    }

    function renderSide() {
      ui.side.innerHTML = `<h2>${T.name}</h2><p class="lead">${T.desc}</p>
        <div class="row"><span class="sc"></span></div><div class="row tg"></div>
        <h3>断面図</h3><div class="row"><span class="small muted">たての倍率</span><span class="ve"></span></div><div class="profile"></div>
        <h3>標高を読み取る練習</h3><div class="task"></div>
        <details class="more"><summary>等高線の読み方のきまり</summary><ul class="small">
          <li>2万5千分の1地形図：主曲線（細い線）10mごと、計曲線（太い線）50mごと</li><li>5万分の1地形図：主曲線20mごと、計曲線100mごと</li>
          <li>等高線の間隔がせまい所は急な斜面、広い所はゆるやかな斜面</li><li>等高線が低い方へ張り出す所＝尾根、高い方へ食いこむ所＝谷（谷には川が流れることが多い）</li>
          <li>実際の距離＝地図上の長さ×縮尺の分母（2万5千分の1で4cm → 1km）</li></ul></details>
        <div class="think"></div>`;
      $('.sc', ui.side).appendChild(seg([{ v: 25000, label: '2万5千分の1' }, { v: 50000, label: '5万分の1' }], S.scale, v => { S.scale = +v; draw(); }));
      $('.tg', ui.side).appendChild(toggleChip('段彩（色分け）', S.color, v => { S.color = v; draw(); }));
      $('.tg', ui.side).appendChild(toggleChip(TAP === 'タップ' ? 'さわって標高を表示' : 'マウスで標高を表示', S.readout, v => { S.readout = v; }));
      $('.ve', ui.side).appendChild(seg([1, 2, 5, 10].map(v => ({ v, label: '×' + v })), S.ve, v => { S.ve = +v; renderProfile(); }));
      renderProfile();
      const tb = $('.task', ui.side);
      if (!S.task) {
        tb.innerHTML = '<p class="small">地図に P 地点を出すので、等高線から標高を読み取ろう（標高の表示は消えます）。</p><button type="button" class="btn small">P 地点を出す</button>';
        $('button', tb).addEventListener('click', newTask);
      } else {
        tb.innerHTML = `<div class="row"><span>P 地点の標高は 約</span><input type="number" style="width:90px" step="10"><span>m</span><button type="button" class="btn small">答える</button></div><div class="res"></div>`;
        $('button', tb).addEventListener('click', () => {
          const iv = S.scale === 25000 ? 10 : 20; const ans = +$('input', tb).value; const real = S.task.v;
          const ok = Math.abs(ans - real) <= iv;
          $('.res', tb).innerHTML = `<div class="card ${ok ? 'ok' : 'ng'} small"><b>${ok ? 'よく読めました！' : 'もう少し'}</b> 実際は 約${Math.round(real)} m。P をはさむ2本の等高線（${Math.floor(real / iv) * iv}m と ${Math.floor(real / iv) * iv + iv}m）の間にある。太い計曲線の数字から数えていこう。</div>`;
          const nb = el('<button type="button" class="btn small ghost" style="margin-top:6px">次の P 地点</button>'); nb.addEventListener('click', newTask); $('.res', tb).appendChild(nb);
        });
      }
      const TH = {
        ridge: { q: '尾根と谷を1本ずつ横切るように断面図をかこう。大雨のとき、雨水が集まって土石流が起こりやすいのは尾根と谷のどちらだろう。等高線の形から説明しよう。', answer: '谷。等高線が高い方へ食いこんでいる谷の部分には、周りの斜面から雨水が集まって流れる。大雨では水と土砂がいっしょに流れ下る土石流が起こりやすく、谷の出口（谷口）に住む人は特に注意が必要。' },
        fan: { q: '扇状地の扇頂・扇央・扇端に断面図を引いてみよう。扇央が畑や果樹園に、扇端に集落や水田が多いのはなぜだろう。', answer: '扇状地は砂や小石が厚くたまっているので水はけがよく、扇央では川の水が地下にしみこみ（水無川）、水が得にくい。そのため水田には向かず、桑畑や果樹園に利用された。扇端では地下水がわき出す（湧水）ので、水を得やすく、集落や水田が並ぶ。' },
        volcano: { q: '火山の山頂から山すそへ断面図を引こう。火山のまわりの地域には、どのようなめぐみと災害があるだろう。', answer: 'めぐみ：温泉・地熱発電・美しい景観による観光、火山灰の土壌を利用した畑作、豊かなわき水。災害：噴石・火山灰・溶岩流・火砕流・火山泥流。ハザードマップで危険な範囲を確かめ、噴火警戒レベルに応じて避難する。' },
        terrace: { q: '川を横切る断面図をかき、段丘面と段丘崖を見つけよう。古くから集落や畑が段丘面に多いのはなぜだろう。', answer: '段丘面は平らで、川の水面より高いので洪水の被害を受けにくい。一方、水を得にくいので、畑や桑畑に使われることが多く、低い段丘面や崖の下のわき水がある所に集落ができた。段丘崖は急で、森林のまま残されることが多い。' },
        coast: { q: '海から内陸へ断面図をかこう。三角州の土地の高さから、どのような災害に注意が必要か考えよう。', answer: '三角州は標高が非常に低く（0m前後の所もある）、平らなので、大雨による洪水、台風の高潮、地震の津波で広く浸水しやすい。また、やわらかい地盤なので地震のときに液状化が起こりやすい。' }
      }[S.t];
      $('.think', ui.side).appendChild(thinkCard(Object.assign({ id: 'topo-' + S.t, views: ['env', 'place'] }, TH)));
    }

    build(); renderSide();
    return () => {};
  }
});

// ================= 防災シミュレーション =================
// 架空の町：北に山地、まん中を川が流れて南の海に出る。東に台地、川ぞいに自然堤防と後背湿地、旧河道。
const TOWN = (() => {
  const w = 160, h = 110, cell = 25;
  const river = y => 70 + 14 * Math.sin(y / 13) + (y > 70 ? (y - 70) * 0.25 : 0);
  const oldRiver = y => 52 + 10 * Math.sin(y / 9 + 1);
  const v = new Float64Array(w * h), kind = new Uint8Array(w * h);
  // kind: 0 低地(後背湿地) 1 自然堤防 2 台地 3 山地 4 川 5 海 6 旧河道 7 扇状地 8 砂丘・浜
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i;
    const coast = 98 + 3 * Math.sin(i / 11);
    const dr = Math.abs(i - river(j));
    let hgt = 6 - (j / h) * 4 + 0.6 * Math.sin(i / 6) * Math.cos(j / 7) + (dr > 35 ? (dr - 35) * 0.06 : 0); let kd = 0;
    if (j < 26) { hgt = 30 + (26 - j) * 9 + 18 * Math.sin(i / 7) * Math.sin(j / 5); kd = 3; }
    else if (j < 40 && dr < 30) { const fan = 30 - (j - 26) * 1.2 - dr * 0.25; if (fan > hgt) { hgt = fan; kd = 7; } }
    if (i > 115 && j > 30 && j < 92) { const pl = 22 + (i - 115) * 0.1 - Math.max(0, j - 84) * 2; const edge = 1 / (1 + Math.exp(-(i - 118) / 1.2)); const ph = hgt + (pl - hgt) * edge; if (ph > hgt) { hgt = ph; if (edge > .5) kd = 2; } }
    if (j > 26 && kd !== 3 && kd !== 2 && dr < 6 && dr >= 2) { hgt += 1.6; kd = 1; }
    if (kd === 0 && j > 40 && Math.abs(i - oldRiver(j)) < 2.2) { hgt -= 0.8; kd = 6; }
    if (dr < 2) { hgt -= 2.5; kd = 4; }
    if (j > coast - 4 && j <= coast && kd !== 4) { hgt = Math.max(hgt, 3.5); kd = 8; }
    if (j > coast) { hgt = -3; kd = 5; }
    v[k] = hgt; kind[k] = kd;
  }
  const bridgesY = [48, 76];
  const home = [40, 70];
  const shelters = [
    { id: 'A', name: '低地の小学校', p: [44, 82], sym: '文', floors: 2 },
    { id: 'B', name: '台地の上の中学校', p: [128, 60], sym: '文', floors: 3 },
    { id: 'C', name: '山すその公民館', p: [30, 27], sym: '⌂', floors: 1 },
    { id: 'D', name: '海の近くの体育館', p: [60, 94], sym: '⌂', floors: 1 },
    { id: 'E', name: '自然堤防の上の寺', p: [61, 60], sym: '卍', floors: 1 }
  ];
  return { w, h, cell, v, kind, river, bridgesY, home, shelters };
})();
const KIND = [
  { n: '後背湿地（低地）', c: '#cfe0b0' }, { n: '自然堤防', c: '#ead9a0' }, { n: '台地', c: '#e3b979' }, { n: '山地', c: '#b89566' },
  { n: '川', c: '#5ea0d8' }, { n: '海', c: '#7fb7e0' }, { n: '旧河道', c: '#a9cfd0' }, { n: '扇状地', c: '#e8cf9a' }, { n: '浜・砂州', c: '#f2e6b8' }
];
const DEPTH = [{ d: 0.5, c: '#fff3a0', n: '0.5m未満' }, { d: 3, c: '#f7c8d0', n: '0.5〜3m（1階が浸水）' }, { d: 5, c: '#ef9fb1', n: '3〜5m（2階が浸水）' }, { d: 99, c: '#c37ac9', n: '5m以上' }];

registerTool('hazard', {
  name: '防災シミュレーション',
  render(container, params = {}) {
    const S = { hz: params.hz || 'flood', level: params.level ?? 1.5, layer: 'kind', choice: null, route: true };
    const ui = toolShell(container, { foot: true });
    const { w, h, v, kind } = TOWN, sx = 6, Wv = w * sx, Hv = h * sx;
    const svg = d3.select(ui.wrap).append('svg').attr('viewBox', `0 0 ${Wv} ${Hv}`);
    ui.bar.appendChild(seg([{ v: 'flood', label: '洪水（大雨）' }, { v: 'tsunami', label: '津波' }, { v: 'landslide', label: '土砂災害' }], S.hz, v2 => { S.hz = v2; S.level = v2 === 'tsunami' ? 6 : 1.5; S.choice = null; compute(); draw(); renderSide(); }));
    ui.bar.appendChild(seg([{ v: 'kind', label: '地形分類図' }, { v: 'height', label: '標高（段彩）' }, { v: 'plain', label: '地図' }], S.layer, v2 => { S.layer = v2; draw(); }));

    let depth = new Float64Array(w * h), slopeRisk = new Uint8Array(w * h);
    // 傾き（土砂災害警戒の目安）
    for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
      const k = j * w + i, gx = (v[k + 1] - v[k - 1]) / (2 * TOWN.cell), gy = (v[k + w] - v[k - w]) / (2 * TOWN.cell);
      const sl = Math.atan(Math.hypot(gx, gy)) * 180 / Math.PI;
      slopeRisk[k] = (kind[k] === 3 && sl > 14) || (kind[k] !== 3 && sl > 20) ? 2 : 0;
    }
    // 急な斜面の下（土石流・がけ崩れが届く所）も警戒区域にする
    for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
      const k = j * w + i;
      if (slopeRisk[k] === 0) for (let d = 1; d <= 4; d++) { if (j - d >= 0 && slopeRisk[(j - d) * w + i] === 2) { slopeRisk[k] = 1; break; } }
    }
    function compute() {
      depth = new Float64Array(w * h);
      if (S.hz === 'landslide') return;
      // 川（洪水）または海（津波）から、低い所へ水が広がる（つながっている所だけ）
      const src = S.hz === 'flood' ? 4 : 5;
      // 川（洪水）または海（津波）から水が広がる。
      // 洪水：あふれた水は低い方へ流れ、くぼ地にたまる。たまる深さは「水位の上昇分」くらいまで（遠くへ行くほど少し浅くなる）
      const surface = new Float64Array(w * h).fill(-1), dep = new Float64Array(w * h);
      const q = [];
      for (let k = 0; k < w * h; k++) if (kind[k] === src) { surface[k] = S.hz === 'flood' ? v[k] + 2.5 + S.level : S.level; dep[k] = S.hz === 'flood' ? S.level : S.level; q.push(k); }
      let qi = 0;
      while (qi < q.length) {
        const k = q[qi++], i = k % w, j = (k / w) | 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
          const nk = nj * w + ni;
          if (kind[nk] === 5 || kind[nk] === 4 || (S.hz === 'flood' && kind[nk] === 3)) continue;
          let ns;
          if (S.hz === 'flood') { const d = dep[k] - 0.025; if (d <= 0) continue; ns = surface[k] - v[nk] <= d + 1.5 ? surface[k] : v[nk] + d; }
          else ns = surface[k] - (kind[k] === 5 ? 0 : TOWN.cell * 0.006); // 津波は内陸に進むほど低くなる
          if (ns > v[nk] && ns > surface[nk] + 0.02) { surface[nk] = ns; dep[nk] = S.hz === 'flood' ? dep[k] - 0.025 : ns - v[nk]; q.push(nk); }
        }
      }
      for (let k = 0; k < w * h; k++) if (kind[k] !== 4 && kind[k] !== 5 && surface[k] > v[k]) depth[k] = surface[k] - v[k];
    }

    function danger(k) { return S.hz === 'landslide' ? slopeRisk[k] > 0 : depth[k] > 0.3; }
    // 家から避難所までの道（危険な所・川（橋以外）を通らない、いちばん近い道）
    function route(to) {
      const start = TOWN.home[1] * w + TOWN.home[0], goal = to[1] * w + to[0];
      const dist = new Float64Array(w * h).fill(Infinity), prev = new Int32Array(w * h).fill(-1);
      dist[start] = 0;
      const heap = [[0, start]];
      const push = item => { heap.push(item); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
      const pass = k => { const kd = kind[k]; if (kd === 5) return false; if (kd === 4) { const j = (k / w) | 0; return TOWN.bridgesY.some(b => Math.abs(b - j) <= 1); } return true; };
      while (heap.length) {
        const [d, k] = pop();
        if (d > dist[k]) continue; if (k === goal) break;
        const i = k % w, j = (k / w) | 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
          const nk = nj * w + ni; if (!pass(nk)) continue;
          const step = Math.hypot(di, dj) * (1 + Math.abs(v[nk] - v[k]) * 0.08) * (kind[nk] === 3 ? 5 : 1) + (danger(nk) ? 60 : 0);
          if (d + step < dist[nk]) { dist[nk] = d + step; prev[nk] = k; push([dist[nk], nk]); }
        }
      }
      const pts = []; let k = goal, wet = 0; while (k !== -1) { pts.push([k % w, (k / w) | 0]); if (danger(k)) wet++; k = prev[k]; }
      pts.reverse();
      let len = 0; for (let x = 1; x < pts.length; x++) len += Math.hypot(pts[x][0] - pts[x - 1][0], pts[x][1] - pts[x - 1][1]) * TOWN.cell;
      return { pts, wet, len };
    }

    const TSH = shadeOf(v, w, h, TOWN.cell, 3);
    const HCOL = d3.interpolateRgbBasis(['#9ccf8a', '#e8e0a6', '#dcb57a', '#b07e55', '#8a6243']);
    function draw() {
      svg.selectAll('*').remove();
      const max = d3.max(v);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d'), im = ctx.createImageData(w, h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const k = j * w + i;
        let c;
        if (S.layer === 'kind') c = KIND[kind[k]].c;
        else if (S.layer === 'height') c = kind[k] === 5 ? '#7fb7e0' : kind[k] === 4 ? '#5ea0d8' : HCOL(clamp(Math.sqrt(Math.max(0, v[k])) / Math.sqrt(max), 0, 1));
        else c = kind[k] === 5 ? '#a9d0ea' : kind[k] === 4 ? '#7db6e3' : '#f6f2e6';
        if (S.hz !== 'landslide' && depth[k] > 0.05) c = DEPTH.find(x => depth[k] < x.d).c;
        if (S.hz === 'landslide' && slopeRisk[k]) c = slopeRisk[k] === 2 ? '#e8735c' : '#f6c26b';
        const rgb = (kind[k] === 4 || kind[k] === 5 || S.layer === 'plain') ? d3.rgb(c) : mix(c, 0.66 + 0.45 * TSH[k]);
        im.data[k * 4] = Math.min(255, rgb.r); im.data[k * 4 + 1] = Math.min(255, rgb.g); im.data[k * 4 + 2] = Math.min(255, rgb.b); im.data[k * 4 + 3] = 255;
      }
      ctx.putImageData(im, 0, 0);
      svg.append('image').attr('href', cv.toDataURL()).attr('width', Wv).attr('height', Hv).attr('preserveAspectRatio', 'none');
      // 等高線（うすく）
      const cts = d3.contours().size([w, h]).thresholds([5, 10, 20, 50, 100, 150, 200])(Array.from(v));
      svg.append('g').selectAll('path').data(cts).join('path').attr('d', d3.geoPath(d3.geoIdentity().scale(sx))).attr('fill', 'none').attr('stroke', 'rgba(110,70,30,.45)').attr('stroke-width', .8);
      // 橋・家並み
      TOWN.bridgesY.forEach(by => { const x = TOWN.river(by) * sx; svg.append('rect').attr('x', x - 22).attr('y', by * sx - 4).attr('width', 44).attr('height', 8).attr('fill', '#555').attr('stroke', '#fff'); });
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let n = 0; n < 900 && n >= 0; n++) {
        const i = 3 + Math.floor(rnd() * (w - 6)), j = 28 + Math.floor(rnd() * (h - 34)), k = j * w + i;
        const p = { 1: 0.55, 2: 0.4, 7: 0.25, 0: 0.06, 8: 0.15 }[kind[k]] || 0;
        if (rnd() > p) continue;
        svg.append('rect').attr('x', i * sx).attr('y', j * sx).attr('width', 5).attr('height', 4).attr('fill', '#6b5d50').attr('opacity', .75);
      }
      // ルート
      if (S.choice && S.route) {
        const sh = TOWN.shelters.find(s => s.id === S.choice);
        const r = route(sh.p);
        svg.append('path').attr('d', d3.line()(r.pts.map(p => [p[0] * sx + 3, p[1] * sx + 3]))).attr('fill', 'none').attr('stroke', r.wet ? '#c8442a' : '#1f5f8b').attr('stroke-width', 4).attr('stroke-dasharray', '9 5').attr('stroke-linecap', 'round');
      }
      // 家と避難所
      const hp = TOWN.home;
      svg.append('text').attr('x', hp[0] * sx).attr('y', hp[1] * sx + 8).attr('text-anchor', 'middle').attr('font-size', 26).text('🏠');
      svg.append('text').attr('x', hp[0] * sx).attr('y', hp[1] * sx + 24).attr('text-anchor', 'middle').attr('font-size', 12).attr('font-weight', 700).style('paint-order', 'stroke').style('stroke', '#fff').style('stroke-width', 3).text('自宅');
      TOWN.shelters.forEach(s => {
        const g = svg.append('g').attr('transform', `translate(${s.p[0] * sx},${s.p[1] * sx})`).style('cursor', 'pointer').on('click', () => { S.choice = s.id; draw(); renderSide(); });
        g.append('circle').attr('r', 30).attr('fill', 'transparent');
        g.append('circle').attr('r', 15).attr('fill', S.choice === s.id ? '#1f5f8b' : '#fff').attr('stroke', '#1f5f8b').attr('stroke-width', 2.5);
        g.append('text').attr('y', 5).attr('text-anchor', 'middle').attr('font-size', 15).attr('font-weight', 700).attr('fill', S.choice === s.id ? '#fff' : '#1f5f8b').text(s.sym);
        g.append('text').attr('x', 18).attr('y', -8).attr('font-size', 15).attr('font-weight', 800).attr('fill', '#c8442a').style('paint-order', 'stroke').style('stroke', '#fff').style('stroke-width', 3).text(s.id);
      });
      // 凡例
      let lg = '';
      if (S.layer === 'kind') lg += KIND.map(k => `<span><i style="background:${k.c}"></i>${k.n}</span>`).join('');
      if (S.hz === 'landslide') lg += '<span><i style="background:#e8735c"></i>急な斜面（がけ崩れの危険）</span><span><i style="background:#f6c26b"></i>斜面の下（土石流・がけ崩れが届く）</span>';
      else lg += DEPTH.map(x => `<span><i style="background:${x.c}"></i>浸水 ${x.n}</span>`).join('');
      ui.foot.innerHTML = `<div class="legend">${lg}</div>`;
    }

    function judge(sh) {
      const k = sh.p[1] * w + sh.p[0];
      const r = route(sh.p);
      const d = depth[k], floorsH = sh.floors * 3;
      let ok = true, why = [];
      if (S.hz === 'landslide') { if (slopeRisk[k]) { ok = false; why.push('避難所が土砂災害の警戒区域（急な斜面やその下）にある。'); } else why.push('避難所は急な斜面から離れている。'); }
      else if (d > 0.3 && S.hz === 'tsunami') { ok = false; why.push(`避難所が約${d.toFixed(1)}m浸水する。津波は勢いが強く、建物ごと流されるおそれがある。浸水する所は津波の避難先にならない。`); }
      else if (d > 0.3) { if (d >= floorsH - 0.5) { ok = false; why.push(`避難所が約${d.toFixed(1)}m浸水し、${sh.floors}階建てでは上の階に逃げても危険。`); } else { why.push(`避難所が約${d.toFixed(1)}m浸水する。上の階（${sh.floors}階）に上がれば助かる可能性はあるが、孤立する。`); ok = 'mid'; } }
      else why.push(`避難所の標高は約${Math.round(v[k])}mで、浸水しない。`);
      if (r.wet) { why.push(`とちゅうの道の約${Math.round(r.wet * TOWN.cell)}mが${S.hz === 'landslide' ? '危険な斜面の近く' : '浸水している所'}を通る。水の深さが50cmをこえると大人でも歩けない。`); if (ok === true) ok = 'mid'; }
      else why.push('危険な所を通らずに行ける。');
      why.push(`道のりは約${(r.len / 1000).toFixed(1)}km（歩いて約${Math.round(r.len / 1000 / 3.5 * 60)}分）。`);
      if (S.hz === 'tsunami' && r.len > 2500 && ok === true) { ok = 'mid'; why.push('津波は地震から数十分で来ることがある。遠い所より「近くの高い所」へすぐに逃げることが大切。'); }
      return { ok, why };
    }

    function renderSide() {
      const hzName = { flood: '洪水', tsunami: '津波', landslide: '土砂災害' }[S.hz];
      ui.side.innerHTML = `<h2>防災シミュレーション：${hzName}</h2>
        <p class="lead">架空の町。地形分類図とハザードマップを重ねて、どこへ避難すべきか考えよう。</p>
        <div class="lv"></div>
        <div class="card mission"><b>ミッション</b><p style="margin:4px 0">${{ flood: '大雨で川の水位が上がっている。自宅（🏠）から、どの避難所へ逃げるのがよいだろう？', tsunami: '大きな地震がおきて津波警報が出た。自宅から、どこへ逃げるのがよいだろう？', landslide: '大雨が続き、土砂災害警戒情報が出た。自宅から、どの避難所へ逃げるのがよいだろう？' }[S.hz]}</p>
        <p class="small muted" style="margin:0">地図の避難所（A〜E）を${TAP}するか、下の表から選ぶと、道すじと評価が出る。</p></div>
        <div class="res"></div>
        <h3>地形と災害の関係</h3>
        <table class="tbl"><tr><th>地形</th><th>注意すること</th></tr>
          <tr><td>後背湿地・旧河道</td><td>水がたまりやすく、洪水で浸水しやすい。地震で液状化しやすい。</td></tr>
          <tr><td>自然堤防</td><td>まわりより少し高く、浸水しにくい。古くからの集落が多い。</td></tr>
          <tr><td>台地</td><td>高く水はけがよいので、洪水・津波の被害を受けにくい。がけには注意。</td></tr>
          <tr><td>扇状地・谷口</td><td>土石流が流れ出しやすい。</td></tr>
          <tr><td>海岸の低地・三角州</td><td>津波・高潮で浸水しやすい。</td></tr></table>
        <div class="think"></div>`;
      if (S.hz !== 'landslide') {
        $('.lv', ui.side).appendChild(sliderRow(S.hz === 'flood' ? '川からあふれる水' : '津波の高さ', { min: 0, max: S.hz === 'flood' ? 8 : 15, step: 0.5, value: S.level, fmt: x => x + ' m', onInput: x => { S.level = x; compute(); draw(); renderResult(); } }));
      }
      renderResult();
      $('.think', ui.side).appendChild(thinkCard({ id: 'hazard-' + S.hz, views: ['env', 'place', 'region'], q: `${hzName}のとき、あなたが選んだ避難所と道すじを、地形分類図やハザードマップの情報を根拠に説明しよう。また、この町で${hzName}の被害を減らすために、町（公助）・地域（共助）・自分（自助）ができることを考えよう。`, answer: { flood: '台地の上の中学校（B）が適している。台地は標高が高く浸水しない。自宅から橋をわたって行く道は、水位が上がると浸水するので、早めに避難する。低地の小学校（A）や旧河道ぞいは浸水が深くなる。公助：堤防や遊水地の整備、ハザードマップの配布。共助：近所での声かけ、避難の手助け。自助：ハザードマップで自宅の浸水の深さを確認し、早めに避難する。', tsunami: '近くの高い所へすぐに逃げることが大切。台地（B）は高く安全だが遠いので、時間がない場合は自然堤防の上より高い所や、頑丈で高い建物（津波避難ビル）に逃げる。海の近くの体育館（D）は浸水するので避難所として危険。公助：防潮堤、津波避難タワー、避難訓練の実施。共助：「津波てんでんこ」の考え方の共有。自助：ゆれたらすぐ高い所へ。', landslide: '山すその公民館（C）は急な斜面の下にあり、土砂災害の危険があるので適さない。斜面から離れた台地の上（B）や平地の避難所を選ぶ。公助：砂防ダムの整備、警戒区域の指定。共助：雨の様子の声かけ。自助：前兆（斜面からの水、小石が落ちる、地鳴り）に注意し、明るいうちに避難する。' }[S.hz] }));
    }
    function renderResult() {
      const box = $('.res', ui.side); if (!box) return;
      if (!S.choice) { box.innerHTML = '<div class="shl">' + TOWN.shelters.map(s => `<button type="button" class="chip" data-s="${s.id}"><b>${s.id}</b> ${s.name}（${s.floors}階）</button>`).join('') + '</div>'; $$('.shl button', box).forEach(b => b.addEventListener('click', () => { S.choice = b.dataset.s; draw(); renderSide(); })); return; }
      const sh = TOWN.shelters.find(s => s.id === S.choice);
      const J = judge(sh);
      box.innerHTML = `<div class="card ${J.ok === true ? 'ok' : 'ng'}"><b>${sh.id}：${sh.name}</b> → ${J.ok === true ? '<span style="color:var(--ok)">◎ 安全に避難できる</span>' : J.ok === 'mid' ? '<span class="warn">△ 危険がある</span>' : '<span class="warn">× 避難所として危険</span>'}
        <ul class="small" style="margin:4px 0 0;padding-left:1.2em">${J.why.map(x => `<li>${x}</li>`).join('')}</ul></div>
        <p class="small muted">道すじ：青＝安全、赤＝危険な所を通る。${S.hz === 'flood' ? '水位を上げ下げして、道すじがどう変わるか試そう。' : ''}</p><button type="button" class="btn small ghost re">別の避難所をえらぶ</button>`;
      $('.re', box).addEventListener('click', () => { S.choice = null; draw(); renderSide(); });
    }

    compute(); draw(); renderSide();
    return () => {};
  }
});
