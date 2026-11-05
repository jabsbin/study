import { getAuthorKey } from './author-key.js';
import { normalizeChatText } from './chat-text.js';
const $=id=>document.getElementById(id);
export function setupGuestbook({send,onModal}){
  const dialog=$('guestbook-dialog'),input=$('book-text'),button=$('book-submit'),list=$('book-list');
  const authorKey=getAuthorKey(),removed=new Set(),entries=new Map();let editing=null,deleting=null,mutation=null,mutating=false,mutationTimer=null;let online=false,loaded=false,cursor=null,busy=false,pending=null,postTimer=null,listTimer=null,loading=false;
  function feedback(text){$('book-feedback').textContent=text;}
  function ready(){button.disabled=!online||busy;$('book-more').disabled=!online||loading;$('book-refresh').disabled=!online||loading;for(const control of list.querySelectorAll('[data-manage]'))control.disabled=!online||mutating;}
  function render(){
    const currentEditor=list.querySelector('.book-editor'),selection=currentEditor===document.activeElement?{start:currentEditor.selectionStart,end:currentEditor.selectionEnd}:null;
    const rows=[...entries.values()].sort((a,b)=>b.sequence-a.sequence).map(entry=>{
      const row=document.createElement('li'),meta=document.createElement('div'),author=document.createElement('strong'),time=document.createElement('time'),text=document.createElement('p');
      row.dataset.entryId=entry.id;author.textContent=entry.sender;time.dateTime=new Date(entry.createdAt).toISOString();time.textContent=new Date(entry.createdAt).toLocaleString('ko-KR');if(entry.updatedAt)time.textContent+=' · 수정됨';meta.append(author,time);text.textContent=entry.text;row.append(meta,text);
      function action(title,handler,className=''){const control=document.createElement('button');control.type='button';control.className='text-button '+className;control.textContent=title;control.dataset.manage='';control.disabled=!online||mutating;control.onclick=handler;return control;}
      if(entry.mine){
        const controls=document.createElement('div');controls.className='book-manage';
        if(editing?.id===entry.id){
          const editor=document.createElement('textarea');editor.className='book-editor';editor.dataset.manage='';editor.disabled=!online||mutating;editor.maxLength=200;editor.value=editing.text;editor.setAttribute('aria-label','방명록 수정 내용');editor.oninput=()=>editing.text=editor.value;row.append(editor);
          controls.append(action('수정 저장',()=>change('book-edit',entry), 'book-save'),action('취소',()=>{editing=null;render();},'book-cancel'));
        }else if(deleting===entry.id){controls.append(document.createTextNode('이 글을 삭제할까요?'),action('삭제하기',()=>change('book-delete',entry),'book-delete-confirm'),action('취소',()=>{deleting=null;render();},'book-cancel'));}
        else controls.append(action('수정',()=>{editing={id:entry.id,text:entry.text,revision:entry.revision||1};deleting=null;render();list.querySelector('.book-editor')?.focus();},'book-edit'),action('삭제',()=>{deleting=entry.id;editing=null;render();},'book-delete'));
        row.append(controls);
      }
      return row;
    });
    list.replaceChildren(...rows);if(selection){const editor=list.querySelector('.book-editor');if(editor&&!editor.disabled){editor.focus({preventScroll:true});editor.setSelectionRange(selection.start,selection.end);}}$('book-empty').hidden=!loaded||entries.size>0;$('book-more').hidden=!cursor;
  }
  function load(next=null){
    if(!online||loading)return;loading=true;ready();$('book-state').textContent='축하 메시지를 불러오는 중…';
    if(!send({type:'book-list',cursor:next,authorKey})){loading=false;ready();return;}
    clearTimeout(listTimer);listTimer=setTimeout(()=>{loading=false;ready();$('book-state').textContent='불러오기가 늦어지고 있어요. 새로고침을 눌러주세요.';},7000);
  }
  function merge(entry){if(!removed.has(entry.id)&&(!entries.has(entry.id)||(entries.get(entry.id).revision||1)<=(entry.revision||1)))entries.set(entry.id,entry);}
  function change(type,entry){
    if(!online||mutating)return;const text=type==='book-edit'?normalizeChatText(editing.text):'';
    if(type==='book-edit'&&!text){feedback('축하 메시지를 입력해 주세요.');return;}
    const revision=type==='book-edit'?editing.revision:(entry.revision||1);
    if(!mutation||mutation.type!==type||mutation.id!==entry.id||mutation.text!==text||mutation.revision!==revision)mutation={type,id:entry.id,text,revision,clientId:crypto.randomUUID()};
    mutating=true;ready();feedback(type==='book-edit'?'수정 내용을 저장하는 중…':'글을 삭제하는 중…');
    if(!send({...mutation,authorKey})){mutating=false;ready();feedback('연결을 확인하고 다시 눌러주세요.');return;}
    clearTimeout(mutationTimer);mutationTimer=setTimeout(()=>{mutating=false;ready();feedback('처리 확인이 늦어지고 있어요. 다시 눌러주세요.');},7000);
  }
  function finishMutation(clientId){if(!mutation||mutation.clientId!==clientId)return;clearTimeout(mutationTimer);const deleted=mutation.type==='book-delete';mutation=null;mutating=false;editing=null;deleting=null;ready();feedback(deleted?'글을 삭제했어요.':'수정 내용을 저장했어요 ♡');}
  $('guestbook-open').onclick=()=>{onModal(true);dialog.showModal();if(innerWidth<=700)$('actions').open=false;if(online)load();};
  $('guestbook-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>onModal(false));
  $('book-more').onclick=()=>load(cursor);$('book-refresh').onclick=()=>load();
  $('book-form').onsubmit=event=>{
    event.preventDefault();if(!online||busy)return;const text=normalizeChatText(input.value);if(!text){feedback('축하 메시지를 입력해 주세요.');return;}
    if(!pending||pending.text!==text)pending={clientId:crypto.randomUUID(),text};
    busy=true;ready();feedback('마음을 저장하는 중…');
    if(!send({type:'book-post',...pending,authorKey})){busy=false;ready();feedback('연결을 확인하고 다시 남겨주세요.');return;}
    clearTimeout(postTimer);postTimer=setTimeout(()=>{busy=false;ready();feedback('저장 확인이 늦어지고 있어요. 다시 누르면 중복 없이 확인해요.');},7000);
  };
  return {
    connection(status){online=status==='online';input.disabled=!online;ready();$('book-state').textContent=online?'같은 이름의 동산에 남긴 마음들이에요':'동산에 연결되면 방명록을 읽고 남길 수 있어요';if(!online){busy=false;loading=false;mutating=false;clearTimeout(mutationTimer);clearTimeout(postTimer);clearTimeout(listTimer);ready();}else if(dialog.open)load();},
    message(data){
      if(data.type==='book-page'){clearTimeout(listTimer);loading=false;loaded=true;cursor=data.cursor;for(const entry of data.entries)merge(entry);render();ready();$('book-state').textContent='같은 이름의 동산에 남긴 마음들이에요';}
      if(data.type==='book-entry'){
        merge(data.entry);finishMutation(data.clientId);render();
        if(pending?.clientId===data.clientId){clearTimeout(postTimer);if(normalizeChatText(input.value)===pending.text)input.value='';pending=null;busy=false;ready();feedback('축하의 마음을 남겼어요 ♡');}
      }
      if(data.type==='book-deleted'){if(pending?.clientId===data.clientId){clearTimeout(postTimer);pending=null;busy=false;ready();feedback('이 글은 이미 삭제되었어요.');}removed.add(data.id);entries.delete(data.id);finishMutation(data.clientId);render();}
      if(data.type==='book-error'){
        if(mutation&&data.clientId===mutation.clientId){clearTimeout(mutationTimer);mutating=false;ready();feedback(data.code==='forbidden'?'이 브라우저에서 작성한 글만 변경할 수 있어요.':data.code==='conflict'?'다른 창에서 글이 바뀌었어요. 수정 내용을 복사한 뒤 취소하고 새로고침해 주세요.':'변경하지 못했어요. 내용을 확인하고 다시 눌러주세요.');return;}
        if(!data.clientId){clearTimeout(listTimer);loading=false;ready();$('book-state').textContent='방명록을 불러오지 못했어요. 새로고침을 눌러주세요.';}
        else if(data.clientId===pending?.clientId){clearTimeout(postTimer);busy=false;ready();feedback(data.code==='cooldown'?'메시지는 10초 간격으로 남길 수 있어요. 잠시 후 다시 눌러주세요.':'저장하지 못했어요. 작성한 내용은 유지했으니 다시 눌러주세요.');}
      }
    },
  };
}
