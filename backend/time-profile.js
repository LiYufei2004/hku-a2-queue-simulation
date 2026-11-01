/* Time-of-day arrival profile for the passenger advisor. Pure data in/out; no DOM.
 * All rates below are ILLUSTRATIVE assumptions (people/minute at each entry) until
 * calibrated with field counts. Edit PROFILE to recalibrate; nothing else needs to change.
 * Times are Hong Kong local time, independent of the viewer's device time zone.
 */
(function(root){
'use strict';
const PROFILE={
 timeZone:'Asia/Hong_Kong',
 // [Side A (west, University Street / Library / Kadoorie), Side B (east, Chow Yei Ching)]
 weekdayDay:{from:'08:30',to:'19:30',rate:[35,25]},
 weekdayEvening:{from:'07:00',to:'23:00',rate:[12,8]},   // weekday hours outside the teaching day
 weekend:{from:'08:00',to:'22:00',rate:[12,8]},          // Saturday and Sunday
 night:{rate:[3,2]},                                      // any remaining hours
 meals:[{name:'lunch',from:'12:00',to:'14:00',add:[15,10]},{name:'dinner',from:'17:30',to:'19:30',add:[15,10]}],
 // Weekday class-ending peaks: classes end at :50, extra arrivals for 10 minutes.
 classEnd:{minute:50,duration:10,firstHour:8,lastHour:18,add:[40,30]},
 // Simulation window around "now": warm-up before, horizon after (seconds).
 warmup:900,horizon:2400
};
const WEEKDAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const toSec=s=>{const [h,m]=s.split(':').map(Number);return h*3600+m*60};
// Hong Kong wall-clock parts for an epoch time (ms): {weekday 0=Sun..6, seconds since midnight}.
function hkParts(epochMs){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:PROFILE.timeZone,weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(epochMs));
 const get=type=>parts.find(x=>x.type===type).value;
 return {weekday:WEEKDAYS.indexOf(get('weekday')),seconds:(+get('hour'))*3600+(+get('minute'))*60+(+get('second'))};
}
function normalizeNow(now){
 if(typeof now==='number')return hkParts(now);
 if(now&&Number.isInteger(now.weekday)&&now.weekday>=0&&now.weekday<=6&&Number.isFinite(now.seconds)&&now.seconds>=0&&now.seconds<86400)return {weekday:now.weekday,seconds:now.seconds};
 throw Error('Invalid current time.');
}
const inside=(s,from,to)=>s>=toSec(from)&&s<toSec(to);
// Per-entry rate (people/minute) and active labels at weekday/seconds-of-day.
function rateAtClock(weekday,seconds){
 const day=((weekday%7)+7)%7,s=((seconds%86400)+86400)%86400,weekend=day===0||day===6,labels=[];
 let base;
 if(weekend)base=inside(s,PROFILE.weekend.from,PROFILE.weekend.to)?PROFILE.weekend.rate:PROFILE.night.rate;
 else if(inside(s,PROFILE.weekdayDay.from,PROFILE.weekdayDay.to))base=PROFILE.weekdayDay.rate;
 else base=inside(s,PROFILE.weekdayEvening.from,PROFILE.weekdayEvening.to)?PROFILE.weekdayEvening.rate:PROFILE.night.rate;
 const rate=[...base];
 labels.push(weekend?'weekend':base===PROFILE.weekdayDay.rate?'teaching':base===PROFILE.night.rate?'night':'offpeak');
 for(const meal of PROFILE.meals)if(inside(s,meal.from,meal.to)){rate[0]+=meal.add[0];rate[1]+=meal.add[1];labels.push(meal.name)}
 const c=PROFILE.classEnd;
 if(!weekend){const h=Math.floor(s/3600),start=h*3600+c.minute*60;if(h>=c.firstHour&&h<=c.lastHour&&s>=start&&s<start+c.duration*60){rate[0]+=c.add[0];rate[1]+=c.add[1];labels.push('classEnd')}}
 return {rate,labels};
}
// Advisor parameter fragment: simulation time 0 = now - warmup; `nowAt` = warmup.
// Piecewise-constant rates become per-entry pulses (rate=[0,0], pulses carry addBy in people/second).
function paramsAround(now){
 const {weekday,seconds}=normalizeNow(now),start=seconds-PROFILE.warmup,duration=PROFILE.warmup+PROFILE.horizon,pulses=[];
 const clock=t=>{const abs=start+t,dayShift=Math.floor(abs/86400);return rateAtClock(weekday+dayShift,abs-dayShift*86400).rate};
 let segStart=0,current=clock(0);
 for(let t=60-(((start%60)+60)%60);t<duration;t+=60){const r=clock(t);if(r[0]!==current[0]||r[1]!==current[1]){pulses.push({start:segStart,end:t,add:(current[0]+current[1])/120,addBy:[current[0]/60,current[1]/60]});segStart=t;current=r}}
 pulses.push({start:segStart,end:duration,add:(current[0]+current[1])/120,addBy:[current[0]/60,current[1]/60]});
 return {rate:[0,0],pulses,duration,nowAt:PROFILE.warmup,clock:{weekday,seconds},current:rateAtClock(weekday,seconds)};
}
const api={PROFILE,hkParts,normalizeNow,rateAtClock,paramsAround};root.TimeProfile=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
