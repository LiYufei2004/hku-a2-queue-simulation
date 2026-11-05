'use strict';
let tableClient=null,tableResult=null,collectionVersion=0,batchMode='idle',batchArgs=null;
function paintBatch(){
 const el=$('batchStatus');
 if(batchMode==='cleared') el.textContent=A2Text.t('tableCleared');
 else if(batchMode==='busy') el.textContent=A2Text.t('running');
 else if(batchMode==='running') el.textContent=A2Text.t('collected')(batchArgs.done,batchArgs.total,batchArgs.runs);
 else if(batchMode==='done') el.textContent=A2Text.t('completed')(batchArgs.done,batchArgs.runs);
 else if(batchMode==='stopped') el.textContent=A2Text.t('stopped');
 else if(batchMode==='failed') el.textContent=A2Text.t('failed')(batchArgs);
 else el.textContent=A2Text.t('batchIdle');
}
function populateWindows(){if(!params)return;const select=$('lookupWindow'),old=select.value;select.innerHTML='';for(let k=0;k<Math.ceil(params.duration/params.window);k++){const o=document.createElement('option');o.value=k;o.textContent=A2Text.t('windowSpan')(k*params.window/60,Math.min(params.duration,(k+1)*params.window)/60);select.append(o)}select.value=old!==''&&+old<select.options.length?old:'0'}
function stopWorker(){collectionVersion++;if(tableClient)tableClient.close();tableClient=null;$('batchRun').disabled=false;$('batchCancel').disabled=true}
function invalidateTable(){stopWorker();tableResult=null;$('batchCsv').disabled=true;$('batchJson').disabled=true;$('batchProgress').value=0;batchMode='cleared';batchArgs=null;paintBatch();lookup()}
function quantile(hist,ratio){const pairs=Object.entries(hist).map(([q,n])=>[+q,n]).sort((a,b)=>a[0]-b[0]),n=pairs.reduce((a,b)=>a+b[1],0);let sum=0;for(const [q,c] of pairs){sum+=c;if(sum>=n*ratio)return q}return 0}
function lookup(){const side=$('lookupSide').value,w=+$('lookupWindow').value,m=+$('lookupCount').value;if(!tableResult){$('lookupResult').textContent=A2Text.t('lookupNeed');lineChart('distribution',[[]],['#007d89'],1,1,A2Text.t('axisOther'));lineChart('policy',[[],[]],['#095ccc','#007d89'],1,1,A2Text.t('axisDelay'));return}const cells=tableResult.cells.filter(c=>c.side===side&&c.window===w).sort((a,b)=>a.m-b.m),cell=cells.find(c=>c.m===m),good=cells.filter(c=>c.n>=30),max=Math.max(1,...cells.map(c=>c.m));lineChart('policy',[good.map(c=>[c.m,c.sumLeft/c.n]),good.map(c=>[c.m,c.sumRight/c.n])],['#095ccc','#007d89'],max,Math.max(1,...good.flatMap(c=>[c.sumLeft/c.n,c.sumRight/c.n])),A2Text.t('axisDelay'));if(!cell){$('lookupResult').textContent=A2Text.t('noCell')(side,m);lineChart('distribution',[[]],['#007d89'],1,1,A2Text.t('axisNone'));return}const dist=Object.entries(cell.hist).map(([q,n])=>[+q,n/cell.n]).sort((a,b)=>a[0]-b[0]),otherMean=dist.reduce((sum,[q,prob])=>sum+q*prob,0),a=cell.sumLeft/cell.n,b=cell.sumRight/cell.n;lineChart('distribution',[dist],['#007d89'],Math.max(1,...dist.map(x=>x[0])),Math.max(.01,...dist.map(x=>x[1])),A2Text.t('axisOther'));const verdict=cell.n<30?A2Text.t('few'):Math.abs(a-b)<1?A2Text.t('similar'):A2Text.t(a<b?'recLeft':'recRight');$('lookupResult').innerHTML=`<span class="pill">${A2Text.t('snapCount')(cell.n)}</span><p>${A2Text.t('otherMean')(otherMean.toFixed(1),quantile(cell.hist,.05),quantile(cell.hist,.95))}</p><p>${A2Text.t('delayBoth')(a.toFixed(1),b.toFixed(1))}</p><strong>${verdict}</strong><p class="small">${A2Text.t('condNote')(side,w*params.window/60,Math.min(params.duration,(w+1)*params.window)/60,m)}</p>`}
$('batchRun').onclick=async()=>{let version;try{const p=readParams();if(!params||JSON.stringify(p)!==JSON.stringify(params)||!frames.length)throw Error(A2Text.t('changedFirst'));stopWorker();version=collectionVersion;tableResult=null;$('batchCsv').disabled=true;$('batchJson').disabled=true;$('batchRun').disabled=true;$('batchCancel').disabled=false;$('batchProgress').value=0;batchMode='busy';batchArgs=null;paintBatch();lookup();tableClient=new SimulationAPI.Client();const result=await tableClient.collect(p,1000000,d=>{if(version!==collectionVersion)return;$('batchProgress').value=d.done;batchMode='running';batchArgs=d;paintBatch()});if(version!==collectionVersion)return;tableResult={...result,createdAt:new Date().toISOString()};stopWorker();$('batchProgress').value=result.done;batchMode='done';batchArgs=result;paintBatch();$('batchCsv').disabled=false;$('batchJson').disabled=false;lookup()}catch(e){if(version!==undefined&&version!==collectionVersion)return;stopWorker();batchMode='failed';batchArgs=e.message;paintBatch()}};

$('batchCancel').onclick=()=>{stopWorker();batchMode='stopped';batchArgs=null;paintBatch()};
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('batchJson').onclick=()=>{if(tableResult)download('hku-conditional-model.json',JSON.stringify(tableResult),'application/json')};$('batchCsv').onclick=()=>{if(!tableResult)return;const {cells,...meta}=tableResult,rows=['# '+JSON.stringify(meta),'entry,window_start_seconds,observed_people,other_people,joint_count,condition_count,conditional_probability,mean_left_seconds,mean_right_seconds'];for(const c of cells)for(const [other,n] of Object.entries(c.hist))rows.push([c.side,c.window*params.window,c.m,other,n,c.n,n/c.n,c.sumLeft/c.n,c.sumRight/c.n].join(','));download('hku-conditional-table.csv','\ufeff'+rows.join('\n'),'text/csv;charset=utf-8')};for(const id of ['lookupSide','lookupWindow','lookupCount'])$(id).onchange=lookup;window.addEventListener('resize',lookup);populateWindows();lookup();

function applyAcademicLang(){
 A2Text.apply();
 $('play').textContent=playing?A2Text.t('pause'):A2Text.t('play');
 if(statusKey) setStatus();
 if(frames.length) render();
 populateWindows();
 paintBatch();
 lookup();
}
A2Lang.mount($('lang'), applyAcademicLang);
paintBatch();

window.addEventListener('pagehide',stopWorker);
