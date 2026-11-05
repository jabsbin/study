import {test,expect} from '@playwright/test';
test('room chat sends safe text, shows unread count and isolates typing from movement on desktop and mobile',async({browser})=>{
 const a=await browser.newContext({viewport:{width:960,height:640}}),b=await browser.newContext({viewport:{width:390,height:844}});
 try{
 const p=await a.newPage(),q=await b.newPage(),name='chat-'+Date.now();
 for(const page of [p,q]){await page.goto('/?name='+name);await page.waitForFunction(()=>window.__garden?.ready);await page.click('#enter');await page.waitForFunction(()=>__garden.connected);}
 await p.click('#chat-toggle');await p.fill('#chat-input','안녕 <img src=x onerror=alert(1)>');await p.click('#chat-send');
 await expect(p.locator('.chat-line.mine')).toHaveCount(1);await expect(p.locator('#chat-input')).toHaveValue('');
 await expect(q.locator('#chat-unread')).toHaveText('1');await q.click('#chat-toggle');
 await expect(q.locator('.chat-text')).toHaveText('안녕 <img src=x onerror=alert(1)>');expect(await q.locator('#chat-messages img').count()).toBe(0);
 await expect(q.locator('#chat-unread')).toBeHidden();
 const pos=await q.evaluate(()=>__garden.position);await q.locator('#chat-input').press('e');await q.locator('#chat-input').press('w');await q.locator('#chat-input').press('d');expect(await q.evaluate(()=>__garden.position)).toEqual(pos);
 await q.fill('#chat-input','생일 축하해!');await q.locator('#chat-input').press('Enter');await expect(p.locator('.chat-text').last()).toHaveText('생일 축하해!');
 const box=await q.locator('#chat-panel').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);expect(box.y+box.height).toBeLessThanOrEqual(844);
 await q.locator('#chat-input').press('Escape');await expect(q.locator('#chat-panel')).toBeHidden();await q.bringToFront();await q.keyboard.down('d');try{await q.waitForFunction(x=>__garden.position.x>x+.1,pos.x,{timeout:15000});}finally{await q.keyboard.up('d');}
 }finally{await a.close();await b.close();}
});
