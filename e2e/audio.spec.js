import {test,expect} from '@playwright/test';

// Observe the real Web Audio output, without replacing the synthesis or physics.
async function observeAudio(page){
  test.skip(!await page.evaluate(()=>!!(window.AudioContext||window.webkitAudioContext)),
    'This browser build has no Web Audio (including Playwright WebKit on Windows).');
  await page.addInitScript(()=>{
    window.audioContexts=[];
    const Native=window.AudioContext||window.webkitAudioContext;
    window.AudioContext=class extends Native{
      constructor(...args){super(...args);window.audioContexts.push(this)}
    };
    const connect=AudioNode.prototype.connect;
    AudioNode.prototype.connect=function(destination,...args){
      if(destination instanceof AudioDestinationNode){
        const analyser=this.context.createAnalyser();analyser.fftSize=4096;
        connect.call(this,analyser);window.engineOutput=analyser;
      }
      return connect.call(this,destination,...args);
    };
  });
}
const state=page=>page.evaluate(()=>window.audioContexts[0]?.state);
const rms=page=>page.evaluate(()=>{
  if(!window.engineOutput)return 0;
  const samples=new Float32Array(window.engineOutput.fftSize);window.engineOutput.getFloatTimeDomainData(samples);
  return Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length);
});
async function swipe(page,name,delta){
  const pedal=page.locator(`[data-pedal="${name}"]`),box=await pedal.boundingBox();
  const range=await pedal.evaluate(el=>Math.min(100,el.clientHeight-16));
  const x=box.x+box.width/2,y=delta>0?box.y+box.height-8:box.y+8;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-delta*range,{steps:8});await page.mouse.up();
}

test('Mobile audio unlocks on play, mutes, pauses, resumes and reuses one context',async({page})=>{
  await observeAudio(page);await page.goto('/');
  expect(await page.evaluate(()=>audioContexts.length)).toBe(0);
  await page.locator('#play').tap();await expect.poll(()=>state(page)).toBe('running');
  await expect.poll(()=>rms(page)).toBeGreaterThan(.005);
  await page.locator('#sound').tap();await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','false');
  await expect.poll(()=>state(page)).toBe('suspended');
  await page.locator('#sound').tap();await expect.poll(()=>rms(page)).toBeGreaterThan(.005);
  await page.locator('#pause').tap();await expect.poll(()=>state(page)).toBe('suspended');
  await page.locator('#resume').tap();await expect.poll(()=>state(page)).toBe('running');
  await page.locator('#help').tap();await expect.poll(()=>state(page)).toBe('suspended');
  await page.locator('#close-help').tap();await page.locator('#resume').tap();
  await expect.poll(()=>state(page)).toBe('running');
  await page.setViewportSize({width:390,height:844});await expect.poll(()=>state(page)).toBe('suspended');
  await page.setViewportSize({width:844,height:390});await page.locator('#resume').tap();
  await page.locator('#restart').tap();await expect.poll(()=>state(page)).toBe('suspended');
  await page.locator('#play').tap();await expect.poll(()=>rms(page)).toBeGreaterThan(.005);
  expect(await page.evaluate(()=>audioContexts.length)).toBe(1);
});

test('Actual output stops after stalling and returns after restarting the engine',async({page})=>{
  await observeAudio(page);await page.goto('/');await page.locator('#play').tap();
  await expect.poll(()=>rms(page)).toBeGreaterThan(.005);
  await page.locator('[data-gear="1"]').tap();await swipe(page,'clutch',-1);
  await expect(page.locator('#start')).toBeEnabled();
  await expect.poll(()=>rms(page)).toBeLessThan(.0001);
  await swipe(page,'clutch',1);await swipe(page,'brake',1);await page.locator('#start').tap();
  await expect(page.locator('#start')).toBeDisabled();await expect.poll(()=>rms(page)).toBeGreaterThan(.005);
});

test('Desktop keyboard starts audio and sound toggle works with the keyboard',async({page})=>{
  await observeAudio(page);await page.goto('/desktop.html');
  expect(await page.evaluate(()=>audioContexts.length)).toBe(0);
  await page.keyboard.press('a');await expect.poll(()=>state(page)).toBe('running');
  await expect.poll(()=>rms(page)).toBeGreaterThan(.005);
  await page.locator('#sound').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','false');
  await expect.poll(()=>state(page)).toBe('suspended');
  await page.keyboard.press('Space');await expect.poll(()=>state(page)).toBe('running');
  await page.locator('#pause').tap();await expect.poll(()=>state(page)).toBe('suspended');
  await page.locator('#resume').tap();await expect.poll(()=>rms(page)).toBeGreaterThan(.005);
});

test('Missing Web Audio leaves the simulation playable',async({page})=>{
  await page.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await page.locator('#play').tap();
  await expect(page.locator('#sound')).toBeDisabled();
  await page.locator('[data-gear="1"]').tap();await expect(page.locator('#gear')).toHaveText('1');
  expect(errors).toEqual([]);
});
