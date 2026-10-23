/* 授業をクリアしたことを先生に提出する（提出用リンク）
   ・クリア条件：確認テストに合格／考えようを80字以上／説明で学んだ用語を2つ以上使う
   ・リンクには、名前・授業・点数・記述・使った用語・自己評価・確認コードが入る（サーバーには送らない）
   ・先生はリンクを開くと「学習の記録」を見られる（#cert/...） */

const CLEAR = { len: 80, terms: 2 };
const PROFILE = { get() { return store.get('profile', { name: '', klass: '' }); }, set(p) { store.set('profile', p); } };

// 「学んだ用語」：授業ごとに選んだ用語（LESSON_TERMS）。「GIS|地理情報システム」のように | で言いかえを書ける。
// 用語が決まっていない授業だけ、説明スライドの太字・強調から取り出す
function lessonTerms(l) {
  if (l._terms) return l._terms;
  if (typeof LESSON_TERMS !== 'undefined' && LESSON_TERMS[l.id]) return (l._terms = LESSON_TERMS[l.id]);
  const out = [];
  l.slides.forEach(s => {
    const re = /<span class="key">(.*?)<\/span>|<b>(.*?)<\/b>/g; let m;
    while ((m = re.exec(s.b))) {
      const t = (m[1] || m[2]).replace(/<[^>]+>/g, '').replace(/[…。、]+$/, '').trim();
      if (t.length >= 2 && t.length <= 16 && !/^[\d\s.%℃°]+$/.test(t) && !out.includes(t)) out.push(t);
    }
  });
  return (l._terms = out.slice(0, 14));
}
// 用語を使っているか（言いかえのどれかが入っていればよい）
const termName = t => t.split('|')[0];
function termUsed(term, text) { return term.split('|').some(p => p.length >= 2 && (text || '').includes(p)); }
function lessonStatus(l) {
  const ans = store.get('think', {})['lesson-' + l.id] || '';
  const terms = lessonTerms(l), used = terms.filter(t => termUsed(t, ans));
  const sc = store.get('scores', {})[l.id] || null;
  const ck = store.get('checks', {})['lesson-' + l.id];
  return { ans, len: countChars(ans), terms, used, score: sc ? sc.s : null, sc, passed: !!store.get('passed', {})[l.id], checks: ck || null, viewed: store.get('viewed', {})['lesson-' + l.id] || null };
}
function clearConds(st) {
  return [
    { ok: st.passed, t: `④ 確認テストに合格（3問以上正解）${st.score != null ? `：最高 ${st.score} / 4` : ''}`, tab: 'test' },
    { ok: st.len >= CLEAR.len, t: `③ 考えようを ${CLEAR.len}字以上 書いた（今 ${st.len}字）`, tab: 'think' },
    { ok: st.used.length >= CLEAR.terms, t: `③ ①説明で学んだ用語を ${CLEAR.terms}つ以上 使った（今 ${st.used.length}つ）`, tab: 'think' }
  ];
}

// --- リンクの中身をつくる・読む ---
function b64u(bytes) { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64u(str) { str = str.replace(/-/g, '+').replace(/_/g, '/'); while (str.length % 4) str += '='; const s = atob(str); return Uint8Array.from(s, c => c.charCodeAt(0)); }
function checkCode(obj) { const str = 'geoLab|' + JSON.stringify(obj); let h = 0x811c9dc5; for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36).toUpperCase().padStart(7, '0'); }
async function encodeCert(obj) {
  const body = Object.assign({}, obj); body.h = checkCode(obj);
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  if (window.CompressionStream) {
    try { const st = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw')); return 'z' + b64u(new Uint8Array(await new Response(st).arrayBuffer())); } catch (e) { /* 圧縮できないときはそのまま */ }
  }
  return 'j' + b64u(bytes);
}
async function decodeCert(str) {
  let bytes = unb64u(str.slice(1));
  if (str[0] === 'z') { const st = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')); bytes = new Uint8Array(await new Response(st).arrayBuffer()); }
  const body = JSON.parse(new TextDecoder().decode(bytes));
  const h = body.h; delete body.h;
  return { data: body, ok: h === checkCode(body), code: h };
}
function certUrl(payload) { return location.href.split('#')[0] + '#cert/' + payload; }
const fmtDate = t => { const d = new Date(t); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// 名前・組の入力欄
function profileRow() {
  const p = PROFILE.get();
  const row = el(`<div class="row prof"><label class="small">名前 <input type="text" class="pn" style="width:9em" placeholder="例：地理 花子"></label><label class="small">組・番号 <input type="text" class="pk" style="width:8em" placeholder="例：2年3組12番"></label></div>`);
  $('.pn', row).value = p.name; $('.pk', row).value = p.klass;
  row.addEventListener('input', () => { PROFILE.set({ name: $('.pn', row).value.trim(), klass: $('.pk', row).value.trim() }); row.dispatchEvent(new Event('profile', { bubbles: true })); });
  return row;
}
const FILE_WARN = '<div class="card ng small"><b class="warn">このままでは提出できません。</b>先生から配られたURL（https://〜）から開き直してください。</div>';
// できたリンクを見せる（コピー・共有・開いて確かめる）
function linkBox(url) {
  const long = url.length > 6000;
  const box = el(`<div class="card ok linkbox"><b>提出用リンクができました</b>
    <div class="row" style="margin-top:6px;flex-wrap:nowrap"><input type="text" readonly style="flex:1;min-width:0;font-size:12px"><button type="button" class="btn small cp">コピー</button>${navigator.share ? '<button type="button" class="btn small ghost sh">共有</button>' : ''}<a class="btn small ghost" target="_blank" rel="noopener">開いて確かめる</a></div>
    <p class="small muted" style="margin:4px 0 0">Google Classroom などの課題に、このリンクを貼りつけて提出しよう。${long ? `<br><b class="warn">リンクが長い（${url.length}文字）ので、途中で切れることがあります。授業ごとに分けて提出するほうが安全です。</b>` : ''}</p></div>`);
  const inp = $('input', box); inp.value = url; $('a', box).href = url;
  $('.cp', box).addEventListener('click', async () => { try { await navigator.clipboard.writeText(url); } catch (e) { inp.select(); document.execCommand('copy'); } $('.cp', box).textContent = 'コピーしました ✓'; });
  if ($('.sh', box)) $('.sh', box).addEventListener('click', () => navigator.share({ title: '地理ラボ 学習の記録', url }).catch(() => {}));
  inp.addEventListener('focus', () => inp.select());
  return box;
}
// リンクに入れる1授業分の記録
function recordOf(l, st) {
  return { l: l.id, s: st.score, f: st.sc ? st.sc.first : null, x: st.sc ? st.sc.tries : null, p: st.sc ? st.sc.pt : null, a: st.ans, r: st.checks ? st.checks.map(Boolean) : null, w: st.viewed };
}

// 授業の「⑤ 提出」タブ
function submitPane(container, course, l, goTab) {
  const draw = () => {
    const st = lessonStatus(l), conds = clearConds(st), all = conds.every(c => c.ok);
    const p = PROFILE.get();
    container.innerHTML = `<div class="submit">${location.protocol === 'file:' ? FILE_WARN : ''}
      <div class="card"><b>クリア条件</b>
        <ul class="conds">${conds.map(c => `<li class="${c.ok ? 'ok' : ''}"><span>${c.ok ? '✓' : '・'}</span>${c.t}${c.ok ? '' : ` <button type="button" class="btn small ghost go" data-t="${c.tab}">やる</button>`}</li>`).join('')}</ul>
        <p class="small muted" style="margin:4px 0 0">思考・判断・表現は、①説明で身につけた知識や②資料を読み取る技能を<b>活かして</b>考える力。だから、学んだ用語を使って書くことも条件にしています。</p></div>
      <div class="pslot"></div>
      <div class="row" style="margin-top:8px"><button type="button" class="btn mk" ${all && p.name ? '' : 'disabled'}>提出用リンクをつくる</button><span class="small muted msg">${!all ? 'クリア条件をそろえると、リンクをつくれます' : !p.name ? '名前を入れてください' : ''}</span></div>
      <div class="lslot"></div></div>`;
    $('.pslot', container).appendChild(profileRow());
    $$('.go', container).forEach(b => b.addEventListener('click', () => goTab(b.dataset.t)));
    container.querySelector('.prof').addEventListener('profile', () => { const q = PROFILE.get(); $('.mk', container).disabled = !(all && q.name); $('.msg', container).textContent = !all ? 'クリア条件をそろえると、リンクをつくれます' : !q.name ? '名前を入れてください' : ''; });
    $('.mk', container).addEventListener('click', async () => {
      const q = PROFILE.get();
      const payload = await encodeCert(Object.assign({ v: 2, m: 'one', c: course.id, n: q.name, k: q.klass, t: Date.now() }, recordOf(l, lessonStatus(l))));
      $('.lslot', container).innerHTML = ''; const lb = linkBox(certUrl(payload)); $('.lslot', container).appendChild(lb); lb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  };
  draw();
}

// 授業の一覧の「まとめて提出」
function batchSubmit(container, course) {
  const box = el(`<details class="card batch"><summary><b>まとめて提出する</b>（クリアした授業の記録をひとつのリンクに）</summary><div class="bb"></div></details>`);
  container.appendChild(box);
  const draw = () => {
    const rows = course.all.map(l => ({ l, st: lessonStatus(l) })).filter(x => clearConds(x.st).every(c => c.ok));
    const bb = $('.bb', box);
    bb.innerHTML = `${location.protocol === 'file:' ? FILE_WARN : ''}<p class="small" style="margin:6px 0">クリアした授業：<b>${rows.length}</b> / ${course.all.length}${rows.length ? `（${rows.map(x => x.l.no).join('・')}）` : ''}</p><div class="pslot"></div><div class="row" style="margin-top:6px"><button type="button" class="btn mk" ${rows.length ? '' : 'disabled'}>まとめて提出用リンクをつくる</button></div><div class="lslot"></div>`;
    $('.pslot', bb).appendChild(profileRow());
    $('.mk', bb).addEventListener('click', async () => {
      const q = PROFILE.get(); if (!q.name) { $('.pn', bb).focus(); return; }
      const payload = await encodeCert({ v: 2, m: 'all', c: course.id, n: q.name, k: q.klass, t: Date.now(), list: rows.map(x => recordOf(x.l, x.st)) });
      $('.lslot', bb).innerHTML = ''; const lb = linkBox(certUrl(payload)); $('.lslot', bb).appendChild(lb); lb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  };
  box.addEventListener('toggle', () => { if (box.open) draw(); });
}

// この端末の記録を消す（共用の端末で、次の人に使わせる前に）
function clearDeviceButton() {
  const b = el('<button type="button" class="btn small ghost">この端末の記録を消す（次の人へ）</button>');
  b.addEventListener('click', () => {
    if (!confirm('この端末に保存されている名前・考えようの記述・テストの結果・合格をすべて消します。よろしいですか？\n（共用の端末を次の人に使わせる前に押してください）')) return;
    ['profile', 'think', 'checks', 'viewed', 'scores', 'passed', 'seen', 'bestReading', 'bestMapquiz'].forEach(k => store.set(k, k === 'profile' ? { name: '', klass: '' } : {}));
    location.reload();
  });
  return b;
}

// --- 記録を読んで、クリア条件を計算し直す（リンクの中の値はそのまま信じない） ---
const num = (v, lo, hi) => (typeof v === 'number' && isFinite(v) && v >= lo && v <= hi) ? v : null;
function judgeRecord(course, rec) {
  const l = course && course.all.find(x => x.id === rec.l); if (!l) return null;
  const a = typeof rec.a === 'string' ? rec.a : '';
  const terms = lessonTerms(l), used = terms.filter(t => termUsed(t, a));
  const s = num(rec.s, 0, 4), len = countChars(a);
  const conds = [{ ok: s != null && s >= 3, t: `テスト合格（最高 ${s ?? '—'}/4）` }, { ok: len >= CLEAR.len, t: `記述 ${len}字（${CLEAR.len}字以上）` }, { ok: used.length >= CLEAR.terms, t: `用語 ${used.length}つ（${CLEAR.terms}つ以上）` }];
  return { l, a, terms, used, s, len, conds, clear: conds.every(c => c.ok), first: num(rec.f, 0, 4), tries: num(rec.x, 1, 999), pt: num(rec.p, 1e12, 1e14), r: Array.isArray(rec.r) ? rec.r : null, w: num(rec.w, 1e12, 1e14) };
}
const condHtml = J => `<span class="cbox ${J.clear ? 'ok' : 'ng'}">${J.clear ? 'クリア条件 ✓' : 'クリア条件を満たしていない'}</span> ${J.conds.map(c => `<span class="small ${c.ok ? '' : 'warn'}">${c.ok ? '✓' : '✗'} ${c.t}</span>`).join('　')}`;
const CODE_NOTE = '確認コードは、リンクが途中で切れたり書きかえられたりしていないかを見つけるための簡単なしくみです。本人がつくったことや、内容の正しさを保証するものではありません。';

// 先生が開く「学習の記録」
registerTool('cert', {
  name: '学習の記録',
  render(container, params = {}) {
    const root = el('<div class="lessons"><div class="lesson cert"><p class="muted">読みこみ中…</p></div></div>');
    container.appendChild(root);
    const box = $('.cert', root);
    decodeCert(params.data || '').then(({ data, ok, code }) => {
      const course = COURSES.find(c => c.id === data.c);
      if (!course) throw new Error('科目が見つかりません');
      const t = num(data.t, 1e12, 1e14);
      const head = `<div class="certhead"><div><span class="no">地理ラボ　学習の記録（提出用）</span><h2>${esc(data.n || '（名前なし）')} <small>${esc(data.k || '')}</small></h2></div>
        <div class="vbox ${ok ? 'ok' : 'ng'}">${ok ? '確認コード：リンクの破損なし' : '⚠ 確認コードが合いません（書きかえ・破損の可能性）'}<br><span class="mono">${esc(code || '')}</span></div></div>
        <p class="small muted" style="margin:2px 0 8px">リンクをつくった日時（生徒の端末の時刻）${t ? fmtDate(t) : '—'}・${course.name}</p>`;
      if (data.m === 'one') {
        const J = judgeRecord(course, data); if (!J) throw new Error('授業が見つかりません');
        const l = J.l;
        document.title = `${l.no}_${data.k || ''}_${data.n || ''} | 学習の記録`;
        box.innerHTML = head + `<p class="condrow">${condHtml(J)}</p><div class="certgrid">
          <div class="card"><div class="small muted">${course.name} ${l.no}</div><b style="font-size:18px">${l.title}</b><p class="small" style="margin:4px 0 0">問い：${l.q}</p></div>
          <div class="card" style="text-align:center"><div class="small muted">確認テスト（最高点）</div><div style="font-size:26px;font-weight:800;font-family:var(--font-data)">${J.s ?? '—'} / 4</div>${J.s != null && J.s >= 3 ? '<span class="hanko">合格</span>' : ''}
            <div class="small muted">1回目 ${J.first ?? '—'}/4・挑戦 ${J.tries ?? '—'}回${J.pt ? `<br>合格 ${fmtDate(J.pt)}` : ''}</div></div>
          <div class="card span2"><b>③ 考えよう（思考・判断・表現）</b><p class="small muted" style="margin:2px 0">${l.think.q}</p>
            <div class="answer">${esc(J.a).replace(/\n/g, '<br>')}</div>
            <p class="small" style="margin:6px 0 2px">${J.len}字・この授業で学んだ用語を <b>${J.used.length}</b> つ使用${J.w ? `・解答例を見た時刻 ${fmtDate(J.w)}` : '・解答例はまだ見ていない'}</p>
            <div>${J.terms.map(x => `<span class="tag ${J.used.includes(x) ? 'v' : ''}">${J.used.includes(x) ? '✓ ' : ''}${esc(termName(x))}</span>`).join('')}</div>
            <p class="small" style="margin:6px 0 2px"><b>自己評価</b>　${J.r ? SELF_CHECKS.map((c, i) => `${J.r[i] ? '☑' : '☐'} ${c}`).join('　') : '<span class="muted">（未回答）</span>'}</p></div>
        </div>`;
      } else {
        const list = Array.isArray(data.list) ? data.list.map(r => judgeRecord(course, r)).filter(Boolean) : [];
        document.title = `${course.name}まとめ_${data.k || ''}_${data.n || ''} | 学習の記録`;
        box.innerHTML = head + `<table class="tbl certtbl"><tr><th>授業</th><th>テスト</th><th>クリア</th><th>使った用語</th><th>考えよう（記述）</th></tr>
          ${list.map(J => `<tr><td><b>${J.l.no}</b> ${J.l.title}</td><td class="n">${J.s ?? '—'}/4<br><span class="small muted">1回目 ${J.first ?? '—'}</span></td><td>${J.clear ? '✓' : '<span class="warn">✗</span>'}</td><td class="small">${J.used.map(x => esc(termName(x))).join('・') || '—'}</td><td class="small">${esc(J.a)}</td></tr>`).join('')}</table>
          <p class="small muted">クリアした授業 ${list.filter(J => J.clear).length} / ${course.all.length}</p>`;
      }
      box.appendChild(el(`<p class="small muted" style="margin-top:8px">この記録は生徒の端末でつくられたリンクです（サーバーには保存されていません）。${CODE_NOTE}<button type="button" class="btn small ghost pr" style="margin-left:8px">印刷する</button>　<a href="#teacher" class="small">たくさんの提出をまとめて見る →</a></p>`));
      box.appendChild(el(`<p class="printonly small">確認コード ${esc(code || '')}・リンク作成 ${t ? fmtDate(t) : '—'}</p>`));
      $('.pr', box).addEventListener('click', () => window.print());
    }).catch(() => { box.innerHTML = '<h2>⚠ この記録は読みこめませんでした</h2><p>リンクが途中で切れているか、文字が書きかえられている可能性があります。生徒にリンクをもう一度送ってもらってください。</p>'; });
    return () => { document.title = '地理ラボ'; };
  }
});

// 先生用：たくさんの提出リンクを貼りつけて一覧にする
registerTool('teacher', {
  name: '提出の一覧（先生用）',
  render(container) {
    const root = el(`<div class="lessons"><div class="lesson tpage">
      <div class="lesson-head"><div><span class="no">先生用</span><h2>提出の一覧</h2></div></div>
      <p class="small">生徒から届いた提出用リンクを、下の欄にまとめて貼りつけてください（1行に1つ。Classroom の一覧からコピーしたままでもよい）。リンクの中身はこの端末の中だけで読み、どこにも送りません。</p>
      <textarea class="links" placeholder="https://〜#cert/z…&#10;https://〜#cert/z…" style="min-height:90px"></textarea>
      <div class="row" style="margin-top:6px"><button type="button" class="btn go">一覧にする</button><button type="button" class="btn ghost csv" disabled>CSVをコピー（表計算ソフトへ）</button><span class="small muted msg"></span></div>
      <div class="out" style="overflow-x:auto"></div>
      <p class="small muted">${CODE_NOTE}クリア条件は、リンクの中の記述から計算し直しています。</p></div></div>`);
    container.appendChild(root);
    let rows = [];
    $('.go', root).addEventListener('click', async () => {
      const links = ($('.links', root).value.match(/#cert\/[A-Za-z0-9_-]+/g) || []).map(x => x.slice(6));
      rows = [];
      for (const pl of links) {
        try {
          const { data, ok } = await decodeCert(pl); const course = COURSES.find(c => c.id === data.c); if (!course) throw 0;
          const recs = data.m === 'one' ? [data] : (data.list || []);
          recs.forEach(r => { const J = judgeRecord(course, r); if (J) rows.push({ name: String(data.n || ''), klass: String(data.k || ''), no: J.l.no, title: J.l.title, s: J.s, first: J.first, tries: J.tries, len: J.len, terms: J.used.length, clear: J.clear, ok, t: num(data.t, 1e12, 1e14) }); });
        } catch (e) { rows.push({ bad: true }); }
      }
      const bad = rows.filter(r => r.bad).length; rows = rows.filter(r => !r.bad);
      rows.sort((a, b) => a.klass.localeCompare(b.klass, 'ja', { numeric: true }) || a.name.localeCompare(b.name, 'ja') || a.no.localeCompare(b.no, 'ja', { numeric: true }));
      $('.out', root).innerHTML = `<table class="tbl certtbl"><tr><th>組・番号</th><th>名前</th><th>授業</th><th>最高点</th><th>1回目</th><th>挑戦</th><th>字数</th><th>用語</th><th>クリア</th><th>コード</th><th>作成日時</th></tr>
        ${rows.map(r => `<tr><td>${esc(r.klass)}</td><td>${esc(r.name)}</td><td>${r.no} ${r.title}</td><td class="n">${r.s ?? '—'}</td><td class="n">${r.first ?? '—'}</td><td class="n">${r.tries ?? '—'}</td><td class="n">${r.len}</td><td class="n">${r.terms}</td><td>${r.clear ? '✓' : '<span class="warn">✗</span>'}</td><td>${r.ok ? 'OK' : '<span class="warn">合わない</span>'}</td><td class="small">${r.t ? fmtDate(r.t) : '—'}</td></tr>`).join('')}</table>`;
      $('.msg', root).textContent = `${links.length}件のリンク → ${rows.length}授業分${bad ? `（読みこめないリンク ${bad}件）` : ''}`;
      $('.csv', root).disabled = !rows.length;
    });
    $('.csv', root).addEventListener('click', async () => {
      const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [['組・番号', '名前', '授業', '授業名', '最高点', '1回目', '挑戦回数', '字数', '用語数', 'クリア', '確認コード', '作成日時'].map(q).join(',')]
        .concat(rows.map(r => [r.klass, r.name, r.no, r.title, r.s, r.first, r.tries, r.len, r.terms, r.clear ? '○' : '×', r.ok ? 'OK' : '不一致', r.t ? fmtDate(r.t) : ''].map(q).join(','))).join('\n');
      try { await navigator.clipboard.writeText(csv); $('.msg', root).textContent = 'CSVをコピーしました。表計算ソフトに貼りつけてください。'; } catch (e) { $('.msg', root).textContent = 'コピーできませんでした'; }
    });
    return () => {};
  }
});
