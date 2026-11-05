export function normalizeChatText(value){
  if(typeof value!=='string')return '';
  return [...value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim()].slice(0,200).join('');
}
