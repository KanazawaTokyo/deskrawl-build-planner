/* Deskrawl Build Planner · pet tab (v1.1.0).
   All fields are owned by build.settings.pet and use the normal save/sync path. */
(function(){'use strict';
const P=window.DBPPets,D=window.DBP,C=window.DBPCalc;
const changes=new Set(['petMain','petRank','petEmpower','petPassive','petInheritUnlock','petInherit','petEquipUnlock','petGearType','petGearStat','petGearValue']);
const skillOptions=active=>P.minions.flatMap(m=>m.id===active||m.unobtainable?[]:[
  ...m.passives.map(x=>[m.id+'|'+x.id,m.name+' · '+x.label+' +'+C.format(x.stat,x.max)]),
  ...m.abilities.map(x=>[m.id+'|'+x.id,m.name+' · '+x.label+'（時間限定アクティブ）'])
]);
function render({settings,result,E,opt}){
  const pet=settings?.pet||{},main=P.lookup(pet.id),rank=Number(pet.level)||0;
  const until=Number(pet.empoweredUntil)||0,empowered=until>Date.now();
  const eq=pet.equipment||{},gear=P.gearTypes.find(x=>x.id===eq.id)||P.gearTypes[0];
  const inherited=P.skill(pet.inheritFrom,pet.inheritSkill);
  const inheritedKey=inherited?inherited.petId+'|'+inherited.id:'';
  const contribution=Object.entries(result.breakdown).flatMap(([stat,records])=>
    records.filter(x=>x.source.includes(' · 継承Lv10 ')||x.source.includes(' · OP ')||/ · .+? Lv(?:0|10)/.test(x.source)).map(x=>({stat,...x})));
  const passives=main?.passives.map(x=>{
    const chosen=pet.passiveLevels?.[x.id]??10,enabled=(rank===10&&chosen===10)||chosen===0;
    return '<label class="pet-passive"><div><strong>'+E(x.label)+'</strong><small>Lv10 +'+E(C.format(x.stat,x.max))+' ／ Lv0 +'+E(C.format(x.stat,x.base))+'</small></div>'+
      '<select data-change="petPassive" data-key="'+E(x.id)+'">'+opt(10,'Lv10',chosen)+opt(0,'Lv0',chosen)+'</select>'+
      '<span class="'+(enabled?'pet-valid':'pet-invalid')+'">'+(enabled?'反映中':'ランク不足')+'</span></label>';
  }).join('')||'<p class="helper">ペットを選択するとパッシブが表示されます。</p>';
  const gearRows=Array.from({length:gear?.slots||0},(_,i)=>{
    const roll=eq.rolls?.[i]||{},stat=roll.stat||'';
    const black=gear.id==='saddle-of-the-golden-khan',cap=(gear.rarity==='Rare'?P.rare850Max:P.max850)[stat];
    const value=black?cap:roll.value;
    return '<div class="pet-gear-row"><label class="field"><span>OP '+(i+1)+'</span><select data-change="petGearStat" data-idx="'+i+'">'+
     opt('','未設定',stat)+P.gearAffixes.map(id=>opt(id,C.labels[id]||D.affixes[id]?.[0]||id,stat)).join('')+
     '</select></label><label class="field"><span>'+(black?'ブラックミストの最大値':'実測値（アイテムレベル850が上限）')+
     '</span><input type="number" inputmode="decimal" min="0" step="any" '+(Number.isFinite(cap)?'max="'+cap+'" ':'')+
     'data-change="petGearValue" data-idx="'+i+'" value="'+E(value??'')+'" placeholder="ゲーム内の実測値" '+(black?'disabled':'')+'/></label>'+
     '<strong class="pet-gear-value">'+(stat&&value!==null&&value!==undefined&&value!==''?'+'+E(C.format(stat,Number(value))):'—')+'</strong></div>';
  }).join('');
  const actives=main?.abilities?.length?main.abilities.map(x=>'<div class="pet-action"><b>'+E(x.label)+'</b><small>'+E(x.at10)+'</small></div>').join(''):'';
  const inheritEnabled=pet.inheritUnlocked&&rank===10;
  const gearEnabled=pet.equipmentUnlocked&&rank>=5;
  return '<main class="workspace pet-workspace"><div class="page-heading"><div class="eyebrow">ペット・装備の設定</div><h1>ペット・継承・装備</h1>'+
    '<p>Lv10パッシブ・継承スキル1枠・ペット専用装備1枠を組み合わせる</p></div>'+
    '<div class="pet-layout"><section class="pet-main">'+
    '<div class="card pet-card"><div class="card-heading"><div><h2>① メインペット</h2><span>アクティブにできるのは1体だけ</span></div><span class="tag green">最大＋10</span></div>'+
    '<label class="field"><span>ペット（'+P.minions.length+'体）</span><select data-change="petMain">'+opt('unknown','未選択',pet.id||'unknown')+
    P.minions.map(m=>m.unobtainable?'<option value="'+E(m.id)+'" disabled>'+E(m.name+' · '+(window.DBPJP?.rarity(m.rarity)||m.rarity)+'（入手不可）')+'</option>':opt(m.id,m.name+' · '+(window.DBPJP?.rarity(m.rarity)||m.rarity),main?.id)).join('')+'</select></label>'+
    '<label class="field pet-level"><span>成長レベル +0〜+10</span><input type="number" data-change="petRank" min="0" max="10" step="1" inputmode="numeric" value="'+E(rank)+'"/></label>'+
    '<div class="notice gentle"><label class="checkbox-row"><input type="checkbox" data-change="petEmpower" '+(empowered?'checked':'')+'/> 48時間の手下強化（同レアリティの手綱を使用済み）</label>'+
    '<small>'+(empowered?'強化有効（期限：'+E(new Date(until).toLocaleString('ja-JP'))+'）':'強化なし')+
    ' · 自分のスキルLvが+5。継承先のスキルは対象外。Lv11〜15の数値は未確認のため、自動計算には含めません。</small></div>'+
    '<h3 class="pet-subhead">常時パッシブ（個別の強化レベル）</h3><div class="pet-passive-list">'+passives+'</div>'+
    (actives?'<h3 class="pet-subhead">アクティブ能力（常時ステータスには加算しません）</h3>'+actives:'')+
    (main?'<p class="helper"><a href="'+E(main.sourceUrl)+'" target="_blank" rel="noopener noreferrer">このペットの原典データ</a></p>':'')+
    '<p class="helper">Lv1〜9のスキル数値は未校正のため、Lv0とLv10の効果のみ確定値として扱います。Lv10パッシブはメインペットの成長Lv10が必要です。</p></div>'+
    '<div class="card pet-card"><div class="card-heading"><div><h2>② 継承スキル</h2><span>別ペットから+10済みのパッシブまたはアクティブを1枠</span></div></div>'+
    '<label class="checkbox-row"><input type="checkbox" data-change="petInheritUnlock" '+(pet.inheritUnlocked?'checked':'')+'/> 継承枠を購入・解放済み</label>'+
    '<label class="field"><span>継承元ペットとスキル</span><select data-change="petInherit">'+opt('','継承なし',inheritedKey)+skillOptions(main?.id).map(x=>opt(x[0],x[1],inheritedKey)).join('')+'</select></label>'+
    (inherited?'<div class="notice '+(inheritEnabled?'gentle':'')+'"><strong>'+E(P.lookup(inherited.petId)?.name)+' · '+E(inherited.label)+
      '</strong> / '+(inherited.kind==='passive'?'Lv10 +'+E(C.format(inherited.stat,inherited.max)):'Lv10アクティブ：'+E(inherited.at10))+
      ' — '+(inheritEnabled?'スロット有効':'Lv10か継承解放が必要')+'</div>':'')+
    '<p class="helper">継承元スキルはLv10まで強化済みが前提。アクティブ効果は永続ステータスへ加算しません。</p></div>'+
    '<div class="card pet-card"><div class="card-heading"><div><h2>③ ペット装備</h2><span>レア・レジェンダリー・ブラックミスト：能力値3枠</span></div></div>'+
    '<label class="checkbox-row"><input type="checkbox" data-change="petEquipUnlock" '+(pet.equipmentUnlocked?'checked':'')+'/> 装備枠を購入・解放済み</label>'+
    '<label class="field"><span>ペット装備を選択</span><select data-change="petGearType">'+
    P.gearTypes.map(x=>opt(x.id,x.name+(x.rarity?' · '+(window.DBPJP?.rarity(x.rarity)||x.rarity):''),eq.id||'')).join('')+'</select></label>'+
    '<div class="pet-gear-rows">'+gearRows+'</div>'+
    ((gear?.slots||0)?'<div class="notice gentle">'+(gear.id==='saddle-of-the-golden-khan'?'ブラックミストはアイテムレベル850の最大値を自動計算します。':'通常装備は実際の個体値を入力してください。未入力値は合算しません。')+
      ' 装備効果は成長Lv5以上かつ装備枠解放済みで有効です。現在：'+(gearEnabled?'有効':'無効')+'</div>':'')+
    '<p class="helper">ペット装備は強化不可・ソケットなし。<a href="https://wikily.gg/deskrawl/equipment/saddle-of-the-golden-khan" target="_blank" rel="noopener noreferrer">装備・OP候補データ</a></p></div>'+
    '</section><aside class="pet-side"><div class="card"><div class="card-heading"><h2>ペット由来ステータス</h2></div>'+
    (contribution.length?contribution.map(x=>'<div class="data-row"><div><strong>'+E(C.labels[x.stat]||x.stat)+'</strong><span>'+E(x.source)+'</span></div><b>+'+E(C.format(x.stat,x.value))+'</b></div>').join(''):'<div class="notice">現在有効な常時補正はありません。</div>')+
    '<p class="helper">装備・パラゴン等との合計と上限超過は「ステータス」タブで確認できます。装備数値はゲーム内で確認した実測値を入力してください。</p></div></aside></div></main>';
}
function change(el,{settings,modify,flash,render}){
  const kind=el.dataset.change,v=el.type==='checkbox'?el.checked:el.value;
  const pet=settings.pet??(settings.pet={id:'unknown'});
  const reject=text=>{render();if(text)flash(text)};
  if(kind==='petMain'){
    if(v!=='unknown'&&(!P.lookup(v)||P.lookup(v).unobtainable))return reject('未登録または現行ゲームで入手できないペットです');
    modify(()=>{Object.assign(pet,{id:v,level:v==='unknown'?0:10,progressionVersion:1,passiveLevels:{},inheritFrom:'',inheritSkill:'',empoweredUntil:null})});return;
  }
  if(kind==='petRank'){
    const n=Number(v);
    if(!Number.isInteger(n)||n<0||n>10)return reject('ペットLvは0〜10の整数です');
    modify(()=>{pet.level=n;pet.progressionVersion=1});return;
  }
  if(kind==='petEmpower'){
    modify(()=>{pet.empoweredUntil=v?Date.now()+48*60*60*1000:null;pet.progressionVersion=1});
    return;
  }
  if(kind==='petPassive'){
    const p=P.lookup(pet.id)?.passives.find(x=>x.id===el.dataset.key);
    if(!p||!['0','10'].includes(String(v)))return reject('パッシブ強化Lvは0または10です');
    modify(()=>{pet.passiveLevels??={};pet.passiveLevels[p.id]=Number(v);pet.progressionVersion=1});return;
  }
  if(kind==='petInheritUnlock'||kind==='petEquipUnlock'){
    modify(()=>{pet[kind==='petInheritUnlock'?'inheritUnlocked':'equipmentUnlocked']=Boolean(v);pet.progressionVersion=1});return;
  }
  if(kind==='petInherit'){
    if(v===''){modify(()=>{pet.inheritFrom='';pet.inheritSkill='';pet.progressionVersion=1});return}
    const parts=v.split('|'),skill=P.skill(parts[0],parts[1]);
    if(!skill||skill.petId===P.lookup(pet.id)?.id||P.lookup(skill.petId)?.unobtainable)return reject('入手できる他ペットのスキルを選択してください');
    modify(()=>{pet.inheritFrom=skill.petId;pet.inheritSkill=skill.id;pet.progressionVersion=1});return;
  }
  if(kind==='petGearType'){
    if(!P.gearTypes.some(x=>x.id===v))return reject('未登録のペット装備です');
    modify(()=>{pet.equipment={id:v,rolls:[]};pet.progressionVersion=1});return;
  }
  const eq=pet.equipment||{},type=P.gearTypes.find(x=>x.id===eq.id),idx=Number(el.dataset.idx);
  if(!type||!Number.isInteger(idx)||idx<0||idx>=type.slots)return reject('ペット装備の枠が不正です');
  if(kind==='petGearStat'){
    if(v&&!P.gearAffixes.includes(v))return reject('ペット装備のOP候補外です');
    if(v&&(eq.rolls||[]).some((x,i)=>i!==idx&&x?.stat===v))return reject('同じOPは同じ装備へ重複設定できません');
    modify(()=>{pet.equipment??={id:eq.id,rolls:[]};while(pet.equipment.rolls.length<=idx)pet.equipment.rolls.push({stat:'',value:null});
      pet.equipment.rolls[idx]={stat:v,value:null};pet.progressionVersion=1});return;
  }
  if(kind==='petGearValue'){
    if(eq.id==='saddle-of-the-golden-khan')return reject('ブラックミストの最大値は自動反映されます');
    const stat=eq.rolls?.[idx]?.stat,cap=(type.rarity==='Rare'?P.rare850Max:P.max850)[stat],num=Number(v);
    if(!stat||v!==''&&(!Number.isFinite(num)||num<0||Number.isFinite(cap)&&num>cap))return reject('装備数値がアイテムレベル850の最大値を超えています');
    modify(()=>{pet.equipment.rolls[idx].value=v===''?null:num;pet.progressionVersion=1});return;
  }
}
window.DBPPetUI={isChange:kind=>changes.has(kind),render,change};
})();