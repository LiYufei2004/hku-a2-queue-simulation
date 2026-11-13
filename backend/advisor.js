/* Passenger advisor: "stay or switch, and roughly how long?" Pure data in/out; no DOM.
 * Reuses the academic engine (model-core.js) and the time-of-day profile (time-profile.js).
 *
 * 1. Simulate independent seeded trajectories from `warmup` before now, with arrivals
 *    from the time-of-day profile. Every 5 s within +-3 min of now, record paired queue lengths.
 * 2. Keep snapshots whose own-queue length matches the user's position ("people ahead"):
 *    this gives P(other queue | own queue, time) - the user never sees the other queue.
 * 3. From matching states, clone the engine and simulate both choices with real lift events:
 *    stay at the current position, or walk to the other queue's tail and join it.
 *    Both branches share the same random state at the decision moment.
 */
(function(root){
'use strict';
const isNode=typeof module!=='undefined'&&module.exports;
const M=isNode?require('./model-core.js'):root.QueueModel;
const TP=isNode?require('./time-profile.js'):root.TimeProfile;

const DEFAULTS={runs:70,branches:80,window:180,sample:5,minMatches:30};
// Choice and walking settings follow the academic model; lifts come from the field-calibrated table.
const BASE={walkModel:'document',spacing:.45,speed:1.3,scale:.025,beta:.05,...TP.LIFTS,sample:5,window:300};

function validate(input){
 if(!input||typeof input!=='object')throw Error('Advisor input is required.');
 const {queue,ahead,speed}=input;
 if(queue!==0&&queue!==1)throw Error('Invalid queue: use 0 (left, direct) or 1 (right, via A1).');
 if(!Number.isInteger(ahead)||ahead<0||ahead>600)throw Error('Invalid number of people ahead.');
 if(!Number.isFinite(speed)||speed<.3||speed>3)throw Error('Invalid walking speed.');
 TP.normalizeNow(input.now);
 for(const [key,min,max] of [['runs',10,1000],['branches',10,1000]])if(input[key]!==undefined&&(!Number.isInteger(input[key])||input[key]<min||input[key]>max))throw Error(`Invalid ${key}.`);
 if(input.seed!==undefined&&(typeof input.seed!=='string'||input.seed.length>200))throw Error('Invalid seed.');
 return input;
}
function quantile(sorted,q){if(!sorted.length)return null;const x=(sorted.length-1)*q,lo=Math.floor(x),hi=Math.ceil(x);return sorted[lo]+(sorted[hi]-sorted[lo])*(x-lo)}
function summary(values){const s=[...values].sort((a,b)=>a-b);return {n:s.length,mean:s.reduce((a,b)=>a+b,0)/Math.max(1,s.length),p10:quantile(s,.1),median:quantile(s,.5),p90:quantile(s,.9)}}
function boardingWait(engine,t0,limit){let t=t0;while(engine.tagServedAt==null&&t<limit){t=Math.min(limit,t+5);engine.advance(t)}return {wait:(engine.tagServedAt??limit)-t0,censored:engine.tagServedAt==null}}

function advise(input){
 validate(input);
 const opt={...DEFAULTS,...input},queue=input.queue,other=1-queue,ahead=input.ahead;
 const frag=TP.paramsAround(input.now);
 const minute=Math.floor(frag.clock.seconds/60);
 const p={...BASE,seed:`${opt.seed||'advisor'}|${frag.clock.weekday}|${minute}`,duration:frag.duration,rate:frag.rate,pulses:frag.pulses};
 const ticks=[];for(let t=frag.nowAt-opt.window;t<=frag.nowAt+opt.window;t+=opt.sample)ticks.push(t);

 // Pass 1: paired snapshots around "now".
 const records=[];
 for(let r=0;r<opt.runs;r++){const e=new M.Engine(p,p.seed+'-adv-'+r);for(let k=0;k<ticks.length;k++){e.advance(ticks[k]);const q=e.q();records.push({r,k,own:q[queue],other:q[other]})}}

 // Own queue must hold the user's position: people ahead, plus a few who joined behind.
 const band=Math.max(2,Math.round(ahead*.15)),distance=x=>x.own<ahead?ahead-x.own:Math.max(0,x.own-ahead-band);
 const matches=records.filter(x=>distance(x)===0);
 const lowConfidence=matches.length<opt.minMatches;
 // The user's queue can be longer than this time profile usually produces: their position
 // is still honoured (insertTagged pads the queue), and the result is flagged as extrapolated.
 const ownSorted=records.map(x=>x.own).sort((a,b)=>a-b),ownTypicalMax=Math.round(quantile(ownSorted,.95)),extrapolated=lowConfidence&&ahead>ownTypicalMax;
 // Too few exact matches: fall back to the nearest snapshots (flagged as low confidence).
 // Beyond the simulated range, the "nearest" snapshots are the moments with the longest queues,
 // which at quiet times are just before a bunch of lifts arrives; that would bias waits down.
 // So an extrapolated estimate uses every snapshot in the window instead.
 const used=extrapolated?records:lowConfidence?records.map((x,i)=>({x,i,d:distance(x)})).sort((a,b)=>a.d-b.d||a.i-b.i).slice(0,Math.max(opt.minMatches,matches.length)).map(o=>o.x):matches;
 const hist={};for(const x of used)hist[x.other]=(hist[x.other]||0)+1;
 const others=used.map(x=>x.other).sort((a,b)=>a-b);

 // Pass 2: branch from an evenly spread subset of the used states (deterministic).
 const stride=Math.max(1,used.length/opt.branches),chosen=[];for(let j=0;j<used.length&&chosen.length<opt.branches;j+=stride)chosen.push(used[Math.floor(j)]);
 const byRun=new Map();for(const x of chosen){if(!byRun.has(x.r))byRun.set(x.r,[]);byRun.get(x.r).push(x.k)}
 const stay=[],sw=[],walks=[];let censored=0,switchFaster=0;
 for(const [r,ks] of byRun){
  const e=new M.Engine(p,p.seed+'-adv-'+r);
  for(const k of [...new Set(ks)].sort((a,b)=>a-b)){
   const t0=ticks[k];e.advance(t0);const repeat=ks.filter(v=>v===k).length,limit=t0+7200;
   for(let n=0;n<repeat;n++){
    const a=e.clone().insertTagged(queue,ahead),resA=boardingWait(a,t0,limit);
    const b=e.clone(),q=b.q(),walk=p.spacing*(ahead+q[other])/input.speed;b.joinTagged(other,walk);const resB=boardingWait(b,t0,limit);
    stay.push(resA.wait);sw.push(resB.wait);walks.push(walk);censored+=resA.censored+resB.censored;
    switchFaster+=resB.wait<resA.wait?1:resB.wait===resA.wait?.5:0;
   }
  }
 }
 const stayS=summary(stay),swS=summary(sw),pSwitch=switchFaster/Math.max(1,stay.length),gain=stayS.median-swS.median;
 const recommendation=pSwitch>=.6&&gain>=30?'switch':pSwitch<=.4||gain<=0?'stay':'close';
 return {
  input:{queue,ahead,speed:input.speed},clock:frag.clock,period:frag.current.labels,entryRates:frag.current.rate,
  recommendation,pSwitchFaster:pSwitch,timeSaved:gain,stay:stayS,switch:{...swS,walk:summary(walks)},
  otherQueue:{hist,n:used.length,median:quantile(others,.5),p05:quantile(others,.05),p95:quantile(others,.95)},
  matches:matches.length,used:used.length,snapshots:records.length,branches:stay.length,censored,lowConfidence,extrapolated,ownTypicalMax,band
 };
}
const api={DEFAULTS,validate,advise};root.Advisor=api;if(isNode)module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
