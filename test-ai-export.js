'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=file=>fs.readFileSync(__dirname+'/'+file,'utf8');
const ctx={window:null,console,Math,Date,JSON,Set,Map,Number,String,Array,URL,URLSearchParams,Blob,
 crypto:require('node:crypto').webcrypto};ctx.window=ctx;ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const file of ['master.js','runes.js','pets.js','talents.js','calc.js','combat.js','cloud-config.js',
 'pet-ui.js','talent-ui.js','combat-ui.js','stats-view.js','jp-display.js','ai-export.js'])
 vm.runInContext(code(file),ctx,{filename:file});
const D=ctx.DBP,E=ctx.DBPAIExport,reportOf=E.buildReport;
const state=D.makeSeed(),build=state.builds[0];
const before=JSON.stringify(state),stamp='2026-11-11T00:00:00.000Z';
const initial=reportOf(state,build,stamp),json=E.toJSON(initial),parsed=JSON.parse(json);
assert.equal(JSON.stringify(state),before,'AI report is read-only: no state mutations');
assert.equal(parsed.format,'deskrawl-chatgpt-build-analysis');
assert.equal(parsed.version,1);
assert.equal(parsed.exportedAt,stamp);
assert.equal(parsed.buildName,build.name);
assert.equal(parsed.equipment.length,11,'all eleven equipped slots exported');
assert.equal(parsed.configuration.runes.slots.length,6,'six rune slots retained including empty slots');
assert.equal(parsed.configuration.talents.spent,70);
assert.equal(parsed.configuration.talents.allocations.length,12);
assert.equal(parsed.configuration.paragon.points.maxMana,15);
assert.equal(parsed.configuration.paragon.effects[0].bonus,30);
assert.equal(parsed.configuration.auraEnabled,true);
assert.equal(parsed.configuration.combatScenario.elementalStacks,5);
assert.equal(parsed.calculated.caps.critChance,85);
assert.equal(parsed.calculated.withEnabledEffects.critChance.cap,85);
assert(parsed.calculated.equipmentOnly.lightning,'unbuffed stats present');
assert(parsed.calculated.withEnabledEffects.lightning,'buffed stats present');
assert(parsed.calculated.sourceBreakdown.lightning.length>0,'stat provenance is included');
assert(parsed.calculated.unverifiedOrMissing.some(s=>s.includes('強化段階未確認')),
 'unknown upgrades remain clearly flagged');
assert(parsed.equipment.find(x=>x.slot==='head').fixedAndUnique.length>=4);
assert(parsed.equipment.some(x=>x.primaryAffixes.length===4),'all four primary OPs included');
assert(parsed.equipment.some(x=>x.secondaryAffix),'secondary OP included');
assert(json.includes('実測値')||json.includes('confidence'),'export explains confidence of values');
assert(E.toPrompt(initial).includes('```json')&&E.toPrompt(initial).includes('Deskrawl Build Planner'));
assert.equal(E.filename(initial),'Deskrawl_ChatGPT_Build_2026-11-11.json');
const crit=parsed.calculated.withEnabledEffects.critChance;
assert(crit.raw>=crit.effective,'raw values retained for excess');
assert.equal(crit.overCap,Math.max(0,Math.round((crit.raw-85)*1e6)/1e6));
// Custom edits must be reflected, and exports must never include other builds or backup-only identifiers.
const other=JSON.parse(JSON.stringify(build));other.id='other-private-build';other.name='OTHER_PRIVATE_BUILD';state.builds.push(other);
const shoulder=state.items.find(x=>x.id===build.loadout.shoulder);
shoulder.upgrade=10;shoulder.upgradeKnown=true;
shoulder.overrides={'int:0:10':91.25};
shoulder.memo='この肩のOP値は実機で計測';
build.settings.combat={abilityId:'lightningStorm',elementalStacks:4,elite:true};
build.settings.pet={id:'flying-fish-king',level:10,passiveLevels:{'oceans-providence':10},
 equipmentUnlocked:true,equipment:{id:'fine-saddle',rolls:[
 {stat:'mcr',value:14.7},{stat:'move',value:12.3},{stat:'int',value:72}]}};
build.settings.runeSlots=['grand:lightningStorm','grand:lightningStorm','','','',''];
build.settings.talentPoints={stormConduit:1};
build.settings.statView={groups:{unique:false},slots:{chest:false},comparisonKeys:['move','mcr','int']};
build.settings.notes='分析用のメモ';
const modified=reportOf(state,build,stamp),v=JSON.stringify(modified);
assert(!v.includes('OTHER_PRIVATE_BUILD'),'not all builds or their names exported');
assert(!v.includes('other-private-build'),'foreign build IDs never appear');
assert(!v.includes(build.id),'opaque UUIDs are not part of AI report');
assert(!v.includes(shoulder.id),'opaque inventory IDs are not part of AI report');
assert.equal(modified.equipment.find(x=>x.slot==='shoulder').upgradeStage,10);
assert.equal(modified.equipment.find(x=>x.slot==='shoulder').upgradeKnown,true);
assert.equal(modified.equipment.find(x=>x.slot==='shoulder').primaryAffixes[0].value,91.25);
assert.equal(modified.equipment.find(x=>x.slot==='shoulder').primaryAffixes[0].confidence,'actual');
assert.equal(modified.equipment.find(x=>x.slot==='shoulder').memo,'この肩のOP値は実機で計測');
assert.equal(modified.configuration.pet.name,'トビウオ王');
assert.equal(modified.configuration.pet.equipment.affixes.length,3);
assert.equal(modified.configuration.pet.equipment.affixes[2].value,72);
assert.equal(modified.configuration.pet.equipment.active,true);
assert.equal(modified.configuration.runes.slots[0].id,'grand:lightningStorm');
assert.equal(modified.configuration.runes.slots[1].id,'grand:lightningStorm');
assert.equal(modified.configuration.talents.gameRequirements.deficits[0].missingPoints,60);
assert.equal(modified.configuration.combatScenario.elementalStacks,4);
assert.equal(modified.configuration.combatScenario.elite,true);
assert.equal(modified.configuration.statDisplay.enabledGroups.unique,false);
assert.equal(modified.configuration.statDisplay.enabledEquipmentSlots.chest,false);
assert.equal(modified.configuration.statDisplay.comparisonKeys.length,3);
assert.equal(modified.configuration.buildNotes,'分析用のメモ');
// Credentials can exist in browser storage but must not reach the exported bytes.
const storage={
 deskrawl_planner_v01:JSON.stringify(state),
 deskrawl_planner_session_v01:JSON.stringify({user:{email:'private@example.invalid'},
  access_token:'TOP_SECRET_ACCESS',refresh_token:'TOP_SECRET_REFRESH',expiresAt:0}),
 deskrawl_planner_cloud_v01:JSON.stringify({url:'https://private.supabase.co',key:'sb_publishable_secret'})
};
const handlers={},app={innerHTML:'',addEventListener:(name,fn)=>handlers[name]=fn},
 toast={classList:{add(){},remove(){}},textContent:''};
const download={content:null,filename:null,clicked:false};
const fakeURL={createObjectURL(blob){download.content=blob;return 'blob:test'},revokeObjectURL(){}};
const fakeDoc={
 getElementById:id=>id==='app'?app:id==='toast'?toast:id==='aiExportPreview'?{select(){},focus(){}}:null,
 createElement:tag=>tag==='a'?{set download(v){download.filename=v},click(){download.clicked=true}}:
  {style:{},files:[],click(){}},
 body:{appendChild(){}},
 addEventListener(){},
 execCommand:()=>true
};
let copied='';
Object.assign(ctx,{document:fakeDoc,URL:fakeURL,localStorage:{getItem:k=>storage[k]??null,
 setItem:(k,val)=>storage[k]=val,removeItem:k=>delete storage[k]},
 navigator:{clipboard:{writeText:async text=>{copied=text}}},
 setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true,prompt:()=>'',
 fetch:()=>Promise.reject(Error('offline')),location:{hash:'',pathname:'/',search:'',origin:'file://'},
 history:{replaceState(){}}
});
vm.runInContext(code('app.js'),ctx,{filename:'app.js'});
const trigger=action=>handlers.click({target:{closest:()=>({dataset:{action}})}});
assert(app.innerHTML.includes('data-action="ai-export"'),'export entry visible next to build controls');
trigger('ai-export');
assert(app.innerHTML.includes('id="aiExportPreview"'),'preview shown in modal');
assert(app.innerHTML.includes('data-action="ai-export-copy"'),'copy action shown');
assert(app.innerHTML.includes('data-action="ai-export-download"'),'JSON download shown');
assert(!app.innerHTML.includes('TOP_SECRET_ACCESS'));
trigger('ai-export-copy');
assert(copied.includes('ライトニングストーム'),'clipboard includes selected skill and conditions');
assert(!copied.includes('TOP_SECRET_ACCESS')&&!copied.includes('TOP_SECRET_REFRESH')
 &&!copied.includes('private@example.invalid')&&!copied.includes('sb_publishable_secret'),
 'clipboard must never include authentication or cloud connection');
trigger('ai-export-download');
assert(download.clicked,'JSON download invoked');
assert(download.filename.endsWith('.json'),'JSON filename provided');
(async()=>{
 const text=await download.content.text(),data=JSON.parse(text);
 assert.equal(data.format,'deskrawl-chatgpt-build-analysis');
 assert.equal(data.configuration.talents.allocations.length,1);
 assert.equal(data.equipment.length,11);
 assert(!text.includes('TOP_SECRET_ACCESS')&&!text.includes('private@example.invalid'));
 assert.equal(storage.deskrawl_planner_v01,JSON.stringify(state),
  'AI export leaves existing saved state untouched');
 console.log('PASS: selected-build-only ChatGPT export, all gear/OP/pet/talent/rune/conditions/derived data, copy and JSON download without secrets');
})().catch(e=>{console.error(e);process.exitCode=1});
