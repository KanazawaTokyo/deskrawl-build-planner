/* ChatGPT analysis export, intentionally READ-ONLY.
 * The output contains only the currently selected build's gameplay data:
 * no credentials, auth/session, Supabase configuration, other builds,
 * internal item UUIDs, or measurements unrelated to the active build.
 */
(function(){'use strict';
const D=window.DBP,C=window.DBPCalc,V=window.DBPStatsView,
 B=window.DBPCombat,R=window.DBPRunes,T=window.DBPTalents,P=window.DBPPets;
const label=k=>C.labels[k]||D.affixes[k]?.[0]||k;
const rarity=k=>window.DBPJP?.rarity(k)||k||'未設定';
const slotName=k=>D.slots.find(s=>s[0]===k)?.[1]||k;
const has=v=>v!==null&&v!==undefined&&v!=='';
const select=(o,keys)=>Object.fromEntries(keys.filter(k=>o&&Object.hasOwn(o,k)&&o[k]!==undefined).map(k=>[k,o[k]]));
const named=(stat,value,extra={})=>({key:stat,name:label(stat),value,formatted:C.format(stat,Number(value)),...extra});
const sourceValue=({stat,value,status,slot})=>named(stat,value,{source:slot,confidence:status||'unconfirmed'});
function equipmentEntry(state,build,slot){
 const id=build.loadout?.[slot],it=state.items.find(x=>x.id===id),def=D.definitions.find(x=>x.id===it?.definitionId);
 const entry={slot,slotName:slotName(slot),equipped:Boolean(it)};
 if(!it)return entry;
 const stage=Number(it.upgrade)||0;
 const totals=C.itemTotal(it,stage);
 const affix=(key,position,category)=>{
  if(!key)return null;
  const match=totals.find(x=>x.slot===category);
  return {position,stat:key,name:label(key),value:match?.value??null,
   formatted:match?C.format(key,match.value):'未確認',confidence:match?.status||'unconfirmed',
   explicitlyMeasured:match?.status==='actual',required:Boolean(category==='secondary'?it.opLocks?.secondary:it.opLocks?.primary?.[position-1])};
 };
 return {...entry,definitionId:it.definitionId,equipmentName:def?.name||'その他の装備',
  displayName:it.nickname||def?.name||'名前未設定',rarity:rarity(def?.rarity),
  upgradeStage:stage,upgradeKnown:it.upgradeKnown===true,
  locked:it.locked===true,owned:it.owned??null,
  primaryAffixes:(it.primary||[]).map((key,i)=>affix(key,i+1,'primary'+i)).filter(Boolean),
  secondaryAffix:affix(it.secondary,1,'secondary'),
  fixedAndUnique:totals.filter(x=>!x.slot.startsWith('primary')&&x.slot!=='secondary').map(sourceValue),
  gems:(it.gems||[]).map((gem,i)=>{
   const effect=D.gemEffect(gem?.type,slot);
   return {socket:i+1,gem:gem?.type?D.gems[gem.type]?.name||gem.type:'未設定',
    tier:effect?.tier??null,stat:effect?.stat||null,
    statName:effect?label(effect.stat):null,value:effect?.value??null};
  }),
  uniqueEffect:def?.effect||null,
  memo:it.memo||null};
}
function petReport(settings){
 const p=settings.pet||{},main=P.lookup(p.id),gear=P.gearTypes.find(g=>g.id===p.equipment?.id),
  inherit=P.skill(p.inheritFrom,p.inheritSkill);
 return {
  id:p.id||'unknown',name:main?.name||'未選択',rarity:rarity(main?.rarity),level:Number(p.level)||0,
  passiveLevels:main?.passives.map(skill=>{
   const lv=p.passiveLevels?.[skill.id]??10;
   return {id:skill.id,name:skill.label,level:lv,stat:skill.stat,statName:label(skill.stat),
    value:lv===10?skill.max:skill.base,effectEnabled:Number(p.level)===10&&lv===10||lv===0};
  })||[],
  inheritUnlocked:p.inheritUnlocked===true,inheritSource:inherit?P.lookup(inherit.petId)?.name:null,
  inheritSkill:inherit?{id:inherit.id,name:inherit.label,kind:inherit.kind,
   stat:inherit.stat||null,value:inherit.max??null,description:inherit.at10||null}:null,
  equipmentUnlocked:p.equipmentUnlocked===true,equipment:{
   name:gear?.name||'装備なし',typeId:gear?.id||null,rarity:rarity(gear?.rarity),
   active:p.equipmentUnlocked===true&&Number(p.level)>=5,
   affixes:(p.equipment?.rolls||[]).slice(0,gear?.slots||0).map((roll,i)=>{
    const max=(gear?.rarity==='Rare'?P.rare850Max:P.max850)[roll.stat],
     val=gear?.id==='saddle-of-the-golden-khan'?max:roll.value;
    return {position:i+1,stat:roll.stat||null,name:roll.stat?label(roll.stat):null,
     value:has(val)?Number(val):null,formatted:has(val)&&roll.stat?C.format(roll.stat,Number(val)):'未入力',
     measured:gear?.id!=='saddle-of-the-golden-khan'&&has(roll.value)};
   })
  }
 };
}
function talentReport(settings){
 const a=T.allocation(settings);
 return {legacySettings:a.legacy,spent:a.total,remaining:a.remaining,
  allocations:T.defs.filter(d=>a.ranks[d.id]>0).map(d=>({
   id:d.id,name:d.name,rowRequirement:d.row,level:a.ranks[d.id],max:d.max,
   description:d.description
  })),
  gameRequirements:{valid:a.eligibility.ok,
   deficits:a.eligibility.problems.map(x=>({row:x.row,requiredLowerPoints:x.required,
    allocatedLowerPoints:x.lower,missingPoints:x.missing})),
   rows:a.eligibility.rows.filter(x=>x.active)},
  invalidEntries:a.issues,legacyValues:a.legacy?select(settings.talents||{},Object.keys(settings.talents||{})):{}
 };
}
function runeReport(settings){
 const selection=R.selection(settings);
 return {slots:selection.slots.map((id,i)=>{
  const rune=R.catalog[id];
  return {slot:i+1,selected:Boolean(id),id:id||null,name:rune?.name||null,
   type:rune?.rarity||null,skill:rune?.skill||null,rankBonus:rune?.level||0,
   affixes:rune?.stats.map(x=>named(x.stat,x.value))||[]};
 }),sets:selection.bonuses.map(b=>({name:b.setName,requiredPieces:b.threshold,
  equippedPieces:b.count,active:b.active,description:b.label,
  stat:b.stat||null,value:b.value??null})),issues:selection.issues};
}
function statReport(result){
 const stats={};
 for(const key of new Set([...Object.keys(result.raw||{}),...Object.keys(result.effective||{})])){
  if(!has(result.raw[key])&&!has(result.effective[key]))continue;
  const cap=D.limits[key],raw=result.raw[key]??0,effective=result.effective[key]??0;
  stats[key]={name:label(key),raw,effective,formatted:C.format(key,effective),
   ...(Number.isFinite(cap)?{cap,overCap:Math.max(0,Math.round((raw-cap)*1e6)/1e6)}:{})};
 }
 return stats;
}
function buildReport(state,build,at=new Date().toISOString()){
 if(!state||!build)throw Error('選択中のビルドが見つかりません');
 const settings=build.settings||{},calculated=V.evaluate(state,build),
  allocation=D.paragonAllocation(settings),review=window.DBPInputReview?.report(state,build);
 return {
  format:'deskrawl-chatgpt-build-analysis',version:1,exportedAt:at,
  game:'Deskrawl',class:'ソーサラー',
  buildName:build.name||'無題のビルド',gameMasterVersion:D.version,
  registrationReview:review?{
   complete:review.complete,total:review.total,
   equipment:review.items.map(x=>({slot:x.slot,status:x.status,problems:x.problems})),
   settings:review.settings.map(x=>({key:x.key,status:x.status,problems:x.problems}))
  }:null,
  interpretation:[
   '現在選択中の1ビルドのローカル入力と推定計算結果です。全ビルドのバックアップではありません。',
   '装備強化未確認・入力不足・推定値・一時効果を確定値と混同しないでください。',
   '補正込みはゲーム内の実測値ではなくBuild Plannerによるモデル計算です。',
   '登録照合の「checked」は本人が入力を確認した意味であり、計算式の検証済みを意味しません。',
   '計算条件はダメージ計算タブと共有しています。発動効果が常時有効とは限りません。'
  ],
  equipment:D.slots.map(([slot])=>equipmentEntry(state,build,slot)),
  configuration:{
   auraEnabled:settings.aura===true,potion:settings.potion||'none',
   food:settings.food||'none',utility:settings.utility||'none',
   enemyLevel:settings.enemyLevel??70,
   baseStats:select(settings.base||{},Object.keys(C.labels)),
   paragon:{level:settings.paragonLevel??null,spent:allocation.total,
    remaining:settings.paragonLevel==null?null:settings.paragonLevel-allocation.total,
    legacy:allocation.legacy,points:select(allocation.points||{},D.paragonStats.map(p=>p.key)),
    effects:D.paragonStats.filter(p=>allocation.points[p.key]>0).map(p=>({
     stat:p.stat,name:label(p.stat),points:allocation.points[p.key],bonus:allocation.points[p.key]*p.per
    })),issues:allocation.issues},
   talents:talentReport(settings),pet:petReport(settings),runes:runeReport(settings),
   combatScenario:B.scenario(settings.combat),
   learnedSkillRanks:select(settings.skillRanks||{},Object.keys(settings.skillRanks||{})),
   statDisplay:{
    enabledGroups:calculated.selection.filters,
    enabledEquipmentSlots:calculated.selection.slots,
    equippedUniquePowerToggles:calculated.selection.powers,
    comparisonKeys:V.comparisonKeys(settings)
   },
   sustainedDpsSettings:select(settings.dps||{},Object.keys(settings.dps||{})),
   buildNotes:settings.notes||null
  },
  calculated:{
   caps:{...D.limits},equipmentOnly:statReport(calculated.base),
   withEnabledEffects:statReport(calculated.active),
   sourceBreakdown:Object.fromEntries(Object.entries(calculated.active.breakdown)
    .filter(([,records])=>records.length).map(([key,records])=>[key,records.map(x=>({
     source:x.source,value:x.value,confidence:x.quality||'unconfirmed'
    }))])),
   unverifiedOrMissing:calculated.active.pending||[]
  }
 };
}
function toJSON(report){return JSON.stringify(report,null,2);}
function toPrompt(report){
 return '以下はDeskrawl Build Plannerから出力した現在のビルドです。\n'+
 '装備・OP・強化状態・宝石・ルーン・パラゴン・タレント・ペット・発動条件と計算結果を読み取り、分析の基準にしてください。\n'+
 '「未確認」「推定」「発動条件付き」の項目は確定値として扱わず、登録照合結果も参照してください。\n'+
 'このデータにはアカウント認証情報は含まれていません。\n\n'+
 '```json\n'+toJSON(report)+'\n```';
}
function filename(report){const date=(report.exportedAt||'').slice(0,10)||'date';
 return 'Deskrawl_ChatGPT_Build_'+date+'.json';}
window.DBPAIExport={buildReport,toJSON,toPrompt,filename};
})();
