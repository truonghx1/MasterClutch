import {Car,routes} from './physics.js';
import {PedalControls,pedalKeys} from './pedals.js';
import {drawCockpit} from './cockpit.js';
import {drawExterior} from './exterior.js';

const $=id=>document.getElementById(id),pedals=new PedalControls();
const canvas=$('road'),ctx=canvas.getContext('2d');
let car,paused=false,started=false,last=0,lastPaint=0,seen=0,cockpitView=true;
const playable=()=>!paused&&!$('guide').open;
const fmt=t=>Math.floor(t/60).toString().padStart(2,'0')+':'+Math.floor(t%60).toString().padStart(2,'0');

function reset(route='basic'){
  car=new Car(route,{continuous:true,directPedals:true});car.handbrake=true;
  pedals.reset();paused=false;started=false;last=0;seen=0;
  $('logs').innerHTML='<p class="empty">Chưa có lỗi. Tăng ga vừa đủ và nhả côn từ từ để khởi hành.</p>';
  $('overlay').hidden=true;$('scene-name').textContent=routes[route].name.toLocaleUpperCase('vi');
  document.querySelectorAll('[data-route]').forEach(button=>{
    button.classList.toggle('selected',button.dataset.route===route);
    button.setAttribute('aria-pressed',String(button.dataset.route===route));
  });render();
}
function togglePause(){
  paused=!paused;pedals.release();last=0;$('overlay').hidden=!paused;
  $('overlay-title').textContent='Đã tạm dừng';
  $('overlay-text').textContent='Xe và mức bàn đạp được giữ nguyên. Tiếp tục khi bạn sẵn sàng.';
  render();
}
function loseFocus(){pedals.release();if(started&&!paused)togglePause()}
function handbrake(){if(playable()){started=true;car.handbrake=!car.handbrake;render()}}
function start(){if(playable()){started=true;car.start();render()}}
function shift(gear){if(playable()){started=true;car.shift(gear);render()}}
function commitPedals(){
  // Apply the chosen position immediately, including a quick tap between frames.
  Object.assign(car,pedals.levels);render();
}
function coach(){
  let title='Khởi hành từng bước.',text='Côn 100% → chọn số 1 → O tăng ga → A giảm côn tới điểm bắt → H nhả phanh tay.';
  if(!car.running){title='Máy đã tắt. Bạn có thể đề lại.';text='W tăng côn đến 100%, I tăng phanh, L giảm ga về 0%. Nhấn Enter hoặc Bật động cơ để tiếp tục.'}
  else if(car.grade>.03){title='Giữ lực kéo trên dốc.';text='Dùng H giữ phanh tay. Chọn số 1, O thêm ga và A giảm côn tới điểm bắt. Nhấn H nhả phanh tay khi đủ lực kéo.'}
  else if(car.grade<-.03){title='Dùng phanh động cơ khi xuống dốc.';text='Chọn số thấp phù hợp, A giảm côn. I tăng phanh, K giảm phanh để kiểm soát tốc độ.'}
  else if(Math.abs(car.v)>2){title='Phối hợp ga và côn khi chuyển số.';text='L giảm ga, W tăng côn tới 100% rồi chọn số. A giảm côn từ từ và O thêm ga. Thả phím để giữ mức.'}
  $('coach-title').textContent=title;$('coach-text').textContent=text;
}

window.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey||event.isComposing||$('guide').open)return;
  if(event.target.closest('input:not([type="range"]),select,textarea,[contenteditable="true"]'))return;
  const code=event.code;
  if(pedalKeys[code]){
    event.preventDefault();if(event.repeat||!playable())return;
    started=true;pedals.press(code);commitPedals();return;
  }
  if(!['Space','Enter','KeyH','KeyN','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6'].includes(code))return;
  // Let focused buttons retain their standard Enter/Space activation.
  if(event.target.closest('button,a')&&['Space','Enter'].includes(code))return;
  event.preventDefault();if(event.repeat)return;
  if(code==='Space'){togglePause();return}
  if(code==='KeyH'){handbrake();return}
  if(code==='Enter'){start();return}
  shift(code==='KeyN'?0:code==='Digit6'?-1:Number(code.slice(-1)));
});
window.addEventListener('keyup',event=>pedals.lift(event.code));
window.addEventListener('blur',loseFocus);
window.addEventListener('pagehide',loseFocus);
document.addEventListener('visibilitychange',()=>{if(document.hidden)loseFocus()});

for(const button of document.querySelectorAll('[data-adjust]')){
  button.addEventListener('pointerdown',event=>{
    if(event.button!==0||!playable())return;
    event.preventDefault();started=true;pedals.press(button.dataset.adjust,event.pointerId);
    button.setPointerCapture(event.pointerId);commitPedals();
  });
  button.addEventListener('click',event=>{
    if(event.detail!==0||!playable())return;
    started=true;pedals.press(button.dataset.adjust,'assistive');pedals.lift('assistive');commitPedals();
  });
  button.addEventListener('lostpointercapture',event=>pedals.lift(event.pointerId));
  button.addEventListener('contextmenu',event=>event.preventDefault());
}
window.addEventListener('pointerup',event=>pedals.lift(event.pointerId));
window.addEventListener('pointercancel',event=>pedals.lift(event.pointerId));
for(const slider of document.querySelectorAll('[data-level]'))slider.addEventListener('input',()=>{
  if(!playable()){render();return}
  started=true;pedals.set(slider.dataset.level,Number(slider.value)/100);commitPedals();
});
document.querySelectorAll('[data-gear]').forEach(button=>button.onclick=()=>shift(Number(button.dataset.gear)));
document.querySelectorAll('[data-route]').forEach(button=>button.onclick=()=>reset(button.dataset.route));
$('start').onclick=start;$('handbrake').onclick=handbrake;
$('reset').onclick=()=>reset(car.route);$('pause').onclick=togglePause;$('resume').onclick=togglePause;
$('help').onclick=()=>{if(!paused)togglePause();pedals.release();$('guide').showModal()};
$('close-help').onclick=()=>$('guide').close();
$('view').onclick=()=>{cockpitView=!cockpitView;$('view').textContent=cockpitView?'Góc nhìn: Khoang lái':'Góc nhìn: Bên ngoài'};

function render(){
  $('rpm').textContent=Math.round(car.rpm).toLocaleString('en-US');
  $('rpm-bar').style.width=Math.min(100,car.rpm/80)+'%';
  $('rpm-bar').style.background=car.rpm>5800?'#cd8063':'#83a15f';
  $('speed').textContent=Math.round(Math.abs(car.v)*3.6);
  $('gear').textContent=car.gear===0?'N':car.gear===-1?'R':car.gear;
  $('engine').textContent=car.running?'● Động cơ đang chạy':'● Đã tắt máy';
  $('engine').classList.toggle('stalled',!car.running);
  $('start').disabled=car.running||paused;$('start').textContent=car.running?'● Máy đang chạy':'⏻ Bật động cơ · Enter';
  $('grade').textContent=(car.grade>0?'+':'')+Math.round(car.grade*100)+'%';
  $('grade-name').textContent=car.grade>0?'Đang lên dốc':car.grade<0?'Đang xuống dốc':'Đường bằng';
  $('distance').textContent=Math.round(car.x).toLocaleString('vi')+' m · Tập không giới hạn';
  $('direction').textContent=car.v<-.1?'← ĐANG LÙI':car.v>.1?'ĐANG DI CHUYỂN →':'SẴN SÀNG KHỞI HÀNH';
  $('progress').style.width=car.routePosition/car.length*100+'%';
  $('time').textContent=fmt(car.time);$('errors').textContent=car.errors.length;$('stalls').textContent=car.stalls;
  $('pause').textContent=paused?'▶ Tiếp tục':'Ⅱ Tạm dừng';
  $('handbrake').textContent=car.handbrake?'Phanh tay · ĐANG GIỮ · H':'Phanh tay · ĐÃ NHẢ · H';
  $('handbrake').setAttribute('aria-pressed',String(car.handbrake));
  for(const panel of document.querySelectorAll('[data-pedal]')){
    const name=panel.dataset.pedal,value=Math.round(pedals.levels[name]*100);
    $(name+'-percent').textContent=value+'%';panel.querySelector('i').style.height=value+'%';
    panel.classList.toggle('held',value>0);
    const slider=panel.querySelector('input');
    if(Number(slider.value)!==value)slider.value=value;
    slider.disabled=paused;
  }
  for(const button of document.querySelectorAll('[data-adjust]')){
    const active=[...pedals.active.values()].some(item=>item.code===button.dataset.adjust);
    button.classList.toggle('active',active);button.disabled=paused;
  }
  for(const button of document.querySelectorAll('[data-gear]')){
    const active=Number(button.dataset.gear)===car.gear;
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
  }
  if(seen!==car.errors.length){
    seen=car.errors.length;$('log-count').textContent=seen+' SỰ KIỆN';
    $('logs').replaceChildren(...car.errors.slice(0,20).map(error=>{
      const entry=document.createElement('div'),title=document.createElement('b'),time=document.createElement('time'),detail=document.createElement('p');
      entry.className='log';title.textContent=error.title;time.textContent=fmt(error.time);detail.textContent=error.detail;
      entry.append(title,time,detail);return entry;
    }));
  }else if(!seen)$('log-count').textContent='0 SỰ KIỆN';
  coach();
}
function frame(now){
  const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  if(started&&playable()){pedals.step(dt);car.step(dt,pedals.levels)}
  if(now-lastPaint>=1000/30){
    lastPaint=now;render();
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(cockpitView)drawCockpit(ctx,w,h,car,routes);else drawExterior(ctx,w,h,car);
  }
  requestAnimationFrame(frame);
}
reset();requestAnimationFrame(frame);
