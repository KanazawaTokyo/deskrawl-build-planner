(function(){'use strict';
const D=window.DBP;const {affixes,definitions,limits}=D;
const P=window.DBPPets||null,T=window.DBPTalents||null;
const extraStats=["basicAttack","specialDamage","slowed","immobilized","vulnerable","distant","dot","burned","lifeKill","regen","xp","potionFind","potionCharges","armorBonus"];
const stats=['stunned','bleeding','poisoned','healingReceived','materialFind','strBonus','thornsBonus','manaRegen','manaBonus','regenBonus','lohBonus',...extraStats,'weaponDamage','weaponSpeed','weaponDps','strongAttack','goldFind','abilityLevels','int','damage','lightning','allDamage','healthy','injured','elite','critChance','critDamage','critRed','cdr','mcr','as','dodge','mr','armor','maxHP','bonusHP','mana','move','loh','itemFind','manaKill','goldFind','physicalDR','coldDR','fireDR','arcane','physical','poison','fire','cold','str','dex','thorns','arcaneDR','poisonDR','lightningDR'];
const labels={weaponDamage:'武器ダメージ',weaponSpeed:'武器速度',weaponDps:'武器基礎DPS',strongAttack:'強攻撃ダメージ',goldFind:'Gold Find',abilityLevels:'全アビリティレベル',int:'知力',damage:'固定ダメージ',lightning:'雷ダメージ',allDamage:'全ダメージ',healthy:'対健康ダメージ',injured:'対負傷ダメージ',elite:'対エリートダメージ',critChance:'Crit率',critDamage:'Critダメージ',critRed:'Critダメ軽減',cdr:'CDR',mcr:'MCR',as:'ASボーナス',dodge:'Dodge',mr:'Magic Resist',armor:'Armor',maxHP:'最大HP',bonusHP:'Bonus HP',mana:'最大Mana',move:'ボーナス移動速度',loh:'Life on Hit',itemFind:'Item Find',manaKill:'Mana on Kill',physicalDR:'物理軽減',coldDR:'冷気軽減',fireDR:'炎軽減',arcane:'アルケインダメージ',physical:'物理ダメージ',poison:'毒ダメージ',fire:'炎ダメージ',cold:'冷気ダメージ',str:'力',dex:'敏捷',thorns:'棘ダメージ',arcaneDR:'アルケイン軽減',poisonDR:'毒軽減',lightningDR:'雷軽減'};
Object.assign(labels,{"basicAttack":"基本攻撃ダメージ","strongAttack":"強攻撃ダメージ","fire":"炎ダメージ","cold":"冷気ダメージ","slowed":"減速状態へのダメージ","immobilized":"移動不能状態へのダメージ","vulnerable":"脆弱状態へのダメージ","distant":"遠距離の敵へのダメージ","dot":"継続ダメージ","burned":"燃焼状態へのダメージ","lifeKill":"撃破時HP回復","lightningDR":"雷ダメージ軽減","arcaneDR":"アルケインダメージ軽減","regen":"HP自然回復","xp":"経験値獲得","potionFind":"ポーション発見率","potionCharges":"追加ポーション所持数","armorBonus":"ボーナスArmor","specialDamage":"特殊攻撃ダメージ"});
const percent=new Set(['strongAttack','goldFind','lightning','allDamage','healthy','injured','elite','critChance','critDamage','critRed','cdr','mcr','as','dodge','bonusHP','move','itemFind','physicalDR','coldDR','fireDR','arcane','physical','poison','fire','cold','arcaneDR','poisonDR','lightningDR']);
for(const key of ["basicAttack","specialDamage","slowed","immobilized","vulnerable","distant","dot","burned","xp","potionFind","armorBonus"])percent.add(key);
percent.add('bonusMR');percent.add('bonusArmor');
labels.bonusMR='ボーナス魔法耐性';labels.bonusArmor='ボーナスArmor';
Object.assign(labels,{stunned:'対スタン中の敵',bleeding:'対出血中の敵',poisoned:'対毒状態の敵',healingReceived:'受ける回復量ボーナス',materialFind:'素材発見率',strBonus:'力ボーナス',thornsBonus:'反射ダメージボーナス',manaRegen:'毎秒マナ回復',manaBonus:'最大マナ倍率',regenBonus:'HP自然回復倍率',lohBonus:'命中時回復倍率'});
for(const k of ['stunned','bleeding','poisoned','healingReceived','materialFind','strBonus','thornsBonus','manaBonus','regenBonus','lohBonus'])percent.add(k);
Object.assign(labels,{
 basicCritChance:'基本攻撃Crit率',basicRange:'基本攻撃射程',basicManaGain:'基本攻撃マナ獲得',
 frostCdr:'冷気スキルCDR',flameBreathCritDamage:'Flame Breath Critダメージ',fireElementalAs:'Fire Elemental攻撃速度',
 chillPotency:'Chill効果',iceMeteorMcr:'Ice Meteorマナ軽減',iceShardsDamage:'Ice Shardsダメージ',
 lightningAbilityCritDamage:'雷スキルCritダメージ',fireMeteorDamage:'Fire Meteorダメージ',
 fireMeteorCooldownPenalty:'Fire Meteor CD増加',frozenDuration:'Frozen持続時間',
 iceBlockHeal:'Ice Block中HP回復/秒',electrocuteManaGain:'Electrocuteマナ獲得',
 flameLightningBurned:'Flame Lightning対燃焼',flameLightningElectrostatic:'Flame Lightning対感電',
 frostBeamSize:'Frost Beam範囲',electrostaticSpreadChance:'Electrostatic伝搬率',
 lightningCloudDuration:'Lightning Cloud持続',frozenCritChance:'対凍結Crit率',
 frozenCritDamage:'対凍結Critダメージ',lightningStormDamage:'Lightning Stormダメージ',
 allDR:'共通ダメージ軽減',manaRegen:'マナ自然回復',bonusMR:'ボーナス魔法耐性',bonusArmor:'ボーナスArmor'
});
for(const k of ['basicCritChance','basicRange','frostCdr','flameBreathCritDamage','fireElementalAs','chillPotency','iceMeteorMcr','iceShardsDamage','lightningAbilityCritDamage','fireMeteorDamage','fireMeteorCooldownPenalty','frozenDuration','iceBlockHeal','flameLightningBurned','flameLightningElectrostatic','frostBeamSize','electrostaticSpreadChance','lightningCloudDuration','frozenCritChance','frozenCritDamage','lightningStormDamage','allDR'])percent.add(k);
const talentSpecialStats=['basicCritChance','basicRange','basicManaGain','frostCdr','flameBreathCritDamage','fireElementalAs','chillPotency','iceMeteorMcr','iceShardsDamage','lightningAbilityCritDamage','fireMeteorDamage','fireMeteorCooldownPenalty','frozenDuration','iceBlockHeal','electrocuteManaGain','flameLightningBurned','flameLightningElectrostatic','frostBeamSize','electrostaticSpreadChance','lightningCloudDuration','frozenCritChance','frozenCritDamage','lightningStormDamage','allDR','manaRegen'];
const priority=['critChance','critRed','mr','dodge','cdr','mcr'];
const full=[...talentSpecialStats,...priority,'bonusArmor','bonusMR','stunned','bleeding','poisoned','healingReceived','materialFind','strBonus','thornsBonus','manaRegen','manaBonus','regenBonus','lohBonus',...extraStats,'weaponDamage','weaponSpeed','weaponDps','strongAttack','abilityLevels','maxHP','armor','int','critDamage','lightning','allDamage','damage','healthy','injured','elite','as','bonusHP','mana','move','loh','itemFind','manaKill','goldFind','physicalDR','coldDR','fireDR','arcane','physical','poison','fire','cold','str','dex','thorns','arcaneDR','poisonDR','lightningDR'];
const armorSlots=new Set(['head','shoulder','chest','gloves','legs','boots']);
function multiplier(level,pos=0,count=6){const n=Math.max(0,Math.min(12,Number(level)||0));const steps=2*Math.min(n,10);const awarded=Math.floor(steps/count)+(pos<steps%count?1:0);return 1+.05*awarded+(n>=11?.05:0)+(n>=12?.05:0);}
function factor(item,idx,level){if(item.slot==='weapon'){const pos=idx==='s'?6:Number(idx)+2;return multiplier(level,pos,7);}const hasArmor=armorSlots.has(item.slot);const count=hasArmor?6:5;const pos=idx==='armor'?0:(idx==='s'?(hasArmor?5:4):(Number(idx)+(hasArmor?1:0)));return multiplier(level,pos,count)}
function valueOf(item,affixId,idx,level){const a=affixes[affixId];if(!a)return null;const selected=level===undefined?item.upgrade:level;const key=affixId+':'+idx+':'+selected;const over=item.overrides?.[key];if(over!==undefined&&over!==null&&over!=='')return {value:Number(over),status:'actual'};return {value:Number((a[1]*factor(item,idx,selected)).toFixed(2)),status:selected===0?'history':'calculated'};}
function itemTotal(item,level){
const out=[];const def=definitions.find(x=>x.id===item.definitionId);const selected=level===undefined?item.upgrade:level;
if(def?.rarity==='Divine'){
  // Fixed tooltip-order values. An upgrade awards 2 x 5%-steps per level,
  // distributed cyclically across speed/damage/Armor and fixed attributes.
  // Enlightenment I/II adds 5% to each number (baseline additive).
  const fixed=def.fixed||[];const round=n=>Number(n.toFixed(2));
  fixed.forEach(([stat,base],idx)=>{
    const overrideKey='div:'+stat+':'+idx+':'+selected;
    const override=item.overrides?.[overrideKey];
    out.push({stat,value:override!==undefined&&override!==null&&override!==''?Number(override):round(base*multiplier(selected,idx,fixed.length)),status:override!==undefined&&override!==null&&override!==''?'actual':selected===0?'verified':'calculated',slot:'fixed'+idx,item:item.id});
  });
  if(def.id==='grandmother'){
    const speed=out.find(x=>x.stat==='weaponSpeed')?.value||0;
    const dmg=out.find(x=>x.stat==='weaponDamage')?.value||0;
    out.push({stat:'weaponDps',value:round(speed*dmg),status:'calculated',slot:'derived',item:item.id});
  }
  // Unique passive powers are displayed and counted separately; they are not
  // treated as a normal upgradable affix until game rules establish otherwise.
  for(const [stat,value] of (def.powerStats||[]))out.push({stat,value,status:'verified',slot:'unique',item:item.id});
  return out;
}
if(armorSlots.has(item.slot)&&def?.rarity==='Black Mist')out.push({stat:'armor',value:Number((782*factor(item,'armor',selected)).toFixed(2)),status:'calculated',slot:'baseArmor',item:item.id});
for(let i=0;i<(item.primary||[]).length;i++){const id=item.primary[i];const v=valueOf(item,id,i,level);if(id&&v)out.push({stat:id,...v,slot:'primary'+i,item:item.id});}
if(item.secondary){const v=valueOf(item,item.secondary,'s',level);if(v)out.push({stat:item.secondary,...v,slot:'secondary',item:item.id});}
return out;
}
function calc(doc,build,sub={}){
  const sum={};const breakdown={};const pending=[];const add=(key,value,source,quality='history')=>{if(!Number.isFinite(Number(value)))return;sum[key]=(sum[key]||0)+Number(value);(breakdown[key]??=[]).push({source,value:Number(value),quality});};
  const chosen=build.loadout||{};
  for(const [slot,id] of Object.entries(chosen)){
    const effectiveId=(sub.slot===slot)?sub.itemId:id;
    const item=doc.items.find(x=>x.id===effectiveId);if(!item)continue;
    const def=definitions.find(x=>x.id===item.definitionId);
    const stage=sub.equalLevel!==undefined?sub.equalLevel:item.upgrade;
    if(def?.rarity==='Divine'&&!(def.fixed?.length))pending.push(slot+'：Divine固定数値が未登録');
    if(!item.upgradeKnown&&sub.equalLevel===undefined)pending.push(slot+'：強化段階未確認');
    for(const e of itemTotal(item,stage))add(e.stat,e.value,(def?.name||item.nickname||slot)+' · '+labels[e.stat],e.status);
    for(const [index,gem] of (item.gems||[]).entries()){
      const effect=D.gemEffect(gem?.type,slot);
      if(effect)add(effect.stat,effect.value,`${def?.name||slot} · ソケット${index+1} · ${D.gems[gem.type].name}（Tier 6）`,'verified');
      else if(gem?.type)pending.push(`${slot} · ソケット${index+1}：旧形式・未対応の宝石は集計外`);
    }
  }
  const s=build.settings||{};const base=s.base||{};
  const tal=T?T.allocation(s):null;
  // Hero Lv70: known base stats; apply once when using the full talent tree.
  // Legacy builds retain their previous partial-total behavior until explicit migration.
  if(tal&&!tal.legacy){if(base.mana===undefined||base.mana===null||base.mana==='')add('mana',100,'英雄の基礎最大Mana','verified');if(base.int===undefined||base.int===null||base.int==='')add('int',10,'ソーサラーの基礎知力','verified');}
  for(const [k,v] of Object.entries(base))if(v!==''&&v!==null&&v!==undefined)add(k,Number(v),'登録済みの装備外基礎値','manual');
  const allocation=D.paragonAllocation(s);
  if(!allocation.legacy){
    for(const stat of D.paragonStats){
      const points=allocation.points[stat.key]||0;
      if(points)add(stat.stat,Number((points*stat.per).toFixed(7)),'Paragon '+stat.label+' ('+points+'pt)','verified');
    }
    if(allocation.issues.length)pending.push('Paragon：不正な割り振り値は上限内の整数に補正して計算');
    if(s.paragonLevel!==undefined&&s.paragonLevel!==null&&allocation.total>Number(s.paragonLevel))pending.push('Paragon：現在の割り振りが設定レベルを超過');
  }else{
    // Existing saved builds used direct bonus values, not allocated points.
    // Preserve exact bonuses until the user edits the Paragon point allocation.
    const p=s.paragon||{};
    if(p.bonusMR)add('bonusMR',p.bonusMR,'Paragon Bonus MR（旧形式）','history');
    if(p.bonusArmor)add('bonusArmor',p.bonusArmor,'Paragon Bonus Armor（旧形式）','history');
    if(p.bonusHP)add('bonusHP',p.bonusHP,'Paragon Bonus HP（旧形式）','history');
    if(p.maxMana)add('mana',p.maxMana,'Paragon Max Mana（旧形式）','history');
    if(p.as)add('as',p.as,'Paragon AS（旧形式）','history');
  }
  if(s.aura){add('critChance',10,'Flame Aura · Crit率','history');if(!tal||tal.legacy){if((s.talents||{}).flameWard){add('bonusMR',80,'炎の加護 · MR +80%（旧設定）','history');add('bonusArmor',80,'炎の加護 · Armor +80%（旧設定）','history');}}}
  if(tal&&!tal.legacy){
    const derived=T.effects(tal.ranks,{aura:Boolean(s.aura),mana:0});
    for(const e of derived.result){
      // The conversion talent depends on the final MaxMana after all flat bonuses.
      if(e.source.includes('Manaの'))continue;
      add(e.stat,e.value,'タレント · '+e.source,e.quality);
    }
    if(tal.issues.length)pending.push('タレント：未解放・不正な割り振りを除外して計算しています');
  }
  // Active minion passives, one inherited +10 skill, and one minion gear.
  // Never treat timed active abilities as permanent hero-stat modifiers.
  if(P){
    const pet=s.pet||{}, main=P.lookup(pet.id),rank=Math.max(0,Math.min(10,Number(pet.level)||0));
    if(!pet.progressionVersion){
      // Compatibility: untouched legacy entries keep the previously calculated bonuses.
      if(pet.id==='raptor'){if(rank>=10)add('critChance',6,'旧Raptor +10（要移行）','history');else if(rank>=4)add('critChance',4.2,'旧Raptor +4（要移行）','history');}
      if(pet.id==='wyrm')add('bonusMR',rank>=10?150:100,'旧Defiled Wyrm（要移行）','estimated');
      if(pet.id&&pet.id!=='unknown')pending.push('ペット：旧設定のため、ペットタブでLv10パッシブ・装備・継承を確定してください');
    } else if(main?.unobtainable){
      pending.push('ペット：'+main.name+' は現行ゲームで入手経路がありません');
    } else if(main){
      for(const passive of main.passives){
        const level=Number(pet.passiveLevels?.[passive.id]??10);
        if(level===10&&rank===10)add(passive.stat,passive.max,main.name+' · '+passive.label+' Lv10','verified');
        else if(level===0)add(passive.stat,passive.base,main.name+' · '+passive.label+' Lv0','verified');
        else pending.push('ペット：'+passive.label+' のLv'+level+'効果は未校正（未計算）');
      }
      const inherited=P.skill(pet.inheritFrom,pet.inheritSkill);
      if(inherited){
        if(!pet.inheritUnlocked||rank<10)pending.push('ペット：継承枠が未解放、またはメインペットがLv10未満');
        else if(inherited.petId===main.id)pending.push('ペット：自身のスキルは継承できません');
        else if(P.lookup(inherited.petId)?.unobtainable)pending.push('ペット：入手できないペットの継承効果を除外');
        else if(inherited.kind==='passive')add(inherited.stat,inherited.max,P.lookup(inherited.petId).name+' · 継承Lv10 '+inherited.label,'verified');
        // Inherited active skill remains a timed/situational effect, shown in Pet tab.
      }
      const equipment=P.gearTypes.find(g=>g.id===pet.equipment?.id);
      if(equipment&&equipment.slots){
        if(!pet.equipmentUnlocked||rank<5)pending.push('ペット：装備枠が未解放、またはメインペットがLv5未満');
        else{
          const rolls=(pet.equipment.rolls||[]).slice(0,equipment.slots),seen=new Set();
          for(let i=0;i<rolls.length;i++){
            const roll=rolls[i],stat=roll?.stat;
            if(!stat)continue;
            if(!P.gearAffixes.includes(stat)||seen.has(stat)){pending.push('ペット装備：無効または重複したOP '+stat);continue}
            seen.add(stat);
            const cap=(equipment.rarity==='Rare'?P.rare850Max:P.max850)[stat];
            const amount=equipment.id==='saddle-of-the-golden-khan'?cap:Number(roll?.value);
            if(!Number.isFinite(amount)||amount<0||Number.isFinite(cap)&&amount>cap){pending.push('ペット装備：'+stat+' の実測値を確認してください');continue}
            if(equipment.id!=='saddle-of-the-golden-khan'&&(roll.value===null||roll.value===undefined||roll.value==='')){pending.push('ペット装備：'+stat+' の実測値が未入力');continue}
            add(stat,amount,equipment.name+' · OP '+(i+1)+' · '+(labels[stat]||stat),equipment.id==='saddle-of-the-golden-khan'?'verified':'manual');
          }
        }
      }
    }else if(pet.id&&pet.id!=='unknown')pending.push('ペット：登録されていないペットID '+pet.id);
  }
  // Percentage bonuses on the base resource totals are derived after all
  // non-pet sources and remain visible in the per-stat contribution breakdown.
  for(const [key,bonus] of [['mana','manaBonus'],['regen','regenBonus'],['loh','lohBonus'],['str','strBonus'],['thorns','thornsBonus']]){
    if(sum[bonus])add(key,(sum[key]||0)*sum[bonus]/100,'ペットパッシブ · '+labels[bonus]+'による増加','calculated');
  }
  const potion={swift:{as:20},vitality:{bonusHP:15},resistance:{bonusMR:20},wind:{dodge:5},focus:{cdr:10},efficiency:{mcr:10},cruel:{critChance:10}}[s.potion];
  if(potion)Object.entries(potion).forEach(([k,v])=>add(k,v,'使用ポーション','history'));
  if(s.food==='crab')add('allDR',10,'灰殻のカニ','history');
  if(tal&&!tal.legacy){
    const level=tal.ranks.arcaneReservoir||0;
    if(level)add('int',(sum.mana||0)*(.05*level),'タレント · 魔力の貯蔵 '+level+'/8 · 最大Manaから知力変換','calculated');
  }else if((s.talents||{}).arcaneReservoir){
    const mana=sum.mana;
    if(base.mana!==undefined&&base.mana!==''&&base.mana!==null&&mana)add('int',mana*.4,'魔力の貯蔵8/8 · Mana由来INT（旧設定）','calculated');
    else pending.push('旧タレント：装備外の基礎Mana未登録のため知力変換を保留');
  }
  // Magic Resist and Armor are affected by bonus percentages. Baseline remains unknown unless explicitly entered.
  if((sum.dex||0)>0)add('critRed',100*sum.dex/(sum.dex+1500),'敏捷由来 Critダメージ軽減','calculated');
  const rawMR=(sum.mr||0)+(sum.int||0);const rawArmor=(sum.armor||0)+(sum.str||0);
  const effective={...sum,mr:rawMR*(1+(sum.bonusMR||0)/100),armor:rawArmor*(1+((sum.bonusArmor||0)+(sum.armorBonus||0))/100)};
  breakdown.mr=[...(breakdown.mr||[]),...(breakdown.int||[]).map(x=>({...x,source:x.source+' → INT由来MR'}))];
  breakdown.armor=[...(breakdown.armor||[]),...(breakdown.str||[]).map(x=>({...x,source:x.source+' → STR由来Armor'}))];
  for(const k of ['critChance','critRed','cdr','mcr','dodge'])if(effective[k]!==undefined)effective[k]=Math.min(limits[k],effective[k]);
  const raw={...sum,mr:rawMR*(1+(sum.bonusMR||0)/100),armor:rawArmor*(1+((sum.bonusArmor||0)+(sum.armorBonus||0))/100)};
  // Max HP represents fixed HP multiplied by Bonus HP; absent base means partial sum.
  effective.maxHP=(sum.maxHP||0)*(1+(sum.bonusHP||0)/100);
  raw.maxHP=effective.maxHP;
  const enemy=Math.max(1,Number(s.enemyLevel||70));
  const mitigations={armor:raw.armor/(raw.armor+50*enemy)*100,mr:raw.mr/(raw.mr+50*enemy)*100};
  return {sum,raw,effective,breakdown,pending,mitigations,estimated:true};
}
function format(k,v){if(v===undefined||v===null||!Number.isFinite(v))return '—';const n=Math.round(v*100)/100;return n.toLocaleString('ja-JP',{maximumFractionDigits:2})+(percent.has(k)?'%':'');}
function delta(k,from,to){if(from===undefined&&to===undefined)return null;return (to||0)-(from||0);}
window.DBPCalc={stats,labels,percent,talentSpecialStats,priority,full,multiplier,valueOf,itemTotal,calc,format,delta};
})();
