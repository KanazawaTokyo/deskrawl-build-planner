/* UI for the first sustained-DPS estimate. All persistent input is managed
 * by app.js so this module cannot alter a build. */
(function(){'use strict';
const S=window.DBPDpsSim;
const safe=v=>String(window.DBPJP?.text(v)??v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number.isFinite(n)?Number(n).toLocaleString('ja-JP',{maximumFractionDigits:2}):'—';
const fixed=n=>Number.isFinite(n)?Number(n).toLocaleString('ja-JP',{maximumFractionDigits:3}):'—';
function numberField(k,label,value,step,min,max,note,placeholder='自動'){
 return '<label class="field"><span>'+safe(label)+'</span><input data-change="dps" data-key="'+k+'" type="number" inputmode="decimal" step="'+step+'" min="'+min+'" max="'+max+'" value="'+(value===null||value===undefined?'':safe(value))+'" placeholder="'+safe(placeholder)+'" />'+
 (note?'<small>'+safe(note)+'</small>':'')+'</label>';
}
function chart(result){
 const ss=result.samples,max=result.maxMana,width=720,height=175;
 const point=p=>[(45+(p.t/result.duration)*(width-61)).toFixed(2),(14+(1-p.mana/max)*116).toFixed(2)];
 const path=ss.map((s,i)=>(i?'L':'M')+point(s).join(' ')).join(' ');
 const tickYs=[max,max/2,0].map((v,i)=>({value:v,y:14+i*58}));
 const xTicks=[0,result.duration/2,result.duration];
 return '<div class="dps-graph"><svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Mana残量の時間推移" preserveAspectRatio="xMidYMid meet">'+
 tickYs.map(t=>'<line x1="45" x2="'+(width-16)+'" y1="'+t.y+'" y2="'+t.y+'" stroke="currentColor" stroke-opacity=".16" stroke-dasharray="3 4"/>'+
 '<text x="39" y="'+(t.y+4)+'" text-anchor="end" font-size="11" fill="currentColor" opacity=".7">'+number(t.value)+'</text>').join('')+
 xTicks.map(t=>'<text x="'+(45+t/result.duration*(width-61))+'" y="158" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">'+number(t)+'秒</text>').join('')+
 '<path d="'+path+'" fill="none" stroke="#6dd6b7" stroke-width="2.7" stroke-linejoin="round" stroke-linecap="round" />'+
 '</svg></div>';
}
function render(stats,settings={},context={}){
 const r=S.simulate(stats,settings,context),cfg=S.config(settings.dps);
 const rank=S.talentRank(settings);
 const baseRegen=Math.max(0,Number(stats?.effective?.manaRegen)||0);
 const maxMana=Number(stats?.effective?.mana)||0,baseCd=22*(1-Math.min(80,Math.max(0,Number(stats?.effective?.cdr)||0))/100);
 return '<section class="combat-section dps-section">'+
 '<div class="section-label"><span>02 / 持続DPSシミュレーション</span><span class="muted small">Stormcaller v0.1</span></div>'+
 '<section class="card dps-card"><div class="card-heading"><div><h2>Mana・発動回数シミュレーター</h2>'+
 '<span>ライトニングストーム専用。今の装備・スキル条件を使用</span></div><span class="tag amber">推定モデル</span></div>'+
 '<div class="dps-duration"><span>計算時間</span><div class="segmented">'+[15,30,60].map(n=>'<button data-action="dps-duration" data-value="'+n+'" class="'+(cfg.duration===n?'active':'')+'">'+n+'秒</button>').join('')+'</div></div>'+
 '<div class="dps-fields">'+
 numberField('attackInterval','攻撃間隔（秒）',cfg.attackInterval,'0.05',0.2,5,'実測値で調整してください。ゲームのGCDは未校正です。')+
 numberField('manaRegen','マナ自然回復（毎秒）',cfg.manaRegen,'0.1',0,200,'空欄なら登録ステータスを使用：'+fixed(baseRegen)+' / 秒')+
 numberField('initialMana','戦闘開始時のMana',cfg.initialMana,'1',0,100000,'空欄は最大Mana：'+fixed(maxMana))+
 numberField('novaCooldown','Ice Nova CD（秒）',cfg.novaCooldown,'0.1',0.2,60,'空欄は22秒×(1−CDR)：'+fixed(baseCd)+'秒')+
 '<label class="field"><span>Storm 1回の命中数</span><select data-change="dps" data-key="hitsPerCast">'+
 [1,2,3].map(i=>'<option value="'+i+'"'+(i===cfg.hitsPerCast?' selected':'')+'>'+i+'ヒット</option>').join('')+'</select>'+
 '<small>雷3発の命中先は未検証。初期値は1ヒットとして保守的に計算</small></label>'+
 '<label class="dps-check"><input data-change="dps" data-key="autoNova" type="checkbox"'+(cfg.autoNova?' checked':'')+' /><span><b>Ice NovaでMana回復</b><small>氷結の貯蓄 '+rank+'/8。使用時は攻撃1枠を消費する仮定</small></span></label>'+
 '</div>'+
 (r.ok?
 '<div class="dps-summary">'+
 [['選択時間の総ダメージ',number(r.totalDamage),'選択時間 '+r.duration+'秒の推定値'],
  ['平均DPS',number(r.averageDps),'対象1ヒットの期待値を使用'],
  ['Storm詠唱回数',number(r.stormCasts),'ヒット合計 '+r.hitCount+'回'],
  ['Mana不足時間',fixed(r.starvedSeconds)+'秒','攻撃できなかった枠の時間']].map(([label,value,description])=>
  '<div class="dps-stat"><small>'+safe(label)+'</small><strong>'+safe(value)+'</strong><span>'+safe(description)+'</span></div>').join('')+
 '</div>'+
 '<div class="dps-details">'+
 [['最大Mana',fixed(r.maxMana)],['Storm実消費',fixed(r.manaCost)+' / 回'],['MCR',fixed(r.mcr)+'%'],
  ['Ice Nova回復',r.novaRank?fixed(r.novaRecovery)+' × '+fixed(r.novaProcChance*100)+'%':'タレント未習得'],
  ['Ice Nova実行',r.novaCasts+'回'],['Ice Nova CD',fixed(r.novaCooldown)+'秒'],
  ['開始 → 終了Mana',fixed(r.initialMana)+' → '+fixed(r.endMana)]].map(([label,value])=>
  '<div><span>'+safe(label)+'</span><b>'+safe(value)+'</b></div>').join('')+'</div>'+
 '<div class="dps-chart-title">Mana残量の時間推移 <small>回復を上向き、攻撃消費を下向きで表示</small></div>'+
 chart(r):
 '<div class="notice">'+safe(r.reason)+'</div>')+
 '<details class="dps-caveats"><summary>計算の仮定・含まないダメージを確認</summary>'+
 '<p>このモデルでは、設定した攻撃間隔ごとに1回行動できると仮定し、Ice Novaが利用可能なときは期待回復量の半分以上が不足すると自動使用します。単発の期待ダメージを命中数×発動回数で累計します。</p>'+
 '<p>自然回復が未登録の場合、0/秒で計算します。Ice Novaの基本CDは22秒、Stormの基本消費は50Mana。氷結の貯蓄8/8の回復は130Manaとして扱います。</p>'+
 '<p>他のスキル・基本攻撃のMana獲得・攻撃モーション・移動・ペット発動・Rune追撃・DoT・状態異常の時間変化・複数敵のヒット分布は再現していません。「実測DPS」ではなく、入力条件下の試算です。</p>'+
 '<p><a href="https://wikily.gg/deskrawl/abilities/lightning-storm/" target="_blank" rel="noopener noreferrer">Lightning Storm 出典</a> · <a href="https://wikily.gg/deskrawl/abilities/ice-nova" target="_blank" rel="noopener noreferrer">Ice Nova 出典</a></p>'+
 '</details></section></section>';
}
window.DBPDpsUI={render,chart};
})();
