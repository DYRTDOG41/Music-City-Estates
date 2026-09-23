import { AvaturnSDK } from 'https://cdn.jsdelivr.net/npm/@avaturn/sdk@1.1.0/dist/index.js';

export const AVATURN_PROJECT_URL='https://musiccityestates.avaturn.dev';

let activeSdk=null;
let openingPromise=null;

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

export async function openMusicCityAvaturn(container,{onExport,onError}={}){
  if(!container)throw new Error('Avaturn container was not found.');
  if(openingPromise)return openingPromise;

  openingPromise=(async()=>{
    closeMusicCityAvaturn();
    container.replaceChildren();

    const sdk=new AvaturnSDK();
    activeSdk=sdk;

    try{
      await sdk.init(container,{
        url:AVATURN_PROJECT_URL,
        iframeClassName:'mce-avaturn-frame'
      });

      sdk.on('export',data=>{
        const result=normalizeExport(data);
        if(!result.url){
          const error=new Error('Avaturn exported an avatar without a GLB URL.');
          if(onError)onError(error);
          return;
        }
        if(onExport)onExport(result);
      });

      return sdk;
    }catch(error){
      if(activeSdk===sdk)activeSdk=null;
      try{sdk.destroy()}catch(ignore){}
      if(onError)onError(error);
      throw error;
    }finally{
      openingPromise=null;
    }
  })();

  return openingPromise;
}

export function closeMusicCityAvaturn(){
  if(activeSdk){
    try{activeSdk.destroy()}catch(error){}
    activeSdk=null;
  }
  openingPromise=null;
}
