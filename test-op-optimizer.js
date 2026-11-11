'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=file=>fs.readFileSync(__dirname+'/'+file,'utf8');
const docs=['master.js','runes.js','pets.js','talents.js','calc.js','combat.js',
 'cloud-config.js','pet-ui.js','talent-ui.js','combat-ui.js','stats-view.js',
 'jp-display.js','ai-export.js','op-optimizer.js','op-optimizer-ui.js'];
const handlers={},local={};
const app={innerHTML:'',addEventListener:(name,fn)=>handlers[name]=fn};
const toast={textContent:'',classList:{add(){},remove(){}}};
const doc={getElementById:id=>id==='app'?app:id==='toast'?toast:null,
 createElement:()=>({style:{},files:[],click(){}}),
 body:{appendChild(){}},addEventListener(){}};
const ctx={document:doc,console,crypto:require('node:crypto').webcrypto,Date,Math,JSON,Set,Array,Number,String,Map,
 URL,URLSearchParams,Blob,localStorage:{getItem:k=>local[k]??null,setItem:(k,v)=>{local[k]=v},removeItem:k=>delete local[k]},
 setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true,prompt:()=>'テスト',fetch:()=>Promise.reject(Error('offline')),
 history:{replaceState(){}},location:{hash:'',pathname:'/',search:'',origin:'file://'}};
ctx.window=ctx;ctx.window.addEventListener=()=>{};vm.createContext(ctx);
for(const file of docs)vm.runInContext(source(file),ctx,{filename:file});
const D=ctx.DBP,C=ctx.DBPCalc,B=ctx.DBPCombat,O=ctx.DBPOpOptimizer,UI=ctx.DBPOpOptimizerUI;
const state=D.makeSeed(),b=state.builds[0];
const neck=state.items.find(x=>x.id===b.loadout.neck);
neck.upgrade=12;neck.upgradeKnown=true;
neck.primary=['int','lightning','strongAttack','injured'];neck.secondary='move';
neck.locked=true;neck.opLocks={primary:[true,true,true,false],secondary:true};
neck.overrides={'int:0:12':99.3,'lightning:1:12':161.23};
b.settings.combat={abilityId:'lightningStorm',elementalStacks:5,elite:true,
 vulnerable:true,burned:true,forceHealthy:true,forceInjured:true};
const initial=JSON.stringify(state);
const n=O.evaluate(state,b,'neck','primary:0');
assert.equal(n.ok,true);
assert.equal(n.current,'int');
assert.equal(n.locked,true);
assert.equal(n.originalValue,99.3,'recorded current-value override used');
assert(n.options.length>10,'neck allowed OPs are scanned');
assert.equal(n.skillName,B.abilities.lightningStorm[0],'same ability as damage tab');
assert(n.options.every((x,i,a)=>!i||x.percent<=a[i-1].percent+1e-10),'sorted by estimated expected damage');
assert(n.options.some(x=>x.key==='healthy'&&x.percent>0),'vs healthy available and useful with Schrodinger');
assert(n.options.some(x=>x.key==='critDamage'),'crit damage candidate available');
assert(!n.options.some(x=>x.key==='strongAttack'),'do not propose a duplicate of another primary OP');
assert(!n.options.some(x=>x.key==='lightning'),'duplicate lightning excluded');
assert.equal(n.options.find(x=>x.key==='int').percent,0,'current OP must score zero and keep measured roll');
const sim=O.swapped(neck,{kind:'primary',index:0},'healthy');
assert.equal(sim.primary[0],'healthy');
assert.equal(sim.overrides['int:0:12'],undefined,'old numeric override must not leak');
assert.equal(sim.overrides['lightning:1:12'],161.23,'unchanged OP values preserved');
assert.equal(neck.primary[0],'int','simulation did not modify original');
// Compute the baseline with the exact same settings/filters/combat engine as Damage tab.
const cf=ctx.DBPStatsView.config(b.settings),eq=B.equippedEffects(state,b),
 items=Object.fromEntries(Object.entries(eq.items).filter(([slot,id])=>
 cf.filters.unique&&cf.slots[slot]!==false&&cf.powers[id]!==false));
const context={...eq,items,schrodingerRing:items.ring1==='schrodinger'||items.ring2==='schrodinger'};
const stats=C.calc(state,b,{sourceFilters:{...cf.filters,powers:cf.powers,slots:cf.slots}});
const raw=B.scenario(b.settings.combat),direct=B.attack(stats,b.settings,raw,context);
assert.equal(n.baseline.expected,direct.expected,'identical to existing combat engine');
assert.equal(n.baseline.critChance,direct.critChance,'critical chance and cap shared');
assert.equal(JSON.stringify(state),initial,'ranking never touches saved state');
const secondary=O.evaluate(state,b,'neck','secondary');
assert.equal(secondary.ok,true);
assert.equal(secondary.current,'move');
assert(secondary.options.every(x=>D.rules.neck.secondary.includes(x.key)),'secondary pool only');
assert(secondary.options.some(x=>x.current),'secondary baseline retained');
// Different hero categories and no-prerequisite cases.
assert.equal(O.evaluate(state,b,'weapon','primary:0').ok,false,'Divine fixed OPs excluded');
assert.equal(O.evaluate(state,b,'ring1','primary:0').ok,false,'Divine rings excluded');
const none=JSON.parse(JSON.stringify(b));delete none.loadout.neck;
assert.equal(O.evaluate(state,none,'neck').ok,false,'missing equipment is handled');
assert(UI.render({state,build:b,slot:'neck',positionId:'primary:0',E:x=>x,opt:(id,name,sel)=>'<option value="'+id+'">'+name+'</option>'}).includes('OP候補の順位'),
 'dedicated OP UI renders without mutation');
// UI behavior + opt-in creating candidate, leaving original and locks unchanged.
local.deskrawl_planner_v01=JSON.stringify(state);
vm.runInContext(source('app.js'),ctx,{filename:'app.js'});
const click=(action,value)=>handlers.click({target:{closest:()=>({dataset:{action,value}})}});
const change=(kind,value)=>handlers.change({target:{dataset:{change:kind},value}});
click('tab-equipment');
click('slot','neck');
click('mode-optimize');
assert(app.innerHTML.includes('OP変更シミュレーター'),'optimizer opens in equipment subnav');
assert(app.innerHTML.includes('data-action="optimizer-select"'),'ranked clickable alternatives');
assert(!app.innerHTML.includes('装備保管庫'),'optimizer hides unrelated equipment inventory');
assert.equal(ctx.DBPApp.getUI().detail,'optimize');
let live=ctx.DBPApp.getState(),real=live.items.find(x=>x.id===live.builds[0].loadout.neck);
const before=JSON.stringify(live);
click('optimizer-select','healthy');
assert(app.innerHTML.includes('このOPで装備候補を作成'),'selection updates comparison details');
assert.equal(JSON.stringify(ctx.DBPApp.getState()),before,'selecting an OP never saves');
change('optimizer-position','secondary');
assert.equal(ctx.DBPApp.getUI().optimizerPosition,'secondary');
assert.equal(ctx.DBPApp.getUI().optimizerSelected,'','changing slot clears previous candidate');
assert(app.innerHTML.includes('補助OP'));
assert.equal(JSON.stringify(ctx.DBPApp.getState()),before,'changing slot never saves');
change('optimizer-position','primary:0');
click('optimizer-select','healthy');
click('optimizer-save','healthy');
live=ctx.DBPApp.getState();
assert.equal(live.items.length,state.items.length+1,'only explicit save adds inventory item');
assert.equal(live.builds[0].loadout.neck,neck.id,'equipped item remains the same');
assert.equal(JSON.stringify(live.items.find(x=>x.id===neck.id)),JSON.stringify(neck),'original locked gear entirely untouched');
const candidate=live.items.find(x=>x.id===ctx.DBPApp.getUI().itemId);
assert(candidate&&candidate.id!==neck.id&&candidate.primary[0]==='healthy');
assert.equal(candidate.locked,false,'new candidate is editable');
assert.equal(candidate.opLocks.primary[0],false,'changed OP loses prior required lock');
assert.equal(candidate.opLocks.primary[1],true,'untouched required OP remains locked');
assert.equal(candidate.overrides['int:0:12'],undefined,'new candidate cannot inherit stale measured OP');
assert.equal(candidate.overrides['lightning:1:12'],161.23,'untouched measured OP preserved');
assert.equal(ctx.DBPApp.getUI().detail,'compare','navigate to current-vs-candidate view');
assert.equal(live.schemaVersion,1,'cloud schema stays unchanged');
assert.equal(live.builds.length,1,'no extra build created');
console.log('PASS: all valid OP swaps ranked by shared damage engine, selectable slots, read-only preview, optional candidate save without affecting locked equipped item or cloud schema');
