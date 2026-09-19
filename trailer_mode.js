(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MCETrailer = api;
  if (root.document) {
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", api.mount);
    else api.mount();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var ROUTE = [
    {page:"city_map.html",eyebrow:"WELCOME TO MUSIC CITY ESTATES",title:"A city built for artists.",note:"Choose your district. Build your career."},
    {page:"bedroom_studio.html",eyebrow:"CHAPTER ONE — THE BEGINNING",title:"Every superstar starts somewhere.",note:"Create your first record from the Bedroom Studio."},
    {page:"record_music.html?studio=bedroom",eyebrow:"CREATE",title:"Turn an idea into a record.",note:"Choose a beat, write, record and develop your sound."},
    {page:"hip_hop_heights.html",eyebrow:"EXPLORE",title:"Your career lives in the city.",note:"Walk Hip-Hop Heights and enter its studios and venues."},
    {page:"begenius_studio.html",eyebrow:"DEVELOP",title:"Step inside BeGenius Studio.",note:"Study the plaques. Enter the booth. Level up your craft."},
    {page:"battle_room.html",eyebrow:"COMPETE",title:"Earn the crowd at Word Slaughter.",note:"Deliver bars, switch flows and build your fanbase."},
    {page:"music_city_radio.html",eyebrow:"GROW",title:"Take your sound citywide.",note:"Build toward management, radio submission and airplay."}
  ];
  function params(search){return new URLSearchParams(search||"");}
  function isActive(search){return params(search).get("trailer")==="1";}
  function buildUrl(index){
    if(index>=ROUTE.length)return "trailer_director.html?finale=1";
    if(index<0)return "trailer_director.html";
    return ROUTE[index].page+(ROUTE[index].page.indexOf("?")>=0?"&":"?")+"trailer=1&shot="+index;
  }
  function currentShot(search,pathname){
    var requested=Number(params(search).get("shot"));
    if(Number.isInteger(requested)&&requested>=0&&requested<ROUTE.length)return requested;
    var file=String(pathname||"").split("/").pop()||"city_map.html";
    return ROUTE.findIndex(function(scene){return scene.page.split("?")[0]===file;});
  }
  function make(tag,className,text){var el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el;}
  function mount(){
    if(!isActive(location.search)||document.getElementById("mceTrailerHud"))return;
    var shot=currentShot(location.search,location.pathname);if(shot<0)return;var scene=ROUTE[shot];
    var style=document.createElement("style");
    style.textContent=".mce-trailer-hud{position:fixed;z-index:2147483000;left:18px;right:18px;bottom:18px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;pointer-events:none;font-family:Arial,sans-serif}.mce-trailer-card{max-width:min(640px,72vw);padding:15px 18px;border-left:3px solid #42d8ff;background:linear-gradient(90deg,rgba(1,7,18,.96),rgba(1,7,18,.72));box-shadow:0 12px 40px #000b;backdrop-filter:blur(10px);color:#fff}.mce-trailer-eye{font-size:10px;letter-spacing:.2em;font-weight:900;color:#68e2ff}.mce-trailer-title{margin:4px 0;font-size:clamp(20px,3vw,34px);line-height:1.05;font-weight:900}.mce-trailer-note{font-size:12px;color:#c8d8e8}.mce-trailer-nav{display:flex;gap:7px;pointer-events:auto}.mce-trailer-nav a,.mce-trailer-nav button,.mce-trailer-open{border:1px solid #42d8ff;border-radius:9px;background:#03101eea;color:#fff;text-decoration:none;padding:10px 12px;font-size:11px;font-weight:900;cursor:pointer;box-shadow:0 0 18px #1bbbe83b}.mce-trailer-nav .next{background:#19bde8;color:#00131b}.mce-trailer-open{display:none;position:fixed;z-index:2147483000;right:14px;bottom:14px;pointer-events:auto}body.mce-trailer-hidden .mce-trailer-hud{display:none}body.mce-trailer-hidden .mce-trailer-open{display:block}@media(max-width:720px){.mce-trailer-hud{left:8px;right:8px;bottom:8px;display:block}.mce-trailer-card{max-width:100%;padding:10px 12px}.mce-trailer-title{font-size:19px}.mce-trailer-note{display:none}.mce-trailer-nav{margin-top:7px;justify-content:flex-end}.mce-trailer-nav a,.mce-trailer-nav button{padding:8px 9px;font-size:9px}}";
    document.head.appendChild(style);
    var hud=make("aside","mce-trailer-hud");hud.id="mceTrailerHud";hud.setAttribute("aria-label","Trailer director controls");
    var card=make("div","mce-trailer-card");card.appendChild(make("div","mce-trailer-eye",scene.eyebrow));card.appendChild(make("div","mce-trailer-title",scene.title));card.appendChild(make("div","mce-trailer-note",scene.note));hud.appendChild(card);
    var nav=make("div","mce-trailer-nav"),previous=make("a","previous","← PREV");previous.href=buildUrl(shot-1);nav.appendChild(previous);
    var hide=make("button","hide","HIDE HUD");hide.type="button";hide.addEventListener("click",function(){document.body.classList.add("mce-trailer-hidden");});nav.appendChild(hide);
    var next=make("a","next",shot===ROUTE.length-1?"FINALE →":"NEXT SHOT →");next.href=buildUrl(shot+1);nav.appendChild(next);hud.appendChild(nav);
    var reopen=make("button","mce-trailer-open","🎬 SHOW HUD");reopen.type="button";reopen.addEventListener("click",function(){document.body.classList.remove("mce-trailer-hidden");});
    document.body.appendChild(hud);document.body.appendChild(reopen);
  }
  return {ROUTE:ROUTE,isActive:isActive,buildUrl:buildUrl,currentShot:currentShot,mount:mount};
});
