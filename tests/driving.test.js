import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Car,routes} from '../dist/physics.js';
const run=(c,seconds,input={},hz=60)=>{for(let i=0;i<Math.round(seconds*hz);i++)c.step(1/hz,input)};
const launch=()=>{const c=new Car();c.shift(1);run(c,1,{clutch:true,gas:.35});run(c,5,{gas:.35});return c};

test('Idle stays stable in neutral and with fully depressed clutch',()=>{
  for(const gear of [0,1,5,-1]){
    const c=new Car();c.gear=gear;run(c,10,{clutch:gear!==0,brake:true});
    assert.equal(c.running,true);assert.ok(Math.abs(c.rpm-850)<5);assert.equal(c.v,0);
  }
});
test('Partial clutch against brake cannot run indefinitely below stall RPM',()=>{
  const c=new Car();c.gear=1;run(c,10,{clutch:.4,brake:true});
  assert.equal(c.running,false);assert.equal(c.stalls,1);
  assert.match(c.errors.find(e=>e.code==='stall').detail,/phanh/);
});
test('Slow clutch release can creep in first without throttle',()=>{
  const c=new Car();c.gear=1;
  for(let i=0;i<20*60;i++)c.step(1/60,{clutch:1-i/(20*60)});
  run(c,3);assert.equal(c.running,true);assert.ok(c.v>.5);
});
test('Moderate throttle is enough for a first gear launch',()=>{
  const c=launch();assert.equal(c.running,true);assert.ok(c.v>2);
});
test('Full throttle is limited in neutral and in first gear',()=>{
  for(const gear of [0,1]){
    const c=new Car();c.shift(gear);run(c,1,{clutch:true,gas:true});
    let peak=0;
    for(let i=0;i<30*60;i++){c.step(1/60,{gas:true});peak=Math.max(peak,c.rpm)}
    assert.equal(c.running,true);assert.ok(peak<6200,`peak ${peak}`);
    assert.ok(c.errors.some(e=>e.code==='rpm'));
    if(gear===1)assert.ok(c.v*3.6<55);
  }
});
test('Rolling opposite the selected gear loads and stalls the engine',()=>{
  for(const [gear,speed] of [[1,-5],[-1,5]]){
    const c=new Car();c.gear=gear;c.clutch=0;c.v=speed;c.rpm=2000;
    run(c,1);assert.equal(c.running,false);assert.equal(c.stalls,1);
    assert.match(c.errors.find(e=>e.code==='stall').detail,/ngược/);
  }
});
test('Reverse launch works without being treated as wrong-way rolling',()=>{
  const c=new Car();c.shift(-1);run(c,1,{clutch:true,gas:.35});run(c,4,{gas:.35});
  assert.equal(c.running,true);assert.ok(c.v<-1);assert.equal(c.stalls,0);
});
test('Selecting a high gear at low speed can stall under load',()=>{
  const c=new Car('hill');c.shift(5);run(c,1,{clutch:true,gas:.35});run(c,5,{gas:.35});
  assert.equal(c.running,false);
});
test('Clutch and braking avoid stall when stopping; brake alone stalls',()=>{
  const c=launch();run(c,5,{clutch:true,brake:true});assert.equal(c.running,true);assert.equal(c.v,0);
  const d=launch();run(d,5,{brake:true});assert.equal(d.running,false);assert.equal(d.v,0);
});
test('Handbrake holds a hill and permits a coordinated launch',()=>{
  const c=new Car('hill');c.handbrake=true;run(c,2,{clutch:true});assert.equal(c.v,0);
  c.shift(1);run(c,1,{clutch:true,gas:.4});run(c,.7,{clutch:.45,gas:.4});
  assert.equal(c.v,0);assert.equal(c.running,true);
  c.handbrake=false;run(c,4,{gas:.4});assert.equal(c.running,true);assert.ok(c.v>1);
});
test('Restart has no effect on a running engine',()=>{
  const c=new Car();c.rpm=5000;c.start();assert.equal(c.rpm,5000);assert.equal(c.errors.length,0);
});
test('Stall can be recovered with clutch, brake and restart',()=>{
  const c=new Car();c.shift(1);run(c,4,{brake:true});assert.equal(c.running,false);
  run(c,1,{clutch:true,brake:true});c.start();assert.equal(c.running,true);
  run(c,1,{clutch:true,gas:.35});run(c,4,{gas:.35});assert.equal(c.running,true);assert.ok(c.v>1);
});
test('A stopped combustion engine may still be turned by the wheels',()=>{
  const c=new Car();c.gear=2;c.clutch=0;c.v=10;c.running=false;c.rpm=0;
  run(c,.5);assert.equal(c.running,false);assert.ok(c.rpm>1000);
});
test('Behaviour is consistent across display refresh rates',()=>{
  const results=[30,60,120].map(hz=>{const c=new Car();c.shift(1);run(c,1,{clutch:true,gas:.35},hz);run(c,5,{gas:.35},hz);return c});
  for(const c of results){assert.equal(c.running,true);assert.ok(Math.abs(c.v-results[0].v)<.05);assert.ok(Math.abs(c.rpm-results[0].rpm)<20)}
});
test('Invalid gear and invalid time cannot corrupt the simulation',()=>{
  const c=new Car();for(const gear of [6,-2,NaN,'1'])c.shift(gear);
  for(const dt of [-1,NaN,Infinity,0])c.step(dt,{});
  assert.equal(c.gear,0);assert.equal(c.time,0);assert.equal(c.rpm,850);
});
test('Stopped engine cannot move a stationary car on level ground',()=>{
  for(const gear of [1,-1]){
    const c=new Car();c.running=false;c.rpm=0;c.gear=gear;c.clutch=0;
    run(c,5);assert.equal(c.v,0);assert.equal(c.rpm,0);
  }
});
test('Hill launch is achievable with the actual on/off keyboard pedals',()=>{
  const c=new Car('hill');c.handbrake=true;c.shift(1);
  run(c,.5,{clutch:true,gas:true});run(c,.7,{gas:true});
  assert.equal(c.running,true);assert.equal(c.v,0);
  c.handbrake=false;run(c,3,{gas:true});
  assert.equal(c.running,true);assert.ok(c.v>1);
});

test('Continuous lessons repeat without stopping or resetting the session',()=>{
  for(const route of Object.keys(routes)){
    const c=new Car(route,{continuous:true});c.fault('example','Example','Preserved log');
    for(let lap=1;lap<=3;lap++){
      c.x=lap*c.length-.01;c.v=10;const previousTime=c.time;
      c.step(.1,{clutch:1});
      assert.equal(c.finished,false);assert.ok(c.v>9);assert.ok(c.x>lap*c.length);assert.ok(c.time>previousTime);
      assert.equal(c.route,route);assert.ok(c.errors.some(error=>error.code==='example'));assert.equal(c.grade,routes[route].segments[0][1]);
    }
    c.x=c.length*3+routes[route].segments[0][0]+1;assert.equal(c.grade,routes[route].segments[1][1]);
    c.x=-1;assert.equal(c.routePosition,c.length-1);assert.equal(c.grade,routes[route].segments.at(-1)[1]);
  }
});

test('Default desktop lessons still finish at the route end',()=>{
  const c=new Car();c.x=c.length-.01;c.v=10;c.step(.1,{clutch:1});
  assert.equal(c.finished,true);assert.equal(c.x,c.length);assert.equal(c.v,0);
});

test('Direct pedals follow the swipe level immediately and stay there',()=>{
  const c=new Car('basic',{directPedals:true});
  for(const level of [.6,.35,1,0]){
    const input={clutch:level,brake:level,gas:level};
    c.step(1/60,input);
    for(const name of Object.keys(input))assert.equal(c[name],level);
    run(c,.5,input);
    for(const name of Object.keys(input))assert.equal(c[name],level);
  }
});
