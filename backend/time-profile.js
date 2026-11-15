/* Time-of-day arrival profile and lift parameters for the passenger advisor.
 * Pure data in/out; no DOM. Times are Hong Kong local time, independent of the device.
 *
 * Calibrated to the team's field measurements (CCST9017 project slides, with later corrections).
 * The slides call the direct queue "Right" and the A1-stopping queue "Left"; here everything is
 * by lift type:
 *  - Round trips (timing diagram): direct 30 s dwell + 30 s travel each way = 120 s;
 *    via A1 4 x 30 s dwell + 4 x 20 s travel = 200 s. 4 cabins each.
 *  - A full cabin takes 15 people. The A1-stopping lift reaches A2 already holding people who
 *    rode up from A1 to keep a place, so only about 4-5 people board at A2.
 *  - Throughput: direct 4 x 15 / 120 s = 30 people/min; via A1 4 x 4 / 200 s = 4.8 people/min.
 *  - Arrivals: 25/min during teaching periods; meal periods add 5/min and class peaks add
 *    16/min, or 23/min during a meal-period class peak; about 80%
 *    choose the direct queue; the direct queue holds ~170 people at the dinner peak.
 * Lunch, dinner, weekend, evening and night levels and the class-end surge sizes are estimates
 * chosen so the simulated peaks match those observations. The academic page keeps its own defaults.
 */
(function(root){
'use strict';
// Advisor lift parameters (model units: people, seconds). The model draws each trip's
// capacity from max(1,C-4)..C with mean C-2, so C=17/6 gives 15 per direct trip and about 4
// per via-A1 trip at A2.
const LIFTS={lifts:4,cap:[17,6],cycle:[120,200],std:[12,20]};
const C1_BY_PERIOD={busy:4,ordinary:8,offpeak:15};
// Total arrivals in people/minute, split between the entries: Side A (west, direct-lift side)
// and Side B (east, via-A1 side). The split reproduces the measured ~80% direct share.
const SPLIT=[.75,.25];
const PROFILE={
 timeZone:'Asia/Hong_Kong',
 weekdayDay:{from:'08:30',to:'19:30',total:25},       // measured: ~25/min during lectures
 weekdayEvening:{from:'07:00',to:'23:00',total:12},   // estimate: weekday outside the teaching day
 weekend:{from:'08:00',to:'22:00',total:12},          // estimate: Saturday and Sunday
 night:{total:3},                                      // estimate: any remaining hours
 // Meal periods each add 5/min. During a meal-period class peak, the +23/min increase replaces
 // the ordinary +16/min class increase, giving a total peak of 53/min.
 meals:[{name:'lunch',from:'12:00',to:'14:00',add:5},{name:'dinner',from:'17:30',to:'19:30',add:5}],
 // Weekday class-ending peaks: classes end at :50, +16/min for 10 minutes. During lunch or
 // dinner, the class increase is +23/min instead of +16/min.
 classEnd:{minute:50,duration:10,firstHour:8,lastHour:18,add:16,mealAdd:23},
 // Simulation window around "now": warm-up before (covers the previous hour's surge), horizon after.
 warmup:3600,horizon:2400
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
 if(!weekend){const h=Math.floor(s/3600),start=h*3600+c.minute*60;if(h>=c.firstHour&&h<=c.lastHour&&s>=start&&s<start+c.duration*60){const mealActive=labels.includes('lunch')||labels.includes('dinner');total+=mealActive?c.mealAdd:c.add;labels.push('classEnd')}}
 return {rate:split(total),total,labels};
}
function c1MeanAtClock(weekday,seconds){
 const r=rateAtClock(weekday,seconds);
 if(r.labels.includes('lunch')||r.labels.includes('dinner')||r.labels.includes('classEnd'))return C1_BY_PERIOD.busy;
 if(r.labels.includes('teaching'))return C1_BY_PERIOD.ordinary;
 return C1_BY_PERIOD.offpeak;
}
function liftCapsAtClock(weekday,seconds){return [LIFTS.cap[0],c1MeanAtClock(weekday,seconds)+2]}
// Advisor parameter fragment: simulation time 0 = now - warmup; `nowAt` = warmup.
// Piecewise-constant rates become per-entry pulses (rate=[0,0], pulses carry addBy in people/second).
function paramsAround(now){
 const {weekday,seconds}=normalizeNow(now),start=seconds-PROFILE.warmup,duration=PROFILE.warmup+PROFILE.horizon,pulses=[];
 const clock=t=>{const abs=start+t,dayShift=Math.floor(abs/86400);return rateAtClock(weekday+dayShift,abs-dayShift*86400).rate};
 let segStart=0,current=clock(0);
 for(let t=60-(((start%60)+60)%60);t<duration;t+=60){const r=clock(t);if(r[0]!==current[0]||r[1]!==current[1]){pulses.push({start:segStart,end:t,add:(current[0]+current[1])/120,addBy:[current[0]/60,current[1]/60]});segStart=t;current=r}}
 pulses.push({start:segStart,end:duration,add:(current[0]+current[1])/120,addBy:[current[0]/60,current[1]/60]});
 return {rate:[0,0],pulses,duration,nowAt:PROFILE.warmup,clock:{weekday,seconds},current:rateAtClock(weekday,seconds),capacity:liftCapsAtClock(weekday,seconds),c1:c1MeanAtClock(weekday,seconds)};
}
const api={PROFILE,LIFTS,C1_BY_PERIOD,SPLIT,hkParts,normalizeNow,rateAtClock,c1MeanAtClock,liftCapsAtClock,paramsAround};root.TimeProfile=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
