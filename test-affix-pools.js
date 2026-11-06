'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ctx={window:{}};vm.createContext(ctx);
for(const file of ['master.js','calc.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),ctx,{filename:file});
const D=ctx.window.DBP,C=ctx.window.DBPCalc;
/*
 * Sorcerer Black Mist pools validated against WikiLy's slot-specific Legendary
 * equipment entries (including the "per class: Sorcerer" expansion):
 * https://wikily.gg/deskrawl/equipment/staff-of-the-frostwyrm/
 * https://wikily.gg/deskrawl/equipment/crown-of-the-fallen-king
 * https://wikily.gg/deskrawl/equipment/prismatic-heart
 * https://wikily.gg/deskrawl/equipment/elemental-burst-pauldron
 * https://wikily.gg/deskrawl/equipment/unyielding-cuirass/
 * https://wikily.gg/deskrawl/equipment/stormcaller-gauntlets
 * https://wikily.gg/deskrawl/equipment/bottomless-potion-belt
 * https://wikily.gg/deskrawl/equipment/greaves-of-the-arcane-edge
 * https://wikily.gg/deskrawl/equipment/boots-of-the-windcaller/
 * https://wikily.gg/deskrawl/equipment/charged-ring
 * https://wikily.gg/deskrawl/equipment/ancient-black-mist-divine
 * Cross-check: https://playongg.com/games/deskrawl/systems/itemizationconfig
 * Armor on body slots is implicit and not a selectable primary affix.
 */
const expected={
  "weapon": [
    "int damage critDamage as basicAttack strongAttack specialDamage fire cold lightning healthy injured slowed immobilized elite distant dot burned vulnerable",
    "loh lifeKill manaKill"
  ],
  "head": [
    "int maxHP mana cdr mr dodge armorBonus lightningDR arcaneDR",
    "regen itemFind goldFind potionFind xp"
  ],
  "neck": [
    "int critChance critDamage as cdr mr basicAttack strongAttack healthy injured slowed elite vulnerable armorBonus allDamage fire cold lightning",
    "move loh itemFind xp"
  ],
  "shoulder": [
    "int maxHP mr dodge cdr poisonDR fireDR critRed thorns",
    "regen move"
  ],
  "chest": [
    "int mr healthy injured bonusHP maxHP dodge physicalDR armorBonus coldDR specialDamage thorns",
    "loh itemFind regen goldFind xp"
  ],
  "gloves": [
    "int damage critRed mr critDamage critChance mcr cdr as mana",
    "manaKill itemFind goldFind potionFind xp"
  ],
  "belt": [
    "int maxHP dodge mr mcr cdr as potionCharges thorns",
    "potionFind regen manaKill xp"
  ],
  "legs": [
    "int mr maxHP bonusHP dodge thorns physicalDR poisonDR armorBonus",
    "loh itemFind goldFind xp regen"
  ],
  "boots": [
    "int mr critRed mcr dodge maxHP coldDR fireDR",
    "move loh itemFind goldFind potionFind"
  ],
  "ring1": [
    "int critChance critDamage as mana mr vulnerable fire cold lightning allDamage",
    "loh lifeKill xp itemFind goldFind"
  ],
  "ring2": [
    "int critChance critDamage as mana mr vulnerable fire cold lightning allDamage",
    "loh lifeKill xp itemFind goldFind"
  ]
};
for(const [slot,[primary,secondary]] of Object.entries(expected)){
  const actual=D.rules[slot];assert(actual,slot+' missing');
  for(const [group,reference] of [['primary',primary],['secondary',secondary]]){
    const a=Array.from(actual[group]);const e=reference.split(' ');
    assert.deepEqual(a.slice().sort(),e.slice().sort(),slot+' '+group+' mismatch');
    assert.equal(new Set(a).size,a.length,slot+' '+group+' duplicate');
    for(const id of a){
      assert(D.affixes[id],slot+'/'+group+': '+id+' absent from catalog');
      assert(Number.isFinite(D.affixes[id][1]),id+' has invalid base');
    }
  }
}
const values={basicAttack:109.5,strongAttack:109.5,specialDamage:125.1,vulnerable:156.4,slowed:156.4,immobilized:156.4,distant:156.4,dot:156.4,burned:156.4,fire:125.1,cold:125.1,lifeKill:94,lightningDR:15.6,arcaneDR:15.6};
for(const [id,value] of Object.entries(values)){
  assert.equal(D.affixes[id][1],value,'Black Mist +0 base '+id);
  assert(C.full.includes(id),'not shown in complete stats '+id);
}
const item=(slot,primary,secondary='')=>({id:slot,slot,definitionId:'custom-'+slot,primary,secondary,upgrade:0,upgradeKnown:true,overrides:{},gems:[]});
const neck=item('neck',['strongAttack','critChance','lightning','vulnerable'],'move');
assert.equal(C.itemTotal(neck).find(x=>x.stat==='strongAttack').value,109.5);
assert.equal(C.itemTotal(neck,10).find(x=>x.stat==='strongAttack').value,131.4);
assert.equal(C.format('strongAttack',109.5),'109.5%');
const belt=item('belt',['int','mcr','dodge','cdr'],'regen');
assert(!C.itemTotal(belt).some(x=>x.stat==='armor'),'Belt has no implicit Armor');
assert.equal(C.itemTotal(belt,1).find(x=>x.stat==='int').value,81.9,'Belt has 5 upgrade positions');
const chest=item('chest',['int','armorBonus','maxHP','mr'],'regen');
assert.equal(C.itemTotal(chest).find(x=>x.stat==='armor').value,782);
const armorResult=C.calc({items:[chest]},{loadout:{chest:'chest'},settings:{aura:false}});
assert(Math.abs(armorResult.raw.armor-782*1.313)<0.01,'Bonus Armor OP must affect Armor');
const weapon=item('weapon',['strongAttack','int','lightning','vulnerable'],'lifeKill');
assert.equal(C.itemTotal(weapon,1).find(x=>x.stat==='strongAttack').value,109.5,'Weapon +1 upgrades speed/damage before affixes');
assert.equal(C.itemTotal(weapon,2).find(x=>x.stat==='strongAttack').value,114.98,'Weapon +2 reaches first OP');
assert(!D.rules.neck.primary.includes('damage'),'Flat Damage must not appear on Necklace');
assert(!D.rules.ring1.primary.includes('cdr'),'CDR must not appear on Ring');
assert(!D.rules.head.primary.includes('armor'),'Implicit Armor is not a primary affix');
console.log('PASS: verified all 11 Sorcerer Black Mist primary/secondary pools, base values, and calculations');
