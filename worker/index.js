import { DurableObject } from 'cloudflare:workers';
import { SEAT_LAYOUT } from '../src/seat-layout.js';
import { normalizeName } from '../src/personalization.js';

const layout = new Map(SEAT_LAYOUT.map(seat => [seat.id, seat]));
const MAX_GUESTS = 8;
function validPosition(position) {
  return position && Number.isFinite(position.x) && Number.isFinite(position.z)
    && Math.abs(position.x) <= 46 && Math.abs(position.z) <= 46;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') return Response.json({ multiplayer: true });
    if (url.pathname === '/api/room') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required', { status: 426 });
      const origin = request.headers.get('Origin');
      if (origin && origin !== url.origin) return new Response('Origin not allowed', { status: 403 });
      const name=normalizeName(url.searchParams.get('name')||'');
      return env.GARDEN_ROOM.getByName(name?'birthday-garden:'+name:'birthday-garden').fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};

// Live sessions are kept in hibernating WebSocket attachments, not database writes.
// Claiming a seat is synchronous in one Durable Object, so two guests cannot own it.
export class BirthdayGarden extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);this.celebration=null;
    ctx.blockConcurrencyWhile(async()=>{this.celebration=await ctx.storage.get('celebration')||null;});
  }
  activeCelebration(){return this.celebration&&Date.now()<this.celebration.startedAt+this.celebration.duration?this.celebration:null;}
  announce(data){const message={...data,serverNow:Date.now()};for(const socket of this.sockets())this.send(socket,message);}

  sockets() { return this.ctx.getWebSockets().filter(socket => socket.readyState === WebSocket.OPEN); }
  snapshot() {
    return this.sockets().map(socket => {
      const { id, x, z, rotation, moving, seatId, emote } = socket.deserializeAttachment();
      return { id, x, z, rotation, moving, seatId, emote:emote&&Date.now()-emote.startedAt<3000?emote:null };
    });
  }
  send(socket, data) { try { socket.send(JSON.stringify(data)); } catch { /* A closing peer is removed by its close event. */ } }
  broadcast() {
    const data = { type: 'snapshot', players: this.snapshot(),serverNow:Date.now() };
    for (const socket of this.sockets()) this.send(socket, data);
  }
  async fetch() {
    const count = this.sockets().length;
    if (count >= MAX_GUESTS) return new Response('The garden is full. Please try again shortly.', { status: 503 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const state = { id: crypto.randomUUID(), x: (count % 4 - 1.5) * 1.3, z: 19 + Math.floor(count / 4) * 1.5, rotation: 0, moving: false, seatId: null, windowStart: Date.now(), packets: 0 };
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(state);
    this.send(server, { type: 'welcome', id: state.id, spawn: { x: state.x, z: state.z } });
    this.broadcast();
    if(this.activeCelebration())this.send(server,{type:'celebration',event:this.celebration,serverNow:Date.now()});
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(socket, raw) {
    if (typeof raw !== 'string' || raw.length > 2048) return;
    let message;
    try { message = JSON.parse(raw); } catch { return; }
    if (!message || typeof message !== 'object') return;
    const state = socket.deserializeAttachment();
    const now = Date.now();
    if (now - state.windowStart > 1000) { state.windowStart = now; state.packets = 0; }
    state.packets++;
    if (state.packets > 30) { socket.serializeAttachment(state); return; }
    if (message.type === 'ping') { socket.serializeAttachment(state); this.send(socket, { type: 'pong' }); return; }
    if(message.type==='celebrate'){
      const active=this.activeCelebration();
      if(active){this.send(socket,{type:'celebration',event:active,serverNow:now});return;}
      if(state.seatId||Math.hypot(state.x,state.z+7)>7.8){this.send(socket,{type:'action-rejected',reason:'cake-distance'});return;}
      this.celebration={id:crypto.randomUUID(),startedAt:now,duration:11500,seed:Math.floor(Math.random()*0x7fffffff)};
      state.moving=false;socket.serializeAttachment(state);
      for(const peer of this.sockets()){const player=peer.deserializeAttachment();player.moving=false;peer.serializeAttachment(player);}
      await this.ctx.storage.put('celebration',this.celebration);
      this.broadcast();
      this.announce({type:'celebration',event:this.celebration});return;
    }
    if(message.type==='emote'){
      if(!['wave','heart','clap'].includes(message.kind)||now-(state.emote?.startedAt||0)<1500)return;
      state.emote={id:crypto.randomUUID(),kind:message.kind,startedAt:now};
      socket.serializeAttachment(state);this.announce({type:'emote',playerId:state.id,emote:state.emote});return;
    }
    if(this.activeCelebration()&&['move','sit','stand'].includes(message.type)){
      if(message.type!=='move')this.send(socket,{type:'action-rejected',reason:'celebrating'});
      return;
    }
    if (message.type === 'move') {
      if (!state.seatId && validPosition(message) && Number.isFinite(message.rotation)) {
        state.x = message.x; state.z = message.z;
        state.rotation = message.rotation % (Math.PI * 2); state.moving = message.moving === true;
      }
    } else if (message.type === 'sit') {
      const seat = layout.get(message.seatId);
      const occupied = this.sockets().some(peer => peer !== socket && peer.deserializeAttachment().seatId === message.seatId);
      if (!seat || state.seatId || occupied || Math.hypot(state.x - seat.x, state.z - seat.z) > 3.6) {
        this.send(socket, { type: 'seat-rejected', reason: occupied ? 'occupied' : 'unavailable' });
        socket.serializeAttachment(state); return;
      }
      state.returnPosition = { x: state.x, z: state.z };
      state.seatId = seat.id; state.x = seat.x - Math.sin(seat.angle) * .3;
      state.z = seat.z - Math.cos(seat.angle) * .3; state.rotation = seat.angle; state.moving = false;
      socket.serializeAttachment(state);
      this.send(socket, { type: 'seat-confirmed', seatId: seat.id });
    } else if (message.type === 'stand') {
      if (state.seatId) {
        state.x = state.returnPosition.x; state.z = state.returnPosition.z;
        state.seatId = null; state.moving = false; delete state.returnPosition;
      }
      socket.serializeAttachment(state);
      this.send(socket, { type: 'stood-up' });
    } else return;
    socket.serializeAttachment(state);
    this.broadcast();
  }
  webSocketClose(socket, code) { socket.close(code === 1000 ? 1000 : 1001, 'Goodbye'); this.broadcast(); }
  webSocketError(socket) { socket.close(1011, 'Connection interrupted'); this.broadcast(); }
}
