/* 動かす：人口ピラミッド（出生率・平均寿命・人口移動を変えて、将来の人口を予測する） */

const AGE_N = 21; // 0-4歳 … 95-99歳, 100歳以上
const FERT_W = { 3: 0.08, 4: 0.24, 5: 0.28, 6: 0.22, 7: 0.12, 8: 0.05, 9: 0.01 }; // 15〜49歳の産む割合
const MIG_W = { 3: 0.15, 4: 0.3, 5: 0.3, 6: 0.17, 7: 0.08 };

function hazard(x, s, male) { return (male ? 1.3 : 1) * s * (1e-6 * Math.exp(0.13 * x) + 0.03 * Math.exp(-0.8 * x) + 0.0005); }
function e0For(s, male) { let l = 1, e = 0; for (let x = 0; x < 120; x += 0.5) { e += l * 0.5; l *= Math.exp(-hazard(x + 0.25, s, male) * 0.5); } return e; }
const LIFE_CACHE = {};
function survivalFor(L) {
  const key = L.toFixed(1); if (LIFE_CACHE[key]) return LIFE_CACHE[key];
  let lo = 0.01, hi = 400;
  for (let k = 0; k < 50; k++) { const mid = Math.sqrt(lo * hi); const e = (e0For(mid, true) + e0For(mid, false)) / 2; if (e > L) lo = mid; else hi = mid; }
  const s = Math.sqrt(lo * hi);
  const surv = male => d3.range(AGE_N).map(g => { let I = 0; for (let x = g * 5; x < g * 5 + 5; x += 0.25) I += hazard(x + 0.125, s, male) * 0.25; return Math.exp(-I); });
  return (LIFE_CACHE[key] = { M: surv(true), F: surv(false) });
}
function popStep(P, tfr, L, mig, mshare = 0.5) {
  const sv = survivalFor(L);
  const M = new Array(AGE_N).fill(0), F = new Array(AGE_N).fill(0);
  for (let g = 0; g < AGE_N; g++) {
    const to = Math.min(g + 1, AGE_N - 1);
    M[to] += P.M[g] * sv.M[g]; F[to] += P.F[g] * sv.F[g];
  }
  let births = 0;
  for (const g in FERT_W) births += (P.F[g] + F[g]) / 2 * tfr * FERT_W[g];
  M[0] = births * 0.512 * Math.sqrt(sv.M[0]); F[0] = births * 0.488 * Math.sqrt(sv.F[0]);
  const tot = d3.sum(P.M) + d3.sum(P.F), net = tot * mig / 100;
  for (const g in MIG_W) { M[g] = Math.max(0, M[g] + net * MIG_W[g] * mshare); F[g] = Math.max(0, F[g] + net * MIG_W[g] * (1 - mshare)); }
  return { M, F };
}
// [終わりの年, 合計特殊出生率, 平均寿命, 人口移動(5年で総人口の何%), 移動する人の男性の割合]
const POP_PRESETS = {
  japan: { name: '日本', total: 12450, year: 2020, now: [1.26, 84, 0.3, 0.5],
    // 2020年の国勢調査のおおよその値（万人）
    data: { M: [230, 255, 273, 290, 323, 323, 345, 393, 446, 494, 431, 384, 362, 397, 438, 316, 223, 129, 46, 8, 1], F: [219, 243, 260, 275, 306, 308, 333, 381, 434, 483, 427, 385, 370, 419, 486, 381, 314, 247, 141, 40, 7] },
    hist: [[1900, 4.8, 40, 0], [1940, 4.4, 45, 0], [1945, 3.0, 40, 0], [1950, 3.7, 55, 0], [1955, 2.9, 63, 0], [1970, 2.05, 70, 0], [1975, 2.0, 74, 0], [1990, 1.7, 78, 0], [2005, 1.4, 81, 0], [2020, 1.36, 84, 0.2]] },
  ethiopia: { name: 'エチオピア', total: 12700, year: 2020, now: [4.0, 67, 0, 0.5], hist: [[1900, 7, 35, 0], [1970, 7, 42, 0], [1990, 7, 47, 0], [2005, 6, 56, 0], [2020, 4.5, 65, 0]] },
  usa: { name: 'アメリカ', total: 33500, year: 2020, now: [1.62, 78, 1.5, 0.5], hist: [[1900, 3.5, 45, 2], [1930, 2.3, 55, 0.5], [1945, 2.4, 62, 0.3], [1965, 3.6, 69, 1], [1975, 2.0, 72, 1.5], [2020, 1.9, 77, 2.8]] },
  china: { name: '中国', total: 141000, year: 2020, now: [1.0, 78, 0, 0.5], hist: [[1900, 5.5, 28, 0], [1950, 5.5, 32, 0], [1970, 5.8, 52, 0], [1980, 3.0, 64, 0], [1995, 2.2, 69, 0], [2020, 1.6, 76, 0]] },
  uae: { name: 'アラブ首長国連邦', total: 950, year: 2020, now: [1.4, 79, 6, 0.72], hist: [[1900, 6, 40, 0], [1970, 6, 60, 2, 0.8], [1990, 4, 72, 25, 0.75], [2005, 2.3, 76, 25, 0.75], [2020, 1.6, 78, 12, 0.72]] }
};
function buildPreset(id) {
  const pr = POP_PRESETS[id];
  if (pr.data) return { M: pr.data.M.slice(), F: pr.data.F.slice(), year: pr.year };
  let P = { M: d3.range(AGE_N).map(g => 100 * Math.pow(0.85, g)), F: d3.range(AGE_N).map(g => 100 * Math.pow(0.86, g)) };
  // 最初の条件で長く回して、安定した形にする
  const h0 = pr.hist[0];
  for (let k = 0; k < 30; k++) { P = popStep(P, h0[1], h0[2], 0); const t = d3.sum(P.M) + d3.sum(P.F); P.M = P.M.map(x => x / t * 1000); P.F = P.F.map(x => x / t * 1000); }
  let y = h0[0];
  const timeline = [];
  for (let s = 1; s < pr.hist.length; s++) {
    const [end, tfr, L, mig, ms] = pr.hist[s];
    while (y < end) { P = popStep(P, tfr, L, mig, ms ?? 0.5); y += 5; }
  }
  const t = d3.sum(P.M) + d3.sum(P.F), k = pr.total / t;
  return { M: P.M.map(x => x * k), F: P.F.map(x => x * k), year: pr.year };
}
function popStats(P) {
  const tot = d3.sum(P.M) + d3.sum(P.F);
  const part = (a, b) => (d3.sum(P.M.slice(a, b)) + d3.sum(P.F.slice(a, b))) / tot * 100;
  const young = part(0, 3), work = part(3, 13), old = part(13, AGE_N);
  const g = i => P.M[i] + P.F[i];
  const maxG = d3.max(d3.range(AGE_N), g);
  let type, desc;
  if (young >= 32 && g(0) >= g(1) * 0.98) { type = '富士山型（ピラミッド型）'; desc = '出生率も死亡率も高い（多産多死〜多産少死）。発展途上国に多い。'; }
  else if (g(0) < maxG * 0.75 && young < 16) { type = 'つぼ型'; desc = '出生率が低く、子どもの数が減っている（少産少死）。少子高齢化が進んだ国。'; }
  else { type = 'つりがね型'; desc = '出生率と死亡率がともに低く、人口があまり増減しない（少産少死）。'; }
  const mid = d3.sum(d3.range(4, 8), g) / 4, near = (g(2) + g(9) + g(10)) / 3;
  const sr = d3.sum(P.M.slice(4, 10)) / d3.sum(P.F.slice(4, 10));
  if (sr > 1.4) { type = '星型（出稼ぎ型）'; desc = '働く世代、とくに男性が外国から多く流入している。産油国など出稼ぎ労働者の多い国。'; }
  else if (mid > near * 1.35 && young < 25) { type = '星型（都市型）'; desc = '仕事を求めて若い世代が流入している。都市や、出稼ぎの労働者が多い国。'; }
  return { tot, young, work, old, type, desc };
}

registerTool('pop', {
  name: '人口ピラミッド',
  render(container, params = {}) {
    const S = { preset: params.preset || 'japan' };
    let P, year, history, cur;
    function reset() {
      const pr = POP_PRESETS[S.preset];
      P = buildPreset(S.preset); year = P.year; history = [{ year, P }];
      cur = { tfr: pr.now[0], L: pr.now[1], mig: pr.now[2], ms: pr.now[3] };
    }
    reset();
    const ui = toolShell(container, { foot: true });
    const Wv = 760, Hv = 520;
    const svg = d3.select(ui.wrap).append('svg').attr('viewBox', `0 0 ${Wv} ${Hv}`);
    ui.bar.appendChild(seg(Object.keys(POP_PRESETS).map(k => ({ v: k, label: POP_PRESETS[k].name })), S.preset, v => { S.preset = v; stop(); reset(); renderSide(); draw(); }));
    ui.foot.innerHTML = '<span>モデルによる予測（出生率・平均寿命・人口移動から計算）。実際の統計の形とは細かい点でちがいます。</span>';

    function draw() {
      svg.selectAll('*').remove();
      const m = { l: 40, r: 40, t: 34, b: 34 }, cx = Wv / 2, gapC = 30;
      const max = Math.max(d3.max(P.M), d3.max(P.F), d3.max(history[0].P.M), d3.max(history[0].P.F));
      const x = d3.scaleLinear().domain([0, max * 1.08]).range([0, cx - m.l - gapC]);
      const y = d3.scaleBand().domain(d3.range(AGE_N)).range([Hv - m.b, m.t]).padding(0.08);
      const g = svg.append('g').attr('class', 'chart');
      const col = i => i < 3 ? '#e3a63a' : i < 13 ? '#4f9b4a' : '#3f7fc0';
      g.selectAll('.m').data(P.M).join('rect').attr('x', d => cx - gapC - x(d)).attr('y', (d, i) => y(i)).attr('width', d => x(d)).attr('height', y.bandwidth()).attr('fill', (d, i) => col(i)).attr('opacity', .9);
      g.selectAll('.f').data(P.F).join('rect').attr('x', cx + gapC).attr('y', (d, i) => y(i)).attr('width', d => x(d)).attr('height', y.bandwidth()).attr('fill', (d, i) => col(i)).attr('opacity', .65);
      // 最初の年の形（くらべるための線）
      if (history.length > 1) {
        const P0 = history[0].P;
        const line = (arr, side) => d3.line().curve(d3.curveStepAfter)(arr.flatMap((d, i) => { const xx = side < 0 ? cx - gapC - x(d) : cx + gapC + x(d); return [[xx, y(i) + y.bandwidth() + 1], [xx, y(i) - 1]]; }));
        g.append('path').attr('d', line(P0.M, -1)).attr('fill', 'none').attr('stroke', 'var(--ink)').attr('stroke-dasharray', '4 3').attr('stroke-width', 1.2);
        g.append('path').attr('d', line(P0.F, 1)).attr('fill', 'none').attr('stroke', 'var(--ink)').attr('stroke-dasharray', '4 3').attr('stroke-width', 1.2);
        g.append('text').attr('x', Wv - m.r).attr('y', 18).attr('text-anchor', 'end').style('font-size', '12px').text(`点線＝${history[0].year}年`);
      }
      d3.range(0, AGE_N, 2).forEach(i => g.append('text').attr('x', cx).attr('y', y(i) + y.bandwidth() / 2 + 4).attr('text-anchor', 'middle').style('font-size', '11px').text(i === AGE_N - 1 ? '100+' : i * 5));
      g.append('text').attr('x', cx - gapC - 4).attr('y', 22).attr('text-anchor', 'end').style('font-size', '14px').style('fill', 'var(--ink)').text('男性');
      g.append('text').attr('x', cx + gapC + 4).attr('y', 22).style('font-size', '14px').style('fill', 'var(--ink)').text('女性');
      g.append('text').attr('x', m.l).attr('y', 24).style('font-size', '24px').style('font-weight', 700).style('fill', 'var(--ink)').style('font-family', 'var(--font-data)').text(year + '年');
      const ax = d3.axisBottom(x).ticks(4).tickFormat(d => d3.format('~s')(d));
      g.append('g').attr('class', 'axis').attr('transform', `translate(${cx + gapC},${Hv - m.b + 2})`).call(ax);
      g.append('g').attr('class', 'axis').attr('transform', `translate(${cx - gapC},${Hv - m.b + 2}) scale(-1,1)`).call(ax).selectAll('text').attr('transform', 'scale(-1,1)');
      g.append('text').attr('x', Wv - m.r).attr('y', Hv - 4).attr('text-anchor', 'end').style('font-size', '11px').text('（万人）');
      // 情報
      const st = popStats(P);
      const info = $('.pinfo', ui.side);
      if (info) info.innerHTML = `<div class="card"><div class="small muted">${year}年の人口${S.preset === 'japan' && history.length === 1 ? '（国勢調査のおおよその値）' : '（モデルによる値）'}</div><div class="mono" style="font-size:24px;font-weight:600">${st.tot >= 10000 ? (st.tot / 10000).toFixed(2) + ' 億人' : Math.round(st.tot).toLocaleString() + ' 万人'}</div>
        <div class="legend" style="margin:4px 0"><span><i style="background:#e3a63a"></i>年少人口（0〜14歳）${st.young.toFixed(1)}%</span><span><i style="background:#4f9b4a"></i>生産年齢人口（15〜64歳）${st.work.toFixed(1)}%</span><span><i style="background:#3f7fc0"></i>老年人口（65歳以上）${st.old.toFixed(1)}%</span></div>
        <b>${st.type}</b><br><span class="small">${st.desc}</span></div>`;
      drawTrend();
    }
    function drawTrend() {
      const box = $('.trend', ui.side); if (!box) return;
      box.innerHTML = '';
      const data = history.map(h => ({ year: h.year, ...popStats(h.P) }));
      const W2 = 340, H2 = 150, m = { l: 44, r: 34, t: 10, b: 22 };
      const s = d3.select(box).append('svg').attr('viewBox', `0 0 ${W2} ${H2}`).attr('class', 'chart').style('width', '100%');
      const x = d3.scaleLinear().domain([data[0].year, Math.max(data[0].year + 40, year)]).range([m.l, W2 - m.r]);
      const y = d3.scaleLinear().domain([0, d3.max(data, d => d.tot) * 1.15]).range([H2 - m.b, m.t]);
      const y2 = d3.scaleLinear().domain([0, 50]).range([H2 - m.b, m.t]);
      s.append('g').attr('class', 'axis').attr('transform', `translate(0,${H2 - m.b})`).call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('d')));
      s.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('~s')));
      s.append('g').attr('class', 'axis').attr('transform', `translate(${W2 - m.r},0)`).call(d3.axisRight(y2).ticks(5).tickFormat(d => d + '%'));
      s.append('path').datum(data).attr('d', d3.line().x(d => x(d.year)).y(d => y(d.tot))).attr('fill', 'none').attr('stroke', 'var(--ink)').attr('stroke-width', 2);
      s.append('path').datum(data).attr('d', d3.line().x(d => x(d.year)).y(d => y2(d.old))).attr('fill', 'none').attr('stroke', '#3f7fc0').attr('stroke-width', 2).attr('stroke-dasharray', '5 3');
      s.append('text').attr('x', m.l + 4).attr('y', m.t + 8).text('━ 総人口（万人）　┅ 老年人口の割合');
    }

    let timer = 0;
    function step() { P = popStep(P, cur.tfr, cur.L, cur.mig, cur.ms); year += 5; history.push({ year, P }); draw(); }
    function stop() { clearInterval(timer); timer = 0; const b = $('.playb', ui.side); if (b) b.textContent = '▶ 2100年まで自動'; }

    function renderSide() {
      const pr = POP_PRESETS[S.preset];
      ui.side.innerHTML = `<h2>${pr.name}の人口ピラミッド</h2><p class="lead">つまみを動かしてから「5年進める」。将来の人口の形がどう変わるか予測しよう。</p>
        <div class="pinfo"></div><div class="sliders"></div>
        <div class="row" style="margin-top:8px"><button type="button" class="btn small st">5年進める</button><button type="button" class="btn small ghost playb">▶ 2100年まで自動</button><button type="button" class="btn small ghost rs">${pr.year}年にもどす</button></div>
        <h3>人口の変化</h3><div class="trend"></div>
        <details class="more"><summary>人口転換と、ピラミッドの型</summary><p class="small">経済が発展すると、人口は <b>多産多死 → 多産少死（人口爆発）→ 少産少死</b> と変化する（人口転換）。ピラミッドは <b>富士山型 → つりがね型 → つぼ型</b> へと変わる。都市では若い人が流入する<b>星型</b>、農村では若い人が流出する<b>ひょうたん型</b>になりやすい。</p></details>
        <div class="think"></div>`;
      const sl = $('.sliders', ui.side);
      sl.appendChild(sliderRow('合計特殊出生率', { min: 0.6, max: 7, step: 0.05, value: cur.tfr, fmt: v => v.toFixed(2), onInput: v => { cur.tfr = v; } }));
      sl.appendChild(sliderRow('平均寿命', { min: 35, max: 92, step: 1, value: cur.L, fmt: v => v + '歳', onInput: v => { cur.L = v; } }));
      sl.appendChild(sliderRow('人口移動', { min: -6, max: 12, step: 0.5, value: cur.mig, fmt: v => (v > 0 ? '+' : '') + v + '%', onInput: v => { cur.mig = v; } }));
      sl.appendChild(el('<p class="small muted" style="margin:2px 0">人口移動：5年間に、総人口の何%が外から移り住むか（−は流出）。20〜30代が多く動く。</p>'));
      $('.st', ui.side).addEventListener('click', () => { if (year < 2150) step(); });
      $('.playb', ui.side).addEventListener('click', e => {
        if (timer) return stop();
        e.target.textContent = '❚❚ とめる';
        timer = setInterval(() => { if (year >= 2100) return stop(); step(); }, 450);
      });
      $('.rs', ui.side).addEventListener('click', () => { stop(); reset(); renderSide(); draw(); });
      const TH = {
        japan: { q: '日本の出生率が今のまま（1.26）だと、2100年にピラミッドと人口はどうなるだろう。出生率を2.1に上げた場合や、外国からの人口移動を増やした場合とくらべ、日本がとるべき対策を考えよう。', answer: '今のままでは人口は大きく減り（2100年には今の半分以下）、老年人口の割合は40%をこえる。働く世代が減り、年金・医療を支える負担が重くなる。出生率を上げても効果が出るまでに時間がかかるため、子育て支援（保育所・育児休業・教育費の負担軽減）、高齢者や女性が働きやすい環境づくり、外国人労働者の受け入れと共生のための制度づくりなどを組み合わせる必要がある。' },
        ethiopia: { q: 'エチオピアの出生率が下がっていくと、ピラミッドの形はどう変わるだろう。また、生産年齢人口の割合が高くなる時期に、どのようなチャンスがあるか考えよう。', answer: '出生率が下がると、底の部分が細くなり、富士山型からつりがね型に近づく。子どもの割合が減り、働く世代（生産年齢人口）の割合が高くなる時期は「人口ボーナス」とよばれ、教育や雇用の場が整っていれば経済成長のチャンスになる（かつての日本や東アジア）。' },
        usa: { q: 'アメリカは先進国なのに、日本ほど高齢化が進んでいない。人口移動のつまみを0にした場合とくらべて、理由を説明しよう。', answer: 'アメリカには毎年多くの移民（とくにヒスパニックやアジア系）が流入し、その多くが20〜30代の若い世代で、子どもも生まれるため。移民がいないと、出生率が2.1を下回るため高齢化が速く進む。' },
        china: { q: '中国では1979年から一人っ子政策が行われ、2015年に廃止された。ピラミッドの形から、この政策が残した課題を読み取ろう。', answer: '出生率が急に下がったため、若い世代が少なく、今後急速に高齢化が進む（「豊かになる前に老いる」）。生産年齢人口も減りはじめ、労働力不足や社会保障の負担が問題になる。政策を廃止しても、子育ての費用が高いことなどから出生率は上がっていない。' },
        uae: { q: 'アラブ首長国連邦のピラミッドは、20〜40代の男性がとくに多い。どのような理由が考えられるだろう。', answer: '石油の収入で建設業やサービス業が発展し、南アジア（インド・パキスタン・バングラデシュなど）から多くの男性が出稼ぎ労働者として来ているため。外国人が人口の約9割をしめる。家族を本国に残して働く人が多いので、男女の数が大きくかたよる。' }
      }[S.preset];
      $('.think', ui.side).appendChild(thinkCard(Object.assign({ id: 'pop-' + S.preset, views: ['region', 'inter'] }, TH)));
    }
    renderSide(); draw();
    return () => clearInterval(timer);
  }
});
