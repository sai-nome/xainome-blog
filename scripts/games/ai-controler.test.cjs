const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/games/ai-controler/engine.js');
const fresh = () => E.create(0);
const rich = () => Object.assign(fresh(), { cash: 100000, earned: 100000 });
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('ten manual jobs pay for the first GPU, then work completes automatically', () => {
  const s = fresh(); assert.equal(E.buy(s, 'gpu'), false);
  for (let i = 0; i < 10; i++) E.click(s);
  assert.equal(s.cash, 100); assert.equal(E.buy(s, 'gpu'), true); assert.equal(s.cash, 0);
  E.advance(s, 1000); assert.equal(s.cash, 0); assert.equal(s.progress.text, 10);
  E.advance(s, 2000); assert.equal(s.cash, 20); assert.equal(s.completed, 1);
});
test('AI unlocks jobs without creating GPUs or compute', () => {
  const s = rich(); assert.equal(E.unlock(s, 'code'), true);
  assert.equal(s.gpu, 0); assert.equal(E.rates(s).income, 0); assert.equal(E.unlock(s, 'code'), false);
});
test('power and cooling shortages scale output, and each upgrade resolves its own limit', () => {
  const s = rich(); s.gpu = 4;
  near(E.rates(s).cp, 20); assert.equal(E.rates(s).bottleneck, 'power');
  E.buy(s, 'power'); assert.equal(E.rates(s).bottleneck, 'cooling'); near(E.rates(s).cp, 20);
  E.buy(s, 'cooling'); near(E.rates(s).cp, 30);
  E.buy(s, 'power'); E.buy(s, 'cooling'); near(E.rates(s).cp, 40); near(E.rates(s).utilization, 1);
});
test('GPU installation cannot exceed server slots; rack expansion unlocks more', () => {
  const s = rich(); s.gpu = 4; const cash = s.cash;
  assert.equal(E.buy(s, 'gpu'), false); assert.equal(s.cash, cash);
  assert.equal(E.buy(s, 'rack'), true); assert.equal(E.slots(s), 8); assert.equal(E.buy(s, 'gpu'), true);
});
test('GPU cost scales without changing the next upgrade on a failed purchase', () => {
  const s = fresh(); s.cash = 100; assert.equal(E.buy(s, 'gpu'), true);
  assert.equal(E.cost(s, 'gpu'), 132); assert.equal(E.buy(s, 'gpu'), false); assert.equal(E.cost(s, 'gpu'), 132);
});
test('priority weights share one compute pool and zero priority pauses a job', () => {
  const s = rich(); s.gpu = 2; E.unlock(s, 'code'); s.weights.text = 2; s.weights.code = 1;
  const r = E.rates(s); near(r.shares.text, 40 / 3); near(r.shares.code, 20 / 3);
  near(Object.values(r.shares).reduce((a, b) => a + b, 0), r.cp);
  s.weights.text = 0; near(E.rates(s).shares.code, 20); E.advance(s, 3000);
  assert.equal(s.progress.text, 0); assert.equal(s.cash, 99600);
});
test('all AI can be paused without losing manual recovery', () => {
  const s = fresh(); s.gpu = 1; s.weights.text = 0;
  E.advance(s, 60000); assert.equal(s.cash, 0); assert.equal(E.click(s), 10); assert.equal(s.cash, 10);
});
test('research earns RP separately and purchases permanent, single-use improvements', () => {
  const s = rich(); s.gpu = 2; E.unlock(s, 'research'); s.weights.text = 0;
  E.advance(s, 25000); assert.equal(s.rp, 50); assert.equal(s.cash, 98800);
  assert.equal(E.research(s, 'efficiency'), true); assert.equal(s.rp, 0);
  assert.equal(E.research(s, 'efficiency'), false); near(E.rates(s).demandPower, 3);
  s.rp = 100; E.research(s, 'hardware'); near(E.rates(s).cp, 30);
});
test('offline output equals frequent online ticks for stable equipment', () => {
  const a = rich(); a.gpu = 3; a.power = 1; a.cooling = 1;
  E.unlock(a, 'code'); E.unlock(a, 'research'); a.weights = { text: 2, code: 3, image: 0, research: 1 };
  const b = structuredClone(a); E.advance(a, 120000);
  for (let t = 200; t <= 120000; t += 200) E.advance(b, t);
  near(a.cash, b.cash); near(a.rp, b.rp);
  for (const k of Object.keys(E.AI)) near(a.progress[k], b.progress[k]);
});
test('offline progress is capped at eight hours and cannot be claimed twice', () => {
  const s = fresh(); s.gpu = 1;
  assert.equal(E.advance(s, 24 * 3600000), 8 * 3600); assert.equal(s.cash, 288000);
  const cash = s.cash; E.advance(s, 24 * 3600000); assert.equal(s.cash, cash);
});
test('clock rollback gives no reward and does not freeze future progress', () => {
  const s = fresh(); s.gpu = 1; s.lastAt = 10000;
  E.advance(s, 5000); assert.equal(s.cash, 0); E.advance(s, 7000); assert.equal(s.cash, 20);
});
test('factory requires research and construction money', () => {
  const s = rich(); assert.equal(E.buildFactory(s), false);
  s.tech.manufacturing = true; assert.equal(E.buildFactory(s), true); assert.equal(s.cash, 95000);
  assert.equal(E.factoryCost(s), 9000);
});
test('manufacturing consumes silicon and water and never runs without inputs', () => {
  const s = fresh(); s.tech.manufacturing = true; s.factory = 1; s.autoSupply = false;
  E.advance(s, 4000); assert.equal(s.chips, 0);
  s.silicon = 1; s.water = 2; E.advance(s, 8000);
  near(s.chips, 1); near(s.silicon, 0); near(s.water, 0);
  E.advance(s, 12000); near(s.chips, 1);
});
test('automatic supply spends only available money and can resume from empty funds', () => {
  const s = fresh(); s.tech.manufacturing = true; s.factory = 1; s.cash = 9;
  E.advance(s, 8000); near(s.cash, 0); near(s.chips, 1);
  E.click(s); E.advance(s, 12000); near(s.cash, 1); near(s.chips, 2);
});
test('factory pause frees power and cooling, and production stops', () => {
  const s = rich(); s.tech.manufacturing = true; s.factory = 1; s.gpu = 2;
  near(E.rates(s).cp, 10); s.factoryOn = false; near(E.rates(s).cp, 20);
  E.advance(s, 10000); near(s.chips, 0);
});
test('offline manufacturing and supply cost match online progress', () => {
  const a = rich(); a.gpu = 2; a.power = 1; a.cooling = 1; a.tech.manufacturing = true; a.factory = 1;
  const b = structuredClone(a); E.advance(a, 60000);
  for (let t = 200; t <= 60000; t += 200) E.advance(b, t);
  near(a.cash, b.cash); near(a.chips, b.chips); near(a.silicon, b.silicon); near(a.water, b.water);
});
test('empty-budget manufacturing is identical offline and with irregular online updates', () => {
  const a = fresh(); Object.assign(a, { gpu: 1, factory: 1, power: 1, cooling: 1 }); a.tech.manufacturing = true;
  const b = structuredClone(a); E.advance(a, 60000);
  for (let t = 137; t < 60000; t += 137) E.advance(b, t);
  E.advance(b, 60000);
  near(a.cash, b.cash); near(a.chips, b.chips); near(a.fraction, b.fraction);
});
test('fractional progress survives a save and accumulates into full simulation ticks', () => {
  let s = fresh(); s.gpu = 1; E.advance(s, 150);
  assert.equal(s.progress.text, 0); near(s.fraction, .15);
  s = E.validate(JSON.parse(JSON.stringify(s))); E.advance(s, 400);
  near(s.progress.text, 4); near(s.fraction, 0);
});
test('GPU assembly consumes chips once, respects slots, and creates usable hardware', () => {
  const s = rich(); s.tech.manufacturing = true; s.chips = 5;
  assert.equal(E.assemble(s), true); assert.equal(s.gpu, 0); assert.equal(s.customGpu, 1); near(E.rates(s).cp, 8); assert.equal(s.chips, 0); assert.equal(s.cash, 99850);
  assert.equal(s.assembled, 1); assert.equal(E.assemble(s), false);
  s.gpu = 4; s.chips = 5; assert.equal(E.assemble(s), false); assert.equal(s.chips, 5);
});
test('save round trip preserves the simulation and isolates object references', () => {
  const s = rich(); s.gpu = 1; E.unlock(s, 'code'); E.advance(s, 10000);
  const loaded = E.validate(JSON.parse(JSON.stringify(s))); assert.deepEqual(loaded, s);
  loaded.weights.text = 5; assert.equal(s.weights.text, 1);
});
test('malformed or unsupported backups fail without mutating the running game', () => {
  for (const mutate of [s => { s.version = 999; }, s => { s.cash = -1; }, s => { s.cash = Infinity; }, s => { s.gpu = 1e9; }, s => { s.gpu = 5; }, s => { s.weights.text = .5; }, s => { s.ai = null; }, s => { s.progress.text = 20; }, s => { s.factory = 1; }, s => { s.milestones = [true]; }]) {
    const s = fresh(); mutate(s); assert.throws(() => E.validate(s));
  }
  assert.throws(() => E.validate(null));
});
test('every initial milestone can be completed through the public game actions', () => {
  const s = fresh(); for (let i = 0; i < 10; i++) E.click(s); E.buy(s, 'gpu');
  let time = 0;
  const waitForCash = amount => { for (let i = 0; s.cash < amount && i < 100000; i++) E.advance(s, time += 1000); assert.ok(s.cash >= amount); };
  waitForCash(E.AI.code.cost); E.unlock(s, 'code'); s.weights.text = 0;
  for (let i = 0; i < 3; i++) { waitForCash(E.cost(s, 'gpu')); E.buy(s, 'gpu'); }
  for (const key of ['power', 'cooling']) for (let i = 0; i < 2; i++) { waitForCash(E.cost(s, key)); E.buy(s, key); }
  waitForCash(E.AI.research.cost); E.unlock(s, 'research');
  while (s.rp < E.TECH.manufacturing.cost) E.advance(s, time += 1000);
  E.research(s, 'manufacturing'); waitForCash(E.factoryCost(s)); E.buildFactory(s);
  waitForCash(E.cost(s, 'rack')); E.buy(s, 'rack');
  while (s.chips < 5) E.advance(s, time += 1000);
  waitForCash(150); assert.equal(E.assemble(s), true); assert.equal(s.assembled, 1);
  assert.ok(time < 1800000, `First loop took ${time / 60000} minutes`);
});

function spaceCompany() {
  const s = rich(); Object.assign(s, { cash: 500000, earned: 500000, gpu: 8, rack: 1, power: 8, cooling: 7, factory: 1, assembled: 1, rp: 1000, chips: 100, water: 200 });
  s.ai = { text: true, code: true, image: true, research: true }; s.tech.manufacturing = true;
  return s;
}
function launchCompany() {
  const s = spaceCompany(); Object.assign(s, { gpu: 0, customGpu: 8, customGpuLevel: 5, assembled: 8, rocketAI: true });
  return s;
}

test('old saves without a rocket project migrate while preserving money and equipment', () => {
  const old = spaceCompany(); delete old.rocket;
  const s = E.validate(JSON.parse(JSON.stringify(old)));
  assert.equal(s.cash, old.cash); assert.equal(s.gpu, old.gpu); assert.equal(s.chips, old.chips);
  assert.deepEqual(s.rocket, E.create().rocket);
});
test('rocket development requires a factory, a self-built GPU, and enough of each resource', () => {
  const s = rich(); s.chips = 100; s.rp = 1000;
  assert.equal(E.buildRocket(s, 'navigation'), false);
  Object.assign(s, launchCompany()); s.rp = 499;
  const before = structuredClone(s); assert.equal(E.buildRocket(s, 'navigation'), false); assert.deepEqual(s, before);
  s.rp = 500; assert.equal(E.buildRocket(s, 'navigation'), true);
  assert.equal(s.rp, 0); assert.equal(s.chips, 90); assert.equal(s.cash, 440000);
  assert.equal(E.buildRocket(s, 'navigation'), false);
  s.water = 99; assert.equal(E.buildRocket(s, 'fuel'), false);
  s.water = 100; assert.equal(E.buildRocket(s, 'fuel'), true); assert.equal(s.water, 0);
  assert.equal(E.buildRocket(s, 'hull'), true); assert.equal(s.chips, 60);
});
test('launch requires Rocket AI, eight level-five custom GPUs, all parts and sufficient infrastructure', () => {
  const s = launchCompany(); assert.equal(E.canLaunch(s), false);
  for (const part of Object.keys(E.ROCKET)) assert.equal(E.buildRocket(s, part), true);
  assert.equal(E.canLaunch(s), true);
  for (const [field, value] of [['customGpu', 7], ['customGpuLevel', 4], ['rocketAI', false], ['power', 1], ['cooling', 1], ['factory', 0]]) {
    const blocked = structuredClone(s); blocked[field] = value; assert.equal(E.canLaunch(blocked), false, field);
    assert.equal(E.launch(blocked, 12345), false);
  }
  const blocked = structuredClone(s); blocked.ai.image = false; assert.equal(E.canLaunch(blocked), true);
});
test('successful launch is saved once and ends both online and offline production', () => {
  const s = launchCompany(); for (const part of Object.keys(E.ROCKET)) E.buildRocket(s, part);
  assert.equal(E.launch(s, 12345), true); assert.equal(E.launch(s, 12346), false);
  const before = structuredClone(s); assert.equal(E.advance(s, 24 * 3600000), 0);
  for (const k of ['cash', 'earned', 'rp', 'chips', 'played']) assert.equal(s[k], before[k]);
  assert.equal(E.click(s), 0); assert.equal(E.buy(s, 'power'), false); assert.equal(E.unlock(s, 'image'), false);
  assert.equal(E.research(s, 'hardware'), false); assert.equal(E.assemble(s), false);
  assert.equal(E.supplies(s), false); assert.equal(E.buildFactory(s), false); assert.equal(E.rates(s).cp, 0);
  const loaded = E.validate(JSON.parse(JSON.stringify(s))); assert.equal(loaded.rocket.launched, true); assert.equal(loaded.rocket.launchedAt, 12345);
});
test('malformed rocket and ending records are rejected', () => {
  for (const rocket of [null, {}, { navigation: true, hull: true, fuel: true, launched: 'yes', launchedAt: 1 }, { navigation: false, hull: true, fuel: true, launched: true, launchedAt: 1 }, { navigation: true, hull: true, fuel: true, launched: true, launchedAt: 0 }]) {
    const s = fresh(); s.rocket = rocket; assert.throws(() => E.validate(s));
  }
});
test('each first acquisition is recorded once and survives export/import', () => {
  const s = fresh();
  for (const id of ['buy:gpu', 'buy:power', 'buy:cooling', 'buy:rack', 'unlock:code', 'unlock:image', 'unlock:research', 'research:hardware', 'research:efficiency', 'research:manufacturing', 'factory', 'assemble', 'supplies', 'rocket:hull', 'rocket:fuel', 'rocket:navigation']) {
    assert.equal(E.claimDiscovery(s, id), true); assert.equal(E.claimDiscovery(s, id), false);
  }
  const restored = E.validate(JSON.parse(JSON.stringify(s)));
  assert.equal(E.claimDiscovery(restored, 'buy:gpu'), false);
  assert.equal(E.claimDiscovery(restored, 'unknown:item'), false);
  assert.notEqual(restored.discoveries, s.discoveries);
  assert.equal(E.claimDiscovery(fresh(), 'buy:gpu'), true);
});
test('legacy saves mark existing acquisitions without suppressing future new ones', () => {
  const old = spaceCompany(); old.tech.hardware = true; old.rocket.hull = true; delete old.discoveries;
  const s = E.validate(JSON.parse(JSON.stringify(old)));
  for (const id of ['buy:gpu', 'buy:power', 'unlock:code', 'research:hardware', 'factory', 'assemble', 'supplies', 'rocket:hull']) assert.equal(E.claimDiscovery(s, id), false, id);
  assert.equal(E.claimDiscovery(s, 'research:efficiency'), true);
  assert.equal(E.claimDiscovery(s, 'rocket:fuel'), true);
});
test('malformed acquisition records are rejected', () => {
  for (const discoveries of [null, 'buy:gpu', ['unknown'], ['buy:gpu', 'buy:gpu'], Array(100).fill('buy:gpu')]) {
    const s = fresh(); s.discoveries = discoveries; assert.throws(() => E.validate(s));
  }
});
test('the impact sound waits for a gesture and respects mute and volume settings', () => {
  const vm = require('node:vm'), fs = require('node:fs');
  const listeners = {}, stored = new Map(); let created = 0, sources = 0;
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = () => ({ connect() {}, disconnect() {}, start() { sources++; }, stop() {}, gain: param(), frequency: param() });
  class Audio {
    constructor() { created++; this.state = 'running'; this.currentTime = 0; this.sampleRate = 1000; this.destination = {}; }
    createGain() { return node(); }
    createOscillator() { const result = node(); Object.defineProperty(result, 'type', { set(v) { assert.ok(['sine', 'triangle', 'square', 'sawtooth'].includes(v)); } }); return result; }
    createBuffer(channels, size) { return { getChannelData: () => new Float32Array(size) }; }
    createBufferSource() { return node(); }
    createBiquadFilter() { return node(); }
    resume() { return Promise.resolve(); }
  }
  const window = { AudioContext: Audio };
  vm.runInNewContext(fs.readFileSync(require.resolve('../../assets/games/ai-controler/sound.js'), 'utf8'), { window, document: { hidden: false, addEventListener(k, fn) { listeners[k] = fn; } }, localStorage: { getItem(k) { return stored.get(k) || null; }, setItem(k, v) { stored.set(k, v); } }, Date, Math, Number, JSON, Float32Array });
  window.EmpireSound.play('discovery'); assert.equal(created, 0);
  listeners.pointerdown(); window.EmpireSound.play('discovery'); assert.equal(created, 1); assert.equal(sources, 6);
  window.EmpireSound.configure(false); window.EmpireSound.play('discovery'); assert.equal(sources, 6);
  window.EmpireSound.configure(true, 0); window.EmpireSound.play('discovery'); assert.equal(sources, 6);
  window.EmpireSound.configure(true, .3); window.EmpireSound.play('click'); assert.equal(sources, 8);
});
test('ten GPUs need eight power and cooling units with infrastructure receiving a meaningful budget', () => {
  const s = rich(); s.cash = 1e6; s.rack = 2;
  const spend = { gpu: 0, power: 0, cooling: 0 };
  for (let i = 0; i < 10; i++) {
    for (const key of ['gpu', ...(i >= 2 ? ['power', 'cooling'] : [])]) {
      spend[key] += E.cost(s, key); assert.equal(E.buy(s, key), true);
    }
    near(E.rates(s).utilization, 1);
  }
  assert.equal(s.gpu, 10); assert.equal(s.power, 8); assert.equal(s.cooling, 8);
  near(E.rates(s).cp, 100); assert.equal(E.rates(s).powerCap, 20); assert.equal(E.rates(s).coolingCap, 20);
  assert.deepEqual(spend, { gpu: 4709, power: 2151, cooling: 1912 });
  const infraShare = (spend.power + spend.cooling) / Object.values(spend).reduce((a, b) => a + b, 0);
  assert.ok(infraShare > .4 && infraShare < .55);
  E.buy(s, 'gpu'); assert.ok(E.rates(s).utilization < 1);
  E.buy(s, 'power'); E.buy(s, 'cooling'); near(E.rates(s).utilization, 1);
});
test('a factory requires two additional power units and one cooling unit', () => {
  const s = rich(); Object.assign(s, { gpu: 10, rack: 2, power: 8, cooling: 8 });
  s.tech.manufacturing = true; assert.equal(E.buildFactory(s), true);
  assert.ok(E.rates(s).utilization < 1);
  E.buy(s, 'power'); E.buy(s, 'power'); assert.equal(E.rates(s).bottleneck, 'cooling');
  E.buy(s, 'cooling'); near(E.rates(s).utilization, 1);
});
test('equipment rebalance migrates old saves once without losing capacity or resources', () => {
  const old = spaceCompany(); delete old.balanceVersion; old.power = 2; old.cooling = 3;
  const migrated = E.validate(JSON.parse(JSON.stringify(old)));
  assert.equal(migrated.balanceVersion, 2); assert.equal(migrated.power, 8); assert.equal(migrated.cooling, 12);
  assert.equal(E.rates(migrated).powerCap, 4 + old.power * 8);
  assert.equal(E.rates(migrated).coolingCap, 4 + old.cooling * 8);
  for (const key of ['cash', 'earned', 'gpu', 'rp', 'chips', 'assembled']) assert.equal(migrated[key], old[key]);
  assert.deepEqual(E.validate(JSON.parse(JSON.stringify(migrated))), migrated);
  old.balanceVersion = 1; assert.equal(E.validate(old).power, 8);
  old.balanceVersion = 999; assert.throws(() => E.validate(old));
});
test('ambient music starts only on request, continues across repeated requests, and stops on close or mute', () => {
  const vm = require('node:vm'), fs = require('node:fs');
  const listeners = {}, intervals = new Map(), saved = new Map(); let created = 0, started = 0, intervalId = 0;
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ connect() {}, disconnect() {}, gain: param(), frequency: param(), detune: param(), delayTime: param(), start() { started++; }, stop() {} });
  class Audio {
    constructor() { created++; this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    createGain() { return node(); } createDelay() { return node(); }
    createBiquadFilter() { return node(); } createOscillator() { return node(); }
  }
  const window = { AudioContext: Audio, addEventListener(k, fn) { listeners[k] = fn; } };
  const document = { hidden: false, addEventListener(k, fn) { listeners[k] = fn; } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../../assets/games/ai-controler/music.js'), 'utf8'), {
    window, document, localStorage: { getItem(k) { return saved.get(k) || null; }, setItem(k, v) { saved.set(k, v); } },
    setInterval(fn) { intervals.set(++intervalId, fn); return intervalId; }, clearInterval(id) { intervals.delete(id); }, Math, Number, JSON, Set
  });
  const music = window.EmpireMusic;
  assert.equal(created, 0); assert.equal(started, 0);
  music.open(); assert.equal(created, 1); assert.equal(started, 12); assert.equal(intervals.size, 1);
  music.open(); assert.equal(started, 12); assert.equal(intervals.size, 1);
  music.configure(true, .1); assert.equal(music.volume, .1); assert.equal(started, 12);
  music.close(); assert.equal(intervals.size, 0);
  document.hidden = true; listeners.visibilitychange(); document.hidden = false; listeners.visibilitychange(); assert.equal(intervals.size, 0);
  music.open(); assert.equal(intervals.size, 1); music.configure(false); assert.equal(intervals.size, 0);
  music.open(); assert.equal(intervals.size, 0);
  music.configure(true, 0); assert.equal(intervals.size, 0);
  music.configure(true, .2); assert.equal(intervals.size, 1);
  document.hidden = true; listeners.visibilitychange(); assert.equal(intervals.size, 0);
  document.hidden = false; listeners.visibilitychange(); assert.equal(intervals.size, 1);
  listeners.pagehide(); assert.equal(intervals.size, 0);
  const settings = JSON.parse(saved.get('xainome.ai-empire.music')); assert.equal(settings.volume, .2); assert.equal(settings.enabled, true);
});

test('existing saves acquire optional industry and contract fields without changing their economy', () => {
  const old = spaceCompany(); delete old.industry; delete old.projects;
  const s = E.validate(JSON.parse(JSON.stringify(old)));
  assert.equal(s.cash, old.cash); assert.equal(s.gpu, old.gpu); assert.equal(s.rp, old.rp);
  assert.deepEqual(s.industry, fresh().industry); assert.deepEqual(s.projects, fresh().projects);
  assert.deepEqual(E.validate(JSON.parse(JSON.stringify(s))), s);
});
test('Coding AI can trade income for permanent factory improvements and retain progress across role changes', () => {
  const s = rich(); E.unlock(s, 'code'); s.gpu = 2; s.weights.text = 0;
  assert.equal(E.setCodeMode(s, 'optimize'), true); const cash = s.cash;
  E.advance(s, 15000); near(s.industry.softwareWork, 300); assert.equal(s.cash, cash);
  E.setCodeMode(s, 'income'); E.advance(s, 18000); assert.equal(s.cash, cash + 100); near(s.industry.softwareWork, 300);
  E.setCodeMode(s, 'optimize'); E.advance(s, 33000);
  assert.equal(s.industry.softwareLevel, 1); near(s.industry.softwareWork, 0); near(E.rates(s).factoryBonus, 1.1);
  assert.equal(E.validate(JSON.parse(JSON.stringify(s))).industry.softwareLevel, 1);
});
test('factory improvement caps at five levels and automatically resumes income work', () => {
  const s = rich(); E.unlock(s, 'code'); s.weights.text = 0; s.gpu = 1;
  Object.assign(s.industry, { softwareLevel: 4, softwareWork: 2999, codeMode: 'optimize' });
  E.advance(s, 200); assert.equal(s.industry.softwareLevel, 5); assert.equal(s.industry.codeMode, 'income');
  assert.equal(s.industry.softwareWork, 0); assert.equal(E.setCodeMode(s, 'optimize'), false);
  const cash = s.cash; E.advance(s, 6200); assert.equal(s.cash, cash + 100);
});
test('water facilities require Coding AI, spend construction money once, and reserve electricity', () => {
  const s = rich(); assert.equal(E.buyWaterPlant(s, 'purifier'), false);
  E.unlock(s, 'code'); const cash = s.cash;
  for (const k of Object.keys(E.WATER)) assert.equal(E.buyWaterPlant(s, k), true);
  assert.equal(s.cash, cash - 1050); assert.equal(E.rates(s).demandPower, 4);
  s.industry.purifierOn = false; assert.equal(E.rates(s).demandPower, 2);
});
test('purification transforms finite raw water without creating free water or consuming hidden cash', () => {
  const s = fresh(); Object.assign(s.industry, { purifier: 1, autoRaw: false, rawWater: 12.5 });
  E.advance(s, 5000); near(s.water, 10); near(s.industry.rawWater, 0); near(s.cash, 0);
  E.advance(s, 10000); near(s.water, 10);
});
test('auto raw-water purchasing is affordable and stops at the demand-based reserve', () => {
  const s = fresh(); s.industry.purifier = 1; s.cash = 1;
  E.advance(s, 5000); near(s.water, 2); near(s.cash, 0);
  s.cash = 100; s.water = 99; E.advance(s, 10000); near(s.water, 100); near(s.cash, 99.5);
  s.water = 4999; E.advance(s, 20000); near(s.water, 4999); near(s.cash, 99.5);
});
test('recycling consumes wastewater at an 80 percent recovery ratio', () => {
  const s = fresh(); Object.assign(s.industry, { recycler: 1, wasteWater: 12.5 });
  E.advance(s, 10000); near(s.water, 10); near(s.industry.wasteWater, 0);
  E.advance(s, 20000); near(s.water, 10);
});
test('water cooling supports more GPUs but loses cooling capacity when water runs out', () => {
  const s = rich(); E.unlock(s, 'code'); s.gpu = 4; s.power = 10; s.water = 1;
  Object.assign(s.industry, { liquid: 1, autoWater: false });
  near(E.rates(s).cp, 60); E.advance(s, 2000); near(s.water, 0); near(s.industry.wasteWater, 1);
  near(E.rates(s).cp, 20); s.water = 100; near(E.rates(s).cp, 60);
  s.industry.liquidOn = false; near(E.rates(s).cp, 20); assert.equal(E.rates(s).demandPower, 8);
});
test('water cooling can purchase only its actual shortfall independently of factory auto supply', () => {
  const s = fresh(); s.gpu = 2; s.power = 1; s.cash = 2; s.weights.text = 0; s.industry.liquid = 1; s.autoSupply = false;
  E.advance(s, 2000); near(s.cash, 0); near(s.water, 0); near(s.industry.wasteWater, 1);
  E.advance(s, 4000); near(s.industry.wasteWater, 1);
});
test('factory purchases silicon and water independently when recycled water is already available', () => {
  const s = fresh(); s.factory = 1; s.tech.manufacturing = true; s.cash = 5; s.water = 2;
  E.advance(s, 4000); near(s.chips, 1); near(s.cash, 0); near(s.water, 0); near(s.industry.wasteWater, 2);
});
test('an active contract shares the same compute pool and adds infrastructure load only while running', () => {
  const s = spaceCompany(); s.power = 30; s.cooling = 30;
  assert.equal(E.selectContract(s, 'image'), true); s.projects.weight = 3;
  const r = E.rates(s); near(r.shares.text + r.contractCP, r.cp); near(r.contractCP, 60);
  assert.equal(r.demandPower, 24); assert.equal(r.demandCooling, 20);
  s.projects.weight = 0; near(E.rates(s).contractCP, 0); assert.equal(E.rates(s).demandPower, 20);
  E.selectContract(s, null); assert.equal(E.rates(s).demandCooling, 18);
});
test('contract input materials are paid once and progress survives pause, switching, and save/load', () => {
  let s = spaceCompany(); s.power = 30; s.cooling = 30; s.factoryOn = false;
  const chips = s.chips; assert.equal(E.selectContract(s, 'automation'), true); assert.equal(s.chips, chips - 5);
  E.advance(s, 1000); const progress = s.projects.automation.work; assert.ok(progress > 0);
  E.selectContract(s, 'image'); E.advance(s, 2000); near(s.projects.automation.work, progress);
  E.selectContract(s, null); E.advance(s, 3000); near(s.projects.automation.work, progress);
  s = E.validate(JSON.parse(JSON.stringify(s))); assert.equal(E.selectContract(s, 'automation'), true);
  assert.equal(s.chips, chips - 5); near(s.projects.automation.work, progress);
});
test('contract rewards and permanent first-clear bonuses do not repeat automatically', () => {
  const s = spaceCompany(); s.power = 30; s.cooling = 30; s.factoryOn = false; s.weights.text = 0;
  E.selectContract(s, 'image'); const cash = s.cash, rp = s.rp; E.advance(s, 37600);
  assert.equal(s.projects.image.runs, 1); assert.equal(s.projects.active, null); assert.equal(s.cash, cash + 7000); assert.equal(s.rp, rp + 100);
  E.advance(s, 50000); assert.equal(s.projects.image.runs, 1);
  E.selectContract(s, 'image'); E.advance(s, 87600); assert.equal(s.projects.image.runs, 2); assert.equal(s.rp, rp + 100);
  E.selectContract(s, 'automation'); E.advance(s, 117600); assert.equal(s.projects.automation.runs, 1); near(E.rates(s).factoryBonus, 1.2);
});
test('space contracts consume research and manufacturing inputs and reduce rocket funding cost', () => {
  const s = launchCompany(); s.power = 30; s.cooling = 30; s.weights.text = 0; s.factoryOn = false;
  const rp = s.rp, chips = s.chips, water = s.water;
  E.selectContract(s, 'space'); assert.equal(s.rp, rp - 100); assert.equal(s.chips, chips - 10); near(s.water, water - 50);
  E.advance(s, 62600); assert.equal(s.projects.space.runs, 1); assert.equal(s.rp, rp + 50);
  assert.equal(E.rocketCost(s, 'navigation').cash, 48000); assert.equal(E.rocketCost(s, 'hull').cash, 72000);
  const cash = s.cash; assert.equal(E.buildRocket(s, 'navigation'), true); assert.equal(s.cash, cash - 48000);
});
test('low-budget industrial production, water shortages, software, and contract completion match offline and online', () => {
  const a = spaceCompany(); a.cash = 1; a.power = 30; a.cooling = 3; a.silicon = 5; a.water = 0;
  Object.assign(a.industry, { purifier: 1, recycler: 1, liquid: 2, wasteWater: 1, codeMode: 'optimize' });
  a.weights.code = 2; E.selectContract(a, 'image'); const b = structuredClone(a);
  E.advance(a, 120000); for (let t = 137; t < 120000; t += 137) E.advance(b, t); E.advance(b, 120000);
  for (const key of ['cash', 'rp', 'water', 'chips', 'silicon', 'played']) near(a[key], b[key]);
  assert.deepEqual(a.projects, b.projects);
  for (const key of ['rawWater', 'wasteWater', 'softwareWork', 'softwareLevel']) near(a.industry[key], b.industry[key]);
});
test('malformed industry and contract saves are rejected and cleared companies remain frozen', () => {
  for (const change of [s => { s.industry = null; }, s => { s.industry.rawWater = -1; }, s => { s.industry.liquid = 1e9; }, s => { s.industry.autoWater = 'true'; }, s => { s.projects.active = 'unknown'; }, s => { s.projects.image.work = 1; }, s => { s.projects.weight = .1; }]) {
    const s = fresh(); change(s); assert.throws(() => E.validate(s));
  }
  const s = launchCompany(); for (const key of Object.keys(E.ROCKET)) E.buildRocket(s, key); E.launch(s, 1);
  const before = structuredClone(s); E.advance(s, 500000);
  assert.equal(E.buyWaterPlant(s, 'liquid'), false); assert.equal(E.buyRawWater(s), false); assert.equal(E.setCodeMode(s, 'optimize'), false); assert.equal(E.selectContract(s, 'image'), false);
  assert.deepEqual(s.industry, before.industry); assert.deepEqual(s.projects, before.projects);
});


const G = require('../../assets/games/ai-controler/guide.js');
test('guide covers every obtainable item and action with gains, uses, costs and next steps', () => {
  assert.equal(new Set(G.topics.map(t => t.id)).size, G.topics.length);
  for (const [action, definitions] of [['buy', E.EQUIPMENT], ['unlock', E.AI], ['research', E.TECH], ['rocket', E.ROCKET], ['water-plant', E.WATER], ['contract', E.CONTRACTS]]) {
    for (const key of Object.keys(definitions)) {
      const info = G.describe(fresh(), (action === 'water-plant' ? 'water' : action) + ':' + key);
      assert.ok(info, `${action}:${key}`);
      for (const field of ['title', 'group', 'gain', 'use', 'cost', 'next']) assert.ok(info[field].trim(), `${info.id}.${field}`);
    }
  }
  for (const action of ['work', 'factory', 'assemble', 'supplies', 'software', 'autoSupply', 'autoRaw', 'autoWater', 'water-raw', 'contract-pause', 'launch']) assert.ok(G.describe(fresh(), action));
  assert.equal(G.describe(fresh(), 'unknown'), null);
});
test('factory help calculates the same capacity and consumption as the simulation', () => {
  const s = spaceCompany(); s.power = 30; s.cooling = 30;
  for (const [level, bonus, expected] of [[0, 0, 15], [1, 0, 16.5], [5, 0, 22.5], [5, 1, 25.5]]) {
    s.industry.softwareLevel = level; s.projects.automation.runs = bonus;
    const m = G.factoryMetrics(s);
    near(m.perFactoryPerMinute, expected); near(m.capacityPerMinute, expected);
    near(m.siliconPerMinute, expected); near(m.waterPerMinute, expected * 2);
    near(m.secondsForFive, 300 / expected);
  }
  s.power = 0;
  const limited = G.factoryMetrics(s); assert.ok(limited.capacityPerMinute < limited.perFactoryPerMinute);
  near(limited.capacityPerMinute, E.rates(s).factoryRate * 60);
  s.factoryOn = false;
  const stopped = G.factoryMetrics(s); near(stopped.capacityPerMinute, 0); assert.equal(stopped.secondsForFive, null);
  assert.match(G.describe(s, 'factory').current, /停止中/);
});
test('opening every guide topic reflects current state without changing the game', () => {
  for (const s of [fresh(), spaceCompany()]) {
    const before = structuredClone(s);
    for (const topic of G.topics) assert.equal(typeof G.describe(s, topic.id).current, 'string');
    assert.deepEqual(s, before);
  }
  const s = spaceCompany(); s.industry.softwareLevel = 3; s.industry.codeMode = 'optimize';
  assert.match(G.describe(s, 'software').current, /Lv.3/);
  assert.match(G.describe(s, 'software').current, /毎分19.5個/);
  assert.match(G.describe(s, 'software').current, /工場改善/);
  s.rocket.launched = true; assert.match(G.describe(s, 'software').current, /クリア済み/);
});
test('new companies reveal advanced panels only after the corresponding milestones', () => {
  const s = rich(); let f = E.unlockedFeatures(s);
  assert.deepEqual([f.factory, f.water, f.research, f.space, f.contractsBoard], [false, false, false, false, false]);
  E.unlock(s, 'code'); f = E.unlockedFeatures(s);
  assert.equal(f.water, true); assert.equal(f.factory, false); assert.equal(f.contractsBoard, false);
  E.unlock(s, 'research'); f = E.unlockedFeatures(s);
  assert.equal(f.research, true); assert.equal(f.contracts.space, false);
  s.rp = 180; E.research(s, 'manufacturing'); f = E.unlockedFeatures(s);
  assert.equal(f.factory, true); assert.equal(f.space, false); assert.equal(f.contracts.automation, false);
  E.buildFactory(s); f = E.unlockedFeatures(s);
  assert.equal(f.contracts.automation, true); assert.equal(f.contractsBoard, true); assert.equal(f.space, false);
  s.chips = 5; E.assemble(s); f = E.unlockedFeatures(s);
  assert.equal(f.space, true); assert.equal(f.contracts.space, true);
  Object.assign(s, { customGpu: 8, assembled: 8, customGpuLevel: 5, rack: 1 }); f = E.unlockedFeatures(s);
  assert.equal(f.space, true); assert.equal(f.contracts.space, true); assert.equal(f.contracts.image, false);
  E.unlock(s, 'image'); assert.equal(E.unlockedFeatures(s).contracts.image, true);
});
test('unlocked panels survive spending, shortages, pausing and a saved-game round trip', () => {
  const s = spaceCompany(); s.industry.purifier = 1;
  const expected = E.unlockedFeatures(s);
  s.cash = 0; s.chips = 0; s.water = 0; s.rp = 0; s.factoryOn = false;
  s.power = 0; s.cooling = 0; s.industry.purifierOn = false; s.projects.weight = 0;
  assert.deepEqual(E.unlockedFeatures(s), expected);
  assert.deepEqual(E.unlockedFeatures(E.validate(JSON.parse(JSON.stringify(s)))) , expected);
  assert.equal(E.unlockedFeatures(fresh()).space, false);
});


test('section numbers follow actual unlock order and survive a save', () => {
  const s = rich(); assert.deepEqual(E.revealSections(s), []);
  E.unlock(s, 'image'); assert.deepEqual(E.revealSections(s), ['contracts']);
  E.unlock(s, 'code'); assert.deepEqual(E.revealSections(s), ['contracts', 'water']);
  E.unlock(s, 'research'); E.revealSections(s);
  s.rp = 180; E.research(s, 'manufacturing'); E.revealSections(s);
  E.buildFactory(s); s.chips = 5; E.assemble(s);
  Object.assign(s, { customGpu: 8, assembled: 8, customGpuLevel: 5, rack: 1 });
  assert.deepEqual(E.revealSections(s), ['contracts', 'water', 'factory', 'space']);
  const loaded = E.validate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(E.revealSections(loaded), s.sectionOrder);
  assert.deepEqual(E.revealSections(fresh()), []);
});
test('old saves get a useful section order and invalid unlock records are rejected', () => {
  const s = launchCompany(); delete s.sectionOrder;
  const loaded = E.validate(s);
  assert.deepEqual(E.revealSections(loaded), ['water', 'factory', 'contracts', 'space']);
  for (const order of [null, ['water', 'water'], ['unknown'], ['space', 'factory', 'water', 'research', 'contracts', 'space']]) {
    assert.throws(() => E.validate({ ...s, sectionOrder: order }));
  }
});
test('water cooling accelerates only the GPUs within its finite cooling capacity', () => {
  const s = rich(); s.gpu = 8; s.power = 20; s.cooling = 20; s.water = 100; s.weights.text = 1;
  s.industry.liquid = 1;
  let r = E.rates(s); near(r.liquidCooling, 12); near(r.cooledGPU, 6); near(r.waterBoostCP, 30); near(r.cp, 110);
  near(E.waterImpact(s).cpGain, 30); near(E.waterImpact(s).incomeGain, 30);
  s.tech.hardware = true; r = E.rates(s); near(r.cp, 165); near(r.waterBoostCP, 45);
  s.industry.liquidOn = false; near(E.rates(s).cp, 120); near(E.rates(s).waterBoostCP, 0);
  s.industry.liquidOn = true; s.water = 0; s.industry.autoWater = false;
  near(E.rates(s).cp, 120); near(E.rates(s).waterBoostCP, 0);
});
test('recycled water takes priority over paid purification when the reserve is nearly full', () => {
  const s = fresh(); s.water = 99.8; s.cash = 100;
  Object.assign(s.industry, { purifier: 1, recycler: 1, rawWater: 10, wasteWater: 1 });
  const r = E.rates(s); near(r.recycled, 1); near(r.purified, 0);
  E.advance(s, 200); near(s.water, 100); near(s.industry.rawWater, 10); near(s.cash, 100); near(s.industry.wasteWater, .75);
  E.advance(s, 60000); near(s.water, 100); near(s.cash, 100);
});
test('recycling lowers actual factory running costs while preserving semiconductor production', () => {
  const a = rich(); Object.assign(a, { gpu: 0, factory: 1, factoryOn: true, autoSupply: false, silicon: 100, water: 115, power: 10, cooling: 10 });
  a.tech.manufacturing = true; a.industry.purifier = 1; a.industry.wasteWater = 20;
  const b = structuredClone(a); b.industry.recycler = 1;
  E.advance(a, 60000); E.advance(b, 60000);
  near(a.chips, 15); near(b.chips, 15); near(a.water, b.water);
  assert.ok(b.cash > a.cash + 10, 'recycling must reduce real raw-water purchases');
});
test('the water reserve, performance boost and recycling give equal online and offline results', () => {
  const a = spaceCompany(); a.power = 30; a.cooling = 30; a.silicon = 1000; a.water = 0;
  Object.assign(a.industry, { purifier: 1, liquid: 1, recycler: 1 });
  const b = structuredClone(a); E.advance(a, 180000);
  for (let now = 800; now <= 180000; now += 800) E.advance(b, now);
  near(a.cash, b.cash); near(a.chips, b.chips); near(a.water, b.water);
  near(a.industry.wasteWater, b.industry.wasteWater); near(a.industry.rawWater, b.industry.rawWater);
  const copy = structuredClone(a); E.waterImpact(a); assert.deepEqual(a, copy);
});


test('purchased and custom GPUs remain separate and consume the same rack slots', () => {
  const s = rich(); s.tech.manufacturing = true; s.chips = 20; s.power = 10; s.cooling = 10;
  assert.equal(E.assemble(s), true); assert.equal(E.cost(s, 'gpu'), 100);
  E.buy(s, 'gpu'); E.buy(s, 'gpu'); E.assemble(s);
  assert.equal(s.gpu, 2); assert.equal(s.customGpu, 2); assert.equal(E.totalGpu(s), 4);
  near(E.rates(s).cp, 36); near(E.rates(s).demandPower, 8); near(E.rates(s).demandCooling, 8);
  const before = structuredClone(s); assert.equal(E.buy(s, 'gpu'), false); assert.equal(E.assemble(s), false); assert.deepEqual(s, before);
  E.buy(s, 'rack'); assert.equal(E.assemble(s), true); assert.equal(E.totalGpu(s), 5);
});
test('custom GPU design research has five levels and improves every custom GPU only', () => {
  const s = rich(); s.gpu = 1; s.customGpu = 2; s.assembled = 2; s.power = 10; s.cooling = 10; s.tech.manufacturing = true; s.ai.research = true; s.rp = 10000;
  const levels = [8, 12, 18, 26, 36], costs = [200, 450, 900, 1600];
  for (let level = 1; level <= 5; level++) {
    assert.equal(s.customGpuLevel, level); near(E.rates(s).purchasedCP, 10); near(E.rates(s).customCP, levels[level - 1] * 2);
    if (level < 5) { const before = s.rp; assert.equal(E.upgradeCustomGpu(s), true); assert.equal(s.rp, before - costs[level - 1]); }
  }
  const before = structuredClone(s); assert.equal(E.upgradeCustomGpu(s), false); assert.deepEqual(s, before);
  s.tech.hardware = true; near(E.customGpuCP(s), 54); near(E.rates(s).purchasedCP, 15);
  s.chips = 5; assert.equal(E.assemble(s), true); assert.equal(s.customGpu, 3); near(E.rates(s).customCP, 162);
});
test('all new research requires Research AI and manufacturing research, and fails without spending RP', () => {
  const s = rich(); s.rp = 10000;
  for (const action of [() => E.research(s, 'hardware'), () => E.upgradeCustomGpu(s), () => E.developRocketAI(s)]) { const before = structuredClone(s); assert.equal(action(), false); assert.deepEqual(s, before); }
  E.unlock(s, 'research'); assert.equal(E.upgradeCustomGpu(s), false); assert.equal(E.developRocketAI(s), false);
  E.research(s, 'manufacturing'); s.rp = 199; assert.equal(E.upgradeCustomGpu(s), false); assert.equal(s.rp, 199);
  assert.equal(E.developRocketAI(s), false); assert.equal(s.rocketAI, false);
});
test('Rocket AI costs RP once and adds no income, compute allocation or infrastructure load', () => {
  const s = spaceCompany(); s.rp = 1200; s.customGpuLevel = 5;
  const before = E.rates(s), ai = structuredClone(s.ai);
  assert.equal(E.developRocketAI(s), true); assert.equal(s.rp, 0); assert.equal(s.rocketAI, true);
  assert.deepEqual(E.rates(s), before); assert.deepEqual(s.ai, ai);
  assert.equal(E.developRocketAI(s), false); assert.equal(s.rp, 0);
  assert.equal(E.rocketUnlocked(s), false, 'purchased GPUs cannot satisfy the custom GPU gate');
  s.rocket.navigation = true; assert.equal(E.unlockedFeatures(s).space, false, 'old partial construction cannot bypass the new unlock requirement');
});
test('legacy saves split assembled GPUs once and preserve already completed endings', () => {
  const old = spaceCompany(); old.gpu = 10; old.assembled = 3; old.rack = 2;
  delete old.customGpu; delete old.customGpuLevel; delete old.rocketAI;
  old.sectionOrder = ['water', 'research', 'factory', 'contracts'];
  const loaded = E.validate(old);
  assert.equal(loaded.gpu, 7); assert.equal(loaded.customGpu, 3); assert.equal(loaded.customGpuLevel, 1); assert.equal(loaded.rocketAI, false);
  assert.equal(E.totalGpu(loaded), 10); assert.equal(loaded.cash, old.cash);
  assert.deepEqual(loaded.sectionOrder, ['water', 'factory', 'contracts']);
  assert.deepEqual(E.validate(JSON.parse(JSON.stringify(loaded))), loaded);
  old.rocket = { navigation: true, hull: true, fuel: true, launched: true, launchedAt: 1 };
  const cleared = E.validate(old); assert.equal(cleared.rocket.launched, true); assert.equal(E.advance(cleared, 10000), 0);
});
test('malformed custom GPU and Rocket AI records are rejected', () => {
  for (const patch of [{customGpu:-1}, {customGpu:.5}, {customGpu:10001}, {customGpu:1}, {customGpuLevel:0}, {customGpuLevel:6}, {customGpuLevel:1.5}, {customGpuLevel:2}, {rocketAI:'yes'}, {rocketAI:true}]) assert.throws(() => E.validate({ ...fresh(), ...patch }));
  const s = spaceCompany(); Object.assign(s, { gpu: 4, customGpu: 1, assembled: 1, rack: 0 }); assert.throws(() => E.validate(s));
});
test('the manufacturing and RP progression can reach an ending without adopting every income AI', () => {
  const s = rich(); E.unlock(s, 'research'); s.weights.research = 3;
  for (let i = 0; i < 4; i++) E.buy(s, 'gpu');
  for (let i = 0; i < 12; i++) E.buy(s, 'power');
  for (let i = 0; i < 11; i++) E.buy(s, 'cooling');
  E.buy(s, 'rack'); E.buy(s, 'rack');
  let now = 0;
  const wait = ready => { while (!ready()) { now += 1000; assert.ok(now <= 3600000, 'progression stalled'); E.advance(s, now); } };
  wait(() => s.rp >= 180); assert.equal(E.research(s, 'manufacturing'), true); assert.equal(E.buildFactory(s), true);
  for (let i = 0; i < 8; i++) { wait(() => s.chips >= 5 && s.cash >= 150); assert.equal(E.assemble(s), true); }
  assert.equal(E.rocketUnlocked(s), true);
  while (s.customGpuLevel < 5) { wait(() => s.rp >= E.customGpuUpgrade(s).cost); assert.equal(E.upgradeCustomGpu(s), true); }
  assert.equal(E.rocketUnlocked(s), true);
  wait(() => s.rp >= E.ROCKET_AI.cost); assert.equal(E.developRocketAI(s), true);
  wait(() => s.chips >= 40); s.factoryOn = false;
  for (let i = 0; i < 5; i++) assert.equal(E.supplies(s), true);
  for (const key of Object.keys(E.ROCKET)) { const part = E.rocketCost(s, key); wait(() => s.cash >= part.cash && s.rp >= part.rp && s.chips >= part.chips && s.water >= part.water); assert.equal(E.buildRocket(s, key), true); }
  assert.equal(s.ai.code, false); assert.equal(s.ai.image, false); assert.equal(E.launch(s, now), true);
});


test('the first assembled custom GPU opens both the rocket project and orbital station contract', () => {
  const s = spaceCompany(); s.gpu = 1; s.customGpu = 0; s.assembled = 0; s.customGpuLevel = 1;
  assert.equal(E.unlockedFeatures(s).space, false); assert.equal(E.unlockedFeatures(s).contracts.space, false);
  assert.equal(E.assemble(s), true);
  assert.equal(s.customGpu, 1); assert.equal(s.customGpuLevel, 1);
  assert.equal(E.rocketUnlocked(s), true); assert.equal(E.unlockedFeatures(s).space, true);
  assert.equal(E.unlockedFeatures(s).contracts.space, true); assert.equal(E.contractReason(s, 'space'), '');
  assert.equal(E.selectContract(s, 'space'), true);
  assert.equal(E.canLaunch(s), false);
});
test('Rocket AI cannot be developed below custom GPU level five even with enough RP', () => {
  const s = spaceCompany(); s.rp = 10000;
  for (let level = 1; level <= 4; level++) {
    s.customGpuLevel = level; const before = structuredClone(s);
    assert.equal(E.developRocketAI(s), false); assert.deepEqual(s, before);
  }
  s.customGpuLevel = 5; assert.equal(E.developRocketAI(s), true); assert.equal(s.rp, 8800);
});
test('early rocket parts can be built but the AI navigation system also requires developed Rocket AI', () => {
  const s = spaceCompany(); Object.assign(s, { gpu: 1, customGpu: 1, assembled: 1, customGpuLevel: 1, rp: 10000 });
  const before = structuredClone(s); assert.equal(E.buildRocket(s, 'navigation'), false); assert.deepEqual(s, before);
  assert.equal(E.buildRocket(s, 'hull'), true); assert.equal(E.buildRocket(s, 'fuel'), true);
  while (s.customGpuLevel < 5) assert.equal(E.upgradeCustomGpu(s), true);
  assert.equal(E.canBuildRocket(s, 'navigation'), false);
  assert.equal(E.developRocketAI(s), true); assert.equal(E.buildRocket(s, 'navigation'), true);
  assert.equal(E.canLaunch(s), false, 'launch still requires eight level-five custom GPUs');
});


const T = require('../../assets/games/ai-controler/skill-tree.js');
test('the skill graph has valid unique nodes, guides and no dependency cycles', () => {
  const list = T.nodes(fresh()), ids = new Set(list.map(n => n.id));
  assert.equal(ids.size, list.length);
  const visit = (id, path = new Set()) => { assert.ok(!path.has(id), id); const next = new Set(path); next.add(id); for (const parent of list.find(n => n.id === id).deps) { assert.ok(ids.has(parent), parent); visit(parent, next); } };
  for (const node of list) { assert.ok(G.describe(fresh(), node.guide), node.guide); assert.equal(typeof node.canExecute, 'boolean'); visit(node.id); }
});
test('every enabled skill-tree action is accepted by the real engine', () => {
  const ready = launchCompany(); for (const key of Object.keys(E.ROCKET)) E.buildRocket(ready, key);
  const mixed = spaceCompany(); Object.assign(mixed, { gpu: 1, customGpu: 1, assembled: 1, rp: 10000 });
  const actions = { supplies:s=>E.supplies(s), 'water-raw':s=>E.buyRawWater(s), upgrade: (s,n) => E.buyUpgrade(s,n.key), buy: (s,n) => E.buy(s,n.key), unlock: (s,n) => E.unlock(s,n.key), research: (s,n) => E.research(s,n.key), 'water-plant': (s,n) => E.buyWaterPlant(s,n.key), factory: s => E.buildFactory(s), assemble: s => E.assemble(s), 'software-mode': s => E.setCodeMode(s,'optimize'), 'gpu-upgrade': s => E.upgradeCustomGpu(s), 'rocket-ai': s => E.developRocketAI(s), contract: (s,n) => E.selectContract(s,n.key), rocket: (s,n) => E.buildRocket(s,n.key), 'tree-launch': s => E.launch(s,1) };
  for (const s of [fresh(), rich(), mixed, launchCompany(), ready]) for (const node of T.nodes(s).filter(n => n.canExecute)) assert.equal(actions[node.action](structuredClone(s),node), true, node.id);
});
test('tree statuses distinguish prerequisites, missing resources and repeatable purchases', () => {
  const s = fresh(); let list=T.nodes(s);
  assert.equal(list.find(n=>n.id==='research:manufacturing').status,'locked');
  assert.equal(list.find(n=>n.id==='buy:gpu').status,'waiting');
  s.cash=100; assert.equal(T.nodes(s).find(n=>n.id==='buy:gpu').status,'ready'); E.buy(s,'gpu');
  s.cash=1000; const gpu=T.nodes(s).find(n=>n.id==='buy:gpu'); assert.equal(gpu.status,'done'); assert.equal(gpu.canExecute,true);
  const cleared=launchCompany(); for(const key of Object.keys(E.ROCKET)) E.buildRocket(cleared,key); E.launch(cleared,1);
  assert.ok(T.nodes(cleared).every(n=>!n.canExecute));
});
test('Tab shortcut respects text editing, modifier keys and repeated keydown events', () => {
  assert.equal(T.shouldToggle({key:'Tab'}),true);
  assert.equal(T.shouldToggle({key:'Tab'},true),false); assert.equal(T.shouldToggle({key:'Enter'}),false);
  for(const flag of ['shiftKey','ctrlKey','altKey','metaKey','repeat','isComposing','defaultPrevented']) assert.equal(T.shouldToggle({key:'Tab',[flag]:true}),false,flag);
});


test('cash upgrades have five paid levels with increasing prices and cannot spend beyond the cap', () => {
  const s=rich(); s.cash=1e7;
  for(const key of Object.keys(E.AI)) if(!s.ai[key]) E.unlock(s,key);
  for(const key of Object.keys(E.UPGRADE_BASE)) {
    for(let level=0;level<5;level++) {
      const price=E.upgradeCost(s,key), cash=s.cash;
      assert.equal(price,E.UPGRADE_BASE[key]*3**level);
      assert.equal(E.buyUpgrade(s,key),true); assert.equal(s.cash,cash-price); assert.equal(s.upgrades[key],level+1);
    }
    const before=structuredClone(s); assert.equal(E.upgradeCost(s,key),Infinity);
    assert.equal(E.buyUpgrade(s,key),false); assert.deepEqual(s,before);
  }
});
test('click upgrades multiply real click payouts and the GPU bonus without changing AI work', () => {
  const s=rich(); s.gpu=2; const income=E.rates(s).income;
  assert.equal(E.manualReward(s),15);
  for(let level=1;level<=5;level++) {
    E.buyUpgrade(s,'click'); const cash=s.cash;
    assert.equal(E.click(s),15*(level+1)); assert.equal(s.cash,cash+15*(level+1));
    assert.equal(E.rates(s).income,income);
  }
  s.gpu=4; assert.equal(E.manualReward(s),120);
});
test('upgrades reject insufficient cash, unavailable AI and unknown keys without altering the save', () => {
  const s=rich();
  for(const key of ['code','image','research','unknown','__proto__']) {
    const before=structuredClone(s); assert.equal(E.buyUpgrade(s,key),false); assert.deepEqual(s,before);
  }
  s.cash=149; const before=structuredClone(s);
  assert.equal(E.buyUpgrade(s,'click'),false); assert.deepEqual(s,before);
});
test('AI upgrades improve actual income and RP while preserving GPU allocation and electricity demand', () => {
  for(const key of Object.keys(E.AI)) {
    const s=rich(); s.gpu=2; if(!s.ai[key]) E.unlock(s,key);
    s.weights={text:0,code:0,image:0,research:0}; s.weights[key]=1;
    const before=E.rates(s); E.buyUpgrade(s,key); const r=E.rates(s);
    assert.deepEqual(r.shares,before.shares); near(r.cp,before.cp);
    near(r.demandPower,before.demandPower); near(r.demandCooling,before.demandCooling);
    near(r.effectiveShares[key],25); near(r.income+r.research,(before.income+before.research)*1.25);
    const cash=s.cash; E.advance(s,4000);
    const completed=Math.floor(100/E.AI[key].cp);
    near(s.progress[key],100-completed*E.AI[key].cp);
    if(key==='research') assert.equal(s.rp,completed);
    else assert.equal(s.cash,cash+completed*E.AI[key].reward);
    s.weights[key]=0; const paused=structuredClone(s); E.advance(s,8000);
    assert.deepEqual(s.progress,paused.progress); assert.equal(s.cash,paused.cash); assert.equal(s.rp,paused.rp);
  }
  const idle=rich(); E.buyUpgrade(idle,'text'); E.advance(idle,10000); assert.equal(idle.completed,0);
});
test('Coding AI and contract upgrades accelerate development with the same assigned GPU budget', () => {
  const s=rich(); s.gpu=2; E.unlock(s,'code'); s.weights.text=0; E.setCodeMode(s,'optimize'); E.buyUpgrade(s,'code');
  E.advance(s,4000); near(s.industry.softwareWork,100); assert.equal(s.completed,0);
  for(const [key,ai] of [['image','image'],['automation','code'],['space','research']]) {
    const base=spaceCompany(); base.chips=100; base.rp=10000; base.water=1000; base.power=100; base.cooling=100;
    if(!base.ai[ai]) E.unlock(base,ai);
    base.gpu=7; base.customGpu=1; base.factoryOn=false; base.weights={text:0,code:0,image:0,research:0};
    assert.equal(E.selectContract(base,key),true);
    const faster=structuredClone(base); E.buyUpgrade(faster,ai);
    near(E.rates(faster).contractCP,E.rates(base).contractCP*1.25);
    E.advance(base,1000); E.advance(faster,1000);
    near(faster.projects[key].work,base.projects[key].work*1.25);
  }
});
test('old puzzle-era saves keep money and equipment and migrate to zero-cost-history upgrades', () => {
  const old=rich(); old.gpu=2; old.progress.text=7;
  old.puzzles={solved:2,match:1,order:1,earned:50}; old.milestoneIds=['gpu-first','puzzle-first']; delete old.upgrades;
  const s=E.validate(JSON.parse(JSON.stringify(old)));
  assert.equal(s.cash,old.cash); assert.equal(s.earned,old.earned); assert.equal(s.gpu,old.gpu); assert.equal(s.progress.text,7);
  assert.deepEqual(s.upgrades,{click:0,text:0,code:0,image:0,research:0});
  assert.deepEqual(s.milestoneIds,['gpu-first']); assert.equal(s.puzzles,undefined); assert.equal(E.beginPuzzle,undefined);
  E.buyUpgrade(s,'click'); E.buyUpgrade(s,'text');
  assert.deepEqual(E.validate(JSON.parse(JSON.stringify(s))).upgrades,s.upgrades);
});
test('invalid upgrade records are rejected and completed games cannot buy more upgrades', () => {
  for(const v of [null,[],{}, {...fresh().upgrades,click:-1},{...fresh().upgrades,click:1.5},{...fresh().upgrades,click:6},{...fresh().upgrades,click:Infinity},{...fresh().upgrades,code:1}]) assert.throws(()=>E.validate({...fresh(),upgrades:v}));
  const s=launchCompany(); for(const key of Object.keys(E.ROCKET)) E.buildRocket(s,key); E.launch(s,1);
  for(const key of Object.keys(E.UPGRADE_BASE)) { const before=structuredClone(s); assert.equal(E.buyUpgrade(s,key),false); assert.deepEqual(s,before); }
});
test('upgraded AI give equal results online, offline and after a fractional save round trip', () => {
  const s=rich(); s.gpu=2; E.unlock(s,'code'); E.unlock(s,'research');
  for(const key of ['text','code','research']) E.buyUpgrade(s,key);
  s.weights={text:1,code:2,image:0,research:3};
  const frequent=structuredClone(s); E.advance(s,60137);
  for(let now=137;now<=60137;now+=200) E.advance(frequent,now);
  near(s.cash,frequent.cash); near(s.rp,frequent.rp);
  const restored=E.validate(JSON.parse(JSON.stringify(s)));
  E.advance(s,61137); E.advance(restored,61137); assert.deepEqual(restored,s);
});
test('completed milestone records survive resource spending and map legacy six-step records', () => {
  const s=rich(); E.updateMilestones(s); assert.ok(s.milestoneIds.includes('first-income'));
  s.cash=0; s.earned=0; assert.equal(E.updateMilestones(s).find(g=>g.id==='first-income').done,true);
  const old=fresh(); delete old.milestoneIds; old.milestones=[true,true,true,true,true,true];
  const loaded=E.validate(old); assert.deepEqual(loaded.milestoneIds,['gpu-first','code-ai','gpu-four','research-ai','manufacturing','custom-first']);
  assert.deepEqual(E.validate(JSON.parse(JSON.stringify(loaded))).milestoneIds,loaded.milestoneIds);
  for(const ids of [['unknown'],['gpu-first','gpu-first'],null]) assert.throws(()=>E.validate({...fresh(),milestoneIds:ids}));
});
test('the main milestone route completes without the optional AI, water or upgrade branches', () => {
  const s=launchCompany(); s.ai.code=false; s.ai.image=false;
  for(const key of Object.keys(E.ROCKET)) E.buildRocket(s,key); E.launch(s,1);
  const goals=E.updateMilestones(s);
  assert.ok(goals.filter(g=>!g.optional).every(g=>g.done));
  assert.equal(goals.find(g=>g.id==='code-ai').done,false); assert.equal(goals.find(g=>g.id==='click-upgrade').done,false); assert.equal(goals.find(g=>g.id==='ai-upgrade').done,false);
});
test('purchase and upgrade tabs cover every node once with unique visible coordinates', () => {
  const list=T.nodes(fresh()), covered=[];
  for(const tab of T.tabs) {
    const visible=T.layout(list,tab.id);
    assert.equal(new Set(visible.map(n=>n.col+':'+n.row)).size,visible.length);
    for(const node of visible) { assert.ok(node.id); assert.equal(T.tabFor(node.id),tab.id); assert.ok(tab.columns[node.col]); covered.push(node.id); }
  }
  assert.equal(covered.length,list.length); assert.deepEqual(new Set(covered),new Set(list.map(n=>n.id)));
});


test('custom GPU design upgrades unlock only after assembling the first custom GPU', () => {
  const s=rich(); E.unlock(s,'research'); s.rp=10000; E.research(s,'manufacturing'); s.chips=5;
  const before=structuredClone(s); assert.equal(E.upgradeCustomGpu(s),false); assert.deepEqual(s,before);
  let node=T.nodes(s).find(n=>n.id==='gpu-level:2');
  assert.equal(node.canExecute,false); assert.match(node.reason,/初回組立/); assert.deepEqual(node.deps,['assemble']);
  assert.equal(E.assemble(s),true);
  node=T.nodes(s).find(n=>n.id==='gpu-level:2'); assert.equal(node.canExecute,true);
  const rp=s.rp; assert.equal(E.upgradeCustomGpu(s),true); assert.equal(s.rp,rp-200); assert.equal(s.customGpuLevel,2);
});
test('tree warnings identify the actual power and cooling shortages and disappear after expansion', () => {
  const s=rich(); s.gpu=4; const get=id=>T.nodes(s).find(n=>n.id===id);
  assert.match(get('buy:power').warnings.join(' '),/電力不足 4 kW/);
  assert.match(get('buy:cooling').warnings.join(' '),/冷却不足 4 CU/);
  assert.equal(get('buy:gpu').warnings.filter(w=>/電力|冷却/.test(w)).length,2); assert.equal(get('upgrade:click').warnings.length,0);
  E.buy(s,'power'); E.buy(s,'power');
  assert.equal(get('buy:power').warnings.length,0); assert.equal(get('buy:gpu').warnings.filter(w=>/電力|冷却/.test(w)).length,1);
  E.buy(s,'cooling'); E.buy(s,'cooling'); assert.ok(T.nodes(s).every(n=>n.warnings.every(w=>!/電力|冷却/.test(w))));
});
const {treeHarness,Element}=require('./ai-controler-ui-harness.cjs');
test('the real tree renderer refreshes level titles, prices and gray availability after upgrades', () => {
  const s=rich(); let readOnly=false; const h=treeHarness(()=>s,()=>readOnly); h.ui.open('upgrade:click');
  const b=h.node('upgrade:click'), title=b.querySelector('.tree-node-title'); assert.match(title.textContent,/Lv.0/);
  E.buyUpgrade(s,'click'); h.ui.render(); assert.match(title.textContent,/Lv.1/);
  assert.equal(b.querySelector('.tree-node-cost').textContent,'¥450'); assert.equal(h.get('tree-detail-title').textContent,title.textContent);
  assert.ok(!b.querySelector('.tree-node-status').textContent.includes('クリックで実行'));
  s.cash=0; h.ui.render(); assert.ok(b.className.includes('unavailable')); assert.equal(b.dataset.action,undefined); assert.equal(b.disabled,false);
  s.cash=100000; h.ui.render(); assert.ok(!b.className.includes('unavailable')); assert.equal(b.dataset.action,'upgrade');
  while(s.upgrades.click<5) E.buyUpgrade(s,'click'); h.ui.render(); assert.match(title.textContent,/Lv.5/); assert.ok(b.className.includes('unavailable'));
  readOnly=true; h.ui.render(); assert.equal(h.node('buy:power').dataset.action,undefined); assert.ok(h.node('buy:power').className.includes('unavailable'));
});
test('the real tree renderer updates warning text inside nodes as capacity changes', () => {
  const s=rich(); s.gpu=4; const h=treeHarness(()=>s); h.ui.open('buy:power');
  const warning=h.node('buy:power').querySelector('.tree-node-warning'); assert.equal(warning.hidden,false); assert.match(warning.textContent,/電力不足 4 kW/);
  E.buy(s,'power'); E.buy(s,'power'); h.ui.render(); assert.equal(warning.hidden,true); assert.equal(warning.textContent,'');
  assert.match(h.node('buy:cooling').querySelector('.tree-node-warning').textContent,/冷却不足/);
});
const D=require('../../assets/games/ai-controler/dialog-ui.js');
test('backdrop clicks close only the targeted dialog and run its close handlers', () => {
  const outer=new Element({}), inner=new Element({});
  for(const dialog of [outer,inner]) { dialog.open=true; dialog.getBoundingClientRect=()=>({left:20,top:20,right:200,bottom:200}); }
  D.install({querySelectorAll:()=>[outer,inner]});
  let closed=0; inner.addEventListener('close',()=>closed++);
  inner.emit('pointerdown',{button:0,clientX:10,clientY:100}); inner.emit('click',{clientX:10,clientY:100});
  assert.equal(inner.open,false); assert.equal(outer.open,true); assert.equal(closed,1);
});
test('dialog padding, child buttons, inside-to-outside drags and cancelled pointers do not dismiss', () => {
  const dialog=new Element({}); dialog.getBoundingClientRect=()=>({left:20,top:20,right:200,bottom:200});
  D.install({querySelectorAll:()=>[dialog]});
  for(const [start,end,extra] of [
    [{clientX:40,clientY:40},{clientX:40,clientY:40}],
    [{clientX:40,clientY:40,target:{}},{clientX:40,clientY:40,target:{}}],
    [{clientX:40,clientY:40},{clientX:10,clientY:10}],
    [{clientX:10,clientY:10},{clientX:40,clientY:40}],
    [{clientX:10,clientY:10},{clientX:10,clientY:10},'pointercancel']
  ]) {
    dialog.open=true; dialog.emit('pointerdown',{button:0,...start}); if(extra) dialog.emit(extra); dialog.emit('click',end); assert.equal(dialog.open,true);
  }
});

test('both GPU acquisition nodes display rack shortages until a shared rack is purchased', () => {
  const s=rich(); s.gpu=4; s.tech.manufacturing=true; s.chips=5; const h=treeHarness(()=>s); h.ui.open('buy:gpu');
  for(const id of ['buy:gpu','assemble']) {
    const b=h.node(id); assert.match(b.querySelector('.tree-node-warning').textContent,/サーバーラック不足/);
    assert.equal(b.dataset.action,undefined); assert.ok(b.className.includes('unavailable'));
  }
  E.buy(s,'rack'); h.ui.render();
  for(const id of ['buy:gpu','assemble']) { const b=h.node(id); assert.ok(!b.querySelector('.tree-node-warning').textContent.includes('サーバーラック不足')); assert.ok(b.dataset.action); }
});
test('switching tree tabs only changes the view and direct links choose the correct tab', () => {
  const s=rich(), h=treeHarness(()=>s), before=structuredClone(s); h.ui.open('buy:gpu');
  assert.equal(h.node('buy:gpu').hidden,false); assert.equal(h.node('upgrade:click').hidden,true);
  h.get('tree-tab-upgrade').emit('click');
  assert.equal(h.node('buy:gpu').hidden,true); assert.equal(h.node('upgrade:click').hidden,false);
  assert.equal(h.get('tree-tab-upgrade').getAttribute('aria-selected'),'true');
  h.ui.open('assemble'); assert.equal(h.node('assemble').hidden,false); assert.equal(h.node('gpu-level:2').hidden,true);
  h.ui.open('gpu-level:2'); assert.equal(h.node('assemble').hidden,true); assert.equal(h.node('gpu-level:2').hidden,false);
  assert.deepEqual(s,before);
});

test('flow connectors remain orthogonal and do not cross skill-card interiors', () => {
  const g=T.geometry;
  for(const tab of T.tabs) {
    const list=T.layout(T.nodes(fresh()),tab.id); let index=0;
    for(const node of list) for(const id of node.deps) {
      const parent=list.find(n=>n.id===id); if(!parent) continue;
      const points=T.connector(parent,node,index++,list);
      for(let i=1;i<points.length;i++) {
        const [x1,y1]=points[i-1],[x2,y2]=points[i]; assert.ok(x1===x2 || y1===y2);
        for(const card of list) {
          const p=T.point(card), left=p.x+1,right=p.x+g.width-1,top=p.y+1,bottom=p.y+g.height-1;
          const crosses=x1===x2 ? x1>left && x1<right && Math.max(y1,y2)>top && Math.min(y1,y2)<bottom : y1>top && y1<bottom && Math.max(x1,x2)>left && Math.min(x1,x2)<right;
          assert.ok(!crosses,parent.id+' -> '+node.id+' crosses '+card.id);
        }
      }
    }
  }
});
