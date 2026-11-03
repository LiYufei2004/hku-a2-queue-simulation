/* Time-of-day arrival profile and lift parameters for the passenger advisor.
 * Pure data in/out; no DOM. Times are Hong Kong local time, independent of the device.
 *
 * Calibrated to the team's field measurements (CCST9017 project slides). Those slides call the
 * direct queue "Right" and the A1-stopping queue "Left"; here everything is by lift type:
 *  - Direct lifts: 24 people per trip, 120 s round trip, 4 cabins  -> 48 people/min.
 *  - Via-A1 lifts: 12 people per trip (some ride up from A1 to hold a place), 200 s, 4 cabins
 *    -> 14.4 people/min.
 *  - Arrivals: ~50/min at peak (18:00-18:45; 50-55 in extreme cases), ~25/min during lectures
 *    (14:00); about 80% choose the direct queue. Observed direct queue ~170 people at peak.
 * Lunch, weekend, evening and night rates and the class-end surge size are estimates chosen so
 * the simulated peaks match the observed queue lengths. The academic page keeps its own defaults.
 */
(function(root){
'use strict';
// Advisor lift parameters (model units: people, seconds). The model draws each trip's
// capacity from max(1,C-4)..C with mean C-2, so C=26/14 gives the measured 24/12 per trip.
const LIFTS={lifts:4,cap:[26,14],cycle:[120,200],std:[12,20]};
// Total arrivals in people/minute, split between the entries: Side A (west, direct-lift side)
// and Side B (east, via-A1 side). The split reproduces the measured ~80% direct share.
const SPLIT=[.75,.25];
const PROFILE={
 timeZone:'Asia/Hong_Kong',
 weekdayDay:{from:'08:30',to:'19:30',total:25},       // measured: ~25/min during lectures
 weekdayEvening:{from:'07:00',to:'23:00',total:12},   // estimate: weekday outside the teaching day
 weekend:{from:'08:00',to:'22:00',total:12},          // estimate: Saturday and Sunday
 night:{total:3},                                      // estimate: any remaining hours
 // Meal periods raise the level: lunch to 40/min (estimate), dinner to 50/min (measured peak).
 meals:[{name:'lunch',from:'12:00',to:'14:00',add:15},{name:'dinner',from:'17:30',to:'19:30',add:25}],
 // Weekday class-ending peaks: classes end at :50, +40/min for 10 minutes. Sized so dinner
 // peaks reach the observed ~170-250-person direct queue and clear within ~20 minutes.
 classEnd:{minute:50,duration:10,firstHour:8,lastHour:18,add:40},
 // Simulation window around "now": warm-up before (covers the previous :50 surge), horizon after.
 warmup:1800,horizon:2400
};
const split=total=>SPLIT.map(f=>total*f);
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
 if(weekend)base=inside(s,PROFILE.weekend.from,PROFILE.weekend.to)?PROFILE.weekend:PROFILE.night;
 else if(inside(s,PROFILE.weekdayDay.from,PROFILE.weekdayDay.to))base=PROFILE.weekdayDay;
 else base=inside(s,PROFILE.weekdayEvening.from,PROFILE.weekdayEvening.to)?PROFILE.weekdayEvening:PROFILE.night;
 let total=base.total;
 labels.push(weekend?'weekend':base===PROFILE.weekdayDay?'teaching':base===PROFILE.night?'night':'offpeak');
 for(const meal of PROFILE.meals)if(inside(s,meal.from,meal.to)){total+=meal.add;labels.push(meal.name)}
 const c=PROFILE.classEnd;
 if(!weekend){const h=Math.floor(s/3600),start=h*3600+c.minute*60;if(h>=c.firstHour&&h<=c.lastHour&&s>=start&&s<start+c.duration*60){total+=c.add;labels.push('classEnd')}}
 return {rate:split(total),total,labels};
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
const api={PROFILE,LIFTS,SPLIT,hkParts,normalizeNow,rateAtClock,paramsAround};root.TimeProfile=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
