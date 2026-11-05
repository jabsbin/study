export class GardenConnection {
  constructor(handlers,name='') {
    this.handlers = handlers;this.name=name; this.online = false; this.id = null;
    this.socket = null; this.retry = null; this.started = false; this.players = [];
    this.heartbeat=setInterval(()=>this.send({type:'ping'}),20000);
  }
  async connect() {
    this.started = true;
    this.handlers.status('connecting');
    try {
      const response = await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (!response.ok || !(await response.json()).multiplayer) throw new Error('Local-only garden');
      const url = new URL('/api/room', location.href);if(this.name)url.searchParams.set('name',this.name); url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(url); this.socket = socket;
      socket.onmessage = event => {
        let data; try { data = JSON.parse(event.data); } catch { return; }
        if (data.type === 'welcome') {
          this.id = data.id; this.online = true; this.handlers.welcome(data);
          this.handlers.status('online');
        } else if (data.type === 'snapshot') {
          this.players = data.players; this.handlers.snapshot(data.players, this.id,data.serverNow);
        } else this.handlers.message(data);
      };
      socket.onclose = () => this.disconnected();
      socket.onerror = () => socket.close();
    } catch { this.disconnected(); }
  }
  disconnected() {
    this.online = false; this.players = []; this.id = null;
    this.handlers.status('offline'); this.handlers.snapshot([], null);
    clearTimeout(this.retry); this.retry = setTimeout(() => this.connect(), 10000);
  }
  send(data) {
    if (!this.online || this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(data)); return true;
  }
  occupied(seatId) { return this.players.some(player => player.id !== this.id && player.seatId === seatId); }
}
