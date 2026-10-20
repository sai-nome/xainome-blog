(function () {
  'use strict';
  const E = window.AIEmpire;
  const sound = window.EmpireSound;
  const music = window.EmpireMusic;
  const guide = window.EmpireGuide;
  let helpUI, treeUI;
  // Keep this legacy key: saves are shared across paths on the same origin.
  const KEY = 'xainome.ai-empire.v1';
  const $ = id => document.getElementById(id);
  const n = (value, digits = 0) => new Intl.NumberFormat('ja-JP', { maximumFractionDigits: digits }).format(value);
  const compact = value => Math.abs(value) >= 1e6 ? new Intl.NumberFormat('ja-JP', { notation: 'compact', maximumFractionDigits: 1 }).format(value) : n(value);
  const yen = value => '¥' + compact(value);
  let state, protectedSave = false, unreadableSave = '', timer, toastTimer, readOnly = false;
  let initialized = false, lastMilestone = -1, saveFailed = false;
  let endingTimers = [], endingPreview = false, previousCompleted = 0;
  let industrySnapshot = null;
  const discoveryArt = {
    gpu: '<rect x="30" y="52" width="180" height="130" rx="14"/><rect x="73" y="77" width="94" height="80" rx="8"/><circle cx="120" cy="117" r="26"/><path d="m120 91 8 19 18 7-19 8-7 18-8-19-18-7 19-8Z"/><path d="M52 38v14m28-14v14m28-14v14m28-14v14m28-14v14m28-14v14M52 182v18m28-18v18m28-18v18m28-18v18m28-18v18m28-18v18"/>',
    power: '<path d="m138 24-76 108h57l-17 84 77-116h-58Z"/>',
    cooling: '<circle cx="120" cy="120" r="83"/><circle cx="120" cy="120" r="18"/><path d="M112 102C49 33 172 21 138 103M139 126c91-13 42 100-12 13m-21-4c-34 86-108-12-6-30"/>',
    rack: '<rect x="59" y="24" width="122" height="192" rx="12"/><path d="M59 86h122M59 150h122M110 58h48m-48 60h48m-48 64h48"/><circle cx="84" cy="57" r="5"/><circle cx="84" cy="118" r="5"/><circle cx="84" cy="182" r="5"/>',
    ai: '<rect x="48" y="60" width="144" height="130" rx="30"/><path d="M120 60V35m-72 69H29v42h19m144-42h19v42h-19M89 158h62"/><circle cx="120" cy="27" r="8"/><circle cx="88" cy="111" r="11"/><circle cx="152" cy="111" r="11"/>',
    research: '<path d="M93 29h54m-43 0v61l-49 92c-8 16 1 28 18 28h94c17 0 26-12 18-28l-49-92V29M80 145h80"/><circle cx="107" cy="173" r="6"/><circle cx="137" cy="153" r="5"/><path d="m164 58 8-16 8 16 16 8-16 8-8 16-8-16-16-8Z"/>',
    factory: '<path d="M29 207V101l56 30V90l59 33V64h40v143ZM144 64V29h40v35M50 162h20v23H50m44-23h20v23H94m44-23h20v23h-20M23 207h194"/>',
    supplies: '<path d="m33 79 87-43 87 43v99l-87 39-87-39Zm0 0 87 41 87-41m-87 41v97M77 57l89 41v38"/><path d="m94 154 26 12 26-12"/>',
    rocket: '<path d="M120 23c-38 30-48 69-42 126l42 23 42-23c6-57-4-96-42-126ZM78 111l-33 37v41l39-27m78-51 33 37v41l-39-27M104 181l16 38 16-38"/><circle cx="120" cy="89" r="19"/>',
  };
  function discoveryFor(action, key) {
    if (action === 'upgrade' && Object.hasOwn(E.UPGRADE_BASE,key)) return { id:'upgrade:'+key, name:key==='click' ? 'クリック報酬の強化' : E.AI[key].name+'の強化', subtitle:'投資が、毎日の仕事を速くする。', detail:key==='click' ? 'クリック報酬が基本額の2倍になりました。さらにLv.5まで強化できます。' : '処理速度が125%になりました。通常案件や担当する開発・大型案件に適用されます。', art:key==='click' ? 'supplies' : 'ai', label:'FIRST UPGRADE', accent:'#ffd78c' };
    if (action === 'gpu-upgrade') { const level = state.customGpuLevel + 1; return { id: 'gpu-level:' + level, name: '自社GPU Lv.' + level, subtitle: '研究が、自社の計算能力を進化させる。', detail: `基本性能が1基あたり${E.CUSTOM_GPU[level].cp} CP/秒に向上。既存・今後の自社GPUすべてに適用されます。`, art: 'gpu', label: 'GPU DESIGN UPGRADED', accent: '#9bdbff' }; }
    if (action === 'rocket-ai') return { id: 'rocket-ai', name: 'Rocket AI', subtitle: '宇宙への航路を導く、新しい頭脳。', detail: '航行・打ち上げを担当する専用AIを研究・導入しました。', art: 'ai', label: 'ROCKET AI DEVELOPED', accent: '#ffd78c' };
    if (action === 'water-plant' && E.WATER[key]) return { id: 'water:' + key, name: E.WATER[key].name, subtitle: '水と電力に、新しい役割が生まれた！', detail: E.WATER[key].description, art: key === 'liquid' ? 'cooling' : 'supplies', label: 'WATER INFRASTRUCTURE', accent: '#9bdbff' };
    if (action === 'buy' && E.EQUIPMENT[key]) return { id: 'buy:' + key, name: E.EQUIPMENT[key].name, subtitle: 'はじめての設備を手に入れた！', detail: E.EQUIPMENT[key].description, art: key, label: 'NEW EQUIPMENT' };
    if (action === 'unlock' && E.AI[key]) return { id: 'unlock:' + key, name: E.AI[key].name, subtitle: '新しい仲間が、あなたの帝国に。', detail: E.AI[key].description, art: 'ai', label: 'AI UNLOCKED', accent: key === 'image' ? '#ddbcff' : key === 'code' ? '#9bdbff' : '#ffd78c' };
    if (action === 'research' && E.TECH[key]) return { id: 'research:' + key, name: E.TECH[key].name, subtitle: '研究完了。次の時代がはじまる！', detail: E.TECH[key].description, art: 'research', label: 'TECHNOLOGY UNLOCKED', accent: '#ffd78c' };
    if (action === 'rocket' && E.ROCKET[key]) return { id: 'rocket:' + key, name: E.ROCKET[key].name, subtitle: '宇宙へ、また一歩近づいた。', detail: E.ROCKET[key].description, art: 'rocket', label: 'SPACE PROJECT', accent: '#9bdbff' };
    return {
      factory: { id: 'factory', name: '半導体工場', subtitle: '自分たちの手で、未来をつくろう。', detail: '原料から半導体を自動生産できるようになった！', art: 'factory', label: 'FIRST FACTORY' },
      assemble: { id: 'assemble', name: '自社製GPU', subtitle: 'あなたの帝国から、生まれた一基。', detail: '自分たちで作った半導体が、新しい計算能力になった！', art: 'gpu', label: 'MADE BY YOUR EMPIRE', accent: '#ffd78c' },
      supplies: { id: 'supplies', name: 'シリコンと高純度水', subtitle: 'ものづくりの準備は、整った。', detail: 'シリコン10個・高純度水20 Lを獲得！', art: 'supplies', label: 'MATERIALS ACQUIRED' }
    }[action];
  }
  function showDiscovery(item) {
    const dialog = $('discovery-dialog');
    dialog.style.setProperty('--discovery-color', item.accent || '#b4f7bd');
    $('discovery-label').textContent = item.label; $('discovery-title').textContent = item.name;
    $('discovery-subtitle').textContent = item.subtitle; $('discovery-detail').textContent = item.detail;
    helpUI.explain($('discovery-explanation'), item.id);
    $('discovery-art').innerHTML = `<svg viewBox="0 0 240 240" aria-hidden="true">${discoveryArt[item.art] || discoveryArt.gpu}</svg>`;
    $('discovery-particles').replaceChildren(...Array.from({ length: 44 }, (_, i) => {
      const particle = document.createElement('i'), angle = i * Math.PI * 2 / 44, distance = 160 + (i % 7) * 45;
      particle.style.setProperty('--dx', Math.cos(angle) * distance + 'px'); particle.style.setProperty('--dy', Math.sin(angle) * distance + 'px');
      particle.style.setProperty('--spin', (i % 2 ? 520 : -450) + 'deg'); particle.style.setProperty('--delay', (i % 5) * .035 + 's');
      particle.style.setProperty('--particle-color', ['var(--discovery-color)', '#ffe6a6', '#fff8e3', '#9bdbff'][i % 4]); return particle;
    }));
    dialog.classList.remove('revealing'); void dialog.offsetWidth;
    dialog.showModal(); dialog.classList.add('revealing'); sound.play('discovery'); $('discovery-title').focus({ preventScroll: true }); dialog.scrollTop = 0;
  }
  function soundControls() {
    $('sound-button').textContent = sound.enabled && sound.volume > 0 ? '効果音 ON' : '効果音 OFF';
    $('sound-button').setAttribute('aria-pressed', String(sound.enabled && sound.volume > 0));
    $('sound-enabled').checked = sound.enabled; $('sound-volume').value = Math.round(sound.volume * 100);
    $('sound-volume-value').textContent = Math.round(sound.volume * 100) + '%';
    $('music-enabled').checked = music.enabled; $('music-volume').value = Math.round(music.volume * 100);
    $('music-volume-value').textContent = Math.round(music.volume * 100) + '%';
    $('music-button').textContent = music.enabled && music.volume > 0 ? 'BGM ON' : 'BGM OFF';
    $('music-button').setAttribute('aria-pressed', String(music.enabled && music.volume > 0));
  }
  function finishEnding() {
    endingTimers.forEach(clearTimeout); endingTimers = [];
    $('ending-dialog').classList.remove('counting', 'lifting'); $('ending-dialog').classList.add('finished');
    $('ending-skip').hidden = true; sound.play('ending'); $('ending-close').focus();
  }
  function showEnding(preview = false) {
    music.close();
    endingPreview = preview; endingTimers.forEach(clearTimeout); endingTimers = [];
    const dialog = $('ending-dialog');
    dialog.classList.remove('counting', 'lifting', 'finished');
    // Restart CSS animations when replaying the scene.
    void dialog.offsetWidth;
    $('ending-mode').textContent = preview ? 'ENDING PREVIEW / 演出プレビュー' : 'MISSION COMPLETE';
    $('ending-close').textContent = preview ? 'ゲームに戻る' : 'クリア記録に戻る';
    $('ending-statistics').replaceChildren();
    for (const [label, value] of [['総収益', yen(state.earned)], ['完了した案件', n(state.completed) + ' 件'], ['設置したGPU', n(E.totalGpu(state)) + ' 基（自社 ' + n(state.customGpu) + '）'], ['稼働時間', n(Math.floor(state.played / 60)) + ' 分']]) {
      const item = document.createElement('div'); item.append(Object.assign(document.createElement('span'), { textContent: label }), Object.assign(document.createElement('strong'), { textContent: value })); $('ending-statistics').append(item);
    }
    if (!dialog.open) dialog.showModal();
    $('ending-skip').hidden = false; $('launch-countdown').textContent = '3';
    $('launch-caption-text').textContent = 'すべての準備が、いま、ひとつになる。';
    dialog.classList.add('counting'); sound.play('countdown');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finishEnding(); return; }
    for (let i = 1; i <= 2; i++) endingTimers.push(setTimeout(() => { $('launch-countdown').textContent = String(3 - i); sound.play('countdown'); }, i * 1000));
    endingTimers.push(setTimeout(() => { dialog.classList.remove('counting'); dialog.classList.add('lifting'); $('launch-countdown').textContent = 'LIFT OFF'; $('launch-caption-text').textContent = 'あなたの未来が、空へ。'; sound.play('launch'); }, 3000));
    endingTimers.push(setTimeout(finishEnding, 9000));
  }
  function notify(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4000); }
  function log(message) {
    const li = document.createElement('li'), time = document.createElement('time'), text = document.createElement('span');
    time.dateTime = new Date().toISOString(); time.textContent = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    text.textContent = message; li.append(time, text); $('activity-list').prepend(li);
    while ($('activity-list').children.length > 5) $('activity-list').lastChild.remove();
  }
  function save() {
    if (readOnly || protectedSave || !state) return false;
    try { localStorage.setItem(KEY, JSON.stringify(state)); saveFailed = false; $('save-status').textContent = '✓ 保存済み · ' + new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }); return true; }
    catch { $('save-status').textContent = '保存できません · バックアップをご利用ください'; if (!saveFailed) notify('ブラウザ保存が使えません。設定からバックアップを書き出せます。'); saveFailed = true; return false; }
  }
  function ask(title, description, action) {
    $('confirm-title').textContent = title; $('confirm-description').textContent = description;
    $('confirm-ok').onclick = () => { $('confirm-dialog').close(); action(); };
    $('confirm-dialog').showModal();
  }
  function download(content) {
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'ai-controler-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function setupCards() {
    $('ai-list').innerHTML = Object.entries(E.AI).sort((a,b)=>a[1].cost-b[1].cost).map(([key, a]) => `<article class="ai-row" data-ai="${key}" id="ai-${key}"><div class="ai-top"><span class="ai-icon" aria-hidden="true">${a.icon === '</>' ? '&lt;/&gt;' : a.icon}</span><div class="ai-name"><h3>${a.name}<span class="tag" id="ai-tag-${key}">未導入</span></h3><p>${a.description}</p></div><div class="ai-output" id="ai-output-${key}"></div></div><div id="ai-running-${key}"><div class="allocation"><label for="weight-${key}">優先度</label><input type="range" id="weight-${key}" data-weight="${key}" min="0" max="10" step="1" value="0"><output for="weight-${key}" id="weight-output-${key}">0</output></div><div class="job-progress"><div class="meter"><i id="job-bar-${key}"></i></div><small id="job-cp-${key}"></small></div></div><div class="ai-unlock" id="ai-locked-${key}"><span>${a.job} · ${a.cp} CP → ${key === 'research' ? a.reward + ' RP' : yen(a.reward)}</span><button class="secondary-button" data-open-tree="unlock:${key}" id="unlock-${key}">購入タブで導入する ↗</button></div></article>`).join('');
    $('factory-controls').className = 'factory-controls';
    $('factory-controls').innerHTML = '<p id="factory-locked">Research AIで180 RPを集め、半導体製造技術を研究すると解放されます。</p><div id="factory-unlocked" hidden><div class="factory-actions"><button class="secondary-button" id="build-factory" data-open-tree="factory"></button><button class="secondary-button" id="assemble-gpu" data-open-tree="assemble">購入タブでGPUを組み立てる ↗</button></div><div id="factory-running" hidden><hr><div class="factory-stats"><span id="factory-production"></span><span id="factory-supply-cost"></span></div><p id="factory-rate-explanation" class="factory-rate-explanation"></p><label class="factory-toggle"><input type="checkbox" id="factory-on">工場を稼働する（1工場につき電力4 / 冷却2）</label><label class="factory-toggle"><input type="checkbox" id="auto-supply">原料を自動調達する（半導体1個につき¥9）</label><p>半導体1個 = シリコン1個 + 高純度水2 L。自動調達は必要量だけ購入します。GPUは組立後に設置されます。</p><div class="factory-actions"><button class="secondary-button" id="buy-supplies" data-open-tree="supplies">購入タブで原料を補充する ↗</button></div></div></div>';
    $('rocket-parts').innerHTML = Object.entries(E.ROCKET).filter(([key])=>key!=='navigation').map(([key, part], i) => `<article class="rocket-part"><div><span class="section-number">0${i + 1}</span><h3>${part.name}</h3><span class="tag" id="rocket-part-status-${key}">未開発</span></div><p>${part.description}</p><p class="rocket-requirement" id="rocket-requirement-${key}" hidden></p><p class="rocket-cost" id="rocket-cost-${key}">${[yen(part.cash), part.rp ? part.rp + ' RP' : '', part.chips ? '半導体 ' + part.chips + '個' : '', part.water ? '水 ' + part.water + ' L' : ''].filter(Boolean).join(' / ')}</p><button class="secondary-button" id="rocket-build-${key}" data-open-tree="rocket:${key}">強化タブで開発する ↗</button></article>`).join('');
    $('water-equipment').innerHTML = Object.entries(E.WATER).map(([key, item]) => `<article class="water-equipment-card"><div class="industry-title"><h3>${item.name}</h3><span id="water-count-${key}" class="tag">0 基</span></div><p>${item.description}</p><p class="water-card-benefit">${({ purifier: '高純度水の原料単価を75%削減。予備と使用量に合わせて補充します。', liquid: '空冷6基分の冷却に加え、最大6基のGPUを＋50%高速化。水と電力が必要です。', recycler: '使用済み水を80%再利用。回収水から先に使い、原水や高純度水の購入を減らします。' })[key]}</p><label class="factory-toggle"><input type="checkbox" id="water-on-${key}" data-water-toggle="${key}On">稼働する</label><div class="equipment-buy"><span id="water-price-${key}"></span><button class="secondary-button" id="water-buy-${key}" data-open-tree="water:${key}">購入タブで増設する ↗</button></div></article>`).join('');
    $('contract-list').innerHTML = Object.entries(E.CONTRACTS).map(([key, job]) => `<article class="contract-card" id="contract-${key}"><div class="industry-title"><h3>${job.name}</h3><span class="tag" id="contract-tag-${key}">${E.AI[job.ai].name}</span></div><p>${job.description}</p><p class="contract-reward">報酬 ${yen(job.cash)} / ${n(job.cp)} CP</p><p class="contract-bonus">${job.bonus}</p><p class="subtle">追加負荷：電力${job.power} kW・冷却${job.cooling} CU<br>受注時の材料：${[job.chips ? '半導体' + job.chips + '個' : '', job.rp ? job.rp + ' RP' : '', job.water ? '高純度水' + job.water + ' L' : ''].filter(Boolean).join(' / ') || 'なし'}</p><div class="meter"><i id="contract-bar-${key}"></i></div><p id="contract-progress-${key}" class="subtle"></p><p id="contract-reason-${key}" class="contract-reason"></p><button class="secondary-button" id="contract-select-${key}" data-action="contract" data-key="${key}">受注する ↗</button></article>`).join('');
  }
  function renderIndustry(r) {
    const i = state.industry, p = state.projects, stopped = readOnly || state.rocket.launched;
    $('code-specialization').hidden = !state.ai.code;
    $('code-mode').value = i.codeMode; $('code-mode').disabled = stopped;
    $('code-mode').querySelector('option[value="optimize"]').disabled = i.softwareLevel >= 5;
    $('software-level').textContent = `制御ソフト Lv.${i.softwareLevel} / 5`;
    $('software-progress').textContent = i.softwareLevel >= 5 ? '工場改善を極めました。収益案件へ自動で戻ります。' : `${n(i.softwareWork)} / ${n(E.softwareCost(state))} CP · 次のレベルで工場生産＋10%`;
    $('software-bar').style.width = (i.softwareLevel >= 5 ? 100 : i.softwareWork / E.softwareCost(state) * 100) + '%';
    $('factory-bonus').textContent = `工場生産ボーナス ＋${n((r.factoryBonus - 1) * 100)}%（制御ソフト＋${i.softwareLevel * 10}% / 自動化案件＋${p.automation.runs ? 20 : 0}%）`;
    if (state.ai.code && i.codeMode === 'optimize') {
      $('ai-output-code').textContent = '工場改善 ' + n(r.effectiveShares.code, 1) + ' CP/s';
      $('job-bar-code').style.width = i.softwareWork / E.softwareCost(state) * 100 + '%';
      $('job-cp-code').textContent = `${n(i.softwareWork)} / ${n(E.softwareCost(state))} CP`;
    }
    $('water-locked').hidden = state.ai.code;
    $('raw-water-stock').textContent = n(i.rawWater, 1) + ' L'; $('pure-water-stock').textContent = n(state.water, 1) + ' L'; $('waste-water-stock').textContent = n(i.wasteWater, 1) + ' L';
    $('water-flow').textContent = state.rocket.launched ? 'クリア済み：水設備は停止しています。' : `浄水＋${n(r.purified, 2)} L/秒 / 再利用＋${n(r.recycled, 2)} L/秒 / 水冷消費${n(r.liquidNeed * r.liquidFactor, 2)} L/秒 / 工場消費 最大${n(r.factoryRate * 2, 2)} L/秒`;
    const impact = E.waterImpact(state), signed = (value, digits = 1) => (value >= 0 ? '＋' : '−') + n(Math.abs(value), digits);
    $('water-compute-impact').textContent = signed(impact.cpGain) + ' CP/秒';
    $('water-income-impact').textContent = `計算能力 ${n(impact.cpWithout, 1)} → ${n(impact.cpWith, 1)} CP/秒。通常AIの収益目安 ${signed(impact.incomeGain * 60)} 円/分。`;
    $('water-recycle-impact').textContent = n(impact.recoveredPerMinute, 1) + ' L/分を回収';
    $('water-recycle-value').textContent = `回収水の外部購入換算 ${yen(impact.recoveredValuePerMinute)}/分。使用済み水を80%再利用します。`;
    $('water-buffer-status').textContent = `自動補充の目標 ${n(r.waterTarget, 1)} L（予備100 L＋水冷・工場の30秒分）。目標に達すると浄水・再利用は待機し、使用後に再開します。`;
    $('water-cooling-status').textContent = i.liquid && i.liquidOn ? `水冷：冷却＋${n(r.liquidCooling, 1)} CU・GPU ${n(r.cooledGPU, 1)}基相当を強化。対象GPUは計算能力＋50%（現在の増分＋${n(r.waterBoostCP, 1)} CP/秒）。${r.liquidFactor < .999 ? '水不足で性能が低下しています。' : r.powerRatio < .999 ? '電力不足で性能が低下しています。' : ''}` : '水冷1基で最大12 CU＝空冷6基分。最大6基のGPUの計算能力が50%上がり、収益・研究・大型案件が速く進みます。電力と水を用意して稼働させましょう。';
    for (const key of Object.keys(E.WATER)) {
      $('water-count-' + key).textContent = i[key] + ' 基'; $('water-price-' + key).textContent = yen(E.waterCost(state, key));
      $('water-buy-' + key).disabled = false;
      $('water-on-' + key).checked = i[key + 'On']; $('water-on-' + key).disabled = stopped || !i[key];
    }
    for (const [key, id] of [['autoRaw', 'auto-raw-water'], ['autoWater', 'auto-cooling-water']]) { $(id).checked = i[key]; $(id).disabled = stopped || !state.ai.code; }
    $('buy-raw-water').disabled = false;
    $('contract-weight').value = p.weight; $('contract-weight').disabled = stopped;
    $('contract-weight-output').textContent = `${p.weight} / 10 · ${n(r.contractCP, 1)} CP/秒`;
    $('contract-active').textContent = p.active ? E.CONTRACTS[p.active].name + (p.weight ? 'を進行中' : 'を一時停止中（優先度0）') : '案件は待機中。進める案件を選んでください。';
    $('contract-pause').disabled = stopped || !p.active;
    for (const [key, job] of Object.entries(E.CONTRACTS)) {
      const record = p[key], active = p.active === key, reason = E.contractReason(state, key);
      $('contract-bar-' + key).style.width = record.work / job.cp * 100 + '%';
      $('contract-progress-' + key).textContent = `${n(record.work)} / ${n(job.cp)} CP · 完了${record.runs}回${record.funded && !active ? ' · 材料支払済み／進捗保存中' : ''}`;
      $('contract-tag-' + key).textContent = active ? '進行中' : record.runs ? '初回特典獲得済み' : E.AI[job.ai].name;
      $('contract-tag-' + key).classList.toggle('active', active);
      $('contract-reason-' + key).textContent = reason;
      $('contract-select-' + key).disabled = stopped || !!reason || active;
      $('contract-select-' + key).textContent = active ? '選択中' : record.funded ? '再開・切り替え ↗' : record.runs ? 'もう一度受注する ↗' : '受注する ↗';
    }
    for (const key of Object.keys(E.ROCKET)) {
      const part = E.rocketCost(state, key);
      $('rocket-cost-' + key).textContent = [yen(part.cash), part.rp ? part.rp + ' RP' : '', part.chips ? '半導体 ' + part.chips + '個' : '', part.water ? '水 ' + part.water + ' L' : '', p.space.runs ? '宇宙案件の20%割引適用' : ''].filter(Boolean).join(' / ');
    }
    if (industrySnapshot?.state === state) {
      if (i.softwareLevel > industrySnapshot.level) {
        log(`制御ソフトがLv.${i.softwareLevel}に到達。工場の生産能力が向上しました。`);
        if (!document.hidden) { notify('工場改善が完了しました！'); sound.play('research'); }
      }
      for (const key of Object.keys(E.CONTRACTS)) if (p[key].runs > industrySnapshot.runs[key]) {
        log(E.CONTRACTS[key].name + 'を完了！' + yen(E.CONTRACTS[key].cash) + '獲得。');
        if (!document.hidden) { notify('大型案件を完了しました！'); sound.play('research'); }
      }
    }
    industrySnapshot = { state, level: i.softwareLevel, runs: Object.fromEntries(Object.keys(E.CONTRACTS).map(key => [key, p[key].runs])) };
  }
  function render(quiet = false) {
    if (!state) return;
    const r = E.rates(state), features = E.unlockedFeatures(state);
    for (const [id, unlocked] of [['factory-panel', features.factory], ['water-panel', features.water], ['contracts-panel', features.contractsBoard], ['space-project', features.space], ['space-mission', features.space]]) $(id).hidden = !unlocked;
    for (const key of Object.keys(E.CONTRACTS)) $('contract-' + key).hidden = !features.contracts[key];
    const panelIds = { water: 'water-panel', factory: 'factory-panel', contracts: 'contracts-panel', space: 'space-project' };
    const panelOrder = E.revealSections(state), panelHost = $('unlocked-panels');
    panelOrder.forEach((key, index) => {
      const panel = $(panelIds[key]);
      panel.querySelector('.panel-heading .section-number').textContent = String(index + 3).padStart(2, '0');
      if (panelHost.children[index] !== panel) panelHost.insertBefore(panel, panelHost.children[index] || null);
    });
    const gpuCount = E.totalGpu(state);
    $('money').textContent = yen(state.cash); $('income').textContent = '+ ' + yen(r.income) + ' / 秒';
    $('compute').textContent = n(r.cp, 1); $('gpu-summary').textContent = `購入 ${n(state.gpu)}基 / 自社 ${n(state.customGpu)}基（Lv.${state.customGpuLevel}） · 稼働率 ${n(r.utilization * 100)}%`;
    $('power-use').textContent = n(r.demandPower, 1); $('power-cap').textContent = n(r.powerCap);
    $('cooling-use').textContent = n(r.demandCooling); $('cooling-cap').textContent = n(r.coolingCap);
    for (const [key, demand, cap] of [['power', r.demandPower, r.powerCap], ['cooling', r.demandCooling, r.coolingCap]]) {
      $(key + '-bar').style.width = Math.min(100, demand / cap * 100) + '%'; $(key + '-bar').parentElement.classList.toggle('warning', demand > cap);
    }
    $('research-points').replaceChildren(document.createTextNode(compact(state.rp) + ' '), Object.assign(document.createElement('small'), { textContent: 'RP' }));
    $('research-rate').textContent = state.ai.research ? '+ ' + n(r.research, 2) + ' RP / 秒' : '研究AIで獲得';
    $('click-reward').textContent = '+ ' + yen(E.manualReward(state));
    $('click-upgrade-level').textContent = `クリック強化 Lv.${state.upgrades.click} / ${E.UPGRADE_LIMIT} · 報酬${1+state.upgrades.click}倍`;
    document.querySelector('.server-scene').classList.toggle('is-running', r.cp > 0 && r.totalWeight > 0);
    $('scene-label').textContent = r.cp > 0 && r.totalWeight > 0 ? 'SYSTEM RUNNING · ' + n(r.utilization * 100) + '%' : 'SYSTEM STANDBY';
    const stages = state.factory > 0 ? ['AIインフラ企業', 'つくる力が、未来を変える。'] : gpuCount >= 8 ? ['データセンター', '計算能力を、次の産業へ。'] : gpuCount >= 3 ? ['小さなAI企業', 'ひとりの仕事が、チームの力に。'] : ['個人開発者', 'ひとつのアイデアから、はじまる。'];
    $('stage-name').textContent = stages[0]; $('stage-detail').textContent = stages[1];
    let notice = '設備には余裕があります。GPUの追加で計算能力を高めましょう。';
    if (!gpuCount) notice = '最初のGPUを購入すると、AIが自動で仕事を始めます。';
    else if (!r.totalWeight) notice = 'AIがすべて停止中です。優先度を1以上にすると仕事を再開します。';
    else if (r.bottleneck) notice = `${r.bottleneck === 'power' ? '電力' : '冷却'}不足で計算能力が${n((1 - r.utilization) * 100)}%低下。${r.bottleneck === 'power' ? '電力設備' : '空冷ユニット'}を増設しましょう。`;
    else if (gpuCount >= E.slots(state)) notice = 'GPU設置枠がいっぱいです。サーバーラックを増設しましょう。';
    $('bottleneck-text').textContent = notice; $('bottleneck').classList.toggle('warning', !!r.bottleneck || (!!gpuCount && !r.totalWeight));
    if (r.bottleneck === 'cooling' && state.industry.liquid && state.industry.liquidOn && r.liquidFactor < .999) $('bottleneck-text').textContent = '水冷用の高純度水が不足しています。浄水・補給、または空冷への切り替えを検討しましょう。';
    $('allocation-total').textContent = n(r.cp, 1) + ' CP/秒 を共有';
    for (const [key, a] of Object.entries(E.AI)) {
      const unlocked = state.ai[key], running = unlocked && r.shares[key] > 0;
      $('ai-' + key).classList.toggle('locked-row', !unlocked);
      $('ai-running-' + key).hidden = !unlocked; $('ai-locked-' + key).hidden = unlocked;
      $('ai-tag-' + key).textContent = unlocked ? (running ? '稼働中' : '待機中')+' · 強化Lv.'+state.upgrades[key] : '未導入';
      $('ai-tag-' + key).classList.toggle('active', running);
      $('ai-output-' + key).textContent = unlocked ? (key === 'research' ? '+ ' + n(r.research, 2) + ' RP/s' : '+ ' + yen(key==='code' && state.industry.codeMode==='optimize' ? 0 : r.effectiveShares[key] / a.cp * a.reward) + '/s') : '—';
      $('weight-' + key).value = state.weights[key]; $('weight-output-' + key).textContent = state.weights[key] + ' / 10';
      $('weight-' + key).setAttribute('aria-valuetext', `優先度${state.weights[key]}、毎秒${n(r.shares[key], 1)} CP`);
      $('job-bar-' + key).style.width = state.progress[key] / a.cp * 100 + '%';
      $('job-cp-' + key).textContent = n(state.progress[key]) + ' / ' + a.cp + ' CP · 処理速度' + n(E.aiMultiplier(state,key)*100) + '%';
      $('unlock-' + key).disabled = false;
    }
    $('silicon-amount').textContent = n(state.silicon, 1) + ' 個'; $('water-amount').textContent = n(state.water, 1) + ' L'; $('chip-amount').textContent = n(state.chips, 1) + ' 個';
    $('factory-state').textContent = state.factory ? state.factoryOn ? state.autoSupply || (state.silicon > 0 && state.water >= 2) ? '稼働中 · ' + state.factory + ' 工場' : '原料待ち' : '停止中' : state.tech.manufacturing ? '建設可能' : '研究で解放';
    $('factory-locked').hidden = state.tech.manufacturing; $('factory-unlocked').hidden = !state.tech.manufacturing; $('factory-running').hidden = !state.factory;
    $('build-factory').textContent = '購入タブで工場を建設する ↗';
    $('build-factory').disabled = false;
    $('assemble-gpu').disabled = false;
    $('buy-supplies').disabled = false;
    $('factory-on').checked = state.factoryOn; $('auto-supply').checked = state.autoSupply;
    $('factory-production').textContent = '生産能力 ' + n(r.factoryRate, 2) + ' 個/秒';
    $('factory-supply-cost').textContent = '自動調達 最大 ' + yen(state.autoSupply ? r.factoryRate * 9 : 0) + '/秒';
    const factoryInfo = guide.factoryMetrics(state);
    $('factory-rate-explanation').textContent = state.factoryOn ? `原料が十分な場合：毎分${n(factoryInfo.basePerMinute, 2)}個 × ${n(r.factoryBonus, 2)}倍（強化＋${n(factoryInfo.bonus)}%）＝ 半導体 最大${n(factoryInfo.capacityPerMinute, 2)}個/分。シリコンは最大${n(factoryInfo.siliconPerMinute, 2)}個/分、水は最大${n(factoryInfo.waterPerMinute, 2)} L/分を消費します。${factoryInfo.secondsForFive ? 'この能力ならGPU組立用の5個が約' + n(factoryInfo.secondsForFive, 1) + '秒でたまります。' : ''} 原料不足では生産を待機します。` : '工場は停止中です。半導体の生産と、工場が使う電力・冷却の予約を止めています。';
    const goals = E.updateMilestones(state), mainGoals = goals.filter(g => !g.optional), active = mainGoals.find(g => !g.done);
    const goal = active || mainGoals[mainGoals.length - 1], index = mainGoals.indexOf(goal), done = goals.filter(g => g.done).length;
    $('milestone-title').textContent = active ? goal.title : '星に届いた、あなたのAI企業。';
    $('milestone-description').textContent = active ? goal.description : 'すべてのメイン目標を達成しました。';
    $('milestone-count').textContent = active ? String(index + 1).padStart(2,'0') + ' / ' + mainGoals.length : 'COMPLETE';
    $('milestone-icon').textContent = active ? '↗' : '✓';
    $('milestone-bar').style.width = Math.min(100, goal.value / goal.target * 100) + '%';
    $('milestone-progress').textContent = active ? `${n(Math.min(goal.value,goal.target),1)} / ${n(goal.target)} ${goal.unit}` : mainGoals.length + ' / ' + mainGoals.length + ' 達成';
    const goalButton = $('milestone-go'); goalButton.hidden = !active;
    if (active) { delete goalButton.dataset.openPuzzle; delete goalButton.dataset.openTree; delete goalButton.dataset.scrollTo; if(goal.id==='first-income') goalButton.dataset.scrollTo='work-button'; else if(goal.guide==='rocket:navigation') goalButton.dataset.scrollTo='rocket-build-navigation'; else goalButton.dataset.openTree=goal.guide; }
    $('milestone-upcoming').replaceChildren(...mainGoals.filter(g=>!g.done && g.id!==goal.id).slice(0,3).map(g=>{ const li=document.createElement('li'); li.textContent=g.title; return li; }));
    const optional=goals.filter(g=>g.optional), side=optional.find(g=>!g.done);
    $('milestone-optional-count').textContent=optional.filter(g=>g.done).length+' / '+optional.length;
    $('milestone-optional-title').textContent=side ? side.description : '寄り道の目標もすべて達成！';
    const sideButton=$('milestone-optional-go'); sideButton.hidden=!side;
    if(side) sideButton.dataset.openTree=side.guide;
    if(lastMilestone>=0 && done>lastMilestone) { log('マイルストーン達成。次の成長へ！'); notify('マイルストーンを達成しました！'); if(!quiet) sound.play('milestone'); }
    lastMilestone=done;
    const parts = Object.keys(E.ROCKET).filter(k => state.rocket[k]).length;
    $('rocket-locked').hidden = E.rocketUnlocked(state);
    for (const key of Object.keys(E.ROCKET)) {
      $('rocket-part-status-' + key).textContent = state.rocket[key] ? '完成 ✓' : '未開発';
      $('rocket-part-status-' + key).classList.toggle('active', state.rocket[key]);
      $('rocket-requirement-' + key).hidden = key !== 'navigation';
      $('rocket-requirement-' + key).textContent = state.rocketAI ? '必要技術：Rocket AI 導入済み ✓' : '必要技術：Rocket AIの研究・導入（自社GPU Lv.5で研究解放）';
      $('rocket-build-' + key).disabled = key==='navigation' && (readOnly || !E.canBuildRocket(state,key));
      $('rocket-build-' + key).textContent = key==='navigation' ? state.rocket[key] ? '開発完了 ✓' : 'AI航行システムを開発する ↗' : state.rocket[key] ? '開発完了 · ツリーを見る' : '強化タブで開発する ↗';
    }
    $('rocket-status').textContent = state.rocket.launched ? 'MISSION COMPLETE' : parts + ' / 3 部品完成';
    $('launch-checks').replaceChildren(...E.launchChecks(state).map(check => {
      const li = document.createElement('li'); li.textContent = (check.done ? '✓ ' : '○ ') + check.label; li.classList.toggle('checked', check.done); return li;
    }));
    $('launch-button').disabled = readOnly || !E.canLaunch(state); $('launch-button').hidden = state.rocket.launched;
    $('replay-ending').hidden = !state.rocket.launched;
    $('mission-status').textContent = state.rocket.launched ? '打ち上げ成功 · クリア！' : E.rocketUnlocked(state) ? '部品開発 ' + parts + ' / 3 →' : '設備と研究を育てて、宇宙開発へ ↓';
    $('launch-note').textContent = state.rocket.launched ? '打ち上げ成功！クリア記録を保存しました。経営の進行は停止しています。設定から新しいゲームを始められます。' : 'すべての準備が整うと打ち上げ可能になります。成功すると、この物語はひとまず完結します。';
    document.querySelectorAll('[data-action], [data-weight], #factory-on, #auto-supply, #work-button').forEach(element => { if (state.rocket.launched) element.disabled = true; });
    $('work-button').disabled = readOnly || state.rocket.launched;
    for (const key of Object.keys(E.AI)) $('weight-' + key).disabled = readOnly || state.rocket.launched;
    for (const key of ['factory-on', 'auto-supply']) $(key).disabled = readOnly || state.rocket.launched;
    renderIndustry(r);
    treeUI?.render();
    if (state.rocket.launched) {
      $('bottleneck-text').textContent = 'MISSION COMPLETE — ロケットは宇宙へ。経営を終了し、クリア記録を保存しています。';
      $('bottleneck').classList.remove('warning'); $('stage-name').textContent = '宇宙へ届いたAI企業'; $('scene-label').textContent = 'MISSION COMPLETE';
    }
  }
  function mutate(action, discovery) {
    if (readOnly || !state || state.rocket.launched) return;
    E.advance(state, Date.now());
    const message = action();
    const first = !!message && discovery && E.claimDiscovery(state, discovery.id);
    render(first); save();
    if (message) { log(message); if (first) { $('toast').hidden = true; showDiscovery(discovery); } else { notify(message); sound.play(message.includes('研究') ? 'research' : 'purchase'); } }
  }
  function offline() {
    const before = { cash: state.cash, rp: state.rp, chips: state.chips, software: state.industry.softwareLevel, projects: Object.keys(E.CONTRACTS).reduce((sum, key) => sum + state.projects[key].runs, 0) };
    const seconds = E.advance(state, Date.now());
    if (seconds >= 60 && (E.totalGpu(state) || state.factory)) {
      $('offline-description').textContent = `${n(Math.floor(seconds / 3600))}時間${n(Math.floor(seconds % 3600 / 60))}分のあいだ、あなたの設備は動き続けていました。`;
      $('offline-results').textContent = `資金 ${yen(state.cash - before.cash)} / 研究 +${n(state.rp - before.rp)} RP / 半導体 +${n(state.chips - before.chips, 1)} 個`;
      $('offline-results').textContent += ` / 工場改善 ＋${state.industry.softwareLevel - before.software} Lv / 大型案件 ＋${Object.keys(E.CONTRACTS).reduce((sum, key) => sum + state.projects[key].runs, 0) - before.projects} 件`;
      $('offline-dialog').showModal(); log('オフライン中の進行を反映しました。');
    }
  }
  function events() {
    window.EmpireDialogs.install(document);
    // Start in a real gesture so browsers permit audio. Repeated interactions
    // keep the same loop playing instead of restarting it.
    const startMusic = () => { if (!$('ending-dialog').open) music.open(); };
    document.addEventListener('pointerdown', startMusic);
    document.addEventListener('keydown', startMusic);
    $('work-button').addEventListener('click', event => {
      if (readOnly || state.rocket.launched) return;
      sound.play('click');
      mutate(() => { const reward = E.click(state); if (state.clicks === 1) return '手動案件で' + yen(reward) + 'を獲得しました。'; });
      const reward = document.createElement('span'); reward.className = 'floating-reward'; reward.textContent = $('click-reward').textContent;
      reward.style.left = '50%'; reward.style.top = '-8px'; event.currentTarget.append(reward); setTimeout(() => reward.remove(), 750);
    });
    document.addEventListener('click', event => {
      const jump=event.target.closest('[data-scroll-to]'); if(jump) { const target=$(jump.dataset.scrollTo); target.scrollIntoView({behavior:'smooth',block:'center'}); target.focus({preventScroll:true}); }
      const close = event.target.closest('[data-close]'); if (close) $(close.dataset.close).close();
      const b = event.target.closest('[data-action]'); if (!b || b.disabled) return;
      const key = b.dataset.key;
      if (b.dataset.action === 'tree-launch') { treeUI.close(); $('launch-button').click(); return; }
      mutate(() => {
        if (b.dataset.action === 'upgrade' && E.buyUpgrade(state, key)) return (key==='click' ? 'クリック報酬' : E.AI[key].name+'の処理速度')+'をLv.'+state.upgrades[key]+'へ強化しました。';
        if (b.dataset.action === 'software-mode' && E.setCodeMode(state, 'optimize')) return 'Coding AIを工場制御ソフトの開発へ切り替えました。';
        if (b.dataset.action === 'gpu-upgrade' && E.upgradeCustomGpu(state)) return '自社GPUの設計をLv.' + state.customGpuLevel + 'へ強化しました。';
        if (b.dataset.action === 'rocket-ai' && E.developRocketAI(state)) return 'Rocket AIの研究・導入が完了しました。';
        if (b.dataset.action === 'buy' && E.buy(state, key)) return E.EQUIPMENT[key].name + 'を増設しました。';
        if (b.dataset.action === 'unlock' && E.unlock(state, key)) return E.AI[key].name + 'を導入しました。';
        if (b.dataset.action === 'research' && E.research(state, key)) return E.TECH[key].name + 'の研究が完了しました。';
        if (b.dataset.action === 'factory' && E.buildFactory(state)) return '半導体工場を建設しました。電力と冷却能力を確認しましょう。';
        if (b.dataset.action === 'assemble' && E.assemble(state)) return '自社製GPUを組み立て、設置しました。';
        if (b.dataset.action === 'supplies' && E.supplies(state)) return '原料10セットを購入しました。';
        if (b.dataset.action === 'rocket' && E.buildRocket(state, key)) return E.ROCKET[key].name + 'が完成しました。';
        if (b.dataset.action === 'water-plant' && E.buyWaterPlant(state, key)) return E.WATER[key].name + 'を建設しました。';
        if (b.dataset.action === 'water-raw' && E.buyRawWater(state)) return '原水100 Lを購入しました。';
        if (b.dataset.action === 'contract' && E.selectContract(state, key)) return E.CONTRACTS[key].name + 'を選択しました。';
        if (b.dataset.action === 'contract-pause' && E.selectContract(state, null)) return '大型案件を一時停止しました。進捗・支払済み材料は保持します。';
      }, discoveryFor(b.dataset.action, key));
    });
    document.addEventListener('input', event => {
      const key = event.target.dataset.weight;
      if (key) mutate(() => { state.weights[key] = Math.max(0, Math.min(10, Number(event.target.value))); });
      if (event.target.id === 'contract-weight') mutate(() => { state.projects.weight = Math.max(0, Math.min(10, Number(event.target.value))); });
    });
    $('code-mode').addEventListener('change', event => mutate(() => E.setCodeMode(state, event.target.value) ? 'Coding AIの担当を変更しました。' : '', undefined));
    document.addEventListener('change', event => {
      const key = event.target.dataset.waterToggle;
      if (key) mutate(() => { state.industry[key] = event.target.checked; return '水設備・調達の設定を変更しました。'; });
    });
    $('factory-on').addEventListener('change', event => mutate(() => { state.factoryOn = event.target.checked; return state.factoryOn ? '半導体工場を稼働しました。' : '半導体工場を停止しました。'; }, undefined));
    $('auto-supply').addEventListener('change', event => mutate(() => { state.autoSupply = event.target.checked; return '工場の原料調達を変更しました。'; }, undefined));
    $('help-button').onclick = () => helpUI.intro();
    $('settings-button').onclick = () => { $('settings-dialog').showModal(); music.open(); sound.play('click'); };
    $('settings-dialog').addEventListener('click', event => { if (event.target.closest('button')) sound.play('click'); });
    $('discovery-close').onclick = () => $('discovery-dialog').close();
    $('preview-discovery').onclick = () => { $('settings-dialog').close(); showDiscovery(discoveryFor('buy', 'gpu')); };
    soundControls();
    $('sound-button').onclick = () => { sound.configure(!sound.enabled || sound.volume === 0, sound.volume || .35); soundControls(); sound.play('click'); };
    $('music-button').onclick = () => { music.configure(!music.enabled || music.volume === 0, music.volume || .22); soundControls(); };
    $('sound-enabled').onchange = event => { sound.configure(event.target.checked); soundControls(); sound.play('click'); };
    $('sound-volume').oninput = event => { sound.configure(sound.enabled, Number(event.target.value) / 100); soundControls(); };
    $('sound-volume').onchange = () => sound.play('click');
    $('music-enabled').onchange = event => { music.configure(event.target.checked); soundControls(); sound.play('click'); };
    $('music-volume').oninput = event => { music.configure(music.enabled, Number(event.target.value) / 100); soundControls(); };
    $('music-volume').onchange = () => sound.play('click');
    $('launch-button').onclick = () => {
      if (readOnly || !E.canLaunch(state)) return;
      ask('この帝国で、宇宙へ旅立ちますか？', 'ロケットを打ち上げるとエンディングが始まり、ゲームの進行を終了します。クリア記録とセーブは残ります。', () => {
        E.advance(state, Date.now());
        if (E.launch(state)) { log('PROJECT HORIZON：ロケット打ち上げ成功！'); render(); save(); showEnding(); }
      });
    };
    $('replay-ending').onclick = () => showEnding();
    $('preview-ending').onclick = () => { $('settings-dialog').close(); showEnding(true); };
    $('ending-skip').onclick = finishEnding;
    $('ending-replay').onclick = () => showEnding(endingPreview);
    $('ending-close').onclick = () => $('ending-dialog').close();
    $('ending-dialog').addEventListener('close', () => { endingTimers.forEach(clearTimeout); endingTimers = []; music.open(); });
    $('confirm-cancel').onclick = () => $('confirm-dialog').close();
    $('save-button').onclick = () => {
      if (protectedSave) ask('保存データを上書きしますか？', '読み込めなかった元のデータが、このゲームの現在の状態で上書きされます。先にバックアップを書き出すことをおすすめします。', () => { protectedSave = false; unreadableSave = ''; save(); });
      else { E.advance(state, Date.now()); if (save()) notify('保存しました。'); }
    };
    $('export-button').onclick = () => { E.advance(state, Date.now()); download(unreadableSave || JSON.stringify(state, null, 2)); notify('バックアップを書き出しました。'); };
    $('import-input').addEventListener('change', async event => {
      const file = event.target.files[0]; event.target.value = ''; if (!file) return;
      try {
        if (file.size > 100000) throw new Error('ファイルが大きすぎます。AI Controlerのバックアップを選んでください。');
        const imported = E.validate(JSON.parse(await file.text()));
        ask('バックアップを読み込みますか？', '現在の進行状況を、選択したバックアップで置き換えます。', () => { state = imported; protectedSave = false; unreadableSave = ''; lastMilestone = -1; offline(); render(); save(); log('バックアップを読み込みました。'); notify('バックアップを読み込みました。'); });
      } catch (error) { notify(error instanceof SyntaxError ? 'JSON形式のバックアップを選んでください。' : error.message); }
    });
    $('reset-button').onclick = () => ask('最初からやり直しますか？', 'このゲームの資金・設備・研究をすべてリセットします。必要な場合は先にバックアップを書き出してください。', () => { state = E.create(); protectedSave = false; unreadableSave = ''; lastMilestone = -1; $('activity-list').replaceChildren(); render(); save(); log('新しいAI企業を立ち上げました。'); notify('新しいゲームを始めました。'); helpUI.intro(); });
    document.addEventListener('visibilitychange', () => {
      if (readOnly) return;
      if (document.hidden) { E.advance(state, Date.now()); save(); }
      else { offline(); render(); save(); }
    });
    window.addEventListener('pagehide', () => { if (!readOnly) { E.advance(state, Date.now()); save(); } });
  }
  function start() {
    if (initialized) return; initialized = true;
    let raw, balanceUpdated = false;
    try {
      raw = localStorage.getItem(KEY); const parsed = raw ? JSON.parse(raw) : null;
      balanceUpdated = !!parsed && parsed.balanceVersion !== 2;
      state = parsed ? E.validate(parsed) : E.create();
    }
    catch (error) {
      state = E.create();
      if (raw) { protectedSave = true; unreadableSave = raw; }
      log(raw ? '元のセーブを保護しています。設定から書き出し・読込・リセットできます。' : 'ブラウザ保存を利用できません。設定からバックアップできます。');
    }
    setupCards(); helpUI = window.EmpireHelp.create(() => state); treeUI = window.EmpireSkillTreeUI.create(() => state, () => readOnly);
    events(); offline(); render();
    if (protectedSave) { $('save-status').textContent = 'セーブ読込失敗 · 元データを保護中'; notify('セーブを読み込めません。元データを保護中です。設定をご確認ください。'); }
    else save();
    if (balanceUpdated && !protectedSave) log('設備バランス更新：旧電力・空冷1基を新4基に換算。供給能力は維持しています。');
    if (!raw) log('AI Controlerへようこそ。まずは案件をこなしてみよう。');
    if (helpUI.needsIntro()) {
      if ($('offline-dialog').open) $('offline-dialog').addEventListener('close', () => { if (!readOnly && helpUI.needsIntro()) helpUI.intro(); }, { once: true });
      else helpUI.intro();
    }
    previousCompleted = state.completed;
    timer = setInterval(() => { if (!document.hidden && !readOnly) { E.advance(state, Date.now()); render(); if (state.completed > previousCompleted && !$('ending-dialog').open && !$('discovery-dialog').open) sound.play('job'); previousCompleted = state.completed; } }, 200);
    setInterval(save, 10000);
  }
  function blocked() {
    readOnly = true; state = E.create(); setupCards(); render();
    document.querySelectorAll('button,input').forEach(e => { e.disabled = true; });
    $('save-status').textContent = '別のタブでプレイ中'; $('bottleneck-text').textContent = '別のタブでAI Controlerを開いています。そのタブを閉じて、このページを再読み込みしてください。';
  }
  // A tab holds this lock for its lifetime, so two tabs cannot overwrite the save.
  if (navigator.locks) navigator.locks.request(KEY, { ifAvailable: true }, lock => { if (!lock) { blocked(); return; } start(); return new Promise(() => {}); }).catch(() => { if (!initialized) start(); });
  else {
    // Older browsers: a renewable lease provides the same single-tab behavior.
    const leaseKey = KEY + '.lease', owner = Math.random().toString(36).slice(2);
    try {
      const lease = JSON.parse(localStorage.getItem(leaseKey) || 'null');
      if (lease && Date.now() - lease.time < 15000) blocked();
      else {
        const renew = () => localStorage.setItem(leaseKey, JSON.stringify({ owner, time: Date.now() }));
        renew(); start();
        const leaseTimer = setInterval(() => {
          try { const current = JSON.parse(localStorage.getItem(leaseKey) || 'null'); if (current && current.owner !== owner) { readOnly = true; clearInterval(timer); clearInterval(leaseTimer); blocked(); } else renew(); } catch { /* Saving separately reports storage failures. */ }
        }, 3000);
        window.addEventListener('pagehide', () => { try { const current = JSON.parse(localStorage.getItem(leaseKey) || 'null'); if (current?.owner === owner) localStorage.removeItem(leaseKey); } catch { /* Storage may be disabled. */ } });
      }
    } catch { start(); }
  }
})();
