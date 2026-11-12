'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=file=>fs.readFileSync(__dirname+'/'+file,'utf8');
const ctx={window:null,Math,JSON,Date,Number,String,Set,Map,Array,URL,URLSearchParams,Blob,
 crypto:require('node:crypto').webcrypto,console};ctx.window=ctx;ctx.addEventListener=()=>{};
vm.createContext(ctx);
for(const f of ['master.js','runes.js','pets.js','talents.js','calc.js','input-review.js'])
 vm.runInContext(code(f),ctx,{filename:f});
const R=ctx.DBPInputReview,D=ctx.DBP;
const doc=D.makeSeed(),build=doc.builds[0];
const original=JSON.stringify(doc),initial=R.report(doc,build);
assert.equal(initial.items.length,11);
assert.equal(initial.settings.length,6);
assert.equal(initial.total,17);
assert.equal(initial.complete,0,'historical draft never starts verified');
assert(initial.errors>0,'missing data are detected');
assert.equal(JSON.stringify(doc),original,'report must be read-only');
const gear=doc.items.find(x=>x.id===build.loadout.weapon);
assert.equal(R.confirmItem(doc,build,gear.id),false,'incomplete item cannot be confirmed');
gear.owned=true;gear.upgradeKnown=true;
assert.equal(R.confirmItem(doc,build,gear.id,'2026-11-12T00:00:00Z'),true);
assert.equal(R.report(doc,build).items[0].status,'checked');
assert.equal(doc.inputReviews.items[gear.id].checkedAt,'2026-11-12T00:00:00Z');
assert.equal(doc.schemaVersion,1,'no schema migration');
gear.upgrade=8;
assert.equal(R.report(doc,build).items[0].status,'stale','changed enhancement invalidates verification');
gear.upgradeKnown=false;
assert.equal(R.report(doc,build).items[0].status,'incomplete','unknown enhancement needs review');
gear.upgradeKnown=true;gear.owned=false;
assert.equal(R.confirmItem(doc,build,gear.id),false,'unowned gear cannot confirm as equipped');
gear.owned=true;
assert.equal(R.confirmItem(doc,build,gear.id),true);
const shared=JSON.parse(JSON.stringify(build));shared.id='second';
doc.builds.push(shared);
assert.equal(R.report(doc,shared).items[0].status,'checked','shared item confirmation follows item ID');
gear.gems=[{type:Object.keys(D.gems)[0],tier:7,value:null}];
assert(R.itemProblems(gear,'weapon').some(x=>x.includes('Tier 7')),'unmeasured Tier 7 must be flagged');
assert.equal(R.report(doc,shared).items[0].status,'incomplete','shared item changes affect every build');
gear.gems=[];
assert.equal(R.report(doc,shared).items[0].status,'checked','same verified values restore confirmed status');
assert.equal(R.confirmSetting(doc,build,'paragon'),false,'missing paragon level is not silently accepted');
build.settings.paragonLevel=100;
assert.equal(R.confirmSetting(doc,build,'paragon'),true);
assert.equal(R.report(doc,build).settings.find(x=>x.key==='paragon').status,'checked');
build.settings.paragonPoints={...build.settings.paragonPoints,maxMana:10};
assert.equal(R.report(doc,build).settings.find(x=>x.key==='paragon').status,'stale');
assert.equal(R.confirmSetting(doc,build,'consumables'),true);
assert.equal(R.report(doc,build).settings.find(x=>x.key==='consumables').status,'checked');
build.settings.aura=false;
assert.equal(R.report(doc,build).settings.find(x=>x.key==='consumables').status,'stale');
assert.equal(R.confirmSetting(doc,build,'runes'),false,'empty rune slots remain incomplete');
assert.equal(R.confirmSetting(doc,build,'pet'),false,'unknown pet is not verified');
assert.equal(R.confirmSetting(doc,build,'base'),false,'missing base stats remain unverified');
const html=R.render(doc,build,x=>String(x),x=>x.nickname||x.definitionId);
assert.match(html,/登録照合/);
assert.match(html,/data-action="review-edit-item"/);
assert.match(html,/data-action="review-confirm-settings"/);
assert.match(html,/変更後・再照合待ち/);
console.log('PASS: manual registration review, incompleteness, stale gear/settings, shared items, safe state');

// Integration with the existing editor and event delegation.
const store={},listeners={};
const app={innerHTML:'',addEventListener:(name,cb)=>listeners[name]=cb};
const toast={textContent:'',classList:{add(){},remove(){}}};
const document={getElementById:id=>id==='app'?app:id==='toast'?toast:null,
 createElement:()=>({style:{},click(){}}),body:{appendChild(){}},addEventListener(){}};
Object.assign(ctx,{document,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
 location:{hash:'',pathname:'/deskrawl-build-planner/',search:'',origin:'https://example.invalid'},
 history:{replaceState(){}},setTimeout:()=>0,clearTimeout:()=>{},
 confirm:()=>true,prompt:()=>'保存版',fetch:()=>Promise.reject(Error('disabled'))});
vm.runInContext(code('app.js'),ctx,{filename:'app.js'});
const click=(action,id,value)=>listeners.click({target:{closest:()=>({dataset:{action,id,value}})}});
const change=(kind,id,value,type='select-one')=>listeners.change({target:{
 dataset:{change:kind,id},type,value:String(value),checked:value===true}});
assert.match(app.innerHTML,/data-action="input-review"/);
click('input-review');
assert.match(app.innerHTML,/登録照合/);
const inApp=ctx.DBPApp.getState(),appBuild=inApp.builds[0];
const weaponId=appBuild.loadout.weapon;
click('review-edit-item',null,'weapon');
assert.equal(ctx.DBPApp.getUI().slot,'weapon');
change('owned',weaponId,'yes');
change('upgradeKnown',weaponId,true,'checkbox');
click('input-review');
assert.match(app.innerHTML,/ゲーム画面と照合した/);
click('review-confirm-item',weaponId);
const confirmed=ctx.DBPApp.getState();
assert.equal(confirmed.inputReviews.items[weaponId].checkedAt.length>0,true);
assert.equal(ctx.DBPInputReview.report(confirmed,confirmed.builds[0]).items[0].status,'checked');
click('review-edit-item',null,'weapon');
change('upgrade',weaponId,'8');
const updated=ctx.DBPApp.getState();
assert.equal(updated.items.find(x=>x.id===weaponId).upgradeKnown,false,
 'changing the enhancement stage invalidates its confirmation');
assert.equal(ctx.DBPInputReview.report(updated,updated.builds[0]).items[0].status,'incomplete');
assert.equal(updated.schemaVersion,1);
console.log('PASS: dashboard navigation, editor ownership, enhancement invalidation, persisted confirmations');
