/* 見る：世界の気候（雨温図・ハイサーグラフ・ケッペンの判定を自分でたどる） */

const CLIMATE_THINK = {
  london: { q: 'ロンドン（北緯51.5°）は東京（北緯35.7°）より高緯度なのに、1月の気温は東京とほぼ同じ。2つの雨温図を「くらべる」で重ねて、理由を説明しよう。', answer: 'ロンドンは大陸の西岸にあり、暖流の北大西洋海流の上を吹いてくる偏西風が、一年中あたたかく湿った空気を運ぶため冬も温和（西岸海洋性気候）。東京は大陸の東岸にあり、冬は大陸から冷たい北西の季節風が吹くため、緯度のわりに寒い。', views: ['pos', 'env'] },
  rome: { q: 'ローマでは夏に雨が少なく、冬に雨が多い。この気候に合わせて、どのような農業が行われているだろう。', answer: '夏の乾燥に強いオリーブ・ぶどう・オレンジ類などの樹木作物を夏に育て、雨の降る冬に小麦を育てる地中海式農業が行われる。夏に乾燥するのは、亜熱帯高圧帯におおわれるため。', views: ['env'] },
  cairo: { q: 'カイロは年降水量がほとんどないのに、大都市があり農業も行われている。地図でナイル川の位置を確かめ、理由を説明しよう。', answer: '湿潤な地域から流れてくる外来河川のナイル川の水を利用できるから。川ぞいでかんがい農業が行われ、人口も川ぞいに集中している。', views: ['env', 'pos'] },
  bangkok: { q: 'バンコクの雨温図から雨季と乾季の時期を読み取り、そこで稲作がさかんな理由を説明しよう。', answer: '5〜10月が雨季、11〜4月が乾季。雨季に季節風がもたらす多量の雨と一年中の高温を利用して、水を多く必要とする稲を育てることができる（チャオプラヤ川の低地も稲作に適する）。', views: ['env'] },
  ulaanbaatar: { q: 'ウランバートル周辺で、農業ではなく遊牧が行われてきた理由を、雨温図から説明しよう。', answer: '年降水量が約240mmと少なく、冬は−20℃前後まで下がるため、作物の栽培がむずかしい。たけの短い草が育つステップを利用し、草を求めて家畜とともに移動する遊牧が適していた。', views: ['env'] },
  yakutsk: { q: 'ヤクーツクの建物は地面から浮かせた高床になっていることが多い。雨温図と「永久凍土」をキーワードに理由を説明しよう。', answer: '冬は−40℃近くまで下がり、地中の永久凍土が一年中こおっている。建物の熱が地面に伝わると凍土がとけて地盤がゆるみ、建物がかたむくので、高床にして熱が伝わらないようにしている。', views: ['env'] },
  quito: { q: 'キトは赤道直下なのに、年平均気温は約14℃しかない。その理由と、人々の暮らしへの影響を考えよう。', answer: '標高が約2850mと高いため（気温は100m上がるごとに約0.6℃下がる）。一年中すずしい「常春」の気候で、低地の高温や病気をさけて、アンデス山脈の高地に都市が発達した。', views: ['env', 'place'] },
  tokyo: { q: '東京の雨温図で、6月と9月に降水量が多くなる理由を説明しよう。', answer: '6月は梅雨前線、9月は秋雨前線や台風の影響で雨が多くなる。夏は太平洋から南東の季節風が湿った空気を運ぶ。', views: ['env'] }
};

registerTool('climate', {
  name: '気候',
  render(container, params = {}) {
    const S = { city: params.city || 'tokyo', chart: 'bar', compare: params.compare || '', mode: params.mode || 'view', quiz: null };
    const ui = toolShell(container, { foot: true });
    const W = 960, H = 500;
    const svg = d3.select(ui.wrap).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const proj = d3.geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' });
    const base = drawBaseMap(svg, proj);
    const dots = base.g.append('g');
    ui.foot.innerHTML = Object.keys(KG_COLOR).map(k => `<span><span class="badge" style="background:${KG_COLOR[k]}">${k}</span> ${KG_NAME[k]}</span>`).join('');

    const modeSeg = seg([{ v: 'view', label: '地図で見る' }, { v: 'judge', label: '自分で判定する' }], S.mode, v => { S.mode = v; if (v === 'judge') newQuiz(); else { S.quiz = null; drawDots(); renderSide(); } });
    ui.bar.appendChild(modeSeg);
    ui.bar.appendChild(seg([{ v: 'bar', label: '雨温図' }, { v: 'hyther', label: 'ハイサーグラフ' }], S.chart, v => { S.chart = v; renderSide(); }));

    function drawDots() {
      dots.selectAll('*').remove();
      CITIES.forEach(c => {
        const p = proj([c.lon, c.lat]);
        const hidden = S.mode === 'judge' && S.quiz && !S.quiz.done;
        const sel = c.id === S.city && !hidden;
        const gr = climateGroupOf(c);
        const g = dots.append('g').attr('transform', `translate(${p})`).style('cursor', hidden ? 'default' : 'pointer');
        g.append('circle').attr('r', sel ? 9 : 6).attr('fill', hidden ? 'var(--muted)' : KG_COLOR[gr]).attr('stroke', sel ? 'var(--ink)' : 'var(--panel)').attr('stroke-width', sel ? 3 : 1.5);
        if (!hidden) g.append('text').attr('class', 'lbl').attr('x', 10).attr('y', 4).style('font-size', sel ? '13px' : '10.5px').style('font-weight', sel ? 700 : 400).text(c.name.replace(/（.*）/, ''));
        if (!hidden) g.on('click', () => { S.city = c.id; S.mode = 'view'; modeSeg.setValue('view'); drawDots(); renderSide(); });
      });
    }

    function chartFor(city) {
      const cmp = S.compare && S.compare !== city.id ? CITIES.find(c => c.id === S.compare) : null;
      return S.chart === 'bar' ? climateChart(city, { compare: cmp }) : hytherChart(city, { compare: cmp });
    }

    function renderSide() {
      if (S.mode === 'judge') return renderQuiz();
      const c = CITIES.find(x => x.id === S.city);
      const k = koppen(c);
      const gr = climateGroupOf(c);
      const code = gr === 'H' ? 'H' : k.code;
      const name = gr === 'H' ? '高山気候' : k.name;
      ui.side.innerHTML = `
        <h2>${c.name} <span class="small muted">${c.country}</span></h2>
        <p style="margin:2px 0 6px"><span class="badge" style="background:${KG_COLOR[gr]}">${code}</span> <b>${name}</b>（${KG_NAME[gr]}）</p>
        <div class="chart-box"></div>
        <div class="row"><span class="small muted">くらべる</span><span class="cmp"></span></div>
        <dl class="kv">
          <dt>緯度・経度</dt><dd>${Math.abs(c.lat)}°${c.lat >= 0 ? 'N' : 'S'}　${Math.abs(c.lon)}°${c.lon >= 0 ? 'E' : 'W'}${c.alt ? `　標高 ${c.alt}m` : ''}</dd>
          <dt>年平均気温</dt><dd>${k.T.toFixed(1)} ℃</dd>
          <dt>気温の年較差</dt><dd>${(k.tMax - k.tMin).toFixed(1)} ℃</dd>
          <dt>年降水量</dt><dd>${Math.round(k.P).toLocaleString()} mm</dd>
          <dt>植生</dt><dd class="t">${c.veg}</dd><dt>土壌</dt><dd class="t">${c.soil}</dd>
        </dl>
        <p style="font-size:14px">${c.life}</p>
        ${c.note ? `<p class="small muted">※ ${c.note}</p>` : ''}
        <h3>ケッペンの判定の流れ</h3>
        <ol class="flow">${k.steps.map(s => `<li class="on"><b>${s.q}</b> → <span class="${s.yes ? '' : 'warn'}">${s.yes ? 'はい' : 'いいえ'}</span><br><span class="small muted">${s.v}</span></li>`).join('')}</ol>
        <div class="think"></div>`;
      $('.chart-box', ui.side).appendChild(chartFor(c));
      $('.cmp', ui.side).appendChild(selectBox([{ v: '', label: '（なし）' }].concat(CITIES.filter(x => x.id !== c.id).map(x => ({ v: x.id, label: x.name }))), S.compare, v => { S.compare = v; renderSide(); }));
      const t = CLIMATE_THINK[c.id];
      if (t) $('.think', ui.side).appendChild(thinkCard(Object.assign({ id: 'climate-' + c.id }, t)));
      else $('.think', ui.side).appendChild(thinkCard({ id: 'climate-' + c.id, views: ['env'], q: `${c.name}の気候は、植生や人々の暮らしにどのような影響をあたえているだろう。雨温図の特徴（気温・降水量の季節変化）を根拠に説明しよう。`, answer: c.life }));
    }

    // --- 自分で判定する（なぞの都市の雨温図を読んで、判定の流れを1つずつ答える） ---
    function newQuiz() {
      const prev = S.quiz && S.quiz.city.id;
      const pool = CITIES.filter(c => c.id !== prev && !c.alt && c.id !== 'showa');
      const city = pick(pool);
      S.quiz = { city, k: koppen(city), i: 0, miss: 0, done: false };
      drawDots(); renderSide();
    }
    function renderQuiz() {
      const Q = S.quiz; const c = Q.city;
      ui.side.innerHTML = `<h2>なぞの都市 <span class="small muted">${Q.done ? c.name : '？？？'}</span></h2>
        <p class="lead">雨温図を読み取って、判定の質問に「はい／いいえ」で答えよう。${c.lat < 0 ? '<b class="warn">この都市は南半球にある（夏は10〜3月）。</b>' : 'この都市は北半球にある（夏は4〜9月）。'}</p>
        <div class="chart-box"></div>
        <dl class="kv"><dt>年平均気温</dt><dd>${Q.k.T.toFixed(1)} ℃</dd><dt>年降水量</dt><dd>${Math.round(Q.k.P)} mm</dd></dl>
        <ol class="flow steps"></ol><div class="ask"></div>`;
      $('.chart-box', ui.side).appendChild(S.chart === 'bar' ? climateChart(c) : hytherChart(c));
      const ol = $('.steps', ui.side);
      Q.k.steps.forEach((s, i) => {
        if (i > Q.i) return;
        const li = el(`<li class="${i < Q.i ? 'on' : ''}"><b>${s.q}</b>${i < Q.i ? ` → ${s.yes ? 'はい' : 'いいえ'}<br><span class="small muted">${s.v}</span>` : i === 0 ? `<br><span class="small muted">計算：${s.v}</span>` : ''}</li>`);
        ol.appendChild(li);
      });
      const ask = $('.ask', ui.side);
      if (Q.i < Q.k.steps.length) {
        const s = Q.k.steps[Q.i];
        const row = el('<div class="row"><button type="button" class="btn small">はい</button><button type="button" class="btn small ghost">いいえ</button><span class="small fb"></span></div>');
        const answer = yes => {
          if (yes === s.yes) { Q.i++; if (Q.i >= Q.k.steps.length) { Q.done = true; drawDots(); } renderQuiz(); }
          else { Q.miss++; $('.fb', row).innerHTML = `<span class="warn">もう一度グラフを見よう。</span> ヒント：${s.v}`; }
        };
        row.children[0].addEventListener('click', () => answer(true));
        row.children[1].addEventListener('click', () => answer(false));
        ask.appendChild(row);
      }
      if (Q.done) {
        const gr = Q.k.group;
        ask.appendChild(el(`<div class="card ok"><b>判定できた！</b> <span class="badge" style="background:${KG_COLOR[gr]}">${Q.k.code}</span> ${Q.k.name}<br>答えの都市：<b>${c.name}</b>（${c.country}）${Q.miss ? `<br><span class="small muted">まちがい ${Q.miss} 回</span>` : '<br>ノーミス！'}<p class="small" style="margin:4px 0 0">${c.life}</p></div>`));
        const nb = el('<button type="button" class="btn">次のなぞの都市</button>');
        nb.addEventListener('click', newQuiz);
        ask.appendChild(nb);
        S.city = c.id;
      }
    }

    drawDots();
    if (S.mode === 'judge') newQuiz(); else renderSide();
    return () => {};
  }
});
