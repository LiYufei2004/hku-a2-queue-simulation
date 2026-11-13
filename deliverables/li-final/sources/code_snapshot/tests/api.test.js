'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createWorker}=require('./worker-harness.js'),Service=require('../backend/simulation-service.js'),M=require('../backend/model-core.js');
const p={seed:'api-test',duration:60,rate:[2,80/60],pulses:[{start:0,end:600,add:1}],walkModel:'document',spacing:.45,beta:.05,speed:1.3,scale:.025,cap:[20,20],cycle:[40,200],std:[4,20],lifts:4,sample:5,window:300};
(async()=>{
 const worker=createWorker();let nextId=0;
 function request(method,params,apiVersion=1){return new Promise((resolve,reject)=>{const id=++nextId;const timer=setTimeout(()=>{worker.off('message',handler);reject(Error('API test timeout'))},20000);function handler(message){if(message.id!==id||message.type==='progress')return;clearTimeout(timer);worker.off('message',handler);resolve(message)}worker.on('message',handler);worker.postMessage({apiVersion,id,method,params})})}
 try{
  const replay=await request('generate',{p});assert.equal(replay.type,'result');assert.equal(replay.apiVersion,1);assert.deepEqual(replay.result.frames,M.replay(p),'worker replay preserves exact seeded trajectory');assert.equal(replay.result.step,.05);
  const snapshot=replay.result.frames.at(-1);const decision=await request('inspect',{p,snapshot,side:'B'});assert.deepEqual(decision.result,Service.inspect(p,snapshot,'B'));
  const collection=await request('collect',{p,total:35});const expected=Service.createCollection(p,35);expected.step();assert.deepEqual(collection.result,expected.result(),'transport preserves conditional table');
  for(const [method,params,version] of [['unknown',{},1],['generate',{p:{...p,speed:0}},1],['generate',{p},99],['collect',{p,total:0},1],['inspect',{p,snapshot:{...snapshot,q:[-1,0]},side:'A'},1]]){const error=await request(method,params,version);assert.equal(error.type,'error');assert.equal(error.error.code,'INVALID_REQUEST');assert(error.error.message)}
  for(const name of ['app.js','batch-ui.js','map-geometry.js']){const source=fs.readFileSync(path.resolve(__dirname,'../frontend',name),'utf8');assert(!/QueueModel|model-core|new Worker|importScripts/.test(source),'UI must use the public API only')}
  assert(!/document\.|window\.|canvas/.test(fs.readFileSync(path.resolve(__dirname,'../backend/model-core.js'),'utf8')),'engine must not depend on UI');
  console.log('PASS: public API replay/decision/table parity, version/parameter errors and frontend/backend dependency boundary.');
 }finally{await worker.terminate()}
})().catch(e=>{console.error(e);process.exitCode=1});
