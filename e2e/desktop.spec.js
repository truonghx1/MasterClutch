import {test,expect} from '@playwright/test';
const value=async(page,name)=>parseInt(await page.locator('#'+name+'-percent').textContent(),10);
async function open(page){await page.clock.install();await page.goto('/')}
async function hold(page,key,ms){await page.keyboard.down(key);await page.clock.runFor(ms);await page.keyboard.up(key)}

for(const [width,height] of [[1280,720],[1366,768],[1920,1080]])test(`PC controls fit ${width}x${height}`,async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width,height});await page.goto('/');
  for(const selector of ['#road','.dashboard','.controls','#start','#handbrake','[data-adjust="KeyQ"]','[data-adjust="KeyL"]','[data-gear="5"]']){
    const box=await page.locator(selector).boundingBox();
    expect(box.x,selector).toBeGreaterThanOrEqual(0);expect(box.y,selector).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width,selector).toBeLessThanOrEqual(width);expect(box.y+box.height,selector).toBeLessThanOrEqual(height);
    expect(await page.locator(selector).evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))}),selector).toBeTruthy();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({path:`test-results/pc-${width}.png`,fullPage:true});expect(errors).toEqual([]);
});

test('Six keys nudge the right pedal and keep its level after release',async({page})=>{
  await open(page);
  for(const [key,name,expected] of [['a','clutch',98],['q','clutch',100],['i','brake',2],['k','brake',0],['o','gas',2],['l','gas',0]]){
    await page.keyboard.press(key);await expect(page.locator('#'+name+'-percent')).toHaveText(expected+'%');
    await page.clock.runFor(600);expect(await value(page,name)).toBe(expected);
  }
});

test('Holding keys changes levels gradually, ignores auto-repeat and supports simultaneous pedals',async({page})=>{
  await open(page);await page.keyboard.down('a');await page.keyboard.down('i');await page.keyboard.down('o');
  await page.keyboard.down('o');await page.clock.runFor(1000);
  const clutch=await value(page,'clutch'),brake=await value(page,'brake'),gas=await value(page,'gas');
  expect(clutch).toBeGreaterThanOrEqual(82);expect(clutch).toBeLessThanOrEqual(84);
  expect(brake).toBeGreaterThanOrEqual(16);expect(brake).toBeLessThanOrEqual(18);expect(gas).toBe(brake);
  await page.keyboard.up('a');await page.keyboard.up('i');await page.keyboard.up('o');await page.clock.runFor(1000);
  expect(await value(page,'clutch')).toBe(clutch);expect(await value(page,'gas')).toBe(gas);
  await hold(page,'l',500);expect(await value(page,'gas')).toBeLessThan(gas);
});

test('Pause and focus loss cancel held keys and preserve selected levels',async({page})=>{
  await open(page);await page.keyboard.down('o');await page.clock.runFor(600);await page.keyboard.press('Space');
  await expect(page.locator('#overlay')).toBeVisible();const held=await value(page,'gas');
  await page.clock.runFor(1000);await page.keyboard.up('o');await page.keyboard.press('Space');await page.clock.runFor(1000);
  expect(await value(page,'gas')).toBe(held);
  await page.keyboard.down('i');await page.clock.runFor(400);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#overlay')).toBeVisible();await page.keyboard.up('i');const brake=await value(page,'brake');
  await page.locator('#resume').click();await page.clock.runFor(1000);expect(await value(page,'brake')).toBe(brake);
});

test('Mouse adjustment holds level and keyboard still works after clicking controls',async({page})=>{
  await open(page);await page.locator('[data-adjust="KeyI"]').click();expect(await value(page,'brake')).toBe(2);
  await page.clock.runFor(1000);expect(await value(page,'brake')).toBe(2);
  await page.locator('[data-gear="1"]').click();await page.keyboard.press('o');expect(await value(page,'gas')).toBe(2);
  await page.locator('[data-level="gas"]').fill('30');expect(await value(page,'gas')).toBe(30);
  // Arrow keys remain native; the six pedal shortcuts still work after using the slider.
  await page.locator('[data-level="gas"]').focus();await page.keyboard.press('ArrowRight');expect(await value(page,'gas')).toBe(31);
  await page.keyboard.press('l');expect(await value(page,'gas')).toBe(29);
});

test('Stalled engine restarts in place and help describes the new keys',async({page})=>{
  await open(page);await page.keyboard.press('1');await hold(page,'a',5500);await page.clock.runFor(500);
  await expect(page.locator('#engine')).toHaveText('● Đã tắt máy');await expect(page.locator('#start')).toBeEnabled();
  await page.keyboard.press('Enter');await expect(page.locator('#engine')).toHaveText('● Đã tắt máy');
  await hold(page,'q',5500);await page.keyboard.press('Enter');await expect(page.locator('#engine')).toHaveText('● Động cơ đang chạy');
  await expect(page.locator('#gear')).toHaveText('1');await expect(page.locator('#start')).toBeDisabled();
  await page.locator('#help').click();await expect(page.locator('#guide')).toContainText('Q tăng, A giảm');
  const clutch=await value(page,'clutch');await page.keyboard.press('a');expect(await value(page,'clutch')).toBe(clutch);
  await page.locator('#close-help').click();await expect(page.locator('#overlay')).toBeVisible();
});

test('Lesson repeats until manually changed and both camera views render',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/physics.js',async route=>{
    const response=await route.fetch();const body=(await response.text()).replace(/\[(\d+),(-?\.?\d+)\]/g,(_,length,grade)=>`[${Number(length)/1000},${grade}]`);
    await route.fulfill({response,body});
  });
  await open(page);await page.keyboard.press('1');await hold(page,'o',1500);await page.keyboard.press('h');await hold(page,'a',5500);await page.clock.runFor(3000);
  await expect(page.locator('#overlay')).toBeHidden();expect(parseInt(await page.locator('#distance').textContent(),10)).toBeGreaterThan(4);
  await expect(page.locator('[data-route="basic"]')).toHaveClass(/selected/);await expect(page.locator('#engine')).toHaveText('● Động cơ đang chạy');
  await page.locator('#view').click();await page.clock.runFor(100);await expect(page.locator('#view')).toHaveText('Góc nhìn: Bên ngoài');
  await page.locator('[data-route="hill"]').click();await expect(page.locator('#grade')).toHaveText('+8%');
  expect(await value(page,'gas')).toBe(0);expect(await value(page,'clutch')).toBe(100);await expect(page.locator('#time')).toHaveText('00:00');
  expect(errors).toEqual([]);
});
