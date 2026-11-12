'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const saved={},ev={};
let nextPrompt='My locked set',confirmNext=true;
const toast={textContent:'',classList:{add(){},remove(){}}};
const app={innerHTML:'',addEventListener:(name,fn)=>ev[name]=fn};
const doc={
 getElementById:id=>id==='app'?app:id==='toast'?toast:null,
 createElement:()=>({style:{},click(){}}),
 body:{appendChild(){}},addEventListener(){}
};
const ctx={
 document:doc,window:null,localStorage:{
  getItem:k=>saved[k]||null,setItem:(k,v)=>saved[k]=v,removeItem:k=>delete saved[k]
 },Date,JSON,Math,Set,Number,String,URL,URLSearchParams,Blob,Map,
 crypto:require('node:crypto').webcrypto,console,
 location:{hash:'',pathname:'/deskrawl-build-planner/',search:'',origin:'https://kanazawatokyo.github.io'},
 history:{replaceState(){}},setTimeout:()=>0,clearTimeout:()=>{},
 confirm:()=>confirmNext,prompt:()=>nextPrompt,fetch:()=>Promise.reject(Error('disabled'))
};
ctx.window=ctx;ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const file of ['master.js','calc.js','combat.js','stats-view.js','app.js'])
 vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),ctx,{filename:file});
const click=(action,id)=>ev.click({target:{closest:()=>({dataset:{action,id}})}});
const change=(kind,id,val)=>ev.change({
 target:{dataset:{change:kind,id},type:'checkbox',checked:val,value:String(val)}
});
const select=(id,value)=>ev.change({target:{id,value,dataset:{}}});

let state=ctx.DBPApp.getState(),originalBuild=state.builds[0];
assert.equal(state.lockedSets,undefined,'old storage remains compatible');
assert.match(app.innerHTML,/data-action="saved-sets-open"/);
assert.match(app.innerHTML,/data-action="new-build"/);
assert.match(app.innerHTML,/class="profile-more"/);
assert(!app.innerHTML.includes('class="saved-set-strip"'),'no second permanent toolbar');
assert(!app.innerHTML.includes('一式スナップショット'),'legacy strip title is removed');
assert.match(app.innerHTML,/保存版 <span class="build-version-count">0<\/span>/);
click('saved-sets-open');
assert.equal(ctx.DBPApp.getUI().modal,'saved-sets');
assert.match(app.innerHTML,/保存版・復元/);
assert.match(app.innerHTML,/自動変更履歴ではありません/);
assert.match(app.innerHTML,/保存版はありません/);
assert(!app.innerHTML.includes('data-action="save-locked-set" disabled'),'11 equipped pieces can be saved');
click('save-locked-set');
state=ctx.DBPApp.getState();
assert.equal(state.lockedSets.length,1);
assert(Object.values(state.lockedSets[0].gear).every(x=>x.locked!==true),'saving does not force equipment locks');
const first=state.lockedSets[0],snapshot=JSON.stringify(first),beforeItems=state.items.length;
assert.equal(Object.keys(first.gear).length,11);
assert.equal(JSON.parse(saved.deskrawl_planner_v01).lockedSets.length,1,'snapshot persists in existing JSON schema');
assert.match(app.innerHTML,/data-action="load-locked-set"/);
assert.match(app.innerHTML,/My locked set/);
assert.match(app.innerHTML,/1 \/ 60件/);
assert.match(app.innerHTML,/保存した装備11部位を確認/);
confirmNext=false;
click('load-locked-set');
assert.equal(ctx.DBPApp.getState().builds.length,1,'canceling restore is safe');
confirmNext=true;
click('load-locked-set');
state=ctx.DBPApp.getState();
assert.equal(ctx.DBPApp.getUI().modal,'','restore dismisses history dialog');
assert.equal(state.builds.length,2);
assert.equal(state.items.length,beforeItems+11);
assert.equal(state.builds[0].id,originalBuild.id,'original build preserved');
const restored=state.builds[1];
assert.equal(state.activeBuildId,restored.id);
assert(Object.values(restored.loadout).every(id=>state.items.find(x=>x.id===id)?.locked!==true),
 'restored items are editable');
assert(Object.values(restored.loadout).every(id=>state.items.find(x=>x.id===id)?.owned===null),
 'virtual copies do not claim extra ownership');
assert(!Object.values(restored.loadout).some(id=>Object.values(originalBuild.loadout).includes(id)),
 'restored gear has independent IDs');
assert.equal(JSON.stringify(state.lockedSets[0]),snapshot,'snapshot stays immutable');
const restoredWeapon=restored.loadout.weapon;
change('locked',restoredWeapon,true);
state=ctx.DBPApp.getState();
assert.equal(state.items.find(x=>x.id===restoredWeapon).locked,true,'restored gear is independently lockable');
assert.equal(JSON.stringify(state.lockedSets[0]),snapshot,'locking restored gear does not mutate saved version');
click('saved-sets-open');
click('load-locked-set');
state=ctx.DBPApp.getState();
assert.equal(state.builds.length,3);
assert.notEqual(state.builds[2].loadout.weapon,restoredWeapon);

// Multiple old/new saved versions remain explicitly selectable inside the modal.
nextPrompt='Second version';
click('saved-sets-open');
click('save-locked-set');
state=ctx.DBPApp.getState();
assert.equal(state.lockedSets.length,2);
assert.match(app.innerHTML,/Second version/);
select('lockedSetSelect',first.id);
assert.equal(ctx.DBPApp.getUI().selectedSetId,first.id);
assert.match(app.innerHTML,/My locked set/);
click('load-locked-set');
state=ctx.DBPApp.getState();
assert.equal(state.builds.length,4);
assert.equal(JSON.stringify(state.lockedSets[0]),snapshot);
click('saved-sets-open');
click('delete-locked-set');
state=ctx.DBPApp.getState();
assert.equal(state.lockedSets.length,1);
assert.equal(state.builds.length,4);
click('delete-locked-set');
state=ctx.DBPApp.getState();
assert.equal(state.lockedSets.length,0);
assert.match(app.innerHTML,/保存版はありません/);
assert.match(app.innerHTML,/保存版 <span class="build-version-count">0<\/span>/);
click('modal-close');
assert(!app.innerHTML.includes('class="saved-set-strip"'));
assert.match(app.innerHTML,/data-action="input-review"/,'secondary actions remain available under More');
assert.equal(state.schemaVersion,1);
console.log('PASS: compact build toolbar, saved-version dialog, old snapshots, independent restore, selection, deletion and cloud schema');
