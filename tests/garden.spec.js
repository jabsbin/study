import { test, expect } from '@playwright/test';

async function walk(page,x,z){
  console.log('Walking to',x,z);
  for(const [axis,target] of [['x',x],['z',z]]){
    const before=await page.evaluate(()=>window.__garden.position);
    const delta=target-before[axis];if(Math.abs(delta)<.6)continue;
    const sign=Math.sign(delta),key=axis==='x'?(sign>0?'d':'a'):(sign>0?'s':'w');
    await page.keyboard.down(key);
    try{await page.waitForFunction(({axis,target,sign})=>sign*(window.__garden.position[axis]-target)>=-.4,{axis,target,sign},{polling:'raf',timeout:45000});}
    catch(error){console.log('Stopped at',await page.evaluate(()=>window.__garden.position));throw error;}finally{await page.keyboard.up(key);}
  }
}

test('walk, open all gifts, celebrate twice and read the letter',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.waitForFunction(()=>window.__garden?.ready);
  await expect(page.locator('#welcome')).toBeVisible();
  await page.click('#enter');await expect(page.locator('#welcome')).toBeHidden();
  await page.click('#sound');await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','false');
  await walk(page,-18,19);await walk(page,-18,7.5);
  await expect(page.locator('#interact')).toContainText('선물 열기');await page.keyboard.press('e');
  await expect.poll(()=>page.evaluate(()=>window.__garden.openedGifts)).toBe(1);
  await walk(page,-18,9.4);await walk(page,-14.9,9.1);await page.click('#interact');
  await expect.poll(()=>page.evaluate(()=>window.__garden.openedGifts)).toBe(2);
  await walk(page,-11.8,7.5);await page.keyboard.press('e');
  await expect(page.locator('#gift-count')).toHaveText('3 / 3');
  console.log('All three gifts opened');await walk(page,0,8.1);await walk(page,0,-1);
  await expect(page.locator('#interact')).toContainText('촛불');await page.keyboard.press('e');
  await expect.poll(()=>page.evaluate(()=>window.__garden.celebrating)).toBe(true);
  const fixed=await page.evaluate(()=>window.__garden.position);await page.keyboard.down('w');await page.waitForTimeout(400);await page.keyboard.up('w');
  expect(await page.evaluate(()=>window.__garden.position)).toEqual(fixed);
  await expect(page.locator('#q-cake')).toHaveClass(/done/,{timeout:10000});
  await expect.poll(()=>page.evaluate(()=>window.__garden.celebrating),{timeout:15000}).toBe(false);
  await page.click('#interact');await expect.poll(()=>page.evaluate(()=>window.__garden.celebrating)).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.__garden.celebrating),{timeout:15000}).toBe(false);
  console.log('Birthday replay verified');await walk(page,7,-1);await walk(page,7,-18);await walk(page,0,-18);await walk(page,0,-20);
  await expect(page.locator('#interact')).toContainText('편지');await page.click('#interact');
  await expect(page.locator('#letter-content')).toContainText('생일 정말 축하해!');
  await page.click('#close-letter');await expect(page.locator('#letter')).toBeHidden();
  expect(errors).toEqual([]);
});

test('mobile renders and joystick moves the visitor',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.waitForFunction(()=>window.__garden?.ready);await page.click('#enter');await expect(page.locator('#welcome')).toBeHidden();await expect(page.locator('#joystick')).toBeVisible();
 const before=await page.evaluate(()=>window.__garden.position);const rect=await page.locator('#joystick').boundingBox();await page.mouse.move(rect.x+50,rect.y+50);await page.mouse.down();await page.mouse.move(rect.x+50,rect.y+20);await page.waitForTimeout(1200);await page.mouse.up();
 expect((await page.evaluate(()=>window.__garden.position)).z).toBeLessThan(before.z);
 await page.screenshot({path:'test-results/mobile.png'});expect(errors).toEqual([]);await context.close();
});
