import { VEHICLES, RIMS, PAINTS, getVehicle, getRim } from './vehicles.js?v=42';

export { VEHICLES, RIMS, PAINTS, getVehicle, getRim };

export const STARTER_VEHICLES=['city_standard','woodward_coupe','boulevard_gt'];

// Detroit cars are cosmetic career rewards in this board's smaller cash economy.
export function vehicleGate(id,player,state,propertyCount=0){
  const cards=Object.keys(player.producerParts||{}).length;
  switch(id){
    case 'city_standard':case 'woodward_coupe':case 'boulevard_gt':return {open:true,reason:'Starter car'};
    case 'summit_lx':return {open:cards>=2,reason:'Collect 2 producer cards'};
    case 'motor_ridge_4x4':return {open:propertyCount>=1,reason:'Own a music business'};
    case 'midnight_aero':return {open:cards>=4,reason:'Collect all 4 producer cards'};
    case 'motor_aero_25':return {open:Boolean(player.song),reason:'Finish your fusion song'};
    case 'empire_twelve':return {open:Boolean(player.manager),reason:'Hire a manager'};
    case 'heritage_313':return {open:Boolean(player.radio),reason:'Get radio airplay'};
    case 'mobility_one':return {open:state.headlineId===player.id,reason:'Headline the festival'};
    default:return {open:false,reason:'Unavailable'};
  }
}

export function rimGate(id,player,propertyCount=0){
  const cards=Object.keys(player.producerParts||{}).length;
  switch(id){
    case 'factory':return {open:true,reason:'Included'};
    case 'five_star':return {open:cards>=1,reason:'Collect 1 producer card'};
    case 'mesh_20':return {open:cards>=2,reason:'Collect 2 producer cards'};
    case 'turbine':return {open:Boolean(player.song),reason:'Finish your fusion song'};
    case 'forged_24':return {open:propertyCount>=1,reason:'Own a music business'};
    case 'deep_dish':return {open:Boolean(player.radio),reason:'Get radio airplay'};
    default:return {open:false,reason:'Unavailable'};
  }
}
