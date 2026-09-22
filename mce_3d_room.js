import * as THREE from 'three';

export function createRoom(options={}) {
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(options.background||0x0b0c12);
  scene.fog=new THREE.FogExp2(options.fog||0x11121a,options.fogDensity||0.016);
  const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.08,180);
  camera.position.fromArray(options.spawn||[0,1.7,8]);
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=options.exposure||1.28;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  document.body.prepend(renderer.domElement);renderer.domElement.tabIndex=0;
  const hemisphere=new THREE.HemisphereLight(options.sky||0x9bb7d2,options.ground||0x302938,options.hemisphereIntensity||1.55);
  const ambient=new THREE.AmbientLight(options.ambientColor||0xc7d5e5,options.ambientIntensity||.58);
  const daylight=new THREE.DirectionalLight(options.daylightColor||0xffeed8,options.daylightIntensity||1.05);
  daylight.position.set(8,14,10);daylight.castShadow=false;
  scene.add(hemisphere,ambient,daylight);
  const keys={},colliders=[],interactions=[],animated=[];
  let yaw=options.yaw||0,pitch=0,drag=false,lastX=0,lastY=0,current=null,last=performance.now();
  let joystickX=0,joystickY=0,cameraOverride=null;
  const prompt=document.getElementById('interactPrompt');
  const material=(color,rough=.78,metal=.12)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
  function box(name,size,pos,color,opts={}){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),opts.material||material(color,opts.roughness,opts.metalness));mesh.name=name;mesh.position.fromArray(pos);mesh.castShadow=opts.cast!==false;mesh.receiveShadow=opts.receive!==false;scene.add(mesh);if(opts.collider)colliders.push(new THREE.Box3().setFromObject(mesh));return mesh}
  function cylinder(name,r,h,pos,color,opts={}){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,20),material(color,opts.roughness,opts.metalness));mesh.name=name;mesh.position.fromArray(pos);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh}
  function label(text,pos,color='#ffffff',scale=[4,1]){const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d'),lines=String(text).split('\n');x.font=`900 ${lines.length>1?68:92}px Arial`;x.textAlign='center';x.textBaseline='middle';x.shadowBlur=22;x.shadowColor=color;x.fillStyle=color;lines.forEach((line,index)=>x.fillText(line,c.width/2,c.height/2+(index-(lines.length-1)/2)*(lines.length>1?76:0)));const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:true}));s.position.fromArray(pos);s.scale.set(scale[0],scale[1],1);scene.add(s);return s}
  function light(color,intensity,pos,distance=22){const l=new THREE.PointLight(color,intensity,distance,2);l.position.fromArray(pos);l.castShadow=true;scene.add(l);return l}
  function marker(pos,color=0xff315b){const g=new THREE.Mesh(new THREE.TorusGeometry(.7,.055,10,38),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}));g.rotation.x=Math.PI/2;g.position.set(pos[0],.035,pos[2]);scene.add(g);animated.push(t=>{g.rotation.z=t*.0018;g.material.opacity=.55+Math.sin(t*.004)*.3});return g}
  function interact(labelText,pos,action,radius=2.5,color){const markerMesh=marker(pos,color);const item={label:labelText,pos:new THREE.Vector3(...pos),action,radius,marker:markerMesh,markerColor:markerMesh.material.color.getHex()};interactions.push(item);return item}
  function wallBounds(width,depth,height=5){box('floor',[width,.2,depth],[0,-.1,0],options.floorColor||0x37323d,{receive:true,roughness:.82,metalness:.05});box('back wall',[width,height,.35],[0,height/2,-depth/2],options.wallColor||0x443844,{collider:true,roughness:.86,metalness:.04});box('left wall',[.35,height,depth],[-width/2,height/2,0],options.sideWallColor||0x3b343f,{collider:true,roughness:.86,metalness:.04});box('right wall',[.35,height,depth],[width/2,height/2,0],options.sideWallColor||0x3b343f,{collider:true,roughness:.86,metalness:.04});box('front-left',[width*.38,height,.35],[-width*.31,height/2,depth/2],options.sideWallColor||0x3b343f,{collider:true,roughness:.86,metalness:.04});box('front-right',[width*.38,height,.35],[width*.31,height/2,depth/2],options.sideWallColor||0x3b343f,{collider:true,roughness:.86,metalness:.04})}
  function blocked(p){const r=.35;return colliders.some(b=>p.x>b.min.x-r&&p.x<b.max.x+r&&p.z>b.min.z-r&&p.z<b.max.z+r)}
  function activate(){if(current)current.action()}
  function setupMobileJoystick(){
    const legacy=document.querySelector('.touch');
    if(legacy)legacy.style.setProperty('display','none','important');
    if(!(matchMedia('(pointer:coarse)').matches||innerWidth<=820))return;

    const style=document.createElement('style');
    style.textContent=
      '.mce-joystick-zone{position:fixed;z-index:22;left:0;bottom:0;width:58%;height:52%;touch-action:none;user-select:none;-webkit-user-select:none}'+
      '.mce-joystick-base{position:absolute;width:112px;height:112px;margin:-56px 0 0 -56px;border:1px solid #ffffff55;border-radius:50%;background:#05080d66;box-shadow:inset 0 0 26px #0008;backdrop-filter:blur(4px);opacity:0;transform:scale(.82);transition:opacity .1s ease,transform .1s ease;pointer-events:none}'+
      '.mce-joystick-zone.active .mce-joystick-base{opacity:.86;transform:scale(1)}'+
      '.mce-joystick-knob{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px;border:1px solid #ffffffa0;border-radius:50%;background:#ffffff30;box-shadow:0 0 18px #0008;transform:translate(0,0)}'+
      '.mce-joystick-help{position:absolute;left:17px;bottom:max(18px,env(safe-area-inset-bottom));color:#ffffff99;font:800 9px Arial,sans-serif;letter-spacing:.08em;text-shadow:0 1px 4px #000;pointer-events:none;animation:mceJoyHint 4.5s ease forwards}'+
      '@keyframes mceJoyHint{0%,55%{opacity:.72}100%{opacity:0}}';
    document.head.appendChild(style);

    const zone=document.createElement('div');
    zone.className='mce-joystick-zone';
    zone.setAttribute('aria-label','Touch and drag to move');
    zone.innerHTML='<div class="mce-joystick-base"><div class="mce-joystick-knob"></div></div><div class="mce-joystick-help">TOUCH + DRAG TO MOVE</div>';
    document.body.appendChild(zone);
    const base=zone.querySelector('.mce-joystick-base');
    const knob=zone.querySelector('.mce-joystick-knob');
    let pointerId=null,originX=0,originY=0;
    const maxTravel=42;

    function setOrigin(event){
      const rect=zone.getBoundingClientRect();
      originX=event.clientX;
      originY=event.clientY;
      base.style.left=(originX-rect.left)+'px';
      base.style.top=(originY-rect.top)+'px';
      joystickX=0;joystickY=0;
      knob.style.transform='translate(0px,0px)';
      zone.classList.add('active');
    }
    function update(event){
      if(event.pointerId!==pointerId)return;
      let dx=event.clientX-originX,dy=event.clientY-originY;
      const distance=Math.hypot(dx,dy);
      if(distance>maxTravel){dx=dx/distance*maxTravel;dy=dy/distance*maxTravel}
      const dead=5;
      joystickX=Math.abs(dx)<dead?0:dx/maxTravel;
      joystickY=Math.abs(dy)<dead?0:-dy/maxTravel;
      knob.style.transform='translate('+dx+'px,'+dy+'px)';
    }
    function release(event){
      if(pointerId===null||(event&&event.pointerId!==pointerId))return;
      joystickX=0;joystickY=0;pointerId=null;
      knob.style.transform='translate(0px,0px)';
      zone.classList.remove('active');
    }
    zone.addEventListener('pointerdown',event=>{
      if(pointerId!==null)return;
      event.preventDefault();event.stopPropagation();
      pointerId=event.pointerId;zone.setPointerCapture?.(pointerId);
      setOrigin(event);
    });
    zone.addEventListener('pointermove',event=>{if(pointerId===null)return;event.preventDefault();update(event)});
    zone.addEventListener('pointerup',release);
    zone.addEventListener('pointercancel',release);
    addEventListener('blur',()=>release());
  }

  addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='e')activate()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
  renderer.domElement.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId)});
  renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-lastX)*.004;pitch=Math.max(-1.15,Math.min(1.15,pitch-(e.clientY-lastY)*.003));lastX=e.clientX;lastY=e.clientY});
  renderer.domElement.addEventListener('pointerup',()=>drag=false);renderer.domElement.addEventListener('pointercancel',()=>drag=false);prompt?.addEventListener('click',activate);
  document.querySelectorAll('[data-move]').forEach(b=>{const k=b.dataset.move;b.addEventListener('pointerdown',e=>{e.preventDefault();keys[k]=true});['pointerup','pointercancel','pointerleave'].forEach(n=>b.addEventListener(n,()=>keys[k]=false))});
  addEventListener('mce:navigator:focus',event=>{
    const mission=event&&event.detail&&event.detail.mission||{};
    const wanted=String(mission.focus||mission.title||'').toUpperCase();
    if(!wanted)return;
    const target=interactions.find(item=>String(item.label||'').toUpperCase().includes(wanted));
    if(!target)return;

    const dx=target.pos.x-camera.position.x,dz=target.pos.z-camera.position.z;
    if(Math.abs(dx)+Math.abs(dz)>.01){
      yaw=Math.atan2(-dx,-dz);
      pitch=0;
    }

    if(target.marker){
      target.marker.scale.setScalar(2.15);
      target.marker.material.color.setHex(0x59e7ff);
      target.marker.material.opacity=1;
      setTimeout(()=>{
        if(!target.marker)return;
        target.marker.scale.setScalar(1);
        target.marker.material.color.setHex(target.markerColor);
      },5200);
    }

    let beacon=document.getElementById('mceNavigatorBeacon');
    if(!beacon){
      beacon=document.createElement('div');
      beacon.id='mceNavigatorBeacon';
      beacon.style.cssText='position:fixed;z-index:80;left:50%;top:max(78px,calc(env(safe-area-inset-top) + 68px));transform:translateX(-50%);max-width:min(420px,86vw);padding:9px 13px;border:1px solid #66e6ff;border-radius:999px;background:#06111ddb;color:#eaffff;font:900 10px Arial,sans-serif;letter-spacing:.07em;text-align:center;box-shadow:0 0 22px #42dfff44;backdrop-filter:blur(10px);pointer-events:none;transition:opacity .25s ease';
      document.body.appendChild(beacon);
    }
    beacon.textContent='🧭 NEXT MOVE → '+target.label;
    beacon.style.opacity='1';
    clearTimeout(beacon._hideTimer);
    beacon._hideTimer=setTimeout(()=>{beacon.style.opacity='0'},4200);
  });
  setupMobileJoystick();

  function setCameraOverride(config={}){
    const position=Array.isArray(config.position)?new THREE.Vector3(...config.position):(config.position&&config.position.isVector3?config.position.clone():camera.position.clone());
    const target=Array.isArray(config.target)?new THREE.Vector3(...config.target):(config.target&&config.target.isVector3?config.target.clone():new THREE.Vector3(0,1.7,-8));
    const lerp=Number.isFinite(Number(config.lerp))?Math.max(.01,Math.min(1,Number(config.lerp))):.08;
    if(!cameraOverride){
      cameraOverride={
        returnPosition:camera.position.clone(),
        returnYaw:yaw,
        returnPitch:pitch,
        position,
        target,
        lerp
      };
    }else{
      cameraOverride.position.copy(position);
      cameraOverride.target.copy(target);
      cameraOverride.lerp=lerp;
    }
    return cameraOverride;
  }

  function clearCameraOverride(restore=true){
    if(!cameraOverride)return;
    if(restore){
      camera.position.copy(cameraOverride.returnPosition);
      yaw=cameraOverride.returnYaw;
      pitch=cameraOverride.returnPitch;
      camera.rotation.order='YXZ';
      camera.rotation.y=yaw;
      camera.rotation.x=pitch;
    }
    cameraOverride=null;
  }

  function loop(t){
    const dt=Math.min((t-last)/1000,.04);last=t;
    if(cameraOverride){
      camera.position.lerp(cameraOverride.position,cameraOverride.lerp);
      camera.lookAt(cameraOverride.target);
      current=null;
    }else{
      const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),move=new THREE.Vector3();
      const keyboardMoving=Boolean(keys.w||keys.arrowup||keys.s||keys.arrowdown||keys.d||keys.arrowright||keys.a||keys.arrowleft);
      if(keys.w||keys.arrowup)move.add(forward);if(keys.s||keys.arrowdown)move.sub(forward);if(keys.d||keys.arrowright)move.add(right);if(keys.a||keys.arrowleft)move.sub(right);
      const analogMagnitude=Math.min(1,Math.hypot(joystickX,joystickY));
      if(analogMagnitude>.04){move.addScaledVector(forward,joystickY);move.addScaledVector(right,joystickX)}
      if(move.lengthSq()){
        const speedScale=keyboardMoving?1:Math.max(.32,analogMagnitude);
        move.normalize().multiplyScalar((keys.shift?7:4.2)*speedScale*dt);
        const next=camera.position.clone().add(move);if(!blocked(next))camera.position.copy(next)
      }
      camera.position.y=1.7;camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;
      current=null;let best=99;for(const i of interactions){const d=camera.position.distanceTo(i.pos);if(d<i.radius&&d<best){best=d;current=i}}
    }
    if(prompt){prompt.classList.toggle('show',!!current);if(current)prompt.textContent='E / TAP — '+current.label}
    animated.forEach(f=>f(t,dt));renderer.render(scene,camera)
  }
  renderer.setAnimationLoop(loop);addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
  return {THREE,scene,camera,renderer,box,cylinder,label,light,interact,wallBounds,animated,material,colliders,setCameraOverride,clearCameraOverride};
}

export function buildAvatar(room,data={},pos=[0,0,0],scale=1){
  const {THREE,scene}=room;
  const group=new THREE.Group();
  group.position.fromArray(pos);
  group.scale.setScalar(scale);
  group.name=data.name?String(data.name)+' Avatar':'Music City Avatar';

  const skin=data.skin||'#9a5f3c';
  const shirt=data.shirtColor||'#171a20';
  const pants=data.pantsColor||'#11151c';
  const hair=data.hairColor||'#171016';
  const bodyBuild=String(data.bodyBuild||'athletic');
  const faceShape=String(data.faceShape||'balanced');
  const facialHair=String(data.facialHair||'none');
  const accessory=String(data.accessory||'chain');
  const outfitStyle=String(data.outfitStyle||data.outfitPreset||'streetwear');
  const bodyScale=bodyBuild==='lean'?.92:bodyBuild==='solid'?1.1:1;
  const shoulderScale=bodyBuild==='lean'?.94:bodyBuild==='solid'?1.12:1;
  const faceWidth=faceShape==='narrow'?.92:faceShape==='wide'?1.08:1;

  const skinMat=new THREE.MeshPhysicalMaterial({
    color:skin,
    roughness:.56,
    metalness:0,
    clearcoat:.035,
    clearcoatRoughness:.82
  });
  const skinSoft=new THREE.MeshPhysicalMaterial({
    color:skin,
    roughness:.61,
    metalness:0,
    clearcoat:.02,
    clearcoatRoughness:.9
  });
  const hairMat=new THREE.MeshStandardMaterial({
    color:hair,
    roughness:.48,
    metalness:.02
  });
  const clothMat=new THREE.MeshPhysicalMaterial({
    color:shirt,
    roughness:.78,
    metalness:.025,
    sheen:.18,
    sheenRoughness:.72,
    sheenColor:new THREE.Color(shirt).offsetHSL(0,0,.08)
  });
  const pantsMat=new THREE.MeshPhysicalMaterial({
    color:pants,
    roughness:.82,
    metalness:.035,
    sheen:.1,
    sheenRoughness:.8,
    sheenColor:new THREE.Color(pants).offsetHSL(0,0,.06)
  });
  const darkMat=new THREE.MeshStandardMaterial({color:0x111217,roughness:.46,metalness:.28});
  const shoeUpper=new THREE.MeshPhysicalMaterial({
    color:data.shoeColor||0xe6e3dc,
    roughness:.46,
    metalness:.02,
    clearcoat:.08,
    clearcoatRoughness:.5
  });
  const shoeSole=new THREE.MeshStandardMaterial({color:0xf4f1ea,roughness:.64,metalness:.01});
  const eyeWhite=new THREE.MeshPhysicalMaterial({color:0xf3eee8,roughness:.32,metalness:0,clearcoat:.08});
  const irisMat=new THREE.MeshPhysicalMaterial({color:data.eyeColor||0x2c1c12,roughness:.24,metalness:0,clearcoat:.18});
  const lipMat=new THREE.MeshPhysicalMaterial({
    color:new THREE.Color(skin).multiplyScalar(.68),
    roughness:.5,
    metalness:0,
    clearcoat:.04
  });
  const metalMat=new THREE.MeshStandardMaterial({color:0xd0a64e,roughness:.24,metalness:.9});

  const fallbackMeshes=[];
  const add=(geometry,position,material,parent=group)=>{
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.fromArray(position);
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    parent.add(mesh);
    fallbackMeshes.push(mesh);
    return mesh;
  };

  // Preserve legacy child order: head, hair root, torso, left arm, right arm, left leg, right leg.
  const head=add(new THREE.SphereGeometry(.49,28,22),[0,2.62,0],skinMat);
  head.scale.set(faceWidth,1.13,.96);

  const hairRoot=new THREE.Group();
  hairRoot.name='hairRoot';
  group.add(hairRoot);
  const torso=add(new THREE.CapsuleGeometry(.48,.72,10,22),[0,1.55,0],clothMat);
  torso.scale.set(shoulderScale,1,bodyScale*.94);
  const leftArm=add(new THREE.CapsuleGeometry(.135,.83,8,16),[-.62*shoulderScale,1.52,0],skinSoft);
  leftArm.rotation.z=-.115;
  const rightArm=add(new THREE.CapsuleGeometry(.135,.83,8,16),[.62*shoulderScale,1.52,0],skinSoft);
  rightArm.rotation.z=.115;
  const leftLeg=add(new THREE.CapsuleGeometry(.185,.9,8,16),[-.255*bodyScale,.35,0],pantsMat);
  const rightLeg=add(new THREE.CapsuleGeometry(.185,.9,8,16),[.255*bodyScale,.35,0],pantsMat);

  // Neck and ears give the silhouette a human structure instead of stacked primitives.
  const neck=add(new THREE.CylinderGeometry(.19,.22,.36,18),[0,2.08,0],skinSoft);
  const earL=add(new THREE.SphereGeometry(.105,14,10),[-.5*faceWidth,2.65,0],skinSoft);
  earL.scale.set(.5,.9,.5);
  const earR=add(new THREE.SphereGeometry(.105,14,10),[.5*faceWidth,2.65,0],skinSoft);
  earR.scale.set(.5,.9,.5);

  // Eyes, brows, nose and lips. Local +Z is the avatar's forward direction.
  for(const side of [-1,1]){
    const eye=add(new THREE.SphereGeometry(.085,16,10),[side*.18*faceWidth,2.69,.445],eyeWhite);
    eye.scale.set(1.1,.62,.42);
    const iris=add(new THREE.SphereGeometry(.043,14,10),[side*.18*faceWidth,2.69,.491],irisMat);
    iris.scale.set(1,.72,.32);
    const pupil=add(new THREE.SphereGeometry(.019,10,8),[side*.18*faceWidth,2.69,.512],darkMat);
    pupil.scale.z=.35;
    const brow=add(new THREE.BoxGeometry(.19,.028,.028),[side*.18*faceWidth,2.81,.485],hairMat);
    brow.rotation.z=side*.05;
  }
  const nose=add(new THREE.ConeGeometry(.065,.24,12),[0,2.56,.493],skinSoft);
  nose.rotation.x=Math.PI/2;
  nose.scale.set(.86,1,.88);
  const mouth=add(new THREE.CapsuleGeometry(.035,.16,4,10),[0,2.42,.482],lipMat);
  mouth.rotation.z=Math.PI/2;
  mouth.scale.y=.58;

  // Face structure / jaw shadow.
  if(faceShape==='wide'){
    const jawL=add(new THREE.SphereGeometry(.18,12,10),[-.28,2.42,.08],skinSoft);jawL.scale.set(1,.8,.72);
    const jawR=add(new THREE.SphereGeometry(.18,12,10),[.28,2.42,.08],skinSoft);jawR.scale.set(1,.8,.72);
  }

  // Hair variants.
  const hairStyle=String(data.hairStyle||'fade');
  const hairPiece=(geometry,position,scaleVec=[1,1,1])=>{
    const mesh=add(geometry,position,hairMat,hairRoot);
    mesh.scale.set(...scaleVec);
    return mesh;
  };
  if(hairStyle==='afro'){
    const afroPositions=[[0,3.02,0],[-.26,2.98,0],[.26,2.98,0],[0,3.16,-.05],[-.2,3.12,-.12],[.2,3.12,-.12]];
    afroPositions.forEach((p,i)=>hairPiece(new THREE.SphereGeometry(i===0?.43:.31,16,12),p,[1,1,.92]));
  }else if(hairStyle==='braids'||hairStyle==='locs'){
    hairPiece(new THREE.SphereGeometry(.48,18,12),[0,2.92,-.015],[faceWidth,.48,.96]);
    const count=hairStyle==='braids'?10:8;
    for(let i=0;i<count;i++){
      const side=i<count/2?-1:1;
      const row=i%(count/2);
      const x=side*(.2+row*.07);
      const braid=hairPiece(new THREE.CapsuleGeometry(hairStyle==='braids'?.035:.055,.48+row*.045,5,9),[x,2.42-row*.04,.02],[1,1,1]);
      braid.rotation.z=side*(.06+.025*row);
      braid.rotation.x=.05*(row%2);
    }
  }else if(hairStyle==='twists'){
    hairPiece(new THREE.SphereGeometry(.47,18,12),[0,2.93,-.02],[faceWidth,.42,.96]);
    for(const x of [-.32,-.16,0,.16,.32]){
      const twist=hairPiece(new THREE.CapsuleGeometry(.055,.26,5,8),[x,3.04,.02],[1,1,1]);
      twist.rotation.z=x*1.2;
    }
  }else{
    // Fade / buzz cut.
    hairPiece(new THREE.SphereGeometry(.49,22,14),[0,2.94,-.03],[faceWidth,.46,.96]);
  }

  // Optional facial hair.
  if(facialHair!=='none' || /Rapper|Producer|DJ/i.test(String(data.type||''))){
    const beardOpacity=facialHair==='none'?.34:1;
    const beardMat=hairMat.clone();
    beardMat.transparent=beardOpacity<1;
    beardMat.opacity=beardOpacity;
    const beard=add(new THREE.SphereGeometry(.405,18,12),[0,2.47,.045],beardMat);
    beard.scale.set(faceWidth,.48,.98);
    // Keep the beard from visually covering the upper face.
    beard.geometry=beard.geometry.clone();
  }

  // Hoodie/jacket shell and cloth layering.
  const shoulderL=add(new THREE.SphereGeometry(.21,14,10),[-.51*shoulderScale,1.9,0],clothMat);
  shoulderL.scale.set(1.35,.82,1.3);
  const shoulderR=add(new THREE.SphereGeometry(.21,14,10),[.51*shoulderScale,1.9,0],clothMat);
  shoulderR.scale.set(1.35,.82,1.3);
  const shirtHem=add(new THREE.CylinderGeometry(.47*bodyScale,.5*bodyScale,.18,22),[0,.94,0],clothMat);
  shirtHem.scale.z=.78;
  if(outfitStyle==='hoodie'||outfitStyle==='midnight'||/Rapper/i.test(String(data.type||''))){
    const hood=add(new THREE.TorusGeometry(.31,.09,10,24,Math.PI*1.55),[0,2.08,-.22],clothMat);
    hood.rotation.x=Math.PI/2;
    hood.rotation.z=.7;
  }
  const collar=add(new THREE.TorusGeometry(.25,.035,8,20,Math.PI*1.72),[0,2.02,.15],darkMat);
  collar.rotation.x=Math.PI/2;
  collar.rotation.z=.63;

  // Hands.
  const leftHand=add(new THREE.SphereGeometry(.13,14,10),[-.705*shoulderScale,.9,0],skinMat);
  leftHand.scale.set(.78,1.05,.72);
  const rightHand=add(new THREE.SphereGeometry(.13,14,10),[.705*shoulderScale,.9,0],skinMat);
  rightHand.scale.set(.78,1.05,.72);

  // Pants waist, belt, pockets and seams.
  const waist=add(new THREE.CylinderGeometry(.42*bodyScale,.43*bodyScale,.28,20),[0,.93,0],pantsMat);
  waist.scale.z=.82;
  const belt=add(new THREE.TorusGeometry(.405*bodyScale,.028,8,24),[0,1.0,0],darkMat);
  belt.rotation.x=Math.PI/2;
  for(const side of [-1,1]){
    const pocket=add(new THREE.BoxGeometry(.18,.28,.055),[side*.31*bodyScale,.5,.245],pantsMat);
    pocket.rotation.z=side*.04;
  }

  // Sneakers with upper, toe, sole and lace panel.
  for(const side of [-1,1]){
    const x=side*.255*bodyScale;
    const sole=add(new THREE.BoxGeometry(.43,.12,.72),[x,-.28,.11],shoeSole);
    sole.geometry.translate(0,0,.05);
    const upper=add(new THREE.BoxGeometry(.39,.24,.61),[x,-.14,.08],shoeUpper);
    upper.rotation.x=-.06;
    const toe=add(new THREE.SphereGeometry(.2,14,10),[x,-.16,.35],shoeUpper);
    toe.scale.set(1,.6,.82);
    const lace=add(new THREE.BoxGeometry(.19,.018,.25),[x,-.015,.18],darkMat);
    lace.rotation.x=-.08;
  }

  // Jewelry / accessories.
  if(accessory!=='none'){
    const chain=add(new THREE.TorusGeometry(.27,.025,10,30,Math.PI*1.55),[0,1.88,.315],metalMat);
    chain.rotation.z=.78;
    const pendant=add(new THREE.BoxGeometry(.12,.14,.035),[0,1.58,.34],metalMat);
    pendant.rotation.z=.05;
  }
  if(data.hasWatch!==false){
    const watch=add(new THREE.CylinderGeometry(.09,.09,.065,14),[.69*shoulderScale,1.08,.03],metalMat);
    watch.rotation.z=Math.PI/2;
  }

  // Small jacket/hoodie logo panel for stronger character identity.
  const logoCanvas=document.createElement('canvas');
  logoCanvas.width=256;logoCanvas.height=128;
  const logoCtx=logoCanvas.getContext('2d');
  logoCtx.clearRect(0,0,256,128);
  logoCtx.fillStyle='#f7f1e9';
  logoCtx.textAlign='center';
  logoCtx.textBaseline='middle';
  logoCtx.font='900 34px Arial';
  logoCtx.fillText('MUSIC CITY',128,52);
  logoCtx.font='900 20px Arial';
  logoCtx.fillText('♛',128,91);
  const logoMap=new THREE.CanvasTexture(logoCanvas);
  logoMap.colorSpace=THREE.SRGBColorSpace;
  const logo=add(new THREE.PlaneGeometry(.66,.33),[0,1.58,.302],new THREE.MeshBasicMaterial({map:logoMap,transparent:true,toneMapped:false}));

  group.userData.rig={
    head,hairRoot,torso,leftArm,rightArm,leftLeg,rightLeg,leftHand,rightHand,neck
  };
  group.userData.fallbackMeshes=fallbackMeshes;
  group.userData.avatarQuality='realistic-v2';
  group.userData.avatarData={...data};

  group.userData.playPerformanceAction=(type)=>{
    const controller=group.userData.avatarController;
    if(controller&&controller.playPerformanceAction)return controller.playPerformanceAction(type);
    return false;
  };

  scene.add(group);

  // Optional production GLB upgrade. The detailed V2 avatar renders immediately,
  // then a premium skinned model can replace it without changing the game API.
  const modelUrl=String(data.modelUrl||data.avatarModelUrl||'').trim();
  if(modelUrl){
    import('./mce_avatar_runtime.js')
      .then(mod=>mod.upgradeAvatarFromGLB(group,room,data))
      .catch(error=>{
        group.userData.avatarModelError=String(error&&error.message||error);
        console.warn('Music City premium avatar model failed; keeping Realism V2 fallback.',error);
      });
  }

  return group;
}

