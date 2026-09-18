import * as THREE from 'three';

export function createRoom(options={}) {
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(options.background||0x050307);
  scene.fog=new THREE.FogExp2(options.fog||0x09040c,options.fogDensity||0.022);
  const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.08,180);
  camera.position.fromArray(options.spawn||[0,1.7,8]);
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  document.body.prepend(renderer.domElement);renderer.domElement.tabIndex=0;
  scene.add(new THREE.HemisphereLight(options.sky||0x5b4772,0x080609,.75));
  const keys={},colliders=[],interactions=[],animated=[];
  let yaw=options.yaw||0,pitch=0,drag=false,lastX=0,lastY=0,current=null,last=performance.now();
  const prompt=document.getElementById('interactPrompt');
  const material=(color,rough=.78,metal=.12)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
  function box(name,size,pos,color,opts={}){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),opts.material||material(color,opts.roughness,opts.metalness));mesh.name=name;mesh.position.fromArray(pos);mesh.castShadow=opts.cast!==false;mesh.receiveShadow=opts.receive!==false;scene.add(mesh);if(opts.collider)colliders.push(new THREE.Box3().setFromObject(mesh));return mesh}
  function cylinder(name,r,h,pos,color,opts={}){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,20),material(color,opts.roughness,opts.metalness));mesh.name=name;mesh.position.fromArray(pos);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh}
  function label(text,pos,color='#ffffff',scale=[4,1]){const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d');x.font='900 92px Arial';x.textAlign='center';x.textBaseline='middle';x.shadowBlur=22;x.shadowColor=color;x.fillStyle=color;x.fillText(text,c.width/2,c.height/2);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:true}));s.position.fromArray(pos);s.scale.set(scale[0],scale[1],1);scene.add(s);return s}
  function light(color,intensity,pos,distance=22){const l=new THREE.PointLight(color,intensity,distance,2);l.position.fromArray(pos);l.castShadow=true;scene.add(l);return l}
  function marker(pos,color=0xff315b){const g=new THREE.Mesh(new THREE.TorusGeometry(.7,.055,10,38),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9}));g.rotation.x=Math.PI/2;g.position.set(pos[0],.035,pos[2]);scene.add(g);animated.push(t=>{g.rotation.z=t*.0018;g.material.opacity=.55+Math.sin(t*.004)*.3});return g}
  function interact(labelText,pos,action,radius=2.5,color){const item={label:labelText,pos:new THREE.Vector3(...pos),action,radius};interactions.push(item);marker(pos,color);return item}
  function wallBounds(width,depth,height=5){box('floor',[width,.2,depth],[0,-.1,0],0x17131a,{receive:true});box('back wall',[width,height,.35],[0,height/2,-depth/2],0x221922,{collider:true});box('left wall',[.35,height,depth],[-width/2,height/2,0],0x1b151e,{collider:true});box('right wall',[.35,height,depth],[width/2,height/2,0],0x1b151e,{collider:true});box('front-left',[width*.38,height,.35],[-width*.31,height/2,depth/2],0x1b151e,{collider:true});box('front-right',[width*.38,height,.35],[width*.31,height/2,depth/2],0x1b151e,{collider:true})}
  function blocked(p){const r=.35;return colliders.some(b=>p.x>b.min.x-r&&p.x<b.max.x+r&&p.z>b.min.z-r&&p.z<b.max.z+r)}
  function activate(){if(current)current.action()}
  addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='e')activate()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
  renderer.domElement.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId)});
  renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-lastX)*.004;pitch=Math.max(-1.15,Math.min(1.15,pitch-(e.clientY-lastY)*.003));lastX=e.clientX;lastY=e.clientY});
  renderer.domElement.addEventListener('pointerup',()=>drag=false);prompt?.addEventListener('click',activate);
  document.querySelectorAll('[data-move]').forEach(b=>{const k=b.dataset.move;b.addEventListener('pointerdown',e=>{e.preventDefault();keys[k]=true});['pointerup','pointercancel','pointerleave'].forEach(n=>b.addEventListener(n,()=>keys[k]=false))});
  function loop(t){const dt=Math.min((t-last)/1000,.04);last=t;const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),move=new THREE.Vector3();if(keys.w||keys.arrowup)move.add(forward);if(keys.s||keys.arrowdown)move.sub(forward);if(keys.d||keys.arrowright)move.add(right);if(keys.a||keys.arrowleft)move.sub(right);if(move.lengthSq()){move.normalize().multiplyScalar((keys.shift?7:4.2)*dt);const next=camera.position.clone().add(move);if(!blocked(next))camera.position.copy(next)}camera.position.y=1.7;camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;current=null;let best=99;for(const i of interactions){const d=camera.position.distanceTo(i.pos);if(d<i.radius&&d<best){best=d;current=i}}if(prompt){prompt.classList.toggle('show',!!current);if(current)prompt.textContent='E / TAP — '+current.label}animated.forEach(f=>f(t,dt));renderer.render(scene,camera)}
  renderer.setAnimationLoop(loop);addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
  return {THREE,scene,camera,renderer,box,cylinder,label,light,interact,wallBounds,animated,material,colliders};
}

export function buildAvatar(room,data={},pos=[0,0,0],scale=1){
  const {THREE,scene}=room,group=new THREE.Group();group.position.fromArray(pos);group.scale.setScalar(scale);
  const skin=data.skin||'#9a5f3c',shirt=data.shirtColor||'#7b2cff',pants=data.pantsColor||'#171b2d',hair=data.hairColor||'#171016',mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.72});
  const part=(g,p,m)=>{const o=new THREE.Mesh(g,m);o.position.fromArray(p);o.castShadow=true;group.add(o);return o};
  part(new THREE.CapsuleGeometry(.43,.52,6,16),[0,2.58,0],mat(skin));const h=part(new THREE.SphereGeometry(data.hairStyle==='afro'?.62:.49,18,12),[0,data.hairStyle==='afro'?3.04:2.96,-.02],mat(hair));h.scale.y=data.hairStyle==='braids'?.45:.62;
  part(new THREE.BoxGeometry(1.05,1.15,.58),[0,1.55,0],mat(shirt));part(new THREE.CylinderGeometry(.17,.17,1.12,12),[-.72,1.55,0],mat(skin)).rotation.z=-.12;part(new THREE.CylinderGeometry(.17,.17,1.12,12),[.72,1.55,0],mat(skin)).rotation.z=.12;part(new THREE.BoxGeometry(.42,1.25,.48),[-.29,.35,0],mat(pants));part(new THREE.BoxGeometry(.42,1.25,.48),[.29,.35,0],mat(pants));scene.add(group);return group;
}
