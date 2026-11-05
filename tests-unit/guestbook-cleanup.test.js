import test from 'node:test';
import assert from 'node:assert/strict';
import {clearRequestedGuestbook,GUESTBOOK_RESET_BEFORE as cutoff,GUESTBOOK_RESET_MARKER as marker} from '../worker/guestbook-cleanup.js';

function memoryStorage(){
 const data=new Map();return {data,async get(key){return data.get(key);},async put(key,value){data.set(key,value);},async delete(key){data.delete(key);},async list({prefix,startAfter='',limit}){return new Map([...data].filter(([key])=>key.startsWith(prefix)&&key>startAfter).sort(([a],[b])=>a.localeCompare(b)).slice(0,limit));},async transaction(fn){return fn(this);}};
}

test('one-time reset removes all old pages and retry copies, preserving new posts and other garden data',async()=>{
 const storage=memoryStorage();
 for(let i=1;i<=205;i++){
  const entry={id:String(i),sequence:i,createdAt:cutoff-1,text:'old text',sender:'friend',ownerHash:'owner'};
  storage.data.set('book:'+String(i).padStart(15,'0'),entry);storage.data.set('book-id:'+i,entry);
 }
 const fresh={id:'fresh',sequence:206,createdAt:cutoff+1,text:'keep this'};
 storage.data.set('book:000000000000206',fresh);storage.data.set('book-id:fresh',fresh);
 storage.data.set('book-sequence',206);storage.data.set('celebration',{id:'birthday'});
 await clearRequestedGuestbook(storage);
 assert.deepEqual([...await storage.list({prefix:'book:',limit:1000})].map(([,entry])=>entry),[fresh]);
 assert.equal(storage.data.get('book-id:1').deleted,true);assert.equal(storage.data.get('book-id:205').text,undefined);
 assert.equal(storage.data.get('book-id:fresh').text,'keep this');assert.equal(storage.data.get('book-sequence'),206);assert.deepEqual(storage.data.get('celebration'),{id:'birthday'});
 assert.equal(storage.data.get(marker),true);
 storage.data.set('book:000000000000207',{id:'later',createdAt:cutoff-1,text:'do not run again'});
 await clearRequestedGuestbook(storage);assert.equal(storage.data.get('book:000000000000207').text,'do not run again');
});

test('reset boundary includes the requested instant',async()=>{
 const storage=memoryStorage();storage.data.set('book:000000000000001',{id:'boundary',sequence:1,createdAt:cutoff,text:'clear'});
 await clearRequestedGuestbook(storage);assert.equal(storage.data.has('book:000000000000001'),false);assert.equal(storage.data.get('book-id:boundary').deleted,true);
});
