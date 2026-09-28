export const VEHICLES = [
  {
    id:'city_standard', name:'City Standard', tier:'Starter', price:0, model:'sedan', pieceScale:.68,
    description:'Reliable starter sedan. Included with every new Detroit Empire career.',
    unlock:{type:'always'}
  },
  {
    id:'woodward_coupe', name:'Woodward Coupe', tier:'Street', price:85000, model:'coupe', pieceScale:.68,
    description:'Low sport coupe with a sharper stance and quicker-looking street presence.',
    unlock:{type:'always'}
  },
  {
    id:'boulevard_gt', name:'Boulevard GT', tier:'Street', price:125000, model:'muscle', pieceScale:.68,
    description:'Detroit-inspired grand touring muscle with a long hood and aggressive bodywork.',
    unlock:{type:'always'}
  },
  {
    id:'summit_lx', name:'Summit LX', tier:'Luxury', price:220000, model:'suv', pieceScale:.66,
    description:'Premium luxury SUV with dark glass, roof rails and executive styling.',
    unlock:{type:'netWorth',value:1100000}
  },
  {
    id:'motor_ridge_4x4', name:'Motor Ridge 4x4', tier:'Luxury', price:275000, model:'offroad', pieceScale:.66,
    description:'Upscale off-road SUV with wide fenders, side steps, spare tire and forged 24-inch-style wheels.',
    includedRim:'forged_24',
    unlock:{type:'properties',value:3}
  },
  {
    id:'midnight_aero', name:'Midnight Aero', tier:'Elite', price:450000, model:'exotic', pieceScale:.68,
    description:'Low exotic coupe with aero splitters, rear wing and oversized performance wheels.',
    unlock:{type:'laps',value:1}
  },
  {
    id:'motor_aero_25', name:'Motor Aero 25', tier:'Elite', price:325000, model:'exotic', pieceScale:.70,
    description:'De-badged 2025 mid-engine American supercar-inspired replica with canopy-forward proportions, deep side intakes, sharp LED lighting, rear aero and quad exhaust.',
    includedRim:'turbine',
    unlock:{type:'always'}
  },
  {
    id:'empire_twelve', name:'Empire Twelve', tier:'Elite', price:625000, model:'luxury', pieceScale:.69,
    description:'Flagship ultra-luxury sedan built for players whose empire has reached another level.',
    unlock:{type:'netWorth',value:1750000}
  },
  {
    id:'heritage_313', name:'Heritage 313', tier:'Collector', price:700000, model:'classic', pieceScale:.7,
    description:'A collector-style Detroit grand cruiser unlocked by controlling an entire neighborhood district.',
    includedRim:'deep_dish',
    unlock:{type:'fullDistrict',value:1}
  },
  {
    id:'mobility_one', name:'Mobility One', tier:'Achievement', price:500000, model:'exotic', pieceScale:.68,
    description:'Special performance flagship reserved for players who control all four mobility companies.',
    includedRim:'turbine',
    unlock:{type:'autoCount',value:4}
  }
];

export const RIMS = [
  {id:'factory',name:'Factory Alloy',price:0,spokes:5,scale:.52,finish:'silver'},
  {id:'five_star',name:'Five-Star Chrome',price:15000,spokes:5,scale:.58,finish:'chrome'},
  {id:'mesh_20',name:'Metro Mesh 20',price:25000,spokes:10,scale:.59,finish:'silver'},
  {id:'turbine',name:'Turbine Performance',price:35000,spokes:8,scale:.61,finish:'dark'},
  {id:'forged_24',name:'Forged 24',price:50000,spokes:6,scale:.66,finish:'chrome'},
  {id:'deep_dish',name:'Deep Dish Gold',price:60000,spokes:7,scale:.63,finish:'gold'}
];

export const PAINTS = [
  {id:'midnight',name:'Midnight Black',hex:'#101216'},
  {id:'pearl',name:'Pearl White',hex:'#e9edf0'},
  {id:'gunmetal',name:'Gunmetal',hex:'#485057'},
  {id:'motor_blue',name:'Motor Blue',hex:'#2f80ed'},
  {id:'racing_red',name:'Racing Red',hex:'#e2584d'},
  {id:'empire_gold',name:'Empire Gold',hex:'#e0a83e'},
  {id:'royal_purple',name:'Royal Purple',hex:'#7f62c9'},
  {id:'emerald',name:'Emerald',hex:'#26735a'}
];

export const getVehicle = id => VEHICLES.find(v=>v.id===id) || VEHICLES[0];
export const getRim = id => RIMS.find(r=>r.id===id) || RIMS[0];

