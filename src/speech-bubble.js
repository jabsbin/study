import { Vector3 } from 'three';

// Screen-sized text follows the avatar so it stays readable on small screens.
export function createSpeechBubble(anchor){
  const element=document.createElement('div');
  element.className='speech-bubble';element.hidden=true;element.setAttribute('aria-hidden','true');
  document.getElementById('speech-layer').append(element);
  const position=new Vector3();let expires=0;
  return {
    show(text,speaker){element.textContent=text;element.dataset.speaker=speaker;expires=performance.now()+8000;},
    update(camera,width,height){
      const remaining=expires-performance.now();
      if(remaining<=0){element.hidden=true;return;}
      anchor.updateWorldMatrix(true,false);
      position.set(0,4.3,0);anchor.localToWorld(position);position.project(camera);
      element.hidden=position.z < -1||position.z>1||Math.abs(position.x)>1.15||Math.abs(position.y)>1.2;
      element.style.left=(position.x*.5+.5)*width+'px';
      element.style.top=(-position.y*.5+.5)*height+'px';
      element.style.opacity=Math.min(1,remaining/500);
    },
    dispose(){element.remove();},
  };
}
