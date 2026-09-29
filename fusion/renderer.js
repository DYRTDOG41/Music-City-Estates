import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BOARD_SPACES as DETROIT_SPACES, LANDMARKS as DETROIT_LANDMARKS } from './data.js';
let BOARD_SPACES = DETROIT_SPACES;
let LANDMARKS = DETROIT_LANDMARKS;
let fusionMode = false;

// The Music City route keeps the same board, camera, cars and dice with its own map.
export function useBoardData(spaces, landmarks) {
  BOARD_SPACES = spaces;
  LANDMARKS = landmarks;
  fusionMode = true;
}
import { getVehicle, getRim } from './vehicles.js?v=42';
import { getRealVehicleSpec } from './real-vehicle-models.js?v=42';
import { buildFusionArtBoard, fusionArtLandingSlot, syncFusionArtOwnership } from './fusion-art-board.js?v=1';
import { ART_WORLD_WIDTH, ART_WORLD_DEPTH } from './fusion-art-map.js?v=1';

export class DetroitRenderer extends EventTarget {
  constructor(container) {
    super();
    this.container = container;
    this.mobileDevice=window.matchMedia?.('(max-width: 760px)').matches || /iPhone|iPad|Android/i.test(navigator.userAgent);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa9bdc9);
    this.scene.fog = new THREE.Fog(0xa9bdc9, 58, 118);
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 300);
    this.scene.add(this.camera);
    this.renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobileDevice ? 1.35 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    this.container.replaceChildren(this.renderer.domElement);
    this.landingBanner=document.createElement('div');
    this.landingBanner.className='landing-banner';
    this.landingBanner.setAttribute('aria-live','polite');
    this.container.appendChild(this.landingBanner);
    this.landingBannerTimer=null;
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.landmarkGroups = new Map();
    this.boroughGroups = [];
    this.spaceGroups = new Map();
    this.playerTokens = new Map();
    this.cardImageCache = new Map();
    this.surfaceTextures = new Map();
    this.labelTextures = new Map();
    this.realVehicleCache = new Map();
    this.vehiclePreviewCache = new Map();
    this.diceRollGroup = null;
    this.activePublicRoom = null;
    this.publicRoomGroup = null;
    this.publicRoomHotspots = [];
    this.realVehicleLoader = new GLTFLoader();
    this.cityBuildingLoader = new GLTFLoader();
    this.cityBuildingCache = new Map();
    this.coords = [];
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.homeBoard = new THREE.Vector3(0, 43, 28);
    this.homeCity = new THREE.Vector3(13, 17, 18);
    this.desiredPos = this.homeCity.clone();
    this.desiredTarget = new THREE.Vector3(0, 2, 0);
    this.look = new THREE.Vector3(0, 2, 0);
    this.orbit = 0.6;
    this.pitch = 0.5;
    this.radius = 26;
    this.drag = false;
    this.lastX = 0;
    this.lastY = 0;
    this.driveMode = false;
    this.driveT = 0;
    this.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.initLights();
    if(fusionMode)buildFusionArtBoard(this,BOARD_SPACES,LANDMARKS);
    else this.initWorld();
    this.bindControls();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.animate();
  }

  initLights() {
    const hemi=new THREE.HemisphereLight(0xe8f4ff,0x5c5144,1.85);
    this.scene.add(hemi);

    const sun=new THREE.DirectionalLight(0xfff0d0,3.45);
    sun.position.set(-22,34,18);
    sun.castShadow=true;
    sun.shadow.mapSize.set(this.mobileDevice?1024:2048,this.mobileDevice?1024:2048);
    sun.shadow.camera.left=-38;sun.shadow.camera.right=38;sun.shadow.camera.top=38;sun.shadow.camera.bottom=-38;
    sun.shadow.camera.near=1;sun.shadow.camera.far=90;
    sun.shadow.bias=-0.00035;sun.shadow.normalBias=.025;
    this.scene.add(sun);

    const fill=new THREE.DirectionalLight(0x8ab8dc,.95);
    fill.position.set(24,12,-18);
    this.scene.add(fill);

    const warm=new THREE.DirectionalLight(0xffc98a,.42);
    warm.position.set(-14,8,-26);
    this.scene.add(warm);
  }

  mat(color,opts={}){return new THREE.MeshStandardMaterial({color,roughness:opts.roughness??.55,metalness:opts.metalness??.12,...opts});}

  initWorld(){
    const base=new THREE.Mesh(new THREE.BoxGeometry(40,1,40),this.mat(0x22282b,{roughness:.72,metalness:.08}));
    base.position.y=-.7;base.receiveShadow=true;this.world.add(base);

    const center=new THREE.Mesh(new THREE.BoxGeometry(25,.35,25),this.mat(0x59615d,{roughness:.82,metalness:.05}));
    center.position.y=-.05;center.receiveShadow=true;this.world.add(center);

    this.buildRoadGrid();
    this.buildWaterfront();
    this.buildBoardSpaces();
    this.buildDistrictGateways();
    this.buildCityBlocks();
    this.buildLandmarks();
    this.buildStreetFurniture();
    this.buildEnvironmentDetail();
    this.buildMotorGallery();
  }

  buildRoadGrid(){
    const asphalt=new THREE.MeshPhysicalMaterial({color:0x181d22,roughness:.68,metalness:.16,clearcoat:.32,clearcoatRoughness:.22});
    const laneMat=new THREE.MeshBasicMaterial({color:0xd8bd58});
    const edgeMat=new THREE.MeshBasicMaterial({color:0xe4e0d4});
    const crossMat=new THREE.MeshBasicMaterial({color:0xe9e8e1});

    [[0,0,24,3.2],[0,8.8,24,2.4],[0,-8.8,24,2.4],[0,0,3.2,24],[8.8,0,2.4,24],[-8.8,0,2.4,24]].forEach(([x,z,w,d])=>{
      const r=new THREE.Mesh(new THREE.BoxGeometry(w,.08,d),asphalt);
      r.position.set(x,.17,z);r.receiveShadow=true;this.world.add(r);
    });

    for(let i=-9;i<=9;i+=3){
      const a=new THREE.Mesh(new THREE.BoxGeometry(1.25,.026,.075),laneMat);a.position.set(i,.225,0);this.world.add(a);
      const b=new THREE.Mesh(new THREE.BoxGeometry(.075,.026,1.25),laneMat);b.position.set(0,.225,i);this.world.add(b);
    }

    // White road-edge lines.
    [[0,1.48,23.3,.055],[0,-1.48,23.3,.055],[1.48,0,.055,23.3],[-1.48,0,.055,23.3]].forEach(([x,z,w,d])=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(w,.026,d),edgeMat);m.position.set(x,.228,z);this.world.add(m);
    });

    // Crosswalks at the four approaches to the central intersection.
    const addCrosswalk=(x,z,vertical=false)=>{
      for(let i=-2;i<=2;i++){
        const w=vertical?.22:1.1,d=vertical?1.1:.22;
        const stripe=new THREE.Mesh(new THREE.BoxGeometry(w,.03,d),crossMat);
        stripe.position.set(x+(vertical?i*.38:0),.235,z+(vertical?0:i*.38));this.world.add(stripe);
      }
    };
    addCrosswalk(0,2.15,false);addCrosswalk(0,-2.15,false);
    addCrosswalk(2.15,0,true);addCrosswalk(-2.15,0,true);

    const sidewalk=this.mat(0xa8a59c,{roughness:.96});
    [[0,6.8,16,1.25],[0,-6.8,16,1.25],[6.8,0,1.25,16],[-6.8,0,1.25,16]].forEach(([x,z,w,d])=>{
      const s=new THREE.Mesh(new THREE.BoxGeometry(w,.15,d),sidewalk);
      s.position.set(x,.22,z);s.castShadow=false;s.receiveShadow=true;this.world.add(s);
    });

    const curb=this.mat(0xc7c3ba,{roughness:.94});
    [[0,6.15,16,.16],[0,7.45,16,.16],[0,-6.15,16,.16],[0,-7.45,16,.16],
     [6.15,0,.16,16],[7.45,0,.16,16],[-6.15,0,.16,16],[-7.45,0,.16,16]].forEach(([x,z,w,d])=>{
      const c=new THREE.Mesh(new THREE.BoxGeometry(w,.22,d),curb);c.position.set(x,.28,z);c.receiveShadow=true;this.world.add(c);
    });
  }

  buildWaterfront(){
    const waterMat=new THREE.MeshPhysicalMaterial({
      color:0x28647c,roughness:.2,metalness:.08,transmission:.08,transparent:true,opacity:.94,
      clearcoat:.65,clearcoatRoughness:.22
    });
    const water=new THREE.Mesh(new THREE.BoxGeometry(27,.16,4.1),waterMat);
    water.position.set(0,.03,-11.3);water.receiveShadow=true;this.world.add(water);

    // Low-cost ripple bands give the river depth without a shader.
    const rippleMat=new THREE.MeshBasicMaterial({color:0xb5dce8,transparent:true,opacity:.22});
    for(let x=-11;x<=11;x+=2.4){
      const r=new THREE.Mesh(new THREE.BoxGeometry(1.25,.012,.035),rippleMat);
      r.position.set(x,.125,-11.25+Math.sin(x)*.55);r.rotation.y=.12;this.world.add(r);
    }

    const dock=new THREE.Mesh(new THREE.BoxGeometry(8,.18,1.2),this.mat(0x6a5943,{roughness:.84}));
    dock.position.set(3,.24,-10.5);dock.castShadow=true;dock.receiveShadow=true;this.world.add(dock);

    const railMat=this.mat(0x70787d,{metalness:.78,roughness:.22});
    for(let x=-9;x<=9;x+=1.5){
      const post=new THREE.Mesh(new THREE.CylinderGeometry(.025,.03,.7,7),railMat);
      post.position.set(x,.62,-9.55);this.world.add(post);
    }
    const rail=new THREE.Mesh(new THREE.BoxGeometry(19,.045,.045),railMat);
    rail.position.set(0,.93,-9.55);this.world.add(rail);
  }

  buildBoardSpaces(){
    this.coords.length=0;
    for(let i=0;i<11;i++)this.coords.push([-16.5+i*3.3,16.5]);
    for(let i=1;i<11;i++)this.coords.push([16.5,16.5-i*3.3]);
    for(let i=1;i<11;i++)this.coords.push([16.5-i*3.3,-16.5]);
    for(let i=1;i<10;i++)this.coords.push([-16.5,-16.5+i*3.3]);

    const sideColors={North:0x255f9a,East:0x477a4b,South:0x9a5038,West:0x68418c};
    BOARD_SPACES.forEach((space,i)=>{
      const g=new THREE.Group();g.userData={type:'space',id:space.id};
      const color=space.type==='event'?0xa27f3b:space.type==='auto'?0x59636d:space.type==='corner'?0x8b8d90:sideColors[space.side];
      const tile=new THREE.Mesh(new THREE.BoxGeometry(2.95,.42,2.95),this.mat(color,{roughness:.42,metalness:.14}));
      tile.position.y=.25;tile.castShadow=true;tile.receiveShadow=true;g.add(tile);

      if(space.type==='neighborhood'){
        const property=this.makePropertyBuilding(space,i);
        property.position.y=.47;
        g.add(property);
      }else if(space.type==='auto'){
        const pad=new THREE.Mesh(new THREE.BoxGeometry(1.8,.07,1.45),this.mat(0x34383c,{roughness:.9}));
        pad.position.y=.51;g.add(pad);
        const car=this.makeCar(0xaeb4ba);car.scale.setScalar(.62);car.position.y=.55;g.add(car);
      }else if(space.type==='event'){
        const ring=new THREE.Mesh(new THREE.TorusGeometry(.46,.12,10,24),this.mat(0xd7ba64,{metalness:.62,roughness:.2}));
        ring.rotation.x=Math.PI/2;ring.position.y=.74;g.add(ring);
      }

      this.addLandingBay(g,i,space);
      this.addBlockSign(g,i,space);
      g.position.set(this.coords[i][0],0,this.coords[i][1]);
      this.world.add(g);this.spaceGroups.set(space.id,g);
    });
  }

  addLandingBay(group,index,space){
    const north=index<=10,east=index>10&&index<=20,south=index>20&&index<=30,west=index>30;
    const horizontal=north||south;
    const inward=north?-1:south?1:east?-1:1;
    const accent=({North:0x42a5ff,East:0x63dc7b,South:0xff8b47,West:0xb46bff})[space.side]||0x7ec8ff;

    const bay=new THREE.Group();
    const asphalt=this.mat(0x262b30,{roughness:.94,metalness:.025});
    const pad=new THREE.Mesh(
      new THREE.BoxGeometry(horizontal?2.7:1.36,.075,horizontal?1.36:2.7),
      asphalt
    );
    pad.position.y=.48;pad.receiveShadow=true;bay.add(pad);

    // Reflective curb edge and subtle neon guide strip make the parking area readable at dusk.
    const curbMat=this.mat(0xa8adb0,{roughness:.62,metalness:.25});
    const glowMat=new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.66,toneMapped:false});
    if(horizontal){
      const curb=new THREE.Mesh(new THREE.BoxGeometry(2.68,.07,.07),curbMat);
      curb.position.set(0,.55,-inward*.61);bay.add(curb);
      const glow=new THREE.Mesh(new THREE.BoxGeometry(2.5,.018,.035),glowMat);
      glow.position.set(0,.592,inward*.58);bay.add(glow);
    }else{
      const curb=new THREE.Mesh(new THREE.BoxGeometry(.07,.07,2.68),curbMat);
      curb.position.set(-inward*.61,.55,0);bay.add(curb);
      const glow=new THREE.Mesh(new THREE.BoxGeometry(.035,.018,2.5),glowMat);
      glow.position.set(inward*.58,.592,0);bay.add(glow);
    }

    // Four clearly separated parking boxes.
    const lineMat=new THREE.MeshBasicMaterial({color:0xe8edf0,transparent:true,opacity:.72,toneMapped:false});
    const centers=[[-.72,-.31],[.72,-.31],[-.72,.31],[.72,.31]];
    centers.forEach(([a,b],slot)=>{
      if(horizontal){
        const outline=new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(1.25,.018,.53)),
          new THREE.LineBasicMaterial({color:slot===0?accent:0xdce3e6,transparent:true,opacity:slot===0?.7:.42,toneMapped:false})
        );
        outline.position.set(a*.9,.595,b);bay.add(outline);
      }else{
        const outline=new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(.53,.018,1.25)),
          new THREE.LineBasicMaterial({color:slot===0?accent:0xdce3e6,transparent:true,opacity:slot===0?.7:.42,toneMapped:false})
        );
        outline.position.set(b,.595,a*.9);bay.add(outline);
      }
    });

    // Position the bay in the empty buffer just inside the perimeter.
    if(north)bay.position.z=-2.05;
    else if(south)bay.position.z=2.05;
    else if(east)bay.position.x=-2.05;
    else if(west)bay.position.x=2.05;

    bay.userData.isLandingBay=true;
    group.add(bay);
  }

  getLandingSlot(position,index=0){
    if(this.artBoardActive)return fusionArtLandingSlot(position,index);
    const [x,z]=this.coords[position];
    const slot=index%4;
    const col=(slot%2===0?-1:1)*.64;
    const row=slot<2?-.31:.31;
    let px=x,pz=z,rot=0;

    if(position<=10){
      px+=col;pz+=-2.05+row;rot=0;
    }else if(position<=20){
      px+=-2.05+row;pz+=col;rot=-Math.PI/2;
    }else if(position<=30){
      px+=col;pz+=2.05-row;rot=Math.PI;
    }else{
      px+=2.05-row;pz+=col;rot=Math.PI/2;
    }
    return {x:px,y:.6,z:pz,rotation:rot};
  }

  makeBlockLabelTexture(space){
    const key=`${space.id}:${space.name}:${space.side||'City'}:${space.type}:${space.price||0}`;
    if(this.labelTextures.has(key))return this.labelTextures.get(key);

    const accents={North:'#42a5ff',East:'#63dc7b',South:'#ff8b47',West:'#b46bff'};
    const accent=accents[space.side]||'#7ec8ff';
    const luxury=(space.price||0)>=300000;
    const c=document.createElement('canvas');c.width=640;c.height=210;
    const x=c.getContext('2d');

    const bg=x.createLinearGradient(0,0,0,c.height);
    bg.addColorStop(0,luxury?'#1a1711':'#121a22');
    bg.addColorStop(1,luxury?'#090908':'#080d12');
    x.fillStyle=bg;x.fillRect(0,0,c.width,c.height);

    x.strokeStyle=luxury?'#d7b45b':accent;
    x.lineWidth=luxury?9:7;
    x.strokeRect(10,10,c.width-20,c.height-20);
    x.strokeStyle='rgba(255,255,255,.13)';x.lineWidth=2;
    x.strokeRect(23,23,c.width-46,c.height-46);

    // Simple original icon system: house, car, sparkle, or civic node.
    x.save();x.translate(54,60);
    x.strokeStyle=luxury?'#efd27d':accent;x.fillStyle=luxury?'#efd27d':accent;x.lineWidth=6;
    if(space.type==='neighborhood'){
      x.beginPath();x.moveTo(-24,8);x.lineTo(0,-15);x.lineTo(24,8);x.stroke();
      x.strokeRect(-18,8,36,28);
      x.fillRect(-5,22,10,14);
    }else if(space.type==='auto'){
      x.beginPath();x.roundRect(-28,2,56,23,8);x.stroke();
      x.beginPath();x.moveTo(-18,2);x.lineTo(-8,-10);x.lineTo(14,-10);x.lineTo(23,2);x.stroke();
      [-17,17].forEach(px=>{x.beginPath();x.arc(px,27,6,0,Math.PI*2);x.fill();});
    }else if(space.type==='event'){
      x.beginPath();
      for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/4,r=i%2===0?25:10;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?x.lineTo(px,py):x.moveTo(px,py);}
      x.closePath();x.fill();
    }else{
      x.beginPath();x.arc(0,8,24,0,Math.PI*2);x.stroke();
      x.beginPath();x.moveTo(-15,8);x.lineTo(15,8);x.moveTo(0,-7);x.lineTo(0,23);x.stroke();
    }
    x.restore();

    const subtitle=
      space.producer?'PRODUCER BLOCK':
      space.kind==='studio'?'RECORDING STUDIO':
      space.kind==='radio'?'RADIO STATION':
      space.kind==='festival'?'FINAL SHOWCASE':
      space.type==='auto'?'MOBILITY COMPANY':
      space.type==='event'?'MUSIC CITY MOMENT':
      space.type==='corner'?'CITY CONNECTION':
      `${space.side||'CITY'} SIDE PROPERTY`;

    const title=(space.name||'CITY BLOCK').toUpperCase();
    let fontSize=48;
    x.font=`900 ${fontSize}px system-ui, sans-serif`;
    while(x.measureText(title).width>500&&fontSize>26){
      fontSize-=2;x.font=`900 ${fontSize}px system-ui, sans-serif`;
    }
    x.fillStyle='#f6fbff';x.textAlign='center';x.textBaseline='middle';
    x.fillText(title,365,76);

    const footer=space.price?`${subtitle}  •  ${Number(space.price).toLocaleString('en-US')}`:subtitle;
    x.fillStyle=luxury?'#efd799':'#bcd5e4';
    x.font='800 20px system-ui, sans-serif';
    x.fillText(footer,365,132);

    x.fillStyle=luxury?'#d7b45b':accent;
    x.fillRect(132,165,466,7);

    if(luxury){
      x.fillStyle='#efd27d';x.font='900 16px system-ui, sans-serif';
      x.fillText('PRESTIGE PROPERTY',365,188);
    }

    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy?.()||4);
    this.labelTextures.set(key,tex);
    return tex;
  }

  addBlockSign(group,index,space){
    const north=index<=10,east=index>10&&index<=20,south=index>20&&index<=30,west=index>30;
    const luxury=(space.price||0)>=300000;
    const accent=({North:0x42a5ff,East:0x63dc7b,South:0xff8b47,West:0xb46bff})[space.side]||0x7ec8ff;
    const tex=this.makeBlockLabelTexture(space);
    const sign=new THREE.Group();

    // Flat metal-backed pavement plaque: designed for bird's-eye readability.
    const w=luxury?2.62:2.48,h=luxury?.8:.72;
    const back=new THREE.Mesh(
      new THREE.BoxGeometry(w+.1,.035,h+.1),
      new THREE.MeshPhysicalMaterial({
        color:luxury?0x211b12:0x10161c,metalness:.62,roughness:.3,clearcoat:.76,clearcoatRoughness:.16
      })
    );
    back.position.y=.475;back.receiveShadow=true;sign.add(back);

    const panel=new THREE.Mesh(
      new THREE.PlaneGeometry(w,h),
      new THREE.MeshBasicMaterial({map:tex,toneMapped:false,side:THREE.DoubleSide})
    );
    panel.rotation.x=-Math.PI/2;
    panel.position.y=.497;
    sign.add(panel);

    // Neon perimeter helps the name remain legible during dusk flyovers.
    const glow=new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(w+.04,.018,h+.04)),
      new THREE.LineBasicMaterial({
        color:luxury?0xd7b45b:accent,transparent:true,opacity:luxury?.88:.7,toneMapped:false
      })
    );
    glow.position.y=.507;sign.add(glow);

    // Put the plaque on the outside half of the square, away from the landing bay.
    let rz=0;
    if(north){sign.position.set(0,0,1.01);rz=0;}
    else if(south){sign.position.set(0,0,-1.01);rz=Math.PI;}
    else if(east){sign.position.set(1.01,0,0);rz=-Math.PI/2;}
    else if(west){sign.position.set(-1.01,0,0);rz=Math.PI/2;}

    // Because the label is horizontal, rotate around vertical Y so text reads from the board center.
    // North/South were previously reversed; use an explicit inward-facing map for all four sides.
    const inwardLabelRotation=north?0:east?Math.PI/2:south?Math.PI:-Math.PI/2;
    sign.rotation.y=inwardLabelRotation;
    sign.userData={isGroundLabel:true,spaceId:space.id};
    group.add(sign);
  }

  makeGatewayTexture(title,subtitle,accent){
    const key=`gateway:${title}`;
    if(this.labelTextures.has(key))return this.labelTextures.get(key);
    const c=document.createElement('canvas');c.width=768;c.height=220;const x=c.getContext('2d');
    const bg=x.createLinearGradient(0,0,768,220);bg.addColorStop(0,'#090e13');bg.addColorStop(.5,'#18222b');bg.addColorStop(1,'#090e13');
    x.fillStyle=bg;x.fillRect(0,0,768,220);
    x.strokeStyle=accent;x.lineWidth=8;x.strokeRect(10,10,748,200);
    x.fillStyle='#f6fbff';x.textAlign='center';x.textBaseline='middle';
    x.font='900 62px system-ui, sans-serif';x.fillText(title,384,88);
    x.fillStyle=accent;x.font='800 22px system-ui, sans-serif';x.fillText(subtitle,384,151);
    x.fillRect(190,184,388,7);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;this.labelTextures.set(key,tex);return tex;
  }

  buildDistrictGateways(){
    const gates=[
      {title:fusionMode?'HIP-HOP HEIGHTS':'NORTH SIDE',sub:fusionMode?'BEGENIUS • CAFÉ • WAREHOUSE':'NEIGHBORHOODS • MUSIC • COMMERCE',color:'#42a5ff',pos:[0,.15,12.55],rot:Math.PI,id:'hiphop'},
      {title:fusionMode?'LATIN QUARTER':'EAST SIDE',sub:fusionMode?'PRODUCER • FUTURE BOROUGH':'RIVER • MARKET • MOBILITY',color:'#f5a853',pos:[12.55,.15,0],rot:-Math.PI/2,id:'latin'},
      {title:fusionMode?'GLOBAL SOUND':'SOUTH SIDE',sub:fusionMode?'PRODUCER • FUTURE BOROUGH':'INDUSTRY • CULTURE • RIVERFRONT',color:'#9cdfb6',pos:[0,.15,-12.55],rot:0,id:'global'},
      {title:fusionMode?'COUNTRY CROSSINGS':'WEST SIDE',sub:fusionMode?'PRODUCER • FUTURE BOROUGH':'PARKS • HOMES • AUTOMOTIVE',color:'#d9aeec',pos:[-12.55,.15,0],rot:Math.PI/2,id:'country'}
    ];
    gates.forEach(gate=>{
      const g=new THREE.Group();
      const frame=this.mat(0x11171d,{metalness:.72,roughness:.26});
      const accent=new THREE.MeshBasicMaterial({color:new THREE.Color(gate.color),transparent:true,opacity:.76,toneMapped:false});
      const tex=this.makeGatewayTexture(gate.title,gate.sub,gate.color);

      const panelFrame=new THREE.Mesh(new THREE.BoxGeometry(3.9,.92,.1),frame);panelFrame.position.y=1.53;panelFrame.castShadow=true;g.add(panelFrame);
      const panel=new THREE.Mesh(new THREE.PlaneGeometry(3.72,.76),new THREE.MeshBasicMaterial({map:tex,toneMapped:false,side:THREE.DoubleSide}));
      panel.position.set(0,1.53,.055);g.add(panel);

      [-1.72,1.72].forEach(px=>{
        const post=new THREE.Mesh(new THREE.BoxGeometry(.12,1.55,.12),frame);post.position.set(px,.77,0);post.castShadow=true;g.add(post);
      });
      const glow=new THREE.Mesh(new THREE.BoxGeometry(3.55,.035,.035),accent);glow.position.set(0,1.03,.075);g.add(glow);

      g.position.set(...gate.pos);g.rotation.y=gate.rot;
      if(fusionMode){g.userData={type:'borough',id:gate.id};this.boroughGroups.push(g);}
      this.world.add(g);
    });
  }

  showLandingBanner(position){
    const space=BOARD_SPACES[position];if(!space||!this.landingBanner)return;
    const kind=space.producer?'Producer Block':space.kind==='studio'?'Recording Studio':
      space.kind==='radio'?'Music City Radio':space.kind==='festival'?'Final Showcase':
      space.type==='neighborhood'?`${space.side} Side Property`:
      space.type==='auto'?'Mobility Company':
      space.type==='event'?'Music City Moment':'City Connection';
    const price=space.price?` • ${Number(space.price).toLocaleString('en-US')}`:'';
    this.landingBanner.innerHTML=`<span>${kind}${price}</span><strong>${space.name}</strong>`;
    this.landingBanner.classList.add('show');
    clearTimeout(this.landingBannerTimer);
    this.landingBannerTimer=setTimeout(()=>this.landingBanner?.classList.remove('show'),2200);
  }

  makeSurfaceTexture(style='brick',palette='north'){
    const key=style+':'+palette;
    if(this.surfaceTextures.has(key))return this.surfaceTextures.get(key);

    const colors={
      north:{base:'#a39a8d',line:'#6d665e',accent:'#c7bfb3'},
      east:{base:'#8d9a88',line:'#5f6c5e',accent:'#b8c3b2'},
      south:{base:'#9c7968',line:'#6e5145',accent:'#c4a08c'},
      west:{base:'#8c7d91',line:'#5f5364',accent:'#b9aabb'},
      luxury:{base:'#87745d',line:'#4f4437',accent:'#c5aa72'}
    };
    const p=colors[palette]||colors.north;
    const c=document.createElement('canvas');c.width=256;c.height=256;
    const x=c.getContext('2d');
    x.fillStyle=p.base;x.fillRect(0,0,256,256);

    if(style==='brick'){
      x.strokeStyle=p.line;x.lineWidth=4;
      const bh=28,bw=58;
      for(let row=0;row<10;row++){
        const y=row*bh;
        x.beginPath();x.moveTo(0,y);x.lineTo(256,y);x.stroke();
        const offset=(row%2)*bw*.5;
        for(let col=-1;col<6;col++){
          const xx=col*bw+offset;
          x.beginPath();x.moveTo(xx,y);x.lineTo(xx,y+bh);x.stroke();
        }
      }
      x.globalAlpha=.18;x.fillStyle=p.accent;
      for(let i=0;i<18;i++){const px=(i*67)%245,py=(i*43)%240;x.fillRect(px,py,18,7);}
      x.globalAlpha=1;
    }else if(style==='siding'){
      for(let y=0;y<256;y+=22){
        x.fillStyle=(y/22)%2===0?p.base:p.accent;x.fillRect(0,y,256,21);
        x.fillStyle='rgba(255,255,255,.16)';x.fillRect(0,y,256,3);
        x.fillStyle=p.line;x.globalAlpha=.22;x.fillRect(0,y+19,256,2);x.globalAlpha=1;
      }
    }else{
      // Stone / prestige panels.
      x.fillStyle=p.base;x.fillRect(0,0,256,256);
      x.strokeStyle=p.line;x.lineWidth=3;
      const cells=[[0,0,72,45],[72,0,94,45],[166,0,90,45],[0,45,105,58],[105,45,78,58],[183,45,73,58],[0,103,82,50],[82,103,112,50],[194,103,62,50],[0,153,120,52],[120,153,76,52],[196,153,60,52],[0,205,87,51],[87,205,96,51],[183,205,73,51]];
      cells.forEach(([cx,cy,w,h])=>{x.strokeRect(cx+1,cy+1,w-2,h-2);});
      x.globalAlpha=.16;x.fillStyle=p.accent;x.fillRect(0,0,256,256);x.globalAlpha=1;
    }

    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.repeat.set(2.1,1.5);
    tex.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy?.()||4);
    this.surfaceTextures.set(key,tex);
    return tex;
  }

  makePropertyBuilding(space,index=0){
    const g=new THREE.Group();
    const luxury=(space.price||0)>=300000;
    const mid=(space.price||0)>=200000;
    const style=luxury?'stone':(index%2?'siding':'brick');
    const palette=luxury?'luxury':(space.side||'North').toLowerCase();
    const facadeMap=this.makeSurfaceTexture(style,palette);

    const accent=({North:0x42a5ff,East:0x63d978,South:0xff8c4b,West:0xb36cff})[space.side]||0x58b8ff;
    const facadeMat=new THREE.MeshStandardMaterial({
      color:0xffffff,map:facadeMap,roughness:luxury?.56:.74,metalness:luxury?.1:.025
    });
    const trimMat=this.mat(luxury?0xc7a75b:0xe0ddd4,{roughness:.46,metalness:luxury?.36:.03});
    const roofMat=this.mat(luxury?0x242321:(mid?0x343b40:0x49443e),{roughness:.66,metalness:.11});
    const glassOff=new THREE.MeshPhysicalMaterial({
      color:0x315a70,roughness:.08,metalness:.22,transmission:.08,transparent:true,opacity:.92,
      emissive:0x0b2635,emissiveIntensity:.24
    });
    const glassWarm=new THREE.MeshStandardMaterial({
      color:0xffd18b,roughness:.18,metalness:.05,emissive:0xffa84c,emissiveIntensity:.72
    });
    const glassCool=new THREE.MeshStandardMaterial({
      color:0x7dc8f1,roughness:.15,metalness:.08,emissive:0x2f9ee8,emissiveIntensity:.52
    });
    const neonMat=new THREE.MeshBasicMaterial({color:luxury?0xd7b45e:accent,transparent:true,opacity:luxury?.82:.7,toneMapped:false});

    const w=luxury?1.42:(mid?1.28:1.14);
    const d=luxury?1.12:1.0;
    const h=luxury?1.32:(mid?1.05:.82);

    const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),facadeMat);
    body.position.y=h/2;body.castShadow=true;body.receiveShadow=true;g.add(body);

    const foundation=new THREE.Mesh(new THREE.BoxGeometry(w*1.04,.12,d*1.04),this.mat(0x535458,{roughness:.86}));
    foundation.position.y=.06;foundation.castShadow=true;g.add(foundation);
    const band=new THREE.Mesh(new THREE.BoxGeometry(w*1.025,.075,d*1.025),trimMat);
    band.position.y=h*.56;g.add(band);

    const roof=new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*.72,luxury?.48:.38,4),roofMat);
    roof.rotation.y=Math.PI/4;roof.position.y=h+(luxury?.22:.18);roof.scale.z=d/w;roof.castShadow=true;g.add(roof);

    // Thin architectural glow under the roof, similar to premium city-board lighting.
    const roofGlow=new THREE.Mesh(new THREE.BoxGeometry(w*1.04,.028,d*1.04),neonMat);
    roofGlow.position.y=h+.015;g.add(roofGlow);
    const baseGlow=new THREE.Mesh(new THREE.BoxGeometry(w*1.045,.022,d*1.045),neonMat);
    baseGlow.position.y=.145;baseGlow.material.opacity*=.58;g.add(baseGlow);

    const rows=luxury?2:(mid?2:1);
    const cols=luxury?2:2;
    const windowW=luxury?.24:.22,windowH=luxury?.25:.22;
    const makeWindow=(face,u,y,litSeed)=>{
      const lit=litSeed%5!==0;
      const wm=lit?(litSeed%3===0?glassWarm:glassCool):glassOff;
      const frameMat=trimMat;
      let win,frame;
      if(face==='front'||face==='rear'){
        win=new THREE.Mesh(new THREE.PlaneGeometry(windowW,windowH),wm);
        frame=new THREE.Mesh(new THREE.BoxGeometry(windowW+.055,windowH+.055,.022),frameMat);
        const zpos=(face==='front'?1:-1)*(d/2+.008);
        win.position.set(u,y,zpos);
        frame.position.set(u,y,(face==='front'?1:-1)*(d/2-.006));
        if(face==='rear'){win.rotation.y=Math.PI;}
      }else{
        win=new THREE.Mesh(new THREE.PlaneGeometry(windowW,windowH),wm);
        frame=new THREE.Mesh(new THREE.BoxGeometry(.022,windowH+.055,windowW+.055),frameMat);
        const xpos=(face==='right'?1:-1)*(w/2+.008);
        win.position.set(xpos,y,u);
        win.rotation.y=face==='right'?Math.PI/2:-Math.PI/2;
        frame.position.set((face==='right'?1:-1)*(w/2-.006),y,u);
      }
      g.add(frame,win);
    };

    for(let row=0;row<rows;row++){
      const wy=.38+row*(luxury?.42:.34);
      const xSpread=luxury?.31:.28;
      [-xSpread,xSpread].forEach((u,col)=>{
        makeWindow('front',u,wy,index*11+row*7+col);
        makeWindow('rear',u,wy,index*13+row*5+col+1);
      });
      const sideSpread=rows>1?.25:0;
      if(rows>1){
        [-sideSpread,sideSpread].forEach((u,col)=>{
          makeWindow('left',u,wy,index*17+row*3+col+2);
          makeWindow('right',u,wy,index*19+row*4+col+3);
        });
      }else{
        makeWindow('left',0,wy,index+2);
        makeWindow('right',0,wy,index+3);
      }
    }

    // Front door, glass transom and porch light.
    const door=new THREE.Mesh(new THREE.PlaneGeometry(.25,luxury?.46:.38),this.mat(luxury?0x211b16:0x403229,{roughness:.6}));
    door.position.set(0,luxury?.31:.27,d/2+.014);g.add(door);
    const transom=new THREE.Mesh(new THREE.PlaneGeometry(.22,.08),glassWarm);
    transom.position.set(0,luxury?.59:.49,d/2+.017);g.add(transom);
    const porchLight=new THREE.Mesh(new THREE.SphereGeometry(.035,8,8),new THREE.MeshBasicMaterial({color:0xffc16a,toneMapped:false}));
    porchLight.position.set(.22,luxury?.54:.46,d/2+.07);g.add(porchLight);

    const stoop=new THREE.Mesh(new THREE.BoxGeometry(.48,.09,.25),this.mat(0x99948a,{roughness:.9}));
    stoop.position.set(0,.055,d/2+.14);g.add(stoop);

    if(luxury){
      [-.43,.43].forEach(px=>{
        const col=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.65,10),trimMat);
        col.position.set(px,.36,d/2+.13);col.castShadow=true;g.add(col);
      });
      const balcony=new THREE.Mesh(new THREE.BoxGeometry(.95,.07,.3),trimMat);
      balcony.position.set(0,.83,d/2+.13);g.add(balcony);
      const balconyGlow=new THREE.Mesh(new THREE.BoxGeometry(.88,.025,.04),neonMat);
      balconyGlow.position.set(0,.79,d/2+.29);g.add(balconyGlow);
      const crest=new THREE.Mesh(new THREE.TorusGeometry(.12,.03,8,18),this.mat(0xd8b85e,{metalness:.72,roughness:.22}));
      crest.position.set(0,h*.75,d/2+.025);g.add(crest);
    }else if(mid){
      const canopy=new THREE.Mesh(new THREE.BoxGeometry(.62,.06,.34),roofMat);
      canopy.position.set(0,.54,d/2+.17);canopy.rotation.x=-.08;g.add(canopy);
      const canopyGlow=new THREE.Mesh(new THREE.BoxGeometry(.54,.018,.03),neonMat);
      canopyGlow.position.set(0,.515,d/2+.34);g.add(canopyGlow);
    }

    const lawn=new THREE.Mesh(new THREE.BoxGeometry(w*1.32,.04,d*1.3),this.mat(0x4d6944,{roughness:.98}));
    lawn.position.y=.015;lawn.receiveShadow=true;g.add(lawn);

    // Every property facade faces inward toward the playable street.
    const inwardFacing={North:Math.PI,East:-Math.PI/2,South:0,West:Math.PI/2};
    g.rotation.y=inwardFacing[space.side]??0;
    return g;
  }

  makeSign(text,w=3.1,h=.78){
    const c=document.createElement('canvas');c.width=512;c.height=160;const x=c.getContext('2d');
    x.fillStyle='#10161d';x.fillRect(0,0,512,160);x.fillStyle='#bd934c';x.fillRect(0,0,512,12);
    x.fillStyle='#f5f1e8';x.textAlign='center';x.textBaseline='middle';x.font='700 38px system-ui';
    const label=text.length>18?text.slice(0,18):text;x.fillText(label,256,84);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t}));
  }

  makeFacadePanel(w,h){
    const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');
    x.clearRect(0,0,256,256);
    const cols=4,rows=Math.max(2,Math.min(5,Math.floor(h)));
    const margin=18,gapX=12,gapY=16;
    const ww=(256-margin*2-gapX*(cols-1))/cols;
    const wh=(210-gapY*(rows-1))/rows;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const warm=((row*cols+col)%7===0);
      x.fillStyle=warm?'rgba(244,203,124,.72)':'rgba(112,171,200,.58)';
      x.fillRect(margin+col*(ww+gapX),18+row*(wh+gapY),ww,wh);
      x.fillStyle='rgba(255,255,255,.16)';
      x.fillRect(margin+col*(ww+gapX)+3,21+row*(wh+gapY),ww*.18,wh-6);
    }
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w*.82,Math.max(.8,h*.72)),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
  }

  addFacade(group,w,d,label,side,h=3){
    const glass=new THREE.MeshPhysicalMaterial({color:0x31536c,metalness:.18,roughness:.1,transmission:.12,transparent:true,opacity:.93});
    const sign=this.makeSign(label,w*.78,.62);
    const door=new THREE.Mesh(new THREE.PlaneGeometry(w*.18,.9),glass);
    const facade=this.makeFacadePanel(side==='E'||side==='W'?d:w,h);
    const fy=Math.max(1.25,h*.52);

    if(side==='N'){
      sign.position.set(0,Math.min(h-.28,1.85),-d/2-.025);sign.rotation.y=Math.PI;
      door.position.set(0,.65,-d/2-.03);door.rotation.y=Math.PI;
      facade.position.set(0,fy,-d/2-.018);facade.rotation.y=Math.PI;
    }else if(side==='S'){
      sign.position.set(0,Math.min(h-.28,1.85),d/2+.025);
      door.position.set(0,.65,d/2+.03);
      facade.position.set(0,fy,d/2+.018);
    }else if(side==='E'){
      sign.position.set(w/2+.025,Math.min(h-.28,1.85),0);sign.rotation.y=Math.PI/2;
      door.position.set(w/2+.03,.65,0);door.rotation.y=Math.PI/2;
      facade.position.set(w/2+.018,fy,0);facade.rotation.y=Math.PI/2;
    }else{
      sign.position.set(-w/2-.025,Math.min(h-.28,1.85),0);sign.rotation.y=-Math.PI/2;
      door.position.set(-w/2-.03,.65,0);door.rotation.y=-Math.PI/2;
      facade.position.set(-w/2-.018,fy,0);facade.rotation.y=-Math.PI/2;
    }
    group.add(facade,sign,door);
  }

  makeBuilding(label,w,h,d,material){
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    body.position.y=h/2+.25;body.castShadow=true;body.receiveShadow=true;g.add(body);

    const roofMat=this.mat(0x555d63,{metalness:.46,roughness:.34});
    const roof=new THREE.Mesh(new THREE.BoxGeometry(w*.9,.16,d*.9),roofMat);
    roof.position.y=h+.34;roof.castShadow=true;g.add(roof);

    const hvac=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.45,w*.24),.32,Math.max(.4,d*.22)),this.mat(0x737a7f,{metalness:.52,roughness:.4}));
    hvac.position.set(w*.18,h+.57,-d*.12);hvac.castShadow=true;g.add(hvac);

    const vent=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,.55,8),this.mat(0x686f73,{metalness:.55,roughness:.38}));
    vent.position.set(-w*.2,h+.68,d*.16);vent.castShadow=true;g.add(vent);

    ['N','S','E','W'].forEach(side=>this.addFacade(g,w,d,label,side,h));
    return g;
  }

  loadCityBuildingModel(url){
    if(this.cityBuildingCache.has(url)){
      return Promise.resolve(this.cityBuildingCache.get(url).clone(true));
    }
    return new Promise((resolve,reject)=>{
      this.cityBuildingLoader.load(url,gltf=>{
        const source=gltf.scene||gltf.scenes?.[0];
        if(!source){reject(new Error('Building GLB contained no scene: '+url));return;}
        this.cityBuildingCache.set(url,source);
        resolve(source.clone(true));
      },undefined,reject);
    });
  }

  normalizeCityBuildingModel(model,spec){
    model.updateMatrixWorld(true);
    let box=new THREE.Box3().setFromObject(model);
    const size=box.getSize(new THREE.Vector3());
    const sx=spec.w/Math.max(.001,size.x);
    const sy=spec.h/Math.max(.001,size.y);
    const sz=spec.d/Math.max(.001,size.z);
    const scale=Math.min(sx,sy,sz);
    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);
    box=new THREE.Box3().setFromObject(model);
    const center=box.getCenter(new THREE.Vector3());
    model.position.x-=center.x;
    model.position.z-=center.z;
    model.position.y-=box.min.y;
    model.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=!this.mobileDevice;
      o.receiveShadow=true;
      if(o.material){
        const mats=Array.isArray(o.material)?o.material:[o.material];
        mats.forEach(m=>{
          if(m.name?.toLowerCase().includes('glass')){
            m.transparent=true;
            m.opacity=Math.min(m.opacity??1,.9);
            m.depthWrite=false;
          }
        });
      }
    });
    return model;
  }

  createCityBuilding(spec){
    const holder=new THREE.Group();
    holder.name='City Building: '+spec.name;
    holder.position.set(spec.x,0,spec.z);
    holder.rotation.y=spec.rotation||0;

    // Dedicated parcel gives every building visible breathing room from its neighbors.
    const parcel=new THREE.Mesh(
      new THREE.BoxGeometry(spec.w*1.18,.08,spec.d*1.2),
      this.mat(0x8d8d86,{roughness:.94,metalness:.02})
    );
    parcel.position.y=.18;
    parcel.receiveShadow=true;
    holder.add(parcel);

    const fallbackMat=spec.fallback==='brick'
      ?this.mat(0x713c31,{roughness:.8})
      :this.mat(0x34536a,{metalness:.48,roughness:.22});
    const fallback=this.makeBuilding(spec.name,spec.w*.86,spec.h*.86,spec.d*.82,fallbackMat);
    fallback.position.y=.24;
    fallback.userData.isBuildingFallback=true;
    holder.add(fallback);

    if(spec.model)this.loadCityBuildingModel(spec.model).then(model=>{
      if(!holder.parent)return;
      this.normalizeCityBuildingModel(model,spec);
      model.position.y+=.24;
      model.userData.isCityBuildingGLB=true;
      holder.add(model);
      fallback.visible=false;
    }).catch(error=>{
      console.warn('City building GLB fallback:',spec.name,error);
    });

    return holder;
  }

  buildCityBlocks(){
    // The landmark district stays open in the center. Generic skyline buildings now sit
    // outside the inner streets so streets, plazas and public destinations have real separation.
    const blocks=[
      {name:'North Retail',x:-4.0,z:11.7,w:5.2,h:2.8,d:3.5,rotation:Math.PI,model:'/assets/buildings/market_hall.glb?v=42',fallback:'brick'},
      {name:'North Tower',x:4.0,z:11.7,w:3.4,h:7.8,d:3.35,rotation:Math.PI,model:'/assets/buildings/glass_tower.glb?v=42',fallback:'glass'},
      {name:fusionMode?'Artist Bank':'Motor City Bank',x:-11.7,z:5.0,w:4.65,h:3.35,d:3.0,rotation:Math.PI/2,model:'/assets/buildings/motor_city_bank.glb?v=42',fallback:'glass'},
      {name:'West Tower',x:-11.7,z:-2.55,w:3.3,h:7.15,d:3.25,rotation:Math.PI/2,model:'/assets/buildings/glass_tower.glb?v=42',fallback:'glass'},
      {name:fusionMode?'Music City Market':'Motor City Mall',x:11.7,z:5.0,w:6.35,h:3.35,d:3.4,rotation:-Math.PI/2,model:'/assets/buildings/motor_city_mall.glb?v=42',fallback:'brick'},
      {name:'East Offices',x:11.7,z:-2.7,w:4.15,h:5.45,d:3.05,rotation:-Math.PI/2,model:'/assets/buildings/office_midrise.glb?v=42',fallback:'glass'},
      {name:'South Market',x:-4.0,z:-11.7,w:5.3,h:2.85,d:3.7,rotation:0,model:'/assets/buildings/market_hall.glb?v=42',fallback:'brick'},
      {name:'South Lofts',x:4.05,z:-11.7,w:4.75,h:4.45,d:3.0,rotation:0,model:'/assets/buildings/brick_lofts.glb?v=42',fallback:'brick'}
    ];
    if(fusionMode){
      const names=['BEGENIUS STUDIO','HIP-HOP CAFÉ','COUNTRY PRODUCER','COUNTRY CROSSINGS',
        'LATIN PRODUCER','LATIN QUARTER','GLOBAL PRODUCER','GLOBAL SOUND'];
      blocks.forEach((spec,i)=>{spec.name=names[i];spec.model=null;});
    }
    blocks.forEach(spec=>this.world.add(this.createCityBuilding(spec)));
  }

  buildLandmarks(){
    const brick=this.mat(0x713c31,{roughness:.78});const dark=this.mat(0x3a3239,{metalness:.38,roughness:.3});
    LANDMARKS.forEach(l=>{
      let g;
      if(l.type==='casino'){
        g=this.makeBuilding(fusionMode?'FESTIVAL PAVILION':'GREEK CASINO',4.4,5.6,4.4,dark);
        const crown=new THREE.Mesh(new THREE.CylinderGeometry(.8,1.45,1,8),this.mat(0xb4934e,{metalness:.8,roughness:.16}));crown.position.y=6.35;g.add(crown);
      }else if(l.type==='diner'){
        g=this.makeBuilding(fusionMode?l.name.toUpperCase():'MOTOR DOG GRILL',3.25,1.8,2.3,brick);
        const awn=new THREE.Mesh(new THREE.BoxGeometry(2.7,.16,.62),this.mat(0xb54f38,{roughness:.42}));awn.position.set(0,1.7,1.46);g.add(awn);
      }else if(l.type==='music'){
        g=this.makeBuilding(fusionMode?'MUSIC CITY RADIO':'MOTOR MUSIC',3.7,3.9,2.9,this.mat(0x342d46,{metalness:.25,roughness:.34}));
        const disc=new THREE.Mesh(new THREE.TorusGeometry(.62,.16,16,32),this.mat(0xc19a53,{metalness:.8,roughness:.15}));disc.position.set(1.5,4.45,0);disc.rotation.y=Math.PI/2;g.add(disc);
      }else if(l.type==='market'){
        g=this.makeBuilding(fusionMode?'RECORD STORE':'EAST MARKET',4.1,2.8,3.2,brick);
      }else if(l.type==='factory'){
        g=this.makeBuilding(fusionMode?'COLLAB HALL':'BRIDGE WORKS',4.2,3.0,3.15,brick);
        [-1.05,0,1.05].forEach(x=>{const s=new THREE.Mesh(new THREE.CylinderGeometry(.22,.38,3.4,12),this.mat(0x65574d,{roughness:.76}));s.position.set(x,4.25,0);g.add(s);});
      }else{
        g=this.makeBuilding(fusionMode?'ARTIST MANAGEMENT':'AUTO HERITAGE',3.8,3.2,3.1,this.mat(0x36414b,{metalness:.55,roughness:.27}));
        const wheel=new THREE.Mesh(new THREE.TorusGeometry(.68,.14,14,30),this.mat(0xbac1c7,{metalness:.82,roughness:.12}));wheel.position.set(1.58,3.7,0);wheel.rotation.y=Math.PI/2;g.add(wheel);
      }
      g.position.set(l.x,.2,l.z);g.userData={type:'landmark',id:l.id};
      const ring=new THREE.Mesh(new THREE.RingGeometry(1.8,2.05,48),new THREE.MeshBasicMaterial({color:0xe1c26b,transparent:true,opacity:.15,side:THREE.DoubleSide}));
      ring.rotation.x=-Math.PI/2;ring.position.y=.1;g.add(ring);g.userData.ring=ring;this.world.add(g);this.landmarkGroups.set(l.id,g);
    });
  }

  buildStreetFurniture(){
    const metal=this.mat(0x555e64,{metalness:.72,roughness:.28});
    const streetLight=(x,z,rot=0)=>{
      const g=new THREE.Group();
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.075,2.5,8),metal);pole.position.y=1.45;pole.castShadow=true;g.add(pole);
      const arm=new THREE.Mesh(new THREE.BoxGeometry(.78,.07,.07),metal);arm.position.set(.35,2.62,0);arm.castShadow=true;g.add(arm);
      const lamp=new THREE.Mesh(new THREE.SphereGeometry(.105,10,8),new THREE.MeshStandardMaterial({color:0xffe2ad,emissive:0xffc266,emissiveIntensity:2.5}));
      lamp.position.set(.72,2.57,0);g.add(lamp);g.position.set(x,0,z);g.rotation.y=rot;this.world.add(g);
    };
    [-7,-3,3,7].forEach(x=>{streetLight(x,7.55,Math.PI);streetLight(x,-7.55,0);});
    [-7,-3,3,7].forEach(z=>{streetLight(7.55,z,-Math.PI/2);streetLight(-7.55,z,Math.PI/2);});

    const trafficLight=(x,z,rot=0)=>{
      const g=new THREE.Group();
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.06,2.1,8),metal);pole.position.y=1.2;g.add(pole);
      const box=new THREE.Mesh(new THREE.BoxGeometry(.25,.66,.22),this.mat(0x252a2d,{roughness:.65}));box.position.set(0,2.18,0);g.add(box);
      [[.2,0xdb4c3f],[0,0xe1b642],[-.2,0x5daf65]].forEach(([dy,col])=>{
        const bulb=new THREE.Mesh(new THREE.SphereGeometry(.065,10,8),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.35}));
        bulb.position.set(0,2.18+dy,.12);g.add(bulb);
      });
      g.position.set(x,0,z);g.rotation.y=rot;this.world.add(g);
    };
    trafficLight(2.75,2.75,Math.PI);trafficLight(-2.75,-2.75,0);
    trafficLight(2.75,-2.75,-Math.PI/2);trafficLight(-2.75,2.75,Math.PI/2);
  }

  buildEnvironmentDetail(){
    const grass=this.mat(0x536f47,{roughness:.98});
    const trunk=this.mat(0x6b5138,{roughness:.96});
    const leafMats=[this.mat(0x456e3f,{roughness:.96}),this.mat(0x527a47,{roughness:.96})];

    const tree=(x,z,s=1)=>{
      const g=new THREE.Group();
      const t=new THREE.Mesh(new THREE.CylinderGeometry(.08*s,.12*s,.78*s,8),trunk);t.position.y=.62*s;t.castShadow=true;g.add(t);
      const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.42*s,1),leafMats[(Math.abs(Math.round((x+z)*10)))%2]);
      crown.position.y=1.18*s;crown.scale.set(1,.92,1);crown.castShadow=true;g.add(crown);
      g.position.set(x,.2,z);this.world.add(g);
    };

    [[-7.1,6.7],[7.1,6.7],[-7.1,-6.7],[7.1,-6.7],[-4.4,6.7],[4.4,-6.7],[6.7,4.3],[-6.7,-4.2]].forEach(([x,z],i)=>{
      const patch=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.06,18),grass);patch.position.set(x,.3,z);this.world.add(patch);
      tree(x,z,.9+(i%3)*.08);
    });

    const parked=[
      [-4.7,1.05,0x7d2424,0],[-7.5,-1.1,0x234f7d,0],[4.8,-1.05,0xb5b5b2,Math.PI],
      [7.5,1.05,0x4a5d39,Math.PI],[-1.05,4.7,0x292d31,Math.PI/2],[1.05,-4.7,0x8e6732,-Math.PI/2]
    ];
    parked.forEach(([x,z,color,rot])=>{
      const c=this.makeCar(color);c.scale.setScalar(.48);c.position.set(x,.31,z);c.rotation.y=rot;this.world.add(c);
    });

    [[-3.4,3.7],[3.6,3.5],[-3.5,-3.5],[3.4,-3.7]].forEach(([x,z])=>{
      const planter=new THREE.Mesh(new THREE.CylinderGeometry(.34,.4,.32,12),this.mat(0x6d665c,{roughness:.88}));
      planter.position.set(x,.38,z);planter.castShadow=true;this.world.add(planter);tree(x,z,.55);
    });

    // Benches.
    const wood=this.mat(0x795b3d,{roughness:.86});const metal=this.mat(0x42494d,{metalness:.55,roughness:.42});
    [[-5.3,6.55,0],[5.3,-6.55,Math.PI],[-6.55,-5.2,Math.PI/2],[6.55,5.2,-Math.PI/2]].forEach(([x,z,rot])=>{
      const g=new THREE.Group();
      const seat=new THREE.Mesh(new THREE.BoxGeometry(1,.09,.32),wood);seat.position.y=.45;seat.castShadow=true;g.add(seat);
      const back=new THREE.Mesh(new THREE.BoxGeometry(1,.38,.07),wood);back.position.set(0,.67,-.15);back.rotation.x=-.08;g.add(back);
      [-.37,.37].forEach(px=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(.06,.42,.06),metal);leg.position.set(px,.24,0);g.add(leg);});
      g.position.set(x,.2,z);g.rotation.y=rot;this.world.add(g);
    });

    // Fire hydrants provide recognizable street scale.
    const red=this.mat(0xb53e35,{metalness:.28,roughness:.5});
    [[-5.7,7.25],[5.8,-7.25],[7.25,-5.6],[-7.25,5.7]].forEach(([x,z])=>{
      const g=new THREE.Group();
      const body=new THREE.Mesh(new THREE.CylinderGeometry(.11,.14,.46,10),red);body.position.y=.36;g.add(body);
      const cap=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),red);cap.scale.y=.55;cap.position.y=.62;g.add(cap);
      const side=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.25,8),red);side.rotation.z=Math.PI/2;side.position.set(.13,.42,0);g.add(side);
      g.position.set(x,.2,z);this.world.add(g);
    });
  }

  makeCar(color=0x2d6fa9,variant='sedan',detail='standard',options={}){
    const g=new THREE.Group();
    const hi=detail==='player';

    const specs={
      muscle:{length:1.95,width:.86,bodyH:.31,cabinL:.72,cabinH:.42,cabinX:-.25,hoodL:.72,trunkL:.34,wheelR:.22,ride:.22},
      coupe:{length:1.84,width:.82,bodyH:.28,cabinL:.76,cabinH:.36,cabinX:-.08,hoodL:.61,trunkL:.28,wheelR:.21,ride:.20},
      luxury:{length:2.04,width:.87,bodyH:.32,cabinL:.94,cabinH:.44,cabinX:-.12,hoodL:.63,trunkL:.37,wheelR:.218,ride:.22},
      suv:{length:1.92,width:.9,bodyH:.4,cabinL:1.04,cabinH:.54,cabinX:-.08,hoodL:.49,trunkL:.25,wheelR:.238,ride:.26},
      offroad:{length:1.92,width:.92,bodyH:.42,cabinL:1.0,cabinH:.55,cabinX:-.06,hoodL:.5,trunkL:.24,wheelR:.255,ride:.3},
      exotic:{length:1.88,width:.9,bodyH:.24,cabinL:.69,cabinH:.31,cabinX:-.12,hoodL:.64,trunkL:.31,wheelR:.225,ride:.18},
      classic:{length:2.08,width:.89,bodyH:.33,cabinL:.76,cabinH:.42,cabinX:-.24,hoodL:.78,trunkL:.38,wheelR:.225,ride:.23},
      sedan:{length:1.86,width:.82,bodyH:.3,cabinL:.86,cabinH:.41,cabinX:-.1,hoodL:.55,trunkL:.32,wheelR:.21,ride:.22}
    };
    const s=specs[variant]||specs.sedan;
    const rimDef=getRim(options.rimStyle||'factory');
    const finishColors={chrome:0xe6edf2,silver:0xb8c2c9,dark:0x40474d,gold:0xd1a34d};
    const rimColor=finishColors[rimDef.finish]||finishColors.silver;
    const customRimMat=new THREE.MeshPhysicalMaterial({
      color:rimColor,metalness:.96,roughness:rimDef.finish==='dark'?.2:.1,clearcoat:.9,clearcoatRoughness:.06
    });

    const paint=new THREE.MeshPhysicalMaterial({
      color,metalness:.7,roughness:.2,clearcoat:1,clearcoatRoughness:.1,
      sheen:.08,sheenColor:new THREE.Color(0xffffff)
    });
    const paintDark=new THREE.MeshPhysicalMaterial({
      color:new THREE.Color(color).multiplyScalar(.63),metalness:.72,roughness:.2,clearcoat:.85,clearcoatRoughness:.12
    });
    const dark=this.mat(0x111417,{metalness:.18,roughness:.7});
    const chrome=new THREE.MeshPhysicalMaterial({color:0xcfd5d8,metalness:.94,roughness:.12,clearcoat:.55});
    const glass=new THREE.MeshPhysicalMaterial({
      color:0x5f8fa7,metalness:.2,roughness:.06,transmission:.2,transparent:true,opacity:.86,
      clearcoat:1,clearcoatRoughness:.05
    });
    const headMat=new THREE.MeshBasicMaterial({color:0xeaf7ff,toneMapped:false});
    const tailMat=new THREE.MeshBasicMaterial({color:0xff312b,toneMapped:false});
    const amberMat=new THREE.MeshBasicMaterial({color:0xffae38,toneMapped:false});

    // Main rounded body tub.
    const lower=new THREE.Mesh(new RoundedBoxGeometry(s.length,s.bodyH,s.width,4,.12),paint);
    lower.position.y=s.ride+s.bodyH*.52;lower.castShadow=true;lower.receiveShadow=true;g.add(lower);

    // Lower rocker panels make the car sit lower and read more realistically.
    const rocker=new THREE.Mesh(new RoundedBoxGeometry(s.length*.91,.12,s.width*.94,3,.045),paintDark);
    rocker.position.set(-.02,s.ride+.03,0);rocker.castShadow=true;g.add(rocker);

    // Hood and trunk are separate sculpted masses.
    const hood=new THREE.Mesh(new RoundedBoxGeometry(s.hoodL,.16,s.width*.91,3,.07),paint);
    hood.position.set(s.length*.5-s.hoodL*.49,s.ride+s.bodyH+.05,0);hood.castShadow=true;g.add(hood);
    const trunk=new THREE.Mesh(new RoundedBoxGeometry(s.trunkL,.15,s.width*.9,3,.06),paint);
    trunk.position.set(-s.length*.5+s.trunkL*.48,s.ride+s.bodyH+.035,0);trunk.castShadow=true;g.add(trunk);

    // Cabin and glass house.
    const cabinBody=new THREE.Mesh(new RoundedBoxGeometry(s.cabinL,s.cabinH,s.width*.78,4,.11),paintDark);
    cabinBody.position.set(s.cabinX,s.ride+s.bodyH+s.cabinH*.47,0);
    cabinBody.scale.set(1,.92,1);cabinBody.castShadow=true;g.add(cabinBody);

    const glassHouse=new THREE.Mesh(new RoundedBoxGeometry(s.cabinL*.88,s.cabinH*.76,s.width*.755,4,.09),glass);
    glassHouse.position.set(s.cabinX+.02,s.ride+s.bodyH+s.cabinH*.57,0);
    glassHouse.scale.set(1,.9,1);glassHouse.castShadow=true;g.add(glassHouse);

    // Painted roof panel.
    const roof=new THREE.Mesh(new RoundedBoxGeometry(s.cabinL*.56,.07,s.width*.7,3,.035),paintDark);
    roof.position.set(s.cabinX-.03,s.ride+s.bodyH+s.cabinH*.97,0);roof.castShadow=true;g.add(roof);

    // Windshield / rear window angle definition.
    const frontGlass=new THREE.Mesh(new THREE.BoxGeometry(.035,s.cabinH*.62,s.width*.7),glass);
    frontGlass.position.set(s.cabinX+s.cabinL*.43,s.ride+s.bodyH+s.cabinH*.55,0);frontGlass.rotation.z=-.28;g.add(frontGlass);
    const rearGlass=new THREE.Mesh(new THREE.BoxGeometry(.035,s.cabinH*.56,s.width*.68),glass);
    rearGlass.position.set(s.cabinX-s.cabinL*.43,s.ride+s.bodyH+s.cabinH*.53,0);rearGlass.rotation.z=.28;g.add(rearGlass);

    // Front fascia: grille, lower intake, bumper and lamps.
    const frontX=s.length*.5+.008;
    const rearX=-s.length*.5-.008;
    const grilleW=variant==='luxury'?.48:variant==='muscle'?.58:.42;
    const grille=new THREE.Mesh(new RoundedBoxGeometry(.035,.17,grilleW,2,.018),dark);
    grille.position.set(frontX,s.ride+s.bodyH*.62,0);g.add(grille);
    const grilleBar=new THREE.Mesh(new THREE.BoxGeometry(.04,.025,grilleW*.86),chrome);
    grilleBar.position.set(frontX+.014,s.ride+s.bodyH*.64,0);g.add(grilleBar);
    const lowerIntake=new THREE.Mesh(new RoundedBoxGeometry(.03,.08,s.width*.42,2,.015),dark);
    lowerIntake.position.set(frontX+.008,s.ride+.11,0);g.add(lowerIntake);
    const frontBumper=new THREE.Mesh(new RoundedBoxGeometry(.055,.11,s.width*.9,2,.025),paintDark);
    frontBumper.position.set(frontX-.01,s.ride+.12,0);g.add(frontBumper);
    const rearBumper=new THREE.Mesh(new RoundedBoxGeometry(.055,.1,s.width*.88,2,.025),paintDark);
    rearBumper.position.set(rearX+.01,s.ride+.12,0);g.add(rearBumper);

    // Headlamps / running lights.
    const lightZ=s.width*.31;
    [-lightZ,lightZ].forEach(z=>{
      const h=new THREE.Mesh(new RoundedBoxGeometry(.04,.105,.19,2,.018),headMat);
      h.position.set(frontX+.016,s.ride+s.bodyH*.78,z);g.add(h);
      const drl=new THREE.Mesh(new THREE.BoxGeometry(.043,.018,.21),headMat);
      drl.position.set(frontX+.019,s.ride+s.bodyH*.87,z);g.add(drl);

      const t=new THREE.Mesh(new RoundedBoxGeometry(.04,.09,.19,2,.018),tailMat);
      t.position.set(rearX-.015,s.ride+s.bodyH*.76,z);g.add(t);
    });

    // Turn signals.
    [-s.width*.39,s.width*.39].forEach(z=>{
      const a=new THREE.Mesh(new THREE.BoxGeometry(.042,.035,.08),amberMat);
      a.position.set(frontX+.02,s.ride+s.bodyH*.69,z);g.add(a);
    });

    // Mirrors.
    if(hi){
      [-1,1].forEach(sign=>{
        const stem=new THREE.Mesh(new THREE.BoxGeometry(.12,.025,.025),dark);
        stem.position.set(s.cabinX+s.cabinL*.22,s.ride+s.bodyH+s.cabinH*.56,sign*s.width*.47);g.add(stem);
        const mirror=new THREE.Mesh(new RoundedBoxGeometry(.14,.065,.08,2,.025),paint);
        mirror.position.set(s.cabinX+s.cabinL*.27,s.ride+s.bodyH+s.cabinH*.58,sign*s.width*.52);g.add(mirror);
      });
    }

    // Wheels with tires, real multi-spoke rims, brake discs and calipers.
    const wheels=[];
    const axleX=[-s.length*.31,s.length*.31];
    const wheelZ=s.width*.5+.015;
    const rimRadius=s.wheelR*(hi?rimDef.scale:.52);
    axleX.forEach((x,i)=>{
      [-wheelZ,wheelZ].forEach((z,j)=>{
        const wheelGroup=new THREE.Group();

        const tire=new THREE.Mesh(new THREE.CylinderGeometry(s.wheelR,s.wheelR,.17,hi?30:18),dark);
        tire.rotation.x=Math.PI/2;tire.castShadow=true;wheelGroup.add(tire);

        if(hi&&variant==='offroad'){
          // Chunkier sidewall/tread for the premium 4x4 piece.
          const tread=new THREE.Mesh(new THREE.TorusGeometry(s.wheelR*.88,.032,8,24),dark);
          wheelGroup.add(tread);
        }

        const disc=new THREE.Mesh(
          new THREE.CylinderGeometry(s.wheelR*.44,s.wheelR*.44,.12,22),
          this.mat(0x7a8186,{metalness:.88,roughness:.28})
        );
        disc.rotation.x=Math.PI/2;wheelGroup.add(disc);

        const rimLip=new THREE.Mesh(new THREE.TorusGeometry(rimRadius,.022,8,28),customRimMat);
        wheelGroup.add(rimLip);

        const rimHub=new THREE.Mesh(new THREE.CylinderGeometry(rimRadius*.2,rimRadius*.2,.16,16),customRimMat);
        rimHub.rotation.x=Math.PI/2;wheelGroup.add(rimHub);

        const spokeCount=hi?rimDef.spokes:5;
        for(let k=0;k<spokeCount;k++){
          const spoke=new THREE.Mesh(
            new THREE.BoxGeometry(rimRadius*.78,.028,.028),
            customRimMat
          );
          spoke.rotation.z=(k/spokeCount)*Math.PI*2;
          wheelGroup.add(spoke);
        }

        if(hi){
          const caliper=new THREE.Mesh(
            new THREE.BoxGeometry(.05,.095,.045),
            new THREE.MeshStandardMaterial({
              color:variant==='offroad'?0xe27d22:variant==='luxury'?0xd6aa4d:0xb43128,
              metalness:.45,roughness:.38
            })
          );
          caliper.position.set(.045,.035,z>0?.09:-.09);wheelGroup.add(caliper);
        }

        wheelGroup.position.set(x,s.ride,z);
        g.add(wheelGroup);wheels.push(wheelGroup);
      });
    });

    // Door seams / side trim for player cars.
    if(hi){
      const seamMat=new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.38,depthWrite:false});
      [-1,1].forEach(sign=>{
        const sideZ=sign*(s.width*.5+.011);
        [-.2,.28].forEach(x=>{
          const seam=new THREE.Mesh(new THREE.PlaneGeometry(.015,.31),seamMat);
          seam.position.set(x,s.ride+s.bodyH*.83,sideZ);
          seam.rotation.y=sign>0?0:Math.PI;g.add(seam);
        });
        const handle=new THREE.Mesh(new RoundedBoxGeometry(.14,.025,.018,2,.007),chrome);
        handle.position.set(-.12,s.ride+s.bodyH+s.cabinH*.16,sideZ);g.add(handle);
      });
    }

    // Small license plates front/rear.
    if(hi){
      const plateMat=new THREE.MeshBasicMaterial({color:0xdde9f1,toneMapped:false});
      const plateF=new THREE.Mesh(new THREE.PlaneGeometry(.23,.08),plateMat);plateF.position.set(frontX+.022,s.ride+.24,0);plateF.rotation.y=Math.PI/2;g.add(plateF);
      const plateR=new THREE.Mesh(new THREE.PlaneGeometry(.23,.08),plateMat);plateR.position.set(rearX-.022,s.ride+.24,0);plateR.rotation.y=-Math.PI/2;g.add(plateR);
    }

    // Soft contact shadow.
    const shadow=new THREE.Mesh(
      new THREE.CircleGeometry(s.length*.43,28),
      new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.2,depthWrite:false})
    );
    shadow.rotation.x=-Math.PI/2;shadow.scale.set(1,.5,1);shadow.position.y=.012;g.add(shadow);

    // Variant-specific details make garage purchases visibly different.
    if(variant==='muscle'){
      const scoop=new THREE.Mesh(new RoundedBoxGeometry(.34,.07,.34,2,.025),paintDark);
      scoop.position.set(.42,s.ride+s.bodyH+.17,0);g.add(scoop);
      const stripe=new THREE.Mesh(new THREE.BoxGeometry(.72,.012,.16),dark);
      stripe.position.set(.38,s.ride+s.bodyH+.15,0);g.add(stripe);
    }else if(variant==='coupe'){
      const lip=new THREE.Mesh(new THREE.BoxGeometry(.06,.045,s.width*.78),paintDark);
      lip.position.set(frontX+.02,s.ride+.08,0);g.add(lip);
      const spoiler=new THREE.Mesh(new THREE.BoxGeometry(.08,.055,s.width*.68),paintDark);
      spoiler.position.set(rearX-.05,s.ride+s.bodyH+.18,0);g.add(spoiler);
    }else if(variant==='luxury'){
      const hoodOrnament=new THREE.Mesh(new THREE.SphereGeometry(.025,8,8),chrome);
      hoodOrnament.position.set(.55,s.ride+s.bodyH+.18,0);g.add(hoodOrnament);
      [-1,1].forEach(sign=>{
        const trim=new THREE.Mesh(new THREE.BoxGeometry(s.length*.72,.022,.022),chrome);
        trim.position.set(-.05,s.ride+s.bodyH*.92,sign*(s.width*.48));g.add(trim);
      });
    }else if(variant==='suv'){
      [-s.width*.28,s.width*.28].forEach(z=>{
        const rail=new THREE.Mesh(new THREE.BoxGeometry(s.cabinL*.68,.035,.035),chrome);
        rail.position.set(s.cabinX,s.ride+s.bodyH+s.cabinH*1.05,z);g.add(rail);
      });
      const rearGlassBand=new THREE.Mesh(new THREE.BoxGeometry(.05,.22,s.width*.65),glass);
      rearGlassBand.position.set(rearX+.24,s.ride+s.bodyH+s.cabinH*.42,0);g.add(rearGlassBand);
    }else if(variant==='offroad'){
      [-s.width*.29,s.width*.29].forEach(z=>{
        const rail=new THREE.Mesh(new THREE.BoxGeometry(s.cabinL*.72,.04,.04),chrome);
        rail.position.set(s.cabinX,s.ride+s.bodyH+s.cabinH*1.06,z);g.add(rail);
      });
      [-1,1].forEach(sign=>{
        const step=new THREE.Mesh(new THREE.BoxGeometry(s.length*.62,.05,.065),this.mat(0x2d3439,{metalness:.42,roughness:.5}));
        step.position.set(-.03,s.ride-.015,sign*(s.width*.55));g.add(step);
      });
      [-s.length*.31,s.length*.31].forEach(px=>[-1,1].forEach(sign=>{
        const flare=new THREE.Mesh(new RoundedBoxGeometry(.31,.12,.07,2,.022),dark);
        flare.position.set(px,s.ride+s.wheelR*.52,sign*(s.width*.52));g.add(flare);
      }));
      // Generic vertical-slot off-road grille, intentionally not branded.
      for(let k=-2;k<=2;k++){
        const slot=new THREE.Mesh(new THREE.BoxGeometry(.02,.12,.042),dark);
        slot.position.set(frontX+.025,s.ride+s.bodyH*.67,k*.085);g.add(slot);
      }
      // Rear spare tire.
      const spare=new THREE.Mesh(new THREE.CylinderGeometry(s.wheelR*.84,s.wheelR*.84,.13,24),dark);
      spare.rotation.z=Math.PI/2;spare.position.set(rearX-.09,s.ride+s.bodyH*.77,0);g.add(spare);
      const spareHub=new THREE.Mesh(new THREE.CylinderGeometry(s.wheelR*.35,s.wheelR*.35,.145,18),customRimMat);
      spareHub.rotation.z=Math.PI/2;spareHub.position.copy(spare.position);g.add(spareHub);
    }else if(variant==='exotic'){
      const splitter=new THREE.Mesh(new THREE.BoxGeometry(.08,.035,s.width*.86),dark);
      splitter.position.set(frontX+.025,s.ride+.045,0);g.add(splitter);
      const wing=new THREE.Mesh(new THREE.BoxGeometry(.08,.045,s.width*.78),paintDark);
      wing.position.set(rearX-.14,s.ride+s.bodyH+.26,0);g.add(wing);
      [-.3,.3].forEach(z=>{
        const post=new THREE.Mesh(new THREE.BoxGeometry(.035,.2,.035),dark);
        post.position.set(rearX-.09,s.ride+s.bodyH+.17,z);g.add(post);
      });
    }else if(variant==='classic'){
      const hoodStrip=new THREE.Mesh(new THREE.BoxGeometry(s.hoodL*.8,.018,.055),chrome);
      hoodStrip.position.set(.52,s.ride+s.bodyH+.16,0);g.add(hoodStrip);
      const frontChrome=new THREE.Mesh(new THREE.BoxGeometry(.065,.11,s.width*.92),chrome);
      frontChrome.position.set(frontX+.025,s.ride+.13,0);g.add(frontChrome);
      const rearChrome=frontChrome.clone();rearChrome.position.x=rearX-.025;g.add(rearChrome);
    }

    g.userData.wheels=wheels;
    g.userData.variant=variant;
    return g;
  }

  loadRealVehicleAsset(spec){
    if(!spec?.url)return Promise.reject(new Error('No real vehicle source'));
    if(this.realVehicleCache.has(spec.id))return this.realVehicleCache.get(spec.id);
    const promise=new Promise((resolve,reject)=>{
      this.realVehicleLoader.load(
        spec.url,
        gltf=>resolve(gltf.scene),
        undefined,
        err=>reject(err||new Error('Vehicle model failed to load'))
      );
    });
    this.realVehicleCache.set(spec.id,promise);
    return promise;
  }

  cloneRealVehicleMaterial(material,spec,paintColor,rimDef){
    if(!material)return material;
    const m=material.clone();
    const name=m.name||'';

    if(spec.paintMaterial?.test(name) && m.color){
      m.color.setHex(paintColor);
      if('metalness' in m)m.metalness=Math.max(.45,m.metalness??.45);
      if('roughness' in m)m.roughness=Math.min(.28,m.roughness??.28);
      if('clearcoat' in m)m.clearcoat=Math.max(.8,m.clearcoat??0);
      if('clearcoatRoughness' in m)m.clearcoatRoughness=Math.min(.12,m.clearcoatRoughness??.12);
    }

    if(/rim/i.test(name) && m.color){
      const finish={chrome:0xe6edf2,silver:0xb7c1c8,dark:0x444b51,gold:0xd2a34b}[rimDef.finish]||0xc3ccd2;
      m.color.setHex(finish);
      if('metalness' in m)m.metalness=.95;
      if('roughness' in m)m.roughness=rimDef.finish==='dark'?.2:.1;
    }

    if('envMapIntensity' in m)m.envMapIntensity=Math.max(1.15,m.envMapIntensity??1);
    m.needsUpdate=true;
    return m;
  }

  prepareRealVehicleModel(baseScene,spec,paintColor,rimStyle='factory'){
    const model=baseScene.clone(true);
    const rimDef=getRim(rimStyle||'factory');

    model.traverse(o=>{
      const name=o.name||'';
      if(o.isCamera||o.isLight||spec.hideName?.test(name)){
        o.visible=false;
        return;
      }
      if(o.isMesh){
        o.castShadow=true;
        o.receiveShadow=true;
        if(Array.isArray(o.material)){
          o.material=o.material.map(m=>this.cloneRealVehicleMaterial(m,spec,paintColor,rimDef));
        }else{
          o.material=this.cloneRealVehicleMaterial(o.material,spec,paintColor,rimDef);
        }
      }
    });

    // Normalize any upstream coordinate system into Detroit Empire's +X vehicle axis.
    model.updateMatrixWorld(true);
    let box=new THREE.Box3().setFromObject(model);
    let size=box.getSize(new THREE.Vector3());
    if(size.z>size.x){
      model.rotation.y+=Math.PI/2;
      model.updateMatrixWorld(true);
      box=new THREE.Box3().setFromObject(model);
      size=box.getSize(new THREE.Vector3());
    }

    const longest=Math.max(size.x,.0001);
    const scale=(spec.targetLength||1.92)/longest;
    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);

    box=new THREE.Box3().setFromObject(model);
    let center=box.getCenter(new THREE.Vector3());
    model.position.x-=center.x;
    model.position.z-=center.z;
    model.position.y-=box.min.y;
    model.updateMatrixWorld(true);

    // Car Concept exposes a hood node; use it to guarantee that the nose points +X.
    if(spec.hoodName){
      const hood=model.getObjectByName(spec.hoodName);
      if(hood){
        const hoodPos=new THREE.Vector3();
        hood.getWorldPosition(hoodPos);
        if(hoodPos.x<0){
          model.rotation.y+=Math.PI;
          model.updateMatrixWorld(true);
          box=new THREE.Box3().setFromObject(model);
          center=box.getCenter(new THREE.Vector3());
          model.position.x-=center.x;
          model.position.z-=center.z;
        }
      }
    }else if(spec.frontSign<0){
      model.rotation.y+=Math.PI;
    }

    const visual=new THREE.Group();
    visual.name='RealVehicleVisual';
    visual.add(model);
    visual.position.y=-.1;
    visual.userData.realVehicle=true;
    visual.userData.source=spec.id;
    return visual;
  }

  async attachRealVehicleModel(root,vehicleId,paintColor=0x2f80ed,rimStyle='factory'){
    if(fusionMode && vehicleId!=='motor_aero_25')return false; // Keep distinct procedural Detroit cars; load the original Motor Aero GLB.
    const spec=getRealVehicleSpec(vehicleId);
    if(!spec)return false;
    try{
      const base=await this.loadRealVehicleAsset(spec);
      if(!root?.parent && !root?.userData?.allowDetachedRealModel)return false;
      const visual=this.prepareRealVehicleModel(base,spec,paintColor,rimStyle);
      const fallback=root.userData.fallbackVehicle;
      if(fallback)fallback.visible=false;
      if(root.userData.realVehicle)root.remove(root.userData.realVehicle);
      root.add(visual);
      root.userData.realVehicle=visual;
      root.userData.realModelLoaded=true;
      // Keep real asset wheels intact; do not rotate unknown upstream wheel pivots.
      root.userData.wheels=[];
      return true;
    }catch(err){
      console.warn('Real vehicle model unavailable; procedural fallback remains.',vehicleId,err);
      return false;
    }
  }

  makeVehicleVisual(vehicleId,color=0x2f80ed,detail='player',rimStyle='factory'){
    const vehicle=getVehicle(vehicleId);
    const root=new THREE.Group();
    const fallback=this.makeCar(color,vehicle.model,detail,{rimStyle});
    root.add(fallback);
    root.userData.fallbackVehicle=fallback;
    root.userData.wheels=fallback.userData.wheels||[];
    root.userData.vehicleId=vehicle.id;
    root.userData.rimId=rimStyle;
    // Real GLB attaches asynchronously; fallback prevents blank pieces on slow mobile connections.
    this.attachRealVehicleModel(root,vehicle.id,color,rimStyle);
    return root;
  }

  buildMotorGallery(){
    const g=new THREE.Group();
    g.name='Motor City Garage';
    const asphalt=this.mat(0x20252a,{roughness:.94,metalness:.03});
    const lot=new THREE.Mesh(new THREE.BoxGeometry(4.9,.1,3.45),asphalt);
    lot.position.y=.22;lot.receiveShadow=true;g.add(lot);

    const curb=this.mat(0x9fa5a7,{roughness:.72,metalness:.18});
    const rim=new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(4.95,.13,3.5)),
      new THREE.LineBasicMaterial({color:0x25a9ff,transparent:true,opacity:.72,toneMapped:false})
    );
    rim.position.y=.24;g.add(rim);

    const showroom=new THREE.Mesh(
      new THREE.BoxGeometry(2.05,1.05,1.15),
      new THREE.MeshPhysicalMaterial({color:0x111820,metalness:.55,roughness:.22,clearcoat:.9,clearcoatRoughness:.14})
    );
    showroom.position.set(-1.12,.78,-.86);showroom.castShadow=true;g.add(showroom);

    const glass=new THREE.Mesh(
      new THREE.PlaneGeometry(1.68,.66),
      new THREE.MeshBasicMaterial({color:0x6bc7ff,transparent:true,opacity:.55,toneMapped:false,side:THREE.DoubleSide})
    );
    glass.position.set(-1.12,.78,-1.445);g.add(glass);

    const sign=this.makeSign('MOTOR GALLERY',2.05,.48);
    sign.position.set(-1.12,1.52,-1.46);g.add(sign);

    // Real 3D display inventory on the lot.
    const display=[
      {vehicle:'woodward_coupe',color:0xd9dde0,rim:'five_star',x:.35,z:-.92,rot:0},
      {vehicle:'motor_ridge_4x4',color:0x15181c,rim:'forged_24',x:1.48,z:-.05,rot:Math.PI/2},
      {vehicle:'empire_twelve',color:0x9e7a35,rim:'mesh_20',x:.28,z:.92,rot:Math.PI},
      {vehicle:'motor_aero_25',color:0xd92736,rim:'turbine',x:1.55,z:1.0,rot:-Math.PI/2}
    ];
    const showroomInventory=this.mobileDevice?[display[0],display[3]]:display;
    showroomInventory.forEach(d=>{
      const c=this.makeVehicleVisual(d.vehicle,d.color,'standard',d.rim);
      c.scale.setScalar(.42);c.position.set(d.x,.3,d.z);c.rotation.y=d.rot;g.add(c);
    });

    // Lit prize turntable.
    const turntable=new THREE.Mesh(
      new THREE.CylinderGeometry(.78,.78,.1,36),
      new THREE.MeshPhysicalMaterial({color:0x313942,metalness:.7,roughness:.22,clearcoat:.7})
    );
    turntable.position.set(-1.22,.32,.92);g.add(turntable);
    const ring=new THREE.Mesh(
      new THREE.TorusGeometry(.68,.025,8,36),
      new THREE.MeshBasicMaterial({color:0xd8b45d,toneMapped:false})
    );
    ring.rotation.x=Math.PI/2;ring.position.set(-1.22,.39,.92);g.add(ring);

    g.position.set(-9.9,.05,10.35);
    this.world.add(g);
    this.motorGallery={group:g,prizeLocal:new THREE.Vector3(-1.22,.42,.92),prizeCar:null};
  }

  makePoliceCruiser(){
    const g=this.makeVehicleVisual('city_standard',0xe8edf0,'standard','factory');
    const dark=this.mat(0x101318,{roughness:.45,metalness:.35});
    [-1,1].forEach(sign=>{
      const door=new THREE.Mesh(new THREE.BoxGeometry(.62,.23,.025),dark);
      door.position.set(-.08,.48,sign*.421);g.add(door);
    });
    const barBase=new THREE.Mesh(new THREE.BoxGeometry(.42,.045,.12),dark);
    barBase.position.set(-.08,.91,0);g.add(barBase);
    const red=new THREE.Mesh(new THREE.BoxGeometry(.18,.06,.1),new THREE.MeshBasicMaterial({color:0xff2b38,toneMapped:false}));
    red.position.set(-.18,.95,0);g.add(red);
    const blue=new THREE.Mesh(new THREE.BoxGeometry(.18,.06,.1),new THREE.MeshBasicMaterial({color:0x279dff,toneMapped:false}));
    blue.position.set(.02,.95,0);g.add(blue);
    g.userData.policeLights={red,blue};
    return g;
  }

  playTrafficStop(player,index=0){
    const token=this.playerTokens.get(player?.id);if(!token)return Promise.resolve();
    const cruiser=this.makePoliceCruiser();
    cruiser.scale.setScalar(.62);
    cruiser.rotation.y=token.rotation.y;

    const heading=token.rotation.y;
    const forward=new THREE.Vector3(Math.cos(heading),0,-Math.sin(heading));
    const from=token.position.clone().addScaledVector(forward,-5.4);
    const to=token.position.clone().addScaledVector(forward,-1.75);
    from.y=to.y=.6;cruiser.position.copy(from);
    this.scene.add(cruiser);

    this.droneActive=true;
    if(this.reduceMotion){
      cruiser.position.copy(to);
      this.desiredTarget.copy(token.position);
      this.desiredPos.copy(token.position).add(new THREE.Vector3(4.6,4.2,4.6));
      setTimeout(()=>{this.scene.remove(cruiser);this.droneActive=false;},700);
      return new Promise(r=>setTimeout(r,760));
    }

    return new Promise(resolve=>{
      const t0=performance.now(),duration=1900;
      const frame=now=>{
        const t=Math.min(1,(now-t0)/duration);
        const e=1-Math.pow(1-t,3);
        cruiser.position.lerpVectors(from,to,e);
        const mid=token.position.clone().lerp(cruiser.position,.35);
        this.desiredTarget.lerp(mid,.18);
        this.desiredPos.set(mid.x+4.9,mid.y+4.2,mid.z+4.7);

        const flash=Math.floor((now-t0)/150)%2===0;
        cruiser.userData.policeLights.red.visible=flash;
        cruiser.userData.policeLights.blue.visible=!flash;

        if(t<1)requestAnimationFrame(frame);
        else{
          setTimeout(()=>{
            this.scene.remove(cruiser);
            this.droneActive=false;
            resolve();
          },900);
        }
      };
      requestAnimationFrame(frame);
    });
  }

  playCarShow(player,index=0){
    const token=this.playerTokens.get(player?.id);if(!token)return Promise.resolve();
    const show=new THREE.Group();
    const ring=new THREE.Mesh(
      new THREE.TorusGeometry(1.22,.035,8,48),
      new THREE.MeshBasicMaterial({color:0xd8b45d,transparent:true,opacity:.9,toneMapped:false})
    );
    ring.rotation.x=Math.PI/2;ring.position.y=.04;show.add(ring);
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2;
      const bulb=new THREE.Mesh(
        new THREE.SphereGeometry(.045,8,8),
        new THREE.MeshBasicMaterial({color:i%2?0x48b7ff:0xffc76b,toneMapped:false})
      );
      bulb.position.set(Math.cos(a)*1.28,.12,Math.sin(a)*1.28);show.add(bulb);
    }
    show.position.set(token.position.x,.5,token.position.z);this.scene.add(show);
    this.droneActive=true;

    if(this.reduceMotion){
      this.desiredTarget.copy(token.position);
      this.desiredPos.set(token.position.x+4.7,4.7,token.position.z+4.7);
      setTimeout(()=>{this.scene.remove(show);this.droneActive=false;},700);
      return new Promise(r=>setTimeout(r,760));
    }

    return new Promise(resolve=>{
      const t0=performance.now(),duration=2100;
      const frame=now=>{
        const t=Math.min(1,(now-t0)/duration),a=t*Math.PI*1.65;
        show.rotation.y+=.012;
        this.desiredTarget.set(token.position.x,token.position.y+.3,token.position.z);
        this.desiredPos.set(token.position.x+Math.cos(a)*4.7,token.position.y+4.3,token.position.z+Math.sin(a)*4.7);
        if(t<1)requestAnimationFrame(frame);
        else{
          this.scene.remove(show);this.droneActive=false;resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  dealerReveal(vehicleId='city_standard'){
    if(!this.motorGallery)return Promise.resolve();
    const vehicle=getVehicle(vehicleId);
    const gallery=this.motorGallery;
    if(gallery.prizeCar)gallery.group.remove(gallery.prizeCar);

    const prize=this.makeVehicleVisual(vehicle.id,0xd6ad56,'player',vehicle.includedRim||'forged_24');
    prize.scale.setScalar(.55);
    prize.position.copy(gallery.prizeLocal);
    prize.rotation.y=-.35;
    gallery.group.add(prize);gallery.prizeCar=prize;

    const focus=gallery.prizeLocal.clone();
    gallery.group.localToWorld(focus);
    this.droneActive=true;

    if(this.reduceMotion){
      this.desiredTarget.copy(focus);
      this.desiredPos.set(focus.x+4.8,focus.y+4.3,focus.z+4.6);
      this.droneActive=false;
      return Promise.resolve();
    }

    return new Promise(resolve=>{
      const t0=performance.now(),duration=2300;
      const frame=now=>{
        const t=Math.min(1,(now-t0)/duration),e=t*t*(3-2*t),a=-.4+e*Math.PI*1.35;
        prize.rotation.y+=.018;
        this.desiredTarget.lerp(focus,.2);
        this.desiredPos.set(focus.x+Math.cos(a)*5.2,focus.y+4.2+Math.sin(Math.PI*t)*1.2,focus.z+Math.sin(a)*5.2);
        if(t<1)requestAnimationFrame(frame);
        else{this.droneActive=false;resolve();}
      };
      requestAnimationFrame(frame);
    });
  }

  setPlayers(players){
    for(const [id,t] of this.playerTokens){
      this.scene.remove(t);
      t.userData.detached=true;
    }
    this.playerTokens.clear();

    players.forEach((p,i)=>{
      const vehicle=getVehicle(p.equippedVehicle||'city_standard');
      const paint=p.vehiclePaint||p.color||'#2f80ed';
      const paintNumber=parseInt(String(paint).replace('#',''),16);
      const token=this.makeVehicleVisual(
        vehicle.id,
        Number.isFinite(paintNumber)?paintNumber:0x2f80ed,
        'player',
        p.equippedRim||vehicle.includedRim||'factory'
      );
      token.scale.setScalar(this.artBoardActive?(vehicle.pieceScale||.68)*.57:(vehicle.pieceScale||.68));
      if(this.artBoardActive){
        // Keep player-controlled 3D cars distinguishable from the tiny parked
        // cars photographed in the exact artwork, without drawing new squares.
        const halo=new THREE.Mesh(
          new THREE.RingGeometry(1.23,1.53,36),
          new THREE.MeshBasicMaterial({
            color:p.color||'#7ed7ff',transparent:true,opacity:.8,
            toneMapped:false,depthWrite:false,side:THREE.DoubleSide
          })
        );
        halo.rotation.x=-Math.PI/2;halo.position.y=.07;
        halo.renderOrder=5;
        token.add(halo);
        token.userData.playerHalo=halo;
      }
      this.scene.add(token);
      this.playerTokens.set(p.id,token);
      this.snapPlayer(p,i);
    });
  }

  snapPlayer(player,index=0){
    const token=this.playerTokens.get(player.id);if(!token)return;
    const slot=this.getLandingSlot(player.position,index);
    token.position.set(slot.x,slot.y,slot.z);
    token.rotation.y=slot.rotation;
  }

  followPlayerCamera(token,heading=0,settled=false){
    if(!token)return;
    if(this.artBoardActive){
      // North-up art camera: avoid rotating readable artwork as the car drives.
      // A subtle forward offset still shows the raised 3D vehicle and its halo.
      this.showFullBoard=false;
      this.desiredTarget.set(token.position.x,0,token.position.z);
      this.desiredPos.set(token.position.x+1.3,settled?12.6:11.3,token.position.z+5.4);
      return;
    }
    const behind=settled?6.2:5.4;
    const side=settled?2.0:1.45;
    const height=settled?4.7:4.25;
    const forwardX=Math.cos(heading),forwardZ=-Math.sin(heading);
    const rightX=-forwardZ,rightZ=forwardX;
    this.desiredTarget.set(token.position.x,token.position.y+.35,token.position.z);
    this.desiredPos.set(
      token.position.x-forwardX*behind+rightX*side,
      token.position.y+height,
      token.position.z-forwardZ*behind+rightZ*side
    );
  }

  animatePlayerStep(player,index=0){
    const token=this.playerTokens.get(player.id);if(!token)return Promise.resolve();
    const slot=this.getLandingSlot(player.position,index);
    const to=new THREE.Vector3(slot.x,slot.y,slot.z),from=token.position.clone();
    const startRot=token.rotation.y;

    if(this.reduceMotion){
      token.position.copy(to);
      token.rotation.y=slot.rotation;
      this.followPlayerCamera(token,slot.rotation,true);
      return Promise.resolve();
    }

    return new Promise(resolve=>{
      const t0=performance.now();
      const duration=520;
      const frame=now=>{
        const t=Math.min(1,(now-t0)/duration),e=1-Math.pow(1-t,3);
        token.position.lerpVectors(from,to,e);
        token.position.y=slot.y+Math.sin(Math.PI*t)*.065;

        const dx=to.x-from.x,dz=to.z-from.z;
        let heading=slot.rotation;
        if(Math.abs(dx)+Math.abs(dz)>.01){
          heading=Math.atan2(dx,dz)-Math.PI/2;
          token.rotation.y=heading;
        }else{
          token.rotation.y=THREE.MathUtils.lerp(startRot,slot.rotation,e);
          heading=token.rotation.y;
        }

        if(token.userData.wheels)token.userData.wheels.forEach(w=>w.rotation.z-=.22);

        // Follow every individual board step so a multi-space dice roll feels like a chase camera.
        this.followPlayerCamera(token,heading,false);

        if(t<1)requestAnimationFrame(frame);
        else{
          token.position.copy(to);
          token.rotation.y=slot.rotation;
          this.followPlayerCamera(token,slot.rotation,true);
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  droneReveal(player,index=0){
    const token=this.playerTokens.get(player?.id);
    if(!token)return Promise.resolve();

    const position=player.position||0;
    const [blockX,blockZ]=this.coords[position];
    const slot=this.getLandingSlot(position,index);
    const focus=new THREE.Vector3(
      THREE.MathUtils.lerp(blockX,slot.x,.42),
      .9,
      THREE.MathUtils.lerp(blockZ,slot.z,.42)
    );

    this.driveMode=false;
    this.droneActive=true;
    this.showLandingBanner(position);

    if(this.artBoardActive){
      // The image itself contains all four readable district signs and graphics.
      // Preserve their north-up orientation rather than doing Detroit's 210°
      // orbital fly-by, which turns the printed board upside down on iPhone.
      const destination=new THREE.Vector3(focus.x+1.35,13.2,focus.z+5.5);
      const initialPos=this.desiredPos.clone();
      const initialTarget=this.desiredTarget.clone();
      if(this.reduceMotion){
        this.desiredPos.copy(destination);
        this.desiredTarget.copy(focus);
        this.droneActive=false;
        return Promise.resolve();
      }
      const started=performance.now();
      return new Promise(resolve=>{
        const frame=now=>{
          const t=Math.min(1,(now-started)/1100);
          const eased=t*t*(3-2*t);
          this.desiredTarget.lerpVectors(initialTarget,focus,eased);
          this.desiredPos.lerpVectors(initialPos,destination,eased);
          this.desiredPos.x+=Math.sin(Math.PI*t)*.35;
          if(t<1)requestAnimationFrame(frame);
          else{
            this.desiredPos.copy(destination);
            this.desiredTarget.copy(focus);
            this.droneActive=false;
            resolve();
          }
        };
        requestAnimationFrame(frame);
      });
    }

    if(this.reduceMotion){
      this.desiredTarget.copy(focus);
      this.desiredPos.set(focus.x+5.7,6.2,focus.z+5.7);
      this.droneActive=false;
      return Promise.resolve();
    }

    const startVec=this.camera.position.clone().sub(focus);
    let startAngle=Math.atan2(startVec.z,startVec.x);
    if(!Number.isFinite(startAngle))startAngle=.7;
    const duration=2350;
    const t0=performance.now();

    return new Promise(resolve=>{
      const frame=now=>{
        const t=Math.min(1,(now-t0)/duration);
        const smooth=t*t*(3-2*t);
        // About a 210-degree orbit: enough to show the whole block without delaying gameplay.
        const angle=startAngle+smooth*Math.PI*1.17;
        const radius=THREE.MathUtils.lerp(7.4,5.5,smooth);
        const height=4.9+Math.sin(Math.PI*smooth)*2.2+smooth*.55;

        this.desiredTarget.lerp(focus,.22);
        this.desiredPos.set(
          focus.x+Math.cos(angle)*radius,
          focus.y+height,
          focus.z+Math.sin(angle)*radius
        );

        if(t<1)requestAnimationFrame(frame);
        else{
          // Finish at an elevated three-quarter drone angle looking at the block + parked car.
          const endAngle=angle;
          this.desiredTarget.copy(focus);
          this.desiredPos.set(
            focus.x+Math.cos(endAngle)*5.35,
            focus.y+5.55,
            focus.z+Math.sin(endAngle)*5.35
          );
          this.droneActive=false;
          setTimeout(resolve,260);
        }
      };
      requestAnimationFrame(frame);
    });
  }

  syncOwnership(state){
    if(this.artBoardActive){syncFusionArtOwnership(this,state);return;}
    state.landmarks.forEach(l=>{const g=this.landmarkGroups.get(l.id);if(g)g.scale.setScalar(l.ownerId?1.04+.03*Math.max(0,l.level-1):1);});
    state.spaces.forEach(s=>{const g=this.spaceGroups.get(s.id);if(g)g.scale.y=s.ownerId?1.14:1;});
  }

  select(type,id){
    this.landmarkGroups.forEach((g,key)=>g.userData.ring.material.opacity=(type==='landmark'&&key===id)?.82:.15);
    const group=type==='landmark'?this.landmarkGroups.get(id):this.spaceGroups.get(id);
    if(group){const p=new THREE.Vector3();group.getWorldPosition(p);this.desiredTarget.set(p.x,1.4,p.z);this.desiredPos.set(p.x+7,8,p.z+8.5);}
  }

  fallbackCardImage(type,id,name='Detroit Empire Property'){
    try{
      const c=document.createElement('canvas');c.width=960;c.height=540;const x=c.getContext('2d');
      const item=type==='landmark'?LANDMARKS.find(v=>v.id===id):BOARD_SPACES.find(v=>v.id===id);
      const accent=({North:'#557fb3',East:'#658f57',South:'#a6624c',West:'#7d5b95',All:'#b48d3d'})[item?.side]||'#667b88';
      const grad=x.createLinearGradient(0,0,960,540);grad.addColorStop(0,'#111a22');grad.addColorStop(1,'#26343b');x.fillStyle=grad;x.fillRect(0,0,960,540);
      x.fillStyle=accent;x.globalAlpha=.28;x.beginPath();x.arc(170,90,260,0,Math.PI*2);x.fill();x.globalAlpha=1;
      x.fillStyle='#252c31';x.fillRect(0,410,960,130);
      x.fillStyle='#59636a';x.fillRect(0,395,960,18);
      const luxury=(item?.price||0)>=300000||id==='casino';
      const bx=255,by=150,bw=450,bh=245;
      x.fillStyle=luxury?'#27231c':'#6e5c4b';x.fillRect(bx,by,bw,bh);
      x.fillStyle='#3b4c56';for(let row=0;row<3;row++)for(let col=0;col<5;col++)x.fillRect(bx+38+col*76,by+38+row*56,46,29);
      x.fillStyle=luxury?'#c9a653':accent;x.fillRect(bx+160,by-28,130,28);
      x.fillStyle='#171b1e';x.fillRect(bx+196,by+178,58,67);
      x.fillStyle='rgba(255,255,255,.94)';x.font='800 38px system-ui';x.textAlign='center';x.fillText(name,480,485);
      return c.toDataURL('image/jpeg',.86);
    }catch(e){return '';}
  }

  captureCardImage(type,id,name='Detroit Empire Property'){
    const key=type+':'+id;
    if(this.cardImageCache.has(key))return this.cardImageCache.get(key);
    const source=type==='landmark'?this.landmarkGroups.get(id):this.spaceGroups.get(id);
    if(!source){
      const fallback=this.fallbackCardImage(type,id,name);this.cardImageCache.set(key,fallback);return fallback;
    }
    try{
      const previewScene=new THREE.Scene();
      previewScene.background=new THREE.Color(0xb8c8d0);
      const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,30),this.mat(0x747b72,{roughness:.96}));
      ground.rotation.x=-Math.PI/2;ground.position.y=-.02;ground.receiveShadow=true;previewScene.add(ground);

      const clone=source.clone(true);
      clone.position.set(0,0,0);
      clone.traverse(o=>{
        if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}
        if(o.geometry&&o.geometry.type==='RingGeometry')o.visible=false;
      });
      previewScene.add(clone);

      const box=new THREE.Box3().setFromObject(clone);
      const center=box.getCenter(new THREE.Vector3());
      const size=box.getSize(new THREE.Vector3());
      clone.position.sub(center);
      // Keep the object sitting above the ground after centering.
      const shiftedBox=new THREE.Box3().setFromObject(clone);
      clone.position.y-=shiftedBox.min.y;

      const maxDim=Math.max(size.x,size.y,size.z,1);
      const camera=new THREE.PerspectiveCamera(34,16/9,.1,100);
      const distance=maxDim*2.45;
      camera.position.set(distance*.82,distance*.58,distance*.92);
      camera.lookAt(0,Math.max(.45,size.y*.32),0);

      previewScene.add(new THREE.HemisphereLight(0xf4fbff,0x504639,2.15));
      const keyLight=new THREE.DirectionalLight(0xffedc9,3.8);
      keyLight.position.set(-7,11,8);keyLight.castShadow=true;
      keyLight.shadow.mapSize.set(768,768);keyLight.shadow.camera.left=-8;keyLight.shadow.camera.right=8;keyLight.shadow.camera.top=8;keyLight.shadow.camera.bottom=-8;
      previewScene.add(keyLight);
      const fill=new THREE.DirectionalLight(0x8fbad8,1.05);fill.position.set(8,5,-7);previewScene.add(fill);

      const w=window.innerWidth<700?480:640,h=Math.round(w*9/16);
      const target=new THREE.WebGLRenderTarget(w,h,{depthBuffer:true,stencilBuffer:false});
      const previousTarget=this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(target);
      this.renderer.clear();
      this.renderer.render(previewScene,camera);

      const pixels=new Uint8Array(w*h*4);
      this.renderer.readRenderTargetPixels(target,0,0,w,h,pixels);
      this.renderer.setRenderTarget(previousTarget);
      target.dispose();

      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d');const image=ctx.createImageData(w,h);
      for(let y=0;y<h;y++){
        const srcRow=(h-1-y)*w*4,dstRow=y*w*4;
        image.data.set(pixels.subarray(srcRow,srcRow+w*4),dstRow);
      }
      ctx.putImageData(image,0,0);
      const data=canvas.toDataURL('image/jpeg',.88);
      this.cardImageCache.set(key,data);
      return data;
    }catch(e){
      try{this.renderer.setRenderTarget(null);}catch(_){}
      const fallback=this.fallbackCardImage(type,id,name);
      this.cardImageCache.set(key,fallback);
      return fallback;
    }
  }

  async captureVehiclePreview(vehicleId,paint='#2f80ed',rimStyle='factory'){
    const paintNumber=parseInt(String(paint).replace('#',''),16);
    const color=Number.isFinite(paintNumber)?paintNumber:0x2f80ed;
    const key=[vehicleId,color,rimStyle].join(':');
    if(this.vehiclePreviewCache.has(key))return this.vehiclePreviewCache.get(key);

    const promise=(async()=>{
      let visual;
      if(fusionMode && vehicleId!=='motor_aero_25'){
        const vehicle=getVehicle(vehicleId);
        visual=this.makeCar(color,vehicle.model,'player',{rimStyle});
      }else{
        const spec=getRealVehicleSpec(vehicleId);
        if(!spec)throw new Error('No GLB vehicle source');
        const base=await this.loadRealVehicleAsset(spec);
        visual=this.prepareRealVehicleModel(base,spec,color,rimStyle);
      }

      const scene=new THREE.Scene();
      scene.background=new THREE.Color(0x10171d);

      const ground=new THREE.Mesh(
        new THREE.CircleGeometry(2.45,48),
        new THREE.MeshPhysicalMaterial({color:0x1a2228,metalness:.28,roughness:.38,clearcoat:.42})
      );
      ground.rotation.x=-Math.PI/2;
      ground.position.y=-.035;
      scene.add(ground);

      const car=new THREE.Group();
      car.add(visual);
      car.rotation.y=-.52;
      car.position.y=.02;
      scene.add(car);

      scene.add(new THREE.HemisphereLight(0xe8f7ff,0x2b241d,2.1));
      const keyLight=new THREE.DirectionalLight(0xffffff,4.4);
      keyLight.position.set(4.5,6.5,4.2);
      scene.add(keyLight);
      const rimLight=new THREE.DirectionalLight(0x5dbfff,2.0);
      rimLight.position.set(-4,3,-3);
      scene.add(rimLight);
      const warm=new THREE.DirectionalLight(0xffc57f,1.05);
      warm.position.set(1.2,2.6,-4);
      scene.add(warm);

      const camera=new THREE.PerspectiveCamera(31,16/9,.05,40);
      camera.position.set(3.35,1.72,3.15);
      camera.lookAt(0,.48,0);

      const mobile=window.matchMedia?.('(max-width: 760px)').matches || /iPhone|iPad|Android/i.test(navigator.userAgent);
      const w=mobile?256:480,h=mobile?144:270;
      const target=new THREE.WebGLRenderTarget(w,h,{depthBuffer:true,stencilBuffer:false});
      const previous=this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(target);
      this.renderer.clear();
      this.renderer.render(scene,camera);

      const pixels=new Uint8Array(w*h*4);
      this.renderer.readRenderTargetPixels(target,0,0,w,h,pixels);
      this.renderer.setRenderTarget(previous);
      target.dispose();

      const canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d');
      const image=ctx.createImageData(w,h);
      for(let y=0;y<h;y++){
        const srcRow=(h-1-y)*w*4,dstRow=y*w*4;
        image.data.set(pixels.subarray(srcRow,srcRow+w*4),dstRow);
      }
      ctx.putImageData(image,0,0);
      return canvas.toDataURL('image/jpeg',.9);
    })().catch(err=>{
      this.vehiclePreviewCache.delete(key);
      throw err;
    });

    this.vehiclePreviewCache.set(key,promise);
    return promise;
  }

  makeDesignerDie(value=1){
    const die=new THREE.Group();
    const body=new THREE.Mesh(
      new RoundedBoxGeometry(.96,.96,.96,6,.13),
      new THREE.MeshPhysicalMaterial({
        color:0x071725,
        metalness:.68,
        roughness:.18,
        clearcoat:1,
        clearcoatRoughness:.08,
        emissive:0x06111b,
        emissiveIntensity:.42
      })
    );
    body.castShadow=false;
    die.add(body);

    // Fine chrome-blue edge cage gives the dice a premium "designer" finish.
    const edge=new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.0,1.0,1.0)),
      new THREE.LineBasicMaterial({color:0x64cfff,transparent:true,opacity:.78,toneMapped:false})
    );
    die.add(edge);

    const pipMat=new THREE.MeshBasicMaterial({color:0xc9f1ff,toneMapped:false});
    const pipGlow=new THREE.MeshBasicMaterial({color:0x31baff,transparent:true,opacity:.32,toneMapped:false});
    const patterns={
      1:[[0,0]],
      2:[[-.22,-.22],[.22,.22]],
      3:[[-.23,-.23],[0,0],[.23,.23]],
      4:[[-.23,-.23],[.23,-.23],[-.23,.23],[.23,.23]],
      5:[[-.24,-.24],[.24,-.24],[0,0],[-.24,.24],[.24,.24]],
      6:[[-.24,-.27],[-.24,0],[-.24,.27],[.24,-.27],[.24,0],[.24,.27]]
    };
    (patterns[value]||patterns[1]).forEach(([x,z])=>{
      const glow=new THREE.Mesh(new THREE.CylinderGeometry(.095,.095,.012,18),pipGlow);
      glow.position.set(x,.498,z);die.add(glow);
      const pip=new THREE.Mesh(new THREE.CylinderGeometry(.061,.061,.026,18),pipMat);
      pip.position.set(x,.512,z);die.add(pip);
    });

    // Subtle metallic waist band makes the silhouette read as custom rather than generic casino dice.
    const bandMat=new THREE.MeshBasicMaterial({color:0x3caee9,transparent:true,opacity:.28,toneMapped:false});
    const band=new THREE.Mesh(new THREE.BoxGeometry(1.015,.035,1.015),bandMat);
    band.position.y=-.18;die.add(band);
    return die;
  }

  async rollDesignerDice(a,b){
    if(this.diceRollGroup){
      this.diceRollGroup.removeFromParent();
      this.diceRollGroup=null;
    }

    const stage=new THREE.Group();
    stage.name='Designer Dice Roll';
    stage.position.set(0,-.18,-5.25);

    const left=this.makeDesignerDie(a);
    const right=this.makeDesignerDie(b);
    left.position.set(-.72,.05,0);
    right.position.set(.72,.05,.05);
    stage.add(left,right);

    const key=new THREE.PointLight(0xffffff,4.2,12,2);
    key.position.set(0,2.4,2.1);stage.add(key);
    const cyan=new THREE.PointLight(0x42bfff,3.1,9,2);
    cyan.position.set(-2,.2,1.4);stage.add(cyan);
    const warm=new THREE.PointLight(0xffd27f,1.45,8,2);
    warm.position.set(2,-.1,1.3);stage.add(warm);

    this.camera.add(stage);
    this.diceRollGroup=stage;

    const finalA={x:-.58,y:.48,z:-.08};
    const finalB={x:-.62,y:-.42,z:.11};
    const duration=this.reduceMotion?420:1450;
    const start=performance.now();

    await new Promise(resolve=>{
      const frame=now=>{
        const t=Math.min(1,(now-start)/duration);
        const smooth=t*t*(3-2*t);
        const spin=(1-smooth)*(this.reduceMotion?Math.PI*.35:Math.PI*7.5);
        const bounce=this.reduceMotion?0:Math.abs(Math.sin(t*Math.PI*3.1))*(1-t)*.72;

        stage.scale.setScalar(.72+.28*smooth);
        left.position.x=THREE.MathUtils.lerp(-1.18,-.72,smooth);
        right.position.x=THREE.MathUtils.lerp(1.18,.72,smooth);
        left.position.y=.05+bounce+.45*(1-smooth);
        right.position.y=.05+bounce*.82+.62*(1-smooth);
        left.position.z=.08*Math.sin(t*Math.PI*2);
        right.position.z=.05+.08*Math.cos(t*Math.PI*2);

        left.rotation.set(
          finalA.x+spin*1.08,
          finalA.y+spin*.84,
          finalA.z+spin*.57
        );
        right.rotation.set(
          finalB.x+spin*.92,
          finalB.y-spin*1.03,
          finalB.z+spin*.63
        );

        if(t<1)requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });

    await new Promise(resolve=>setTimeout(resolve,this.reduceMotion?420:720));

    // Quick cinematic pull-away before the player's vehicle begins moving.
    const fadeStart=performance.now();
    await new Promise(resolve=>{
      const frame=now=>{
        const t=Math.min(1,(now-fadeStart)/240);
        stage.scale.setScalar(1-t*.42);
        stage.position.y=-.18+t*.18;
        if(t<1)requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });

    stage.removeFromParent();
    if(this.diceRollGroup===stage)this.diceRollGroup=null;
  }

  makeRoomSign(text,w=4.4,h=.72,accent=0x6dcaff){
    const c=document.createElement('canvas');c.width=768;c.height=150;
    const x=c.getContext('2d');
    x.fillStyle='#071019';x.fillRect(0,0,c.width,c.height);
    x.strokeStyle='#'+new THREE.Color(accent).getHexString();x.lineWidth=8;x.strokeRect(7,7,c.width-14,c.height-14);
    x.fillStyle='#f7fbff';x.textAlign='center';x.textBaseline='middle';x.font='900 50px system-ui,sans-serif';
    x.fillText(text.toUpperCase(),c.width/2,c.height/2+2);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false,side:THREE.DoubleSide}));
  }

  makeRoomHotspot(id,label,position,accent=0x46c7ff,scale=1){
    const g=new THREE.Group();
    g.userData={type:'roomHotspot',id,label,room:this.activePublicRoom};
    const ring=new THREE.Mesh(
      new THREE.TorusGeometry(.42*scale,.055*scale,10,36),
      new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.88,toneMapped:false})
    );
    ring.rotation.x=Math.PI/2;ring.position.y=.04;g.add(ring);
    const core=new THREE.Mesh(
      new THREE.CylinderGeometry(.32*scale,.32*scale,.04,30),
      new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.16,toneMapped:false})
    );
    core.position.y=.02;g.add(core);
    const sign=this.makeRoomSign(label,1.75*scale,.34*scale,accent);
    sign.position.set(0,.72*scale,0);sign.rotation.x=-.08;g.add(sign);
    g.position.copy(position);
    g.userData.ring=ring;
    this.publicRoomHotspots.push(g);
    return g;
  }

  makeCasinoSlotMachine(x,z,accent=0xd8b45d){
    const g=new THREE.Group();
    const shell=this.mat(0x161b22,{metalness:.62,roughness:.22});
    const trim=this.mat(accent,{metalness:.78,roughness:.2});
    const screenMat=new THREE.MeshBasicMaterial({color:0x49c8ff,toneMapped:false});
    const body=new THREE.Mesh(new RoundedBoxGeometry(.82,1.45,.62,5,.09),shell);
    body.position.y=.82;body.castShadow=true;g.add(body);
    const crown=new THREE.Mesh(new RoundedBoxGeometry(.72,.24,.54,4,.06),trim);
    crown.position.y=1.49;g.add(crown);
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(.57,.46),screenMat);
    screen.position.set(0,1.03,.316);g.add(screen);
    const reelGlow=new THREE.Mesh(new THREE.PlaneGeometry(.46,.16),new THREE.MeshBasicMaterial({color:0xffe8a3,toneMapped:false}));
    reelGlow.position.set(0,.7,.322);g.add(reelGlow);
    const button=new THREE.Mesh(new THREE.SphereGeometry(.07,10,10),new THREE.MeshBasicMaterial({color:0xff4f62,toneMapped:false}));
    button.position.set(.22,.48,.34);g.add(button);
    const stool=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,.12,18),this.mat(0x582d37,{roughness:.55}));
    stool.position.set(0,.35,1.0);g.add(stool);
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.42,10),trim);
    post.position.set(0,.16,1.0);g.add(post);
    g.position.set(x,0,z);
    return g;
  }

  makeRoomShell(kind){
    const g=new THREE.Group();
    const casino=kind==='casino', mall=kind==='mall';
    const floorColor=casino?0x301727:mall?0xc7c4bb:0x252b30;
    const wallColor=casino?0x11131a:mall?0xe2e0da:0x111820;
    const floor=new THREE.Mesh(new THREE.BoxGeometry(18,.18,13),this.mat(floorColor,{roughness:.82,metalness:.02}));
    floor.position.y=-.08;floor.receiveShadow=true;g.add(floor);
    const back=new THREE.Mesh(new THREE.BoxGeometry(18,5.5,.24),this.mat(wallColor,{roughness:.7}));
    back.position.set(0,2.75,-6.35);g.add(back);
    const left=new THREE.Mesh(new THREE.BoxGeometry(.24,5.5,13),this.mat(wallColor,{roughness:.7}));
    left.position.set(-8.9,2.75,0);g.add(left);
    const right=left.clone();right.position.x=8.9;g.add(right);
    const ceiling=new THREE.Mesh(new THREE.BoxGeometry(18,.15,13),this.mat(0x0b1015,{roughness:.85}));
    ceiling.position.y=5.45;g.add(ceiling);
    return g;
  }

  buildCasinoInterior(){
    const room=this.makeRoomShell('casino');
    const gold=0xd8b45d,cyan=0x4bcaff;
    const carpet=new THREE.Mesh(new THREE.BoxGeometry(12,.025,5.2),new THREE.MeshStandardMaterial({color:0x431c37,roughness:.95}));
    carpet.position.set(0,.025,-1.0);room.add(carpet);

    // Back-wall identity and architectural gold bands.
    const title=this.makeRoomSign('Greek Casino',6.6,1.0,gold);
    title.position.set(0,3.8,-6.18);room.add(title);
    [-3.1,3.1].forEach(x=>{
      const col=new THREE.Mesh(new THREE.BoxGeometry(.16,4.6,.16),this.mat(gold,{metalness:.82,roughness:.18}));
      col.position.set(x,2.3,-6.08);room.add(col);
    });

    // Two banks of slot machines.
    [-5.1,-3.75,-2.4,-1.05,1.05,2.4,3.75,5.1].forEach((x,i)=>{
      const z=i%2===0?-4.7:-4.55;
      room.add(this.makeCasinoSlotMachine(x,z,i%2?gold:cyan));
    });

    // Roulette table.
    const table=new THREE.Mesh(new RoundedBoxGeometry(4.3,.72,2.15,7,.18),this.mat(0x173c2e,{roughness:.66}));
    table.position.set(0,.62,.35);room.add(table);
    const rail=new THREE.Mesh(new THREE.TorusGeometry(.8,.1,12,40),this.mat(gold,{metalness:.78,roughness:.22}));
    rail.rotation.x=Math.PI/2;rail.position.set(0,1.04,.35);room.add(rail);
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.66,.66,.12,32),this.mat(0x2b1718,{roughness:.38,metalness:.22}));
    wheel.position.set(0,1.08,.35);room.add(wheel);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.1,.16,.34,16),this.mat(gold,{metalness:.9,roughness:.12}));
    hub.position.set(0,1.27,.35);room.add(hub);

    // Cashier desk.
    const cashDesk=new THREE.Mesh(new RoundedBoxGeometry(3.4,1.1,.8,5,.12),this.mat(0x171c22,{metalness:.5,roughness:.28}));
    cashDesk.position.set(5.65,.58,3.65);room.add(cashDesk);
    const cashSign=this.makeRoomSign('Cashier',2.5,.5,gold);cashSign.position.set(5.65,1.75,3.25);cashSign.rotation.y=Math.PI;room.add(cashSign);

    // Lounge furniture.
    [-4.8,-2.9].forEach(x=>{
      const sofa=new THREE.Mesh(new RoundedBoxGeometry(1.55,.65,.75,5,.14),this.mat(0x3a2233,{roughness:.72}));
      sofa.position.set(x,.38,3.8);room.add(sofa);
    });

    // Room-specific light rig.
    const ambient=new THREE.PointLight(0xffd38a,6.0,17,2);ambient.position.set(0,4.4,-1.5);room.add(ambient);
    const blue=new THREE.PointLight(0x42bfff,3.8,13,2);blue.position.set(-5,3.0,2.4);room.add(blue);
    const pink=new THREE.PointLight(0xff5a9d,3.2,12,2);pink.position.set(5,3.0,-2);room.add(pink);

    room.add(this.makeRoomHotspot('casino_slots','PLAY SLOTS',new THREE.Vector3(-3.7,.08,-3.15),cyan,1.05));
    room.add(this.makeRoomHotspot('casino_roulette','ROULETTE',new THREE.Vector3(0,.08,2.05),gold,1.05));
    room.add(this.makeRoomHotspot('casino_cashier','CASHIER',new THREE.Vector3(5.6,.08,2.45),gold,.86));
    return room;
  }

  buildMallInterior(){
    const room=this.makeRoomShell('mall');
    const cyan=0x4bcaff;
    const title=this.makeRoomSign('Motor City Mall',6.8,.95,cyan);title.position.set(0,4.0,-6.17);room.add(title);
    const skylight=new THREE.Mesh(new THREE.BoxGeometry(8,.05,2.2),new THREE.MeshBasicMaterial({color:0x8edcff,transparent:true,opacity:.32,toneMapped:false}));
    skylight.position.set(0,5.34,-.5);room.add(skylight);

    const stores=[
      {id:'mall_fashion',label:'EMPIRE FASHION',x:-6.1,z:-3.9,color:0xff79c6},
      {id:'mall_tech',label:'MOTOR TECH',x:-2.1,z:-3.9,color:0x56c9ff},
      {id:'mall_food',label:'FOOD COURT',x:2.1,z:-3.9,color:0xffb15a},
      {id:'mall_auto',label:'AUTO BOUTIQUE',x:6.1,z:-3.9,color:0x7ae595}
    ];
    stores.forEach(s=>{
      const shell=new THREE.Mesh(new RoundedBoxGeometry(3.25,2.7,1.1,5,.08),this.mat(0x222a31,{metalness:.28,roughness:.35}));
      shell.position.set(s.x,1.38,s.z);room.add(shell);
      const glass=new THREE.Mesh(new THREE.PlaneGeometry(2.75,1.72),new THREE.MeshBasicMaterial({color:s.color,transparent:true,opacity:.32,toneMapped:false}));
      glass.position.set(s.x,1.37,s.z+.56);room.add(glass);
      const sign=this.makeRoomSign(s.label,2.65,.42,s.color);sign.position.set(s.x,2.45,s.z+.58);room.add(sign);
      room.add(this.makeRoomHotspot(s.id,'ENTER',new THREE.Vector3(s.x,.08,s.z+1.25),s.color,.72));
    });
    for(let z=-1.8;z<=3.8;z+=2.0){
      const planter=new THREE.Mesh(new THREE.CylinderGeometry(.55,.65,.45,18),this.mat(0x5a5e58,{roughness:.82}));
      planter.position.set(-5.7,.23,z);room.add(planter);
      const plant=new THREE.Mesh(new THREE.ConeGeometry(.55,1.3,10),this.mat(0x46724b,{roughness:.96}));
      plant.position.set(-5.7,1.05,z);room.add(plant);
    }
    const ambient=new THREE.PointLight(0xcfeeff,5.2,18,2);ambient.position.set(0,4.6,0);room.add(ambient);
    return room;
  }

  buildBankInterior(){
    const room=this.makeRoomShell('bank');
    const navy=0x173a5a,gold=0xd8b45d,cyan=0x5ccfff;

    const floor=new THREE.Mesh(
      new THREE.BoxGeometry(13,.035,6.4),
      this.mat(0x27333c,{roughness:.72,metalness:.08})
    );
    floor.position.set(0,.02,-.55);room.add(floor);

    const title=this.makeRoomSign('Motor City Bank',7.0,.96,gold);
    title.position.set(0,4.0,-6.17);room.add(title);

    // Teller line.
    for(let x=-5.4;x<=1.8;x+=2.4){
      const counter=new THREE.Mesh(
        new RoundedBoxGeometry(2.0,1.05,.85,5,.1),
        this.mat(0x16212b,{metalness:.52,roughness:.28})
      );
      counter.position.set(x,.55,-3.7);room.add(counter);
      const glass=new THREE.Mesh(
        new THREE.PlaneGeometry(1.7,1.25),
        new THREE.MeshBasicMaterial({color:0x8fd9ff,transparent:true,opacity:.18,toneMapped:false,side:THREE.DoubleSide})
      );
      glass.position.set(x,1.65,-4.12);room.add(glass);
    }

    // Vault wall and door.
    const vaultWall=new THREE.Mesh(
      new THREE.BoxGeometry(4.4,3.7,.55),
      this.mat(0x37424b,{metalness:.72,roughness:.24})
    );
    vaultWall.position.set(5.7,2.0,-4.8);room.add(vaultWall);
    const vault=new THREE.Mesh(
      new THREE.CylinderGeometry(1.35,1.35,.32,40),
      this.mat(0x69747c,{metalness:.9,roughness:.16})
    );
    vault.rotation.x=Math.PI/2;vault.position.set(5.7,2.0,-4.48);room.add(vault);
    const wheel=new THREE.Mesh(
      new THREE.TorusGeometry(.6,.09,10,28),
      this.mat(gold,{metalness:.92,roughness:.12})
    );
    wheel.position.set(5.7,2.0,-4.27);room.add(wheel);
    for(let a=0;a<Math.PI*2;a+=Math.PI/4){
      const spoke=new THREE.Mesh(new THREE.BoxGeometry(.05,.78,.05),this.mat(gold,{metalness:.9,roughness:.15}));
      spoke.position.set(5.7,2.0,-4.23);spoke.rotation.z=a;room.add(spoke);
    }

    // Consultation desk.
    const desk=new THREE.Mesh(
      new RoundedBoxGeometry(4.4,1.0,1.1,5,.12),
      this.mat(navy,{metalness:.45,roughness:.26})
    );
    desk.position.set(0,.53,2.8);room.add(desk);
    const deskSign=this.makeRoomSign('Asset Services',3.4,.48,gold);
    deskSign.position.set(0,1.58,2.22);deskSign.rotation.y=Math.PI;room.add(deskSign);

    room.add(this.makeRoomHotspot('bank_assets','SELL ASSETS',new THREE.Vector3(0,.08,1.6),gold,1.0));
    room.add(this.makeRoomHotspot('bank_portfolio','PORTFOLIO',new THREE.Vector3(-4.8,.08,1.3),cyan,.9));
    room.add(this.makeRoomHotspot('bank_balance','ACCOUNT',new THREE.Vector3(4.8,.08,1.3),cyan,.9));

    const key=new THREE.PointLight(0xe5f4ff,5.3,18,2);key.position.set(0,4.6,0);room.add(key);
    const warm=new THREE.PointLight(0xffd27f,2.8,12,2);warm.position.set(5.2,3,-2.8);room.add(warm);
    return room;
  }

  buildGalleryInterior(){
    const room=this.makeRoomShell('gallery');
    const blue=0x35b9ff,gold=0xd7b45d;
    const title=this.makeRoomSign('Motor Gallery',6.7,.95,blue);title.position.set(0,4.0,-6.17);room.add(title);
    const platformMat=this.mat(0x343b42,{metalness:.72,roughness:.22});
    const display=[
      {vehicle:'motor_aero_25',color:0xd92736,rim:'turbine',x:-3.8,z:-1.5,rot:.18},
      {vehicle:'empire_twelve',color:0xd4d8db,rim:'mesh_20',x:3.4,z:-1.25,rot:-.22},
      {vehicle:'woodward_coupe',color:0x1d2329,rim:'five_star',x:0,z:2.5,rot:Math.PI}
    ];
    const visible=this.mobileDevice?display.slice(0,2):display;
    visible.forEach((d,i)=>{
      const pad=new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,.12,40),platformMat);pad.position.set(d.x,.06,d.z);room.add(pad);
      const glow=new THREE.Mesh(new THREE.TorusGeometry(1.55,.035,8,40),new THREE.MeshBasicMaterial({color:i?gold:blue,toneMapped:false}));
      glow.rotation.x=Math.PI/2;glow.position.set(d.x,.14,d.z);room.add(glow);
      const car=this.makeVehicleVisual(d.vehicle,d.color,'standard',d.rim);car.scale.setScalar(.92);car.position.set(d.x,.25,d.z);car.rotation.y=d.rot;room.add(car);
    });
    const desk=new THREE.Mesh(new RoundedBoxGeometry(3.6,1.0,.9,5,.12),this.mat(0x101820,{metalness:.58,roughness:.24}));
    desk.position.set(5.8,.53,3.6);room.add(desk);
    const sign=this.makeRoomSign('Garage Desk',2.8,.48,gold);sign.position.set(5.8,1.65,3.15);sign.rotation.y=Math.PI;room.add(sign);
    room.add(this.makeRoomHotspot('gallery_garage','OPEN GARAGE',new THREE.Vector3(5.6,.08,2.35),gold,.92));
    room.add(this.makeRoomHotspot('gallery_showroom','BROWSE CARS',new THREE.Vector3(0,.08,.25),blue,.96));
    const light=new THREE.PointLight(0xd7efff,5.5,18,2);light.position.set(0,4.6,-.5);room.add(light);
    return room;
  }

  enterPublicRoom(kind){
    if(this.publicRoomGroup)this.exitPublicRoom(false);
    this.activePublicRoom=kind;
    this.publicRoomHotspots=[];
    this.world.visible=false;
    let room;
    if(kind==='casino')room=this.buildCasinoInterior();
    else if(kind==='mall')room=this.buildMallInterior();
    else if(kind==='bank')room=this.buildBankInterior();
    else room=this.buildGalleryInterior();
    this.publicRoomGroup=room;
    room.name='Public Room: '+kind;
    this.scene.add(room);
    this.driveMode=false;
    this.orbit=0;
    this.pitch=.42;
    this.radius=8.6;
    if(kind==='casino'){
      this.desiredTarget.set(0,1.2,-.8);this.desiredPos.set(0,3.7,7.9);
    }else if(kind==='mall'){
      this.desiredTarget.set(0,1.45,-1.0);this.desiredPos.set(0,3.6,8.2);
    }else if(kind==='bank'){
      this.desiredTarget.set(0,1.35,-.8);this.desiredPos.set(0,3.8,8.1);
    }else{
      this.desiredTarget.set(0,1.2,-.4);this.desiredPos.set(0,3.9,8.0);
    }
    this.look.copy(this.desiredTarget);
    this.dispatchEvent(new CustomEvent('roomchange',{detail:{room:kind}}));
  }

  exitPublicRoom(returnToBoard=true){
    if(this.publicRoomGroup){
      this.publicRoomGroup.traverse(o=>{
        if(o.geometry)o.geometry.dispose?.();
        if(o.material){
          const mats=Array.isArray(o.material)?o.material:[o.material];
          mats.forEach(m=>{m.map?.dispose?.();m.dispose?.();});
        }
      });
      this.publicRoomGroup.removeFromParent();
    }
    this.publicRoomGroup=null;
    this.publicRoomHotspots=[];
    this.activePublicRoom=null;
    this.world.visible=true;
    if(returnToBoard)this.boardView();
    this.dispatchEvent(new CustomEvent('roomchange',{detail:{room:null}}));
  }

  boardView(){
    this.driveMode=false;
    if(this.artBoardActive){
      const halfTan=Math.tan(THREE.MathUtils.degToRad(this.camera.fov)*.5);
      const aspect=Math.max(.37,this.camera.aspect);
      const fit=Math.max(ART_WORLD_DEPTH/(2*halfTan),ART_WORLD_WIDTH/(2*halfTan*aspect));
      this.homeBoard.set(0,fit*1.18,fit*.055);
      this.desiredPos.copy(this.homeBoard);
      this.desiredTarget.set(0,0,0);
      this.radius=fit;
      this.showFullBoard=true;
      return;
    }
    this.desiredPos.copy(this.homeBoard);this.desiredTarget.set(0,0,0);this.radius=42;
  }
  cityView(){this.driveMode=false;this.desiredPos.copy(this.homeCity);this.desiredTarget.set(0,2,0);this.radius=26;}
  mallView(){this.driveMode=false;this.desiredTarget.set(5.1,1.35,6.7);this.desiredPos.set(11.8,6.2,13.1);this.radius=11;}
  garageView(){this.driveMode=false;this.desiredTarget.set(-9.9,.9,10.35);this.desiredPos.set(-4.0,5.3,15.1);this.radius=10;}
  sideView(side){
    this.driveMode=false;this.radius=24;
    if(side==='North'){this.desiredPos.set(0,8,-24);this.desiredTarget.set(0,2,5);}
    if(side==='East'){this.desiredPos.set(24,8,0);this.desiredTarget.set(5,2,0);}
    if(side==='South'){this.desiredPos.set(0,8,24);this.desiredTarget.set(0,2,-5);}
    if(side==='West'){this.desiredPos.set(-24,8,0);this.desiredTarget.set(-5,2,0);}
  }
  casinoView(){if(this.landmarkGroups.get('casino'))this.select('landmark','casino');}
  toggleDrive(){this.driveMode=!this.driveMode;return this.driveMode;}

  bindControls(){
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{if(this.droneActive)return;this.drag=true;this.lastX=e.clientX;this.lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{
      if(this.droneActive||!this.drag)return;const dx=e.clientX-this.lastX,dy=e.clientY-this.lastY;this.lastX=e.clientX;this.lastY=e.clientY;
      this.orbit-=dx*.006;this.pitch=Math.max(.2,Math.min(1.05,this.pitch+dy*.004));
      this.desiredPos.set(this.desiredTarget.x+Math.sin(this.orbit)*Math.cos(this.pitch)*this.radius,this.desiredTarget.y+Math.sin(this.pitch)*this.radius,this.desiredTarget.z+Math.cos(this.orbit)*Math.cos(this.pitch)*this.radius);
    });
    canvas.addEventListener('pointerup',e=>{
      this.drag=false;const r=canvas.getBoundingClientRect();this.pointer.x=((e.clientX-r.left)/r.width)*2-1;this.pointer.y=-((e.clientY-r.top)/r.height)*2+1;
      this.raycaster.setFromCamera(this.pointer,this.camera);
      const targets=this.activePublicRoom?this.publicRoomHotspots:[...this.boroughGroups,...this.landmarkGroups.values(),...this.spaceGroups.values()];
      const hits=this.raycaster.intersectObjects(targets,true);if(!hits.length)return;let o=hits[0].object;
      while(o.parent&&!o.userData.type)o=o.parent;if(o.userData.type)this.dispatchEvent(new CustomEvent('pick',{detail:o.userData}));
    });
    canvas.addEventListener('pointercancel',()=>this.drag=false);
  }

  resize(){
    const r=this.container.getBoundingClientRect(),w=Math.max(300,Math.floor(r.width)),h=Math.max(460,Math.floor(r.height));
    this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
    if(this.artBoardActive&&this.showFullBoard)this.boardView();
  }

  animate(){
    const loop=()=>{
      if(this.paused){requestAnimationFrame(loop);return;}
      if(this.driveMode){this.driveT+=.0035;const a=this.driveT*Math.PI*2;this.desiredPos.set(Math.sin(a)*18,6+Math.sin(a*2)*1.2,Math.cos(a)*18);this.desiredTarget.set(Math.sin(a+.45)*5,1.8,Math.cos(a+.45)*5);}
      this.camera.position.lerp(this.desiredPos,.045);this.look.lerp(this.desiredTarget,.065);this.camera.lookAt(this.look);
      this.landmarkGroups.forEach(g=>{g.userData.ring.rotation.z+=.003;});
      this.publicRoomHotspots.forEach((g,i)=>{
        if(g.userData.ring){
          g.userData.ring.rotation.z+=.012;
          const pulse=.9+Math.sin(performance.now()*.003+i)*.1;
          g.userData.ring.scale.setScalar(pulse);
        }
      });
      this.renderer.render(this.scene,this.camera);requestAnimationFrame(loop);
    };loop();
  }
}
