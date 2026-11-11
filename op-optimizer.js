/* OP optimizer: purely hypothetical one-affix swaps on the selected, equipped
 * non-Divine hero item. Uses the exact stat filters, skill, and scenario from
 * the existing Damage / Reduction screen. Never edits stored planner state. */
(function(){'use strict';
 const D=window.DBP,C=window.DBPCalc,B=window.DBPCombat,V=window.DBPStatsView;
 const allowedPositions=(slot)=>D.rules[slot]?[
  {kind:'primary',index:0},{kind:'primary',index:1},
  {kind:'primary',index:2},{kind:'primary',index:3},
  {kind:'secondary',index:0}
 ]:[];
 const idOf=({kind,index})=>kind==='secondary'?'secondary':'primary:'+index;
 function position(slot,id){
  const positions=allowedPositions(slot);
  return positions.find(p=>idOf(p)===id)||positions[0]||null;
 }
 const nameOf=key=>D.affixes[key]?.[0]||key||'未設定';
 function scenario(settings){
  const raw=B.scenario(settings?.combat),id=Object.hasOwn(B.abilities,raw.abilityId)?raw.abilityId:'lightningStorm';
  return {...raw,abilityId:id};
 }
 function contextFor(state,build){
  const cfg=V.config(build.settings||{}),eq=B.equippedEffects(state,build),items={};
  if(cfg.filters.unique)for(const [slot,id] of Object.entries(eq.items))
   if(cfg.slots[slot]!==false&&cfg.powers[id]!==false)items[slot]=id;
  return {cfg,context:{...eq,items,schrodingerRing:items.ring1==='schrodinger'||items.ring2==='schrodinger'}};
 }
 function snapshot(state,build,context,filters,q){
  const stats=C.calc(state,build,{sourceFilters:filters});
  const hit=B.attack(stats,build.settings||{},q,context);
  return {stats,hit};
 }
 function swapped(item,pos,key){
  const copy={...item,primary:[...(item.primary||[])],overrides:{...(item.overrides||{})}};
  if(pos.kind==='primary'){while(copy.primary.length<4)copy.primary.push('');copy.primary[pos.index]=key;}
  else copy.secondary=key;
  // A measured override for the old OP must not leak into the hypothetical roll.
  const suffix=':'+(pos.kind==='primary'?pos.index:'s')+':'+item.upgrade;
  for(const k of Object.keys(copy.overrides))if(k.endsWith(suffix))delete copy.overrides[k];
  return copy;
 }
 function evaluate(state,build,slot,positionId='primary:0'){
  const original=state?.items?.find(x=>x.id===build?.loadout?.[slot]);
  const definition=D.definitions.find(x=>x.id===original?.definitionId);
  if(!original)return {ok:false,reason:'この部位には装備がありません。',slot};
  if(definition?.rarity==='Divine')return {ok:false,reason:'ディバイン装備のOPは固定のため変更候補がありません。',slot};
  if(!D.rules[slot])return {ok:false,reason:'この部位のOP候補データがありません。',slot};
  const pos=position(slot,positionId);
  if(!pos)return {ok:false,reason:'この部位のOP枠が見つかりません。',slot};
  const current=pos.kind==='primary'?original.primary?.[pos.index]||'':original.secondary||'';
  const {cfg,context}=contextFor(state,build);
  const filters={...cfg.filters,powers:cfg.powers,slots:cfg.slots};
  const q=scenario(build.settings);
  const baseline=snapshot(state,build,context,filters,q);
  const baselineExpected=baseline.hit.expected;
  if(!Number.isFinite(baselineExpected)||baselineExpected<=0){
   return {ok:false,reason:'武器ダメージまたはスキル倍率が未登録で、期待ダメージを比較できません。',slot};
  }
  const pool=D.rules[slot][pos.kind]||[],others=pos.kind==='primary'
   ?new Set((original.primary||[]).filter((k,i)=>i!==pos.index&&k))
   :new Set();
  const options=[];
  for(const key of pool){
   if(others.has(key))continue; // Cannot roll a duplicate primary OP.
   const same=key===current,change=same?null:swapped(original,pos,key);
   const virtual=change?{...state,items:state.items.map(it=>it.id===original.id?change:it)}:state;
   // Replace only in a temporary item list; the saved inventory is never mutated.
   const after=same?baseline:snapshot(virtual,build,context,filters,q);
   const currentValue=current?C.valueOf(original,current,pos.kind==='primary'?pos.index:'s'):null;
   const nextValue=key?C.valueOf(change||original,key,pos.kind==='primary'?pos.index:'s'):null;
   const expected=after.hit.expected;
   if(!Number.isFinite(expected))continue;
   options.push({
    key,name:nameOf(key),current:same,
    value:nextValue?.value??null,quality:nextValue?.status||'unconfirmed',
    expected,normal:after.hit.normal?.final??null,critical:after.hit.critical?.final??null,
    delta:expected-baselineExpected,percent:(expected/baselineExpected-1)*100,
    originalValue:currentValue?.value??null
   });
  }
  options.sort((a,b)=>b.percent-a.percent||Number(b.current)-Number(a.current)||a.name.localeCompare(b.name,'ja'));
  const baseCurrent=current?C.valueOf(original,current,pos.kind==='primary'?pos.index:'s'):null;
  const locked=pos.kind==='primary'?Boolean(original.opLocks?.primary?.[pos.index]):Boolean(original.opLocks?.secondary);
  return {ok:true,slot,position:idOf(pos),positions:allowedPositions(slot),
   current,originalName:nameOf(current),originalValue:baseCurrent?.value??null,locked,
   itemName:original.nickname||definition?.name||'装備',upgrade:Number(original.upgrade)||0,
   upgradeKnown:original.upgradeKnown===true,scenario:q,
   skillName:B.abilities[q.abilityId]?.[0]||q.abilityId,
   baseline:{expected:baselineExpected,normal:baseline.hit.normal?.final,
    critical:baseline.hit.critical?.final,critChance:baseline.hit.critChance},
   options,top:options[0]||null,missing:baseline.stats.pending||[],
   sourceFlags:baseline.stats.sourceFlags||{}};
 }
 window.DBPOpOptimizer={position,evaluate,swapped,scenario,contextFor};
})();
