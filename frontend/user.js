/* Passenger advisor page. Talks to the shared backend only through SimulationAPI. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const SVGNS='http://www.w3.org/2000/svg';
const client=new SimulationAPI.Client();

// Map, queue paths and landmarks come from campus-map.js (presentation data only).
const MAP=CampusMap;
const T={
 en:{you:'You · ',mapAria:'Queue position picker',mapAlt:'Map of University Street at HKU. The A2 lift tower stands in front of Haking Wong Building. The left (direct) queue runs west past Haking Wong and the footbridge towards the Library; the right (via A1) queue runs east past Simon K.Y. Lee Hall, Composite Building and Chow Yei Ching Building towards Jockey Club Tower.',title:'HKU A2 Lift Queue Advisor',subtitle:'Should you switch queues? Roughly how long will you wait?',toAcademic:'Academic simulation →',lang:'中文',
  nowTitle:'Time now (Hong Kong)',override:'Try a different time',speedTitle:'Your walking speed',slow:'Slow',normal:'Normal',fast:'Fast',custom:'Custom (m/s)',
  queueTitle:'Which queue are you in?',leftQ:'Left · Direct lifts',leftQs:'Side A / west corridor',rightQ:'Right · Lifts via A1',rightQs:'Side B / east corridor',
  whereTitle:'Where are you in the queue?',mapHint:'Swipe the map sideways to see the whole street.',whereHelp:'Tap your spot on the map or pick the nearest landmark, then fine-tune the number of people ahead of you.',
  ahead:'People ahead of you',go:'Should I switch?',working:'Simulating…',howTitle:'How is this estimated?',
  days:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  period:{teaching:'Teaching hours',offpeak:'Off-peak',weekend:'Weekend',night:'Night',lunch:'Lunch time',dinner:'Dinner time',classEnd:'Classes just ended (:50)'},
  lmDoor:'At the lift door',lmStreet:'Just out on University Street',lmHWmid:'In front of Haking Wong (middle)',lmHWwest:'Haking Wong, west end',lmBridgeE:'Footbridge, east end',lmBridgeMid:'Footbridge, middle (above Kadoorie)',lmBridgeW:'Footbridge, west end',lmLibrary:'In front of the Library',
  lmHWeast:'Haking Wong, east end',lmSKYLee:'In front of Simon K.Y. Lee Hall',lmComposite:'In front of Composite Building',lmCYC:'In front of Chow Yei Ching Building',lmCYCpast:'Past Chow Yei Ching',lmJCT:'In front of Jockey Club Tower',
  offMap:n=>`Beyond the map: about ${n} people ahead`,approx:n=>`≈ ${n} ahead`,
  verdict:{switch:q=>`Switch to the ${q} queue`,stay:()=>'Stay in your queue',close:()=>'Close call: staying is fine'},
  qname:['left (direct)','right (via A1)'],
  stayLbl:'If you stay',switchLbl:'If you switch',walkIncl:s=>`includes ~${s} s walking`,range:(a,b)=>`usually ${a} to ${b}`,
  faster:p=>`Switching was faster in ${p}% of simulated cases.`,saved:(pos,s)=>pos?`Median time saved by switching: ${s}.`:`Switching would cost about ${s} more (median).`,
  other:(m,a,b)=>`The other queue (which you can't see) probably has about ${m} people (5–95% range: ${a}–${b}).`,
  histTitle:'Other queue length given your position (simulated)',people:'people',
  low:'Few simulated situations match your position at this time, so this estimate is rough.',
  basis:(n,u,b)=>n>=u?`Based on ${n} matching simulated snapshots and ${b} paired stay/switch simulations.`:`Only ${n} simulated snapshots matched exactly, so the ${u} closest ones were used, with ${b} paired stay/switch simulations.`,
  extrap:m=>`Your queue is longer than the model usually sees at this time (typically up to about ${m} people). Your position is kept as entered, but the wait times are extrapolated.`,
  under1:'under 1 min',min:x=>`${x} min`,
  how:'<p>Arrivals at Side A and Side B follow a time-of-day profile: weekday teaching hours, extra passengers at lunch (12:00–14:00) and dinner (17:30–19:30), and a 10-minute peak after classes end at :50. All rates are illustrative assumptions until calibrated with field counts.</p><p>The page runs the same simulation engine as the academic page in your browser. It simulates many independent queue histories around the current time and keeps the moments where your queue matches your position. That gives the probability distribution of the other queue\'s length, even though you cannot see it. From each matching moment it simulates both choices with real lift trips: staying in place, or walking to the other queue\'s tail (distance 0.45 m × people passed, at your walking speed) and joining it.</p><p>Times run until you board. They exclude the ride itself and assume most other passengers keep behaving as in the model.</p>'},
 'zh-Hans':{you:'你 · ',mapAria:'队列位置',mapAlt:'香港大学 University Street 地图。A2 电梯塔在 Haking Wong 楼前。左队（直达）向西经过 Haking Wong 和天桥，通往图书馆；右队（经 A1）向东经过 Simon K.Y. Lee Hall、Composite Building 和周亦卿楼，通往 Jockey Club Tower。',title:'港大 A2 电梯排队助手',subtitle:'要不要换队？大概还要等多久？',toAcademic:'学术版模拟 →',lang:'EN',
  nowTitle:'现在时间（香港）',override:'换一个时间试试',speedTitle:'你的步行速度',slow:'慢',normal:'一般',fast:'快',custom:'自定义（米/秒）',
  queueTitle:'你现在在哪一队？',leftQ:'左队 · 直达电梯',leftQs:'Side A / 西侧走廊',rightQ:'右队 · 经 A1 电梯',rightQs:'Side B / 东侧走廊',
  whereTitle:'你排到哪里了？',mapHint:'左右滑动地图可以看到整条街。',whereHelp:'在图上点你所在的位置，或选最近的地标，再微调你前面大约有多少人。',
  ahead:'你前面的人数',go:'要不要换队？',working:'模拟中…',howTitle:'这是怎么估算的？',
  days:['星期日','星期一','星期二','星期三','星期四','星期五','星期六'],
  period:{teaching:'上课时段',offpeak:'非高峰',weekend:'周末',night:'夜间',lunch:'午饭时间',dinner:'晚饭时间',classEnd:'刚下课（:50）'},
  lmDoor:'电梯门口',lmStreet:'刚出到 University Street',lmHWmid:'Haking Wong 楼前（中段）',lmHWwest:'Haking Wong 西端',lmBridgeE:'天桥东端',lmBridgeMid:'天桥中段（Kadoorie 上方）',lmBridgeW:'天桥西端',lmLibrary:'图书馆前',
  lmHWeast:'Haking Wong 东端',lmSKYLee:'Simon K.Y. Lee Hall 前',lmComposite:'Composite Building 前',lmCYC:'周亦卿楼（Chow Yei Ching）前',lmCYCpast:'过了周亦卿楼',lmJCT:'Jockey Club Tower 前',
  offMap:n=>`超出图的范围：前面大约 ${n} 人`,approx:n=>`≈ 前面 ${n} 人`,
  verdict:{switch:q=>`建议换到${q}`,stay:()=>'建议留在原队',close:()=>'差不多，留在原队就好'},
  qname:['左队（直达）','右队（经 A1）'],
  stayLbl:'留在原队',switchLbl:'换队',walkIncl:s=>`含步行约 ${s} 秒`,range:(a,b)=>`通常 ${a} 到 ${b}`,
  faster:p=>`在模拟中，换队更快的情况占 ${p}%。`,saved:(pos,s)=>pos?`换队平均（中位数）可省 ${s}。`:`换队反而多花约 ${s}（中位数）。`,
  other:(m,a,b)=>`另一队（你看不到）大概有 ${m} 人（5–95% 范围：${a}–${b} 人）。`,
  histTitle:'根据你的位置推算的另一队人数（模拟）',people:'人',
  low:'这个时间段里和你位置相符的模拟情况较少，估计比较粗略。',
  basis:(n,u,b)=>n>=u?`基于 ${n} 个匹配的模拟快照，以及 ${b} 组留队/换队对照模拟。`:`只有 ${n} 个模拟快照完全匹配，因此使用了最接近的 ${u} 个，并做了 ${b} 组留队/换队对照模拟。`,
  extrap:m=>`你这一队比模型在这个时段通常看到的更长（一般最多约 ${m} 人）。你的位置按输入保留，但等待时间是外推估计。`,
  under1:'不到 1 分钟',min:x=>`${x} 分钟`,
  how:'<p>Side A 与 Side B 的到达人流按时段设定：工作日上课时段为基础，午饭（12:00–14:00）和晚饭（17:30–19:30）人更多，每节课 :50 下课后有 10 分钟高峰。所有数值都是示意性假设，有实测数据后再校准。</p><p>页面在你的浏览器里运行和学术版相同的模拟引擎。它模拟当前时间前后的大量独立排队情况，只保留你这一队人数和你的位置相符的时刻，由此得到另一队人数的条件概率分布，所以你不用看到另一队。再从每个匹配时刻分别模拟两种选择，电梯按真实班次运行：一是原地不动，二是按你的步行速度走到另一队队尾排队（距离为 0.45 米 × 经过的人数）。</p><p>时间计到你上电梯为止，不含乘梯时间，并假设其他人仍按模型行为。</p>'},
 'zh-Hant':{you:'你 · ',mapAria:'隊列位置',mapAlt:'香港大學 University Street 地圖。A2 升降機塔在 Haking Wong 樓前。左隊（直達）向西經過 Haking Wong 和天橋，通往圖書館；右隊（經 A1）向東經過 Simon K.Y. Lee Hall、Composite Building 和周亦卿樓，通往 Jockey Club Tower。',title:'港大 A2 升降機排隊助手',subtitle:'要不要換隊？大概還要等多久？',toAcademic:'學術版模擬 →',lang:'EN',
  nowTitle:'現在時間（香港）',override:'換一個時間試試',speedTitle:'你的步行速度',slow:'慢',normal:'一般',fast:'快',custom:'自訂（米/秒）',
  queueTitle:'你現在在哪一隊？',leftQ:'左隊 · 直達升降機',leftQs:'Side A / 西側走廊',rightQ:'右隊 · 經 A1 升降機',rightQs:'Side B / 東側走廊',
  whereTitle:'你排到哪裡了？',mapHint:'左右滑動地圖可以看到整條街。',whereHelp:'在圖上點你所在的位置，或選最近的地標，再微調你前面大約有多少人。',
  ahead:'你前面的人數',go:'要不要換隊？',working:'模擬中…',howTitle:'這是怎麼估算的？',
  days:['星期日','星期一','星期二','星期三','星期四','星期五','星期六'],
  period:{teaching:'上課時段',offpeak:'非高峰',weekend:'週末',night:'夜間',lunch:'午飯時間',dinner:'晚飯時間',classEnd:'剛下課（:50）'},
  lmDoor:'升降機門口',lmStreet:'剛出到 University Street',lmHWmid:'Haking Wong 樓前（中段）',lmHWwest:'Haking Wong 西端',lmBridgeE:'天橋東端',lmBridgeMid:'天橋中段（Kadoorie 上方）',lmBridgeW:'天橋西端',lmLibrary:'圖書館前',
  lmHWeast:'Haking Wong 東端',lmSKYLee:'Simon K.Y. Lee Hall 前',lmComposite:'Composite Building 前',lmCYC:'周亦卿樓（Chow Yei Ching）前',lmCYCpast:'過了周亦卿樓',lmJCT:'Jockey Club Tower 前',
  offMap:n=>`超出圖的範圍：前面大約 ${n} 人`,approx:n=>`≈ 前面 ${n} 人`,
  verdict:{switch:q=>`建議換到${q}`,stay:()=>'建議留在原隊',close:()=>'差不多，留在原隊就好'},
  qname:['左隊（直達）','右隊（經 A1）'],
  stayLbl:'留在原隊',switchLbl:'換隊',walkIncl:s=>`含步行約 ${s} 秒`,range:(a,b)=>`通常 ${a} 到 ${b}`,
  faster:p=>`在模擬中，換隊更快的情況佔 ${p}%。`,saved:(pos,s)=>pos?`換隊平均（中位數）可省 ${s}。`:`換隊反而多花約 ${s}（中位數）。`,
  other:(m,a,b)=>`另一隊（你看不到）大概有 ${m} 人（5–95% 範圍：${a}–${b} 人）。`,
  histTitle:'根據你的位置推算的另一隊人數（模擬）',people:'人',
  low:'這個時段裡和你位置相符的模擬情況較少，估計比較粗略。',
  basis:(n,u,b)=>n>=u?`基於 ${n} 個匹配的模擬快照，以及 ${b} 組留隊/換隊對照模擬。`:`只有 ${n} 個模擬快照完全匹配，因此使用了最接近的 ${u} 個，並做了 ${b} 組留隊/換隊對照模擬。`,
  extrap:m=>`你這一隊比模型在這個時段通常看到的更長（一般最多約 ${m} 人）。你的位置按輸入保留，但等待時間是外推估計。`,
  under1:'不到 1 分鐘',min:x=>`${x} 分鐘`,
  how:'<p>Side A 與 Side B 的到達人流按時段設定：工作日上課時段為基礎，午飯（12:00–14:00）和晚飯（17:30–19:30）人更多，每節課 :50 下課後有 10 分鐘高峰。所有數值都是示意性假設，有實測數據後再校準。</p><p>頁面在你的瀏覽器裡運行和學術版相同的模擬引擎。它模擬當前時間前後的大量獨立排隊情況，只保留你這一隊人數和你的位置相符的時刻，由此得到另一隊人數的條件概率分佈，所以你不用看到另一隊。再從每個匹配時刻分別模擬兩種選擇，升降機按真實班次運行：一是原地不動，二是按你的步行速度走到另一隊隊尾排隊（距離為 0.45 米 × 經過的人數）。</p><p>時間計到你上升降機為止，不含乘搭時間，並假設其他人仍按模型行為。</p>'}
};
const state={lang:A2Lang.get(),queue:0,ahead:40,speed:1.3,lastResult:null,busy:false};
const pack=()=>T[state.lang]||T.en;
const t=key=>{const v=pack()[key];return v===undefined?T.en[key]:v};

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
 $('dayText').textContent=pack().days[over?+$('ovDay').value:c.weekday];
 const gen=++profileGen;
 try{const p=await client.profile(nowInput());if(gen!==profileGen)return;
  $('period').innerHTML='';for(const label of p.period){const s=document.createElement('span');s.className='chip'+(['classEnd','lunch','dinner'].includes(label)?' hot':'');s.textContent=t('period')[label]||label;$('period').append(s)}
 }catch(e){$('error').textContent=e.message}
}

// ---------- Map overlay ----------
function el(name,attrs,parent){const n=document.createElementNS(SVGNS,name);for(const k in attrs)n.setAttribute(k,attrs[k]);if(parent)parent.append(n);return n}
const COLORS=['#095ccc','#007d89'];
function drawOverlay(){
 const svg=$('overlay');svg.innerHTML='';const pts=p=>p.map(v=>v.join(',')).join(' ');
 MAP.paths.forEach((path,i)=>{const sel=i===state.queue;el('polyline',{points:pts(path),fill:'none',stroke:COLORS[i],'stroke-width':sel?16:7,'stroke-opacity':sel?.45:.18,'stroke-linecap':'round','stroke-linejoin':'round'},svg)});
 const q=state.queue,path=MAP.paths[q],color=COLORS[q],len=MAP.lengths[q];
 for(let n=50;MAP.toDistance(n)<=len;n+=50){const [x,y]=MAP.position(path,MAP.toDistance(n));el('line',{x1:x,y1:y-12,x2:x,y2:y+12,stroke:color,'stroke-width':3},svg);const tx=el('text',{x,y:y-16,'font-size':17,'font-weight':700,fill:color,'text-anchor':'middle'},svg);tx.textContent=n}
 for(const lm of MAP.landmarks[q]){const [x,y]=MAP.position(path,lm.d),g=el('g',{style:'cursor:pointer'},svg);
  el('circle',{cx:x,cy:y,r:13,fill:'#fff',stroke:color,'stroke-width':5},g);
  if(lm.n>0){const tx=el('text',{x,y:y+38,'font-size':19,'font-weight':800,fill:color,'text-anchor':'middle',stroke:'#fff','stroke-width':5,'paint-order':'stroke'},g);tx.textContent='≈'+lm.n}
  const title=el('title',{},g);title.textContent=`${t(lm.key)} · ${t('approx')(lm.n)}`;
  g.addEventListener('click',ev=>{ev.stopPropagation();setAhead(lm.n,false)})}
 const d=MAP.toDistance(state.ahead),off=d>len,[x,y]=MAP.position(path,Math.min(d,len));
 el('circle',{cx:x,cy:y,r:26,fill:'#d93a3f','fill-opacity':.22},svg);el('circle',{cx:x,cy:y,r:14,fill:'#d93a3f',stroke:'#fff','stroke-width':5},svg);
 const label=el('text',{x,y:y-34,'font-size':28,'font-weight':800,fill:'#d93a3f','text-anchor':'middle',stroke:'#fff','stroke-width':7,'paint-order':'stroke'},svg);
 label.textContent=t('you')+(off?'>':'')+state.ahead;
 state.marker=[x,y];
}
function overlayPoint(ev){const svg=$('overlay'),r=svg.getBoundingClientRect();return [(ev.clientX-r.left)*MAP.VIEW.width/r.width,(ev.clientY-r.top)*MAP.VIEW.height/r.height]}
$('overlay').addEventListener('click',ev=>{
 const [x,y]=overlayPoint(ev);
 const best=MAP.paths.map((p,i)=>({i,...MAP.nearest(i,x,y)})).sort((a,b)=>a.d2-b.d2)[0];
 if(best.d2>120*120)return;
 if(best.i!==state.queue)setQueue(best.i,false);
 setAhead(MAP.toPeople(best.dist),false);
});

// ---------- Inputs ----------
function renderLandmarks(){
 const box=$('landmarks');box.innerHTML='';
 for(const lm of MAP.landmarks[state.queue]){const b=document.createElement('button');b.type='button';b.textContent=`${t(lm.key)} · ${t('approx')(lm.n)}`;b.setAttribute('aria-pressed',String(lm.n===state.ahead));b.onclick=()=>setAhead(lm.n);box.append(b)}
}
function aheadNote(){return state.ahead>MAP.capacity[state.queue]?t('offMap')(state.ahead):''}
// On narrow screens the map scrolls sideways: keep the user's marker in view.
function revealMarker(){const w=$('mapwrap');if(!state.marker||w.scrollWidth<=w.clientWidth)return;const x=state.marker[0]/MAP.VIEW.width*w.scrollWidth;w.scrollTo({left:Math.max(0,x-w.clientWidth/2),behavior:'smooth'})}
function setAhead(n,reveal=true){state.ahead=Math.max(0,Math.min(400,n|0));$('ahead').value=state.ahead;$('aheadOut').textContent=state.ahead;$('aheadNote').textContent=aheadNote();renderLandmarks();drawOverlay();if(reveal)revealMarker();markStale()}
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
 const box=$('result'),L=pack(),other=1-r.input.queue;box.hidden=false;box.style.opacity=1;
 const best=r.recommendation==='switch'?'switch':'stay';
 const gain=r.timeSaved,gainText=gain>=0?fmtTime(gain):fmtTime(-gain);
 box.innerHTML=`<div class="resultgrid"><div><p class="verdict ${r.recommendation}">${L.verdict[r.recommendation](L.qname[other])}</p>
 <p class="small">${L.faster(Math.round(r.pSwitchFaster*100))} ${Math.abs(gain)>=30?L.saved(gain>=0,gainText):''}</p>
 <div class="compare"><div class="${best==='stay'?'best':''}"><span>${L.stayLbl}</span><strong>${fmtTime(r.stay.median)}</strong><span class="small">${L.range(fmtTime(r.stay.p10),fmtTime(r.stay.p90))}</span></div>
 <div class="${best==='switch'?'best':''}"><span>${L.switchLbl}</span><strong>${fmtTime(r.switch.median)}</strong><span class="small">${L.range(fmtTime(r.switch.p10),fmtTime(r.switch.p90))} · ${L.walkIncl(Math.round(r.switch.walk.median))}</span></div></div>
 ${r.extrapolated?`<p class="warn">${L.extrap(r.ownTypicalMax)}</p>`:r.lowConfidence?`<p class="warn">${L.low}</p>`:''}
 </div><div>
 <p>${L.other(Math.round(r.otherQueue.median),Math.round(r.otherQueue.p05),Math.round(r.otherQueue.p95))}</p>
 <div class="small">${L.histTitle} (${L.people})</div>${histogramSVG(r.otherQueue.hist,other)}
 <p class="small">${L.basis(r.matches,r.used??r.matches,r.branches)}</p></div></div>`;
}
$('go').addEventListener('click',async()=>{
 if(state.busy)return;state.busy=true;$('go').disabled=true;$('go').textContent=t('working');$('error').textContent='';
 try{const r=await client.advise({now:nowInput(),queue:state.queue,ahead:state.ahead,speed:state.speed});state.lastResult=r;renderResult(r);$('result').scrollIntoView({behavior:'smooth',block:'nearest'})}
 catch(e){$('error').textContent=e.message}
 finally{state.busy=false;$('go').disabled=false;$('go').textContent=t('go')}
});

// ---------- Language ----------
function applyLang(){
 state.lang=A2Lang.get();
 document.documentElement.lang=A2Lang.htmlLang(state.lang);
 for(const n of document.querySelectorAll('[data-i18n]'))n.textContent=t(n.dataset.i18n);
 for(const n of document.querySelectorAll('[data-i18n-aria]'))n.setAttribute('aria-label',t(n.dataset.i18nAria));
 for(const n of document.querySelectorAll('[data-i18n-alt]'))n.alt=t(n.dataset.i18nAlt);
 document.title=t('title');
 const sel=$('ovDay'),v=sel.value;sel.innerHTML=pack().days.map((d,i)=>`<option value="${i}">${d}</option>`).join('');sel.value=v||'1';
 $('howText').innerHTML=t('how');$('aheadNote').textContent=aheadNote();
 renderLandmarks();drawOverlay();refreshClock();if(state.lastResult)renderResult(state.lastResult);
}
A2Lang.mount($('lang'),applyLang);

(async()=>{
 applyLang();
 setAhead(state.ahead);
 setInterval(()=>{if(!$('useOverride').checked)refreshClock()},30000);
})();
})();
