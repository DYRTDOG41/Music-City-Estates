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
  const {THREE,scene}=room,group=new THREE.Group();group.position.fromArray(pos);group.scale.setScalar(scale);
  const skin=data.skin||'#9a5f3c',shirt=data.shirtColor||'#7b2cff',pants=data.pantsColor||'#171b2d',hair=data.hairColor||'#171016',mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.72});
  const part=(g,p,m)=>{const o=new THREE.Mesh(g,m);o.position.fromArray(p);o.castShadow=true;group.add(o);return o};
  part(new THREE.CapsuleGeometry(.43,.52,6,16),[0,2.58,0],mat(skin));const h=part(new THREE.SphereGeometry(data.hairStyle==='afro'?.62:.49,18,12),[0,data.hairStyle==='afro'?3.04:2.96,-.02],mat(hair));h.scale.y=data.hairStyle==='braids'?.45:.62;
  part(new THREE.BoxGeometry(1.05,1.15,.58),[0,1.55,0],mat(shirt));part(new THREE.CylinderGeometry(.17,.17,1.12,12),[-.72,1.55,0],mat(skin)).rotation.z=-.12;part(new THREE.CylinderGeometry(.17,.17,1.12,12),[.72,1.55,0],mat(skin)).rotation.z=.12;part(new THREE.BoxGeometry(.42,1.25,.48),[-.29,.35,0],mat(pants));part(new THREE.BoxGeometry(.42,1.25,.48),[.29,.35,0],mat(pants));scene.add(group);return group;
}
