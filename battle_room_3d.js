import {createRoom,buildAvatar} from './mce_3d_room.js';

let fans=Number(localStorage.getItem('mceFans'))||0;
let cash=Number(localStorage.getItem('mceCash'))||500;
let xp=Number(localStorage.getItem('mceXP'))||0;
const unlocked=fans>=25;
const stat=()=>{
  document.getElementById('fans').textContent=fans;
  document.getElementById('cash').textContent=cash;
  document.getElementById('xp').textContent=xp;
};
stat();
document.getElementById('accessMode').textContent=unlocked?'BATTLE READY':'VENUE TOUR';

const room=createRoom({spawn:[0,1.7,14.5],background:0x020104,fog:0x090207,fogDensity:.012,sky:0x5c2135});
const {THREE,scene}=room;

function canvasTexture(draw,size=512){
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');
  draw(ctx,size);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  return texture;
}

const brickTexture=canvasTexture((ctx,s)=>{
  ctx.fillStyle='#21171a';ctx.fillRect(0,0,s,s);
  const row=64;
  for(let y=0;y<s;y+=row){
    const offset=(y/row)%2?48:0;
    for(let x=-96;x<s;x+=96){
      const shade=26+Math.floor(Math.random()*18);
      ctx.fillStyle=`rgb(${shade+18},${shade},${shade+3})`;
      ctx.fillRect(x+offset+3,y+3,90,row-6);
      ctx.strokeStyle='#0d0a0b';ctx.lineWidth=4;ctx.strokeRect(x+offset+3,y+3,90,row-6);
    }
  }
  for(let i=0;i<220;i++){
    ctx.fillStyle=`rgba(255,255,255,${Math.random()*.025})`;
    ctx.fillRect(Math.random()*s,Math.random()*s,Math.random()*25+2,2);
  }
});
brickTexture.repeat.set(5,2);
const brickMaterial=new THREE.MeshStandardMaterial({map:brickTexture,color:0x8b6870,roughness:.96});

const concreteTexture=canvasTexture((ctx,s)=>{
  ctx.fillStyle='#171318';ctx.fillRect(0,0,s,s);
  for(let i=0;i<1600;i++){
    const c=22+Math.floor(Math.random()*25);
    ctx.fillStyle=`rgba(${c+12},${c},${c+6},${Math.random()*.22})`;
    ctx.fillRect(Math.random()*s,Math.random()*s,Math.random()*3+1,Math.random()*3+1);
  }
  ctx.strokeStyle='#070608';ctx.lineWidth=4;
  for(let p=0;p<s;p+=128){ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,s);ctx.stroke();ctx.beginPath();ctx.moveTo(0,p);ctx.lineTo(s,p);ctx.stroke()}
});
concreteTexture.repeat.set(4,4);
const concreteMaterial=new THREE.MeshStandardMaterial({map:concreteTexture,color:0x777077,roughness:.83,metalness:.12});

room.wallBounds(42,34,10);
scene.getObjectByName('floor').material=concreteMaterial;
for(const wallName of ['back wall','left wall','right wall','front-left','front-right'])scene.getObjectByName(wallName).material=brickMaterial;

for(const x of [-20,-14,14,20])room.box('steel column',[.55,9.5,.55],[x,4.75,-3],0x201d22,{metalness:.82,roughness:.35});
for(let z=-15;z<=15;z+=5)room.box('roof beam',[41,.22,.22],[0,8.55,z],0x302b31,{metalness:.9,roughness:.3});
for(const x of [-19,19]){
  room.box('catwalk',[3.2,.25,25],[x,4.6,0],0x221f23,{metalness:.75,roughness:.45});
  for(let z=-11;z<=11;z+=2)room.box('rail post',[.09,1.25,.09],[x>0?17.55:-17.55,5.25,z],0x6a6269,{metalness:.9});
  room.box('catwalk rail',[.1,.1,25],[x>0?17.55:-17.55,5.8,0],0x777078,{metalness:.9});
}

room.box('stage',[23,.42,10],[0,.21,-9.7],0x160f15,{metalness:.2,roughness:.52});
room.box('stage red trim',[23.4,.16,.2],[0,.39,-4.72],0xd40d3f,{metalness:.6,roughness:.3});
const circle=new THREE.Mesh(new THREE.CylinderGeometry(4.15,4.15,.09,64),new THREE.MeshStandardMaterial({color:0x260611,emissive:0x5c071e,emissiveIntensity:.45,metalness:.3,roughness:.48}));
circle.position.set(0,.49,-8.2);scene.add(circle);
const ring=new THREE.Mesh(new THREE.TorusGeometry(4,.075,10,72),new THREE.MeshBasicMaterial({color:0xff174d}));
ring.rotation.x=Math.PI/2;ring.position.set(0,.55,-8.2);scene.add(ring);
const crown=new THREE.Mesh(new THREE.RingGeometry(1.05,1.22,5),new THREE.MeshBasicMaterial({color:0xff315b,side:THREE.DoubleSide}));
crown.rotation.x=-Math.PI/2;crown.rotation.z=Math.PI;crown.position.set(0,.56,-8.2);scene.add(crown);

room.box('dj riser',[8,.5,3.1],[0,.7,-14],0x18131a,{collider:true,metalness:.25});
room.box('dj booth',[6.2,1.55,1.45],[0,1.65,-13.25],0x120e15,{collider:true,metalness:.28});
room.box('dj booth glow',[5.5,.08,.05],[0,2,-12.5],0xff174d,{metalness:.5});
room.label('D-A WAREHOUSE',[0,1.75,-12.47],'#ff315b',[4.5,.72]);
for(const x of [-1.55,1.55]){
  const deck=room.cylinder('turntable',.55,.12,[x,2.48,-13.1],0x242129,{metalness:.85,roughness:.25});deck.scale.z=.18;
}
const dj=buildAvatar(room,{skin:'#6f422c',hairStyle:'fade',hairColor:'#09090a',shirtColor:'#141418',pantsColor:'#0b0b0d'},[0,.95,-14],.82);
dj.rotation.y=Math.PI;
for(const x of [-9.5,9.5]){
  room.box('speaker stack',[2.2,5.3,1.7],[x,3.05,-13.65],0x09090b,{collider:true,metalness:.22,roughness:.48});
  for(let y=1.1;y<=4.7;y+=1.2){
    const cone=room.cylinder('speaker cone',.43,.08,[x,y,-12.76],0x302d34,{metalness:.4});cone.rotation.x=Math.PI/2;
    const center=room.cylinder('speaker center',.16,.09,[x,y,-12.7],0x09090b,{metalness:.2});center.rotation.x=Math.PI/2;
  }
}

room.label('♛  WORD SLAUGHTER  ♛',[0,7.15,-16.72],'#fff0f5',[15,2.25]);
room.label('REAL BATTLES • REAL TALENT • NO LIMITS',[0,5.85,-16.7],'#ff315b',[11,.75]);
room.label('GOOD BARS\nBETTER PEOPLE',[-15.2,5.7,-16.65],'#ffd0de',[4.2,1.65]);
room.label('THE STAGE\nIS YOURS',[15.2,5.7,-16.65],'#ff6a91',[3.8,1.65]);

function rail(x,z,length,rotation=0){
  const group=new THREE.Group();
  const metal=room.material(0x77747a,.32,.9);
  const bar=(sx,sy,sz,px,py,pz)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),metal);m.position.set(px,py,pz);m.castShadow=true;group.add(m)};
  bar(length,.08,.08,0,1.1,0);bar(length,.08,.08,0,.18,0);
  for(let p=-length/2;p<=length/2+.01;p+=1)bar(.055,1,.055,p,.63,0);
  group.position.set(x,0,z);group.rotation.y=rotation;scene.add(group);return group;
}
rail(-5.3,-3.2,10.6);rail(5.3,-3.2,10.6);rail(-5.3,3.2,10.6);rail(5.3,3.2,10.6);
rail(-10.55,0,6.4,Math.PI/2);rail(10.55,0,6.4,Math.PI/2);

const crowdColors=[0x361728,0x1d2940,0x4b2d21,0x29242e,0x5a1831];
const skinColors=[0x4a2a1a,0x70452e,0x9b6546,0xc99370,0x6b3b27];
function crowdMember(x,z,seed,upper=false){
  const group=new THREE.Group();
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.24,.62,3,8),room.material(crowdColors[seed%crowdColors.length],.82,.05));
  torso.position.y=upper?5.45:1.05;group.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.22,10,8),room.material(skinColors[(seed*3)%skinColors.length],.8,.02));
  head.position.y=upper?6.12:1.72;group.add(head);
  const arm=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.72,8),room.material(skinColors[(seed*3)%skinColors.length],.8,.02));
  arm.position.set(.34,upper?5.55:1.15,0);arm.rotation.z=seed%3===0?-1.1:.25;group.add(arm);
  group.position.set(x,0,z);scene.add(group);
  const phase=seed*.73;
  room.animated.push(t=>{group.position.y=Math.sin(t*.0027+phase)*.055;group.rotation.z=Math.sin(t*.0021+phase)*.018});
}
let seed=0;
for(const side of [-1,1]){
  for(let z=-2.1;z<=8.2;z+=1.65)for(let lane=0;lane<3;lane++)crowdMember(side*(6.3+lane*1.45),z+(lane%2)*.48,seed++);
  for(let z=-9;z<=9;z+=2.2)crowdMember(side*18.8,z,seed++,true);
}

const avatarData=JSON.parse(localStorage.getItem('mceAvatar')||'null')||{name:'New Artist'};
const player=buildAvatar(room,avatarData,[-2.2,.52,-8.2],1.02);player.rotation.y=-Math.PI/2;
const opponent=buildAvatar(room,{skin:'#6a3f28',hairStyle:'afro',hairColor:'#101010',shirtColor:'#d7193f',pantsColor:'#111111'},[2.2,.52,-8.2],1.02);opponent.rotation.y=Math.PI/2;
room.label((avatarData.name||'NEW ARTIST').toUpperCase(),[-2.2,4.15,-8.2],'#ffffff',[3.2,.55]);
room.label('KNOCKOUT KAI',[2.2,4.15,-8.2],'#ffb1bd',[3.2,.55]);
for(const [x,z,rotation] of [[-1.45,-7.9,-.6],[1.45,-7.9,.6]]){
  const mic=room.cylinder('microphone',.065,.68,[x,2.75,z],0x19191d,{metalness:.9,roughness:.2});mic.rotation.z=rotation;
}

room.box('front lighting truss',[24,.22,.22],[0,7.4,-3.3],0x55505a,{metalness:.92,roughness:.24});
room.box('rear lighting truss',[24,.22,.22],[0,7.4,-12.3],0x55505a,{metalness:.92,roughness:.24});
function stageBeam(x,z,color,targetX){
  const light=new THREE.SpotLight(color,105,28,.34,.55,1.6);
  light.position.set(x,7.1,z);light.target.position.set(targetX,.4,-8.2);light.castShadow=false;scene.add(light,light.target);
  const beam=new THREE.Mesh(new THREE.ConeGeometry(1.55,8,18,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.055,depthWrite:false,side:THREE.DoubleSide}));
  beam.position.set((x+targetX)/2,3.8,(z-8.2)/2);beam.rotation.x=Math.PI;scene.add(beam);
  const lamp=room.cylinder('stage lamp',.24,.38,[x,7.15,z],0x151318,{metalness:.9});lamp.rotation.x=Math.PI/2;
}
stageBeam(-8,-3.3,0xff163f,-2.5);stageBeam(-3,-3.3,0x7b2cff,-1);stageBeam(3,-3.3,0x2789ff,1);stageBeam(8,-3.3,0xff163f,2.5);
const keyLight=room.light(0xff174d,34,[-10,4.2,-10],22);
const fillLight=room.light(0x872cff,30,[10,4.6,-10],22);fillLight.castShadow=false;
const blueLight=room.light(0x226dff,20,[0,6,-5],18);blueLight.castShadow=false;
keyLight.shadow.mapSize.set(512,512);
for(const x of [-17,17])for(const z of [-10,-3,4,11]){
  const practical=new THREE.PointLight(0xff9c4a,3.5,7,2);practical.position.set(x,3.1,z);scene.add(practical);
}

room.box('backstage door',[4.6,3.8,.3],[-15.4,1.9,-15.9],0x120f13,{collider:true,metalness:.45});
room.box('community door',[4.6,3.8,.3],[15.4,1.9,-15.9],0x120f13,{collider:true,metalness:.45});
room.label('← BACKSTAGE',[-15.4,3.25,-15.7],'#ffad67',[3.8,.62]);
room.label('COMMUNITY ROOM →',[15.4,3.25,-15.7],'#ffd15a',[4.5,.62]);
room.interact('ENTER MERCH & BACKSTAGE',[-15.4,1.7,-13.8],()=>location.href='merch_backstage.html',2.8,0xffad67);
room.interact('ENTER COMMUNITY ROOM',[15.4,1.7,-13.8],()=>location.href='warehouse_hangout_viewer.html',2.8,0xffd15a);

const battlePanel=document.getElementById('battlePanel');
const battleLog=document.getElementById('battleLog');
const roundText=document.getElementById('roundText');
const startBattle=document.getElementById('startBattle');
const energy=document.getElementById('energy');
const buttons=[...document.querySelectorAll('[data-action]')];
function openBattlePanel(){
  battlePanel.classList.add('show');
  if(!unlocked){
    roundText.textContent='Stage tour mode';
    battleLog.innerHTML=`The battle circle unlocks at 25 fans. You have <b>${fans}</b> fan${fans===1?'':'s'}, so you can explore the full 3D venue now and return to compete later.`;
    startBattle.textContent=`LOCKED — EARN ${25-fans} MORE FANS`;
    startBattle.disabled=true;
  }
}
room.interact(unlocked?'ENTER BATTLE CIRCLE':'VIEW LOCKED BATTLE CIRCLE',[0,1.7,-3.75],openBattlePanel,3.4,0xff315b);
room.interact('CUSTOMIZE ARTIST',[14.8,1.7,13.5],()=>location.href='avatar_studio.html',2.8,0xd24bff);
room.interact('RETURN TO WAREHOUSE',[-14.8,1.7,13.5],()=>location.href='warehouse.html',2.8,0xffd24a);
room.label('AVATAR STUDIO',[14.8,3.15,16.5],'#d24bff',[3.6,.68]);
room.label('WAREHOUSE LOBBY',[-14.8,3.15,16.5],'#ffd24a',[4,.68]);

let round=0,score=0,active=false;
const lines={bars:['A sharp punchline shakes the front row.','The judges react to the wordplay.'],flow:['You switch cadence and catch Kai off guard.','The new pocket pulls the room in.'],crowd:['The Warehouse throws its hands up.','Your call-and-response fills the room.']};
function enable(value){buttons.forEach(button=>button.disabled=!value)}
startBattle.onclick=()=>{
  if(!unlocked)return;
  round=1;score=0;active=true;energy.style.width='8%';roundText.textContent='Round 1 of 3';battleLog.textContent='The DJ drops the beat. The circle closes around the artists.';enable(true);startBattle.disabled=true;
};
buttons.forEach(button=>button.onclick=()=>{
  if(!active)return;
  const type=button.dataset.action,gain=12+Math.floor(Math.random()*17);
  score+=gain;energy.style.width=Math.min(score,100)+'%';battleLog.textContent=lines[type][Math.floor(Math.random()*2)]+' +'+gain+' crowd energy.';
  if(round===3){
    active=false;enable(false);
    const opponentScore=48+Math.floor(Math.random()*28);
    if(score>=opponentScore){
      cash+=100;xp+=25;fans+=20;
      battleLog.innerHTML='<b style="color:#77ffac">🏆 YOU WON WORD SLAUGHTER!</b><br>+20 Fans • +$100 • +25 XP';
      localStorage.setItem('mceFans',fans);
    }else{xp+=8;battleLog.textContent='Knockout Kai takes this battle. You earn +8 XP and can challenge again.'}
    localStorage.setItem('mceCash',cash);localStorage.setItem('mceXP',xp);
    if(window.MCE)window.MCE.set({fans,cash,xp,battles:(window.MCE.get().battles||0)+1});
    stat();startBattle.disabled=false;startBattle.textContent='BATTLE AGAIN';
  }else{round++;roundText.textContent='Round '+round+' of 3'}
});
document.getElementById('closeBattle').onclick=()=>battlePanel.classList.remove('show');
