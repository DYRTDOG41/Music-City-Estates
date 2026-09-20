import {createRoom} from './mce_3d_room.js';

const CONTENT_KEY='mceSocialContent';
const perkId='socialMediaSuite';
const demoContent=[
  {platform:'Instagram',title:'Studio Night: Behind the Scenes',url:''},
  {platform:'YouTube',title:'Official Music Video Premiere',url:''},
  {platform:'Facebook',title:'Live Show Announcement',url:''},
  {platform:'TikTok',title:'16-Bar Freestyle Clip',url:''},
  {platform:'Music City',title:'New Record Available in the City',url:''}
];
let state=window.MCE.load(),content=loadContent(),screenOffset=0;
const screens=[];

function loadContent(){try{const saved=JSON.parse(localStorage.getItem(CONTENT_KEY)||'[]');return Array.isArray(saved)?saved.slice(0,12):[]}catch(error){return[]}}
function saveContent(){localStorage.setItem(CONTENT_KEY,JSON.stringify(content.slice(0,12)))}
function safeUrl(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:''}catch(error){return''}}
function owned(){return window.MCE.hasPerk(perkId,state)}
function currentContent(){return content.length?content:demoContent}
function updateStats(){state=window.MCE.load();for(const key of ['fans','cash','xp'])document.getElementById(key).textContent=Number(state[key]||0).toLocaleString();const label=document.getElementById('perkState');label.textContent=owned()?'SUITE OWNED':'PREVIEW';label.className=owned()?'owned':'preview'}
function openModal(id){document.getElementById(id).classList.add('show')}
function closeModal(id){document.getElementById(id).classList.remove('show')}

const room=createRoom({spawn:[0,1.7,12],background:0x02040b,fog:0x071326,fogDensity:.012,sky:0x214e78});
const {THREE,scene,renderer}=room;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;renderer.outputColorSpace=THREE.SRGBColorSpace;
scene.add(new THREE.AmbientLight(0x245b91,.58));
const floor=new THREE.Mesh(new THREE.CylinderGeometry(15,15,.24,64),new THREE.MeshStandardMaterial({color:0x07111e,metalness:.62,roughness:.28}));floor.position.y=-.12;floor.receiveShadow=true;scene.add(floor);
for(let ring=3;ring<=12;ring+=3){const line=new THREE.Mesh(new THREE.TorusGeometry(ring,.035,8,64),new THREE.MeshBasicMaterial({color:ring%2?0x3155ff:0x19cfff,transparent:true,opacity:.45}));line.rotation.x=Math.PI/2;line.position.y=.02;scene.add(line)}
room.cylinder('content console',2.25,1.05,[0,.55,0],0x101c2a,{metalness:.78,roughness:.22});room.cylinder('console light',2.05,.06,[0,1.1,0],0x55ddff,{metalness:.2,roughness:.12});room.label('THE VIRAL GALLERY\nCONTROL CENTER',[0,2.35,0],'#69e6ff',[5.8,1.45]);

function platformColor(platform){return {Instagram:'#e84a8a',YouTube:'#ff3848',Facebook:'#3c83ff',TikTok:'#43f3df','Music City':'#58dfff'}[platform]||'#9d7bff'}
function screenTexture(item,index){const canvas=document.createElement('canvas');canvas.width=900;canvas.height=520;const ctx=canvas.getContext('2d'),color=platformColor(item.platform);const gradient=ctx.createLinearGradient(0,0,900,520);gradient.addColorStop(0,'#07101d');gradient.addColorStop(1,color+'88');ctx.fillStyle=gradient;ctx.fillRect(0,0,900,520);ctx.strokeStyle=color;ctx.lineWidth=18;ctx.strokeRect(9,9,882,502);ctx.fillStyle=color;ctx.font='900 48px Arial';ctx.fillText(String(item.platform||'SOCIAL').toUpperCase(),48,78);ctx.fillStyle='#fff';ctx.font='900 68px Arial';wrap(ctx,item.title||'Your Content',48,210,800,78);ctx.fillStyle='#aeeeff';ctx.font='700 27px Arial';ctx.fillText(content.length?'INTERACT TO OPEN':'DEMO SCREEN • ADD YOUR CONTENT',48,464);ctx.fillStyle='#fff';ctx.font='900 24px Arial';ctx.textAlign='right';ctx.fillText(String(index+1).padStart(2,'0'),842,76);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture}
function wrap(ctx,text,x,y,width,lineHeight){const words=String(text).split(/\s+/);let line='';for(const word of words){const test=line+word+' ';if(ctx.measureText(test).width>width&&line){ctx.fillText(line,x,y);line=word+' ';y+=lineHeight}else line=test}ctx.fillText(line,x,y)}
function refreshScreens(){const items=currentContent();screens.forEach((entry,index)=>{const item=items[(screenOffset+index)%items.length];entry.item=item;if(entry.mesh.material.map)entry.mesh.material.map.dispose();entry.mesh.material.map=screenTexture(item,index);entry.mesh.material.needsUpdate=true})}
for(let index=0;index<12;index++){
  const angle=index/12*Math.PI*2,radius=11.5,x=Math.sin(angle)*radius,z=Math.cos(angle)*radius;
  const frame=room.box('social screen frame',[5.15,3.35,.28],[x,3.25,z],0x111927,{metalness:.82,roughness:.22});frame.rotation.y=angle;
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(4.72,2.92),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}));screen.position.set(x-Math.sin(angle)*.17,3.25,z-Math.cos(angle)*.17);screen.rotation.y=angle+Math.PI;scene.add(screen);
  const entry={mesh:screen,item:null};screens.push(entry);
  room.interact('OPEN SOCIAL SCREEN '+(index+1),[x-Math.sin(angle)*2.4,1.7,z-Math.cos(angle)*2.4],()=>showScreen(entry.item),2.1,0x55dfff);
  const light=room.light(index%3===0?0xff3e78:index%3===1?0x38cfff:0x7956ff,4.2,[x*.86,5.15,z*.86],7);light.castShadow=false;
}
refreshScreens();setInterval(()=>{screenOffset=(screenOffset+1)%currentContent().length;refreshScreens()},5000);

room.interact('OPEN VIRAL GALLERY CONSOLE',[0,1.7,3.1],()=>owned()?openContentManager():showPerk(),3,0x59ddff);
room.interact('LAUNCH CAREER CAMPAIGN',[-3.6,1.7,0],showCampaign,2.5,0xff4f91);
room.interact('RETURN TO MUSIC CITY',[3.6,1.7,0],()=>location.href='city_map.html',2.5,0xffd35e);

function showPerk(){const status=window.MCE.perkStatus(perkId,state),perk=window.MCE.PERKS[perkId];document.getElementById('xpRequirement').textContent=status.xpNeeded?status.xpNeeded+' MORE XP':'50 XP ✓';document.getElementById('cashRequirement').textContent=status.cashNeeded?'$'+status.cashNeeded+' MORE NEEDED':'$'+perk.price+' ✓';document.getElementById('purchasePerk').disabled=status.owned||!status.eligible||!status.affordable;document.getElementById('purchasePerk').textContent=status.owned?'GALLERY ALREADY OWNED':'BUY THE VIRAL GALLERY';document.getElementById('perkNotice').textContent=status.owned?'This perk permanently belongs to your career.':!status.eligible?'Build your career to 50 XP before purchasing.':!status.affordable?'Earn $'+status.cashNeeded+' more through performances and career activity.':'You qualify. Purchase once and the room stays unlocked.';openModal('perkModal')}
document.getElementById('purchasePerk').onclick=()=>{try{state=window.MCE.purchasePerk(perkId);updateStats();document.getElementById('perkNotice').textContent='✓ The Viral Gallery purchased. Content management and campaigns are now active.';document.getElementById('purchasePerk').disabled=true;document.getElementById('purchasePerk').textContent='GALLERY OWNED'}catch(error){document.getElementById('perkNotice').textContent=error.message}};

function openContentManager(){if(!owned()){showPerk();return}renderContentList();openModal('contentModal')}
function renderContentList(){const list=document.getElementById('contentList');list.innerHTML='';if(!content.length){list.innerHTML='<div class="notice">No content connected yet. The wall is showing Music City demo screens.</div>';return}content.forEach((item,index)=>{const row=document.createElement('div');row.className='content-row';const copy=document.createElement('div');const title=document.createElement('b');title.textContent=item.title;const platform=document.createElement('small');platform.textContent=item.platform;copy.append(title,platform);const remove=document.createElement('button');remove.className='remove';remove.textContent='REMOVE';remove.onclick=()=>{content.splice(index,1);saveContent();refreshScreens();renderContentList()};row.append(copy,remove);list.append(row)})}
document.getElementById('addContent').onclick=()=>{const title=document.getElementById('contentTitle').value.trim(),url=safeUrl(document.getElementById('contentUrl').value),platform=document.getElementById('contentPlatform').value,notice=document.getElementById('contentNotice');if(!title){notice.textContent='Add a title for this piece of content.';return}if(!url){notice.textContent='Add a valid public http or https link.';return}if(content.length>=12){notice.textContent='The wall holds 12 items. Remove one before adding another.';return}content.push({platform,title:title.slice(0,54),url});saveContent();document.getElementById('contentTitle').value='';document.getElementById('contentUrl').value='';notice.textContent='✓ Added to the rotating TV wall.';refreshScreens();renderContentList()};

function showScreen(item){item=item||demoContent[0];document.getElementById('screenPlatform').textContent=item.platform;document.getElementById('screenTitle').textContent=item.title;document.getElementById('screenCaption').textContent=item.url?'This window represents your public '+item.platform+' content inside Music City Estates.':'Demo content rotates here until you connect your own public posts.';const link=document.getElementById('openContent');link.href=item.url||'#';link.style.display=item.url?'block':'none';openModal('screenModal')}

function latestRelease(){return [...(state.releases||[])].reverse().find(release=>release.releaseStatus==='released')}
function showCampaign(){updateStats();const release=latestRelease(),campaigns=state.flags&&state.flags.socialCampaigns||{},notice=document.getElementById('campaignNotice'),button=document.getElementById('launchCampaign');document.getElementById('campaignDescription').textContent=release?'Promote “'+release.title+'” across your rotating social wall.':'Record and release a song before launching a social campaign.';button.disabled=!owned()||!release||state.cash<40||Boolean(release&&campaigns[release.id]);notice.textContent=!owned()?'Purchase The Viral Gallery first.':!release?'No released record is available.':campaigns[release.id]?'This record has already received its Viral Gallery campaign.':state.cash<40?'Earn $'+(40-state.cash)+' more to fund this campaign.':'Campaign ready for '+release.title+'.';button.dataset.releaseId=release&&release.id||'';openModal('campaignModal')}
document.getElementById('launchCampaign').onclick=()=>{const release=latestRelease();if(!owned()||!release||state.cash<40)return;const flags=JSON.parse(JSON.stringify(state.flags||{}));flags.socialCampaigns=flags.socialCampaigns||{};if(flags.socialCampaigns[release.id])return;flags.socialCampaigns[release.id]={launchedAt:new Date().toISOString(),cost:40,fans:12,xp:8};state=window.MCE.save({cash:state.cash-40,fans:state.fans+12,xp:state.xp+8,flags});updateStats();document.getElementById('campaignNotice').textContent='✓ Campaign live! +12 Fans • +8 XP';document.getElementById('launchCampaign').disabled=true};

document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>closeModal(button.dataset.close));document.querySelectorAll('.modal').forEach(modal=>modal.addEventListener('click',event=>{if(event.target===modal)closeModal(modal.id)}));addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.modal.show').forEach(modal=>closeModal(modal.id))});updateStats();
