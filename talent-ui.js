/* Game-like Sorcerer talent tree UI.
 * All mutations are handled by app.js and DBPTalents; this module only renders.
 */
(function(){'use strict';
const T=window.DBPTalents,C=window.DBPCalc;
const escape=s=>String(window.DBPJP?.text(s)??s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const number=n=>Number(n).toLocaleString('ja-JP',{maximumFractionDigits:1});
const symbol={arcane:'✦',fire:'✹',cold:'❄',lightning:'ϟ'};
const color={arcane:'arcane',fire:'fire',cold:'cold',lightning:'lightning'};
function effectText(def,rank){
 if(!rank)return '未習得';
 let text=def.effects.map(e=>{
  const v=e.per*rank;
  return (e.label||C.labels[e.stat]||e.stat)+' +'+number(v)+(C.percent.has(e.stat)||e.stat.match(/Cdr|Chance|Range|Duration|Potency|Damage|Penalty|Size|Heal|As|Reduction|Ward|Crit/i)?'%':'');
 }).join(' / ');
 if(def.special==='manaToInt')text='最大マナの '+rank*5+'% を知力に加算';
 if(def.special==='iceNovaMana')text='アイスノヴァ：'+rank*12.5+'% で マナ '+(50+rank*10)+' 回復';
 return text||def.description;
}
/** Condensed, rank-aware descriptions sized for a five-column talent board.
 * Inactive tiles preview the effect of one point; active tiles show their
 * current investment. Detailed descriptions remain available in the sidebar.
 */
function tileEffect(def,rank){
 const n=Math.max(1,rank),pct=v=>number(v)+'%',value=v=>number(v);
 const descriptions={
  arcaneInsight:()=> '知力 +'+value(5*n),
  searingEdge:()=> '基本攻撃のクリティカル率 +'+pct(2.5*n),
  frostArmor:()=> 'アーマー +'+value(35*n)+'／ボーナスアーマー +'+pct(3*n),
  arcaneReach:()=> '基本攻撃の射程 +'+pct(6*n),
  manaFlow:()=> '最大マナ +'+value(4*n),
  flameWard:()=> '炎ダメージ +'+pct(5*n)+'／魔法耐性ボーナス +'+pct(4*n),
  manaConduit:()=> '基本攻撃のマナ獲得 +'+value(n),
  frostMastery:()=> '冷気ダメージ +'+pct(7*n),
  stormExecutioner:()=> '雷ダメージ +'+pct(4*n)+'／エリートへのダメージ +'+pct(3*n),
  manaRegeneration:()=> '毎秒マナ回復 +'+value(n),
  arcaneMomentum:()=> '特殊攻撃後5秒、基本攻撃ダメージ +40%',
  immolation:()=> 'ファイアボール：15%で燃焼を付与',
  coldRetribution:()=> '被ダメージ −10%／近接攻撃者に4秒の冷気',
  thunderstruck:()=> 'ライトニングストーム：15%で1秒スタン',
  flameBreathCrit:()=> '烈焰吐息のクリティカルダメージ +'+pct(20*n),
  elementalFury:()=> 'ファイアエレメンタルの攻撃速度 +'+pct(15*n),
  frostAlacrity:()=> '冷気スキルのクールダウン短縮 +'+pct(4*n),
  deepChill:()=> '冷気の減速・持続効果 +'+pct(6*n),
  electricalShield:()=> 'ボーナスアーマー +'+pct(2*n)+'／近接被弾でマナ獲得',
  arcaneReservoir:()=> '最大マナの'+pct(5*n)+'を知力に加算',
  conflagration:()=> '燃焼中の敵へのダメージ +'+pct(12*n),
  iceMeteorCost:()=> 'アイスメテオのマナ消費 −'+pct(4*n),
  iceShardsDamage:()=> '氷の破片のダメージ +'+pct(10*n),
  stormMastery:()=> '雷スキルのクリティカルダメージ +'+pct(12*n)+'／雷ダメージ軽減 +'+pct(3*n),
  ignite:()=> 'クリティカルヒットで確実に燃焼',
  flashFreeze:()=> '冷気付与時15%で凍結を追加',
  staticCharge:()=> '雷スキルで確実に静電気を付与',
  cataclysm:()=> 'ファイアメテオのダメージ +'+pct(15*n)+'／クールダウン +'+pct(2*n),
  frozenReservoir:()=> 'アイスノヴァ：'+pct(12.5*n)+'でマナ'+value(50+10*n)+'回復',
  permafrost:()=> '凍結の持続時間 +'+pct(8*n),
  frozenRenewal:()=> 'アイスブロック中、毎秒最大HPの'+pct(5*n)+'回復',
  electrocuteMana:()=> '感電のマナ獲得 +'+value(2*n),
  plasmaConduction:()=> '炎雷：燃焼敵・静電気1重ごとに +'+pct(6*n),
  auraWard:()=> 'フレイムオーラ中、アーマー・魔法耐性 +'+pct(10*n),
  frostBeamExpansion:()=> 'フロストビームの幅・射程 +'+pct(10*n),
  currentTransfer:()=> '静電気状態の敵死亡時、'+pct(20*n)+'で伝搬',
  lingeringStorm:()=> 'サンダークラウドの持続時間 +'+pct(10*n),
  arcaneExposure:()=> '強攻撃4回ごとに脆弱／脆弱敵へのダメージ +150%',
  combustion:()=> '燃焼中の敵に命中時35%で爆発（武器900%）',
  shatteringIce:()=> '凍結敵へのクリティカル率 +50%／ダメージ +250%',
  stormConduit:()=> '感電・炎雷で30%追加発動／ライトニングストーム +50%'
 };
 const summary=descriptions[def.id]?descriptions[def.id]():def.description;
 return (rank?'':'1pt時：')+summary;
}
function node(def,ranks,selected,canUse){
 const n=ranks[def.id]||0;
 const add=T.canAdd(ranks,def.id),remove=T.canRemove(ranks,def.id);
 const title=escape(def.name+'\n'+def.description+'\n現在 '+n+'/'+def.max);
 return '<div class="talent-node '+color[def.element]+(def.cap?' talent-capstone':'')+(n?' picked':'')+(!canUse?' locked':'')+(selected===def.id?' focused':'')+'">'+
 '<button type="button" class="talent-tile" data-action="talent-add" data-value="'+def.id+'" title="'+title+'" aria-label="'+escape(def.name+' '+n+'/'+def.max+'。クリックで習得、右クリックで返却。')+'">'+
 '<span class="talent-name">'+escape(def.name)+'</span>'+
 '<span class="talent-effect" title="'+escape(def.description)+'">'+escape(tileEffect(def,n))+'</span>'+
 '<span class="talent-rank">'+n+' / '+def.max+'</span>'+
 '<span class="talent-gauge"><i style="width:'+(100*n/def.max)+'%"></i></span>'+
 (def.cap?'<span class="talent-cap-mark">キャップストーン '+['','Ⅰ','Ⅱ','Ⅲ'][def.cap]+'</span>':'')+
 '</button>'+
 '<div class="talent-node-actions">'+
 '<button type="button" data-action="talent-remove" data-value="'+def.id+'"'+(n&&!remove.ok?' disabled title="'+escape(remove.why)+'"':n?'':' disabled')+' aria-label="'+escape(def.name+'を1ポイント返却')+'">−</button>'+
 '<span>'+(n?'習得済み':'未習得')+'</span>'+
 '<button type="button" data-action="talent-add" data-value="'+def.id+'"'+(!add.ok||!canUse?' disabled title="'+escape(add.why||'旧形式の設定を切り替えてください')+'"':'')+' aria-label="'+escape(def.name+'に1ポイント追加')+'">+</button></div>'+
 '</div>';
}
function row(r,ranks,selected,legacy,eligibility){
 const options=T.defs.filter(d=>d.row===r),cap=options.some(d=>d.cap);
 const state=eligibility.rows.find(x=>x.row===r);
 const label=legacy?'旧形式のため編集不可':state.active?(state.ok?'ゲーム内条件達成':'ゲーム内条件：下位であと'+state.missing+'pt不足'):'未使用・自由に編集可能';
 return '<section class="talent-tier'+(legacy?' is-locked':state.active&&!state.ok?' is-unmet':' is-open')+'" data-tier="'+r+'">'+
 '<header><div class="talent-tier-heading"><b>'+r+'pt</b><span>'+ (cap?'キャップストーン '+(r===10?'Ⅰ':r===30?'Ⅱ':'Ⅲ'):'習得段階')+'</span></div>'+
 '<small>'+label+'</small></header>'+
 '<div class="talent-tier-items'+(cap?' is-cap':'')+'">'+options.map(x=>node(x,ranks,selected,!legacy)).join('')+'</div></section>';
}
function detail(def,ranks,legacy){
 if(!def)return '<div class="talent-detail-empty">タレントを選択してください。</div>';
 const n=ranks[def.id]||0,add=T.canAdd(ranks,def.id),refund=T.canRemove(ranks,def.id);
 const current=n?effectText(def,n):'習得していません';
 const next=n<def.max?effectText(def,n+1):'最大ランク';
 const capChoice=def.cap?T.defs.find(x=>x.cap===def.cap&&x.id!==def.id&&ranks[x.id]):null;
 const tier=T.gameEligibility(ranks).rows.find(x=>x.row===def.row);
 return '<div class="talent-detail-panel">'+
 '<div class="talent-detail-identity '+def.element+'"><div class="talent-detail-symbol">'+symbol[def.element]+'</div>'+
 '<div><span class="eyebrow">ソーサラー · '+(def.cap?'キャップストーン '+def.cap:'習得段階 '+def.row+'pt')+'</span><h2>'+escape(def.name)+'</h2>'+
 '<span class="talent-detail-rank">'+n+' / '+def.max+'</span></div></div>'+
 '<p class="talent-description">'+escape(def.description)+'</p>'+
 '<div class="talent-detail-stat"><small>現在の効果</small><strong>'+escape(current)+'</strong></div>'+
 '<div class="talent-detail-stat"><small>次のランク</small><strong>'+escape(next)+'</strong></div>'+
 '<div class="talent-detail-buttons"><button type="button" class="btn" data-action="talent-add" data-value="'+def.id+'"'+(legacy||!add.ok?' disabled title="'+escape(add.why||'新しい配分に切り替えてください')+'"':'')+'>'+
 (capChoice?'キャップストーンを付け替える':'＋ 1ポイント習得')+'</button>'+
 '<button type="button" class="btn outline" data-action="talent-remove" data-value="'+def.id+'"'+(legacy||!refund.ok?' disabled title="'+escape(refund.why||'新しい配分に切り替えてください')+'"':'')+'>− 1ポイント返却</button></div>'+
 (n&&tier.missing?'<p class="talent-lock-message">ゲーム内条件：'+def.row+'pt段階に対して、下位があと'+tier.missing+'pt不足しています。シミュレーター内では編集できます。</p>':'')+
 '</div>';
}
function eligibilityPanel(data){
 const check=data.eligibility;
 if(data.legacy)return '<section class="card talent-eligibility"><h2>ゲーム内の習得条件</h2><p class="helper">旧形式のタレント設定です。ポイント方式へ切り替えると各段階の条件を判定できます。</p></section>';
 const used=check.rows.filter(r=>r.active);
 return '<section class="card talent-eligibility" aria-label="ゲーム内の習得条件を判定">'+
 '<div class="card-heading"><div><h2>ゲーム内の習得条件</h2><span>シミュレーターは段階制限なし。ゲーム内で再現できるかを判定します。</span></div>'+
 '<strong class="talent-eligibility-result'+(check.ok?' valid':' invalid')+'">'+
 (check.ok?'✓ 条件を満たしています':'! '+check.problems.length+'段階でポイント不足')+'</strong></div>'+
 (used.length?'<div class="talent-eligibility-grid">'+check.rows.map(r=>{
   const status=!r.active?'未使用':r.ok?'条件達成':'あと'+r.missing+'pt不足';
   return '<div class="talent-eligibility-row'+(!r.active?' unused':r.ok?' valid':' invalid')+'">'+
   '<div class="talent-eligibility-row-top"><b>'+r.row+'pt段階</b><strong>'+status+'</strong></div>'+
   '<small>この段階：'+r.allocated+'pt'+(r.row?' · 下位合計 '+r.lower+'/'+r.required+'pt':' · 条件なし')+'</small></div>';
  }).join('')+'</div>':
 '<p class="helper">まだポイントが割り振られていません。すべての段階を自由に編集できます。</p>')+
 (check.ok?'<p class="helper">70ポイント上限とキャップストーンの制約も満たしています。</p>':
 '<p class="helper">不足数は各段階より下に割り振ったポイントで計算します。配分を変更すると自動で再判定します。</p>')+
 '</section>';
}
function summary(data,stats){
 const rows=Object.entries(stats.breakdown||{}).flatMap(([key,src])=>src.filter(x=>x.source.startsWith('タレント ·')||x.source.startsWith('タレント：')).map(x=>({key,label:C.labels[key]||key,...x})));
 const specials=data.ranks?T.defs.filter(x=>x.cap&&data.ranks[x.id]):[];
 return '<section class="card talent-summary"><div class="card-heading"><div><h2>取得済みの補正・固有効果</h2><span>取得元をステータスタブでも確認できます</span></div></div>'+
 (rows.length?'<div class="talent-summary-stats">'+rows.map(x=>'<div class="talent-summary-stat"><span>'+escape(x.label)+'</span><b>+'+escape(C.format(x.key,x.value))+'</b><small>'+escape(x.source)+'</small></div>').join('')+'</div>':'<p class="helper">ポイントを振るとステータス効果がここに表示されます。</p>')+
 (specials.length?'<div class="talent-summary-special"><strong>選択中のキャップストーン</strong>'+specials.map(x=>'<p>'+escape(x.name)+'：'+escape(x.description)+'</p>').join('')+'</div>':'')+
 '<div class="notice gentle">フレイムオーラや敵の状態が必要なタレントは条件成立時のみ計算します。スキル限定効果は一般のクールダウン短縮・クリティカル率などへ混ぜません。</div></section>';
}
function render(settings,selected,stats){
 const data=T.allocation(settings),s=data.total,ranks=data.ranks;
 const selectedDef=T.byId[selected]||T.defs[0];
 const warning=data.issues.length?'<div class="notice">保存された割り振りにランク上限超過などの不正値がありました。許容範囲に補正して計算しています。</div>':'';
 const legacy=data.legacy?'<div class="notice talent-legacy"><b>旧形式のタレント設定を検出しました</b>'+
 '<p>旧設定を維持しています。ポイント方式に切り替えると旧設定は計算対象から外れます。必要なら事前にビルドを複製するかバックアップしてください。</p>'+
 '<div class="talent-migrate-actions"><button type="button" class="btn outline" data-action="talent-new-tree">0ptから新しい配分を作る</button></div></div>':'';
 return '<main class="workspace talent-workspace"><div class="talent-top"><div><div class="eyebrow">ソーサラー · 戦闘タレント</div><h1>戦闘タレント</h1>'+
 '<p>全段階を自由に編集可能。クリックで＋1、右クリック・Shift＋クリック・「−」で返却します。ゲーム内の習得条件は下の判定欄で確認できます。</p></div>'+
 '<div class="talent-points-card"><small>残りタレントポイント</small><strong>'+data.remaining+' <span>/ '+T.MAX+'</span></strong>'+
 '<div class="talent-point-track"><i style="width:'+(100*s/T.MAX)+'%"></i></div><span>使用済み '+s+'pt / 最大70pt</span></div></div>'+
 legacy+warning+
 '<div class="talent-toolbar"><div><b>自由配分モード</b><span>70ポイント上限・同段階のキャップストーンは1つまで</span></div>'+
 '<div class="talent-toolbar-actions"><button type="button" class="btn outline" data-action="talent-reset"'+(data.legacy||s===0?' disabled':'')+'>全ポイント振り直し</button></div></div>'+
 eligibilityPanel(data)+
 '<div class="talent-layout"><section class="talent-tree-scroll" aria-label="ソーサラーの戦闘タレントツリー"><div class="talent-tree">'+
 T.ROWS.map(r=>row(r,ranks,selectedDef.id,data.legacy,data.eligibility)).join('')+
 '<div class="talent-tree-footnote">横にスクロールしてタレントを確認できます。下位段階が未達でも編集でき、ゲーム内で再現する条件は上の判定欄に表示します。</div>'+
 '</div></section><aside class="talent-side">'+detail(selectedDef,ranks,data.legacy)+
 '<div class="talent-side-help"><b>操作とルール</b>'+
 '<p>シミュレーターでは習得段階の制約を解除しています。下位ポイントを返却しても上位の習得状態は保持します。</p>'+
 '<p>70ポイント上限と同じ段階のキャップストーン1種類の制約は維持します。フレイムオーラはステータス画面で切り替えられます。</p></div></aside></div>'+
 summary(data,stats)+'<p class="talent-reference"><a href="https://wikily.gg/deskrawl/talents/sorcerer" target="_blank" rel="noopener noreferrer">ゲームデータ出典：ソーサラーの戦闘タレント（WikiLy）</a></p>'+
 '</main>';
}
window.DBPTalentUI={render,effectText,tileEffect,eligibilityPanel};
})();
