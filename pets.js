/* Deskrawl v1.1.0 minions, passive +0/+10 and pet gear. 
 * Sources: https://wikily.gg/deskrawl/minions/ and individual /minions/{slug}/
 *          https://wikily.gg/deskrawl/minions/progression/
 *          https://wikily.gg/deskrawl/equipment/saddle-of-the-golden-khan
 * Active minion, equipment and inherited ability all have separate unlock gates.
 */ 
(function(){'use strict';
const legend=[["armored-horse","Armored Horse",[["fast-travel-iii","Fast Travel III","move",15,30],["thick-skin-i","Thick Skin I","bonusArmor",5,10]]],["tidewrath-crab-king","Tidewrath Crab King",[["massive-crab-claws","Massive Crab Claws","critDamage",40,80],["thicker-shell","Thicker Shell","coldDR",20,40],["heatproof-shell","Heatproof Shell","fireDR",20,40]]],["ancient-shellwarden","Ancient Shellwarden",[["thick-skin-iii","Thick Skin III","bonusArmor",35,70],["turtle-speed","Turtle Speed","move",-10,0]],[["brine-spit","Brine Spit","Chill付与（CD 6秒）"]]],["ancient-oak-treant","Ancient Oak Treant",[["health-increase","Health Increase","bonusHP",20,40]],[["healing-spirit","Healing Spirit","最大HPの30%回復（CD 8秒）"]]],["blue-mammoth","Blue Mammoth",[["thick-skin-iii","Thick Skin III","bonusArmor",15,30],["fast-travel-i","Fast Travel I","move",5,10]]],["dark-elf-mage","Dark Elf Mage",[["mana-increase","Mana Increase","manaBonus",50,75],["witchfire","Witchfire","fire",30,60],["arcane-affinity","Arcane Affinity","arcane",30,60]]],["defiled-wyrm","Defiled Wyrm",[["everliving-blood","Everliving Blood","regenBonus",100,150],["sepulchral-scales","Sepulchral Scales","bonusMR",100,150]]],["bone-reaper","Bone Reaper",[["storm-of-souls","Storm of Souls","lightning",30,60]],[["soul-arc","Soul Arc","雷攻撃・Electrostatic付与（CD 6秒）"]]],["sandstorm-harpy-queen","Sandstorm Harpy Queen",[["damage-to-slowed-ii","Damage to Slowed II","slowed",30,60]],[["tailwind","Tailwind","移動速度+45%、5秒（CD 10秒）"]]],["dread-sand-manticore","Dread Sand Manticore",[["poison-damage-iii","Poison Damage III","poison",30,60]],[["manticora-sting","Manticora Sting","毒＋Poisoned付与（CD 1.5秒）"]]],["flying-fish-king","Flying Fish King",[["oceans-providence","Ocean's Providence","mcr",10,15]],[["mana-monsoon","Mana Monsoon","マナ回復+40/秒、5秒間（CD 14秒）"]]],["venom-queen","Venom Queen",[["venom-ward","Venom Ward","poisonDR",40,80]],[["mana-injection","Mana Injection","最大マナの25%回復（CD 8秒）"]]],["ogre","Ogre",[["damage-to-stunned-iii","Damage to Stunned III","stunned",40,80],["iron-hide","Iron Hide","physicalDR",15,30]]],["raptor","Raptor",[["serrated-talons","Serrated Talons","dot",30,60],["keen-instinct","Keen Instinct","critChance",3,6],["killing-precision","Killing Precision","critDamage",25,50]]],["redrock-lord","Redrock Lord",[["strong-attack-iii","Strong Attack Damage III","strongAttack",30,60]],[["power-of-redrock-lord","Power of Redrock Lord","物理ダメージ+100%、6秒（CD 12秒）"]]],["serparmat-the-devourer","Serparmat the Devourer",[["damage-to-bleeding-iii","Damage to Bleeding III","bleeding",40,80],["devourers-feast","Devourer's Feast","lifeKill",30,60]]],["lord-of-the-crimson-vale","Lord of the Crimson Vale",[["crimson-dominion","Crimson Dominion","vulnerable",30,60]],[["earth-spikes","Earth Spikes","脆弱付与（CD 9秒）"]]],["goblin-giant","Goblin Giant",[["goblin-hoard","Goblin Hoard","goldFind",40,80]],[["club-smash","Club Smash","近接Stun（CD 5秒）"]]],["frost-dragon","Frost Dragon",[["frozen-reach","Frozen Reach","distant",40,80]],[["glacial-shard","Glacial Shard","冷気攻撃+Freeze確率50%（CD 4秒）"]]],["ice-hound","Ice Hound",[["thunderfang","Thunderfang","lightning",30,60],["frostclaw","Frostclaw","cold",30,60]],[["capacitor-shell","Capacitor Shell","最大HP25%シールド＋終了時Stun（CD 16秒）"]]],["lord-of-the-cinder","Lord of the Cinder",[["cinder-sovereign","Cinder Sovereign","cdr",12,20]],[["ashen-wrath","Ashen Wrath","クリティカルダメージ+175%、5秒（CD 10秒）"]]],["emberfang","Emberfang",[["tyrants-bane","Tyrant's Bane","elite",30,60]],[["ember-breath","Ember Breath","炎ダメージ250%・Burn付与（CD 2秒）"]]],["bloodmoon-werewolf","Bloodmoon Werewolf",[["bloodthirst-i","Bloodthirst I","lohBonus",10,20],["savage-strikes","Savage Strikes","basicAttack",15,30]],[["bloodmoon-howl","Bloodmoon Howl","攻撃速度+45%、5秒（CD 8秒）"]]],["pumpkin-king","Pumpkin King",[["damage-to-injured-iii","Damage to Injured III","injured",50,100]],[["harvest-fury","Harvest Fury","全ダメージ+75%、回復被量-5%、6秒（CD 12秒）"]]]];
const minions=legend.map(([id,name,passives,abilities=[]])=>({id,name,rarity:'Legendary',passives:passives.map(([key,label,stat,base,max])=>({id:key,label,stat,base,max})),abilities:abilities.map(([id,label,at10])=>({id,label,at10})),sourceUrl:'https://wikily.gg/deskrawl/minions/'+id+'/'}));
const gearTypes=[
 {id:'',name:'装備なし',rarity:null,slots:0},
 {id:'fine-saddle',name:'Fine Saddle',rarity:'Rare',slots:2},
 {id:'golden-horseshoe',name:'Golden Horseshoe',rarity:'Rare',slots:2},
 {id:'iron-barding',name:'Iron Barding',rarity:'Rare',slots:2},
 {id:'saddle-of-the-golden-khan',name:'Saddle of the Golden Khan',rarity:'Legendary',slots:3}
];
// Pet equipment uses a single combined Sorcerer affix pool, not the hero-slot
// primary/secondary distinctions. No sockets and no item upgrades.
const gearAffixes=['damage','critDamage','as','basicAttack','strongAttack','specialDamage','healthy','injured','slowed','immobilized','elite','vulnerable','maxHP','mana','cdr','armor','mr','dodge','armorBonus','lightningDR','arcaneDR','thorns','bonusHP','physicalDR','coldDR','poisonDR','mcr','fireDR','critRed','potionCharges','critChance','allDamage','int','fire','cold','lightning','distant','dot','burned'];
const max850={
  int:78,mana:78,damage:47,critDamage:93.8,as:23.5,
  basicAttack:109.5,strongAttack:109.5,specialDamage:125.1,fire:125.1,cold:125.1,lightning:125.1,
  healthy:156.4,injured:156.4,slowed:156.4,immobilized:156.4,elite:156.4,vulnerable:156.4,
  distant:156.4,dot:156.4,burned:156.4,maxHP:704,cdr:15.6,lightningDR:15.6,arcaneDR:15.6,
  physicalDR:15.6,coldDR:15.6,poisonDR:15.6,mcr:15.6,fireDR:15.6,armor:782,mr:782,
  dodge:7.8,armorBonus:31.3,thorns:156,bonusHP:31.3,critRed:31.3,potionCharges:1,
  critChance:12.5,allDamage:62.6
};
const rare850Max={
  int:73,mana:73,damage:44,critDamage:88,as:22,basicAttack:102.6,strongAttack:102.6,specialDamage:117.3,
  fire:117.3,cold:117.3,lightning:117.3,healthy:146.6,injured:146.6,slowed:146.6,immobilized:146.6,
  elite:146.6,vulnerable:146.6,distant:146.6,dot:146.6,burned:146.6,maxHP:660,cdr:14.7,
  lightningDR:14.7,arcaneDR:14.7,physicalDR:14.7,coldDR:14.7,poisonDR:14.7,mcr:14.7,
  fireDR:14.7,armor:733,mr:733,dodge:7.3,armorBonus:29.3,thorns:147,bonusHP:29.3,critRed:29.3,
  potionCharges:1,critChance:11.7,allDamage:58.6
};
const legacyIds={wyrm:'defiled-wyrm',emberfang:'emberfang',naga:'shoal-naga',raptor:'raptor'};
function lookup(id){return minions.find(x=>x.id===(legacyIds[id]||id))||null;}
function skill(petId,skillId){const pet=lookup(petId);if(!pet)return null;const p=pet.passives.find(x=>x.id===skillId);if(p)return {...p,kind:'passive',petId:pet.id};const a=pet.abilities.find(x=>x.id===skillId);if(a)return {...a,kind:'active',petId:pet.id};return null;}
window.DBPPets={minions,gearTypes,gearAffixes,max850,rare850Max,lookup,skill,legacyIds,version:'minions-v1.1.0'};
})();