import {test,expect} from '@playwright/test';
for(const mobile of [false,true])test(`clap turns avatar toward unchanged camera and restores direction (${mobile?'mobile':'desktop'})`,async({page})=>{
 if(mobile)await page.setViewportSize({width:390,height:844});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.waitForFunction(()=>window.__garden?.ready);await page.click('#enter');
 await expect(page.locator('#welcome')).toBeHidden();
 const before=await page.evaluate(()=>({view:__garden.cameraView,facing:__garden.cameraFacing,position:__garden.position}));
 await page.locator('#actions').evaluate(el=>el.open=true);await page.click('#emote-clap');
 await expect.poll(()=>page.evaluate(()=>__garden.cameraFacing)).toBeGreaterThan(.95);
 expect(await page.evaluate(()=>__garden.cameraView)).toEqual(before.view);
 expect(await page.evaluate(()=>__garden.position)).toEqual(before.position);
 if(!mobile){await page.click('#emote-clap');await page.waitForFunction(()=>__garden.cameraFacing>.95,{},{timeout:5000});}
 await expect.poll(()=>page.evaluate(()=>__garden.clapTurning),{timeout:7000}).toBe(false);
 expect(await page.evaluate(()=>__garden.cameraFacing)).toBeCloseTo(before.facing,1);
 expect(errors).toEqual([]);
});

test('seated clap faces the camera without losing the seat',async({page})=>{
 const {walk}=await import('./helpers.js');
 await page.goto('/');await page.waitForFunction(()=>window.__garden?.ready);await page.click('#enter');await expect(page.locator('#welcome')).toBeHidden();await page.click('#sound');
 await walk(page,11.4,19);await walk(page,11.4,8.5);await page.keyboard.press('e');await expect.poll(()=>page.evaluate(()=>__garden.seated)).toBe('seat-0');
 await page.waitForTimeout(1000);const before=await page.evaluate(()=>__garden.cameraView);
 await page.click('#emote-clap');await page.waitForFunction(()=>__garden.cameraFacing>.95,{},{timeout:5000});
 expect(await page.evaluate(()=>__garden.cameraView)).toEqual(before);expect(await page.evaluate(()=>__garden.seated)).toBe('seat-0');
 await expect.poll(()=>page.evaluate(()=>__garden.clapTurning),{timeout:7000}).toBe(false);
 await page.keyboard.press('e');await expect.poll(()=>page.evaluate(()=>__garden.seated)).toBe(null);
});
