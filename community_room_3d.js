import {createRoom,buildAvatar} from './mce_3d_room.js';

let state=window.MCE?window.MCE.load():{
  fans:Number(localStorage.getItem('mceFans'))||0,
  cash:Number(localStorage.getItem('mceCash'))||500,
  xp:Number(localStorage.getItem('mceXP'))||0,
  releases:[]
};
const updateStats=()=>{
  document.getElementById('fans').textContent=state.fans;
  document.getElementById('cash').textContent=state.cash;
  document.getElementById('xp').textContent=state.xp;
};
const addProgress=delta=>{
  if(window.MCE)state=window.MCE.add(delta);
  else{
    state=Object.assign({},state,{fans:state.fans+(delta.fans||0),cash:state.cash+(delta.cash||0),xp:state.xp+(delta.xp||0)});
    localStorage.setItem('mceFans',state.fans);localStorage.setItem('mceCash',state.cash);localStorage.setItem('mceXP',state.xp);
  }
  updateStats();
};
updateStats();

const room=createRoom({spawn:[0,1.7,11.3],background:0x070403,fog:0x120b08,fogDensity:.013,sky:0x9a5d39});
const {THREE,scene}=room;

function texture(draw,size=512){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const context=canvas.getContext('2d');draw(context,size);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;return map;
}
const brick=texture((c,s)=>{
  c.fillStyle='#2a1c18';c.fillRect(0,0,s,s);
  for(let y=0;y<s;y+=62){const offset=(y/62)%2?47:0;for(let x=-94;x<s;x+=94){const shade=42+Math.floor(Math.random()*20);c.fillStyle=`rgb(${shade+28},${shade+5},${shade})`;c.fillRect(x+offset+3,y+3,88,56);c.strokeStyle='#17100e';c.lineWidth=4;c.strokeRect(x+offset+3,y+3,88,56)}}
});
brick.repeat.set(4,2);
const brickMaterial=new THREE.MeshStandardMaterial({map:brick,color:0xaa8070,roughness:.95});
const wood=texture((c,s)=>{
  c.fillStyle='#211711';c.fillRect(0,0,s,s);
  for(let y=0;y<s;y+=64){c.fillStyle=y%128?'#312017':'#3b281c';c.fillRect(0,y,s,59);c.strokeStyle='#0f0a08';c.lineWidth=3;c.strokeRect(0,y,s,59);for(let x=0;x<s;x+=110){c.fillStyle='#ffffff08';c.fillRect(x+(y%128?30:0),y+8,70,2)}}
});
wood.repeat.set(4,5);
const woodMaterial=new THREE.MeshStandardMaterial({map:wood,color:0x9d7457,roughness:.78,metalness:.04});

room.wallBounds(34,28,8);
scene.getObjectByName('floor').material=woodMaterial;
for(const name of ['back wall','left wall','right wall','front-left','front-right'])scene.getObjectByName(name).material=brickMaterial;

// Industrial loft structure and warm community lighting.
for(const x of [-16,-10,10,16])room.box('steel column',[.45,7.5,.45],[x,3.75,-1],0x201c1b,{metalness:.82,roughness:.34});
for(let z=-12;z<=12;z+=4)room.box('ceiling beam',[33,.18,.18],[0,7.25,z],0x3c3432,{metalness:.9,roughness:.3});
for(const x of [-11,0,11])for(const z of [-8,1,9]){
  const bulb=new THREE.PointLight(0xffa34c,4.8,10,2);bulb.position.set(x,5.7,z);scene.add(bulb);
  room.cylinder('hanging lamp',.33,.25,[x,6,z],0x171313,{metalness:.82,roughness:.28});
}
const key=room.light(0xff8b42,18,[-10,4,-6],20);key.shadow.mapSize.set(512,512);
const fill=room.light(0x9b4cff,12,[11,4,-5],18);fill.castShadow=false;

room.label('D-A WAREHOUSE COMMUNITY',[0,6.25,-13.72],'#ffe0a3',[12,1.45]);
room.label('ARTISTS • BATTLE • CONNECT • GROW',[0,5.15,-13.7],'#ff884d',[9,.65]);
room.label('RESPECT THE CULTURE',[-12.4,3.8,-13.65],'#ffbe70',[4.2,.75]);
room.label('BUILD TOGETHER',[12.4,3.8,-13.65],'#e36cff',[4.2,.75]);

// Lounge section: couches, tables, rugs, plants, and record crates.
function couch(x,z,rotation,color){
  const group=new THREE.Group(),mat=room.material(color,.86,.04);
  const add=(size,pos)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);mesh.position.fromArray(pos);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh)};
  add([4,.55,1.25],[0,.48,0]);add([4,1.15,.36],[0,1.1,-.48]);add([.42,1.05,1.25],[-2.05,.7,0]);add([.42,1.05,1.25],[2.05,.7,0]);
  group.position.set(x,0,z);group.rotation.y=rotation;scene.add(group);
}
room.box('lounge rug',[11,.04,8],[-8.5,.03,3.3],0x4a1824,{roughness:.95});
couch(-10.5,1.5,0,0x431d29);couch(-6.4,6.2,Math.PI,0x322333);
for(const [x,z] of [[-8.5,3.6],[-13,7]]){
  room.cylinder('coffee table',1,.35,[x,.3,z],0x352218,{metalness:.25,roughness:.62});
  room.cylinder('table leg',.15,.6,[x,.3,z],0x151317,{metalness:.85});
}
for(const x of [-15,-4]){
  room.cylinder('plant pot',.45,.6,[x,.3,9],0x6a3420,{roughness:.9});
  for(let i=0;i<5;i++){const leaf=room.box('plant leaf',[.18,1.4,.35],[x+(i-2)*.15,1.05,9],0x315a38,{cast:false});leaf.rotation.z=(i-2)*.22}
}

// Collaboration section: communal tables, project wall, and listening station.
room.box('collab rug',[11,.04,8],[8.5,.03,3.3],0x1d3042,{roughness:.95});
for(const z of [1.2,5.6]){
  room.box('collab table',[7,.18,1.8],[8.5,1.08,z],0x4b3221,{collider:true,metalness:.12,roughness:.68});
  for(const x of [5.8,11.2])room.box('table leg',[.18,2,.18],[x,1,z],0x272326,{metalness:.86});
}
room.box('project wall',[8,3.8,.22],[9,3,-12.8],0x15181d,{collider:true,metalness:.35,roughness:.45});
room.label('COLLAB BOARD',[9,4.15,-12.62],'#63cfff',[5,.8]);
room.label('HOOKS WANTED • PRODUCERS • FEATURES',[9,3.15,-12.6],'#ffffff',[6,.55]);
room.box('listening console',[4.4,1.15,1.2],[13.5,.58,-7.4],0x14151a,{collider:true,metalness:.48});
for(const x of [12.3,14.7]){
  const speaker=room.cylinder('monitor speaker',.42,.25,[x,1.5,-7.4],0x262b33,{metalness:.4});speaker.rotation.x=Math.PI/2;
}
room.label('MUSIC SHOWCASE',[13.5,2.35,-7.3],'#62dcff',[4,.65]);

// A&R check-in desk at the back of the room.
room.box('check in desk',[6.5,1.25,1.5],[0,.63,-10.8],0x231915,{collider:true,metalness:.18,roughness:.76});
room.box('desk trim',[6.1,.08,.05],[0,.92,-10],0xff8b42,{metalness:.55});
room.label('A&R CHECK-IN',[0,1.65,-9.98],'#ffc34d',[4.2,.72]);
const arHost=buildAvatar(room,{skin:'#8a563c',hairStyle:'braids',hairColor:'#141014',shirtColor:'#d05228',pantsColor:'#15151a'},[0,0,-12],.82);arHost.rotation.y=Math.PI;

// Resident artists make the room feel inhabited and provide networking actions.
const residents=[
  {id:'nova',name:'Nova Rae',role:'R&B Artist • Tampa',icon:'🎙️',pos:[-5.1,0,-3.1],look:1.9,data:{skin:'#8f5b3c',hairStyle:'afro',hairColor:'#171016',shirtColor:'#7b2cff',pantsColor:'#171b2d'},text:'Nova Rae is looking for a rapper to feature on a melodic hook.'},
  {id:'miles',name:'Miles On The Beat',role:'Producer • Atlanta',icon:'🎛️',pos:[4.8,0,-2.8],look:-1.6,data:{skin:'#5c3725',hairStyle:'fade',hairColor:'#090909',shirtColor:'#234a78',pantsColor:'#131722'},text:'Miles has a folder of hard drums and wants to meet serious artists.'},
  {id:'djlex',name:'DJ Lex',role:'DJ • Battle Curator',icon:'🎧',pos:[-13.2,0,-6.4],look:.5,data:{skin:'#b67955',hairStyle:'fade',hairColor:'#24170f',shirtColor:'#b82d3b',pantsColor:'#17171a'},text:'DJ Lex curates Warehouse battle nights and watches crowd reactions.'}
];
for(const resident of residents){
  const avatar=buildAvatar(room,resident.data,resident.pos,.83);avatar.rotation.y=resident.look;
  room.label(resident.name.toUpperCase(),[resident.pos[0],3.05,resident.pos[2]],'#ffffff',[3,.5]);
  room.interact('TALK TO '+resident.name.toUpperCase(),[resident.pos[0],1.7,resident.pos[2]+1.25],()=>showResident(resident),2.35,0xffc34d);
}

room.interact('OPEN COLLAB BOARD',[9,1.7,-9.8],showCollab,2.8,0x4ccfff);
room.interact('LISTEN TO MUSIC SHOWCASE',[13.5,1.7,-5.9],showShowcase,2.7,0x4ccfff);
room.interact('CHECK IN WITH A&R',[0,1.7,-8.5],showAR,2.8,0xff8b42);
room.interact('ENTER BATTLE STAGE',[12.5,1.7,11.7],()=>location.href='battle_room.html',2.7,0xff315b);
room.interact('ENTER MERCH & BACKSTAGE',[0,1.7,11.7],()=>location.href='merch_backstage.html',2.7,0x52baff);
room.interact('RETURN TO WAREHOUSE',[-12.5,1.7,11.7],()=>location.href='warehouse.html',2.7,0xffc34d);
room.label('BATTLE STAGE',[12.5,3,13.65],'#ff315b',[3.5,.62]);
room.label('MERCH & BACKSTAGE',[0,3,13.65],'#52baff',[4.2,.62]);
room.label('WAREHOUSE LOBBY',[-12.5,3,13.65],'#ffc34d',[4,.62]);

const panel=document.getElementById('communityPanel');
const title=document.getElementById('panelTitle'),type=document.getElementById('panelType'),icon=document.getElementById('panelIcon'),profileName=document.getElementById('profileName'),profileRole=document.getElementById('profileRole'),text=document.getElementById('panelText'),notice=document.getElementById('panelNotice'),action=document.getElementById('panelAction');
let actionHandler=null;
function openPanel(data){
  type.textContent=data.type;title.textContent=data.title;icon.textContent=data.icon;profileName.textContent=data.name;profileRole.textContent=data.role;text.textContent=data.text;notice.textContent='';action.textContent=data.action;action.disabled=!!data.disabled;actionHandler=data.handler||null;panel.classList.add('show');
}
function connectionIds(){try{return JSON.parse(localStorage.getItem('mceConnections')||'[]')}catch(error){return[]}}
function showResident(resident){
  const connected=connectionIds().includes(resident.id);
  openPanel({type:'COMMUNITY CONNECTION',title:'Meet '+resident.name,icon:resident.icon,name:resident.name,role:resident.role,text:resident.text,action:connected?'CONNECTED':'ADD CONNECTION',disabled:connected,handler:()=>{
    const ids=connectionIds();if(!ids.includes(resident.id)){ids.push(resident.id);localStorage.setItem('mceConnections',JSON.stringify(ids));addProgress({xp:2});notice.textContent='✓ Connection added • +2 XP';action.textContent='CONNECTED';action.disabled=true}
  }});
}
function showCollab(){
  const joined=localStorage.getItem('mceCommunityChallenge')==='warehouse-hook';
  openPanel({type:'COLLABORATION BOARD',title:'Warehouse Hook Challenge',icon:'✍️',name:'Open Collaboration',role:'Rappers • Singers • Producers',text:'Create an eight-bar hook for this week’s Warehouse community track. This prepares the future multiplayer collaboration system.',action:joined?'CHALLENGE JOINED':'JOIN CHALLENGE',disabled:joined,handler:()=>{localStorage.setItem('mceCommunityChallenge','warehouse-hook');addProgress({xp:3});notice.textContent='✓ Challenge joined • +3 XP';action.textContent='CHALLENGE JOINED';action.disabled=true}});
}
function showShowcase(){
  const releases=state.releases||[],latest=releases[releases.length-1];
  openPanel({type:'MUSIC SHOWCASE',title:latest?'Now Featuring Your Release':'Community Listening Station',icon:'🎵',name:latest?latest.title:'No Release Selected',role:latest?'Your latest Music City release':'Record a song in a studio first',text:latest?'Your song is queued for the Warehouse community showcase. Fan voting and audio playback will connect here in a later multiplayer phase.':'Once you create a song, this station will recognize your latest release and prepare it for community discovery.',action:'CLOSE SHOWCASE',handler:()=>panel.classList.remove('show')});
}
function showAR(){
  const releases=state.releases||[],latest=releases[releases.length-1],submitted=localStorage.getItem('mceARSubmission')==='warehouse';
  openPanel({type:'A&R CHECK-IN',title:'Submit to the Warehouse A&R',icon:'📋',name:'Maya Stone',role:'Independent A&R • Talent Scout',text:latest?'Submit “'+latest.title+'” for consideration in a future Warehouse showcase.':'You need at least one recorded song before Maya can review your music.',action:submitted?'ALREADY SUBMITTED':latest?'SUBMIT LATEST SONG':'RECORD A SONG FIRST',disabled:submitted||!latest,handler:()=>{localStorage.setItem('mceARSubmission','warehouse');addProgress({fans:3,xp:5});notice.textContent='✓ Submitted • +3 Fans • +5 XP';action.textContent='SUBMITTED';action.disabled=true}});
}
action.onclick=()=>{if(actionHandler)actionHandler()};
document.getElementById('closePanel').onclick=()=>panel.classList.remove('show');
