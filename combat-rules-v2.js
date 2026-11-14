/* Deskrawl simulation rules v2 — data, not a replacement for game files.
 * Every approximate value is explicitly tagged and can be overridden per scenario.
 * Gameplay sources: https://wikily.gg/deskrawl/abilities/auto-combat
 * https://playongg.com/games/deskrawl/classes/magehero
 * https://steamdb.info/patchnotes/26310087/
 * https://steamdb.info/patchnotes/26604532/
 */
(function(){'use strict';
const version='simulation-rules-1.1.11a-v2';
const sources={
 autoCombat:'https://wikily.gg/deskrawl/abilities/auto-combat',
 skills:'https://playongg.com/games/deskrawl/classes/magehero',
 patch:'https://steamdb.info/patchnotes/26310087/',
 patchLatest:'https://steamdb.info/patchnotes/26604532/'
};
const categories=['basic','strong','special'];
const skills={
 electrocute:{name:'感電（Electrocute）',kind:'basic',manaGain:9,range:8,shape:'cone',targets:3,quality:'approximate'},
 fireBall:{name:'ファイアボール',kind:'basic',manaGain:9,range:8,shape:'single',targets:1,quality:'approximate'},
 iceShards:{name:'アイスシャード',kind:'basic',manaGain:9,range:8,shape:'single',targets:1,quality:'approximate'},
 flameLightning:{name:'炎雷',kind:'basic',manaGain:9,range:8,shape:'single',targets:1,quality:'approximate'},
 lightningStorm:{name:'ライトニングストーム',kind:'strong',manaCost:50,baseCooldown:0,range:10,shape:'strikes',targets:3,
  quality:'partial',notes:'3本の対象配分・落雷のずれは実測校正が必要'},
 frostBeam:{name:'フロストビーム',kind:'strong',manaCost:45,baseCooldown:3.25,range:10,shape:'channel',channel:3,
  quality:'partial',notes:'tick時刻・チャネリング速度補正は近似'},
 iceNova:{name:'アイスノヴァ',kind:'special',manaCost:0,baseCooldown:22,range:4.5,shape:'area',radius:4.5,
  quality:'partial',notes:'凍結の持続・対象AIは未校正'},
 lightningCloud:{name:'ライトニングクラウド',kind:'special',manaCost:0,baseCooldown:24,range:11,shape:'zone',ticks:8,zoneDuration:4,
  quality:'approximate',notes:'8回/4秒の区切りを均等間隔で近似'},
 fireMeteor:{name:'ファイアメテオ',kind:'special',manaCost:0,baseCooldown:24,range:11,shape:'area',radius:2.5,
  quality:'approximate',notes:'燃焼DoT・半径は未校正'}
};
const defaults=Object.freeze({
 mode:'single',duration:180,enemyHP:null,waveCount:1,enemiesPerWave:3,spawnGap:4,
 initialDelay:0,bossEvery:0,bossMultiplier:8,enemySpacing:0.7,
 playerRange:10,enemyDistance:3,stormStrikeDelay:0.12,stormTargetMode:'spread',
 splashRadius:1,ballRadius:1.8,ballPulseInterval:1,beamTick:null,
 frameStep:0.05,actionRecovery:0.10,seed:42,randomCrit:false,
 manaRegen:null,initialMana:null,enemyIncoming:0,enemyAttackEvery:2,
 slots:['electrocute','lightningStorm','iceNova','none']
});
const limits=Object.freeze({
 duration:[5,900],enemyHP:[1,1e15],waveCount:[1,60],enemiesPerWave:[1,12],spawnGap:[0,60],
 initialDelay:[0,60],bossEvery:[0,60],bossMultiplier:[1,1000],enemySpacing:[0,8],
 playerRange:[1,100],enemyDistance:[0,100],stormStrikeDelay:[0,2],
 splashRadius:[0,10],ballRadius:[0,10],ballPulseInterval:[0.05,6],
 beamTick:[0.05,1],frameStep:[0.02,0.2],actionRecovery:[0,5],
 seed:[1,4294967295],manaRegen:[0,100000],initialMana:[0,100000],
 enemyIncoming:[0,1e11],enemyAttackEvery:[0.1,60]
});
const integers=new Set(['waveCount','enemiesPerWave','bossEvery','seed']);
const nullable=new Set(['enemyHP','beamTick','manaRegen','initialMana']);
const kinds={single:'単体敵',pack:'敵の集団',waves:'複数ウェーブ'};
function normalize(source={}){
 const value={...defaults,slots:[...defaults.slots]},issues=[];
 if(!source||typeof source!=='object'||Array.isArray(source))return {config:value,issues:['戦闘条件はオブジェクトで指定してください']};
 for(const [key,raw] of Object.entries(source)){
  if(key==='slots'){
   if(!Array.isArray(raw)||raw.length!==4){issues.push('スキル構成は4枠で指定');continue;}
   const slots=raw.map(x=>typeof x==='string'?x:'');
   if(slots.some((x,i)=>x!=='none'&&(!skills[x]||skills[x].kind!==categories[Math.min(i,2)]&&
    (i!==3||skills[x].kind!=='special')))){
    // Slot indexes: 0 basic, 1 strong, 2 special, 3 special.
    const invalid=slots.some((x,i)=>x!=='none'&&(!skills[x]||skills[x].kind!==['basic','strong','special','special'][i]));
    if(invalid){issues.push('スキル枠に対応しないアビリティが指定されています');continue;}
   }
   if(slots[0]==='none'||slots[1]==='none'){issues.push('基本・強攻撃スロットは必須です');continue;}
   value.slots=slots;continue;
  }
  if(key==='mode'){if(Object.hasOwn(kinds,raw))value.mode=raw;else issues.push('戦闘モードが不正です');continue;}
  if(key==='stormTargetMode'){
   if(['spread','focus','random'].includes(raw))value.stormTargetMode=raw;else issues.push('落雷対象選択が不正です');
   continue;
  }
  if(key==='randomCrit'){if(typeof raw==='boolean')value.randomCrit=raw;else issues.push('クリティカルモードが不正です');continue;}
  if(!Object.hasOwn(limits,key))continue;
  if(nullable.has(key)&&(raw===''||raw==null)){value[key]=null;continue;}
  if(raw===''||raw==null||typeof raw==='boolean'){issues.push(key+'は有効な数値を入力してください');continue;}
  const n=Number(raw),[min,max]=limits[key];
  if(!Number.isFinite(n)||n<min||n>max||(integers.has(key)&&!Number.isSafeInteger(n)))issues.push(key+'は'+min+'〜'+max+'の範囲で指定してください');
  else value[key]=n;
 }
 if(value.mode==='single'){value.waveCount=1;value.enemiesPerWave=1;}
 if(value.mode==='pack')value.waveCount=1;
 if(value.mode==='waves'&&value.waveCount<2)issues.push('ウェーブ戦では2ウェーブ以上必要です');
 if(value.bossEvery>value.waveCount&&value.bossEvery!==0)issues.push('ボス出現周期がウェーブ数を超えています');
 return {config:value,issues};
}
const requiredGameRules=[
 ['damageFormula','単発ダメージ式','partial','切捨順序・固有効果の全網羅が未校正'],
 ['rotation','4枠優先度 4→3→2→1','partial','GCDは確認済み、停止時間・ターゲット条件は近似'],
 ['stormHits','Stormの3落雷','partial','対象分配・時間差は仮定'],
 ['stormSplash','嵐4セット範囲攻撃','approximate','半径1は仮定・範囲倍率は資料不足'],
 ['stormBall','嵐6セットの雷球3パルス','approximate','威力50%は既知、間隔は仮定'],
 ['frostBeam','Beam時間経過','partial','攻撃間隔・Mana・チャネリング補正を近似'],
 ['petAI','ペットの戦闘行動','missing','現在はプレイヤー火力から除外'],
 ['enemyAI','敵移動・ターゲット・ウェーブ','approximate','入力された位置・周期だけを再現'],
 ['statusEffects','燃焼・凍結・感電など','missing','状態異常による行動・DoTは未計算'],
 ['recordCalibration','実測値との校正','missing','現段階では自動校正しない']
];
window.DBPSimulationRules={version,sources,skills,defaults,limits,kinds,normalize,requiredGameRules};
})();