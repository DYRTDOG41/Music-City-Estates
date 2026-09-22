const DB_NAME='mce-avatar-assets-v1';
const STORE='assets';
const DB_VERSION=1;

function openDb(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Could not open avatar asset storage.'));
  });
}

function requestResult(request){
  return new Promise((resolve,reject)=>{
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Avatar asset storage failed.'));
  });
}

export async function saveAvatarAsset(file){
  if(!file)throw new Error('Choose a .glb avatar file first.');
  const name=String(file.name||'premium-avatar.glb');
  if(!/\.glb$/i.test(name))throw new Error('Music City premium avatar import currently accepts .glb files.');
  const id='avatar-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
  const db=await openDb();
  const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).put({
    id,
    name,
    type:file.type||'model/gltf-binary',
    size:Number(file.size)||0,
    blob:file,
    savedAt:new Date().toISOString()
  });
  await new Promise((resolve,reject)=>{
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error||new Error('Could not save premium avatar.'));
    tx.onabort=()=>reject(tx.error||new Error('Premium avatar save was canceled.'));
  });
  db.close();
  return {id,name,size:Number(file.size)||0};
}

export async function getAvatarAsset(id){
  const key=String(id||'');
  if(!key)return null;
  const db=await openDb();
  const tx=db.transaction(STORE,'readonly');
  const item=await requestResult(tx.objectStore(STORE).get(key));
  db.close();
  return item||null;
}

export async function getAvatarAssetUrl(id){
  const item=await getAvatarAsset(id);
  if(!item||!item.blob)return null;
  return {
    id:item.id,
    name:item.name,
    size:item.size,
    url:URL.createObjectURL(item.blob)
  };
}

export async function deleteAvatarAsset(id){
  const key=String(id||'');
  if(!key)return;
  const db=await openDb();
  const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).delete(key);
  await new Promise((resolve,reject)=>{
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error||new Error('Could not delete avatar asset.'));
    tx.onabort=()=>reject(tx.error||new Error('Avatar deletion was canceled.'));
  });
  db.close();
}
