import test from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.GARDEN_TEST_URL || 'http://127.0.0.1:8787';
async function guest(name='',protocol=1,nickname='') {
  const url=new URL('/api/room',base);if(name)url.searchParams.set('name',name);if(nickname)url.searchParams.set('nick',nickname);if(protocol===2)url.searchParams.set('v','2');url.protocol=url.protocol==='https:'?'wss:':'ws:';
  const socket = new WebSocket(url);
  const messages=[];
  socket.addEventListener('message',event=>messages.push(JSON.parse(event.data)));
  const wait=async(predicate,since=0)=>{
    const end=Date.now()+8000;
    while(Date.now()<end){const message=messages.slice(since).find(predicate);if(message)return message;await new Promise(resolve=>setTimeout(resolve,15));}
    throw new Error('Timed out waiting for room event: '+JSON.stringify(messages.slice(-4)));
  };
  const welcome=await wait(m=>m.type==='welcome');
  return {socket,messages,wait,id:welcome.id,send:message=>socket.send(JSON.stringify(message))};
}

test('real Durable Object prevents duplicate seats, shares two occupants and releases disconnected guests', {timeout:30000}, async()=>{
  assert.equal((await fetch(base+'/api/health').then(r=>r.json())).multiplayer,true);
  assert.equal((await fetch(base+'/api/room')).status,426);
  const a=await guest(),b=await guest();
  try{
    for(const peer of [a,b])peer.send({type:'move',x:-5.95,z:-19.7,rotation:0,moving:false});
    await a.wait(m=>m.type==='snapshot'&&m.players.length===2&&m.players.every(p=>p.x===-5.95));
    const markA=a.messages.length,markB=b.messages.length;
    a.send({type:'sit',seatId:'bench-left-left'});b.send({type:'sit',seatId:'bench-left-left'});
    const [ra,rb]=await Promise.all([a.wait(m=>m.type.startsWith('seat-'),markA),b.wait(m=>m.type.startsWith('seat-'),markB)]);
    assert.deepEqual([ra.type,rb.type].sort(),['seat-confirmed','seat-rejected']);
    const winner=ra.type==='seat-confirmed'?a:b,other=winner===a?b:a;
    const mark=other.messages.length;
    other.send({type:'sit',seatId:'bench-left-right'});
    await other.wait(m=>m.type==='seat-confirmed'&&m.seatId==='bench-left-right',mark);
    const together=await winner.wait(m=>m.type==='snapshot'&&m.players.length===2&&m.players.every(p=>p.seatId));
    assert.equal(new Set(together.players.map(p=>p.seatId)).size,2);
    const seated=other.messages.length;
    other.send({type:'move',x:40,z:40,rotation:0,moving:true});
    const fixed=await other.wait(m=>m.type==='snapshot'&&m.players.find(p=>p.id===other.id)?.seatId==='bench-left-right',seated);
    assert(Math.abs(fixed.players.find(p=>p.id===other.id).x+4.65)<.001);
    const closed=other.messages.length;winner.socket.close(1000);
    await other.wait(m=>m.type==='snapshot'&&m.players.length===1,closed);
    const release=other.messages.length;other.send({type:'stand'});await other.wait(m=>m.type==='stood-up',release);
    const reclaim=other.messages.length;other.send({type:'sit',seatId:'bench-left-left'});
    await other.wait(m=>m.type==='seat-confirmed'&&m.seatId==='bench-left-left',reclaim);
  }finally{a.socket.close(1000);b.socket.close(1000);}
});


test('named gardens isolate guests; birthday and emotes are shared and late joiners catch up', {timeout:30000}, async()=>{
  const room='party-'+crypto.randomUUID().slice(0,8),a=await guest(room),b=await guest(room),other=await guest('other-'+crypto.randomUUID().slice(0,8));
  let late;
  try{
    await a.wait(m=>m.type==='snapshot'&&m.players.length===2);
    const isolated=await other.wait(m=>m.type==='snapshot');assert.equal(isolated.players.length,1);
    const near=a.messages.length;a.send({type:'move',x:0,z:-1,rotation:0,moving:false});
    await a.wait(m=>m.type==='snapshot'&&m.players.find(p=>p.id===a.id)?.z===-1,near);
    b.send({type:'move',x:.5,z:19,rotation:0,moving:true});
    const startA=a.messages.length,startB=b.messages.length;
    a.send({type:'celebrate'});
    const [ea,eb]=await Promise.all([a.wait(m=>m.type==='celebration',startA),b.wait(m=>m.type==='celebration',startB)]);
    assert.equal(ea.event.id,eb.event.id);assert.equal(ea.event.startedAt,eb.event.startedAt);
    const duplicate=b.messages.length;b.send({type:'celebrate'});
    assert.equal((await b.wait(m=>m.type==='celebration',duplicate)).event.id,ea.event.id);
    late=await guest(room);assert.equal((await late.wait(m=>m.type==='celebration')).event.id,ea.event.id);
    const reaction=b.messages.length;a.send({type:'emote',kind:'heart'});
    const emote=await b.wait(m=>m.type==='emote'&&m.playerId===a.id,reaction);assert.equal(emote.emote.kind,'heart');
    assert.equal(other.messages.filter(m=>m.type==='celebration'||m.type==='emote').length,0);
    const before=b.messages.length;b.send({type:'move',x:40,z:40,rotation:0,moving:true});
    b.send({type:'ping'});await b.wait(m=>m.type==='pong',before);
    const stopped=b.messages.filter(m=>m.type==='snapshot').at(-1).players.find(p=>p.id===b.id);
    assert.equal(stopped.z,19);assert.equal(stopped.moving,false);
  }finally{a.socket.close(1000);b.socket.close(1000);other.socket.close(1000);late?.socket.close(1000);}
});


test('modern movement sends ordered individual updates without self echo; legacy clients still receive snapshots',{timeout:15000},async()=>{
 const room='motion-'+crypto.randomUUID().slice(0,8),a=await guest(room,2),b=await guest(room,2),legacy=await guest(room);
 try{
  await a.wait(m=>m.type==='snapshot'&&m.players.length===3);
  const markA=a.messages.length,markB=b.messages.length,markLegacy=legacy.messages.length;
  for(let i=0;i<20;i++){a.send({type:'move',x:i*.1,z:19,rotation:0,moving:true,sampleTime:i*50});await new Promise(resolve=>setTimeout(resolve,50));}
  await b.wait(m=>m.type==='player-moved'&&Math.abs(m.player.x-1.9)<1e-8,markB);
  const updates=b.messages.slice(markB).filter(m=>m.type==='player-moved');assert.equal(updates.length,20);
  for(let i=0;i<updates.length;i++)assert.equal(updates[i].player.sampleTime,i*50);
  for(let i=1;i<updates.length;i++)assert(updates[i].player.updatedAt>updates[i-1].player.updatedAt);
  assert.equal(a.messages.slice(markA).filter(m=>m.type==='player-moved'||m.type==='snapshot').length,0);
  assert(legacy.messages.slice(markLegacy).some(m=>m.type==='snapshot'&&m.players.find(p=>p.id===a.id)&&Math.abs(m.players.find(p=>p.id===a.id).x-1.9)<1e-8));
  const seat=b.messages.length;a.send({type:'move',x:-5.95,z:-19.7,rotation:0,moving:false});a.send({type:'sit',seatId:'bench-left-left'});
  await b.wait(m=>m.type==='snapshot'&&m.players.find(p=>p.id===a.id)?.seatId==='bench-left-left',seat);
 }finally{a.socket.close(1000);b.socket.close(1000);legacy.socket.close(1000);}
});

test('chat echoes safe bounded text only to this room, throttles repeats and keeps no history',{timeout:20000},async()=>{
 const room='chat-'+crypto.randomUUID().slice(0,8),a=await guest(room,2),b=await guest(room,2),other=await guest(room+'-other',2);let late;
 try{
  const text='<img src=x onerror=alert(1)> 안녕';a.send({type:'chat',text,clientId:'first'});
  const [own,peer]=await Promise.all([a.wait(m=>m.type==='chat'),b.wait(m=>m.type==='chat')]);
  assert.equal(own.message.id,peer.message.id);assert.equal(peer.message.text,text);assert.equal(peer.message.senderId,a.id);assert.equal(peer.message.sender,'친구 1');
  a.send({type:'chat',text:'again',clientId:'fast'});assert.equal((await a.wait(m=>m.type==='chat-error'&&m.clientId==='fast')).code,'cooldown');
  a.send({type:'chat',text:' \n ',clientId:'empty'});assert.equal((await a.wait(m=>m.type==='chat-error'&&m.clientId==='empty')).code,'empty');
  await new Promise(resolve=>setTimeout(resolve,850));a.send({type:'chat',text:'  '+ '🎂'.repeat(205),clientId:'long'});
  assert.equal(Array.from((await b.wait(m=>m.type==='chat'&&m.message.clientId==='long')).message.text).length,200);
  assert.equal(other.messages.filter(m=>m.type==='chat').length,0);
  late=await guest(room,2);late.send({type:'ping'});await late.wait(m=>m.type==='pong');assert.equal(late.messages.filter(m=>m.type==='chat').length,0);
 }finally{for(const g of [a,b,other,late])g?.socket.close(1000);}
});


test('nicknames label avatars and chat; guestbook persists, isolates rooms, deduplicates and rejects rapid posts',{timeout:20000},async()=>{
 const room='book-'+crypto.randomUUID().slice(0,8),a=await guest(room,2,'소원요정'),b=await guest(room,2,'<b>친구</b>'),other=await guest(room+'-x',2);let late;
 const id=crypto.randomUUID();
 try{
  assert.equal(a.messages.find(m=>m.type==='welcome').label,'소원요정');
  const snap=await a.wait(m=>m.type==='snapshot'&&m.players.length===2);assert.equal(snap.players.find(p=>p.id===b.id).label,'<b>친구</b>');
  a.send({type:'chat',text:'안녕',clientId:'nick-chat'});assert.equal((await b.wait(m=>m.type==='chat')).message.sender,'소원요정');
  a.send({type:'book-post',text:'생일 축하해! <img src=x>',clientId:id});
  const entry=(await b.wait(m=>m.type==='book-entry')).entry;assert.equal(entry.sender,'소원요정');assert.equal(entry.text,'생일 축하해! <img src=x>');
  const mark=a.messages.length;a.send({type:'book-post',text:'changed',clientId:id});assert.equal((await a.wait(m=>m.type==='book-entry',mark)).entry.id,id);
  a.send({type:'book-post',text:'too soon',clientId:crypto.randomUUID()});assert.equal((await a.wait(m=>m.type==='book-error')).code,'cooldown');
  other.send({type:'book-list'});assert.deepEqual((await other.wait(m=>m.type==='book-page')).entries,[]);
  a.socket.close(1000);b.socket.close(1000);
  late=await guest(room,2,'나중에 온 친구');late.send({type:'book-list'});
  const saved=await late.wait(m=>m.type==='book-page');assert.equal(saved.entries.length,1);assert.equal(saved.entries[0].id,id);assert.equal(saved.entries[0].sender,'소원요정');
 }finally{for(const g of [a,b,other,late])g?.socket.close(1000);}
});

test('guestbook returns newest pages without losing older messages',{timeout:30000},async()=>{
 const room='pages-'+crypto.randomUUID().slice(0,8);let reader;
 try{
  for(let i=1;i<=21;i++){
   const writer=await guest(room,2,'친구'+i);
   try{writer.send({type:'book-post',text:'축하 '+i,clientId:crypto.randomUUID()});await writer.wait(m=>m.type==='book-entry');}finally{writer.socket.close(1000);}
  }
  reader=await guest(room,2);reader.send({type:'book-list'});const first=await reader.wait(m=>m.type==='book-page');
  assert.equal(first.entries.length,20);assert.equal(first.entries[0].text,'축하 21');assert.equal(first.entries.at(-1).text,'축하 2');assert(first.cursor);
  const mark=reader.messages.length;reader.send({type:'book-list',cursor:first.cursor});const older=await reader.wait(m=>m.type==='book-page',mark);
  assert.equal(older.entries.length,1);assert.equal(older.entries[0].text,'축하 1');assert.equal(older.cursor,null);
 }finally{reader?.socket.close(1000);}
});
