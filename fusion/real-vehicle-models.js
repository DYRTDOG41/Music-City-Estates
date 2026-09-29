export const REAL_VEHICLE_ASSETS = {
  toyCar: {
    id:'toyCar',
    url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb',
    title:'Khronos Toy Car',
    license:'CC0-1.0',
    credit:'Guido Odendahl; material edits by Eric Chadwick',
    targetLength:1.92,
    paintMaterial:/^(ToyCar)$/i,
    wheelName:/wheel|rim|tire/i,
    hideName:/camera|fabric/i,
    hoodName:null,
    frontSign:1
  },
  motorAero25: {
    id:'motorAero25',
    url:'./assets/vehicles/motor_aero_25.glb?v=30',
    title:'Motor Aero 25',
    license:'Original Detroit Empire game asset',
    credit:'Created from the approved Motor Aero 25 concept mockup',
    targetLength:2.05,
    paintMaterial:/^BodyPaint/i,
    wheelName:/^(Tires|Rims|Brake)/i,
    hideName:/license|emblem|logo/i,
    hoodName:'FrontHood',
    frontSign:1
  },
  carConcept: {
    id:'carConcept',
    url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb',
    title:'Khronos Car Concept',
    license:'CC-BY-4.0',
    credit:'Darmstadt Graphics Group GmbH and Eric Chadwick; original model credited in upstream asset',
    targetLength:1.98,
    paintMaterial:/^Paint\s+[12]\s+/i,
    wheelName:/wheel|rim|tire/i,
    hideName:/license|emblem|logo|khronos|commerce/i,
    hoodName:'BodyHood',
    frontSign:1
  }
};

export const REAL_VEHICLE_MAP = {
  city_standard:'carConcept',
  woodward_coupe:'carConcept',
  boulevard_gt:'carConcept',
  summit_lx:'carConcept',
  motor_ridge_4x4:'carConcept',
  midnight_aero:'carConcept',
  motor_aero_25:'motorAero25',
  empire_twelve:'carConcept',
  heritage_313:'carConcept',
  mobility_one:'carConcept'
};

export const getRealVehicleSpec = vehicleId => {
  const assetId=REAL_VEHICLE_MAP[vehicleId]||'toyCar';
  return REAL_VEHICLE_ASSETS[assetId];
};

