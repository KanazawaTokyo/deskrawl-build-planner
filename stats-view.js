/* Status comparison: equipped numbers alone vs configurable active effects.
 * The original saved equipment and legacy DBPCalc.calc behavior remain unchanged.
 * This is a projection, not a second equipment inventory or game server state.
 */
(function(){'use strict';
const C=window.DBPCalc,B=window.DBPCombat;
const groups=[
 ['base','キャラクター基礎値','装備外の入力値・レベル初期値'],
 ['gems','宝石','装備中ソケットの数値'],
 ['paragon','Paragon','割り振りポイント'],
 ['talents','タレント','通常効果・スキル限定効果'],
 ['pet','ペット','パッシブ・継承・ペット装備'],
 ['aura','Flame Aura','発動中の効果・条件付きタレント'],
 ['potion','ポーション','選択中のポーション'],
 ['food','料理','選択中の食事'],
 ['unique','装備固有効果','装備ごとの固有パッシブ・発動効果']
];
const gearOnlyFilters=Object.fromEntries(groups.map(([id])=>[id,false]));
const clean=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function config(settings={}){
 const raw=settings.statView||{};
 const enabled=raw.groups||{},powers=raw.powers||{};
 const filters=Object.fromEntries(groups.map(([id])=>[id,enabled[id]!==false]));
 const slots=Object.fromEntries(window.DBP.slots.map(([slot])=>[slot,raw.slots?.[slot]!==false]));
 return {filters,powers,slots,settings:settings,mode:raw.mode||'all'};
}
function gearOnly(doc,build,slots){return C.calc(doc,build,{sourceFilters:{...gearOnlyFilters,slots}});}
function evaluate(doc,build){
 const settings=build.settings||{},selection=config(settings);
 const base=gearOnly(doc,build,selection.slots);
 const result=C.calc(doc,build,{sourceFilters:{...selection.filters,powers:selection.powers,slots:selection.slots}});
 const active={
  ...result,sum:{...result.sum},raw:{...result.raw},effective:{...result.effective},
  breakdown:Object.fromEntries(Object.entries(result.breakdown).map(([key,items])=>[key,[...items]])),
  pending:[...result.pending]
 };
 const equipment=B.equippedEffects(doc,build);
 const items={};
 if(selection.filters.unique)for(const [slot,id] of Object.entries(equipment.items)){
  if(selection.slots[slot]!==false&&selection.powers[id]!==false)items[slot]=id;
 }
 const context={...equipment,items,schrodingerRing:items.ring1==='schrodinger'||items.ring2==='schrodinger'};
 const q=B.scenario(settings.combat);
 const unique=B.uniqueBonuses(result,q,context);
 const add=(key,value,source,quality='calculated')=>{
  if(!Number.isFinite(value)||value===0)return;
  active.sum[key]=(active.sum[key]||0)+value;
  active.raw[key]=(active.raw[key]||0)+value;
  active.effective[key]=(active.effective[key]||0)+value;
  (active.breakdown[key]??=[]).push({source,value,quality});
  if(C.limits?.[key]!==undefined)active.effective[key]=Math.min(C.limits[key],active.effective[key]);
 };
 // Explicitly kept separate from equipment-only. These are game-level base
 // figures used by the existing combat calculator when no manual value exists.
 if(selection.filters.base){
  const b=settings.base||{};
  for(const [stat,value] of [['critChance',5],['critDamage',150],['dodge',5]]){
   if(b[stat]===undefined||b[stat]===null||b[stat]===''){
    add(stat,value,'ソーサラー基本値（装備外）','verified');
    if(['critChance','dodge'].includes(stat)){
     active.effective[stat]=Math.min(window.DBP.limits[stat],active.effective[stat]);
    }
   }
  }
 }
 // Temporary elemental stacks are granted to all three supported elements
 // simultaneously; they must not multiply the already equipped element bonus.
 if(unique.stacks>0){
  for(const key of ['fire','lightning','arcane']){
   add(key,20*unique.stacks,'エレメンタルバーストのポールドロン · '+unique.stacks+'スタック（6秒）');
  }
 }
 if(items.neck==='prism'&&unique.highestValue>0&&unique.highestElement){
  add(unique.highestElement,unique.highestValue*.25,'プリズムの心臓 · 最高属性の25%');
 }
 if(unique.windcallerMove)add('move',unique.windcallerMove,'風呼びのブーツ · 撃破後4秒');
 if(unique.greavesCrit)add('elementalSkillCritBonus',unique.greavesCrit,'秘術の刃のグリーヴ · 火/雷/秘術スキル');
 if(unique.gauntletCrit)add('lightningStormCritBonus',unique.gauntletCrit,'ストームコーラーの篭手 · Lightning Storm');
 if(unique.ironMult!==1)add('independentDamageBonus',(unique.ironMult-1)*100,'鉄の暴君の兜 · '+(q.elite?'Elite/Boss':'通常敵'));
 if(unique.invulnerable)add('temporaryInvulnerable',100,'不屈の胸当て · 4秒間の無敵');
 // Show which damage-vs stats currently contribute. This is an additive
 // condition bucket, not an independent damage multiplier.
 for(const condition of B.conditional(active,q,context)){
  if(condition.active&&condition.value){
   add('activeConditionalDamage',condition.value,condition.label+' · '+condition.reason);
  }
 }
 // A skills-only Crit preview must NOT rewrite generic Crit Damage.
 const bonus=(q.damageType==='lightning'&&q.lightningAbility?(active.effective.lightningAbilityCritDamage||0):0)
  +(q.frozen?(active.effective.frozenCritDamage||0):0)+unique.greavesCrit+unique.gauntletCrit;
 const statCrit=active.effective.critDamage||0;
 const effectiveSkillCrit=statCrit+bonus;
 active.sum.skillCritDamage=effectiveSkillCrit;
 active.raw.skillCritDamage=effectiveSkillCrit;
 active.effective.skillCritDamage=effectiveSkillCrit;
 active.breakdown.skillCritDamage=[
  ...(active.breakdown.critDamage||[]),
  ...(q.damageType==='lightning'&&q.lightningAbility?(active.breakdown.lightningAbilityCritDamage||[]):[]),
  ...(q.frozen?(active.breakdown.frozenCritDamage||[]):[]),
  ...(active.breakdown.elementalSkillCritBonus||[]),
  ...(active.breakdown.lightningStormCritBonus||[])
 ];
 base.raw.skillCritDamage=base.effective.critDamage||0;
 base.effective.skillCritDamage=base.effective.critDamage||0;
 base.sum.skillCritDamage=base.effective.critDamage||0;
 base.breakdown.skillCritDamage=[...(base.breakdown.critDamage||[])];
 return {base,active,settings,q,selection,context,equipment,unique};
}
Object.assign(C.labels,{
 skillCritDamage:'対象スキルCritダメージ',elementalSkillCritBonus:'属性スキル固有Crit補正',
 lightningStormCritBonus:'Lightning Storm固有Crit補正',independentDamageBonus:'装備固有の独立ダメージ増幅',
 temporaryInvulnerable:'無敵発動中（参考）',activeConditionalDamage:'現在成立中の条件ダメージ加算'
});
for(const key of ['skillCritDamage','elementalSkillCritBonus','lightningStormCritBonus','independentDamageBonus','temporaryInvulnerable','activeConditionalDamage'])C.percent.add(key);
function controls(v){
 const slotHtml=window.DBP.slots.map(([key,label])=>
  '<label class="stat-slot-toggle"><input type="checkbox" data-change="stat-slot" data-key="'+key+'"'+
  (v.selection.slots[key]?' checked':'')+'><span>'+clean(label)+'</span></label>'
 ).join('');
 const sourceHtml=groups.map(([key,label,description])=>
  '<label class="stat-source-toggle"><input type="checkbox" data-change="stat-source" data-key="'+key+'"'+
  (v.selection.filters[key]?' checked':'')+'><span><b>'+clean(label)+'</b><small>'+clean(description)+'</small></span></label>'
 ).join('');
 const equipped=v.equipment.items;
 const available=[...new Set(Object.values(equipped))].filter(x=>B.knownPowers[x]);
 const localized={grandmother:'グランドマザー',iron:'鉄の暴君の兜',schrodinger:'シュレーディンガーの指輪',
  sage:'長老賢者の遺産',prism:'プリズムの心臓',shoulder:'エレメンタルバーストのポールドロン',
  unyielding:'不屈の胸当て',gauntlets:'ストームコーラーの篭手',bottomless:'無尽のベルト',
  greaves:'秘術の刃のグリーヴ',windcaller:'風呼びのブーツ'};
 const powers=available.map(id=>{
  const name=localized[id]||B.knownPowers[id][0],checked=v.selection.powers[id]!==false;
  const availableSlot=Object.entries(equipped).some(([slot,power])=>power===id&&v.selection.slots[slot]!==false);
  return '<label class="stat-power-toggle"><input type="checkbox" data-change="stat-power" data-key="'+id+'"'+(checked?' checked':'')+(v.selection.filters.unique&&availableSlot?'':' disabled')+'><span>'+clean(name)+'</span></label>';
 }).join('');
 const opt=(value,title,current)=>'<option value="'+value+'"'+(String(value)===String(current)?' selected':'')+'>'+clean(title)+'</option>';
 const scen=v.q;
 const perGear=[
  v.selection.slots.shoulder&&equipped.shoulder==='shoulder'?'<label class="field"><span>ポールドロン・スタック数</span><select data-change="combat" data-key="elementalStacks">'+Array.from({length:6},(_,i)=>opt(i,i+' / 5（+'+(20*i)+'%）',scen.elementalStacks)).join('')+'</select></label>':'',
  v.selection.slots.boots&&equipped.boots==='windcaller'?'<label class="stat-power-toggle"><input type="checkbox" data-change="combat" data-key="windcallerActive"'+(scen.windcallerActive?' checked':'')+'>風呼び：撃破後4秒</label>':'',
  v.selection.slots.chest&&equipped.chest==='unyielding'?'<label class="stat-power-toggle"><input type="checkbox" data-change="combat" data-key="unyieldingActive"'+(scen.unyieldingActive?' checked':'')+'>不屈：無敵発動中4秒</label>':''
 ].filter(Boolean).join('');
 const scenario='<div class="stats-sim-fields">'+
  '<label class="field"><span>表示するスキル</span><select data-change="combat" data-key="abilityId">'+opt('other','一般スキル',scen.abilityId)+opt('lightningStorm','Lightning Storm',scen.abilityId)+'</select></label>'+
  '<label class="field"><span>対象属性</span><select data-change="combat" data-key="damageType">'+Object.entries(B.types).map(([key,val])=>opt(key,val[0],scen.damageType)).join('')+'</select></label>'+
  '<label class="stat-power-toggle"><input type="checkbox" data-change="combat" data-key="lightningAbility"'+(scen.lightningAbility?' checked':'')+'>雷アビリティ用タレント</label>'+
  '<label class="stat-power-toggle"><input type="checkbox" data-change="combat" data-key="elite"'+(scen.elite?' checked':'')+'>対象がElite/Boss</label>'+
  '<label class="field"><span>敵の残HP（%）</span><input type="number" min="0" max="100" step="1" data-change="combat" data-key="enemyHealth" value="'+scen.enemyHealth+'"></label>'+
  '<label class="stat-power-toggle"><input type="checkbox" data-change="combat" data-key="forceHealthy"'+(scen.forceHealthy||v.context.schrodingerRing?' checked':'')+(v.context.schrodingerRing?' disabled':'')+'>敵を健康扱い</label>'+
  '<label class="stat-power-toggle"><input type="checkbox" data-change="combat" data-key="forceInjured"'+(scen.forceInjured||v.context.schrodingerRing?' checked':'')+(v.context.schrodingerRing?' disabled':'')+'>敵を負傷扱い</label>'+
  '<label class="stat-power-toggle"><input type="checkbox" data-change="combat" data-key="vulnerable"'+(scen.vulnerable?' checked':'')+'>敵が脆弱状態</label>'+
  '<label class="stat-power-toggle"><input type="checkbox" data-change="combat" data-key="burned"'+(scen.burned?' checked':'')+'>敵が燃焼状態</label>'+
  '<label class="stat-power-toggle"><input type="checkbox" data-change="combat" data-key="frozen"'+(scen.frozen?' checked':'')+'>対象がFrozen</label>'+
  perGear+'</div>';
 return '<section class="card stats-sim-panel" aria-label="ステータスの補正ON/OFF設定">'+
 '<div class="card-heading"><div><h2>ステータス計算条件</h2><span>装備の数字だけ／有効な補正込みを比較。各項目はビルド単位で保存。</span></div></div>'+
 '<div class="stats-presets"><button class="btn outline" data-action="stat-preset" data-value="gear">装備のみ</button><button class="btn outline" data-action="stat-preset" data-value="all">補正すべてON</button></div>'+
 '<div class="stats-slot-header"><b>装備部位</b><small>OFFの装備はOP・宝石・固有効果を計算から除外</small></div>'+
  '<div class="stats-slot-grid">'+slotHtml+'</div>'+
  '<div class="stats-source-grid">'+sourceHtml+'</div>'+
 (available.length?'<details class="stats-power-details" open><summary>装備固有効果を個別に切替（'+available.length+'件）</summary><div class="stats-powers-grid">'+powers+'</div></details>':'')+
 '<details class="stats-power-details" open><summary>発動状態・スキル条件を指定</summary>'+scenario+'</details>'+
 '<p class="helper">「装備のみ」は左側の比較値の定義です。右側の補正は上のON/OFFで変更します。発動効果は現在の状況を仮定した数値で、持続率・実際の発動確率は計算しません。タレント限定Critは通常Critとは別に表示します。</p>'+
 '</section>';
}
function column(k,v){
 const n=v?.effective?.[k];
 return clean(C.format(k,n===undefined?0:n));
}
function deltaText(k,a,b){
 const v=(b?.effective?.[k]||0)-(a?.effective?.[k]||0);
 return (v>0?'+':'')+clean(C.format(k,v));
}
function statRow(key,v,selected){
 const label=C.labels[key]||key,base=v.base.effective[key]||0,eff=v.active.effective[key]||0;
 const change=eff-base;
 return '<button data-action="stat" data-value="'+clean(key)+'" class="stat-row stats-compare-row'+(selected===key?' chosen':'')+'">'+
 '<span class="stats-compare-name">'+clean(label)+'</span>'+
 '<span class="stats-compare-num">'+column(key,v.base)+'</span>'+
 '<b class="stats-compare-num">'+column(key,v.active)+'</b>'+
 '<span class="stats-compare-delta '+(change>0?'positive':change<0?'negative':'neutral')+'">'+deltaText(key,v.base,v.active)+'</span>'+
 '</button>';
}
function summary(v){
 const keys=['lightning','critDamage','skillCritDamage','critChance','cdr','mr','armor','move'];
 return '<div class="stats-compare-summary">'+keys.map(key=>{
  const change=(v.active.effective[key]||0)-(v.base.effective[key]||0);
  return '<button type="button" data-action="stat" data-value="'+key+'" class="stats-compare-tile">'+
   '<small>'+clean(C.labels[key]||key)+'</small>'+
   '<div><span>装備のみ</span><b>'+column(key,v.base)+'</b></div>'+
   '<div><span>補正込み</span><strong>'+column(key,v.active)+'</strong></div>'+
   '<small class="'+(change>0?'positive':change<0?'negative':'neutral')+'">差分 '+deltaText(key,v.base,v.active)+'</small>'+
   '</button>';
 }).join('')+'</div>';
}
function tableHeader(){
 return '<div class="stats-compare-header"><span>項目</span><span>装備のみ</span><span>補正込み</span><span>差分</span></div>';
}
window.DBPStatsView={groups,gearOnlyFilters,config,gearOnly,evaluate,controls,statRow,summary,tableHeader};
})();