import * as THREE from 'three';
import {
  ART_WORLD_WIDTH,ART_WORLD_DEPTH,ART_ROAD_PIXELS,ART_DISTRICT_PIXELS,
  ART_LANDMARK_PIXELS,ART_PRODUCER_ICON_PIXELS,artPixelToWorld,artLandingSlot
} from './fusion-art-map.js?v=1';

// Builds a genuine 3D game surface with the user's approved PNG as its ONE board
// face. We add hit targets and actual movable car models above the printed streets;
// we do not redraw or replace the artwork with generic property squares.
const imageUrl=new URL('../assets/fusion/board-approved-original.png?v=1',import.meta.url).href;
const transparentHit=new THREE.MeshBasicMaterial({
  color:0xffffff,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide
});
function circleHit(group,radius){
  const target=new THREE.Mesh(new THREE.CircleGeometry(radius,26),transparentHit);
  target.rotation.x=-Math.PI/2;
  target.position.y=.1;
  group.add(target);
}
function addRing(group,color,radius=.72){
  const ring=new THREE.Mesh(
    new THREE.RingGeometry(radius,radius+.08,32),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:.02,depthWrite:false,toneMapped:false,side:THREE.DoubleSide})
  );
  ring.rotation.x=-Math.PI/2;ring.position.y=.115;
  group.add(ring);return ring;
}
function markAt(group,pixel,y=0){
  const [x,z]=artPixelToWorld(pixel);
  group.position.set(x,y,z);
}
export function buildFusionArtBoard(view,spaces,landmarks){
  view.artBoardActive=true;
  view.artBoard={source:imageUrl,textureLoaded:false,textureError:null,face:null};
  view.scene.background=new THREE.Color(0x080b14);
  view.scene.fog=null;
  view.renderer.toneMappingExposure=1.05;

  // Dark hard-edged physical frame directly under the photo's own black frame.
  const substrate=new THREE.Mesh(
    new THREE.BoxGeometry(ART_WORLD_WIDTH+.6,.46,ART_WORLD_DEPTH+.6),
    new THREE.MeshStandardMaterial({color:0x10151d,metalness:.37,roughness:.44})
  );
  substrate.position.y=-.28;substrate.receiveShadow=true;view.world.add(substrate);
  const artMaterial=new THREE.MeshBasicMaterial({
    color:0xffffff,side:THREE.DoubleSide,toneMapped:false
  });
  const face=new THREE.Mesh(new THREE.PlaneGeometry(ART_WORLD_WIDTH,ART_WORLD_DEPTH),artMaterial);
  face.rotation.x=-Math.PI/2;
  face.position.y=.012;
  face.receiveShadow=false;
  face.name='USER APPROVED EXACT MUSIC CITY BOARD FACE';
  view.artBoard.face=face;view.world.add(face);
  new THREE.TextureLoader().load(imageUrl,texture=>{
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=Math.min(8,view.renderer.capabilities.getMaxAnisotropy());
    artMaterial.map=texture;artMaterial.needsUpdate=true;
    view.artBoard.textureLoaded=true;
    view.dispatchEvent(new CustomEvent('artready',{detail:{url:imageUrl}}));
  },undefined,error=>{
    view.artBoard.textureError='Could not load the exact approved board image.';
    console.error('Music City Board art failed to load',error);
    view.landingBanner.textContent=view.artBoard.textureError;
    view.landingBanner.classList.add('show');
    view.dispatchEvent(new CustomEvent('arterror',{detail:{url:imageUrl}}));
  });

  view.coords=ART_ROAD_PIXELS.map(artPixelToWorld);
  const districtColors={country:0xffb641,global:0xbc65ff,hiphop:0x3fa9ff,latin:0xff527d};
  const sideDistricts={North:'hiphop',East:'country',South:'global',West:'latin'};
  spaces.forEach((space,index)=>{
    const g=new THREE.Group();
    g.name='Art landing '+index+' '+space.name;
    g.userData={type:'space',id:space.id,index};
    g.position.set(view.coords[index][0],0,view.coords[index][1]);
    circleHit(g,.72);
    const district=space.producer||sideDistricts[space.side];
    const ring=addRing(g,districtColors[district]||0x8dd6ff,.50);
    g.userData.ownershipRing=ring;
    // A landing spot has no graphic until an artist buys it or selects it;
    // the original neighborhood roads and signs remain unobstructed.
    view.world.add(g);view.spaceGroups.set(space.id,g);
  });

  landmarks.forEach((landmark,index)=>{
    const pixel=ART_LANDMARK_PIXELS[index];
    if(!pixel)return;
    const g=new THREE.Group();markAt(g,pixel);
    g.userData={type:'landmark',id:landmark.id};
    g.userData.ring=addRing(g,0xffcf6d,1);
    circleHit(g,1.05);
    g.name='Art landmark '+landmark.name;
    view.world.add(g);view.landmarkGroups.set(landmark.id,g);
  });

  for(const [district,pixel] of Object.entries(ART_DISTRICT_PIXELS)){
    const g=new THREE.Group();markAt(g,pixel);
    g.name='Music borough '+district;
    g.userData={type:'borough',id:district};
    circleHit(g,2.1);
    view.world.add(g);view.boroughGroups.push(g);
  }

  view.artBoard.producerMarkers=new Map();
  for(const [district,pixel] of Object.entries(ART_PRODUCER_ICON_PIXELS)){
    const g=new THREE.Group();markAt(g,pixel);
    g.name='Original artwork producer prompt '+district;
    const ring=addRing(g,districtColors[district]||0xffd75c,.72);
    ring.position.y=.15;
    // The original printed prompt marker is always the visible graphic.
    // This subtle dynamic halo turns on only while an uncollected prompt is highlighted.
    const clickable=circleHit(g,.84);
    const producerSpace=spaces.find(s=>s.kind==='producer'&&s.producer===district);
    if(producerSpace){
      g.userData={type:'space',id:producerSpace.id,promptDistrict:district};
      view.world.add(g);
      view.artBoard.producerMarkers.set(district,{group:g,ring});
      view.boroughGroups.push(g);
    }
  }
  view.homeBoard.set(0,57,6);
  view.desiredTarget.set(0,0,0);
  view.desiredPos.copy(view.homeBoard);
  view.look.set(0,0,0);
}
export function fusionArtLandingSlot(position,index=0){
  return artLandingSlot(position,index);
}
export function syncFusionArtOwnership(view,state){
  state.spaces.forEach(s=>{
    const g=view.spaceGroups.get(s.id),ring=g?.userData.ownershipRing;
    if(!ring)return;
    const g=view.spaceGroups.get(s.id),ring=g?.userData.ownershipRing;
    if(!ring)return;
    const owner=state.players.find(p=>p.id===s.ownerId);
    ring.material.opacity=owner?.id?.length ? .85 : .015;
    if(owner)ring.material.color.set(owner.color||'#81c8ff');
  });
  state.landmarks.forEach(l=>{
    const g=view.landmarkGroups.get(l.id);
    const ring=g?.userData.ring;
    if(!ring)return;
    const owner=state.players.find(p=>p.id===l.ownerId);
    ring.material.opacity=owner?.id?.length ? .85 : .025;
    if(owner)ring.material.color.set(owner.color||'#81c8ff');
  });
}
