// Browser-to-browser smoke test against the deployed Fusion Board preview.
// Runs in isolated mobile browser contexts with the real signalling service.
import assert from 'node:assert/strict';
import {chromium, devices} from 'playwright';

const url=process.env.MCE_PREVIEW_URL;
if(!url)throw Error('MCE_PREVIEW_URL must point to the deployed fusion_board.html');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const failures=[];
let host,guest;
function attachDiagnostics(page,name){
  page.on('pageerror',error=>failures.push(name+': '+error.message));
  page.on('console',m=>{if(m.type()==='error')console.warn(name+' console: '+m.text().slice(0,220));});
}
try{
  const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(30000)});
  console.log('Preview HTTP:',response.status,'final URL:',response.url);
  assert.equal(response.status,200,'Preview is not publicly accessible. Check Vercel Deployment Protection before inviting testers.');
  const document=await response.text();
  assert.match(document,/fusion-app\.js/,'Expected the Fusion Board page, not a login page.');
  const hostContext=await browser.newContext({...devices['iPhone 13'],permissions:[]});
  const guestContext=await browser.newContext({...devices['iPhone 13'],permissions:[]});
  host=await hostContext.newPage();guest=await guestContext.newPage();
  attachDiagnostics(host,'host');attachDiagnostics(guest,'guest');
  await host.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await host.locator('#begin').waitFor({state:'visible',timeout:45000});
  await host.locator('#setupRows input[aria-label="Artist name"]').first().fill('Live Test Host');
  await host.locator('#begin').click();
  await host.waitForFunction(()=>window.musicCityFusion?.renderer?.artBoard?.textureLoaded===true,
    null,{timeout:60000});
  const board=await host.evaluate(async()=>{
    const renderer=window.musicCityFusion.renderer;
    const response=await fetch('/assets/fusion/board-approved-original.png');
    return {
      ready:renderer.artBoard.textureLoaded,
      path:renderer.artBoard.source,
      spaces:renderer.coords.length,
      imageBytes:(await response.arrayBuffer()).byteLength,
      contentType:response.headers.get('content-type')
    };
  });
  assert.equal(board.ready,true);
  assert.equal(board.spaces,40);
  assert.equal(board.imageBytes,2856862,'Must load the exact original approved PNG');
  assert.match(board.contentType,/image\/png/);
  console.log('PASS: exact 2.86 MB user-approved art is the loaded 3D board texture, with 40 road stops');
  await host.locator('#phoneBtn').click();
  await host.locator('#createFusionRoom').click();
  await host.waitForFunction(()=>window.musicCityFusion?.room?.role==='host'&&
    window.musicCityFusion.room.peer?.id,{timeout:45000});
  const invite=await host.evaluate(()=>window.musicCityFusion.room.inviteLink());
  console.log('Host room created:',invite.replace(/\?room=.*/,'?room=REDACTED'));
  await guest.goto(invite,{waitUntil:'domcontentloaded',timeout:45000});
  await guest.locator('#joinFusion').waitFor({state:'visible',timeout:45000});
  await guest.locator('#joinArtist').fill('Live Test Guest');
  await guest.locator('#joinFusion').click();
  await guest.waitForFunction(()=>window.musicCityFusion?.room?.role==='guest'&&
    Boolean(window.musicCityFusion.room.seatId),null,{timeout:45000});
  const players=await guest.evaluate(()=>window.musicCityFusion.engine.state.players.map(p=>p.name));
  assert.ok(players.includes('Live Test Guest'),'Guest name must appear in synced roster');
  console.log('PASS: second mobile browser joined host room and received board state');
  await guest.locator('#phoneBtn').click();
  await guest.locator('#roomChat').fill('Testing the in-game phone');
  await guest.locator('#roomChatForm button[type="submit"]').click();
  await host.locator('#roomMessages').getByText('Testing the in-game phone').waitFor({timeout:10000});
  console.log('PASS: remote phone text chat reached host');
  await host.evaluate(()=>{
    const {engine,ui}=window.musicCityFusion;
    // Dev-only fixture: earn the first producer card while verifying the exchange UI.
    engine.state.players[0].position=3;
    engine.state.phase='landed';
    const result=engine.collectPart('boom');
    if(!result.ok)throw Error(result.reason);
    ui.save();ui.render();
  });
  await host.locator('#sharePromptArtist').waitFor({state:'attached',timeout:10000});
  await host.locator('#sharePromptArtist').selectOption('p2');
  await host.locator('#sharePromptDistrict').selectOption('hiphop');
  await host.locator('#sharePromptForm button').click();
  await guest.waitForFunction(()=>window.musicCityFusion?.engine?.state?.players?.[1]?.producerParts?.hiphop?.sharedFrom==='p1',null,{timeout:12000});
  await guest.locator('#phoneCollabPanel').getByText('Shared by Live Test Host').waitFor({timeout:10000});
  console.log('PASS: host offered one earned producer card and remote phone received it');
  // Verify the actual new mobile UI, not just engine methods: after four cards
  // the studio is reachable from the phone but only unlocks after two laps.
  await host.evaluate(()=>{
    const {engine,ui}=window.musicCityFusion,p=engine.currentPlayer;
    engine.state.phase='landed';
    for(const [district,part] of [['latin','clave'],['global','hand'],['country','guitar']]){
      p.position=engine.state.spaces.findIndex(x=>x.kind==='producer'&&x.producer===district);
      const result=engine.collectPart(part);
      if(!result.ok)throw Error(result.reason);
    }
    p.position=12;p.laps=1;p.cash=1000;
    ui.save();ui.render();
  });
  const beforeTwoLaps=await host.locator('#phoneStudioPanel').textContent();
  assert.match(beforeTwoLaps,/1 more lap/);
  assert.equal(await host.locator('#phoneBookStudio').count(),0);
  console.log('PASS: studio phone shows the missing second lap instead of allowing early booking');
  await host.evaluate(()=>{
    const {engine,ui}=window.musicCityFusion;
    engine.currentPlayer.laps=2;ui.save();ui.render();
  });
  await host.locator('#phoneBookStudio').waitFor({state:'visible',timeout:10000});
  await host.locator('#phoneBookStudio').click();
  await host.waitForFunction(()=>{
    const {engine}=window.musicCityFusion;
    return engine.currentPlayer.studioBooked===true&&engine.currentPlayer.cash===500;
  },null,{timeout:10000});
  await host.locator('#phoneEnterStudio').waitFor({state:'visible',timeout:10000});
  await host.locator('#phoneEnterStudio').click();
  await host.locator('#songPrompt').waitFor({state:'visible',timeout:10000});
  const entry=await host.evaluate(()=>{
    const {engine}=window.musicCityFusion;
    return {space:engine.currentPlayer.position,cash:engine.currentPlayer.cash};
  });
  assert.deepEqual(entry,{space:12,cash:500});
  await host.locator('#leaveStudio').click();
  console.log('PASS: $500 session purchased once and BeGenius Studio entered from another board square');
  assert.equal(failures.length,0,'Browser page errors: '+failures.join('; '));
  await host.screenshot({path:'fusion-art-board-mobile.png',fullPage:true});
  console.log('LIVE SMOKE PASS: approved exact art texture, 40 mapped road stops, two mobile browsers, chat, producer sharing and reachable $500 studio');
}catch(error){
  for(const [page,name] of [[host,'host'],[guest,'guest']])if(page)try{
    await page.screenshot({path:'fusion-live-'+name+'.png',fullPage:true,timeout:5000});
  }catch(_){}
  console.error('LIVE SMOKE FAIL:',error.stack||error);
  if(failures.length)console.error('Browser page errors:',failures.join('; '));
  process.exitCode=1;
}finally{await browser.close();}
