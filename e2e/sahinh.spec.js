import {test,expect} from '@playwright/test';
for(const [route,title,hint] of [['bridge','Dừng và khởi hành trên dốc cầu','Dừng trên dốc'],['acceleration','Tăng tốc trên đường thẳng','Tăng tốc ·']]){
  test(`${route}: choose practice, drive, pause and restart on iPhone layout`,async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/');await page.locator('#welcome-route').selectOption(route);
    await expect(page.locator('#welcome-title')).toHaveText(title);
    await expect(page.locator('#welcome-description')).not.toBeEmpty();
    await page.locator('#play').tap();await expect(page.locator('#welcome')).toBeHidden();
    await expect(page.locator('#feedback-title')).toContainText(hint);
    await expect(page.locator('#distance')).toContainText('Sa hình');
    await page.locator('[data-gear="1"]').tap();await expect(page.locator('#gear')).toHaveText('1');
    await page.locator('#pause').tap();await expect(page.locator('#paused')).toBeVisible();
    await page.locator('#resume').tap();await expect(page.locator('#paused')).toBeHidden();
    await page.screenshot({path:`test-results/sahinh-${route}.png`});
    await page.locator('#restart').tap();await expect(page.locator('#welcome-title')).toHaveText(title);
    await page.locator('#welcome-route').selectOption('basic');await page.locator('#play').tap();
    await expect(page.locator('#distance')).toContainText('Tập tự do');expect(errors).toEqual([]);
  });
}

test('Failed practice shows a result, freezes the car and can be retried',async({page})=>{
  await page.goto('/');await page.locator('#welcome-route').selectOption('bridge');await page.locator('#play').tap();
  await page.locator('[data-gear="1"]').tap();
  const box=await page.locator('[data-pedal="clutch"]').boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+8);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2,box.y+box.height-8,{steps:8});await page.mouse.up();
  await expect(page.locator('#result')).toBeVisible();await expect(page.locator('#result-title')).toHaveText('Cần tập lại');
  await expect(page.locator('#result-detail')).toContainText('tắt máy');
  const stats=await page.locator('#result-stats').textContent();await page.waitForTimeout(200);await expect(page.locator('#result-stats')).toHaveText(stats);
  await page.locator('#retry').tap();await expect(page.locator('#result')).toBeHidden();await expect(page.locator('#welcome')).toBeVisible();
  await page.locator('#play').tap();await expect(page.locator('#gear')).toHaveText('N');await expect(page.locator('#engine')).toHaveText('● Máy đang chạy');
});
