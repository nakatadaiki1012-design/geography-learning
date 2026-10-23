/* 挑戦：自然の白地図（山脈・河川・砂漠・平原・海や湖を、地域ごとに覚える）
   覚える：名前つきの地図をさわって説明を読む
   名前を答える：色のついた地形の名前を4つから選ぶ
   場所をさがす：名前を見て、地図の上でその地形をさがす */

registerTool('physmap', {
  name: '自然の白地図',
  render(container, params = {}) {
    const S = { mode: params.mode || 'study', region: params.region || 'japan', kind: params.kind || 'all' };
    const ui = toolShell(container, { foot: true }); ui.root.classList.add('mq', 'pm');
    // 地図の縦横は画面に合わせる（スマホでは縦長）。fs は画面上で13pxになる文字の大きさ
    const W = 960; let H = 620, fs = 13;
    let svg, zg, lg, proj, zoom, tr = d3.zoomIdentity;
    let pool = [], qs = [], qi = 0, score = 0, locked = false, wrongOnce = false, sel = null, choices = [];

    ui.bar.appendChild(seg([{ v: 'study', label: '覚える' }, { v: 'name', label: '名前を答える' }, { v: 'find', label: '場所をさがす' }], S.mode, v => { S.mode = v; start(); }));
    ui.bar.appendChild(selectBox(Object.keys(PHYS_REGIONS).map(k => ({ v: k, label: PHYS_REGIONS[k].name })), S.region, v => { S.region = v; build(); start(); }));
    ui.bar.appendChild(selectBox([{ v: 'all', label: 'すべての地形' }].concat(Object.keys(PHYS_KINDS).map(k => ({ v: k, label: PHYS_KINDS[k].name }))), S.kind, v => { S.kind = v; start(); }));
    const zb = el('<button type="button" class="chip">拡大をもどす</button>'); zb.addEventListener('click', () => svg.transition().call(zoom.transform, d3.zoomIdentity)); ui.bar.appendChild(zb);
    ui.foot.innerHTML = `<span class="legend">${Object.keys(PHYS_KINDS).map(k => `<span><i style="background:${PHYS_KINDS[k].color}"></i>${PHYS_KINDS[k].name}</span>`).join('')}</span>`;

    const isLine = f => f.k === 'mt' || f.k === 'rv' || f.line;
    PHYS.forEach(f => { if (!f.g) f.g = f.gs.flat(); });
    const inRegion = f => f.r.includes(S.region);
    const kindName = f => PHYS_KINDS[f.k].name.split('・')[0];

    // 地域の地図をかく
    function build() {
      const cw = ui.wrap.clientWidth, ch = ui.wrap.clientHeight;
      H = Math.round(W * Math.max(0.5, Math.min(1.5, ch && cw ? ch / cw : 0.65)));
      fs = 13 * W / (cw || W);
      d3.select(ui.wrap).selectAll('svg').remove();
      const R = PHYS_REGIONS[S.region], [a, b, c, d] = R.box, pts = [];
      for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) pts.push([a + (c - a) * i / 4, b + (d - b) * j / 4]);
      proj = (R.merc ? d3.geoMercator() : R.conic ? d3.geoConicEqualArea().parallels([50, 70]).rotate([-(a + c) / 2, 0]) : d3.geoNaturalEarth1().rotate([-(a + c) / 2, 0])).fitExtent([[10, 10], [W - 10, H - 10]], { type: 'MultiPoint', coordinates: pts });
      svg = d3.select(ui.wrap).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'xMidYMid meet').attr('data-own-labels', '1');
      zg = svg.append('g');
      zg.append('rect').attr('x', -W).attr('y', -H).attr('width', W * 3).attr('height', H * 3).attr('fill', 'var(--sea)');
      drawBaseMap(zg, proj, { antarctica: false });
      const fg = zg.append('g').attr('class', 'phys');
      const feats = PHYS.filter(inRegion);
      // 面（平原・砂漠・海）を先に、線（山脈・河川）をあとにかく
      feats.sort((x, y) => isLine(x) - isLine(y));
      feats.forEach(f => {
        const P = f.g.map(p => proj(p));
        const g = fg.append('g').attr('class', 'pf').datum(f);
        const K = PHYS_KINDS[f.k];
        if (isLine(f)) {
          const dd = d3.line().curve(d3.curveCatmullRom.alpha(0.5))(P);
          if (f.k === 'mt') {
            g.append('path').attr('class', 'vis').attr('d', dd).attr('fill', 'none').attr('stroke', K.color).attr('stroke-width', 7).attr('stroke-linecap', 'round').attr('stroke-opacity', 0.85);
            g.append('path').attr('class', 'vis2').attr('d', dd).attr('fill', 'none').attr('stroke', '#f3e3c3').attr('stroke-width', 2).attr('stroke-dasharray', '2 6').attr('stroke-linecap', 'round');
          } else {
            g.append('path').attr('class', 'vis').attr('d', dd).attr('fill', 'none').attr('stroke', K.color).attr('stroke-width', f.k === 'rv' ? 3 : 5).attr('stroke-linecap', 'round').attr('stroke-dasharray', f.k === 'sea' ? '6 4' : null);
          }
          g.append('path').attr('class', 'hit').attr('d', dd).attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 24).attr('stroke-linecap', 'round');
        } else {
          const dd = (f.gs || [f.g]).map(ring => d3.line().curve(d3.curveCatmullRomClosed.alpha(0.5))(ring.map(p => proj(p)))).join('');
          g.append('path').attr('class', 'vis hit').attr('d', dd).attr('fill', K.color).attr('fill-opacity', f.k === 'sea' ? 0.55 : 0.45).attr('stroke', K.color).attr('stroke-width', 1.5);
        }
        // 名前の位置：面は中心、線はまん中の点
        const n = P.length;
        f._lps = isLine(f) ? [Math.floor(n / 2), Math.floor(n / 4), Math.floor(3 * n / 4)].concat(d3.range(n)).filter((v, i, a) => a.indexOf(v) === i).map(i => P[i]) : [f.gs ? [d3.mean(P, p => p[0]), d3.mean(P, p => p[1])] : d3.polygonCentroid(P)];
      });
      lg = svg.append('g').attr('class', 'plabels');
      zoom = d3.zoom().scaleExtent([1, 10]).on('zoom', ev => { tr = ev.transform; zg.attr('transform', tr); placeLabels(false); }).on('end', () => placeLabels(true));
      svg.call(zoom).on('dblclick.zoom', null);
      tr = d3.zoomIdentity;
      fg.selectAll('g.pf').style('cursor', 'pointer').on('click', (ev, f) => { ev.stopPropagation(); tapFeature(f); });
    }
    // 名前は拡大しても同じ大きさで出す
    // relayout＝true のとき、名前どうしが重ならない位置をさがし直す（線は途中の点も候補にする）
    function placeLabels(relayout = true) {
      const texts = lg.selectAll('text');
      if (relayout) {
        const boxes = [];
        texts.each(function (f) {
          const w = f.n.length * fs + fs * 0.6, h = fs * 1.6;
          const cand = [];
          f._lps.forEach(p => [[0, isLine(f) ? -fs * 0.8 : 0], [0, fs * 1.25], [0, -fs * 1.4], [w / 2 + fs * 0.6, fs * 0.3], [-w / 2 - fs * 0.6, fs * 0.3]].forEach(([dx, dy]) => cand.push([p[0], p[1], dx, dy])));
          let best = null;
          for (const c of cand) {
            const x = tr.applyX(c[0]) + c[2], y = tr.applyY(c[1]) + c[3];
            const bx = [x - w / 2, y - h + fs * 0.35, x + w / 2, y + fs * 0.35];
            if (bx[0] < 2 || bx[2] > W - 2 || bx[1] < 2 || bx[3] > H - 2) continue;
            if (!boxes.some(b => bx[0] < b[2] && bx[2] > b[0] && bx[1] < b[3] && bx[3] > b[1])) { best = c; break; }
          }
          // どこにも置けない名前は、拡大するまでかくす（選んだ地形は必ず出す）
          if (!best && (f === sel || lg.selectAll('text').size() <= 2)) best = cand[0];
          f._at = best;
          d3.select(this).style('display', best ? null : 'none');
          if (!best) return;
          const x = tr.applyX(best[0]) + best[2], y = tr.applyY(best[1]) + best[3];
          boxes.push([x - w / 2, y - h + fs * 0.35, x + w / 2, y + fs * 0.35]);
        });
      }
      texts.attr('x', f => tr.applyX((f._at || f._lps[0])[0]) + (f._at ? f._at[2] : 0)).attr('y', f => tr.applyY((f._at || f._lps[0])[1]) + (f._at ? f._at[3] : -8));
      if (relayout && S.mode === 'study') { const hid = texts.filter(function () { return this.style.display === 'none'; }).size(); const h = $('.pmhid', ui.side); if (h) h.textContent = hid ? `名前が重なる所（${hid}か所）は省略しています。拡大するか、下の名前を押すと見られます。` : ''; }
    }
    function showLabels(list, cls = '') {
      lg.selectAll('text').remove();
      list = list.slice().sort((a, b) => (b === sel) - (a === sel));
      lg.selectAll('text').data(list).join('text').attr('class', `lbl plbl ${cls}`).attr('text-anchor', 'middle').style('font-size', (cls ? fs * 1.15 : fs) + 'px').style('stroke-width', fs * 0.25 + 'px').text(f => f.n);
      placeLabels();
    }
    // 見た目：on＝見せる地形、hl＝目立たせる地形
    function paint({ on = pool, hl = null, faint = false } = {}) {
      zg.selectAll('g.pf').style('display', f => on.includes(f) ? null : 'none')
        .attr('opacity', f => hl ? (f === hl ? 1 : (faint ? 0.18 : 0.55)) : 1)
        .classed('hl', f => f === hl);
    }
    function zoomTo(f) {
      const P = f.g.map(p => proj(p)), xs = P.map(p => p[0]), ys = P.map(p => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const k = Math.max(1, Math.min(4, 0.45 / Math.max((x1 - x0 + 40) / W, (y1 - y0 + 40) / H)));
      svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
    }

    function start() {
      pool = PHYS.filter(f => inRegion(f) && (S.kind === 'all' || f.k === S.kind));
      qs = shuffle(pool).slice(0, Math.min(10, pool.length)); qi = 0; score = 0; locked = false; wrongOnce = false; sel = null;
      svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
      if (S.mode === 'study') { paint(); showLabels(pool); }
      else nextQ();
      renderSide();
    }
    function nextQ() {
      locked = false; wrongOnce = false; sel = null;
      if (qi >= qs.length) { paint(); showLabels(pool); return; }
      const f = qs[qi];
      if (S.mode === 'name') {
        // 同じ種類の地形を優先して、まちがいの選択肢を3つ
        const same = shuffle(PHYS.filter(x => x !== f && inRegion(x) && x.k === f.k));
        const other = shuffle(PHYS.filter(x => x !== f && inRegion(x) && x.k !== f.k));
        choices = shuffle([f].concat(same.concat(other).slice(0, 3)));
        paint({ on: PHYS.filter(inRegion), hl: f, faint: true }); showLabels([]);
      } else {
        paint(); showLabels([]);
      }
    }

    function tapFeature(f) {
      if (S.mode === 'study') { sel = f; paint({ hl: f }); showLabels(pool, ''); lg.selectAll('text').classed('on', x => x === f); renderSide(); return; }
      if (S.mode !== 'find' || locked || qi >= qs.length) return;
      const ans = qs[qi];
      if (f === ans) {
        if (!wrongOnce) score++;
        locked = true; paint({ hl: f }); showLabels([f], 'ok');
        renderSide(`<div class="card ok"><b>${f.n}</b> ${wrongOnce ? '（2回目で正解）' : '正解！'}<p class="small" style="margin:4px 0 0">${f.d}</p></div>`);
      } else {
        wrongOnce = true; showLabels([f], 'ng');
        setTimeout(() => { if (!locked) showLabels([]); }, 1600);
        renderSide(`<div class="card ng">それは <b>${f.n}</b>（${kindName(f)}）。もう一度さがそう。</div>`);
      }
    }

    function renderSide(msg = '') {
      const R = PHYS_REGIONS[S.region];
      if (S.mode === 'study') {
        const byKind = Object.keys(PHYS_KINDS).map(k => [k, pool.filter(f => f.k === k)]).filter(([, l]) => l.length);
        ui.side.innerHTML = `<h2>${R.name}の自然を覚える</h2>
          ${sel ? `<div class="card"><span class="tag" style="background:${PHYS_KINDS[sel.k].color};color:#fff">${PHYS_KINDS[sel.k].name}</span><div style="font-size:19px;font-weight:800;margin:4px 0">${sel.n}</div><p class="small" style="margin:0">${sel.d}</p></div>` : `<p class="small muted">地図の地形を${TAP}するか、下の名前を押すと、説明が出ます。覚えたら「名前を答える」「場所をさがす」で確かめよう。</p>`}<p class="small muted pmhid" style="margin:4px 0 0"></p>
          ${byKind.map(([k, l]) => `<div class="small" style="font-weight:800;margin:8px 0 4px;color:${PHYS_KINDS[k].color}">${PHYS_KINDS[k].name}</div><div class="chips">${l.map(f => `<button type="button" class="chip pfc${f === sel ? ' on' : ''}" data-n="${esc(f.n)}">${f.n}</button>`).join('')}</div>`).join('')}`;
        $$('.pfc', ui.side).forEach(b => b.addEventListener('click', () => { const f = pool.find(x => x.n === b.dataset.n); tapFeature(f); zoomTo(f); }));
        return;
      }
      if (qi >= qs.length) {
        const B = store.get('bestPhys', {}), key = `${S.region}-${S.kind}-${S.mode}`; B[key] = Math.max(B[key] || 0, score); store.set('bestPhys', B);
        ui.side.innerHTML = `<h2>結果</h2><div class="card ok" style="text-align:center"><div style="font-size:22px;font-weight:800">${score} / ${qs.length}</div><p class="small muted">1回で正解した数・この地域の自己ベスト ${B[key]}</p></div>
          <div class="row"><button type="button" class="btn again">もう一度</button><button type="button" class="btn ghost study">名前つきの地図で見直す</button></div>`;
        $('.again', ui.side).addEventListener('click', start);
        $('.study', ui.side).addEventListener('click', () => { S.mode = 'study'; $$('.seg button', ui.bar)[0].click(); });
        return;
      }
      const f = qs[qi];
      const head = `<h2>${S.mode === 'name' ? '名前を答える' : '場所をさがす'}（${R.name}）</h2><p class="small muted">第 ${qi + 1} 問 / ${qs.length}　正解 ${score}</p>`;
      if (S.mode === 'name') {
        ui.side.innerHTML = head + `<div class="card" style="text-align:center;font-weight:700">地図の<b style="color:var(--shu)">目立っている${kindName(f)}</b>の名前は？</div>
          <div class="choices pchoices">${choices.map((c, i) => `<button type="button" data-i="${i}"><span class="mono muted">${'アイウエ'[i]}</span>　${c.n}</button>`).join('')}</div><div class="pexp"></div>`;
        $$('.pchoices button', ui.side).forEach(b => b.addEventListener('click', () => {
          const c = choices[+b.dataset.i], ok = c === f;
          $$('.pchoices button', ui.side).forEach((x, j) => { x.disabled = true; if (choices[j] === f) x.classList.add('is-right'); });
          if (!ok) b.classList.add('is-wrong'); else score++;
          showLabels([f], ok ? 'ok' : 'ng');
          // 次へは結果のすぐ横に（スマホでパネルの下にかくれないように）
          $('.pexp', ui.side).innerHTML = `<div class="card ${ok ? 'ok' : 'ng'}"><div class="row" style="flex-wrap:nowrap"><b>${ok ? '正解！' : `正解は ${f.n}`}</b><button type="button" class="btn small nx" style="margin-left:auto">次へ →</button></div><p class="small" style="margin:4px 0 0">${f.d}</p></div>`;
          $('.nx', ui.side).addEventListener('click', () => { qi++; nextQ(); renderSide(); });
          ui.side.scrollTop = 0; $('.pexp', ui.side).scrollIntoView({ block: 'nearest' });
        }));
        return;
      }
      ui.side.innerHTML = head + `<div class="card" style="font-size:20px;font-family:var(--font-display);font-weight:800;text-align:center">${f.n} はどれ？</div>
        <div class="row">${locked ? '<button type="button" class="btn small nx">次へ →</button>' : '<button type="button" class="btn small ghost giveup">答えを見る</button>'}</div>${msg}
        <p class="small muted" style="margin-top:8px">ヒント：${kindName(f)}。色の意味は地図の下の凡例を見よう。</p>`;
      if ($('.giveup', ui.side)) $('.giveup', ui.side).addEventListener('click', () => {
        wrongOnce = true; locked = true; paint({ hl: f }); showLabels([f], 'ng'); zoomTo(f);
        renderSide(`<div class="card ng">目立っている所が <b>${f.n}</b>。<p class="small" style="margin:4px 0 0">${f.d}</p></div>`);
      });
      const nx = $('.nx', ui.side);
      if (nx) nx.addEventListener('click', () => { qi++; svg.transition().call(zoom.transform, d3.zoomIdentity); nextQ(); renderSide(); });
    }

    build(); start();
    return () => {};
  }
});
