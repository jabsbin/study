import test from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.GARDEN_TEST_URL || 'http://127.0.0.1:8787';
async function guest() {
  const socket = new WebSocket(base.replace(/^http/,'ws') + '/api/room');
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
