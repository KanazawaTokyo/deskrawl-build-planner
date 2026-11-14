'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=path=>fs.readFileSync(__dirname+'/'+path,'utf8');
const ctx={window:null,JSON,Number,String,Date,Array,Map,Set,URL,URLSearchParams,Blob,console,Math,
 crypto:require('node:crypto').webcrypto};
ctx.window=ctx;ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const file of ['master.js','runes.js','pets.js','talents.js','calc.js','combat.js','stats-view.js',
 'combat-rules-v2.js','combat-simulation-v2.js','simulation-lab-ui.js'])vm.runInContext(code(file),ctx,{filename:file});
const D=ctx.DBP,Rules=ctx.DBPSimulationRules,Sim=ctx.DBPSimulationV2,UI=ctx.DBPSimulationLabUI;
const stats={effective:{weaponDamage:100,weaponSpeed:1,damage:0,int:0,critChance:0,critDamage:0,dodge:0,
 lightning:0,cold:0,strongAttack:0,basicAttack:0,allDamage:0,mana:200,mcr:0,cdr:80,manaRegen:0,manaKill:0,
 armor:0,mr:0,allDR:0,maxHP:1000},pending:[],sourceFlags:{runes:true}};
const settings={base:{int:0,critChance:0,critDamage:0,dodge:0},combat:{abilityId:'lightningStorm'}};
const raw={mode:'single',duration:10,enemyHP:1000,slots:['electrocute','lightningStorm','none','none']};
const sim=(opts={},cfg=settings,fx=stats,effect={items:{}})=>Sim.simulate(fx,cfg,effect,{...raw,...opts});
assert.equal(Rules.version,'simulation-rules-1.1.11a-v2');
assert.deepEqual(JSON.parse(JSON.stringify(Rules.defaults.slots)),
 ['electrocute','lightningStorm','iceNova','flameAura'],
 'default Sorcerer 4-slot rotation matches the confirmed screenshot');
assert.equal(Rules.skills.flameAura.shape,'self');
assert.equal(Rules.skills.flameAura.baseCooldown,21);
assert.equal(Rules.flameAuraBonuses(settings,stats).critDamage,140);
assert.equal(Rules.flameAuraBonuses({skillRanks:{flameAura:1}},stats).critDamage,50);
assert.equal(Rules.flameAuraBonuses({skillRanks:{flameAura:10},
 runeSlots:['grand:flameAura']},stats).critDamage,200,'rune skill levels change aura critical damage');

assert.deepEqual(JSON.parse(JSON.stringify(Rules.normalize({}).issues)),[]);
assert(Rules.normalize({mode:'fish'}).issues.length);
assert(Rules.normalize({enemyHP:'Infinity'}).issues.length);
assert(Rules.normalize({waveCount:-1}).issues.length);
assert(Rules.normalize({slots:['none','lightningStorm','iceNova','none']}).issues.length);
assert(Rules.normalize({slots:['electrocute','iceNova','lightningStorm','none']}).issues.length);
assert(Rules.normalize({mode:'waves',waveCount:1}).issues.length);
assert(Rules.normalize({mode:'waves',waveCount:4}).issues.length===0);
assert(Rules.normalize({observedTime:'116'}).config.observedTime===116);
assert(Rules.normalize({randomCrit:false}).config.randomCrit===false);
assert.equal(sim({enemyHP:null}).ok,false,'must reject unknown enemy HP');
const first=sim();
assert(first.ok,first.reason);
assert.equal(first.outcome,'clear');
assert.equal(first.wavesCleared,1);
assert.equal(first.wavesSpawned,1);
assert(first.skillCasts.lightningStorm>=1);
assert(first.hitsBySource.storm>=1);
assert(first.appliedDamage<=1000+1e-6,'overkill never counted as applied');
assert(first.totalDamage>=first.appliedDamage);
const actualSlots=[...Rules.actualStormRotation];
const auraScene={mode:'single',duration:12,enemyHP:1e11,slots:actualSlots};
const auraNoCDR=sim(auraScene,settings,
 {...stats,effective:{...stats.effective,cdr:0}});
assert(auraNoCDR.ok,auraNoCDR.reason);
assert.equal(auraNoCDR.events.find(e=>e.type==='cast').id,'flameAura',
 'self buff should be preferred over Nova/Storm when a combat wave starts');
assert.equal(auraNoCDR.auraCasts,1,'21s base cooldown prevents recast in a 12s fight');
assert(Math.abs(auraNoCDR.auraUptimeSeconds-5)<1e-6,'5 second aura must expire');
assert(Math.abs(auraNoCDR.auraUptimePercent-41.7)<0.2,'uptime is measured from actual cast');
assert.equal(auraNoCDR.events.find(e=>e.type==='flame-aura').critDamage,140);
const auraNoCombat=sim({...auraScene,duration:2,initialDelay:4});
assert.equal(auraNoCombat.auraCasts,0,'aura cannot cast before enemies arrive');
const auraStats={...stats,effective:{...stats.effective,cdr:0,mana:50,
 critChance:45,critDamage:150,manaRegen:0}};
const auraHit=sim({duration:1,enemyHP:1e11,slots:actualSlots},settings,auraStats);
const plainHit=sim({duration:1,enemyHP:1e11,
 slots:['electrocute','lightningStorm','none','none']},settings,auraStats);
assert(auraHit.damageBySource.storm>plainHit.damageBySource.storm,
 'timed aura must increase Storm expected critical damage without becoming a permanent base stat');
const statusAfter=sim({duration:2,enemyHP:1e11,slots:actualSlots},
 settings,{...stats,effective:{...stats.effective,critChance:83.2}});
assert(statusAfter.ok && statusAfter.auraCasts>=1);
const ranked=sim({slots:['electrocute','lightningStorm','iceNova','lightningCloud'],enemyHP:1e9,duration:4});
assert(ranked.ok,ranked.reason);
assert.equal(ranked.events.find(x=>x.type==='cast').id,'lightningCloud',
 'slot 4 must be selected before 3/2/1');
assert(ranked.skillCasts.iceNova>=1,'nova should cast later when in range');
const basic=sim({initialMana:5,enemyHP:1e8,duration:5});
assert(basic.ok,basic.reason);
assert(basic.skillCasts.electrocute>0,'basic recovers Mana when strong insufficient');
assert(basic.skillCasts.lightningStorm>0,'after sufficient basic attacks a strong attack is possible');
assert(basic.manaRestored>0);
const waves=sim({mode:'waves',waveCount:3,enemiesPerWave:1,spawnGap:2,enemyHP:1,duration:20});
assert(waves.ok,waves.reason);
assert.equal(waves.outcome,'clear');
assert.equal(waves.wavesCleared,3);
assert.equal(waves.wavesSpawned,3);
assert(waves.finishTime>=4,'wave delays must contribute to elapsed time');
assert(waves.waitSeconds>=4-1e-6,'waiting time is separately tracked');
const spread=sim({mode:'pack',enemiesPerWave:3,enemyHP:1e9,stormTargetMode:'spread',duration:3});
assert(spread.ok,spread.reason);
assert(spread.stormHits>=3);
const withSet4={...settings,runeSlots:Array.from({length:4},(_,i)=>'set:stormcaller:'+(i+1))};
const splash=sim({mode:'pack',enemiesPerWave:3,enemyHP:1e9,duration:3},withSet4);
assert(splash.damageBySource.splash>0,'4 piece should hit neighbors');
assert.equal(splash.damageBySource.ball,0,'no 6 piece ball on 4 piece set');
const withSet6={...settings,runeSlots:Array.from({length:6},(_,i)=>'set:stormcaller:'+(i+1))};
const ball=sim({mode:'pack',enemiesPerWave:3,enemyHP:1e9,duration:5},withSet6);
assert(ball.ok,ball.reason);
assert(ball.damageBySource.ball>0,'6 piece lightning balls contribute damage');
assert(ball.ballPulses>0);
assert(ball.damageBySource.storm>0);
const noSet=sim({mode:'pack',enemiesPerWave:3,enemyHP:1e9,duration:5},settings);
assert.equal(noSet.damageBySource.ball,0,'no 6 piece must never spawn balls');
const ko=sim({mode:'pack',enemiesPerWave:3,enemyHP:1,duration:4},settings,
 {...stats,effective:{...stats.effective,manaKill:42}});
assert(ko.manaFromKills>0,'kill restores mana');
const frost=sim({slots:['electrocute','frostBeam','none','none'],enemyHP:1e10,duration:5});
assert(frost.ok,frost.reason);
assert(frost.beamTicks>0);
assert(frost.damageBySource.beam>0);
const zero4={...settings,runeSlots:Array.from({length:4},(_,i)=>'set:absoluteZero:'+(i+1))};
const frost4=sim({slots:['electrocute','frostBeam','none','none'],enemyHP:1e10,duration:5},zero4);
assert(frost4.beamTicks>frost.beamTicks,'absolute zero 4 increases tick frequency');
const zero6={...settings,runeSlots:Array.from({length:6},(_,i)=>'set:absoluteZero:'+(i+1))};
const frost6=sim({slots:['electrocute','frostBeam','none','none'],enemyHP:1e10,duration:5},zero6);
assert(frost6.damageBySource.beam>frost4.damageBySource.beam,'absolute zero 6 ramps damage');
const critStats={...stats,effective:{...stats.effective,critChance:85,critDamage:0}};
const beamScenario={slots:['electrocute','frostBeam','none','none'],enemyHP:1e10,duration:3.5};
const withoutRime=sim(beamScenario,settings,critStats,{items:{}});
const withRime=sim(beamScenario,settings,critStats,{items:{gloves:'bm-patch-rimebound-grasp'}});
assert(withRime.damageBySource.beam>withoutRime.damageBySource.beam,
 'Rimebound Grasp channel time must grant escalating critical damage');
assert(withRime.manaSpent>withoutRime.manaSpent,'Rimebound Grasp extra Mana is charged per tick');
const cappedKill=sim({mode:'pack',enemiesPerWave:3,enemyHP:1,duration:4},
 settings,{...stats,effective:{...stats.effective,manaKill:200}});
assert(cappedKill.manaFromKills<=200,'mana-on-kill accounting must never exceed mana headroom');
const rngA=sim({enemyHP:1e10,duration:3,randomCrit:true,seed:13},
 settings,{...stats,effective:{...stats.effective,critChance:50,critDamage:200}});
const rngB=sim({enemyHP:1e10,duration:3,randomCrit:true,seed:13},
 settings,{...stats,effective:{...stats.effective,critChance:50,critDamage:200}});
assert.deepEqual(JSON.parse(JSON.stringify(rngA)),JSON.parse(JSON.stringify(rngB)),'same seed replays');
const old=JSON.stringify(D.makeSeed()),doc=D.makeSeed(),build=doc.builds[0],before=JSON.stringify(doc);
const real=Sim.evaluate(doc,build,{enemyHP:1e9,mode:'single',duration:10});
assert(real&&typeof real.ok==='boolean');
assert.equal(before,JSON.stringify(doc),'evaluate is read-only');
const variant=UI.alternate(doc,build,'runes','');
assert(variant);
assert.equal(variant.settings.runeSlots.length,6);
assert.notEqual(variant.settings.runeSlots,build.settings.runeSlots);
assert.equal(before,JSON.stringify(doc),'variant does not modify actual inventory or build');
const initialHtml=UI.render({state:doc,build,compareMode:'runes'});
assert.match(initialHtml,/戦闘研究/);
assert.match(initialHtml,/data-change="lab"/);
assert.match(initialHtml,/通常敵のHP/);
assert.match(initialHtml,/未校正/);
assert.match(initialHtml,/フレイムオーラ/);
assert.match(initialHtml,/現在の設定に反映済み/);
const previousRotation={...build,settings:{...build.settings,
 lab:{slots:['electrocute','lightningStorm','iceNova','none']}}};
const previousHtml=UI.render({state:doc,build:previousRotation,compareMode:'runes'});
assert.match(previousHtml,/lab-apply-known-rotation/,'existing saved scenarios offer an opt-in migration');
assert.equal(previousRotation.settings.lab.slots[3],'none','render never silently changes a saved scenario');

assert.match(initialHtml,/敵HPが未入力/);
const populatedHtml=UI.render({state:doc,build:{...build,settings:{...build.settings,
 lab:{mode:'single',duration:10,enemyHP:1000}}},compareMode:'runes'});
assert.match(populatedHtml,/クリア|制限時間終了/);
const fakeDoc=JSON.parse(JSON.stringify(doc));
const another=JSON.parse(JSON.stringify(build));another.id='new-build-123';another.name='対抗ビルド';
fakeDoc.builds.push(another);
const compared=Sim.compare(fakeDoc,build,another,{mode:'single',enemyHP:1e9,duration:5});
assert(compared.comparable);
const hypothetical=UI.alternate(doc,build,'runes','');
const sensitivity=Sim.sweep(doc,build,hypothetical,{mode:'single',enemyHP:1e8,duration:7});
assert(sensitivity.ok,sensitivity.reason);
assert.equal(sensitivity.rows.length,5);
assert.equal(sensitivity.rows[0].enemyHP,2.5e7);
assert.equal(sensitivity.rows.at(-1).enemyHP,4e8);
assert.equal(Sim.sweep(doc,build,hypothetical,{enemyHP:null}).ok,false);
assert.equal(Sim.sweep(doc,build,null,{enemyHP:1e8}).ok,false);
assert.equal(JSON.stringify(doc),before,'sensitivity cannot change inventory');

const trials=Sim.runSeeds(doc,build,{mode:'single',enemyHP:1e10,duration:5},[13,19,22]);
assert(trials.ok);
assert.equal(trials.trials,3);
console.log('PASS: multi-entity / waves / 4-slot rotation / Storm 4+6 / Frost 4+6 / mana-on-kill / seeded trials / coverage');

// Browser-like app integration: editing lab controls does not change inventory.
const ev={},store={},app={innerHTML:'',addEventListener:(event,fn)=>ev[event]=fn};
const toast={textContent:'',classList:{add(){},remove(){}}};
const document={getElementById:id=>id==='app'?app:id==='toast'?toast:null,
 createElement:()=>({style:{},click(){}}),body:{appendChild(){}},addEventListener(){}};
Object.assign(ctx,{document,localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
 setTimeout:()=>0,clearTimeout:()=>{},location:{hash:'',pathname:'/',origin:'http://example.invalid',search:''},
 history:{replaceState(){}},confirm:()=>true,prompt:()=>'test',fetch:()=>Promise.reject(Error('offline'))});
for(const file of ['combat-engine.js','engine-ui.js','app.js'])vm.runInContext(code(file),ctx,{filename:file});
const click=(action)=>ev.click({target:{closest:()=>({dataset:{action}})}});
const change=(key,value)=>ev.change({target:{dataset:{change:'lab',key},value:String(value),type:'select-one'}});
click('tab-engine');
assert.match(app.innerHTML,/COMBAT LAB V2/);
assert.match(app.innerHTML,/複数敵・Wave研究/);
const oldGear=JSON.stringify(ctx.DBPApp.getState().items);
change('mode','waves');
change('enemyHP','100000000');
change('waveCount','6');
change('enemiesPerWave','5');
change('slot2','lightningCloud');
change('observedTime','116');
change('slot3','none');
assert.match(app.innerHTML,/lab-apply-known-rotation/);
click('lab-apply-known-rotation');
assert.deepEqual(JSON.parse(JSON.stringify(ctx.DBPApp.getState().builds[0].settings.lab.slots)),
 ['electrocute','lightningStorm','iceNova','flameAura']);

let saved=ctx.DBPApp.getState();
assert.equal(saved.builds[0].settings.lab.mode,'waves');
assert.equal(saved.builds[0].settings.lab.waveCount,6);
assert.equal(saved.builds[0].settings.lab.enemiesPerWave,5);
assert.equal(saved.builds[0].settings.lab.observedTime,116);
assert.equal(saved.builds[0].settings.lab.slots[2],'iceNova');
assert.equal(saved.builds[0].settings.lab.slots[3],'flameAura');
assert.equal(JSON.stringify(saved.items),oldGear);
assert.equal(JSON.parse(store.deskrawl_planner_v01).builds[0].settings.lab.enemyHP,1e8);
click('lab-run-trials');
assert(ctx.DBPApp.getUI().labTrials,'seeded trial result must be present');
click('lab-run-sweep');
assert(ctx.DBPApp.getUI().labSweep?.ok,'HP sweep must be available from the user interface');
assert.match(app.innerHTML,/HP倍率/);
change('enemyHP','200000000');
assert.equal(ctx.DBPApp.getUI().labTrials,null,'scenario edits invalidate previous trials');
assert.equal(ctx.DBPApp.getUI().labSweep,null,'scenario edits invalidate previous HP sweeps');
click('lab-view-legacy');
assert.match(app.innerHTML,/COMBAT LAB v1/);
click('lab-view-new');
assert.match(app.innerHTML,/COMBAT LAB V2/);
console.log('PASS: app lab navigation, four-slot controls, scenario persistence, reproducible trials and legacy fallback');