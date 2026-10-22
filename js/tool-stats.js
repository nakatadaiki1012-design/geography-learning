/* 見る：統計地図（GIS）。階級区分図と図形表現図、散布図、地域ごとのランキング */

const CHORO = ['#fbf1d5', '#f5d79a', '#eeb460', '#de873a', '#c25624', '#8a3214'];
const REG_COLOR = { eastasia: '#d9473b', seasia: '#e08a2e', sasia: '#c9a227', wasia: '#8c6d3f', nafrica: '#b5651d', safrica: '#6f8f2a', europe: '#2f78c4', russia: '#5b5fc7', namerica: '#1f9e89', lamerica: '#2c8350', oceania: '#a04fa0' };
const REL_CAT = [
  { k: 'キリスト教', c: '#3f7fc0' }, { k: 'イスラーム', c: '#2c8350' }, { k: '仏教', c: '#e3a63a' }, { k: 'ヒンドゥー教', c: '#d9473b' }
];
function relCategory(c) { const r = REL_CAT.find(x => c.rel.startsWith(x.k)); return r || { k: 'その他', c: '#999' }; }
const LOG_KEYS = ['pop', 'gni', 'dens', 'co2', 'co2total', 'area'];

function mainCentroid(f) {
  if (f.geometry.type !== 'MultiPolygon') return d3.geoCentroid(f);
  let best = null, ba = -1;
  f.geometry.coordinates.forEach(poly => { const g = { type: 'Polygon', coordinates: poly }; const a = d3.geoArea(g); if (a > ba) { ba = a; best = g; } });
  return d3.geoCentroid(best);
}

registerTool('stats', {
  name: '統計地図（GIS）',
  render(container, params = {}) {
    const S = { view: params.view || 'map', ind: params.ind || 'old', style: params.style || null, region: params.region || 'all', sel: null, x: params.x || 'gni', y: params.y || 'tfr' };
    const ui = toolShell(container, { foot: true });
    const W = 960, H = 500;
    const svg = d3.select(ui.wrap).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const tip = el('<div class="tip" hidden></div>'); ui.wrap.appendChild(tip);
    const INDS = INDICATORS.concat([{ key: 'rel', name: '主な宗教', unit: '', kind: 'cat', note: '国でもっとも多い宗教（地域によって少数の宗教もある）' }]);
    const ind = () => INDS.find(i => i.key === S.ind);
    if (!S.style) S.style = ind().kind === 'abs' ? 'circle' : 'choro';

    ui.bar.appendChild(seg([{ v: 'map', label: '主題図' }, { v: 'scatter', label: '散布図（関係を調べる）' }], S.view, v => { S.view = v; draw(); renderSide(); }));

    function showTip(ev, html) { const r = ui.wrap.getBoundingClientRect(); tip.hidden = false; tip.innerHTML = html; tip.style.left = (ev.clientX - r.left) + 'px'; tip.style.top = (ev.clientY - r.top) + 'px'; }

    const REGION_BOX = { eastasia: [73, 18, 146, 54], seasia: [92, -11, 141, 24], sasia: [60, 5, 98, 37], wasia: [25, 12, 90, 55], nafrica: [-18, 15, 37, 38], safrica: [-18, -35, 52, 18], europe: [-11, 35, 40, 71], russia: [27, 41, 180, 78], namerica: [-168, 24, -52, 72], lamerica: [-118, -56, -34, 33], oceania: [110, -48, 180, -8] };
    function regionFeatures() {
      if (S.region === 'all') return null;
      const [a, b, c, d] = REGION_BOX[S.region], pts = [];
      for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) pts.push([a + (c - a) * i / 4, b + (d - b) * j / 4]);
      return { type: 'MultiPoint', coordinates: pts, center: (a + c) / 2 };
    }

    function breaksFor(I) {
      if (I.breaks) return I.breaks;
      const vals = COUNTRIES.map(c => indicatorValue(c, I)).sort((a, b) => a - b);
      return [1, 2, 3, 4, 5].map(k => d3.quantileSorted(vals, k / 6)).map(v => +v.toPrecision(2));
    }

    function drawMap() {
      const I = ind();
      const rf = regionFeatures();
      const proj = d3.geoNaturalEarth1().rotate([rf ? -rf.center : -10, 0]);
      if (rf) proj.fitExtent([[40, 30], [W - 40, H - 30]], rf); else proj.fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' });
      const base = drawBaseMap(svg, proj, { antarctica: false });
      const br = I.kind === 'cat' ? null : breaksFor(I);
      const color = I.kind === 'cat' ? (c => relCategory(c).c) : (c => CHORO[d3.bisectRight(br, indicatorValue(c, I))]);
      const inReg = c => S.region === 'all' || c.reg === S.region;
      base.countries
        .attr('fill', f => { const c = C_BY_ID[f.id]; if (!c) return 'var(--nodata)'; if (S.style === 'circle' && I.kind !== 'cat') return inReg(c) ? 'var(--land)' : 'var(--nodata)'; return inReg(c) ? color(c) : 'var(--nodata)'; })
        .attr('stroke', f => S.sel === f.id ? 'var(--ink)' : null).attr('stroke-width', f => S.sel === f.id ? 2 : null)
        .style('cursor', f => C_BY_ID[f.id] ? 'pointer' : 'default')
        .on('mousemove', (ev, f) => { const c = C_BY_ID[f.id]; if (!f.jp) return tip.hidden = true; showTip(ev, c ? `${c.jp}：${I.kind === 'cat' ? c.rel : I.fmt(indicatorValue(c, I)) + ' ' + I.unit}` : `${f.jp}（データなし）`); })
        .on('mouseleave', () => { tip.hidden = true; })
        .on('click', (ev, f) => { if (C_BY_ID[f.id]) { S.sel = f.id; draw(); renderSide(); } });
      if (S.style === 'circle' && I.kind !== 'cat') {
        const vals = COUNTRIES.map(c => indicatorValue(c, I));
        const r = d3.scaleSqrt().domain([0, d3.max(vals)]).range([0, rf ? 60 : 42]);
        const data = COUNTRIES.filter(inReg).map(c => { const f = WORLD.countries.find(x => x.id === c.id); return { c, p: proj(mainCentroid(f)), v: indicatorValue(c, I) }; }).sort((a, b) => b.v - a.v);
        base.g.append('g').selectAll('circle').data(data).join('circle')
          .attr('cx', d => d.p[0]).attr('cy', d => d.p[1]).attr('r', d => r(d.v))
          .attr('fill', 'rgba(200,68,42,.45)').attr('stroke', 'var(--shu)').attr('stroke-width', 1)
          .style('cursor', 'pointer')
          .on('mousemove', (ev, d) => showTip(ev, `${d.c.jp}：${I.fmt(d.v)} ${I.unit}`)).on('mouseleave', () => { tip.hidden = true; })
          .on('click', (ev, d) => { S.sel = d.c.id; draw(); renderSide(); });
        // 凡例（円の大きさ）
        const mx = d3.max(vals), ref = [mx, mx / 4].map(v => +v.toPrecision(1));
        const lg = svg.append('g').attr('transform', `translate(${W - 120},${H - 20})`);
        ref.forEach(v => { lg.append('circle').attr('cy', -r(v)).attr('r', r(v)).attr('fill', 'none').attr('stroke', 'var(--ink)'); lg.append('text').attr('x', r(ref[0]) + 6).attr('y', -2 * r(v) + 4).attr('font-size', 11).attr('fill', 'var(--ink)').text(`${I.fmt(v)} ${I.unit}`); });
      }
      // 凡例（色）
      let lgHtml = '';
      if (I.kind === 'cat') lgHtml = REL_CAT.concat([{ k: 'その他', c: '#999' }]).map(x => `<span><i style="background:${x.c}"></i>${x.k}</span>`).join('');
      else if (S.style === 'choro') lgHtml = CHORO.map((col, i) => `<span><i style="background:${col}"></i>${i === 0 ? `〜${br[0]}` : i === CHORO.length - 1 ? `${br[i - 1]}〜` : `${br[i - 1]}〜${br[i]}`}</span>`).join('') + `<span class="muted">（${I.unit || '—'}）</span>`;
      lgHtml += '<span><i style="background:var(--nodata)"></i>データなし・対象外</span>';
      ui.foot.innerHTML = `<div class="legend">${lgHtml}</div>`;
    }

    function drawScatter() {
      const X = INDICATORS.find(i => i.key === S.x), Y = INDICATORS.find(i => i.key === S.y);
      const m = { l: 70, r: 24, t: 24, b: 54 };
      const data = COUNTRIES.filter(c => S.region === 'all' || c.reg === S.region).map(c => ({ c, x: indicatorValue(c, X), y: indicatorValue(c, Y) }));
      const sc = (I, dom, range) => LOG_KEYS.includes(I.key) ? d3.scaleLog().domain(dom).range(range).nice() : d3.scaleLinear().domain(dom).range(range).nice();
      const ext = (I, k) => { const e = d3.extent(COUNTRIES, c => indicatorValue(c, I)); return LOG_KEYS.includes(I.key) ? [e[0] * 0.8, e[1] * 1.2] : [Math.min(0, e[0]), e[1] * 1.08]; };
      const x = sc(X, ext(X), [m.l, W - m.r]), y = sc(Y, ext(Y), [H - m.b, m.t]);
      const g = svg.append('g').attr('class', 'chart');
      g.append('rect').attr('width', W).attr('height', H).attr('fill', 'var(--panel)');
      g.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(8, LOG_KEYS.includes(X.key) ? '~s' : undefined).tickSize(-(H - m.t - m.b))).call(a => a.selectAll('.tick line').attr('stroke-opacity', .35));
      g.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(8, LOG_KEYS.includes(Y.key) ? '~s' : undefined).tickSize(-(W - m.l - m.r))).call(a => a.selectAll('.tick line').attr('stroke-opacity', .35));
      g.selectAll('.tick text').style('font-size', '12px');
      g.append('text').attr('x', (W + m.l) / 2).attr('y', H - 14).attr('text-anchor', 'middle').style('font-size', '14px').style('fill', 'var(--ink)').text(`${X.name}（${X.unit || '—'}）${LOG_KEYS.includes(X.key) ? '・目盛りは10倍ごと' : ''}`);
      g.append('text').attr('transform', `translate(18,${(H - m.b + m.t) / 2}) rotate(-90)`).attr('text-anchor', 'middle').style('font-size', '14px').style('fill', 'var(--ink)').text(`${Y.name}（${Y.unit || '—'}）`);
      const pts = g.append('g').selectAll('g').data(data).join('g').attr('transform', d => `translate(${x(d.x)},${y(d.y)})`).style('cursor', 'pointer')
        .on('click', (ev, d) => { S.sel = d.c.id; renderSide(); draw(); });
      pts.append('circle').attr('r', d => S.sel === d.c.id ? 8 : 5.5).attr('fill', d => REG_COLOR[d.c.reg]).attr('stroke', d => S.sel === d.c.id ? 'var(--ink)' : 'var(--panel)').attr('stroke-width', 1.5);
      pts.append('text').attr('x', 7).attr('y', 4).style('font-size', '10.5px').style('fill', 'var(--ink)').style('font-family', 'var(--font-body)').text(d => d.c.jp);
      // 相関係数
      const lx = d => LOG_KEYS.includes(X.key) ? Math.log10(d.x) : d.x, ly = d => LOG_KEYS.includes(Y.key) ? Math.log10(d.y) : d.y;
      const mxv = d3.mean(data, lx), myv = d3.mean(data, ly);
      const rr = d3.sum(data, d => (lx(d) - mxv) * (ly(d) - myv)) / Math.sqrt(d3.sum(data, d => (lx(d) - mxv) ** 2) * d3.sum(data, d => (ly(d) - myv) ** 2));
      const rel = Math.abs(rr) > 0.7 ? '強い' : Math.abs(rr) > 0.4 ? 'やや' : 'ほとんどない';
      ui.foot.innerHTML = `<div class="legend">${Object.keys(REG_COLOR).map(k => `<span><i style="background:${REG_COLOR[k]}"></i>${REGIONS[k]}</span>`).join('')}</div><span>相関係数 r = <b class="mono">${rr.toFixed(2)}</b>（${rel === 'ほとんどない' ? '関係はほとんどない' : `${rel}${rr > 0 ? '正' : '負'}の相関`}）</span>`;
    }

    function draw() { svg.selectAll('*').remove(); tip.hidden = true; if (S.view === 'map') drawMap(); else drawScatter(); }

    function renderSide() {
      const I = ind();
      const indOpts = [{ group: '相対値（割合・1人当たり・密度）', items: INDS.filter(i => i.kind === 'rel').map(i => ({ v: i.key, label: i.name })) }, { group: '絶対値（量そのもの）', items: INDS.filter(i => i.kind === 'abs').map(i => ({ v: i.key, label: i.name })) }, { group: 'その他', items: [{ v: 'rel', label: '主な宗教' }] }];
      const regOpts = [{ v: 'all', label: '世界全体' }].concat(Object.keys(REGIONS).map(k => ({ v: k, label: REGIONS[k] })));
      ui.side.innerHTML = '';
      if (S.view === 'map') {
        ui.side.innerHTML = `<h2>主題図をつくる</h2><p class="lead">GIS（地理情報システム）のように、統計を地図に重ねて分布を見る。</p>
          <label class="f">表す統計</label><div class="ind"></div><p class="small muted" style="margin:2px 0">${I.note || ''}</p>
          ${I.kind === 'cat' ? '' : '<label class="f">表し方</label><div class="sty"></div><div class="mis"></div>'}
          <label class="f">地域</label><div class="reg"></div>
          <div class="detail"></div><h3>ランキング</h3><div class="rank"></div><div class="think"></div>`;
        $('.ind', ui.side).appendChild(selectBox(indOpts, S.ind, v => { S.ind = v; const k = ind().kind; S.style = k === 'abs' ? 'circle' : 'choro'; draw(); renderSide(); }));
        if (I.kind !== 'cat') {
          $('.sty', ui.side).appendChild(seg([{ v: 'choro', label: '階級区分図（色の濃さ）' }, { v: 'circle', label: '図形表現図（円の大きさ）' }], S.style, v => { S.style = v; draw(); renderSide(); }));
          const bad = (I.kind === 'abs' && S.style === 'choro') || (I.kind === 'rel' && S.style === 'circle');
          if (bad) $('.mis', ui.side).innerHTML = `<div class="card ng small"><b class="warn">この表し方は誤解をまねきます</b><br>${I.kind === 'abs' ? '人口のような<b>絶対値</b>を色の濃さで表すと、面積の広い国ほど目立ってしまう。量は<b>図形表現図</b>（円の大きさ）で表そう。' : '割合や密度などの<b>相対値</b>は、国の大きさと関係なく比べられる<b>階級区分図</b>（色の濃さ）が向いている。'}</div>`;
        }
        $('.reg', ui.side).appendChild(selectBox(regOpts, S.region, v => { S.region = v; draw(); renderSide(); }));
        if (I.kind !== 'cat') {
          const list = COUNTRIES.filter(c => S.region === 'all' || c.reg === S.region).map(c => ({ c, v: indicatorValue(c, I) })).sort((a, b) => b.v - a.v);
          const show = S.region === 'all' ? list.slice(0, 8).concat([null], list.slice(-5)) : list;
          $('.rank', ui.side).innerHTML = `<table class="tbl">${show.map((d, i) => d ? `<tr${d.c.id === S.sel ? ' style="background:var(--chip)"' : ''}><td class="n">${list.indexOf(d) + 1}</td><td>${d.c.jp}</td><td class="n">${I.fmt(d.v)}</td></tr>` : '<tr><td></td><td class="muted">…</td><td></td></tr>').join('')}</table><p class="small muted">${COUNTRIES.length}か国のデータ（おおよその値）より</p>`;
        } else {
          $('.rank', ui.side).innerHTML = `<table class="tbl">${REL_CAT.concat([{ k: 'その他' }]).map(x => `<tr><td>${x.k}</td><td class="small">${COUNTRIES.filter(c => (S.region === 'all' || c.reg === S.region) && relCategory(c).k === x.k).map(c => c.jp).join('、') || '—'}</td></tr>`).join('')}</table>`;
        }
        const T = STAT_THINK[S.ind];
        if (T) $('.think', ui.side).appendChild(thinkCard(Object.assign({ id: 'stats-' + S.ind }, T)));
      } else {
        ui.side.innerHTML = `<h2>散布図で関係を調べる</h2><p class="lead">2つの統計の関係を見る。右上がりなら「正の相関」、右下がりなら「負の相関」。点をクリックすると国の情報。</p>
          <label class="f">横の軸</label><div class="xs"></div><label class="f">たての軸</label><div class="ys"></div><label class="f">地域</label><div class="reg"></div>
          <div class="row" style="margin-top:8px"><button type="button" class="btn small ghost p1">所得と出生率</button><button type="button" class="btn small ghost p2">所得とCO₂</button><button type="button" class="btn small ghost p3">所得と都市人口率</button></div>
          <div class="detail"></div><div class="think"></div>`;
        const o = INDICATORS.map(i => ({ v: i.key, label: i.name }));
        $('.xs', ui.side).appendChild(selectBox(o, S.x, v => { S.x = v; draw(); renderSide(); }));
        $('.ys', ui.side).appendChild(selectBox(o, S.y, v => { S.y = v; draw(); renderSide(); }));
        $('.reg', ui.side).appendChild(selectBox(regOpts, S.region, v => { S.region = v; draw(); renderSide(); }));
        [['p1', 'gni', 'tfr'], ['p2', 'gni', 'co2'], ['p3', 'gni', 'urban']].forEach(([c, x, y]) => $('.' + c, ui.side).addEventListener('click', () => { S.x = x; S.y = y; draw(); renderSide(); }));
        $('.think', ui.side).appendChild(thinkCard({ id: 'stats-scatter', views: ['region', 'inter'], q: '「所得と出生率」の散布図を見よう。1人当たりGNIが高い国ほど合計特殊出生率はどうなっているか。そのような関係が生まれる理由を、くらしや社会の変化から考えよう。', hint: '子どもの教育費、女性の社会進出、医療の発達（子どもが亡くなりにくくなる）、年金などの社会保障に注目。', answer: '所得が高い国ほど出生率が低い（負の相関）。経済が発展すると、医療の発達で乳幼児死亡率が下がり多く産む必要がなくなる、教育費が高くなる、女性の進学・就業が進み結婚や出産の時期が遅くなる、社会保障が整い老後に子どもにたよる必要が減る、といった変化が起こるため。ただし同じ所得でも、宗教や家族観、子育て支援政策によって出生率に差がある（例：フランスは比較的高い）。' }));
      }
      if (S.sel && C_BY_ID[S.sel]) {
        const c = C_BY_ID[S.sel];
        $('.detail', ui.side).innerHTML = `<div class="card"><b style="font-size:16px">${c.jp}</b> <span class="small muted">${REGIONS[c.reg]}・首都 ${c.cap}</span>
          <dl class="kv">${INDICATORS.map(i => `<dt>${i.name}</dt><dd>${i.fmt(indicatorValue(c, i))} ${i.unit}</dd>`).join('')}<dt>主な宗教</dt><dd class="t">${c.rel}</dd><dt>主な言語</dt><dd class="t">${c.lang}</dd></dl></div>`;
      }
    }

    draw(); renderSide();
    return () => {};
  }
});

const STAT_THINK = {
  old: { views: ['pos', 'region'], q: '65歳以上の割合が高い国は、どの地域に多いだろう。また、割合が低い国はどこに多いか。分布の特徴と、その理由を考えよう。', answer: 'ヨーロッパや日本・韓国などの先進国で高く、サハラ以南アフリカや西アジアで低い。先進国は医療が発達して平均寿命が長く、出生率も低いため高齢者の割合が大きい。アフリカは出生率が高く若い人が多い。西アジアの産油国は、外国から若い労働者が多く来ているため割合がとくに低い。' },
  tfr: { views: ['pos', 'region'], q: '合計特殊出生率が2.1を下回る国はどの地域に多いか。2.1という数字にはどんな意味があるだろう。', answer: '2.1は、親の世代と同じ人数を次の世代で保つのに必要な値（人口置換水準）。ヨーロッパ・東アジア・南北アメリカの多くの国で2.1を下回り、将来人口が減っていく。サハラ以南アフリカでは4以上の国が多く、人口が急増している。' },
  co2: { views: ['region', 'inter'], q: '1人当たりCO₂排出量が多い国と少ない国をくらべよう。また「国全体のCO₂排出量」に切りかえると、順位はどう変わるか。地球温暖化対策の責任をめぐる議論に結びつけて考えよう。', answer: '1人当たりではアメリカ・オーストラリア・カナダや西アジアの産油国が多く、アフリカは非常に少ない。国全体では人口の多い中国・アメリカ・インドが上位になる。先進国は長年多く排出してきた責任を、新興国は今の排出量が多いことを指摘され合うため、「共通だが差異ある責任」という考え方で国際協力が進められている。' },
  co2total: { views: ['region', 'inter'], q: '国全体のCO₂排出量を「階級区分図」に切りかえてみよう。図形表現図とくらべて、どのような誤解が生まれやすいか説明しよう。', answer: '階級区分図では、面積の広いロシアやカナダ・オーストラリアが目立ち、面積の小さい国の排出量が見えにくい。絶対値（量）は国の大きさに左右されるので、円の大きさで量を表す図形表現図のほうが正しく伝わる。' },
  pop: { views: ['pos'], q: '人口の多い国はどの地域に集まっているか。図形表現図から読み取り、その地域に人口が多い理由を自然環境と結びつけて考えよう。', answer: '中国・インド・バングラデシュ・インドネシアなど、モンスーンアジアに人口の多い国が集まる。季節風による多い雨と高温を利用した稲作で、多くの人口を養うことができたから。' },
  gni: { views: ['region'], q: '1人当たりGNIの分布を見て、所得の高い国と低い国の地域的なかたよりを説明しよう（南北問題）。', answer: '北アメリカ・西ヨーロッパ・日本・オーストラリアなど北半球の温帯の先進国で高く、サハラ以南アフリカや南アジアで低い。先進国と発展途上国の経済格差を南北問題という。また、発展途上国の中でも産油国や工業化した国と、そうでない国の格差（南南問題）が広がっている。' },
  urban: { views: ['region'], q: '都市人口率が高い国にはどのような特徴があるだろう。ラテンアメリカの国々の値にも注目して考えよう。', answer: '先進国は産業の中心が工業やサービス業になり、都市に住む人が多い。ラテンアメリカは所得が中程度でも都市人口率が高い。農村の大土地所有制で土地を持てない人々が仕事を求めて大都市に移り、首都などに人口が集中した（プライメートシティ）。急な都市化でスラムも生まれた。' },
  dens: { views: ['pos', 'env'], q: '人口密度が高い国と低い国の自然環境をくらべよう。オーストラリアやカナダの人口密度が低い理由は？', answer: 'オーストラリアは国土の多くが乾燥帯、カナダは寒冷な亜寒帯・寒帯で、人が住みにくい地域が広いため人口密度が低い（人口は沿岸部や南部に集中）。バングラデシュや日本、オランダなどは、農業に向く平野が多い・産業が発達しているなどの理由で高い。' },
  rel: { views: ['region', 'pos'], q: '主な宗教の分布を見て、イスラームが多い地域はどこか。また、東南アジアで国によって宗教がちがうのはなぜだろう。', answer: 'イスラームは西アジア・北アフリカから中央アジア、南アジアの一部、東南アジアのインドネシア・マレーシアに広がる。東南アジアは、インドから伝わった仏教（タイなど）、海の交易を通じて伝わったイスラーム（インドネシアなど）、スペインの植民地支配で広まったキリスト教（フィリピン）など、歴史的な結びつきのちがいで宗教が異なる。' },
  area: { views: ['pos'], q: '面積の大きい国の上位には、どのような共通点があるだろう。', answer: 'ロシア・カナダ・アメリカ・中国・ブラジル・オーストラリアなど、大陸の広い範囲をしめる国が多い。面積が大きいと資源が豊富なことが多い一方で、乾燥地や寒冷地など人が住みにくい地域もふくむ。' }
};
