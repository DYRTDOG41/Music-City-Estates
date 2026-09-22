import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/utils/SkeletonUtils.js';

const MODEL_CACHE=new Map();
let loaderBundle=null;

function createLoader(renderer){
  if(loaderBundle)return loaderBundle;
  const manager=new THREE.LoadingManager();
  const draco=new DRACOLoader(manager);
  draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/');
  draco.setWorkerLimit(2);

  const ktx2=new KTX2Loader(manager);
  ktx2.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/basis/');
  ktx2.setWorkerLimit(2);
  if(renderer)ktx2.detectSupport(renderer);

  const gltf=new GLTFLoader(manager);
  gltf.setDRACOLoader(draco);
  gltf.setKTX2Loader(ktx2);
  gltf.setMeshoptDecoder(MeshoptDecoder);

  loaderBundle={manager,draco,ktx2,gltf};
  return loaderBundle;
}

function cloneMaterial(material){
  if(!material)return material;
  if(Array.isArray(material))return material.map(cloneMaterial);
  return material.clone ? material.clone() : material;
}

function tuneMaterial(material){
  if(!material)return;
  const name=String(material.name||'').toLowerCase();
  if('envMapIntensity' in material)material.envMapIntensity=Math.max(Number(material.envMapIntensity)||0,1.15);

  if(/skin|face|body/.test(name)){
    material.roughness=Math.min(.62,Number(material.roughness??.6));
    material.metalness=0;
    if('clearcoat' in material)material.clearcoat=Math.max(Number(material.clearcoat)||0,.05);
    if('clearcoatRoughness' in material)material.clearcoatRoughness=.72;
  }else if(/hair|beard|brow/.test(name)){
    material.roughness=Math.min(.52,Number(material.roughness??.5));
    material.metalness=0;
  }else if(/cloth|shirt|hood|pants|denim|cotton|fabric/.test(name)){
    material.roughness=Math.max(.64,Number(material.roughness??.72));
    material.metalness=Math.min(.08,Number(material.metalness||0));
    if('sheen' in material)material.sheen=Math.max(Number(material.sheen)||0,.14);
    if('sheenRoughness' in material)material.sheenRoughness=.72;
  }else if(/chain|jewel|watch|metal|zipper|buckle/.test(name)){
    material.roughness=Math.min(.32,Number(material.roughness??.28));
    material.metalness=Math.max(.7,Number(material.metalness||0));
  }

  for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap']){
    const texture=material[key];
    if(texture){
      texture.anisotropy=Math.max(texture.anisotropy||1,4);
      texture.needsUpdate=true;
    }
  }
  material.needsUpdate=true;
}

function prepareModel(root){
  root.traverse(object=>{
    if(!object.isMesh)return;
    object.castShadow=true;
    object.receiveShadow=true;
    object.frustumCulled=true;
    object.material=cloneMaterial(object.material);
    if(Array.isArray(object.material))object.material.forEach(tuneMaterial);
    else tuneMaterial(object.material);
  });
}

function normalizeModel(root,targetHeight=3.18){
  const box=new THREE.Box3().setFromObject(root);
  const size=new THREE.Vector3();
  box.getSize(size);
  if(size.y>0){
    const scale=targetHeight/size.y;
    root.scale.multiplyScalar(scale);
  }
  const newBox=new THREE.Box3().setFromObject(root);
  const center=new THREE.Vector3();
  newBox.getCenter(center);
  root.position.x-=center.x;
  root.position.z-=center.z;
  root.position.y-=newBox.min.y;
}

function clipScore(name,kind){
  const text=String(name||'').toLowerCase();
  const rules={
    idle:['idle','stand','breath'],
    timing:['dance','groove','bounce','hiphop','rap'],
    presence:['perform','stage','gesture','talk','rap'],
    crowd:['wave','point','cheer','crowd','gesture'],
    walk:['walk','locomotion'],
    run:['run','jog']
  };
  return (rules[kind]||[]).reduce((score,key)=>score+(text.includes(key)?1:0),0);
}

function pickClip(clips,kind){
  let best=null,bestScore=0;
  for(const clip of clips||[]){
    const score=clipScore(clip.name,kind);
    if(score>bestScore){best=clip;bestScore=score;}
  }
  return best;
}

function createController(model,clips){
  const mixer=new THREE.AnimationMixer(model);
  const actions=new Map();
  let current=null;
  let oneShotTimer=null;

  function actionFor(kind){
    if(actions.has(kind))return actions.get(kind);
    const clip=pickClip(clips,kind);
    if(!clip)return null;
    const action=mixer.clipAction(clip);
    actions.set(kind,action);
    return action;
  }

  function play(kind,{loop=true,fade=.2,duration=0}={}){
    const next=actionFor(kind);
    if(!next)return false;
    clearTimeout(oneShotTimer);
    if(current&&current!==next)current.fadeOut(fade);
    next.reset();
    next.enabled=true;
    next.setEffectiveWeight(1);
    next.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);
    next.clampWhenFinished=!loop;
    next.fadeIn(fade).play();
    current=next;
    if(!loop&&duration>0){
      oneShotTimer=setTimeout(()=>play('idle',{loop:true,fade:.25}),duration);
    }
    return true;
  }

  play('idle',{loop:true,fade:0});

  return {
    mixer,
    play,
    playPerformanceAction(type){
      const kind=type==='timing'?'timing':type==='presence'?'presence':'crowd';
      return play(kind,{loop:false,fade:.12,duration:type==='crowd'?2200:1800});
    },
    update(dt){mixer.update(Math.max(0,dt||0));},
    dispose(){
      clearTimeout(oneShotTimer);
      mixer.stopAllAction();
      actions.clear();
    }
  };
}

async function fetchModel(url,renderer){
  if(MODEL_CACHE.has(url))return MODEL_CACHE.get(url);
  const loader=createLoader(renderer).gltf;
  const promise=loader.loadAsync(url);
  MODEL_CACHE.set(url,promise);
  try{return await promise}
  catch(error){MODEL_CACHE.delete(url);throw error}
}

export async function upgradeAvatarFromGLB(host,room,data={}){
  const url=String(data.modelUrl||data.avatarModelUrl||'').trim();
  if(!url)return null;

  const gltf=await fetchModel(url,room&&room.renderer);
  const model=SkeletonUtils.clone(gltf.scene);
  prepareModel(model);
  normalizeModel(model,Number(data.modelHeight)||3.18);

  const fallback=host.userData&&Array.isArray(host.userData.fallbackMeshes)
    ? host.userData.fallbackMeshes
    : [];
  fallback.forEach(mesh=>{mesh.visible=false});

  model.name='Music City Premium Avatar';
  host.add(model);
  host.userData.premiumModel=model;
  host.userData.avatarQuality='premium-glb';

  const controller=createController(model,gltf.animations||[]);
  host.userData.avatarController=controller;

  if(room&&Array.isArray(room.animated)){
    const updater=(time,dt)=>controller.update(dt);
    room.animated.push(updater);
    host.userData.avatarMixerUpdater=updater;
  }

  return {model,controller,gltf};
}

export function disposeAvatarRuntime(){
  if(!loaderBundle)return;
  try{loaderBundle.draco.dispose()}catch(error){}
  try{loaderBundle.ktx2.dispose()}catch(error){}
  loaderBundle=null;
  MODEL_CACHE.clear();
}
