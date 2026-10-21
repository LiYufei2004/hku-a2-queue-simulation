importScripts('model-core.js?v=3');
const M=QueueModel;
let state=null;
function chunk(){try{const s=state;let work=0;while(s.done<s.total&&work<3000){if(!s.engine){s.engine=new M.Engine(s.p,s.p.seed+'-table-'+s.runs);s.runs++;s.tick=1}const t=Math.min(s.p.duration,s.tick*s.p.sample);s.engine.advance(t);M.collectSample(s.tables,s.engine.snapshot(),s.p);s.done++;s.tick++;work++;if(t>=s.p.duration)s.engine=null}postMessage({type:'progress',done:s.done,total:s.total,runs:s.runs});if(s.done<s.total)setTimeout(chunk,0);else{postMessage({type:'done',done:s.done,runs:s.runs,cells:Object.values(s.tables),p:s.p});state=null}}catch(e){postMessage({type:'error',message:e.message})}}
onmessage=({data})=>{state={p:data.p,total:data.total||1000000,done:0,runs:0,tables:{},engine:null};chunk()};
