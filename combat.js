/* Combat layer attribution for Deskrawl Stormcaller.
 * Rules: https://wikily.gg/deskrawl/stats/damage-formula
 * Cross-check: https://playongg.com/games/deskrawl/calculator
 * Uses planner stats as partial totals; no unverified proc/DOT/skill effects.
 */
(function(){'use strict';
const C=window.DBPCalc;
const types={physical:['物理','physical','physicalDR'],fire:['炎','fire','fireDR'],cold:['冷気','cold','coldDR'],lightning:['雷','lightning','lightningDR'],poison:['毒','poison','poisonDR'],arcane:['アルケイン','arcane','arcaneDR']};
const attacks={basic:['通常攻撃','basicAttack'],strong:['強攻撃','strongAttack'],special:['特殊攻撃','specialDamage']};
const defaults=Object.freeze({
 damageType:'lightning',attackType:'special',skillPercent:100,skillFlat:0,heroLevel:70,
 enemyHealth:50,elite:false,vulnerable:false,slowed:false,immobilized:false,stunned:false,frozen:false,lightningAbility:false,burned:false,distant:false,bleeding:false,poisoned:false,
 targetArmor:0,targetMR:0,targetTypeDR:0,targetAllDR:0,targetCritRed:0,
 defenseType:'lightning',attackerLevel:70,incomingHit:10000,incomingCrit:false,incomingCritBonus:150
});
const boolKeys=new Set(['elite','vulnerable','slowed','immobilized','stunned','frozen','lightningAbility','burned','distant','bleeding','poisoned','incomingCrit']);
const ranges={
 skillPercent:[0,100000],skillFlat:[0,1e9],heroLevel:[1,1000],enemyHealth:[0,100],
 targetArmor:[0,1e9],targetMR:[0,1e9],targetTypeDR:[0,90],targetAllDR:[0,90],targetCritRed:[0,100],
 attackerLevel:[1,1000],incomingHit:[1,1e9],incomingCritBonus:[0,10000]
};
const num=(x,fallback=0)=>{const n=Number(x);return Number.isFinite(n)?n:fallback;};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function validateInput(key,value){
 if(key==='attackType')return Object.hasOwn(attacks,value)?value:null;
 if(key==='damageType'||key==='defenseType')return Object.hasOwn(types,value)?value:null;
 if(boolKeys.has(key))return value===true;
 if(Object.hasOwn(ranges,key)){
  const n=Number(value),limit=ranges[key];
  return value!==''&&Number.isFinite(n)&&n>=limit[0]&&n<=limit[1]?n:null;
 }
 return null;
}
function scenario(source){
 const out={...defaults};
 for(const [key,val] of Object.entries(source||{})){
  const checked=validateInput(key,val);
  if(checked!==null)out[key]=checked;
 }
 return out;
}
function get(stats,key){
 const value=stats?.effective?.[key];
 return Math.max(0,num(value,0));
}
function baseline(stats,settings){
 const b=settings?.base||{};
 const missing=k=>b[k]===undefined||b[k]===null||b[k]==='';
 return {
  int:missing('int')&&!(settings?.talentPoints&&typeof settings.talentPoints==='object')?10:0,
  critChance:missing('critChance')?5:0,
  critDamage:missing('critDamage')?150:0,
  dodge:missing('dodge')?5:0
 };
}
function conditional(stats,q){
 const checks=[
  ['healthy','対健康',q.enemyHealth>80],
  ['injured','対負傷',q.enemyHealth<30],
  ['slowed','対減速',q.slowed],
  ['immobilized','対移動不能',q.immobilized||q.stunned||q.frozen],
  ['stunned','対スタン',q.stunned],
  ['bleeding','対出血',q.bleeding],
  ['poisoned','対毒状態',q.poisoned],
  ['burned','対燃焼',q.burned],
  ['distant','対遠距離',q.distant],
  ['elite','対エリート/Boss',q.elite],
  ['vulnerable','対脆弱',q.vulnerable]
 ];
 return checks.map(([key,label,active])=>({key,label,active,value:active?get(stats,key):0,stored:get(stats,key)}));
}
function resistanceCut(amount,attackerLevel){
 const r=Math.max(0,num(amount)),level=Math.max(1,num(attackerLevel,70));
 return r/(r+50*level);
}
function share(layers){
 const pos=layers.filter(x=>x.factor>1);
 const total=pos.reduce((n,x)=>n+Math.log(x.factor),0);
 return layers.map(x=>({...x,share:total>0&&x.factor>1?Math.log(x.factor)/total*100:0}));
}
function attack(stats,settings,options){
 const q=scenario(options),base=baseline(stats,settings),element=types[q.damageType][1],selected=attacks[q.attackType][1];
 const weaponDamage=get(stats,'weaponDamage'),flatDamage=get(stats,'damage'),primary=get(stats,'int')+base.int;
 const eleValue=get(stats,element),allValue=get(stats,'allDamage');
 const conditions=conditional(stats,q),conditionValue=conditions.reduce((sum,x)=>sum+x.value,0);
 const atkValue=get(stats,selected);
 const conditionalBasicCrit=q.attackType==='basic'?get(stats,'basicCritChance'):0;
 const conditionalFrozenCrit=q.frozen?get(stats,'frozenCritChance'):0;
 const conditionalLightningCrit=q.damageType==='lightning'&&q.lightningAbility?get(stats,'lightningAbilityCritDamage'):0;
 const critChance=clamp(get(stats,'critChance')+base.critChance+conditionalBasicCrit+conditionalFrozenCrit,0,85);
 const critBonus=get(stats,'critDamage')+base.critDamage+conditionalLightningCrit+(q.frozen?get(stats,'frozenCritDamage'):0),targetCritRed=q.targetCritRed;
 const critMult=1+(critBonus/100)*(1-targetCritRed/100);
 const elemMult=1+(eleValue+allValue)/100,primaryMult=1+primary/100;
 const condMult=1+conditionValue/100,attackMult=1+atkValue/100;
 const targetResist=q.damageType==='physical'?q.targetArmor:q.targetMR;
 const armorCut=resistanceCut(targetResist,q.heroLevel),typeCut=clamp(q.targetTypeDR,0,90)/100,allCut=clamp(q.targetAllDR,0,90)/100;
 const vulnMult=q.vulnerable?1.3:1;
 const resistMult=(1-armorCut)*(1-typeCut)*(1-allCut);
 const skillMult=q.skillPercent/100;
 const layers=share([
  {key:'ability',label:'スキル倍率',value:q.skillPercent-100,factor:skillMult},
  {key:'primary',label:'知力',value:primary,factor:primaryMult},
  {key:'element',label:types[q.damageType][0]+' + 全属性',value:eleValue+allValue,factor:elemMult},
  {key:'critical',label:'クリティカル期待増幅',value:(critMult-1)*critChance,factor:1+critChance/100*(critMult-1)},
  {key:'conditional',label:'条件付きダメージ',value:conditionValue,factor:condMult},
  {key:'attack',label:attacks[q.attackType][0]+'ボーナス',value:atkValue,factor:attackMult},
  {key:'vulnerable',label:'脆弱の被ダメージ増加',value:q.vulnerable?30:0,factor:vulnMult}
 ]);
 const sumBase=weaponDamage+flatDamage;
 // Rounding follows the gameplay stages approximately; nominal spread is ×1.
 function hit(isCrit,spread=1){
  if(!weaponDamage||!skillMult)return null;
  const start=Math.floor((sumBase*skillMult+q.skillFlat)*primaryMult);
  const elementStage=Math.floor(start*elemMult);
  const criticalStage=Math.floor(elementStage*(isCrit?critMult:1));
  const spreadStage=Math.floor(criticalStage*spread);
  const vsStage=Math.floor(spreadStage*condMult);
  const attackStage=Math.floor(vsStage*attackMult);
  const vulnStage=Math.floor(attackStage*vulnMult);
  const afterResistance=Math.floor(vulnStage*(1-armorCut));
  const afterType=Math.floor(afterResistance*(1-typeCut));
  const final=Math.max(1,Math.floor(afterType*(1-allCut)));
  return {start,elementStage,criticalStage,spreadStage,vsStage,attackStage,vulnStage,afterResistance,afterType,final};
 }
 const normal=hit(false),critical=hit(true),prob=critChance/100;
 const expected=normal&&critical?normal.final*(1-prob)+critical.final*prob:null;
 return {settings:q,base,weaponDamage,flatDamage,primary,eleValue,allValue,conditionValue,conditions,
 atkValue,critChance,critBonus,targetCritRed,critMult,elemMult,primaryMult,condMult,attackMult,
 armorCut,typeCut,allCut,vulnMult,resistMult,skillMult,layers,normal,critical,expected,
 hasWeapon:weaponDamage>0,estimated:true};
}
function defenseFor(stats,settings,options,type){
 const q=scenario(options),base=baseline(stats,settings);
 const category=types[type]||types.lightning;
 const bonusMR=get(stats,'bonusMR');
 const mr=get(stats,'mr')+base.int*(1+bonusMR/100);
 const armor=get(stats,'armor');
 const resist=type==='physical'?armor:mr;
 const resistCut=resistanceCut(resist,q.attackerLevel);
 const typeCut=clamp(get(stats,category[2]),0,90)/100;
 const generalCut=clamp(get(stats,'allDR'),0,90)/100;
 const dodge=clamp(get(stats,'dodge')+base.dodge,0,85)/100;
 const critRed=clamp(get(stats,'critRed'),0,100)/100;
 const flatCut=get(stats,'flatDR');
 const critMult=q.incomingCrit?1+q.incomingCritBonus/100*(1-critRed):1;
 const before=q.incomingHit*critMult;
 const afterResist=before*(1-resistCut),afterType=afterResist*(1-typeCut),afterGeneral=afterType*(1-generalCut);
 const afterFlat=Math.max(1,Math.floor(afterGeneral-flatCut));
 const dodgeExpected=afterFlat*(1-dodge);
 const relative=clamp(1-dodgeExpected/before,0,1);
 const layers=[
  {key:'resistance',label:type==='physical'?'Armor':'Magic Resist',rate:resistCut*100,cutFromBase:resistCut*100,remaining:afterResist},
  {key:'typeDR',label:category[0]+'ダメージ軽減',rate:typeCut*100,cutFromBase:(afterResist-afterType)/before*100,remaining:afterType},
  {key:'allDR',label:'共通ダメージ軽減',rate:generalCut*100,cutFromBase:(afterType-afterGeneral)/before*100,remaining:afterGeneral},
  {key:'flatDR',label:'固定ダメージ軽減',rate:null,cutFromBase:(afterGeneral-afterFlat)/before*100,remaining:afterFlat},
  {key:'dodge',label:'回避（期待値）',rate:dodge*100,cutFromBase:(afterFlat-dodgeExpected)/before*100,remaining:dodgeExpected}
 ];
 return {key:type,label:category[0],resistance:resist,resistCut,typeCut,generalCut,flatCut,dodge,critRed,critMult,before,afterFlat,dodgeExpected,
 directCut:1-afterFlat/before,expectedCut:relative,layers,missingBaseDodge:base.dodge>0};
}
function defense(stats,settings,options){
 const q=scenario(options);
 const byType=Object.keys(types).map(type=>defenseFor(stats,settings,q,type));
 return {settings:q,byType,selected:byType.find(x=>x.key===q.defenseType)};
}
window.DBPCombat={types,attacks,defaults,ranges,validateInput,scenario,baseline,resistanceCut,conditional,attack,defense};
})();