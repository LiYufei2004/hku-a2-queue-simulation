/* Public simulation service. Pure data in/out; no DOM, canvas or browser APIs. */
(function(root){
'use strict';
const isNode=typeof module!=='undefined'&&module.exports;
const M=isNode?require('./model-core.js'):root.QueueModel;
const TP=isNode?require('./time-profile.js'):root.TimeProfile,ADV=isNode?require('./advisor.js'):root.Advisor;
const API_VERSION=1,MODEL_VERSION=4;
function validateParams(p){
 if(!p||typeof p!=='object')throw Error('Simulation parameters are required.');
 for(const [key,min,max] of [['duration',1,7200],['speed',.2,3],['spacing',.1,2],['scale',.001,1],['beta',0,2],['sample',.05,7200],['window',.05,7200]])if(!Number.isFinite(p[key])||p[key]<min||p[key]>max)throw Error(`Invalid parameter: ${key}`);
 if(!Number.isInteger(p.lifts)||p.lifts<1||p.lifts>20)throw Error('Invalid lift count.');
 for(const [key,min,max,integer] of [['rate',0,10,false],['cap',1,100,true],['cycle',10,600,false],['std',0,120,false]]){
  if(!Array.isArray(p[key])||p[key].length!==2||p[key].some(v=>!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v))))throw Error(`Invalid parameter: ${key}`);
 }
 if(!['document','geometry'].includes(p.walkModel))throw Error('Invalid walking model.');
 if(typeof p.seed!=='string'||p.seed.length>1000)throw Error('Invalid random seed.');
 if(!Array.isArray(p.pulses)||p.pulses.length>10000||p.pulses.some(x=>!x||![x.start,x.end,x.add].every(Number.isFinite)||x.start<0||x.end<x.start||x.add<0))throw Error('Invalid arrival pulses.');
 return p;
}
function generate(p){validateParams(p);return {apiVersion:API_VERSION,modelVersion:MODEL_VERSION,step:M.STEP,layout:{paths:M.paths,lengths:M.lengths,personSpacingPixels:18},frames:M.replay(p)}}
function inspect(p,s,side){
 validateParams(p);
 if(!s||!Number.isFinite(s.t)||s.t<0||!Array.isArray(s.q)||s.q.length!==2||s.q.some(n=>!Number.isInteger(n)||n<0)||!Array.isArray(s.prob)||s.prob.length!==2||s.prob.some(v=>!Number.isFinite(v)||v<0||v>1)||!['A','B'].includes(side))throw Error('Invalid decision snapshot or entry side.');
 const details=M.costBreakdown(p,s.t,s.q,side,s.prob);
 return {details,leftProbability:M.logit(details[0].total,details[1].total,p.beta),entryRates:[M.rateAt(p,0,s.t),M.rateAt(p,1,s.t)],routes:[M.walkRoute(side,0,s.q,p),M.walkRoute(side,1,s.q,p)]};
}
function createCollection(p,total=1000000){
 validateParams(p);if(!Number.isInteger(total)||total<1||total>1000000)throw Error('Snapshot count must be an integer from 1 to 1,000,000.');
 const s={p,total,done:0,runs:0,tables:{},engine:null,tick:1};
 return {step(limit=3000){let work=0;while(s.done<s.total&&work<limit){if(!s.engine){s.engine=new M.Engine(s.p,s.p.seed+'-table-'+s.runs);s.runs++;s.tick=1}const t=Math.min(s.p.duration,s.tick*s.p.sample);s.engine.advance(t);M.collectSample(s.tables,s.engine.snapshot(),s.p);s.done++;s.tick++;work++;if(t>=s.p.duration)s.engine=null}return {done:s.done,total:s.total,runs:s.runs}},result(){if(s.done!==s.total)throw Error('Collection is incomplete.');return {done:s.done,total:s.total,runs:s.runs,cells:Object.values(s.tables),p:s.p,apiVersion:API_VERSION,modelVersion:MODEL_VERSION}}};
}
// Passenger advisor (additive): layout for drawing, time-of-day period, and stay/switch estimates.
function layout(){return {apiVersion:API_VERSION,modelVersion:MODEL_VERSION,paths:M.paths,lengths:M.lengths,personSpacingPixels:18}}
function profile(now){const clock=TP.normalizeNow(now),current=TP.rateAtClock(clock.weekday,clock.seconds);return {apiVersion:API_VERSION,clock,period:current.labels,entryRates:current.rate}}
function advise(input){return {apiVersion:API_VERSION,modelVersion:MODEL_VERSION,...ADV.advise(input)}}
const api={API_VERSION,MODEL_VERSION,validateParams,generate,inspect,createCollection,layout,profile,advise};root.SimulationService=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
