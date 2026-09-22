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
  return material.clone?material.clone():material;
}

function tuneMaterial(material){
  if(!material)return;
  const name=String(material.name||'').toLowerCase();

  if('envMapIntensity' in material){
    material.envMapIntensity=Math.max(Number(material.envMapIntensity)||0,1.18);
  }

  if(/skin|face|body/.test(name)){
    material.roughness=Math.min(.6,Number(material.roughness??.58));
    material.metalness=0;
    if('clearcoat' in material)material.clearcoat=Math.max(Number(material.clearcoat)||0,.035);
    if('clearcoatRoughness' in material)material.clearcoatRoughness=.82;
  }else if(/eye|cornea/.test(name)){
    material.roughness=Math.min(.2,Number(material.roughness??.18));
    material.metalness=0;
    if('clearcoat' in material)material.clearcoat=Math.max(Number(material.clearcoat)||0,.22);
    if('clearcoatRoughness' in material)material.clearcoatRoughness=.25;
  }else if(/hair|beard|brow|lash/.test(name)){
    material.roughness=Math.min(.5,Number(material.roughness??.48));
    material.metalness=0;
  }else if(/cloth|shirt|hood|pants|denim|cotton|fabric|jacket/.test(name)){
    material.roughness=Math.max(.62,Number(material.roughness??.72));
    material.metalness=Math.min(.08,Number(material.metalness||0));
    if('sheen' in material)material.sheen=Math.max(Number(material.sheen)||0,.16);
    if('sheenRoughness' in material)material.sheenRoughness=.72;
  }else if(/chain|jewel|watch|metal|zipper|buckle/.test(name)){
    material.roughness=Math.min(.3,Number(material.roughness??.28));
    material.metalness=Math.max(.72,Number(material.metalness||0));
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
  const stats={meshes:0,skinnedMeshes:0,morphMeshes:0,triangles:0};
  root.traverse(object=>{
    if(!object.isMesh)return;
    stats.meshes+=1;
    if(object.isSkinnedMesh)stats.skinnedMeshes+=1;
    if(object.morphTargetDictionary)stats.morphMeshes+=1;

    const geometry=object.geometry;
    if(geometry){
      const count=geometry.index?geometry.index.count:(geometry.attributes.position?geometry.attributes.position.count:0);
      stats.triangles+=Math.floor(count/3);
    }

    object.castShadow=true;
    object.receiveShadow=true;
    object.frustumCulled=true;
    object.material=cloneMaterial(object.material);
    if(Array.isArray(object.material))object.material.forEach(tuneMaterial);
    else tuneMaterial(object.material);
  });
  return stats;
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
    if(score>bestScore){
      best=clip;
      bestScore=score;
    }
  }
  return best;
}

function collectMorphBindings(model){
  const bindings={blinkLeft:[],blinkRight:[],blinkBoth:[],jaw:[]};

  model.traverse(object=>{
    if(!object.isMesh||!object.morphTargetDictionary||!object.morphTargetInfluences)return;

    for(const [rawName,index] of Object.entries(object.morphTargetDictionary)){
      const name=String(rawName).toLowerCase().replace(/[^a-z0-9]/g,'');
      const binding={mesh:object,index};

      if(/(eyeblinkleft|blinkleft|blinkl)/.test(name))bindings.blinkLeft.push(binding);
      else if(/(eyeblinkright|blinkright|blinkr)/.test(name))bindings.blinkRight.push(binding);
      else if(/(eyeblink|blink)/.test(name))bindings.blinkBoth.push(binding);

      if(/(jawopen|mouthopen|visemeaa|visemea|aa)/.test(name))bindings.jaw.push(binding);
    }
  });

  return bindings;
}

function setMorph(bindings,value){
  for(const binding of bindings){
    if(!binding.mesh||!binding.mesh.morphTargetInfluences)continue;
    binding.mesh.morphTargetInfluences[binding.index]=Math.max(0,Math.min(1,value));
  }
}

function createController(model,clips){
  const mixer=new THREE.AnimationMixer(model);
  const actions=new Map();
  const morphs=collectMorphBindings(model);

  let current=null;
  let oneShotTimer=null;
  let elapsed=0;
  let performanceActive=false;
  let procedural=null;

  const basePosition=model.position.clone();
  const baseRotation=model.rotation.clone();
  const baseScale=model.scale.clone();

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
    procedural=null;

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

  function playPerformanceAction(type){
    const kind=type==='timing'?'timing':type==='presence'?'presence':'crowd';
    const duration=type==='crowd'?2200:1800;
    if(play(kind,{loop:false,fade:.12,duration}))return true;

    procedural={type,elapsed:0,duration:duration/1000};
    return true;
  }

  function setPerformanceActive(on){
    performanceActive=Boolean(on);
    if(!performanceActive){
      setMorph(morphs.jaw,0);
      model.position.copy(basePosition);
      model.rotation.copy(baseRotation);
      model.scale.copy(baseScale);
      procedural=null;
      play('idle',{loop:true,fade:.22});
    }
  }

  function update(dt){
    dt=Math.max(0,Math.min(.1,Number(dt)||0));
    elapsed+=dt;
    mixer.update(dt);

    // Natural eye blinks for premium models with compatible facial morph targets.
    const blinkCycle=elapsed%4.7;
    const blink=blinkCycle>4.52?Math.sin(((blinkCycle-4.52)/.18)*Math.PI):0;
    setMorph(morphs.blinkBoth,blink);
    setMorph(morphs.blinkLeft,blink);
    setMorph(morphs.blinkRight,blink);

    // Subtle mouth articulation during a show. This is intentionally restrained;
    // true audio-driven visemes can be connected later without changing the avatar API.
    const jaw=performanceActive?(.035+Math.abs(Math.sin(elapsed*8.2))*.12):0;
    setMorph(morphs.jaw,jaw);

    if(performanceActive){
      model.position.y=basePosition.y+Math.sin(elapsed*5.4)*.012;
    }

    if(procedural){
      procedural.elapsed+=dt;
      const t=Math.min(1,procedural.elapsed/procedural.duration);
      const ease=Math.sin(Math.PI*t);

      if(procedural.type==='timing'){
        model.position.y=basePosition.y+Math.abs(Math.sin(elapsed*11))* .055*ease;
        model.rotation.z=baseRotation.z+Math.sin(elapsed*8.5)*.045*ease;
      }else if(procedural.type==='presence'){
        const lift=1+.028*ease;
        model.scale.set(baseScale.x*lift,baseScale.y*lift,baseScale.z*lift);
        model.rotation.x=baseRotation.x-.035*ease;
      }else if(procedural.type==='crowd'){
        model.rotation.y=baseRotation.y+Math.sin(t*Math.PI*2)*.42*ease;
      }

      if(t>=1){
        procedural=null;
        model.position.copy(basePosition);
        model.rotation.copy(baseRotation);
        model.scale.copy(baseScale);
      }
    }
  }

  play('idle',{loop:true,fade:0});

  return {
    mixer,
    play,
    playPerformanceAction,
    setPerformanceActive,
    update,
    dispose(){
      clearTimeout(oneShotTimer);
      mixer.stopAllAction();
      actions.clear();
      setMorph(morphs.blinkBoth,0);
      setMorph(morphs.blinkLeft,0);
      setMorph(morphs.blinkRight,0);
      setMorph(morphs.jaw,0);
    }
  };
}

async function fetchModel(url,renderer,cacheKey=url){
  if(MODEL_CACHE.has(cacheKey))return MODEL_CACHE.get(cacheKey);

  const loader=createLoader(renderer).gltf;
  const promise=loader.loadAsync(url);
  MODEL_CACHE.set(cacheKey,promise);

  try{
    return await promise;
  }catch(error){
    MODEL_CACHE.delete(cacheKey);
    throw error;
  }
}

export async function upgradeAvatarFromGLB(host,room,data={}){
  const url=String(data.modelUrl||data.avatarModelUrl||'').trim();
  if(!url)return null;

  const cacheKey=String(data.modelAssetId||url);
  const gltf=await fetchModel(url,room&&room.renderer,cacheKey);

  if(host.userData&&host.userData.disposed)return null;

  const model=SkeletonUtils.clone(gltf.scene);
  const stats=prepareModel(model);
  normalizeModel(model,Number(data.modelHeight)||3.18);

  if(host.userData&&host.userData.disposed)return null;

  const fallback=host.userData&&Array.isArray(host.userData.fallbackMeshes)
    ?host.userData.fallbackMeshes
    :[];
  fallback.forEach(mesh=>{mesh.visible=false});

  model.name='Music City Premium Avatar';
  host.add(model);
  host.userData.premiumModel=model;
  host.userData.avatarQuality='premium-glb';
  host.userData.avatarStats=stats;

  const controller=createController(model,gltf.animations||[]);
  host.userData.avatarController=controller;

  if(room&&Array.isArray(room.animated)){
    const updater=(time,dt)=>controller.update(dt);
    room.animated.push(updater);
    host.userData.avatarMixerUpdater=updater;
  }

  return {model,controller,gltf,stats};
}

export function disposeAvatarRuntime(){
  if(loaderBundle){
    try{loaderBundle.draco.dispose()}catch(error){}
    try{loaderBundle.ktx2.dispose()}catch(error){}
  }
  loaderBundle=null;
  MODEL_CACHE.clear();
}
