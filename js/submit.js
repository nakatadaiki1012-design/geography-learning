/* 授業をクリアしたことを先生に提出する（提出用リンク）
   ・クリア条件：確認テストに合格／考えようを80字以上／説明で学んだ用語を2つ以上使う
   ・リンクには、名前・授業・点数・記述・使った用語・自己評価・確認コードが入る（サーバーには送らない）
   ・先生はリンクを開くと「学習の記録」を見られる（#cert/...） */

const CLEAR = { len: 80, terms: 2 };
const PROFILE = { get() { return store.get('profile', { name: '', klass: '' }); }, set(p) { store.set('profile', p); } };

// 説明スライドの太字・強調から「学んだ用語」を取り出す
function lessonTerms(l) {
  if (l._terms) return l._terms;
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
// 用語を使っているか（「GIS（地理情報システム）」なら GIS か 地理情報システム のどちらかでよい）
function termUsed(term, text) { return term.split(/[（）()・、\s／/]/).filter(x => x.length >= 2).some(p => text.includes(p)); }
function lessonStatus(l) {
  const ans = store.get('think', {})['lesson-' + l.id] || '';
  const terms = lessonTerms(l), used = terms.filter(t => termUsed(t, ans));
  const sc = store.get('scores', {})[l.id];
  return { ans, len: ans.replace(/\s/g, '').length, terms, used, score: sc ? sc.s : null, passed: !!store.get('passed', {})[l.id], checks: store.get('checks', {})['lesson-' + l.id] || [] };
}
function clearConds(st) {
  return [
    { ok: st.passed, t: `④ 確認テストに合格（3問以上正解）${st.score != null ? `：今の最高 ${st.score} / 4` : ''}`, tab: 'test' },
    { ok: st.len >= CLEAR.len, t: `③ 考えようを ${CLEAR.len}字以上 書いた（今 ${st.len}字）`, tab: 'think' },
    { ok: st.used.length >= CLEAR.terms, t: `③ 説明で学んだ用語を ${CLEAR.terms}つ以上 使った（今 ${st.used.length}つ）`, tab: 'think' }
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
  const row = el(`<div class="row prof"><label class="small">名前 <input type="text" class="pn" style="width:9em" placeholder="例：地理 花子"></label><label class="small">組・番号 <input type="text" class="pk" style="width:7em" placeholder="例：2年3組12番"></label></div>`);
  $('.pn', row).value = p.name; $('.pk', row).value = p.klass;
  row.addEventListener('input', () => { PROFILE.set({ name: $('.pn', row).value.trim(), klass: $('.pk', row).value.trim() }); row.dispatchEvent(new Event('profile', { bubbles: true })); });
  return row;
}
// できたリンクを見せる（コピー・共有・開いて確かめる）
function linkBox(url) {
  const box = el(`<div class="card ok linkbox"><b>提出用リンクができました</b>
    <div class="row" style="margin-top:6px;flex-wrap:nowrap"><input type="text" readonly style="flex:1;min-width:0;font-size:12px"><button type="button" class="btn small cp">コピー</button>${navigator.share ? '<button type="button" class="btn small ghost sh">共有</button>' : ''}<a class="btn small ghost" target="_blank" rel="noopener">開いて確かめる</a></div>
    <p class="small muted" style="margin:4px 0 0">Google Classroom などの課題に、このリンクを貼りつけて提出しよう。${location.protocol === 'file:' ? '<br><b class="warn">※ いまはパソコンのファイルを直接開いているので、このリンクは先生のパソコンでは開けません。GitHub Pages のURLから開いて、リンクをつくり直してください。</b>' : ''}</p></div>`);
  const inp = $('input', box); inp.value = url; $('a', box).href = url;
  $('.cp', box).addEventListener('click', async () => { try { await navigator.clipboard.writeText(url); } catch (e) { inp.select(); document.execCommand('copy'); } $('.cp', box).textContent = 'コピーしました ✓'; });
  if ($('.sh', box)) $('.sh', box).addEventListener('click', () => navigator.share({ title: '地理ラボ 学習の記録', url }).catch(() => {}));
  inp.addEventListener('focus', () => inp.select());
  return box;
}

// 授業の「⑤ 提出」タブ
function submitPane(container, course, l, goTab) {
  const draw = () => {
    const st = lessonStatus(l), conds = clearConds(st), all = conds.every(c => c.ok);
    const p = PROFILE.get();
    container.innerHTML = `<div class="submit">
      <div class="card"><b>クリア条件</b>
        <ul class="conds">${conds.map((c, i) => `<li class="${c.ok ? 'ok' : ''}"><span>${c.ok ? '✓' : '・'}</span>${c.t}${c.ok ? '' : ` <button type="button" class="btn small ghost go" data-t="${c.tab}">やる</button>`}</li>`).join('')}</ul>
        <p class="small muted" style="margin:4px 0 0">思考・判断・表現は、①説明で身につけた知識や②資料を読み取る技能を<b>活かして</b>考える力。だから、用語を使って書くことも条件にしています。</p></div>
      <div class="pslot"></div>
      <div class="row" style="margin-top:8px"><button type="button" class="btn mk" ${all && p.name ? '' : 'disabled'}>提出用リンクをつくる</button><span class="small muted msg">${!all ? 'クリア条件をそろえると、リンクをつくれます' : !p.name ? '名前を入れてください' : ''}</span></div>
      <div class="lslot"></div></div>`;
    $('.pslot', container).appendChild(profileRow());
    $$('.go', container).forEach(b => b.addEventListener('click', () => goTab(b.dataset.t)));
    container.querySelector('.prof').addEventListener('profile', () => { const q = PROFILE.get(); $('.mk', container).disabled = !(all && q.name); $('.msg', container).textContent = !all ? 'クリア条件をそろえると、リンクをつくれます' : !q.name ? '名前を入れてください' : ''; });
    $('.mk', container).addEventListener('click', async () => {
      const q = PROFILE.get(), st2 = lessonStatus(l);
      const payload = await encodeCert({ v: 1, m: 'one', c: course.id, l: l.id, n: q.name, k: q.klass, t: Date.now(), s: st2.score, a: st2.ans, u: st2.used, r: st2.checks.map(Boolean) });
      $('.lslot', container).innerHTML = ''; const lb = linkBox(certUrl(payload)); $('.lslot', container).appendChild(lb); lb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  };
  draw();
}

// 授業の一覧の「まとめて提出」
function batchSubmit(container, course) {
  const box = el(`<details class="card batch"><summary><b>まとめて提出する</b>（合格した授業の記録をひとつのリンクに）</summary><div class="bb"></div></details>`);
  container.appendChild(box);
  const draw = () => {
    const rows = course.all.map(l => ({ l, st: lessonStatus(l) })).filter(x => clearConds(x.st).every(c => c.ok));
    const bb = $('.bb', box);
    bb.innerHTML = `<p class="small" style="margin:6px 0">クリアした授業：<b>${rows.length}</b> / ${course.all.length}${rows.length ? `（${rows.map(x => x.l.no).join('・')}）` : ''}</p><div class="pslot"></div><div class="row" style="margin-top:6px"><button type="button" class="btn mk" ${rows.length ? '' : 'disabled'}>まとめて提出用リンクをつくる</button></div><div class="lslot"></div>`;
    $('.pslot', bb).appendChild(profileRow());
    $('.mk', bb).addEventListener('click', async () => {
      const q = PROFILE.get(); if (!q.name) { $('.pn', bb).focus(); return; }
      const payload = await encodeCert({ v: 1, m: 'all', c: course.id, n: q.name, k: q.klass, t: Date.now(), list: rows.map(x => ({ l: x.l.id, s: x.st.score, a: x.st.ans.slice(0, 400), u: x.st.used })) });
      $('.lslot', bb).innerHTML = ''; const lb = linkBox(certUrl(payload)); $('.lslot', bb).appendChild(lb); lb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  };
  box.addEventListener('toggle', () => { if (box.open) draw(); });
}

// 先生が開く「学習の記録」
registerTool('cert', {
  name: '学習の記録',
  render(container, params = {}) {
    const root = el('<div class="lessons"><div class="lesson cert"><p class="muted">読みこみ中…</p></div></div>');
    container.appendChild(root);
    const box = $('.cert', root);
    decodeCert(params.data || '').then(({ data, ok, code }) => {
      const course = COURSES.find(c => c.id === data.c);
      const head = `<div class="certhead"><div><span class="no">地理ラボ　学習の記録（提出用）</span><h2>${esc(data.n || '（名前なし）')} <small>${esc(data.k || '')}</small></h2></div>
        <div class="vbox ${ok ? 'ok' : 'ng'}">${ok ? '✓ 確認コード一致' : '⚠ 内容が書きかえられた可能性があります'}<br><span class="mono">${code}</span></div></div>
        <p class="small muted" style="margin:2px 0 8px">提出日時 ${fmtDate(data.t)}・${course ? course.name : ''}</p>`;
      if (data.m === 'one') {
        const l = course && course.all.find(x => x.id === data.l);
        if (!l) throw new Error('授業が見つかりません');
        const checks = ['資料から読み取ったことを根拠にした', '説明で学んだ知識（用語）を使って理由を説明した', '結論をはっきり書いた'];
        const terms = lessonTerms(l);
        box.innerHTML = head + `<div class="certgrid">
          <div class="card"><div class="small muted">${course.name} ${l.no}</div><b style="font-size:18px">${l.title}</b><p class="small" style="margin:4px 0 0">問い：${l.q}</p></div>
          <div class="card" style="text-align:center"><div class="small muted">確認テスト</div><div style="font-size:26px;font-weight:800;font-family:var(--font-data)">${data.s ?? '—'} / 4</div>${(data.s || 0) >= 3 ? '<span class="hanko">合格</span>' : ''}</div>
          <div class="card span2"><b>③ 考えよう（思考・判断・表現）</b><p class="small muted" style="margin:2px 0">${l.think.q}</p>
            <div class="answer">${esc(data.a || '').replace(/\n/g, '<br>')}</div>
            <p class="small" style="margin:6px 0 2px">${(data.a || '').replace(/\s/g, '').length}字・説明で学んだ用語を <b>${(data.u || []).length}</b> つ使用</p>
            <div>${terms.map(t => `<span class="tag ${(data.u || []).includes(t) ? 'v' : ''}">${(data.u || []).includes(t) ? '✓ ' : ''}${t}</span>`).join('')}</div>
            <p class="small" style="margin:6px 0 2px"><b>自己評価</b>　${checks.map((c, i) => `${(data.r || [])[i] ? '☑' : '☐'} ${c}`).join('　')}</p></div>
        </div>`;
      } else {
        box.innerHTML = head + `<table class="tbl certtbl"><tr><th>授業</th><th>テスト</th><th>用語</th><th>考えよう（記述）</th></tr>
          ${data.list.map(x => { const l = course.all.find(y => y.id === x.l); return `<tr><td><b>${l ? l.no : x.l}</b> ${l ? l.title : ''}</td><td class="n">${x.s ?? '—'}/4</td><td class="n">${(x.u || []).length}</td><td class="small">${esc(x.a || '')}</td></tr>`; }).join('')}</table>
          <p class="small muted">合格した授業 ${data.list.length} / ${course.all.length}</p>`;
      }
      box.appendChild(el(`<p class="small muted" style="margin-top:8px">この記録は生徒の端末でつくられたリンクです（サーバーには保存されていません）。確認コードは、リンクの文字が書きかえられていないかを確かめる簡単なしくみです。<button type="button" class="btn small ghost pr" style="margin-left:8px">印刷する</button></p>`));
      $('.pr', box).addEventListener('click', () => window.print());
    }).catch(() => { box.innerHTML = '<h2>⚠ この記録は読みこめませんでした</h2><p>リンクが途中で切れているか、文字が書きかえられている可能性があります。生徒にリンクをもう一度送ってもらってください。</p>'; });
    return () => {};
  }
});
