import { normalizeChatText } from './chat-text.js';
const $=id=>document.getElementById(id);
export function setupGuestbook({send,onModal}){
  const dialog=$('guestbook-dialog'),input=$('book-text'),button=$('book-submit'),list=$('book-list');
  const entries=new Map();let online=false,loaded=false,cursor=null,busy=false,pending=null,postTimer=null,listTimer=null,loading=false;
  function feedback(text){$('book-feedback').textContent=text;}
  function ready(){button.disabled=!online||busy;$('book-more').disabled=!online||loading;$('book-refresh').disabled=!online||loading;}
  function render(){
    const rows=[...entries.values()].sort((a,b)=>b.sequence-a.sequence).map(entry=>{
      const row=document.createElement('li'),meta=document.createElement('div'),author=document.createElement('strong'),time=document.createElement('time'),text=document.createElement('p');
      row.dataset.entryId=entry.id;author.textContent=entry.sender;time.dateTime=new Date(entry.createdAt).toISOString();time.textContent=new Date(entry.createdAt).toLocaleString('ko-KR');meta.append(author,time);text.textContent=entry.text;row.append(meta,text);return row;
    });
    list.replaceChildren(...rows);$('book-empty').hidden=!loaded||entries.size>0;$('book-more').hidden=!cursor;
  }
  function load(next=null){
    if(!online||loading)return;loading=true;ready();$('book-state').textContent='축하 메시지를 불러오는 중…';
    if(!send({type:'book-list',cursor:next})){loading=false;ready();return;}
    clearTimeout(listTimer);listTimer=setTimeout(()=>{loading=false;ready();$('book-state').textContent='불러오기가 늦어지고 있어요. 새로고침을 눌러주세요.';},7000);
  }
  $('guestbook-open').onclick=()=>{onModal(true);dialog.showModal();if(innerWidth<=700)$('actions').open=false;if(online)load();};
  $('guestbook-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>onModal(false));
  $('book-more').onclick=()=>load(cursor);$('book-refresh').onclick=()=>load();
  $('book-form').onsubmit=event=>{
    event.preventDefault();if(!online||busy)return;const text=normalizeChatText(input.value);if(!text){feedback('축하 메시지를 입력해 주세요.');return;}
    if(!pending||pending.text!==text)pending={clientId:crypto.randomUUID(),text};
    busy=true;ready();feedback('마음을 저장하는 중…');
    if(!send({type:'book-post',...pending})){busy=false;ready();feedback('연결을 확인하고 다시 남겨주세요.');return;}
    clearTimeout(postTimer);postTimer=setTimeout(()=>{busy=false;ready();feedback('저장 확인이 늦어지고 있어요. 다시 누르면 중복 없이 확인해요.');},7000);
  };
  return {
    connection(status){online=status==='online';input.disabled=!online;ready();$('book-state').textContent=online?'같은 이름의 동산에 남긴 마음들이에요':'동산에 연결되면 방명록을 읽고 남길 수 있어요';if(!online){busy=false;loading=false;clearTimeout(postTimer);clearTimeout(listTimer);ready();}else if(dialog.open)load();},
    message(data){
      if(data.type==='book-page'){clearTimeout(listTimer);loading=false;loaded=true;cursor=data.cursor;for(const entry of data.entries)entries.set(entry.id,entry);render();ready();$('book-state').textContent='같은 이름의 동산에 남긴 마음들이에요';}
      if(data.type==='book-entry'){
        entries.set(data.entry.id,data.entry);render();
        if(pending?.clientId===data.clientId){clearTimeout(postTimer);if(normalizeChatText(input.value)===pending.text)input.value='';pending=null;busy=false;ready();feedback('축하의 마음을 남겼어요 ♡');}
      }
      if(data.type==='book-error'){
        if(!data.clientId){clearTimeout(listTimer);loading=false;ready();$('book-state').textContent='방명록을 불러오지 못했어요. 새로고침을 눌러주세요.';}
        else if(data.clientId===pending?.clientId){clearTimeout(postTimer);busy=false;ready();feedback(data.code==='cooldown'?'메시지는 10초 간격으로 남길 수 있어요. 잠시 후 다시 눌러주세요.':'저장하지 못했어요. 작성한 내용은 유지했으니 다시 눌러주세요.');}
      }
    },
  };
}
