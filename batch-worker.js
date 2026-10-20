/* Independent conditional queue-choice trials. No DOM and no future replay data. */
importScripts('model-core.js');
function chooseEvent(events){let j=0;for(let k=1;k<events.length;k++)if(events[k]<events[j])j=k;return j}
function arrivals(mean,r){let count=0;while(mean>20){count+=poisson(20,r);mean-=20}return count+poisson(mean,r)}
function travel(i,q,walk,p,initial,r,time=0){const events=initial.slice();let ahead=q,previous=0;
// Before joining, all new arrivals join ahead; services may reduce that queue.
while(true){const j=chooseEvent(events),at=events[j];if(at>walk)break;ahead=Math.max(0,ahead+arrivals(arrivalMean(p,i,time+previous,time+at),r)-sampleCapacity(p.cap[i],r));previous=at;events[j]=at+sampleCycle(p.cycle[i],p.std[i],r)}
ahead+=arrivals(arrivalMean(p,i,time+previous,time+walk),r);
// After joining, FCFS new arrivals are behind this tagged passenger.
while(true){const j=chooseEvent(events),at=events[j],cap=sampleCapacity(p.cap[i],r);if(ahead<cap)return at;ahead-=cap;events[j]=at+sampleCycle(p.cycle[i],p.std[i],r)}}
onmessage=({data})=>{try{const {p,snapshot,maxQueue,speed,scale,total=1000000,seed,side='A'}=data,r=rng(seed),bins=Array.from({length:maxQueue+1},(_,q)=>({q,n:0,left:0,right:0,tie:0,sumLeft:0,sumRight:0}));const walks=Array.from({length:maxQueue+1},(_,q)=>walkRoute(0,q,side).pixels*scale/speed),rightWalk=walkRoute(1,snapshot.q[1],side).pixels*scale/speed;const events=snapshot.lifts.map(bank=>bank.map(l=>Math.max(0,l.nextClose-data.time)));for(let k=0;k<total;k++){const q=Math.floor(r()*(maxQueue+1)),a=travel(0,q,walks[q],p,events[0],r,data.time),b=travel(1,snapshot.q[1],rightWalk,p,events[1],r,data.time),bin=bins[q];bin.n++;bin.sumLeft+=a;bin.sumRight+=b;if(Math.abs(a-b)<.025)bin.tie++;else if(a<b)bin.left++;else bin.right++;if((k+1)%10000===0)postMessage({type:'progress',done:k+1,total})}postMessage({type:'done',bins,total,seed,rightQueue:snapshot.q[1]})}catch(e){postMessage({type:'error',message:e.message})}};
