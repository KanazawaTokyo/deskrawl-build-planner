/* UI for the event-driven experiment; source data is read-only.
 * Settings edits are coordinated by app.js. */
(function(){'use strict';
const Engine=window.DBPCombatEngine;
const safe=v=>String(window.DBPJP?.text(v)??v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=2)=>Number.isFinite(n)?Number(n).toLocaleString('ja-JP',{maximumFractionDigits:d}):'—';
const number=(id,label,value,note,placeholder='自動')=>{
 const [min,max]=Engine.numeric[id];
 return '<label class="field"><span>'+safe(label)+'</span><input type="number" inputmode="decimal" data-change="engine" data-key="'+id+
  '" min="'+min+'" max="'+max+'" step="'+(['stormHits','seed'].includes(id)?'1':'any')+'" value="'+safe(value??'')+'" placeholder="'+safe(placeholder)+'">'+
 (note?'<small>'+safe(note)+'</small>':'')+'</label>';
};
const select=(id,label,value,vals)=>'<label class="field"><span>'+safe(label)+'</span><select data-change="engine" data-key="'+id+'">'+
 vals.map(([key,l])=>'<option value="'+safe(key)+'"'+(value===key?' selected':'')+'>'+safe(l)+'</option>').join('')+'</select></label>';
function eventName(x){
 return {'storm':'Storm 命中','beam-start':'Beam 開始','beam-tick':'Beam ヒット','beam-end':'Beam 終了',
  'beam-interrupt':'Beam 中断','ice-nova':'Ice Nova 回復','mana-shortage':'Mana 不足','enemy-hit':'敵からの被弾',
  'burst-buff':'属性バフ付与','buff-expire':'属性バフ終了',end:'終了'}[x.type]||x.type;
}
function timeline(r){
 const ss=r.events.filter(x=>x.type==='storm'||x.type==='beam-tick'||x.type==='beam-start'||
  x.type==='beam-interrupt'||x.type==='ice-nova'||x.type==='enemy-hit'||x.type==='end');
 return '<section class="card engine-timeline"><div class="card-heading"><div><h2>イベント履歴</h2>'+
  '<span>ゲーム内ログではなくシミュレーション上の出来事。直近35件を表示</span></div></div>'+
  '<div class="engine-event-head"><span>時刻</span><span>イベント</span><span>Mana</span><span>ダメージ</span></div>'+
  ss.slice(-35).map(x=>'<div class="engine-event-row"><span>'+fmt(x.t,3)+'秒</span><span>'+safe(eventName(x))+
   (x.percent!==undefined?' ('+fmt(x.percent,0)+'%)':'')+'</span><span>'+fmt(x.mana,1)+'</span><span>'+
   (x.damage!==undefined?fmt(x.damage,0):'—')+'</span></div>').join('')+
  '</section>';
}
function summary(result,title){
 if(!result?.ok){
  return '<section class="card engine-result"><h2>'+safe(title)+'</h2><p class="notice">'+safe(result?.reason||'計算できません')+'</p></section>';
 }
 const r=result,kill=r.killTime!==null,dead=r.deathTime!==null;
 const out=kill?'敵を討伐 · '+fmt(r.killTime,3)+'秒':dead?'死亡 · '+fmt(r.deathTime,3)+'秒':
  r.enemyMaxHP!==null?'制限時間内に討伐できず':'HP未設定（時間窓の火力評価）';
 const critical=[
  ['結果',out,'敵HP未入力の場合は討伐時間を計算しません'],
  ['総与ダメージ',fmt(r.damage,0),'オーバーキル分を含む'],
  ['時間窓DPS',fmt(r.activeDps,0),fmt(r.duration,2)+'秒あたりの平均'],
  ['Mana残量',fmt(r.endMana,1)+' / '+fmt(r.maxMana,1),'自然回復を含む'],
  ['スキル使用回数',fmt(r.casts,0),r.options.skill==='frostBeam'?
     'Beam '+r.channels+'回 · tick '+r.frostTicks+'回 · 中断 '+r.cutChannels+'回':'Storm 命中数 '+r.stormHits+'回'],
  ['Ice Nova',fmt(r.novaCasts,0)+'回','攻撃間隔への影響は仮定'],
 ];
 return '<section class="card engine-result"><div class="card-heading"><div><h2>'+safe(title)+'</h2>'+
  '<span>'+safe(r.version)+' · '+(r.mode==='expected'?'期待値':'乱数1試行')+'</span></div>'+
  '<span class="tag amber">推定値・未校正</span></div>'+
  '<div class="engine-results-grid">'+critical.map(([l,val,note])=>
  '<div class="engine-metric"><small>'+safe(l)+'</small><strong>'+safe(val)+'</strong><span>'+safe(note)+'</span></div>').join('')+'</div>'+
  (r.enemyMaxHP!==null?'<p class="engine-meta">敵HP '+fmt(r.enemyMaxHP,0)+' · 残りHP '+fmt(r.enemyHP,0)+
  ' · 実際に与えた範囲内ダメージ '+fmt(r.appliedDamage,0)+'</p>':'')+
  (r.startHP!==null&&r.options.incomingHit!==null?'<p class="engine-meta">プレイヤーHP '+fmt(r.playerHP,0)+' / '+fmt(r.startHP,0)+
  ' · 被弾回数 '+r.incomingHits+'回 · 被ダメージ '+fmt(r.takenDamage,0)+'</p>':'')+
  '<p class="helper">Absolute Zero: '+r.runes.absoluteZero+'/6 · Beamヒット間隔 '+fmt(r.runes.beamTick,3)+
  '秒 · Rimebound Grasp '+(r.equipment.rime?'装備中':'なし')+
  ' · Mana再生 '+fmt(r.manaRegen,2)+'/秒</p>'+
  (r.statsPending.length?'<details class="engine-pending"><summary>未確認の登録項目：'+r.statsPending.length+'件</summary>'+
   '<ul>'+r.statsPending.slice(0,30).map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul></details>':'')+
  '<details class="engine-pending"><summary>計算上の仮定・未対応効果：'+r.assumptions.length+'件</summary>'+
   '<ul>'+r.assumptions.map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul></details></section>';
}
function render({state,build,compareId}){
 const o=Engine.options(build.settings?.engine||{}).config;
 const base=Engine.evaluate(state,build,o);
 const others=state.builds.filter(x=>x.id!==build.id);
 const compared=others.find(x=>x.id===compareId)||others[0]||null;
 // Fix combat scenario of both builds to current build's combat toggles for a fair comparison.
 const candidate=compared?{...compared,settings:{...compared.settings,combat:build.settings?.combat||{}}}:null;
 const second=candidate?Engine.evaluate(state,candidate,o):null;
 const opts=x=>'<option value="'+safe(x.id)+'"'+(x.id===compared?.id?' selected':'')+'>'+safe(x.name)+'</option>';
 return '<main class="workspace engine-workspace"><div class="page-heading"><div class="eyebrow">COMBAT LAB v1</div>'+
  '<h1>戦闘シミュレーション</h1><p>ダメージを時系列で積算してMana、CD、チャネリング、敵HPを検証します。ゲーム実測値ではなく仮定に基づく予測です。</p></div>'+
  '<section class="card engine-config"><div class="card-heading"><div><h2>共通の戦闘条件</h2>'+
  '<span>比較するビルドに同一の敵・スキル・時間条件を適用。現在の戦闘タブのデバフ条件を参照</span></div></div>'+
  '<div class="engine-fields">'+
  select('skill','使用スキル',o.skill,[['lightningStorm','ライトニングストーム'],['frostBeam','フロストビーム']])+
  select('mode','確率の扱い',o.mode,[['expected','期待値（再現性重視）'],['sampled','乱数1試行（Seed固定）']])+
  number('duration','制限時間（秒）',o.duration,'5〜120秒。討伐した場合は途中で終了','30')+
  number('enemyHp','仮想敵の最大HP',o.enemyHp,'空欄なら討伐時間を算出しません。架空のHPを確定値として扱わない','未入力')+
  number('initialMana','開始Mana',o.initialMana,'空欄は装備から計算した最大Mana','最大値')+
  number('manaRegen','Mana自然回復（毎秒）',o.manaRegen,'空欄は登録済み能力値を使います','登録値')+
  (o.skill==='lightningStorm'?
   number('stormInterval','Storm使用間隔（秒）',o.stormInterval,'ゲームの攻撃速度から自動換算はしません。実測で調整','1')+
   number('stormHits','Stormの単体命中数',o.stormHits,'3発のうち同じ敵に命中する本数。標準1本','1'):
   number('frostTick','Beamヒット間隔（秒）',o.frostTick,'空欄は通常0.33秒 / Absolute Zero4セット0.20秒','自動')+
   number('frostCooldown','Beamクールダウン（秒）',o.frostCooldown,'空欄は3.25秒×(1−CDR)。開始時点からカウントする仮定','自動'))+
  number('novaCooldown','Ice Nova CD（秒）',o.novaCooldown,'空欄は22秒×(1−CDR)','自動')+
  '<label class="engine-check"><input data-change="engine" data-key="autoNova" type="checkbox"'+(o.autoNova?' checked':'')+'><span>Ice NovaでMana回復を試行する<small>氷結の貯蓄に依存。発動タイミングと行動遅延は仮定</small></span></label>'+
  number('incomingHit','敵の1撃の元ダメージ',o.incomingHit,'空欄なら敵攻撃なし。下の間隔も入力','なし')+
  number('incomingEvery','敵の攻撃間隔（秒）',o.incomingEvery,'被弾量とセットで入力','なし')+
  select('incomingType','被ダメージ属性',o.incomingType,[['physical','物理'],['fire','炎'],['cold','冷気'],['lightning','雷'],['poison','毒'],['arcane','秘術']])+
  (o.mode==='sampled'?number('seed','乱数シード',o.seed,'同じSeedで同じ試行を再現','42'):'')+
  '</div><p class="helper">この画面の条件変更は現在のビルドに保存します。登録済み装備は変更しません。</p></section>'+
  '<div class="engine-comparison">'+summary(base,build.name)+
  (second?summary(second,compared.name):'')+'</div>'+
  (compared?'<section class="card engine-diff"><div class="card-heading"><div><h2>別ビルドと比較</h2>'+
    '<span>敵のHP・スキル・時間・デバフ条件を共通化。装備とタレントは各ビルド固有</span></div></div>'+
    '<label class="field"><span>比較対象ビルド</span><select id="engineCompareBuild">'+others.map(opts).join('')+'</select></label>'+
    (base.ok&&second?.ok?'<p class="engine-diff-value">総与ダメージ差（比較相手 − 現在）：'+
      safe(fmt(second.damage-base.damage,0))+' · '+safe(fmt(base.damage>0?(second.damage/base.damage-1)*100:0,2))+'%</p>'+
      '<p class="helper">異なるスキルの得意条件や討伐時間は、敵HPと行動を登録した上で比較してください。計算誤差はあります。</p>':'')+
    '</section>':'<section class="notice">独立した2つ目のビルドを作ると、同条件の比較もできます。</section>')+
  (base.ok?timeline(base):'')+
  '<div class="notice gentle">未対応：実際の攻撃AI、ペットの攻撃、Rune追撃、DoT、命中率、ライフ回復など。未対応効果を0と確定せず、比較対象として未校正と表示します。</div></main>';
}
window.DBPCombatEngineUI={render,summary,timeline};
})();