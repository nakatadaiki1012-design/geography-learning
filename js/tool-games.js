/* 挑戦：ゲーム（遊びながら、知識を使って考える）
   ・高い？低い？：2つの国の統計をくらべる。連続正解で🔥。答えのあとに「なぜ？」のひとこと
   ・ヒントで国あて：地域→宗教→言語→人口→首都の順にヒントが増える。少ないヒントで当てるほど高得点
   ・時差で「いま何してる？」：東京の時刻から、世界の人がいま何をしているかを当てる */

const GAME_TIPS = {
  pop: '人口は中国・インド・アメリカ・インドネシアが多い。アジアに世界の人口の約6割が集まっている。',
  area: '面積はロシアが最大。カナダ・アメリカ・中国・ブラジル・オーストラリアも広い。',
  gni: '1人当たりGNIは、ヨーロッパ・北アメリカ・オセアニアや産油国で高く、アフリカや南アジアで低い。',
  tfr: '所得が高く、教育や女性の社会進出が進んだ国ほど出生率は低い。アフリカの国々では高い。',
  old: '少子化が早く進んだ日本やヨーロッパで高い。若い人が多いアフリカでは低い。',
  urban: '先進国や、南アメリカ・西アジアの国で高い。農業で働く人が多い南アジアやアフリカで低め。',
  co2: '1人当たりでは、産油国や先進国で多い。発展途上国では少ない。'
};
// くらべる言葉（人口は「多い」、面積は「広い」…）
const HILO_WORD = { pop: ['多い', '少ない'], area: ['広い', 'せまい'], co2: ['多い', '少ない'] };
const DAY_ACTS = [[0, 5, '😴 ねている'], [6, 8, '🍳 朝ごはん'], [9, 11, '🏫 学校や仕事'], [12, 13, '🍱 昼ごはん'], [14, 17, '🏫 学校や仕事'], [18, 20, '🍽️ 夕ごはん'], [21, 23, '📺 家でくつろぐ']];
const actOf = h => DAY_ACTS.find(([a, b]) => h >= a && h <= b)[2];

registerTool('games', {
  name: 'ゲーム',
  render(container, params = {}) {
    const GAMES = [
      { id: 'hilo', ic: '📊', name: '高い？低い？', d: '2つの国の統計をくらべよう。何連続で当てられる？' },
      { id: 'hint', ic: '🕵️', name: 'ヒントで国あて', d: '少ないヒントで当てるほど高得点。全5問' },
      { id: 'clock', ic: '🕘', name: '時差で「いま何してる？」', d: '東京の時刻から、世界の人のようすを当てよう。全8問' }
    ];
    const best = () => store.get('gameBest', {});
    const setBest = (k, v) => { const B = best(); if (!(B[k] >= v)) { B[k] = v; store.set('gameBest', B); return true; } return false; };
    const root = el('<div class="lessons"><div class="lesson fill games"><div class="ghead"></div><div class="q gbody"></div></div></div>');
    container.appendChild(root);
    const head = $('.ghead', root), body = $('.gbody', root);
    let cur = params.game || null;

    function menu() {
      cur = null;
      head.innerHTML = '<span class="no">挑戦</span><h2 style="margin:0">地理ゲーム</h2><p class="small muted" style="margin:2px 0 0">知識を使って、遊びながら考えよう。記録はこの端末に残ります。</p>';
      const B = best();
      body.innerHTML = `<div class="gmenu">${GAMES.map(g => `<button type="button" class="gcard" data-g="${g.id}"><span class="ic">${g.ic}</span><b>${g.name}</b><span class="small">${g.d}</span><span class="gbest">${B[g.id] != null ? `🏆 自己ベスト ${B[g.id]}${g.id === 'hilo' ? '連続' : '点'}` : 'はじめてあそぶ'}</span></button>`).join('')}</div>`;
      $$('.gcard', body).forEach(b => b.addEventListener('click', () => start(b.dataset.g)));
    }
    function start(id) {
      cur = id;
      const g = GAMES.find(x => x.id === id);
      head.innerHTML = `<div class="row" style="flex-wrap:nowrap"><button type="button" class="btn small ghost back">← ゲーム一覧</button><b class="gtitle">${g.ic} ${g.name}</b><span class="gscore"></span></div>`;
      $('.back', head).addEventListener('click', menu);
      ({ hilo, hint, clock })[id]();
    }
    const score = html => { $('.gscore', head).innerHTML = html; };

    // --- 高い？低い？ ---
    function hilo() {
      const keys = ['pop', 'area', 'gni', 'tfr', 'old', 'urban', 'co2'];
      let A = pick(COUNTRIES), streak = 0;
      const round = () => {
        const k = pick(keys), I = INDICATORS.find(x => x.key === k);
        const pool = COUNTRIES.filter(c => c !== A && c[k] !== A[k]);
        const B = pick(pool), f = c => `${I.fmt(c[k])}<small> ${I.unit}</small>`, [hi, lo] = HILO_WORD[k] || ['高い', '低い'];
        score(`🔥 ${streak} 連続　<span class="muted">ベスト ${best().hilo || 0}</span>`);
        body.innerHTML = `<p class="gq">${I.name}が<b>${hi}</b>のはどっち？</p>
          <div class="hl">
            <div class="hcard"><span class="flag">${A.jp}</span><span class="val">${f(A)}</span><span class="small muted">${REGIONS[A.reg]}</span></div>
            <div class="vs">VS</div>
            <div class="hcard b"><span class="flag">${B.jp}</span><span class="val">？</span><span class="small muted">${REGIONS[B.reg]}</span></div>
          </div>
          <div class="hbtns"><button type="button" class="btn up">▲ ${B.jp}のほうが${hi}</button><button type="button" class="btn ghost dn">▼ ${B.jp}のほうが${lo}</button></div>
          <div class="gexp"></div>`;
        const answer = up => {
          const ok = up === (B[k] > A[k]);
          $$('.hbtns button', body).forEach(b => { b.disabled = true; });
          $('.hcard.b .val', body).innerHTML = f(B);
          $('.hcard.b', body).classList.add(ok ? 'ok' : 'ng');
          if (ok) streak++; else streak = 0;
          const nb = ok && setBest('hilo', streak);
          if (ok && (streak === 5 || streak === 10 || streak === 20)) celebrate();
          score(`🔥 ${streak} 連続　<span class="muted">ベスト ${best().hilo || 0}</span>`);
          $('.gexp', body).innerHTML = `<div class="card ${ok ? 'ok' : 'ng'}"><b>${ok ? (nb && streak > 1 ? '正解！ 自己ベスト更新！' : '正解！') : 'ざんねん…'}</b>　${B.jp}の${I.name}は ${I.fmt(B[k])}${I.unit}（${A.jp}は ${I.fmt(A[k])}${I.unit}）。<p class="small" style="margin:4px 0 0">💡 ${GAME_TIPS[k]}</p></div>
            <button type="button" class="btn nx">${ok ? '次へ →' : 'もう一度 ↺'}</button>`;
          $('.nx', body).addEventListener('click', () => { A = ok ? B : pick(COUNTRIES); round(); });
        };
        $('.up', body).addEventListener('click', () => answer(true));
        $('.dn', body).addEventListener('click', () => answer(false));
      };
      round();
    }

    // --- ヒントで国あて ---
    function hint() {
      const qs = shuffle(COUNTRIES).slice(0, 5);
      let qi = 0, total = 0;
      const round = () => {
        if (qi >= qs.length) {
          const nb = setBest('hint', total);
          if (total >= 18) celebrate();
          score(`${total} / 25 点`);
          body.innerHTML = `<div class="card ok" style="text-align:center;padding:16px"><div style="font-size:28px;font-weight:800">${total} / 25 点</div><p>${nb ? '🏆 自己ベスト更新！' : `自己ベスト ${best().hint} 点`}</p></div><button type="button" class="btn again">もう一度あそぶ</button>`;
          $('.again', body).addEventListener('click', hint);
          return;
        }
        const T = qs[qi];
        const same = shuffle(COUNTRIES.filter(c => c !== T && c.reg === T.reg)).slice(0, 1);
        const other = shuffle(COUNTRIES.filter(c => c !== T && !same.includes(c))).slice(0, 3 - same.length);
        const ch = shuffle([T].concat(same, other));
        const hints = [['🌏 地域', REGIONS[T.reg]], ['🙏 主な宗教', T.rel], ['🗣️ 主な言語', T.lang], ['👥 人口・面積', `約${T.pop >= 100 ? Math.round(T.pop) : T.pop}百万人・${Math.round(T.area).toLocaleString()}千km²`], ['🏙️ 首都', T.cap]];
        let shown = 1, done = false;
        const draw = () => {
          score(`第 ${qi + 1} 問 / 5　${total} 点`);
          body.innerHTML = `<p class="gq">この国はどこ？ <span class="small muted">（いま当てれば ${6 - shown} 点）</span></p>
            <ol class="hints">${hints.map((h, i) => `<li class="${i < shown ? 'on' : ''}"><b>${h[0]}</b>${i < shown ? `：${h[1]}` : '：？'}</li>`).join('')}</ol>
            <div class="choices grid2 hch">${ch.map((c, i) => `<button type="button" data-i="${i}">${c.jp}</button>`).join('')}</div>
            <div class="row"><button type="button" class="btn small ghost more" ${shown >= 5 || done ? 'disabled' : ''}>ヒントをもう1つ見る（−1点）</button></div><div class="gexp"></div>`;
          $$('.hch button', body).forEach(b => b.addEventListener('click', () => {
            const c = ch[+b.dataset.i];
            if (c === T) {
              done = true; const pt = 6 - shown; total += pt;
              $$('.hch button', body).forEach(x => { x.disabled = true; if (ch[+x.dataset.i] === T) x.classList.add('is-right'); });
              shown = 5; $$('.hints li', body).forEach((li, i) => { li.classList.add('on'); li.innerHTML = `<b>${hints[i][0]}</b>：${hints[i][1]}`; });
              score(`第 ${qi + 1} 問 / 5　${total} 点`);
              $('.more', body).disabled = true;
              $('.gexp', body).innerHTML = `<div class="card ok"><b>正解！ ${T.jp}（＋${pt}点）</b></div>`;
              const mf = fig(F.world({ region: T.reg, hl: [T.id], names: [T.id], cap: `${T.jp}：${REGIONS[T.reg]}` })); if (mf) $('.gexp .card', body).appendChild(mf);
              $('.gexp', body).appendChild(el('<button type="button" class="btn nx">次の問題 →</button>'));
              $('.nx', body).addEventListener('click', () => { qi++; round(); });
            } else {
              b.disabled = true; b.classList.add('is-wrong');
              if (shown < 5) { shown++; const keep = $$('.hch button', body).filter(x => x.disabled).map(x => x.dataset.i); draw(); keep.forEach(i => { const x = $(`.hch button[data-i="${i}"]`, body); x.disabled = true; x.classList.add('is-wrong'); }); }
              $('.gexp', body).innerHTML = `<div class="card ng">${c.jp}ではない。ヒントがふえたよ</div>`;
            }
          }));
          $('.more', body).addEventListener('click', () => { if (shown < 5) { shown++; const keep = $$('.hch button', body).filter(x => x.disabled).map(x => x.dataset.i); draw(); keep.forEach(i => { const x = $(`.hch button[data-i="${i}"]`, body); x.disabled = true; x.classList.add('is-wrong'); }); } });
        };
        draw();
      };
      round();
    }

    // --- 時差で「いま何してる？」 ---
    function clock() {
      const places = PLACES.filter(p => Number.isInteger(p.tz) && p.id !== 'tokyo');
      const qs = shuffle(places).slice(0, 8);
      let qi = 0, sc = 0;
      const round = () => {
        if (qi >= qs.length) {
          const nb = setBest('clock', sc); if (sc === qs.length) celebrate();
          score(`${sc} / ${qs.length}`);
          body.innerHTML = `<div class="card ok" style="text-align:center;padding:16px"><div style="font-size:28px;font-weight:800">${sc} / ${qs.length} 問 正解</div><p>${nb ? '🏆 自己ベスト更新！' : `自己ベスト ${best().clock} 点`}</p></div><button type="button" class="btn again">もう一度あそぶ</button>`;
          $('.again', body).addEventListener('click', clock);
          return;
        }
        const P = qs[qi], t = pick([7, 8, 12, 15, 19, 21, 23]), diff = P.tz - 9, h = ((t + diff) % 24 + 24) % 24;
        const dayw = t + diff < 0 ? '前の日の' : t + diff >= 24 ? '次の日の' : '';
        const right = actOf(h);
        const acts = Array.from(new Set(DAY_ACTS.map(a => a[2])));
        const ch = shuffle([right].concat(shuffle(acts.filter(a => a !== right)).slice(0, 3)));
        const sky = x => x >= 6 && x <= 17 ? '☀️' : '🌙';
        score(`第 ${qi + 1} 問 / ${qs.length}　正解 ${sc}`);
        body.innerHTML = `<div class="clk"><div class="cl"><span class="sk">${sky(t)}</span><b>東京</b><span class="tm">${t}:00</span></div><div class="arrow">→</div><div class="cl"><span class="sk">❔</span><b>${P.name}</b><span class="tm">？</span></div></div>
          <p class="gq">東京は${t}時。${P.name}の人は、いま何をしていそう？</p>
          <div class="choices grid2 cch">${ch.map((c, i) => `<button type="button" data-i="${i}">${c}</button>`).join('')}</div><div class="gexp"></div>`;
        $$('.cch button', body).forEach(b => b.addEventListener('click', () => {
          const ok = ch[+b.dataset.i] === right;
          if (ok) sc++;
          $$('.cch button', body).forEach(x => { x.disabled = true; if (ch[+x.dataset.i] === right) x.classList.add('is-right'); });
          if (!ok) b.classList.add('is-wrong');
          $('.clk .cl:last-child', body).innerHTML = `<span class="sk">${sky(h)}</span><b>${P.name}</b><span class="tm">${dayw}${h}:00</span>`;
          score(`第 ${qi + 1} 問 / ${qs.length}　正解 ${sc}`);
          $('.gexp', body).innerHTML = `<div class="card ${ok ? 'ok' : 'ng'}"><b>${ok ? '正解！' : `正解は ${right}`}</b><p class="small" style="margin:4px 0 0">東京は東経135°、${P.name}の標準時子午線は${meridianText(P.tz)}。経度15°で1時間なので、時差は${Math.abs(diff)}時間（${diff > 0 ? '東京より進んでいる' : diff < 0 ? '東京より遅れている' : '同じ'}）。${t}時${diff >= 0 ? '＋' : '−'}${Math.abs(diff)}時間＝${dayw}${h}時。（サマータイムは考えない）</p></div><button type="button" class="btn nx">次の問題 →</button>`;
          $('.nx', body).addEventListener('click', () => { qi++; round(); });
        }));
      };
      round();
    }

    if (cur) start(cur); else menu();
    return () => {};
  }
});
