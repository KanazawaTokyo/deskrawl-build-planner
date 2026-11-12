/* Manual, source-preserving registration review for the selected build.
 * This does NOT validate that game screenshots match the inputs, and does not
 * promote inferred game-master values to verified measurements.
 */
(function(){'use strict';
const D=window.DBP;
const groups=[
 {key:'paragon',name:'パラゴン',route:'settings'},
 {key:'talents',name:'戦闘タレント',route:'talent'},
 {key:'runes',name:'ルーン',route:'settings'},
 {key:'pet',name:'ペット',route:'pet'},
 {key:'consumables',name:'ポーション・料理・オーラ',route:'settings'},
 {key:'base',name:'装備外の基礎値',route:'settings'}
];
const tracked={
 paragon:['paragonLevel','paragonPoints','paragon'],
 talents:['talentPoints','talents'],
 runes:['runeSlots'],
 pet:['pet'],
 consumables:['aura','potion','food','utility'],
 base:['base','enemyLevel']
};
function itemSignature(it){
 if(!it)return '';
 return JSON.stringify([it.slot,it.definitionId,it.primary||[],it.secondary||'',
  it.upgrade,it.upgradeKnown,it.overrides||{},it.gems||[],it.owned??null]);
}
function settingsSignature(settings,key){
 const fields=tracked[key];
 return fields?JSON.stringify(fields.map(k=>settings?.[k]??null)):'';
}
function itemProblems(it,slot){
 const problems=[];
 if(!it)return ['装備が未登録です'];
 const def=D.definitions.find(x=>x.id===it.definitionId&&x.slot===slot);
 if(it.slot!==slot||!def)problems.push('装備の部位・種類を確認してください');
 else if(def.id.startsWith('custom-')||def.legacyOnly)problems.push('「その他」または旧形式の装備名を選択しています');
 if(it.upgradeKnown!==true)problems.push('強化段階をゲーム画面で確認してください');
 if(it.owned!==true)problems.push('実際に所持している装備か確認してください');
 if(def&&def.rarity!=='Divine'){
  const values=(it.primary||[]).filter(Boolean);
  if(values.length!==4||new Set(values).size!==4)problems.push('主要OPの4枠を正しく入力してください');
  if(!it.secondary)problems.push('補助OPを入力してください');
  const rule=D.rules[slot];
  if(rule&&values.some(k=>!rule.primary.includes(k)))problems.push('現在のOP候補外の主要OPがあります（マスター側の更新も確認）');
  if(rule&&it.secondary&&!rule.secondary.includes(it.secondary))problems.push('現在のOP候補外の補助OPがあります（マスター側の更新も確認）');
 }
 for(const gem of it.gems||[]){
  if(!gem?.type)continue;
  if(!D.gems[gem.type])problems.push('未対応の宝石があります');
  if(Number(gem.tier)===7&&(gem.value===null||gem.value===undefined||gem.value===''||!Number.isFinite(Number(gem.value))))problems.push('Tier 7宝石の実測値が未登録です');
 }
 return [...new Set(problems)];
}
function settingProblems(settings,key){
 const p=[];
 if(key==='paragon'){
  if(settings?.paragonLevel===null||settings?.paragonLevel===undefined||settings?.paragonLevel==='')p.push('パラゴンレベルを設定してください');
  const allocation=D.paragonAllocation(settings||{});
  if(allocation.issues.length)p.push('パラゴン配分に確認が必要な値があります');
 }
 if(key==='talents'){
  const a=window.DBPTalents?.allocation(settings||{});
  if(!a)p.push('タレント計算モジュールがありません');
  else if(a.issues.length||!a.eligibility?.ok)p.push('タレント配分・解放条件を確認してください');
 }
 if(key==='runes'){
  const r=window.DBPRunes?.selection(settings||{});
  if(!r)p.push('ルーン計算モジュールがありません');
  else {
   if(r.issues.length)p.push('無効または重複したルーンがあります');
   if(r.equipped.length!==6)p.push('ルーン6枠の装備内容を入力してください');
  }
 }
 if(key==='pet'&&!settings?.pet?.id)p.push('使用中のペットを選択してください');
 return p;
}
function status(record,signature,problems){
 if(problems.length)return 'incomplete';
 if(!record)return 'unchecked';
 return record.signature===signature?'checked':'stale';
}
function report(state,build){
 const items=D.slots.map(([slot,label])=>{
  const it=state.items.find(x=>x.id===build.loadout?.[slot]);
  const problems=itemProblems(it,slot),signature=itemSignature(it);
  const record=it&&state.inputReviews?.items?.[it.id];
  return {slot,label,item:it||null,problems,status:status(record,signature,problems),signature};
 });
 const settings=groups.map(g=>{
  const problems=settingProblems(build.settings||{},g.key);
  const signature=settingsSignature(build.settings||{},g.key);
  const record=build.inputReview?.settings?.[g.key];
  return {...g,problems,status:status(record,signature,problems),signature};
 });
 const all=[...items,...settings];
 return {items,settings,complete:all.filter(x=>x.status==='checked').length,
  total:all.length,errors:all.reduce((n,x)=>n+x.problems.length,0)};
}
function confirmItem(state,build,id,now=new Date().toISOString()){
 const row=report(state,build).items.find(x=>x.item?.id===id);
 if(!row||row.problems.length)return false;
 state.inputReviews??={};
 state.inputReviews.items??={};
 state.inputReviews.items[id]={signature:row.signature,checkedAt:now};
 return true;
}
function confirmSetting(state,build,key,now=new Date().toISOString()){
 const row=report(state,build).settings.find(x=>x.key===key);
 if(!row||row.problems.length)return false;
 build.inputReview??={};
 build.inputReview.settings??={};
 build.inputReview.settings[key]={signature:row.signature,checkedAt:now};
 return true;
}
const badges={checked:'画面と照合済み',stale:'変更後・再照合待ち',incomplete:'入力不足・要確認',unchecked:'未照合'};
function render(state,build,E,nameOf){
 const result=report(state,build);
 const row=(title,detail,issues,st,open,confirm)=>{
  const issueText=issues.length?'<div class="review-issues">'+issues.map(x=>'<span>'+E(x)+'</span>').join('')+'</div>':'';
  return '<div class="review-row"><div class="review-main"><strong>'+E(title)+'</strong>'+
   '<small>'+E(detail)+'</small><span class="review-status '+st+'">'+badges[st]+'</span>'+issueText+'</div>'+
   '<div class="review-actions">'+open+
   (st==='checked'?'<span class="review-confirmed">✓ 照合済み</span>':
   issues.length?'':confirm)+'</div></div>';
 };
 const gear=result.items.map(x=>{
  const name=x.item?nameOf(x.item):'未装備';
  return row(x.label,name,x.problems,x.status,
   '<button class="btn outline" data-action="review-edit-item" data-value="'+E(x.slot)+'">編集</button>',
   '<button class="btn" data-action="review-confirm-item" data-id="'+E(x.item?.id||'')+'">ゲーム画面と照合した</button>');
 }).join('');
 const settings=result.settings.map(x=>row(x.name,'現在のビルド設定',x.problems,x.status,
  '<button class="btn outline" data-action="review-edit-settings" data-value="'+E(x.key)+'">設定を開く</button>',
  '<button class="btn" data-action="review-confirm-settings" data-value="'+E(x.key)+'">ゲーム画面と照合した</button>'
 )).join('');
 return '<div class="modal-title"><h2>登録照合 · '+E(build.name)+'</h2><button type="button" class="icon-btn" data-action="modal-close" aria-label="閉じる">×</button></div>'+
  '<p class="helper">現在のゲーム画面と照らし合わせ、装備と設定を確認してください。履歴由来の初期値は自動的に照合済みになりません。</p>'+
  '<div class="review-progress"><strong>'+result.complete+' / '+result.total+'</strong><span>本人による入力照合が完了した項目</span></div>'+
  '<div class="notice">照合済みは「入力内容を本人が確認した」という意味です。ゲームの計算式や固有効果の正しさは保証しません。値を変更すると再照合が必要です。</div>'+
  '<h3 class="review-heading">装備中の11部位</h3><div class="review-list">'+gear+'</div>'+
  '<h3 class="review-heading">ビルド設定</h3><div class="review-list">'+settings+'</div>'+
  '<p class="helper">確認結果は既存のJSONバックアップとSupabase同期に追加保存します。装備・設定の数値自体はこの画面から変更しません。</p>';
}
window.DBPInputReview={groups,itemSignature,settingsSignature,itemProblems,settingProblems,report,confirmItem,confirmSetting,render};
})();
