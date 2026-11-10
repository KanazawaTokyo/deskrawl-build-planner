const fs=require('fs'), vm=require('vm'),assert=require('assert');
const local={};const events={};const app={innerHTML:'',addEventListener:(e,fn)=>events[e]=fn};
const fakeFileInput={style:{},files:[],click(){},value:''};
const document={getElementById:(id)=>id==='app'?app:id==='toast'?toast:null,createElement:(tag)=>({style:{},click(){},set href(a){},set download(b){}}),body:{appendChild(){}},addEventListener(){}};
const toast={textContent:'',classList:{add(){},remove(){}}};
const ctx={window:{},document,localStorage:{getItem:k=>local[k]||null,setItem:(k,v)=>local[k]=v,removeItem:k=>delete local[k]},console,Date,JSON,Math,Set,Number,String,URL,URLSearchParams,Blob,Map,crypto:require('crypto').webcrypto,setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true,prompt:()=> 'テスト',fetch:()=>Promise.reject(Error('disabled')),history:{replaceState(){}},location:{hash:'',pathname:'/',search:'',origin:'file://'}};
ctx.window=ctx;ctx.window.addEventListener=()=>{};vm.createContext(ctx);
for(const file of ['master.js','calc.js','combat.js','stats-view.js','app.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),ctx,{filename:file});
let state=ctx.DBPApp.getState();assert.strictEqual(state.items.length,12);assert.strictEqual(state.builds.length,1);assert(app.innerHTML.includes('装備保管庫'));assert(app.innerHTML.includes('The Grandmother'));
const b=state.builds[0];let chest=state.items.find(x=>x.id===b.loadout.chest);let mr=ctx.DBPCalc.calc(state,b);assert(mr.raw.mr>1000);assert.strictEqual(mr.sum.weaponDamage,430);assert.strictEqual(mr.sum.weaponSpeed,0.8);assert.strictEqual(mr.sum.weaponDps,344);assert(mr.sum.critChance>40);assert.strictEqual(mr.sum.abilityLevels,10);assert(!mr.pending.some(x=>x.includes('Divine固定数値')));
// create candidate, switch compare & equip without deleting old item.
events.click({target:{closest:()=>({dataset:{action:'new-item'}})}});state=ctx.DBPApp.getState();assert(state.items.length===13);let cand=state.items.at(-1);assert.strictEqual(cand.slot,'chest');
events.click({target:{closest:()=>({dataset:{action:'equip',id:cand.id}})}});state=ctx.DBPApp.getState();assert.strictEqual(state.builds[0].loadout.chest,cand.id);assert(state.items.find(x=>x.id===chest.id));
events.click({target:{closest:()=>({dataset:{action:'duplicate-build'}})}});state=ctx.DBPApp.getState();assert.strictEqual(state.builds.length,2);assert.strictEqual(state.builds[0].loadout.chest,state.builds[1].loadout.chest);
events.click({target:{closest:()=>({dataset:{action:'tab-stats'}})}});assert(app.innerHTML.includes('重要ステータス'));
console.log('PASS: fixed Divine, upgrade calculation, candidate storage, explicit equip, multiple builds, stats tab');
