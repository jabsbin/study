export function normalizeName(value='') {
  return [...String(value).normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,'').replace(/\s+/g,' ').trim()].slice(0,20).join('');
}
export function vocative(name) {
  const last=name.codePointAt(name.length-1);
  return last>=0xac00&&last<=0xd7a3?name+((last-0xac00)%28?'아':'야'):name;
}
export function giftURL(origin,name) {
  const url=new URL('/',origin);const normalized=normalizeName(name);
  if(normalized)url.searchParams.set('name',normalized);
  return url.href;
}
