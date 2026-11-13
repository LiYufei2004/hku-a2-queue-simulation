'use strict';
const assert=require('node:assert/strict');
const TP=require('../backend/time-profile.js'),A=require('../backend/advisor.js'),M=require('../backend/model-core.js'),Service=require('../backend/simulation-service.js');
const {createWorker}=require('./worker-harness.js');
const at=(weekday,h,m)=>({weekday,seconds:h*3600+m*60});

// Time-of-day profile (Hong Kong wall clock).
const clockIs=(wd,sec,total,labels,msg)=>{const r=TP.rateAtClock(wd,sec);assert.equal(r.total,total,msg);assert.deepEqual(r.labels,labels,msg);assert.deepEqual(r.rate,TP.SPLIT.map(f=>total*f))};
clockIs(1,10*3600+30*60,25,['teaching']);
clockIs(1,10*3600+52*60,50,['teaching','classEnd']);
clockIs(1,11*3600,25,['teaching'],'class-end peak is [:50,:00)');
clockIs(2,12*3600+30*60,28,['teaching','lunch']);
clockIs(3,12*3600+55*60,53,['teaching','lunch','classEnd']);
clockIs(4,18*3600+20*60,30,['teaching','dinner'],'dinner level just under lift capacity');
clockIs(4,18*3600+55*60,55,['teaching','dinner','classEnd'],'dinner surge = measured extreme 55/min');
clockIs(0,15*3600,12,['weekend']);
assert.deepEqual(TP.rateAtClock(6,10*3600+50*60).labels,['weekend'],'no class peaks at weekends');
clockIs(1,3*3600,3,['night']);
// Field-measured lift throughput: direct 15 per trip / 120 s = 30 people/min; via A1 ~4 per trip at A2 / 200 s = 4.8.
assert.deepEqual(TP.LIFTS.cycle.map((c,i)=>Math.round(M.capacityMean(TP.LIFTS.cap[i])*TP.LIFTS.lifts/c*60*10)/10),[30,4.8]);
assert.deepEqual(TP.hkParts(Date.UTC(2026,10,2,4,52)),{weekday:1,seconds:12*3600+52*60},'HK is UTC+8 regardless of device zone');
const frag=TP.paramsAround(at(1,12,55));
const p={seed:'x',walkModel:'document',spacing:.45,speed:1.3,scale:.025,beta:.05,cap:[20,20],cycle:[40,200],std:[4,20],lifts:4,sample:5,window:300,duration:frag.duration,rate:frag.rate,pulses:frag.pulses};
Service.validateParams(p);
for(const [offset,h,m] of [[0,12,55],[-300,12,50],[-301,12,49],[305,13,0],[-900,12,40]]){const r=TP.rateAtClock(1,h*3600+m*60+(offset===-301?59:0)).rate;assert.deepEqual([M.rateAt(p,0,frag.nowAt+offset)*60,M.rateAt(p,1,frag.nowAt+offset)*60].map(v=>Math.round(v*1e9)/1e9),r,`profile pulse at offset ${offset}`)}
const midnight=TP.paramsAround(at(6,23,55));assert.equal(Math.round([0,1].reduce((v,i)=>v+M.rateAt({rate:midnight.rate,pulses:midnight.pulses},i,midnight.nowAt+600)*60,0)),3,'window rolls past midnight into Sunday night');

// Engine clone continues identically; tagged hooks do not disturb untagged engines.
const e=new M.Engine(p,'clone');e.advance(1000);const c=e.clone();e.advance(1600);c.advance(1600);assert.deepEqual(c.snapshot(),e.snapshot());
const tagged=new M.Engine(p,'tag');tagged.advance(900);const q=tagged.q()[0];tagged.insertTagged(0,0);assert.equal(tagged.q()[0],q+1);tagged.advance(3000);assert(tagged.tagServedAt>900);
// A position beyond the current queue is padded, never shortened.
const padded=new M.Engine(p,'pad');padded.advance(900);const before=padded.q()[1];padded.insertTagged(1,before+50);assert.equal(padded.q()[1],before+51);
assert.equal(padded.queues[1][padded.head[1]+before+50].tag,true,'tagged person has exactly `ahead` people in front');

// Advisor behaviour.
const small={runs:40,branches:30};
const base={now:at(1,12,55),queue:1,ahead:30,speed:1.3,...small};
const r1=A.advise(base),r2=A.advise(base);
assert.deepEqual(r1,r2,'deterministic for a fixed time and input');
assert.equal(Object.values(r1.otherQueue.hist).reduce((a,b)=>a+b,0),r1.otherQueue.n,'conditional histogram is normalised by its sample count');
assert(r1.stay.p10<=r1.stay.median&&r1.stay.median<=r1.stay.p90);
assert(r1.pSwitchFaster>=0&&r1.pSwitchFaster<=1);
assert(['stay','switch','close'].includes(r1.recommendation));
const near=A.advise({...base,ahead:5}),far=A.advise({...base,ahead:60});
assert(near.stay.median<far.stay.median,'waiting grows with people ahead');
const slow=A.advise({...base,speed:.5}),fast=A.advise({...base,speed:2});
assert(slow.switch.walk.median>fast.switch.walk.median,'walking time follows the user speed');
assert.equal(A.advise({now:at(1,12,55),queue:0,ahead:0,speed:1.3,...small}).recommendation,'stay','never leave the front of the fast queue');
const rare=A.advise({now:at(0,3,0),queue:0,ahead:300,speed:1.3,...small});assert.equal(rare.lowConfidence,true);assert(rare.otherQueue.n>=30);
// Beyond the simulated range: waits and walks keep growing with the reported position.
const longs=[143,210,329].map(ahead=>A.advise({now:at(1,12,55),queue:1,ahead,speed:1.3,...small}));
assert(longs[0].stay.median<longs[1].stay.median&&longs[1].stay.median<longs[2].stay.median,'stay wait grows with ahead beyond the simulated queue');
assert(longs[0].switch.walk.median<longs[1].switch.walk.median&&longs[1].switch.walk.median<longs[2].switch.walk.median,'walk uses the full position');
assert(longs.every(r=>r.extrapolated&&r.ownTypicalMax<143&&r.used>=30));
assert.equal(A.advise({...base,ahead:30}).extrapolated,false);
const direct127=A.advise({now:at(1,18,20),queue:0,ahead:127,speed:1.3,...small});assert(direct127.stay.median>210&&direct127.stay.median<300,`127 ahead in the direct queue should take ~4.2 min at 30 people/min, got ${direct127.stay.median} s`);
// Quiet time beyond the simulated range: no bias towards "lifts about to arrive" states.
const quiet50=A.advise({now:at(1,14,30),queue:0,ahead:50,speed:1.3,...small});assert(quiet50.extrapolated&&quiet50.stay.median>80,`50 ahead at a quiet time should take ~1.7 min, got ${quiet50.stay.median} s`);
for(const bad of [{...base,queue:2},{...base,ahead:-1},{...base,ahead:1.5},{...base,speed:0},{...base,now:{weekday:9,seconds:0}},{...base,runs:5}])assert.throws(()=>A.advise(bad));
const t0=Date.now();A.advise({now:at(1,12,55),queue:1,ahead:40,speed:1.3});const elapsed=Date.now()-t0;
console.log(`PASS: HK time profile (:50 class peaks, meals, weekends, midnight), engine clone/tag hooks, deterministic advisor, normalised conditional histogram, monotone waits, walking speed, low-confidence fallback, validation. Full request ${elapsed} ms.`);

// Worker transport parity for the new methods.
(async()=>{
 const worker=createWorker();let id=0;
 const request=(method,params)=>new Promise((resolve,reject)=>{const my=++id,timer=setTimeout(()=>reject(Error('timeout')),60000);worker.on('message',function h(m){if(m.id!==my)return;clearTimeout(timer);worker.off('message',h);resolve(m)});worker.postMessage({apiVersion:1,id:my,method,params})});
 try{
  const layout=await request('layout',{});assert.deepEqual(layout.result.paths,M.paths);assert.equal(layout.result.personSpacingPixels,18);
  const prof=await request('profile',{now:at(1,10,55)});assert.deepEqual(prof.result.period,['teaching','classEnd']);
  const adv=await request('advise',{input:base});assert.equal(adv.type,'result');const {apiVersion,modelVersion,...rest}=adv.result;assert.deepEqual(rest,r1);
  const err=await request('advise',{input:{...base,queue:5}});assert.equal(err.type,'error');assert.equal(err.error.code,'INVALID_REQUEST');
  const fs=require('node:fs'),path=require('node:path');assert(!/QueueModel|model-core|new Worker|importScripts|TimeProfile|Advisor\./.test(fs.readFileSync(path.resolve(__dirname,'../frontend/user.js'),'utf8')),'user page uses the public API only');
  for(const name of ['user.js','campus-map.js'])new (require('node:vm').Script)(fs.readFileSync(path.resolve(__dirname,'../frontend',name),'utf8'),{filename:name});
  // Campus map: the corner from the lift door to University Street holds ~50 people (field observation).
  const mapCtx={};new (require('node:vm').Script)(fs.readFileSync(path.resolve(__dirname,'../frontend/campus-map.js'),'utf8')).runInNewContext({globalThis:mapCtx});
  const CM=mapCtx.CampusMap;for(const i of [0,1]){const street=CM.landmarks[i].find(l=>l.key==='lmStreet');assert.equal(street.n,50);assert.equal(CM.toPeople(i,CM.toDistance(i,137)),137);assert(CM.landmarks[i].every((l,k,a)=>k===0||l.n>a[k-1].n),'landmark counts increase along the queue')}
  console.log('PASS: worker layout/profile/advise parity and error handling; user page respects the API boundary.');
 }finally{await worker.terminate()}
})().catch(e=>{console.error(e);process.exitCode=1});
