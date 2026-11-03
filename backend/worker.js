/* Transport adapter for the versioned simulation API. One worker per client. */
importScripts('model-core.js?v=7','time-profile.js?v=7','advisor.js?v=7','simulation-service.js?v=7');
'use strict';
const Service=SimulationService;
function send(id,type,payload){postMessage({apiVersion:Service.API_VERSION,id,type,...payload})}
onmessage=({data:request})=>{
 const {id,apiVersion,method,params={}}=request||{};
 try{
  if(apiVersion!==Service.API_VERSION)throw Error('Unsupported simulation API version.');
  if(method==='generate')send(id,'result',{result:Service.generate(params.p)});
  else if(method==='inspect')send(id,'result',{result:Service.inspect(params.p,params.snapshot,params.side)});
  else if(method==='layout')send(id,'result',{result:Service.layout()});
  else if(method==='profile')send(id,'result',{result:Service.profile(params.now)});
  else if(method==='advise')send(id,'result',{result:Service.advise(params.input)});
  else if(method==='collect'){
   const collection=Service.createCollection(params.p,params.total);
   function chunk(){try{const progress=collection.step();send(id,'progress',{progress});if(progress.done<progress.total)setTimeout(chunk,0);else send(id,'result',{result:collection.result()})}catch(e){send(id,'error',{error:{code:'SIMULATION_ERROR',message:e.message}})}}
   chunk();
  }else throw Error(`Unknown simulation method: ${method}`);
 }catch(e){send(id,'error',{error:{code:'INVALID_REQUEST',message:e.message}})}
};
