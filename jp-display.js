/* Japanese presentation terminology for Deskrawl Build Planner.
 * Non-official Japanese reference:
 * deskrawl-db.vercel.app/stats /abilities /armor /runes /minions /talents.
 * All identifiers, rarity enums, numeric stats and cloud payloads remain intact.
 */
(function(){'use strict';
const D=window.DBP,C=window.DBPCalc,T=window.DBPTalents,B=window.DBPCombat,R=window.DBPRunes,P=window.DBPPets;
const skills={
 fireBall:'ファイアボール',iceShards:'氷の破片',electrocute:'感電',flameLightning:'炎雷',
 flameLightningFire:'炎雷',flameLightningLightning:'炎雷',
 flameBreath:'烈焰吐息',iceMeteor:'アイスメテオ',lightningStorm:'ライトニングストーム',
 frostBeam:'フロストビーム',iceNova:'アイスノヴァ',fireElemental:'ファイアエレメンタル',
 iceBlock:'アイスブロック',fireMeteor:'ファイアメテオ',lightningCloud:'サンダークラウド',flameAura:'フレイムオーラ'
};
const names={
 grandmother:'グランドマザー',iron:'鉄の暴君の兜',schrodinger:'シュレーディンガーの指輪',
 sage:'古の賢者の遺骨',prism:'プリズムの心臓',shoulder:'エレメンタルバーストのポールドロン',
 unyielding:'不屈の胸当て',gauntlets:'ストームコーラーのガントレット',
 bottomless:'底なしポーションベルト',greaves:'秘術の刃のグリーヴ',windcaller:'ウィンドコーラーのブーツ'
};
const setNames={stormcaller:'嵐呼び',frozenBarrage:'氷結弾幕',infernalCovenant:'炎獄の契約'};
const pets={
 'armored-horse':'鎧馬','tidewrath-crab-king':'怒濤の蟹王','ancient-shellwarden':'古代の甲羅守護者',
 'ancient-oak-treant':'古代の樫の木の樹人','blue-mammoth':'青いマンモス','dark-elf-mage':'ダークエルフの魔導士',
 'defiled-wyrm':'汚された古竜','bone-reaper':'骨の死神','sandstorm-harpy-queen':'砂嵐のハーピー女王',
 'dread-sand-manticore':'戦慄の砂マンティコア','flying-fish-king':'トビウオ王','venom-queen':'毒の女王',
 ogre:'オーガ',raptor:'ラプトル','redrock-lord':'赤岩の領主',
 'serparmat-the-devourer':'貪食のセルパルマト','lord-of-the-crimson-vale':'深紅の谷の主',
 'goblin-giant':'ゴブリンの巨人','frost-dragon':'フロストドラゴン','ice-hound':'アイスハウンド',
 'lord-of-the-cinder':'灰燼の主',emberfang:'燼牙','bloodmoon-werewolf':'血月の狼男',
 'pumpkin-king':'パンプキンキング','shoal-naga':'浅瀬のナーガ','brinescale-serpent':'塩鱗の大蛇',
 'dark-horse':'黒馬','undead-axemaster':'アンデッドの斧使い','keep-succubus':'城塞のサキュバス',
 'dune-eagle':'砂丘の鷲','orc-fighter':'オークの闘士','fae-dragon':'妖精竜',
 'ice-rock-elemental':'氷岩のエレメンタル','frost-whelp':'フロストドラゴンの幼体',
 'tazan-camel':'タザンのラクダ',cinderlash:'燼鞭の魔',hellguard:'獄炎の番兵',
 'magma-golem':'マグマゴーレム','white-horse':'白馬','mutating-wolf':'変異する狼',
 'driftshell-hermit-crab':'漂流殻のヤドカリ','reef-squid':'岩礁イカ',boar:'イノシシ',
 'chestnut-pony':'栗毛のポニー','oakback-pack-bull':'樫背の荷牛','defiled-ooze':'汚された粘体',
 'carrion-scarab':'屍肉スカラベ','sand-kobold-thief':'砂のコボルト盗賊',
 'sand-kobold-warrior':'砂のコボルト戦士','sand-wasp':'砂のスズメバチ',
 'goblin-warrior':'ゴブリン戦士','venomous-spider':'毒蜘蛛',
 'barrens-crocodile':'不毛の地のワニ','scorched-imp':'焼け焦げたインプ',
 'redrock-golem':'赤岩ゴーレム','barrens-satyr':'不毛の地のサテュロス',
 'grizzly-bear':'ハイイログマ','crimson-guardian':'深紅の守護者','mountain-tiger':'山虎',
 'skeleton-archer':'スケルトンアーチャー','skeleton-warrior':'スケルトンウォリアー',
 'frost-slime':'フロストスライム','frozen-zombie-warrior':'凍てついたゾンビ戦士',
 'black-spider':'黒蜘蛛',stumplin:'切り株の魔物','ember-bat':'熾火コウモリ',
 'grey-forest-wolf':'灰色の森狼','brown-horse':'茶色の馬'
};
// Japanese equipment display names. Keys are original English source names,
// while saved definition IDs and cloud records remain unchanged.
// Japanese reference: https://deskrawl-db.vercel.app/armor and /weapons.
// 2026-11-12 items absent from the reference are explicitly marked provisional.
const equipmentNamesJP={
 "The Grandmother": "グランドマザー",
 "Iron Tyrant’s Helm": "鉄の暴君の兜",
 "Iron Tyrant's Helm": "鉄の暴君の兜",
 "Schrödinger’s Ring": "シュレーディンガーの指輪",
 "Schrödinger's Ring": "シュレーディンガーの指輪",
 "Remnant of the Elder Sage": "古の賢者の遺骨",
 "Prismatic Heart": "プリズムの心臓",
 "Elemental Burst Pauldron": "エレメンタルバーストのポールドロン",
 "Unyielding Cuirass": "不屈の胸当て",
 "Stormcaller Gauntlets": "ストームコーラーのガントレット",
 "Bottomless Potion Belt": "底なしポーションベルト",
 "Greaves of the Arcane Edge": "秘術の刃のグリーヴ",
 "Boots of the Windcaller": "ウィンドコーラーのブーツ",
 "Staff of the Frostwyrm": "フロストワームの杖",
 "Hellstorm Mace": "ヘルストームのメイス",
 "Amber Skull Staff": "琥珀髑髏の杖",
 "Serrated Greatsword of Agony": "苦痛の鋸刃大剣",
 "Crown of the Fallen King": "堕ちた王の王冠",
 "Circlet of Focus": "集中のサークレット",
 "Reaper's Pauldron": "死神の肩当て",
 "Shell Spike Pauldron": "シェルスパイクのポールドロン",
 "Venomfrost Pauldron": "毒霜の肩甲",
 "Thornheart Cuirass": "茨心の胸甲",
 "Runeward Vestment": "ルーンウォードの法衣",
 "Unstoppable Gauntlets": "アンストッパブル・ガントレット",
 "Festering Gauntlets": "膿む篭手",
 "Gauntlets of the Third Beat": "三拍子の篭手",
 "Endless Mana Belt": "無尽マナベルト",
 "Battle Draught Belt": "戦いの秘薬のベルト",
 "Greaves of the Stalwart Tonic": "剛健の強壮薬のグリーヴ",
 "Manaflow Greaves": "魔力の流れのグリーヴ",
 "Stoneguard Greaves": "岩守の脚甲",
 "Boots of the Mending Stride": "癒しの歩みのブーツ",
 "Blooddistiller’s Stride": "血の蒸留師の歩み",
 "Blooddistiller's Stride": "血の蒸留師の歩み",
 "Rimeguard Treads": "霜守りのブーツ",
 "Pendant of the Surging Mind": "迸る精神のペンダント",
 "Fire Lord's Necklace": "炎帝のネックレス",
 "Stormguard Necklace": "嵐の守護者のネックレス",
 "Pendant of Vigor": "活力のペンダント",
 "Ring of Dragonslayer": "竜殺しの指輪",
 "Ring of the Fourth Flame": "第四の炎の指輪",
 "Charged Ring": "充填の指輪",
 "Cryofracture Ring": "氷砕の指輪",
 "Ring of Revelation": "啓示のリング",
 "Glorious Gladiator Helmet": "栄光の剣闘士の兜",
 "Visage of the Undying": "不死者の面貌",
 "Soulrender": "ソウルレンダー",
 "Ring of Momentum": "勢いの指輪（仮訳）",
 "Rimebound Grasp": "霜縛りの手甲",
 "Glacial Aegis": "氷河の守り"
};
const itemEffectTranslations=[["Healthy","健康な状態"],["Injured","負傷した状態"],["Thorns","棘"],["Numbing Cold","凍える寒さ"],["Brittle","脆化"],["Pyroblast","パイロブラスト"],["Soul Impact","ソウルインパクト"],["Crit","クリティカル"],["tick","ヒット"],["Armor","アーマー"],["HPポーション","ライフポーション"],["Frozen","凍結"]];
const talents={
 arcaneInsight:'秘術の洞察',searingEdge:'灼熱の刃',frostArmor:'氷の鎧',arcaneReach:'秘術の射程',
 manaFlow:'マナの奔流',flameWard:'炎の守り',manaConduit:'マナ導管',frostMastery:'冷気の熟達',
 stormExecutioner:'嵐の処刑者',manaRegeneration:'マナ回復',arcaneMomentum:'秘術の勢い',
 immolation:'焼却',coldRetribution:'冷気の報復',thunderstruck:'感電麻痺',
 flameBreathCrit:'烈焰吐息強化：クリティカルダメージ',elementalFury:'精霊の怒り',
 frostAlacrity:'氷の敏捷',deepChill:'深き冷気',electricalShield:'電気の盾',
 arcaneReservoir:'秘術の貯蔵',conflagration:'大火',iceMeteorCost:'アイスメテオ強化：マナ消費',
 iceShardsDamage:'氷の破片強化：ダメージ',stormMastery:'嵐の熟練',ignite:'発火',
 flashFreeze:'瞬間凍結',staticCharge:'静電チャージ',cataclysm:'大災害',
 frozenReservoir:'氷結の貯蓄',permafrost:'永久凍土',frozenRenewal:'氷結再生',
 electrocuteMana:'感電：マナ獲得強化',plasmaConduction:'プラズマ伝導',auraWard:'炎の加護',
 frostBeamExpansion:'フロストビーム拡張',currentTransfer:'電流伝播',lingeringStorm:'持続する嵐',
 arcaneExposure:'魔力露出',combustion:'爆燃',shatteringIce:'砕氷',stormConduit:'嵐の導体'
};
const stat={
 weaponDamage:'武器ダメージ',weaponSpeed:'武器速度',weaponDps:'武器の基本DPS',
 str:'力',dex:'敏捷',int:'知力',damage:'ダメージ（固定加算）',
 critChance:'クリティカル率',critDamage:'クリティカルダメージ',
 critRed:'クリティカルダメージ軽減',as:'攻撃速度ボーナス',
 basicAttack:'基本攻撃ダメージ',strongAttack:'強攻撃ダメージ',specialDamage:'特殊アビリティボーナスダメージ',
 armor:'アーマー',armorBonus:'ボーナスアーマー',bonusArmor:'ボーナスアーマー',
 mr:'魔法耐性',bonusMR:'ボーナス魔法耐性',maxHP:'最大HP',bonusHP:'ボーナスHP',dodge:'回避率',
 cdr:'クールダウン短縮',mcr:'マナコスト削減',mana:'最大マナ',manaBonus:'最大マナボーナス',
 manaRegen:'マナ回復',manaKill:'撃殺時マナ回復',move:'ボーナス移動速度',
 loh:'命中時ライフ回復',lohBonus:'命中時ライフ回復ボーナス',
 lifeKill:'撃殺時ライフ回復',regen:'ライフ回復',regenBonus:'ライフ回復ボーナス',
 goldFind:'ゴールド発見',itemFind:'アイテム発見',potionFind:'ライフポーション発見',
 materialFind:'素材発見',xp:'獲得経験値',potionCharges:'追加ポーションチャージ',
 fire:'炎ダメージ',cold:'冷気ダメージ',lightning:'雷ダメージ',poison:'毒ダメージ',
 physical:'物理ダメージ',arcane:'アルケインダメージ',allDamage:'全ダメージボーナス',
 healthy:'健康な敵へのダメージ',injured:'負傷した敵へのダメージ',
 slowed:'減速中の敵へのダメージ',immobilized:'移動不能の敵へのダメージ',
 stunned:'スタン中の敵へのダメージ',bleeding:'出血中の敵へのダメージ',
 poisoned:'毒状態の敵へのダメージ',burned:'燃焼中の敵へのダメージ',
 vulnerable:'脆弱な敵へのダメージ',elite:'エリートへのダメージ',
 distant:'遠距離の敵へのダメージ',dot:'継続ダメージ',
 physicalDR:'物理ダメージ軽減',fireDR:'炎ダメージ軽減',coldDR:'冷気ダメージ軽減',
 lightningDR:'雷ダメージ軽減',poisonDR:'毒ダメージ軽減',arcaneDR:'アルケインダメージ軽減',
 allDR:'ダメージ軽減',flatDR:'固定ダメージ軽減',thorns:'棘',
 thornsBonus:'棘ダメージボーナス',healingReceived:'受ける回復量ボーナス',strBonus:'力ボーナス',
 abilityLevels:'全スキルレベル',
 basicCritChance:'基本攻撃のクリティカル率',basicRange:'基本攻撃の射程',basicManaGain:'基本攻撃のマナ獲得',
 frostCdr:'冷気スキルのクールダウン短縮',flameBreathCritDamage:'烈焰吐息のクリティカルダメージ',
 fireElementalAs:'ファイアエレメンタルの攻撃速度',chillPotency:'冷気の効果',
 iceMeteorMcr:'アイスメテオのマナコスト削減',iceShardsDamage:'氷の破片のダメージ',
 lightningAbilityCritDamage:'雷スキルのクリティカルダメージ',
 fireMeteorDamage:'ファイアメテオのダメージ',fireMeteorCooldownPenalty:'ファイアメテオのクールダウン増加',
 frozenDuration:'凍結の持続時間',iceBlockHeal:'アイスブロック中のライフ回復',
 electrocuteManaGain:'感電のマナ獲得',flameLightningBurned:'炎雷の対燃焼ダメージ',
 flameLightningElectrostatic:'炎雷の対静電気ダメージ',frostBeamSize:'フロストビームの範囲',
 electrostaticSpreadChance:'静電気の伝搬確率',lightningCloudDuration:'サンダークラウドの持続時間',
 frozenCritChance:'凍結中の敵へのクリティカル率',frozenCritDamage:'凍結中の敵へのクリティカルダメージ',
 lightningStormDamage:'ライトニングストームのダメージ',
 skillCritDamage:'対象スキルのクリティカルダメージ',
 elementalSkillCritBonus:'属性スキル固有クリティカル補正',
 lightningStormCritBonus:'ライトニングストームのクリティカル補正',
 independentDamageBonus:'装備固有の独立ダメージ倍率',
 temporaryInvulnerable:'無敵状態（参考）',activeConditionalDamage:'成立中の条件付きダメージ'
};
const rarityJP={Divine:'ディバイン',Legendary:'レジェンダリー',Rare:'レア',Uncommon:'アンコモン',Common:'コモン','Black Mist':'ブラックミスト'};
const pairs=[
 ["Iron Tyrant's Helm",'鉄の暴君の兜'],['Iron Tyrant’s Helm','鉄の暴君の兜'],
 ["Schrödinger's Ring",'シュレーディンガーの指輪'],['Schrödinger’s Ring','シュレーディンガーの指輪'],
 ['Remnant of the Elder Sage','古の賢者の遺骨'],['The Grandmother','グランドマザー'],
 ['Prismatic Heart','プリズムの心臓'],['Elemental Burst Pauldron','エレメンタルバーストのポールドロン'],
 ['Greaves of the Arcane Edge','秘術の刃のグリーヴ'],['Stormcaller Gauntlets','ストームコーラーのガントレット'],
 ['Bottomless Potion Belt','底なしポーションベルト'],['Unyielding Cuirass','不屈の胸当て'],
 ['Boots of the Windcaller','ウィンドコーラーのブーツ'],
 ['INT由来MR','知力による魔法耐性'],['INT由来','知力による'],
 ['Bonus All Damage','全ダメージボーナス'],['Crit補正','クリティカル補正'],
 ['HP自然回復','ライフ回復'],['Poison Damage','毒ダメージ'],
 ['Fire Damage','炎ダメージ'],['Attack Speed','攻撃速度'],['Strength','力'],
 ['Vitality','生命力'],['Gold Increase','ゴールド増加'],
 ['Saddle of the Golden Khan','黄金のハーンの鞍'],['Fine Saddle','上質な鞍'],
 ['Golden Horseshoe','黄金の蹄鉄'],['Iron Barding','鉄の馬鎧'],
 ['Lightning Storm','ライトニングストーム'],['Flame Lightning','炎雷'],['Lightning Cloud','サンダークラウド'],
 ['Ice Shards','氷の破片'],['Ice Meteor','アイスメテオ'],['Ice Nova','アイスノヴァ'],
 ['Ice Block','アイスブロック'],['Fire Elemental','ファイアエレメンタル'],
 ['Fire Meteor','ファイアメテオ'],['Flame Breath','烈焰吐息'],['Frost Beam','フロストビーム'],
 ['Flame Aura','フレイムオーラ'],['Fire Ball','ファイアボール'],['Electrocute','感電'],
 ['Frozen Barrage','氷結弾幕'],['Infernal Covenant','炎獄の契約'],['Stormcaller','嵐呼び'],
 ['Critical Damage Reduction','クリティカルダメージ軽減'],
 ['Critical Damage','クリティカルダメージ'],['Critical Chance','クリティカル率'],
 ['Critダメージ','クリティカルダメージ'],['Crit率','クリティカル率'],
 ['Magic Resist','魔法耐性'],['Bonus Armor','ボーナスアーマー'],['Bonus MR','ボーナス魔法耐性'],
 ['Bonus HP','ボーナスHP'],['Life on Hit','命中時ライフ回復'],
 ['Life On Hit','命中時ライフ回復'],['Life on Kill','撃殺時ライフ回復'],
 ['Mana on Kill','撃殺時マナ回復'],['Mana Regeneration','マナ回復'],['Mana Regen','マナ回復'],
 ['Gold Find','ゴールド発見'],['Item Find','アイテム発見'],
 ['Short Stun','短時間スタン'],['Electrostatic','静電気'],['Frozen','凍結'],['Chill','冷気'],
 ['Dodge','回避率'],['CDR','クールダウン短縮'],['MCR','マナコスト削減'],['LoH','命中時ライフ回復'],
 ['BonusMS','ボーナス移動速度'],['ボーナスMS','ボーナス移動速度'],
 ['ASボーナス','攻撃速度ボーナス'],['Aura','オーラ'],['DoT','継続ダメージ'],
 ['Black Mist','ブラックミスト'],['Legendary','レジェンダリー'],
 ['Divine','ディバイン'],['Rare','レア'],['Uncommon','アンコモン'],['Common','コモン'],
 ['Armor','アーマー'],['Mana','マナ'],
 ['Capstone','キャップストーン'],['Strong Attack','強攻撃'],['Basic Attack','基本攻撃'],
 ['Special Attack','特殊攻撃'],['Elite/Boss','エリート・ボス']
].sort((a,b)=>b[0].length-a[0].length);
function text(value){if(typeof value!=='string')return value;let s=value;
 for(const [english,jp] of pairs) s=s.split(english).join(jp);
 for(const [english,jp] of itemEffectTranslations) s=s.split(english).join(jp);
 return s;}
function rarity(value){return rarityJP[value]||value;}
Object.assign(C.labels,stat);
for(const [key,info] of Object.entries(D.affixes))if(Array.isArray(info))info[0]=stat[key]||text(info[0]);
for(const p of D.paragonStats)p.label=stat[p.stat]||text(p.label);
for(const d of D.definitions){
 // Translate catalog copies, mirrored rings and Ancient variants as well as the
 // original named definitions. Do not translate an ID, slot or saved nickname.
 const originalName=d.name;
 const sourceName=originalName.replace(/\s*\(Ancient\)$/, '').replace(/（部位未確認）$/, '');
 const translated=names[d.id]||equipmentNamesJP[sourceName];
 if(translated){
   d.name=translated+(d.isAncient?'（エンシャント）':'')+
     (d.slotUnverified?'（部位未確認・仮訳）':'');
 }else{
   d.name=text(originalName.replace(/\s*\(Ancient\)$/, ''))+(d.isAncient?'（エンシャント）':'');
 }
 if(d.effect)d.effect=text(d.effect);
}
for(const [id,arr] of Object.entries(B.abilities))if(skills[id]){
 const suffix=id==='flameLightningFire'?'（炎成分）':id==='flameLightningLightning'?'（雷成分）':
 ['fireBall','flameBreath','fireElemental','fireMeteor'].includes(id)?'（炎）':
 ['iceShards','iceMeteor','frostBeam','iceNova','iceBlock'].includes(id)?'（冷気）':
 ['electrocute','lightningStorm','lightningCloud'].includes(id)?'（雷）':'';
 arr[0]=skills[id]+suffix;
}
for(const pair of B.skillOptions)if(B.abilities[pair[0]])pair[1]=B.abilities[pair[0]][0];
if(T)for(const def of T.defs){if(talents[def.id])def.name=talents[def.id];
 def.description=text(def.description);for(const effect of def.effects)if(effect.label)effect.label=text(effect.label);}
if(R){
 for(const [id,set] of Object.entries(R.sets)){set.name=setNames[id]||set.name;for(const bonus of Object.values(set.bonuses))bonus.label=text(bonus.label);}
 for(const rune of Object.values(R.catalog))
  rune.name=rune.rarity==='set'?(R.sets[rune.set]?.name||rune.set)+'のルーン ('+['I','II','III','IV','V','VI'][rune.piece-1]+')':
  (skills[rune.skill]||rune.name)+'のルーン（大いなる）';
 Object.assign(R.statLabels,{bonusHP:'ボーナスHP',mana:'最大マナ',bonusArmor:'ボーナスアーマー',bonusMR:'ボーナス魔法耐性',
 move:'移動速度',potionFind:'ライフポーション発見',strongAttack:'強攻撃ダメージ',
 healthy:'健康な敵へのダメージ',basicAttack:'基本攻撃ダメージ',as:'攻撃速度ボーナス',
 loh:'命中時ライフ回復',slowed:'減速中の敵へのダメージ',burned:'燃焼中の敵へのダメージ'});
}
if(P){
 const passiveJP={
 'ocean-s-providence':'大海の恩寵',
 'ocean-providence':'大海の恩寵',
 'damage-to-slowed-ii':'減速中の敵へのダメージ II',
 'poison-damage-iii':'毒ダメージ III',
 'damage-to-stunned-iii':'スタン中の敵へのダメージ III',
 'strong-attack-iii':'強攻撃ダメージ III',
 'damage-to-bleeding-iii':'出血中の敵へのダメージ III',
 'damage-to-injured-iii':'負傷した敵へのダメージ III',
 'dodge-ii':'回避 II','strength-i':'力 I','vitality-i':'生命力 I',
 'damage-to-bleeding-ii':'出血中の敵へのダメージ II',
 'damage-to-poisoned-i':'毒状態の敵へのダメージ I',
 'gold-increase-i':'ゴールド増加 I',
 'damage-to-injured-ii':'負傷した敵へのダメージ II',
 'fire-damage-ii':'炎ダメージ II',
 'basic-attack-damage-ii':'基本攻撃ダメージ II',
 'critical-hit-chance-i':'クリティカル率 I',
 'poison-damage-i':'毒ダメージ I',
 'attack-speed-i':'攻撃速度 I',
 'thorn-i':'棘 I','physical-damage-i':'物理ダメージ I',
 'life-on-hit-i':'命中時ライフ回復 I','mana-i':'マナ I',
 'fast-travel-iii':'高速移動 III','fast-travel-ii':'高速移動 II','fast-travel-i':'高速移動 I',
 'massive-crab-claws':'巨大なカニのハサミ','thicker-shell':'より厚い甲羅','heatproof-shell':'耐火の甲羅',
 'thick-skin-iii':'厚い皮膚 III','thick-skin-ii':'厚い皮膚 II','thick-skin-i':'厚い皮膚 I',
 'turtle-speed':'亀の歩み','health-increase':'HP増加','mana-increase':'マナ増加',
 witchfire:'魔女の炎','arcane-affinity':'アルケイン親和性',
 'everliving-blood':'不死の血','sepulchral-scales':'墓所の鱗',
 'storm-of-souls':'魂の嵐','serrated-talons':'鋸歯の鉤爪','keen-instinct':'鋭い本能',
 'killing-precision':'致命の精度','mana-regen':'マナ回復','venom-ward':'毒の守り',
 'iron-hide':'鉄の皮膚','devourers-feast':'貪食者の宴','crimson-dominion':'緋紅の支配',
 'goblin-hoard':'ゴブリンの財宝','frozen-reach':'氷霜の射程',
 thunderfang:'雷の牙',frostclaw:'霜の爪','cinder-sovereign':'燼の君主',
 'tyrants-bane':'暴君の災い','bloodthirst-i':'血の渇き I','savage-strikes':'獰猛な一撃',
 'frost-tongue':'氷結の舌','grave-cleaver':'墓場の大斧','beguiling-whisper':'惑わしの囁き',
 'arcane-wing':'アルケインの翼','grounded-core':'接地の核','runic-ward':'ルーンの加護',
 'budding-sorcery':'芽吹く魔術','caravan-bearer':'隊商の運び手','lash-of-cinders':'燼の鞭',
 'infernal-bulwark':'獄炎の防壁','molten-core':'溶融の核','thick-shell':'厚い甲羅',
 'ink-siphon':'墨の吸収','viscous-hide':'粘性の外皮',gravedigger:'墓掘り',
 'deep-slumber':'深い眠り',stoneheart:'石の心',ambush:'待ち伏せ',
 'reconstituting-gel':'再生ジェル','frozen-might':'凍てつく力',
 'cinder-hide':'燼の皮','critical-damage-reduction':'クリティカルダメージ軽減'
 };
 const abilityJP={
 'mana-monsoon':'マナモンスーン','ashen-wrath':'燼の憤怒',
 'soul-arc':'魂の電弧',tailwind:'追い風','manticora-sting':'マンティコアの針',
 'mana-injection':'マナ注入','power-of-redrock-lord':'赤岩の領主の力',
 'earth-spikes':'大地の棘','club-smash':'棍棒たたきつけ','glacial-shard':'氷河の欠片',
 'capacitor-shell':'蓄電甲殻','ember-breath':'燼のブレス','bloodmoon-howl':'ブラッドムーンハウル',
 'harvest-fury':'収穫の怒り','brine-spit':'ブラインスピット','healing-spirit':'癒しの精霊'
 };
 for(const p of P.minions){if(pets[p.id])p.name=pets[p.id];
  for(const v of p.passives){
   const translated=passiveJP[v.id]||text(v.label);
   const trailing=String(v.label).match(/ (I|II|III)$/)?.[1]||'';
   v.label=/[A-Za-z]{2,}/.test(translated)?(stat[v.stat]||text(v.label))+(trailing?' '+trailing:''):translated;
  }
  for(const v of p.abilities){v.label=abilityJP[v.id]||text(v.label);v.at10=text(v.at10);}
 }
 const gearNames={'fine-saddle':'上質な鞍','golden-horseshoe':'黄金の蹄鉄','iron-barding':'鉄の馬鎧',
 'saddle-of-the-golden-khan':'黄金のハーンの鞍（ブラックミスト）',
 'saddle-of-the-golden-khan-normal':'黄金のハーンの鞍（通常レジェンダリー）'};
 for(const g of P.gearTypes)if(gearNames[g.id])g.name=gearNames[g.id];
}
window.DBPJP={text,rarity,stat,skills,names,setNames,pets,talents};
})();
