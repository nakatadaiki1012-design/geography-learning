/* 画面の切りかえ（見る／動かす／挑戦／授業モード）と、URL の # による直接リンク */

const GROUPS = [
  { id: 'see', name: '見る', secs: [['globe', '地球儀と図法'], ['climate', '気候'], ['stats', '統計地図（GIS）'], ['landform', '地形と災害']] },
  { id: 'move', name: '動かす', secs: [['time', '時差'], ['topo', '地形図を読む'], ['hazard', '防災シミュレーション'], ['pop', '人口ピラミッド']] },
  { id: 'try', name: '挑戦', secs: [['reading', '資料読み取り'], ['mapquiz', '白地図：国'], ['physmap', '白地図：山・川・砂漠']] },
  { id: 'class', name: '授業モード', secs: [['lessons/sogo', '地理総合'], ['lessons/tankyu', '地理探究']] }
];

let current = null;
function route() {
  const h = decodeURIComponent(location.hash.replace(/^#/, '')) || 'lessons/sogo';
  const parts = h.split('/');
  const id = TOOLS[parts[0]] ? parts[0] : 'globe';
  const params = id === 'lessons' ? { course: parts[1] || 'sogo', lesson: parts[2], tab: parts[3] } : id === 'cert' ? { data: parts.slice(1).join('/') } : {};
  const secKey = id === 'lessons' ? `lessons/${params.course}` : id;
  // 学習の記録・先生用の一覧は、どのグループも選ばない（授業モードの下の段だけ見せる）
  const own = GROUPS.find(g => g.secs.some(s => s[0] === secKey));
  const grp = own || GROUPS[3];
  // 上のバー
  $('#grpnav').innerHTML = '';
  GROUPS.forEach(g => {
    const b = el(`<button type="button" aria-current="${g === own}">${g.name}</button>`);
    b.addEventListener('click', () => { location.hash = '#' + g.secs[0][0]; });
    $('#grpnav').appendChild(b);
  });
  $('#secnav').innerHTML = '';
  grp.secs.forEach(([k, n]) => {
    const b = el(`<button type="button" aria-current="${k === secKey}">${n}</button>`);
    b.addEventListener('click', () => { location.hash = '#' + k; });
    $('#secnav').appendChild(b);
  });
  // 中身
  if (current) { try { current(); } catch (e) { /* 片づけの失敗は無視 */ } }
  const main = $('#main');
  main.innerHTML = '';
  current = TOOLS[id].render(main, params) || null;
  document.title = `${id === 'lessons' ? (params.course === 'tankyu' ? '地理探究' : '地理総合') : TOOLS[id].name} | 地理ラボ`;
  setTopHeight();
  if (!params.tab) window.scrollTo(0, 0);
}
function setTopHeight() { document.documentElement.style.setProperty('--top-h', $('#top').offsetHeight + 'px'); }

// 明るさの切りかえ（自動 → 明るい → 暗い）
(function theme() {
  const order = ['auto', 'light', 'dark'], label = { auto: '🌓<span class="lbl"> 自動</span>', light: '☀<span class="lbl"> 明るい</span>', dark: '☾<span class="lbl"> 暗い</span>' };
  let t = store.get('theme', 'auto');
  const apply = () => { if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); $('#themeBtn').innerHTML = label[t]; };
  $('#themeBtn').addEventListener('click', () => { t = order[(order.indexOf(t) + 1) % 3]; store.set('theme', t); apply(); });
  apply();
})();

window.addEventListener('hashchange', route);
window.addEventListener('resize', setTopHeight);
route();
