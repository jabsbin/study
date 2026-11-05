import { normalizeChatText } from './chat-text.js';
const $=id=>document.getElementById(id);
export function setupChatUI({send,onTyping}){
  const panel=$('chat-panel'),input=$('chat-input'),form=$('chat-form'),log=$('chat-messages'),toggle=$('chat-toggle'),button=$('chat-send');
  let online=false,pending=null,timeout=null,unread=0,composing=false;const seen=new Set();
  const feedback=text=>$('chat-feedback').textContent=text;
  function keyboardInset(){const viewport=window.visualViewport;const inset=document.activeElement===input&&viewport?Math.max(0,innerHeight-viewport.height-viewport.offsetTop):0;document.documentElement.style.setProperty('--chat-keyboard',inset+'px');}
  window.visualViewport?.addEventListener('resize',keyboardInset);window.visualViewport?.addEventListener('scroll',keyboardInset);
  function clearPending(){pending=null;clearTimeout(timeout);button.disabled=!online;}
  function open(focus=false){panel.hidden=false;toggle.setAttribute('aria-expanded','true');unread=0;$('chat-unread').hidden=true;log.scrollTop=log.scrollHeight;if(focus&&online)input.focus();}
  function close(){if(panel.contains(document.activeElement))document.activeElement.blur();panel.hidden=true;toggle.setAttribute('aria-expanded','false');onTyping(false);keyboardInset();}
  toggle.onclick=()=>panel.hidden?open():close();$('chat-close').onclick=close;
  input.onfocus=()=>{onTyping(true);document.body.classList.add('chat-typing');keyboardInset();};
  input.onblur=()=>{onTyping(false);document.body.classList.remove('chat-typing');keyboardInset();};
  input.oncompositionstart=()=>composing=true;input.oncompositionend=()=>composing=false;
  input.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();close();toggle.focus();}};
  form.onsubmit=event=>{
    event.preventDefault();if(composing||pending)return;
    const text=normalizeChatText(input.value);if(!text){feedback('메시지를 입력해 주세요.');input.focus();return;}
    if(!online){feedback('동산에 연결되면 채팅을 보낼 수 있어요.');return;}
    const clientId=crypto.randomUUID();pending={clientId,text};button.disabled=true;
    if(!send({type:'chat',text,clientId})){clearPending();feedback('연결을 확인하고 다시 보내주세요.');return;}
    feedback('보내는 중…');input.focus();
    timeout=setTimeout(()=>{clearPending();feedback('전송 확인이 늦어지고 있어요. 대화 목록을 확인해 주세요.');},5000);
  };
  return {
    open,close,
    setConnection(status){online=status==='online';input.disabled=!online;button.disabled=!online||Boolean(pending);$('chat-state').textContent=online?'같은 동산의 친구들과 이야기해요':status==='connecting'?'친구와 연결 중…':'동산에 연결되면 채팅할 수 있어요';if(!online){clearPending();feedback('');}},
    receive(message,self){
      if(seen.has(message.id))return;seen.add(message.id);
      const nearBottom=log.scrollHeight-log.scrollTop-log.clientHeight<40;
      const row=document.createElement('li');row.className=self?'chat-line mine':'chat-line';row.dataset.messageId=message.id;
      const meta=document.createElement('div');meta.className='chat-meta';
      const sender=document.createElement('strong');sender.textContent=self?'나':message.sender;
      const time=document.createElement('time');time.dateTime=new Date(message.sentAt).toISOString();time.textContent=new Date(message.sentAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'});
      meta.append(sender,time);const text=document.createElement('p');text.className='chat-text';text.textContent=message.text;row.append(meta,text);log.append(row);
      if(log.children.length>50){const removed=log.firstElementChild;seen.delete(removed.dataset.messageId);removed.remove();}
      if(nearBottom||self)log.scrollTop=log.scrollHeight;
      if(panel.hidden&&!self){unread++;$('chat-unread').textContent=unread>9?'9+':String(unread);$('chat-unread').hidden=false;}
      if(self&&pending?.clientId===message.clientId){if(normalizeChatText(input.value)===pending.text)input.value='';clearPending();feedback('');}
    },
    reject(clientId,code){if(pending?.clientId!==clientId)return;clearPending();feedback(code==='cooldown'?'잠시만 기다렸다 다시 보내주세요.':'메시지를 확인하고 다시 보내주세요.');},
  };
}
