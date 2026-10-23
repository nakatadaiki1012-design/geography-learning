/* 授業モードの画面（一覧 → 授業：説明／資料で考える／考えよう／確認テスト） */

const COURSES = [COURSE_SOGO, COURSE_TANKYU];
COURSES.forEach(c => { let n = 0; c.parts.forEach(p => p.lessons.forEach(l => { n++; l.no = (c.id === 'sogo' ? '総' : '探') + n; l.course = c.id; })); c.all = c.parts.flatMap(p => p.lessons); });

const VIEW_DESC = {
  pos: 'どこにあるか、どのように広がっているか',
  place: 'その場所はどのような特徴をもつか',
  env: '人々の生活と自然環境がどう影響し合っているか',
  inter: 'ほかの地域とどのように結びついているか',
  region: 'その地域はどのような特色をもつ地域といえるか'
};

registerTool('lessons', {
  name: '授業モード',
  render(container, params = {}) {
    const course = COURSES.find(c => c.id === params.course) || COURSES[0];
    let cleanup = null;
    const root = el('<div class="lessons"></div>');
    container.appendChild(root);
    const passed = () => store.get('passed', {});
    const seen = () => store.get('seen', {});

    function menu() {
      cleanup && cleanup(); cleanup = null;
      const P = passed(), V = seen();
      const done = course.all.filter(l => P[l.id]).length;
      const next = course.all.find(l => !V[l.id]) || course.all.find(l => !P[l.id]);
      root.innerHTML = `<div class="lesson">
        <div class="lesson-head"><div><span class="no">授業モード</span><h2>${course.name}</h2></div>
        <div style="margin-left:auto;text-align:right"><div class="small muted">合格した授業</div><div class="mono" style="font-size:24px;font-weight:600">${done} / ${course.all.length}</div></div></div>
        <p class="lead mlead" style="font-size:14px">学習指導要領の項目の順に並んでいます。各授業は「問い → 説明 → 資料で考える → 考えよう（記述）→ 確認テスト」の流れ。確認テストで3問以上正解すると合格のはんこ。</p>
        ${next ? `<button type="button" class="btn cont">続きから：${next.no} ${next.title}</button>` : ''}
        <div class="lesson-menu"></div></div>`;
      const mb = $('.lesson-menu', root);
      course.parts.forEach(p => {
        const has = next && p.lessons.includes(next);
        const pd = p.lessons.filter(l => P[l.id]).length;
        const det = el(`<details class="lpart"${has || (!next && p === course.parts[0]) ? ' open' : ''}><summary><h3>${p.name}<small>${pd} / ${p.lessons.length} 合格</small></h3></summary><div class="lgrid"></div></details>`);
        const grid = $('.lgrid', det);
        p.lessons.forEach(l => {
          const b = el(`<button type="button" class="lcard"><span class="no">${l.no}</span><span class="tt">${l.title}</span><span class="q">${l.q}</span><span class="st">${P[l.id] ? '<span class="hanko" style="width:34px;height:34px;font-size:11px;border-width:2px">合格</span>' : V[l.id] ? '✓' : ''}</span></button>`);
          b.addEventListener('click', () => go(l.id));
          grid.appendChild(b);
        });
        mb.appendChild(det);
      });
      const cb = $('.cont', root); if (cb) cb.addEventListener('click', () => go(next.id));
    }

    function go(id, tab) { location.hash = `#lessons/${course.id}/${id}${tab ? '/' + tab : ''}`; }

    function lesson(id, tab = 'slides') {
      const l = course.all.find(x => x.id === id); if (!l) return menu();
      const V = seen(); V[l.id] = true; store.set('seen', V);
      const idx = course.all.indexOf(l), prev = course.all[idx - 1], next = course.all[idx + 1];
      root.innerHTML = `<div class="lesson">
        <div class="row lnav" style="justify-content:space-between;flex-wrap:nowrap"><button type="button" class="btn small ghost back">← <span class="lbl">授業の</span>一覧</button>
          <span class="no lno">${course.name} ${l.no}<b class="ltitle">${l.title}</b></span>
          <span class="row" style="flex-wrap:nowrap;gap:4px"><button type="button" class="btn small ghost pv" ${prev ? '' : 'disabled'}>← 前<span class="lbl">の授業</span></button><button type="button" class="btn small ghost nx" ${next ? '' : 'disabled'}>次<span class="lbl">の授業</span> →</button></span></div>
        <div class="lesson-head" style="margin-top:6px"><div><h2>${l.title}</h2></div></div>
        <div class="lesson-q"><b>問い</b>　${l.q}</div>
        <div class="tabs" role="tablist">
          <button type="button" data-t="slides">① 説明</button><button type="button" data-t="tool">② 資料で考える</button><button type="button" data-t="think">③ 考えよう</button><button type="button" data-t="test">④ 確認テスト${passed()[l.id] ? ' 🏅' : ''}</button></div>
        <div class="tabbody"></div></div>`;
      $('.back', root).addEventListener('click', () => { location.hash = `#lessons/${course.id}`; });
      if (prev) $('.pv', root).addEventListener('click', () => go(prev.id));
      if (next) $('.nx', root).addEventListener('click', () => go(next.id));
      $$('.tabs button', root).forEach(b => b.addEventListener('click', () => show(b.dataset.t)));
      const body = $('.tabbody', root);
      const foot = makeFoot(); $('.lesson', root).appendChild(foot);
      const TABS = ['slides', 'tool', 'think', 'test'], TNAME = { slides: '① 説明', tool: '② 資料で考える', think: '③ 考えよう', test: '④ 確認テスト' };
      let si = 0;
      function show(t) {
        cleanup && cleanup(); cleanup = null;
        $$('.tabs button', root).forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === t)));
        $('.lesson', root).dataset.tab = t;
        body.innerHTML = '';
        body.scrollTop = 0;
        const i = TABS.indexOf(t);
        // 説明とテスト以外は「前のタブ／次のタブ」
        if (t !== 'slides' && t !== 'test') foot.set({ left: { label: `← ${TNAME[TABS[i - 1]]}`, fn: () => show(TABS[i - 1]) }, center: dotsHtml(4, i), right: { label: `${TNAME[TABS[i + 1]]} →`, fn: () => show(TABS[i + 1]) } });
        if (t === 'slides') slides();
        if (t === 'tool') {
          body.appendChild(el(`<p class="small muted toolhint" style="margin:0 0 8px">${l.tool.label}：地図やグラフを動かして、「問い」の答えの手がかりをさがそう。</p>`));
          const box = el('<div class="embed"></div>'); body.appendChild(box);
          // スマホでは、授業の見出しの下に残った高さいっぱいに道具を表示する
          if (MOBILE.matches) box.style.setProperty('--embed-h', Math.max(400, window.innerHeight - box.getBoundingClientRect().top - 60) + 'px');
          cleanup = TOOLS[l.tool.id].render(box, Object.assign({}, l.tool.params));
        }
        if (t === 'think') {
          body.appendChild(el(`<div class="card"><b>使う「地理的な見方・考え方」</b><div class="views">${(l.think.views || []).map(k => `<span class="tag v">${VIEWS[k]}</span><span class="small muted" style="margin-right:10px">${VIEW_DESC[k]}</span>`).join('')}</div></div>`));
          body.appendChild(thinkCard(Object.assign({ id: 'lesson-' + l.id }, l.think)));
        }
        if (t === 'test') test();
      }
      function dotsHtml(n, on) { return `<span class="dots">${Array.from({ length: n }, (x, i) => `<i class="${i === on ? 'on' : ''}"></i>`).join('')}</span>`; }
      function slides() {
        const s = l.slides[si];
        const sf = fig(((FG[l.id] || {}).s || [])[si]);
        body.innerHTML = `<div class="slide${sf ? ' has-fig' : ''}"><h3>${s.h}</h3><div class="stext">${s.b}</div><div class="sfig"></div></div>`;
        if (sf) $('.sfig', body).appendChild(sf);
        const last = si >= l.slides.length - 1;
        foot.set({
          left: { label: '← 前へ', disabled: si === 0, fn: () => { si--; slides(); } },
          center: `${dotsHtml(l.slides.length, si)}<span class="small muted">${si + 1} / ${l.slides.length}</span>`,
          right: { label: last ? `${TNAME.tool} →` : '次へ →', fn: () => { if (last) show('tool'); else { si++; slides(); } } }
        });
      }
      function test() {
        let k = 0, score = 0;
        const qs = l.test;
        const step = () => {
          body.innerHTML = '';
          if (k >= qs.length) {
            const ok = score >= 3;
            if (ok) { const P = passed(); P[l.id] = true; store.set('passed', P); $('.tabs button[data-t="test"]', root).textContent = '④ 確認テスト 🏅'; }
            body.appendChild(el(`<div class="card ${ok ? 'ok' : 'ng'}" style="text-align:center;padding:16px"><div style="font-size:22px;font-family:var(--font-display);font-weight:800">${score} / ${qs.length} 問 正解</div>
              ${ok ? '<div style="margin:10px 0"><span class="hanko">合格</span></div>' : '<p>3問以上で合格。説明をもう一度読んでから挑戦しよう。</p>'}</div>`));
            foot.set({ left: { label: '↺ もう一度', fn: test }, center: `<span class="small muted">結果</span>`, right: next ? { label: '次の授業 →', fn: () => go(next.id) } : { label: '授業の一覧 →', fn: () => { location.hash = `#lessons/${course.id}`; } } });
            return;
          }
          const [q, choices, a, exp] = qs[k];
          foot.set({ left: { label: `← ${TNAME.think}`, fn: () => show('think') }, center: `<span class="small muted">第 ${k + 1} 問 / ${qs.length}　正解 ${score}</span>`, right: { label: k + 1 < qs.length ? '次の問題 →' : '結果を見る →', disabled: true, fn: () => { k++; step(); } } });
          choiceQuestion(body, { q, choices, a, exp, expFig: ((FG[l.id] || {}).t || [])[k] }, ok => {
            if (ok) score++;
            $('.fc', foot).innerHTML = `<span class="small muted">第 ${k + 1} 問 / ${qs.length}　正解 ${score}</span>`;
            foot.enableRight();
          });
        };
        step();
      }
      show(tab);
      // ← → キーで、下のバーの「前へ／次へ」を押す
      const key = e => {
        if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
        const t = $('.lesson', root)?.dataset.tab; if (t !== 'slides' && t !== 'test') return;
        const b = e.key === 'ArrowRight' ? $('.fr .btn', foot) : e.key === 'ArrowLeft' && t === 'slides' ? $('.fl .btn', foot) : null;
        if (b && !b.disabled) b.click();
      };
      document.addEventListener('keydown', key);
      root._cleanup = () => document.removeEventListener('keydown', key);
    }

    if (params.lesson) lesson(params.lesson, params.tab); else menu();
    return () => { cleanup && cleanup(); root._cleanup && root._cleanup(); };
  }
});
