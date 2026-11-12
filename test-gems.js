const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ctx={window:{},Math,Date,Number,String,Set,Map,JSON,crypto:require('crypto').webcrypto};
ctx.window=ctx;vm.createContext(ctx);
for(const file of ['master.js','calc.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),ctx,{filename:file});
const D=ctx.DBP,C=ctx.DBPCalc;
const expected={
 amethyst:[['arcane',50],['int',30],['arcaneDR',15]],
 diamond:[['physical',50],['cdr',4],['physicalDR',11.5]],
 emerald:[['poison',50],['thorns',130],['poisonDR',15]],
 ruby:[['fire',50],['str',30],['fireDR',15]],
 sapphire:[['cold',50],['bonusHP',18],['coldDR',15]],
 topaz:[['lightning',50],['dex',30],['lightningDR',15]]
};
assert.equal(Object.keys(D.gems).length,6);
assert.equal(Object.values(D.gemSocketLimits).reduce((sum,v)=>sum+v,0),11); // 2 rings each has one: 3+1+2+2+1+1+1=11
for (const [type,byCategory] of Object.entries(expected)) {
 for (const [index,slot] of ['weapon','chest','neck'].entries()) {
  const effect=D.gemEffect(type,slot);const [stat,value]=byCategory[index];
  assert(effect,`${type}/${slot} effect missing`);
  assert.equal(effect.tier,6);
  assert.equal(effect.stat,stat);
  assert.equal(effect.value,value);
  assert.equal(C.format(stat,value).endsWith('%'),C.percent.has(stat),`bad percent format for ${stat}`);
  const state=D.makeSeed(),b=state.builds[0],item=state.items.find(x=>x.id===b.loadout[slot]);
  const before=C.calc(state,b);
  item.gems=[{type}];
  const after=C.calc(state,b);
  assert(Math.abs((after.sum[stat]||0)-(before.sum[stat]||0)-value)<1e-7,`wrong sum ${type}/${slot}: ${stat}`);
  assert(after.breakdown[stat].some(x=>x.source.includes('ソケット1')&&x.source.includes('Tier 6')));
 }
}
// CDR and HP bonuses stack across distinct sockets.
{
 const state=D.makeSeed(),b=state.builds[0],chest=state.items.find(x=>x.id===b.loadout.chest);
 const before=C.calc(state,b).sum.cdr||0;
 chest.gems=[{type:'diamond'},{type:'diamond'}];
 assert.equal((C.calc(state,b).sum.cdr||0)-before,8);
 assert.equal(C.calc(state,b).breakdown.cdr.filter(x=>x.source.includes('ソケット')).length,2);
}
// Unavailable slots never grant gem effects.
for(const slot of ['shoulder','gloves','belt','boots']){
 assert.equal(D.gemSocketLimits[slot]||0,0);
 assert.equal(D.gemEffect('topaz',slot),null);
 const state=D.makeSeed(),b=state.builds[0],it=state.items.find(x=>x.id===b.loadout[slot]);
 const before=C.calc(state,b).sum.lightning||0;
 it.gems=[{type:'topaz',value:999}];
 assert.equal(C.calc(state,b).sum.lightning||0,before);
}
// Previous freeform values do not override tier-6 catalog or change the effect group.
{
 const state=D.makeSeed(),b=state.builds[0],chest=state.items.find(x=>x.id===b.loadout.chest);
 const before=C.calc(state,b),crit=before.sum.dex||0;
 chest.gems=[{type:'topaz',value:999}];
 assert.equal((C.calc(state,b).sum.dex||0)-crit,30);
 assert.equal(C.calc(state,b).sum.lightning||0,before.sum.lightning||0);
}
// An unequipped candidate cannot alter character statistics.
{
 const state=D.makeSeed(),b=state.builds[0];const before=C.calc(state,b).sum.int||0;
 state.items.push({id:'spare',definitionId:'custom-chest',slot:'chest',primary:[],gems:[{type:'amethyst'},{type:'amethyst'}],upgrade:0,upgradeKnown:true});
 assert.equal(C.calc(state,b).sum.int||0,before);
}
// v1.1.11 Perfect Star: selectable Tier 7, but unpublished values are never invented.
{
 const gem=D.gemEffect('sapphire','weapon',7);
 assert.equal(gem.tier,7);
 assert.equal(gem.stat,'cold');
 assert.equal(gem.value,null);
 const state=D.makeSeed(),b=state.builds[0],weapon=state.items.find(x=>x.id===b.loadout.weapon);
 const before=C.calc(state,b);
 weapon.gems=[{type:'sapphire',tier:7,value:null}];
 const unknown=C.calc(state,b);
 assert.equal(unknown.sum.cold||0,before.sum.cold||0,'unknown Perfect Star must add no guessed value');
 assert(unknown.pending.some(x=>x.includes('Perfect Star')),'unverified gem requires warning');
 weapon.gems=[{type:'sapphire',tier:7,value:72}];
 const measured=C.calc(state,b);
 assert.equal((measured.sum.cold||0)-(before.sum.cold||0),72,'actual manually entered Perfect Star bonus is counted');
 assert(measured.breakdown.cold.some(x=>x.source.includes('Tier 7')&&x.quality==='actual'),'measured gem bonus identified as actual');
 weapon.gems=[{type:'sapphire',tier:6,value:999}];
 assert.equal((C.calc(state,b).sum.cold||0)-(before.sum.cold||0),50,'old Tier6 verified stat ignores obsolete freeform value');
}
console.log('PASS: tier 6 gem catalog and tier 7 Perfect Star verified-only or manually observed values');
