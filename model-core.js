/* Model from the supplied PDF, with documented four-lift and geometry extensions.
 * Physical indices: 0=left/direct/PDF Queue 2; 1=right/bypass/PDF Queue 1.
 * All internal times seconds; all rates people/second. No hidden future samples enter choices.
 */
(function(root){
'use strict';
const STEP=.05;
const paths=[[[580,610],[580,540],[562,480],[554,310],[550,155],[520,120],[360,95],[80,85]],[[756,610],[756,535],[795,470],[795,315],[850,262],[1470,262]]];
function rng(seed){let a=2166136261;for(const c of String(seed))a=Math.imul(a^c.charCodeAt(0),16777619);return()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,a|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function normal(r){return Math.sqrt(-2*Math.log(1-r()))*Math.cos(2*Math.PI*r())}
function poisson(mean,r){if(mean<=0)return 0;let total=0;while(mean>20){total+=poisson(20,r);mean-=20}let p=1,n=0,L=Math.exp(-mean);do{p*=r();n++}while(p>L);return total+n-1}
function sampleCycle(p,i,r){let v;do{v=p.cycle[i]+p.std[i]*normal(r)}while(v<10);return Math.round(v/STEP)*STEP}
function capacityMean(cap){return (Math.max(1,cap-4)+cap)/2}
function sampleCapacity(cap,r){const lo=Math.max(1,cap-4),mid=capacityMean(cap),weights=Array.from({length:cap-lo+1},(_,j)=>Math.exp(-.5*(lo+j-mid)**2));let v=r()*weights.reduce((a,b)=>a+b,0);for(let j=0;j<weights.length;j++){v-=weights[j];if(v<=0)return lo+j}return cap}
function rateAt(p,i,t){let v=p.rate[i];for(const pulse of p.pulses)if(t>=pulse.start&&t<pulse.end)v+=pulse.add;return v}
function arrivalMean(p,i,a,b){if(b<=a)return 0;let v=p.rate[i]*(b-a);for(const pulse of p.pulses)v+=Math.max(0,Math.min(b,pulse.end)-Math.max(a,pulse.start))*pulse.add;return v}
// Inverse integrated intensity: exact NHPP arrival events across all rectangular shock edges.
function nextArrival(p,i,t,r){let remaining=-Math.log(1-r()),at=t;const edges=[...new Set(p.pulses.flatMap(x=>[x.start,x.end]).filter(x=>x>t))].sort((a,b)=>a-b);for(const edge of [...edges,Infinity]){const rate=rateAt(p,i,at+1e-7);if(!Number.isFinite(edge))return rate>0?at+remaining/rate:Infinity;const amount=rate*(edge-at);if(rate>0&&remaining<amount)return at+remaining/rate;remaining-=amount;at=edge}return Infinity}
function pathLength(path){let d=0;for(let k=1;k<path.length;k++)d+=Math.hypot(path[k][0]-path[k-1][0],path[k][1]-path[k-1][1]);return d}
function position(path,d){d=Math.max(0,d);for(let k=1;k<path.length;k++){const a=path[k-1],b=path[k],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<=len)return[a[0]+(b[0]-a[0])*d/len,a[1]+(b[1]-a[1])*d/len];d-=len}return path.at(-1)}
function segment(path,from,to){if(from>to)return segment(path,to,from).reverse();let result=[position(path,from)],d=0;for(let k=1;k<path.length;k++){d+=Math.hypot(path[k][0]-path[k-1][0],path[k][1]-path[k-1][1]);if(d>from&&d<to)result.push(path[k])}result.push(position(path,to));return result}
const lengths=paths.map(pathLength);
function tailDistance(i,n){return Math.min(Math.max(0,n-1)*18,lengths[i])}
// PDF decision starts at the local queue tail: staying costs no extra walking.
function walkRoute(side,target,q,p){const source=side==='B'?1:0,from=tailDistance(source,q[source]),to=tailDistance(target,q[target]);if(source===target)return {route:[position(paths[source],from)],pixels:0,seconds:0,clipped:false};const route=[...segment(paths[source],from,260),...segment(paths[target],260,to)],pixels=pathLength(route);const clipped=q.some((n,i)=>Math.max(0,n-1)*18>lengths[i]),meters=p.walkModel==='document'?p.spacing*(q[0]+q[1]):pixels*p.scale;return {route,pixels,meters,seconds:meters/p.speed,clipped}}
function logit(left,right,beta){if(beta===0)return .5;const x=beta*(right-left);return x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x))}
// Full-knowledge agents use the PDF batch approximation. Four lifts adapt T to T/4.
// Queue-arrival intensity is estimated from the last observed Logit splits, held over the walk.
function costs(p,t,q,side,prob=[.5,.5]){const out=[];for(let i=0;i<2;i++){const walk=walkRoute(side,i,q,p).seconds;const meanIncoming=arrivalMean(p,0,t,t+walk)*(i===0?prob[0]:1-prob[0])+arrivalMean(p,1,t,t+walk)*(i===0?prob[1]:1-prob[1]);out.push(walk+Math.ceil((q[i]+meanIncoming+1)/capacityMean(p.cap[i]))*p.cycle[i]/p.lifts)}return out}
class Heap{constructor(){this.a=[];this.seq=0}push(e){e.seq=this.seq++;const a=this.a;let k=a.length;a.push(e);while(k){const j=(k-1)>>1;if(!Heap.less(e,a[j]))break;a[k]=a[j];k=j}a[k]=e}static less(a,b){return a.t<b.t||(a.t===b.t&&a.seq<b.seq)}pop(){const a=this.a,top=a[0],v=a.pop();if(a.length){let k=0;while(k*2+1<a.length){let j=k*2+1;if(j+1<a.length&&Heap.less(a[j+1],a[j]))j++;if(!Heap.less(a[j],v))break;a[k]=a[j];k=j}a[k]=v}return top}peek(){return this.a[0]}}
class Engine{
 constructor(p,seed=p.seed){this.p=p;this.r=rng(seed);this.heap=new Heap();this.t=0;this.queues=[[],[]];this.head=[0,0];this.arrivals=[0,0];this.selected=[0,0];this.choice=[[0,0],[0,0]];this.served=[0,0];this.wait=[0,0];this.transit=[0,0];this.totalTravel=0;this.prob=[.5,.5];this.lifts=p.cycle.map((cycle,i)=>Array.from({length:p.lifts},(_,j)=>({nextClose:5+j*cycle/p.lifts,period:cycle,loaded:0,capacity:p.cap[i],trips:0})));for(let i=0;i<2;i++){this.heap.push({t:nextArrival(p,i,0,this.r),type:'arrival',i});for(let j=0;j<p.lifts;j++)this.heap.push({t:this.lifts[i][j].nextClose,type:'service',i,j})}}
 q(){return this.queues.map((q,i)=>q.length-this.head[i])}
 advance(t){while(this.heap.peek()&&this.heap.peek().t<=t){const e=this.heap.pop();if(!Number.isFinite(e.t))break;this.t=e.t;const i=e.i;if(e.type==='arrival'){this.arrivals[i]++;const side=i===0?'A':'B',d=costs(this.p,e.t,this.q(),side,this.prob),prob=logit(d[0],d[1],this.p.beta);this.prob[i]=prob;const dest=this.r()<prob?0:1;this.selected[dest]++;this.choice[i][dest]++;const walk=walkRoute(side,dest,this.q(),this.p).seconds,person={born:e.t,join:e.t+walk};if(walk>0){this.transit[dest]++;this.totalTravel+=walk;this.heap.push({t:person.join,type:'join',i:dest,person})}else this.queues[dest].push(person);this.heap.push({t:nextArrival(this.p,i,e.t,this.r),type:'arrival',i})}else if(e.type==='join'){this.transit[i]--;this.queues[i].push(e.person)}else{const lift=this.lifts[i][e.j],cap=sampleCapacity(this.p.cap[i],this.r),take=Math.min(cap,this.queues[i].length-this.head[i]);lift.capacity=cap;lift.loaded=take;lift.trips++;for(let k=0;k<take;k++){const person=this.queues[i][this.head[i]++];this.served[i]++;this.wait[i]+=e.t-person.born}if(this.head[i]>1024){this.queues[i]=this.queues[i].slice(this.head[i]);this.head[i]=0}lift.period=sampleCycle(this.p,i,this.r);lift.nextClose=e.t+lift.period;this.heap.push({t:lift.nextClose,type:'service',i,j:e.j})}}this.t=t;return this}
 snapshot(){return {t:this.t,q:this.q(),arrivals:[...this.arrivals],selected:[...this.selected],choice:this.choice.map(x=>[...x]),served:[...this.served],wait:[...this.wait],transit:[...this.transit],prob:[...this.prob],lifts:this.lifts.map(bank=>bank.map(l=>({...l})))}}
}
function replay(p){const e=new Engine(p),frames=[];for(let k=0;k<=Math.round(p.duration/STEP);k++){e.advance(k*STEP);frames.push(e.snapshot())}return frames}
// Sparse, per-window empirical conditional tables. Both views share the same real snapshot.
function collectSample(tables,s,p){const window=Math.min(Math.ceil(p.duration/p.window)-1,Math.floor((s.t-1e-7)/p.window));for(let source=0;source<2;source++){const side=source===0?'A':'B',m=s.q[source],other=s.q[1-source],key=side+'|'+window+'|'+m;let cell=tables[key];if(!cell)cell=tables[key]={side,window,m,n:0,sumLeft:0,sumRight:0,hist:{}};const d=costs(p,s.t,s.q,side,s.prob);cell.n++;cell.sumLeft+=d[0];cell.sumRight+=d[1];cell.hist[other]=(cell.hist[other]||0)+1}}
const api={STEP,paths,lengths,rng,normal,poisson,sampleCycle,sampleCapacity,capacityMean,rateAt,arrivalMean,nextArrival,pathLength,position,segment,tailDistance,walkRoute,logit,costs,Engine,replay,collectSample};root.QueueModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
