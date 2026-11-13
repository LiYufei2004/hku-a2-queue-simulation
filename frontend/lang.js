/* Shared language for the academic page and the passenger advisor. */
(function(root){
'use strict';
const KEY='a2-lang', LEGACY='a2-advisor-lang';
function normalize(v){
 if(v==='en') return 'en';
 if(v==='zh'||v==='zh-Hans'||v==='zh-CN') return 'zh-Hans';
 if(v==='zh-Hant'||v==='zh-HK'||v==='zh-TW') return 'zh-Hant';
 return null;
}
function get(){
 try{return normalize(localStorage.getItem(KEY))||normalize(localStorage.getItem(LEGACY))||'en'}
 catch(e){return 'en'}
}
function set(lang){
 const v=normalize(lang)||'en';
 try{
  localStorage.setItem(KEY,v);
  localStorage.setItem(LEGACY,v==='zh-Hans'?'zh':v);
 }catch(e){}
 return v;
}
function htmlLang(lang){return lang==='zh-Hans'?'zh-Hans':lang==='zh-Hant'?'zh-Hant':'en'}
function mount(select, onChange){
 if(!select) return;
 let shown=get();
 select.value=shown;
 const apply=()=>{const v=get(); if(select.value!==v) select.value=v; if(v===shown) return; shown=v; onChange(v)};
 select.addEventListener('change',()=>{shown=set(select.value); select.value=shown; onChange(shown)});
 window.addEventListener('storage', e=>{if(e.key===KEY||e.key===LEGACY) apply()});
 window.addEventListener('pageshow', apply);
}
root.A2Lang={get,set,htmlLang,mount};
})(globalThis);
