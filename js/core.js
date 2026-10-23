/* 地理ラボ：共通の部品（保存・地図・スライダー・考えようカードなど） */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R_EARTH = 6371;

function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

// --- 保存（ブラウザの中だけ。使えないときは保存しないで動く） ---
const store = {
  key: 'geoLab.v1',
  data: null,
  load() { if (this.data) return this.data; try { this.data = JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { this.data = {}; } return this.data; },
  get(k, d) { const v = this.load()[k]; return v === undefined ? d : v; },
  set(k, v) { this.load()[k] = v; try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* 保存できない環境 */ } }
};

// --- 道具の登録 ---
const TOOLS = {};
function registerTool(id, def) { TOOLS[id] = Object.assign({ id }, def); }

// --- 世界地図のデータ ---
const WORLD = (() => {
  const t = window.WORLD_TOPO;
  const countries = topojson.feature(t, t.objects.countries).features;
  countries.forEach(f => { f.jp = countryName(f.id); });
  const borders = topojson.mesh(t, t.objects.countries, (a, b) => a !== b);
  const land = topojson.merge(t, t.objects.countries.geometries);
  return { countries, borders, land, noAnt: countries.filter(f => f.id !== '010') };
})();

// 主な都市（図法・時差で使う）。tz: 標準時（UTCとの差、サマータイムは考えない）
const PLACES = [
  { id: 'tokyo', name: '東京', lon: 139.7, lat: 35.7, tz: 9 },
  { id: 'beijing', name: 'ペキン', lon: 116.4, lat: 39.9, tz: 8 },
  { id: 'singapore', name: 'シンガポール', lon: 103.8, lat: 1.35, tz: 8 },
  { id: 'bangkok', name: 'バンコク', lon: 100.5, lat: 13.75, tz: 7 },
  { id: 'delhi', name: 'デリー', lon: 77.2, lat: 28.6, tz: 5.5 },
  { id: 'dubai', name: 'ドバイ', lon: 55.3, lat: 25.2, tz: 4 },
  { id: 'moscow', name: 'モスクワ', lon: 37.6, lat: 55.8, tz: 3 },
  { id: 'cairo', name: 'カイロ', lon: 31.2, lat: 30.0, tz: 2 },
  { id: 'paris', name: 'パリ', lon: 2.35, lat: 48.9, tz: 1 },
  { id: 'london', name: 'ロンドン', lon: -0.1, lat: 51.5, tz: 0 },
  { id: 'capetown', name: 'ケープタウン', lon: 18.4, lat: -33.9, tz: 2 },
  { id: 'rio', name: 'リオデジャネイロ', lon: -43.2, lat: -22.9, tz: -3 },
  { id: 'buenosaires', name: 'ブエノスアイレス', lon: -58.4, lat: -34.6, tz: -3 },
  { id: 'newyork', name: 'ニューヨーク', lon: -74.0, lat: 40.7, tz: -5 },
  { id: 'chicago', name: 'シカゴ', lon: -87.6, lat: 41.9, tz: -6 },
  { id: 'losangeles', name: 'ロサンゼルス', lon: -118.2, lat: 34.1, tz: -8 },
  { id: 'honolulu', name: 'ホノルル', lon: -157.9, lat: 21.3, tz: -10 },
  { id: 'sydney', name: 'シドニー', lon: 151.2, lat: -33.9, tz: 10 },
  { id: 'auckland', name: 'オークランド', lon: 174.8, lat: -36.8, tz: 12 }
];
const PLACE = Object.fromEntries(PLACES.map(p => [p.id, p]));

// --- 地図を描く ---
// svg: d3 の selection。opts.proj: d3 の図法。opts.antarctica: 南極をふくめるか
function drawBaseMap(svg, proj, opts = {}) {
  const path = d3.geoPath(proj);
  const g = svg.append('g').attr('class', 'mapsvg');
  g.append('path').attr('class', 'sphere').datum({ type: 'Sphere' }).attr('d', path);
  if (opts.graticule !== false) {
    g.append('path').attr('class', 'grat').datum(d3.geoGraticule10()).attr('d', path);
    if (opts.equator !== false) {
      g.append('path').attr('class', 'grat strong').datum({ type: 'LineString', coordinates: d3.range(-180, 181, 2).map(x => [x, 0]) }).attr('d', path);
    }
  }
  const feats = opts.antarctica === false ? WORLD.noAnt : WORLD.countries;
  const cg = g.append('g');
  const cs = cg.selectAll('path').data(feats).join('path').attr('class', 'country').attr('d', path)
    .attr('fill', opts.fill || 'var(--land)');
  return { g, path, countries: cs, proj };
}

// SVG の中の座標（viewBox）をマウスの位置から求める
function svgPoint(svgNode, evt) {
  const pt = svgNode.createSVGPoint();
  const e = evt.touches ? evt.touches[0] : evt;
  pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svgNode.getScreenCTM().inverse());
}

// 道具の画面の骨組み
function toolShell(container, { bar = true, foot = false } = {}) {
  const root = el(`<div class="tool">
    <section class="stage">${bar ? '<div class="stage-bar"></div>' : ''}<div class="svgwrap"></div>${foot ? '<div class="stage-foot"></div>' : ''}</section>
    <aside class="side"></aside></div>`);
  container.appendChild(root);
  const side = $('.side', root);
  mobileTabs(side);
  return { root, stage: $('.stage', root), bar: $('.stage-bar', root), wrap: $('.svgwrap', root), foot: $('.stage-foot', root), side };
}

// スマホでは、説明パネルを見出しごとのタブに分けて、スクロールしなくても見られるようにする
const MOBILE = window.matchMedia('(max-width: 900px)');
function mobileTabs(side) {
  const mo = new MutationObserver(() => tabify());
  function tabify() {
    mo.disconnect();
    const bar = $(':scope > .stabs', side);
    if (bar) {
      // あとから足された部品は、今開いているタブに入れる
      const cur = $(':scope > .spane:not([hidden])', side);
      Array.from(side.children).filter(c => !c.classList.contains('stabs') && !c.classList.contains('spane')).forEach(c => cur && cur.appendChild(c));
    } else {
      const groups = [{ name: '説明', items: [] }];
      Array.from(side.children).forEach(c => {
        if (c.tagName === 'H3') groups.push({ name: c.textContent.replace(/（.*?）/g, ''), items: [c] });
        else if (c.classList.contains('think') && !c.classList.contains('card')) { if (c.childElementCount) groups.push({ name: '考えよう', items: [c], think: true }); }
        else groups[groups.length - 1].items.push(c);
      });
      const gs = groups.filter(g => g.items.length && g.items.some(x => x.tagName !== 'H3' || g.items.length > 1));
      if (gs.length > 1) {
        const tabs = el('<div class="stabs" role="tablist"></div>');
        const want = gs.some(g => g.name === side._tab) ? side._tab : gs[0].name;
        side.innerHTML = '';
        side.appendChild(tabs);
        gs.forEach(g => {
          const pane = el('<div class="spane"></div>');
          g.items.forEach(x => pane.appendChild(x));
          pane.hidden = g.name !== want;
          const b = el(`<button type="button" class="${g.think ? 'th' : ''}" aria-selected="${g.name === want}">${esc(g.name)}</button>`);
          b.addEventListener('click', () => {
            side._tab = g.name;
            $$(':scope > .spane', side).forEach(p => { p.hidden = p !== pane; });
            $$('button', tabs).forEach(x => x.setAttribute('aria-selected', String(x === b)));
            side.scrollTop = 0;
          });
          tabs.appendChild(b); side.appendChild(pane);
        });
      }
    }
    mo.observe(side, { childList: true });
  }
  mo.observe(side, { childList: true });
}

function seg(options, value, onChange) {
  const box = el('<div class="seg" role="group"></div>');
  const set = v => { value = v; $$('button', box).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v)))); };
  options.forEach(o => {
    const b = el(`<button type="button" data-v="${esc(o.v)}">${o.label}</button>`);
    if (o.title) b.title = o.title;
    b.addEventListener('click', () => { set(o.v); onChange(o.v); });
    box.appendChild(b);
  });
  set(value);
  box.setValue = set;
  return box;
}

function toggleChip(label, on, onChange) {
  const b = el(`<button type="button" class="chip" aria-pressed="${on}">${label}</button>`);
  b.addEventListener('click', () => { on = !on; b.setAttribute('aria-pressed', String(on)); onChange(on); });
  return b;
}

function sliderRow(label, { min, max, step, value, fmt = v => v, onInput }) {
  const row = el(`<div class="slider-row"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output></output></div>`);
  const inp = $('input', row), out = $('output', row);
  const show = () => { out.textContent = fmt(+inp.value); };
  inp.addEventListener('input', () => { show(); onInput(+inp.value); });
  show();
  row.input = inp;
  row.setValue = v => { inp.value = v; show(); };
  return row;
}

function selectBox(options, value, onChange) {
  const s = el('<select></select>');
  options.forEach(o => {
    if (o.group) {
      const og = document.createElement('optgroup'); og.label = o.group;
      o.items.forEach(i => og.appendChild(new Option(i.label, i.v)));
      s.appendChild(og);
    } else s.appendChild(new Option(o.label, o.v));
  });
  s.value = value;
  s.addEventListener('change', () => onChange(s.value));
  return s;
}

// --- 地理的な見方・考え方（学習指導要領） ---
const VIEWS = {
  pos: '位置や分布',
  place: '場所',
  env: '人間と自然環境との相互依存関係',
  inter: '空間的相互依存作用',
  region: '地域'
};
function viewTags(keys) { return (keys || []).map(k => `<span class="tag v">${VIEWS[k]}</span>`).join(''); }

// 考えようカード：自分の考えを書く → 解答例と、自分でふりかえるチェック
function thinkCard({ id, q, hint, answer, views, points }) {
  const saved = store.get('think', {})[id] || '';
  const card = el(`<div class="card think">
    <b>考えよう</b> ${viewTags(views)}
    <p style="margin:6px 0">${q}</p>
    ${hint ? `<details class="more"><summary>ヒント</summary><p class="small">${hint}</p></details>` : ''}
    <textarea placeholder="資料から読み取ったこと（根拠）→ 考えたこと（理由）→ 結論 の順に書いてみよう"></textarea>
    <div class="row" style="margin-top:6px"><button type="button" class="btn small">解答例とふりかえり</button><span class="small muted saved"></span></div>
    <div class="ans" hidden></div>
  </div>`);
  const ta = $('textarea', card), ans = $('.ans', card), msg = $('.saved', card);
  ta.value = saved;
  ta.addEventListener('input', () => {
    const all = store.get('think', {}); all[id] = ta.value; store.set('think', all);
    msg.textContent = `${ta.value.length}字・自動で保存`;
  });
  $('button', card).addEventListener('click', () => {
    const checks = (points || ['資料（地図・グラフ・統計）から読み取ったことを根拠にした', '説明で学んだ知識（用語）を使って「なぜそうなるのか」を説明した', '結論をはっきり書いた']);
    const done = store.get('checks', {})[id] || [];
    ans.innerHTML = `<div class="card ok" style="background:var(--panel)"><b>解答例</b><p style="margin:4px 0">${answer}</p></div>
      <p class="small" style="margin:6px 0 2px"><b>ふりかえり</b>（自分の答えにあてはまるものをチェック）</p>
      ${checks.map((c, i) => `<label class="small" style="display:block"><input type="checkbox" data-i="${i}" ${done[i] ? 'checked' : ''}> ${c}</label>`).join('')}`;
    ans.hidden = false;
    $$('input[type=checkbox]', ans).forEach(cb => cb.addEventListener('change', () => {
      const all = store.get('checks', {}); const arr = all[id] || []; arr[+cb.dataset.i] = cb.checked; all[id] = arr; store.set('checks', all);
      card.dispatchEvent(new Event('checks'));
    }));
  });
  return card;
}

// 下のバー：左＝もどる、まん中＝進みぐあい、右＝次へ。どの画面でも同じ場所に出す
function makeFoot() {
  const f = el('<div class="lfoot"><span class="fl"></span><span class="fc"></span><span class="fr"></span></div>');
  const btn = (o, cls) => {
    if (!o) return '';
    const b = el(`<button type="button" class="btn ${cls}">${o.label}</button>`);
    b.disabled = !!o.disabled; if (o.fn) b.addEventListener('click', o.fn);
    return b;
  };
  f.set = ({ left, center, right }) => {
    const L = $('.fl', f), C = $('.fc', f), R = $('.fr', f);
    L.innerHTML = ''; C.innerHTML = center || ''; R.innerHTML = '';
    if (left) L.appendChild(btn(left, 'ghost'));
    if (right) R.appendChild(btn(right, ''));
  };
  f.enableRight = (label) => { const b = $('.fr .btn', f); if (b) { b.disabled = false; if (label) b.innerHTML = label; b.classList.add('pulse'); } };
  return f;
}

// 選択問題（1問）。onDone(正解か)
function choiceQuestion(container, { q, choices, a, exp, figure, plain, expFig }, onDone) {
  const box = el(`<div class="qbox"><div class="qtext" style="font-size:16px;margin:4px 0 6px">${q}</div><div class="qfig"></div><div class="choices"></div><div class="exp"></div></div>`);
  if (figure) $('.qfig', box).appendChild(figure);
  const cb = $('.choices', box);
  if (choices.every(c => String(c).length <= 14) && choices.length === 4) cb.classList.add('grid2');
  choices.forEach((c, i) => {
    const b = el(`<button type="button">${plain ? '' : `<span class="mono muted">${'アイウエオカ'[i]}</span>　`}${c}</button>`);
    b.addEventListener('click', () => {
      $$('button', cb).forEach((x, j) => { x.disabled = true; if (j === a) x.classList.add('is-right'); });
      const ok = i === a;
      if (!ok) b.classList.add('is-wrong');
      $('.exp', box).innerHTML = `<div class="card ${ok ? 'ok' : 'ng'}"><b>${ok ? '正解！' : `ざんねん… 正解は ${plain ? choices[a] : 'アイウエオカ'[a]}`}</b>${exp ? `<p style="margin:4px 0 0">${exp}</p>` : ''}</div>`;
      // 解説の図（地図・グラフ）
      const ef = expFig && typeof fig === 'function' ? fig(expFig) : null;
      if (ef) $('.exp .card', box).appendChild(ef);
      onDone && onDone(ok);
    });
    cb.appendChild(b);
  });
  container.appendChild(box);
  return box;
}

// 雨温図（棒：降水量、折れ線：気温）。city2 があれば重ねて比べる
function climateChart(city, opts = {}) {
  const W = 360, H = 230, m = { l: 34, r: 38, t: 14, b: 26 };
  const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'chart').style('width', '100%').style('max-width', '420px');
  const months = d3.range(12);
  const list = [city].concat(opts.compare ? [opts.compare] : []);
  const tMin = Math.min(-10, Math.floor(d3.min(list, c => d3.min(c.t)) / 10) * 10);
  const tMax = Math.max(30, Math.ceil(d3.max(list, c => d3.max(c.t)) / 10) * 10);
  const pMax = Math.max(300, Math.ceil(d3.max(list, c => d3.max(c.p)) / 100) * 100);
  const x = d3.scaleBand().domain(months).range([m.l, W - m.r]).padding(0.18);
  const yT = d3.scaleLinear().domain([tMin, tMax]).range([H - m.b, m.t]);
  const yP = d3.scaleLinear().domain([0, pMax]).range([H - m.b, m.t]);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(yT).ticks(6).tickSize(-(W - m.l - m.r))).call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.5)).call(g => g.select('.domain').remove());
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${W - m.r},0)`).call(d3.axisRight(yP).ticks(6)).call(g => g.select('.domain').remove());
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickFormat(i => i + 1)).call(g => g.select('.domain').remove());
  svg.append('text').attr('x', 4).attr('y', 10).text('気温(℃)').attr('fill', '#d2452f');
  svg.append('text').attr('x', W - 4).attr('y', 10).attr('text-anchor', 'end').text('降水量(mm)').attr('fill', '#2f78c4');
  svg.append('text').attr('x', W / 2).attr('y', H - 1).attr('text-anchor', 'middle').text('（月）');
  if (yT(0) > m.t && yT(0) < H - m.b) svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', yT(0)).attr('y2', yT(0)).attr('stroke', 'var(--muted)').attr('stroke-width', 1);
  list.forEach((c, k) => {
    const bw = x.bandwidth() / list.length;
    svg.append('g').selectAll('rect').data(c.p).join('rect')
      .attr('x', (d, i) => x(i) + k * bw).attr('width', bw).attr('y', d => yP(d)).attr('height', d => yP(0) - yP(d))
      .attr('fill', k ? 'rgba(47,120,196,.35)' : '#2f78c4').attr('stroke', k ? '#2f78c4' : 'none').attr('stroke-dasharray', k ? '2 2' : null);
    svg.append('path').datum(c.t).attr('fill', 'none').attr('stroke', '#d2452f').attr('stroke-width', k ? 2 : 2.6).attr('stroke-dasharray', k ? '5 4' : null)
      .attr('d', d3.line().x((d, i) => x(i) + x.bandwidth() / 2).y(d => yT(d)));
    svg.append('g').selectAll('circle').data(c.t).join('circle').attr('r', k ? 2 : 3).attr('fill', '#d2452f')
      .attr('cx', (d, i) => x(i) + x.bandwidth() / 2).attr('cy', d => yT(d));
  });
  return svg.node();
}

// ハイサーグラフ（横：降水量、たて：気温。1月→12月を線で結ぶ）
function hytherChart(city, opts = {}) {
  const W = 360, H = 230, m = { l: 34, r: 14, t: 14, b: 30 };
  const list = [city].concat(opts.compare ? [opts.compare] : []);
  const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'chart').style('width', '100%').style('max-width', '420px');
  const tMin = Math.min(-10, Math.floor(d3.min(list, c => d3.min(c.t)) / 10) * 10);
  const tMax = Math.max(30, Math.ceil(d3.max(list, c => d3.max(c.t)) / 10) * 10);
  const pMax = Math.max(300, Math.ceil(d3.max(list, c => d3.max(c.p)) / 100) * 100);
  const x = d3.scaleLinear().domain([0, pMax]).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain([tMin, tMax]).range([H - m.b, m.t]);
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickSize(-(W - m.l - m.r))).call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.5)).call(g => g.select('.domain').remove());
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(6)).call(g => g.select('.domain').remove());
  svg.append('text').attr('x', 4).attr('y', 10).text('気温(℃)');
  svg.append('text').attr('x', W - m.r).attr('y', H - 2).attr('text-anchor', 'end').text('降水量(mm)');
  list.forEach((c, k) => {
    const pts = c.t.map((t, i) => [x(c.p[i]), y(t)]);
    svg.append('path').attr('d', d3.line().curve(d3.curveLinearClosed)(pts)).attr('fill', 'none').attr('stroke', k ? '#8a5bd0' : 'var(--accent)').attr('stroke-width', 2).attr('stroke-dasharray', k ? '5 4' : null);
    pts.forEach((p, i) => {
      svg.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 7.5).attr('fill', 'var(--panel)').attr('stroke', k ? '#8a5bd0' : 'var(--accent)');
      svg.append('text').attr('x', p[0]).attr('y', p[1] + 3.5).attr('text-anchor', 'middle').text(i + 1).style('fill', 'var(--ink)').style('font-size', '9px');
    });
  });
  return svg.node();
}

// 2地点の大圏距離（km）と、はじめに進む方位（北から時計回り、度）
function gcDistance(a, b) { return d3.geoDistance(a, b) * R_EARTH; }
function gcBearing(a, b) {
  const [l1, p1] = a.map(d => d * Math.PI / 180), [l2, p2] = b.map(d => d * Math.PI / 180);
  const y = Math.sin(l2 - l1) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(l2 - l1);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
// ある地点から、方位 brg（度）に距離 dist（km）進んだ地点
function gcDestination(a, brg, dist) {
  const d = dist / R_EARTH, b = brg * Math.PI / 180, l1 = a[0] * Math.PI / 180, p1 = a[1] * Math.PI / 180;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [((l2 * 180 / Math.PI + 540) % 360) - 180, p2 * 180 / Math.PI];
}
function bearingName(b) { return ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'][Math.round(b / 22.5) % 16]; }

// ケッペンの気候区分（高校の教科書の判定の順）
function koppen(city) {
  const t = city.t, p = city.p, south = city.lat < 0;
  const P = d3.sum(p), T = d3.mean(t);
  const tMax = d3.max(t), tMin = d3.min(t);
  const sum = south ? [9, 10, 11, 0, 1, 2] : [3, 4, 5, 6, 7, 8]; // 夏の半年（4〜9月。南半球は10〜3月）
  const win = d3.range(12).filter(i => !sum.includes(i));
  const pS = sum.map(i => p[i]), pW = win.map(i => p[i]);
  const isS = d3.min(pS) < 30 && d3.min(pS) * 3 < d3.max(pW);
  const isW = d3.min(pW) * 10 < d3.max(pS);
  let r, rType;
  if (isS && !isW) { r = 20 * T; rType = '冬に雨が多い：r = 20t'; }
  else if (isW && !isS) { r = 20 * (T + 14); rType = '夏に雨が多い：r = 20(t + 14)'; }
  else { r = 20 * (T + 7); rType = '一年中雨が降る：r = 20(t + 7)'; }
  const steps = [];
  const out = (code, name) => ({ code, name, group: code[0], steps, P, T, tMax, tMin, r, rType, isS, isW });
  steps.push({ q: '年降水量は乾燥限界 r より多い？', v: `年降水量 ${Math.round(P)} mm、r = ${Math.round(r)} mm（${rType}、t は年平均気温 ${T.toFixed(1)}℃）`, yes: P >= r });
  if (P < r) {
    steps.push({ q: '年降水量は r の半分より多い？', v: `${Math.round(P)} mm と ${Math.round(r / 2)} mm をくらべる`, yes: P >= r / 2 });
    return P < r / 2 ? out('BW', '砂漠気候') : out('BS', 'ステップ気候');
  }
  steps.push({ q: '最暖月の平均気温は 10℃以上？', v: `最暖月 ${tMax.toFixed(1)}℃`, yes: tMax >= 10 });
  if (tMax < 10) {
    steps.push({ q: '最暖月の平均気温は 0℃以上？', v: `最暖月 ${tMax.toFixed(1)}℃`, yes: tMax >= 0 });
    return tMax >= 0 ? out('ET', 'ツンドラ気候') : out('EF', '氷雪気候');
  }
  steps.push({ q: '最寒月の平均気温は 18℃以上？', v: `最寒月 ${tMin.toFixed(1)}℃`, yes: tMin >= 18 });
  if (tMin >= 18) {
    const dry = d3.min(p);
    steps.push({ q: '最少雨月の降水量は 60 mm 以上？', v: `最少雨月 ${dry} mm`, yes: dry >= 60 });
    if (dry >= 60) return out('Af', '熱帯雨林気候');
    const am = 100 - P / 25;
    steps.push({ q: `最少雨月の降水量は「100 − 年降水量÷25」（${am.toFixed(0)} mm）以上？`, v: `最少雨月 ${dry} mm（以上なら弱い乾季のある熱帯雨林気候）`, yes: dry >= am });
    return dry >= am ? out('Am', '熱帯モンスーン気候') : out('Aw', 'サバナ気候');
  }
  steps.push({ q: '最寒月の平均気温は −3℃以上？', v: `最寒月 ${tMin.toFixed(1)}℃`, yes: tMin >= -3 });
  const C = tMin >= -3;
  steps.push({ q: '夏に乾燥する？（夏の最少雨月が 30mm 未満で、冬の最多雨月の 1/3 未満）', v: `夏の最少雨月 ${d3.min(pS)} mm、冬の最多雨月 ${d3.max(pW)} mm`, yes: isS });
  if (!isS) steps.push({ q: '冬に乾燥する？（冬の最少雨月が、夏の最多雨月の 1/10 未満）', v: `冬の最少雨月 ${d3.min(pW)} mm、夏の最多雨月 ${d3.max(pS)} mm`, yes: isW });
  const third = isS ? 's' : isW ? 'w' : 'f';
  const fourth = tMax >= 22 ? 'a' : 'b';
  steps.push({ q: '最暖月の平均気温は 22℃以上？', v: `最暖月 ${tMax.toFixed(1)}℃（以上なら a、未満なら b）`, yes: tMax >= 22 });
  if (C) {
    const name = { s: '地中海性気候', w: '温暖冬季少雨気候', f: fourth === 'a' ? '温暖湿潤気候' : '西岸海洋性気候' }[third];
    return out('C' + third + fourth, name);
  }
  const name = third === 'w' ? '亜寒帯冬季少雨気候' : '亜寒帯湿潤気候';
  return out('D' + (third === 's' ? 'f' : third) + fourth, name);
}
const KG_COLOR = { A: '#d9473b', B: '#e3a63a', C: '#4f9b4a', D: '#3f7fc0', E: '#8c9bb0', H: '#9a64c6' };
const KG_NAME = { A: '熱帯', B: '乾燥帯', C: '温帯', D: '亜寒帯（冷帯）', E: '寒帯', H: '高山気候' };
function climateGroupOf(city) { return city.alt && city.alt > 2000 ? 'H' : koppen(city).group; }
