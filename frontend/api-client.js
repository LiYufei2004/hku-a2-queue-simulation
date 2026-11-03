/* The only frontend module that knows the backend worker's location/protocol. */
(function(root){
'use strict';
const API_VERSION=1;
const workerURL=new URL('../backend/worker.js?v=7',document.currentScript.src);

class SimulationClient{
 constructor(){
  this.worker=new Worker(workerURL);
  this.pending=new Map();
  this.nextId=0;
  this.closed=false;
  this.worker.onmessage=({data:message})=>this.receive(message);
  this.worker.onerror=event=>this.close(event.message||'Simulation worker failed.');
  this.worker.onmessageerror=()=>this.close('Unable to read simulation response.');
 }

 receive(message){
  const task=this.pending.get(message.id);
  if(!task)return;
  if(message.apiVersion!==API_VERSION){
   this.pending.delete(message.id);
   task.reject(Error('Unsupported simulation API response.'));
   return;
  }
  if(message.type==='progress'){
   if(task.onProgress)task.onProgress(message.progress);
   return;
  }
  this.pending.delete(message.id);
  if(message.type==='result')task.resolve(message.result);
  else task.reject(Error(message.error?.message||'Simulation request failed.'));
 }

 request(method,params,onProgress){
  if(this.closed)return Promise.reject(Error('Simulation client is closed.'));
  return new Promise((resolve,reject)=>{
   const id=++this.nextId;
   this.pending.set(id,{resolve,reject,onProgress});
   try{this.worker.postMessage({apiVersion:API_VERSION,id,method,params})}
   catch(error){this.pending.delete(id);reject(error)}
  });
 }

 // Replay: {apiVersion, modelVersion, step, layout, frames}.
 generate(p){return this.request('generate',{p})}

 // Decision: {details, leftProbability, entryRates, routes}.
 inspect(p,snapshot,side){
  return this.request('inspect',{
   p,snapshot:{t:snapshot.t,q:snapshot.q,prob:snapshot.prob},side
  });
 }

 // Table: {done, total, runs, cells, p, apiVersion, modelVersion}.
 collect(p,total,onProgress){return this.request('collect',{p,total},onProgress)}

 // Passenger advisor. Layout: {paths, lengths, personSpacingPixels}.
 layout(){return this.request('layout',{})}
 // Period for a time: now is epoch ms or {weekday 0=Sun..6, seconds since HK midnight}.
 profile(now){return this.request('profile',{now})}
 // Stay/switch estimate: input {now, queue 0|1, ahead, speed}.
 advise(input){return this.request('advise',{input})}

 close(message='Simulation request cancelled.'){
  if(this.closed)return;
  this.closed=true;
  this.worker.terminate();
  for(const task of this.pending.values())task.reject(Error(message));
  this.pending.clear();
 }
}
root.SimulationAPI=Object.freeze({API_VERSION,Client:SimulationClient});
})(globalThis);
