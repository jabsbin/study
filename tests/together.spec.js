import { test, expect } from '@playwright/test';
import { walk as walkBase } from './helpers.js';
async function walk(page,x,z){await page.keyboard.down('Shift');try{await walkBase(page,x,z,90000);}finally{await page.keyboard.up('Shift');}}

test('two separate visitors sit side by side and a disconnected seat becomes available',async({browser})=>{
  const contexts=[];const errors=[];
  async function visitor(){
    const context=await browser.newContext({viewport:{width:800,height:600}});contexts.push(context);
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/');await page.waitForFunction(()=>window.__garden?.ready);
    await page.click('#enter');await expect(page.locator('#welcome')).toBeHidden();await page.click('#sound');
    await expect.poll(()=>page.evaluate(()=>window.__garden.connected)).toBe(true);
    return page;
  }
  try{
    const a=await visitor(),b=await visitor();
    await expect.poll(()=>a.evaluate(()=>window.__garden.friends.length)).toBe(1);
    await expect.poll(()=>b.evaluate(()=>window.__garden.friends.length)).toBe(1);
    for(const [page,x,seatId] of [[a,-5.95,'bench-left-left'],[b,-4.65,'bench-left-right']]){
      await page.bringToFront();await walk(page,8,19);await walk(page,8,-9);await walk(page,6,-9);await walk(page,6,-18);await walk(page,x,-18);await walk(page,x,-19.8);
      await expect(page.locator('#interact')).toContainText('벤치에 앉기');await page.keyboard.press('e');
      await expect.poll(()=>page.evaluate(()=>window.__garden.seated)).toBe(seatId);
    }
    await expect.poll(()=>a.evaluate(()=>window.__garden.friends[0]?.seatId)).toBe('bench-left-right');
    await expect.poll(()=>b.evaluate(()=>window.__garden.friends[0]?.seatId)).toBe('bench-left-left');
    await a.bringToFront();await a.screenshot({path:'test-results/two-visitors.png'});
    await contexts[0].close();
    await expect.poll(()=>b.evaluate(()=>window.__garden.friends.length)).toBe(0);
    await b.bringToFront();await pageStand(b);
    await walk(b,-5.95,-19.8);await b.keyboard.press('e');
    await expect.poll(()=>b.evaluate(()=>window.__garden.seated)).toBe('bench-left-left');
    expect(errors).toEqual([]);
  }finally{for(const context of contexts)await context.close();}
});
async function pageStand(page){await page.keyboard.press('e');await expect.poll(()=>page.evaluate(()=>window.__garden.seated)).toBe(null);}
