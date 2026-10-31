'use strict';
const {Worker}=require('node:worker_threads');
const path=require('node:path');
function createWorker(){
 const backend=path.resolve(__dirname,'../backend');
 return new Worker(`const {parentPort}=require('node:worker_threads');const path=require('node:path');global.importScripts=(...urls)=>{for(const url of urls)require(path.join(${JSON.stringify(backend)},url.split('?')[0]))};global.postMessage=m=>parentPort.postMessage(m);require(${JSON.stringify(path.join(backend,'worker.js'))});parentPort.on('message',m=>global.onmessage({data:m}));`,{eval:true});
}
module.exports={createWorker};
