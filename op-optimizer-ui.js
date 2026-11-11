/* Small, responsive UI for the OP swap scanner. Rendering has no side effects. */
(function(){'use strict';
const D=window.DBP,C=window.DBPCalc,OPT=window.DBPOpOptimizer;
function render({state,build,slot,positionId='primary:0',selectedKey='',E,opt}){
 const r=OPT.evaluate(state,build,slot,positionId);
 if(!r.ok)return '<section class="card optimizer-panel"><div class="card-heading"><div><h2>OP変更シミュレーター</h2><span>装備中の個体を基準に比較</span></div></div><div class="notice">'+E(r.reason)+'</div></section>';
 const selected=r.options.find(x=>x.key===selectedKey)||r.top;
 const pct=x=>(x>0?'+':'')+x.toFixed(2)+'%';
 const num=x=>Number.isFinite(x)?Math.round(x).toLocaleString('ja-JP'):'—';
 const aff=(key,value)=>key?E(D.affixes[key]?.[0]||key)+' +'+E(C.format(key,value)):'未設定';
 const stage=x=>x===11?'開光Ⅰ':x===12?'開光Ⅱ':'+'+x;
 const posName=p=>p.kind==='secondary'?'補助OP':'主要OP '+(p.index+1);
 const progress=ratio=>Math.min(100,Math.max(0,ratio));
 const deltaClass=x=>x>0?'positive':x<0?'negative':'neutral';
 return '<section class="card optimizer-panel">'+
  '<div class="card-heading"><div><h2>OP変更シミュレーター</h2>'+
  '<span>現在装備中の '+E(r.itemName)+' を1枠ずつ仮変更</span></div><span class="tag amber">試算のみ</span></div>'+
  '<div class="optimizer-inputs">'+
   '<label class="field"><span>変更するOP枠</span><select data-change="optimizer-position" aria-label="変更するOP枠">'+
     r.positions.map(p=>{const id=p.kind==='secondary'?'secondary':'primary:'+p.index;return opt(id,posName(p),r.position)}).join('')+
   '</select></label>'+
   '<div class="optimizer-context"><small>比較対象スキル</small><strong>'+E(r.skillName)+'</strong>'+
   '<span>強化段階 '+E(stage(r.upgrade))+(r.upgradeKnown?'':'（未確認）')+' ／ 現在の計算条件を使用</span></div>'+
  '</div>'+
  '<div class="optimizer-note">現在のOP：<b>'+aff(r.current,r.originalValue)+'</b>'+
    (r.locked?' <span class="tag amber">固定OPも仮比較可能</span>':'')+'</div>'+
  '<div class="optimizer-metrics">'+
   '<div><small>現在の1ヒット期待ダメージ</small><strong>'+num(r.baseline.expected)+'</strong></div>'+
   '<div><small>最良候補の1ヒット期待ダメージ</small><strong>'+num(r.top?.expected)+'</strong></div>'+
   '<div><small>最良候補の増減</small><strong class="'+deltaClass(r.top?.percent||0)+'">'+(r.top?pct(r.top.percent):'—')+'</strong></div>'+
  '</div>'+
  '<p class="helper optimizer-description">同じ強化段階で変更可能なOPをすべて試算。「ダメージ・軽減」タブのスキル・敵条件とステータス補正ON/OFFを共有します。'+
    '1ヒットの期待ダメージであり、マナ消費・実際の発動頻度を考慮した持続DPSではありません。</p>'+
  '<div class="optimizer-list-head"><span>OP候補の順位（'+r.options.length+'件）</span><span>現在の装備との差</span></div>'+
  '<div class="optimizer-choices">'+r.options.map((x,i)=>
    '<button type="button" class="optimizer-choice '+(selected?.key===x.key?'selected':'')+'" data-action="optimizer-select" data-value="'+E(x.key)+'">'+
      '<span class="optimizer-choice-rank">'+(i+1)+'</span>'+
      '<span class="optimizer-choice-name"><b>'+E(x.name)+(x.current?' <small>現在</small>':'')+'</b>'+
      '<small>+'+E(C.format(x.key,x.value))+'</small></span>'+
      '<span class="optimizer-choice-delta '+deltaClass(x.percent)+'">'+pct(x.percent)+'<small>'+num(x.expected)+'</small></span>'+
    '</button>').join('')+'</div>'+
  (selected?'<div class="optimizer-picked">'+
     '<h3>選択したOP：'+E(selected.name)+'</h3>'+
     '<div class="optimizer-swap">'+aff(r.current,r.originalValue)+' <span>→</span> '+aff(selected.key,selected.value)+'</div>'+
     '<div class="optimizer-picked-grid">'+
      '<div><small>通常ヒット</small><strong>'+num(r.baseline.normal)+' → '+num(selected.normal)+'</strong></div>'+
      '<div><small>クリティカル</small><strong>'+num(r.baseline.critical)+' → '+num(selected.critical)+'</strong></div>'+
      '<div><small>期待ダメージ増減</small><strong class="'+deltaClass(selected.percent)+'">'+pct(selected.percent)+'</strong></div>'+
     '</div>'+
     (selected.current?'<p class="helper">現在のOPと同じです。別の候補を選んでください。</p>':
      '<button class="btn outline" data-action="optimizer-save" data-value="'+E(selected.key)+'">'+
      'このOPで装備候補を作成（装備中は変更しない）</button>')+
    '</div>':'')+
   '<div class="notice">推定値を含む比較です。入替後は、その強化段階におけるOPの標準値で試算します。実測の個体値や状態異常の維持率は保証しません。'+
     '現在の装備やOP固定状態はこの画面では変わりません。</div>'+
 '</section>';
}
window.DBPOpOptimizerUI={render};
})();
