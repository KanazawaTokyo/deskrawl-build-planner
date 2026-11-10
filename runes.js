/* Deskrawl Sorcerer runes — six equipped slots, every rune fixed at max Lv6.
 * Authoritative reference data: https://wikily.gg/deskrawl/runes/
 * Set effects: https://wikily.gg/deskrawl/rune-sets/stormcaller
 *              https://wikily.gg/deskrawl/rune-sets/frozen-barrage
 *              https://wikily.gg/deskrawl/rune-sets/infernal-covenant
 * Legendary (Grand) runes may repeat; Rune Set pieces are unique.
 * The older per-skill runeRanks shape is retained in stored builds but is never
 * auto-equipped, because it could represent more than the game's six slots.
 */
(function(){'use strict';
const grand=[
 ['fireBall','Fire Ball','int',20],
 ['iceShards','Ice Shards','bonusHP',20],
 ['electrocute','Electrocute','mana',20],
 ['flameLightning','Flame Lightning','int',20],
 ['flameBreath','Flame Breath','bonusArmor',36.5],
 ['iceMeteor','Ice Meteor','bonusMR',36.5],
 ['lightningStorm','Lightning Storm','move',9],
 ['frostBeam','Frost Beam','mana',20],
 ['iceNova','Ice Nova','potionFind',72.5],
 ['fireElemental','Fire Elemental','int',20],
 ['iceBlock','Ice Block','move',9],
 ['fireMeteor','Fire Meteor','bonusHP',20],
 ['lightningCloud','Lightning Cloud','bonusMR',36.5],
 ['flameAura','Flame Aura','bonusArmor',36.5]
];
const sets={
 stormcaller:{
  name:'Stormcaller',pieces:[
   {skill:'lightningStorm',level:6},{skill:'lightningStorm',level:6},
   {stat:'int',value:35},{stat:'bonusHP',value:15},
   {stat:'strongAttack',value:20},{stat:'healthy',value:25}
  ],
  bonuses:{
   2:{label:'雷ダメージ +50%',stat:'lightning',value:50},
   4:{label:'Lightning Stormの各ヒットが周囲にスプラッシュ',mechanic:'splash'},
   6:{label:'Lightning Stormの各ヒットから、武器ダメージ50%の雷球が3回脈動',mechanic:'lightning-ball',pulses:3,weaponPercent:50}
  }
 },
 frozenBarrage:{
  name:'Frozen Barrage',pieces:[
   {skill:'iceShards',level:6},{skill:'iceShards',level:6},
   {stat:'int',value:35},{stat:'basicAttack',value:25},
   {stat:'as',value:14},{stat:'maxHP',value:600}
  ],
  bonuses:{
   2:{label:'減速中の敵へのダメージ +65%',stat:'slowed',value:65},
   4:{label:'攻撃速度 +60%、Ice ShardsがChillを付与',stat:'as',value:60,mechanic:'chill'},
   6:{label:'Ice Shardsが追加4本の投射物を放ち、各投射物が1体貫通',mechanic:'extra-projectiles',projectiles:4}
  }
 },
 infernalCovenant:{
  name:'Infernal Covenant',pieces:[
   {skill:'fireElemental',level:6},{skill:'fireElemental',level:6},
   {stat:'int',value:35},{stat:'mana',value:60},
   {stat:'maxHP',value:600},{stat:'loh',value:20}
  ],
  bonuses:{
   2:{label:'燃焼中の敵へのダメージ +90%',stat:'burned',value:90},
   4:{label:'Fire ElementalがPyroblastを追加で使用',mechanic:'pyroblast'},
   6:{label:'Fire ElementalがFire Meteorを追加で使用',mechanic:'fire-meteor'}
  }
 }
};
const roman=['I','II','III','IV','V','VI'];
const catalog={};
for(const [skill,label,stat,value] of grand){
 const id='grand:'+skill;
 catalog[id]={id,rarity:'legendary',name:label+' Rune (Grand)',skill,level:6,stats:[{stat,value}],allowDuplicate:true};
}
for(const [setId,set] of Object.entries(sets)){
 for(let index=0;index<6;index++){
  const id='set:'+setId+':'+(index+1),part=set.pieces[index];
  catalog[id]={id,rarity:'set',name:set.name+' Rune ('+roman[index]+')',set:setId,piece:index+1,
   skill:part.skill||null,level:part.level||0,stats:part.stat?[{stat:part.stat,value:part.value}]:[],
   allowDuplicate:false};
 }
}
const selectable=Object.values(catalog);
const statLabels={int:'知力',bonusHP:'Bonus HP',mana:'最大Mana',bonusArmor:'Bonus Armor',bonusMR:'Bonus MR',move:'移動速度',
 potionFind:'ポーション発見率',strongAttack:'強攻撃ダメージ',healthy:'対健康ダメージ',basicAttack:'通常攻撃ダメージ',
 as:'攻撃速度',maxHP:'最大HP',loh:'Life on Hit',lightning:'雷ダメージ',slowed:'対減速ダメージ',burned:'対燃焼ダメージ'};
const pctStats=new Set(['bonusHP','bonusArmor','bonusMR','move','potionFind','strongAttack','healthy','basicAttack','as','lightning','slowed','burned']);
function statsText(r){return r.stats.map(({stat,value})=>(statLabels[stat]||stat)+' +'+value+(pctStats.has(stat)?'%':'')).join(' / ');}
function selection(settings={}){
 const input=settings.runeSlots;
 const slots=Array.from({length:6},(_,i)=>Array.isArray(input)&&typeof input[i]==='string'?input[i]:'');
 const seenSet=new Set(),issues=[],equipped=[];
 slots.forEach((id,i)=>{
  if(!id)return;
  const rune=catalog[id];
  if(!rune){issues.push('枠'+(i+1)+'に未対応のルーンIDがあります');return;}
  if(!rune.allowDuplicate&&seenSet.has(id)){
   issues.push('枠'+(i+1)+'のセットルーンが重複しています');return;
  }
  if(!rune.allowDuplicate)seenSet.add(id);
  equipped.push({...rune,slot:i+1});
 });
 const counts=Object.fromEntries(Object.keys(sets).map(k=>[k,0]));
 equipped.forEach(r=>{if(r.set)counts[r.set]++});
 const bonuses=[];
 for(const [setId,count] of Object.entries(counts)){
  for(const [threshold,bonus] of Object.entries(sets[setId].bonuses)){
   bonuses.push({set:setId,setName:sets[setId].name,count,threshold:Number(threshold),
    active:count>=Number(threshold),...bonus});
  }
 }
 const effects=[];
 for(const rune of equipped)for(const {stat,value} of rune.stats)
  effects.push({stat,value,source:'ルーン'+rune.slot+' · '+rune.name+'（Lv6）'});
 for(const bonus of bonuses)if(bonus.active&&bonus.stat)
  effects.push({stat:bonus.stat,value:bonus.value,source:bonus.setName+' · '+bonus.threshold+'セット'});
 return {slots,equipped,counts,bonuses,effects,issues};
}
function rankBonus(settings,skill){
 return selection(settings).equipped.filter(r=>r.skill===skill).reduce((n,r)=>n+r.level,0);
}
function canSelect(settings,index,id){
 if(!Number.isInteger(index)||index<0||index>=6||typeof id!=='string'||(id&&!catalog[id]))return false;
 const rune=catalog[id];
 if(rune&&!rune.allowDuplicate){
  const slots=selection(settings).slots;
  if(slots.some((x,i)=>i!==index&&x===id))return false;
 }
 return true;
}
window.DBPRunes={catalog,selectable,sets,statLabels,pctStats,statsText,selection,rankBonus,canSelect};
})();
