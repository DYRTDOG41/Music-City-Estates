// Landing routes for the exact user-approved 1448 x 1086 Music City Estates board art.
// These pixels follow the roads already painted into the original image: no new squares
// and no substitute layout. Each indexed stop is the existing game's 40-space route.
// GO starts at the large gold Music City arrow at the front of the board; travel
// counterclockwise through Hip-Hop, Country, Velvet Grove and Latin Quarter.
export const ART_WIDTH=1448;
export const ART_HEIGHT=1086;
export const ART_WORLD_WIDTH=40;
export const ART_WORLD_DEPTH=30;
export const ART_IMAGE_SHA256='49f4bf27b440f89e88462e615e9cf3a9d452f18e01c48d8787f3120938e00695';

export const ART_ROAD_PIXELS=Object.freeze([
  [730,816], // 0: GO, gold arrow
  [667,802],[610,766],[570,704],[520,655],[467,633], // Hip-Hop producer approaches
  [408,618],[334,605],[267,588],[191,545],[145,478],
  [153,408],[192,344],[246,297],[306,253],[361,229], // Country prompt
  [440,203],[519,178],[600,163],[676,155],[750,157],
  [824,159],[916,180],[1004,207],[1094,258],[1190,325], // Velvet prompt
  [1273,375],[1320,416],[1342,460],[1340,486],[1350,509],
  [1333,532],[1295,554],[1251,582],[1206,619],[1148,659], // Latin prompt
  [1061,709],[963,763],[873,793],[786,816]
]);

// Pick targets match the actual icons and buildings printed on the user's art.
export const ART_DISTRICT_PIXELS=Object.freeze({
  country:[371,248], global:[1081,293], hiphop:[457,567], latin:[1104,611]
});
export const ART_LANDMARK_PIXELS=Object.freeze([
  [719,654], // Festival Pavilion
  [618,565], // Hip-Hop cafe
  [1104,675],// Latin cafe
  [1050,295],// Velvet Grove cafe (legacy global landmark)
  [502,301], // Country cafe
  [390,343], // Music City Radio
  [1266,591],// Record Store
  [1262,692],// Collab Hall
  [617,412]  // Artist Management
]);
export const ART_PRODUCER_ICON_PIXELS=Object.freeze({
  country:[338,236],global:[1200,339],hiphop:[564,635],latin:[1246,552]
});

export function artPixelToWorld([x,y]){
  if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid art image coordinate');
  return [(x/ART_WIDTH-.5)*ART_WORLD_WIDTH,(y/ART_HEIGHT-.5)*ART_WORLD_DEPTH];
}
export function artRoadPoint(position){
  return artPixelToWorld(ART_ROAD_PIXELS[(position+ART_ROAD_PIXELS.length)%ART_ROAD_PIXELS.length]);
}
export function artLandingSlot(position,seatIndex=0){
  const index=(position+ART_ROAD_PIXELS.length)%ART_ROAD_PIXELS.length;
  const current=artRoadPoint(index);
  const prev=artRoadPoint((index+39)%40),next=artRoadPoint((index+1)%40);
  const dx=next[0]-prev[0],dz=next[1]-prev[1],norm=Math.hypot(dx,dz)||1;
  const lane=[-.28,-.09,.09,.28][((seatIndex%4)+4)%4];
  return {
    x:current[0]-dz/norm*lane,
    y:.2,
    z:current[1]+dx/norm*lane,
    rotation:-Math.atan2(dz,dx)
  };
}
