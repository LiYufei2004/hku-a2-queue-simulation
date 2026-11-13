/* Presentation-only interpolation. The backend supplies the corridor layout. */
(function(root){
'use strict';
function position(path,d){d=Math.max(0,d);for(let k=1;k<path.length;k++){const a=path[k-1],b=path[k],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<=len)return[a[0]+(b[0]-a[0])*d/len,a[1]+(b[1]-a[1])*d/len];d-=len}return path.at(-1)}
function tailDistance(layout,i,n){return Math.min(Math.max(0,n-1)*layout.personSpacingPixels,layout.lengths[i])}
root.MapGeometry=Object.freeze({position,tailDistance});
})(globalThis);
