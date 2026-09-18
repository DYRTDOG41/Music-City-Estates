import {createRoom,buildAvatar} from './mce_3d_room.js';
import {sponsorCatalog} from './sponsor_catalog.js';

let state=window.MCE?window.MCE.load():{
  fans:Number(localStorage.getItem('mceFans'))||0,
  cash:Number(localStorage.getItem('mceCash'))||500,
  xp:Number(localStorage.getItem('mceXP'))||0
};
const updateStats=()=>{
  document.getElementById('fans').textContent=state.fans;
  document.getElementById('cash').textContent=state.cash;
  document.getElementById('xp').textContent=state.xp;
};
updateStats();

const room=createRoom({spawn:[0,1.7,11.4],background:0x020405,fog:0x06101a,fogDensity:.012,sky:0x426a84});
const {THREE,scene}=room;

function texture(draw,size=512){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const context=canvas.getContext('2d');draw(context,size);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;return map;
}
const concrete=texture((c,s)=>{
  c.fillStyle='#15191c';c.fillRect(0,0,s,s);
  for(let i=0;i<1500;i++){const n=28+Math.floor(Math.random()*32);c.fillStyle=`rgba(${n},${n+2},${n+5},${Math.random()*.2})`;c.fillRect(Math.random()*s,Math.random()*s,Math.random()*4+1,Math.random()*4+1)}
  c.strokeStyle='#090b0d';c.lineWidth=4;for(let p=0;p<s;p+=128){c.beginPath();c.moveTo(p,0);c.lineTo(p,s);c.stroke();c.beginPath();c.moveTo(0,p);c.lineTo(s,p);c.stroke()}
});
concrete.repeat.set(4,4);
const corrugated=texture((c,s)=>{
  c.fillStyle='#20262a';c.fillRect(0,0,s,s);
  for(let x=0;x<s;x+=24){c.fillStyle=x%48?'#2d3439':'#171c20';c.fillRect(x,0,12,s)}
  for(let i=0;i<90;i++){c.fillStyle='#ad583116';c.fillRect(Math.random()*s,Math.random()*s,Math.random()*35+5,Math.random()*10+2)}
});
corrugated.repeat.set(5,2);
const concreteMaterial=new THREE.MeshStandardMaterial({map:concrete,color:0x73787b,roughness:.88,metalness:.08});
const metalWallMaterial=new THREE.MeshStandardMaterial({map:corrugated,color:0x65727a,roughness:.72,metalness:.35});

room.wallBounds(36,29,8);
scene.getObjectByName('floor').material=concreteMaterial;
for(const name of ['back wall','left wall','right wall','front-left','front-right'])scene.getObjectByName(name).material=metalWallMaterial;
for(const x of [-17,-11,11,17])room.box('steel column',[.48,7.7,.48],[x,3.85,-1],0x191d21,{metalness:.88,roughness:.3});
for(let z=-12;z<=12;z+=4)room.box('roof beam',[35,.2,.2],[0,7.25,z],0x343b40,{metalness:.92,roughness:.25});

// Retail lighting and branded back wall.
const key=room.light(0x36aaff,20,[-10,4,-5],20);key.shadow.mapSize.set(512,512);
const magenta=room.light(0xff315b,15,[10,4,-6],19);magenta.castShadow=false;
for(const x of [-14,-7,0,7,14]){
  const spot=new THREE.SpotLight(0xffffff,35,16,.36,.55,1.7);spot.position.set(x,6.7,-4);spot.target.position.set(x,0,-8);scene.add(spot,spot.target);
  room.cylinder('retail lamp',.28,.32,[x,6.75,-4],0x111418,{metalness:.9});
}
room.label('MERCH & BACKSTAGE',[0,6.15,-14.22],'#eaf8ff',[12,1.6]);
room.label('SUPPORT REAL ARTISTS • SHOP THE CULTURE',[0,5.05,-14.2],'#52baff',[10,.68]);
room.label('CLICK-READY PRODUCT WALL',[0,3.95,-14.15],'#ff668c',[7,.62]);

// Product pedestals and simple 3D representations of each catalog item.
const positions=[-12,-4,4,12];
function addProductModel(item,x){
  room.box('product pedestal',[5,.5,3.3],[x,.25,-8.7],0x10151a,{collider:true,metalness:.5,roughness:.4});
  room.box('pedestal light',[4.5,.08,.12],[x,.56,-7.08],item.color,{metalness:.4});
  room.label(item.price,[x,1.12,-7.05],'#ffe17c',[2.4,.48]);
  if(item.id==='battle-cap'){
    const cap=room.cylinder('battle cap',.85,.45,[x,2,-8.7],item.color,{roughness:.72});
    cap.scale.z=.72;room.box('cap brim',[1.15,.1,.75],[x,1.83,-8.15],item.color,{roughness:.72});
  }else if(item.id==='creator-headphones'){
    const band=new THREE.Mesh(new THREE.TorusGeometry(.78,.13,12,32,Math.PI),room.material(item.color,.45,.45));band.position.set(x,2.25,-8.7);scene.add(band);
    for(const side of [-1,1])room.box('ear cup',[.3,.72,.45],[x+side*.78,1.93,-8.7],item.color,{metalness:.5,roughness:.4});
  }else{
    const shirt=room.box('display shirt',[1.7,item.id==='warehouse-hoodie'?2.25:1.85,.38],[x,2,-8.7],item.color,{roughness:.78});
    const sleeveY=item.id==='warehouse-hoodie'?2.25:2.15;
    for(const side of [-1,1]){const sleeve=room.box('shirt sleeve',[.65,.7,.36],[x+side*1.05,sleeveY,-8.7],item.color,{roughness:.78});sleeve.rotation.z=side*.35}
    if(item.id==='warehouse-hoodie'){
      const hood=new THREE.Mesh(new THREE.TorusGeometry(.56,.2,10,24,Math.PI),room.material(item.color,.8,.03));hood.position.set(x,3.22,-8.69);scene.add(hood);
    }
    room.label('♛',[x,2,-8.46],item.id==='warehouse-hoodie'?'#ff315b':'#17171b',[.85,.8]);
  }
  room.label(item.name.toUpperCase(),[x,3.8,-8.6],item.sponsored?'#7ad6ff':'#ffffff',[4,.62]);
  room.interact('VIEW '+item.name.toUpperCase(),[x,1.7,-5.9],()=>showProduct(item),2.7,item.sponsored?0x52baff:0xff315b);
}
sponsorCatalog.forEach((item,index)=>addProductModel(item,positions[index]));

// Checkout and sponsorship wall.
room.box('checkout counter',[7,1.2,1.6],[-12,.6,1.6],0x172027,{collider:true,metalness:.38,roughness:.52});
room.label('MERCH CHECKOUT',[-12,1.55,.72],'#52baff',[4,.65]);
const clerk=buildAvatar(room,{skin:'#72452e',hairStyle:'afro',hairColor:'#111015',shirtColor:'#2474a8',pantsColor:'#14191e'},[-12,0,3],.84);clerk.rotation.y=Math.PI;
room.box('sponsor screen',[7.5,4,.24],[11.5,3.1,1.8],0x111920,{collider:true,metalness:.55,roughness:.3});
room.label('SPONSOR WALL',[11.5,4.15,1.65],'#52baff',[5,.8]);
room.label('BRAND PLACEMENTS\nCAN LINK TO REAL STORES',[11.5,3,1.64],'#ffffff',[5.7,1.25]);
room.interact('VIEW SPONSOR SYSTEM',[11.5,1.7,4.15],showSponsorSystem,2.8,0x52baff);

// Backstage prep zone with wardrobe, road cases, mirrors, and check-in desk.
room.box('backstage divider',[.25,5.5,10],[0,2.75,5.7],0x20262b,{collider:true,metalness:.5});
room.label('MERCH SHOP',[-7.5,4.6,5.65],'#52baff',[4,.72]);
room.label('BACKSTAGE',[7.5,4.6,5.65],'#ff668c',[4,.72]);
for(const x of [4.2,8,11.8]){
  room.box('road case',[2.7,1.4,1.5],[x,.7,7.4],0x15191d,{collider:true,metalness:.62,roughness:.35});
  room.box('case trim',[2.8,.08,.08],[x,1.2,6.62],0x8b9298,{metalness:.95});
}
room.box('wardrobe rack',[.16,2.8,.16],[15,1.4,6.5],0x7d858a,{metalness:.95});
room.box('wardrobe bar',[.16,.16,5.2],[15,2.8,9],0x7d858a,{metalness:.95});
for(let z=7;z<=11;z+=1){room.box('hanging outfit',[1.4,1.7,.12],[14.95,1.95,z],[0x5b2337,0x1d4165,0x3f3f42,0x6a3426,0x251c50][Math.floor(z)%5],{roughness:.86})}
room.box('check in desk',[6,1.2,1.6],[5.2,.6,11.1],0x251820,{collider:true,metalness:.22,roughness:.7});
room.label('BATTLE CHECK-IN',[5.2,1.55,10.22],'#ff668c',[4,.66]);
room.interact('CHECK IN FOR BATTLE',[5.2,1.7,8.9],()=>document.getElementById('checkinPanel').classList.add('show'),2.6,0xff315b);

// Connections to every current Warehouse room.
room.interact('ENTER BATTLE STAGE',[13,1.7,12.7],()=>location.href='battle_room.html',2.5,0xff315b);
room.interact('ENTER COMMUNITY ROOM',[0,1.7,12.7],()=>location.href='warehouse_hangout_viewer.html',2.5,0xffc34d);
room.interact('RETURN TO WAREHOUSE',[-13,1.7,12.7],()=>location.href='warehouse.html',2.5,0x52baff);
room.label('BATTLE STAGE',[13,3,14.25],'#ff315b',[3.5,.62]);
room.label('COMMUNITY',[0,3,14.25],'#ffc34d',[3.2,.62]);
room.label('WAREHOUSE',[-13,3,14.25],'#52baff',[3.3,.62]);

const panel=document.getElementById('productPanel'),name=document.getElementById('productName'),icon=document.getElementById('productIcon'),brand=document.getElementById('productBrand'),category=document.getElementById('productCategory'),price=document.getElementById('productPrice'),description=document.getElementById('productDescription'),disclosure=document.getElementById('productDisclosure'),notice=document.getElementById('productNotice'),shop=document.getElementById('shopProduct');
let selectedProduct=null;
function validShopUrl(value){
  if(!value)return false;
  try{return new URL(value).protocol==='https:'}catch(error){return false}
}
function showProduct(item){
  selectedProduct=item;name.textContent=item.name;icon.textContent=item.icon;brand.textContent=item.brand;category.textContent=item.category;price.textContent=item.price;description.textContent=item.description;notice.textContent='';
  const linked=validShopUrl(item.purchaseUrl);
  disclosure.textContent=item.sponsored?(linked?'Sponsored product placement. The purchase opens the sponsor’s verified website.':'Future sponsor placement — no sponsor or purchase link is active yet.'):(linked?'Official Music City Estates merchandise. Purchase opens the connected store.':'Product preview — a store link can be added later without rebuilding this room.');
  shop.disabled=!linked;shop.textContent=linked?'SHOP PRODUCT':'PURCHASE LINK NOT CONNECTED';panel.classList.add('show');
}
function showSponsorSystem(){
  showProduct({id:'sponsor-system',name:'Click-Ready Sponsor Placement',icon:'🏪',brand:'Future Brand Partner',category:'Sponsorship System',price:'Optional real-world purchase link',description:'Any display in this room can remain decorative, open an in-game product card, or connect to a verified sponsor, affiliate, or official merchandise page.',purchaseUrl:'',sponsored:true});
}
function recordClick(item){
  let clicks=[];try{clicks=JSON.parse(localStorage.getItem('mceSponsorClicks')||'[]')}catch(error){}
  clicks.push({productId:item.id,brand:item.brand,clickedAt:new Date().toISOString()});
  localStorage.setItem('mceSponsorClicks',JSON.stringify(clicks.slice(-100)));
}
shop.onclick=()=>{
  if(!selectedProduct||!validShopUrl(selectedProduct.purchaseUrl))return;
  recordClick(selectedProduct);notice.textContent='Opening the verified product page…';
  const destination=window.open(selectedProduct.purchaseUrl,'_blank','noopener,noreferrer');if(destination)destination.opener=null;
};
document.getElementById('closeProduct').onclick=()=>panel.classList.remove('show');

const checkin=localStorage.getItem('mceBackstageCheckin')==='ready',checkinButton=document.getElementById('checkinArtist'),checkinNotice=document.getElementById('checkinNotice');
if(checkin){checkinButton.textContent='ARTIST CHECKED IN';checkinButton.disabled=true;checkinNotice.textContent='✓ Your artist is ready for stage call.'}
checkinButton.onclick=()=>{
  if(localStorage.getItem('mceBackstageCheckin')==='ready')return;
  localStorage.setItem('mceBackstageCheckin','ready');
  state=window.MCE?window.MCE.add({xp:2}):Object.assign({},state,{xp:state.xp+2});
  if(!window.MCE)localStorage.setItem('mceXP',state.xp);
  updateStats();checkinNotice.textContent='✓ Checked in • +2 XP';checkinButton.textContent='ARTIST CHECKED IN';checkinButton.disabled=true;
};
document.getElementById('closeCheckin').onclick=()=>document.getElementById('checkinPanel').classList.remove('show');
