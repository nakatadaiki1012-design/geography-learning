/* 授業の図：s ＝ 説明スライドごとの図、t ＝ 確認テストの解説の図（問題の順） */

const FG = (() => {
  const RES = F.world({ pts: [[49, 27, 'ペルシア湾岸（石油）'], [118, -22, 'ピルバラ（鉄鉱石）'], [-50, -6, 'カラジャス（鉄鉱石）'], [-69, -23, 'チリ（銅）'], [148, -26, '石炭'], [25, -10, 'コバルト']], hl: { '682': '#e3a63a', '036': '#d9c08a', '076': '#d9c08a', '152': '#e8a38a', '180': '#b9a6d8' }, cap: '主な資源の産地（例）。資源は一部の地域にかたよっている' });
  const OPEC = F.world({ hl: ['012', '178', '226', '266', '364', '368', '414', '434', '566', '682', '784', '862'], cap: 'OPEC（石油輸出国機構）の加盟国（2024年ごろ）' });
  const SPANISH = ['484', '032', '152', '604', '170', '862', '218', '068', '600', '858', '192', '320', '340', '558', '188', '591', '222', '214'];
  const LANG_LA = F.world({ region: 'lamerica', hl: Object.assign(Object.fromEntries(SPANISH.map(id => [id, '#e3a63a'])), { '076': '#4f9b4a' }), names: ['076', '032', '484'], legend: [['#e3a63a', 'スペイン語'], ['#4f9b4a', 'ポルトガル語']], cap: 'ラテンアメリカの公用語：植民地の歴史が残っている' });
  const SAHEL = F.world({ box: [-20, 0, 45, 30], hl: ['686', '466', '562', '148', '729', '478', '854'], names: ['466', '562', '148'], lines: [{ c: [[-17, 15], [0, 14.5], [15, 14], [33, 13]], color: '#b07a10', w: 14, op: .35 }], cap: 'サヘル（サハラ砂漠の南のふち）：砂漠化が進む地域' });
  const TAIGA = F.world({ hl: ['643', '124', '752', '246', '578'], color: '#3f7a4a', cap: 'タイガ（針葉樹林）が広がる国：木材・パルプの産地' });
  const EXPORT = F.world({ hl: ['840', '076', '032', '124', '036', '643', '804'], names: ['840', '076', '124', '036'], color: '#c9a227', cap: '穀物の大きな輸出国（小麦・とうもろこし・大豆など）' });
  const IMPORT = F.world({ rot: -150, hl: ['392'], arrows: [[[-98, 40], [139, 36], '小麦・とうもろこし'], [[-52, -14], [139, 36], '大豆・鶏肉'], [[134, -26], [139, 36], '牛肉・小麦']], cap: '日本は食料の多くを遠くから輸入している（フードマイレージが大きい）' });
  const HUB = F.world({ pts: [[55.3, 25.2, 'ドバイ'], [103.8, 1.35, 'シンガポール'], [126.4, 37.5, '仁川']], arrows: [[[55.3, 25.2], [-0.1, 51.5]], [[55.3, 25.2], [151, -34]], [[55.3, 25.2], [-74, 40.7]], [[55.3, 25.2], [139.7, 35.7]], [[55.3, 25.2], [28, -26]]], cap: 'ドバイのハブ空港：ヨーロッパ・アジア・アフリカを結ぶ位置' });
  const CANAL = F.world({ pts: [[-79.7, 9.1, 'パナマ運河'], [32.3, 30.5, 'スエズ運河'], [101, 3, 'マラッカ海峡']], cap: '海上輸送の重要な通り道' });
  const SUNBELT = F.world({ box: 'namerica', lines: [{ c: [[-125, 37], [-75, 37]], color: 'var(--shu)', dash: '6 4', w: 2 }], labels: [[-98, 31, 'サンベルト', 'var(--shu)', 13], [-84, 44, 'スノーベルト（ラストベルト）', '#3f7fc0', 12]], pts: [[-122, 37.4, 'シリコンバレー']], cap: '北緯37°より南のサンベルトに工業が移った' });
  const MIGR = F.world({ arrows: [[[-102, 22], [-97, 37], 'メキシコ→アメリカ'], [[3, 30], [3, 47], '北アフリカ→フランス'], [[80, 24], [52, 25], '南アジア→湾岸の産油国'], [[34, 39], [10, 51], 'トルコ→ドイツ']], cap: '主な労働者の移動（例）' });
  const EU = ['276', '250', '380', '724', '528', '056', '442', '040', '620', '372', '208', '752', '246', '616', '203', '703', '348', '642', '100', '300', '705', '191', '233', '428', '440', '196'];
  const EUMAP = F.world({ region: 'europe', hl: EU, color: '#3f7fc0', cap: 'EU加盟国（2024年ごろ・27か国）' });
  const KURD = F.world({ region: 'wasia', hl: ['792', '368', '364', '760'], color: '#e8c18a', names: ['792', '368', '364', '760'], lines: [{ c: [[38, 38.5], [42, 38], [45, 36], [47, 34.5]], color: 'var(--shu)', w: 16, op: .4 }], labels: [[43, 39.8, 'クルド人の多い地域', 'var(--shu)', 12]], cap: 'クルド人は4つの国にまたがって暮らす' });
  const AFRICA = F.world({ box: [-20, -36, 52, 38], cap: 'アフリカの国境：緯線・経線にそった直線が多い', lines: [{ c: [[25, 22], [25, 20]], color: 'transparent' }] });
  const ASEAN = F.world({ region: 'seasia', hl: ['360', '764', '704', '608', '458', '104', '116', '418', '096'], color: '#e08a2e', names: ['360', '764', '704', '608', '458'], cap: 'ASEAN（東南アジア諸国連合）の加盟国' });
  const QINLING = F.world({ region: 'eastasia', lines: [{ c: [[104, 33.6], [110, 33.8], [116, 33], [119, 33.5]], color: 'var(--shu)', w: 3 }], labels: [[112, 39, '北：畑作（小麦）', '#8c6d3f', 12], [112, 27, '南：稲作', '#2c8350', 12], [104, 35.2, 'チンリン山脈・ホワイ川', 'var(--shu)', 11]], pts: [[114.06, 22.54, 'シェンチェン（経済特区）']], cap: '年降水量1000mmの線とほぼ重なる' });
  const COCOA = F.world({ region: 'safrica', hl: { '288': '#8c6d3f', '384': '#8c6d3f', '566': '#333333', '894': '#d9473b', '180': '#b9a6d8' }, names: ['288', '384', '566', '894'], legend: [['#8c6d3f', 'カカオ豆'], ['#333333', '石油'], ['#d9473b', '銅'], ['#b9a6d8', 'コバルト・銅']], cap: '特定の産物の輸出にたよる国（モノカルチャー経済）' });
  const SOIL = F.world({ pts: [[32, 49, 'チェルノーゼム'], [-48, -20, 'テラローシャ'], [77, 19, 'レグール'], [-62, -5, 'ラトソル'], [100, 62, 'ポドゾル'], [-98, 42, 'プレーリー土']], cap: '主な土壌（例）' });
  const SURVEYJP = F.world({ box: 'japan', pts: [[139.7, 35.7, '東京']], cap: '東京への一極集中' });
  return {
    s1: { s: [F.latlon(), F.proj('mercator', { tissot: true, cap: 'メルカトル図法：赤い円は地球上で同じ大きさ。高緯度ほど大きく描かれる' }), F.proj('mercator', { route: ['tokyo', 'newyork'], rhumb: true, cap: 'メルカトル図法の上の2つの航路', legend: [['var(--shu)', '大圏航路（最短）'], ['#2c9a58', '等角航路']] })],
      t: [F.proj('mercator', { tissot: true, cap: '角度は正しいが、高緯度ほど面積が大きくなる' }), F.proj('azeq', { east: true, cap: '東京中心の正距方位図法：中心からの直線が最短コース。赤い線は真東' }), F.proj('globe', { route: ['tokyo', 'newyork'], center: [-175, 50], cap: '地球儀の上の大圏航路（東京→ニューヨーク）' }), F.proj('mollweide', { tissot: true, cap: 'モルワイデ図法：円の形はゆがむが、面積はどこでも同じ' })] },
    s2: { s: [F.timezones(), F.world({ rot: -150, lines: [{ c: DATELINE, color: '#8a5bd0', dash: '5 3' }], labels: [[-165, 45, '日付変更線', '#8a5bd0', 12]], pts: [[139.7, 35.7, '東京'], [-157.9, 21.3, 'ホノルル']], cap: '日付変更線は国の中で日付が分かれないよう陸地をさけて曲がっている' }), F.world({ pts: [[-122, 37.4, 'シリコンバレー'], [77.6, 13, 'ベンガルール']], arrows: [[[-122, 37.4], [77.6, 13], '時差 約13時間']], cap: 'アメリカの夜の間に、昼のインドで仕事が進む' })],
      t: [F.timezones(), F.world({ pts: [[139.7, 35.7, '東京 9時'], [-0.1, 51.5, 'ロンドン 0時']], lines: [{ c: [[135, -60], [135, 75]], color: 'var(--shu)' }, { c: [[0, -60], [0, 75]], color: 'var(--accent)' }], cap: '135°÷15°＝9時間。東にある東京のほうが進んでいる' }), F.world({ rot: -150, lines: [{ c: DATELINE, color: '#8a5bd0', dash: '5 3' }], labels: [[-165, 45, '日付変更線', '#8a5bd0', 12]], arrows: [[[160, 20], [-160, 20], '西→東：1日おくらせる', 'var(--shu)']], cap: '' }), F.timezones()] },
    s3: { s: [F.town({ cap: 'GISでは、地形・土地利用・施設などの情報を重ねて分析する（地形分類図の例）' }), F.mapTypes(), F.choro('pop', { cap: '× 人口（絶対値）を階級区分図にした例：面積の広い国ほど目立ってしまう' })],
      t: [F.choro('dens'), F.choro('pop', { style: 'circle' }), F.town({ cap: '情報を重ねて表示・分析できるのがGIS' }), F.world({ rot: -150, arrows: [[[-95, 40], [105, 35], '大豆'], [[-50, -12], [105, 35], '大豆'], [[134, -25], [105, 35], '鉄鉱石']], cap: '流線図の例：ものの流れの方向と量を矢印で表す' })] },
    s4: { s: [F.topo('ridge', { line: [[20, 45], [130, 45]], cap: '等高線と断面図（架空の地形図）' }), F.topo('ridge', { labels: [[70, 83, '尾根'], [46, 77, '谷'], [94, 77, '谷']], cap: '尾根は等高線が低い方へ張り出し、谷は高い方へ食いこむ' }), F.scheme('symbols')],
      t: [F.topo('volcano', { cap: '太い線（計曲線）は50mごと、細い線（主曲線）は10mごと' }), F.scheme('scale'), F.topo('ridge', { labels: [[70, 83, '尾根'], [46, 77, '谷'], [94, 77, '谷']] }), F.topo('volcano', { line: [[20, 50], [130, 50]], cap: '等高線の間隔がせまい所ほど断面図が急になる' })] },
    s5: { s: [F.plates({ bounds: true, newb: false, old: false, shield: false, cap: 'プレートの境界' }), F.plates({ cap: '大地形の分布' }), F.plates({ old: false, shield: false, volc: true, quakes: true, cap: '火山（▲）と大地震（◎）は新期造山帯に集中' })],
      t: [F.plateAnim('collide'), F.plates({ newb: false, shield: false, labels: [[-80, 40, 'アパラチア'], [62, 60, 'ウラル'], [148, -28, 'グレートディヴァイディング']], cap: '古期造山帯（緑）：石炭が多い' }), F.plateAnim('diverge'), F.plates({ old: false, shield: false, labels: [[-70, -18, 'アンデス山脈', 'var(--shu)']], cap: '新期造山帯' })] },
    s6: { s: [F.koppenMap({ names: true }), F.climate('tokyo'), F.climate('bangkok')],
      t: [F.climate('singapore'), F.climate('rome'), F.climate('sydney'), F.climate('yakutsk')] },
    s7: { s: [F.religion(), LANG_LA, F.religion({ region: 'seasia', names: ['360', '764', '608', '458'] })],
      t: [F.religion({ region: 'seasia', names: ['360', '764', '608', '458'] }), F.world({ region: 'seasia', hl: ['608'], names: ['608'], cap: 'フィリピン：16世紀からスペインの植民地だった' }), F.world({ region: 'sasia', hl: ['356'], names: ['356'], cap: 'インド：国民の約8割がヒンドゥー教' }), F.world({ region: 'russia', hl: ['643'], names: ['643'], cap: 'ロシア：正教会' })] },
    s8: { s: [F.world({ hl: ['156', '356', '360', '050', '704', '764', '608', '104', '392'], color: '#4f9b4a', cap: 'モンスーンアジア：季節風の雨を生かした稲作がさかん' }), F.world({ hl: ['288', '384', '360', '458', '076', '170'], color: '#8c6d3f', names: ['288', '360', '076'], cap: 'プランテーション作物の産地（カカオ・油やし・コーヒーなど）' }), F.choro('gni')],
      t: [F.world({ hl: ['288', '384', '360', '458', '076', '170'], color: '#8c6d3f', cap: 'プランテーションの例' }), COCOA, F.choro('gni', { cap: '1人当たりGNI：北の先進国で高く、南の国々で低い' }), F.rank('gni', { ids: ['840', '392', '288', '384', '562'], hl: ['288', '384'], cap: '1人当たりGNI（ドル）：カカオの産地の国は低い' })] },
    s9: { s: [SAHEL, F.choro('co2total', { style: 'circle', cap: '国全体のCO₂排出量（円の大きさ）：すべての国の協力が必要' }), F.choro('co2', { cap: '1人当たりCO₂排出量（t）：先進国や産油国で多い' })],
      t: [F.choro('co2total', { style: 'circle', cap: '国全体のCO₂排出量：中国・アメリカ・インドが多い' }), SAHEL, F.world({ box: [160, -25, 200, 5], pts: [[179.2, -8.5, 'ツバル']], cap: 'ツバル：標高が低いさんご礁の島国' }), F.rank('co2', { n: 8, cap: '1人当たりCO₂排出量（t）の多い国' })] },
    s10: { s: [RES, F.world({ region: 'europe', hl: { '352': '#d9473b', '578': '#3f7fc0', '208': '#4f9b4a' }, names: ['352', '578', '208'], legend: [['#d9473b', '地熱'], ['#3f7fc0', '水力'], ['#4f9b4a', '風力']], cap: '自然環境を生かした発電' }), F.plates({ japan: true, volc: true, cap: '日本は火山が多い（地熱に向く）' })],
      t: [F.world({ region: 'wasia', hl: ['682', '368', '364', '414', '784', '634'], color: '#e3a63a', names: ['682', '364'], cap: 'ペルシア湾岸の産油国' }), F.plates({ newb: false, old: false, cap: '安定陸塊（鉄鉱石が多い）' }), F.world({ region: 'europe', hl: { '352': '#d9473b', '578': '#3f7fc0', '208': '#4f9b4a' }, names: ['352', '578', '208'], legend: [['#d9473b', '地熱'], ['#3f7fc0', '水力'], ['#4f9b4a', '風力']] }), OPEC] },
    s11: { s: [F.scheme('transition'), F.pyramids(), F.pyramid('japan')],
      t: [F.choro('tfr'), F.scheme('transition'), F.pyramids(), F.rank('old', { n: 8, hl: ['392'], cap: '65歳以上の割合（%）の高い国' })] },
    s12: { s: [F.choro('gni', { cap: '1人当たりGNI：栄養不足の人は所得の低い地域に多い' }), EXPORT, IMPORT],
      t: [IMPORT, EXPORT, IMPORT, F.world({ hl: ['356', '050', '360', '704', '608', '586', '764'], color: '#4f9b4a', cap: '緑の革命で穀物生産が増えたアジアの国々（例）' })] },
    s13: { s: [F.choro('urban'), F.scheme('urban'), F.world({ pts: [[-49.3, -25.4, 'クリチバ（バス高速輸送）'], [137.2, 36.7, '富山（コンパクトシティ）']], cap: '都市問題の解決の例' })],
      t: [F.world({ region: 'seasia', hl: ['764'], pts: [[100.5, 13.75, 'バンコク']], cap: 'バンコク：タイの人口や機能が集中' }), F.scheme('urban'), F.scheme('urban'), F.scatter('gni', 'urban', { names: ['562', '356', '076', '392'], cap: '所得と都市人口率：発展途上国でも都市化が急に進んでいる' })] },
    s14: { s: [F.plates({ japan: true, quakes: true, volc: true, cap: '日本付近のプレートと火山（▲）・大地震（◎）' }), F.climate('tokyo', null, { cap: '東京の雨温図：梅雨・秋雨・台風で6月と9月に雨が多い' }), F.scheme('help')],
      t: [F.plates({ japan: true, quakes: true, cap: '海溝型地震（海溝ぞい）と直下型地震（内陸の活断層）' }), F.climate('tokyo'), F.scheme('help'), F.scheme('symbols')] },
    s15: { s: [F.scheme('hazardmap'), F.town(), F.scheme('floodplain')],
      t: [F.scheme('floodplain'), F.scheme('hazardmap'), F.town({ cap: '水をふくんだ砂の地盤（埋立地・旧河道など）は液状化しやすい' }), F.scheme('hazardmap')] },
    s16: { s: [F.scheme('survey'), F.topo('fan'), F.town({ cap: '地図に情報を重ねて地域を分析する' })],
      t: [F.scheme('survey'), F.choro('old', { region: 'eastasia', cap: 'データを地図にして地域の特徴を読み取る' }), F.scheme('survey'), F.topo('terrace')] },

    t1: { s: [F.plateAnim('subduct'), F.plates({ bounds: true, newb: false, old: false, shield: false }), RES],
      t: [F.world({ rot: -150, pts: [[-155.3, 19.4, 'ハワイ島']], cap: 'ハワイ：プレートの境界から遠いホットスポットの火山' }), F.scheme('river'), F.world({ region: 'lamerica', hl: ['152'], names: ['152'], cap: 'チリ：アンデス山脈（新期造山帯）の銅' }), F.plateAnim('diverge')] },
    t2: { s: [F.scheme('river'), F.scheme('coast'), F.scheme('karst')],
      t: [F.scheme('fan'), F.scheme('coast'), F.scheme('floodplain'), F.scheme('karst')] },
    t3: { s: [F.climate('quito', 'manaus', { cap: 'キト（標高2850m・実線）とマナオス（低地・点線）：同じ赤道付近でも標高で気温がちがう' }), F.circulation(), F.world({ arrows: [[[-60, 36], [-12, 56], '北大西洋海流', '#d9473b'], [[-76, -42], [-80, -8], 'ペルー海流', '#3f7fc0'], [[14, -36], [10, -16], 'ベンゲラ海流', '#3f7fc0'], [[124, 22], [143, 37], '黒潮', '#d9473b']], pts: [[-70, -24, 'アタカマ砂漠'], [15, -23, 'ナミブ砂漠']], legend: [['#d9473b', '暖流'], ['#3f7fc0', '寒流']], cap: '主な海流と海岸砂漠' })],
      t: [F.circulation(), F.circulation(), F.world({ region: 'lamerica', pts: [[-70, -24, 'アタカマ砂漠']], arrows: [[[-78, -45], [-80, -8], 'ペルー海流', '#3f7fc0']] }), F.climate('quito', 'manaus')] },
    t4: { s: [F.climate('manaus'), SOIL],
      t: [SOIL, TAIGA, SOIL, F.climate('singapore', null, { cap: '高温多雨で、土の養分が流されやすい' })] },
    t5: { s: [F.scheme('thunen'), F.koppenMap({ cap: '農業の分布は気候と深く結びつく' }), F.world({ box: 'namerica', lines: [{ c: [[-100, 26], [-100, 52]], color: 'var(--shu)', dash: '6 4' }], labels: [[-112, 42, '放牧・かんがい', '#8c6d3f', 12], [-88, 42, '畑作', '#2c8350', 12], [-100, 54, '西経100°', 'var(--shu)', 11]], cap: '西経100°付近が年降水量500mmの線' })],
      t: [F.world({ region: 'europe', cap: 'ヨーロッパ：中部は混合農業、北部は酪農、南部は地中海式農業' }), F.climate('rome'), F.scheme('thunen'), EXPORT] },
    t6: { s: [TAIGA, F.world({ pts: [[150, 42, '北西太平洋'], [0, 58, '北東大西洋'], [-55, 45, '北西大西洋'], [-80, -12, 'ペルー沖']], cap: '主な漁場' }), F.world({ hl: ['156', '360', '356', '704'], color: '#3f7fc0', names: ['156', '360', '356', '704'], cap: '養殖業がさかんな国（例）' })],
      t: [F.world({ box: 'japan', hl: ['392'], cap: '排他的経済水域は沿岸から200海里（約370km）まで' }), F.world({ box: 'japan', pts: [[143.5, 39, '三陸沖（潮目）']], arrows: [[[132, 30], [142, 37], '黒潮（暖流）', '#d9473b'], [[150, 45], [143, 40], '親潮（寒流）', '#3f7fc0']] }), TAIGA, F.world({ box: 'japan', pts: [[141, 41, '栽培漁業（例：ほたて・さけ）']] })] },
    t7: { s: [RES, F.world({ hl: ['180', '152', '036', '156'], names: ['180', '152', '036', '156'], cap: 'レアメタルの主な産出国（コバルト・リチウム・レアアース）' })],
      t: [F.world({ box: 'namerica', hl: ['840'], pts: [[-102, 32, 'シェールオイル（テキサス）']] }), F.world({ hl: ['036', '324'], names: ['036', '324'], cap: 'ボーキサイトの主な産出国（例）' }), F.world({ region: 'safrica', hl: ['180'], names: ['180'], cap: 'コンゴ民主共和国：世界のコバルトの大部分を産出' }), F.world({ box: 'japan', hl: ['392'], cap: '資源の少ない日本では、都市鉱山のリサイクルが大切' })] },
    t8: { s: [F.scheme('weber'), SUNBELT],
      t: [F.scheme('weber'), SUNBELT, F.world({ box: 'namerica', pts: [[-122, 37.4, 'シリコンバレー（半導体・ICT）']] }), F.rank('gni', { ids: ['392', '458', '764', '704'], hl: ['764', '704'], cap: '1人当たりGNI（ドル）：東南アジアは人件費が安い' })] },
    t9: { s: [HUB, CANAL, F.world({ region: 'europe', hl: ['250', '724', '380', '300'], color: '#e3a63a', arrows: [[[10, 56], [4, 41], 'バカンス']], cap: '夏は北の国々から地中海沿岸へ観光客が向かう' })],
      t: [HUB, CANAL, F.choro('gni', { cap: '所得の差は、情報を使える機会の差（デジタルデバイド）にもつながる' }), F.world({ region: 'lamerica', hl: ['188'], names: ['188'], cap: 'コスタリカ：エコツーリズムで知られる' })] },
    t10: { s: [F.choro('dens'), F.scheme('pushpull'), MIGR],
      t: [F.choro('dens'), F.scheme('pushpull'), F.world({ hl: ['760', '004', '804', '728'], names: ['760', '004', '804'], cap: '多くの難民が生まれた国（例）' }), F.choro('pop', { style: 'circle' })] },
    t11: { s: [F.scheme('floodplain'), F.world({ box: [-82, 36, -68, 44], pts: [[-71, 42.4, 'ボストン'], [-74, 40.7, 'ニューヨーク'], [-75.2, 40, 'フィラデルフィア'], [-76.6, 39.3, 'ボルティモア'], [-77, 38.9, 'ワシントン']], cap: 'メガロポリス（ボストン〜ワシントン）' })],
      t: [F.scheme('fan'), F.world({ box: [-82, 36, -68, 44], pts: [[-71, 42.4, 'ボストン'], [-74, 40.7, 'ニューヨーク'], [-77, 38.9, 'ワシントン']] }), F.world({ pts: [[-47.9, -15.8, 'ブラジリア'], [149.1, -35.3, 'キャンベラ'], [-77, 38.9, 'ワシントンD.C.']], cap: '計画的につくられた首都' }), F.world({ box: 'japan', pts: [[142, 43.5, '北海道（屯田兵村）']] })] },
    t12: { s: [F.world({ hl: ['124', '036'], names: ['124', '036'], pts: [[103.8, 1.35, 'シンガポール']], cap: '多文化主義をとる国（例）' }), KURD],
      t: [KURD, F.world({ region: 'oceania', hl: ['036'], names: ['036'] }), F.world({ box: 'namerica', hl: ['124'], pts: [[-71.2, 46.8, 'ケベック']], cap: 'カナダ：ケベック州ではフランス語を話す人が多い' }), AFRICA] },
    t13: { s: [F.world({ region: 'eastasia', names: ['392', '156', '410', '496'], cap: '東アジア' }), QINLING],
      t: [QINLING, QINLING, F.scheme('urban'), F.rank('tfr', { asc: true, n: 8, hl: ['410'], cap: '合計特殊出生率の低い国' })] },
    t14: { s: [F.religion({ region: 'seasia', names: ['360', '764', '608', '458', '704'] }), F.world({ region: 'sasia', pts: [[77.6, 13, 'ベンガルール（ICT）'], [92, 26.3, 'アッサム（茶）'], [75.5, 30.8, 'パンジャブ（小麦）'], [76, 19.5, 'デカン高原（綿花）']], cap: '南アジアの主な産業' })],
      t: [ASEAN, F.world({ region: 'seasia', hl: ['360', '458'], color: '#4f9b4a', names: ['360', '458'], cap: '油やし（パーム油）の大産地' }), F.world({ region: 'sasia', pts: [[77.6, 13, 'ベンガルール']], hl: ['356'], cap: 'インドのICT産業の中心' }), F.world({ region: 'seasia', hl: ['458'], names: ['458'] })] },
    t15: { s: [F.climate('riyadh'), COCOA],
      t: [F.world({ region: 'wasia', hl: ['364'], names: ['364'], cap: 'イランなどの乾燥地域のカナート' }), COCOA, F.world({ region: 'safrica', hl: ['710'], names: ['710'] }), F.world({ box: [-20, -36, 52, 38], hl: COUNTRIES.filter(c => c.reg === 'safrica' || c.reg === 'nafrica').map(c => c.id), color: '#6f8f2a', cap: 'AU（アフリカ連合）：アフリカの国々が加盟' })] },
    t16: { s: [F.climate('london', 'tokyo', { cap: 'ロンドン（実線）と東京（点線）：ロンドンは高緯度でも冬が温和' }), F.choro('gni', { region: 'europe', cap: 'ヨーロッパの1人当たりGNI：西と東で差がある' }), F.world({ box: [25, 40, 180, 78], hl: ['643'], color: '#d9c08a', lines: [{ c: LF.oldBelts[1].line, color: '#2c8350', w: 4 }], labels: [[45, 56, 'ヨーロッパロシア', 'var(--shu)', 12], [110, 64, 'シベリア（タイガ・永久凍土）', '#3f7a4a', 12], [63, 69, 'ウラル山脈', '#2c8350', 10]], cap: 'ロシア：人口はウラル山脈より西に集中' })],
      t: [EUMAP, F.world({ region: 'europe', hl: ['208', '528'], names: ['208', '528'], cap: '酪農がさかんなデンマーク・オランダ' }), F.world({ region: 'europe', hl: ['826'], names: ['826'] }), F.world({ box: [0, 40, 80, 70], hl: ['643'], arrows: [[[60, 62], [12, 52], 'パイプライン（石油・天然ガス）', '#c8442a']] })] },
    t17: { s: [F.world({ box: 'namerica', arrows: [[[-102, 22], [-98, 36], 'ヒスパニック', 'var(--shu)']], pts: [[-122, 37.4, 'シリコンバレー']], cap: 'アメリカへの移民とICT産業' }), LANG_LA, F.world({ region: 'oceania', arrows: [[[120, -22], [139, 36], '鉄鉱石・石炭'], [[148, -25], [116, 39], '石炭・天然ガス']], hl: ['036'], cap: 'オーストラリアの貿易相手はアジアへ' })],
      t: [F.world({ box: 'namerica', arrows: [[[-102, 22], [-98, 36], 'ヒスパニック', 'var(--shu)']] }), F.world({ region: 'lamerica', hl: ['076'], names: ['076'], cap: 'ブラジル：さとうきびからバイオエタノール' }), F.world({ region: 'oceania', hl: ['554'], names: ['554'] }), F.world({ region: 'lamerica', hl: ['076', '032', '600', '858', '068'], color: '#3f7fc0', names: ['076', '032'], cap: 'MERCOSUR（南米南部共同市場）の主な加盟国' })] },
    t18: { s: [F.pyramid('japan'), F.scheme('survey')],
      t: [F.scheme('urban'), SURVEYJP, F.scheme('survey'), F.town({ cap: 'ハザードマップで安全な場所に住まいや施設を集める' })] }
  };
})();
