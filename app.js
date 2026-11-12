(function(){'use strict';
const D=window.DBP,C=window.DBPCalc;
const PU=window.DBPPetUI||null;
const LS='deskrawl_planner_v01',CFG='deskrawl_planner_cloud_v01',SESSION='deskrawl_planner_session_v01';
let state;try{const raw=localStorage.getItem(LS);state=raw?JSON.parse(raw):D.makeSeed();if(!state||state.schemaVersion!==1)throw Error('Invalid saved schema');}catch(e){state=D.makeSeed()}
let ui={tab:'equipment',slot:'chest',itemId:null,detail:'edit',compareMode:'equal',equalLevel:10,selectedStat:'mr',optimizerPosition:'primary:0',optimizerSelected:'',settingsOpen:false,settingsTab:'paragon',combatSkillsOpen:true,talentSelected:'arcaneInsight',modal:'',mobileDetails:false,compareBuildId:'',rankingBoardId:'',rankingPreset:'boss',rankingRunId:'',cloudNote:'',status:'local',dirty:false};
let cloudCfg;try{const builtIn=window.DBP_CLOUD_CONFIG;const local=JSON.parse(localStorage.getItem(CFG)||'null');cloudCfg=builtIn?.url&&builtIn?.key?builtIn:local}catch(e){cloudCfg=window.DBP_CLOUD_CONFIG||null}
let session;try{session=JSON.parse(localStorage.getItem(SESSION)||'null')}catch(e){session=null}
let cloudRevision=0,cloudSaveTimer=null,cloudBusy=false,cloudDirty=false,cloudSyncBlocked=false;const app=document.getElementById('app');const toast=document.getElementById('toast');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const E=(v)=>esc(window.DBPJP?.text(v)??v);const opt=(v,label,selected)=>`<option value="${E(v)}" ${String(v)===String(selected)?'selected':''}>${E(label)}</option>`;
const build=()=>state.builds.find(x=>x.id===state.activeBuildId)||state.builds[0];const def=i=>D.definitions.find(x=>x.id===i?.definitionId);const getItem=id=>state.items.find(x=>x.id===id);const equipment=slot=>getItem(build()?.loadout?.[slot]);
const slotLabel=slot=>(D.slots.find(s=>s[0]===slot)||['',slot])[1];
const titleOf=i=>i?(i.nickname||def(i)?.name||'装備名未設定'):'未登録';
const stage=n=>n===11?'開光Ⅰ':n===12?'開光Ⅱ':n===13?'開光Ⅲ':'+'+n;
const countRefs=id=>state.builds.filter(b=>Object.values(b.loadout||{}).includes(id)).length;
const clone=v=>JSON.parse(JSON.stringify(v));
const lockedSets=()=>Array.isArray(state.lockedSets)?state.lockedSets:[];
const selectedLockedSet=()=>lockedSets().find(x=>x.id===ui.selectedSetId)||lockedSets()[0];
const fixedSlots=()=>D.slots.filter(([key])=>equipment(key)?.locked===true).length;
const equippedSlots=()=>D.slots.filter(([key])=>Boolean(equipment(key))).length;
const canSaveLockedSet=()=>D.slots.length===equippedSlots();
const isOpLocked=(it,kind,idx)=>kind==='primary'?Boolean(it?.opLocks?.primary?.[idx]&&it.primary?.[idx]):Boolean(it?.opLocks?.secondary&&it?.secondary);
const lockedOpCount=it=>[0,1,2,3].filter(i=>isOpLocked(it,'primary',i)).length+(isOpLocked(it,'secondary')?1:0);
const qualityOf=code=>code==='actual'?'実測補正':code==='verified'?'公開データ確認済':code==='estimated'?'推定':code==='calculated'?'ルールに基づく計算':'会話履歴・要検証';
function flash(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(flash.timer);flash.timer=setTimeout(()=>toast.classList.remove('show'),3200)}
function validateState(s){if(!s||s.schemaVersion!==1||!Array.isArray(s.items)||!Array.isArray(s.builds)||!s.builds.length)throw Error('データ形式が一致しません');if(s.items.length>10000||s.builds.length>1000||s.rankingBoards!==undefined&&(!Array.isArray(s.rankingBoards)||s.rankingBoards.length>100)||s.rankingRuns!==undefined&&(!Array.isArray(s.rankingRuns)||s.rankingRuns.length>500)||s.lockedSets!==undefined&&(!Array.isArray(s.lockedSets)||s.lockedSets.length>60))throw Error('データ量が大きすぎます');const ids=new Set(s.items.map(i=>i.id));if(ids.size!==s.items.length)throw Error('装備IDが重複しています');return s}
function save(){localStorage.setItem(LS,JSON.stringify(state));cloudDirty=true;ui.dirty=true;ui.status=cloudSyncBlocked?'conflict':session&&cloudCfg?'saving':'local';render();if(session&&cloudCfg&&!cloudSyncBlocked){clearTimeout(cloudSaveTimer);cloudSaveTimer=setTimeout(pushCloud,900)}}
function modify(fn){fn();save()}
function render(){const b=build();if(!b)return;if(ui.tab==='ranking'&&window.DBPRankings&&!window.DBPRankings.boardById(state,ui.rankingBoardId))ui.rankingBoardId=window.DBPRankings.boards(state)[0]?.id||'';app.innerHTML=`<div class="shell"><header class="topbar"><div class="brand"><div class="brand-symbol">✧</div><div><div class="brand-title">DESKRAWL <span>ビルドプランナー</span></div><div class="brand-sub">ソーサラー <span class="dot">·</span> 嵐呼び <span class="dot">·</span> v0.1</div></div></div><div class="header-right"><span class="sync-status ${ui.status}"><i></i>${{local:'ローカル保存',saving:'同期中',synced:'クラウド同期済み',error:'同期失敗',conflict:'競合を検知'}[ui.status]||'ローカル保存'}</span><button class="icon-btn" data-action="backup" title="JSONバックアップ">⇩</button><button class="icon-btn" data-action="import" title="JSONバックアップから復元">⇧</button><button class="icon-btn" data-action="cloud" title="同期・ログイン">☁</button></div></header>
<div class="profile-strip"><div class="profile-control"><span class="field-legend">使用中のビルド</span><select id="buildSelect" class="profile-select">${state.builds.map(x=>opt(x.id,x.name,x.id===b.id?x.id:'' )).join('')}</select></div><div class="profile-buttons"><button class="btn new-build-main" data-action="new-build">＋ 新しい一式を作る</button><button class="text-btn" data-action="duplicate-build" title="装備個体を共有してビルド設定を複製します">参照共有で複製</button><button class="text-btn" data-action="rename-build">名前変更</button><button class="icon-btn subtle" data-action="delete-build" title="ビルド削除">⌫</button><button class="text-btn" data-action="compare-builds">ビルド比較</button><button class="btn outline" data-action="input-review">登録照合</button><button class="btn outline ai-export-open" data-action="ai-export">AI分析用に出力</button></div></div>
${renderLockedSets()}
<nav class="mainnav"><button class="navbtn ${ui.tab==='equipment'?'active':''}" data-action="tab-equipment"><span>◈</span> 装備 <small>装備</small></button><button class="navbtn ${ui.tab==='talent'?'active':''}" data-action="tab-talent"><span>✧</span> タレント <small>戦闘タレント</small></button><button class="navbtn ${ui.tab==='pet'?'active':''}" data-action="tab-pet"><span>♜</span> ペット <small>ペット</small></button><button class="navbtn ${ui.tab==='stats'?'active':''}" data-action="tab-stats"><span>▦</span> ステータス <small>能力値</small></button><button class="navbtn ${ui.tab==='combat'?'active':''}" data-action="tab-combat"><span>◫</span> ダメージ・軽減 <small>ダメージ計算</small></button><button class="navbtn ${ui.tab==='ranking'?'active':''}" data-action="tab-ranking"><span>♛</span> ランキング <small>記録・比較</small></button><div class="navhint">装備候補と計算結果を分けて管理</div></nav>
${ui.tab==='equipment'?renderEquipment():ui.tab==='talent'?renderTalent():ui.tab==='pet'?renderPet():ui.tab==='combat'?renderCombat():ui.tab==='ranking'?window.DBPRankings?.render({state,selectedBoardId:ui.rankingBoardId,E,opt})||'<main class="workspace">ランキングモジュールを読み込めませんでした。</main>':renderStats()}
<footer class="footer"><span>ゲームデータ · ${E(D.version.split('-').slice(-3).join('-'))}</span><span>ディバイン固定OP・ランク6の宝石を登録済み · 強化後の端数・固有効果はゲーム内表示と照合してください</span></footer></div>${renderModal()}`;}
function renderLockedSets(){
 const sets=lockedSets(),selected=selectedLockedSet(),ready=canSaveLockedSet(),filled=equippedSlots(),total=D.slots.length;
 const options=sets.map(x=>opt(x.id,x.name,x.id===selected?.id?x.id:'' )).join('');
 return `<section class="saved-set-strip" aria-label="現在のビルドの一式保存"><div class="saved-set-label"><span class="saved-set-symbol">▣</span><div><b>一式スナップショット</b><small>${filled}/${total} 部位装備済み${ready?' · 保存可能':' · 11部位が揃うと保存できます'}</small></div></div><div class="saved-set-controls"><select id="lockedSetSelect" aria-label="保存した一式を選択" ${sets.length?'':'disabled'}>${sets.length?options:opt('','保存した一式なし','')}</select><button class="text-btn saved-set-save" data-action="save-locked-set" ${ready?'':'disabled title="全11部位の装備を揃えてください"'}>＋ 現在の一式を保存</button><button class="text-btn saved-set-load" data-action="load-locked-set" ${selected?'':'disabled'}>別ビルドで開く</button><button class="icon-btn subtle saved-set-delete" data-action="delete-locked-set" title="選択した一式スナップショットを削除" ${selected?'':'disabled'}>⌫</button></div></section>`;
}
function renderEquipment(){let b=build(),id=b.loadout?.[ui.slot],current=getItem(id),candidateItems=state.items.filter(x=>x.slot===ui.slot),select=getItem(ui.itemId)||current;if(!select&&candidateItems.length)select=candidateItems[0];return `<main class="workspace equipment-workspace"><aside class="gear-rail"><div class="section-label"><span>装備一覧</span><span class="muted small">全11部位</span></div><div class="gear-list">${D.slots.map(([key,label])=>{const it=getItem(b.loadout?.[key]);const dd=def(it);return `<button class="gear-slot ${ui.slot===key?'selected':''} ${it?.locked?'is-locked':''}" data-action="slot" data-value="${key}"><span class="slot-icon" ${it?.locked?'title="固定中・編集不可"':''}>${slotIcon(key)}</span><span class="slot-content"><small>${E(label)} <em>${E(window.DBPJP?.rarity(dd?.rarity)||dd?.rarity||'—')}</em></small><strong>${E(titleOf(it))}</strong><span class="slot-ops">${it?.primary?.length?it.primary.map(a=>D.affixes[a]?.[0]||a).join(' / '):it?(dd?.rarity==='Divine'?'固定OP '+(dd.fixed?.length||0)+'種':'OP未登録'):'装備なし'}</span>${lockedOpCount(it)?`<span class="slot-required">✦ 必須OP ${lockedOpCount(it)}</span>`:''}</span><span class="slot-right">${it?.locked?'<span class="lock-indicator">固定</span>':''}${it?`<span class="level">${it.upgradeKnown?stage(it.upgrade):'強化未確認'}</span>`:''}<span class="chev">›</span></span></button>`}).join('')}</div></aside><section class="detail-column">${renderEquipmentHeader(current,select,candidateItems)}${ui.detail==='optimize'?'':renderCandidateList(candidateItems,current,select)}${ui.detail==='optimize'?renderOpOptimizer():ui.detail==='compare'?renderComparison(current,select):renderEditor(select,current)}</section></main>`;}
function renderOpOptimizer(){return window.DBPOpOptimizerUI?window.DBPOpOptimizerUI.render({state,build:build(),slot:ui.slot,positionId:ui.optimizerPosition,selectedKey:ui.optimizerSelected,E,opt}):'<div class="card">OP最適化機能の読み込みが必要です。</div>'}
function renderEquipmentHeader(current,selected,all){
 return `<div class="gear-workflow-bar">
 <div><div class="eyebrow">${E(slotLabel(ui.slot))}の装備</div><h1>${E(current?titleOf(current):'未装備')}</h1>
 <p>${current?'現在のビルドで使用中。下の候補からいつでも交換できます。':'この部位は空欄です。保管庫から直接装備するか、新しい候補を作成してください。'}</p></div>
 <div class="gear-workflow-actions"><button class="btn" data-action="new-item">＋ 新しい装備を登録</button>
 ${current?`<button class="text-btn" data-action="unequip" data-id="${E(current.id)}">この部位の装備を外す</button>`:''}</div></div>
 <div class="subnav"><button data-action="mode-edit" class="${ui.detail==='edit'?'active':''}">候補の詳細・編集</button><button data-action="mode-compare" class="${ui.detail==='compare'?'active':''}">候補比較</button><button data-action="mode-optimize" class="${ui.detail==='optimize'?'active':''}">OP最適化</button></div>`;
}
function renderEditor(it,current){if(!it)return `<div class="empty"><div class="empty-icon">◇</div><h3>装備がありません</h3><p>候補を作成すると、OP選択と強化設定を始められます。</p><button class="btn" data-action="new-item">候補を作成</button></div>`;
const dd=def(it),isDiv=dd?.rarity==='Divine',same=it.id===current?.id,counts=countRefs(it.id),options=D.definitions.filter(x=>x.slot===it.slot&&(!x.legacyOnly||x.id===it.definitionId)).sort((a,b)=>(a.isAncient?0:a.rarity==='Divine'?1:a.rarity==='Black Mist'?2:3)-(b.isAncient?0:b.rarity==='Divine'?1:b.rarity==='Black Mist'?2:3)||a.name.localeCompare(b.name,'ja'));const allowed=D.rules[it.slot]||{primary:[],secondary:[]};
return `<div class="editor card"><div class="card-heading"><div><h2>装備設定</h2><span>${it.locked?'固定中・変更は無効です':'選択した装備個体の情報を編集'}</span></div><span class="tag ${it.locked?'amber':same?'green':''}">${it.locked?'固定中':same?'装備中':'保存済み候補'}</span></div><label class="equipment-lock-toggle"><input type="checkbox" data-change="locked" data-id="${E(it.id)}" ${it.locked?'checked':''} /><span><strong>${it.locked?'固定中（編集不可）':'この装備を固定する'}</strong><small>${it.locked?'チェックを外すと編集できます。':'誤編集・削除・装備交換を防ぎます。'}</small></span></label><fieldset class="equipment-fields" ${it.locked?'disabled':''}><div class="form-grid"><label class="field span2"><span>装備名</span><select data-change="definition" data-id="${it.id}">${options.map(o=>opt(o.id,(o.isAncient?'【エンシャント・ディバイン】':o.rarity==='Divine'?'【ディバイン】':o.rarity==='Black Mist'?'【ブラックミスト】':'【レジェンダリー】')+o.name,o.id===it.definitionId?o.id:'' )).join('')}</select></label><label class="field"><span>候補名（任意）</span><input data-change="nickname" data-id="${it.id}" value="${E(it.nickname||'')}" placeholder="例：魔法耐性重視の胸" /></label><label class="field"><span>現在の強化段階</span><select data-change="upgrade" data-id="${it.id}">${Array.from({length:14},(_,i)=>opt(i,stage(i),it.upgrade)).join('')}</select></label></div><label class="checkbox-row"><input type="checkbox" data-change="upgradeKnown" data-id="${it.id}" ${it.upgradeKnown?'checked':''}/> 強化段階をゲーム画面で確認済み</label><label class="field"><span>ゲーム内の所持状態</span><select data-change="owned" data-id="${E(it.id)}">${opt("unknown","未確認",it.owned===true?"yes":it.owned===false?"no":"unknown")}${opt("yes","所持している",it.owned===true?"yes":it.owned===false?"no":"unknown")}${opt("no","未所持（仮想候補）",it.owned===true?"yes":it.owned===false?"no":"unknown")}</select></label>
${isDiv?renderDivineSection(it,dd):`<div class="form-title"><b>主要OP</b><span>4枠 · 必要なOPを個別に固定</span></div><div class="affix-list">${Array.from({length:4},(_,idx)=>{const key=it.primary?.[idx]||'';const v=key?C.valueOf(it,key,idx):null;const locked=isOpLocked(it,'primary',idx);return `<div class="affix-row affix-lockable ${locked?'op-is-locked':''}"><span class="affix-index">0${idx+1}</span><select data-change="primary" data-id="${it.id}" data-idx="${idx}" ${locked?'disabled title="必須OPの固定を解除してから変更してください"':''}>${opt('','未設定',key)}${key&&!allowed.primary.includes(key)?opt(key,(D.affixes[key]?.[0]||key)+'（旧データ・現在候補外）',key):''}${allowed.primary.map(id=>opt(id,D.affixes[id][0],key)).join('')}</select><label class="op-lock-toggle" title="${locked?'固定解除すると変更できます':'このOPを必須として固定'}"><input type="checkbox" data-change="op-lock-primary" data-id="${it.id}" data-idx="${idx}" aria-label="主要OP ${idx+1}を必須として固定" ${locked?'checked':''} ${key?'':'disabled'}/><span>必須</span></label><div class="affix-value"><b>${v?(D.affixes[key][2]==='pct'?'+':'+' )+C.format(key,v.value):'—'}</b><small>${v?qualityOf(v.status):'—'}</small></div></div>`}).join('')}</div><div class="form-title"><b>補助OP</b><span>1枠</span></div><div class="affix-row affix-lockable secondary ${isOpLocked(it,'secondary')?'op-is-locked':''}"><span class="affix-index">S</span><select data-change="secondary" data-id="${it.id}" ${isOpLocked(it,'secondary')?'disabled title="必須OPの固定を解除してから変更してください"':''}>${opt('','未設定',it.secondary)}${it.secondary&&!allowed.secondary.includes(it.secondary)?opt(it.secondary,(D.affixes[it.secondary]?.[0]||it.secondary)+'（旧データ・現在候補外）',it.secondary):''}${allowed.secondary.map(id=>opt(id,D.affixes[id][0],it.secondary)).join('')}</select><label class="op-lock-toggle" title="${isOpLocked(it,'secondary')?'固定解除すると変更できます':'このOPを必須として固定'}"><input type="checkbox" data-change="op-lock-secondary" data-id="${it.id}" aria-label="補助OPを必須として固定" ${isOpLocked(it,'secondary')?'checked':''} ${it.secondary?'':'disabled'}/><span>必須</span></label><div class="affix-value"><b>${it.secondary?'+'+C.format(it.secondary,C.valueOf(it,it.secondary,'s').value):'—'}</b><small>参考基礎値</small></div></div><div class="notice gentle">ブラックミストの基準値と強化配分（+1〜+10、開光Ⅰ・Ⅱ）は公開ゲームデータのルールに従って計算します。端数処理や個別装備の例外は要検証です。個別の実測値は下の「数値補正」から記録できます。</div><details class="advanced"><summary>個別OPの実測値を入力（任意）</summary><div class="override-fields">${[...(it.primary||[]).map((a,idx)=>[a,idx]),...(it.secondary?[[it.secondary,'s']]:[])].filter(x=>x[0]).map(([key,idx])=>{const mapKey=key+':'+idx+':'+it.upgrade;return `<label class="field"><span>${E(D.affixes[key]?.[0]||key)} · ${E(stage(it.upgrade))}</span><input type="number" step="any" data-change="override" data-id="${it.id}" data-key="${mapKey}" ${idx==='s'?isOpLocked(it,'secondary')?'disabled':'':isOpLocked(it,'primary',idx)?'disabled':''} placeholder="ゲーム内の実数値" value="${E(it.overrides?.[mapKey]??'')}" /></label>`}).join('')}</div></details>`}
${!isDiv&&dd?.effect?`<div class="notice gentle"><b>装備固有効果</b>：${E(dd.effect)}${dd.sourceUrl?` <a href="${E(dd.sourceUrl)}" target="_blank" rel="noopener noreferrer">出典</a>`:''}</div>`:''}
${renderGemSection(it)}
<label class="field"><span>メモ・固有効果の確認内容</span><textarea data-change="memo" data-id="${it.id}" rows="2">${E(it.memo||'')}</textarea></label></fieldset><div class="editor-bottom"><div class="small muted">${counts>1?'⚠ '+counts+'ビルドで共有中。OP・強化値の変更は全ビルドに反映。削除時も影響するビルドを確認します。':'編集内容は自動保存されます。装備を外しても保管庫には残ります。'}</div><div class="actions"><button class="text-btn" data-action="duplicate-item" data-id="${it.id}">個体を複製</button>${!same?`<button class="btn" data-action="equip" data-id="${it.id}">この候補を装備する</button>`:''}<button class="danger-link" data-action="delete-item" data-id="${it.id}" title="保存した候補を完全に削除します。共有ビルドへの影響を確認します。">候補を削除</button></div></div></div>`;}
function renderGemSection(it){
 const max=D.gemSocketLimits[it.slot]||0;
 if(!max)return `<div class="form-title"><b>宝石・ソケット</b><span>ソケットなし</span></div><div class="notice gentle">この部位には宝石を装着できません。</div>`;
 const source='https://deskrawl-db.vercel.app/gems';
 const rows=Array.from({length:max},(_,idx)=>{
   const g=it.gems?.[idx]||{},value=g.type||'',tier=Number(g.tier)||6,actual=g.value;
   const effect=D.gemEffect(value,it.slot,tier,actual),legacy=value&&!D.gems[value];
   const options=[opt('','なし',value),...Object.entries(D.gems).map(([key,d])=>opt(key,d.name,value)),...(legacy?[opt(value,'旧形式：'+value+'（集計対象外）',value)]:[])].join('');
   const summary=effect&&Number.isFinite(effect.value)?
     `<strong>+${E(C.format(effect.stat,effect.value))}</strong><span>${E(C.labels[effect.stat])}${tier===7?'（実測値）':''}</span>`:
     effect?.tier===7?'<span>新ランクの数値未入力・計算対象外</span>':
     legacy?'未対応の旧データ · 計算対象外':'宝石なし';
   return `<div class="gem-item"><span>ソケット ${idx+1}</span>
   <select data-change="gem" data-id="${E(it.id)}" data-idx="${idx}">${options}</select>
   ${value&&!legacy?`<label class="field tiny"><span>宝石ランク</span><select data-change="gem-tier" data-id="${E(it.id)}" data-idx="${idx}">${opt(6,'Tier 6 · 輝く八角形',tier)}${opt(7,'Tier 7 · Perfect Star',tier)}</select></label>`:''}
   ${value&&!legacy&&tier===7?`<label class="field tiny"><span>Tier 7のゲーム内実測値（任意）</span><input type="number" min="0" step="any" inputmode="decimal" data-change="gem-value" data-id="${E(it.id)}" data-idx="${idx}" placeholder="未確認・未計算" value="${E(actual??'')}"/></label>`:''}
   <div class="gem-effect ${legacy?'gem-warning':''}">${summary}</div>
   ${tier!==7&&g.value!==undefined&&g.value!==null&&g.value!==''?`<small class="gem-legacy">旧版入力値 ${E(g.value)} は保持中・集計対象外。選び直すとクリアされます。</small>`:''}
   </div>`;
 }).join('');
 const line=(type,grp)=>{const e=D.gemEffect(type,grp==='armor'?'chest':grp==='accessory'?'neck':'weapon');return `${E(C.labels[e.stat])} +${E(C.format(e.stat,e.value))}`};
 return `<div class="form-title"><b>宝石・ソケット</b><span>Tier 6を自動計算／Tier 7は実測値のみ</span></div><div class="gem-row">${rows}</div>
 <p class="small muted">11月12日追加「Perfect Star（Tier 7）」に対応。実数値の資料が未確認のため、実測値を入力するまでステータスには加算しません。</p>
 <details class="advanced gem-reference"><summary>Tier 6の宝石6種類・全効果を見る</summary><div class="gem-table-scroll"><table class="gem-table"><thead><tr><th>宝石</th><th>武器</th><th>防具</th><th>装飾品</th></tr></thead><tbody>${Object.entries(D.gems).map(([key,d])=>`<tr><th>${E(d.name)}</th><td>${line(key,'weapon')}</td><td>${line(key,'armor')}</td><td>${line(key,'accessory')}</td></tr>`).join('')}</tbody></table></div><p class="small muted">Tier 6＝輝く八角形。<a href="${source}" target="_blank" rel="noopener noreferrer">参考：Deskrawl宝石データ</a></p></details>`;
}
function renderDivineSection(it,dd){
const totals=C.itemTotal(it);
const fixed=(dd.fixed||[]).map(([key,base],idx)=>{
 const v=totals.find(x=>x.slot==='fixed'+idx);
 return `<div class="affix-row divine-row"><span class="affix-index">${String(idx+1).padStart(2,'0')}</span><span class="divine-label">${E(C.labels[key]||key)}</span><div class="affix-value"><b>${E(key==='weaponSpeed'?'':'+')}${E(C.format(key,v?.value||0))}</b><small>基礎 ${key==='weaponSpeed'?'':'+'}${E(C.format(key,base))}</small></div></div>`;
}).join('');
const derived=totals.find(x=>x.stat==='weaponDps');
const powers=(dd.powerStats||[]).map(([key,value])=>`<div class="data-row"><div><strong>${E(C.labels[key]||key)}</strong><span>固有効果 · 強化による増加は未確認</span></div><b>+${E(C.format(key,value))}</b></div>`).join('');
const corrections=(dd.fixed||[]).map(([stat,base],idx)=>{const key='div:'+stat+':'+idx+':'+it.upgrade;return `<label class="field"><span>${E(C.labels[stat]||stat)} · ${E(stage(it.upgrade))}</span><input type="number" step="any" data-change="override" data-id="${it.id}" data-key="${E(key)}" placeholder="ゲーム内の実数値" value="${E(it.overrides?.[key]??'')}" /></label>`}).join('');
return `<div class="form-title"><b>ディバイン · 固定OP</b><span>${dd.fixed?.length||0}項目 · 数値未確認の場合は未計算</span></div>
<div class="affix-list">${fixed}</div>
${derived?`<div class="notice gentle">武器の基礎DPS：<b>${E(C.format('weaponDps',derived.value))}</b>（武器ダメージ × 武器速度。実戦DPSではありません）</div>`:''}
<div class="form-title"><b>固有効果</b><span>固定能力・特殊ルール</span></div>
<div class="notice gentle"><p>${E(dd.effect||'')}</p>${powers?`<div class="data-table divine-powers">${powers}</div>`:''}</div>
<div class="notice">${dd.fixed?.length?'数値は公開された+0の固定値から計算しています。':'固定OPは資料未確認のため未計算です。'}+1〜+10は5%ステップの順番、開光Ⅰ・Ⅱ・Ⅲは各数値に+5%ずつ。<b>強化後の端数表示と固有効果の強化有無</b>はゲーム内の表示で照合してください。${!it.upgradeKnown?' 現在の強化段階は未確認です。':''}</div>
<details class="advanced"><summary>固定OPの表示値を手動補正（任意）</summary><div class="override-fields">${corrections}</div></details>
${dd.sourceUrl?`<p class="small muted">参考データ：<a href="${E(dd.sourceUrl)}" target="_blank" rel="noopener noreferrer">装備の固定値・効果</a></p>`:''}`;
}
function renderCandidateList(list,current,selected){
 return `<section class="card candidate-card"><div class="card-heading"><div><h2>この部位の装備候補 <small>${list.length}件</small></h2>
 <span>選ぶ＝詳細を見る ／ 装備する＝このビルドだけで使用する</span></div><button class="text-btn" data-action="new-item">＋ 候補追加</button></div>
 <div class="candidate-list">${list.length?list.map(it=>`<div class="candidate-entry ${selected?.id===it.id?'active':''}">
 <button data-action="select-item" data-id="${E(it.id)}" class="candidate ${selected?.id===it.id?'active':''}" aria-label="${E(titleOf(it))}の詳細を見る">
 <span class="cand-marker">${it.id===current?.id?'✓':it.locked?'⌑':'◇'}</span>
 <span><strong>${E(titleOf(it))} ${it.locked?'<span class="candidate-lock-label">編集保護</span>':''}</strong>
 <small>${E(def(it)?.rarity==='Divine'?'ディバイン':def(it)?.rarity==='Legendary'?'レジェンダリー':'ブラックミスト')} · ${it.upgradeKnown?stage(it.upgrade):'強化未確認'} · ${E(it.primary?.filter(Boolean).map(a=>D.affixes[a]?.[0]||a).join(' / ')||'OP未設定')}</small></span></button>
 ${it.id===current?.id?'<span class="candidate-status">装備中</span>':`<button class="btn small-btn candidate-equip" data-action="equip" data-id="${E(it.id)}">装備する</button>`}</div>`).join(''):'<p class="muted">まだ候補はありません。「新しい装備を登録」から始めてください。</p>'}</div></section>`;
}
function renderComparison(current,candidate){if(!current||!candidate)return `<div class="empty">現在装備と候補を登録すると比較できます。</div>`;const same=candidate.id===current.id;const lev=ui.compareMode==='equal'?ui.equalLevel:undefined;const a=C.itemTotal(current,lev),b=C.itemTotal(candidate,lev),get=(arr,key)=>arr.filter(x=>x.stat===key).reduce((t,v)=>t+v.value,0);const keys=[...new Set([...a,...b].map(x=>x.stat))];const before=C.calc(state,build(),{equalLevel:lev});const after=C.calc(state,build(),{slot:ui.slot,itemId:candidate.id,equalLevel:lev});return `<div class="card compare-card"><div class="card-heading"><div><h2>装備候補の比較</h2><span>確定前にOP・ステータスを同時に比較</span></div><span class="tag amber">未校正値を含む</span></div><div class="comparison-controls"><div class="segmented"><button data-action="compare-equal" class="${ui.compareMode==='equal'?'active':''}">同じ強化段階</button><button data-action="compare-actual" class="${ui.compareMode==='actual'?'active':''}">現在の強化値</button></div>${ui.compareMode==='equal'?`<label class="field tiny"><span>比較条件</span><select data-change="equalLevel">${Array.from({length:14},(_,i)=>opt(i,stage(i),ui.equalLevel)).join('')}</select></label>`:''}</div><div class="compare-columns"><div class="compare-item"><small>現在装備</small><b>${E(titleOf(current))}</b><span>${ui.compareMode==='equal'?stage(ui.equalLevel):current.upgradeKnown?stage(current.upgrade):'強化未確認'}</span></div><div class="compare-icon">↔</div><div class="compare-item"><small>比較候補</small><b>${E(titleOf(candidate))}</b><span>${ui.compareMode==='equal'?stage(ui.equalLevel):candidate.upgradeKnown?stage(candidate.upgrade):'強化未確認'}</span></div></div>${same?'<div class="notice">現在装備と同じ個体を比較しています。下の保管庫から別の候補を選んでください。</div>':''}<h3 class="table-heading">① OPごとの差分</h3><div class="data-table">${keys.map(key=>{const old=get(a,key),next=get(b,key),delta=next-old;return `<div class="data-row"><div><strong>${E(D.affixes[key]?.[0]||C.labels[key]||key)}</strong><span>${E(C.format(key,old))} → ${E(C.format(key,next))}</span></div><b class="${delta>0?'positive':delta<0?'negative':'neutral'}">${delta>0?'+':''}${E(C.format(key,delta))}</b></div>`}).join('')||'<p class="muted">比較できる数値はありません</p>'}</div><h3 class="table-heading">①-b 宝石の差分（最高ランク6）</h3><div class="data-table">${renderGemComparison(current,candidate)}</div><h3 class="table-heading">② キャラクターステータスへの影響</h3><div class="data-table">${C.full.filter(key=>Math.abs((after.raw[key]||0)-(before.raw[key]||0))>.001).map(key=>{const delta=C.delta(key,before.raw[key],after.raw[key]);return `<div class="data-row"><div><strong>${E(C.labels[key]||key)}</strong><span>${E(C.format(key,before.raw[key]||0))} → ${E(C.format(key,after.raw[key]||0))}</span></div><b class="${delta>0?'positive':delta<0?'negative':'neutral'}">${delta>0?'+':''}${E(C.format(key,delta))}</b></div>`}).join('')||'<p class="muted">計算可能な差分はありません。</p>'}</div><div class="notice gentle">同一強化段階の比較を標準表示します。ブラックミストと現在のディバイン4部位の固定数値は公開データを参照し、強化ステップを試算しています。端数処理は暫定です。固有効果の条件付きダメージや未登録ステータスは最終値に含まれません。比較差分は<b>完全な最終性能ではなく登録情報からの部分計算</b>です。</div>${!same?`<button class="btn wide" data-action="equip" data-id="${candidate.id}" ${current.locked?'disabled title="現在の装備の固定を解除してください"':''}>この候補を現在のビルドに装備する</button>`:''}</div>`;}
function renderGemComparison(current,candidate){
 const max=D.gemSocketLimits[current.slot]||0;
 if(!max)return '<div class="data-row"><span>宝石ソケットなし</span></div>';
 const desc=(item,idx)=>{const type=item.gems?.[idx]?.type,e=D.gemEffect(type,item.slot);if(!type)return 'なし';if(!e)return '旧形式・集計外';return D.gems[type].name+'：'+C.labels[e.stat]+' +'+C.format(e.stat,e.value)};
 const rows=[];
 for(let i=0;i<max;i++){const old=desc(current,i),next=desc(candidate,i);if(old!==next)rows.push(`<div class="data-row"><div><strong>ソケット ${i+1}</strong><span>${E(old)} → ${E(next)}</span></div></div>`);}
 return rows.join('')||'<div class="data-row"><span class="muted">宝石の構成は同じです。</span></div>';
}
function slotIcon(x){return {weapon:'⚔',head:'♜',neck:'◇',shoulder:'◆',chest:'▣',gloves:'✦',belt:'▬',legs:'◫',boots:'⌁',ring1:'◌',ring2:'◌'}[x]||'◆'}
function renderPet(){return PU?PU.render({settings:build().settings,result:C.calc(state,build()),E,opt}):'<main class="workspace"><p>ペット機能の読み込みが必要です。</p></main>'}
function renderTalent(){const t=window.DBPTalentUI;return t?t.render(build().settings||{},ui.talentSelected,C.calc(state,build())):'<div class="notice">タレントツリーを読み込めませんでした。再読み込みしてください。</div>';}
function renderCombat(){
 const b=build(),sv=window.DBPStatsView.config(b.settings||{});
 const equipped=window.DBPCombat.equippedEffects(state,b);
 const items={};
 if(sv.filters.unique)for(const [slot,id] of Object.entries(equipped.items))if(sv.slots[slot]!==false&&sv.powers[id]!==false)items[slot]=id;
 const context={...equipped,items,schrodingerRing:items.ring1==='schrodinger'||items.ring2==='schrodinger'};
 const stats=C.calc(state,b,{sourceFilters:{...sv.filters,powers:sv.powers,slots:sv.slots}});
 const combatUI=window.DBPCombatUI;
 const dpsPanel=window.DBPDpsUI?.render(stats,b.settings||{},context)||'';
  return combatUI?combatUI.render(stats,b.settings||{},context,{skillsOpen:ui.combatSkillsOpen,dpsPanel}):'<div class="notice">計算モジュールを読み込めませんでした。再読み込みしてください。</div>';
}
function renderStats(){
 const b=build(),SV=window.DBPStatsView,v=SV.evaluate(state,b),r=v.active;
 const groups=SV.sections;
 const details=groups.map(([name,keys])=>'<section class="stat-group"><h3>'+E(name)+'</h3>'+
  SV.tableHeader()+'<div class="stat-rows">'+keys.map(k=>SV.statRow(k,v,ui.selectedStat)).join('')+'</div></section>').join('');
 const snapshots=state.measurements.filter(x=>x.buildId===b.id).slice(-3).reverse().map(m=>
  '<div class="snapshot-row"><strong>'+E(m.at)+'</strong><span>'+
  Object.entries(m.values||{}).map(([k,val])=>E(C.labels[k]||k)+': '+E(val)).join(' · ')+'</span><small>'+E(m.notes||'')+'</small></div>').join('');
 return '<main class="workspace stats-workspace"><section class="stats-main">'+
 '<div class="page-heading"><div class="eyebrow">キャラクター情報</div><h1>キャラクターステータス</h1>'+
 '<p>装備の数字と、タレント・ペット・固有効果を含むシミュレーション値を並べて比較します。</p></div>'+
 '<div class="quickbar"><label class="toggle"><input type="checkbox" data-change="aura"'+(b.settings?.aura?' checked':'')+'><span class="toggle-track"></span><span>フレイムオーラ <strong>'+(b.settings?.aura?'ON':'OFF')+'</strong></span></label>'+
 '<label class="inline-select">ポーション <select data-change="quickpotion">'+potionOptions(b.settings?.potion)+'</select></label>'+
 '<button class="btn outline" data-action="settings"><span>⚙</span> ビルド設定</button></div>'+
 SV.controls(v)+
 '<div class="section-label"><span>ステータス比較</span><span class="muted small">'+SV.comparisonKeys(b.settings).length+' / '+SV.comparisonLimit+' 項目を表示</span></div>'+
 SV.summary(v)+
 '<div class="notice gentle">左は<strong>装備の能力値・固定数値のみ</strong>、右は選択した基礎値・宝石・パラゴン・タレント・ペット・オーラ・消耗品・装備固有効果込みです。装備自体は書き換えません。'+
 '固有の独立倍率・一時無敵・スキル限定クリティカルは通常OPに混ぜず別項目で表示します。ゲーム内部の計算を完全再現するものではありません。</div>'+
 '<div class="section-label extra-space"><span>すべてのステータス</span><span class="muted small">装備のみ / 補正込み / 過剰分</span></div>'+
 details+
 '<section class="card snapshot"><div class="card-heading"><div><h2>実測記録</h2><span>過去の測定値は現在の合計に足しません</span></div>'+
 '<button class="text-btn" data-action="measurement">＋ 登録</button></div>'+
 (snapshots||'<p class="muted">実測記録はまだありません。</p>')+'</section></section>'+
 '<aside class="stats-side '+(ui.settingsOpen?'show-settings':'')+'">'+(ui.settingsOpen?renderSettings():renderBreakdown(r))+'</aside></main>';
}
function statTile(k,r){const val=r.effective[k];const cap=D.limits[k];return `<button class="stat-tile ${ui.selectedStat===k&&!ui.settingsOpen?'chosen':''}" data-action="stat" data-value="${k}"><span class="stat-label">${E(window.DBPStatsView.statLabel(k))}</span><strong>${E(C.format(k,val))}</strong><span class="stat-hint">${cap?`上限 ${cap}%${r.raw[k]>cap?' · 超過 '+C.format(k,r.raw[k]-cap):''}`:k==='mr'?'Armorとは別計算':'実効値・部分合計'}</span>${cap?`<div class="progress"><i style="width:${Math.min(100,Math.max(0,(val||0)/cap*100))}%"></i></div>`:''}</button>`}
function renderBreakdown(r){
 const k=ui.selectedStat,list=r.breakdown[k]||[],raw=r.raw[k],eff=r.effective[k],SV=window.DBPStatsView;
 const selected=SV.comparisonKeys(build().settings),isShown=selected.includes(k),full=selected.length>=SV.comparisonLimit,cap=SV.capOf(k),extra=SV.excessValue(k,r);
 const toggle='<label class="stats-compare-pick'+(full&&!isShown?' at-limit':'')+'">'+
  '<input type="checkbox" data-change="stat-compare" data-key="'+E(k)+'"'+
  (isShown?' checked':'')+(full&&!isShown?' disabled':'')+'>'+
  '<span><strong>ステータス比較に表示</strong><small>'+selected.length+' / '+SV.comparisonLimit+' 項目を選択中'+
  (full&&!isShown?' · 追加するには別の項目のチェックを外してください':'')+'</small></span></label>';
 return '<div class="side-panel"><div class="side-title"><div><small>ステータス内訳</small><h2>'+E(SV.statLabel(k))+'</h2></div>'+
  '<button class="icon-btn" data-action="settings" title="設定パネル">⚙</button></div>'+toggle+
  '<div class="side-total"><span>登録データからの計算値</span><strong>'+E(C.format(k,eff))+'</strong>'+
  (cap!==null?'<small>過剰分 '+E(SV.excessText(k,r))+(extra>0?'（上限適用前 '+E(C.format(k,raw))+'）':'')+'</small>':'')+'</div>'+
  '<h3>取得元内訳</h3>'+
  (list.length?list.map(x=>'<div class="break-row"><div><span>'+E(x.source)+'</span><small>'+E(qualityOf(x.quality))+
  '</small></div><strong>+'+E(C.format(k,x.value))+'</strong></div>').join(''):
  '<div class="notice">この項目の取得元は未登録です。ビルド設定か装備を入力してください。</div>')+
  ((k==='mr'||k==='armor')?'<div class="mitigation"><span>敵Lv '+E(build().settings?.enemyLevel||70)+
  ' の推定軽減率</span><strong>'+E(r.mitigations[k].toFixed(1))+
  '%</strong><small>式：防御値 ÷（防御値 + 50 × 敵Lv）。登録値のみで計算した参考値。</small></div>':'')+
  '<button class="btn outline wide" data-action="settings">設定を編集 <span>→</span></button>'+
  '<p class="side-note">'+r.pending.length+'件の未校正項目があります。確度の低い数値を最終値として扱わないでください。</p></div>';
}
function potionOptions(current){return [['none','なし'],['swift','上級迅速（攻撃速度）'],['vitality','上級活力（最大HP）'],['resistance','上級耐性（魔法耐性）'],['wind','風（回避率）'],['focus','上級集中（クールダウン短縮）'],['efficiency','上級効率（マナコスト削減）'],['cruel','上級残酷（クリティカル）']].map(x=>opt(x[0],x[1],current)).join('')}
function renderパラゴンSettings(s){
 const a=D.paragonAllocation(s),level=s.paragonLevel===undefined||s.paragonLevel===null?'':s.paragonLevel;
 const remaining=level===''?'':Number(level)-a.total;
 const groups=['コア','攻撃','防御','補助'].map(group=>{
   const rows=D.paragonStats.filter(stat=>stat.group===group).map(stat=>{
     const points=a.points[stat.key]||0;
     const effect=Number((points*stat.per).toFixed(7));
     const cap=stat.max===null?'上限なし':stat.max+'pt上限';
     return `<label class="field paragon-entry"><span>${E(stat.label)} <small class="paragon-limit">${E(cap)}</small></span><input type="number" min="0" ${stat.max===null?'':`max="${stat.max}"`} step="1" inputmode="numeric" data-change="paragonPoint" data-key="${E(stat.key)}" value="${points}" /><small class="paragon-effect">1pt = +${E(C.format(stat.stat,stat.per))} · 合計 +${E(C.format(stat.stat,effect))}</small></label>`;
   }).join('');
   return `<div class="form-title paragon-heading"><b>${group}</b><span>${D.paragonStats.filter(x=>x.group===group).length}項目</span></div><div class="paragon-group">${rows}</div>`;
 }).join('');
 return `<p class="helper">振り分けたポイント数を入力します。上限は各項目ごとの最大割り振り数です（最終ステータスの上限とは別）。</p>
 <label class="field"><span>パラゴンレベル（任意・所持ポイント数）</span><input type="number" min="0" step="1" inputmode="numeric" data-change="paragonLevel" value="${E(level)}" placeholder="未設定" /></label>
 <div class="notice gentle">割り振り合計 <strong>${a.total}pt</strong>${remaining===''?' · 所持ポイント数は未登録':` / ${E(level)}pt · 残り <strong>${remaining}pt</strong>`}</div>
 ${a.legacy?'<div class="notice">旧バージョンの入力はポイント数ではなくステータス補正値です。画面にはポイント換算値を表示しています。パラゴンを編集すると旧値を残して新しいポイント方式に切り替わります。</div>':''}
 ${a.issues.length?`<div class="notice">注意：${E(a.issues.join('・'))}は既存値を正確にポイントへ変換できません。保存データを確認してください（変換操作は停止します）。</div>`:''}
 ${groups}
 <p class="helper">参照：Deskrawlのパラゴンゲーム設定。最大マナ50pt＝+100、CDR50pt＝+10%、移動速度50pt＝+25%。</p>`;
}

function renderRuneSettings(s){
 const R=window.DBPRunes;
 const config=R.selection(s);
 const slots=Array.from({length:6},(_,index)=>{
  const current=config.slots[index],rune=R.catalog[current],usedSetIds=new Set(config.slots.filter((id,i)=>i!==index&&R.catalog[id]?.rarity==='set'));
  const options=rarity=>R.selectable.filter(r=>r.rarity===rarity).map(r=>
   '<option value="'+E(r.id)+'"'+(current===r.id?' selected':'')+(usedSetIds.has(r.id)?' disabled':'')+'>'+E(r.name)+'</option>'
  ).join('');
  const details=rune?(rune.unverifiedPieceStats?'個別ルーンのOP・追加スキルLvは未確認（セット効果のみ適用）':(rune.skill?'対応スキル +'+rune.level+'Lv'+(rune.stats.length?' / ':''):'')+R.statsText(rune)):'未装着';
  return '<label class="rune-slot-entry"><span class="rune-slot-heading"><b>ルーン '+(index+1)+'</b><small>'+(rune?(rune.rarity==='set'?'セット':'レジェンド'):'空き')+'</small></span>'+
   '<select data-change="rune-slot" data-idx="'+index+'"><option value=""'+(!current?' selected':'')+'>なし</option>'+
   '<optgroup label="レジェンド（Grand）">'+options('legendary')+'</optgroup>'+
   '<optgroup label="セットルーン">'+options('set')+'</optgroup></select>'+
   '<small class="rune-slot-effect">'+E(details)+'</small></label>';
 }).join('');
 const summaries=Object.entries(R.sets).map(([id,set])=>{
  const count=config.counts[id],bonuses=config.bonuses.filter(b=>b.set===id);
  return '<div class="rune-set-status"><div class="rune-set-heading"><b>'+E(set.name)+'</b><span>'+count+' / 6</span></div>'+
   bonuses.map(b=>'<div class="rune-set-bonus'+(b.active?' active':'')+'"><strong>'+b.threshold+'セット '+(b.active?'✓':'—')+'</strong><span>'+E(b.label)+'</span></div>').join('')+'</div>';
 }).join('');
 return '<p class="helper">6枠にルーンを装着します。レジェンダリー以上に対応し、ルーンの強化レベルは<strong>すべてLv6（MAX）</strong>で固定です。</p>'+
  '<div class="form-title"><b>装着中のルーン（6枠）</b><span>'+config.equipped.length+' / 6 装備中</span></div>'+
  '<div class="rune-slot-list">'+slots+'</div>'+
  (config.issues.length?'<p class="notice">'+E(config.issues.join(' / '))+'</p>':'')+
  '<div class="form-title"><b>ルーンセット効果</b><span>2 / 4 / 6 個で発動</span></div>'+
  '<div class="rune-sets-summary">'+summaries+'</div>'+
  '<p class="helper">セット数値補正はステータスと戦闘計算に反映します。追加弾・追加スキルの効果はセット発動として表示しますが、単発ダメージに無条件で足しません。旧形式のルーンLv入力は自動装着せず保持しています。</p>';
}
function renderSettings(){const b=build(),s=b.settings||{},t=s.talents||{},pet=s.pet||{};let body='';if(ui.settingsTab==='paragon')body=renderパラゴンSettings(s);
else if(ui.settingsTab==='runes')body=renderRuneSettings(s);
 else if(ui.settingsTab==='talents')body='<div class="notice">戦闘タレントは独立タブに移動しました。</div><button class="btn" data-action="tab-talent">タレントツリーを開く</button>';
else if(ui.settingsTab==='consumables')body=`<label class="field"><span>戦闘ポーション</span><select data-change="quickpotion">${potionOptions(s.potion)}</select></label><label class="field"><span>料理</span><select data-change="food">${[['none','なし'],['crab','灰殻のカニ'],['other','その他']].map(x=>opt(x[0],x[1],s.food||'none')).join('')}</select></label><label class="field"><span>ユーティリティ</span><select data-change="utility">${[['none','なし'],['speed','移動速度'],['exp','獲得経験値'],['gold','ゴールド']].map(x=>opt(x[0],x[1],s.utility||'none')).join('')}</select></label>`;
else if(ui.settingsTab==='base')body=`<p class="helper">装備外の基礎値のみ入力してください。ゲーム内の最終値を入れると二重計上になります。わからない項目は空欄のままで大丈夫です。</p>${[['int','知力（装備外）'],['mr','魔法耐性（装備外）'],['armor','アーマー（装備外）'],['maxHP','最大HP（装備外）'],['critChance','クリティカル率（装備外）'],['critRed','クリティカルダメージ軽減（装備外）'],['cdr','クールダウン短縮（装備外）'],['mcr','マナコスト削減（装備外）'],['dodge','回避率（装備外）'],['mana','最大Mana（装備外）']].map(([k,label])=>settingNumber('base.'+k,label,s.base?.[k]??'')).join('')}`;
return `<div class="side-panel settings-panel"><div class="side-title"><div><small>BUILD CONFIGURATION</small><h2>ビルド設定</h2></div><button class="icon-btn" data-action="close-settings">×</button></div><label class="field"><span>設定項目</span><select id="settingsCategory">${[['paragon','パラゴン'],['runes','ルーン'],['consumables','ポーション・料理'],['base','装備外の基礎値']].map(x=>opt(x[0],x[1],ui.settingsTab)).join('')}</select></label><div class="setting-form">${body}</div><div class="notice gentle">設定変更はこのビルドだけに反映。共有装備は別ビルドでも使用できます。</div></div>`;}
function settingNumber(key,label,value,min=0,max=9999){return `<label class="field"><span>${E(label)}</span><input type="number" min="${min}" max="${max}" step="any" data-change="setting" data-key="${E(key)}" value="${E(value)}" /></label>`;}
function renderModal(){if(!ui.modal)return '';let content='';
const RK=window.DBPRankings;
if(ui.modal==='ranking-board-new')content=RK?.boardModal({board:null,preset:ui.rankingPreset,E,opt})||'ランキング機能を読み込めませんでした';
if(ui.modal==='ranking-board-edit')content=RK?.boardModal({board:RK.boardById(state,ui.rankingBoardId),E,opt})||'ランキング機能を読み込めませんでした';
if(ui.modal==='ranking-run-new'){
 const board=RK?.boardById(state,ui.rankingBoardId);
 content=board?RK.runModal({board,state,E,opt}):'ランキングを選択してください';
}
if(ui.modal==='ranking-run-detail'){
 const run=RK?.runById(state,ui.rankingRunId);
 content=run?RK.runDetailModal({state,run,E}):'記録が見つかりません';
}
if(ui.modal==='input-review')content=window.DBPInputReview?.render(state,build(),E,titleOf)||'<p class="notice">登録照合モジュールを読み込めませんでした。</p>';
if(ui.modal==='delete-item'){
 const item=getItem(ui.deleteTargetId);
 if(!item){
  content='<div class="modal-title"><h2>装備候補が見つかりません</h2><button type="button" data-action="modal-close" class="icon-btn" aria-label="閉じる">×</button></div><p class="helper">すでに削除済みか、別の操作で変更された可能性があります。</p><div class="modal-actions"><button type="button" class="btn" data-action="modal-close">閉じる</button></div>';
 }else{
  const refs=state.builds.filter(profile=>Object.values(profile.loadout||{}).includes(item.id));
  const active=refs.some(profile=>profile.id===build().id);
  content=`<div class="modal-title"><h2>装備候補を削除</h2><button type="button" data-action="modal-close" class="icon-btn" aria-label="閉じる">×</button></div>
  <div class="delete-target"><small>削除する装備</small><strong>${E(titleOf(item))}</strong><span>${E(slotLabel(item.slot))} · ${E(window.DBPJP?.rarity(def(item)?.rarity)||def(item)?.rarity||'装備')} · ID末尾 ${E(item.id.slice(-8))}</span></div>
  <p class="helper">この装備候補を保管庫から完全に削除します。<strong>元には戻せません。</strong> 装備候補が複数あり同じ名前でも、対象は上のIDの1件だけです。</p>
  ${item.locked?'<div class="delete-warning">編集保護されている装備です。削除を確定するとこの装備個体も削除されます。</div>':''}
  ${refs.length?`<div class="delete-impact"><strong>影響を受けるビルド：${refs.length}件</strong><ul>${refs.map(profile=>`<li>${E(profile.name)}${profile.id===build().id?'（使用中のビルド）':''}</li>`).join('')}</ul><p>削除すると、これらのビルドから該当装備だけが外れます。ほかの装備は変更されません。</p></div>`:'<div class="delete-impact">この装備を使用中のビルドはありません。</div>'}
  <p class="helper">保存済みの一式スナップショットは削除されません。</p>
  <div class="modal-actions"><button type="button" class="btn outline" data-action="modal-close">キャンセル</button><button type="button" class="btn danger-btn" data-action="confirm-delete-item" data-id="${E(item.id)}">この装備を削除する</button></div>`;
 }
}

if(ui.modal==='new-build')content=`<div class="modal-title"><h2>新しいビルド・一式を作成</h2><button data-action="modal-close" class="icon-btn" aria-label="閉じる">×</button></div>
 <label class="field"><span>ビルド名</span><input id="newBuildName" maxlength="100" value="${E(build().name+' 新構成')}" /></label>
 <div class="new-build-options">
 <button class="new-build-option" data-action="new-build-copy"><strong>現在の一式をコピーして始める</strong><span>装備と設定をコピー。元の装備は変更せず、コピー側の固定は解除します。</span><b>おすすめ</b></button>
 <button class="new-build-option" data-action="new-build-empty"><strong>空のビルドから始める</strong><span>11部位すべて未装備。既存の保管庫から選んで装備できます。</span></button>
 <button class="new-build-option" data-action="new-build-share"><strong>同じ装備を共有して始める</strong><span>装備は共用。OPや強化値を変更すると両方のビルドに反映されます。</span></button>
 </div>`;
if(ui.modal==='cloud')content=`<div class="modal-title"><h2>クラウド同期・GitHubログイン</h2><button data-action="modal-close" class="icon-btn">×</button></div><p class="helper">Supabaseの専用プロジェクトを接続すると、GitHubでログインしてPC・スマホのデータを同期できます。接続前もブラウザ内で自動保存されます。</p>${window.DBP_CLOUD_CONFIG?.url?`<div class="notice gentle">専用のSupabaseプロジェクトに接続設定済み · ${E(cloudCfg?.url)}</div>`:`<label class="field"><span>Supabase Project URL</span><input id="cloudUrl" placeholder="https://xxxx.supabase.co" value="${E(cloudCfg?.url||'')}"></label><label class="field"><span>Publishable / anon key（公開用キーのみ）</span><input id="cloudKey" placeholder="sb_publishable_..." value="${E(cloudCfg?.key||'')}"></label>`}<div class="notice"><b>セキュリティ</b><p>service_role・secretキーは絶対に入力しないでください。保存先のテーブルにはRLSが必要です。</p></div><div class="modal-actions">${window.DBP_CLOUD_CONFIG?.url?"":`<button class="btn outline" data-action="cloud-config-save">接続設定を保存</button>`}${session?`<button class="btn" data-action="cloud-signout">ログアウト</button>`:`<button class="btn" data-action="cloud-login" ${!cloudCfg?.url?'disabled':''}>GitHubでログイン</button>`}</div>${session?`<p class="helper">ログイン中 · ${E(session.user?.email||session.user?.id||'認証済み')}</p><button class="text-btn" data-action="cloud-pull">クラウドから再読み込み</button>`:''}`;
if(ui.modal==='measurement'){const date=new Date().toISOString().slice(0,10);content=`<div class="modal-title"><h2>ゲーム内実測を記録</h2><button data-action="modal-close" class="icon-btn">×</button></div><p class="helper">オーラ等の状態と装備構成のスナップショットとして保存。予測値への無条件加算はしません。</p><label class="field"><span>測定日</span><input id="measurementDate" type="date" value="${date}"/></label><div class="measure-grid">${[['critChance','クリティカル率 %'],['critRed','クリティカルRed %'],['cdr','CDR %'],['mcr','MCR %'],['dodge','Dodge %'],['mr','Magic Resist'],['armor','Armor'],['maxHP','最大HP'],['as','AS'],['mana','最大Mana']].map(([k,l])=>`<label class="field"><span>${l}</span><input type="number" step="any" id="measure-${k}" placeholder="任意"/></label>`).join('')}</div><label class="field"><span>測定メモ</span><input id="measurementMemo" placeholder="オーラ ON、ダミー測定など"/></label><div class="modal-actions"><button class="btn" data-action="measurement-save">測定値を保存</button></div>`;}
if(ui.modal==='ai-export'){
 const EX=window.DBPAIExport,report=EX.buildReport(state,build()),text=EX.toPrompt(report);
 content=`<div class="modal-title"><h2>ChatGPT用ビルド出力</h2><button class="icon-btn" data-action="modal-close" aria-label="閉じる">×</button></div>
 <p class="helper">現在のビルド「${E(build().name)}」の装備・OP・ルーン・タレント・ペット・条件とステータスを出力します。</p>
 <div class="notice gentle">自動送信はしません。コピーしたテキストをChatGPTに貼り付けるか、JSONを保存してアップロードしてください。</div>
 <label class="field ai-export-preview"><span>出力プレビュー（読み取り専用）</span><textarea id="aiExportPreview" rows="11" readonly spellcheck="false">${esc(text)}</textarea></label>
 <div class="modal-actions ai-export-actions"><button class="btn" data-action="ai-export-copy">ChatGPT用テキストをコピー</button><button class="btn outline" data-action="ai-export-download">JSONファイルを保存</button></div>
 <p class="helper">出力には装備・ビルドのメモも含みます。内容を確認してから共有してください。認証トークン、クラウドの接続情報、他のビルドは含みません。</p>`;
}
if(ui.modal==='compare-builds'){const x=state.builds.find(y=>y.id===ui.compareBuildId)||state.builds.find(y=>y.id!==build().id);const a=C.calc(state,build()),b=x?C.calc(state,x):null;content=`<div class="modal-title"><h2>ビルド間比較</h2><button data-action="modal-close" class="icon-btn">×</button></div><label class="field"><span>比較対象</span><select id="otherBuild">${state.builds.filter(z=>z.id!==build().id).map(z=>opt(z.id,z.name,x?.id)).join('')}</select></label>${x?`<div class="compare-columns"><div class="compare-item"><small>現在のビルド</small><b>${E(build().name)}</b></div><div class="compare-icon">↔</div><div class="compare-item"><small>比較対象</small><b>${E(x.name)}</b></div></div><h3 class="table-heading">主要ステータス差分（部分計算）</h3><div class="data-table">${C.priority.map(k=>{const d=(b.raw[k]||0)-(a.raw[k]||0);return `<div class="data-row"><div><strong>${E(C.labels[k])}</strong><span>${C.format(k,a.raw[k]||0)} → ${C.format(k,b.raw[k]||0)}</span></div><b class="${d>0?'positive':d<0?'negative':'neutral'}">${d>0?'+':''}${C.format(k,d)}</b></div>`}).join('')}</div><h3 class="table-heading">装備差分</h3>${D.slots.filter(([s])=>build().loadout[s]!==x.loadout[s]).map(([s,label])=>`<div class="data-row"><strong>${label}</strong><span>${E(titleOf(getItem(build().loadout[s])))} → ${E(titleOf(getItem(x.loadout[s])))}</span></div>`).join('')||'<div class="notice">装備の組み合わせは同一です。パラゴン・バフの差などを確認してください。</div>'}`:'<div class="empty">比較できる別ビルドがありません。複製して作成してください。</div>'}<div class="notice gentle">ビルドごとにオーラ・タレント等の条件が異なる場合、それも含めた比較です。数値は未校正データを含みます。</div>`;}
return `<div class="modal-backdrop" data-action="modal-close"><div class="modal-panel ${ui.modal==='input-review'?'review-panel':ui.modal.startsWith('ranking-')?'ranking-modal':''}" role="dialog" aria-modal="true">${content}</div></div>`;}
// ---------- mutations ----------
function act(action,id,value,el){const b=build();switch(action){
case 'stat-preset':{
 const full=value==='all';
 if(!full&&value!=='gear')return;
 modify(()=>{b.settings.statView={
  ...b.settings.statView,
  groups:Object.fromEntries(window.DBPStatsView.groups.map(([key])=>[key,full])),
  powers:{}
 }});
 return;
}
case 'dps-duration':{
 const n=window.DBPDpsSim?.validate('duration',value);
 if(n===undefined)return;
 modify(()=>{b.settings.dps??={};b.settings.dps.duration=n});
 return;
}
 case 'combat-open-runes':ui.tab='stats';ui.settingsOpen=true;ui.settingsTab='runes';render();break;
 case 'combat-toggle-settings':ui.combatSkillsOpen=!ui.combatSkillsOpen;render();break;
 case 'combat-debuffs':{if(value!=='on'&&value!=='off')return;modify(()=>{b.settings.combat??={};for(const key of window.DBPCombat.debuffKeys)b.settings.combat[key]=value==='on'});return;}
 case 'tab-ranking':ui.tab='ranking';ui.settingsOpen=false;ui.modal='';render();break;
case 'tab-equipment':ui.tab='equipment';ui.settingsOpen=false;render();break;case 'tab-talent':ui.tab='talent';ui.settingsOpen=false;render();break;case 'tab-pet':ui.tab='pet';ui.settingsOpen=false;render();break;case 'tab-stats':ui.tab='stats';render();break;case 'tab-combat':ui.tab='combat';ui.settingsOpen=false;render();break;case 'combat-defense-type':{const type=window.DBPCombat?.validateInput('defenseType',value);if(type)modify(()=>{b.settings.combat??={};b.settings.combat.defenseType=type});break;}
case 'talent-add':
case 'talent-remove':{
 const T=window.DBPTalents;
 if(!T)return;
 if(!T.byId[value]){flash('タレントが見つかりません');return}
 ui.talentSelected=value;
 const a=T.allocation(b.settings);
 if(a.legacy){render();flash('既存設定を保護中です。先に新ツリーへ切り替えてください');return}
 const result=action==='talent-add'?T.canAdd(a.ranks,value):T.canRemove(a.ranks,value);
 if(!result.ok){render();flash(result.why);return}
 modify(()=>{b.settings.talentPoints=result.ranks});
 if(result.type==='swap')flash('キャップストーンを変更しました');
 return;
}
case 'talent-new-tree':{
 const T=window.DBPTalents;if(!T)return;
 if(!confirm('このビルドの戦闘タレントを0ptから登録しますか？\n旧タレント値はバックアップ用に残りますが、ステータス計算からは除外されます。'))return;
 modify(()=>{b.settings.talentPoints={};ui.talentSelected='arcaneInsight'});
 flash('新しい70ptタレントツリーに切り替えました');return;
}
case 'talent-reset':{
 const T=window.DBPTalents;if(!T)return;
 const a=T.allocation(b.settings);
 if(a.legacy||!a.total)return;
 if(!confirm('このビルドの戦闘タレント '+a.total+'ptをすべてリセットしますか？'))return;
 modify(()=>{b.settings.talentPoints={}});
 flash('戦闘タレントを0ptへリセットしました');return;
}
case 'slot':ui.slot=value;ui.itemId=null;ui.optimizerPosition='primary:0';ui.optimizerSelected='';render();break;
case 'mode-optimize':ui.detail='optimize';ui.optimizerSelected='';render();break;
case 'optimizer-select':{
 const r=window.DBPOpOptimizer?.evaluate(state,b,ui.slot,ui.optimizerPosition);
 if(!r?.ok||!r.options.some(x=>x.key===value))return;
 ui.optimizerSelected=value;render();return;
}
case 'optimizer-save':{
 const optz=window.DBPOpOptimizer,r=optz?.evaluate(state,b,ui.slot,ui.optimizerPosition);
 const source=equipment(ui.slot),candidate=r?.options?.find(x=>x.key===value);
 if(!r?.ok||!source||!candidate||candidate.current){flash('変更するOPを選択してください');return;}
 if(state.items.length>=10000){flash('装備の登録上限に達しています');return;}
 if(!confirm('OPを入れ替えた装備候補を保管庫に追加しますか？\n現在の装備は変更しません。'))return;
 const p=optz.position(ui.slot,ui.optimizerPosition);
 modify(()=>{
  const copy=optz.swapped(source,p,value);
  copy.gems=(source.gems||[]).map(g=>({...g}));
  copy.id=D.uid('item');copy.locked=false;
  copy.opLocks={primary:[...(source.opLocks?.primary||[])],secondary:Boolean(source.opLocks?.secondary)};
  if(p.kind==='primary')copy.opLocks.primary[p.index]=false;else copy.opLocks.secondary=false;
  copy.nickname=(titleOf(source)+' · '+candidate.name).slice(0,120);
  copy.memo=('OP最適化から作成（'+(source.upgradeKnown?'強化段階確認済み':'強化段階未確認')+'）。実際の値はゲーム内で確認してください。').slice(0,1000);
  copy.source='optimizer';copy.owned=null;copy.createdAt=new Date().toISOString();
  state.items.push(copy);ui.itemId=copy.id;ui.detail='compare';
 });
 flash('候補を保管庫へ保存しました。装備中の個体は変更していません。');return;
}
case 'mode-edit':ui.detail='edit';render();break;case 'mode-compare':ui.detail='compare';if(!ui.itemId){const other=state.items.find(i=>i.slot===ui.slot&&i.id!==b.loadout[ui.slot]);ui.itemId=other?.id||b.loadout[ui.slot]}render();break;
case 'select-item':ui.itemId=id;render();break;
case 'new-item':{
 if(state.items.length>=10000){flash('装備候補の登録上限に達しています');return}
 modify(()=>{
  // A new item must NEVER inherit another item's OP locks, fixed values, or name.
  // To reuse an existing item's exact properties, use "個体を複製" explicitly.
  const copy={id:D.uid('item'),definitionId:'custom-'+ui.slot,slot:ui.slot,
   primary:[],secondary:'',upgrade:0,upgradeKnown:false,overrides:{},gems:[],
   nickname:'',locked:false,opLocks:{primary:[],secondary:false},
   source:'user',owned:null,memo:'',createdAt:new Date().toISOString()};
  state.items.push(copy);ui.itemId=copy.id;ui.detail='edit';
 });flash('空の装備候補を追加しました。装備名を選んでください。');break;}
case 'duplicate-item':{const src=getItem(id);if(!src)return;modify(()=>{const cp=JSON.parse(JSON.stringify(src));cp.id=D.uid('item');cp.locked=false;cp.nickname=(src.nickname||def(src)?.name||'候補')+' のコピー';cp.createdAt=new Date().toISOString();state.items.push(cp);ui.itemId=cp.id;ui.detail='edit'});flash('装備個体を複製しました');break}
case 'equip':{const it=getItem(id);
 if(!it){flash('装備候補が見つかりません。ページを再読み込みしてください。');return}
 if(it.slot!==ui.slot){ui.slot=it.slot}
 if(b.loadout[it.slot]===it.id){ui.itemId=it.id;ui.detail='edit';render();flash('すでに装備しています');return}
 // Equipping is reversible: the previous item is kept in the shared library.
 // Do not block it on edit protection, OP locks, or a native confirm dialog.
 modify(()=>{b.loadout[it.slot]=it.id;ui.itemId=it.id;ui.detail='edit'});
 flash('「'+titleOf(it)+'」を'+slotLabel(it.slot)+'に装備しました');break;}
case 'unequip':{const current=equipment(ui.slot);if(!current)return;
 if(!confirm('「'+titleOf(current)+'」をこのビルドから外しますか？\n装備は削除されず保管庫に残ります。'))return;
 modify(()=>{delete b.loadout[ui.slot];ui.itemId=current.id;ui.detail='edit'});
 flash('装備を外しました。保管庫に残っています。');break;}
case 'delete-item':{
 const item=getItem(id);
 if(!item){flash('装備候補が見つかりません。ページを再読み込みしてください。');return}
 ui.deleteTargetId=item.id;ui.modal='delete-item';render();break;
}
case 'confirm-delete-item':{
 // Only the currently displayed delete dialog can authorize a deletion.
 if(ui.modal!=='delete-item'||id!==ui.deleteTargetId){flash('削除対象をもう一度選択してください');return}
 const item=getItem(id);
 if(!item){ui.modal='';ui.deleteTargetId=null;render();flash('対象の装備は見つかりません');return}
 const refs=state.builds.filter(profile=>Object.values(profile.loadout||{}).includes(id));
 const name=titleOf(item),number=refs.length;
 modify(()=>{
  for(const profile of state.builds)for(const [slot,itemId] of Object.entries(profile.loadout||{})){
   if(itemId===id)delete profile.loadout[slot];
  }
  state.items=state.items.filter(candidate=>candidate.id!==id);
  ui.itemId=null;
  ui.deleteTargetId=null;
  ui.modal='';
  ui.detail='edit';
 });
 flash('「'+name+'」を削除しました（使用ビルド '+number+'件の装備を解除）');
 break;
}
case 'compare-equal':ui.compareMode='equal';render();break;case 'compare-actual':ui.compareMode='actual';render();break;
case 'stat':if(!window.DBPStatsView.statKeys.includes(value))return;ui.selectedStat=value;ui.settingsOpen=false;render();break;case 'settings':ui.settingsOpen=true;render();break;case 'close-settings':ui.settingsOpen=false;render();break;
case 'save-locked-set':{if(!canSaveLockedSet()){flash('一式保存には11部位の装備が必要です。固定は不要です。');return}
 if(lockedSets().length>=60){flash('一式の保存は最大60件です。不要なセットを削除してください。');return}
 const name=prompt('保存する一式の名前',b.name+' 保存版');if(!name?.trim())return;
 modify(()=>{const gear={};D.slots.forEach(([slot])=>{gear[slot]=clone(equipment(slot))});
 const saved={id:D.uid('set'),name:name.trim().slice(0,100),createdAt:new Date().toISOString(),sourceBuild:b.name,gear,settings:clone(b.settings||defaultSettings())};
 state.lockedSets??=[];state.lockedSets.push(saved);ui.selectedSetId=saved.id});
 flash('現在の一式を保存しました。装備は固定されていません。');break}
case 'load-locked-set':{const saved=selectedLockedSet();if(!saved)return;
 const valid=D.slots.every(([slot])=>saved.gear?.[slot]?.slot===slot);
 if(!valid){flash('保存した一式の装備データが不正です。JSONバックアップを確認してください。');return}
 if(state.builds.length>=1000||state.items.length+D.slots.length>10000){flash('ビルドまたは装備の保存上限に達しています。');return}
 if(!confirm('「'+saved.name+'」を独立した新しいビルドで開きますか？\n元の一式は変更しません。'))return;
 modify(()=>{const loadout={};D.slots.forEach(([slot])=>{const item=clone(saved.gear[slot]);item.id=D.uid('item');item.locked=false;item.createdAt=new Date().toISOString();item.source='saved-set';state.items.push(item);loadout[slot]=item.id});
 const id=D.uid('build');state.builds.push({id,name:(saved.name+'（編集用）').slice(0,100),loadout,settings:clone(saved.settings||defaultSettings()),createdAt:new Date().toISOString()});
 state.activeBuildId=id;ui.itemId=null;ui.slot='weapon';ui.detail='edit';ui.tab='equipment'});
 flash('元の一式を保持したまま、新しいビルドを作成しました');break}
case 'delete-locked-set':{const saved=selectedLockedSet();if(!saved||!confirm('保存した固定セット「'+saved.name+'」を削除しますか？\n既存ビルドと装備には影響しません。'))return;modify(()=>{state.lockedSets=lockedSets().filter(x=>x.id!==saved.id);ui.selectedSetId=state.lockedSets[0]?.id||null});flash('保存済みの固定セットを削除しました');break}
case 'new-build':ui.modal='new-build';render();break;
case 'new-build-copy':
case 'new-build-empty':
case 'new-build-share':{
 if(state.builds.length>=1000){flash('ビルドの保存上限に達しています');return}
 const mode=action.slice('new-build-'.length),equipped=Object.values(b.loadout||{}).filter(x=>Boolean(getItem(x)));
 if(mode==='copy'&&state.items.length+equipped.length>10000){flash('装備の登録上限に達しています');return}
 const value=document.getElementById('newBuildName')?.value||b.name+' 新構成';
 if(!value.trim()){flash('ビルド名を入力してください');return}
 modify(()=>{const loadout={};
 if(mode==='share')Object.assign(loadout,b.loadout);
 if(mode==='copy')for(const [slot,itemId] of Object.entries(b.loadout||{})){
   const item=getItem(itemId);if(!item)continue;
   const cp=clone(item);cp.id=D.uid('item');cp.locked=false;cp.createdAt=new Date().toISOString();cp.source='build-copy';
   state.items.push(cp);loadout[slot]=cp.id;
 }
 const id=D.uid('build');state.builds.push({id,name:value.trim().slice(0,100),loadout,
 settings:mode==='empty'?defaultSettings():clone(b.settings||defaultSettings()),createdAt:new Date().toISOString()});
 state.activeBuildId=id;ui.slot='weapon';ui.itemId=null;ui.detail='edit';ui.tab='equipment';ui.modal=''});
 flash(mode==='copy'?'独立した装備の一式を作成しました':mode==='share'?'装備共有のビルドを作成しました':'空のビルドを作成しました');break;}
case 'duplicate-build':{const name=prompt('複製するビルド名',b.name+' コピー');if(!name?.trim())return;modify(()=>{const cp=JSON.parse(JSON.stringify(b));cp.id=D.uid('build');cp.name=name.trim().slice(0,100);cp.createdAt=new Date().toISOString();state.builds.push(cp);state.activeBuildId=cp.id});flash('装備参照を共有して複製しました');break}
case 'rename-build':{const name=prompt('ビルド名を変更',b.name);if(name?.trim())modify(()=>{b.name=name.trim().slice(0,100)});break}
case 'delete-build':{if(state.builds.length<2){flash('最後のビルドは削除できません');return}if(!confirm('ビルド「'+b.name+'」を削除しますか？ 装備保管庫と測定履歴は残ります。ランキングの挑戦記録も保存されます。'))return;modify(()=>{state.builds=state.builds.filter(x=>x.id!==b.id);for(const board of state.rankingBoards||[])board.buildIds=(board.buildIds||[]).filter(id=>id!==b.id);state.activeBuildId=state.builds[0].id;ui.itemId=null});break}
case 'ranking-new-board':ui.rankingPreset='boss';ui.modal='ranking-board-new';render();break;
case 'ranking-preset':if(!Object.hasOwn(window.DBPRankings.templates,value))return;ui.rankingPreset=value;render();break;
case 'ranking-create-board':{
 const RK=window.DBPRankings;
 try{
  let result;
  modify(()=>{result=RK.addBoard(state,rankingBoardFields());RK.linkBuild(state,result.id,b.id);
   ui.rankingBoardId=result.id;ui.modal='';ui.tab='ranking';});
  flash('ランキングを登録しました。現在のビルドを紐付けました。');
 }catch(e){flash(e.message)}
 break;
}
case 'ranking-edit-board':ui.modal='ranking-board-edit';render();break;
case 'ranking-update-board':{
 try{modify(()=>{window.DBPRankings.updateBoard(state,ui.rankingBoardId,rankingBoardFields());ui.modal=''});flash('ランキング条件を更新しました')}
 catch(e){flash(e.message)}break;
}
case 'ranking-archive-board':{
 const RK=window.DBPRankings,board=RK.boardById(state,ui.rankingBoardId);
 if(!board)return;
 if(!board.archived&&!confirm('このランキングを終了扱いにしますか？記録は保持します。'))return;
 try{modify(()=>RK.setArchived(state,board.id,!board.archived));flash(board.archived?'ランキングを終了扱いにしました':'ランキングを再開しました')}
 catch(e){flash(e.message)}
 break;
}
case 'ranking-delete-board':{
 const RK=window.DBPRankings,board=RK.boardById(state,ui.rankingBoardId);
 if(!board)return;
 if(RK.runs(state).some(x=>x.boardId===board.id)){flash('挑戦記録があるため削除できません。終了扱いにしてください');return}
 if(!confirm('ランキング「'+board.name+'」を削除しますか？紐付けしたビルドや装備自体は残ります。'))return;
 try{modify(()=>{RK.deleteEmptyBoard(state,board.id);ui.rankingBoardId=RK.boards(state)[0]?.id||''});flash('空のランキングを削除しました')}
 catch(e){flash(e.message)}
 break;
}
case 'ranking-link-build':{
 const RK=window.DBPRankings,id=rankingField('rankingAttachBuild');
 try{modify(()=>RK.linkBuild(state,ui.rankingBoardId,id));flash('ビルドを紐付けました')}
 catch(e){flash(e.message)}
 break;
}
case 'ranking-unlink-build':{
 const RK=window.DBPRankings,board=RK.boardById(state,ui.rankingBoardId);
 if(!board||!board.buildIds?.includes(id))return;
 if(!confirm('このランキングとの紐付けを解除しますか？ビルド・装備・実戦記録は残ります。'))return;
 try{modify(()=>RK.unlinkBuild(state,board.id,id));flash('紐付けを解除しました')}
 catch(e){flash(e.message)}
 break;
}
case 'ranking-duplicate-build':
case 'ranking-copy-active':{
 const RK=window.DBPRankings,source=action==='ranking-copy-active'?b.id:id;
 const board=RK.boardById(state,ui.rankingBoardId);if(!board||board.archived)return;
 if(!confirm('元の装備と設定を独立複製し、このランキング用ビルドを作成しますか？'))return;
 try{let result;modify(()=>{result=RK.copyBuildForBoard(state,board.id,source);state.activeBuildId=result.id;ui.itemId=null});
  flash('独立したランキング用ビルドを作成しました')}
 catch(e){flash(e.message)}
 break;
}
case 'ranking-activate-build':
 if(!state.builds.some(x=>x.id===id))return;
 modify(()=>{state.activeBuildId=id;ui.tab='equipment';ui.itemId=null;ui.modal=''});
 break;
case 'ranking-new-run':{
 const board=window.DBPRankings.boardById(state,ui.rankingBoardId);if(!board||board.archived)return;
 ui.modal='ranking-run-new';render();break;
}
case 'ranking-save-run':{
 try{
  const RK=window.DBPRankings,id=rankingField('rankingRunBuild');
  const fields={value:rankingField('rankingRunValue'),duration:rankingField('rankingRunDuration'),
   at:rankingField('rankingRunDate'),rank:rankingField('rankingRunRank'),
   deaths:rankingField('rankingRunDeaths'),source:rankingField('rankingRunSource'),notes:rankingField('rankingRunNotes')};
  modify(()=>{RK.addRun(state,ui.rankingBoardId,id,fields);ui.modal=''});
  flash('ゲーム内の実戦記録と当時のビルドを保存しました');
 }catch(e){flash(e.message)}
 break;
}
case 'ranking-run-detail':{
 const r=window.DBPRankings.runById(state,id);
 if(!r||r.boardId!==ui.rankingBoardId)return;
 ui.rankingRunId=id;ui.modal='ranking-run-detail';render();break;
}
case 'ranking-delete-run':{
 const RK=window.DBPRankings,r=RK.runById(state,id);
 if(!r||r.boardId!==ui.rankingBoardId)return;
 if(!confirm('挑戦日 '+r.at+' の記録を削除しますか？この操作は元に戻せません。'))return;
 modify(()=>RK.deleteRun(state,id));flash('実戦記録を削除しました');break;
}
case 'compare-builds':ui.compareBuildId=state.builds.find(x=>x.id!==b.id)?.id||'';ui.modal='compare-builds';render();break;
case 'input-review':ui.modal='input-review';render();break;
case 'review-edit-item':{
 if(!D.slots.some(([slot])=>slot===value))return;
 ui.slot=value;ui.itemId=null;ui.detail='edit';ui.tab='equipment';ui.settingsOpen=false;ui.modal='';render();break;
}
case 'review-edit-settings':{
 if(!window.DBPInputReview?.groups.some(x=>x.key===value))return;
 ui.modal='';
 if(value==='talents'){ui.tab='talent';ui.settingsOpen=false}
 else if(value==='pet'){ui.tab='pet';ui.settingsOpen=false}
 else{ui.tab='stats';ui.settingsOpen=true;ui.settingsTab=value}
 render();break;
}
case 'review-confirm-item':{
 const review=window.DBPInputReview;
 if(!review||!review.report(state,b).items.some(x=>x.item?.id===id&&x.problems.length===0)){flash('入力不足を解消してから照合してください');return}
 modify(()=>review.confirmItem(state,b,id));
 flash('装備の入力内容を照合済みにしました');break;
}
case 'review-confirm-settings':{
 const review=window.DBPInputReview;
 if(!review||!review.report(state,b).settings.some(x=>x.key===value&&x.problems.length===0)){flash('設定内容を確認してください');return}
 modify(()=>review.confirmSetting(state,b,value));
 flash('設定の入力内容を照合済みにしました');break;
}
case 'ai-export':ui.modal='ai-export';render();break;
case 'ai-export-copy':{
 const EX=window.DBPAIExport,text=EX.toPrompt(EX.buildReport(state,b));
 const fallback=()=>{
  const el=document.getElementById('aiExportPreview');
  if(!el?.select||typeof document.execCommand!=='function'){flash('手動でプレビューの文字をコピーしてください。');return;}
  el.focus?.();el.select();
  try{flash(document.execCommand('copy')?'コピーしました。ChatGPTに貼り付けてください。':'手動でプレビューの文字をコピーしてください。')}
  catch(_){flash('手動でプレビューの文字をコピーしてください。')}
 };
 if(typeof navigator!=='undefined'&&navigator.clipboard?.writeText){
  navigator.clipboard.writeText(text).then(()=>flash('コピーしました。ChatGPTに貼り付けてください。')).catch(fallback);
 }else fallback();
 return;
}
case 'ai-export-download':{
 const EX=window.DBPAIExport,report=EX.buildReport(state,b);
 const url=URL.createObjectURL(new Blob([EX.toJSON(report)],{type:'application/json;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=EX.filename(report);link.click();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
 flash('AI分析用JSONファイルを保存しました');return;
}
case 'import':fileInput.click();break;
case 'backup':{const data=JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2);const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='Deskrawl_Build_Planner_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);flash('バックアップを保存しました');break;}
case 'cloud':ui.modal='cloud';render();break;case 'modal-close':ui.modal='';render();break;
case 'cloud-config-save':{if(window.DBP_CLOUD_CONFIG?.url){flash('公開用の接続設定が適用されています');return}const url=document.getElementById('cloudUrl')?.value.trim().replace(/\/$/,'');const key=document.getElementById('cloudKey')?.value.trim();if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)||!key){flash('有効なSupabase URLと公開用キーを入力してください');return}if(/service_role|sb_secret/i.test(key)){flash('秘密キーは利用できません。公開用キーを使用してください');return}cloudCfg={url,key};localStorage.setItem(CFG,JSON.stringify(cloudCfg));flash('接続設定を保存しました');render();break}
case 'cloud-login':login();break;case 'cloud-signout':signout();break;case 'cloud-pull':pullCloud(true);break;
case 'measurement':ui.modal='measurement';render();break;
case 'measurement-save':{const fields=['critChance','critRed','cdr','mcr','dodge','mr','armor','maxHP','as','mana'];let values={};for(const key of fields){const v=document.getElementById('measure-'+key)?.value;if(v!=='')values[key]=Number(v)}if(!Object.keys(values).length){flash('数値を少なくとも1つ入力してください');return}modify(()=>{state.measurements.push({id:D.uid('measurement'),at:document.getElementById('measurementDate').value,buildId:b.id,values,notes:document.getElementById('measurementMemo').value,loadout:{...b.loadout},settings:JSON.parse(JSON.stringify(b.settings)),createdAt:new Date().toISOString()});ui.modal=''});flash('実測スナップショットを保存しました');break;}
}
}
function defaultSettings(){return {aura:true,enemyLevel:70,paragonPoints:{},paragonLevel:null,talentPoints:{},talents:{flameWard:0,arcaneReservoir:0},pet:{id:'unknown',level:0,inherit:''},potion:'none',food:'none',utility:'none',base:{}}}
function rankingField(id){return document.getElementById(id)?.value??''}
function rankingBoardFields(){
 return {name:rankingField('rankingName'),season:rankingField('rankingSeason'),
  map:rankingField('rankingMap'),category:rankingField('rankingCategory'),metric:rankingField('rankingMetric'),
  target:rankingField('rankingTarget'),tieDuration:rankingField('rankingTieDuration'),
  notes:rankingField('rankingNotes')};
}
function changed(el){const kind=el.dataset.change,b=build(),id=el.dataset.id,it=getItem(id),v=el.type==='checkbox'?el.checked:el.value;
 if(PU?.isChange(kind)){PU.change(el,{settings:b.settings,modify,flash,render});return}
 if(kind==='optimizer-position'){const p=window.DBPOpOptimizer?.position(ui.slot,v);if(!p)return;ui.optimizerPosition=v;ui.optimizerSelected='';render();return;}
  if(kind==='stat-compare'){
    const SV=window.DBPStatsView,key=el.dataset.key;
    const next=SV.nextComparisonKeys(b.settings,key,Boolean(v));
    if(next===null){render();flash('ステータス比較は最大'+SV.comparisonLimit+'項目です。不要な項目のチェックを外してください。');return}
    modify(()=>{b.settings.statView??={};b.settings.statView.comparisonKeys=next});
    return;
  }
  if(kind==='stat-slot'){
    const key=el.dataset.key;
    if(!D.slots.some(([slot])=>slot===key)){flash('不明な装備部位です');return}
    modify(()=>{b.settings.statView??={};b.settings.statView.slots??={};b.settings.statView.slots[key]=Boolean(v)});
    return;
  }
  if(kind==='stat-source'){
    const key=el.dataset.key;
    if(!window.DBPStatsView.groups.some(g=>g[0]===key)){flash('不明な補正項目です');return}
    modify(()=>{b.settings.statView??={};b.settings.statView.groups??={};b.settings.statView.groups[key]=Boolean(v)});
    return;
  }
  if(kind==='stat-power'){
    const key=el.dataset.key,equipped=window.DBPCombat.equippedEffects(state,b);
    if(!Object.values(equipped.items).includes(key)||!window.DBPCombat.knownPowers[key]){flash('装備中の固有効果ではありません');return}
    modify(()=>{b.settings.statView??={};b.settings.statView.powers??={};b.settings.statView.powers[key]=Boolean(v)});
    return;
  }
 if(kind==='rune-slot'){
  const R=window.DBPRunes,index=Number(el.dataset.idx);
  if(!R.canSelect(b.settings,index,v)){render();flash('セットルーンは同じ番号を2枠に装備できません');return}
  modify(()=>{b.settings.runeSlots=R.selection(b.settings).slots;b.settings.runeSlots[index]=v});
  return;
 }
 if(kind==='dps'){
  const key=el.dataset.key,raw=el.type==='checkbox'?el.checked:el.value;
  const parsed=window.DBPDpsSim?.validate(key,raw);
  if(parsed===undefined){flash('DPS計算条件の入力範囲を確認してください');render();return}
  modify(()=>{
   b.settings.dps??={};
   if(parsed===null)delete b.settings.dps[key];
   else b.settings.dps[key]=parsed;
  });
  return;
 }
 if(kind==='combat'){const key=el.dataset.key,raw=el.type==='checkbox'?el.checked:el.value;const verified=window.DBPCombat?.validateInput(key,raw);if(verified===null||verified===undefined){flash('計算条件の入力範囲を確認してください');render();return}modify(()=>{
 b.settings.combat??={};
 b.settings.combat[key]=verified;
 if(key==='abilityId'&&window.DBPCombat.abilities[verified]){
  const skill=window.DBPCombat.abilities[verified];
  b.settings.combat.attackType=skill[1];b.settings.combat.damageType=skill[2];
  b.settings.combat.lightningAbility=skill[2]==='lightning';
  b.settings.combat.heroLevel=70;b.settings.combat.skillFlat=0;
 }
});return}
 if(kind==='equalLevel'){ui.equalLevel=Number(v);render();return}
 if(kind==='locked'&&it){modify(()=>{it.locked=Boolean(v)});flash(v?'装備を固定しました':'装備の固定を解除しました');return}
 if((kind==='op-lock-primary'||kind==='op-lock-secondary')&&it){
  if(it.locked){render();flash('先に装備全体の固定を解除してください。');return}
  const primary=kind==='op-lock-primary',idx=Number(el.dataset.idx);
  if(primary&&(!Number.isInteger(idx)||idx<0||idx>3)){render();return}
  if(v&&!(primary?it.primary?.[idx]:it.secondary)){render();flash('OPを選択してから必須として固定してください。');return}
  if(countRefs(it.id)>1&&!confirm('共有中の装備です。必須OPの固定状態をすべてのビルドに反映しますか？')){render();return}
  modify(()=>{it.opLocks??={primary:[],secondary:false};if(primary){it.opLocks.primary??=[];it.opLocks.primary[idx]=Boolean(v)}else it.opLocks.secondary=Boolean(v)});
  flash(v?'このOPを必須として固定しました':'OPの固定を解除しました');return;
 }
 if(kind==='gem-tier'&&!['6','7'].includes(String(v))){render();flash('宝石ランクは6か7を選択してください');return}
 if(kind==='gem-value'&&v!==''&&(!Number.isFinite(Number(v))||Number(v)<0)){render();flash('宝石の実測値は0以上の数値で入力してください');return}
 if(['definition','nickname','upgrade','upgradeKnown','owned','primary','secondary','memo','gem','gem-tier','gem-value','override'].includes(kind)&&it){if(it.locked){render();flash('この装備は固定中です。チェックを外してから編集してください。');return}
 const protect=kind==='definition'&&lockedOpCount(it)>0||kind==='primary'&&isOpLocked(it,'primary',Number(el.dataset.idx))||kind==='secondary'&&isOpLocked(it,'secondary')||kind==='override'&&(()=>{const k=String(itKey(el)||'').split(':')[1];return k==='s'?isOpLocked(it,'secondary'):/^[0-3]$/.test(k)&&isOpLocked(it,'primary',Number(k))})();
 if(protect){render();flash('必須OPは固定中です。該当する「必須」チェックを外してから変更してください。');return}if(countRefs(it.id)>1&&!['upgradeKnown'].includes(kind)&&!confirm('この装備は'+countRefs(it.id)+'ビルドで共有されています。変更すると両方に反映されます。続行しますか？')){render();return}modify(()=>{if(kind==='definition'){it.definitionId=v;it.primary=[];it.secondary='';it.opLocks={primary:[],secondary:false};it.overrides={};it.upgradeKnown=false;it.owned=null}else if(kind==='nickname')it.nickname=v.slice(0,120);else if(kind==='upgrade'){if(Number(v)!==Number(it.upgrade))it.upgradeKnown=false;it.upgrade=Number(v)}else if(kind==='upgradeKnown')it.upgradeKnown=v;else if(kind==='owned')it.owned=v==='yes'?true:v==='no'?false:null;else if(kind==='primary'){const idx=Number(el.dataset.idx);if(it.primary.includes(v)&&v!==it.primary[idx]&&v){flash('同じOPを2枠に設定できません');return}while(it.primary.length<4)it.primary.push('');it.primary[idx]=v;if(it.opLocks?.primary)it.opLocks.primary[idx]=false;}else if(kind==='secondary'){it.secondary=v;if(it.opLocks)it.opLocks.secondary=false;}else if(kind==='memo')it.memo=v.slice(0,1000);else if(kind==='override'){it.overrides[itKey(el)]=v===''?null:Number(v)}else if(kind==='gem'||kind==='gem-tier'||kind==='gem-value'){const idx=Number(el.dataset.idx);it.gems??=[];while(it.gems.length<=idx)it.gems.push({type:''});if(kind==='gem')it.gems[idx]={type:v,tier:6};else if(kind==='gem-tier')it.gems[idx]={...it.gems[idx],tier:Number(v),value:null};else it.gems[idx]={...it.gems[idx],value:v===''?null:Number(v)};}});return;}
 if(kind==='aura'){modify(()=>{b.settings.aura=v});return}if(kind==='quickpotion'){modify(()=>{b.settings.potion=v});return}if(kind==='enemyLevel'){modify(()=>{b.settings.enemyLevel=Math.max(1,Math.min(999,Number(v)||70))});return}
 if(kind==='paragonPoint'){
    const def=D.paragonStats.find(x=>x.key===el.dataset.key),input=Number(v);
    if(!def||v!==''&&(!Number.isSafeInteger(input)||input<0)){render();flash('パラゴンは0以上の整数ポイントで入力してください');return}
    const next=Math.min(def.max??Number.MAX_SAFE_INTEGER,v===''?0:input);
    const current=D.paragonAllocation(b.settings);
    if(current.legacy&&current.issues.length){render();flash('旧パラゴン補正値に変換できない項目があります。バックアップを確認してください。');return}
    const nextTotal=current.total-current.points[def.key]+next;
    const level=b.settings?.paragonLevel;
    if(level!==undefined&&level!==null&&nextTotal>Number(level)){render();flash('パラゴンレベル（所持ポイント数）を超えて割り振れません');return}
    modify(()=>{b.settings.paragonPoints={...current.points,[def.key]:next}});
    if(next!==input)flash(def.label+'は最大'+def.max+'ptに補正しました');
    return;
  }
  if(kind==='paragonLevel'){
    if(v===''){modify(()=>{b.settings.paragonLevel=null});return}
    const num=Number(v);
    if(!Number.isSafeInteger(num)||num<0){render();flash('パラゴンレベルは0以上の整数にしてください');return}
    if(num<D.paragonAllocation(b.settings).total){render();flash('割り振り済みポイント数を下回るレベルには設定できません');return}
    modify(()=>{b.settings.paragonLevel=num});return;
  }
  if(kind==='setting'){const [group,key]=el.dataset.key.split('.');modify(()=>{b.settings[group]??={};b.settings[group][key]=v===''?'':Number(v)});return}
 if(kind==='petId'||kind==='inherit'){modify(()=>{b.settings.pet??={};b.settings.pet[kind==='petId'?'id':'inherit']=v});return}
 if(kind==='food'||kind==='utility')modify(()=>{b.settings[kind]=v});
}
function itKey(el){return el.dataset.key}
app.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el)return;const {action,id,value}=el.dataset;if(action==='modal-close'&&e.target.closest('.modal-panel')&&e.target!==el)return;act(action==='talent-add'&&e.shiftKey?'talent-remove':action,id,value,el)});
app.addEventListener('contextmenu',e=>{const el=e.target.closest?.('[data-action="talent-add"]');if(!el||!window.DBPTalents)return;e.preventDefault();act('talent-remove',null,el.dataset.value,el)});
app.addEventListener('change',e=>{const el=e.target;if(el.id==='rankingBoardSelect'){ui.rankingBoardId=el.value;render();return}if(el.id==='buildSelect'){state.activeBuildId=el.value;ui.itemId=null;save();return}if(el.id==='lockedSetSelect'){ui.selectedSetId=el.value;render();return}if(el.id==='settingsCategory'){ui.settingsTab=el.value;render();return}if(el.id==='otherBuild'){ui.compareBuildId=el.value;render();return}if(el.dataset.change)changed(el)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ui.modal){ui.modal='';render()}});
window.addEventListener('storage',e=>{if(e.key===LS&&e.newValue&&e.newValue!==JSON.stringify(state)){ui.status='conflict';flash('別タブでの変更を検知しました。バックアップを確認してください。');render()}});
// File import control created independently of app render.
const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='.json,application/json';fileInput.style.display='none';document.body.appendChild(fileInput);fileInput.onchange=async()=>{const file=fileInput.files?.[0];if(!file)return;try{const json=validateState(JSON.parse(await file.text()));if(!confirm('バックアップ内容で現在のビルドデータを置き換えますか？先にバックアップを保存することを推奨します。'))return;state=json;ui.itemId=null;ui.modal='';save();flash('JSONから復元しました')}catch(e){flash('JSONの形式が正しくありません：'+e.message)}finally{fileInput.value=''}};
// Add import via attached global action so that the modal doesn't need an external dependency.
document.addEventListener('click',e=>{const btn=e.target.closest('[data-global-action="import"]');if(btn)fileInput.click()});
// ---------- Supabase native REST cloud adapter (no secret keys or npm required) ----------
function headers(extra={}){return {'apikey':cloudCfg.key,'Authorization':'Bearer '+session.access_token,'Content-Type':'application/json',...extra}}
async function api(path,init={}){const res=await fetch(cloudCfg.url+path,{...init,headers:{...headers(),...(init.headers||{})}});const text=await res.text();let result;try{result=text?JSON.parse(text):null}catch(e){result=text}if(!res.ok){const err=Error(typeof result==='object'?result.message||result.error_description||res.statusText:res.status+' '+res.statusText);err.status=res.status;throw err;}return result}
async function ensureToken(){if(!session||!cloudCfg)return false;if(Date.now()<session.expiresAt-60000)return true;try{const res=await fetch(cloudCfg.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'apikey':cloudCfg.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});if(!res.ok)throw Error('更新失敗');const j=await res.json();session={...session,access_token:j.access_token,refresh_token:j.refresh_token,expiresAt:Date.now()+j.expires_in*1000};localStorage.setItem(SESSION,JSON.stringify(session));return true}catch(e){ui.status='error';flash('セッション更新に失敗しました。再ログインしてください。');render();return false}}
async function login(){if(!cloudCfg)return flash('Supabase接続情報を入力してください');const redirect=location.origin+location.pathname;location.href=cloudCfg.url+'/auth/v1/authorize?provider=github&redirect_to='+encodeURIComponent(redirect)}
function signout(){session=null;cloudSyncBlocked=false;cloudDirty=false;cloudRevision=0;clearTimeout(cloudSaveTimer);localStorage.removeItem(SESSION);ui.status='local';ui.modal='';render();flash('クラウドからログアウトしました。ローカルデータは残っています。')}
async function initCloud(){if(location.hash.includes('access_token=')){const p=new URLSearchParams(location.hash.slice(1));const access_token=p.get('access_token'),refresh_token=p.get('refresh_token'),expires_in=Number(p.get('expires_in'))||3600;if(access_token&&refresh_token){session={access_token,refresh_token,expiresAt:Date.now()+expires_in*1000};localStorage.setItem(SESSION,JSON.stringify(session));history.replaceState(null,'',location.pathname+location.search);}}
 if(!session||!cloudCfg)return;try{await ensureToken();const user=await api('/auth/v1/user');session.user={id:user.id,email:user.email};localStorage.setItem(SESSION,JSON.stringify(session));await pullCloud(false)}catch(e){ui.status='error';ui.cloudNote=e.message;render();flash('クラウド接続に失敗しました：'+e.message)}}
async function pullCloud(force){if(!session||!cloudCfg)return;try{await ensureToken();const user=session.user||await api('/auth/v1/user');session.user=user;const records=await api('/rest/v1/planner_state?select=payload,revision&user_id=eq.'+encodeURIComponent(user.id));if(records.length){const rec=records[0];validateState(rec.payload);cloudRevision=rec.revision;const differs=JSON.stringify(state)!==JSON.stringify(rec.payload);if((force||differs)&&!confirm('クラウドとローカルのデータが異なります。\nOK：クラウドのデータを読み込む\nキャンセル：ローカルを保持（同期は停止）\n必要なら先にJSONバックアップを保存してください。')){cloudSyncBlocked=true;ui.status='conflict';render();flash('ローカルを保持しました。自動同期を停止しています。再読込で競合を解消してください。');return;}state=rec.payload;localStorage.setItem(LS,JSON.stringify(state));cloudSyncBlocked=false;cloudDirty=false;ui.status='synced';ui.modal='';render();flash('クラウドの最新データを読み込みました')}else{cloudRevision=0;cloudSyncBlocked=false;cloudDirty=true;await pushCloud();ui.modal='';render();flash('初期データをクラウドに登録しました')}}catch(e){ui.status='error';render();flash('クラウド読込失敗: '+e.message)}}
async function pushCloud(){if(cloudBusy||!cloudDirty||!session||!cloudCfg||cloudSyncBlocked)return;if(!await ensureToken())return;cloudBusy=true;const snapshot=JSON.stringify(state);try{let data;if(cloudRevision===0){data=await api('/rest/v1/planner_state?select=user_id,revision',{method:'POST',headers:{'Prefer':'return=representation'},body:JSON.stringify({user_id:session.user.id,payload:state,revision:1})})}else{data=await api('/rest/v1/planner_state?user_id=eq.'+encodeURIComponent(session.user.id)+'&revision=eq.'+cloudRevision+'&select=revision',{method:'PATCH',headers:{'Prefer':'return=representation'},body:JSON.stringify({payload:state,revision:cloudRevision+1})})}if(!data||!data.length){cloudSyncBlocked=true;ui.status='conflict';flash('別端末との同期競合。ローカルの変更は残っています。クラウドを再読込する前にJSONバックアップしてください。')}else{cloudRevision=data[0].revision;if(snapshot===JSON.stringify(state)){cloudDirty=false;ui.status='synced'}else{cloudDirty=true;ui.status='saving'}}}catch(e){if(e.status===409||e.status===412){cloudSyncBlocked=true;ui.status='conflict';flash('同期競合を検知。ローカルは保持しています。クラウドから再読み込みしてください。')}else{ui.status='error';flash('クラウド保存失敗。ローカルの変更は残っています: '+e.message)}}finally{cloudBusy=false;render();if(cloudDirty&&ui.status==='saving')setTimeout(pushCloud,300)}}
render();initCloud();
// Export a smoke-test object; not a public SDK.
window.DBPApp={getState:()=>JSON.parse(JSON.stringify(state)),getUI:()=>({...ui}),calc:()=>C.calc(state,build())};
})();
