/* Combat Lab v2 — a compact, editable experimental scene.
 * Does not change equipment or master game data during comparisons.
 */
(function(){'use strict';
const Rule=window.DBPSimulationRules,Sim=window.DBPSimulationV2,Runes=window.DBPRunes;
const E=x=>String(window.DBPJP?.text(x)??x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const fmt=(x,d=2)=>typeof x==='number'&&Number.isFinite(x)?x.toLocaleString('ja-JP',{maximumFractionDigits:d}):'—';
function select(key,title,value,entries){
 return '<label class="field"><span>'+E(title)+'</span><select data-change="lab" data-key="'+E(key)+'">'+
  entries.map(([k,t])=>'<option value="'+E(k)+'"'+(String(k)===String(value)?' selected':'')+'>'+E(t)+'</option>').join('')+
  '</select></label>';
}
function numeric(key,title,value,description,placeholder){
 const lim=Rule.limits[key];
 return '<label class="field"><span>'+E(title)+'</span><input data-change="lab" data-key="'+E(key)+'" type="number" step="'+(['waveCount','enemiesPerWave','bossEvery','seed'].includes(key)?'1':'any')+
  '" min="'+lim[0]+'" max="'+lim[1]+'" value="'+E(value??'')+'" placeholder="'+E(placeholder||'任意')+'"/>'+
  (description?'<small>'+E(description)+'</small>':'')+'</label>';
}
const modes=Object.entries(Rule.kinds);
const basic=['electrocute','fireBall','iceShards','flameLightning'];
const strong=['lightningStorm','frostBeam'];
const special=['none','iceNova','flameAura','lightningCloud','fireMeteor'];
function abilitySelect(index,value){
 const ids=index===0?basic:index===1?strong:special;
 return '<label class="field"><span>'+['基本攻撃','強攻撃','特殊①','特殊②'][index]+'</span><select data-change="lab" data-key="slot'+index+'">'+
  ids.map(id=>'<option value="'+id+'"'+(id===value?' selected':'')+'>'+
   E(id==='none'?'使用しない':Rule.skills[id].name)+'</option>').join('')+'</select></label>';
}
function card(result,title){
 if(!result.ok)return '<section class="card simulation-score"><h2>'+E(title)+'</h2><p class="notice">'+E(result.reason)+'</p></section>';
 const done=result.outcome==='clear';
 const state=done?'クリア · '+fmt(result.finishTime,2)+'秒':result.outcome==='death'?
  '死亡 · '+fmt(result.deathTime,2)+'秒':result.outcome==='timeout'?'制限時間終了':'イベント上限で中断';
 const d=result.damageBySource,entries=[
  ['総ダメージ',fmt(result.totalDamage,0)],['有効ダメージ',fmt(result.appliedDamage,0)],
  ['落雷',fmt(result.stormHits,0)+'ヒット'],['雷球',fmt(result.ballPulses,0)+'パルス'],
  ['Mana残量',fmt(result.manaEnd,1)+' / '+fmt(result.manaMax,0)],
  ['撃破時回復',fmt(result.manaFromKills,1)],
  ['フレイムオーラ',result.auraCasts+'回 · 稼働率'+fmt(result.auraUptimePercent,1)+'%'],
  ['Wave完了',result.wavesCleared+' / '+result.options.waveCount],
  ['スキル使用',result.casts+'回']
 ];
 const damages=[['落雷','storm'],['落雷範囲','splash'],['雷球','ball'],['通常攻撃','basic'],['ビーム','beam'],['その他','special']];
 return '<section class="card simulation-score"><div class="card-heading"><div><h2>'+E(title)+'</h2><span>試算 · '+E(result.version)+'</span></div><span class="tag amber">未校正</span></div>'+
  '<div class="sim-result-line">'+E(state)+'</div>'+
  '<div class="sim-mini-metrics">'+entries.map(([k,v])=>'<div><small>'+E(k)+'</small><strong>'+E(v)+'</strong></div>').join('')+'</div>'+
  '<details class="engine-pending"><summary>ダメージ内訳</summary><div class="sim-damage-list">'+
  damages.map(([name,id])=>'<div><span>'+E(name)+'</span><strong>'+fmt(d[id],0)+'</strong></div>').join('')+'</div></details>'+
  '<p class="helper">対象の行動・HP・位置を仮定したモデルの結果です。ゲーム内の確定値ではありません。</p></section>';
}
function eventTable(result){
 if(!result.ok)return '';
 const sampled=result.events.slice(-55);
 const names={'spawn':'敵出現','wave-clear':'Wave撃破','cast':'スキル使用','kill':'撃破','flame-aura':'炎のオーラ発動','shoulder-stack':'元素スタック',
  'beam-tick':'Beamヒット','beam-interrupt':'Mana不足で中断','nova-recover':'Ice Nova回復','enemy-hit':'被弾'};
 return '<details class="card sim-logs"><summary>戦闘タイムライン（記録済み'+result.events.length+'件のうち直近'+sampled.length+'件）</summary>'+
  '<div class="sim-log-head"><span>時刻</span><span>事象</span><span>Mana</span><span>Wave</span></div>'+
  sampled.map(ev=>'<div class="sim-log-row"><span>'+fmt(ev.t,2)+'</span><span>'+
   E(names[ev.type]||ev.type)+(ev.id&&ev.type==='cast'?'：'+E(Rule.skills[ev.id]?.name||ev.id):'')+
   '</span><span>'+fmt(ev.mana,1)+'</span><span>'+ev.wave+'</span></div>').join('')+'</details>';
}
function alternate(state,build,mode,otherId){
 if(mode==='other'){
  const candidate=state.builds.find(b=>b.id===otherId&&b.id!==build.id)||state.builds.find(b=>b.id!==build.id);
  if(!candidate)return null;
  const s={...candidate.settings,combat:build.settings?.combat||{}};
  return {...candidate,settings:s};
 }
 if(mode==='runes'){
  const selected=Runes.selection(build.settings||{}),hasSet=selected.counts.stormcaller===6;
  const runes=hasSet?Array.from({length:6},()=> 'grand:lightningStorm'):
   Array.from({length:6},(_,i)=>'set:stormcaller:'+(i+1));
  const name=hasSet?'仮想：ライトニングストーム・グランド×6':'仮想：嵐呼び6セット';
  return {...build,name,settings:{...build.settings,runeSlots:runes}};
 }
 return null;
}
function render({state,build,compareMode='runes',compareBuildId='',trials=null,sweep=null}){
 const o=Rule.normalize(build.settings?.lab||{}).config,base=Sim.evaluate(state,build,o);
 const candidate=alternate(state,build,compareMode,compareBuildId),
  second=candidate?Sim.evaluate(state,candidate,o):null;
 const comparison=base.ok&&second?.ok&&base.outcome==='clear'&&second.outcome==='clear'
  ?second.finishTime-base.finishTime:null;
 const others=state.builds.filter(x=>x.id!==build.id);
 const count=Runes.selection(build.settings||{}).counts.stormcaller||0;
 const noHP=o.enemyHP==null;
 const actual=Rule.actualStormRotation;
 const matchesActual=o.slots.every((id,i)=>id===actual[i]);
 let html='<main class="workspace simulation-workspace">'+
  '<div class="page-heading"><div class="eyebrow">COMBAT LAB V2</div><h1>戦闘研究</h1>'+
  '<p>複数敵・Wave・自動戦闘を同じ条件で試算します。結果は検証途中のモデルであり、実戦で保証されたクリア時間ではありません。</p></div>'+
  '<div class="sim-focusbar"><span>編集中：<strong>'+E(build.name)+'</strong></span>'+
  '<span>嵐呼び '+count+'/6 · '+E(Rule.version)+'</span></div>'+
  '<section class="card simulation-config"><div class="card-heading"><div><h2>挑戦する戦闘条件</h2>'+
  '<span>敵HP・出現数・間隔はゲームで確認するか、仮定として指定してください</span></div></div>'+
  '<div class="sim-core-inputs">'+
  select('mode','戦闘形式',o.mode,modes)+
  numeric('duration','制限時間（秒）',o.duration,'予測を終了する時間','180')+
  numeric('enemyHP','通常敵のHP',o.enemyHP,'必須。実測が不明なら仮定の値を入力','例：100000000')+
  numeric('observedTime','実測クリア時間（秒）',o.observedTime,'任意。予測誤差の比較専用','例：116')+
  (o.mode==='single'?'':numeric('enemiesPerWave','1ウェーブの敵の数',o.enemiesPerWave,'3などの仮定値を指定'))+
  (o.mode==='waves'?numeric('waveCount','総ウェーブ数',o.waveCount,'ゲーム内の値を確認', '21')+
   numeric('spawnGap','撃破から次の出現まで（秒）',o.spawnGap,'ゲーム内の動画で校正','4'):'')+
  '</div>'+
  '<details class="sim-advanced"><summary>詳細な戦闘条件・ルーン発動間隔</summary><div class="sim-advanced-grid">'+
  numeric('initialDelay','最初の敵が現れるまで（秒）',o.initialDelay,'')+
  numeric('enemyDistance','プレイヤーからの敵距離',o.enemyDistance,'ゲーム内単位の仮定')+
  numeric('enemySpacing','敵同士の距離',o.enemySpacing,'位置は固定として扱う')+
  numeric('bossEvery','ボス出現の周期Wave',o.bossEvery,'0なら出現なし')+
  numeric('bossMultiplier','ボス敵HP倍率',o.bossMultiplier,'実際のボスHPを代表する仮定')+
  select('stormTargetMode','落雷対象の分配',o.stormTargetMode,[['spread','分散（順番に対象を選択）'],['focus','集中（最も近い敵）'],['random','乱数で対象を選択']])+
  numeric('stormStrikeDelay','落雷の時間差（秒）',o.stormStrikeDelay,'実測値未確認')+
  numeric('splashRadius','落雷範囲・Beamの幅',o.splashRadius,'一次元の距離で近似')+
  numeric('ballRadius','雷球の範囲',o.ballRadius,'近似値')+
  numeric('ballPulseInterval','雷球パルス間隔（秒）',o.ballPulseInterval,'最新パッチで変更済み、未校正')+
  numeric('beamTick','Beamヒット間隔（秒）',o.beamTick,'空欄＝Rune4で0.2秒、通常0.33秒')+
  numeric('actionRecovery','行動後の停止時間（秒）',o.actionRecovery,'ゲームの正確な値ではありません')+
  numeric('manaRegen','毎秒のMana回復',o.manaRegen,'空欄＝装備の計算値')+
  numeric('initialMana','開始Mana',o.initialMana,'空欄＝最大Mana')+
  numeric('enemyIncoming','敵の1回の攻撃（元値）',o.enemyIncoming,'0なら被弾なし')+
  numeric('enemyAttackEvery','敵の攻撃間隔（秒）',o.enemyAttackEvery,'位置による命中判定なし')+
  numeric('seed','乱数Seed',o.seed,'同じ条件で再現可能')+
  select('randomCrit','クリティカル判定',String(o.randomCrit),[['false','期待値'],['true','乱数1試行']])+
  '</div></details>'+
  '<div class="sim-slots"><div class="sim-slot-title">自動戦闘の4スキル枠 <small>優先順位 ④ → ③ → ② → ①</small></div>'+
  '<div class="sim-real-rotation"><span>申告された実戦構成：感電 / ライトニングストーム / アイスノヴァ / フレイムオーラ</span>'+
  (matchesActual?'<small>現在の設定に反映済み</small>':
   '<button class="btn outline" data-action="lab-apply-known-rotation">この4スキルを適用</button>')+'</div>'+
  '<div class="sim-slot-grid">'+o.slots.map((id,i)=>abilitySelect(i,id)).join('')+'</div></div>'+
  '<p class="helper">フレイムオーラは敵への直接攻撃ではなく、5秒間のクリティカル強化です（Lv10時：率+10pt、ダメージ+140%）。自動戦闘中のみ発動します。</p>'+
  '<p class="helper">変更した条件は現在のビルドに保存されます。変更前後の比較は同じ敵条件を使用します。</p></section>'+
  '<div class="sim-comparison">'+card(base,build.name)+
  '<section class="card simulation-alternative"><div class="card-heading"><div><h2>ビルド比較</h2><span>ルーンだけの仮想変更も実際の装備データを変更しません</span></div></div>'+
  '<div class="sim-compare-controls">'+select('compareMode','比較方法',compareMode,
   [['runes','嵐6セットとレジェンダリールーンの仮想比較'],['other','保存済みの別ビルドと比較']])+
   (compareMode==='other'?
    '<label class="field"><span>比較ビルド</span><select id="simCompareBuild">'+
     (others.length?others.map(x=>'<option value="'+E(x.id)+'"'+(candidate?.id===x.id?' selected':'')+'>'+E(x.name)+'</option>').join(''):'<option>別ビルドなし</option>')+
     '</select></label>':'')+'</div>'+
  (candidate?card(second,candidate.name):'<p class="notice">別のビルドがありません。複製して比較してください。</p>')+
  (comparison!=null?'<p class="sim-delta">推定クリアタイム差（比較候補 − 現在）：'+
   (comparison>0?'+':'')+fmt(comparison,2)+'秒'+
   (comparison<0?' · 候補の方が速い':comparison>0?' · 現在の方が速い':' · 同じ時間')+'</p>':
   '<p class="helper">両構成が制限時間内にクリアした場合のみ、タイム差を評価します。未クリアなら強さの順位は断定しません。</p>')+
   '<p class="helper">※ルーン仮想比較は6枠すべてを置換した極端な試験条件です。実際の最適装備を推奨する結果ではありません。</p></section></div>'+
  (o.observedTime!==null&&base.ok?'<section class="card sim-calibration"><h2>実測との照合</h2>'+
   (base.outcome==='clear'?'<p>実測 '+fmt(o.observedTime,2)+'秒 ／ 予測 '+fmt(base.finishTime,2)+'秒 ／ 絶対誤差 '+fmt(Math.abs(base.finishTime-o.observedTime),2)+'秒</p>':
    '<p>モデルは時間内にクリアしていません。実測に対する時間誤差を算出できません。</p>')+
   '<p class="helper">実測に合わせて係数を自動調整していません。別の実戦データで再検証してください。</p></section>':'')+
  '<section class="card sim-trials"><div class="card-heading"><div><h2>クリティカル変動の確認</h2><span>固定Seedの5試行 · 敵AIなどは未サンプリング</span></div>'+
  '<button class="btn outline" data-action="lab-run-trials" '+(noHP?'disabled':'')+'>5回試行</button></div>'+
  (trials?.ok?'<p>クリア率 '+fmt(trials.clearRate*100,0)+'% · 中央値 '+fmt(trials.median,2)+
   '秒 · 最短 '+fmt(trials.fastest,2)+'秒 · 最長 '+fmt(trials.slowest,2)+'秒</p>':
   '<p class="helper">必要なときに実行します。5回の試行だけで統計的な有意差は断定できません。</p>')+'</section>'+
  '<section class="card sim-sweep"><div class="card-heading"><div><h2>難易度による優劣の変化</h2><span>通常敵HPを0.25・0.5・1・2・4倍に変更した同条件比較</span></div>'+
   '<button class="btn outline" data-action="lab-run-sweep" '+(noHP||!candidate?'disabled':'')+'>HP別に比較</button></div>'+
   (sweep?.ok?'<div class="sim-sweep-scroll"><table class="sim-sweep-table"><thead><tr><th>HP倍率</th><th>現在</th><th>比較候補</th><th>判定</th></tr></thead><tbody>'+
     sweep.rows.map(x=>'<tr><td>'+fmt(x.factor,2)+'倍</td><td>'+fmt(x.baselineTime,2)+'</td><td>'+fmt(x.candidateTime,2)+'</td><td>'+E(x.status)+'</td></tr>').join('')+
     '</tbody></table></div><p class="helper">'+E(sweep.notice)+'</p>':
     '<p class="helper">計算結果から候補のHP境界を探すための実験です。現在の敵のHPを入力すると実行できます。</p>')+
   '</section>'+
  (base.ok?eventTable(base):'');
 html+='<details class="card sim-coverage"><summary>計算の信頼性・未対応ルール</summary>'+
  '<p class="helper">未対応の効果を「0である」と断定しません。精度を保証しない理由を表示します。</p>'+
  (base.ok?[
   ['実装しているモデル',base.modelCoverage.represented],
   ['仮定を置いているモデル',base.modelCoverage.approximate],
   ['未対応のモデル',base.modelCoverage.notModeled],
   ['入力・出典の注意',base.warnings]
  ].map(([label,list])=>'<h3>'+E(label)+'</h3><ul>'+list.map(x=>'<li>'+E(x)+'</li>').join('')+'</ul>').join(''):
  '<p class="helper">'+E(base.reason)+'</p>')+
  '<p class="helper">ルール更新：'+E(Rule.version)+'。ゲームの実際のデータと異なる場合は設定値を修正して検証してください。</p></details>'+
  '<div class="notice gentle">これはゲーム内の実測値や公式ランキングへの自動送信ではありません。現在のビルド・戦闘条件を変えずに検証するための研究ツールです。</div></main>';
 return html;
}
window.DBPSimulationLabUI={render,alternate,card,eventTable};
})();