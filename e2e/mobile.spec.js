import {test,expect} from '@playwright/test';

async function play(page){await page.goto('/');await page.locator('#play').tap();await expect(page.locator('#welcome')).toBeHidden()}
async function point(page,selector,id){const box=await page.locator(selector).boundingBox();return {x:box.x+box.width/2,y:box.y+box.height/2,id}}
async function touch(session,type,points){await session.send('Input.dispatchTouchEvent',{type,touchPoints:points})}
const percent=async(page,name)=>parseInt(await page.locator('#'+name+'-percent').textContent(),10);
// WebKit rounds pointer coordinates to whole pixels (about 1.4% on short pedals).
const expectLevel=(page,name,value)=>expect.poll(async()=>Math.abs(await percent(page,name)-value)).toBeLessThanOrEqual(2);
async function stroke(page,name,delta){
  const pedal=page.locator(`[data-pedal="${name}"]`),box=await pedal.boundingBox();
  const range=await pedal.evaluate(el=>Math.min(100,el.clientHeight-16));
  const x=box.x+box.width/2,y=delta>0?box.y+box.height-8:box.y+8;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-delta*range,{steps:8});
}
async function swipe(page,name,delta){await stroke(page,name,delta);await page.mouse.up()}

test('Mobile page boots without runtime or resource errors',async({page,browserName})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)errors.push(response.url())});
  await play(page);await expect(page.locator('#rpm')).not.toHaveText('0');
  await page.screenshot({path:`test-results/mobile-landscape-${browserName}.png`});expect(errors).toEqual([]);
});

for(const [width,height] of [[667,280],[667,375],[740,320],[844,390],[932,430],[1024,768]]){
  test(`Controls fit a ${width}x${height} landscape screen without scrolling`,async({page})=>{
    await page.setViewportSize({width,height});await play(page);
    const selectors=['[data-pedal="clutch"]','[data-pedal="brake"]','[data-pedal="gas"]','#handbrake','#start','[data-gear="1"]','[data-gear="5"]','#sound','#pause'];
    for(const selector of selectors){
      const box=await page.locator(selector).boundingBox();
      expect(box.x,selector).toBeGreaterThanOrEqual(0);expect(box.y,selector).toBeGreaterThanOrEqual(0);
      expect(box.x+box.width,selector).toBeLessThanOrEqual(width+1);expect(box.y+box.height,selector).toBeLessThanOrEqual(height+1);
      expect(await page.locator(selector).evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))}),selector+' is not covered').toBeTruthy();
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(height);
  });
}

for(const name of ['clutch','brake','gas']){
  test(`${name}: contact does not jump, swiping and lifting retain the selected level`,async({page})=>{
    await play(page);const initial=name==='clutch'?100:0;
    await page.locator(`[data-pedal="${name}"]`).tap();await expect.poll(()=>percent(page,name)).toBe(initial);
    await stroke(page,name,name==='clutch'?-.4:.6);await expectLevel(page,name,60);
    const held=await percent(page,name);
    // A stationary finger and lifting must both retain the selected level.
    await page.waitForTimeout(400);expect(await percent(page,name)).toBe(held);
    await page.mouse.up();await page.waitForTimeout(400);expect(await percent(page,name)).toBe(held);
    await page.locator(`[data-pedal="${name}"]`).tap();expect(await percent(page,name)).toBe(held);
    await swipe(page,name,-.25);await expectLevel(page,name,35);
    await swipe(page,name,1);await expect.poll(()=>percent(page,name)).toBe(100);
    await swipe(page,name,-1);await expect.poll(()=>percent(page,name)).toBe(0);
  });
}

test('Actual multi-touch adjusts clutch and gas independently and launches the car',async({page,context,browserName})=>{
  test.skip(browserName!=='chromium','Native multi-touch injection uses Chromium CDP.');
  await play(page);await page.locator('[data-gear="1"]').tap();const session=await context.newCDPSession(page);
  const clutch=await point(page,'[data-pedal="clutch"]',1),gas=await point(page,'[data-pedal="gas"]',2);
  const range=await page.locator('[data-pedal="gas"]').evaluate(el=>Math.min(100,el.clientHeight-16));
  clutch.y-=30;gas.y+=30;await touch(session,'touchStart',[clutch,gas]);
  const raisedGas={...gas,y:gas.y-range*.4};
  await touch(session,'touchMove',[clutch,raisedGas]);await expect.poll(()=>percent(page,'gas')).toBe(40);
  await touch(session,'touchMove',[{...clutch,y:clutch.y+range*.55},raisedGas]);await expect.poll(()=>percent(page,'clutch')).toBe(45);
  await touch(session,'touchEnd',[]);await page.locator('#handbrake').tap();
  await expect.poll(async()=>Number(await page.locator('#speed').textContent())).toBeGreaterThan(5);
  await swipe(page,'clutch',-.45);
  await expect.poll(async()=>Number(await page.locator('#speed').textContent())).toBeGreaterThan(2);
  await expect(page.locator('#engine')).toHaveText('● Máy đang chạy');expect(await percent(page,'gas')).toBe(40);
  await expect.poll(()=>percent(page,'clutch')).toBe(0);
});

test('Pointer cancellation retains the last selected level and ends the gesture',async({page,context,browserName})=>{
  test.skip(browserName!=='chromium','Native touch injection uses Chromium CDP.');
  await play(page);const session=await context.newCDPSession(page),gas=await point(page,'[data-pedal="gas"]',1);
  const range=await page.locator('[data-pedal="gas"]').evaluate(el=>Math.min(100,el.clientHeight-16));
  await touch(session,'touchStart',[gas]);await touch(session,'touchMove',[{...gas,y:gas.y-range*.3}]);
  await expect.poll(()=>percent(page,'gas')).toBe(30);await touch(session,'touchCancel',[]);
  await page.locator('[data-pedal="gas"]').tap();await page.waitForTimeout(300);expect(await percent(page,'gas')).toBe(30);
});

test('Stalled engine can be restarted in place with the visible button',async({page,browserName})=>{
  await play(page);await expect(page.locator('#start')).toBeDisabled();
  await page.locator('[data-gear="1"]').tap();await swipe(page,'clutch',-1);
  await expect(page.locator('#engine')).toHaveText('● ĐÃ TẮT MÁY');
  await expect(page.getByRole('button',{name:'Bật động cơ',exact:true})).toBeEnabled();
  await page.screenshot({path:`test-results/mobile-stalled-${browserName}.png`});
  await page.locator('#start').tap();await expect(page.locator('#engine')).toHaveText('● ĐÃ TẮT MÁY');
  await swipe(page,'clutch',1);await swipe(page,'brake',1);await expect.poll(()=>percent(page,'clutch')).toBe(100);
  await page.locator('#start').tap();await expect(page.locator('#engine')).toHaveText('● Máy đang chạy');
  await expect(page.locator('#gear')).toHaveText('1');await expect(page.locator('#welcome')).toBeHidden();await expect(page.locator('#start')).toBeDisabled();
});

test('Lesson keeps running across the route end until the player selects another lesson',async({page})=>{
  // Shorten the track, keeping real physics and the production frame loop.
  await page.route('**/physics.js',async route=>{
    const response=await route.fetch();
    const body=(await response.text()).replace(/\[(\d+),(-?\.?\d+)\]/g,(_,length,grade)=>`[${Number(length)/1000},${grade}]`);
    await route.fulfill({response,body});
  });
  await play(page);await page.locator('[data-gear="1"]').tap();
  await swipe(page,'gas',.4);await expectLevel(page,'gas',40);
  await swipe(page,'clutch',-.55);await page.locator('#handbrake').tap();
  await expect.poll(async()=>Number(await page.locator('#speed').textContent())).toBeGreaterThan(5);
  await swipe(page,'clutch',-.45);
  await expect.poll(async()=>parseInt(await page.locator('#distance').textContent(),10)).toBeGreaterThan(4);
  await expect(page.locator('#paused')).toBeHidden();await expect(page.locator('#route')).toHaveValue('basic');await expect(page.locator('#gear')).toHaveText('1');
  await page.locator('#route').selectOption('hill');await expect(page.locator('#welcome')).toBeVisible();
  await page.locator('#play').tap();await expect(page.locator('#grade')).toHaveText('+8%');
  await expect.poll(()=>percent(page,'gas')).toBe(0);await expect.poll(()=>percent(page,'clutch')).toBe(100);
});

test('Portrait blocks play; rotation pauses and retains pedal levels',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('#rotate')).toBeVisible();
  await page.setViewportSize({width:844,height:390});await expect(page.locator('#rotate')).toBeHidden();await page.locator('#play').tap();
  await swipe(page,'gas',.3);await expectLevel(page,'gas',30);const held=await percent(page,'gas');
  await page.setViewportSize({width:390,height:844});await expect(page.locator('#rotate')).toBeVisible();
  await page.setViewportSize({width:844,height:390});await expect(page.locator('#paused')).toBeVisible();
  await page.locator('#resume').tap();await expect(page.locator('#paused')).toBeHidden();expect(await percent(page,'gas')).toBe(held);
});

test('Help pauses, closes and permits resuming without fullscreen',async({page})=>{
  await play(page);expect(await page.evaluate(()=>document.fullscreenElement)).toBeNull();
  await swipe(page,'brake',.5);await expectLevel(page,'brake',50);const held=await percent(page,'brake');
  await page.locator('#help').tap();await expect(page.locator('#guide')).toBeVisible();
  await page.locator('#close-help').tap();await expect(page.locator('#guide')).toBeHidden();
  await expect(page.locator('#paused')).toBeVisible();await page.locator('#resume').tap();
  await expect(page.locator('#paused')).toBeHidden();expect(await percent(page,'brake')).toBe(held);
});

test('Restart resets pedals and game; desktop remains available',async({page})=>{
  await play(page);await swipe(page,'gas',.4);await expectLevel(page,'gas',40);
  await page.locator('#restart').tap();await expect(page.locator('#welcome')).toBeVisible();await page.locator('#play').tap();
  expect(await percent(page,'gas')).toBe(0);expect(await percent(page,'clutch')).toBe(100);
  await page.goto('/desktop.html');await expect(page.locator('#road')).toBeVisible();
});

test('Touch toggles fire once on Chromium and WebKit',async({page})=>{
  await play(page);await expect(page.locator('#handbrake')).toHaveAttribute('aria-pressed','true');
  await page.locator('#handbrake').tap();await expect(page.locator('#handbrake')).toHaveAttribute('aria-pressed','false');
  await page.locator('#handbrake').tap();await expect(page.locator('#handbrake')).toHaveAttribute('aria-pressed','true');
});
