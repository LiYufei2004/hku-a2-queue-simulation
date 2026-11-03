/* Presentation data for the passenger page's campus map (assets/campus-map.svg).
 * No model formulas here: the map only turns a tap or landmark into "people ahead".
 * Queue 0 (left, direct) leaves the A2 lift tower and runs WEST along University Street;
 * queue 1 (right, via A1) runs EAST. Coordinates are in the SVG's 2400x1000 viewBox.
 *
 * Calibration: PX_PER_PERSON sets how many people fit along the drawn street. The map is
 * not to scale, so landmark counts are estimates (shown with "≈"). Measure real counts
 * at a few landmarks and adjust PX_PER_PERSON, or give a landmark an explicit `n`.
 */
(function(root){
'use strict';
const VIEW={width:2400,height:1000};
const PX_PER_PERSON=3.5;
const paths=[
 [[938,515],[938,462],[50,462]],      // left / direct: up out of the tower, then west
 [[1012,515],[1012,482],[2370,482]]   // right / via A1: up out of the tower, then east
];
// Landmarks sit on the path at street x-position `x` (or at the lift door when x is null).
const landmarks=[
 [{key:'lmDoor',x:null},{key:'lmStreet',x:938},{key:'lmHWmid',x:850},{key:'lmBridgeE',x:690},{key:'lmBridgeMid',x:515},{key:'lmBridgeW',x:340},{key:'lmLibrary',x:180}],
 [{key:'lmDoor',x:null},{key:'lmStreet',x:1012},{key:'lmHWeast',x:1180},{key:'lmSKYLee',x:1295},{key:'lmComposite',x:1480},{key:'lmCYC',x:1715},{key:'lmCYCpast',x:1870},{key:'lmJCT',x:2130}]
];
function segLen(a,b){return Math.hypot(b[0]-a[0],b[1]-a[1])}
const lengths=paths.map(p=>p.slice(1).reduce((s,b,k)=>s+segLen(p[k],b),0));
function position(path,d){d=Math.max(0,d);for(let k=1;k<path.length;k++){const a=path[k-1],b=path[k],len=segLen(a,b);if(d<=len)return[a[0]+(b[0]-a[0])*d/len,a[1]+(b[1]-a[1])*d/len];d-=len}return path.at(-1)}
// Distance along the path where it reaches street x-position x (on the last, horizontal leg).
function distanceAtX(i,x){const p=paths[i],head=p.slice(1,-1).reduce((s,b,k)=>s+segLen(p[k],b),0),turn=p[p.length-2];return head+Math.abs(x-turn[0])}
function nearest(i,x,y){const p=paths[i];let best={d2:Infinity,dist:0},acc=0;for(let k=1;k<p.length;k++){const a=p[k-1],b=p[k],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),u=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(len*len))),px=a[0]+u*dx,py=a[1]+u*dy,d2=(x-px)**2+(y-py)**2;if(d2<best.d2)best={d2,dist:acc+u*len};acc+=len}return best}
const toPeople=d=>Math.round(d/PX_PER_PERSON),toDistance=n=>n*PX_PER_PERSON;
const resolved=landmarks.map((list,i)=>list.map(l=>{const d=l.x==null?0:distanceAtX(i,l.x);return {key:l.key,n:l.n??toPeople(d),d:l.n!=null?toDistance(l.n):d}}));
const capacity=lengths.map(toPeople);
root.CampusMap=Object.freeze({VIEW,PX_PER_PERSON,paths,lengths,capacity,landmarks:resolved,position,nearest,toPeople,toDistance});
})(globalThis);
