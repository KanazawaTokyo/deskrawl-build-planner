/* Deskrawl Build Planner — reference game-data catalog. 
 * Confidence: 'history' = figures from earlier user discussion, NOT independently verified.
 * All +0 values and projected upgrade formulas require checking in the game.
 */
(function(){
'use strict';
// Each Paragon level grants one point; caps are allocation limits (not stat caps).
// Sources: https://wikily.gg/deskrawl/paragon
//          https://playongg.com/games/deskrawl/systems/gameconfig
const paragonStats=[{"key":"str","group":"コア","label":"力","stat":"str","per":1,"max":null},{"key":"dex","group":"コア","label":"敏捷","stat":"dex","per":1,"max":null},{"key":"int","group":"コア","label":"知力","stat":"int","per":1,"max":null},{"key":"move","group":"コア","label":"ボーナスMS","stat":"move","per":0.5,"max":50},{"key":"maxMana","group":"コア","label":"最大マナ","stat":"mana","per":2,"max":50},{"key":"critChance","group":"攻撃","label":"クリティカル率","stat":"critChance","per":0.1,"max":50},{"key":"critDamage","group":"攻撃","label":"クリティカルダメージ","stat":"critDamage","per":2,"max":50},{"key":"as","group":"攻撃","label":"攻撃速度ボーナス","stat":"as","per":0.4,"max":50},{"key":"cdr","group":"攻撃","label":"クールダウン短縮","stat":"cdr","per":0.2,"max":50},{"key":"bonusArmor","group":"防御","label":"ボーナスArmor","stat":"bonusArmor","per":1,"max":50},{"key":"bonusMR","group":"防御","label":"ボーナスMR","stat":"bonusMR","per":1,"max":50},{"key":"bonusHP","group":"防御","label":"ボーナスHP","stat":"bonusHP","per":0.5,"max":50},{"key":"regen","group":"防御","label":"HP自然回復","stat":"regen","per":4,"max":50},{"key":"loh","group":"補助","label":"Life on Hit","stat":"loh","per":5,"max":25},{"key":"potionFind","group":"補助","label":"ポーション発見率","stat":"potionFind","per":5,"max":null}];
function paragonAllocation(settings){
 const current=settings?.paragonPoints;
 const legacy=!current||typeof current!=='object'||Array.isArray(current);
 const source=legacy?(settings?.paragon||{}):current;
 const points={};const issues=[];let total=0;
 for(const item of paragonStats){
   const sourceValue=Number(source[item.key]??0);
   const estimate=legacy?sourceValue/item.per:sourceValue;
   const safe=Number.isFinite(estimate)?Math.max(0,Math.min(item.max??Number.MAX_SAFE_INTEGER,Math.round(estimate))):0;
   if(!Number.isFinite(estimate)||Math.abs(safe-estimate)>1e-7)issues.push(item.label);
   points[item.key]=safe;total+=safe;
 }
 return {points,total,legacy,issues};
}
const slots=[['weapon','武器'],['head','頭'],['neck','首飾り'],['shoulder','肩'],['chest','胸'],['gloves','手袋'],['belt','ベルト'],['legs','脚'],['boots','ブーツ'],['ring1','指輪①'],['ring2','指輪②']];
const affixes={
basicAttack:["基本攻撃ダメージ",109.5,"pct","通常攻撃系"],
strongAttack:["強攻撃ダメージ",109.5,"pct","Strong Attack系"],
fire:["炎ダメージ",125.1,"pct","炎属性"],
cold:["冷気ダメージ",125.1,"pct","冷気属性"],
slowed:["減速状態へのダメージ",156.4,"pct","対減速"],
immobilized:["移動不能状態へのダメージ",156.4,"pct","対移動不能"],
vulnerable:["脆弱状態へのダメージ",156.4,"pct","対脆弱"],
distant:["遠距離の敵へのダメージ",156.4,"pct","対遠距離"],
dot:["継続ダメージ",156.4,"pct","DoT"],
burned:["燃焼状態へのダメージ",156.4,"pct","対燃焼"],
lifeKill:["撃破時HP回復",94,"flat","キル時回復"],
lightningDR:["雷ダメージ軽減",15.6,"pct","雷限定"],
arcaneDR:["アルケインダメージ軽減",15.6,"pct","アルケイン限定"],
int:['知力',78,'flat','攻撃・魔法耐性'], mr:['魔法抵抗',782,'flat','魔法ダメージを軽減'],
critChance:['クリティカル率',12.5,'pct','上限85%'],critDamage:['クリティカルダメージ',93.8,'pct','クリティカル追加倍率'],critRed:['クリティカルダメージ軽減',31.3,'pct','上限100%'],
lightning:['雷ダメージ',125.1,'pct','雷属性'],allDamage:['全ダメージボーナス',62.6,'pct','属性ダメージと同じグループ（要検証）'],
healthy:['健康状態へのダメージ',156.4,'pct','シュレディンガーで常時適用の想定'],injured:['負傷状態へのダメージ',156.4,'pct','シュレディンガーで常時適用の想定'],elite:['エリートへのダメージ',156.4,'pct','対エリート／ボス'],
bonusHP:['ボーナスHP',31.3,'pct','最大HPへの割合補正'], maxHP:['最大HP',704,'flat','固定加算'],dodge:['回避率',7.8,'pct','上限85%'],
cdr:['クールダウン短縮',15.6,'pct','上限80%'],mcr:['マナ消費軽減',15.6,'pct','上限85%'],as:['攻撃速度ボーナス',23.5,'pct','通常攻撃の回転'],damage:['固定ダメージ',47,'flat','基礎ダメージへ加算'],mana:['最大マナ',78,'flat','マナ総量'],
physicalDR:['物理ダメージ軽減',15.6,'pct','物理限定'],coldDR:['冷気ダメージ軽減',15.6,'pct','冷気限定'],fireDR:['炎ダメージ軽減',15.6,'pct','炎限定'],poisonDR:['毒ダメージ軽減',15.6,'pct','毒限定'],armorBonus:['ボーナスArmor',31.3,'pct','装甲の割合補正'],specialDamage:['特殊攻撃ダメージ',125.1,'pct','スキルによる'],thorns:['反射ダメージ',156,'flat','反射'],potionCharges:['追加ポーション所持数',1,'flat','所持枠'],
move:['ボーナス移動速度',15.6,'pct','移動速度'],loh:['Life on Hit',31,'flat','命中時回復'],itemFind:['アイテム発見率',31.3,'pct','ドロップ関連'],goldFind:['ゴールド発見率',31.3,'pct','ゴールド関連'],xp:['経験値獲得',31.3,'pct','経験値関連'],manaKill:['撃破時マナ回復',16,'flat','キル時回復'],potionFind:['ポーション発見率',31.3,'pct','ポーション関連'],regen:['HP自然回復',31,'flat','自然回復']
};
// Radiant Octagon (Tier 6) only. Effects vary by socket category.
// Source: https://deskrawl-db.vercel.app/gems (gem tiers and JP bonus values)
 // Slot limits: https://wikily.gg/deskrawl/equipment-upgrades/sockets
const gemSocketLimits={weapon:3,head:1,chest:2,legs:2,neck:1,ring1:1,ring2:1};
const gemSocketGroup={weapon:'weapon',head:'armor',chest:'armor',legs:'armor',neck:'accessory',ring1:'accessory',ring2:'accessory'};
const gems={
 amethyst:{name:'アメジスト',itemName:'輝くアメジストの八角形',weapon:['arcane',50],armor:['int',30],accessory:['arcaneDR',15]},
 diamond:{name:'ダイヤモンド',itemName:'輝くダイヤモンドの八角形',weapon:['physical',50],armor:['cdr',4],accessory:['physicalDR',11.5]},
 emerald:{name:'エメラルド',itemName:'輝くエメラルドの八角形',weapon:['poison',50],armor:['thorns',130],accessory:['poisonDR',15]},
 ruby:{name:'ルビー',itemName:'輝くルビーの八角形',weapon:['fire',50],armor:['str',30],accessory:['fireDR',15]},
 sapphire:{name:'サファイア',itemName:'輝くサファイアの八角形',weapon:['cold',50],armor:['bonusHP',18],accessory:['coldDR',15]},
 topaz:{name:'トパーズ',itemName:'輝くトパーズの八角形',weapon:['lightning',50],armor:['dex',30],accessory:['lightningDR',15]}
};
function gemEffect(type,slot){const group=gemSocketGroup[slot],data=gems[type]?.[group];return data?{type,group,stat:data[0],value:data[1],tier:6}:null;}
const common=['int','mr','maxHP','dodge','critRed','critChance','critDamage','cdr','mcr','as','damage','allDamage','bonusHP'];
const rules={
weapon:{primary:["int","damage","critDamage","as","basicAttack","strongAttack","specialDamage","fire","cold","lightning","healthy","injured","slowed","immobilized","elite","distant","dot","burned","vulnerable"],secondary:["loh","lifeKill","manaKill"]},
head:{primary:["int","maxHP","mana","cdr","mr","dodge","armorBonus","lightningDR","arcaneDR"],secondary:["regen","itemFind","goldFind","potionFind","xp"]},
neck:{primary:["int","critChance","critDamage","as","cdr","mr","basicAttack","strongAttack","healthy","injured","slowed","elite","vulnerable","armorBonus","allDamage","fire","cold","lightning"],secondary:["move","loh","itemFind","xp"]},
shoulder:{primary:["int","maxHP","mr","dodge","cdr","poisonDR","fireDR","critRed","thorns"],secondary:["regen","move"]},
chest:{primary:["int","mr","healthy","injured","bonusHP","maxHP","dodge","physicalDR","armorBonus","coldDR","specialDamage","thorns"],secondary:["loh","itemFind","regen","goldFind","xp"]},
gloves:{primary:["int","damage","critRed","mr","critDamage","critChance","mcr","cdr","as","mana"],secondary:["manaKill","itemFind","goldFind","potionFind","xp"]},
belt:{primary:["int","maxHP","dodge","mr","mcr","cdr","as","potionCharges","thorns"],secondary:["potionFind","regen","manaKill","xp"]},
legs:{primary:["int","mr","maxHP","bonusHP","dodge","thorns","physicalDR","poisonDR","armorBonus"],secondary:["loh","itemFind","goldFind","xp","regen"]},
boots:{primary:["int","mr","critRed","mcr","dodge","maxHP","coldDR","fireDR"],secondary:["move","loh","itemFind","goldFind","potionFind"]},
ring1:{primary:["int","critChance","critDamage","as","mana","mr","vulnerable","fire","cold","lightning","allDamage"],secondary:["loh","lifeKill","xp","itemFind","goldFind"]},
ring2:{primary:["int","critChance","critDamage","as","mana","mr","vulnerable","fire","cold","lightning","allDamage"],secondary:["loh","lifeKill","xp","itemFind","goldFind"]}
};
const definitions=[
{id:'grandmother',slot:'weapon',name:'The Grandmother',rarity:'Divine',effect:'固有：クリティカル率+5%、クリティカルダメージ+120%（固有効果は強化倍率に含めない）',sourceUrl:'https://wikily.gg/deskrawl/equipment/the-grandmother/',fixed:[['weaponSpeed',0.80],['weaponDamage',430],['damage',50],['strongAttack',120],['healthy',170],['maxHP',850],['manaKill',17],['loh',34]],powerStats:[['critChance',5],['critDamage',120]]},
{id:'iron',slot:'head',name:"Iron Tyrant’s Helm",rarity:'Divine',effect:'固有：与ダメージ20%増加、エリート・ボスには40%増加（独立した固有効果。全ダメージOPには加算しない）',sourceUrl:'https://wikily.gg/deskrawl/equipment/iron-tyrants-helm',fixed:[['armor',840],['maxHP',850],['critRed',35],['allDamage',70],['cdr',17],['move',15],['goldFind',35]]},
{id:'schrodinger',slot:'ring1',name:"Schrödinger’s Ring",rarity:'Divine',effect:'固有：敵を常にHealthy・Injuredの両方として扱う（条件付きダメージ自体は別途評価）',sourceUrl:'https://wikily.gg/deskrawl/equipment/schrodingers-ring',fixed:[['critChance',13.5],['critDamage',100],['as',25],['mr',850],['goldFind',35],['itemFind',35]]},
{id:'sage',slot:'ring2',name:'Remnant of the Elder Sage',rarity:'Divine',effect:'固有：すべてのアビリティレベル+10（強化によるスキルレベル増加なし）',sourceUrl:'https://new.wikily.gg/deskrawl/equipment/remnant-of-the-elder-sage',fixed:[['mcr',17],['cdr',17],['critChance',13.5],['critDamage',100],['goldFind',35],['itemFind',35]],powerStats:[['abilityLevels',10]]},
{id:'prism',slot:'neck',name:'Prismatic Heart',rarity:'Black Mist',effect:'最大の属性ダメージボーナスを強化（正確な処理は検証中）'},
{id:'shoulder',slot:'shoulder',name:'Elemental Burst Pauldron',rarity:'Black Mist',effect:'エレメンタルバースト固有効果（要照合）'},
{id:'unyielding',slot:'chest',name:'Unyielding Cuirass',rarity:'Black Mist',effect:'HP30%未満で被弾すると4秒間無敵（CD25秒）。致命打を遡って防がないという実測あり'},
{id:'gauntlets',slot:'gloves',name:'Stormcaller Gauntlets',rarity:'Black Mist',effect:'Lightning StormのCrit Damage強化'},
{id:'bottomless',slot:'belt',name:'Bottomless Potion Belt',rarity:'Black Mist',effect:'ポーション所持数+4'},
{id:'greaves',slot:'legs',name:'Greaves of the Arcane Edge',rarity:'Black Mist',effect:'雷能力Crit Damage強化（要照合）'},
{id:'windcaller',slot:'boots',name:'Boots of the Windcaller',rarity:'Black Mist',effect:'敵撃破後に移動速度上昇。効果値・持続をゲーム内で確認'},
{id:'custom-weapon',slot:'weapon',name:'その他の武器',rarity:'Black Mist'},
{id:'custom-head',slot:'head',name:'その他の頭装備',rarity:'Black Mist'},
{id:'custom-neck',slot:'neck',name:'その他の首飾り',rarity:'Black Mist'},
{id:'custom-shoulder',slot:'shoulder',name:'その他の肩装備',rarity:'Black Mist'},
{id:'custom-chest',slot:'chest',name:'その他の胸装備',rarity:'Black Mist'},
{id:'custom-gloves',slot:'gloves',name:'その他の手袋',rarity:'Black Mist'},
{id:'custom-belt',slot:'belt',name:'その他のベルト',rarity:'Black Mist'},
{id:'custom-legs',slot:'legs',name:'その他の脚装備',rarity:'Black Mist'},
{id:'custom-boots',slot:'boots',name:'その他のブーツ',rarity:'Black Mist'},
{id:'custom-ring1',slot:'ring1',name:'その他の指輪①',rarity:'Black Mist'},
{id:'custom-ring2',slot:'ring2',name:'その他の指輪②',rarity:'Black Mist'}
];
const seedConfigs=[
['weapon','grandmother',[],null,'Divine基礎値は公開データに基づく。実際の強化段階は未確認'],
['head','iron',[],null,'Divine基礎値は公開データに基づく。実際の強化段階は未確認'],
['neck','prism',['critChance','critDamage','lightning','healthy'],'move','会話履歴から登録'],
['shoulder','shoulder',['int','maxHP','cdr','poisonDR'],'move','会話履歴から登録'],
['chest','unyielding',['int','mr','injured','bonusHP'],'itemFind','11/5に報告された胸。装着中か要確認'],
['gloves','gauntlets',['int','critChance','critDamage','mr'],null,'11/5報告。Secondary未確認'],
['belt','bottomless',['int','mcr','dodge','cdr'],'manaKill','会話履歴から登録'],
['legs','greaves',[],null,'装備名のみ。OP/強化値未確認'],
['boots','windcaller',[],null,'装備名のみ。OP/強化値未確認'],
['ring1','schrodinger',[],null,'既知のDivine'],
['ring2','sage',[],null,'既知のDivine']
];
function uid(prefix){return prefix+'-'+(globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2))}
function makeSeed(){const items=[],loadout={};for(const [slot,definitionId,primary,secondary,note] of seedConfigs){const it={id:uid('item'),definitionId,slot,primary:[...primary],secondary:secondary||'',upgrade:0,upgradeKnown:false,overrides:{},gems:[],nickname:'',memo:note,source:'history',owned:null,createdAt:new Date().toISOString()};items.push(it);loadout[slot]=it.id;}const old={id:uid('item'),definitionId:'unyielding',slot:'chest',primary:['healthy','injured','bonusHP','coldDR'],secondary:'loh',upgrade:8,upgradeKnown:true,overrides:{},gems:[],nickname:'旧・LoH胸',memo:'以前の+8試用装備',source:'history',owned:null,createdAt:new Date().toISOString()};items.push(old);const build={id:uid('build'),name:'Stormcaller 通常',loadout,settings:{aura:true,enemyLevel:70,paragonPoints:{maxMana:15},paragonLevel:null,talents:{flameWard:8,arcaneReservoir:8},pet:{id:'unknown',level:0,inherit:''},potion:'none',food:'none',utility:'none',base:{},notes:'会話履歴による初期下書き。実測値・強化段階は確認が必要。'},createdAt:new Date().toISOString()};return {schemaVersion:1,masterVersion:'conversation-draft-2026-11-06',items,builds:[build],activeBuildId:build.id,measurements:[{id:uid('measurement'),at:'2026-11-04',buildId:build.id,reference:true,values:{critChance:83.2,cdr:76.6,armor:9416,mr:2909,as:1.2,mana:130,stormCost:21},notes:'旧装備のAura発動中の会話上の記録。現在構成の確定値ではない。'}]};}
window.DBP={paragonStats,paragonAllocation,slots,affixes,rules,definitions,gems,gemSocketLimits,gemSocketGroup,gemEffect,makeSeed,uid,limits:{critChance:85,critRed:100,dodge:85,cdr:80,mcr:85},version:'black-mist-affixes-2026-11-06'};
})();
