import {createRoom,buildAvatar} from './mce_3d_room.js';
import {saveAvatarAsset,deleteAvatarAsset} from './mce_avatar_assets.js';

let state=window.MCE?window.MCE.load():{
  name:'New Artist',
  fans:Number(localStorage.getItem('mceFans'))||0,
  cash:Number(localStorage.getItem('mceCash'))||500,
  xp:Number(localStorage.getItem('mceXP'))||0
};
const fans=state.fans;
document.getElementById('fans').textContent=state.fans;
document.getElementById('cash').textContent=state.cash;
document.getElementById('xp').textContent=state.xp;

const room=createRoom({spawn:[0,1.7,8],background:0x08030d,fog:0x0b0410,fogDensity:.018,sky:0x7c3c91});
room.wallBounds(24,22,5.5);
room.label('AVATAR STUDIO',[0,4.5,-10.5],'#e05bff',[7,1.5]);
for(let x=-8;x<=8;x+=4)room.box('ceiling beam',[.18,.18,21],[x,5.1,0],0x2b202e,{metalness:.8});
room.light(0xbb39ff,22,[-6,4,0],18);
room.light(0x2ab9ff,18,[6,4,-2],18);
room.light(0xffb52b,12,[0,4,7],15);
room.box('mirror wall',[8,3.6,.18],[0,2.1,-10.25],0x7790a0,{metalness:.95,roughness:.08});
room.box('platform',[5,.25,4],[0,.12,-5],0x32183c,{collider:true});
room.label('BUILD YOUR LOOK',[0,3.8,-10.05],'#ffd24a',[5.5,1]);
for(const x of [-8,-5,5,8]){
  room.box('wardrobe',[2.2,3.5,.8],[x,1.75,-8.8],0x241329,{collider:true});
  room.label(x<0?'FITS':'STYLE',[x,3.1,-8.32],'#ffffff',[1.5,.35]);
}

const starterName=state.name&&state.name!=='Rookie'&&state.name!=='New Artist'?state.name:'Nova';
let avatarData=JSON.parse(localStorage.getItem('mceAvatar')||'null')||{
  name:starterName,
  type:'Rapper',
  skin:'#9a5f3c',
  bodyBuild:'athletic',
  faceShape:'balanced',
  hairStyle:'fade',
  hairColor:'#171016',
  facialHair:'none',
  accessory:'chain',
  outfitStyle:'hoodie',
  shirtColor:'#171a20',
  pantsColor:'#11151c'
};
avatarData={
  bodyBuild:'athletic',
  faceShape:'balanced',
  hairStyle:'fade',
  hairColor:'#171016',
  facialHair:'none',
  accessory:'chain',
  outfitStyle:'streetwear',
  shirtColor:'#171a20',
  pantsColor:'#11151c',
  ...avatarData
};
if(!avatarData.name||avatarData.name==='Rookie'||avatarData.name==='New Artist')avatarData.name=starterName;

const customizer=document.getElementById('customizer');
const coach=document.getElementById('avatarCoach');
if(localStorage.getItem('mceAvatar')||localStorage.getItem('mceAvatarCoachSeen')==='1')coach?.classList.add('hide');

let skin=avatarData.skin;
let avatar=buildAvatar(room,avatarData,[0,.25,-5],1.08);
let avatarNameLabel=room.label(avatarData.name.toUpperCase(),[0,3.8,-5],'#ffffff',[4,.75]);
const avatarGuideLabel=room.label('WALK UP + TAP AVATAR',[0,4.55,-5],'#ffd24a',[5.2,.62]);

const ids=['artistName','artistType','bodyBuild','faceShape','hairStyle','hairColor','facialHair','accessory','outfitStyle','shirtColor','pantsColor'];
const outfitPresets={
  streetBlue:{shirtColor:'#176fd1',pantsColor:'#151c2e'},
  midnight:{shirtColor:'#11151c',pantsColor:'#080b11'},
  purpleStage:{shirtColor:'#7b2cff',pantsColor:'#171b2d'},
  roseGold:{shirtColor:'#c44b87',pantsColor:'#3a2235'}
};
const avatarPresets={
  female:{type:'Singer',skin:'#9a5f3c',bodyBuild:'athletic',faceShape:'balanced',hairStyle:'braids',hairColor:'#24130e',facialHair:'none',accessory:'chain',outfitStyle:'streetwear',shirtColor:'#17151a',pantsColor:'#17171d'},
  male:{type:'Rapper',skin:'#7b472b',bodyBuild:'athletic',faceShape:'wide',hairStyle:'fade',hairColor:'#15100e',facialHair:'beard',accessory:'chain',outfitStyle:'hoodie',shirtColor:'#11151c',pantsColor:'#0b0e14'}
};

function loadForm(){
  ids.forEach(id=>{
    const el=document.getElementById(id);
    const key=id==='artistName'?'name':id;
    el.value=avatarData[key]||el.value;
  });
  skin=avatarData.skin;
  document.getElementById('outfitPreset').value='custom';
}
function readForm(){
  return {
    name:document.getElementById('artistName').value.trim()||avatarData.name||'Nova',
    type:document.getElementById('artistType').value,
    bodyBuild:document.getElementById('bodyBuild').value,
    faceShape:document.getElementById('faceShape').value,
    hairStyle:document.getElementById('hairStyle').value,
    hairColor:document.getElementById('hairColor').value,
    facialHair:document.getElementById('facialHair').value,
    accessory:document.getElementById('accessory').value,
    outfitStyle:document.getElementById('outfitStyle').value,
    shirtColor:document.getElementById('shirtColor').value,
    pantsColor:document.getElementById('pantsColor').value,
    modelAssetId:avatarData.modelAssetId||'',
    modelAssetName:avatarData.modelAssetName||'',
    modelUrl:avatarData.modelUrl||'',
    skin
  };
}
function disposeAvatar(avatarObject){
  if(!avatarObject)return;
  avatarObject.userData.disposed=true;
  const controller=avatarObject.userData.avatarController;
  if(controller&&controller.dispose)controller.dispose();
  const updater=avatarObject.userData.avatarMixerUpdater;
  if(updater){
    const index=room.animated.indexOf(updater);
    if(index>=0)room.animated.splice(index,1);
  }
  room.scene.remove(avatarObject);
}
function rebuildAvatar(data){
  disposeAvatar(avatar);
  room.scene.remove(avatarNameLabel);
  avatar=buildAvatar(room,data,[0,.25,-5],1.08);
  avatarNameLabel=room.label((data.name||'NOVA').toUpperCase(),[0,3.8,-5],'#ffffff',[4,.75]);
}
function previewForm(){
  const preview=readForm();
  rebuildAvatar({...preview,modelAssetId:'',modelUrl:''});
}
function updatePremiumStatus(){
  const status=document.getElementById('premiumAvatarStatus');
  if(!status)return;
  if(avatarData.modelAssetId){
    status.textContent='✓ Premium GLB loaded: '+(avatarData.modelAssetName||'saved avatar')+'. This model follows your artist on this device.';
  }else if(avatarData.modelUrl){
    status.textContent='✓ Premium network avatar configured.';
  }else{
    status.textContent='No premium GLB loaded — using Music City Realism V2.';
  }
}
function openCustomizer(){
  loadForm();
  updatePremiumStatus();
  customizer.classList.add('show');
  coach?.classList.add('hide');
  localStorage.setItem('mceAvatarCoachSeen','1');
  setTimeout(()=>document.getElementById('artistName').focus(),50);
}

room.interact('CUSTOMIZE 3D ARTIST',[0,1.7,-2.6],openCustomizer,3.2,0xd24bff);
room.interact(fans<25?'TOUR BATTLE STAGE':'ENTER BATTLE STAGE',[8.2,1.7,8.2],()=>location.href='battle_room.html',2.6,0xff315b);
room.interact('RETURN TO WAREHOUSE',[-8.2,1.7,8.2],()=>location.href='warehouse.html',2.6,0xffd24a);
room.label(fans<25?'STAGE TOUR':'BATTLE STAGE',[8.2,2.8,10.5],'#ff315b',[3,.65]);
room.label('WAREHOUSE',[-8.2,2.8,10.5],'#ffd24a',[3,.65]);

document.querySelectorAll('[data-avatar-preset]').forEach(button=>button.addEventListener('click',()=>{
  const preset=avatarPresets[button.dataset.avatarPreset];
  if(!preset)return;
  document.getElementById('artistType').value=preset.type;
  document.getElementById('bodyBuild').value=preset.bodyBuild;
  document.getElementById('faceShape').value=preset.faceShape;
  document.getElementById('hairStyle').value=preset.hairStyle;
  document.getElementById('hairColor').value=preset.hairColor;
  document.getElementById('facialHair').value=preset.facialHair;
  document.getElementById('accessory').value=preset.accessory;
  document.getElementById('outfitStyle').value=preset.outfitStyle;
  document.getElementById('shirtColor').value=preset.shirtColor;
  document.getElementById('pantsColor').value=preset.pantsColor;
  document.getElementById('outfitPreset').value='custom';
  skin=preset.skin;
  document.getElementById('notice').textContent='Starter look loaded. Change anything you want, then save your artist.';
  previewForm();
}));

document.getElementById('outfitPreset').addEventListener('change',event=>{
  const preset=outfitPresets[event.target.value];
  if(!preset)return;
  document.getElementById('shirtColor').value=preset.shirtColor;
  document.getElementById('pantsColor').value=preset.pantsColor;
  previewForm();
});

document.querySelectorAll('[data-skin]').forEach(button=>button.addEventListener('click',()=>{
  skin=button.dataset.skin;
  previewForm();
}));

['artistName','artistType','bodyBuild','faceShape','hairStyle','hairColor','facialHair','accessory','outfitStyle'].forEach(id=>{
  document.getElementById(id).addEventListener('input',previewForm);
  document.getElementById(id).addEventListener('change',previewForm);
});
['shirtColor','pantsColor'].forEach(id=>{
  const element=document.getElementById(id);
  const update=()=>{
    document.getElementById('outfitPreset').value='custom';
    previewForm();
  };
  element.addEventListener('input',update);
  element.addEventListener('change',update);
});

document.getElementById('saveAvatar').onclick=()=>{
  avatarData=readForm();
  localStorage.setItem('mceAvatar',JSON.stringify(avatarData));
  localStorage.setItem('mceAvatarCoachSeen','1');
  if(window.MCE)state=window.MCE.save({name:avatarData.name});
  rebuildAvatar(avatarData);
  document.getElementById('notice').textContent='✓ Realism V2 artist saved. Your upgraded face, body, hair, fit and accessories now follow you through Music City.';
};
document.getElementById('premiumAvatarFile').addEventListener('change',async event=>{
  const file=event.target.files&&event.target.files[0];
  if(!file)return;
  const status=document.getElementById('premiumAvatarStatus');
  try{
    status.textContent='Importing '+file.name+'…';
    const previousId=avatarData.modelAssetId||'';
    const asset=await saveAvatarAsset(file);
    avatarData={...readForm(),modelAssetId:asset.id,modelAssetName:asset.name,modelUrl:''};
    localStorage.setItem('mceAvatar',JSON.stringify(avatarData));
    if(previousId&&previousId!==asset.id)deleteAvatarAsset(previousId).catch(()=>{});
    rebuildAvatar(avatarData);
    updatePremiumStatus();
    document.getElementById('notice').textContent='✓ Premium game-ready avatar imported. Music City will use it anywhere your saved artist appears.';
  }catch(error){
    status.textContent=error.message||'Could not import that premium avatar.';
  }finally{
    event.target.value='';
  }
});

document.getElementById('removePremiumAvatar').onclick=async()=>{
  const previousId=avatarData.modelAssetId||'';
  avatarData={...readForm(),modelAssetId:'',modelAssetName:'',modelUrl:''};
  localStorage.setItem('mceAvatar',JSON.stringify(avatarData));
  if(previousId)deleteAvatarAsset(previousId).catch(()=>{});
  rebuildAvatar(avatarData);
  updatePremiumStatus();
  document.getElementById('notice').textContent='Music City Realism V2 is active.';
};

document.getElementById('closeCustomizer').onclick=()=>{
  rebuildAvatar(avatarData);
  customizer.classList.remove('show');
};

updatePremiumStatus();

let tapStart=null;
const raycaster=new room.THREE.Raycaster();
const pointer=new room.THREE.Vector2();
room.renderer.domElement.addEventListener('pointerdown',event=>{
  tapStart={x:event.clientX,y:event.clientY};
});
room.renderer.domElement.addEventListener('pointerup',event=>{
  if(!tapStart||customizer.classList.contains('show'))return;
  const moved=Math.hypot(event.clientX-tapStart.x,event.clientY-tapStart.y);
  tapStart=null;
  if(moved>12)return;
  const avatarWorld=new room.THREE.Vector3();
  avatar.getWorldPosition(avatarWorld);
  avatarWorld.y=room.camera.position.y;
  if(room.camera.position.distanceTo(avatarWorld)>4.4)return;
  const rect=room.renderer.domElement.getBoundingClientRect();
  pointer.x=((event.clientX-rect.left)/rect.width)*2-1;
  pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,room.camera);
  if(raycaster.intersectObject(avatar,true).length)openCustomizer();
});
