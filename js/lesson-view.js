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
      const last = course.all.find(l => l.id === store.get('last', {})[course.id]);
      const fresh = !course.all.some(l => V[l.id]);
      const next = (last && !P[last.id] ? last : null) || course.all.find(l => !P[l.id] && V[l.id]) || course.all.find(l => !V[l.id]) || course.all.find(l => !P[l.id]);
      root.innerHTML = `<div class="lesson">
        <div class="lesson-head"><div><span class="no">授業モード</span><h2>${course.name}</h2></div>
        <div style="margin-left:auto;text-align:right"><div class="small muted">合格した授業</div><div class="mono" style="font-size:24px;font-weight:600">${done} / ${course.all.length}</div></div></div>
        <details class="howto"${fresh ? ' open' : ''}><summary><b>使い方</b>（はじめての人へ）</summary><ol class="small">
          <li>授業をえらび、<b>①説明 → ②資料 → ③考える → ④テスト → ⑤提出</b> の順に、下のボタンで進む</li>
          <li>④確認テストで4問中3問以上正解すると<b>合格</b>。③で用語を使って書き、④に合格すると<b>クリア</b>になり、⑤で先生に提出できる</li>
          <li>書いた文や結果は<b>この端末のブラウザ</b>に自動で保存される</li>
          <li>上の「見る・動かす・挑戦」では、地図やグラフの道具を自由に使える</li></ol></details>
        ${next ? `<button type="button" class="btn cont">${fresh ? 'はじめる' : '続きから'}：${next.no} ${next.title}</button>` : ''}
        <div class="lesson-menu"></div></div>`;
      const mb = $('.lesson-menu', root);
      course.parts.forEach(p => {
        const has = (next && p.lessons.includes(next)) || p.lessons.some(l => l === last);
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
      batchSubmit($('.lesson', root), course);
      const ex = el(`<details class="card tnote"><summary><b>先生へ</b>（提出のしくみ・共用の端末）</summary><div class="small" style="margin-top:6px">
        <p>各授業の「⑤ 提出」で、生徒が提出用リンクをつくります。リンクには名前・テストの点・記述・使った用語が入り、開くと「学習の記録」が見られます（記録はサーバーに保存されず、リンクの中だけにあります）。</p>
        <p>クリア条件：確認テスト3/4以上・考えようを${CLEAR.len}字以上・その授業の用語を${CLEAR.terms}つ以上。たくさん集まったら <a href="#teacher">提出の一覧（先生用）</a> に貼りつけると、表やCSVにできます。</p>
        <p>記録はこの端末のブラウザに残ります。共用のChromebookでは、使い終わったら下のボタンで消してください。</p></div><div class="row cdev"></div></details>`);
      $('.cdev', ex).appendChild(clearDeviceButton());
      $('.lesson', root).appendChild(ex);
      const cb = $('.cont', root); if (cb) cb.addEventListener('click', () => go(next.id));
    }

    function go(id, tab) { location.hash = `#lessons/${course.id}/${id}${tab ? '/' + tab : ''}`; }

    function lesson(id, tab = 'slides') {
      const l = course.all.find(x => x.id === id); if (!l) return menu();
      const V = seen(); V[l.id] = true; store.set('seen', V);
      const LA = store.get('last', {}); LA[course.id] = l.id; store.set('last', LA);
      const idx = course.all.indexOf(l), prev = course.all[idx - 1], next = course.all[idx + 1];
      root.innerHTML = `<div class="lesson">
        <div class="row lnav" style="justify-content:space-between;flex-wrap:nowrap"><button type="button" class="btn small ghost back">← <span class="lbl">授業の</span>一覧</button>
          <span class="no lno">${course.name} ${l.no}<b class="ltitle">${l.title}</b></span>
          <span class="row" style="flex-wrap:nowrap;gap:4px"><button type="button" class="btn small ghost pv" ${prev ? '' : 'disabled'} title="前の授業">‹ ${prev ? prev.no : ''}<span class="lbl">へ</span></button><button type="button" class="btn small ghost nx" ${next ? '' : 'disabled'} title="次の授業">${next ? next.no : ''}<span class="lbl">へ</span> ›</button></span></div>
        <div class="lesson-head" style="margin-top:6px"><div><h2>${l.title}</h2></div></div>
        <div class="lesson-q"><b>問い</b>　${l.q}</div>
        <div class="tabs" role="tablist">
          <button type="button" data-t="slides">①<span class="tl"> </span>説明</button><button type="button" data-t="tool">②<span class="tl"> </span>資料<span class="tl">で考える</span></button><button type="button" data-t="think">③<span class="tl"> </span>考え<span class="tl">よう</span><span class="ts">る</span></button><button type="button" data-t="test">④<span class="tl"> 確認</span>テスト<span class="medal">${passed()[l.id] ? '🏅' : ''}</span></button><button type="button" data-t="submit">⑤<span class="tl"> </span>提出</button></div>
        <div class="tabbody"></div></div>`;
      $('.back', root).addEventListener('click', () => { location.hash = `#lessons/${course.id}`; });
      if (prev) $('.pv', root).addEventListener('click', () => go(prev.id));
      if (next) $('.nx', root).addEventListener('click', () => go(next.id));
      $$('.tabs button', root).forEach(b => b.addEventListener('click', () => show(b.dataset.t)));
      const body = $('.tabbody', root);
      const foot = makeFoot(); $('.lesson', root).appendChild(foot);
      const TABS = ['slides', 'tool', 'think', 'test', 'submit'], TNAME = { slides: '① 説明', tool: '② 資料で考える', think: '③ 考えよう', test: '④ 確認テスト', submit: '⑤ 提出' };
      let si = 0;
      function show(t) {
        cleanup && cleanup(); cleanup = null;
        $$('.tabs button', root).forEach(b => { b.setAttribute('aria-selected', String(b.dataset.t === t)); if (b.dataset.t === t) b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
        $('.lesson', root).dataset.tab = t;
        body.innerHTML = '';
        body.scrollTop = 0;
        const i = TABS.indexOf(t);
        // 説明とテスト以外は「前のタブ／次のタブ」
        if (t !== 'slides' && t !== 'test') foot.set({ left: { label: `← ${TNAME[TABS[i - 1]]}`, fn: () => show(TABS[i - 1]) }, center: dotsHtml(5, i), right: t === 'submit' ? (next ? { label: '次の授業 →', fn: () => go(next.id) } : { label: '授業の一覧 →', fn: () => { location.hash = `#lessons/${course.id}`; } }) : { label: `${TNAME[TABS[i + 1]]} →`, fn: () => show(TABS[i + 1]) } });
        if (t === 'slides') slides();
        if (t === 'tool') {
          body.appendChild(el(`<p class="small toolhint" style="margin:0 0 6px"><b>この資料でやること</b>　「${l.tool.label}」をさわって、③の問いの手がかりをさがそう</p>`));
          const box = el('<div class="embed"></div>'); body.appendChild(box);
          // スマホでは、授業の見出しの下に残った高さいっぱいに道具を表示する
          if (MOBILE.matches) box.style.setProperty('--embed-h', Math.max(400, window.innerHeight - box.getBoundingClientRect().top - 60) + 'px');
          cleanup = TOOLS[l.tool.id].render(box, Object.assign({}, l.tool.params));
        }
        if (t === 'think') {
          // 知識（説明で学んだ用語）を活かして書く。見方・考え方は下の「考えよう」に出る
          const terms = lessonTerms(l);
          const kc = el(`<div class="card kterms"><div><b>知識を活かそう</b> <span class="small muted">①説明で学んだ用語を${CLEAR.terms}つ以上使って書こう</span></div><div class="chips"></div><div class="small kcount"></div></div>`);
          body.appendChild(kc);
          const tc = thinkCard(Object.assign({ id: 'lesson-' + l.id, lockLen: CLEAR.len }, l.think));
          body.appendChild(tc);
          const ta = $('textarea', tc);
          const upd = () => {
            const used = terms.filter(x => termUsed(x, ta.value));
            $('.chips', kc).innerHTML = terms.map((x, i) => `<button type="button" class="tag ${used.includes(x) ? 'v' : ''}" data-i="${i}" title="押すと入力欄に入る">${used.includes(x) ? '✓ ' : '＋'}${termName(x)}</button>`).join('');
            const n = countChars(ta.value);
            $('.kcount', kc).innerHTML = `使った用語 <b>${used.length}</b>つ・${n}字　${used.length >= CLEAR.terms && n >= CLEAR.len ? '<b style="color:var(--ok)">✓ 記述のクリア条件OK</b>' : `<span class="muted">（クリア条件：用語${CLEAR.terms}つ以上・${CLEAR.len}字以上）</span>`}`;
          };
          ta.addEventListener('input', upd); upd();
          $('.chips', kc).addEventListener('click', e => {
            const b = e.target.closest('button[data-i]'); if (!b) return;
            let w = termName(terms[+b.dataset.i]); const s = ta.selectionStart ?? ta.value.length;
            // 文の途中に続けて入れるときは「、」で区切る
            if (s > 0 && !/[、。・（「\s]$/.test(ta.value.slice(0, s))) w = '、' + w;
            ta.value = ta.value.slice(0, s) + w + ta.value.slice(ta.selectionEnd ?? s);
            ta.focus(); ta.setSelectionRange(s + w.length, s + w.length);
            ta.dispatchEvent(new Event('input', { bubbles: true }));
          });
        }
        if (t === 'submit') submitPane(body, course, l, show);
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
        let k = 0, score = 0; const wrong = [];
        // 挑戦するたびに選択肢の順番を入れかえる（位置を覚えるだけでは合格できないように）
        const qs = l.test.map(([q, choices, a, exp], i) => {
          const order = shuffle(choices.map((c, j) => j));
          return [q, order.map(j => choices[j]), order.indexOf(a), exp];
        });
        const step = () => {
          body.innerHTML = '';
          if (k >= qs.length) {
            const ok = score >= 3;
            if (ok) { const P = passed(); P[l.id] = true; store.set('passed', P); $('.tabs button[data-t="test"] .medal', root).textContent = '🏅'; }
            // 最高点・1回目の点・挑戦した回数・はじめて合格した日時を残す
            const SC = store.get('scores', {}), o = SC[l.id] || {};
            SC[l.id] = { s: Math.max(o.s ?? 0, score), t: Date.now(), first: o.first ?? score, tries: (o.tries || 0) + 1, pt: o.pt || (ok ? Date.now() : null) };
            store.set('scores', SC);
            body.appendChild(el(`<div class="card ${ok ? 'ok' : 'ng'}" style="text-align:center;padding:16px"><div style="font-size:22px;font-family:var(--font-display);font-weight:800">${score} / ${qs.length} 問 正解</div>
              ${ok ? '<div style="margin:10px 0"><span class="hanko">合格</span></div>' : '<p style="margin:4px 0 0">3問以上で合格。説明を見直してから、もう一度挑戦しよう（選択肢の順番は毎回かわる）。</p>'}</div>`));
            if (wrong.length) body.appendChild(el(`<div class="card"><b>まちがえた問題</b><ul class="small" style="margin:4px 0 0;padding-left:1.2em">${wrong.map(([q, c, a, e]) => `<li>${q} → <b>${c[a]}</b>${e ? `<span class="muted">（${e}）</span>` : ''}</li>`).join('')}</ul></div>`));
            foot.set(ok ? { left: { label: '↺ もう一度', fn: test }, center: `<span class="small muted">結果</span>`, right: { label: '⑤ 提出 →', fn: () => show('submit') } }
              : { left: { label: '← ① 説明', fn: () => { si = 0; show('slides'); } }, center: `<span class="small muted">結果</span>`, right: { label: '↺ もう一度', fn: test } });
            return;
          }
          const [q, choices, a, exp] = qs[k];
          foot.set({ left: { label: `← ${TNAME.think}`, fn: () => show('think') }, center: `<span class="small muted">第 ${k + 1} 問 / ${qs.length}　正解 ${score}</span>`, right: { label: k + 1 < qs.length ? '次の問題 →' : '結果を見る →', disabled: true, fn: () => { k++; step(); } } });
          choiceQuestion(body, { q, choices, a, exp, expFig: ((FG[l.id] || {}).t || [])[k] }, ok => {
            if (ok) score++; else wrong.push(qs[k]);
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
