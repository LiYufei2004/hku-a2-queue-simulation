/* Passenger advisor page. Talks to the shared backend only through SimulationAPI. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const SVGNS='http://www.w3.org/2000/svg';
const client=new SimulationAPI.Client();

// Landmarks: approximate people ahead when standing there. On-map distances follow the
// backend layout (18 px per person); off-map ones extend the queue past each entrance.
const LANDMARKS=[
 [{n:0,key:'lmDoor'},{n:7,key:'lmLobbyL'},{n:17,key:'lmLowerA'},{n:28,key:'lmBendA'},{n:40,key:'lmMidA'},{n:52,key:'lmEntryA'},{n:80,key:'lmUniMid'},{n:120,key:'lmUniLib'}],
 [{n:0,key:'lmDoor'},{n:8,key:'lmLobbyR'},{n:17,key:'lmPartition'},{n:21,key:'lmBendB'},{n:38,key:'lmMidB'},{n:55,key:'lmEntryB'},{n:85,key:'lmCYC'},{n:120,key:'lmCYCfar'}]
];
const T={
 en:{title:'HKU A2 Lift Queue Advisor',subtitle:'Should you switch queues? Roughly how long will you wait?',toAcademic:'Academic simulation →',lang:'中文',
  nowTitle:'Time now (Hong Kong)',override:'Try a different time',speedTitle:'Your walking speed',slow:'Slow',normal:'Normal',fast:'Fast',custom:'Custom (m/s)',
  queueTitle:'Which queue are you in?',leftQ:'Left · Direct lifts',leftQs:'Side A / west corridor',rightQ:'Right · Lifts via A1',rightQs:'Side B / east corridor',
  whereTitle:'Where are you in the queue?',mapHint:'Swipe the map sideways to see both corridors.',whereHelp:'Tap your spot on the map or pick the nearest landmark, then fine-tune the number of people ahead of you.',
  ahead:'People ahead of you',go:'Should I switch?',working:'Simulating…',howTitle:'How is this estimated?',
  days:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  period:{teaching:'Teaching hours',offpeak:'Off-peak',weekend:'Weekend',night:'Night',lunch:'Lunch time',dinner:'Dinner time',classEnd:'Classes just ended (:50)'},
  lmDoor:'At the lift door',lmLobbyL:'Left lift lobby',lmLowerA:'Side A corridor, lower part',lmBendA:'Side A corridor bend',lmMidA:'Side A corridor, middle',lmEntryA:'Side A entrance',
  lmUniMid:'University Street, middle section',lmUniLib:'University Street, near Library / Kadoorie',
  lmLobbyR:'Right lift lobby',lmPartition:'End of the glass partition',lmBendB:'Side B corridor bend',lmMidB:'Side B corridor, middle',lmEntryB:'Side B entrance',
  lmCYC:'In front of Chow Yei Ching Building',lmCYCfar:'Past Chow Yei Ching (towards Centennial)',
  offMap:n=>`Beyond the map: about ${n} people ahead`,approx:n=>`≈ ${n} ahead`,
  verdict:{switch:q=>`Switch to the ${q} queue`,stay:()=>'Stay in your queue',close:()=>'Close call: staying is fine'},
  qname:['left (direct)','right (via A1)'],
  stayLbl:'If you stay',switchLbl:'If you switch',walkIncl:s=>`includes ~${s} s walking`,range:(a,b)=>`usually ${a} to ${b}`,
  faster:p=>`Switching was faster in ${p}% of simulated cases.`,saved:(pos,s)=>pos?`Median time saved by switching: ${s}.`:`Switching would cost about ${s} more (median).`,
  other:(m,a,b)=>`The other queue (which you can't see) probably has about ${m} people (5–95% range: ${a}–${b}).`,
  histTitle:'Other queue length given your position (simulated)',people:'people',
  low:'Few simulated situations match your position at this time, so this estimate is rough.',
  basis:(n,b)=>`Based on ${n} matching simulated snapshots and ${b} paired stay/switch simulations.`,
  under1:'under 1 min',min:x=>`${x} min`,
  how:'<p>Arrivals at Side A and Side B follow a time-of-day profile: weekday teaching hours, extra passengers at lunch (12:00–14:00) and dinner (17:30–19:30), and a 10-minute peak after classes end at :50. All rates are illustrative assumptions until calibrated with field counts.</p><p>The page runs the same simulation engine as the academic page in your browser. It simulates many independent queue histories around the current time and keeps the moments where your queue matches your position. That gives the probability distribution of the other queue\'s length, even though you cannot see it. From each matching moment it simulates both choices with real lift trips: staying in place, or walking to the other queue\'s tail (distance 0.45 m × people passed, at your walking speed) and joining it.</p><p>Times run until you board. They exclude the ride itself and assume most other passengers keep behaving as in the model.</p>'},
 zh:{title:'港大 A2 电梯排队助手',subtitle:'要不要换队？大概还要等多久？',toAcademic:'学术版模拟 →',lang:'EN',
  nowTitle:'现在时间（香港）',override:'换一个时间试试',speedTitle:'你的步行速度',slow:'慢',normal:'一般',fast:'快',custom:'自定义（米/秒）',
  queueTitle:'你现在在哪一队？',leftQ:'左队 · 直达电梯',leftQs:'Side A / 西侧走廊',rightQ:'右队 · 经 A1 电梯',rightQs:'Side B / 东侧走廊',
  whereTitle:'你排到哪里了？',mapHint:'左右滑动地图可以看到两条走廊。',whereHelp:'在图上点你所在的位置，或选最近的地标，再微调你前面大约有多少人。',
  ahead:'你前面的人数',go:'要不要换队？',working:'模拟中…',howTitle:'这是怎么估算的？',
  days:['星期日','星期一','星期二','星期三','星期四','星期五','星期六'],
  period:{teaching:'上课时段',offpeak:'非高峰',weekend:'周末',night:'夜间',lunch:'午饭时间',dinner:'晚饭时间',classEnd:'刚下课（:50）'},
  lmDoor:'电梯门口',lmLobbyL:'左侧电梯厅',lmLowerA:'Side A 走廊下段',lmBendA:'Side A 走廊转角',lmMidA:'Side A 走廊中段',lmEntryA:'Side A 入口',
  lmUniMid:'University Street 中段',lmUniLib:'University Street 靠图书馆 / Kadoorie',
  lmLobbyR:'右侧电梯厅',lmPartition:'玻璃隔断尽头',lmBendB:'Side B 走廊转角',lmMidB:'Side B 走廊中段',lmEntryB:'Side B 入口',
  lmCYC:'周亦卿楼（Chow Yei Ching）前面',lmCYCfar:'过了周亦卿楼（往 Centennial 方向）',
  offMap:n=>`超出图的范围：前面大约 ${n} 人`,approx:n=>`≈ 前面 ${n} 人`,
  verdict:{switch:q=>`建议换到${q}`,stay:()=>'建议留在原队',close:()=>'差不多，留在原队就好'},
  qname:['左队（直达）','右队（经 A1）'],
  stayLbl:'留在原队',switchLbl:'换队',walkIncl:s=>`含步行约 ${s} 秒`,range:(a,b)=>`通常 ${a} 到 ${b}`,
  faster:p=>`在模拟中，换队更快的情况占 ${p}%。`,saved:(pos,s)=>pos?`换队平均（中位数）可省 ${s}。`:`换队反而多花约 ${s}（中位数）。`,
  other:(m,a,b)=>`另一队（你看不到）大概有 ${m} 人（5–95% 范围：${a}–${b} 人）。`,
  histTitle:'根据你的位置推算的另一队人数（模拟）',people:'人',
  low:'这个时间段里和你位置相符的模拟情况较少，估计比较粗略。',
  basis:(n,b)=>`基于 ${n} 个匹配的模拟快照，以及 ${b} 组留队/换队对照模拟。`,
  under1:'不到 1 分钟',min:x=>`${x} 分钟`,
  how:'<p>Side A 与 Side B 的到达人流按时段设定：工作日上课时段为基础，午饭（12:00–14:00）和晚饭（17:30–19:30）人更多，每节课 :50 下课后有 10 分钟高峰。所有数值都是示意性假设，有实测数据后再校准。</p><p>页面在你的浏览器里运行和学术版相同的模拟引擎。它模拟当前时间前后的大量独立排队情况，只保留你这一队人数和你的位置相符的时刻，由此得到另一队人数的条件概率分布，所以你不用看到另一队。再从每个匹配时刻分别模拟两种选择，电梯按真实班次运行：一是原地不动，二是按你的步行速度走到另一队队尾排队（距离为 0.45 米 × 经过的人数）。</p><p>时间计到你上电梯为止，不含乘梯时间，并假设其他人仍按模型行为。</p>'}
};
const state={lang:'en',queue:0,ahead:20,speed:1.3,layout:null,lastResult:null,busy:false};
try{const saved=localStorage.getItem('a2-advisor-lang');if(saved==='zh'||saved==='en')state.lang=saved}catch(e){}
const t=key=>T[state.lang][key];

function fmtTime(sec){if(sec==null)return '–';if(sec<60)return t('under1');const m=Math.round(sec/30)/2;return t('min')(m%1?m.toFixed(1):m.toFixed(0))}
function nowInput(){
 if(!$('useOverride').checked)return Date.now();
 const [h,m]=($('ovTime').value||'12:00').split(':').map(Number);
 return {weekday:+$('ovDay').value,seconds:h*3600+m*60};
}
function hkClock(){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Hong_Kong',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
 const get=x=>parts.find(p=>p.type===x).value;
 return {weekday:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(get('weekday')),text:`${get('hour')}:${get('minute')}`};
}
let profileGen=0;
async function refreshClock(){
 const c=hkClock(),over=$('useOverride').checked;
 $('clockText').textContent=over?$('ovTime').value:c.text;
 $('dayText').textContent=T[state.lang].days[over?+$('ovDay').value:c.weekday];
 const gen=++profileGen;
 try{const p=await client.profile(nowInput());if(gen!==profileGen)return;
  $('period').innerHTML='';for(const label of p.period){const s=document.createElement('span');s.className='chip'+(['classEnd','lunch','dinner'].includes(label)?' hot':'');s.textContent=t('period')[label]||label;$('period').append(s)}
 }catch(e){$('error').textContent=e.message}
}

// ---------- Map overlay ----------
function el(name,attrs,parent){const n=document.createElementNS(SVGNS,name);for(const k in attrs)n.setAttribute(k,attrs[k]);if(parent)parent.append(n);return n}
function nearestOnPath(path,x,y){let best={d2:Infinity,dist:0},acc=0;for(let k=1;k<path.length;k++){const a=path[k-1],b=path[k],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),u=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(len*len))),px=a[0]+u*dx,py=a[1]+u*dy,d2=(x-px)**2+(y-py)**2;if(d2<best.d2)best={d2,dist:acc+u*len};acc+=len}return best}
function drawOverlay(){
 const L=state.layout,svg=$('overlay');if(!L)return;svg.innerHTML='';
 const sp=L.personSpacingPixels,pts=p=>p.map(v=>v.join(',')).join(' ');
 L.paths.forEach((path,i)=>{const sel=i===state.queue,color=i?'#007d89':'#095ccc';
  el('polyline',{points:pts(path),fill:'none',stroke:color,'stroke-width':sel?14:6,'stroke-opacity':sel?.28:.12,'stroke-linecap':'round','stroke-linejoin':'round'},svg);
  if(!sel)return;
  for(let n=10;n*sp<=L.lengths[i];n+=10){const [x,y]=MapGeometry.position(path,n*sp);el('circle',{cx:x,cy:y,r:5,fill:color},svg);const tx=el('text',{x:x+12,y:y-8,'font-size':18,fill:color,'font-weight':700},svg);tx.textContent=n}
 });
 const path=L.paths[state.queue],color=state.queue?'#007d89':'#095ccc';
 for(const lm of LANDMARKS[state.queue]){if(lm.n*sp>L.lengths[state.queue])continue;const [x,y]=MapGeometry.position(path,lm.n*sp);
  const g=el('g',{style:'cursor:pointer'},svg);el('circle',{cx:x,cy:y,r:11,fill:'#fff',stroke:color,'stroke-width':4},g);g.addEventListener('click',ev=>{ev.stopPropagation();setAhead(lm.n)})}
 const d=state.ahead*sp,off=d>L.lengths[state.queue],[x,y]=MapGeometry.position(path,Math.min(d,L.lengths[state.queue]));
 el('circle',{cx:x,cy:y,r:20,fill:'#d93a3f','fill-opacity':.2},svg);el('circle',{cx:x,cy:y,r:11,fill:'#d93a3f',stroke:'#fff','stroke-width':4},svg);
 const label=el('text',{x:x+(state.queue?0:18),y:y+(state.queue?-26:42),'font-size':22,'font-weight':800,fill:'#d93a3f','text-anchor':state.queue?'middle':'start',stroke:'#fff','stroke-width':6,'paint-order':'stroke'},svg);
 label.textContent=(state.lang==='zh'?'你 · ':'You · ')+(off?'+':'')+state.ahead;
 state.marker=[x,y];
}
function overlayPoint(ev){const svg=$('overlay'),r=svg.getBoundingClientRect();return [(ev.clientX-r.left)*1536/r.width,(ev.clientY-r.top)*1024/r.height]}
$('overlay').addEventListener('click',ev=>{
 const L=state.layout;if(!L)return;const [x,y]=overlayPoint(ev);
 const hits=L.paths.map((p,i)=>({i,...nearestOnPath(p,x,y)}));const best=hits.sort((a,b)=>a.d2-b.d2)[0];
 if(best.d2>90*90)return;
 if(best.i!==state.queue)setQueue(best.i,false);
 setAhead(Math.round(best.dist/L.personSpacingPixels),false);
});

// ---------- Inputs ----------
function renderLandmarks(){
 const box=$('landmarks');box.innerHTML='';
 for(const lm of LANDMARKS[state.queue]){const b=document.createElement('button');b.type='button';b.textContent=`${t(lm.key)} · ${t('approx')(lm.n)}`;b.setAttribute('aria-pressed',String(lm.n===state.ahead));b.onclick=()=>setAhead(lm.n);box.append(b)}
}
function aheadNote(){const L=state.layout;if(!L)return '';const beyond=state.ahead*L.personSpacingPixels>L.lengths[state.queue];return beyond?t('offMap')(state.ahead):''}
// On narrow screens the map scrolls sideways: keep the user's marker in view.
function revealMarker(){const w=$('mapwrap');if(!state.marker||w.scrollWidth<=w.clientWidth)return;const x=state.marker[0]/1536*w.scrollWidth;w.scrollTo({left:Math.max(0,x-w.clientWidth/2),behavior:'smooth'})}
function setAhead(n,reveal=true){state.ahead=Math.max(0,Math.min(200,n|0));$('ahead').value=state.ahead;$('aheadOut').textContent=state.ahead;$('aheadNote').textContent=aheadNote();renderLandmarks();drawOverlay();if(reveal)revealMarker();markStale()}
function setQueue(q,keep=true){state.queue=q;for(const b of $('queueSeg').children)b.setAttribute('aria-pressed',String(+b.dataset.queue===q));if(keep)setAhead(state.ahead);else{renderLandmarks();drawOverlay()}markStale()}
function setSpeed(v){state.speed=v;$('speed').value=v;for(const b of $('speedSeg').children)b.setAttribute('aria-pressed',String(Math.abs(+b.dataset.speed-v)<1e-9));markStale()}
function markStale(){if(state.lastResult)$('result').style.opacity=.55}
$('ahead').addEventListener('input',e=>setAhead(+e.target.value));
for(const b of $('queueSeg').children)b.addEventListener('click',()=>setQueue(+b.dataset.queue));
for(const b of $('speedSeg').children)b.addEventListener('click',()=>setSpeed(+b.dataset.speed));
$('speed').addEventListener('change',e=>{const v=+e.target.value;if(Number.isFinite(v)&&v>=.3&&v<=3)setSpeed(Math.round(v*10)/10);else e.target.value=state.speed});
$('useOverride').addEventListener('change',()=>{$('overrideBox').classList.toggle('on',$('useOverride').checked);refreshClock();markStale()});
$('ovDay').addEventListener('change',()=>{refreshClock();markStale()});$('ovTime').addEventListener('change',()=>{refreshClock();markStale()});

// ---------- Result ----------
function histogramSVG(hist,otherQueue){
 const entries=Object.entries(hist).map(([k,v])=>[+k,v]);if(!entries.length)return '';
 const max=Math.max(...entries.map(e=>e[0])),bin=Math.max(1,Math.ceil((max+1)/24)),bins=[];
 for(const [k,v] of entries){const j=Math.floor(k/bin);bins[j]=(bins[j]||0)+v}
 const n=Math.ceil((max+1)/bin),W=600,H=150,bw=(W-40)/n,top=Math.max(...bins.filter(Boolean));
 let s=`<svg id="hist" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('histTitle')}">`;
 for(let j=0;j<n;j++){const v=bins[j]||0,h=v/top*(H-40);s+=`<rect x="${30+j*bw+1}" y="${H-24-h}" width="${Math.max(1,bw-2)}" height="${h}" rx="2" fill="${otherQueue?'#007d89':'#095ccc'}" fill-opacity=".75"/>`}
 for(let j=0;j<=n;j+=Math.max(1,Math.round(n/6)))s+=`<text x="${30+j*bw}" y="${H-6}" font-size="12" fill="#536e7e" text-anchor="middle">${j*bin}</text>`;
 return s+`<line x1="30" y1="${H-24}" x2="${W-10}" y2="${H-24}" stroke="#ccdbe5"/></svg>`;
}
function renderResult(r){
 const box=$('result'),L=T[state.lang],other=1-r.input.queue;box.hidden=false;box.style.opacity=1;
 const best=r.recommendation==='switch'?'switch':'stay';
 const gain=r.timeSaved,gainText=gain>=0?fmtTime(gain):fmtTime(-gain);
 box.innerHTML=`<p class="verdict ${r.recommendation}">${L.verdict[r.recommendation](L.qname[other])}</p>
 <p class="small">${L.faster(Math.round(r.pSwitchFaster*100))} ${Math.abs(gain)>=30?L.saved(gain>=0,gainText):''}</p>
 <div class="compare"><div class="${best==='stay'?'best':''}"><span>${L.stayLbl}</span><strong>${fmtTime(r.stay.median)}</strong><span class="small">${L.range(fmtTime(r.stay.p10),fmtTime(r.stay.p90))}</span></div>
 <div class="${best==='switch'?'best':''}"><span>${L.switchLbl}</span><strong>${fmtTime(r.switch.median)}</strong><span class="small">${L.range(fmtTime(r.switch.p10),fmtTime(r.switch.p90))} · ${L.walkIncl(Math.round(r.switch.walk.median))}</span></div></div>
 ${r.lowConfidence?`<p class="warn">${L.low}</p>`:''}
 <p>${L.other(Math.round(r.otherQueue.median),Math.round(r.otherQueue.p05),Math.round(r.otherQueue.p95))}</p>
 <div class="small">${L.histTitle} (${L.people})</div>${histogramSVG(r.otherQueue.hist,other)}
 <p class="small">${L.basis(r.matches,r.branches)}</p>`;
}
$('go').addEventListener('click',async()=>{
 if(state.busy)return;state.busy=true;$('go').disabled=true;$('go').textContent=t('working');$('error').textContent='';
 try{const r=await client.advise({now:nowInput(),queue:state.queue,ahead:state.ahead,speed:state.speed});state.lastResult=r;renderResult(r);$('result').scrollIntoView({behavior:'smooth',block:'nearest'})}
 catch(e){$('error').textContent=e.message}
 finally{state.busy=false;$('go').disabled=false;$('go').textContent=t('go')}
});

// ---------- Language ----------
function applyLang(){
 document.documentElement.lang=state.lang==='zh'?'zh-Hans':'en';
 for(const n of document.querySelectorAll('[data-i18n]'))n.textContent=t(n.dataset.i18n);
 $('lang').textContent=t('lang');document.title=state.lang==='zh'?'港大 A2 · 电梯排队助手':'HKU A2 · Lift Queue Advisor';
 const sel=$('ovDay'),v=sel.value;sel.innerHTML=T[state.lang].days.map((d,i)=>`<option value="${i}">${d}</option>`).join('');sel.value=v||'1';
 $('howText').innerHTML=t('how');$('aheadNote').textContent=aheadNote();
 renderLandmarks();drawOverlay();refreshClock();if(state.lastResult)renderResult(state.lastResult);
}
$('lang').addEventListener('click',()=>{state.lang=state.lang==='en'?'zh':'en';try{localStorage.setItem('a2-advisor-lang',state.lang)}catch(e){}applyLang()});

(async()=>{
 applyLang();
 try{state.layout=await client.layout();setAhead(state.ahead)}catch(e){$('error').textContent=e.message}
 setInterval(()=>{if(!$('useOverride').checked)refreshClock()},30000);
})();
})();
