/* 見る：写真資料（資料集のように、実際の景色の写真で地形・気候・暮らしを見る）
   写真はウィキメディア・コモンズの自由に使える写真。撮影者とライセンスを必ず表示する（js/photos.js） */

const PHOTO_CATS = [
  { id: 'land', name: '地形', d: '教科書に出てくる地形を、実際の景色で見よう。' },
  { id: 'climate', name: '気候と景観', d: '気候帯がちがうと、植物や景色はどう変わる？' },
  { id: 'jan', name: '同じ1月の世界', d: '同じ1月でも、世界の都市の景色はこんなにちがう。数字は1月の平均気温と降水量（雨温図のデータ）。' },
  { id: 'life', name: '暮らし', d: '自然環境に合わせた家・農業・集落。' }
];
const photoById = id => PHOTOS.find(p => p.id === id);
const photoCredit = p => `写真：<a href="${p.page}" target="_blank" rel="noopener">${esc(p.artist || '撮影者不明')}</a>／${esc(p.lic)}（ウィキメディア・コモンズ）`;

// 写真を大きく見る（左右で次の写真へ。Esc・×で閉じる）
function openPhotos(ids, start = 0) {
  const list = ids.map(photoById).filter(Boolean); if (!list.length) return;
  let i = clamp(start, 0, list.length - 1);
  const box = el(`<div class="plb" role="dialog" aria-modal="true" aria-label="写真"><div class="plb-in">
    <button type="button" class="plb-x" aria-label="閉じる">×</button>
    <div class="plb-img"><img alt=""><button type="button" class="plb-p" aria-label="前の写真">‹</button><button type="button" class="plb-n" aria-label="次の写真">›</button></div>
    <div class="plb-cap"></div></div></div>`);
  const draw = () => {
    const p = list[i];
    $('img', box).src = p.src; $('img', box).alt = p.title;
    $('.plb-cap', box).innerHTML = `<div class="row" style="flex-wrap:nowrap"><b class="pt">${p.title}</b><span class="small muted" style="margin-left:auto;white-space:nowrap">${i + 1} / ${list.length}</span></div>
      ${p.place ? `<div class="small muted">📍 ${p.place}</div>` : ''}<p>${p.cap}</p><p class="small muted cr">${photoCredit(p)}</p>`;
    $('.plb-p', box).hidden = $('.plb-n', box).hidden = list.length < 2;
  };
  const close = () => { box.remove(); document.removeEventListener('keydown', key); };
  const go = d => { i = (i + d + list.length) % list.length; draw(); };
  const key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
  $('.plb-x', box).addEventListener('click', close);
  box.addEventListener('click', e => { if (e.target === box) close(); });
  $('.plb-p', box).addEventListener('click', () => go(-1)); $('.plb-n', box).addEventListener('click', () => go(1));
  // 指で左右にはらって次へ
  let sx = null; $('.plb-img', box).addEventListener('pointerdown', e => { sx = e.clientX; });
  $('.plb-img', box).addEventListener('pointerup', e => { if (sx != null && Math.abs(e.clientX - sx) > 50) go(e.clientX < sx ? 1 : -1); sx = null; });
  document.addEventListener('keydown', key);
  document.body.appendChild(box); draw(); $('.plb-x', box).focus();
}

registerTool('photos', {
  name: '写真資料',
  render(container, params = {}) {
    let cat = params.cat || 'land';
    const root = el('<div class="lessons"><div class="lesson photos"><div class="phead"></div><div class="pgrid"></div></div></div>');
    container.appendChild(root);
    const draw = () => {
      const C = PHOTO_CATS.find(c => c.id === cat), list = PHOTOS.filter(p => p.cat === cat);
      $('.phead', root).innerHTML = `<span class="no">見る</span><h2 style="margin:0">写真資料</h2><p class="small muted" style="margin:2px 0 8px">実際の景色の写真。押すと大きく見られます。</p>`;
      const sg = seg(PHOTO_CATS.map(c => ({ v: c.id, label: c.name })), cat, v => { cat = v; draw(); });
      $('.phead', root).appendChild(sg);
      $('.phead', root).appendChild(el(`<p class="small" style="margin:6px 0 0">${C.d}</p>`));
      $('.pgrid', root).innerHTML = list.map((p, i) => {
        const c = p.city && CITIES.find(x => x.id === p.city);
        const data = c ? `<span class="pdata">🌡️ ${c.t[0].toFixed(1)}℃　☔ ${Math.round(c.p[0])}mm</span>` : '';
        return `<button type="button" class="pcard" data-i="${i}"><img loading="lazy" src="${p.thumb || p.src}" alt="${esc(p.title)}">${p.badge ? `<span class="pbadge">${p.badge}</span>` : ''}<span class="ptx"><b>${p.title}</b>${p.place ? `<span class="small muted">${p.place}</span>` : ''}${data}</span></button>`;
      }).join('');
      $$('.pcard', root).forEach(b => b.addEventListener('click', () => openPhotos(list.map(p => p.id), +b.dataset.i)));
    };
    draw();
    return () => { const b = $('.plb'); if (b) b.remove(); };
  }
});
