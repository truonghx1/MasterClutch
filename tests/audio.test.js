import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Car} from '../dist/physics.js';
import {engineVoice} from '../dist/engine-audio.js';
const run=(car,seconds,input)=>{for(let i=0;i<seconds*240;i++)car.step(1/240,input)};

test('Free revving raises audible pitch even when the car is stationary',()=>{
  const car=new Car(),idle=engineVoice(car);
  run(car,1,{clutch:1,gas:.4});
  const revving=engineVoice(car);
  assert.equal(car.v,0);assert.equal(car.clutchTorque,0);
  assert.ok(revving.frequency>idle.frequency*2);
  assert.ok(revving.exhaust>idle.exhaust);
});

test('The bite point loads the engine and lowers its pitch at the same throttle',()=>{
  const free=new Car(),loaded=new Car();loaded.shift(1);loaded.handbrake=true;
  for(const car of [free,loaded])run(car,.5,{clutch:1,gas:.35});
  run(free,.35,{clutch:.45,gas:.35});run(loaded,.35,{clutch:.45,gas:.35});
  assert.equal(loaded.running,true);assert.ok(loaded.clutchTorque>0);
  assert.ok(engineVoice(loaded).frequency<engineVoice(free).frequency);
  assert.ok(engineVoice(loaded).exhaust>engineVoice(free).exhaust);
});

test('From the same road speed, a lower gear settles at a higher engine pitch',()=>{
  const voices=[2,4].map(gear=>{
    const car=new Car();car.gear=gear;car.clutch=0;car.v=15;
    run(car,.6,{clutch:0,gas:0});return engineVoice(car);
  });
  assert.ok(voices[0].frequency>voices[1].frequency*1.5);
});

test('A loaded engine gets rough before stalling, then combustion stays silent even if wheels turn it',()=>{
  const car=new Car('basic',{directPedals:true});car.shift(1);car.handbrake=true;
  const idle=engineVoice(car);let roughest=0;
  for(let i=0;i<240&&car.running;i++){
    car.step(1/240,{clutch:.45,gas:0});roughest=Math.max(roughest,engineVoice(car).roughness);
  }
  assert.ok(roughest>idle.roughness*3);assert.equal(car.running,false);
  car.handbrake=false;car.gear=2;car.clutch=0;car.v=10;
  run(car,.5,{clutch:0});assert.ok(car.rpm>1000);
  const stopped=engineVoice(car);
  for(const key of ['exhaust','intake','mechanical','roughness','limiter'])assert.equal(stopped[key],0);
  car.clutch=1;car.start();assert.ok(engineVoice(car).exhaust>0);
});

test('Engine braking transmits negative clutch torque and disengaging removes it',()=>{
  const car=new Car();car.gear=2;car.clutch=0;car.v=15;
  run(car,.3,{clutch:0,gas:0});assert.ok(car.clutchTorque<0);
  const braking=engineVoice(car);
  assert.ok(braking.exhaust>engineVoice({...car,clutchTorque:0}).exhaust);
  run(car,.4,{clutch:1,gas:0});assert.equal(car.clutchTorque,0);
});
