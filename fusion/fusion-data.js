import { BOARD_SPACES as DETROIT_BOARD, LANDMARKS as DETROIT_LANDMARKS } from './data.js';

// The IDs remain stable for existing saves. "global" is the legacy save key for the
// same fourth prompt slot, now represented by the approved artwork's Velvet Grove.
export const DISTRICTS = [
  { id:'country', name:'Country Crossings', side:'East', accent:'#ffb641',
    parts:[{id:'guitar',name:'Acoustic guitar',prompt:'Bring in a clear acoustic guitar motif and a storytelling chorus.'},{id:'shuffle',name:'Country shuffle',prompt:'Give the song a light country shuffle and a melodic, story-driven hook.'}] },
  { id:'global', name:'Velvet Grove', side:'South', accent:'#bd69f9',
    parts:[{id:'soul',name:'Velvet soul chords',prompt:'Lay warm R&B keyboard chords beneath a smooth soulful melody and expressive vocal harmonies.'},{id:'groove',name:'R&B pocket',prompt:'Give the song a deep R&B bassline, restrained percussion and an emotional call-and-response hook.'},{id:'hand',name:'Legacy hand-drum texture',prompt:'Weave a gentle hand-drum pattern into the arrangement.'},{id:'pluck',name:'Legacy plucked melody',prompt:'Add a warm plucked-string melody as a global fusion texture.'}] },
  { id:'hiphop', name:'Hip-Hop Heights', side:'North', accent:'#4b9bff',
    parts:[{id:'boom',name:'Boom-bap groove',prompt:'Use a laid-back boom-bap drum groove with room for the vocal.'},{id:'trap',name:'Modern 808 groove',prompt:'Use crisp hip-hop drums and a warm, restrained 808 bassline.'}] },
  { id:'latin', name:'Latin Quarter', side:'West', accent:'#ff6385',
    parts:[{id:'clave',name:'Clave rhythm',prompt:'Add a subtle clave-inspired rhythm and layered hand percussion.'},{id:'dance',name:'Dance percussion',prompt:'Add bright, syncopated Latin dance percussion that lifts the chorus.'}] },
];

const producerBlocks = {North:[3,4,5],East:[13,14,15],South:[23,24,25],West:[33,34,35]};
// The original 40 index IDs remain unchanged: physical roadway now follows the
// approved image GO -> Hip-Hop -> Country -> Velvet -> Latin -> GO.
const streetNames = {
  North:['Studio Row','Beat Market','East Mic Avenue','Freestyle Lane','Record Shop Row','Headliner Drive','Harmony Street'],
  East:['Songwriter Lane','Backroad Records','Guitar Row','Story Street','Venue Avenue','Merch Square','Country Road'],
  South:['Harmony Avenue','Velvet Records','Soul Stage Lane','Lyric Lounge','Hook House Row','R&B Market','Publishing Boulevard'],
  West:['Café Plaza','Rhythm Market','Festival Avenue','Dance Row','Producer Street','Soundcheck Square','Market Boulevard'],
};
const cursors={North:0,East:0,South:0,West:0};
export const BOARD_SPACES = DETROIT_BOARD.map((original,index)=>{
  const s={...original,ownerId:null};
  if(index===0)return {...s,name:'Music City Start · GO',kind:'start',effect:'Collect $200 each time you pass GO.'};
  if(index===8)return {...s,name:'BeGenius Studio · Hip-Hop Heights',kind:'studio',effect:'Collect four prompts and complete two laps. Book a $500 session through your in-game phone; landing here is optional.'};
  if(index===10)return {...s,name:'Borough Junction',kind:'event',effect:'Connect to the next borough.'};
  if(index===20)return {...s,name:'Music City Radio',kind:'radio',effect:'Manager and finished song required.'};
  if(index===30)return {...s,name:'Festival Finale',kind:'festival',effect:'Radio airplay required.'};
  const district=DISTRICTS.find(d=>d.side===s.side);
  if(producerBlocks[s.side]?.includes(index)){
    return {...s,name:district.name+' Producer',kind:'producer',producer:district.id,
      price:undefined,baseRent:undefined,type:'event'};
  }
  if(s.type==='event')return {...s,name:'Music City Moment',kind:'event'};
  const label=streetNames[s.side][cursors[s.side]++ % streetNames[s.side].length];
  const price=100+Math.floor(index/10)*10+(cursors[s.side]%3)*10;
  return {...s,name:label,kind:'property',type:'neighborhood',price,baseRent:25+Math.floor(index/10)*5};
});

export const LANDMARKS = DETROIT_LANDMARKS.map((item,i)=>({
  ...item,
  x:i===5?0:i===8?-3.7:item.x,
  z:i===5?-3.7:i===8?0:item.z,
  level:1,
  name:['Festival Pavilion','Hip-Hop Café','Latin Café','Velvet Grove Café','Country Café',
    'Music City Radio','Record Store','Collab Hall','Artist Management'][i],
  price:140+i*15,
  description:'A music business that strengthens nearby properties.',
}));

export const CONFIG = {
  startCash:1000, passStart:200, studioSessionFee:500, studioMinLaps:2, managerCost:300, radioCost:120,
  prize:2000, saveKey:'mce-fusion-board-v1'
};
