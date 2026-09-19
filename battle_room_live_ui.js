(function(){
"use strict";
var overlay=document.getElementById("liveBattleOverlay");
var openMain=document.getElementById("openLiveBattle");
var openCircle=document.getElementById("openLiveBattleFromCircle");
var close=document.getElementById("closeLiveBattle");
var soloModal=document.getElementById("battlePanel");

function openOverlay(){
  if(!overlay)return;
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden","false");
  if(soloModal)soloModal.classList.remove("show");
}
function closeOverlay(){
  if(!overlay || overlay.classList.contains("battle-running"))return;
  overlay.classList.remove("show","voting");
  overlay.setAttribute("aria-hidden","true");
}
if(openMain)openMain.addEventListener("click",openOverlay);
if(openCircle)openCircle.addEventListener("click",openOverlay);
if(close)close.addEventListener("click",closeOverlay);

window.addEventListener("mce-live-arena-ui",function(event){
  if(!overlay)return;
  var phase=event.detail&&event.detail.phase;
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden","false");
  if(phase==="battle"){
    overlay.classList.add("battle-running");
    overlay.classList.remove("voting");
  }else if(phase==="voting"){
    overlay.classList.add("battle-running","voting");
  }else if(phase==="done"){
    overlay.classList.remove("battle-running","voting");
  }
});

var params=new URLSearchParams(window.location.search);
if(params.get("room")){
  openOverlay();
}
})();