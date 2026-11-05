import { test,expect } from '@playwright/test';

test('remote avatar stays smooth through jitter while both visitors move',async({page})=>{
  const room='jitter-'+Date.now().toString(36),errors=[];let delayed=0,due=0;const timers=new Set();
  page.on('pageerror',e=>errors.push(e.message));
  await page.routeWebSocket('**/api/room*',route=>{
    const server=route.connectToServer();route.onMessage(message=>server.send(message));
    server.onMessage(message=>{
      const data=JSON.parse(String(message));
      if(data.type!=='player-moved'){route.send(message);return;}
      const lag=[20,90,35,110,30,55][delayed++%6];due=Math.max(Date.now()+lag,due+1);
      const timer=setTimeout(()=>{timers.delete(timer);route.send(message);},due-Date.now());timers.add(timer);
    });
  });
  await page.goto('/?name='+encodeURIComponent(room));await page.waitForFunction(()=>window.__garden?.ready);
  await page.click('#enter');await expect(page.locator('#welcome')).toBeHidden();await page.click('#sound');
  await expect.poll(()=>page.evaluate(()=>window.__garden.connected)).toBe(true);
  const socket=new WebSocket('ws://127.0.0.1:8787/api/room?v=2&name='+encodeURIComponent(room));
  try{
    await new Promise((resolve,reject)=>{socket.onmessage=e=>{if(JSON.parse(e.data).type==='welcome')resolve();};socket.onerror=reject;});
    await expect.poll(()=>page.evaluate(()=>window.__garden.friends.length)).toBe(1);
    socket.send(JSON.stringify({type:'move',x:0,z:19,rotation:0,moving:false,sampleTime:performance.now()}));
    await expect.poll(()=>page.evaluate(()=>window.__garden.friends[0]?.displayX)).toBeCloseTo(0,2);
    const ownStart=await page.evaluate(()=>window.__garden.position.x);
    await page.keyboard.down('d');
    const observation=page.evaluate(()=>new Promise(resolve=>{
      const samples=[],start=performance.now();
      function tick(now){const friend=window.__garden.friends[0];if(friend)samples.push({t:friend.displayTime,x:friend.displayX});if(now-start<3600)requestAnimationFrame(tick);else resolve(samples);}
      requestAnimationFrame(tick);
    }));
    for(let i=0;i<=40;i++){socket.send(JSON.stringify({type:'move',x:i*.1,z:19,rotation:0,moving:i<40,sampleTime:performance.now()}));await new Promise(resolve=>setTimeout(resolve,50));}
    await page.keyboard.up('d');
    expect(await page.evaluate(()=>window.__garden.position.x)).toBeGreaterThan(ownStart+.1);
    const samples=await observation;
    await expect.poll(()=>page.evaluate(()=>window.__garden.friends[0]?.displayX)).toBeCloseTo(4,2);
    expect(delayed).toBeGreaterThan(35);
    expect(samples.length).toBeGreaterThan(3);
    for(let i=1;i<samples.length;i++){
      expect(samples[i].x-samples[i-1].x).toBeGreaterThan(-.03);
      // At most 25% catch-up, with a small allowance for producer timer precision.
      expect(samples[i].x-samples[i-1].x).toBeLessThan((samples[i].t-samples[i-1].t)*.0026+.03);
    }
    expect(errors).toEqual([]);
  }finally{await page.keyboard.up('d');socket.close(1000);for(const timer of timers)clearTimeout(timer);}
});
