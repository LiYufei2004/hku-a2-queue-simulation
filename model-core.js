const STEP=0.05;const quantize=t=>Math.round(t/STEP)*STEP;
function rng(seed){let a=2166136261;for(const c of seed)a=Math.imul(a^c.charCodeAt(0),16777619);return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function poisson(mean,r){let n=0,p=1,L=Math.exp(-mean);do{n++;p*=r()}while(p>L);return n-1}
function normal(r){return Math.sqrt(-2*Math.log(1-r()))*Math.cos(2*Math.PI*r())}
function sampleCycle(mean,sd,r){if(sd===0)return Math.max(10,quantize(mean));let x;do{x=quantize(mean+sd*normal(r))}while(x<10);return x}
function capacityMean(cap){return (Math.max(1,cap-4)+cap)/2}
function sampleCapacity(cap,r){const lo=Math.max(1,cap-4),mid=capacityMean(cap),weights=Array.from({length:cap-lo+1},(_,j)=>Math.exp(-.5*(lo+j-mid)**2));let u=r()*weights.reduce((a,b)=>a+b,0);for(let j=0;j<weights.length;j++){u-=weights[j];if(u<=0)return lo+j}return cap}
function position(path,d){for(let i=1;i<path.length;i++){let a=path[i-1],b=path[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<=len)return[a[0]+(b[0]-a[0])*d/len,a[1]+(b[1]-a[1])*d/len];d-=len}return null}
function pathLength(path){return path.slice(1).reduce((d,p,j)=>d+Math.hypot(p[0]-path[j][0],p[1]-path[j][1]),0)}
function segment(path,from,to){if(from>to)return segment(path,to,from).reverse();let result=[position(path,from)],d=0;for(let k=1;k<path.length;k++){d+=Math.hypot(path[k][0]-path[k-1][0],path[k][1]-path[k-1][1]);if(d>from&&d<to)result.push(path[k])}result.push(position(path,to));return result.filter(Boolean)}
function walkRoute(i,q,side='A'){const source=side==='B'?1:0,origin=source===0?[43,86]:[1498,238];const tail=Math.min(Math.max(0,q-1)*18,pathLength(paths[i])-.001),end=pathLength(paths[source])-.001;let route=[origin,...segment(paths[source],end,source===i?tail:260)];if(source!==i)route.push(...segment(paths[i],260,tail));return {route,pixels:pathLength(route),clipped:Math.max(0,q-1)*18>pathLength(paths[i])}}
const paths=[[[580,610],[580,540],[562,480],[554,310],[550,155],[520,120],[360,95],[80,85]],[[756,610],[756,535],[795,470],[795,315],[850,262],[1470,262]]];

// Rates are in people/second; halfLife is in minutes. Integral gives mean arrivals.
function rateAt(p,i,t){return p.rate[i]*Math.exp(-Math.LN2*Math.max(0,t)/(p.halfLife*60))}
function arrivalMean(p,i,start,end){if(end<=start)return 0;const k=Math.LN2/(p.halfLife*60);return p.rate[i]*Math.exp(-k*start)*(-Math.expm1(-k*(end-start)))/k}
