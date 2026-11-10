'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const events={},local={};
const app={innerHTML:'',addEventListener:(name,cb)=>events[name]=cb};
const toast={textContent:'',classList:{add(){},remove(){}}};
const document={
 getElementById:(key)=>key==='app'?app:key==='toast'?toast:null,
 createElement:()=>({style:{},files:[],click(){},set href(v){},set download(v){}}),
 body:{appendChild(){}},addEventListener(){}
};
const ctx={window:{},document,localStorage:{getItem:key=>local[key]??null,setItem:(key,v)=>local[key]=v,removeItem:key=>delete local[key]},console,Date,JSON,Math,Set,Number,String,URL,URLSearchParams,Blob,Map,crypto:require('node:crypto').webcrypto,setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true,prompt:()=> 'test',fetch:()=>Promise.reject(Error('disabled')),history:{replaceState(){}},location:{hash:'',pathname:'/',search:'',origin:'file://'}};
ctx.window=ctx;ctx.window.addEventListener=()=>{};vm.createContext(ctx);
for(const path of ['master.js','calc.js','combat.js','stats-view.js','app.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+path,'utf8'),ctx,{filename:path});
const D=ctx.DBP,C=ctx.DBPCalc,get=()=>ctx.DBPApp.getState(),active=()=>get().builds.find(b=>b.id===get().activeBuildId);
const expected={
 str:[1,null],dex:[1,null],int:[1,null],move:[.5,50],maxMana:[2,50],
 critChance:[.1,50],critDamage:[2,50],as:[.4,50],cdr:[.2,50],
 bonusArmor:[1,50],bonusMR:[1,50],bonusHP:[.5,50],regen:[4,50],
 loh:[5,25],potionFind:[5,null]
};
assert.equal(D.paragonStats.length,15);
assert.deepEqual(Object.keys(expected).sort(),Array.from(D.paragonStats,x=>x.key).sort());
assert.equal(D.paragonStats.filter(x=>x.max===50).length,10);
for(const def of D.paragonStats){
 assert.deepEqual([def.per,def.max],expected[def.key],def.key+' game Paragon metadata');
 const n=def.max??99;
 const config={aura:false,paragonPoints:{[def.key]:n}};
 const result=C.calc({items:[]},{loadout:{},settings:config});
 assert(Math.abs((result.sum[def.stat]||0)-n*def.per)<1e-8,'not applied: '+def.key);
 const capped=C.calc({items:[]},{loadout:{},settings:{aura:false,paragonPoints:{[def.key]:n+101}}});
 assert(Math.abs((capped.sum[def.stat]||0)-n*def.per)<1e-8 || def.max===null,'point cap ignored: '+def.key);
}
assert.equal(D.paragonStats.filter(x=>x.max!==null).reduce((sum,d)=>sum+d.max,0),525);
const seed=active();
assert.equal(seed.settings.paragonPoints.maxMana,15,'seed: +30 max mana must be 15 points');
assert.equal(C.calc(get(),seed).sum.mana>=30,true);
events.click({target:{closest:()=>({dataset:{action:'tab-stats'}})}});
events.click({target:{closest:()=>({dataset:{action:'settings'}})}});
assert(app.innerHTML.includes('パラゴンレベル'));
assert(app.innerHTML.includes('data-change="paragonPoint"'));
for(const key of Object.keys(expected))assert(app.innerHTML.includes('data-key="'+key+'"'),key+' missing from UI');
const change=(kind,key,value)=>events.change({target:{id:'',dataset:{change:kind,key},type:'number',value:String(value)}});
change('paragonPoint','maxMana',60);
assert.equal(active().settings.paragonPoints.maxMana,50,'cap maxMana at 50 points');
assert.equal(active().settings.paragonPoints.maxMana*2,100);
change('paragonLevel','',50);
assert.equal(active().settings.paragonLevel,50);
change('paragonPoint','int',1);
assert.equal(active().settings.paragonPoints.int,0,'should reject overspend');
change('paragonPoint','maxMana',40);
change('paragonPoint','int',10);
assert.equal(active().settings.paragonPoints.int,10,'total budget should allow exact match');
assert.equal(D.paragonAllocation(active().settings).total,50);
change('paragonLevel','',49);
assert.equal(active().settings.paragonLevel,50,'reject level lower than spent points');
change('paragonPoint','int',-10);
assert.equal(active().settings.paragonPoints.int,10,'reject negative points');
change('paragonPoint','maxMana',40.2);
assert.equal(active().settings.paragonPoints.maxMana,40,'reject non-integer points');
change('paragonLevel','', '');
assert.equal(active().settings.paragonLevel,null,'unset level should allow unrestricted total');
change('paragonPoint','int',100);
assert.equal(active().settings.paragonPoints.int,100,'int has no cap');
change('paragonPoint','loh',999);
assert.equal(active().settings.paragonPoints.loh,25,'life on hit cap 25 points');
// Preserve legacy saved values until a Paragon field is edited.
const legacyDoc=D.makeSeed(),legacyBuild=legacyDoc.builds[0];
legacyBuild.settings.paragon={bonusMR:12,bonusArmor:20,bonusHP:12.5,maxMana:30,as:4};
legacyBuild.settings.aura=false; // isolate Paragon bonuses from Flame Aura (+80% defensive bonuses)
delete legacyBuild.settings.paragonPoints;
const legacyCalc=C.calc(legacyDoc,legacyBuild);
assert.equal(legacyCalc.sum.mana>=30,true);
assert.equal(legacyCalc.sum.bonusMR,12);
assert.equal(legacyCalc.sum.as>=4,true);
assert.equal(D.paragonAllocation(legacyBuild.settings).points.maxMana,15);
assert.equal(D.paragonAllocation(legacyBuild.settings).points.bonusHP,25);
const newDoc={items:[],builds:[],measurements:[]};
const s={aura:false,paragonPoints:{str:10,dex:150,int:20,bonusArmor:50,bonusMR:50,bonusHP:50}};
const result=C.calc(newDoc,{loadout:{},settings:s});
assert.equal(result.raw.armor,10*1.5,'STR adds raw armor before bonus %');
assert.equal(result.raw.mr,20*1.5,'INT adds MR before bonus %');
assert(Math.abs(result.effective.critRed-150/(150+1500)*100)<1e-7,'DEX critical damage reduction');
assert.equal(result.effective.maxHP,0,'bonus HP alone does not fabricate base health');
assert.equal(C.format('bonusMR',50),'50%');
assert.equal(C.format('bonusArmor',50),'50%');
// Saves remain ordinary schema v1 for cloud sync, JSON backup, and locked builds.
assert.equal(get().schemaVersion,1);
assert.equal(JSON.parse(local.deskrawl_planner_v01).builds[0].settings.paragonPoints.loh,25);
console.log('PASS: 15 Paragon stats, 525 capped points, limits, budget, UI, legacy preservation and stat calculations');
