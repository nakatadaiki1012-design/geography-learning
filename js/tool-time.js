/* 動かす：時差（昼と夜・標準時・日付変更線・飛行機の到着時刻） */

const DATELINE = [[180, 90], [180, 75], [-169, 68], [-169, 65], [-169, 62], [172.5, 53], [180, 48], [180, 5], [-150, 5], [-150, -12], [-172.5, -12], [-172.5, -45], [180, -51], [180, -90]];
const SEASONS = [{ v: 80, label: '3月（春分）' }, { v: 172, label: '6月（夏至）' }, { v: 266, label: '9月（秋分）' }, { v: 355, label: '12月（冬至）' }];
const pad2 = n => String(n).padStart(2, '0');
function fmtClock(h) { h = ((h % 24) + 24) % 24; const m = Math.round(h * 60); return `${pad2(Math.floor(m / 60) % 24)}:${pad2(m % 60)}`; }
function dayShift(h) { return Math.floor(h / 24); }
const DAYW = ['前日', '同じ日', '翌日', '翌々日'];
function tzLabel(tz) { return `UTC${tz >= 0 ? '+' : '−'}${Math.abs(tz)}`; }
function meridianText(tz) { const m = tz * 15; return m === 0 ? '0°（本初子午線）' : `${Math.abs(m)}°${m > 0 ? 'E' : 'W'}`; }

registerTool('time', {
  name: '時差',
  render(container, params = {}) {
    const S = { tokyo: params.tokyo ?? 12, doy: params.doy ?? 172, play: false, a: 'tokyo', b: 'london', at: 10 };
    const ui = toolShell(container, { bar: false, foot: true });
    const W = 960, H = 480;
    const svg = d3.select(ui.wrap).append('svg').attr('viewBox', `0 0 ${W} ${H}`);
    const proj = d3.geoEquirectangular().rotate([-150, 0]).fitExtent([[0, 22], [W, H]], { type: 'Sphere' });
    const path = d3.geoPath(proj);
    const base = drawBaseMap(svg, proj, { antarctica: false, graticule: false });
    const zoneG = base.g.insert('g', ':nth-child(2)');
    // 15°ごとの時間帯（理論上の時間帯）
    for (let k = -12; k <= 12; k++) {
      const lo = k * 15 - 7.5, hi = k * 15 + 7.5;
      const poly = { type: 'Polygon', coordinates: [[[lo, -89], [lo, 89], [hi, 89], [hi, -89], [lo, -89]].map(([x, y]) => [Math.max(-180, Math.min(180, x)), y])] };
      if (k % 2 === 0) zoneG.append('path').attr('d', path(poly)).attr('fill', 'rgba(31,95,139,.07)');
    }
    const nightG = base.g.append('g');
    const overG = base.g.append('g');
    const top = svg.append('g');
    for (let lon = -165; lon <= 180; lon += 15) {
      const p = proj([lon, 0]);
      const tz = Math.round(((lon + 540) % 360 - 180) / 15);
      top.append('text').attr('x', p[0]).attr('y', 15).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', 'var(--muted)').attr('font-family', 'var(--font-data)').text(lon === 180 ? '±12' : (tz > 0 ? '+' : '') + tz);
      base.g.append('path').datum({ type: 'LineString', coordinates: [[lon, -85], [lon, 85]] }).attr('d', path).attr('stroke', lon === 135 ? 'var(--shu)' : lon === 0 ? 'var(--accent)' : 'var(--grat)').attr('stroke-width', lon === 135 || lon === 0 ? 1.4 : .7).attr('fill', 'none');
    }
    base.g.append('path').datum({ type: 'LineString', coordinates: DATELINE }).attr('d', path).attr('fill', 'none').attr('stroke', '#8a5bd0').attr('stroke-width', 2.5).attr('stroke-dasharray', '6 4');
    const dl = proj([-172, 28]); base.g.append('text').attr('class', 'lbl').attr('x', dl[0]).attr('y', dl[1]).style('fill', '#8a5bd0').style('font-weight', 700).text('日付変更線');
    const p135 = proj([135, -50]); base.g.append('text').attr('class', 'lbl').attr('x', p135[0] + 4).attr('y', p135[1]).style('fill', 'var(--shu)').text('東経135°（日本の標準時子午線）');
    const p0 = proj([0, -50]); base.g.append('text').attr('class', 'lbl').attr('x', p0[0] + 4).attr('y', p0[1]).style('fill', 'var(--accent)').text('経度0°（本初子午線）');
    ui.foot.innerHTML = '<span>上の数字＝経度から考えた時間帯（UTCとの差）</span><span>・暗い所＝夜</span><span>・サマータイムは考えていません</span>';

    function utc() { return S.tokyo - 9; }
    function draw() {
      nightG.selectAll('*').remove(); overG.selectAll('*').remove();
      const decl = 23.44 * Math.sin(2 * Math.PI * (S.doy - 81) / 365);
      const sunLon = ((-(utc() - 12) * 15) % 360 + 540) % 360 - 180;
      const anti = [sunLon + 180, -decl];
      nightG.append('path').datum(d3.geoCircle().center(anti).radius(90)()).attr('d', path).attr('fill', 'rgba(10,20,45,.42)');
      nightG.append('path').datum(d3.geoCircle().center(anti).radius(84)()).attr('d', path).attr('fill', 'rgba(10,20,45,.18)');
      const sp = proj([sunLon, decl]);
      overG.append('circle').attr('cx', sp[0]).attr('cy', sp[1]).attr('r', 11).attr('fill', '#ffcc33').attr('stroke', '#e39b00').attr('stroke-width', 2);
      overG.append('text').attr('class', 'lbl').attr('x', sp[0] + 14).attr('y', sp[1] + 4).text('太陽が真上');
      PLACES.forEach(c => {
        const p = proj([c.lon, c.lat]);
        const local = utc() + c.tz, ds = dayShift(local + 0);
        const sel = c.id === S.a || c.id === S.b;
        overG.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', sel ? 5 : 3.5).attr('fill', sel ? 'var(--shu)' : 'var(--ink)').attr('stroke', 'var(--panel)');
        overG.append('text').attr('class', 'lbl').attr('x', p[0] + 6).attr('y', p[1] - 3).style('font-size', sel ? '12px' : '10px').style('font-weight', sel ? 700 : 400)
          .text(`${c.name} ${fmtClock(local)}${ds < 0 ? '（前日）' : ds > 0 ? '（翌日）' : ''}`);
      });
    }

    function renderSide() {
      ui.side.innerHTML = `<h2>時差</h2><p class="lead">地球は24時間で1回転（360°）するので、経度15°ごとに1時間の時差が生まれる。</p>
        <div class="card"><div class="small muted">東京の時刻（日本標準時）</div><div class="mono" style="font-size:30px;font-weight:600" id="tkClock"></div>
        <div class="small">ロンドン（世界標準時 UTC）は <b class="mono" id="utcClock"></b></div></div>
        <div class="sl"></div><div class="row"><span class="small muted">季節</span><span class="ss"></span></div>
        <div class="row" style="margin-top:6px"><button type="button" class="btn small ghost play">▶ 時間を進める</button></div>
        <h3>時刻を計算する</h3>
        <div class="row"><span class="ca"></span><span>が</span><span class="cat"></span><span>のとき</span></div>
        <div class="row"><span class="cb"></span><span>は？</span></div>
        <div class="calc card"></div>
        <h3>飛行機の到着時刻にチャレンジ</h3><div class="fly"></div>
        <div class="think"></div>`;
      const sl = sliderRow('時刻', { min: 0, max: 23.75, step: 0.25, value: S.tokyo, fmt: fmtClock, onInput: v => { S.tokyo = v; update(); } });
      $('.sl', ui.side).appendChild(sl);
      $('.ss', ui.side).appendChild(seg(SEASONS, S.doy, v => { S.doy = +v; draw(); }));
      const pb = $('.play', ui.side);
      pb.addEventListener('click', () => { S.play = !S.play; pb.textContent = S.play ? '❚❚ とめる' : '▶ 時間を進める'; if (S.play) loop(); });
      const opts = PLACES.map(p => ({ v: p.id, label: p.name }));
      $('.ca', ui.side).appendChild(selectBox(opts, S.a, v => { S.a = v; update(); }));
      $('.cb', ui.side).appendChild(selectBox(opts, S.b, v => { S.b = v; update(); }));
      $('.cat', ui.side).appendChild(selectBox(d3.range(0, 24).map(h => ({ v: h, label: `${h}時` })), S.at, v => { S.at = +v; update(); }));
      function update() {
        sl.setValue(S.tokyo);
        $('#tkClock', ui.side).textContent = fmtClock(S.tokyo);
        $('#utcClock', ui.side).textContent = fmtClock(utc());
        const A = PLACE[S.a], B = PLACE[S.b];
        const diff = B.tz - A.tz, res = S.at + diff, ds = dayShift(res);
        $('.calc', ui.side).innerHTML = `<div style="font-size:14px">
          ① 標準時子午線：${A.name} ${meridianText(A.tz)}（${tzLabel(A.tz)}）、${B.name} ${meridianText(B.tz)}（${tzLabel(B.tz)}）<br>
          ② 時差：${Math.abs(diff)} 時間（${B.name}のほうが${diff > 0 ? '進んでいる' : diff < 0 ? '遅れている' : '同じ'}）<br>
          ③ ${S.at}時 ${diff >= 0 ? '＋' : '−'} ${Math.abs(diff)}時間 ＝ <b class="mono" style="font-size:18px">${fmtClock(res)}</b>（${DAYW[ds + 1] || ''}）</div>
          <p class="small muted" style="margin:4px 0 0">東経の国は東へ行くほど時刻が進み、西経の国は西へ行くほど遅れる。${(A.tz > 0) !== (B.tz > 0) && A.tz && B.tz ? '東経と西経をまたぐときは、2つの経度を「たして」経度差を求める。' : ''}</p>`;
        draw();
      }
      renderFly();
      $('.think', ui.side).appendChild(thinkCard({ id: 'time-1', views: ['pos', 'inter'], q: '中国は東西に約5000kmも広いのに、国内の標準時が1つ（ペキンの時刻）だけである。そのよい点と困る点を考えよう。', answer: 'よい点：国内のどこでも同じ時刻なので、放送・交通・商取引などで時刻を換算する必要がなく、国としての統一もしやすい。困る点：西部（シンチヤンなど）では太陽の動きと時計の時刻が大きくずれ、朝10時ごろにやっと明るくなるなど生活リズムに合わない。そのため現地の人どうしでは独自の時刻を使うこともある。' }));
      ui._update = update;
      update();
    }

    function renderFly() {
      const box = $('.fly', ui.side);
      const dests = PLACES.filter(p => p.id !== 'tokyo');
      const B = pick(dests);
      const dist = gcDistance([139.7, 35.7], [B.lon, B.lat]);
      const flight = Math.max(2, Math.round(dist / 820));
      const dep = pick([8, 10, 11, 13, 17, 19, 21, 22]);
      const arr = dep + flight + (B.tz - 9), ds = dayShift(arr), ah = ((arr % 24) + 24) % 24;
      box.innerHTML = `<p style="margin:4px 0;font-size:14px">東京（成田）を <b>1月10日 ${dep}時</b> に出発した飛行機が、<b>${flight}時間</b> 飛んで <b>${B.name}</b> に着いた。${B.name}の現地時刻は？</p>
        <div class="row"><select class="d">${[-1, 0, 1, 2].map(d => `<option value="${d}">1月${10 + d}日</option>`).join('')}</select>
        <select class="h">${d3.range(0, 24, 0.5).map(h => `<option value="${h}">${fmtClock(h)}</option>`).join('')}</select>
        <button type="button" class="btn small chk">答える</button><button type="button" class="btn small ghost nx">別の問題</button></div><div class="res"></div>`;
      $('.d', box).value = '0'; $('.h', box).value = String(dep);
      $('.chk', box).addEventListener('click', () => {
        const ok = +$('.d', box).value === ds && +$('.h', box).value === ah;
        $('.res', box).innerHTML = `<div class="card ${ok ? 'ok' : 'ng'} small"><b>${ok ? '正解！' : 'ざんねん'}</b> 答え：1月${10 + ds}日 ${fmtClock(ah)}<br>
          ① 出発時刻に飛行時間をたす（東京の時刻で）：${dep}時 ＋ ${flight}時間 ＝ ${dep + flight}時<br>
          ② 時差を直す：東京（${tzLabel(9)}）→ ${B.name}（${tzLabel(B.tz)}）は ${B.tz - 9 >= 0 ? '＋' : '−'}${Math.abs(B.tz - 9)}時間<br>
          ③ ${dep + flight} ${B.tz - 9 >= 0 ? '＋' : '−'} ${Math.abs(B.tz - 9)} ＝ ${arr}時 → ${DAYW[ds + 1]}の ${fmtClock(ah)}</div>`;
      });
      $('.nx', box).addEventListener('click', renderFly);
    }

    let last = 0, loopRaf = 0;
    function loop(now) {
      if (!S.play) return;
      if (now && last) { S.tokyo = (S.tokyo + (now - last) / 1000 * 1.5) % 24; ui._update && ui._update(); }
      last = now || 0;
      loopRaf = requestAnimationFrame(loop);
    }

    renderSide();
    return () => { S.play = false; cancelAnimationFrame(loopRaf); };
  }
});
