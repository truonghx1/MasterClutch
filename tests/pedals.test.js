import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PedalControls,pedalKeys} from '../dist/pedals.js';
import {Car,routes} from '../dist/physics.js';
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('Each of the six keys adjusts its pedal by 2% and release holds the level',()=>{
  for(const [code,[name,direction]] of Object.entries(pedalKeys)){
    const p=new PedalControls();p.set(name,.5);p.press(code);p.lift(code);p.step(5);
    near(p.levels[name],.5+direction*.02);
  }
});
test('Holding adjusts at 20% per second after 250ms; repeat events do not accelerate it',()=>{
  for(const hz of [30,60,120]){
    const p=new PedalControls();p.press('KeyO');
    for(let i=0;i<hz;i++){p.press('KeyO');p.step(1/hz)}
    near(p.levels.gas,.17);p.lift('KeyO');p.step(10);near(p.levels.gas,.17);
  }
});
test('Pedals adjust independently, opposite directions cancel and limits clamp',()=>{
  const p=new PedalControls();p.press('KeyA');p.press('KeyI');p.press('KeyO');p.step(1);
  near(p.levels.clutch,.83);near(p.levels.brake,.17);near(p.levels.gas,.17);
  p.press('KeyQ');p.step(1);near(p.levels.clutch,.83);
  p.lift('KeyQ');p.step(10);near(p.levels.clutch,0);near(p.levels.brake,1);near(p.levels.gas,1);
});
test('Keyboard and pointer sources do not double speed or release each other',()=>{
  const p=new PedalControls();p.press('KeyO');p.press('KeyO',1);p.step(1);near(p.levels.gas,.17);
  p.lift(1);p.step(1);near(p.levels.gas,.37);
  p.release();p.step(1);near(p.levels.gas,.37);
  p.reset();assert.deepEqual(p.levels,{clutch:1,brake:0,gas:0});assert.equal(p.active.size,0);
});
test('Continuous lessons repeat the terrain without stopping or resetting the session',()=>{
  for(const route of Object.keys(routes)){
    const c=new Car(route,{continuous:true,directPedals:true});c.fault('example','Example','Preserve');
    for(let lap=1;lap<=3;lap++){
      c.x=lap*c.length-.01;c.v=10;const time=c.time;c.step(.1,{clutch:1,gas:.3,brake:0});
      assert.equal(c.finished,false);assert.ok(c.x>lap*c.length);assert.ok(c.v>9);assert.ok(c.time>time);
      assert.equal(c.grade,routes[route].segments[0][1]);assert.ok(c.errors.some(error=>error.code==='example'));
      assert.equal(c.clutch,1);assert.equal(c.gas,.3);
      const boundary=lap*c.length;
      assert.ok(Math.abs(c.elevationAt(boundary+.001)-c.elevationAt(boundary-.001))<.001);
    }
  }
});
