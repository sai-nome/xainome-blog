/* Unlock graph and action availability. Uses the same engine as the game. */
(function (root) {
  'use strict';
  const E = root.AIEmpire || (typeof module === 'object' && module.exports ? require('./engine.js') : null);
  const n = value => new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(value);
  function nodes(s) {
    const result = [], stopped = s.rocket.launched;
    const add = (id, title, col, row, deps, v) => {
      const missing = (v.requires || []).filter(pair => !pair[0]).map(pair => pair[1]);
      const unlocked = missing.length === 0, affordable = v.affordable !== false;
      const done = !!v.done, canExecute = !!v.action && unlocked && affordable && (!done || !!v.repeat) && !stopped;
      result.push({ id, title, col, row, deps, guide: v.guide || id, cost: v.cost || '自動解放', progress: v.progress || '', ...v, done, unlocked, affordable, canExecute,
        status: done ? 'done' : !unlocked ? 'locked' : affordable ? 'ready' : 'waiting',
        reason: stopped ? 'クリア済み：記録を閲覧できます。' : missing.length ? missing.join(' / ') : done && !v.repeat ? '取得・研究済みです。' : !affordable ? v.shortage || '必要な資源を集めてください。' : v.action ? '実行できます。' : '条件を満たすと自動で解放されます。' });
    };
    for (const [row, key] of Object.keys(E.AI).sort((a,b)=>E.AI[a].cost-E.AI[b].cost).entries()) {
      const a = E.AI[key];
      add('unlock:' + key, a.name, 1, row, [], { done: s.ai[key], affordable: s.cash >= a.cost, cost: '¥' + n(a.cost), action: 'unlock', key, actionLabel: 'AIを導入する', progress: s.ai[key] ? '導入済み' : '新しい仕事を担当' });
    }
    for (const [key, row] of [['gpu', 0], ['power', 1], ['cooling', 2], ['rack', 3]]) {
      const e = E.EQUIPMENT[key], full = key === 'gpu' && E.totalGpu(s) >= E.slots(s);
      add('buy:' + key, e.name, 0, row, [], { done: s[key] > 0, repeat: true, affordable: s.cash >= E.cost(s, key) && !full && s[key] < e.limit, shortage: full ? '購入GPU・自社GPU共通のラック枠を増やしてください。' : s[key] >= e.limit ? '設備の上限です。' : '資金が不足しています。', cost: '¥' + n(E.cost(s, key)), progress: n(s[key]) + '基', action: 'buy', key, actionLabel: '購入・増設する' });
    }
    for (const [key, row] of [['efficiency', 0], ['hardware', 1], ['manufacturing', 2]]) {
      const t = E.TECH[key];
      add('research:' + key, t.name, 3, row, ['unlock:research'], { done: s.tech[key], requires: [[s.ai.research, 'Research AIの導入']], affordable: s.rp >= t.cost, cost: n(t.cost) + ' RP', action: 'research', key, actionLabel: '技術を研究する' });
    }
    for (const [key, row] of [['purifier', 6], ['liquid', 7], ['recycler', 8]]) {
      add('water:' + key, E.WATER[key].name, 3, row, ['unlock:code'], { done: s.industry[key] > 0, repeat: true, requires: [[s.ai.code, 'Coding AIの導入']], affordable: s.cash >= E.waterCost(s, key) && s.industry[key] < 1000, cost: '¥' + n(E.waterCost(s, key)), progress: n(s.industry[key]) + '基', action: 'water-plant', key, actionLabel: '建設・増設する' });
    }
    add('factory', '半導体工場', 4, 2, ['research:manufacturing'], { done: s.factory > 0, repeat: true, requires: [[s.tech.manufacturing, '半導体製造技術の研究']], affordable: s.cash >= E.factoryCost(s) && s.factory < 10000, cost: '¥' + n(E.factoryCost(s)), progress: n(s.factory) + '工場', action: 'factory', actionLabel: '工場を建設する' });
    add('assemble', '自社GPUを組み立てる', 4, 3, ['research:manufacturing'], { done: s.customGpu > 0, repeat: true, requires: [[s.tech.manufacturing, '半導体製造技術の研究']], affordable: s.chips >= 5 && s.cash >= 150 && E.totalGpu(s) < E.slots(s) && s.customGpu < 10000, cost: '半導体5個 ＋ ¥150', progress: n(s.customGpu) + '基 / Lv.' + s.customGpuLevel, shortage: E.totalGpu(s) >= E.slots(s) ? '共通のラック枠が不足しています。' : '半導体5個と¥150が必要です。工場で原料を半導体に加工します。', action: 'assemble', actionLabel: '自社GPUを組み立てる' });
    add('software', '工場制御ソフト', 4, 6, ['unlock:code'], { done: s.industry.softwareLevel === 5, requires: [[s.ai.code, 'Coding AIの導入']], affordable: s.industry.codeMode !== 'optimize', shortage: 'Coding AIが開発中です。ワークスペースの優先度で速度を調整できます。', cost: n(E.softwareCost(s)) + ' CPで次のLv.', progress: 'Lv.' + s.industry.softwareLevel + ' / 5', action: 'software-mode', actionLabel: 'Coding AIを工場改善へ回す' });
    for (let level = 2; level <= 5; level++) {
      add('gpu-level:' + level, '自社GPU Lv.' + level, 5, level - 2, level === 2 ? ['assemble'] : ['gpu-level:' + (level - 1)], { done: s.customGpuLevel >= level, requires: [[s.ai.research, 'Research AIの導入'], [s.tech.manufacturing, '半導体製造技術の研究'], [s.customGpu > 0, '自社GPUの初回組立'], [s.customGpuLevel >= level - 1, '自社GPU Lv.' + (level - 1) + 'の研究']], affordable: s.rp >= E.CUSTOM_GPU[level].cost, cost: n(E.CUSTOM_GPU[level].cost) + ' RP', progress: '基本 ' + E.CUSTOM_GPU[level].cp + ' CP/秒・基', action: 'gpu-upgrade', actionLabel: 'Lv.' + level + 'へ設計を強化する' });
    }
    add('rocket-ai', 'Rocket AI', 6, 3, ['gpu-level:5'], { done: s.rocketAI, requires: [[s.ai.research, 'Research AIの導入'], [s.tech.manufacturing, '半導体製造技術の研究'], [s.customGpuLevel >= 5, '自社GPU Lv.5の研究']], affordable: s.rp >= E.ROCKET_AI.cost, cost: n(E.ROCKET_AI.cost) + ' RP', action: 'rocket-ai', actionLabel: 'Rocket AIを研究・導入する' });
    for (const [key, col, row, deps] of [['image', 3, 9, ['unlock:image']], ['automation', 4, 7, ['unlock:code', 'factory']]]) {
      const c = E.CONTRACTS[key], reason = E.contractReason(s, key), unlocked = s.ai[c.ai] && (key !== 'automation' || s.factory > 0) && (key !== 'space' || E.rocketUnlocked(s));
      add('contract:' + key, c.name, col, row, deps, { done: s.projects[key].runs > 0, repeat: true, requires: [[unlocked, key === 'space' ? 'Research AI・工場・自社GPUの初回組立' : key === 'automation' ? 'Coding AI・工場の建設' : 'Image AIの導入']], affordable: !reason && s.projects.active !== key, shortage: s.projects.active === key ? '進行中です。案件ボードで計算配分・停止を調整できます。' : reason, cost: s.projects[key].funded ? '材料支払済み・続きから' : [c.chips ? '半導体' + c.chips + '個' : '', c.rp ? c.rp + ' RP' : '', c.water ? '水' + c.water + ' L' : ''].filter(Boolean).join(' / ') || '受注材料なし', progress: '完了' + s.projects[key].runs + '回 / 報酬¥' + n(c.cash), action: 'contract', key, actionLabel: s.projects[key].funded ? '案件を再開する' : '案件を受注する' });
    }
    for (const [key, col, row] of [['navigation', 7, 3], ['hull', 6, 5], ['fuel', 6, 6]]) {
      const p = E.rocketCost(s, key);
      add('rocket:' + key, p.name, col, row, key === 'navigation' ? ['factory', 'assemble', 'rocket-ai'] : ['factory', 'assemble'], { done: s.rocket[key], requires: [[E.rocketUnlocked(s), '工場・自社GPUの初回組立'], [key !== 'navigation' || s.rocketAI, 'Rocket AIの研究・導入']], affordable: E.canBuildRocket(s, key), cost: ['¥' + n(p.cash), p.rp ? p.rp + ' RP' : '', p.chips ? '半導体' + p.chips + '個' : '', p.water ? '水' + p.water + ' L' : ''].filter(Boolean).join(' / '), action: 'rocket', key, actionLabel: 'ロケット部品を開発する' });
    }
    add('launch', 'ロケット打ち上げ', 7, 6, ['rocket:navigation', 'rocket:hull', 'rocket:fuel', 'gpu-level:5'], { done: s.rocket.launched, requires: E.launchChecks(s).map(c => [c.done, c.label]), affordable: E.canLaunch(s), cost: '準備完了でエンディングへ', action: 'tree-launch', actionLabel: '打ち上げの確認へ' });
    const upgradeKeys = [...Object.keys(E.AI).sort((a,b)=>E.AI[a].cost-E.AI[b].cost), 'click'];
    upgradeKeys.forEach((key, index) => {
      const level=s.upgrades[key], max=level>=E.UPGRADE_LIMIT, manual=key==='click', row=manual ? 5 : index;
      const before=manual ? E.manualReward(s) : E.aiMultiplier(s,key)*100;
      const after=manual ? before/(1+level)*(2+level) : before+25;
      add('upgrade:'+key, (manual ? 'クリック報酬' : E.AI[key].name)+' 強化 Lv.'+level, 2, row, manual ? [] : ['unlock:'+key], {
        guide:'upgrade:'+key, done:max, repeat:true,
        requires:manual ? [] : [[s.ai[key],E.AI[key].name+'の導入']], affordable:!max && s.cash>=E.upgradeCost(s,key),
        shortage:max ? '最高レベルです。' : '資金が不足しています。',
        cost:max ? '最高レベル' : '¥'+n(E.upgradeCost(s,key)),
        progress:'Lv.'+level+' / '+E.UPGRADE_LIMIT+' · '+(manual ? '1クリック ¥'+n(before) : '処理速度 '+n(before)+'%')+(max ? '' : ' → '+(manual ? '¥' : '')+n(after)+(manual ? '' : '%')),
        action:'upgrade', key, actionLabel:manual ? 'クリック報酬を強化する' : 'AIの処理速度を強化する'
      });
    });
    add('supplies','工場の原料セット',0,10,['factory'],{done:false,repeat:true,requires:[[s.factory>0,'工場の建設']],affordable:s.cash>=90,cost:'¥90',progress:'シリコン10個・高純度水20 L',action:'supplies',actionLabel:'原料セットを購入する'});
    for(const [key,row,price,title] of [['water-raw',11,40,'原水100 L']]) {
      add(key,title,0,row,['unlock:code'],{done:false,repeat:true,requires:[[s.ai.code,'Coding AIの導入']],affordable:s.cash>=price,cost:'¥'+price,progress:'現在 '+n(s.industry.rawWater)+' L',action:key,actionLabel:'水を購入する'});
    }
    const r=E.rates(s), shortagePower=Math.max(0,r.demandPower-r.powerCap), shortageCooling=Math.max(0,r.demandCooling-r.coolingCap);
    for(const node of result) {
      const usesCompute=node.id.startsWith('unlock:') || node.id.startsWith('contract:') || (node.id.startsWith('upgrade:') && node.key!=='click') || ['buy:gpu','assemble','software','launch'].includes(node.id);
      const usesPower=usesCompute || ['buy:power','research:efficiency','factory'].includes(node.id) || node.id.startsWith('water:');
      const usesCooling=usesCompute || ['buy:cooling','water:liquid','factory'].includes(node.id);
      node.readyLabel=['buy','unlock','factory','assemble','water-plant','supplies','water-raw'].includes(node.action) ? '購入可' : node.action==='contract' ? '受注可' : node.action==='tree-launch' ? '打ち上げ可' : '強化可';
      if(node.action==='buy') node.owned=n(s[node.key])+'基';
      else if(node.action==='unlock') node.owned=(s.ai[node.key] ? '1体（導入済み）' : '0体（未導入）');
      else if(node.action==='water-plant') node.owned=n(s.industry[node.key])+'基';
      else if(node.id==='factory') node.owned=n(s.factory)+'工場';
      else if(node.id==='assemble') node.owned=n(s.customGpu)+'基 · 設計Lv.'+s.customGpuLevel;
      else if(node.id==='supplies') node.owned='シリコン '+n(s.silicon)+'個 / 高純度水 '+n(s.water)+' L';
      else if(node.id==='water-raw') node.owned=n(s.industry.rawWater)+' L';
      node.summary=[node.owned && node.id!=='supplies' ? '' : node.progress,node.canExecute ? node.actionLabel : node.reason].filter(Boolean).join(' / ');
      node.warnings=[];
      if(['buy:gpu','assemble'].includes(node.id) && E.totalGpu(s)>=E.slots(s)) node.warnings.push('⚠ サーバーラック不足');
      if(!stopped && shortagePower>1e-8 && usesPower) node.warnings.push('⚠ 電力不足 '+n(shortagePower)+' kW');
      if(!stopped && shortageCooling>1e-8 && usesCooling) node.warnings.push('⚠ 冷却不足 '+n(shortageCooling)+' CU');
    }
    return result;
  }
  const tabs = [
    {id:'purchase',title:'購入',columns:['基本設備','AI（導入費の安い順）','水・冷却設備','工場・自社GPU','原料・水の補充'],positions:[['buy:gpu',0,0],['buy:power',0,1],['buy:cooling',0,2],['buy:rack',0,3],['unlock:text',1,0],['unlock:code',1,1],['unlock:research',1,2],['unlock:image',1,3],['water:purifier',2,0],['water:liquid',2,1],['water:recycler',2,2],['factory',3,0],['assemble',3,1],['supplies',4,0],['water-raw',4,1]]},
    {id:'upgrade',title:'強化',columns:['クリック・AI強化','技術研究','自社GPU設計','工場改善・大型案件','宇宙開発','ロケット完成'],positions:[['upgrade:click',0,0],['upgrade:text',0,1],['upgrade:code',0,2],['upgrade:research',0,3],['upgrade:image',0,4],['research:efficiency',1,0],['research:hardware',1,1],['research:manufacturing',1,2],['gpu-level:2',2,0],['gpu-level:3',2,1],['gpu-level:4',2,2],['gpu-level:5',2,3],['software',3,0],['contract:automation',3,1],['contract:image',3,2],['rocket:navigation',4,4],['rocket:hull',4,0],['rocket:fuel',4,1],['rocket-ai',2,4],['launch',5,4]]}
  ];
  function tabFor(id) { return tabs.find(t=>t.positions.some(p=>p[0]===id))?.id; }
  function layout(list,tabId) { return tabs.find(t=>t.id===tabId).positions.map(([id,col,row])=>({...list.find(n=>n.id===id),col,row})); }
  const geometry={width:252,height:264,colStep:324,rowStep:336,left:32,top:94};
  function point(node) { return {x:geometry.left+node.col*geometry.colStep,y:geometry.top+node.row*geometry.rowStep}; }
  function connector(parent,node,index=0,list=[]) {
    const a=point(parent),p=point(node),w=geometry.width,h=geometry.height,lane=24+(index%3)*8;
    if(parent.row===node.row && node.col>parent.col && !list.some(card=>card.row===node.row && card.col>parent.col && card.col<node.col)) return [[a.x+w,a.y+h/2],[p.x-4,p.y+h/2]];
    if(parent.col===node.col) {
      if(node.row===parent.row+1) return [[a.x+w/2,a.y+h],[p.x+w/2,p.y-4]];
      return [[a.x,a.y+h/2],[a.x-lane,a.y+h/2],[a.x-lane,p.y+h/2],[p.x-4,p.y+h/2]];
    }
    if(node.col===parent.col+1) {
      const x=a.x+w+(geometry.colStep-w)/2;
      return [[a.x+w,a.y+h/2],[x,a.y+h/2],[x,p.y+h/2],[p.x-4,p.y+h/2]];
    }
    return [[a.x+w,a.y+h/2],[a.x+w+lane,a.y+h/2],[a.x+w+lane,p.y-lane],[p.x-20,p.y-lane],[p.x-20,p.y+h/2],[p.x-4,p.y+h/2]];
  }
  function activation(node, readOnly = false) {
    return node?.canExecute && !readOnly ? { action: node.action, ...(node.key ? { key: node.key } : {}) } : null;
  }
  function neighbor(list, id, key) {
    const a = list.find(node => node.id === id); if (!a) return null;
    const vertical = key === 'ArrowUp' || key === 'ArrowDown', direction = key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 1;
    const candidates = list.filter(b => b.id !== id && (vertical ? b.row - a.row : b.col - a.col) * direction > 0);
    candidates.sort((b, c) => { const score = n => vertical ? Math.abs(n.row - a.row) * 3 + Math.abs(n.col - a.col) * 5 : Math.abs(n.col - a.col) * 5 + Math.abs(n.row - a.row) * 2; return score(b) - score(c); });
    return candidates[0]?.id || null;
  }
  function shouldToggle(event, editable = false) { return event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !event.repeat && !event.isComposing && !event.defaultPrevented && !editable; }
  const api = { nodes, tabs, tabFor, layout, geometry, point, connector, activation, neighbor, shouldToggle };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EmpireSkillTree = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
