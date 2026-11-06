/* Deskrawl Sorcerer Combat Talents. Patch 1.1.0 / 2026-10-29.
 * Sources:
 * https://wikily.gg/deskrawl/talents/sorcerer
 * https://wikily.gg/deskrawl/talents
 * The 'effects' array separates unconditional character stats from
 * skill-only / situational stats. Triggers/procs are displayed, not invented.
 */
(function(){'use strict';
const MAX=70,ROWS=[0,5,10,15,20,30,40,50,60];
const mk=(id,name,row,max,element,description,effects=[],extra={})=>({id,name,row,max,element,description,effects,...extra});
const fx=(stat,per,label)=>({stat,per,label});
const defs=[
 mk('arcaneInsight','魔力の秘術',0,10,'arcane','知力 +5 / ランク',[fx('int',5,'知力')]),
 mk('searingEdge','灼熱の刃',0,6,'fire','基本攻撃のクリティカル率 +2.5% / ランク',[fx('basicCritChance',2.5,'基本攻撃Crit率')]),
 mk('frostArmor','氷結の鎧',0,8,'cold','Armor +35、総Armor +3% / ランク',[fx('armor',35,'Armor'),fx('bonusArmor',3,'Armorボーナス')]),
 mk('arcaneReach','魔力の射程',0,6,'arcane','基本攻撃の射程 +6% / ランク',[fx('basicRange',6,'基本攻撃射程')]),
 mk('manaFlow','マナの奔流',0,8,'arcane','最大マナ +4 / ランク',[fx('mana',4,'最大Mana')]),
 mk('flameWard','炎の守り',5,8,'fire','炎ダメージ +5%、魔法耐性ボーナス +4% / ランク',[fx('fire',5,'炎ダメージ'),fx('bonusMR',4,'魔法耐性ボーナス')]),
 mk('manaConduit','マナ導管',5,6,'arcane','基本攻撃のマナ獲得 +1 / ランク',[fx('basicManaGain',1,'基本攻撃マナ獲得')]),
 mk('frostMastery','冷気の熟達',5,10,'cold','冷気ダメージ +7% / ランク',[fx('cold',7,'冷気ダメージ')]),
 mk('stormExecutioner','嵐の処刑者',5,10,'lightning','雷ダメージ +4%、エリートへのダメージ +3% / ランク',[fx('lightning',4,'雷ダメージ'),fx('elite',3,'対エリート')]),
 mk('manaRegeneration','マナ回復',5,6,'arcane','毎秒マナ回復 +1 / ランク',[fx('manaRegen',1,'マナ自然回復')]),
 mk('arcaneMomentum','魔力の勢い',10,1,'arcane','特殊攻撃後5秒間、基本攻撃ダメージ +40%。常時のダメージには加算しません。',[],{cap:1}),
 mk('immolation','焼尽',10,1,'fire','ファイアボールが15%で燃焼を付与。',[],{cap:1}),
 mk('coldRetribution','冷気の報復',10,1,'cold','被ダメージ -10%。近接攻撃者に4秒のChillを付与。',[fx('allDR',10,'共通ダメージ軽減')],{cap:1}),
 mk('thunderstruck','感電麻痺',10,1,'lightning','Lightning Stormが15%で1秒間のShort Stunを付与。',[],{cap:1}),
 mk('flameBreathCrit','炎の息吹：会心強化',15,6,'fire','Flame BreathのCritダメージ +20% / ランク',[fx('flameBreathCritDamage',20,'Flame Breath Critダメージ')]),
 mk('elementalFury','元素の激怒',15,6,'fire','Fire Elementalの攻撃速度 +15% / ランク',[fx('fireElementalAs',15,'Fire Elemental AS')]),
 mk('frostAlacrity','冷気の俊敏',15,6,'cold','冷気アビリティのCDR +4% / ランク（全体CDRには加算しない）',[fx('frostCdr',4,'冷気スキルCDR')]),
 mk('deepChill','深い冷気',15,8,'cold','Chillのスロウ・持続効果 +6% / ランク',[fx('chillPotency',6,'Chill効果')]),
 mk('electricalShield','電気の盾',15,8,'lightning','総Armor +2% / ランク。近接被弾時4%/ランクでマナ+5。',[fx('bonusArmor',2,'Armorボーナス')]),
 mk('arcaneReservoir','魔力の貯蔵',20,8,'arcane','最大Manaの5% / ランクが知力に加算される。',[],{special:'manaToInt'}),
 mk('conflagration','烈火',20,8,'fire','燃焼中の敵へのダメージ +12% / ランク',[fx('burned',12,'対燃焼')]),
 mk('iceMeteorCost','氷隕石：マナ消費軽減',20,8,'cold','Ice Meteorのマナ消費 -4% / ランク',[fx('iceMeteorMcr',4,'Ice Meteor MCR')]),
 mk('iceShardsDamage','氷片：ダメージ強化',20,8,'cold','Ice Shardsのダメージ +10% / ランク',[fx('iceShardsDamage',10,'Ice Shardsダメージ')]),
 mk('stormMastery','嵐の熟練',20,8,'lightning','雷アビリティのCritダメージ +12%、雷ダメージ軽減 +3% / ランク',[fx('lightningAbilityCritDamage',12,'雷スキルCritダメージ'),fx('lightningDR',3,'雷ダメージ軽減')]),
 mk('ignite','発火',30,1,'fire','クリティカルヒットで確実に燃焼を付与。',[],{cap:2}),
 mk('flashFreeze','瞬間凍結',30,1,'cold','Chillを付与すると15%でFrozenを追加付与。',[],{cap:2}),
 mk('staticCharge','電気チャージ',30,1,'lightning','雷スキルが確実にElectrostaticを付与。',[],{cap:2}),
 mk('cataclysm','大災害',40,8,'fire','Fire Meteorのダメージ +15%、CD +2% / ランク。',[fx('fireMeteorDamage',15,'Fire Meteorダメージ'),fx('fireMeteorCooldownPenalty',2,'Fire Meteor CD増加')]),
 mk('frozenReservoir','氷結の貯蓄',40,8,'cold','Ice Nova発動時12.5%×ランクでManaを60～130回復（8/8で確定130）。',[],{special:'iceNovaMana'}),
 mk('permafrost','永久凍土',40,6,'cold','Frozenの持続時間 +8% / ランク',[fx('frozenDuration',8,'Frozen持続時間')]),
 mk('frozenRenewal','氷結の再生',40,5,'cold','Ice Block中、毎秒最大HPの5%×ランクを回復。',[fx('iceBlockHeal',5,'Ice Block HP回復/秒')]),
 mk('electrocuteMana','感電：マナ獲得強化',40,6,'lightning','Electrocuteのマナ獲得 +2 / ランク',[fx('electrocuteManaGain',2,'Electrocuteマナ獲得')]),
 mk('plasmaConduction','プラズマ導電',50,8,'lightning','Flame Lightningが燃焼敵へ+6%、Electrostatic1スタックごとに+6% / ランク（スキル限定）。',[fx('flameLightningBurned',6,'Flame Lightning対燃焼'),fx('flameLightningElectrostatic',6,'Flame Lightning対感電スタック')]),
 mk('auraWard','炎の加護',50,8,'fire','Flame Aura中のみ、Armor・Magic Resist +10% / ランク',[fx('bonusArmor',10,'Armorボーナス'),fx('bonusMR',10,'MRボーナス')],{auraOnly:true}),
 mk('frostBeamExpansion','冷気光線の拡張',50,5,'cold','Frost Beamの長さと幅 +10% / ランク',[fx('frostBeamSize',10,'Frost Beam範囲')]),
 mk('currentTransfer','電流転移',50,5,'lightning','Electrostatic状態の敵死亡時、20%×ランクで近隣に状態を伝搬。',[fx('electrostaticSpreadChance',20,'Electrostatic伝搬率')]),
 mk('lingeringStorm','残存する嵐',50,8,'lightning','Lightning Cloudの設置効果の持続時間 +10% / ランク',[fx('lightningCloudDuration',10,'Lightning Cloud持続')]),
 mk('arcaneExposure','魔力露出',60,1,'arcane','Strong Attack4回ごとに脆弱を付与。脆弱敵へのダメージ +150%。',[fx('vulnerable',150,'対脆弱')],{cap:3}),
 mk('combustion','爆燃',60,1,'fire','燃焼中の敵へ能力が命中すると35%で爆発、武器ダメージ900%。',[],{cap:3}),
 mk('shatteringIce','氷砕き',60,1,'cold','Frozenの敵へのCrit率 +50%、Critダメージ +250%（条件付きのみ）。',[fx('frozenCritChance',50,'対凍結Crit率'),fx('frozenCritDamage',250,'対凍結Critダメージ')],{cap:3}),
 mk('stormConduit','嵐の導体',60,1,'lightning','ElectrocuteとFlame Lightningが30%でLightning Stormを追加発動。Lightning Stormダメージ+50%。',[fx('lightningStormDamage',50,'Lightning Stormダメージ')],{cap:3})
];
const byId=Object.fromEntries(defs.map(x=>[x.id,x]));
const empty=()=>({});
const preset=()=>({
 arcaneInsight:10,manaFlow:8,stormExecutioner:10,manaRegeneration:1,
 thunderstruck:1,electricalShield:8,stormMastery:8,staticCharge:1,
 frozenReservoir:8,electrocuteMana:6,auraWard:8,arcaneExposure:1
});
const rawRanks=setting=>{
 const input=setting?.talentPoints;
 return input&&typeof input==='object'&&!Array.isArray(input)?input:null;
};
const spent=ranks=>Object.values(ranks||{}).reduce((acc,n)=>acc+(Number.isFinite(Number(n))?Number(n):0),0);
const lowerSpent=(ranks,row)=>defs.filter(x=>x.row<row).reduce((n,x)=>n+(Number(ranks?.[x.id])||0),0);
const resetCost=s=>4*s*(s+1);
const refundCost=s=>8*s;
function valid(ranks){
 const values=ranks||{};
 let count=0;
 const capstone={};
 for(const def of defs){
  const v=values[def.id]??0;
  if(!Number.isSafeInteger(v)||v<0||v>def.max)return false;
  if(v){
   count+=v;
   if(def.cap){capstone[def.cap]=(capstone[def.cap]||0)+1;if(capstone[def.cap]>1)return false}
  }
 }
 if(count>MAX)return false;
 for(const def of defs)if((values[def.id]||0)>0&&lowerSpent(values,def.row)<def.row)return false;
 return true;
}
function sanitize(source){
 const result={};
 const obj=source&&typeof source==='object'&&!Array.isArray(source)?source:{};
 // Process complete rows in increasing order; never fabricate prerequisites.
 for(const row of ROWS){
  if(lowerSpent(result,row)<row)continue;
  let takenCap=false;
  for(const def of defs.filter(x=>x.row===row)){
   let n=Number(obj[def.id]??0);
   n=Number.isSafeInteger(n)?Math.max(0,Math.min(def.max,n)):0;
   if(def.cap&&takenCap)n=0;
   n=Math.min(n,MAX-spent(result));
   if(n){result[def.id]=n;if(def.cap)takenCap=true}
  }
 }
 return result;
}
function allocation(settings){
 const raw=rawRanks(settings);
 if(!raw)return {legacy:true,ranks:{},total:0,remaining:MAX,issues:[]};
 const ranks=sanitize(raw);
 const issues=Object.keys(raw).filter(key=>Number(raw[key]||0)!==Number(ranks[key]||0));
 return {legacy:false,ranks,total:spent(ranks),remaining:MAX-spent(ranks),issues};
}
function canAdd(ranks,id){
 const def=byId[id];
 if(!def)return {ok:false,why:'タレントが見つかりません'};
 const current=ranks[id]||0;
 if(current>=def.max)return {ok:false,why:'このタレントは最大ランクです'};
 if(lowerSpent(ranks,def.row)<def.row)return {ok:false,why:'下位段階に'+def.row+'pt必要です'};
 const existing=def.cap?defs.find(x=>x.cap===def.cap&&x.id!==id&&(ranks[x.id]||0)>0):null;
 if(existing){
  const next={...ranks};delete next[existing.id];next[id]=1;
  if(!valid(next))return {ok:false,why:'解放条件を満たしていません'};
  return {ok:true,ranks:next,type:'swap',cost:refundCost(spent(ranks)),previous:existing.id};
 }
 if(spent(ranks)>=MAX)return {ok:false,why:'残りポイントがありません'};
 const next={...ranks,[id]:current+1};
 return valid(next)?{ok:true,ranks:next,type:'add',cost:0}:{ok:false,why:'この段階は解放されていません'};
}
function canRemove(ranks,id){
 if(!byId[id]||!(ranks[id]>0))return {ok:false,why:'振り戻すポイントがありません'};
 const next={...ranks,[id]:ranks[id]-1};
 if(!next[id])delete next[id];
 return valid(next)?{ok:true,ranks:next,type:'refund',cost:refundCost(spent(ranks))}:{ok:false,why:'上位のタレントがこのポイントに依存しています'};
}
function effects(ranks,{aura=false,mana=0}={}){
 const result=[],special=[];
 for(const def of defs){
  const rank=Math.min(def.max,Math.max(0,Number(ranks?.[def.id])||0));
  if(!rank)continue;
  if(def.special==='manaToInt'){
   result.push({stat:'int',value:mana*.05*rank,source:def.name+' ('+rank+'/8) · Manaの'+(rank*5)+'%',quality:'calculated'});
  } else if(def.special==='iceNovaMana'){
   special.push({id:def.id,name:def.name,detail:'Ice Nova: '+(rank*12.5)+'%でMana '+(50+10*rank)+'回復'});
  }
  for(const e of def.effects||[]){
   if(def.auraOnly&&!aura)continue;
   result.push({stat:e.stat,value:rank*e.per,source:'タレント · '+def.name+' '+rank+'/'+def.max+(def.auraOnly?' · Aura ON':''),quality:'verified',skillOnly:!globalStats.has(e.stat)});
  }
  if(!def.effects.length&&!def.special)special.push({id:def.id,name:def.name,detail:def.description});
 }
 return {result,special};
}
const globalStats=new Set(['int','mana','armor','bonusArmor','bonusMR','fire','cold','lightning','elite','manaRegen','burned','lightningDR','allDR','vulnerable']);
window.DBPTalents={MAX,ROWS,defs,byId,empty,preset,rawRanks,allocation,spent,lowerSpent,resetCost,refundCost,valid,sanitize,canAdd,canRemove,effects,globalStats};
})();