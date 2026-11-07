(function(){'use strict';
const C=window.DBPCalc,B=window.DBPCombat;
const format=(n,d=1)=>Number.isFinite(n)?Number(n).toLocaleString('ja-JP',{maximumFractionDigits:d,minimumFractionDigits:0}):'—';
const pct=(n,d=1)=>format(n,d)+'%';
const num=(n,d=0)=>format(n,d);
const fx=n=>'×'+format(n,3);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function select(key,label,selected,values){
 return '<label class="field"><span>'+safe(label)+'</span><select data-change="combat" data-key="'+key+'">'+
 values.map(([value,name])=>'<option value="'+safe(value)+'"'+(String(selected)===String(value)?' selected':'')+'>'+safe(name)+'</option>').join('')+'</select></label>';
}
function number(key,label,value,note){
 const min=B.ranges[key]?.[0]??0,max=B.ranges[key]?.[1]??999999;
 return '<label class="field"><span>'+safe(label)+'</span><input type="number" inputmode="decimal" step="any" min="'+min+'" max="'+max+'" value="'+safe(value)+'" data-change="combat" data-key="'+key+'">'+
 (note?'<small>'+safe(note)+'</small>':'')+'</label>';
}
function check(key,label,value,disabled=false){
 return '<label class="combat-check'+(disabled?' combat-forced':'')+'"><input type="checkbox" data-change="combat" data-key="'+key+'"'+(value?' checked':'')+(disabled?' disabled':'')+'><span>'+safe(label)+'</span></label>';
}
function metric(label,value,desc){
 return '<div class="combat-metric"><small>'+safe(label)+'</small><strong>'+safe(value)+'</strong><span>'+safe(desc)+'</span></div>';
}
function bar(percent){
 return '<div class="combat-bar" aria-hidden="true"><i style="width:'+Math.max(0,Math.min(100,percent))+'%"></i></div>';
}
function attackTable(a,stats){
 const name={ability:'skillPercent',primary:'int',element:B.types[a.settings.damageType][1],critical:'critDamage',conditional:'conditional',attack:B.attacks[a.settings.attackType][1],vulnerable:'vulnerable'};
 const rows=a.layers.map(l=>{
  const keys=l.key==='element'?[B.types[a.settings.damageType][1],'allDamage']:l.key==='critical'?['critChance','critDamage',...(a.settings.attackType==='basic'?['basicCritChance']:[]),...(a.settings.damageType==='lightning'&&a.settings.lightningAbility?['lightningAbilityCritDamage']:[]),...(a.settings.frozen?['frozenCritChance','frozenCritDamage']:[])]:l.key==='primary'?['int']:l.key==='conditional'?a.conditions.filter(x=>x.active&&x.value).map(x=>x.key):l.key==='attack'?[B.attacks[a.settings.attackType][1]]:[];
  const notes=keys.flatMap(key=>(stats.breakdown[key]||[]).map(x=>'<div class="combat-source"><span>'+safe(x.source)+'</span><b>+'+safe(C.format(key,x.value))+'</b></div>'));
  return '<div class="combat-layer">'+
    '<div class="combat-layer-top"><strong>'+safe(l.label)+'</strong><span class="combat-layer-values"><b>'+fx(l.factor)+'</b><em>'+(l.value>=0?'+':'')+pct(l.value)+'</em></span></div>'+
    bar(l.share)+'<div class="combat-layer-sub"><span>増幅への寄与（対数分解）</span><b>'+pct(l.share)+'</b></div>'+
    (notes.length?'<details class="combat-layer-details"><summary>計上元 '+notes.length+'件</summary>'+notes.join('')+'</details>':'')+
  '</div>';
 }).join('');
 return '<div class="combat-layer-list">'+rows+'</div>';
}
function conditionTable(a){
 const relevant=a.conditions.filter(x=>x.stored>0||x.active);
 if(!relevant.length)return '<p class="helper">現在、条件付きダメージの対象項目は未登録です。</p>';
 return '<div class="combat-conditions">'+relevant.map(x=>'<div class="combat-condition '+(x.active?'on':'off')+'"><span>'+safe(x.label)+(x.active?' · 成立'+(x.reason?'（'+safe(x.reason)+'）':''):' · 不成立')+'</span><b>+'+pct(x.value)+'</b></div>').join('')+'</div>';
}
function trace(a){
 if(!a.normal)return '<div class="notice">武器ダメージを登録すると通常ヒット・クリティカル・期待値を計算できます。倍率の内訳は引き続き確認できます。</div>';
 const rows=[
 ['武器ダメージ ＋ 固定ダメージ',a.weaponDamage+' ＋ '+a.flatDamage,a.weaponDamage+a.flatDamage],
 ['スキル係数 ＋ スキル固定ダメージ',fx(a.skillMult)+' ＋ '+a.settings.skillFlat,Math.floor((a.weaponDamage+a.flatDamage)*a.skillMult+a.settings.skillFlat)],
 ['知力補正',fx(a.primaryMult),a.normal.start],
 ['属性補正',fx(a.elemMult),a.normal.elementStage],
 ['クリティカル（通常ヒット）','×1',a.normal.criticalStage],
 ['条件付きダメージ',fx(a.condMult),a.normal.vsStage],
 ['攻撃種別',fx(a.attackMult),a.normal.attackStage],
 ['脆弱状態',fx(a.vulnMult),a.normal.vulnStage],
 ['対象のArmor/MR',fx(1-a.armorCut),a.normal.afterResistance],
 ['対象の属性・共通軽減',fx((1-a.typeCut)*(1-a.allCut)),a.normal.final]
 ];
 return '<details class="combat-trace"><summary>数式への代入・通常ヒットの計算順序を開く</summary>'+
  '<p>基礎 = floor(((武器ダメージ+固定ダメージ)×スキル倍率+スキル固定値)×(1+知力/100))</p>'+
  '<div class="combat-trace-list">'+rows.map(([label,mult,result])=>'<div><span>'+safe(label)+'</span><small>'+safe(mult)+'</small><b>'+num(result)+'</b></div>').join('')+'</div>'+
  '<p>クリティカルは属性補正後・条件補正前に加算されます。ゲーム内部のfloat32/偶数丸めの差は完全再現していません。</p></details>';
}
function defenseTable(d){
 const chosen=d.selected;
 return '<div class="combat-defense-grid">'+d.byType.map(item=>{
  return '<button class="combat-defense-cell '+(item.key===chosen.key?'selected':'')+'" data-action="combat-defense-type" data-value="'+item.key+'">'+
  '<span>'+safe(item.label)+'</span><strong>'+pct(item.expectedCut*100)+'</strong><small>受ける '+pct(100*(1-item.expectedCut))+'</small>'+bar(item.expectedCut*100)+'</button>';
 }).join('')+'</div>';
}
function defenseLayers(d){
 const result=d.selected;
 return '<div class="combat-d-table">'+result.layers.map(x=>
  '<div class="combat-d-line"><div><strong>'+safe(x.label)+'</strong><small>'+(x.key==='flatDR'?'固定値 '+num(result.flatCut):'独立した軽減 '+pct(x.rate))+'</small></div>'+
  '<div class="combat-d-line-right"><b>−'+pct(Math.max(0,x.cutFromBase))+'</b><span>元の被ダメ比</span></div></div>'
 ).join('')+'</div>';
}
function render(stats,settings,context={}){
 const q=B.scenario(settings.combat),a=B.attack(stats,settings,q,context),d=B.defense(stats,settings,q);
 const schrodinger=Boolean(context.schrodingerRing);
 const types=Object.entries(B.types).map(([key,data])=>[key,data[0]]);
 const attacks=Object.entries(B.attacks).map(([key,data])=>[key,data[0]]);
 const attackFields=[
  select('attackType','攻撃種別',q.attackType,attacks),
  select('damageType','与える属性',q.damageType,types),
  number('skillPercent','スキルの武器倍率（%）',q.skillPercent,'スキル説明にある数値。100% = ×1'),
  number('skillFlat','スキル固定ダメージ',q.skillFlat),
  number('heroLevel','自分のレベル',q.heroLevel,'敵のArmor/MR計算に使用'),
  number('enemyHealth','敵の残HP（%）',q.enemyHealth,'通常は健康 >80%、負傷 <30%。指輪・手動指定は例外')
 ].join('');
 const targetOptions=[
  check('forceHealthy','健康扱い（対健康）',q.forceHealthy||schrodinger,schrodinger),check('forceInjured','負傷扱い（対負傷）',q.forceInjured||schrodinger,schrodinger),
  check('elite','Elite / Boss',q.elite),check('vulnerable','脆弱',q.vulnerable),
  check('burned','燃焼',q.burned),check('slowed','減速',q.slowed),
  check('stunned','スタン',q.stunned),check('immobilized','移動不能',q.immobilized),check('frozen','凍結 Frozen',q.frozen),check('lightningAbility','雷アビリティのCrit補正',q.lightningAbility),
  check('distant','遠距離',q.distant),check('bleeding','出血',q.bleeding),check('poisoned','毒状態',q.poisoned)
 ].join('');
 const targetDefenses=[
  number('targetArmor','敵 Armor',q.targetArmor),number('targetMR','敵 Magic Resist',q.targetMR),
  number('targetTypeDR','敵の属性軽減（%）',q.targetTypeDR),number('targetAllDR','敵の共通軽減（%）',q.targetAllDR),
  number('targetCritRed','敵のCritダメージ軽減（%）',q.targetCritRed)
 ].join('');
 const incomingFields=[
  select('defenseType','表示する被ダメージ属性',q.defenseType,types),
  number('attackerLevel','敵のレベル',q.attackerLevel,'Armor / (Armor + 50 × 敵Lv)'),
  number('incomingHit','軽減前の想定被ダメージ',q.incomingHit,'比較用。回避と固定軽減の効果も計算'),
  number('incomingCritBonus','敵クリティカル追加倍率（%）',q.incomingCritBonus)
 ].join('');
 const totalMult=a.layers.reduce((x,layer)=>x*layer.factor,1);
 const extra=a.base;
 const baseNotes=[
  extra.int?'知力 +10':'',extra.critChance?'Crit率 +5%':'',extra.critDamage?'Critダメージ +150%':'',extra.dodge?'回避 +5%':''
 ].filter(Boolean).join(' / ');
 return '<main class="workspace combat-workspace">'+
 '<div class="page-heading"><div class="eyebrow">COMBAT MODEL / LAYER BREAKDOWN</div><h1>ダメージ・ダメージ軽減率</h1>'+
 '<p>装備・Paragon・ペット・バフを計算式に代入し、独立倍率と軽減効果を項目別に表示します。</p></div>'+
 '<div class="notice combat-disclaimer">この画面は登録済みステータスの<strong>部分計算・比較モデル</strong>です。スキル固有効果、ルーン・タレントの条件付き発動、DoT、複数ヒットなどは未計算です。'+
 (baseNotes?'ゲームの初期値を未入力項目に補完：'+safe(baseNotes)+'。':'')+
 ' 実ゲームでの命中ダメージは乱数 ±10%・端数処理などで変動します。</div>'+
 '<section class="combat-section"><div class="section-label"><span>01 / 与ダメージの計算</span><span class="muted small">INFLICTED DAMAGE</span></div>'+
 '<div class="combat-input-card"><h3>攻撃・スキル条件</h3><div class="combat-fields">'+attackFields+'</div><div class="combat-form-title">敵の状態（命中する直前）</div>'+
 '<div class="combat-checks">'+targetOptions+'</div>'+
 (schrodinger?'<p class="combat-ring-notice"><strong>シュレーディンガーの指輪を装備中</strong>：敵のHPに関係なく「健康」「負傷」が両方成立します。チェックは指輪効果として固定されています。</p>':
 '<p class="combat-ring-note">健康・負傷は通常、敵HPから自動判定します。指輪の効果や特殊条件を手動で再現するときは、上の2項目を個別にチェックしてください。</p>')+
 '<details class="combat-advanced"><summary>敵側の防御値を入力（任意）</summary><div class="combat-fields">'+targetDefenses+'</div></details></div>'+
 '<div class="combat-metrics">'+
 metric('通常ヒット',a.normal?num(a.normal.final):'—','Critなし・平均乱数')+
 metric('クリティカル',a.critical?num(a.critical.final):'—','Crit率 '+pct(a.critChance))+
 metric('期待ダメージ',a.expected!==null?num(a.expected,1):'—','Crit率を加味・単発あたり')+
 metric('増幅倍率の積',fx(totalMult),'対象防御を除く、期待Crit込み')+
 '</div>'+
 '<div class="combat-columns"><section class="card combat-card"><div class="card-heading"><div><h2>倍率グループの内訳</h2><span>各倍率の加算値（%）、乗算値、相対寄与率</span></div></div>'+attackTable(a,stats)+
 '<div class="notice gentle">寄与率は<strong>log(倍率)</strong>で増幅を100%に分解した比較指標です。「+100%」の倍率を複数足し合わせる意味ではありません。基礎の固定ダメージは寄与率から除外しています。</div></section>'+
 '<section class="card combat-card"><div class="card-heading"><div><h2>条件付きボーナス</h2><span>成立している条件だけが同じグループに加算</span></div></div>'+
 '<p class="combat-inline-formula">条件倍率 = 1 + ('+pct(a.conditionValue)+') = '+fx(a.condMult)+'</p>'+conditionTable(a)+
 '<div class="combat-form-title">計算の主要値</div>'+
 '<div class="combat-detail-line"><span>武器＋固定ダメージ</span><b>'+num(a.weaponDamage)+' + '+num(a.flatDamage)+'</b></div>'+
 '<div class="combat-detail-line"><span>知力（装備・Paragon・初期値）</span><b>'+num(a.primary)+'</b></div>'+
 '<div class="combat-detail-line"><span>属性ダメージ / Bonus All Damage</span><b>'+pct(a.eleValue)+' / '+pct(a.allValue)+'</b></div>'+
 '<div class="combat-detail-line"><span>クリティカル率 / ダメージ</span><b>'+pct(a.critChance)+' / '+pct(a.critBonus)+'</b></div>'+
 '<div class="combat-detail-line"><span>脆弱：追加独立倍率</span><b>'+fx(a.vulnMult)+'</b></div>'+
 '<div class="combat-detail-line"><span>対象の防御による減算</span><b>−'+pct((1-a.resistMult)*100)+'</b></div>'+
 trace(a)+'</section></div></section>'+
 '<section class="combat-section"><div class="section-label"><span>02 / 被ダメージ・軽減率</span><span class="muted small">DAMAGE TAKEN</span></div>'+
 '<div class="combat-input-card"><h3>被ダメージのシミュレーション条件</h3><div class="combat-fields">'+incomingFields+'</div>'+
 '<div class="combat-checks">'+check('incomingCrit','敵の攻撃がクリティカル',q.incomingCrit)+'</div></div>'+
 '<div class="combat-metrics">'+
 metric('回避を除く軽減率',pct(d.selected.directCut*100),'実際に被弾した場合')+
 metric('回避込み期待軽減率',pct(d.selected.expectedCut*100),'回避の確率を加味')+
 metric('命中時の被ダメージ',num(d.selected.afterFlat),'元の '+num(d.selected.before))+
 metric('平均被ダメージ',num(d.selected.dodgeExpected,1),'回避期待値を反映')+
 '</div>'+
 '<section class="card combat-card"><div class="card-heading"><div><h2>属性別の実効軽減率</h2><span>現在の装備・バフで6属性を並べて比較（回避込み）</span></div></div>'+
 defenseTable(d)+'</section>'+
 '<div class="combat-columns"><section class="card combat-card"><div class="card-heading"><div><h2>'+safe(d.selected.label)+'ダメージの軽減内訳</h2><span>各項の独立した軽減率・元被ダメから減った割合</span></div></div>'+
 defenseLayers(d)+
 '<div class="combat-detail-line"><span>'+ (q.defenseType==='physical'?'Armor':'Magic Resist') + ' 実効値</span><b>'+num(d.selected.resistance)+'</b></div>'+
 '<div class="combat-detail-line"><span>Critダメージ軽減（Crit時のみ）</span><b>'+pct(d.selected.critRed*100)+'</b></div>'+
 '<div class="combat-detail-line"><span>基準：敵 Lv '+num(q.attackerLevel)+'</span><b>'+num(q.incomingHit)+' ダメージ</b></div>'+
 '</section><section class="card combat-card"><div class="card-heading"><div><h2>軽減率を求める式</h2><span>異なる軽減効果は単純加算しません</span></div></div>'+
 '<div class="combat-formula"><p>Armor / MR 軽減 = R / (R + 50 × 敵Lv)</p>'+
 '<p>命中時被ダメ = 元ダメ × (1 − Armor/MR) × (1 − 属性DR) × (1 − 共通DR) − 固定軽減</p>'+
 '<p>回避込み期待被ダメ = 命中時被ダメ × (1 − Dodge)</p></div>'+
 '<div class="notice gentle">Armor/MR自体には固定の75%上限はありません。属性軽減・共通軽減はそれぞれ最大90%、回避は85%、Critダメージ軽減は100%です。回避はDoTには適用されません。</div>'+
 '<p class="helper">この計算は直接ヒットの平均値用です。防御側のシールド・無敵・継続ダメージ、敵固有のダメージ補正は含みません。固定軽減が発動した場合、残りダメージは最低1です。</p></section></div></section>'+
 '<div class="combat-sources"><a href="https://wikily.gg/deskrawl/stats/damage-formula" target="_blank" rel="noopener noreferrer">計算式の出典（WikiLy）</a><a href="https://playongg.com/games/deskrawl/calculator" target="_blank" rel="noopener noreferrer">ゲーム計算機（PlayOnGG）</a></div>'+
 '</main>';
}
window.DBPCombatUI={render};
})();