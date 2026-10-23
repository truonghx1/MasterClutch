import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Car} from '../dist/physics.js';
import {Exercise} from '../dist/sahinh.js';
function state(route){return {route,x:0,v:0,time:0,stalls:0,gear:1,clutch:0,brake:0,handbrake:false}}
function step(exercise,car,changes={},seconds=.1){Object.assign(car,changes);car.time+=seconds;exercise.update(car)}

test('Bridge requires a continuous two-second stop with braking in the marked zone',()=>{
  const e=new Exercise('bridge'),c=state('bridge');
  step(e,c,{x:44,brake:1},1.5);assert.equal(e.phase,'approach');
  step(e,c,{v:.3},.1);step(e,c,{v:0},1);assert.equal(e.phase,'approach');
  step(e,c,{},1.1);assert.equal(e.phase,'launch');
  step(e,c,{x:50,v:2,brake:0});step(e,c,{x:85});assert.equal(e.phase,'cross');
  step(e,c,{x:195});assert.equal(e.passed,true);
});
test('Bridge rejects missed stopping line, rollback and a stalled engine',()=>{
  let e=new Exercise('bridge'),c=state('bridge');step(e,c,{x:48});assert.equal(e.passed,false);assert.equal(e.done,true);
  e=new Exercise('bridge');c=state('bridge');step(e,c,{x:45,handbrake:true},2.1);
  step(e,c,{x:46});step(e,c,{x:45.49});assert.match(e.reason,/trôi lùi/);
  e=new Exercise('bridge');c=state('bridge');step(e,c,{stalls:1});assert.match(e.reason,/tắt máy/);
});
test('Acceleration needs sequential upshifts, coupled clutch and target speed in the zone',()=>{
  const e=new Exercise('acceleration'),c=state('acceleration');
  step(e,c,{x:70,v:8,gear:3});assert.equal(e.phase,'approach');
  step(e,c,{gear:2});step(e,c,{gear:3,clutch:1});assert.equal(e.phase,'approach');
  step(e,c,{clutch:0});assert.equal(e.phase,'stop');
  step(e,c,{x:185,v:0,brake:1});assert.equal(e.done,false);
  step(e,c,{x:195});assert.equal(e.passed,true);
});
test('Acceleration rejects missing speed target and overshooting the stopping zone',()=>{
  let e=new Exercise('acceleration'),c=state('acceleration');step(e,c,{x:141,v:3});assert.equal(e.done,true);assert.equal(e.passed,false);
  e=new Exercise('acceleration');c=state('acceleration');step(e,c,{gear:2});step(e,c,{gear:3,x:80,v:8});step(e,c,{x:206});assert.equal(e.passed,false);assert.match(e.reason,/vượt vùng dừng/);
});
test('Bridge terrain climbs, levels out and descends; acceleration terrain stays flat',()=>{
  const c=new Car('bridge');
  for(const [x,grade] of [[0,0],[45,.1],[90,0],[120,-.1],[195,0]]){c.x=x;assert.equal(c.grade,grade)}
  const straight=new Car('acceleration');for(let x=0;x<straight.length;x++){straight.x=x;assert.equal(straight.grade,0)}
});

for(const route of ['bridge','acceleration']){
 test(`${route}: full exercise can be completed with the real touch-pedal physics`,()=>{
 const c=new Car(route,{directPedals:true}),e=new Exercise(route);c.shift(1);let launch=0,shift=0,hillLaunch=0;
 for(let t=0;t<180&&!e.done;t+=1/60){
  let target=route==='bridge'?(e.phase==='approach'?Math.min(3,Math.max(0,(45-c.x)*.6)):4):(e.phase==='approach'?9:Math.min(9,Math.max(0,(197-c.x)*.6)));
  let clutch=target<1.5||Math.abs(c.v)<.2?1:0,gas=target>0?Math.max(0,Math.min(.6,(target-c.v)*.3+.15)):0,brake=Math.max(0,Math.min(1,(c.v-target)*.5));
  if(brake>0&&c.rpm<1800)clutch=1;
  if(target>1.5&&c.v<1){launch+=1/60;clutch=Math.max(0,1-launch*.15)}else launch=0;
  if(target<.15)brake=1;
  if(route==='acceleration'&&((c.gear===1&&c.v>3.7)||(c.gear===2&&c.v>6.5))){clutch=1;shift+=1/60;if(shift>.4){c.shift(c.gear+1);shift=0}}
  if(route==='bridge'){
   if(e.phase==='approach'&&c.x>=43.5){clutch=1;brake=1;gas=0}
   if(e.phase==='launch'){
    hillLaunch+=1/60;gas=.5;clutch=hillLaunch<2?.45:0;brake=0;c.handbrake=hillLaunch<2;
   }
  }
  c.step(1/60,{clutch,gas,brake});e.update(c);
 }
 assert.equal(e.done,true);assert.equal(e.passed,true,e.reason);assert.equal(c.stalls,0);
 });
}
