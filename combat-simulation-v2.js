/* Multi-entity, event-driven Sorcerer experiment — no side effects, no server calls.
 * This is deliberately a constrained model, NOT a reverse-engineered game client.
 */
(function(){'use strict';
const Rule=window.DBPSimulationRules,Combat=window.DBPCombat,Calc=window.DBPCalc,
 Stats=window.DBPStatsView,Runes=window.DBPRunes,Talents=window.DBPTalents;
const EPS=1e-7,clamp=(v,low,high)=>Math.max(low,Math.min(high,v));
const round=(v,d=3)=>Number(v.toFixed(d));
const n=v=>Number.isFinite(Number(v))?Number(v):0;
function rng(seed){let s=(seed>>>0)||42;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
class Heap{
 constructor(){this.data=[];this.seq=0}
 push(at,type,data={}){
  const ev={at,type,data,seq:this.seq++},a=this.data;let i=a.length;a.push(ev);
  while(i>0){const p=(i-1)>>1;if(a[p].at<at||(a[p].at===at&&a[p].seq<=ev.seq))break;
   a[i]=a[p];i=p;}a[i]=ev;
 }
 pop(){
  const a=this.data,first=a[0],last=a.pop();if(!a.length)return first;
  let i=0;while(2*i+1<a.length){
   let child=2*i+1;if(child+1<a.length&&(a[child+1].at<a[child].at||
    a[child+1].at===a[child].at&&a[child+1].seq<a[child].seq))child++;
   if(a[child].at>last.at||a[child].at===last.at&&a[child].seq>last.seq)break;
   a[i]=a[child];i=child;
  }a[i]=last;return first;
 }
 get length(){return this.data.length}
}
function prepared(state,build){
 const cfg=Stats.config(build.settings||{}),filters={...cfg.filters,powers:cfg.powers,slots:cfg.slots};
 // Never bake an active Aura into the base stats: the timeline applies it only
 // while the self-buff is actually active. Also excludes Aura-only talent defenses
 // when Aura is down.
 const stats=Calc.calc(state,build,{sourceFilters:{...filters,aura:false}});
 const equipped=Combat.equippedEffects(state,build),items={};
 if(cfg.filters.unique)for(const [slot,id] of Object.entries(equipped.items)){
  if(cfg.slots[slot]!==false&&cfg.powers[id]!==false)items[slot]=id;
 }
 return {stats,context:{...equipped,items,schrodingerRing:items.ring1==='schrodinger'||items.ring2==='schrodinger'}};
}
function evaluate(state,build,raw){
 if(!build||!state)return {ok:false,reason:'ビルドが選択されていません'};
 const {stats,context}=prepared(state,build);
 return simulate(stats,build.settings||{},context,raw??build.settings?.lab??{});
}
function simulate(stats,settings={},context={},raw={}){
 const {config:o,issues}=Rule.normalize(raw);
 if(issues.length)return {ok:false,reason:issues.join(' / '),options:o};
 const dummyMode=o.mode==='dummy';
 if(o.enemyHP===null&&!dummyMode)return {ok:false,reason:'敵HPが未入力です。ゲーム実測または明示した仮定値を入力してください。',options:o};
 const effective=stats?.effective||{},maxMana=n(effective.mana),maxHP=n(effective.maxHP);
 if(maxMana<=0||n(effective.weaponDamage)<=0)return {ok:false,reason:'最大Manaと武器ダメージが必要です。装備・設定を確認してください。',options:o};
 if(o.enemyIncoming>0&&maxHP<=0)return {ok:false,reason:'被弾を計算するには最大HPが必要です',options:o};
 const mode=Rule.skills,selected=Runes.selection(settings),talents=Talents.allocation(settings).ranks;
 const aura=Rule.flameAuraBonuses(settings,stats);
 const stormCount=selected.counts.stormcaller||0,zeroCount=selected.counts.absoluteZero||0;
 const runeSplash=stormCount>=4,runeBall=stormCount>=6,runeBeam4=zeroCount>=4,runeBeam6=zeroCount>=6;
 const coolRed=clamp(n(effective.cdr),0,80),manaRed=clamp(n(effective.mcr),0,85),
  weaponSpeed=n(effective.weaponSpeed)||1,attackSpeed=weaponSpeed*(1+n(effective.as)/100);
 const regen=o.manaRegen??Math.max(0,n(effective.manaRegen)),chanceCrit=o.randomCrit,random=rng(o.seed);
 const gcd=0.75*(1-coolRed/100),gcdFloor=0.15;
 const ctxBase=Combat.scenario(settings.combat||{});
 if(dummyMode){
  // A dummy cannot be inferred to be Healthy, Injured, Elite, Stunned or
  // Vulnerable just because a saved damage-tab scenario has every toggle on.
  // Effects visibly observed in the video still require timed simulation.
  for(const key of ['forceHealthy','forceInjured','elite','vulnerable','slowed',
   'immobilized','stunned','frozen','burned','distant','bleeding','poisoned'])
   ctxBase[key]=false;
  ctxBase.enemyHealth=50;
 }
 const output={
  ok:true,options:o,version:'combat-runtime-v2.0',ruleVersion:Rule.version,
  outcome:'timeout',duration:o.duration,finishTime:null,processed:0,buildName:settings.name||'',
  wavesCleared:0,wavesSpawned:0,kills:0,casts:0,events:[],totalDamage:0,appliedDamage:0,
  damageBySource:{storm:0,splash:0,ball:0,basic:0,beam:0,special:0},
  hitsBySource:{storm:0,splash:0,ball:0,basic:0,beam:0,special:0},
  manaMax:maxMana,manaEnd:null,manaSpent:0,manaRestored:0,manaFromKills:0,
  hpMax:maxHP,hpEnd:maxHP,damageTaken:0,deathTime:null,
  waitSeconds:0,actionCounts:{basic:0,strong:0,special:0},skillCasts:{},
  stormHits:0,stormBalls:0,ballPulses:0,beamTicks:0,beamInterruptions:0,
  auraCasts:0,auraLevel:aura.level,auraCritChance:aura.critChance,auraCritDamage:aura.critDamage,
  auraUptimeSeconds:0,auraUptimePercent:0,
  modelCoverage:{represented:[],approximate:[],notModeled:[]},warnings:[]
 };
 const coverage=output.modelCoverage;
 coverage.represented.push('基本・強攻撃・特殊2枠の優先度','ManaとCD','複数敵のHP','撃破時Mana回復','Wave間の待機');
 if(dummyMode){
  coverage.represented.push('ダミーの不死・撃破回復なし・設定時間まで継続');
  coverage.approximate.push('ダミーの防御値・対象種別は未校正');
 }
 coverage.approximate.push('行動停止時間・GCD','落雷対象選択・時間差','範囲命中判定','敵の位置（静的配置）');
 coverage.represented.push('フレイムオーラ：21秒CD・5秒Critバフ・スキルレベル補正');
 coverage.approximate.push('フレイムオーラ：使用後の停止時間と再使用の実戦挙動は未校正');
 coverage.notModeled.push('敵の移動・衝突・進路','敵AIのスキル選択','ペット攻撃・継承','一部の固有・ルーン追加効果','DoT・継続回復・凍結AI・エレメンタル状態');
 if(runeBall)coverage.approximate.push('Stormcaller6: 雷球3パルス（間隔・範囲は仮定）');
 if(runeSplash)coverage.approximate.push('Stormcaller4: 範囲攻撃（重複扱いは近似）');
 if(runeBeam4||runeBeam6)coverage.approximate.push('Absolute Zero: tick間隔・係数増加（開始時刻は近似）');
 if(stats.pending?.length)output.warnings.push('装備・スキル登録で未確認項目が'+stats.pending.length+'件');
 if(selected.issues.length)output.warnings.push('ルーン設定に不整合：'+selected.issues.join(' / '));
 if(selected.equipped.some(r=>r.unverifiedPieceStats))output.warnings.push('新セットルーンの個別OP/スキルレベルが未検証です');
 output.warnings.push('入力した敵HP・Wave・配置・出現間隔は仮想条件であり、公式マップの確定値ではありません');
 output.warnings.push('攻撃範囲は1次元距離で近似し、Stormの対象はユーザー選択の分配方式を使用します');
 output.warnings.push('スキル発動後の停止時間、雷球のパルス間隔・範囲は未校正。ゲーム内の完全な戦闘AIではありません');
 if(chanceCrit)output.warnings.push('クリティカルのみSeedでサンプリング。ゲーム固有の乱数・ペット・追加発動は未再現');
 if(dummyMode)output.warnings.push('ダミーは撃破できない仮想対象として計算。残HP、健康/負傷、通常敵/ボス分類、各種デバフを自動的に仮定しません。動画で見えた燃焼・脆弱・スタック効果は未再現');
 const q=new Heap();let time=0,mana=clamp(o.initialMana??maxMana,0,maxMana),hp=maxHP,
 wave=0,live=[],enemySeq=0,waitingFrom=0,lastClear=0,
 nextGcd=0,standingUntil=0,channel=null,shoulderUntil=0,shoulderStacks=0,
 auraUntil=0,
 lastBasic=0,actedAt=-Infinity,actionPending=false,over=false,enemyStrikeStarted=false;
 const nextReady=[0,0,0,0];
 const end=o.duration,maxEvents=45000,maxLog=320;
 function log(type,detail={}){
  if(output.events.length>=maxLog)return;
  output.events.push({t:round(time,3),type,mana:round(mana,2),hp:round(hp,2),wave,...detail});
 }
 function scheduleAction(t){
  if(t>end+EPS||over||actionPending)return;
  actionPending=true;q.push(t,'action');
 }
 function move(t){if(t<time-EPS)throw Error('シミュレーションの時刻が逆転しました');
  if(auraUntil>time+EPS)output.auraUptimeSeconds+=Math.max(0,Math.min(t,auraUntil)-time);
  mana=Math.min(maxMana,mana+Math.max(0,t-time)*regen);
  time=t;if(shoulderUntil>0&&time>=shoulderUntil-EPS){shoulderUntil=0;shoulderStacks=0;}
 }
 function targets(range=o.playerRange){
  return live.filter(e=>e.hp>EPS&&e.x<=Math.min(range,o.playerRange)+EPS).sort((a,b)=>a.x-b.x||a.id-b.id);
 }
 function nearest(){return targets()[0]||null}
 function checkWaveClear(){
  if(live.some(e=>e.hp>EPS)||!live.length)return;
  output.wavesCleared++;lastClear=time;log('wave-clear',{wave});
  live=[];
  if(wave>=o.waveCount){output.outcome='clear';output.finishTime=round(time,4);over=true;return;}
  waitingFrom=time;q.push(time+o.spawnGap,'spawn');
 }
 function spawn(){
  if(wave>=o.waveCount)return;
  if(wave>0)output.waitSeconds+=time-waitingFrom;
  wave++;output.wavesSpawned++;
  const boss=o.bossEvery>0&&wave%o.bossEvery===0,
   count=o.mode==='single'?1:o.enemiesPerWave;
  live=Array.from({length:count},(_,i)=>({
   id:++enemySeq,x:o.enemyDistance+i*o.enemySpacing,
   maxHP:dummyMode?1e15:o.enemyHP*(boss?o.bossMultiplier:1),
   hp:dummyMode?1e15:o.enemyHP*(boss?o.bossMultiplier:1),boss:dummyMode?false:boss
  }));
  log('spawn',{count,boss,enemyHp:live[0].hp});
  if(!enemyStrikeStarted&&o.enemyIncoming>0){enemyStrikeStarted=true;q.push(time+o.enemyAttackEvery,'enemy-hit')}
  scheduleAction(time);
 }
 function apply(target,value,source){
  if(!target||target.hp<=EPS||!Number.isFinite(value)||value<=0)return;
  output.totalDamage+=value;output.damageBySource[source]=(output.damageBySource[source]||0)+value;
  output.hitsBySource[source]=(output.hitsBySource[source]||0)+1;
  if(dummyMode){output.appliedDamage+=value;return;}
  const applied=Math.min(value,target.hp);target.hp=Math.max(0,target.hp-value);
  output.appliedDamage+=applied;
  if(target.hp<=EPS){
   output.kills++;
   const reward=Math.max(0,n(effective.manaKill));
   const actual=Math.min(reward,maxMana-mana);
   mana+=actual;output.manaFromKills+=actual;
   log('kill',{id:target.id,from:source,manaReward:reward});
   checkWaveClear();
  }
 }
 function hit(e,ability,source,overrides={}){
  if(!e||e.hp<=EPS)return 0;
  const {critDamageBonus=0,...options}=overrides;
  const auraActive=auraUntil>time+EPS;
  const dyn={...ctxBase,abilityId:ability,enemyHealth:dummyMode?50:e.hp/e.maxHP*100,
   elite:e.boss||ctxBase.elite,elementalStacks:shoulderUntil>time-EPS?shoulderStacks:0,
   ...options};
  const extraCritDamage=critDamageBonus+(auraActive?aura.critDamage:0);
  const dynamicStats=extraCritDamage||auraActive?{...stats,effective:{...effective,
   critChance:n(effective.critChance)+(auraActive?aura.critChance:0),
   critDamage:n(effective.critDamage)+extraCritDamage}}:stats;
  const h=Combat.attack(dynamicStats,settings,dyn,context);
  const damage=chanceCrit?
   (random()<h.critChance/100?h.critical?.final:h.normal?.final):h.expected;
  if(!Number.isFinite(damage)||damage<0)return 0;
  apply(e,damage,source);
  return damage;
 }
 function aoe(point,radius,ability,source,overrides={},skipId=null){
  for(const e of [...live]){
   if(e.hp>EPS&&Math.abs(e.x-point)<=radius+EPS&&e.id!==skipId)hit(e,ability,source,overrides);
  }
 }
 function recoverNova(){
  const rank=Math.max(0,Math.min(8,n(talents.frozenReservoir)));
  const chance=rank/8;
  const gain=rank?50+10*rank:0;
  const reward=chanceCrit?(random()<chance?gain:0):chance*gain;
  const actual=Math.min(reward,maxMana-mana);
  mana+=actual;output.manaRestored+=actual;
  log('nova-recover',{reward});
 }
 function emitStorm(){
  const eligible=targets(mode.lightningStorm.range);
  if(!eligible.length)return;
  const targetIds=[];
  for(let i=0;i<mode.lightningStorm.targets;i++){
   const ordered=targets(mode.lightningStorm.range);
   if(!ordered.length)break;
   const target=o.stormTargetMode==='random'?ordered[Math.floor(random()*ordered.length)]:
    o.stormTargetMode==='focus'?ordered[0]:ordered[i%ordered.length];
   if(target)targetIds.push(target.id);
  }
  const stacks=shoulderUntil>time-EPS?shoulderStacks:0;
  for(let i=0;i<targetIds.length;i++)q.push(time+i*o.stormStrikeDelay,'storm-strike',{id:targetIds[i],stacks});
 }
 function strike(data){
  const e=live.find(x=>x.id===data.id&&x.hp>EPS)||nearest();
  if(!e)return;
  // Strong-attack stacks are captured at cast time: a cast does not buff itself.
  hit(e,'lightningStorm','storm',{elementalStacks:data.stacks});
  output.stormHits++;
  const point=e.x;
  if(runeSplash){
   // Splash is modeled as the same coefficient on other enemies; this is unverified.
   aoe(point,o.splashRadius,'lightningStorm','splash',{elementalStacks:data.stacks},e.id);
  }
  if(runeBall){
   output.stormBalls++;
   for(let k=1;k<=3;k++)q.push(time+k*o.ballPulseInterval,'ball-pulse',{x:point,stacks:data.stacks});
  }
 }
 function ball(data){
  output.ballPulses++;
  aoe(data.x,o.ballRadius,'other','ball',{skillPercent:50,skillFlat:0,damageType:'lightning',
   attackType:'strong',lightningAbility:false,elementalStacks:data.stacks});
 }
 function beamTick(data){
  if(!channel||data.channel!==channel.id||channel.ended)return;
  const rime=context.items?.gloves==='bm-patch-rimebound-grasp';
  if(rime){
   if(mana+EPS<5){
    channel.ended=true;standingUntil=time;output.beamInterruptions++;
    log('beam-interrupt',{reason:'Mana不足'});
    scheduleAction(time+o.frameStep);return;
   }
   mana-=5;output.manaSpent+=5;
  }
  const elapsed=time-channel.started,
   base=Combat.skillRank(settings,stats,'frostBeam')?.percent||60,
   percent=base+(runeBeam6?200*Math.floor((elapsed+EPS)/0.5):0);
  const oldTargets=targets(mode.frostBeam.range),point=channel.targetX;
  for(const enemy of [...oldTargets]){
   if(enemy.hp>EPS&&Math.abs(enemy.x-point)<=o.splashRadius+EPS){
    hit(enemy,'other','beam',{skillPercent:percent,skillFlat:0,damageType:'cold',attackType:'strong',
     lightningAbility:false,elementalStacks:channel.stacks,
     critDamageBonus:rime?120*Math.floor((elapsed+EPS)/1):0});
   }
  }
  output.beamTicks++;log('beam-tick',{percent});
 }
 function cast(id,slot){
  const skill=mode[id],category=skill.kind;
  const manaCost=(skill.manaCost||0)*(1-manaRed/100);
  if(mana+EPS<manaCost)return false;
  // Self-buffs need an active combat state, but unlike attack skills they do not target an enemy.
  // Auto-combat does not cast out of combat (decide() only runs while a wave is engaged).
  if(skill.shape!=='self'&&!targets(skill.range).length)return false;
  mana-=manaCost;output.manaSpent+=manaCost;
  output.casts++;output.skillCasts[id]=(output.skillCasts[id]||0)+1;output.actionCounts[category]++;
  const cd=skill.kind==='basic'?1/Math.max(.1,attackSpeed):skill.baseCooldown*(1-coolRed/100);
  nextReady[slot]=time+cd;
  if(skill.kind!=='basic')nextGcd=time+Math.max(gcd,gcdFloor);
  standingUntil=Math.max(standingUntil,time+o.actionRecovery);
  log('cast',{id,slot});
  if(category==='basic'){
   const gain=skill.manaGain+Math.max(0,n(effective.basicManaGain))+
    (id==='electrocute'?Math.max(0,n(effective.electrocuteManaGain)):0);
   const actual=Math.min(gain,maxMana-mana);
   mana+=actual;output.manaRestored+=actual;
   const target=nearest();
   if(target){
    if(id==='flameLightning'){
     hit(target,'flameLightningFire','basic');
     if(target.hp>EPS)hit(target,'flameLightningLightning','basic');
    }else hit(target,id,'basic');
   }
  }else if(id==='lightningStorm'){emitStorm();}
  else if(id==='frostBeam'){
   const interval=o.beamTick??(runeBeam4?0.2:0.33),started=time,
    target=nearest();
   channel={id:'beam-'+output.casts,started,ended:false,targetX:target?.x||0,stacks:shoulderUntil>time-EPS?shoulderStacks:0};
   standingUntil=time+3;
   for(let t=interval;t<=3+EPS;t+=interval)q.push(started+t,'beam-tick',{channel:channel.id});
   q.push(started+3,'beam-end',{channel:channel.id});
  }else if(id==='flameAura'){
   auraUntil=time+aura.duration;
   output.auraCasts++;
   log('flame-aura',{until:round(auraUntil,3),level:aura.level,
    critChance:aura.critChance,critDamage:aura.critDamage});
  }else if(id==='iceNova'){
   aoe(0,skill.radius,id,'special');
   recoverNova();
  }else if(id==='lightningCloud'){
   const point=nearest()?.x||0;
   for(let i=0;i<skill.ticks;i++)q.push(time+(i+1)*skill.zoneDuration/skill.ticks,'cloud-hit',{x:point});
  }else if(id==='fireMeteor'){
   const point=nearest()?.x||0;aoe(point,skill.radius,id,'special');
  }
  if(category==='strong'&&context.items?.shoulder==='shoulder'){
   shoulderStacks=clamp(shoulderStacks+1,0,5);shoulderUntil=time+6;
   log('shoulder-stack',{stacks:shoulderStacks});
  }
  return true;
 }
 function decide(){
  actionPending=false;
  if(over||!live.length)return;
  if(time<standingUntil-EPS||time<nextGcd-EPS){
   scheduleAction(Math.max(standingUntil,nextGcd,time+o.frameStep));return;
  }
  for(const slot of [3,2,1,0]){
   const id=o.slots[slot];if(id==='none'||time<nextReady[slot]-EPS)continue;
   if(cast(id,slot)){
    scheduleAction(Math.max(time+o.frameStep,standingUntil,nextGcd));
    return;
   }
  }
  // Check again in the next frame; this approximates the game's per-frame selection.
  scheduleAction(time+o.frameStep);
 }
 function enemyStrike(){
  if(over||!live.length)return;
  if(o.enemyIncoming>0&&maxHP>0){
   const d=Combat.defense(stats,settings,{...ctxBase,incomingHit:o.enemyIncoming,
    defenseType:'physical',attackerLevel:70,incomingCrit:false},context).selected;
   if(d){
    const base=chanceCrit?(random()<d.dodge?0:d.afterFlat):d.dodgeExpected;
    const reduction=channel&&!channel.ended&&runeBeam4?0.75:1;
    const damage=base*reduction;hp=Math.max(0,hp-damage);output.damageTaken+=damage;
    log('enemy-hit',{damage:round(damage)});
    if(hp<=EPS){over=true;output.outcome='death';output.deathTime=round(time,4);return;}
   }
  }
  q.push(time+o.enemyAttackEvery,'enemy-hit');
 }
 q.push(o.initialDelay,'spawn');
 let processed=0;
 while(q.length&&!over){
  const ev=q.pop();
  if(ev.at>end+EPS)break;
  move(ev.at);
  if(++processed>maxEvents){output.warnings.push('イベント数の安全上限に到達しました');break;}
  switch(ev.type){
   case 'spawn':spawn();break;
   case 'action':decide();break;
   case 'storm-strike':strike(ev.data);break;
   case 'ball-pulse':ball(ev.data);break;
   case 'beam-tick':beamTick(ev.data);break;
   case 'beam-end':
    if(channel?.id===ev.data.channel){channel.ended=true;standingUntil=time;scheduleAction(time+o.frameStep)}
    break;
   case 'cloud-hit':aoe(ev.data.x,2,'lightningCloud','special');break;
   case 'enemy-hit':enemyStrike();break;
  }
 }
 if(!over){output.outcome=processed>maxEvents?'capped':dummyMode?'dummy-finished':'timeout';move(end)}
 output.processed=processed;output.manaEnd=round(mana,2);output.hpEnd=round(hp,2);
 output.auraUptimeSeconds=round(output.auraUptimeSeconds,3);
 output.auraUptimePercent=time>0?round(output.auraUptimeSeconds/time*100,1):0;
 output.elapsed=round(time,4);output.averageDps=output.elapsed?output.totalDamage/output.elapsed:0;
 output.damagePerSecondWindow=output.totalDamage/o.duration;
 if(output.wavesCleared===0&&output.wavesSpawned===0)output.warnings.push('開始遅延が制限時間を超えているため敵が未出現');
 return output;
}
function compare(state,baselineBuild,candidateBuild,scenario){
 const a=evaluate(state,baselineBuild,scenario),b=evaluate(state,candidateBuild,scenario);
 const metric=r=>r.ok&&r.outcome==='clear'?r.finishTime:null;
 const delta=metric(a)!=null&&metric(b)!=null?metric(b)-metric(a):null;
 return {a,b,delta,comparable:a.ok&&b.ok,judgment:delta===null?'判定不能':delta<0?'候補の方が速い':delta>0?'現在の方が速い':'同等'};
}
function runSeeds(state,build,scenario={},seeds=[11,42,77,113,181]){
 const values=[],outcomes={clear:0,death:0,timeout:0,capped:0};
 for(const seed of seeds){
  const result=evaluate(state,build,{...scenario,seed,randomCrit:true});
  if(!result.ok)return {ok:false,reason:result.reason};
  outcomes[result.outcome]=(outcomes[result.outcome]||0)+1;
  if(result.outcome==='clear')values.push(result.finishTime);
 }
 values.sort((a,b)=>a-b);
 return {ok:true,trials:seeds.length,outcomes,clearRate:outcomes.clear/seeds.length,
  fastest:values[0]??null,median:values.length?values[(values.length-1)>>1]:null,
  slowest:values.at(-1)??null,
  warning:'固定Seedでの近似試行です。未再現の敵行動やルーン効果による不確実性は含みません。'};
}
function sweep(state,build,candidate,scenario={},factors=[0.25,0.5,1,2,4]){
 if(!candidate)return {ok:false,reason:'比較対象がありません'};
 const {config,issues}=Rule.normalize(scenario);
 if(issues.length||config.enemyHP==null)return {ok:false,reason:'先に敵HP・戦闘条件を有効な数値で登録してください'};
 if(!Array.isArray(factors)||factors.length>16||factors.some(x=>!Number.isFinite(x)||x<=0||x>1000))
  return {ok:false,reason:'HP倍率は0より大きい数値で16個以下'};
 const rows=[];
 for(const factor of factors){
  const hp=config.enemyHP*factor;
  if(!Number.isFinite(hp)||hp<Rule.limits.enemyHP[0]||hp>Rule.limits.enemyHP[1])
   return {ok:false,reason:'HP倍率が入力範囲を超えています'};
  const scene={...config,enemyHP:hp,randomCrit:false};
  const a=evaluate(state,build,scene),b=evaluate(state,candidate,scene);
  const at=a.ok&&a.outcome==='clear'?a.finishTime:null,bt=b.ok&&b.outcome==='clear'?b.finishTime:null;
  rows.push({factor,enemyHP:hp,baselineTime:at,candidateTime:bt,
   delta:at!==null&&bt!==null?bt-at:null,
   status:!a.ok||!b.ok?'計算不能':at===null||bt===null?'両方のクリア時刻が必要':bt<at?'比較候補が速い':bt>at?'現在が速い':'同じ時間',
   baselineOutcome:a.ok?a.outcome:'error',candidateOutcome:b.ok?b.outcome:'error'});
 }
 return {ok:true,rows,notice:'入力した敵HPだけを変えた仮想実験。実際の難易度変化がHPだけとは限りません。'};
}
window.DBPSimulationV2={rng,Heap,prepared,evaluate,simulate,compare,runSeeds,sweep};
})();