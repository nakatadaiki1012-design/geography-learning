/* 挑戦：資料読み取り（共通テストのように、資料から根拠を見つけて判断する）と白地図クイズ */

function miniMap(points, opts = {}) {
  const W = 420, H = 220;
  const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).style('width', '100%').style('max-width', '460px').style('display', 'block').style('margin', '4px 0');
  const proj = d3.geoNaturalEarth1().rotate([-10, 0]).fitExtent([[4, 4], [W - 4, H - 4]], { type: 'Sphere' });
  const base = drawBaseMap(svg, proj, { antarctica: false });
  points.forEach(p => {
    const q = proj([p.lon, p.lat]);
    base.g.append('circle').attr('cx', q[0]).attr('cy', q[1]).attr('r', 4).attr('fill', 'var(--shu)').attr('stroke', 'var(--panel)');
    base.g.append('text').attr('class', 'lbl').attr('x', q[0] + 5).attr('y', q[1] - 3).style('font-weight', 700).style('font-size', '13px').text(p.label);
  });
  return svg.node();
}

function miniPyramid(P) {
  const W = 300, H = 190, cx = W / 2, gap = 16;
  const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'chart').style('width', '100%').style('max-width', '340px');
  const tot = d3.sum(P.M) + d3.sum(P.F);
  const M = P.M.map(v => v / tot * 100), F = P.F.map(v => v / tot * 100);
  const x = d3.scaleLinear().domain([0, Math.max(d3.max(M), d3.max(F)) * 1.05]).range([0, cx - gap - 6]);
  const y = d3.scaleBand().domain(d3.range(AGE_N)).range([H - 14, 6]).padding(0.08);
  svg.selectAll('.m').data(M).join('rect').attr('x', d => cx - gap - x(d)).attr('y', (d, i) => y(i)).attr('width', d => x(d)).attr('height', y.bandwidth()).attr('fill', '#3f7fc0');
  svg.selectAll('.f').data(F).join('rect').attr('x', cx + gap).attr('y', (d, i) => y(i)).attr('width', d => x(d)).attr('height', y.bandwidth()).attr('fill', '#d9473b');
  [0, 4, 8, 12, 16, 20].forEach(i => svg.append('text').attr('x', cx).attr('y', y(i) + y.bandwidth()).attr('text-anchor', 'middle').text(i === 20 ? '100' : i * 5));
  svg.append('text').attr('x', 4).attr('y', H - 2).text('男性（%）'); svg.append('text').attr('x', W - 4).attr('y', H - 2).attr('text-anchor', 'end').text('女性（%）');
  return svg.node();
}

const READ_GEN = {
  climate() {
    const target = pick(CITIES.filter(c => !c.alt && c.id !== 'showa'));
    const tg = koppen(target);
    const others = shuffle(CITIES.filter(c => c.id !== target.id && !c.alt && c.id !== 'showa' && koppen(c).code !== tg.code && koppen(c).group !== tg.group)).slice(0, 3);
    const opts = shuffle([target].concat(others));
    const fig = document.createElement('div');
    fig.appendChild(climateChart(target));
    fig.appendChild(miniMap(opts.map((c, i) => ({ lon: c.lon, lat: c.lat, label: 'アイウエ'[i] }))));
    const st = tg.steps.slice(0, 3).map(s => s.v).join('／');
    return {
      q: '次の雨温図は、地図中のア〜エのどの都市のものか。', figure: fig,
      choices: opts.map(c => `${c.name}（${c.country}）`), a: opts.indexOf(target),
      exp: `${target.name}は <b>${tg.code} ${tg.name}</b>。読み取りの根拠：${st}。${target.lat < 0 ? '南半球なので、6〜8月が冬になる。' : ''}${target.life}`
    };
  },
  stats() {
    const rel = INDICATORS.filter(i => i.kind === 'rel');
    for (let tries = 0; tries < 50; tries++) {
      const four = shuffle(COUNTRIES).filter((c, i, a) => a.findIndex(d => d.reg === c.reg) === i).slice(0, 4);
      const target = four[0];
      const inds = shuffle(rel).slice(0, 3);
      const ext = inds.map(I => { const vals = four.map(c => indicatorValue(c, I)); const v = indicatorValue(target, I); return v === d3.max(vals) ? 'max' : v === d3.min(vals) ? 'min' : null; });
      if (!ext.some(Boolean)) continue;
      const rows = shuffle(four);
      const tbl = el(`<table class="tbl" style="max-width:460px"><tr><th></th>${inds.map(I => `<th>${I.name}${I.unit ? `（${I.unit}）` : ''}</th>`).join('')}</tr>
        ${rows.map((c, i) => `<tr><td><b>${'アイウエ'[i]}</b></td>${inds.map(I => `<td class="n">${I.fmt(indicatorValue(c, I))}</td>`).join('')}</tr>`).join('')}</table>`);
      const why = inds.map((I, k) => ext[k] ? `${I.name}が4か国の中でもっとも${ext[k] === 'max' ? '高い' : '低い'}（${I.fmt(indicatorValue(target, I))}${I.unit}）` : null).filter(Boolean).join('、');
      return {
        q: `次の表は、${rows.map(c => c.jp).join('・')}の統計である。<b>${target.jp}</b>に当たるものはア〜エのどれか。`, figure: tbl, plain: true,
        choices: ['ア', 'イ', 'ウ', 'エ'], a: rows.indexOf(target),
        exp: `${target.jp}は、${why}。ア〜エは ${rows.map((c, i) => `${'アイウエ'[i]}＝${c.jp}`).join('、')}。数字の大小だけでなく「なぜその国でその値になるのか」を説明できるようにしよう。`
      };
    }
  },
  mapType() {
    const absI = ['国別の人口', '国別の米の生産量', '国別の自動車の生産台数', '国別の二酸化炭素の総排出量', '都市別の観光客数'];
    const relI = ['人口密度', '65歳以上の人口の割合', '1人当たりGNI', '都市人口率', '人口1000人当たりの医師の数'];
    const choro = Math.random() < 0.5;
    const right = pick(choro ? relI : absI), wrong = shuffle(choro ? absI : relI).slice(0, 3);
    const choices = shuffle([right].concat(wrong));
    return {
      q: `次の統計を世界地図に表すとき、<b>${choro ? '階級区分図（色の濃さで表す地図）' : '図形表現図（円などの大きさで表す地図）'}</b>で表すのが適しているものはどれか。`,
      choices, a: choices.indexOf(right),
      exp: choro ? `「${right}」は割合や1人当たりなどの<b>相対値</b>なので、国の大きさに関係なく比べられる階級区分図が適する。人口や生産量などの<b>絶対値</b>を色の濃さで表すと、面積の広い国が目立ってしまう。` : `「${right}」は量そのものを表す<b>絶対値</b>なので、円の大きさで表す図形表現図が適する。割合などの相対値は階級区分図で表す。`
    };
  },
  time() {
    const [A, B] = shuffle(PLACES.filter(p => Number.isInteger(p.tz))).slice(0, 2);
    const at = pick([1, 6, 9, 15, 20, 23]);
    const diff = B.tz - A.tz, res = at + diff, ds = dayShift(res);
    const fmt = h => `${['前日', '同じ日', '翌日'][dayShift(h) + 1] || ''}の${((h % 24) + 24) % 24}時`;
    const cand = [res, at - diff, res + 24, res - 24, res + 12].map(fmt);
    const choices = shuffle(Array.from(new Set([fmt(res)].concat(cand))).slice(0, 4));
    return {
      q: `${A.name}（標準時子午線 ${meridianText(A.tz)}）が1月1日の${at}時のとき、${B.name}（標準時子午線 ${meridianText(B.tz)}）は何日の何時か。`,
      choices: choices.map(c => c.replace('同じ日', '1月1日').replace('前日', '12月31日').replace('翌日', '1月2日')), a: choices.indexOf(fmt(res)),
      exp: `経度15°で1時間の時差。${A.name}と${B.name}の時差は ${Math.abs(diff)} 時間で、${B.name}のほうが${diff >= 0 ? '進んでいる（東にある）' : '遅れている（西にある）'}。${at}時 ${diff >= 0 ? '＋' : '−'} ${Math.abs(diff)}時間 ＝ ${fmt(res)}。`
    };
  },
  pyramid() {
    const ids = ['japan', 'ethiopia', 'usa', 'uae'];
    const id = pick(ids);
    const fig = miniPyramid(buildPreset(id));
    const choices = ids.map(i => POP_PRESETS[i].name);
    const why = { japan: '0〜14歳が少なく、65歳以上が多いつぼ型。70代前半（第1次ベビーブーム）と40代後半（第2次ベビーブーム）がふくらんでいる。', ethiopia: '下ほど広い富士山型で、子どもの割合が高い。出生率が高く、平均寿命が短い発展途上国の形。', usa: '先進国だが、底がそれほど細くないつりがね型。移民が多く、出生率も先進国の中では比較的高い。', uae: '20〜40代の男性が極端に多い。南アジアなどからの出稼ぎ労働者が多いため。' }[id];
    return { q: '次の人口ピラミッド（モデルによる）に当てはまる国はどれか。', figure: fig, choices, a: ids.indexOf(id), exp: why };
  },
  fixed() {
    return pick(READ_FIXED);
  }
};
const READ_FIXED = [
  { q: '東京からの距離と方位が正しい地図を使って、東京から見たブエノスアイレスの方位を調べたい。最も適した図法はどれか。', choices: ['メルカトル図法', '東京を中心とする正距方位図法', 'モルワイデ図法', 'サンソン図法'], a: 1, exp: '正距方位図法は、図の中心からの距離と方位が正しい。目的に合わせて図法を選ぶことが大切。' },
  { q: '次の大地形のうち、地震や火山の活動が最も活発なものはどれか。', choices: ['安定陸塊のカナダ楯状地', '古期造山帯のウラル山脈', '新期造山帯のアンデス山脈', '古期造山帯のアパラチア山脈'], a: 2, exp: 'アンデス山脈は環太平洋造山帯にあり、南アメリカプレートの下にナスカプレートが沈みこむ狭まる境界にある。' },
  { q: 'ある都市は、高緯度にありながら冬でも平均気温が0℃を下回らない。この理由として最も適当なものはどれか。', choices: ['大陸の東岸にあり、冬に季節風が吹くから', '大陸の西岸にあり、暖流の上を吹く偏西風の影響を受けるから', '標高が高い所にあるから', '赤道に近いから'], a: 1, exp: '西ヨーロッパの都市（ロンドン・パリなど）は、北大西洋海流（暖流）と偏西風のおかげで、高緯度のわりに冬が温和（西岸海洋性気候）。' },
  { q: '扇状地の扇央が、水田ではなく果樹園や畑に利用されることが多い理由として最も適当なものはどれか。', choices: ['土地が低く、水がたまりやすいから', '砂や小石が多く水はけがよいため、水が得にくいから', '海に近く塩分が多いから', '火山灰が厚くつもっているから'], a: 1, exp: '扇央は川の水が地下にしみこみやすく（水無川）、水を得にくい。扇端では地下水がわき出すため集落や水田が多い。' },
  { q: '洪水のハザードマップで、浸水が深く想定されやすい地形はどれか。', choices: ['台地の上', '自然堤防', '後背湿地や旧河道', '山地の尾根'], a: 2, exp: '後背湿地や旧河道は周りより低く、水がたまりやすい。自然堤防はまわりより少し高く、古くから集落がつくられてきた。' },
  { q: '発展途上国の大都市で、農村から人口が急に流入した結果として起こりやすい問題はどれか。', choices: ['ドーナツ化現象による都心の人口減少', 'スラムの形成や交通渋滞', '過疎化による学校の閉校', 'インナーシティの再開発（ジェントリフィケーション）'], a: 1, exp: '仕事を求めて農村から人々が流入しても、住宅や雇用、上下水道の整備が追いつかず、スラムや交通渋滞、大気汚染などの都市問題が起こる。' },
  { q: '1人当たりGNIが高い国ほど合計特殊出生率が低い傾向がある。その理由として適当でないものはどれか。', choices: ['乳幼児死亡率が下がり、多く産む必要がなくなるから', '教育費が高くなり、子育ての負担が大きくなるから', '女性の社会進出が進み、結婚や出産の時期が遅くなるから', '農業で働く子どもの労働力が必要になるから'], a: 3, exp: '子どもを労働力として必要とするのは、農業中心の発展途上国で出生率が高い理由。先進国では当てはまらない。' },
  { q: '地中海性気候の地域で、夏に乾燥する理由として最も適当なものはどれか。', choices: ['夏に亜熱帯高圧帯におおわれるから', '夏に偏西風が強まるから', '夏に寒流の上を季節風が吹くから', '夏に熱帯収束帯（赤道低圧帯）に入るから'], a: 0, exp: '夏は亜熱帯高圧帯が北上しておおわれるので乾燥し、冬は偏西風や前線の影響で雨が降る。' }
];

registerTool('reading', {
  name: '資料読み取り',
  render(container) {
    const root = el(`<div class="lessons"><div class="lesson"><div class="lesson-head"><div><span class="no">挑戦</span><h2>資料読み取りチャレンジ</h2></div></div>
      <p class="lead" style="font-size:14px">雨温図・統計表・人口ピラミッドなどの資料から<b>根拠</b>を見つけて答える、思考・判断の練習（1回10問）。</p>
      <div class="q"></div></div></div>`);
    container.appendChild(root);
    const box = $('.q', root);
    let list, i, score;
    function start() {
      const kinds = shuffle(['climate', 'climate', 'stats', 'stats', 'mapType', 'time', 'pyramid', 'fixed', 'fixed', 'fixed']);
      const used = new Set();
      list = kinds.map(k => { let q; for (let n = 0; n < 10; n++) { q = READ_GEN[k](); if (!used.has(q.q)) break; } used.add(q.q); return q; });
      i = 0; score = 0; show();
    }
    function show() {
      box.innerHTML = '';
      if (i >= list.length) {
        const best = Math.max(store.get('bestReading', 0), score); store.set('bestReading', best);
        box.innerHTML = `<div class="card ok" style="text-align:center"><div style="font-size:22px;font-family:var(--font-display);font-weight:800">${score} / ${list.length} 問 正解</div><p class="small muted">自己ベスト ${best} 問</p>${score >= 8 ? '<span class="hanko">合格</span>' : ''}</div>`;
        const b = el('<button type="button" class="btn">もう一度（問題が変わります）</button>'); b.addEventListener('click', start); box.appendChild(b);
        return;
      }
      box.appendChild(el(`<p class="small muted">第 ${i + 1} 問 / ${list.length}　正解 ${score}</p>`));
      choiceQuestion(box, list[i], ok => {
        if (ok) score++;
        const nb = el(`<button type="button" class="btn" style="margin-top:8px">${i + 1 < list.length ? '次の問題 →' : '結果を見る'}</button>`);
        nb.addEventListener('click', () => { i++; show(); });
        box.appendChild(nb);
      });
    }
    start();
    return () => {};
  }
});

registerTool('mapquiz', {
  name: '白地図クイズ',
  render(container, params = {}) {
    const S = { level: 'basic', region: 'all' };
    const ui = toolShell(container, { foot: true });
    const W = 960, H = 500;
    const svg = d3.select(ui.wrap).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const proj = d3.geoNaturalEarth1().rotate([-10, 0]).fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' });
    const zg = svg.append('g');
    const base = drawBaseMap(zg, proj, { antarctica: false });
    const zoom = d3.zoom().scaleExtent([1, 12]).on('zoom', ev => zg.attr('transform', ev.transform));
    svg.call(zoom).on('dblclick.zoom', null);
    ui.foot.innerHTML = '<span>ホイール・ピンチで拡大、ドラッグで移動。国をクリックして答える。</span>';
    ui.bar.appendChild(seg([{ v: 'basic', label: 'きほん（48か国）' }, { v: 'all', label: 'たくさん（110か国）' }], S.level, v => { S.level = v; start(); }));
    ui.bar.appendChild(selectBox([{ v: 'all', label: '世界全体' }].concat(Object.keys(REGIONS).map(k => ({ v: k, label: REGIONS[k] }))), S.region, v => { S.region = v; start(); }));
    const zb = el('<button type="button" class="chip">拡大をもどす</button>'); zb.addEventListener('click', () => svg.transition().call(zoom.transform, d3.zoomIdentity)); ui.bar.appendChild(zb);
    let qs, i, score, locked = false, wrongOnce = false;
    function pool() {
      const ids = S.level === 'basic' ? COUNTRIES.map(c => c.id) : WORLD.noAnt.filter(f => f.jp).map(f => f.id);
      return ids.filter(id => S.region === 'all' || (C_BY_ID[id] && C_BY_ID[id].reg === S.region) || (!C_BY_ID[id] && S.region === 'all'));
    }
    function start() {
      const p = pool();
      qs = shuffle(p).slice(0, Math.min(10, p.length)); i = 0; score = 0; locked = false; wrongOnce = false;
      base.countries.attr('fill', 'var(--land)'); renderSide();
    }
    base.countries.style('cursor', 'pointer').on('click', (ev, f) => {
      if (locked || i >= qs.length) return;
      const ans = qs[i];
      if (f.id === ans) {
        if (!wrongOnce) score++;
        d3.select(ev.currentTarget).attr('fill', wrongOnce ? '#e3a63a' : '#4f9b4a');
        locked = true; renderSide(`<div class="card ok"><b>${countryName(ans)}</b> ${wrongOnce ? '（2回目で正解）' : '正解！'}</div>`);
      } else {
        wrongOnce = true;
        d3.select(ev.currentTarget).attr('fill', '#e0533d').transition().delay(700).attr('fill', 'var(--land)');
        renderSide(`<div class="card ng">そこは <b>${f.jp || '（名前なし）'}</b>。もう一度さがそう。${C_BY_ID[ans] ? `<br><span class="small">ヒント：${REGIONS[C_BY_ID[ans].reg]}・首都 ${C_BY_ID[ans].cap}</span>` : ''}</div>`, true);
      }
    });
    function renderSide(msg = '', retry = false) {
      if (i >= qs.length) {
        const best = Math.max(store.get('bestMapquiz', 0), score); store.set('bestMapquiz', best);
        ui.side.innerHTML = `<h2>結果</h2><div class="card ok" style="text-align:center"><div style="font-size:22px;font-weight:800">${score} / ${qs.length}</div><p class="small muted">1回で正解した数・自己ベスト ${best}</p></div>`;
        const b = el('<button type="button" class="btn">もう一度</button>'); b.addEventListener('click', start); ui.side.appendChild(b);
        return;
      }
      const ans = qs[i];
      ui.side.innerHTML = `<h2>白地図クイズ</h2><p class="small muted">第 ${i + 1} 問 / ${qs.length}　正解 ${score}</p>
        <div class="card" style="font-size:22px;font-family:var(--font-display);font-weight:800;text-align:center">${countryName(ans)} はどこ？</div>${msg}
        <div class="row"><button type="button" class="btn small ghost giveup">答えを見る</button>${locked ? '<button type="button" class="btn small nx">次へ →</button>' : ''}</div>
        <p class="small muted" style="margin-top:12px">国の位置だけでなく、まわりの国・海・山脈との位置関係（「位置や分布」）もいっしょに覚えると、地誌の学習に役立ちます。</p>`;
      $('.giveup', ui.side).addEventListener('click', () => {
        wrongOnce = true; locked = true;
        base.countries.filter(f => f.id === ans).attr('fill', '#e3a63a');
        const f = WORLD.countries.find(x => x.id === ans);
        const [[x0, y0], [x1, y1]] = d3.geoPath(proj).bounds(f);
        const k = Math.min(8, 0.5 / Math.max((x1 - x0) / W, (y1 - y0) / H));
        svg.transition().duration(700).call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(Math.max(1, k)).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
        renderSide(`<div class="card ng">オレンジ色の所が <b>${countryName(ans)}</b>。</div>`);
      });
      const nx = $('.nx', ui.side);
      if (nx) nx.addEventListener('click', () => { i++; locked = false; wrongOnce = false; svg.transition().call(zoom.transform, d3.zoomIdentity); renderSide(); });
    }
    start();
    return () => {};
  }
});
