import {test,expect} from '@playwright/test';

async function play(page){await page.goto('/');await page.locator('#play').tap();await expect(page.locator('#welcome')).toBeHidden()}
async function point(page,selector,id){const box=await page.locator(selector).boundingBox();return {x:box.x+box.width/2,y:box.y+box.height/2,id}}
async function touch(session,type,points){await session.send('Input.dispatchTouchEvent',{type,touchPoints:points})}
const percent=async(page,name)=>parseInt(await page.locator('#'+name+'-percent').textContent(),10);

test('Mobile page boots without runtime or resource errors',async({page,browserName})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)errors.push(response.url())});
  await play(page);await expect(page.locator('#rpm')).not.toHaveText('0');
  await page.screenshot({path:`test-results/mobile-landscape-${browserName}.png`});
  expect(errors).toEqual([]);
});

for(const [width,height] of [[667,280],[667,375],[740,320],[844,390],[932,430],[1024,768]]){
  test(`Controls fit a ${width}x${height} landscape screen without scrolling`,async({page})=>{
    await page.setViewportSize({width,height});await play(page);
    const selectors=['[data-pedal="clutch"]','[data-pedal="brake"]','[data-pedal="gas"]','#handbrake','#clutch-hold','#start','[data-gear="1"]','[data-gear="5"]','#pause'];
    for(const selector of selectors){
      const box=await page.locator(selector).boundingBox();
      expect(box.x,selector).toBeGreaterThanOrEqual(0);expect(box.y,selector).toBeGreaterThanOrEqual(0);
      expect(box.x+box.width,selector).toBeLessThanOrEqual(width+1);
      expect(box.y+box.height,selector).toBeLessThanOrEqual(height+1);
      const hit=await page.locator(selector).evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))});
      expect(hit,selector+' is not covered').toBeTruthy();
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(height);
  });
}

test('Actual multi-touch: clutch + gear + gas launches the car',async({page,context,browserName})=>{
  test.skip(browserName!=='chromium','Native multi-touch injection uses Chromium CDP.');
  await play(page);const session=await context.newCDPSession(page);
  const clutch=await point(page,'[data-pedal="clutch"]',1),gear=await point(page,'[data-gear="1"]',2),gas=await point(page,'[data-pedal="gas"]',3);
  await touch(session,'touchStart',[clutch]);await expect.poll(()=>percent(page,'clutch')).toBe(100);
  await touch(session,'touchStart',[clutch,gear]);await expect(page.locator('#gear')).toHaveText('1');
  await touch(session,'touchEnd',[gear]);
  await touch(session,'touchStart',[clutch,gas]);await expect.poll(()=>percent(page,'gas')).toBeGreaterThan(30);
  await touch(session,'touchEnd',[clutch]);
  await expect.poll(()=>percent(page,'clutch')).toBeLessThan(60);
  const handbrake=await point(page,'#handbrake',4);
  await touch(session,'touchStart',[gas,handbrake]);await expect(page.locator('#handbrake')).toHaveAttribute('aria-pressed','false');
  await touch(session,'touchEnd',[handbrake]);
  await expect.poll(async()=>Number(await page.locator('#speed').textContent())).toBeGreaterThan(2);
  await expect(page.locator('#engine')).toHaveText('● Máy đang chạy');
  await touch(session,'touchEnd',[]);await expect.poll(()=>percent(page,'gas')).toBe(0);
});

test('Pointer cancellation releases all held pedals',async({page,context,browserName})=>{
  test.skip(browserName!=='chromium','Native multi-touch injection uses Chromium CDP.');
  await play(page);const session=await context.newCDPSession(page);
  const clutch=await point(page,'[data-pedal="clutch"]',1),gas=await point(page,'[data-pedal="gas"]',2);
  await touch(session,'touchStart',[clutch,gas]);await expect.poll(()=>percent(page,'gas')).toBeGreaterThan(0);
  await touch(session,'touchCancel',[]);
  await expect.poll(()=>percent(page,'gas')).toBe(0);await expect.poll(()=>percent(page,'clutch')).toBe(0);
});

test('Drag adjusts throttle while touching and release returns to zero',async({page,context,browserName})=>{
  test.skip(browserName!=='chromium','Native multi-touch injection uses Chromium CDP.');
  await play(page);const session=await context.newCDPSession(page),gas=await point(page,'[data-pedal="gas"]',1);
  await touch(session,'touchStart',[gas]);await expect.poll(()=>percent(page,'gas')).toBe(40);
  await touch(session,'touchMove',[{...gas,y:gas.y-60}]);await expect.poll(()=>percent(page,'gas')).toBe(100);
  await touch(session,'touchEnd',[]);await expect.poll(()=>percent(page,'gas')).toBe(0);
});

test('Portrait blocks play, rotation pauses and clears held inputs',async({page,context,browserName})=>{
  test.skip(browserName!=='chromium','Native multi-touch injection uses Chromium CDP.');
  await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('#rotate')).toBeVisible();
  await page.setViewportSize({width:844,height:390});await expect(page.locator('#rotate')).toBeHidden();await page.locator('#play').tap();
  const session=await context.newCDPSession(page),gas=await point(page,'[data-pedal="gas"]',1);
  await touch(session,'touchStart',[gas]);await expect.poll(()=>percent(page,'gas')).toBeGreaterThan(0);
  await page.setViewportSize({width:390,height:844});await expect(page.locator('#rotate')).toBeVisible();
  await touch(session,'touchCancel',[]);await page.setViewportSize({width:844,height:390});
  await expect(page.locator('#paused')).toBeVisible();await page.locator('#resume').tap();
  await expect.poll(()=>percent(page,'gas')).toBe(0);
});

test('Help pauses, closes and permits resuming without fullscreen',async({page})=>{
  await play(page);expect(await page.evaluate(()=>document.fullscreenElement)).toBeNull();
  await page.locator('#help').tap();await expect(page.locator('#guide')).toBeVisible();
  await page.locator('#close-help').tap();await expect(page.locator('#guide')).toBeHidden();
  await expect(page.locator('#paused')).toBeVisible();await page.locator('#resume').tap();
  await expect(page.locator('#paused')).toBeHidden();
});

test('Restart and lesson selection reset the game; desktop remains available',async({page})=>{
  await play(page);await page.locator('#route').selectOption('hill');
  await expect(page.locator('#welcome')).toBeVisible();await page.locator('#play').tap();
  await expect(page.locator('#grade')).toHaveText('+8%');
  await page.locator('#restart').tap();await expect(page.locator('#welcome')).toBeVisible();
  await page.goto('/desktop.html');await expect(page.locator('#road')).toBeVisible();
});

test('Manual rotation works without orientation lock or fullscreen',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await expect(page.locator('#rotate')).toBeVisible();
  await page.setViewportSize({width:844,height:390});await expect(page.locator('#rotate')).toBeHidden();
  await page.locator('#play').tap();await expect(page.locator('#welcome')).toBeHidden();
  await page.setViewportSize({width:390,height:844});await expect(page.locator('#rotate')).toBeVisible();
  await page.setViewportSize({width:844,height:390});await expect(page.locator('#paused')).toBeVisible();
  await page.locator('#resume').tap();await expect(page.locator('#paused')).toBeHidden();
});

test('Touch toggles fire once on Chromium and WebKit',async({page})=>{
  await play(page);
  await expect(page.locator('#handbrake')).toHaveAttribute('aria-pressed','true');
  await page.locator('#handbrake').tap();await expect(page.locator('#handbrake')).toHaveAttribute('aria-pressed','false');
  await page.locator('#handbrake').tap();await expect(page.locator('#handbrake')).toHaveAttribute('aria-pressed','true');
  await page.locator('#clutch-hold').tap();await expect(page.locator('#clutch-hold')).toHaveAttribute('aria-pressed','true');
  await page.locator('#clutch-hold').tap();await expect(page.locator('#clutch-hold')).toHaveAttribute('aria-pressed','false');
});
