// Small DOM substitute for exercising the real tree renderer without a browser.
const fs = require('node:fs');
const vm = require('node:vm');
const T = require('../../assets/games/ai-controler/skill-tree.js');
const G = require('../../assets/games/ai-controler/guide.js');

class Element {
  constructor(document) {
    this.document = document; this.children = []; this.dataset = {}; this.style = {};
    this.attributes = {}; this.listeners = {}; this.className = ''; this.textContent = ''; this.open = false;
    this.classList = { toggle: (name, on) => {
      const classes = new Set(this.className.split(' ').filter(Boolean));
      if (on) classes.add(name); else classes.delete(name);
      this.className = [...classes].join(' ');
    }, add: name => this.classList.toggle(name, true), remove: name => this.classList.toggle(name, false) };
  }
  append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(e => e !== this); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  querySelectorAll(selector) {
    const all = this.children.flatMap(child => [child, ...child.querySelectorAll(selector)]);
    return all.filter(child => selector.startsWith('.') && child.className.split(' ').includes(selector.slice(1)));
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  emit(type, data = {}) { for (const listener of this.listeners[type] || []) listener({ target: this, ...data }); }
  focus() { this.document.activeElement = this; }
  scrollIntoView() {}
  showModal() { this.open = true; }
  close() { this.open = false; this.emit('close'); }
}

function treeHarness(getState, isReadOnly = () => false) {
  const source = fs.readFileSync(require.resolve('../../assets/games/ai-controler/skill-tree-ui.js'), 'utf8');
  const ids = new Map();
  const document = {
    getElementById: id => ids.get(id), createElement: () => new Element(document),
    createElementNS: () => new Element(document), addEventListener() {}
  };
  for (const [, id] of source.matchAll(/\$\('([^']+)'\)/g)) ids.set(id, new Element(document));
  const window = { EmpireSkillTree: T, EmpireGuide: G };
  vm.runInNewContext(source, { window, document, localStorage: { getItem() {}, setItem() {} }, requestAnimationFrame: fn => fn() });
  const ui = window.EmpireSkillTreeUI.create(getState, isReadOnly);
  return { ui, get: id => ids.get(id), node: id => ids.get('tree-nodes').children.find(b => b.dataset.treeNode === id) };
}

module.exports = { Element, treeHarness };
