(function () {
  'use strict';
  const T = window.EmpireSkillTree, G = window.EmpireGuide;
  const {width:W,height:H,colStep,rowStep}=T.geometry;
  const point = T.point;
  const labels = { done: '取得済み', ready: '実行可能', waiting: '資源不足', locked: '前提未達' };
  const make = (tag, text, className) => Object.assign(document.createElement(tag), { ...(text ? { textContent: text } : {}), ...(className ? { className } : {}) });
  const $ = id => document.getElementById(id);
  function create(getState, isReadOnly) {
    const dialog = $('skill-tree-dialog'), viewport = $('tree-viewport'), canvas = $('tree-canvas'), scaled = $('tree-scaled-area');
    let selected = 'buy:gpu', tabId = 'purchase', zoom = 1, current = [], visible = [], width = 800, height = 400, dependencyFor = '', dragging = null, shortcut = true;
    const buttons = new Map(); let paths = [];
    try { shortcut = localStorage.getItem('xainome.ai-empire.tree-tab') !== 'off'; } catch { /* Use the requested default. */ }
    $('tree-tab-shortcut').checked = shortcut;
    $('tree-tab-shortcut').addEventListener('change', event => { shortcut = event.target.checked; try { localStorage.setItem('xainome.ai-empire.tree-tab', shortcut ? 'on' : 'off'); } catch { /* Works for this session. */ } });
    const base = T.nodes(getState());
    const svg = $('tree-links'), ns = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(ns,'defs'), marker=document.createElementNS(ns,'marker'), arrow=document.createElementNS(ns,'path');
    marker.id='tree-arrow'; for(const [key,value] of Object.entries({viewBox:'0 0 10 10',refX:'9',refY:'5',markerWidth:'6',markerHeight:'6',orient:'auto'})) marker.setAttribute(key,value);
    arrow.setAttribute('d','M0 0L10 5L0 10Z'); marker.append(arrow); defs.append(marker);
    for(const node of base) {
      const b=make('button',null,'tree-node'); b.type='button'; b.dataset.treeNode=node.id;
      b.append(make('strong',node.title,'tree-node-title'),make('span','','tree-node-cost'),make('span','','tree-node-owned'),make('span','','tree-node-status'),make('span','','tree-node-info'),make('span','','tree-node-warning'));
      $('tree-nodes').append(b); buttons.set(node.id,b);
    }
    function resize() { scaled.style.width=width*zoom+'px'; scaled.style.height=height*zoom+'px'; canvas.style.transform=`scale(${zoom})`; $('tree-zoom-value').textContent=Math.round(zoom*100)+'%'; }
    function arrange() {
      const tab=T.tabs.find(t=>t.id===tabId); $('tree-map-panel').setAttribute('aria-labelledby','tree-tab-'+tabId); visible=T.layout(base,tabId);
      for(const item of T.tabs) { const b=(item.id==='purchase' ? $('tree-tab-purchase') : $('tree-tab-upgrade')); b.setAttribute('aria-selected',String(item.id===tabId)); b.tabIndex=item.id===tabId ? 0 : -1; }
      if(!visible.some(n=>n.id===selected)) selected=visible[0].id;
      width=Math.max(...visible.map(n=>n.col))*colStep+W+64; height=Math.max(...visible.map(n=>n.row))*rowStep+H+120;
      canvas.style.width=width+'px'; canvas.style.height=height+'px'; svg.setAttribute('viewBox',`0 0 ${width} ${height}`); svg.replaceChildren(defs); paths=[];
      canvas.querySelectorAll('.tree-column-title').forEach(h=>h.remove());
      for(const [col,title] of tab.columns.entries()) { const h=make('h3',title,'tree-column-title'); h.style.left=(T.geometry.left+col*colStep)+'px'; canvas.append(h); }
      for(const [nodeId,b] of buttons) b.hidden=!visible.some(n=>n.id===nodeId);
      for(const node of visible) {
        const p=point(node), b=buttons.get(node.id); b.style.left=p.x+'px'; b.style.top=p.y+'px';
        for(const parentId of node.deps) {
          const parent=visible.find(n=>n.id===parentId); if(!parent) continue;
          const path=document.createElementNS(ns,'path');
          const points=T.connector(parent,node,paths.length,visible),d=points.map(([x,y],i)=>(i ? 'L' : 'M')+x+' '+y).join(' ');
          path.setAttribute('d',d); path.setAttribute('marker-end','url(#tree-arrow)'); svg.append(path); paths.push({path,parentId,childId:node.id});
        }
      }
      zoom=1; resize(); viewport.scrollTop=0; viewport.scrollLeft=0;
    }
    function choose(id) { if(!buttons.has(id)) return; selected=id; const next=T.tabFor(id); if(next!==tabId) { tabId=next; arrange(); } }
    function locate(focus=false) { const b=buttons.get(selected); if(!b || b.hidden) return; if(focus)b.focus({preventScroll:true}); b.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'}); }
    function render() {
      if (!dialog.open) return;
      const s = getState(); current = T.nodes(s);
      for (const node of current) {
        const b = buttons.get(node.id); b.className = 'tree-node ' + node.status + (node.id === selected ? ' selected' : '');
        const activation=T.activation(node,isReadOnly());
        b.setAttribute('aria-pressed', String(node.id === selected)); b.setAttribute('aria-label', node.title + (node.owned===undefined ? '' : '、所持数'+node.owned) + '、' + (activation ? node.readyLabel : labels[node.status]) + '、' + node.cost + '、' + (activation ? node.actionLabel + '。クリックまたはEnterで実行。' : node.reason));
        b.classList.toggle('executable',!!activation);
        b.classList.toggle('unavailable',!activation);
        b.disabled=false; // Unavailable nodes remain selectable for their requirements.
        b.setAttribute('aria-disabled',String(!activation));
        b.querySelector('.tree-node-title').textContent=node.title;
        const warning=b.querySelector('.tree-node-warning'); warning.textContent=node.warnings.join('\n'); warning.hidden=!node.warnings.length;
        b.setAttribute('aria-label',b.getAttribute('aria-label')+(node.warnings.length ? '、'+node.warnings.join('、') : ''));
        if(activation) b.dataset.action=activation.action; else delete b.dataset.action;
        if(activation?.key) b.dataset.key=activation.key; else delete b.dataset.key;
        const owned=b.querySelector('.tree-node-owned'); owned.hidden=node.owned===undefined; owned.textContent=node.owned===undefined ? '' : '所持数：'+node.owned;
        b.title=[owned.textContent,node.summary].filter(Boolean).join(' / ');
        b.querySelector('.tree-node-info').textContent=node.summary;
        b.querySelector('.tree-node-cost').textContent = node.cost; b.querySelector('.tree-node-status').textContent = isReadOnly() ? '閲覧のみ' : activation ? node.readyLabel : labels[node.status];
      }
      for (const link of paths) { const a = current.find(n => n.id === link.parentId), b = current.find(n => n.id === link.childId); link.path.setAttribute('class', (a.done && b.done ? 'done' : a.done && b.unlocked ? 'available' : '') + (link.parentId===selected || link.childId===selected ? ' focused' : '')); }
      const node = current.find(n => n.id === selected), info = G.describe(s, node.guide);
      $('tree-detail-title').textContent = node.title; $('tree-detail-status').textContent = isReadOnly() ? '閲覧のみ' : T.activation(node) ? node.readyLabel : labels[node.status]; $('tree-detail-status').className = node.status;
      $('tree-detail-progress').textContent = node.progress; $('tree-detail-cost').textContent = node.cost;
      const requirements = node.requires || [], host = $('tree-detail-requires'); host.replaceChildren(...(requirements.length ? requirements.map(pair => make('li', (pair[0] ? '✓ ' : '○ ') + pair[1])) : [make('li', '前提技術なし。費用と設備の空き枠を確認してください。')]));
      if(dependencyFor!==node.id) { dependencyFor=node.id; const links=node.deps.map(id=>{ const b=make('button',current.find(n=>n.id===id).title+'（'+T.tabs.find(t=>t.id===T.tabFor(id)).title+'）','context-help'); b.type='button'; b.dataset.treeJump=id; return b; }); $('tree-detail-parents').replaceChildren(...(links.length?links:[make('span','前提の項目はありません。')])); }
      $('tree-detail-gain').textContent = info?.gain || ''; $('tree-detail-use').textContent = info ? info.use + ' ' + info.next : '';
      const reason = (isReadOnly() ? '別のタブでプレイ中のため閲覧のみです。' : node.reason) + (node.warnings.length ? ' '+node.warnings.join(' / ') : '');
      if ($('tree-detail-reason').textContent !== reason) $('tree-detail-reason').textContent = reason;
      $('tree-detail-help').dataset.help = node.guide;
      $('tree-progress').textContent = `${T.tabs.find(t=>t.id===tabId).title} · 実行可能 ${current.filter(n=>T.tabFor(n.id)===tabId && T.activation(n,isReadOnly())).length}項目 · 全体 ${current.filter(n=>n.done).length} / ${current.length}取得`;
    }
    function open(id) { if (id && buttons.has(id)) choose(id); if (dialog.open) dialog.close(); dialog.showModal(); render(); requestAnimationFrame(() => locate(true)); }
    function close() { dialog.close(); }
    function toggle() { if (dialog.open && document.activeElement?.closest('dialog') === dialog) close(); else open(); }
    document.addEventListener('keydown', event => {
      const editable = !!event.target.closest?.('textarea, select, [contenteditable]:not([contenteditable="false"]), input:not([type="range"]):not([type="checkbox"])');
      if (shortcut && T.shouldToggle(event, editable)) { event.preventDefault(); toggle(); }
    }, true);
    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-open-tree]'); if (trigger) open(trigger.dataset.openTree || undefined); const jump=event.target.closest('[data-tree-jump]'); if(jump){choose(jump.dataset.treeJump);render();locate(true);}
    });
    $('tree-nodes').addEventListener('click', event => { const b = event.target.closest('[data-tree-node]'); if (b) { selected = b.dataset.treeNode; render(); } });
    $('tree-nodes').addEventListener('keydown', event => { const b = event.target.closest('[data-tree-node]'); if (!b) return; if (!event.key.startsWith('Arrow')) return; const id = T.neighbor(visible, b.dataset.treeNode, event.key); if (id) { event.preventDefault(); selected = id; render(); locate(true); } });
    dialog.querySelectorAll('[data-tree-zoom]').forEach(b => b.addEventListener('click', () => { zoom = Math.max(.6, Math.min(1.25, zoom + Number(b.dataset.treeZoom) / 100)); resize(); locate(); }));
    $('tree-nodes').addEventListener('focusin', event => { const b=event.target.closest('[data-tree-node]'); if(b && selected!==b.dataset.treeNode) { choose(b.dataset.treeNode); render(); } });
    function switchTab(id) { if(id===tabId) return; tabId=id; arrange(); render(); locate(true); }
    for(const [index,tab] of T.tabs.entries()) {
      const button=(tab.id==='purchase' ? $('tree-tab-purchase') : $('tree-tab-upgrade'));
      button.addEventListener('click',()=>switchTab(tab.id));
      button.addEventListener('keydown',event=>{ if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; event.preventDefault(); const next=event.key==='Home' ? 0 : event.key==='End' ? T.tabs.length-1 : (index+(event.key==='ArrowRight' ? 1 : -1)+T.tabs.length)%T.tabs.length; switchTab(T.tabs[next].id); (next===0 ? $('tree-tab-purchase') : $('tree-tab-upgrade')).focus(); });
    }
    $('tree-locate').onclick = () => locate(true);
    viewport.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button')) return; dragging = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop }; viewport.setPointerCapture(event.pointerId); viewport.classList.add('dragging'); });
    viewport.addEventListener('pointermove', event => { if (dragging) { viewport.scrollLeft = dragging.left - (event.clientX - dragging.x); viewport.scrollTop = dragging.top - (event.clientY - dragging.y); } });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) viewport.addEventListener(type, () => { dragging = null; viewport.classList.remove('dragging'); });
    arrange();
    return { open, close, render };
  }
  window.EmpireSkillTreeUI = { create };
})();
