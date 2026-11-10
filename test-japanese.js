'use strict';
/* Display translations must never change gear IDs, equipped modifiers,
 * computed combat damage, talent point allocations or persisted cloud JSON.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=file=>fs.readFileSync(__dirname+'/'+file,'utf8');
const c={window:null,console,Math,Date,JSON,Set,Map,Number,String,Array,URL,URLSearchParams,Blob,
 crypto:require('node:crypto').webcrypto};c.window=c;vm.createContext(c);
for(const path of ['master.js','runes.js','pets.js','talents.js','calc.js','combat.js','cloud-config.js','pet-ui.js','talent-ui.js','combat-ui.js','stats-view.js'])
 vm.runInContext(source(path),c,{filename:path});
const D=c.DBP,C=c.DBPCalc,B=c.DBPCombat,T=c.DBPTalents,R=c.DBPRunes,P=c.DBPPets,SV=c.DBPStatsView;
const seed=D.makeSeed(),build=seed.builds[0],saved=JSON.stringify(seed);
const before=C.calc(seed,build);
const beforeNumeric=JSON.stringify({sum:before.sum,raw:before.raw,effective:before.effective});
const beforeFight=B.attack(before,build.settings,{abilityId:'lightningStorm'}).expected;
const ids=JSON.stringify({
 definitions:D.definitions.map(d=>[d.id,d.slot,d.rarity,d.fixed]),
 minions:P.minions.map(p=>[p.id,p.rarity,p.passives.map(a=>[a.id,a.stat,a.base,a.max])]),
 skill:Object.entries(B.abilities).map(([k,a])=>[k,a.slice(1)]),
 talents:T.defs.map(d=>[d.id,d.max,d.row,d.cap,d.effects.map(e=>[e.stat,e.per])]),
 runes:Object.values(R.catalog).map(r=>[r.id,r.rarity,r.skill,r.stats]),
 paragon:D.paragonStats.map(p=>[p.key,p.stat,p.per,p.max])
});
vm.runInContext(source('jp-display.js'),c,{filename:'jp-display.js'});
const after=C.calc(seed,build);
assert.equal(JSON.stringify({sum:after.sum,raw:after.raw,effective:after.effective}),beforeNumeric,'pure display translations preserve all computed stats');
assert.equal(B.attack(after,build.settings,{abilityId:'lightningStorm'}).expected,beforeFight,'damage model is unchanged');
assert.equal(JSON.stringify(seed),saved,'saved schema and seed data must not be rewritten');
assert.equal(JSON.stringify({
 definitions:D.definitions.map(d=>[d.id,d.slot,d.rarity,d.fixed]),
 minions:P.minions.map(p=>[p.id,p.rarity,p.passives.map(a=>[a.id,a.stat,a.base,a.max])]),
 skill:Object.entries(B.abilities).map(([k,a])=>[k,a.slice(1)]),
 talents:T.defs.map(d=>[d.id,d.max,d.row,d.cap,d.effects.map(e=>[e.stat,e.per])]),
 runes:Object.values(R.catalog).map(r=>[r.id,r.rarity,r.skill,r.stats]),
 paragon:D.paragonStats.map(p=>[p.key,p.stat,p.per,p.max])
}),ids,'all machine keys, modifiers, rarities and numerical coefficients remain unchanged');
const required={mcr:'マナコスト削減',cdr:'クールダウン短縮',mr:'魔法耐性',
 critChance:'クリティカル率',critDamage:'クリティカルダメージ',critRed:'クリティカルダメージ軽減',
 as:'攻撃速度ボーナス',move:'ボーナス移動速度',loh:'命中時ライフ回復',armor:'アーマー'};
for(const [key,name] of Object.entries(required))assert.equal(C.labels[key],name,'translated status '+key);
assert.equal(D.definitions.find(x=>x.id==='iron').name,'鉄の暴君の兜');
assert.equal(D.definitions.find(x=>x.id==='sage').name,'古の賢者の遺骨');
assert.equal(D.definitions.find(x=>x.id==='bottomless').name,'底なしポーションベルト');
assert.equal(D.definitions.find(x=>x.id==='gauntlets').name,'ストームコーラーのガントレット');
assert(B.skillOptions.some(([id,label])=>id==='lightningStorm'&&label.includes('ライトニングストーム')));
assert(B.skillOptions.some(([id,label])=>id==='flameLightningFire'&&label==='炎雷（炎成分）'));
assert(B.skillOptions.some(([id,label])=>id==='flameLightningLightning'&&label==='炎雷（雷成分）'));
assert.equal(T.byId.arcaneInsight.name,'秘術の洞察');
assert.equal(T.byId.staticCharge.name,'静電チャージ');
assert.equal(T.byId.elementalFury.name,'精霊の怒り');
assert.equal(T.byId.arcaneExposure.name,'魔力露出');
assert.equal(R.sets.stormcaller.name,'嵐呼び');
assert.equal(R.selectable.length,32);
assert(P.minions.length===68&&P.minions.every(p=>!/[A-Za-z]{3,}/.test(p.name)),'all 68 minion names localized');
assert.equal(P.gearTypes.find(p=>p.id==='fine-saddle').slots,3,'pet gear slot counts unchanged');
assert.equal(c.DBPJP.rarity('Divine'),'ディバイン');
assert.equal(c.DBPJP.rarity('Black Mist'),'ブラックミスト');
assert(C.labels.mcr!=='MCR'&&C.labels.cdr!=='CDR');
assert(SV.comparisonKeys(build.settings).length===8,'existing comparison selections retained');
// Exercise the actual five-tab app with the localized data, not just its glossary.
const events={},store={deskrawl_planner_v01:saved},app={innerHTML:'',addEventListener:(name,fn)=>events[name]=fn};
const toast={textContent:'',classList:{add(){},remove(){}}};
const document={getElementById:id=>id==='app'?app:id==='toast'?toast:null,
 createElement:()=>({style:{},files:[],click(){}}),body:{appendChild(){}},addEventListener(){}};
Object.assign(c,{document,localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
 setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true,prompt:()=> 'test',fetch:()=>Promise.reject(Error('offline')),
 location:{hash:'',pathname:'/',search:'',origin:'file://'},history:{replaceState(){}}});
c.window.addEventListener=()=>{};
vm.runInContext(source('app.js'),c,{filename:'app.js'});
const click=action=>events.click({target:{closest:()=>({dataset:{action}})}});
click('tab-equipment');
assert(app.innerHTML.includes('鉄の暴君の兜')&&app.innerHTML.includes('古の賢者の遺骨'));
assert(app.innerHTML.includes('>主要OP<')&&app.innerHTML.includes('>補助OP<'));
click('tab-stats');
assert(app.innerHTML.includes('マナコスト削減（上限：85%）'));
assert(app.innerHTML.includes('クールダウン短縮（上限：80%）'));
assert(app.innerHTML.includes('>魔法耐性<'));
assert(!app.innerHTML.includes('>MCR<')&&!app.innerHTML.includes('>CDR<'));
click('tab-talent');
assert(app.innerHTML.includes('秘術の洞察')&&app.innerHTML.includes('精霊の怒り'));
click('tab-pet');
assert(app.innerHTML.includes('トビウオ王')&&app.innerHTML.includes('怒濤の蟹王'));
click('tab-combat');
assert(app.innerHTML.includes('ライトニングストーム')&&app.innerHTML.includes('鉄の暴君の兜'));
assert(app.innerHTML.includes('アーマー・魔法耐性による軽減率'));
assert.equal(c.DBPApp.getState().schemaVersion,1,'cloud schema is unchanged');
assert.equal(JSON.stringify(c.DBPApp.getState()),saved,'opening every tab does not mutate saved build');
console.log('PASS: Japanese-first UI across all five tabs, complete base status labels, 41 talents, 68 minions, 32 runes, invariant calculations and saved cloud schema');
