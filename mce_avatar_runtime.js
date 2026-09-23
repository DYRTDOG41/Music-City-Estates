import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/utils/SkeletonUtils.js';

const MODEL_CACHE=new Map();
const ANIMATION_DONOR_URL='https://cdn.jsdelivr.net/gh/J-Ponzo/gltf-universal-animation-library@e24c23cf2a1323488a3faa226ea7ea21f644b73e/glTF/AnimationLibrary_Godot_Standard.gltf';
const RETARGETER_URL='https://cdn.jsdelivr.net/gh/upf-gti/retargeting-threejs@82f1b8218813547224dd96df1638c950d241824d/retargeting.js';
let animationDonorPromise=null;
let retargeterModulePromise=null;
let loaderBundle=null;

function createLoader(renderer){
  if(loaderBundle)return loaderBundle;

  const manager=new THREE.LoadingManager();

  const draco=new DRACOLoader(manager);
  draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/libs/draco/');
  draco.setWorkerLimit(2);

  const ktx2=new KTX2Loader(manager);
  ktx2.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/libs/basis/');
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

function normalizedBoneName(name){
  return String(name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
}

function findAttachmentBone(model,target){
  const wanted=String(target||'').toLowerCase();
  const candidates=[];
  model.traverse(object=>{
    if(object.isBone)candidates.push(object);
  });

  const patterns=wanted==='leftHand'
    ? ['lefthand','handl','lhand','mixamoriglefthand']
    : wanted==='head'
      ? ['head','mixamorighead']
      : ['righthand','handr','rhand','mixamorigrighthand'];

  for(const pattern of patterns){
    const match=candidates.find(bone=>normalizedBoneName(bone.name).includes(pattern));
    if(match)return match;
  }
  return null;
}

function migrateAttachments(host,model){
  const attachments=host.userData&&Array.isArray(host.userData.avatarAttachments)
    ?host.userData.avatarAttachments
    :[];

  for(const attachment of attachments){
    const object=attachment&&attachment.object;
    if(!object)continue;
    const bone=findAttachmentBone(model,attachment.target);
    if(!bone)continue;
    try{
      bone.attach(object);
    }catch(error){
      bone.add(object);
    }
  }
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
    idle:['musiccityhumanidle','idle','standing','stand','breath'],
    timing:['dance','groove','bounce','hiphop','rap'],
    presence:['thumbsup','yes','perform','stage','gesture','talk','rap'],
    crowd:['wave','point','cheer','crowd','gesture'],
    walk:['walking','walk','locomotion'],
    run:['running','run','jog']
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

function normalizedRigName(name){
  return String(name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
}

function collectHumanoidRig(model){
  const bones=[];
  model.traverse(object=>{
    if(object.isBone)bones.push(object);
  });

  function find(patterns){
    for(const pattern of patterns){
      const hit=bones.find(bone=>normalizedRigName(bone.name).includes(pattern));
      if(hit)return hit;
    }
    return null;
  }

  return {
    hips:find(['hips','pelvis']),
    spine:find(['spine2','spine1','spine']),
    chest:find(['upperchest','chest']),
    neck:find(['neck']),
    head:find(['head']),
    leftUpperArm:find(['leftupperarm','upperarml','lupperarm','leftarm','armleft','mixamorigleftarm']),
    rightUpperArm:find(['rightupperarm','upperarmr','rupperarm','rightarm','armright','mixamorigrightarm']),
    leftForeArm:find(['leftforearm','forearml','lforearm','leftlowerarm','mixamorigleftforearm']),
    rightForeArm:find(['rightforearm','forearmr','rforearm','rightlowerarm','mixamorigrightforearm']),
    leftHand:find(['lefthand','handl','lhand','mixamoriglefthand']),
    rightHand:find(['righthand','handr','rhand','mixamorigrighthand']),
    leftUpperLeg:find(['leftupleg','leftupperleg','thighl','lthigh','mixamorigleftupleg']),
    rightUpperLeg:find(['rightupleg','rightupperleg','thighr','rthigh','mixamorigrightupleg']),
    leftLowerLeg:find(['leftleg','leftlowerleg','calfl','lcalf','mixamorigleftleg']),
    rightLowerLeg:find(['rightleg','rightlowerleg','calfr','rcalf','mixamorigrightleg'])
  };
}

function createBonePoseRig(model){
  const rig=collectHumanoidRig(model);
  const rest=new Map();

  for(const bone of Object.values(rig)){
    if(bone&&bone.quaternion)rest.set(bone,bone.quaternion.clone());
  }

  const tempEuler=new THREE.Euler();
  const tempQuat=new THREE.Quaternion();
  const modelWorldQ=new THREE.Quaternion();
  const parentWorldQ=new THREE.Quaternion();
  const desiredWorld=new THREE.Vector3();
  const desiredParent=new THREE.Vector3();
  const restDirParent=new THREE.Vector3();
  const deltaQuat=new THREE.Quaternion();
  const inverseParentQ=new THREE.Quaternion();
  const leftUpperTarget=new THREE.Vector3();
  const rightUpperTarget=new THREE.Vector3();
  const leftForeTarget=new THREE.Vector3();
  const rightForeTarget=new THREE.Vector3();

  function compose(bone,x=0,y=0,z=0){
    if(!bone)return;
    const base=rest.get(bone);
    if(!base)return;
    tempEuler.set(x,y,z,'XYZ');
    tempQuat.setFromEuler(tempEuler);
    bone.quaternion.copy(base).multiply(tempQuat);
  }

  function aimBone(bone,child,desiredModelDirection){
    if(!bone||!child||!bone.parent)return false;
    const base=rest.get(bone);
    if(!base)return false;

    model.updateMatrixWorld(true);

    restDirParent.copy(child.position);
    if(restDirParent.lengthSq()<1e-8)return false;
    restDirParent.normalize().applyQuaternion(base).normalize();

    model.getWorldQuaternion(modelWorldQ);
    desiredWorld.copy(desiredModelDirection).normalize().applyQuaternion(modelWorldQ);

    bone.parent.getWorldQuaternion(parentWorldQ);
    inverseParentQ.copy(parentWorldQ).invert();
    desiredParent.copy(desiredWorld).applyQuaternion(inverseParentQ).normalize();

    deltaQuat.setFromUnitVectors(restDirParent,desiredParent);
    bone.quaternion.copy(deltaQuat).multiply(base);
    return true;
  }

  function poseArm(side,upperTarget,foreTarget){
    const upper=side==='left'?rig.leftUpperArm:rig.rightUpperArm;
    const fore=side==='left'?rig.leftForeArm:rig.rightForeArm;
    const hand=side==='left'?rig.leftHand:rig.rightHand;

    if(!aimBone(upper,fore,upperTarget))return;
    model.updateMatrixWorld(true);
    if(hand)aimBone(fore,hand,foreTarget);
  }

  function naturalArmTargets(elapsed=0,performance=false){
    const slow=Math.sin(elapsed*.82);
    const handSwing=Math.sin(elapsed*1.35);
    const performanceSwing=performance?Math.sin(elapsed*2.3)*.025:0;

    // Relaxed asymmetry: elbows stay slightly bent and the hands do not hang on a ruler-straight line.
    leftUpperTarget.set(-.16-slow*.018,-.972,.08+handSwing*.025+performanceSwing);
    rightUpperTarget.set(.14+slow*.016,-.978,-.055-handSwing*.022-performanceSwing);
    leftForeTarget.set(.045,-.955,.292+handSwing*.025);
    rightForeTarget.set(-.035,-.968,.238-handSwing*.022);
    return {
      leftUpper:leftUpperTarget,
      rightUpper:rightUpperTarget,
      leftFore:leftForeTarget,
      rightFore:rightForeTarget
    };
  }

  function relaxed(elapsed=0,performance=false){
    const breathe=Math.sin(elapsed*1.8);
    const sway=Math.sin(elapsed*.72);
    const nod=Math.sin(elapsed*.48);
    const targets=naturalArmTargets(elapsed,performance);

    // Solve shoulder→elbow and elbow→hand directions instead of assuming bone-local axes.
    // This reliably converts Avaturn's T-pose into arms-at-sides across different body rigs.
    poseArm('left',targets.leftUpper,targets.leftFore);
    poseArm('right',targets.rightUpper,targets.rightFore);

    compose(rig.leftHand,0,0,.018);
    compose(rig.rightHand,0,0,-.018);

    compose(rig.spine,breathe*.01,sway*.012,sway*.004);
    compose(rig.chest,breathe*.014,sway*.016,-sway*.006);
    compose(rig.neck,nod*.009,sway*.012,0);
    compose(rig.head,nod*.015,sway*.021,Math.sin(elapsed*.37)*.006);

    compose(rig.leftUpperLeg,performance?Math.sin(elapsed*2.2)*.014:0,0,0);
    compose(rig.rightUpperLeg,performance?-Math.sin(elapsed*2.2)*.014:0,0,0);
  }

  function perform(type,t,elapsed){
    const wave=Math.sin(t*Math.PI);
    const beat=Math.sin(elapsed*8);

    if(type==='timing'){
      poseArm(
        'left',
        leftUpperTarget.set(-.18-beat*.08*wave,-.97,beat*.05*wave),
        leftForeTarget.set(.02,-.995,beat*.05*wave)
      );
      poseArm(
        'right',
        rightUpperTarget.set(.18+beat*.08*wave,-.97,-beat*.05*wave),
        rightForeTarget.set(-.02,-.995,-beat*.05*wave)
      );
      compose(rig.chest,.018,beat*.018*wave,0);
      compose(rig.head,0,beat*.028*wave,0);
    }else if(type==='presence'){
      poseArm(
        'left',
        leftUpperTarget.set(-.62*wave-.12*(1-wave),-.78-.2*(1-wave),0),
        leftForeTarget.set(-.42*wave+.02*(1-wave),-.9,0)
      );
      poseArm(
        'right',
        rightUpperTarget.set(.62*wave+.12*(1-wave),-.78-.2*(1-wave),0),
        rightForeTarget.set(.42*wave-.02*(1-wave),-.9,0)
      );
      compose(rig.chest,-.025,0,0);
      compose(rig.head,-.018,0,0);
    }else if(type==='crowd'){
      poseArm(
        'left',
        leftUpperTarget.set(-.14,-.985,0),
        leftForeTarget.set(.02,-.995,0)
      );
      poseArm(
        'right',
        rightUpperTarget.set(.72,-.52,Math.sin(t*Math.PI*2)*.18),
        rightForeTarget.set(.5,-.72,Math.sin(t*Math.PI*2)*.18)
      );
      compose(rig.chest,0,Math.sin(t*Math.PI*2)*.08,0);
      compose(rig.head,0,Math.sin(t*Math.PI*2)*.12,0);
    }
  }

  return {
    rig,
    hasArms:Boolean(rig.leftUpperArm&&rig.rightUpperArm&&rig.leftForeArm&&rig.rightForeArm),
    relaxed,
    perform,
    restore(){
      for(const [bone,q] of rest)bone.quaternion.copy(q);
    }
  };
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

function canonicalBoneKey(name){
  const n=normalizedRigName(name);
  const tests=[
    ['hips',['hips','pelvis']],
    ['spine2',['spine003','spine3','spine2','upperchest','chest2']],
    ['spine1',['spine002','spine2','spine1','chest1']],
    ['spine',['spine001','spine1','spine']],
    ['neck',['neck']],
    ['head',['head']],
    ['leftShoulder',['leftshoulder','shoulderl']],
    ['rightShoulder',['rightshoulder','shoulderr']],
    ['leftForeArm',['leftforearm','leftlowerarm','forearml']],
    ['rightForeArm',['rightforearm','rightlowerarm','forearmr']],
    ['leftUpperArm',['leftupperarm','leftarm','upperarml']],
    ['rightUpperArm',['rightupperarm','rightarm','upperarmr']],
    ['leftHand',['lefthand','handl']],
    ['rightHand',['righthand','handr']],
    ['leftUpperLeg',['leftupleg','leftupperleg','leftthigh','thighl']],
    ['rightUpperLeg',['rightupleg','rightupperleg','rightthigh','thighr']],
    ['leftLowerLeg',['leftleg','leftlowerleg','leftcalf','calfl','shinl']],
    ['rightLowerLeg',['rightleg','rightlowerleg','rightcalf','calfr','shinr']],
    ['leftFoot',['leftfoot','footl']],
    ['rightFoot',['rightfoot','footr']],
    ['leftToe',['lefttoebase','lefttoe','toel']],
    ['rightToe',['righttoebase','righttoe','toer']]
  ];
  for(const [key,patterns] of tests){
    if(patterns.some(pattern=>n.includes(pattern)))return key;
  }
  return '';
}

function findPrimarySkinnedMesh(root){
  let result=null;
  root.traverse(object=>{
    if(!result&&object.isSkinnedMesh&&object.skeleton)result=object;
  });
  return result;
}

function buildBoneLookupFromSkeleton(skeleton){
  const map=new Map();
  for(const bone of skeleton?.bones||[]){
    const key=canonicalBoneKey(bone.name);
    if(key&&!map.has(key))map.set(key,bone.name);
  }
  return map;
}

async function loadAnimationDonor(renderer){
  if(animationDonorPromise)return animationDonorPromise;
  animationDonorPromise=(async()=>{
    const loader=createLoader(renderer).gltf;
    const gltf=await loader.loadAsync(ANIMATION_DONOR_URL);
    const skin=findPrimarySkinnedMesh(gltf.scene);
    if(!skin)throw new Error('Human animation donor did not contain a skinned humanoid.');
    return {gltf,skin};
  })().catch(error=>{
    animationDonorPromise=null;
    throw error;
  });
  return animationDonorPromise;
}

async function loadRetargeter(){
  if(retargeterModulePromise)return retargeterModulePromise;
  retargeterModulePromise=import(RETARGETER_URL)
    .then(mod=>{
      if(typeof mod.AnimationRetargeting!=='function'){
        throw new Error('AnimationRetargeting module did not expose its retargeter.');
      }
      return mod.AnimationRetargeting;
    })
    .catch(error=>{
      retargeterModulePromise=null;
      throw error;
    });
  return retargeterModulePromise;
}

function clipTrackBoneKey(trackName){
  const raw=String(trackName||'').replace(/\.(position|quaternion|scale)$/i,'');
  return canonicalBoneKey(raw);
}

function quaternionTrackRange(track){
  const values=track?.values;
  if(!values||values.length<8)return 0;
  const base=new THREE.Quaternion(values[0],values[1],values[2],values[3]).normalize();
  let maxAngle=0;
  for(let i=4;i+3<values.length;i+=4){
    const q=new THREE.Quaternion(values[i],values[i+1],values[i+2],values[i+3]).normalize();
    maxAngle=Math.max(maxAngle,base.angleTo(q));
  }
  return maxAngle;
}

function positionTrackRange(track){
  const values=track?.values;
  if(!values||values.length<6)return {horizontal:0,vertical:0};
  let minX=values[0],maxX=values[0],minY=values[1],maxY=values[1],minZ=values[2],maxZ=values[2];
  for(let i=3;i+2<values.length;i+=3){
    minX=Math.min(minX,values[i]);maxX=Math.max(maxX,values[i]);
    minY=Math.min(minY,values[i+1]);maxY=Math.max(maxY,values[i+1]);
    minZ=Math.min(minZ,values[i+2]);maxZ=Math.max(maxZ,values[i+2]);
  }
  return {
    horizontal:Math.hypot(maxX-minX,maxZ-minZ),
    vertical:maxY-minY
  };
}

function humanMotionStats(clip){
  const stats={
    clip,
    duration:Number(clip?.duration)||0,
    rootHorizontal:0,
    rootVertical:0,
    arm:0,
    leg:0,
    torso:0,
    head:0,
    total:0
  };

  for(const track of clip?.tracks||[]){
    const key=clipTrackBoneKey(track.name);
    const lower=String(track.name||'').toLowerCase();

    if(track.ValueTypeName==='quaternion'||lower.endsWith('.quaternion')){
      const range=quaternionTrackRange(track);
      stats.total+=range;
      if(/upperarm|forearm|hand|shoulder/i.test(key))stats.arm+=range;
      else if(/upperleg|lowerleg|foot|toe/i.test(key))stats.leg+=range;
      else if(/spine|hips|chest/i.test(key))stats.torso+=range;
      else if(/head|neck/i.test(key))stats.head+=range;
    }else if((track.ValueTypeName==='vector'||lower.endsWith('.position'))&&(key==='hips'||lower.includes('root'))){
      const range=positionTrackRange(track);
      stats.rootHorizontal=Math.max(stats.rootHorizontal,range.horizontal);
      stats.rootVertical=Math.max(stats.rootVertical,range.vertical);
    }
  }

  return stats;
}

function selectHumanIdleClip(clips){
  const scored=(clips||[])
    .map(humanMotionStats)
    .filter(s=>s.duration>=.7&&s.duration<=12&&s.total>.025)
    .map(s=>{
      let score=100;
      score-=Math.min(80,s.rootHorizontal*90);
      score-=Math.min(60,s.rootVertical*70);
      score-=Math.max(0,s.leg-1.1)*14;
      score-=Math.max(0,s.arm-2.1)*5;
      score-=Math.max(0,s.torso-1.1)*10;
      score-=Math.max(0,s.total-5.5)*3;
      score-=Math.abs(s.duration-3.2)*.45;

      // A believable idle should move, but not be completely frozen or wildly active.
      if(s.total<.12)score-=18;
      if(s.leg<.02&&s.arm<.02&&s.torso<.02)score-=30;
      if(s.rootHorizontal>.22||s.rootVertical>.38)score-=80;

      return {...s,score};
    })
    .sort((a,b)=>b.score-a.score);

  return scored[0]||null;
}

function buildSourceToTargetBoneMap(sourceSkeleton,targetSkeleton){
  const source=buildBoneLookupFromSkeleton(sourceSkeleton);
  const target=buildBoneLookupFromSkeleton(targetSkeleton);
  const map={};
  for(const [key,sourceName] of source){
    const targetName=target.get(key);
    if(sourceName&&targetName)map[sourceName]=targetName;
  }
  return map;
}

function buildTargetToSourceBoneMap(sourceSkeleton,targetSkeleton){
  const source=buildBoneLookupFromSkeleton(sourceSkeleton);
  const target=buildBoneLookupFromSkeleton(targetSkeleton);
  const map={};
  for(const [key,targetName] of target){
    const sourceName=source.get(key);
    if(sourceName&&targetName)map[targetName]=sourceName;
  }
  return map;
}

async function retargetHumanIdle(model,renderer){
  try{
    const targetSkin=findPrimarySkinnedMesh(model);
    if(!targetSkin)return {clips:[],animationRoot:null};

    const {gltf,skin:sourceSkin}=await loadAnimationDonor(renderer);
    const selected=selectHumanIdleClip(gltf.animations||[]);
    if(!selected){
      console.warn('Music City could not identify a safe human idle clip.');
      return {clips:[],animationRoot:null};
    }

    let retargeted=null;

    // Preferred path: bind-pose-aware retargeting designed for dissimilar humanoid rigs.
    try{
      const AnimationRetargeting=await loadRetargeter();
      const boneNameMap=buildSourceToTargetBoneMap(sourceSkin.skeleton,targetSkin.skeleton);
      if(Object.keys(boneNameMap).length>=10){
        const retargeter=new AnimationRetargeting(
          sourceSkin.skeleton,
          targetSkin.skeleton,
          {
            boneNameMap,
            srcEmbedWorldTransforms:true,
            trgEmbedWorldTransforms:true
          }
        );
        retargeted=retargeter.retargetAnimation(selected.clip);
      }
    }catch(error){
      console.warn('Bind-pose-aware human retargeter unavailable; trying Three.js fallback.',error);
    }

    // Fallback path stays inside Three.js if the helper module is unavailable.
    if(!retargeted||!retargeted.tracks?.length){
      const targetToSource=buildTargetToSourceBoneMap(sourceSkin.skeleton,targetSkin.skeleton);
      const sourceLookup=buildBoneLookupFromSkeleton(sourceSkin.skeleton);
      const matched=Object.keys(targetToSource).length;
      if(matched<10)return {clips:[],animationRoot:null};

      retargeted=SkeletonUtils.retargetClip(
        targetSkin,
        sourceSkin.skeleton,
        selected.clip,
        {
          hip:sourceLookup.get('hips')||'DEF-hips',
          names:targetToSource,
          preserveBoneMatrix:true,
          preserveBonePositions:true,
          useFirstFramePosition:false,
          hipInfluence:new THREE.Vector3(0,1,0),
          scale:1
        }
      );
    }

    retargeted.name='MusicCityHumanIdle';
    model.userData.animationRetargetSource='Quaternius Universal Animation Library CC0';
    model.userData.animationIdleScore=Number(selected.score.toFixed(2));
    model.userData.animationIdleStats={
      duration:Number(selected.duration.toFixed(2)),
      rootHorizontal:Number(selected.rootHorizontal.toFixed(3)),
      rootVertical:Number(selected.rootVertical.toFixed(3)),
      arm:Number(selected.arm.toFixed(3)),
      leg:Number(selected.leg.toFixed(3)),
      torso:Number(selected.torso.toFixed(3))
    };

    return {clips:[retargeted],animationRoot:targetSkin};
  }catch(error){
    console.warn('Music City human animation donor unavailable; using procedural fallback.',error);
    return {clips:[],animationRoot:null};
  }
}


function createController(model,clips,animationRoot=model){
  const mixer=new THREE.AnimationMixer(animationRoot||model);
  const actions=new Map();
  const morphs=collectMorphBindings(model);
  const bonePose=createBonePoseRig(model);

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

    if(current){
      current.fadeOut(.12);
      current=null;
    }
    procedural={type,elapsed:0,duration:duration/1000};
    return true;
  }

  function forceNeutralPose(){
    clearTimeout(oneShotTimer);
    mixer.stopAllAction();
    actions.clear();
    current=null;
    procedural=null;
    performanceActive=false;
    setMorph(morphs.jaw,0);
    model.position.copy(basePosition);
    model.rotation.copy(baseRotation);
    model.scale.copy(baseScale);
    bonePose.restore();
    bonePose.relaxed(elapsed,false);
  }

  function setPerformanceActive(on){
    performanceActive=Boolean(on);
    if(!performanceActive){
      forceNeutralPose();
      if(!play('idle',{loop:true,fade:.22}))bonePose.relaxed(elapsed,false);
    }
  }

  function update(dt){
    dt=Math.max(0,Math.min(.1,Number(dt)||0));
    elapsed+=dt;
    mixer.update(dt);

    const usingAnimation=Boolean(current&&current.isRunning&&current.isRunning());

    // When the imported GLB has no animation clips, drive its humanoid bones directly.
    if(!usingAnimation&&bonePose.hasArms){
      bonePose.relaxed(elapsed,performanceActive);
    }

    const blinkCycle=elapsed%4.7;
    const blink=blinkCycle>4.52?Math.sin(((blinkCycle-4.52)/.18)*Math.PI):0;
    setMorph(morphs.blinkBoth,blink);
    setMorph(morphs.blinkLeft,blink);
    setMorph(morphs.blinkRight,blink);

    const jaw=performanceActive?(.035+Math.abs(Math.sin(elapsed*8.2))*.12):0;
    setMorph(morphs.jaw,jaw);

    if(performanceActive){
      model.position.y=basePosition.y+Math.sin(elapsed*5.4)*.012;
    }else if(!procedural){
      model.position.y=basePosition.y;
    }

    if(procedural){
      procedural.elapsed+=dt;
      const t=Math.min(1,procedural.elapsed/procedural.duration);
      const ease=Math.sin(Math.PI*t);

      if(!usingAnimation&&bonePose.hasArms){
        bonePose.perform(procedural.type,t,elapsed);
      }

      if(procedural.type==='timing'){
        model.position.y=basePosition.y+Math.abs(Math.sin(elapsed*11))*.055*ease;
        model.rotation.z=baseRotation.z+Math.sin(elapsed*8.5)*.045*ease;
      }else if(procedural.type==='presence'){
        const lift=1+.018*ease;
        model.scale.set(baseScale.x*lift,baseScale.y*lift,baseScale.z*lift);
        model.rotation.x=baseRotation.x-.025*ease;
      }else if(procedural.type==='crowd'){
        model.rotation.y=baseRotation.y+Math.sin(t*Math.PI*2)*.16*ease;
      }

      if(t>=1){
        procedural=null;
        model.position.copy(basePosition);
        model.rotation.copy(baseRotation);
        model.scale.copy(baseScale);
        if(!play('idle',{loop:true,fade:.18})&&!usingAnimation&&bonePose.hasArms){
          bonePose.relaxed(elapsed,performanceActive);
        }
      }
    }
  }

  if(!play('idle',{loop:true,fade:0})){
    forceNeutralPose();
  }

  return {
    mixer,
    play,
    playPerformanceAction,
    setPerformanceActive,
    forceNeutralPose,
    update,
    rig:bonePose.rig,
    dispose(){
      clearTimeout(oneShotTimer);
      mixer.stopAllAction();
      actions.clear();
      bonePose.restore();
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

  // Avaturn's exported avatar faces the opposite local forward axis from Music City.
  // Rotate only Avaturn-generated models so generic imported GLBs keep their authored orientation.
  const isAvaturn=Boolean(data.avaturnAvatarId)||(data.avatarSource==='avaturn')||(data.source==='avaturn');
  if(isAvaturn){
    model.rotation.y+=Math.PI;
    model.userData.musicCityForwardCorrected=true;
  }

  if(host.userData&&host.userData.disposed)return null;

  const fallback=host.userData&&Array.isArray(host.userData.fallbackMeshes)
    ?host.userData.fallbackMeshes
    :[];
  fallback.forEach(mesh=>{mesh.visible=false});

  model.name='Music City Premium Avatar';
  host.add(model);
  migrateAttachments(host,model);
  host.userData.premiumModel=model;
  host.userData.avatarQuality='premium-glb';
  host.userData.avatarStats=stats;

  let runtimeClips=Array.isArray(gltf.animations)?[...gltf.animations]:[];
  let animationRoot=model;

  // Avaturn baseline policy:
  // Do not guess, auto-select, or retarget a donor idle at load time.
  // Some low-motion donor clips are seated/crouched poses, which can leave the
  // avatar floating as if an invisible chair is under it. Start every Avaturn
  // avatar from its own standing bind/rest pose and use the deterministic
  // humanoid bone controller for the neutral idle. Explicit walk/run/stage
  // clips can be mapped later once their names and rigs are known.
  if(isAvaturn){
    runtimeClips=[];
    animationRoot=model;
    host.userData.avatarAnimationSource='avaturn-procedural-neutral';
    host.userData.avatarAutoRetargetDisabled=true;
  }else if(runtimeClips.length===0){
    host.userData.avatarAnimationSource='procedural-fallback';
  }

  const controller=createController(model,runtimeClips,animationRoot);
  host.userData.avatarController=controller;
  host.userData.avatarRigBones=Object.fromEntries(
    Object.entries(controller.rig||{}).map(([key,bone])=>[key,bone?.name||''])
  );

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
