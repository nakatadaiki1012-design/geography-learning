/* 地形を本物らしく見せる部品
   ・hillshade：標高から山の陰をつけた色（地形図・地形分類図の下じき）
   ・F.block：立体のブロック図（ドラッグで回して見る）。上流〜河口・扇状地・リアス海岸・フィヨルド・カルスト・河岸段丘・火山 */

const HYPSO = d3.interpolateRgbBasis(['#93c47d', '#cfe0a0', '#e6d79a', '#d6b47c', '#b08a5e', '#8f7d6c', '#f4f2ee']);

// 陰影（光は北西の上から）。grid：標高（m）、cell：1マスの大きさ（m）
function shadeOf(grid, w, h, cell, ex = 2) {
  const s = new Float32Array(w * h);
  const L = [-0.55, -0.55, 0.63];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const g = (a, b) => grid[clamp(b, 0, h - 1) * w + clamp(a, 0, w - 1)];
    const dx = (g(i + 1, j) - g(i - 1, j)) / (2 * cell) * ex, dy = (g(i, j + 1) - g(i, j - 1)) / (2 * cell) * ex;
    const n = [-dx, -dy, 1], len = Math.hypot(...n);
    s[j * w + i] = clamp((n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / len, 0, 1);
  }
  return s;
}
function mix(c, k) { const r = d3.rgb(c); return d3.rgb(r.r * k, r.g * k, r.b * k); }

// 色つきの陰影図（canvas）。colorAt(k) で色を決める（なければ高さで色分け）
function reliefCanvas(grid, w, h, cell, { colorAt, waterAt, zmax } = {}) {
  const sh = shadeOf(grid, w, h, cell), max = zmax || Math.max(1, d3.max(grid));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'), im = ctx.createImageData(w, h);
  for (let k = 0; k < w * h; k++) {
    let c;
    if (waterAt && waterAt(k)) c = mix('#6aa6dc', 0.85 + 0.15 * sh[k]);
    else if (grid[k] < 0) c = d3.rgb('#7fb7e0');
    else { const base = colorAt ? colorAt(k) : HYPSO(clamp(grid[k] / max, 0, 1)); c = mix(base, 0.55 + 0.6 * sh[k]); }
    im.data[k * 4] = Math.min(255, c.r); im.data[k * 4 + 1] = Math.min(255, c.g); im.data[k * 4 + 2] = Math.min(255, c.b); im.data[k * 4 + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  return cv;
}

// --- ブロック図の地形 ---
function noise2(x, y) { return Math.sin(x * 0.37 + Math.sin(y * 0.21) * 2) * Math.cos(y * 0.29 + Math.sin(x * 0.17) * 2); }
const BLOCKS = {
  river: (() => {
    const w = 200, h = 120, cell = 50;
    const rx = y => y < 45 ? 62 + 4 * Math.sin(y / 5) : 62 + (y - 45) * 0.55 + 20 * Math.sin((y - 45) / 7.5) * Math.min(1, (y - 45) / 12);
    // 海岸線：河口に三角州が円弧状に張り出す
    const coast = x => 97 + 2 * Math.sin(x / 13) + 15 * Math.max(0, 1 - ((x - rx(100)) / 26) ** 2) ** 1.5;
    const z = new Float32Array(w * h), water = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = y * w + x, d = Math.abs(x - rx(y));
      let m = y < 46 ? (46 - y) * 6.5 + 18 * noise2(x / 1.6, y / 1.6) * Math.min(1, (46 - y) / 8) : -99;
      if (y < 46) m -= 70 * Math.exp(-((d / 8) ** 2)) * Math.min(1, (46 - y) / 12 + 0.25);
      const fd = Math.hypot(x - 62, (y - 40) * 1.1), fan = y >= 38 && fd < 42 ? 48 - fd * 1.0 : -99;
      const plain = Math.max(2, 12 - (y - 46) * 0.15) + 0.7 * noise2(x / 3, y / 3);
      let v = Math.max(m, fan, plain);
      if (y >= 50 && d < 6) v += 1.8 * Math.max(0, 1 - Math.abs(d - 3.8) / 2.4);  // 自然堤防
      if (d < 2.2) { v -= 3; water[k] = 1; }
      const od = Math.abs(Math.hypot(x - 142, (y - 76) * 1.3) - 9);
      if (od < 1.8 && Math.abs(Math.atan2((y - 76) * 1.3, x - 142)) < 2.0) { v = Math.min(v, plain - 2.5); water[k] = 1; }  // 三日月湖（取り残された川の曲がり）
      if (y > coast(x)) { v = -4 - (y - coast(x)) * 0.6; water[k] = 0; }
      z[k] = v;
    }
    return { w, h, cell, z, water, sea: true, title: '川の上流から河口まで（ブロック図）',
      labels: [[rx(14) + 8, 14, 'V字谷'], [150, 8, '山地'], [62, 50, '扇状地'], [rx(80) + 9, 80, '自然堤防'], [30, 82, '後背湿地（水田）'], [142, 66, '三日月湖'], [rx(100) + 8, 104, '三角州'], [175, 116, '海']],
      marks: [...d3.range(50, 104, 5).map(y => ({ x: rx(y) + (y % 10 ? 4.5 : -4.5), y, t: 'house' })), ...[[25, 70], [35, 92], [160, 95], [180, 72], [110, 62]].map(([x, y]) => ({ x, y, t: 'rice' }))] };
  })(),
  fan: (() => {
    const w = 150, h = 100, cell = 30;
    const z = new Float32Array(w * h), water = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = y * w + x, d = Math.abs(x - 75 - 3 * Math.sin(y / 4));
      let m = y < 34 ? (34 - y) * 7 + 18 * noise2(x / 1.5, y / 1.5) * Math.min(1, (34 - y) / 6) : -99;
      if (y < 34) m -= 80 * Math.exp(-((d / 7) ** 2)) * Math.min(1, (34 - y) / 8 + 0.3);
      const fd = Math.hypot(x - 75, (y - 30) * 1.05), fan = y >= 28 && fd < 62 ? 70 - fd * 1.0 : -99;
      let v = Math.max(m, fan, 6 + 0.5 * noise2(x / 3, y / 3) - (y - 30) * 0.03);
      if (y < 52 && Math.abs(x - 75) < 1.6) { v -= 2.5; if (y < 40) water[k] = 1; }  // 扇央では水が地下へ（水無川）
      if (y > 88 && Math.abs(x - 75 - 10 * Math.sin(y / 5)) < 1.5) { v -= 1.5; water[k] = 1; }  // 扇端から再び川に
      z[k] = v;
    }
    const toe = d3.range(-70, 71, 14).map(a => { const r = a * Math.PI / 180; return { x: 75 + 62 * Math.sin(r), y: 30 + 59 * Math.cos(r) }; });
    return { w, h, cell, z, water, title: '扇状地（ブロック図）',
      labels: [[75, 24, '扇頂（谷口）'], [104, 52, '扇央（水無川・果樹園）'], [75, 95, '扇端（湧水・集落・水田）'], [130, 10, '山地']],
      marks: [...toe.map(p => ({ ...p, t: 'spring' })), ...toe.map(p => ({ x: p.x + 3, y: p.y + 3, t: 'house' })), ...d3.range(14).map(i => ({ x: 55 + (i % 7) * 7, y: 46 + Math.floor(i / 7) * 8, t: 'orchard' }))] };
  })(),
  rias: (() => {
    const w = 160, h = 100, cell = 25;
    const z = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = Math.abs(Math.sin((x + 4 * Math.sin(y / 7)) * Math.PI / 24));
      z[y * w + x] = (52 - y) * 1.6 + 72 * Math.pow(v, 1.3) + 6 * noise2(x / 2, y / 2);
    }
    return { w, h, cell, z, water: new Uint8Array(w * h), sea: true, title: 'リアス海岸（ブロック図）：V字谷が海に沈んでできた',
      labels: [[48, 82, '入り江（おぼれ谷）'], [24, 74, '岬'], [120, 8, '山地（尾根と谷）']], marks: [{ x: 48, y: 58, t: 'house' }, { x: 96, y: 56, t: 'house' }, { x: 144, y: 58, t: 'house' }, { x: 48, y: 74, t: 'fish' }, { x: 96, y: 76, t: 'fish' }] };
  })(),
  fjord: (() => {
    const w = 160, h = 100, cell = 60;
    const z = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = Math.exp(-Math.pow((x - 80 - 8 * Math.sin(y / 15)) / 13, 4));
      const tri = Math.exp(-Math.pow((x - 30 - 0.2 * y) / 7, 4)) * Math.max(0, (y - 30) / 70);
      z[y * w + x] = 650 - y * 2.6 + 90 * noise2(x / 1.4, y / 1.4) - u * (720 - y * 1.2) - tri * 520;
    }
    return { w, h, cell, z, water: new Uint8Array(w * h), sea: true, snow: 600, title: 'フィヨルド（ブロック図）：氷河がけずったU字谷が海に沈んだ',
      labels: [[86, 46, 'フィヨルド（細長く深い湾）'], [80, 6, 'U字谷'], [140, 20, '雪をかぶった山']], marks: [] };
  })(),
  karst: (() => {
    const w = 150, h = 100, cell = 20;
    const holes = [[30, 30, 5, 14], [52, 22, 4, 10], [70, 45, 6, 16], [80, 50, 5, 14], [100, 28, 4, 11], [120, 60, 5, 13], [40, 70, 4, 10], [110, 82, 6, 15], [128, 40, 3.5, 9], [60, 84, 4, 11], [18, 50, 3.5, 9], [95, 66, 4, 10]];
    const z = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = 70 + 4 * noise2(x / 4, y / 4) - y * 0.05;
      holes.forEach(([a, b, r, dd]) => { v -= dd * Math.exp(-((Math.hypot(x - a, y - b) / r) ** 2)); });
      z[y * w + x] = v;
    }
    return { w, h, cell, z, water: new Uint8Array(w * h), rock: 'lime', cave: true, title: 'カルスト地形（ブロック図）：石灰岩が雨水にとけてできた',
      labels: [[30, 22, 'ドリーネ（くぼ地）'], [75, 40, 'ウバーレ（ドリーネがつながった）'], [128, 92, '石灰岩の台地']], marks: [] };
  })(),
  terrace: (() => {
    const w = 150, h = 100, cell = 15;
    const rx = y => 75 + 9 * Math.sin(y / 15);
    const z = new Float32Array(w * h), water = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = Math.abs(x - rx(y)), st = (a, hh) => hh / (1 + Math.exp(-(d - a) / 0.9));
      let v = 60 + y * 0.12 + st(9, 14) + st(26, 18) + st(46, 22) + (d > 62 ? (d - 62) * 4 : 0) + 0.8 * noise2(x / 3, y / 3);
      if (d < 3) { v -= 2; water[y * w + x] = 1; }
      z[y * w + x] = v;
    }
    return { w, h, cell, z, water, title: '河岸段丘（ブロック図）：階段状の段丘面と段丘崖',
      labels: [[rx(30) + 18, 30, '低い段丘面'], [rx(30) + 36, 22, '高い段丘面'], [rx(70) - 26, 76, '段丘崖'], [rx(90), 90, '川']],
      marks: [...d3.range(12, 96, 12).map(y => ({ x: rx(y) - 17, y, t: 'house' })), ...d3.range(10, 96, 16).map(y => ({ x: rx(y) + 36, y, t: 'field' }))] };
  })(),
  // 三角州：川が海に出る所で枝分かれし（分流）、運んだ砂や泥が海に張り出してたまる
  delta: (() => {
    const w = 160, h = 115, cell = 40, FX = 80, FY = 40;
    const yc = x => 42 + 50 * Math.exp(-(((x - 80) / 30) ** 2)) + 1.5 * Math.sin(x / 3.5);  // 海岸線（三角州が海に円弧状に張り出す）
    const bez = (a, c, b) => d3.range(0, 1.001, 0.04).map(t => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]);
    const main = d3.range(0, FY + 1, 2).map(y => [80 + 4 * Math.sin(y / 7), y]);
    const mouths = [42, 64, 86, 108, 122].map(x => [x, yc(x) + 2]);
    const branches = mouths.map(m => bez([FX, FY], [(FX + m[0]) / 2, (FY + m[1]) / 2 - 8], m));
    const lines = [main].concat(branches);
    const dist = (x, y) => { let best = 1e9; lines.forEach(L => { for (let i = 0; i < L.length - 1; i++) { const [ax, ay] = L[i], [bx, by] = L[i + 1], vx = bx - ax, vy = by - ay, t = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy), 0, 1); best = Math.min(best, Math.hypot(x - ax - t * vx, y - ay - t * vy)); } }); return best; };
    const z = new Float32Array(w * h), water = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = y * w + x, c = yc(x), d = dist(x, y);
      let v;
      if (y <= c) {
        v = 1 + (c - y) * 0.09 + 0.2 * noise2(x / 3, y / 3) + Math.max(0, 18 - y) * 1.2;
        v += 0.8 * Math.exp(-(((d - 2.6) / 1.3) ** 2));  // 自然堤防
        if (d < 1.8) { v = Math.max(0.3, v - 1.2); water[k] = 1; }
      } else v = Math.max(-14, -0.5 - (y - c) * 0.5);
      z[k] = v;
    }
    return { w, h, cell, z, water, sea: true, vshare: 0.2, title: '三角州（ブロック図）：川が枝分かれし（分流）、運んだ砂や泥が海に張り出してたまる',
      labels: [[80, 74, '三角州（低く平らな土地）'], [mouths[0][0] + 5, mouths[0][1] - 7, '分流'], [80 + 4 * Math.sin(16 / 7), 16, '川'], [140, 104, '海'], [mouths[4][0] - 2, mouths[4][1] - 2, '河口']],
      marks: [...[[62, 58], [98, 58], [70, 76], [92, 76], [52, 52], [108, 52], [80, 88]].map(([x, y]) => ({ x, y, t: 'rice' })), ...[[FX + 4, 24], [FX - 3, 32], [FX + 4, 36]].map(([x, y]) => ({ x, y, t: 'house' }))] };
  })(),
  // メサ・ビュート：水平な地層のうち、かたい地層が上に残った台地と丘
  mesa: (() => {
    const w = 150, h = 100, cell = 30, TOP = 120;
    const prof = (s, top = TOP) => s <= 0 ? top : s < 1.8 ? top - (top - 72) * (s / 1.8) : Math.max(0, 72 - (s - 1.8) * 5.5);
    const z = new Float32Array(w * h), dry = new Uint8Array(w * h);
    const wx = y => 74 + 8 * Math.sin(y / 12);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = y * w + x;
      const edge = 17 + 5 * Math.sin(x / 11) + 2.5 * noise2(x / 4, 2);
      const sBack = y - edge;
      const sMesa = (Math.hypot((x - 42) / 25, (y - 60) / 13) - 1) * 13 + 1.2 * noise2(x / 3, y / 3);
      const sButte = Math.hypot(x - 108, y - 60) - 5.5;
      const sSpire = Math.hypot(x - 131, y - 80) - 2.2;
      let v = Math.max(4 + 1.2 * noise2(x / 5, y / 5) - y * 0.02, prof(sBack), prof(sMesa), prof(sButte), prof(sSpire, 98));
      if (y > edge + 2 && Math.abs(x - wx(y)) < 1.6 && v < 20) { v -= 1.8; dry[k] = 1; }  // ワジ
      z[k] = v;
    }
    return { w, h, cell, z, water: new Uint8Array(w * h), dry, flat: true, vshare: 0.42,
      bands: [[0, '#e6c08a'], [36, '#d48f5c'], [62, '#bf6d42'], [90, '#dba56c'], [106, '#9a4c2b']],
      title: 'メサとビュート（ブロック図）：かたい地層（赤茶色）が上に残り、平らな頂上と急ながけができる',
      labels: [[42, 60, 'メサ（テーブル状の台地）'], [108, 60, 'ビュート（とう状の丘）'], [wx(88), 88, 'ワジ（かれ川）'], [120, 8, '台地'], [131, 80, 'さらに小さな柱']] };
  })(),
  // 氷河地形：ホルン・カール・U字谷・モレーン・氷河湖
  glacier: (() => {
    const w = 160, h = 110, cell = 40;
    const x0 = y => 80 + 5 * Math.sin(y / 22);
    const z = new Float32Array(w * h), water = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = y * w + x, d = Math.abs(x - x0(y));
      // まわりの山：とがった尾根（アレート）が並ぶ
      let v = 2650 - y * 6 + 170 * Math.abs(noise2(x / 2.2, y / 2.2)) + 120 * Math.abs(Math.sin(x / 7));
      v = Math.max(v, 3050 - 70 * Math.hypot(x - 80, (y - 5) * 1.2));  // ホルン（三方からけずられたとがった峰）
      // カール：谷の頭と、左の山腹（おわん形のくぼ地。底は平ら、まわりは急ながけ）
      [[80, 22, 1950, 12], [36, 46, 2000, 13]].forEach(([cx, cy, fl, r]) => { const rr = Math.hypot(x - cx, (y - cy) * 1.15); v = Math.min(v, fl + 9 * Math.max(0, rr - r * 0.45) ** 2); });
      // U字谷：底が広く平らで、谷の壁が急
      if (y > 20) { const fl = 1950 - (y - 22) * 11; v = Math.min(v, fl + 4.5 * Math.max(0, d - 10) ** 2); }
      // モレーン：氷河が運んだ土砂が、谷をふさぐ弓形の丘に
      v += 190 * Math.exp(-(((y - 96 + 0.02 * (x - x0(96)) ** 2) / 2.6) ** 2)) * (d < 26 ? 1 : 0);
      z[k] = v;
    }
    // モレーンにせき止められた氷河湖
    const crest = d3.min(d3.range(-6, 7).map(dx => z[96 * w + Math.round(x0(96) + dx)]));
    for (let y = 70; y < 96; y++) for (let x = 0; x < w; x++) { const k = y * w + x; if (Math.abs(x - x0(y)) < 22 && z[k] < crest - 25) { z[k] = crest - 25; water[k] = 1; } }
    return { w, h, cell, z, water, snow: 2380, vshare: 0.5, title: '氷河地形（ブロック図）：氷河がけずり、運んでできた地形',
      labels: [[80, 5, 'ホルン（とがった峰）'], [80, 24, 'カール（谷の頭）'], [36, 46, 'カール'], [x0(58) + 3, 58, 'U字谷'], [x0(88), 88, '氷河湖'], [x0(97) + 17, 97, 'モレーン']] };
  })(),
  // 海岸段丘：海でけずられた平らな面が、土地の隆起で階段状に並ぶ
  cterrace: (() => {
    const w = 150, h = 100, cell = 20;
    const z = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const t = 76 - y + 2.5 * Math.sin(x / 9) + 1.2 * noise2(x / 4, y / 4);
      const st = (a, hh) => hh / (1 + Math.exp(-(t - a) / 0.6));
      z[y * w + x] = t < 0 ? -3 + t * 0.9 : st(0.5, 30) + st(16, 34) + st(34, 38) + (t > 52 ? (t - 52) * 11 : 0) + 1.5 * noise2(x / 2, y / 2);
    }
    return { w, h, cell, z, water: new Uint8Array(w * h), sea: true, title: '海岸段丘（ブロック図）：海でけずられた平らな面が、隆起して階段状に並ぶ',
      labels: [[70, 71, '低い段丘面'], [100, 52, '段丘崖'], [44, 36, '高い段丘面'], [128, 76, '海食崖'], [120, 95, '海'], [75, 6, '山地']],
      marks: [...d3.range(14, 140, 18).map(x => ({ x, y: 68 + 2.5 * Math.sin(x / 9), t: 'house' })), ...d3.range(20, 140, 24).map(x => ({ x, y: 48 + 2.5 * Math.sin(x / 9), t: 'field' }))] };
  })(),
  volcano: (() => {
    const T = TERRAINS.volcano, z = Float32Array.from(makeGrid(T));
    return { w: T.w, h: T.h, cell: T.cell, z, water: new Uint8Array(T.w * T.h), title: '成層火山（ブロック図）', labels: [[75, 44, '火口'], [40, 80, '山すそ（温泉・畑）']], marks: [{ x: 30, y: 85, t: 'house' }, { x: 112, y: 88, t: 'house' }] };
  })()
};

// ブロック図を描く。sh：横のかたむき（ドラッグで変わる）、tilt：見下ろす角度
function drawBlock(B, sh, tilt) {
  const { w, h, cell, z, water } = B;
  const s = 4.4, zmax = d3.max(z), zmin = Math.min(0, d3.min(z));
  const relief = Math.max(30, zmax - zmin), vz = (h * s * (B.vshare || 0.34)) / relief;
  const base = zmin - relief * 0.18;
  const W = Math.round((w + h * Math.abs(sh)) * s + 24), padTop = 16;
  const Y0 = padTop + (zmax - zmin) * vz;
  const H = Math.round(Y0 + h * s * tilt + (zmin - base) * vz + 12);
  const P = (x, y, zz) => [12 + x * s + (sh > 0 ? (h - y) * s * sh : -y * s * sh), Y0 + y * s * tilt - (zz - zmin) * vz];
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const shd = shadeOf(z, w, h, cell, 2.2);
  const surf = k => (B.sea && z[k] < 0) ? 0 : water[k] ? z[k] + 2 : z[k];
  const colorK = k => {
    if (B.sea && z[k] < 0) return mix('#4f8fcb', clamp(1 + z[k] / (relief * 1.2), 0.55, 1));
    if (water[k]) return mix('#5f9fd6', 0.9 + 0.12 * shd[k]);
    if (B.dry && B.dry[k]) return mix('#c49a62', 0.6 + 0.5 * shd[k]);
    if (B.bands) { let bc = B.bands[0][1]; B.bands.forEach(([t, col]) => { if (z[k] >= t) bc = col; }); return mix(bc, 0.5 + 0.62 * shd[k]); }
    let c = B.rock === 'lime' ? d3.interpolateRgb('#c9d6a6', '#e8e4d6')(clamp((z[k] - 50) / 25, 0, 1)) : HYPSO(clamp(z[k] / Math.max(zmax, 80), 0, 1));
    if (B.snow && z[k] > B.snow) c = '#f6f6f4';
    return mix(c, 0.5 + 0.62 * shd[k]);
  };
  // 奥の行から手前の行へぬる
  for (let j = 0; j < h - 1; j++) {
    const order = sh >= 0 ? d3.range(w - 1) : d3.range(w - 2, -1, -1);
    for (const i of order) {
      const k = j * w + i;
      const a = P(i, j, surf(k)), b = P(i + 1, j, surf(k + 1)), c = P(i + 1, j + 1, surf(k + w + 1)), d = P(i, j + 1, surf(k + w));
      ctx.fillStyle = colorK(k).formatHex();
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.lineTo(...d); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.6; ctx.stroke();
    }
  }
  // 断面（手前と横の面）。地層のしま模様
  const face = (pts, dark) => {
    const top = pts.map(([x, y, k]) => P(x, y, Math.min(surf(k), z[k] < 0 && B.sea ? z[k] : surf(k))));
    const bot = pts.slice().reverse().map(([x, y]) => P(x, y, base));
    ctx.beginPath(); top.concat(bot).forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath();
    ctx.save(); ctx.clip();
    if (B.bands) {
      B.bands.forEach(([t, col], i) => {
        const t2 = i + 1 < B.bands.length ? B.bands[i + 1][0] : zmax + 50, lo = i === 0 ? base : t;
        ctx.fillStyle = mix(col, dark * 0.92).formatHex();
        ctx.beginPath(); pts.forEach(([x, y], n) => { const p = P(x, y, t2); n ? ctx.lineTo(...p) : ctx.moveTo(...p); });
        pts.slice().reverse().forEach(([x, y]) => ctx.lineTo(...P(x, y, lo))); ctx.closePath(); ctx.fill();
      });
      ctx.restore();
      ctx.strokeStyle = 'rgba(60,40,20,.6)'; ctx.lineWidth = 1; ctx.beginPath(); top.concat(bot).forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); ctx.stroke();
      return;
    }
    const layers = B.rock === 'lime' ? ['#d9d4c4', '#c8c2b0', '#d9d4c4', '#bdb6a2'] : ['#c9a978', '#b48f60', '#c2a170', '#9c7b55', '#8a7560'];
    const th = (relief * 1.25) / layers.length;
    for (let n = 0; n < layers.length + 2; n++) {
      ctx.fillStyle = mix(layers[n % layers.length], dark).formatHex();
      const zz = zmax + 5 - n * th;
      ctx.beginPath(); pts.forEach(([x, y], i) => { const p = P(x, y, zz + 3 * Math.sin(x / 9)); i ? ctx.lineTo(...p) : ctx.moveTo(...p); });
      pts.slice().reverse().forEach(([x, y]) => ctx.lineTo(...P(x, y, zz - th + 3 * Math.sin(x / 9))));
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // 海の断面（水）
    if (B.sea) { ctx.fillStyle = 'rgba(79,143,203,.75)'; ctx.beginPath(); pts.forEach(([x, y, k], i) => { const p = P(x, y, 0); i ? ctx.lineTo(...p) : ctx.moveTo(...p); }); pts.slice().reverse().forEach(([x, y, k]) => ctx.lineTo(...P(x, y, Math.min(0, z[k])))); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = 'rgba(60,40,20,.6)'; ctx.lineWidth = 1; ctx.beginPath(); top.concat(bot).forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); ctx.stroke();
  };
  const sideX = sh >= 0 ? 0 : w - 1;
  face(d3.range(h).map(y => [sideX, y, y * w + sideX]), 0.78);
  face(d3.range(w).map(x => [x, h - 1, (h - 1) * w + x]), 1);
  // 鍾乳洞（カルスト）
  if (B.cave) {
    const c = P(w * 0.55, h - 1, zmin + relief * 0.18);
    ctx.fillStyle = '#3d3a33'; ctx.beginPath(); ctx.ellipse(c[0], c[1], 34, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8e4d6'; for (let i = -28; i <= 28; i += 8) { ctx.beginPath(); ctx.moveTo(c[0] + i - 3, c[1] - 9); ctx.lineTo(c[0] + i, c[1] + (i % 16 ? 2 : 5)); ctx.lineTo(c[0] + i + 3, c[1] - 9); ctx.fill(); }
  }
  return { cv, W, H, P, surfAt: (x, y) => { const k = clamp(Math.round(y), 0, h - 1) * w + clamp(Math.round(x), 0, w - 1); return surf(k); } };
}

F.block = (key, o = {}) => () => {
  const B = BLOCKS[key];
  let sh = o.sh ?? 0.3, tilt = o.tilt ?? 0.55, base;
  const f = figWrap(fsvg(10, 10).node(), o.cap || B.title);
  const svgNode = f.querySelector('svg'), svg = d3.select(svgNode);
  const draw = () => {
    const r = drawBlock(B, sh, tilt);
    const padT = Math.round(r.W / 46 * 2.6);
    svgNode.setAttribute('viewBox', `0 ${-padT} ${r.W} ${r.H + padT}`);
    svg.selectAll('*').remove();
    svg.append('image').attr('href', r.cv.toDataURL()).attr('width', r.W).attr('height', r.H);
    // 家・田・果樹園などの記号
    const ms = r.W / 900;
    (B.marks || []).forEach(m => {
      const p = r.P(m.x, m.y, r.surfAt(m.x, m.y));
      const g = svg.append('g').attr('transform', `translate(${p[0]},${p[1]}) scale(${ms}) translate(${-p[0]},${-p[1]})`);
      if (m.t === 'house') g.append('path').attr('d', `M${p[0] - 4},${p[1]} v-5 l4,-4 l4,4 v5 z`).attr('fill', '#fff').attr('stroke', '#6b4a2b').attr('stroke-width', 1.2);
      else if (m.t === 'spring') g.append('circle').attr('cx', p[0]).attr('cy', p[1] - 1).attr('r', 3.2).attr('fill', '#2f8fe0').attr('stroke', '#fff');
      else if (m.t === 'orchard') g.append('circle').attr('cx', p[0]).attr('cy', p[1] - 3).attr('r', 3).attr('fill', '#4f8a3a').attr('stroke', '#2d5a20');
      else if (m.t === 'rice') g.append('text').attr('x', p[0]).attr('y', p[1]).attr('text-anchor', 'middle').style('font-size', '12px').style('fill', '#2f6f2a').text('〃〃');
      else if (m.t === 'field') g.append('text').attr('x', p[0]).attr('y', p[1]).attr('text-anchor', 'middle').style('font-size', '11px').style('fill', '#7a5a2a').text('∨∨');
      else if (m.t === 'fish') g.append('text').attr('x', p[0]).attr('y', p[1]).attr('text-anchor', 'middle').style('font-size', '13px').text('🐟');
    });
    (B.labels || []).forEach(([x, y, t]) => {
      const p = r.P(x, y, r.surfAt(x, y));
      const fs = Math.round(r.W / 46), L = fs * 1.3;
      svg.append('line').attr('x1', p[0]).attr('y1', p[1]).attr('x2', p[0]).attr('y2', p[1] - L).attr('stroke', 'var(--ink)').attr('stroke-width', 1.5);
      svg.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 2.5).attr('fill', 'var(--ink)');
      ftext(svg, p[0], p[1] - L - 4, t, { a: 'middle', s: fs, b: true }).style('stroke-width', fs / 3.5);
    });
  };
  draw();
  onDrag(svgNode, 'xy', {
    start() { base = [sh, tilt]; },
    move(dx, dy) { const k = vbScale(svgNode); sh = clamp(base[0] + dx * k / 500, -0.6, 0.6); tilt = clamp(base[1] + dy * k / 900, 0.22, 0.7); draw(); }
  });
  figHint(f, '✥ ドラッグで回して見る');
  return f;
};
