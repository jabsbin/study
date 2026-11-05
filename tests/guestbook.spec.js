import {test,expect} from '@playwright/test';
test('nickname and guestbook survive re-entry and show safe content on mobile',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const room='book-'+Date.now().toString(36);
 async function enter(){await page.goto('/?name='+room);await page.waitForFunction(()=>window.__garden?.ready);}
 async function openBook(){await page.locator('#actions').evaluate(el=>el.open=true);await page.click('#guestbook-open');await expect(page.locator('#guestbook-dialog')).toBeVisible();}
 try{
  await enter();await page.screenshot({path:'/tmp/nickname-mobile.png'});await page.fill('#nickname','소원요정');await page.click('#enter');await page.waitForFunction(()=>__garden.connected);
  await page.click('#chat-toggle');await page.fill('#chat-input','안녕');await page.click('#chat-send');await expect(page.locator('.chat-meta strong')).toHaveText('소원요정 (나)');await page.click('#chat-close');
  await openBook();await expect(page.locator('#book-empty')).toBeVisible();await page.fill('#book-text','생일 축하해! <img src=x onerror=alert(1)>');
  const before=await page.evaluate(()=>__garden.position);await page.locator('#book-text').press('e');expect(await page.evaluate(()=>__garden.position)).toEqual(before);
  await page.fill('#book-text','생일 축하해! <img src=x onerror=alert(1)>');await page.click('#book-submit');await expect(page.locator('#book-feedback')).toContainText('남겼어요');await expect(page.locator('#book-text')).toHaveValue('');
  await expect(page.locator('#book-list strong')).toHaveText('소원요정');await expect(page.locator('#book-list p')).toHaveText('생일 축하해! <img src=x onerror=alert(1)>');expect(await page.locator('#book-list img').count()).toBe(0);
  await page.fill('#book-text','또 축하해');await page.click('#book-submit');await expect(page.locator('#book-feedback')).toContainText('10초');await expect(page.locator('#book-text')).toHaveValue('또 축하해');
  await page.locator('#guestbook-dialog').press('Escape');await expect(page.locator('#guestbook-dialog')).toBeHidden();
  await enter();await expect(page.locator('#nickname')).toHaveValue('소원요정');await page.click('#enter');await page.waitForFunction(()=>__garden.connected);await openBook();
  await expect(page.locator('#book-list p')).toHaveText('생일 축하해! <img src=x onerror=alert(1)>');await expect(page.locator('#book-list strong')).toHaveText('소원요정');
  await page.click('#book-list .book-edit');await page.fill('.book-editor','더 행복한 생일 보내!');await page.click('.book-save');await expect(page.locator('#book-feedback')).toContainText('수정 내용을 저장');await expect(page.locator('#book-list p')).toHaveText('더 행복한 생일 보내!');
  await page.click('.book-delete');await page.click('.book-cancel');await expect(page.locator('#book-list p')).toHaveText('더 행복한 생일 보내!');
  await page.click('.book-delete');await page.click('.book-delete-confirm');await expect(page.locator('#book-empty')).toBeVisible();await expect(page.locator('#book-feedback')).toContainText('삭제했어요');
  await enter();await page.click('#enter');await page.waitForFunction(()=>__garden.connected);await openBook();await expect(page.locator('#book-empty')).toBeVisible();expect(errors).toEqual([]);
 }finally{await context.close();}
});
