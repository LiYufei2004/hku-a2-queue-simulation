'use strict';
const {createWorker}=require('./worker-harness.js'),path=require('node:path'),fs=require('node:fs');
const total=+(process.argv[2]||1000000),p={seed:'benchmark',duration:2400,rate:[2,80/60],pulses:[{start:0,end:600,add:1}],walkModel:'document',spacing:.45,beta:.05,speed:1.3,scale:.025,cap:[20,20],cycle:[40,200],std:[4,20],lifts:4,sample:5,window:300},start=Date.now();
const worker=createWorker();let last=0;
worker.on('message',message=>{
 if(message.type==='error')throw Error(message.error.message);
 if(message.type==='progress'){const d=message.progress;if(d.done-last>=100000){last=d.done;console.log(d.done+'/'+total)}}
 if(message.type==='result'){
  const d=message.result;let n=0;
  for(const c of d.cells){if(Object.values(c.hist).reduce((a,b)=>a+b,0)!==c.n)throw Error('histogram mismatch');if(!Number.isFinite(c.sumLeft+c.sumRight))throw Error('nonfinite costs');n+=c.n}
  if(n!==total*2||d.done!==total)throw Error('paired snapshot count mismatch');
  const summary={snapshots:d.done,independentRuns:d.runs,cells:d.cells.length,seconds:(Date.now()-start)/1000};console.log('PASS',summary);fs.writeFileSync(path.resolve(__dirname,'../model-test-summary.json'),JSON.stringify(summary,null,2));worker.terminate();
 }
});
worker.on('error',e=>{throw e});worker.postMessage({apiVersion:1,id:1,method:'collect',params:{p,total}});
