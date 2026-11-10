'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const uid='11111111-1111-4111-8111-111111111111';
const store={};const handlers={};let promptCloud=false;let patched=0,inserted=0;
let remoteState;
const toast={textContent:'',classList:{add(){},remove(){}}};
const app={innerHTML:'',addEventListener:(type,fn)=>handlers[type]=fn};
const doc={getElementById:(id)=>id==='app'?app:id==='toast'?toast:null,createElement:()=>({style:{},click(){}}),body:{appendChild(){}},addEventListener(){}};
const ctx={document:doc,localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
 Date,JSON,Math,Set,Number,String,URL,URLSearchParams,Blob,Map,crypto:crypto.webcrypto,console,
 setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>promptCloud,prompt:()=>'',
 history:{replaceState(){}},location:{hash:'',pathname:'/deskrawl-build-planner/',search:'',origin:'https://kanazawatokyo.github.io'},
 fetch:async (url,opts={})=>{
  const path=String(url);if(path.includes('/auth/v1/user'))return {ok:true,status:200,text:async()=>JSON.stringify({id:uid,email:'tester@example.invalid'})};
  if(path.includes('/rest/v1/planner_state')){
   if(opts.method==='PATCH'){patched++;return {ok:true,status:200,text:async()=>JSON.stringify([{revision:3}])};}
   if(opts.method==='POST'){inserted++;return {ok:true,status:200,text:async()=>JSON.stringify([{revision:1}])};}
   return {ok:true,status:200,text:async()=>JSON.stringify(remoteState?[{payload:remoteState,revision:2}]:[])};
  }
  throw Error('Unexpected fetch '+path);
 }
};
ctx.window=ctx;ctx.window.addEventListener=()=>{};vm.createContext(ctx);
for (const file of ['master.js','calc.js','combat.js','stats-view.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),ctx,{filename:file});
remoteState=ctx.DBP.makeSeed();remoteState.builds[0].name='REMOTE DO NOT OVERWRITE';
const localState=ctx.DBP.makeSeed();localState.builds[0].name='LOCAL UNSYNCED';
store.deskrawl_planner_v01=JSON.stringify(localState);
store.deskrawl_planner_cloud_v01=JSON.stringify({url:'https://fake-project.supabase.co',key:'sb_publishable_test'});
store.deskrawl_planner_session_v01=JSON.stringify({user:{id:uid},access_token:'test',refresh_token:'refresh',expiresAt:Date.now()+600000});
// Publishable cloud config is preferred over any old locally supplied configuration.
vm.runInContext(fs.readFileSync(__dirname+'/cloud-config.js','utf8'),ctx,{filename:'cloud-config.js'});
vm.runInContext(fs.readFileSync(__dirname+'/app.js','utf8'),ctx,{filename:'app.js'});
(async()=>{
 for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(ctx.DBPApp.getUI().status,'conflict','declining remote import blocks sync');
 assert.equal(ctx.DBPApp.getState().builds[0].name,'LOCAL UNSYNCED');
 handlers.change({target:{id:'buildSelect',value:localState.activeBuildId}});
 assert.equal(ctx.DBPApp.getUI().status,'conflict','subsequent local changes remain blocked');
 assert.equal(patched,0,'must never overwrite remote while blocked');
 assert.equal(inserted,0);
 promptCloud=true;
 handlers.click({target:{closest:()=>({dataset:{action:'cloud-pull'}})}});
 for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(ctx.DBPApp.getState().builds[0].name,'REMOTE DO NOT OVERWRITE');
 assert.equal(ctx.DBPApp.getUI().status,'synced');
 assert.equal(patched,0);
 console.log('PASS: cloud conflict cannot silently overwrite remote; explicit pull resolves conflict');
})().catch(err=>{console.error(err);process.exitCode=1});
