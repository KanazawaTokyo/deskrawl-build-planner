/* Event-driven Sorcerer combat simulator — deliberately an experimental model.
 * No game client integration. Never mutate a saved build or infer an enemy's HP.
 * Skill timing assumptions are explicit; do not describe output as measured DPS.
 */
(function(){'use strict';
const D=window.DBP,C=window.DBPCalc,B=window.DBPCombat,R=window.DBPRunes,V=window.DBPStatsView,T=window.DBPTalents;
const version='combat-event-v1.0';
const defaults=Object.freeze({
 skill:'lightningStorm',duration:30,enemyHp:null,mode:'expected',seed:42,
 stormInterval:1,stormHits:1,frostTick:null,frostCooldown:null,
 manaRegen:null,initialMana:null,autoNova:false,novaCooldown:null,
 incomingHit:null,incomingEvery:null,incomingType:'physical'
});
const numeric={
 duration:[0.5,120],enemyHp:[1,1e14],seed:[1,4294967295],
 stormInterval:[0.15,10],stormHits:[1,3],frostTick:[0.05,1],
 frostCooldown:[0,20],manaRegen:[0,1e6],initialMana:[0,1e7],
 novaCooldown:[0.2,120],incomingHit:[0,1e12],incomingEvery:[0.1,30]
};
const integer=new Set(['seed','stormHits']);
const optional=new Set(['enemyHp','frostTick','frostCooldown','manaRegen','initialMana','novaCooldown','incomingHit','incomingEvery']);
const clone=x=>JSON.parse(JSON.stringify(x));
const min=(x,y)=>Math.min(x,y);
const n=v=>Number(v);
const fmt=v=>Number(v).toLocaleString('ja-JP',{maximumFractionDigits:3});
function options(source={}){
 const parsed={...defaults},issues=[];
 for(const [key,val] of Object.entries(source||{})){
  if(key==='skill'){if(['lightningStorm','frostBeam'].includes(val))parsed.skill=val;else issues.push('未対応のスキル');continue}
  if(key==='mode'){if(['expected','sampled'].includes(val))parsed.mode=val;else issues.push('不正な計算モード');continue}
  if(key==='autoNova'){if(typeof val==='boolean')parsed.autoNova=val;else issues.push('Ice Novaの設定が不正');continue}
  if(key==='incomingType'){if(['physical','fire','cold','lightning','poison','arcane'].includes(val))parsed.incomingType=val;else issues.push('敵のダメージ属性が不正');continue}
  if(!Object.hasOwn(numeric,key))continue;
  if(optional.has(key)&&(val===null||val===undefined||val==='')){parsed[key]=null;continue}
  if(val===null||val===undefined||val===''||typeof val==='boolean'){issues.push(key+'が未入力または不正');continue}
  const value=n(val),[lo,hi]=numeric[key];
  if(!Number.isFinite(value)||value<lo||value>hi||(integer.has(key)&&!Number.isSafeInteger(value)))issues.push(key+'が範囲外');
  else parsed[key]=value;
 }
 if((parsed.incomingHit===null)!==(parsed.incomingEvery===null))issues.push('敵の被弾量・被弾間隔は両方入力してください');
 return {config:parsed,issues};
}
function rng(seed){let s=seed>>>0;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
function prepared(state,build){
 const sc=V.config(build.settings||{}),filters={...sc.filters,powers:sc.powers,slots:sc.slots};
 const stats=C.calc(state,build,{sourceFilters:filters});
 const equipped=B.equippedEffects(state,build),items={};
 if(sc.filters.unique)for(const [slot,id] of Object.entries(equipped.items))
  if(sc.slots[slot]!==false&&sc.powers[id]!==false)items[slot]=id;
 return {stats,context:{...equipped,items,schrodingerRing:items.ring1==='schrodinger'||items.ring2==='schrodinger'}};
}
function evaluate(state,build,source){
 if(!state||!build)return {ok:false,reason:'ビルドが見つかりません'};
 const {stats,context}=prepared(state,build);
 return simulate(stats,build.settings||{},context,source||build.settings?.engine||{});
}
function simulate(stats,settings={},context={},source={}){
 const parsed=options(source),o=parsed.config;
 if(parsed.issues.length)return {ok:false,reason:parsed.issues.join('、'),options:o};
 const maxMana=Number(stats?.effective?.mana);
 if(!Number.isFinite(maxMana)||maxMana<=0)return {ok:false,reason:'最大Manaが不足しています。ビルドの基礎値やパラゴンを確認してください。',options:o};
 const q=B.scenario(settings.combat||{});
 const manaReduction=Math.max(0,min(85,n(stats?.effective?.mcr)||0));
 const cooldownReduction=Math.max(0,min(80,n(stats?.effective?.cdr)||0));
 const manaRegen=o.manaRegen??Math.max(0,n(stats?.effective?.manaRegen)||0);
 const selected=R?.selection(settings||{})||{counts:{}};
 const absoluteZeroCount=selected.counts?.absoluteZero||0;
 const rune4=absoluteZeroCount>=4,rune6=absoluteZeroCount>=6;
 const interval=o.frostTick??(rune4?0.2:0.33),channelDuration=3;
 const frostCooldown=o.frostCooldown??3.25*(1-cooldownReduction/100);
 const novaCooldown=o.novaCooldown??22*(1-cooldownReduction/100);
 const rime=context?.items?.gloves==='bm-patch-rimebound-grasp';
 const shoulder=context?.items?.shoulder==='shoulder';
 const maxPlayerHP=n(stats?.effective?.maxHP)||0;
 if(o.incomingHit!=null&&maxPlayerHP<=0)return {ok:false,reason:'敵の攻撃を設定した場合は、現在の最大HPを登録してください。',options:o};
 const baseMana=Math.max(0,min(maxMana,o.initialMana??maxMana));
 const expectedMode=o.mode==='expected';
 const random=rng(o.seed);
 const costStorm=50*(1-manaReduction/100);
 const costFrost=45*(1-manaReduction/100);
 const novaRank=T?.allocation(settings||{})?.ranks?.frozenReservoir||0;
 const novaChance=Math.max(0,min(1,n(novaRank)*0.125)),novaRestore=novaRank?50+10*novaRank:0;
 const novaMean=novaChance*novaRestore;
 const warnings=[
  '攻撃間隔、フロストビームのヒット開始時刻とCD起点、敵の位置・命中率は仮定値です。',
  '被弾の間隔・威力は手入力。敵AI、敵の移動、回復・LoH、ペット攻撃、追加弾・DoTは未再現。',
  '初期のAura・デバフ等は現在の戦闘設定が全期間有効と仮定します。'
 ];
 if(rime)warnings.push('Rimebound Graspの追加5 Mana/ヒットはMCRを適用しない仮定。支払い不足時はチャネリングを中断します。');
 if(o.frostTick!==null)warnings.push('Frost Beamのヒット間隔を手動指定しています。Absolute Zero 4セット補正との重複に注意。');
 if(!expectedMode)warnings.push('試行モードはCrit/回避/Ice Novaの確率のみ乱数化。ゲーム内のダメージ乱数・AIは未再現。');
 if(stats?.pending?.length)warnings.push('装備・設定由来の未確定項目が'+stats.pending.length+'件あります。値の正しさは未保証です。');
 const result={ok:true,options:o,version,masterVersion:D.version,statsPending:stats?.pending||[],assumptions:warnings,
  equipment:{rime,shoulder},runes:{absoluteZero: absoluteZeroCount,beamTick:interval,rune4,rune6},
  casts:0,stormHits:0,frostTicks:0,channels:0,cutChannels:0,novaCasts:0,
  missedActions:0,incomingHits:0,damage:0,appliedDamage:0,takenDamage:0,
  killTime:null,deathTime:null,events:[],duration:o.duration,
  startMana:baseMana,maxMana,manaCostStorm:costStorm,manaCostBeam:costFrost,manaRegen,
  startHP:maxPlayerHP>0?maxPlayerHP:null,playerHP:maxPlayerHP>0?maxPlayerHP:null,
  enemyMaxHP:o.enemyHp,enemyHP:o.enemyHp,endedAt:o.duration,mode:o.mode};
 const events=[],eps=1e-7;let seq=0,now=0,mana=baseMana,playerHp=maxPlayerHP||null,
  enemyHP=o.enemyHp,buff=null,channel=null,channelNumber=0,nextFrost=0,nextNova=0,ended=false;
 const push=(at,type,detail={})=>{
  if(!Number.isFinite(at)||at<now-eps||at>o.duration+eps)return;
  events.push({t:at,type,detail,seq:seq++});
 };
 function record(type,extra={}){
  if(result.events.length<700)result.events.push({t:Number(now.toFixed(4)),type,
   mana:Number(mana.toFixed(3)),enemyHP,playerHP:playerHp,stacks:buff?.stacks||0,...extra});
 }
 function moveTo(t){
  const dt=Math.max(0,t-now);
  mana=min(maxMana,mana+dt*manaRegen);
  now=t;
  if(buff&&buff.until<=now+eps){buff=null;}
 }
 function addBuff(){
  if(!shoulder)return;
  buff={stacks:min(5,(buff?.stacks||0)+1),until:now+6};
  push(buff.until,'buffExpire',{until:buff.until});
  record('burst-buff',{stacks:buff.stacks});
 }
 function attack(skill,extra={}){
  const percent=skill==='frostBeam'
   ?(B.skillRank(settings,stats,'frostBeam')?.percent??60)+(rune6?200*Math.floor((extra.elapsed+eps)/0.5):0)
   :null;
  const dyn={...q,abilityId:skill==='frostBeam'?'other':'lightningStorm',
   ...(skill==='frostBeam'?{attackType:'strong',damageType:'cold',skillPercent:percent,skillFlat:0}:{}),
   elementalStacks:buff?.stacks||0};
  if(enemyHP!==null)dyn.enemyHealth=100*min(1,Math.max(0,enemyHP/o.enemyHp));
  const dynamicStats=extra.critBonus?{...stats,effective:{...stats.effective,critDamage:(n(stats.effective.critDamage)||0)+extra.critBonus}}:stats;
  const h=B.attack(dynamicStats,settings,dyn,context);
  const value=expectedMode?h.expected:
   (random()<h.critChance/100?h.critical?.final:h.normal?.final);
  if(!Number.isFinite(value)||value<=0)return {ok:false,value:0};
  const total=value*(skill==='lightningStorm'?o.stormHits:1);
  result.damage+=total;
  const applied=enemyHP===null?total:min(enemyHP,total);
  result.appliedDamage+=applied;
  if(enemyHP!==null){
   enemyHP=Math.max(0,enemyHP-total);
   if(enemyHP<=eps){result.killTime=now;ended=true;enemyHP=0;}
  }
  return {ok:true,value:total,percent,hits:skill==='lightningStorm'?o.stormHits:1};
 }
 const initialHit=(()=>{const dyn={...q,abilityId:o.skill};return B.attack(stats,settings,dyn,context)})();
 if(!Number.isFinite(initialHit.expected)||initialHit.expected<=0)
  return {ok:false,reason:'武器ダメージまたはスキル係数が不足しています。装備登録を確認してください。',options:o};
 function nova(){
  if(!o.autoNova||novaRank<=0||now+eps<nextNova||maxMana-mana<novaMean*0.5)return false;
  const gain=expectedMode?novaMean:(random()<novaChance?novaRestore:0);
  mana=min(maxMana,mana+gain);
  nextNova=now+novaCooldown;
  result.novaCasts++;
  record('ice-nova',{recovered:gain});
  return true;
 }
 function action(){
  if(channel?.active)return;
  if(o.autoNova&&nova() ){
   push(now+(o.skill==='lightningStorm'?o.stormInterval:0.15),'action');
   return;
  }
  if(o.skill==='lightningStorm'){
   if(mana+eps>=costStorm){
    mana-=costStorm;result.casts++;const hit=attack('lightningStorm');
    result.stormHits+=hit.ok?o.stormHits:0;
    record('storm',{damage:hit.value,hitCount:o.stormHits});
    addBuff();
   }else{result.missedActions++;record('mana-shortage');}
   push(now+o.stormInterval,'action');
   return;
  }
  if(now+eps<nextFrost){push(nextFrost,'action');return;}
  if(mana+eps<costFrost){result.missedActions++;record('mana-shortage');push(now+0.25,'action');return;}
  mana-=costFrost;result.casts++;result.channels++;nextFrost=now+frostCooldown;
  addBuff();
  const id=++channelNumber;
  channel={id,active:true,start:now,ends:now+channelDuration};
  record('beam-start',{cooldownReady:nextFrost});
  for(let i=1;i*interval<=channelDuration+eps;i++)push(now+i*interval,'beamTick',{id});
  push(now+channelDuration,'beamEnd',{id});
 }
 function beamTick(id){
  if(!channel?.active||channel.id!==id)return;
  const elapsed=Math.max(0,now-channel.start);
  if(rime){
   if(mana+eps<5){
    channel.active=false;result.cutChannels++;
    record('beam-interrupt',{reason:'Rimebound Grasp追加Mana不足'});
    push(Math.max(now+0.01,nextFrost),'action');
    return;
   }
   mana-=5;
  }
  const hit=attack('frostBeam',{elapsed,critBonus:rime?120*Math.floor((elapsed+eps)/1):0});
  result.frostTicks++;
  record('beam-tick',{damage:hit.value,percent:hit.percent,elapsed:Number(elapsed.toFixed(3))});
 }
 function enemyStrike(){
  if(o.incomingHit===null||playerHp===null)return;
  const incomingOptions={...q,defenseType:o.incomingType,
   attackerLevel:Number(settings?.enemyLevel)||70,incomingHit:o.incomingHit,
   incomingCrit:false,unyieldingActive:false};
  const d=B.defense(stats,settings,incomingOptions,context).selected;
  if(d){
   const base=expectedMode?d.dodgeExpected:(random()<d.dodge?0:d.afterFlat);
   const reduced=channel?.active&&rune4?base*0.75:base;
   playerHp=Math.max(0,playerHp-reduced);
   result.takenDamage+=reduced;result.incomingHits++;
   record('enemy-hit',{damage:reduced,channelReduction:!!(channel?.active&&rune4)});
   if(playerHp<=eps){result.deathTime=now;ended=true;playerHp=0;}
  }
  push(now+o.incomingEvery,'enemyStrike');
 }
 push(0,'action');
 if(o.incomingEvery!==null&&o.incomingHit!==null)push(o.incomingEvery,'enemyStrike');
 let processed=0;
 while(events.length&&!ended){
  events.sort((a,b)=>a.t-b.t||a.seq-b.seq);
  const next=events.shift();if(next.t>o.duration+eps)break;
  moveTo(next.t);processed++;
  if(processed>3500){warnings.push('イベント数上限に達して計算を中断しました');break;}
  if(next.type==='action'&&now<o.duration-eps)action();
  else if(next.type==='beamTick')beamTick(next.detail.id);
  else if(next.type==='beamEnd'){
   if(channel?.active&&channel.id===next.detail.id){
    channel.active=false;record('beam-end');
    push(Math.max(now+0.01,nextFrost),'action');
   }
  }else if(next.type==='enemyStrike')enemyStrike();
  else if(next.type==='buffExpire'&&buff?.until===next.detail.until&&buff.until<=now+eps){buff=null;record('buff-expire');}
 }
 if(!ended)moveTo(o.duration);
 result.endedAt=Number(now.toFixed(4));
 result.eventsProcessed=processed;
 result.endMana=mana;
 result.enemyHP=enemyHP;
 result.playerHP=playerHp;
 result.averageDps=result.damage/(result.endedAt||o.duration);
 result.activeDps=result.damage/o.duration;
 result.outcome=result.killTime!==null?'victory':result.deathTime!==null?'death':'time-limit';
 record('end');
 return result;
}
window.DBPCombatEngine={version,defaults,numeric,options,rng,prepared,evaluate,simulate};
})();