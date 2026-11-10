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
 damageType:'lightning',attackType:'special',abilityId:'other',skillPercent:100,skillFlat:0,heroLevel:70,elementalStacks:5,windcallerActive:false,unyieldingActive:false,
 enemyHealth:50,forceHealthy:false,forceInjured:false,elite:false,vulnerable:false,slowed:false,immobilized:false,stunned:false,frozen:false,lightningAbility:false,burned:false,distant:false,bleeding:false,poisoned:false,
 targetArmor:0,targetMR:0,targetTypeDR:0,targetAllDR:0,targetCritRed:0,
 defenseType:'lightning',attackerLevel:70,incomingHit:10000,incomingCrit:false,incomingCritBonus:150
});
const boolKeys=new Set(['windcallerActive','unyieldingActive','forceHealthy','forceInjured','elite','vulnerable','slowed','immobilized','stunned','frozen','lightningAbility','burned','distant','bleeding','poisoned','incomingCrit']);
const ranges={
 skillPercent:[0,100000],skillFlat:[0,1e9],heroLevel:[1,1000],enemyHealth:[0,100],elementalStacks:[0,5],
 targetArmor:[0,1e9],targetMR:[0,1e9],targetTypeDR:[0,90],targetAllDR:[0,90],targetCritRed:[0,100],
 attackerLevel:[1,1000],incomingHit:[1,1e9],incomingCritBonus:[0,10000]
};
const num=(x,fallback=0)=>{const n=Number(x);return Number.isFinite(n)?n:fallback;};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function validateInput(key,value){
 if(key==='attackType')return Object.hasOwn(attacks,value)?value:null;
 if(key==='abilityId')return ['other','lightningStorm'].includes(value)?value:null;
 if(key==='damageType'||key==='defenseType')return Object.hasOwn(types,value)?value:null;
 if(boolKeys.has(key))return value===true;
 if(Object.hasOwn(ranges,key)){
  const n=Number(value),limit=ranges[key];
  return value!==''&&Number.isFinite(n)&&n>=limit[0]&&n<=limit[1]&&(key!=='elementalStacks'||Number.isSafeInteger(n))?n:null;
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
// Registry for equipped unique powers. Temporary effects are scenario-only.
const knownPowers={
 grandmother:["The Grandmother","Crit率+5%、Critダメージ+120%（ステータスに計上済み）"],
 iron:["Iron Tyrant's Helm","与ダメージを独立で+20%（Elite/Boss +40%）"],
 schrodinger:["Schrödinger's Ring","健康・負傷を同時に成立"],
 sage:["Remnant of the Elder Sage","アビリティLv+10（ステータスに計上済み）"],
 prism:["Prismatic Heart","最も高い属性ボーナスを25%強化"],
 shoulder:["Elemental Burst Pauldron","強攻撃後6秒、火・雷・秘術+20%/スタック（最大5）"],
 unyielding:["Unyielding Cuirass","HP30%未満で被弾後4秒間無敵（CD25秒）"],
 gauntlets:["Stormcaller Gauntlets","Lightning StormのCritダメージ+150%"],
 bottomless:["Bottomless Potion Belt","ポーション所持数+4（ステータスに計上済み）"],
 greaves:["Greaves of the Arcane Edge","火・雷・秘術のスキルCritダメージ+150%"],
 windcaller:["Boots of the Windcaller","敵撃破後4秒間、移動速度+50%"]
};
const elementNames={fire:'炎',cold:'冷気',lightning:'雷',poison:'毒',arcane:'秘術'};
const fmt=n=>Number(n).toLocaleString('ja-JP',{maximumFractionDigits:2});
function equippedEffects(doc,build){
 const items={};const inventory=doc?.items||[];
 for(const [slot,ref] of Object.entries(build?.loadout||{})){
  if(!ref)continue;
  const item=inventory.find(x=>x.id===ref&&(!x.slot||x.slot===slot));
  if(item?.definitionId)items[slot]=item.definitionId;
 }
 return {schrodingerRing:items.ring1==='schrodinger'||items.ring2==='schrodinger',items};
}
function uniqueBonuses(stats,q,context={}){
 const gear=context.items||{},has=(slot,id)=>gear[slot]===id;
 const rows=[],sources=[];
 const row=(id,active,status,detail,bonus='',group='other')=>{
  rows.push({id,name:knownPowers[id][0],active,status,detail,bonus,group});
 };
 const stacks=has('shoulder','shoulder')?q.elementalStacks:0;
 const stackBonus=['fire','lightning','arcane'].includes(q.damageType)?20*stacks:0;
 if(has('shoulder','shoulder')){
  row('shoulder',stacks>0,stacks+' / 5 スタック','火・雷・秘術にそれぞれ+20%×'+stacks+'（6秒）',stackBonus?'+'+stackBonus+'% 属性':'','element');
  if(stackBonus)sources.push({key:'element',name:'エレメンタルバーストのポールドロン',value:stackBonus,detail:'20% × '+stacks+'スタック'});
 }
 // The currently largest elemental bonus after stack buffs gets ×1.25.
 const elements=['fire','cold','lightning','poison','arcane'].map(key=>({key,total:get(stats,key)+(['fire','lightning','arcane'].includes(key)?20*stacks:0)}));
 const highest=elements.reduce((max,item)=>item.total>max.total?item:max,{key:'',total:0});
 const prismBonus=has('neck','prism')&&highest.key===q.damageType&&highest.total>0?highest.total*.25:0;
 if(has('neck','prism')){
  row('prism',highest.total>0,'最高：'+(elementNames[highest.key]||'未設定'),
   (elementNames[highest.key]||'属性')+' +'+fmt(highest.total)+'%を25%強化'+(highest.key===q.damageType?'（攻撃に適用）':'（別属性）'),
   prismBonus?'+'+fmt(prismBonus)+'% 属性':'','element');
  if(prismBonus)sources.push({key:'element',name:'プリズムの心臓',value:prismBonus,detail:'最高属性+ '+fmt(highest.total)+'% × 25%'});
 }
 const elementalAbility=['fire','lightning','arcane'].includes(q.damageType);
 const greavesCrit=has('legs','greaves')&&elementalAbility?150:0;
 if(has('legs','greaves')){
  row('greaves',elementalAbility,elementalAbility?'対象属性':'対象外','火・雷・秘術スキルのCritダメージ+150%',greavesCrit?'+150% Crit':'','critical');
  if(greavesCrit)sources.push({key:'critical',name:'秘術の刃のグリーヴ',value:150,detail:'火・雷・秘術のスキル限定'});
 }
 const stormSkill=q.abilityId==='lightningStorm'&&q.damageType==='lightning'&&q.attackType==='strong';
 const gauntletCrit=has('gloves','gauntlets')&&stormSkill?150:0;
 if(has('gloves','gauntlets')){
  row('gauntlets',stormSkill,stormSkill?'Lightning Storm':'対象スキル外',
   'Lightning StormのCritダメージ+150%',gauntletCrit?'+150% Crit':'','critical');
  if(gauntletCrit)sources.push({key:'critical',name:'ストームコーラーの篭手',value:150,detail:'Lightning Storm限定'});
 }
 const ironMult=has('head','iron')?(q.elite?1.4:1.2):1;
 if(has('head','iron')){
  row('iron',true,q.elite?'Elite / Boss':'通常敵',
   '他の倍率とは独立（'+(q.elite?'40':'20')+'%増加）','×'+fmt(ironMult),'unique');
  sources.push({key:'unique',name:'鉄の暴君の兜',value:(ironMult-1)*100,detail:'独立倍率 ×'+fmt(ironMult)});
 }
 const moving=has('boots','windcaller')&&q.windcallerActive;
 if(has('boots','windcaller'))row('windcaller',moving,moving?'発動中4秒':'未発動',
  '撃破後の移動速度+50%。ダメージ倍率には含めない',moving?'+50% MS':'','utility');
 const invulnerable=has('chest','unyielding')&&q.unyieldingActive;
 if(has('chest','unyielding'))row('unyielding',invulnerable,invulnerable?'無敵発動中4秒':'未発動',
  'HP30%未満で被弾後に発動（CD25秒）。発動のきっかけとなる被弾は別判定',invulnerable?'被ダメ0':'','defense');
 if(has('ring1','schrodinger')||has('ring2','schrodinger'))row('schrodinger',true,'常時',
 '健康と負傷を同時成立させる（条件付きダメージに反映）','両条件成立','conditional');
 if(has('weapon','grandmother'))row('grandmother',true,'常時','固定Crit補正は装備ステータスで計上済み','重複計上なし','stat');
 if(has('ring1','sage')||has('ring2','sage'))row('sage',true,'常時','アビリティレベル+10はステータスに計上。スキル倍率は手動入力','Lv+10','stat');
 if(has('belt','bottomless'))row('bottomless',true,'常時','ポーション所持数+4はステータスに計上','所持数+4','stat');
 return {stacks,stackBonus,prismBonus,highestElement:highest.key,highestValue:highest.total,
  greavesCrit,gauntletCrit,ironMult,windcallerMove:moving?50:0,invulnerable,rows,sources};
}
function conditional(stats,q,context={}){
 const ring=Boolean(context.schrodingerRing);
 const healthy=q.enemyHealth>80||q.forceHealthy||ring;
 const injured=q.enemyHealth<30||q.forceInjured||ring;
 const checks=[
  ['healthy','対健康',healthy,ring?'指輪により成立':q.forceHealthy?'手動指定':'HP判定'],
  ['injured','対負傷',injured,ring?'指輪により成立':q.forceInjured?'手動指定':'HP判定'],
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
 return checks.map(([key,label,active,reason])=>({key,label,active,value:active?get(stats,key):0,stored:get(stats,key),reason:reason||'状態による判定'}));
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
function attack(stats,settings,options,context={}){
 const q=scenario(options),base=baseline(stats,settings),element=types[q.damageType][1],selected=attacks[q.attackType][1];
 const unique=uniqueBonuses(stats,q,context);
 const weaponDamage=get(stats,'weaponDamage'),flatDamage=get(stats,'damage'),primary=get(stats,'int')+base.int;
 const eleValue=get(stats,element)+unique.stackBonus+unique.prismBonus,allValue=get(stats,'allDamage');
 const conditions=conditional(stats,q,context),conditionValue=conditions.reduce((sum,x)=>sum+x.value,0);
 const atkValue=get(stats,selected);
 const conditionalBasicCrit=q.attackType==='basic'?get(stats,'basicCritChance'):0;
 const conditionalFrozenCrit=q.frozen?get(stats,'frozenCritChance'):0;
 const conditionalLightningCrit=q.damageType==='lightning'&&q.lightningAbility?get(stats,'lightningAbilityCritDamage'):0;
 const critChance=clamp(get(stats,'critChance')+base.critChance+conditionalBasicCrit+conditionalFrozenCrit,0,85);
 const critBonus=get(stats,'critDamage')+base.critDamage+conditionalLightningCrit+(q.frozen?get(stats,'frozenCritDamage'):0)+unique.greavesCrit+unique.gauntletCrit,targetCritRed=q.targetCritRed;
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
  {key:'vulnerable',label:'脆弱の被ダメージ増加',value:q.vulnerable?30:0,factor:vulnMult},
  {key:'unique',label:'装備固有の独立倍率',value:(unique.ironMult-1)*100,factor:unique.ironMult}
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
  const uniqueStage=Math.floor(vulnStage*unique.ironMult);
  const afterResistance=Math.floor(uniqueStage*(1-armorCut));
  const afterType=Math.floor(afterResistance*(1-typeCut));
  const final=Math.max(1,Math.floor(afterType*(1-allCut)));
  return {start,elementStage,criticalStage,spreadStage,vsStage,attackStage,vulnStage,uniqueStage,afterResistance,afterType,final};
 }
 const normal=hit(false),critical=hit(true),prob=critChance/100;
 const expected=normal&&critical?normal.final*(1-prob)+critical.final*prob:null;
 return {settings:q,base,weaponDamage,flatDamage,primary,eleValue,allValue,conditionValue,conditions,unique,
 atkValue,critChance,critBonus,targetCritRed,critMult,elemMult,primaryMult,condMult,attackMult,
 armorCut,typeCut,allCut,vulnMult,resistMult,skillMult,layers,normal,critical,expected,
 hasWeapon:weaponDamage>0,equippedEffects:context,estimated:true};
}
function defenseFor(stats,settings,options,type,context={}){
 const q=scenario(options),base=baseline(stats,settings);
 const invulnerable=context?.items?.chest==='unyielding'&&q.unyieldingActive;
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
 const noImmunityAfterFlat=Math.max(1,Math.floor(afterGeneral-flatCut));
 const afterFlat=invulnerable?0:noImmunityAfterFlat;
 const dodgeExpected=afterFlat*(1-dodge);
 const relative=clamp(1-dodgeExpected/before,0,1);
 const layers=[
  {key:'resistance',label:type==='physical'?'Armor':'Magic Resist',rate:resistCut*100,cutFromBase:resistCut*100,remaining:afterResist},
  {key:'typeDR',label:category[0]+'ダメージ軽減',rate:typeCut*100,cutFromBase:(afterResist-afterType)/before*100,remaining:afterType},
  {key:'allDR',label:'共通ダメージ軽減',rate:generalCut*100,cutFromBase:(afterType-afterGeneral)/before*100,remaining:afterGeneral},
  {key:'flatDR',label:'固定ダメージ軽減',rate:null,cutFromBase:(afterGeneral-noImmunityAfterFlat)/before*100,remaining:noImmunityAfterFlat},
  ...(invulnerable?[{key:'uniqueInvulnerable',label:'不屈の胸当て：無敵発動中',rate:100,cutFromBase:noImmunityAfterFlat/before*100,remaining:0}]:[]),
  {key:'dodge',label:'回避（期待値）',rate:dodge*100,cutFromBase:(afterFlat-dodgeExpected)/before*100,remaining:dodgeExpected}
 ];
 return {key:type,label:category[0],resistance:resist,resistCut,typeCut,generalCut,flatCut,dodge,critRed,critMult,before,afterFlat,dodgeExpected,invulnerable,
 directCut:1-afterFlat/before,expectedCut:relative,layers,missingBaseDodge:base.dodge>0};
}
function defense(stats,settings,options,context={}){
 const q=scenario(options);
 const byType=Object.keys(types).map(type=>defenseFor(stats,settings,q,type,context));
 return {settings:q,byType,selected:byType.find(x=>x.key===q.defenseType)};
}
window.DBPCombat={types,attacks,defaults,ranges,knownPowers,validateInput,scenario,baseline,resistanceCut,equippedEffects,uniqueBonuses,conditional,attack,defense};
})();