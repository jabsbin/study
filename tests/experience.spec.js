import { test,expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function enter(page,url='/'){
  await page.goto(url);await page.waitForFunction(()=>window.__garden?.ready);
  await page.click('#enter');await expect(page.locator('#welcome')).toBeHidden();
}

test('personalized greeting, safe gift links, emotes and an actual PNG photo',async({page,context})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await enter(page,'/?name='+encodeURIComponent('지민'));
  await expect(page.locator('#brand-title')).toContainText('지민');
  await expect(page.locator('#letter-title')).toHaveText('지민에게 쓰는 편지');
  expect(await page.evaluate(()=>window.__garden.birthdayName)).toBe('지민');
  await page.click('#gift-link');await page.fill('#gift-name','수지');
  const position=await page.evaluate(()=>window.__garden.position);
  await page.locator('#gift-name').press('e');await page.locator('#gift-name').press('Backspace');
  expect(await page.evaluate(()=>window.__garden.position)).toEqual(position);
  await page.click('#copy-gift');await expect(page.locator('#gift-status')).toContainText('복사했어요');
  const copied=await page.evaluate(()=>navigator.clipboard.readText());expect(new URL(copied).searchParams.get('name')).toBe('수지');
  await page.click('#close-gift');await page.click('#emote-heart');
  await expect.poll(()=>page.evaluate(()=>window.__garden.emote)).toBe('heart');
  await page.click('#photo-mode');await expect(page.locator('#journey')).toBeHidden();
  await expect(page.locator('#photo-controls')).toBeVisible();await page.click('#capture-photo');
  await expect(page.locator('#photo-dialog')).toBeVisible({timeout:15000});
  await page.waitForFunction(()=>document.getElementById('photo-image').naturalWidth>0);
  const dimensions=await page.locator('#photo-image').evaluate(img=>[img.naturalWidth,img.naturalHeight]);
  expect(Math.max(...dimensions)).toBe(1920);
  const downloadPromise=page.waitForEvent('download');await page.click('#download-photo');const download=await downloadPromise;
  const bytes=await readFile(await download.path());expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
  await page.click('#close-photo');await page.click('#exit-photo');await expect(page.locator('#journey')).toBeVisible();
  await page.mouse.move(420,330);await page.mouse.down();await page.mouse.move(500,350);await page.mouse.up();
  await page.click('#reset-camera');expect((await page.evaluate(()=>window.__garden.cameraView)).pitch).toBe(.32);
  expect(errors).toEqual([]);
});

test('mobile pinch zoom, reset, collapsed tools and personalized text without HTML injection',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await enter(page,'/?name='+encodeURIComponent('<img onerror=alert(1)>'));
    await expect(page.locator('#welcome-title img')).toHaveCount(0);
    expect(await page.locator('#welcome-title').textContent()).toContain('<img');
    expect(await page.locator('#actions').evaluate(e=>e.open)).toBe(false);
    const before=await page.evaluate(()=>window.__garden.cameraView.distance);
    const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:420,id:0},{x:250,y:420,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y:420,id:0},{x:280,y:420,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(()=>page.evaluate(()=>window.__garden.cameraView.distance)).toBeLessThan(before);
    await page.locator('#actions summary').tap();await page.locator('#reset-camera').tap();
    expect(await page.evaluate(()=>window.__garden.cameraView.distance)).toBe(22);
    await page.locator('#actions summary').tap();await page.locator('#emote-wave').tap();
    await expect.poll(()=>page.evaluate(()=>window.__garden.emote)).toBe('wave');
    await page.screenshot({path:'test-results/experience-mobile.png'});expect(errors).toEqual([]);
  }finally{await context.close();}
});
