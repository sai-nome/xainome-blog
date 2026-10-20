/* AI Controler simulation. No network, timers or DOM: the same model runs online and offline. */
(function (root) {
  'use strict';
  const VERSION = 1;
  const MAX_OFFLINE = 8 * 60 * 60;
  const TICK = 0.2;
  const SECTION_KEYS = ['water', 'factory', 'contracts', 'space'];
  const MILESTONE_IDS = ['first-income','gpu-first','gpu-two','research-ai','first-rp','manufacturing','factory-first','chip-first','custom-first','custom-two','custom-four','design-two','design-three','custom-eight','design-four','design-five','rocket-ai','rocket-hull','rocket-fuel','rocket-navigation','launch-ready','launch','click-upgrade','ai-upgrade','code-ai','image-ai','gpu-four','purifier-first','liquid-first','recycler-first','software-first','contract-first'];
  const UPGRADE_LIMIT = 5;
  const UPGRADE_BASE = { click: 150, text: 200, code: 700, research: 1500, image: 2500 };
  const CUSTOM_GPU = [null, { cp: 8, cost: 0 }, { cp: 12, cost: 200 }, { cp: 18, cost: 450 }, { cp: 26, cost: 900 }, { cp: 36, cost: 1600 }];
  const ROCKET_AI = { name: 'Rocket AI', cost: 1200 };
  const AI = {
    text: { name: 'Text AI', job: '文章要約', cp: 20, reward: 20, cost: 0, icon: 'Aa', description: '言葉を、価値に変える。' },
    code: { name: 'Coding AI', job: 'バグ修正', cp: 60, reward: 100, cost: 500, icon: '</>', description: 'コードで、可能性を広げる。' },
    image: { name: 'Image AI', job: 'イラスト制作', cp: 100, reward: 200, cost: 2000, icon: '▨', description: 'アイデアを、かたちにする。' },
    research: { name: 'Research AI', job: '技術研究', cp: 10, reward: 1, cost: 1200, icon: '⌘', description: '今日の研究が、明日をつくる。' }
  };
  const TECH = {
    efficiency: { name: '省電力アーキテクチャ', description: 'GPUの電力消費を25%削減。', cost: 50 },
    hardware: { name: '並列計算の最適化', description: 'すべてのGPUの計算能力が50%アップ。', cost: 100 },
    manufacturing: { name: '半導体製造技術', description: '工場の建設とGPUの自社組立を解放。', cost: 180 }
  };
  const EQUIPMENT = {
    gpu: { name: '購入GPU', icon: '▧', description: '+10 CP/秒 · 電力2 / 冷却2', base: 100, growth: 1.32, limit: 10000 },
    power: { name: '電力設備', icon: 'ϟ', description: '供給 +2 kW · GPU約1基分', base: 90, growth: 1.3, limit: 40000 },
    cooling: { name: '空冷ユニット', icon: '❄', description: '冷却 +2 CU · GPU1基分', base: 80, growth: 1.3, limit: 40000 },
    rack: { name: 'サーバーラック', icon: '▤', description: 'GPU設置枠 +4', base: 800, growth: 1.8, limit: 10000 }
  };
  const ROCKET = {
    navigation: { name: 'AI航行システム', description: '育てたAIを、宇宙を進む頭脳へ。', cash: 60000, rp: 500, chips: 10, water: 0 },
    hull: { name: 'ロケット本体', description: '自社製半導体で、はじめての宇宙船を。', cash: 90000, rp: 0, chips: 30, water: 0 },
    fuel: { name: '推進システム', description: '高純度水から、旅立ちのエネルギーを。', cash: 45000, rp: 0, chips: 0, water: 100 }
  };
  const WATER = {
    purifier: { name: '浄水設備', description: '電力2 kW · 原水2.5 L → 高純度水2 L/秒', base: 350, growth: 1.55, power: 2 },
    liquid: { name: '水冷ユニット', description: '電力1 kW＋水0.5 L/秒 → 冷却12 CU・対象GPU性能＋50%', base: 450, growth: 1.6, power: 1 },
    recycler: { name: '水リサイクル設備', description: '電力1 kW · 使用済み水1.25 L → 水1 L/秒', base: 250, growth: 1.55, power: 1 }
  };
  const CONTRACTS = {
    image: { name: '星間都市のビジュアル制作', ai: 'image', cp: 3000, cash: 7000, power: 4, cooling: 2, chips: 0, rp: 0, water: 0, description: 'Image AIで大型制作。電力と冷却に余裕を。', bonus: '初回：研究ポイント＋100 RP' },
    automation: { name: '半導体工場の自動化', ai: 'code', cp: 2400, cash: 5000, power: 2, cooling: 1, chips: 5, rp: 0, water: 0, description: 'Coding AIと自社製半導体で制御システムを開発。', bonus: '初回：すべての工場の生産能力＋20%' },
    space: { name: '軌道ステーションの設計', ai: 'research', cp: 5000, cash: 8000, power: 3, cooling: 2, chips: 10, rp: 100, water: 50, description: '研究・半導体・水を組み合わせた宇宙開発案件。', bonus: '初回：＋150 RP、ロケット部品の資金コスト20%削減' }
  };
  const DISCOVERY_IDS = [...Object.keys(EQUIPMENT).map(k => 'buy:' + k), ...Object.keys(AI).map(k => 'unlock:' + k), ...Object.keys(TECH).map(k => 'research:' + k), ...Object.keys(ROCKET).map(k => 'rocket:' + k), ...Object.keys(WATER).map(k => 'water:' + k), 'factory', 'assemble', 'supplies', 'rocket-ai', ...Object.keys(UPGRADE_BASE).map(k=>'upgrade:'+k), ...[2, 3, 4, 5].map(level => 'gpu-level:' + level)];
  const number = (n, max = 1e18) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max;
  function create(now = Date.now()) {
    return { version: VERSION, balanceVersion: 2, cash: 0, earned: 0, rp: 0, gpu: 0, customGpu: 0, customGpuLevel: 1, rocketAI: false, power: 0, cooling: 0, rack: 0,
      ai: { text: true, code: false, image: false, research: false },
      weights: { text: 1, code: 0, image: 0, research: 0 },
      progress: { text: 0, code: 0, image: 0, research: 0 },
      tech: { efficiency: false, hardware: false, manufacturing: false },
      factory: 0, factoryOn: true, autoSupply: true, silicon: 0, water: 0, chips: 0,
      milestones: [false, false, false, false, false, false], milestoneIds: [],
      upgrades: { click: 0, text: 0, code: 0, image: 0, research: 0 },
      rocket: { navigation: false, hull: false, fuel: false, launched: false, launchedAt: 0 },
      discoveries: [], sectionOrder: [],
      industry: { codeMode: 'income', softwareLevel: 0, softwareWork: 0, purifier: 0, liquid: 0, recycler: 0, purifierOn: true, liquidOn: true, recyclerOn: true, autoRaw: true, autoWater: true, rawWater: 0, wasteWater: 0 },
      projects: { active: null, weight: 3, image: { work: 0, runs: 0, funded: false }, automation: { work: 0, runs: 0, funded: false }, space: { work: 0, runs: 0, funded: false } },
      fraction: 0, assembled: 0, clicks: 0, completed: 0, played: 0, lastAt: now };
  }
  function validate(raw) {
    if (!raw || raw.version !== VERSION) throw new Error('対応していないセーブデータです。');
    const s = create();
    const oldBalance = raw.balanceVersion === undefined || raw.balanceVersion === 1;
    if (!oldBalance && raw.balanceVersion !== 2) throw new Error('対応していない設備バランスのデータです。');
    for (const key of ['cash', 'earned', 'rp', 'silicon', 'water', 'chips', 'played', 'lastAt']) {
      if (!number(raw[key])) throw new Error('セーブデータの数値が不正です。');
      s[key] = raw[key];
    }
    for (const key of ['gpu', 'power', 'cooling', 'rack', 'factory', 'assembled', 'clicks', 'completed']) {
      const cap = EQUIPMENT[key] ? (oldBalance ? 10000 : EQUIPMENT[key].limit) : key === 'factory' ? 10000 : 1e15;
      if (!number(raw[key], cap) || !Number.isInteger(raw[key])) throw new Error('設備データが不正です。');
      s[key] = raw[key];
    }
    if (raw.customGpu === undefined) {
      // Old gpu counts included assembled units. Split once without losing equipment.
      s.customGpu = Math.min(s.gpu, s.assembled); s.gpu -= s.customGpu;
    } else {
      if (!Number.isInteger(raw.customGpu) || !number(raw.customGpu, 10000) || raw.customGpu > s.assembled) throw new Error('自社GPUの数が不正です。');
      s.customGpu = raw.customGpu;
    }
    if (raw.customGpuLevel !== undefined) {
      if (!Number.isInteger(raw.customGpuLevel) || raw.customGpuLevel < 1 || raw.customGpuLevel > 5) throw new Error('自社GPUのレベルが不正です。');
      s.customGpuLevel = raw.customGpuLevel;
    }
    if (raw.rocketAI !== undefined) {
      if (typeof raw.rocketAI !== 'boolean') throw new Error('ロケットAIのデータが不正です。');
      s.rocketAI = raw.rocketAI;
    }
    // Previously one infrastructure unit supplied 8. Four new units supply
    // the same capacity, so an update never throttles an existing company.
    if (oldBalance) { s.power *= 4; s.cooling *= 4; }
    for (const key of Object.keys(AI)) {
      if (typeof raw.ai?.[key] !== 'boolean' || !Number.isInteger(raw.weights?.[key]) || !number(raw.weights[key], 10) || !number(raw.progress?.[key], AI[key].cp) || raw.progress[key] >= AI[key].cp) throw new Error('AIデータが不正です。');
      s.ai[key] = raw.ai[key]; s.weights[key] = raw.weights[key]; s.progress[key] = raw.progress[key];
      if (!s.ai[key] && s.weights[key] !== 0) throw new Error('未導入のAIに計算能力が割り当てられています。');
    }
    for (const key of Object.keys(TECH)) {
      if (typeof raw.tech?.[key] !== 'boolean') throw new Error('研究データが不正です。');
      s.tech[key] = raw.tech[key];
    }
    for (const key of ['factoryOn', 'autoSupply']) {
      if (typeof raw[key] !== 'boolean') throw new Error('工場データが不正です。');
      s[key] = raw[key];
    }
    if (raw.sectionOrder !== undefined) {
      if (!Array.isArray(raw.sectionOrder) || raw.sectionOrder.length > 5 || raw.sectionOrder.some(key => ![...SECTION_KEYS, 'research'].includes(key)) || new Set(raw.sectionOrder).size !== raw.sectionOrder.length) throw new Error('解放順の記録が不正です。');
      s.sectionOrder = raw.sectionOrder.filter(key => key !== 'research');
    }
    if (raw.milestones !== undefined) {
      if (!Array.isArray(raw.milestones) || raw.milestones.length !== 6 || raw.milestones.some(v => typeof v !== 'boolean')) throw new Error('目標データが不正です。');
      s.milestones = [...raw.milestones];
    }
    if (raw.milestoneIds !== undefined) {
      if (!Array.isArray(raw.milestoneIds) || raw.milestoneIds.length > MILESTONE_IDS.length + 1 || raw.milestoneIds.some(id => ![...MILESTONE_IDS, 'puzzle-first'].includes(id)) || new Set(raw.milestoneIds).size !== raw.milestoneIds.length) throw new Error('マイルストーンの記録が不正です。');
      s.milestoneIds = raw.milestoneIds.filter(id => id !== 'puzzle-first');
    } else if (raw.milestones) {
      ['gpu-first', 'code-ai', 'gpu-four', 'research-ai', 'manufacturing', 'custom-first'].forEach((id,index) => { if (raw.milestones[index]) s.milestoneIds.push(id); });
    }
    // Existing saves start with no paid upgrades. Removed puzzle records are ignored.
    if (raw.upgrades !== undefined) {
      if (!raw.upgrades || typeof raw.upgrades !== 'object' || Array.isArray(raw.upgrades)) throw new Error('強化データが不正です。');
      for (const key of Object.keys(UPGRADE_BASE)) {
        const level = raw.upgrades[key];
        if (!Number.isInteger(level) || !number(level, UPGRADE_LIMIT) || (key !== 'click' && level > 0 && !s.ai[key])) throw new Error('強化レベルが不正です。');
        s.upgrades[key] = level;
      }
    }
    if (raw.fraction !== undefined) {
      if (!number(raw.fraction, TICK) || raw.fraction >= TICK) throw new Error('進行時間のデータが不正です。');
      s.fraction = raw.fraction;
    }
    // Older v1 saves have no space project. Preserve all existing progress.
    if (raw.rocket !== undefined) {
      if (!raw.rocket || !number(raw.rocket.launchedAt)) throw new Error('ロケットのデータが不正です。');
      for (const key of ['navigation', 'hull', 'fuel', 'launched']) {
        if (typeof raw.rocket[key] !== 'boolean') throw new Error('ロケットのデータが不正です。');
        s.rocket[key] = raw.rocket[key];
      }
      s.rocket.launchedAt = raw.rocket.launchedAt;
      if (s.rocket.launched && (!Object.keys(ROCKET).every(k => s.rocket[k]) || !s.rocket.launchedAt)) throw new Error('クリアデータが不正です。');
    }
    if (raw.discoveries !== undefined) {
      if (!Array.isArray(raw.discoveries) || raw.discoveries.length > DISCOVERY_IDS.length || raw.discoveries.some(id => !DISCOVERY_IDS.includes(id)) || new Set(raw.discoveries).size !== raw.discoveries.length) throw new Error('初回獲得の記録が不正です。');
      s.discoveries = [...raw.discoveries];
    } else {
      // Do not replay already-owned items when upgrading an existing save.
      for (const k of Object.keys(EQUIPMENT)) if (s[k] > 0) s.discoveries.push('buy:' + k);
      for (const k of Object.keys(AI)) if (s.ai[k]) s.discoveries.push('unlock:' + k);
      for (const k of Object.keys(TECH)) if (s.tech[k]) s.discoveries.push('research:' + k);
      for (const k of Object.keys(ROCKET)) if (s.rocket[k]) s.discoveries.push('rocket:' + k);
      if (s.factory) s.discoveries.push('factory', 'supplies');
      if (s.assembled) s.discoveries.push('assemble');
      for(const key of Object.keys(UPGRADE_BASE)) if(s.upgrades[key]>0) s.discoveries.push('upgrade:'+key);
    }
    if (raw.industry !== undefined) {
      const v = raw.industry;
      if (!v || !['income', 'optimize'].includes(v.codeMode) || !Number.isInteger(v.softwareLevel) || !number(v.softwareLevel, 5) || !number(v.softwareWork) || v.softwareWork >= 600 * (v.softwareLevel + 1)) throw new Error('工場改善のデータが不正です。');
      for (const k of Object.keys(WATER)) {
        if (!Number.isInteger(v[k]) || !number(v[k], 1000) || typeof v[k + 'On'] !== 'boolean') throw new Error('水設備のデータが不正です。');
        s.industry[k] = v[k]; s.industry[k + 'On'] = v[k + 'On'];
      }
      for (const k of ['rawWater', 'wasteWater']) { if (!number(v[k])) throw new Error('水資源のデータが不正です。'); s.industry[k] = v[k]; }
      for (const k of ['autoRaw', 'autoWater']) { if (typeof v[k] !== 'boolean') throw new Error('水の調達設定が不正です。'); s.industry[k] = v[k]; }
      Object.assign(s.industry, { codeMode: v.codeMode, softwareLevel: v.softwareLevel, softwareWork: v.softwareWork });
      if ((v.codeMode === 'optimize' || v.softwareLevel > 0 || v.softwareWork > 0) && !s.ai.code) throw new Error('工場改善にはCoding AIが必要です。');
    }
    if (raw.projects !== undefined) {
      const p = raw.projects;
      if (!p || (p.active !== null && (typeof p.active !== 'string' || !Object.hasOwn(CONTRACTS, p.active))) || !Number.isInteger(p.weight) || !number(p.weight, 10)) throw new Error('大型案件の設定が不正です。');
      s.projects.active = p.active; s.projects.weight = p.weight;
      for (const [k, job] of Object.entries(CONTRACTS)) {
        const v = p[k];
        if (!v || !number(v.work) || v.work >= job.cp || !Number.isInteger(v.runs) || !number(v.runs, 1e9) || typeof v.funded !== 'boolean' || (!v.funded && v.work !== 0) || ((v.funded || v.runs > 0) && !s.ai[job.ai])) throw new Error('大型案件の進捗が不正です。');
        s.projects[k] = { work: v.work, runs: v.runs, funded: v.funded };
      }
      if (p.active && !s.projects[p.active].funded) throw new Error('未受注の案件が稼働しています。');
    }
    if ((s.customGpuLevel > 1 || s.rocketAI) && (!s.tech.manufacturing || !s.ai.research)) throw new Error('自社GPU・Rocket AIの研究条件が不正です。');
    if (!s.ai.text || totalGpu(s) > slots(s) || (s.customGpu > 0 && !s.tech.manufacturing) || (s.factory > 0 && !s.tech.manufacturing)) throw new Error('設備の構成が不正です。');
    return s;
  }
  function totalGpu(s) { return s.gpu + s.customGpu; }
  function customGpuCP(s) { return CUSTOM_GPU[s.customGpuLevel].cp * (s.tech.hardware ? 1.5 : 1); }
  function customGpuUpgrade(s) { return CUSTOM_GPU[s.customGpuLevel + 1] || null; }
  function slots(s) { return 4 + s.rack * 4; }
  function cost(s, key) { const e = EQUIPMENT[key]; return e ? Math.ceil(e.base * Math.pow(e.growth, s[key])) : Infinity; }
  function factoryMultiplier(s) { return 1 + s.industry.softwareLevel * .1 + (s.projects.automation.runs > 0 ? .2 : 0); }
  function waterTarget(s) {
    const i = s.industry;
    const use = (i.liquidOn ? i.liquid * .5 : 0) + (s.factoryOn ? s.factory * .5 * factoryMultiplier(s) : 0);
    return Math.min(5000, 100 + use * 30);
  }
  function waterProduction(s, powerRatio) {
    const i = s.industry, room = Math.max(0, waterTarget(s) - s.water) / TICK;
    // Use recovered water first; only pay for fresh water to fill the remaining demand.
    const recycled = i.recyclerOn ? Math.min(i.recycler * powerRatio, i.wasteWater / 1.25 / TICK, room) : 0;
    const target = i.purifierOn ? i.purifier * 2 * powerRatio : 0;
    const raw = i.rawWater + (i.autoRaw ? s.cash / .4 : 0);
    const purified = Math.min(target, raw / 1.25 / TICK, Math.max(0, room - recycled));
    return { purified, recycled };
  }
  function rates(s, waterReady = false) {
    const powerCap = 4 + s.power * 2;
    const factoryActive = s.factoryOn ? s.factory : 0;
    const i = s.industry, project = s.projects.active ? CONTRACTS[s.projects.active] : null;
    const projectActive = project && s.projects.weight > 0;
    const plantPower = Object.entries(WATER).reduce((sum, [key, item]) => sum + (i[key + 'On'] ? i[key] * item.power : 0), 0);
    const gpuPower = s.tech.efficiency ? 1.5 : 2;
    const gpuCount = totalGpu(s);
    const demandPower = gpuCount * gpuPower + factoryActive * 4 + plantPower + (projectActive ? project.power : 0);
    const powerRatio = Math.min(1, powerCap / (demandPower || 1));
    const flows = waterProduction(s, powerRatio);
    const liquidNeed = (i.liquidOn ? i.liquid : 0) * .5 * powerRatio;
    const production = waterReady ? 0 : (flows.purified + flows.recycled) * TICK;
    const rawCost = waterReady || !i.autoRaw ? 0 : Math.max(0, flows.purified * TICK * 1.25 - i.rawWater) * .4;
    const available = s.water + production + (i.autoWater ? Math.max(0, s.cash - rawCost) / 2 : 0);
    const liquidFactor = liquidNeed ? Math.min(1, available / (liquidNeed * TICK)) : 0;
    const liquidCooling = (i.liquidOn ? i.liquid : 0) * 12 * powerRatio * liquidFactor;
    const coolingCap = 4 + s.cooling * 2 + liquidCooling;
    const demandCooling = gpuCount * 2 + factoryActive * 2 + (projectActive ? project.cooling : 0);
    const utilization = Math.min(powerRatio, coolingCap / (demandCooling || 1));
    const cooledGPU = Math.min(gpuCount, liquidCooling / 2);
    const purchasedCP = s.gpu * 10 * (s.tech.hardware ? 1.5 : 1), customCP = s.customGpu * customGpuCP(s);
    const baseCP = purchasedCP + customCP;
    const waterBoostCP = s.rocket.launched ? 0 : (gpuCount ? baseCP * cooledGPU / gpuCount : 0) * .5 * utilization;
    const cp = s.rocket.launched ? 0 : baseCP * utilization + waterBoostCP;
    const totalWeight = Object.keys(AI).reduce((sum, k) => sum + (s.ai[k] ? s.weights[k] : 0), 0) + (project ? s.projects.weight : 0);
    const shares = {}, effectiveShares = {}; let income = 0, research = 0;
    for (const [k, a] of Object.entries(AI)) {
      shares[k] = totalWeight && s.ai[k] ? cp * s.weights[k] / totalWeight : 0;
      effectiveShares[k] = shares[k] * aiMultiplier(s, k);
      const reward = effectiveShares[k] / a.cp * a.reward;
      if (k === 'research') research += reward; else if (k !== 'code' || i.codeMode !== 'optimize') income += reward;
    }
    const bottleneck = utilization < 0.999 ? (powerCap / (demandPower || 1) <= coolingCap / (demandCooling || 1) ? 'power' : 'cooling') : null;
    const factoryBonus = factoryMultiplier(s);
    return { powerCap, coolingCap, demandPower, demandCooling, utilization, powerRatio, cp, shares, effectiveShares, totalWeight, income, research, bottleneck, gpuCount, purchasedCP, customCP, cooledGPU, waterBoostCP, liquidFactor, liquidNeed, liquidCooling, waterTarget: waterTarget(s), purified: flows.purified, recycled: flows.recycled, factoryBonus, contractCP: project && totalWeight ? cp * s.projects.weight / totalWeight * aiMultiplier(s, project.ai) : 0, factoryRate: s.rocket.launched ? 0 : factoryActive * .25 * utilization * factoryBonus };
  }
  function earn(s, amount) { s.cash = Math.min(1e18, s.cash + amount); s.earned = Math.min(1e18, s.earned + amount); }
  function upgradeCost(s, key) {
    return Object.hasOwn(UPGRADE_BASE, key) && s.upgrades[key] < UPGRADE_LIMIT ? Math.ceil(UPGRADE_BASE[key] * Math.pow(3, s.upgrades[key])) : Infinity;
  }
  function aiMultiplier(s, key) { return 1 + s.upgrades[key] * .25; }
  function buyUpgrade(s, key) {
    if (s.rocket.launched || !Object.hasOwn(UPGRADE_BASE, key) || (key !== 'click' && !s.ai[key])) return false;
    const price = upgradeCost(s, key);
    if (!Number.isFinite(price) || s.cash < price) return false;
    s.cash -= price; s.upgrades[key]++; return true;
  }
  function manualReward(s) { return (10 + Math.floor(totalGpu(s) / 2) * 5) * (1 + s.upgrades.click); }
  function click(s) { if (s.rocket.launched) return 0; const reward = manualReward(s); earn(s, reward); s.clicks++; return reward; }
  function milestoneGoals(s) {
    const goals = [], add = (id, title, description, value, target, unit, guide, optional = false) => goals.push({ id, title, description, value, target, unit, guide, optional, done: s.milestoneIds.includes(id) || value >= target - 1e-8 });
    add('first-income','最初の報酬','クリックで資金を稼ぐ',s.earned,10,'円','work');
    add('gpu-first','最初の自動化','購入GPUを1基導入する',totalGpu(s),1,'基','buy:gpu');
    add('gpu-two','計算設備を増やそう','GPUを合計2基にする',totalGpu(s),2,'基','buy:gpu');
    add('research-ai','研究チーム発足','Research AIを導入する',+s.ai.research,1,'導入','unlock:research');
    add('first-rp','初めての研究資金','50 RPを集める',Object.values(s.tech).some(Boolean) ? 50 : s.rp,50,'RP','unlock:research');
    add('manufacturing','製造技術を研究','180 RPで半導体製造技術を研究する',+s.tech.manufacturing,1,'研究','research:manufacturing');
    add('factory-first','工場を建設','半導体工場を1つ建設する',s.factory,1,'工場','factory');
    add('chip-first','初めての半導体','原料を調達して半導体を1個生産する',s.assembled > 0 ? 1 : s.chips,1,'個','factory');
    add('custom-first','自社GPUが誕生','半導体5個と¥150で自社GPUを組み立てる',s.customGpu,1,'基','assemble');
    add('custom-two','自社GPUを増産','自社GPUを2基にする',s.customGpu,2,'基','assemble');
    add('custom-four','自社GPUの量産体制','ラック枠を確保して自社GPUを4基にする',s.customGpu,4,'基','assemble');
    add('design-two','自社GPU Lv.2','200 RPで基本性能を12 CP/秒へ強化',s.customGpuLevel,2,'Lv.','gpu-level:2');
    add('design-three','自社GPU Lv.3','450 RPで基本性能を18 CP/秒へ強化',s.customGpuLevel,3,'Lv.','gpu-level:3');
    add('custom-eight','宇宙へ向けた計算設備','自社GPUを8基にする',s.customGpu,8,'基','assemble');
    add('design-four','自社GPU Lv.4','900 RPで基本性能を26 CP/秒へ強化',s.customGpuLevel,4,'Lv.','gpu-level:4');
    add('design-five','最高性能の自社GPU','1,600 RPで自社GPUをLv.5へ強化',s.customGpuLevel,5,'Lv.','gpu-level:5');
    add('rocket-ai','Rocket AIを開発','1,200 RPで航行・打ち上げ専用AIを研究する',+s.rocketAI,1,'研究','rocket-ai');
    add('rocket-hull','ロケット本体を開発','資金と半導体を用意し本体を完成させる',+s.rocket.hull,1,'部品','rocket:hull');
    add('rocket-fuel','推進システムを開発','資金と高純度水を用意し推進システムを完成させる',+s.rocket.fuel,1,'部品','rocket:fuel');
    add('rocket-navigation','AI航行システムを開発','Rocket AI・RP・半導体で航行システムを完成させる',+s.rocket.navigation,1,'部品','rocket:navigation');
    add('launch-ready','打ち上げ準備完了','電力・冷却を整えて打ち上げ条件をすべて満たす',+(s.rocket.launched || canLaunch(s)),1,'準備','launch');
    add('launch','宇宙へ出発','ロケットを打ち上げてエンディングへ',+s.rocket.launched,1,'打ち上げ','launch');
    add('click-upgrade','手動案件を効率化','資金を使ってクリック報酬を1段階強化する',s.upgrades.click,1,'Lv.','upgrade:click',true);
    add('ai-upgrade','AIの処理を高速化','導入済みのAIを資金で1段階強化する',Math.max(...Object.keys(AI).map(k=>s.upgrades[k])),1,'Lv.','upgrade:text',true);
    add('code-ai','Coding AIを導入','コード案件・水プラント・工場改善を解放する',+s.ai.code,1,'導入','unlock:code',true);
    add('image-ai','Image AIを導入','画像案件と大型制作案件を解放する',+s.ai.image,1,'導入','unlock:image',true);
    add('gpu-four','GPUを4基へ','購入・自社GPUを合計4基にする',totalGpu(s),4,'基','buy:gpu',true);
    for (const [key,id,title] of [['purifier','purifier-first','自社の水を用意'],['liquid','liquid-first','水冷でGPUを高速化'],['recycler','recycler-first','水の循環を始めよう']]) add(id,title,WATER[key].name+'を1基建設する',s.industry[key],1,'基','water:'+key,true);
    add('software-first','工場の生産性を改善','制御ソフトをLv.1まで開発する',s.industry.softwareLevel,1,'Lv.','software',true);
    add('contract-first','大型案件を初受注・完了','大型案件を1件完了する',Object.keys(CONTRACTS).reduce((sum,k)=>sum+s.projects[k].runs,0),1,'件','contract:image',true);
    return goals;
  }
  function updateMilestones(s) { const goals = milestoneGoals(s); for (const g of goals) if (g.done && !s.milestoneIds.includes(g.id)) s.milestoneIds.push(g.id); return goals; }
  function buy(s, key) {
    if (s.rocket.launched || !EQUIPMENT[key] || s[key] >= EQUIPMENT[key].limit) return false;
    const price = cost(s, key);
    if (s.cash < price || (key === 'gpu' && totalGpu(s) >= slots(s))) return false;
    s.cash -= price; s[key]++; return true;
  }
  function unlock(s, key) {
    if (s.rocket.launched || !AI[key] || s.ai[key] || s.cash < AI[key].cost) return false;
    s.cash -= AI[key].cost; s.ai[key] = true; s.weights[key] = 1; return true;
  }
  function research(s, key) {
    if (s.rocket.launched || !s.ai.research || !TECH[key] || s.tech[key] || s.rp < TECH[key].cost) return false;
    s.rp -= TECH[key].cost; s.tech[key] = true; return true;
  }
  function factoryCost(s) { return Math.ceil(5000 * Math.pow(1.8, s.factory)); }
  function buildFactory(s) {
    const price = factoryCost(s);
    if (s.rocket.launched || !s.tech.manufacturing || s.cash < price || s.factory >= 10000) return false;
    s.cash -= price; s.factory++; return true;
  }
  function supplies(s) {
    if (s.rocket.launched || !s.factory || s.cash < 90) return false;
    s.cash -= 90; s.silicon += 10; s.water += 20; return true;
  }
  function waterCost(s, key) { return Object.hasOwn(WATER, key) ? Math.ceil(WATER[key].base * Math.pow(WATER[key].growth, s.industry[key])) : Infinity; }
  function buyWaterPlant(s, key) {
    if (s.rocket.launched || !s.ai.code || !Object.hasOwn(WATER, key) || s.industry[key] >= 1000 || s.cash < waterCost(s, key)) return false;
    s.cash -= waterCost(s, key); s.industry[key]++; return true;
  }
  function buyRawWater(s) {
    if (s.rocket.launched || !s.ai.code || s.cash < 40) return false;
    s.cash -= 40; s.industry.rawWater = Math.min(1e18, s.industry.rawWater + 100); return true;
  }
  function softwareCost(s) { return 600 * (s.industry.softwareLevel + 1); }
  function setCodeMode(s, mode) {
    if (s.rocket.launched || !s.ai.code || !['income', 'optimize'].includes(mode) || (mode === 'optimize' && s.industry.softwareLevel >= 5)) return false;
    s.industry.codeMode = mode; return true;
  }
  function contractReason(s, key) {
    if (!Object.hasOwn(CONTRACTS, key)) return '存在しない案件です';
    const job = CONTRACTS[key];
    if (s.rocket.launched) return 'ゲームはクリア済みです';
    if (!s.ai[job.ai]) return AI[job.ai].name + 'を導入すると解放';
    if (key === 'automation' && !s.factory) return '半導体工場を建設すると解放';
    if (key === 'space' && !rocketUnlocked(s)) return '自社GPUを1基組み立てると解放';
    if (s.projects[key].funded) return '';
    if (s.chips + 1e-8 < job.chips) return '受注に半導体' + job.chips + '個が必要';
    if (s.rp < job.rp) return '受注に' + job.rp + ' RPが必要';
    if (s.water + 1e-8 < job.water) return '受注に高純度水' + job.water + ' Lが必要';
    return '';
  }
  function selectContract(s, key) {
    if (s.rocket.launched) return false;
    if (key === null) { s.projects.active = null; return true; }
    if (contractReason(s, key)) return false;
    const job = CONTRACTS[key], p = s.projects[key];
    if (!p.funded) { s.chips = Math.max(0, s.chips - job.chips); s.water = Math.max(0, s.water - job.water); s.rp -= job.rp; p.funded = true; }
    s.projects.active = key; return true;
  }
  function assemble(s) {
    if (s.rocket.launched || !s.tech.manufacturing || s.chips < 5 || s.cash < 150 || totalGpu(s) >= slots(s) || s.customGpu >= 10000) return false;
    s.chips -= 5; s.cash -= 150; s.customGpu++; s.assembled++; return true;
  }
  function upgradeCustomGpu(s) {
    const next = customGpuUpgrade(s);
    if (s.rocket.launched || !s.ai.research || !s.tech.manufacturing || s.customGpu < 1 || !next || s.rp < next.cost) return false;
    s.rp -= next.cost; s.customGpuLevel++; return true;
  }
  function developRocketAI(s) {
    if (s.rocket.launched || !s.ai.research || !s.tech.manufacturing || s.customGpuLevel < 5 || s.rocketAI || s.rp < ROCKET_AI.cost) return false;
    s.rp -= ROCKET_AI.cost; s.rocketAI = true; return true;
  }
  function rocketUnlocked(s) { return s.factory > 0 && s.customGpu > 0; }
  function unlockedFeatures(s) {
    // Structural milestones only: spending resources or pausing must not hide a feature.
    const factory = s.tech.manufacturing || s.factory > 0;
    const space = rocketUnlocked(s) || s.rocket.launched;
    const contracts = {};
    for (const [key, job] of Object.entries(CONTRACTS)) {
      const record = s.projects[key];
      contracts[key] = (s.ai[job.ai] && (key !== 'automation' || s.factory > 0) && (key !== 'space' || space)) || record.funded || record.runs > 0 || record.work > 0;
    }
    return {
      factory, space,
      water: s.ai.code || Object.keys(WATER).some(key => s.industry[key] > 0),
      research: s.ai.research,
      contracts, contractsBoard: Object.values(contracts).some(Boolean)
    };
  }
  function claimDiscovery(s, id) {
    if (!DISCOVERY_IDS.includes(id) || s.discoveries.includes(id)) return false;
    s.discoveries.push(id); return true;
  }
  function revealSections(s) {
    const f = unlockedFeatures(s), available = { ...f, contracts: f.contractsBoard };
    const order = (s.sectionOrder || []).filter(key => available[key]);
    for (const key of SECTION_KEYS) if (available[key] && !order.includes(key)) order.push(key);
    s.sectionOrder = order;
    return [...order];
  }
  function waterImpact(s) {
    const current = rates(s);
    const airOnly = rates({ ...s, industry: { ...s.industry, liquidOn: false } });
    return { cpGain: current.cp - airOnly.cp, incomeGain: current.income - airOnly.income, cpWithout: airOnly.cp, cpWith: current.cp, cooledGPU: current.cooledGPU, waterTarget: current.waterTarget, recoveredPerMinute: current.recycled * 60, recoveredValuePerMinute: current.recycled * 120 };
  }
  function rocketCost(s, key) {
    const part = ROCKET[key];
    return part ? { ...part, cash: Math.ceil(part.cash * (s.projects.space.runs > 0 ? .8 : 1)) } : null;
  }
  function canBuildRocket(s, key) {
    const part = rocketCost(s, key);
    return !!part && !s.rocket.launched && rocketUnlocked(s) && (key !== 'navigation' || s.rocketAI) && !s.rocket[key] && s.cash >= part.cash && s.rp >= part.rp && s.chips + 1e-8 >= part.chips && s.water + 1e-8 >= part.water;
  }
  function buildRocket(s, key) {
    if (!canBuildRocket(s, key)) return false;
    const part = rocketCost(s, key); s.cash -= part.cash; s.rp -= part.rp;
    s.chips = Math.max(0, s.chips - part.chips); s.water = Math.max(0, s.water - part.water); s.rocket[key] = true; return true;
  }
  function launchChecks(s) {
    return [
      { label: '自社工場を建設', done: s.factory > 0 },
      { label: 'Rocket AIを研究・導入', done: s.rocketAI },
      { label: 'Lv.5の自社GPUを8基以上設置', done: s.customGpuLevel === 5 && s.customGpu >= 8 },
      { label: '電力・冷却に余裕を確保（稼働率100%）', done: rates(s).utilization >= 1 - 1e-8 },
      { label: '3つのロケット部品を完成', done: Object.keys(ROCKET).every(k => s.rocket[k]) }
    ];
  }
  function canLaunch(s) { return !s.rocket.launched && launchChecks(s).every(check => check.done); }
  function launch(s, now = Date.now()) {
    if (!canLaunch(s) || !number(now) || now <= 0) return false;
    s.rocket.launched = true; s.rocket.launchedAt = now; s.lastAt = now; return true;
  }
  function step(s, seconds) {
    const i = s.industry;
    let r = rates(s, true);
    // Water production receives electricity even if GPU cooling is limited.
    const flows = waterProduction(s, r.powerRatio);
    const target = flows.purified * seconds;
    if (i.autoRaw) {
      const raw = Math.min(Math.max(0, target * 1.25 - i.rawWater), s.cash / .4);
      s.cash = Math.max(0, s.cash - raw * .4); i.rawWater += raw;
    }
    const purified = Math.min(target, i.rawWater / 1.25);
    i.rawWater = Math.max(0, i.rawWater - purified * 1.25); s.water += purified;
    const recycled = Math.min(flows.recycled * seconds, i.wasteWater / 1.25, Math.max(0, 5000 - s.water));
    i.wasteWater = Math.max(0, i.wasteWater - recycled * 1.25); s.water += recycled;
    r = rates(s, true);
    const coolingWater = r.liquidNeed * r.liquidFactor * seconds;
    if (i.autoWater) {
      const purchased = Math.min(Math.max(0, coolingWater - s.water), s.cash / 2);
      s.cash = Math.max(0, s.cash - purchased * 2); s.water += purchased;
    }
    const used = Math.min(s.water, coolingWater); s.water = Math.max(0, s.water - used); i.wasteWater = Math.min(5000, i.wasteWater + used);
    for (const [k, a] of Object.entries(AI)) {
      if (k === 'code' && i.codeMode === 'optimize') {
        i.softwareWork += r.effectiveShares.code * seconds;
        while (i.softwareLevel < 5 && i.softwareWork + 1e-8 >= softwareCost(s)) { i.softwareWork = Math.max(0, i.softwareWork - softwareCost(s)); i.softwareLevel++; }
        if (i.softwareLevel === 5) { i.softwareWork = 0; i.codeMode = 'income'; }
        continue;
      }
      const work = s.progress[k] + r.effectiveShares[k] * seconds;
      const finished = Math.floor((work + 1e-9) / a.cp);
      s.progress[k] = Math.max(0, work - finished * a.cp);
      if (k === 'research') s.rp = Math.min(1e18, s.rp + finished);
      else { earn(s, finished * a.reward); s.completed += finished; }
    }
    const factoryTarget = r.factoryRate * seconds;
    if (factoryTarget > 0) {
      if (s.autoSupply) {
        const silicon = Math.min(Math.max(0, factoryTarget - s.silicon), s.cash / 5);
        s.cash = Math.max(0, s.cash - silicon * 5); s.silicon += silicon;
        const water = Math.min(Math.max(0, factoryTarget * 2 - s.water), s.cash / 2);
        s.cash = Math.max(0, s.cash - water * 2); s.water += water;
      }
      const produced = Math.min(factoryTarget, s.silicon, s.water / 2);
      s.silicon = Math.max(0, s.silicon - produced); s.water = Math.max(0, s.water - produced * 2); s.chips = Math.min(1e18, s.chips + produced);
      i.wasteWater = Math.min(5000, i.wasteWater + produced * 2);
    }
    if (s.projects.active) {
      const key = s.projects.active, p = s.projects[key], job = CONTRACTS[key];
      p.work += r.contractCP * seconds;
      if (p.work + 1e-8 >= job.cp) {
        const first = p.runs === 0; p.work = 0; p.runs++; p.funded = false; s.projects.active = null; earn(s, job.cash);
        if (first && key === 'image') s.rp = Math.min(1e18, s.rp + 100);
        if (first && key === 'space') s.rp = Math.min(1e18, s.rp + 150);
      }
    }
    s.played += seconds;
  }
  function advance(s, now) {
    if (s.rocket.launched) { s.lastAt = now; return 0; }
    const elapsed = Math.min(MAX_OFFLINE, Math.max(0, (now - s.lastAt) / 1000));
    const total = elapsed + s.fraction;
    const ticks = Math.floor((total + 1e-9) / TICK);
    // Preserve fractional time in the save. Fixed ticks make shortages and
    // purchases identical whether the browser calls us frequently or after 8h.
    for (let i = 0; i < ticks; i++) step(s, TICK);
    s.fraction = Math.max(0, total - ticks * TICK);
    s.lastAt = now;
    return elapsed;
  }
  const api = { VERSION, MAX_OFFLINE, MILESTONE_IDS, CUSTOM_GPU, ROCKET_AI, AI, TECH, EQUIPMENT, ROCKET, WATER, CONTRACTS, create, validate, totalGpu, customGpuCP, customGpuUpgrade, upgradeCustomGpu, developRocketAI, slots, cost, rates, UPGRADE_LIMIT, UPGRADE_BASE, upgradeCost, aiMultiplier, buyUpgrade, manualReward, milestoneGoals, updateMilestones, click, buy, unlock, research, factoryCost, buildFactory, supplies, assemble, waterCost, buyWaterPlant, buyRawWater, softwareCost, setCodeMode, contractReason, selectContract, claimDiscovery, rocketUnlocked, unlockedFeatures, revealSections, waterImpact, rocketCost, canBuildRocket, buildRocket, launchChecks, canLaunch, launch, advance };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AIEmpire = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
