import { test, expect } from '@playwright/test';
import { walk as walkBase } from './helpers.js';
async function walk(page,x,z){await page.keyboard.down('Shift');try{await walkBase(page,x,z,90000);}finally{await page.keyboard.up('Shift');}}

test('named friends share a birthday, emotes, two-person seating and a portrait photo',async({browser})=>{
  const contexts=[];const errors=[];
  async function visitor(){
    const context=await browser.newContext({viewport:{width:800,height:600}});contexts.push(context);
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/?name='+encodeURIComponent('지민'));await page.waitForFunction(()=>window.__garden?.ready);
    await page.click('#enter');await expect(page.locator('#welcome')).toBeHidden();await page.click('#sound');
    await expect.poll(()=>page.evaluate(()=>window.__garden.connected)).toBe(true);
    return page;
  }
  try{
    const a=await visitor(),b=await visitor();
    await expect.poll(()=>a.evaluate(()=>window.__garden.friends.length)).toBe(1);
    await expect.poll(()=>b.evaluate(()=>window.__garden.friends.length)).toBe(1);
    expect(await a.evaluate(()=>window.__garden.birthdayName)).toBe('지민');
    const probe=new WebSocket('ws://127.0.0.1:8787/api/room');
    try{await new Promise((resolve,reject)=>{probe.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='snapshot'){try{expect(m.players).toHaveLength(1);resolve();}catch(error){reject(error);}}};probe.onerror=reject;});}finally{probe.close();}
    await a.bringToFront();await a.click('#emote-heart');await expect.poll(()=>b.evaluate(()=>window.__garden.friends[0]?.emote)).toBe('heart');
    await b.bringToFront();await b.click('#emote-clap');await expect.poll(()=>a.evaluate(()=>window.__garden.friends[0]?.emote)).toBe('clap');
    await a.bringToFront();await walk(a,8,19);await walk(a,8,-1);await walk(a,0,-1);
    await expect(a.locator('#interact')).toContainText('촛불');await a.keyboard.press('e');
    await expect.poll(()=>a.evaluate(()=>window.__garden.celebrationId)).not.toBe(null);
    const eventId=await a.evaluate(()=>window.__garden.celebrationId);
    await expect.poll(()=>b.evaluate(()=>window.__garden.celebrationId)).toBe(eventId);
    const fixed=await b.evaluate(()=>window.__garden.position);await b.keyboard.down('w');await b.waitForTimeout(400);await b.keyboard.up('w');
    expect(await b.evaluate(()=>window.__garden.position)).toEqual(fixed);
    await expect(b.locator('#q-cake')).toHaveClass(/done/,{timeout:10000});
    await expect.poll(()=>a.evaluate(()=>window.__garden.celebrating),{timeout:15000}).toBe(false);
    await expect.poll(()=>b.evaluate(()=>window.__garden.celebrating),{timeout:15000}).toBe(false);
    for(const [page,x,seatId] of [[a,-5.95,'bench-left-left'],[b,-4.65,'bench-left-right']]){
      await page.bringToFront();
      if(page===b){await walk(page,8,19);await walk(page,8,-9);await walk(page,6,-9);}else await walk(page,6,-1);
      await walk(page,6,-18);await walk(page,x,-18);await walk(page,x,-19.8);
      await expect(page.locator('#interact')).toContainText('벤치에 앉기');await page.keyboard.press('e');
      await expect.poll(()=>page.evaluate(()=>window.__garden.seated)).toBe(seatId);
    }
    await expect.poll(()=>a.evaluate(()=>window.__garden.friends[0]?.seatId)).toBe('bench-left-right');
    await expect.poll(()=>b.evaluate(()=>window.__garden.friends[0]?.seatId)).toBe('bench-left-left');
    await a.bringToFront();await a.setViewportSize({width:390,height:844});await a.waitForTimeout(2500);
    const framing=await a.evaluate(()=>window.__garden.framing);expect(framing).toHaveLength(2);
    for(const point of framing){expect(Math.abs(point.x)).toBeLessThan(.9);expect(Math.abs(point.y)).toBeLessThan(.9);expect(point.z).toBeLessThan(1);}
    if(!await a.locator('#actions').evaluate(e=>e.open))await a.locator('#actions summary').click();
    await a.click('#photo-mode');await a.click('#capture-photo');await expect(a.locator('#photo-dialog')).toBeVisible({timeout:15000});
    await a.locator('#photo-image').screenshot({path:'test-results/two-visitors.png'});
    await a.click('#close-photo');await a.click('#exit-photo');
    await contexts[0].close();
    await expect.poll(()=>b.evaluate(()=>window.__garden.friends.length)).toBe(0);
    await b.bringToFront();await pageStand(b);
    await walk(b,-5.95,-19.8);await b.keyboard.press('e');
    await expect.poll(()=>b.evaluate(()=>window.__garden.seated)).toBe('bench-left-left');
    expect(errors).toEqual([]);
  }finally{for(const context of contexts)await context.close();}
});
async function pageStand(page){await page.keyboard.press('e');await expect.poll(()=>page.evaluate(()=>window.__garden.seated)).toBe(null);}
