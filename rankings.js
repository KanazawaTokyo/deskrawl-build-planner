/* Ranking-specific build preparation and immutable gameplay attempt records.
 * Ranking lists / leaderboards are server-provided in Deskrawl. The preset
 * categories below are local templates, NOT assertions about live boards.
 * Never infer ranks, times, score algorithms or game telemetry.
 */
(function(){'use strict';
const D=window.DBP;
const templates={
 boss:{name:'ワールドボス',category:'boss',metric:'time'},
 rift:{name:'ミシックリフト',category:'rift',metric:'tier'},
 heroic:{name:'ヒロイックマップ',category:'heroic',metric:'time'},
 custom:{name:'',category:'other',metric:'time'}
};
const categories={boss:'ワールドボス',rift:'ミシックリフト',heroic:'ヒロイックマップ',other:'その他'};
const metrics={time:'最短クリア時間',tier:'最高到達Tier',score:'最高スコア'};
const limits={boards:100,runs:500};
const clone=x=>JSON.parse(JSON.stringify(x));
const array=x=>Array.isArray(x)?x:[];
const textValue=(value,max)=>String(value??'').trim().slice(0,max);
const safeNumber=(value,min=0,max=1e9,integer=false)=>{
 if(value===null||value===undefined||String(value).trim()==='')return null;
 const n=Number(value);
 if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isSafeInteger(n)))return null;
 return n;
};
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const boards=state=>array(state.rankingBoards);
const runs=state=>array(state.rankingRuns);
const boardById=(state,id)=>boards(state).find(b=>b.id===id)||null;
const runById=(state,id)=>runs(state).find(r=>r.id===id)||null;
const template=key=>templates[key]||templates.custom;
function boardInput(raw,existing){
 const title=textValue(raw.name,120),season=textValue(raw.season,80),
  map=textValue(raw.map,120),notes=textValue(raw.notes,500);
 const category=raw.category,metric=raw.metric;
 if(!title)throw Error('ランキング名を入力してください');
 if(!Object.hasOwn(categories,category)||!Object.hasOwn(metrics,metric))throw Error('ランキング種別・記録方式が不正です');
 const target=raw.target===''||raw.target===undefined||raw.target===null?null:
  safeNumber(raw.target,metric==='time'?0.001:0.000001,1e9,metric==='tier');
 if(raw.target!==''&&raw.target!==undefined&&raw.target!==null&&target===null)
  throw Error('1位記録は正の数値で入力してください');
 const tie=raw.tieDuration===''||raw.tieDuration===undefined||raw.tieDuration===null?null:
  safeNumber(raw.tieDuration,0.001,1e7);
 if(raw.tieDuration!==''&&raw.tieDuration!==undefined&&raw.tieDuration!==null&&tie===null)
  throw Error('同一Tierの比較時間は0より大きい数値で入力してください');
 return {...existing,name:title,season,map,notes,category,metric,target,tieDuration:metric==='tier'?tie:null};
}
function addBoard(state,raw,uid=D.uid){
 if(boards(state).length>=limits.boards)throw Error('ランキング登録数の上限です');
 const b=boardInput(raw);
 if(boards(state).some(x=>x.name===b.name&&x.season===b.season&&x.map===b.map))
  throw Error('同じランキング・シーズン・対象は登録済みです');
 const result={...b,id:uid('ranking'),buildIds:[],archived:false,createdAt:new Date().toISOString()};
 state.rankingBoards??=[];state.rankingBoards.push(result);return result;
}
function updateBoard(state,id,raw){
 const b=boardById(state,id);if(!b)throw Error('ランキングが見つかりません');
 const next=boardInput(raw,b);
 if(next.metric!==b.metric&&runs(state).some(r=>r.boardId===id))
  throw Error('記録があるランキングの測定方式は変更できません');
 if(boards(state).some(x=>x.id!==id&&x.name===next.name&&x.season===next.season&&x.map===next.map))
  throw Error('同じランキング・シーズン・対象は登録済みです');
 Object.assign(b,next);return b;
}
function setArchived(state,id,archived){
 const b=boardById(state,id);if(!b)throw Error('ランキングが見つかりません');
 b.archived=Boolean(archived);return b;
}
function deleteEmptyBoard(state,id){
 const b=boardById(state,id);if(!b)throw Error('ランキングが見つかりません');
 if(runs(state).some(x=>x.boardId===id))throw Error('実戦記録があるランキングは削除できません。終了扱いにしてください');
 state.rankingBoards=boards(state).filter(x=>x.id!==id);
}
function linkBuild(state,boardId,buildId){
 const b=boardById(state,boardId);if(!b)throw Error('ランキングが見つかりません');
 if(!state.builds.some(x=>x.id===buildId))throw Error('ビルドが見つかりません');
 b.buildIds??=[];
 if(!b.buildIds.includes(buildId))b.buildIds.push(buildId);
}
function unlinkBuild(state,boardId,buildId){
 const b=boardById(state,boardId);if(!b)throw Error('ランキングが見つかりません');
 b.buildIds=array(b.buildIds).filter(x=>x!==buildId);
}
function copyBuildForBoard(state,boardId,sourceBuildId,uid=D.uid){
 const board=boardById(state,boardId),source=state.builds.find(x=>x.id===sourceBuildId);
 if(!board||!source)throw Error('ランキングかビルドが見つかりません');
 const equipped=Object.entries(source.loadout||{}).filter(([,id])=>state.items.some(x=>x.id===id));
 if(state.items.length+equipped.length>10000||state.builds.length>=1000)throw Error('装備またはビルド登録上限です');
 const loadout={},newItems=[];
 for(const [slot,id] of equipped){
  const it=state.items.find(x=>x.id===id);const cp=clone(it);
  cp.id=uid('item');cp.locked=false;cp.source='ranking-variant';cp.owned=null;
  cp.createdAt=new Date().toISOString();newItems.push(cp);loadout[slot]=cp.id;
 }
 const baseName=(source.name+' · '+board.name).slice(0,92);
 let name=baseName,number=2;
 while(state.builds.some(x=>x.name===name))name=baseName+' #'+(number++);
 const variant={id:uid('build'),name,loadout,
  settings:clone(source.settings||{}),createdAt:new Date().toISOString()};
 // Keep previous verification only for unchanged settings. Items have fresh IDs,
 // and therefore cannot falsely inherit prior per-item confirmations.
 if(source.inputReview?.settings)variant.inputReview={settings:clone(source.inputReview.settings)};
 state.items.push(...newItems);state.builds.push(variant);
 linkBuild(state,boardId,variant.id);return variant;
}
function readAttempt(raw,metric){
 const value=safeNumber(raw.value,metric==='time'?0.001:metric==='tier'?1:0.000001,1e9,metric==='tier');
 if(value===null)throw Error(metric==='tier'?'到達Tierを整数で入力してください':'有効な実戦記録を入力してください');
 const duration=raw.duration===''||raw.duration===null||raw.duration===undefined?null:safeNumber(raw.duration,0.001,1e7);
 if(raw.duration!==''&&raw.duration!==null&&raw.duration!==undefined&&duration===null)throw Error('所要時間は正の秒数で入力してください');
 const rank=raw.rank===''||raw.rank===null||raw.rank===undefined?null:safeNumber(raw.rank,1,1000000,true);
 if(raw.rank!==''&&raw.rank!==null&&raw.rank!==undefined&&rank===null)throw Error('ランキング順位は1以上の整数です');
 const deaths=raw.deaths===''||raw.deaths===null||raw.deaths===undefined?null:safeNumber(raw.deaths,0,100000,true);
 if(raw.deaths!==''&&raw.deaths!==null&&raw.deaths!==undefined&&deaths===null)throw Error('死亡回数は0以上の整数です');
 const at=textValue(raw.at,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(at)||Number.isNaN(Date.parse(at+'T12:00:00Z'))||new Date(at+'T12:00:00Z').toISOString().slice(0,10)!==at)
  throw Error('正しい日付を入力してください');
 const source=['server','manual'].includes(raw.source)?raw.source:null;
 if(!source)throw Error('記録の出典を選択してください');
 return {value,duration:metric==='tier'?duration:null,rank,deaths,at,source,notes:textValue(raw.notes,800)};
}
function snapshot(state,build){
 const gear={};
 for(const [slot] of D.slots){
  const item=state.items.find(x=>x.id===build.loadout?.[slot]);
  if(item){const copy=clone(item),definition=D.definitions.find(x=>x.id===item.definitionId&&x.slot===slot);delete copy.id;copy.definitionName=definition?.name||item.definitionId;copy.definitionRarity=definition?.rarity||null;gear[slot]=copy}
  else gear[slot]=null;
 }
 const review=window.DBPInputReview?.report(state,build);
 return {name:build.name,gear,settings:clone(build.settings||{}),
  review:review?{complete:review.complete,total:review.total}:null,
  gameMasterVersion:D.version};
}
function addRun(state,boardId,buildId,raw,uid=D.uid){
 const board=boardById(state,boardId),b=state.builds.find(x=>x.id===buildId);
 if(!board||!b)throw Error('ランキングかビルドが見つかりません');
 if(board.archived)throw Error('終了したランキングには記録を追加できません');
 if(runs(state).length>=limits.runs)throw Error('実戦記録の登録上限です');
 const value=readAttempt(raw,board.metric);
 const result={id:uid('run'),boardId,buildId,buildName:b.name,
  metric:board.metric,...value,createdAt:new Date().toISOString(),snapshot:snapshot(state,b)};
 state.rankingRuns??=[];state.rankingRuns.push(result);
 linkBuild(state,boardId,buildId);
 return result;
}
function deleteRun(state,id){
 if(!runById(state,id))throw Error('実戦記録が見つかりません');
 state.rankingRuns=runs(state).filter(x=>x.id!==id);
}
function compare(a,b,metric){
 if(metric==='time'){
  if(a.value!==b.value)return a.value-b.value;
 }else{
  if(a.value!==b.value)return b.value-a.value;
  if(metric==='tier'&&a.duration!=null&&b.duration!=null&&a.duration!==b.duration)return a.duration-b.duration;
 }
 return a.createdAt.localeCompare(b.createdAt);
}
function sortedRuns(state,boardId){
 const b=boardById(state,boardId);if(!b)return [];
 return runs(state).filter(x=>x.boardId===boardId&&x.metric===b.metric).sort((a,c)=>compare(a,c,b.metric));
}
function buildBests(state,boardId){
 const best=new Map();
 for(const run of sortedRuns(state,boardId))if(!best.has(run.buildId))best.set(run.buildId,run);
 return best;
}
const num=n=>Number(n).toLocaleString('ja-JP',{maximumFractionDigits:3});
function resultText(metric,value,duration){
 if(metric==='time')return num(value)+' 秒';
 if(metric==='tier')return 'Tier '+num(value)+(duration!=null?' · '+num(duration)+' 秒':'');
 return num(value)+' pt';
}
function gapText(board,run){
 if(board.target==null||!run)return null;
 const target=board.target,actual=run.value;
 if(board.metric==='time'){
  const gap=actual-target;
  return (gap>0?'+':'')+num(gap)+' 秒'+(gap>0?'（1位記録より遅い）':gap<0?'（登録した1位記録より速い）':'（同記録）');
 }
 const gap=target-actual;
 if(board.metric==='tier'&&gap===0&&board.tieDuration!=null&&run.duration!=null){
  const diff=run.duration-board.tieDuration;
  return (diff>0?'+':'')+num(diff)+' 秒（同一Tierでの比較）';
 }
 return (gap>0?'+':'')+num(gap)+(board.metric==='tier'?' Tier':' pt')+
  (gap>0?'（1位記録まで）':gap<0?'（登録した1位記録を超過）':'（同記録）');
}
function render({state,selectedBoardId,E,opt}){
 const all=boards(state),board=boardById(state,selectedBoardId)||all[0];
 const rr=board?sortedRuns(state,board.id):[];
 const best=rr[0];
 const linked=board?array(board.buildIds):[];
 const bests=board?buildBests(state,board.id):new Map();
 let html='<main class="workspace ranking-workspace">'+
  '<div class="page-heading"><div class="eyebrow">RANKING LAB</div><h1>ランキング攻略</h1>'+
  '<p>ランキングごとにビルドを準備し、ゲーム内の結果を記録します。予測値や実際のランキング順位を自動取得する機能ではありません。</p></div>'+
  '<div class="ranking-topbar"><label class="field ranking-board-picker"><span>対象ランキング</span><select id="rankingBoardSelect">'+
   (all.length?all.map(x=>opt(x.id,(x.archived?'［終了］':'')+x.name+(x.season?' · '+x.season:''),board?.id)).join(''):opt('','未登録',''))+
   '</select></label><button class="btn" data-action="ranking-new-board">＋ ランキングを登録</button></div>';
 if(!board){
  return html+'<div class="ranking-empty card"><h2>対象ランキングを登録してください</h2>'+
  '<p>最初の登録には「ワールドボス」「ミシックリフト」「ヒロイックマップ」のテンプレートが使えます。公式の対象名・シーズン・採点方式を確認してから保存してください。</p>'+
  '<button class="btn" data-action="ranking-new-board">登録を始める</button></div></main>';
 }
 html+='<section class="ranking-overview card">'+
  '<div class="ranking-heading"><div><div class="eyebrow">'+E(categories[board.category]||'その他')+
  '</div><h2>'+E(board.name)+'</h2><p class="muted">'+E(board.season||'シーズン未入力')+
  (board.map?' · '+E(board.map):'')+' · '+E(metrics[board.metric])+'</p></div>'+
  '<div class="ranking-actions"><button class="text-btn" data-action="ranking-edit-board">条件を編集</button>'+
  '<button class="text-btn" data-action="ranking-archive-board">'+(board.archived?'再開する':'終了扱いにする')+'</button>'+
  '<button class="text-btn" data-action="ranking-delete-board">削除</button></div></div>'+
  (board.archived?'<div class="notice gentle">このランキングは終了扱いです。過去の記録は閲覧できます。</div>':'')+
  (board.notes?'<p class="helper">'+E(board.notes)+'</p>':'')+
  '<div class="ranking-metrics">'+
   '<div><small>自分のベスト</small><strong>'+E(best?resultText(board.metric,best.value,best.duration):'未記録')+'</strong></div>'+
   '<div><small>1位の記録（手入力）</small><strong>'+E(board.target!=null?resultText(board.metric,board.target,board.tieDuration):'未入力')+'</strong></div>'+
   '<div><small>記録数</small><strong>'+rr.length+'</strong></div></div>'+
  (best&&board.target!=null?'<p class="ranking-gap">目標との差：'+E(gapText(board,best))+'</p>':'')+
  '<p class="helper">1位記録は確認した時点の手入力値です。シーズン中に更新される可能性があります。</p></section>';
 html+='<section class="card ranking-builds"><div class="card-heading"><div><h2>このランキングのビルド</h2><span>同じ装備を共有することも、独立した仮想コピーを作ることもできます</span></div></div>'+
  '<div class="ranking-build-list">'+(linked.length?linked.map(id=>{
    const b=state.builds.find(x=>x.id===id),bestRun=bests.get(id);
    if(!b)return '';
    return '<div class="ranking-build-row"><div><strong>'+E(b.name)+'</strong><small>'+
     E(bestRun?resultText(board.metric,bestRun.value,bestRun.duration):'記録なし')+
     '</small></div><div class="ranking-build-actions">'+
     '<button class="text-btn" data-action="ranking-activate-build" data-id="'+E(id)+'">編集する</button>'+
     '<button class="text-btn" data-action="ranking-duplicate-build" data-id="'+E(id)+'" '+(board.archived?'disabled':'')+'>独立複製</button>'+
     '<button class="text-btn" data-action="ranking-unlink-build" data-id="'+E(id)+'">紐付け解除</button></div></div>';
  }).join(''):'<p class="muted">紐付けされたビルドはありません。既存ビルドを追加するか、独立複製してください。</p>')+'</div>'+
  (board.archived?'':'<div class="ranking-build-add"><label class="field"><span>既存ビルドを紐付け</span><select id="rankingAttachBuild">'+
   state.builds.map(x=>opt(x.id,x.name,'')).join('')+'</select></label>'+
   '<button class="btn outline" data-action="ranking-link-build">紐付ける</button>'+
   '<button class="btn" data-action="ranking-copy-active">現在のビルドを独立複製</button></div>')+
  '<p class="helper">独立複製は現在の11部位と設定をコピーして編集用ビルドを作ります。元の装備個体・元ビルドは変更されません。</p></section>';
 html+='<section class="card ranking-runs"><div class="card-heading"><div><h2>実戦記録</h2><span>実際のゲーム内結果を登録。記録時点の装備・設定を保存します</span></div>'+
  (board.archived?'':'<button class="btn" data-action="ranking-new-run">＋ 挑戦結果を記録</button>')+'</div>'+
  (rr.length?'<div class="ranking-run-list">'+rr.slice(0,100).map(x=>{
   const buildName=x.buildName||'ビルド名未記録';
   return '<div class="ranking-run-row"><div><strong>'+E(resultText(board.metric,x.value,x.duration))+
    '</strong><small>'+E(x.at)+' · '+E(buildName)+
    (x.rank?' · '+x.rank+'位':'')+(x.deaths!=null?' · 死亡'+x.deaths:'')+
    (x.source==='server'?' · サーバー画面転記':' · 手動計測')+'</small>'+
    (x.notes?'<small>'+E(x.notes)+'</small>':'')+'</div><div class="ranking-run-actions">'+
    '<button class="text-btn" data-action="ranking-run-detail" data-id="'+E(x.id)+'">当時の装備</button>'+
    '<button class="text-btn" data-action="ranking-delete-run" data-id="'+E(x.id)+'">削除</button></div></div>';
  }).join('')+'</div>':'<p class="muted">まだ記録がありません。挑戦結果はビルド登録が未完成でも保存できます。</p>')+
  (rr.length>100?'<p class="helper">上位100件を表示中です。全件はバックアップJSONに保持されます。</p>':'')+
  '</section></main>';
 return html;
}
function boardModal({board,preset,E,opt}){
 const p=board||template(preset);
 const heading=board?'ランキングの条件を編集':'ランキングを登録';
 const options=Object.entries(templates).map(([k,t])=>'<button class="text-btn" data-action="ranking-preset" data-value="'+k+'" '+(board?'disabled':'')+'>'+
  E(k==='custom'?'自由入力':t.name)+'</button>').join('');
 return '<div class="modal-title"><h2>'+heading+'</h2><button class="icon-btn" data-action="modal-close">×</button></div>'+
 (board?'':'<div class="ranking-presets">'+options+'</div><p class="helper">テンプレートは入力補助です。現在開催中のランキング一覧ではありません。</p>')+
 '<div class="ranking-form">'+
 '<label class="field"><span>ランキング名（必須）</span><input id="rankingName" maxlength="120" value="'+E(p.name||'')+'" placeholder="例：パンプキンキング"/></label>'+
 '<label class="field"><span>シーズン（任意）</span><input id="rankingSeason" maxlength="80" value="'+E(p.season||'')+'" placeholder="例：Season 3"/></label>'+
 '<label class="field"><span>対象マップ・ボス名（任意）</span><input id="rankingMap" maxlength="120" value="'+E(p.map||'')+'" placeholder="例：Pumpkin King · Cap III"/></label>'+
 '<label class="field"><span>種別</span><select id="rankingCategory">'+Object.entries(categories).map(([id,label])=>opt(id,label,p.category||'other')).join('')+'</select></label>'+
 '<label class="field"><span>順位を競う記録方式</span><select id="rankingMetric">'+Object.entries(metrics).map(([id,label])=>opt(id,label,p.metric||'time')).join('')+'</select></label>'+
 '<label class="field"><span>1位の記録（任意：時間は秒、Tierは整数、スコアはpt）</span><input id="rankingTarget" type="number" min="0" step="any" value="'+E(p.target??'')+'" placeholder="例：28.15"/></label>'+
 '<label class="field"><span>1位の同一Tierクリア時間（任意：秒）</span><input id="rankingTieDuration" type="number" min="0" step="any" value="'+E(p.tieDuration??'')+'" placeholder="Tier同点時のみ"/></label>'+
 '<label class="field"><span>ランキング条件・制限・調査メモ</span><textarea id="rankingNotes" rows="3" maxlength="500">'+E(p.notes||'')+'</textarea></label>'+
 '</div><p class="helper">数値は自動取得・検証されません。実際のゲーム内ランキングの採点方式と一致させてください。記録登録後は採点方式を変更できません。</p>'+
 '<div class="modal-actions"><button class="btn outline" data-action="modal-close">キャンセル</button>'+
 '<button class="btn" data-action="'+(board?'ranking-update-board':'ranking-create-board')+'">保存する</button></div>';
}
function runModal({board,state,E,opt}){
 const linked=array(board.buildIds).filter(id=>state.builds.some(x=>x.id===id));
 const candidates=linked.length?linked:state.builds.map(x=>x.id);
 return '<div class="modal-title"><h2>実戦記録 · '+E(board.name)+'</h2><button class="icon-btn" data-action="modal-close">×</button></div>'+
 '<p class="helper">ゲーム内のリザルト画面に表示された値を登録してください。自動計測やランキングへの自動投稿は行いません。</p>'+
 '<div class="ranking-form">'+
 '<label class="field"><span>使用したビルド</span><select id="rankingRunBuild">'+candidates.map(id=>{
  const b=state.builds.find(x=>x.id===id);return opt(id,b.name,id===state.activeBuildId?id:'');
 }).join('')+'</select></label>'+
 '<label class="field"><span>挑戦日</span><input id="rankingRunDate" type="date" value="'+today()+'"/></label>'+
 '<label class="field"><span>'+E(board.metric==='time'?'サーバー記録のクリア時間（秒）':board.metric==='tier'?'到達Tier（整数）':'スコア（pt）')+'</span>'+
 '<input id="rankingRunValue" type="number" min="0" step="'+(board.metric==='tier'?'1':'any')+'" required placeholder="'+(board.metric==='tier'?'例：25':'例：32.58')+'"/></label>'+
 (board.metric==='tier'?'<label class="field"><span>クリア時間（秒・任意。同一Tierでの比較に使用）</span><input id="rankingRunDuration" type="number" min="0" step="any" placeholder="例：420.30"/></label>':'')+
 '<label class="field"><span>順位（任意）</span><input id="rankingRunRank" type="number" min="1" step="1" placeholder="例：3"/></label>'+
 '<label class="field"><span>死亡回数（任意）</span><input id="rankingRunDeaths" type="number" min="0" step="1" placeholder="例：0"/></label>'+
 '<label class="field"><span>記録の出典</span><select id="rankingRunSource">'+
  opt('server','ゲーム内サーバー記録を転記','server')+opt('manual','手動計測','server')+'</select></label>'+
 '<label class="field"><span>メモ（任意）</span><textarea id="rankingRunNotes" rows="3" maxlength="800" placeholder="死亡原因、手動操作、戦闘条件など"></textarea></label>'+
 '</div><p class="helper">保存時点の装備11部位とタレント・ルーン・ペットなどの設定を別に保存します。その後ビルドを編集・削除しても記録は残ります。</p>'+
 '<div class="modal-actions"><button class="btn outline" data-action="modal-close">キャンセル</button>'+
 '<button class="btn" data-action="ranking-save-run">実戦結果を保存</button></div>';
}
function runDetailModal({state,run,E}){
 const board=boardById(state,run.boardId),snap=run.snapshot||{},gear=snap.gear||{};
 const names=D.slots.map(([slot,label])=>{
  const i=gear[slot],def=D.definitions.find(x=>x.id===i?.definitionId&&x.slot===slot);
  const name=i?.nickname||i?.definitionName||def?.name||i?.definitionId||'未装備';
  const affixes=i?[...(i.primary||[]).filter(Boolean).map(x=>D.affixes[x]?.[0]||x),...(i.secondary?[D.affixes[i.secondary]?.[0]||i.secondary]:[])]:[];
  return '<div class="ranking-snapshot-row"><div><strong>'+E(label)+'</strong><small>'+E(affixes.join(' / ')||'OP未入力')+'</small></div><span>'+E(name)+
   (i?.upgradeKnown?' · +'+E(i.upgrade):' · 強化未確認')+'</span></div>';
 }).join('');
 return '<div class="modal-title"><h2>挑戦当時のビルド</h2><button class="icon-btn" data-action="modal-close">×</button></div>'+
 '<div class="notice gentle">'+E(board?.name||'削除済みランキング')+' · '+E(run.at)+' · '+E(run.buildName||snap.name||'ビルド')+'</div>'+
 '<p class="helper">記録：'+E(resultText(run.metric,run.value,run.duration))+
 (run.rank?' · '+E(run.rank)+'位':'')+'</p>'+
 '<div class="ranking-snapshot">'+names+'</div>'+
 '<p class="helper">記録時のゲームデータマスター：'+E(snap.gameMasterVersion||'未記録')+
 ' · 入力照合：'+E(snap.review?snap.review.complete+'/'+snap.review.total:'未記録')+'</p>'+
 '<p class="helper">ルーン：'+E(array(snap.settings?.runeSlots).filter(Boolean).length)+'/6 · ペット：'+
 E(snap.settings?.pet?.id||'未設定')+' · パラゴンレベル：'+E(snap.settings?.paragonLevel??'未確認')+'</p>'+
 '<details class="ranking-snapshot-json"><summary>全装備・設定の保存データを表示（読み取り専用）</summary><pre>'+E(JSON.stringify({gear:snap.gear,settings:snap.settings},null,2))+'</pre></details>'+
 '<div class="modal-actions"><button class="btn" data-action="modal-close">閉じる</button></div>';
}
window.DBPRankings={templates,categories,metrics,limits,boards,runs,boardById,runById,boardInput,addBoard,updateBoard,
 setArchived,deleteEmptyBoard,linkBuild,unlinkBuild,copyBuildForBoard,readAttempt,snapshot,addRun,deleteRun,
 sortedRuns,buildBests,resultText,gapText,render,boardModal,runModal,runDetailModal};
})();
