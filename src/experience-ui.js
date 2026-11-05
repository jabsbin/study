import { giftURL,normalizeName } from './personalization.js';
const $=id=>document.getElementById(id);
export function setupExperienceUI({name,onEmote,onReset,onModal,onPhoto,capture}){
  let photoURL=null,photoFile=null;
  const closeTools=()=>{if(innerWidth<=700)$('actions').open=false;};
  for(const kind of ['wave','heart','clap'])$('emote-'+kind).onclick=()=>{onEmote(kind);closeTools();};
  $('reset-camera').onclick=()=>{onReset();closeTools();};
  const gift=$('gift-dialog'),preview=$('photo-dialog');
  function show(dialog){onModal(true);dialog.showModal();}
  for(const dialog of [gift,preview])dialog.addEventListener('close',()=>onModal(false));
  $('gift-link').onclick=()=>{closeTools();$('gift-name').value=name;updateLink();$('gift-status').textContent='';show(gift);$('gift-name').focus();};
  function updateLink(){
    const value=normalizeName($('gift-name').value),url=giftURL(location.origin,value);
    $('gift-url').value=url;$('visit-gift').href=url;$('copy-gift').disabled=!value;
  }
  $('gift-name').oninput=()=>{updateLink();$('gift-status').textContent='';};
  $('gift-name').onblur=()=>{$('gift-name').value=normalizeName($('gift-name').value);updateLink();};
  $('copy-gift').onclick=async()=>{
    try{await navigator.clipboard.writeText($('gift-url').value);$('gift-status').textContent='선물 링크를 복사했어요. 친구에게 보내주세요 ♡';}
    catch{$('gift-url').focus();$('gift-url').select();$('gift-status').textContent='주소를 선택했어요. 복사해서 친구에게 보내주세요.';}
  };
  $('close-gift').onclick=()=>gift.close();
  function exitPhoto(){document.body.classList.remove('photo-mode');onPhoto(false);}
  $('photo-mode').onclick=()=>{closeTools();document.body.classList.add('photo-mode');onPhoto(true);};
  $('exit-photo').onclick=exitPhoto;
  $('capture-photo').onclick=async()=>{
    $('capture-photo').disabled=true;$('photo-error').textContent='';
    try{
      const blob=await capture();
      if(photoURL)URL.revokeObjectURL(photoURL);
      photoURL=URL.createObjectURL(blob);const filename=(name?name+'-':'')+'생일동산.png';
      photoFile=new File([blob],filename,{type:'image/png'});
      $('photo-image').src=photoURL;$('download-photo').href=photoURL;$('download-photo').download=filename;
      $('share-photo').hidden=!navigator.canShare?.({files:[photoFile]});
      $('photo-status').textContent='모바일에서는 사진을 길게 눌러 저장할 수도 있어요.';show(preview);
    }catch(error){$('photo-error').textContent=error.message||'사진을 만들지 못했어요. 다시 시도해 주세요.';}
    finally{$('capture-photo').disabled=false;}
  };
  $('share-photo').onclick=async()=>{
    try{await navigator.share({files:[photoFile],title:name?`${name}의 생일 동산`:'우리의 생일 동산'});}
    catch(error){if(error.name!=='AbortError')$('photo-status').textContent='PNG 저장 버튼으로 사진을 저장해 주세요.';}
  };
  $('close-photo').onclick=()=>preview.close();
  return {exitPhoto};
}
