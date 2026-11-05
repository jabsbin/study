import { test, expect } from '@playwright/test';
import { walk } from './helpers.js';

async function enter(page){
  await page.goto('/');
  await page.waitForFunction(()=>window.__garden?.ready);
  await page.click('#enter');
  await expect(page.locator('#welcome')).toBeHidden();
  await page.click('#sound');
}

async function sitAndStand(page,{id,x,z,label,button=false,screenshot=false}){
  const approach=await page.evaluate(()=>window.__garden.position);
  await expect(page.locator('#interact')).toContainText(`${label}에 앉기`);
  if(button)await page.click('#interact');else await page.keyboard.press('e');
  await expect.poll(()=>page.evaluate(()=>window.__garden.seated)).toBe(id);
  await expect(page.locator('#interact')).toContainText('일어나기');
  await page.waitForFunction(({x,z})=>Math.hypot(window.__garden.position.x-x,window.__garden.position.z-z)<.01,{x,z});
  if(screenshot){
    await page.mouse.move(730,390);await page.mouse.down();await page.mouse.move(860,390);await page.mouse.up();
    await page.waitForTimeout(900);
    await page.screenshot({path:`test-results/${id}-seated.png`});
  }
  // Movement must stay disabled while seated, including a held key during standing.
  await page.keyboard.down('w');await page.waitForTimeout(450);
  const sitting=await page.evaluate(()=>window.__garden.position);
  expect(Math.hypot(sitting.x-x,sitting.z-z)).toBeLessThan(.02);
  if(button)await page.click('#interact');else await page.keyboard.press('e');
  await page.keyboard.up('w');
  await expect.poll(()=>page.evaluate(()=>window.__garden.seated)).toBe(null);
  expect(await page.evaluate(()=>window.__garden.position)).toEqual(approach);
  await expect(page.locator('#interact')).toContainText(`${label}에 앉기`);
}

test('both café chairs and all four bench places support E to sit and stand',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await enter(page);
  await walk(page,11.4,19);await walk(page,11.4,8.5);
  await sitAndStand(page,{id:'seat-0',x:13.1,z:7,label:'의자',screenshot:true});
  // Fast repeated E presses must not overwrite the safe standing position.
  await page.keyboard.press('e');await page.keyboard.press('e');
  await expect.poll(()=>page.evaluate(()=>window.__garden.seated)).toBe(null);
  await walk(page,11,10.5);await walk(page,19.3,10.5);await walk(page,18.9,8.2);
  await sitAndStand(page,{id:'seat-1',x:16.9,z:7,label:'의자'});
  await walk(page,19.3,10.5);await walk(page,7,10.5);await walk(page,7,-18);
  for(const side of [1,-1])for(const spot of [1,-1]){
    const x=side*5.3+spot*.65;
    await walk(page,x,-19.7);
    await sitAndStand(page,{id:`bench-${side<0?'left':'right'}-${spot<0?'left':'right'}`,x,z:-21.7,label:'벤치',screenshot:spot===1});
  }
  // Getting up puts us on reachable ground and restores normal walking/interactions.
  await walk(page,0,-19.7);
  await expect(page.locator('#interact')).toContainText('편지 읽기');
  await page.keyboard.press('e');await expect(page.locator('#letter')).toBeVisible();
  await page.click('#close-letter');expect(errors).toEqual([]);
});

test('mobile interaction button supports sitting and standing',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await enter(page);await expect(page.locator('#joystick')).toBeVisible();
  // Navigate with keyboard events; the existing mobile test separately exercises the joystick.
  await walk(page,11.4,19);await walk(page,11.4,8.5);
  await expect(page.locator('#interact')).toContainText('의자에 앉기');
  await page.locator('#interact').tap();
  await expect.poll(()=>page.evaluate(()=>window.__garden.seated)).toBe('seat-0');
  await expect(page.locator('#interact')).toContainText('일어나기');
  await page.locator('#interact').tap();
  await expect.poll(()=>page.evaluate(()=>window.__garden.seated)).toBe(null);
  expect(errors).toEqual([]);await context.close();
});
