// This private browser key proves ownership; nicknames are only display names.
let cached;
export function getAuthorKey(){
  if(cached)return cached;
  try{const saved=localStorage.getItem('garden-author-key');if(saved&&/^[a-f0-9]{64}$/.test(saved))return cached=saved;}catch{}
  cached=[...crypto.getRandomValues(new Uint8Array(32))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  try{localStorage.setItem('garden-author-key',cached);}catch{}
  return cached;
}
