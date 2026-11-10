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
function node(def,ranks,selected,canUse){
 const n=ranks[def.id]||0;
 const ready=canUse&&(n>0||T.lowerSpent(ranks,def.row)>=def.row);
 const add=T.canAdd(ranks,def.id),remove=T.canRemove(ranks,def.id);
 const title=escape(def.name+'\n'+def.description+'\n現在 '+n+'/'+def.max);
 return '<div class="talent-node '+color[def.element]+(def.cap?' talent-capstone':'')+(n?' picked':'')+(!ready?' locked':'')+(selected===def.id?' focused':'')+'">'+
 '<button type="button" class="talent-tile" data-action="talent-add" data-value="'+def.id+'" title="'+title+'" aria-label="'+escape(def.name+' '+n+'/'+def.max+'。クリックで習得、右クリックで返却。')+'">'+
 '<span class="talent-symbol">'+symbol[def.element]+'</span><span class="talent-name">'+escape(def.name)+'</span><span class="talent-rank">'+n+' / '+def.max+'</span>'+
 '<span class="talent-gauge"><i style="width:'+(100*n/def.max)+'%"></i></span>'+
 (def.cap?'<span class="talent-cap-mark">キャップストーン '+['','Ⅰ','Ⅱ','Ⅲ'][def.cap]+'</span>':'')+
 (n===0&&!ready?'<span class="talent-locked-mark">🔒</span>':'')+'</button>'+
 '<div class="talent-node-actions">'+
 '<button type="button" data-action="talent-remove" data-value="'+def.id+'"'+(n&&!remove.ok?' disabled title="'+escape(remove.why)+'"':n?'':' disabled')+' aria-label="'+escape(def.name+'を1ポイント返却')+'">−</button>'+
 '<span>'+(n?effectText(def,n).slice(0,24):'クリックで習得')+'</span>'+
 '<button type="button" data-action="talent-add" data-value="'+def.id+'"'+(!add.ok?' disabled title="'+escape(add.why)+'"':'')+' aria-label="'+escape(def.name+'に1ポイント追加')+'">+</button></div>'+
 '</div>';
}
function row(r,ranks,selected,legacy){
 const options=T.defs.filter(x=>x.row===r);
 const lower=T.lowerSpent(ranks,r),open=lower>=r,needed=Math.max(0,r-lower);
 const cap=options.some(x=>x.cap);
 return '<section class="talent-tier'+(open&&!legacy?' is-open':' is-locked')+'" data-tier="'+r+'">'+
 '<header><div class="talent-tier-heading"><b>'+r+'pt</b><span>'+ (cap?'キャップストーン '+(r===10?'Ⅰ':r===30?'Ⅱ':'Ⅲ'):'習得段階')+'</span></div>'+
 '<small>'+(legacy?'切替前':open?'解放済み':'下位であと'+needed+'pt必要')+'</small></header>'+
 '<div class="talent-tier-items'+(cap?' is-cap':'')+'">'+options.map(x=>node(x,ranks,selected,!legacy)).join('')+'</div></section>';
}
function detail(def,ranks,legacy,chosen){
 if(!def)return '<div class="talent-detail-empty">タレントを選択してください。</div>';
 const n=ranks[def.id]||0,add=T.canAdd(ranks,def.id),refund=T.canRemove(ranks,def.id);
 const current=n?effectText(def,n):'習得していません';
 const next=n<def.max?effectText(def,n+1):'最大ランク';
 const capChoice=def.cap?T.defs.find(x=>x.cap===def.cap&&x.id!==def.id&&ranks[x.id]):null;
 return '<div class="talent-detail-panel">'+
 '<div class="talent-detail-identity '+def.element+'"><div class="talent-detail-symbol">'+symbol[def.element]+'</div>'+
 '<div><span class="eyebrow">ソーサラー · '+(def.cap?'キャップストーン '+def.cap:'習得段階 '+def.row+'pt')+'</span><h2>'+escape(def.name)+'</h2>'+
 '<span class="talent-detail-rank">'+n+' / '+def.max+'</span></div></div>'+
 '<p class="talent-description">'+escape(def.description)+'</p>'+
 '<div class="talent-detail-stat"><small>現在の効果</small><strong>'+escape(current)+'</strong></div>'+
 '<div class="talent-detail-stat"><small>次のランク</small><strong>'+escape(next)+'</strong></div>'+
 '<div class="talent-detail-buttons"><button type="button" class="btn" data-action="talent-add" data-value="'+def.id+'"'+(legacy||!add.ok?' disabled title="'+escape(add.why||'ツリーへ切り替えてください')+'"':'')+'>'+
 (capChoice?'キャップストーンを付け替える':'＋ 1ポイント習得')+'</button>'+
 '<button type="button" class="btn outline" data-action="talent-remove" data-value="'+def.id+'"'+(legacy||!refund.ok?' disabled title="'+escape(refund.why||'ツリーへ切り替えてください')+'"':'')+'>− 1ポイント返却</button></div>'+
 (capChoice&&add.ok?'<p class="talent-cost-line">付け替え費用（ゲーム内）：'+number(add.cost)+' ゴールド</p>':'')+
 (n&&refund.ok?'<p class="talent-cost-line">1pt返却費用（ゲーム内）：'+number(refund.cost)+' ゴールド</p>':'')+
 (n&&!refund.ok?'<p class="talent-lock-message">'+escape(refund.why)+'</p>':'')+
 '</div>';
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
 const warning=data.issues.length?'<div class="notice">保存値に不正・未解放の割り振りがあります。安全のため有効ポイントだけを計算しています。必要ならリセットしてください。</div>':'';
 const legacy=data.legacy?'<div class="notice talent-legacy"><b>旧形式のタレント設定を検出しました</b><p>旧設定の効果は維持しています。新しいゲーム式ツリーへ切り替える際は、現在のビルドを複製するかJSONバックアップを作成してください。切り替え前は新しいポイントを振りません。</p>'+
 '<div class="talent-migrate-actions"><button type="button" class="btn" data-action="talent-history-preset">会話履歴の70pt配分を読み込む</button>'+
 '<button type="button" class="btn outline" data-action="talent-new-tree">0ptから作り直す</button></div>'+
 '<small>履歴案は仮登録です。現在のゲーム画面の割り振りを確認して修正してください。</small></div>':'';
 return '<main class="workspace talent-workspace"><div class="talent-top"><div><div class="eyebrow">ソーサラー · 戦闘タレント</div><h1>戦闘タレント</h1><p>タレントをクリックで+1ランク／右クリックまたは「−」で1ポイント返却。上位段階は下位ポイントで解放。</p></div>'+
 '<div class="talent-points-card"><small>残りタレントポイント</small><strong>'+data.remaining+' <span>/ '+T.MAX+'</span></strong>'+
 '<div class="talent-point-track"><i style="width:'+(100*s/T.MAX)+'%"></i></div><span>使用済み '+s+'pt / 最大70pt</span></div></div>'+
 legacy+warning+
 '<div class="talent-toolbar"><div><b>ゲーム内ゴールド（参考）</b><span>1pt返却 '+number(T.refundCost(s))+' G ・ 全振り直し '+number(T.resetCost(s))+' G</span></div>'+
 '<label class="talent-aura-label"><input type="checkbox" data-change="aura"'+(settings.aura?' checked':'')+'> フレイムオーラ</label>'+
 '<div class="talent-toolbar-actions"><button type="button" class="btn outline" data-action="talent-history-preset">履歴の70pt案</button><button type="button" class="btn outline" data-action="talent-reset"'+(data.legacy||s===0?' disabled':'')+'>全ポイント振り直し</button></div></div>'+
 '<div class="talent-layout"><section class="talent-tree-scroll" aria-label="ソーサラーの戦闘タレントツリー"><div class="talent-tree">'+
 T.ROWS.map(r=>row(r,ranks,selectedDef.id,data.legacy)).join('')+
 '<div class="talent-tree-footnote">横にスクロールしてタレントを確認できます。キャップストーンは同じ段階で1つだけ習得できます。</div>'+
 '</div></section><aside class="talent-side">'+detail(selectedDef,ranks,data.legacy)+
 '<div class="talent-side-help"><b>操作とルール</b><p>クリックで習得、右クリック・Shift+クリック・−で返却。上位段階の成立条件を崩す返却は拒否されます。キャップストーンの付け替えは残ptを消費しません。</p><p>必要ゴールドは表示のみです。ゲーム内の所持ゴールドを変更しません。</p></div></aside></div>'+
 summary(data,stats)+'<p class="talent-reference"><a href="https://wikily.gg/deskrawl/talents/sorcerer" target="_blank" rel="noopener noreferrer">ゲームデータ出典：ソーサラーの戦闘タレント（WikiLy）</a></p>'+
 '</main>';
}
window.DBPTalentUI={render,effectText};
})();