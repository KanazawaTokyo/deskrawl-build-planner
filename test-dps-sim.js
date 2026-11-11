'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=file=>fs.readFileSync(__dirname+'/'+file,'utf8');
const handlers={},store={};
const app={innerHTML:'',addEventListener:(name,fn)=>handlers[name]=fn},toast={textContent:'',classList:{add(){},remove(){}}};
const doc={getElementById:id=>id==='app'?app:id==='toast'?toast:null,createElement:()=>({style:{},files:[],click(){}}),
 body:{appendChild(){}},addEventListener(){}};
const ctx={console,document:doc,Date,Math,Number,JSON,Set,Map,Array,String,Blob,URL,URLSearchParams,
 crypto:require('node:crypto').webcrypto,
 localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v},removeItem:k=>delete store[k]},
 setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true,prompt:()=>'test',fetch:()=>Promise.reject(Error('offline')),
 location:{hash:'',pathname:'/',search:'',origin:'file://'},history:{replaceState(){}}};
ctx.window=ctx;ctx.addEventListener=()=>{};vm.createContext(ctx);
const modules=['master.js','runes.js','pets.js','talents.js','calc.js','combat.js',
 'cloud-config.js','pet-ui.js','talent-ui.js','combat-ui.js','stats-view.js',
 'jp-display.js','dps-sim.js','dps-ui.js','ai-export.js','op-optimizer.js','op-optimizer-ui.js'];
for(const file of modules)vm.runInContext(code(file),ctx,{filename:file});
const S=ctx.DBPDpsSim,UI=ctx.DBPDpsUI,D=ctx.DBP,B=ctx.DBPCombat,C=ctx.DBPCalc;
const fake={effective:{weaponDamage:100,damage:0,int:0,critDamage:100,critChance:70,lightning:120,
  strongAttack:100,mana:100,mcr:0,cdr:0,manaRegen:0},breakdown:{}};
const base={combat:{abilityId:'lightningStorm'},dps:{duration:15,attackInterval:1,autoNova:false,manaRegen:0,hitsPerCast:1}};
const noNova=S.simulate(fake,base);
assert(noNova.ok,'initial DPS calculation succeeds');
assert.equal(noNova.manaCost,50,'verified 50 Mana base cost');
assert.equal(noNova.novaCooldown,22,'verified 22 second basic Ice Nova cooldown');
assert.equal(noNova.stormCasts,2,'100 Mana supports exactly two 50-Mana attacks with no regen');
assert.equal(noNova.starvedSeconds,13,'remaining thirteen one-second action windows are starved');
assert.equal(noNova.totalDamage,noNova.hit.expected*2,'sum uses shared hit expected value');
assert.equal(noNova.averageDps,noNova.totalDamage/15,'DPS is sum divided by period');
assert.equal(noNova.hitCount,2,'one target hit per cast by default');
assert.equal(noNova.novaCasts,0,'not cast while explicitly disabled');
const highMcr={...fake,effective:{...fake.effective,mcr:85,cdr:80}};
const eased=S.simulate(highMcr,base);
assert(Math.abs(eased.manaCost-7.5)<1e-8,'MCR is capped at 85');
assert(Math.abs(eased.novaCooldown-4.4)<1e-8,'CDR is capped at 80');
assert(eased.stormCasts>noNova.stormCasts,'Mana cost reduction increases cast count');
assert.equal(S.validate('attackInterval',0.1),undefined,'avoid impossible zero/negative action speed');
assert.equal(S.validate('manaRegen',-1),undefined,'negative Mana regen is refused');
assert.equal(S.validate('duration',45),undefined,'15/30/60 only');
assert.equal(S.validate('hitsPerCast',2.5),undefined,'hit multiplier must be integer');
assert.equal(S.validate('novaCooldown',''),null,'manual cooldown can be cleared');
assert.equal(S.validate('manaRegen',''),null,'manual regen can be cleared');
assert.equal(S.validate('initialMana',''),null,'initial Mana can be restored to full');
assert.equal(S.validate('autoNova',false),false,'checkbox false is stored correctly');
assert.equal(S.simulate(fake,{combat:{abilityId:'iceNova'}}).ok,false,'unsupported skills never reuse storm DPS');
assert.equal(S.simulate({effective:{weaponDamage:100,mana:0}},base).ok,false,'unknown Mana is explicitly rejected');
const seed=D.makeSeed(),character=seed.builds[0];
character.settings.combat={abilityId:'lightningStorm',elementalStacks:5};
const filtered=ctx.DBPStatsView.config(character.settings);
const eq=B.equippedEffects(seed,character),items={};
if(filtered.filters.unique)for(const [slot,id] of Object.entries(eq.items))
 if(filtered.slots[slot]!==false&&filtered.powers[id]!==false)items[slot]=id;
const context={...eq,items,schrodingerRing:items.ring1==='schrodinger'||items.ring2==='schrodinger'};
const stats=C.calc(seed,character,{sourceFilters:{...filtered.filters,powers:filtered.powers,slots:filtered.slots}});
const expected=B.attack(stats,character.settings,B.scenario(character.settings.combat),context).expected;
const r=S.simulate(stats,character.settings,context);
assert(r.ok,'real build can be simulated');
assert.equal(r.hit.expected,expected,'damage engine is reused unchanged');
assert.equal(r.novaRank,8,'read Frozen Reservoir 8/8 from talent allocation');
assert.equal(r.novaRecovery,130,'rank 8 restores 130 Mana');
assert.equal(r.novaProcChance,1,'rank 8 always succeeds');
assert(r.novaCasts>=1,'Ice Nova is used in actual build');
assert(r.stormCasts>=1,'Storm casts occur during combat');

// Re-check against a snapshot after changing the combat settings.
const snapshot=JSON.stringify(seed);
S.simulate(stats,character.settings,context);
assert.equal(JSON.stringify(seed),snapshot,'simulation does not change stored document');
const visible=UI.render(stats,character.settings,context);
assert(visible.includes('持続DPSシミュレーション'));
assert(visible.includes('平均DPS'));
assert(visible.includes('Mana残量の時間推移'));
assert(visible.includes('data-change="dps"'));
assert(visible.includes('dps-duration'));
assert(visible.includes('Storm 1回の命中数'));
const noMana=UI.render({effective:{weaponDamage:100,mana:0}},character.settings);
assert(noMana.includes('最大Manaが登録されていません'));
assert(UI.chart(r).includes('viewBox="0 0 720 175"'));
// End-to-end browser event handling must persist per-build only, not change combat input or gear.
store.deskrawl_planner_v01=JSON.stringify(seed);
vm.runInContext(code('app.js'),ctx,{filename:'app.js'});
const click=(action,value)=>handlers.click({target:{closest:()=>({dataset:{action,value}})}});
const change=(key,value,type='number')=>handlers.change({target:{type,checked:type==='checkbox'?value:false,
 value:String(value),dataset:{change:'dps',key}}});
click('tab-combat');
assert(app.innerHTML.includes('持続DPSシミュレーション'),'visible in Damage/Reduction tab');
assert(app.innerHTML.includes('03 / 被ダメージ・軽減率'),'mitigation section still present');
click('dps-duration','60');
assert.equal(ctx.DBPApp.getState().builds[0].settings.dps.duration,60,'duration saved per build');
change('attackInterval',1.25);
change('manaRegen',3.2);
change('hitsPerCast',2,'select-one');
change('autoNova',false,'checkbox');
assert.equal(ctx.DBPApp.getState().builds[0].settings.dps.attackInterval,1.25);
assert.equal(ctx.DBPApp.getState().builds[0].settings.dps.manaRegen,3.2);
assert.equal(ctx.DBPApp.getState().builds[0].settings.dps.hitsPerCast,2);
assert.equal(ctx.DBPApp.getState().builds[0].settings.dps.autoNova,false);
assert.equal(JSON.parse(store.deskrawl_planner_v01).builds[0].settings.dps.duration,60,'existing save pathway persists settings');
const gameBefore=JSON.stringify(ctx.DBPApp.getState().items);
change('manaRegen','');
assert.equal(ctx.DBPApp.getState().builds[0].settings.dps.manaRegen,undefined,'cleared input reverts to stat');
change('attackInterval','0.001');
assert.equal(ctx.DBPApp.getState().builds[0].settings.dps.attackInterval,1.25,'reject invalid interval');
assert.equal(JSON.stringify(ctx.DBPApp.getState().items),gameBefore,'no equipment changed');
const d=ctx.DBPAIExport.buildReport(ctx.DBPApp.getState(),ctx.DBPApp.getState().builds[0]);
assert.equal(d.configuration.sustainedDpsSettings.duration,60,'ChatGPT export carries sustained DPS scenario');
click('new-build');
click('tab-combat');
assert.equal(ctx.DBPApp.getState().builds.at(-1).settings.dps,undefined,'a new build starts with default DPS inputs');
console.log('PASS: 15/30/60s Stormcaster Mana timeline, CDR/MCR, rank8 Nova, read-only damage reuse, UI, per-build save and AI export');
