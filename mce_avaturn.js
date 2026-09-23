export const AVATURN_PROJECT_URL='https://musiccityestates.avaturn.dev';

const SDK_URLS=[
  'https://cdn.jsdelivr.net/npm/@avaturn/sdk@1.1.4/dist/index.js',
  'https://cdn.jsdelivr.net/npm/@avaturn/sdk/dist/index.js'
];

let activeSdk=null;
let openingPromise=null;
let iframeObserver=null;

function withTimeout(promise,ms,message){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))
  ]);
}

async function loadAvaturnSdk(onStatus){
  let lastError=null;
  for(const url of SDK_URLS){
    try{
      onStatus?.('loading-sdk','Loading Avaturn…');
      const mod=await withTimeout(
        import(url),
        15000,
        'The Avaturn SDK took too long to load.'
      );
      if(!mod||typeof mod.AvaturnSDK!=='function'){
        throw new Error('Avaturn SDK loaded without the AvaturnSDK class.');
      }
      return mod.AvaturnSDK;
    }catch(error){
      lastError=error;
      console.warn('Avaturn SDK source failed:',url,error);
    }
  }
  throw lastError||new Error('Avaturn SDK could not be loaded.');
}

function normalizeExport(data={}){
  return {
    url:String(data.url||''),
    urlType:data.urlType==='httpURL'?'httpURL':'dataURL',
    avatarId:String(data.avatarId||''),
    sessionId:String(data.sessionId||''),
    bodyId:String(data.bodyId||''),
    gender:String(data.gender||''),
    avatarSupportsFaceAnimations:Boolean(data.avatarSupportsFaceAnimations)
  };
}

function stopIframeObserver(){
  if(iframeObserver){
    iframeObserver.disconnect();
    iframeObserver=null;
  }
}

function prepareIframe(container,onStatus){
  stopIframeObserver();

  const configure=()=>{
    const iframe=container.querySelector('iframe');
    if(!iframe)return false;

    iframe.setAttribute('allow','camera *; microphone *; fullscreen *');
    iframe.setAttribute('allowfullscreen','');
    iframe.setAttribute('playsinline','');
    iframe.setAttribute('title','Avaturn realistic avatar creator');
    iframe.referrerPolicy='strict-origin-when-cross-origin';
    iframe.style.width='100%';
    iframe.style.height='100%';
    iframe.style.border='0';

    onStatus?.('iframe-created','Avaturn creator connected.');
    return true;
  };

  if(configure())return;

  iframeObserver=new MutationObserver(()=>{
    if(configure())stopIframeObserver();
  });
  iframeObserver.observe(container,{childList:true,subtree:true});
}

export async function openMusicCityAvaturn(container,{onExport,onError,onStatus}={}){
  if(!container)throw new Error('Avaturn container was not found.');
  if(openingPromise)return openingPromise;

  openingPromise=(async()=>{
    closeMusicCityAvaturn();
    container.replaceChildren();

    let sdk=null;

    try{
      const AvaturnSDK=await loadAvaturnSdk(onStatus);
      onStatus?.('opening-project','Opening Music City Avaturn project…');

      sdk=new AvaturnSDK();
      activeSdk=sdk;
      prepareIframe(container,onStatus);

      await withTimeout(
        sdk.init(container,{
          url:AVATURN_PROJECT_URL,
          iframeClassName:'mce-avaturn-frame'
        }),
        25000,
        'Avaturn opened an iframe but did not finish initializing.'
      );

      onStatus?.('ready','Avaturn is ready.');

      sdk.on('export',data=>{
        const result=normalizeExport(data);
        if(!result.url){
          const error=new Error('Avaturn exported an avatar without a GLB URL.');
          onError?.(error);
          return;
        }
        onExport?.(result);
      });

      return sdk;
    }catch(error){
      stopIframeObserver();
      if(activeSdk===sdk)activeSdk=null;
      try{sdk?.destroy()}catch(ignore){}
      onStatus?.('error',error?.message||'Avaturn could not open.');
      onError?.(error);
      throw error;
    }finally{
      openingPromise=null;
    }
  })();

  return openingPromise;
}

export function closeMusicCityAvaturn(){
  stopIframeObserver();
  if(activeSdk){
    try{activeSdk.destroy()}catch(error){}
    activeSdk=null;
  }
  openingPromise=null;
}
