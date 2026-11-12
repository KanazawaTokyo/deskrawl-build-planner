'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:null,Date,Math,JSON,Set,Number,String,console,crypto:require('node:crypto').webcrypto};
ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname+'/master.js','utf8'),ctx,{filename:'master.js'});
const D=ctx.DBP, all=D.definitions;
assert(new Set(all.map(d=>d.id)).size===all.length,'definition IDs must remain unique');
for(const d of all)assert(D.slots.some(s=>s[0]===d.slot),d.name+' has an unknown slot');
assert(all.find(x=>x.id==='grandmother'),'old Grandmother ID was removed');
assert.equal(D.slots.length,11,'back slot must not be introduced');
assert(!D.slots.some(([slot])=>slot==='back'),'back slot must remain absent');
const dreadwing=all.find(x=>x.id==='dreadwing'), ancientDreadwing=all.find(x=>x.id==='ancient-dreadwing');
assert(dreadwing&&dreadwing.slot==='weapon'&&dreadwing.rarity==='Divine','Dreadwing is a divine weapon');
assert(ancientDreadwing&&ancientDreadwing.slot==='weapon'&&ancientDreadwing.isAncient,'Ancient Dreadwing weapon variant');
assert.equal(dreadwing.fixed.length,0,'unknown item stats must not be invented');
assert(!dreadwing.powerStats?.length,'unknown unique power must not be computed');
assert.equal(ancientDreadwing.fixed.length,0,'Ancient stats must remain unverified');

assert(all.find(x=>x.id==='prism'),'old Prismatic Heart ID was removed');
assert(all.find(x=>x.id==='schrodinger'),'old Schrodinger ID was removed');
assert(all.find(x=>x.id==='sage'),'old Elder Sage ID was removed');
for(const name of ['Staff of the Frostwyrm','Rimeguard Treads','Cryofracture Ring',
  'Venomfrost Pauldron','Soulfeast Pauldron','Stormcaller Gauntlets','Rimebound Grasp（部位未確認）']){
  assert(all.some(d=>d.name===name&&d.rarity==='Black Mist'),name+' missing');
}
const soulfeast=all.find(d=>d.id==='bm-soulfeast-pauldron');
assert(soulfeast&&soulfeast.slot==='shoulder'&&soulfeast.rarity==='Black Mist');
assert(soulfeast.effect.includes('3%')&&soulfeast.effect.includes('5体分'),'unique effect description preserved');
assert(soulfeast.sourceUrl.includes('soulfeast-pauldron'),'item-specific reference present');
for(const n of ['Schrödinger’s Ring','Remnant of the Elder Sage','Ring of Momentum','Charged Ring']){
  for(const slot of ['ring1','ring2'])assert(all.some(d=>d.name===n&&d.slot===slot),n+' missing '+slot);
}
for(const id of ['grandmother','iron','undying','gladiator','soulrender','sage','schrodinger']){
 const d=all.find(x=>x.id===id);
 assert(d&&d.rarity==='Divine','Missing divine '+id);
 const a=all.find(x=>x.id==='ancient-'+id);
 assert(a&&a.isAncient&&JSON.stringify(a.fixed||[])===JSON.stringify(d.fixed||[]),'Ancient fixed values differ '+id);
}
assert.equal(all.find(x=>x.id==='undying').powerStats[0][1],30);
assert.equal(all.find(x=>x.id==='ancient-undying').powerStats[0][1],40);
const seed=D.makeSeed();
assert.equal(seed.builds[0].loadout.weapon,seed.items.find(x=>x.definitionId==='grandmother').id);
vm.runInContext(fs.readFileSync(__dirname+'/calc.js','utf8'),ctx,{filename:'calc.js'});
const ancient=all.find(x=>x.id==='ancient-undying');
const item={id:'test-visage',definitionId:ancient.id,slot:'head',upgrade:0,overrides:{},primary:[],secondary:''};
const totals=ctx.DBPCalc.itemTotal(item);
assert(totals.some(t=>t.stat==='allDR'&&t.value===40),'Ancient visage damage reduction missing');
assert(totals.some(t=>t.stat==='armor'&&t.value===840),'Ancient visage fixed stats missing');
console.log('PASS: Sorcerer Black Mist, Divine and Ancient gear catalog');
