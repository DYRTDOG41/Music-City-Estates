import { BOARD_SPACES as DETROIT_BOARD, LANDMARKS as DETROIT_LANDMARKS } from './data.js';

export const DISTRICTS = [
  { id:'hiphop', name:'Hip-Hop Heights', side:'North', accent:'#4b9bff',
    parts:[{id:'boom',name:'Boom-bap drums'},{id:'trap',name:'Modern 808 groove'}] },
  { id:'latin', name:'Latin Quarter', side:'East', accent:'#f5a853',
    parts:[{id:'clave',name:'Clave and percussion'},{id:'dance',name:'Dance percussion'}] },
  { id:'global', name:'Global Sound District', side:'South', accent:'#9cdfb6',
    parts:[{id:'hand',name:'Hand-drum pattern'},{id:'pluck',name:'Plucked melody'}] },
  { id:'country', name:'Country Crossings', side:'West', accent:'#d9aeec',
    parts:[{id:'guitar',name:'Country guitar pulse'},{id:'shuffle',name:'Country shuffle'}] },
];

const producerBlocks = {North:[3,4,5],East:[13,14,15],South:[23,24,25],West:[33,34,35]};
const streetNames = {
  North:['Studio Row','Beat Market','East Mic Avenue','Freestyle Lane','Record Shop Row','Headliner Drive','Harmony Street'],
  East:['Café Plaza','Rhythm Market','Festival Avenue','Dance Row','Producer Street','Soundcheck Square','Market Boulevard'],
  South:['Collab Corner','World Stage Road','Global Market','Live Room Lane','Record Exchange','Tour Road','Crossroads'],
  West:['Songwriter Lane','Backroad Records','Guitar Row','Story Street','Venue Avenue','Merch Square','Country Road'],
};
const cursors={North:0,East:0,South:0,West:0};
export const BOARD_SPACES = DETROIT_BOARD.map((original,index)=>{
  const s={...original,ownerId:null};
  if(index===0)return {...s,name:'Music City Start',kind:'start',effect:'Collect $80 each lap.'};
  if(index===8)return {...s,name:'BeGenius Studio · Hip-Hop Heights',kind:'studio',effect:'Four producer pieces required.'};
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
  name:['Festival Pavilion','Hip-Hop Café','Latin Café','Global Café','Country Café',
    'Music City Radio','Record Store','Collab Hall','Artist Management'][i],
  price:140+i*15,
  description:'A music business that strengthens nearby properties.',
}));

export const CONFIG = {
  startCash:240, passStart:80, managerCost:300, radioCost:120,
  prize:2000, saveKey:'mce-fusion-board-v1'
};
