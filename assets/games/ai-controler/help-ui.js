(function () {
  'use strict';
  const G = window.EmpireGuide, E = window.AIEmpire;
  const make = (tag, text, className) => Object.assign(document.createElement(tag), { ...(text ? { textContent: text } : {}), ...(className ? { className } : {}) });
  function create(getState) {
    const INTRO_KEY = 'xainome.ai-empire.controls.v3';
    let introMode = false, memorySeen = false;
    const dialog = document.getElementById('help-dialog'), search = document.getElementById('help-search'), content = document.getElementById('help-topics');
    function button(id, caption = '？ 効果・使い道') {
      const b = make('button', caption, 'context-help'); b.type = 'button'; b.dataset.help = id;
      const topic = G.topics.find(t => t.id === id); b.setAttribute('aria-label', (topic?.title || 'この項目') + 'のヘルプを開く'); return b;
    }
    function explain(container, id, compact = false) {
      const info = G.describe(getState(), id); container.replaceChildren(); if (!info) return;
      const list = make('dl', null, 'effect-description');
      for (const [label, key] of [['得られるもの・変わること', 'gain'], ['できるようになること', 'use'], ['消費・稼働条件', 'cost'], ['次の操作', 'next']]) {
        const row = make('div'); row.append(make('dt', label), make('dd', info[key])); list.append(row);
      }
      if (info.current) container.append(make('p', info.current, 'effect-current'));
      if (compact) {
        const details = make('details', null, 'effect-more'); details.append(make('summary', '使い道・消費・次の操作を見る'), list); container.append(details);
      } else container.append(list);
    }
    function filter() {
      const query = search.value.trim().toLocaleLowerCase(); let total = 0;
      for (const section of content.children) {
        let visible = 0;
        for (const detail of section.querySelectorAll('.help-topic')) {
          detail.hidden = !!query && !detail.textContent.toLocaleLowerCase().includes(query) && !detail.dataset.group.toLocaleLowerCase().includes(query);
          if (!detail.hidden) { visible++; if (query) detail.open = true; }
        }
        section.hidden = visible === 0; total += visible;
      }
      document.getElementById('help-count').textContent = total ? `${total}項目のヘルプ` : '一致する項目がありません。GPU・半導体・水・制御ソフトなどで検索できます。';
    }
    function populate() {
      content.replaceChildren();
      for (const group of [...new Set(G.topics.map(t => t.group))]) {
        const section = make('section', null, 'help-category'); section.append(make('h3', group));
        for (const topic of G.topics.filter(t => t.group === group)) {
          const detail = make('details', null, 'help-topic'); detail.dataset.topic = topic.id; detail.dataset.group = group;
          const body = make('div', null, 'help-topic-body'); explain(body, topic.id);
          detail.append(make('summary', topic.title), body); section.append(detail);
        }
        content.append(section);
      }
      filter();
    }
    function markIntroSeen() { memorySeen = true; try { localStorage.setItem(INTRO_KEY, 'seen'); } catch { /* Keep this session usable. */ } }
    function needsIntro() { try { return !memorySeen && localStorage.getItem(INTRO_KEY) !== 'seen'; } catch { return !memorySeen; } }
    function raiseDialog() { if (dialog.open) { if (introMode) markIntroSeen(); introMode = false; dialog.close(); } dialog.showModal(); }
    function intro() { search.value = ''; populate(); raiseDialog(); introMode = true; dialog.scrollTop = 0; document.getElementById('help-controls-title').focus({ preventScroll: true }); }
    function open(id = 'work') {
      search.value = ''; populate();
      raiseDialog(); introMode = false;
      const topic = [...content.querySelectorAll('.help-topic')].find(node => node.dataset.topic === id);
      if (topic) { topic.open = true; topic.querySelector('summary').focus(); topic.scrollIntoView({ block: 'nearest' }); }
    }
    const attach = (host, id) => { if (host) host.append(button(id)); };
    function decorate() {
      for (const key of Object.keys(E.AI)) attach(document.querySelector(`#ai-${key} .ai-name`), 'unlock:' + key);
      for (const key of Object.keys(E.WATER)) attach(document.getElementById('water-buy-' + key).closest('article').querySelector('h3'), 'water:' + key);
      for (const key of Object.keys(E.CONTRACTS)) attach(document.querySelector(`#contract-${key} h3`), 'contract:' + key);
      for (const key of Object.keys(E.ROCKET)) attach(document.getElementById('rocket-build-' + key).closest('article').querySelector('h3'), 'rocket:' + key);
      for (const [selector, id] of [['.ai-panel .panel-heading', 'compute'], ['.factory-panel .panel-heading', 'factory'], ['#code-specialization .industry-title', 'software'], ['.water-panel .panel-heading', 'resource:water'], ['.contracts-panel .panel-heading', 'contract-pause'], ['.space-project .panel-heading', 'launch']]) attach(document.querySelector(selector), id);
      for (const [id, topic] of [['money', 'resource:cash'], ['compute', 'compute'], ['power-use', 'buy:power'], ['cooling-use', 'buy:cooling'], ['research-points', 'resource:rp']]) attach(document.getElementById(id).closest('.resource').querySelector('.resource-label'), topic);
      for (const [id, topic] of [['silicon-amount', 'resource:silicon'], ['water-amount', 'resource:water'], ['chip-amount', 'resource:chips'], ['raw-water-stock', 'resource:rawWater'], ['pure-water-stock', 'resource:water'], ['waste-water-stock', 'resource:wasteWater']]) attach(document.getElementById(id).parentElement, topic);
      for (const [id, topic] of [['assemble-gpu', 'assemble'], ['buy-supplies', 'supplies'], ['buy-raw-water', 'water-raw']]) document.getElementById(id).after(button(topic));
      for (const [id, topic] of [['factory-on', 'factory'], ['auto-supply', 'autoSupply'], ['auto-raw-water', 'autoRaw'], ['auto-cooling-water', 'autoWater']]) {
        const label = document.getElementById(id).closest('label'), wrap = make('div', null, 'toggle-help-row'); label.replaceWith(wrap); wrap.append(label, button(topic, '？'));
      }
    }
    search.addEventListener('input', filter);
    document.addEventListener('click', event => { const trigger = event.target.closest('[data-help]'); if (trigger) { event.preventDefault(); open(trigger.dataset.help); } });
    document.querySelectorAll('[data-help-category]').forEach(b => b.addEventListener('click', () => { search.value = b.dataset.helpCategory; populate(); const first = content.querySelector('.help-category:not([hidden])'); first?.scrollIntoView({ block: 'nearest' }); }));
    document.getElementById('help-all').onclick = () => { search.value = ''; populate(); search.focus(); };
    document.getElementById('help-show-controls').onclick = intro;
    dialog.addEventListener('close', () => { if (introMode) { markIntroSeen(); introMode = false; } });
    decorate();
    return { open, explain, intro, needsIntro };
  }
  window.EmpireHelp = { create };
})();
