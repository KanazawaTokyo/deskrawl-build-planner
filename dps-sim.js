/* Deskrawl Stormcaller sustained damage v0.1.
 * Deterministic single-target hit budget, NOT a reconstructed combat AI.
 * Verified abilities: Lightning Storm 50 Mana, Ice Nova 22s CD;
 * Frozen Reservoir rank 8 restores 130 Mana at 100% chance.
 * Unknown GCD, AI timing, mana regen and multi-hit targeting are explicit inputs.
 */
(function(){'use strict';
const B=window.DBPCombat,T=window.DBPTalents;
const defaults=Object.freeze({duration:30,attackInterval:1,autoNova:true,hitsPerCast:1});
const limits=Object.freeze({duration:[15,30,60],attackInterval:[0.2,5],hitsPerCast:[1,3],
 manaRegen:[0,200],novaCooldown:[0.2,60],initialMana:[0,100000]});
const optional=new Set(['manaRegen','novaCooldown','initialMana']);
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function validate(key,value){
 if(key==='autoNova')return value===true;
 if(!Object.hasOwn(limits,key))return undefined;
 if(value===''&&optional.has(key))return null;
 if(value===null||value===undefined||String(value).trim()==='')return undefined;
 const n=Number(value),allowed=limits[key];
 if(!Number.isFinite(n))return undefined;
 if(key==='duration')return allowed.includes(n)?n:undefined;
 if(n<allowed[0]||n>allowed[1])return undefined;
 if(key==='hitsPerCast'&&!Number.isInteger(n))return undefined;
 return n;
}
function config(source){
 const out={...defaults};
 for(const [k,v] of Object.entries(source||{})){
  const n=validate(k,v);
  if(n===undefined)continue;
  if(n===null)delete out[k];else out[k]=n;
 }
 return out;
}
function talentRank(settings){
 if(!T)return 0;
 const result=T.allocation(settings||{});
 return clamp(Math.floor(Number(result.ranks?.frozenReservoir||0)),0,8);
}
function simulate(stats,settings={},context={}){
 const options=config(settings.dps);
 const q=B.scenario(settings.combat);
 if(q.abilityId!=='lightningStorm')return {ok:false,reason:'持続DPS v0.1はライトニングストーム専用です。上の「使用スキル」をLightning Stormに切り替えてください。',options};
 const hit=B.attack(stats,settings,q,context);
 if(!Number.isFinite(hit.expected)||hit.expected<=0)return {ok:false,reason:'武器ダメージまたはライトニングストームのダメージを計算できません。装備を確認してください。',options};
 const totalMana=Number(stats?.effective?.mana);
 if(!Number.isFinite(totalMana)||totalMana<=0)return {ok:false,reason:'最大Manaが登録されていません。タレント・パラゴン・基礎値を確認してください。',options};
 const cap=totalMana,mcr=clamp(Number(stats.effective.mcr)||0,0,85),
 cdr=clamp(Number(stats.effective.cdr)||0,0,80);
 const baseCost=50,spent=baseCost*(1-mcr/100);
 const iceCooldown=options.novaCooldown??22*(1-cdr/100);
 const baseRegen=Math.max(0,Number(stats.effective.manaRegen)||0);
 const regen=options.manaRegen??baseRegen;
 const initial=clamp(options.initialMana??cap,0,cap);
 const rank=talentRank(settings),procChance=rank*0.125,
 recovery=rank?50+10*rank:0,meanRecovery=recovery*procChance;
 const interval=options.attackInterval,duration=options.duration;
 const samples=[{t:0,mana:initial,event:'start'}];
 let mana=initial,casts=0,novaCasts=0,insufficient=0,damage=0,nextNova=0,prevTime=0;
 // The hypothetical Ice Nova is used when at least half its expected recovery
 // could be useful. Nova and Storm consume one shared action opportunity.
 // Auto play cast priority and global cooldown are not established facts.
 for(let slot=0;slot<Math.ceil(duration/interval);slot++){
  const t=slot*interval;
  if(t>=duration-1e-9)break;
  mana=Math.min(cap,mana+regen*Math.max(0,t-prevTime));prevTime=t;
  const availableRoom=cap-mana;
  let event='idle';
  const canNova=options.autoNova&&rank>0&&t+1e-8>=nextNova&&
   availableRoom>=Math.min(cap,meanRecovery)*0.5-1e-8&&availableRoom>=0.000001;
  if(canNova){
   mana=Math.min(cap,mana+meanRecovery);
   novaCasts++;
   nextNova=t+iceCooldown;event='nova';
  }else if(mana+1e-8>=spent){
   mana=Math.max(0,mana-spent);
   casts++;
   damage+=hit.expected*options.hitsPerCast;
   event='storm';
  }else{
   insufficient+=Math.min(interval,duration-t);
   event='insufficient';
  }
  samples.push({t:Math.min(duration,t+1e-5),mana,event});
 }
 // Advance natural regeneration up to the end of the requested window.
 if(duration>prevTime)mana=Math.min(cap,mana+regen*(duration-prevTime));
 samples.push({t:duration,mana,event:'end'});
 return {ok:true,options,settings:{...q},duration,hit,
  maxMana:cap,initialMana:initial,mcr,cdr,manaCost:spent,baseCost,
  regen,regenFromStats:baseRegen,
  novaRank:rank,novaCooldown:iceCooldown,novaRecovery:recovery,
  novaProcChance:procChance,novaMeanRecovery:meanRecovery,
  castInterval:interval,hitsPerCast:options.hitsPerCast,
  stormCasts:casts,novaCasts,hitCount:casts*options.hitsPerCast,
  starvedSeconds:Math.min(duration,insufficient),endMana:mana,
  totalDamage:damage,averageDps:damage/duration,samples,
  assumptions:[
   '詠唱間隔は実測入力。攻撃速度・ゲーム内AI・GCDから自動推定しない',
   'Ice Novaは期待回復量の半分以上のManaが不足したタイミングで使用し、攻撃1枠分の時間を消費すると仮定',
   'ランク8以外のIce Nova回復は確率を平均化。実際のランダム発動は未再現',
   'バフ・デバフ・敵の防御は計算タブで指定した条件が全時間にわたり固定',
   '基本攻撃・マナ獲得、他の特殊攻撃、Rune追撃、DoT、ペット発動、移動、命中失敗は未計算'
  ]};
}
window.DBPDpsSim={defaults,limits,validate,config,talentRank,simulate};
})();
