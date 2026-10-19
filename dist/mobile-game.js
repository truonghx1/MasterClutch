import {Car,routes} from './physics.js';
import {drawCockpit} from './cockpit.js';

const $=id=>document.getElementById(id);
const canvas=$('road'),ctx=canvas.getContext('2d');
const portrait=matchMedia('(orientation: portrait)');
const touches=new Map(),keys=new Set();
let car=new Car(),mode='welcome',heldClutch=null,lastFrame=0,lastPaint=0;
let seenErrors=0,noticeUntil=0;
car.handbrake=true;
const input={clutch:0,brake:0,gas:0};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

function syncInput(){
  for(const name of Object.keys(input)){
    input[name]=keys.has(name)?1:0;
    for(const touch of touches.values())if(touch.name===name)input[name]=Math.max(input[name],touch.value);
  }
  if(input.clutch>0)heldClutch=null;
  else if(heldClutch!==null)input.clutch=heldClutch;
}
function clearInput(){touches.clear();keys.clear();heldClutch=null;syncInput()}
function playable(){return mode==='playing'&&!portrait.matches&&!$('guide').open}
function feedback(title,detail,error=false){
  $('feedback-title').textContent=title;$('feedback-detail').textContent=detail;
  $('feedback').classList.toggle('error',error);
}
function normalFeedback(){
  if(!car.running)feedback('Đã tắt máy — khởi động lại','Giữ Côn + Phanh, chạm ⏻ rồi chọn số 1.',true);
  else if(car.handbrake)feedback('Phanh tay đang giữ xe','Giữ Côn → số 1 → thêm Ga → nhả Côn đến điểm bắt → nhả phanh tay.');
  else if(car.grade>.03)feedback('Lên dốc: giữ đủ lực kéo','Chọn số thấp phù hợp. Nếu trôi lùi, phanh dừng rồi đề-pa lại.');
  else if(car.grade<-.03)feedback('Xuống dốc: dùng phanh động cơ','Giữ số phù hợp, nhả Côn và dùng Phanh để kiểm soát tốc độ.');
  else feedback('Nhẹ ga, nhả côn từ từ','Khi dừng, đạp Côn trước khi vòng tua tụt quá thấp.');
}
function pause(){
  if(mode!=='playing')return;
  mode='paused';clearInput();$('paused').hidden=false;
  $('pause-title').textContent='Đã tạm dừng';$('pause-detail').textContent='Xe được giữ nguyên. Chạm Tiếp tục khi bạn sẵn sàng.';
  $('resume').textContent='Tiếp tục';$('pause').textContent='▶';render();
}
function resume(){
  if(portrait.matches||$('guide').open)return;
  clearInput();mode='playing';lastFrame=0;$('paused').hidden=true;$('welcome').hidden=true;$('pause').textContent='Ⅱ';render();
}
function reset(){
  car=new Car($('route').value);car.handbrake=true;seenErrors=0;noticeUntil=0;
  clearInput();$('logs').textContent='Chưa có lỗi.';$('paused').hidden=true;
  mode='welcome';$('welcome').hidden=false;$('pause').textContent='Ⅱ';render();
}
function orientationChanged(){
  $('rotate').hidden=!portrait.matches;
  if(portrait.matches)pause();
  clearInput();lastFrame=0;
}
if(portrait.addEventListener)portrait.addEventListener('change',orientationChanged);
else portrait.addListener(orientationChanged);
window.addEventListener('blur',()=>{clearInput();pause()});
window.addEventListener('pagehide',()=>{clearInput();pause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause()}});
window.addEventListener('resize',()=>{lastFrame=0});

// Actions fire on contact, including when a different finger is holding a pedal.
// The click fallback is reserved for keyboard/assistive activation (detail === 0).
function action(button,fn){
  button.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    event.preventDefault();fn();
  });
  button.addEventListener('click',event=>{if(event.detail===0)fn()});
  button.addEventListener('contextmenu',event=>event.preventDefault());
}
for(const button of document.querySelectorAll('[data-pedal]')){
  button.addEventListener('pointerdown',event=>{
    if(!playable()||event.button!==0)return;
    event.preventDefault();
    const name=button.dataset.pedal;
    touches.set(event.pointerId,{name,startY:event.clientY,value:name==='gas'?.4:1});
    try{button.setPointerCapture(event.pointerId)}catch{/* Global release listeners also clear the finger. */}
    syncInput();render();
  });
  button.addEventListener('pointermove',event=>{
    const touch=touches.get(event.pointerId);
    if(!touch||touch.name!=='gas')return;
    event.preventDefault();touch.value=clamp(.4+(touch.startY-event.clientY)/100,0,1);syncInput();
  });
  button.addEventListener('lostpointercapture',event=>{touches.delete(event.pointerId);syncInput()});
  button.addEventListener('contextmenu',event=>event.preventDefault());
}
function lift(event){touches.delete(event.pointerId);syncInput()}
window.addEventListener('pointerup',lift);
window.addEventListener('pointercancel',lift);
for(const button of document.querySelectorAll('[data-gear]'))action(button,()=>{
  if(playable()){car.shift(Number(button.dataset.gear));render()}
});
function handbrake(){if(playable()){car.handbrake=!car.handbrake;render()}}
function holdClutch(){
  if(!playable())return;
  keys.delete('clutch');for(const [id,touch] of touches)if(touch.name==='clutch')touches.delete(id);
  heldClutch=heldClutch===null?car.clutch:null;syncInput();render();
}
action($('handbrake'),handbrake);action($('clutch-hold'),holdClutch);
action($('start'),()=>{if(playable()){car.start();render()}});
action($('pause'),()=>mode==='paused'?resume():pause());
action($('restart'),reset);
action($('resume'),()=>mode==='complete'?reset():resume());
$('route').addEventListener('change',reset);

async function fullscreen(){
  if(document.fullscreenElement){try{await document.exitFullscreen()}catch{}return}
  // Best effort only: Safari/iPhone may disallow fullscreen and orientation locking.
  try{
    if(!document.documentElement.requestFullscreen)return;
    await document.documentElement.requestFullscreen();
    if(screen.orientation?.lock)await screen.orientation.lock('landscape');
  }catch{/* Manual rotation and normal browser mode remain fully playable. */}
}
action($('fullscreen'),fullscreen);action($('rotate-fullscreen'),fullscreen);
action($('play'),()=>{resume()});
function help(){pause();clearInput();if(!$('guide').open)$('guide').showModal()}
action($('help'),help);action($('feedback-more'),help);
action($('close-help'),()=>$('guide').close());
$('guide').addEventListener('close',()=>{clearInput();lastFrame=0});

const keyboard={KeyA:'clutch',KeyJ:'brake',KeyL:'gas'};
window.addEventListener('keydown',event=>{
  if(['SELECT','INPUT','TEXTAREA','BUTTON'].includes(event.target.tagName)||$('guide').open)return;
  if(keyboard[event.code]){
    event.preventDefault();if(playable()){keys.add(keyboard[event.code]);syncInput()}return;
  }
  if(event.repeat)return;
  if(event.code==='Space'){event.preventDefault();mode==='paused'?resume():pause();return}
  if(!playable())return;
  if(/^Digit[1-6]$/.test(event.code))car.shift(event.code==='Digit6'?-1:Number(event.code.slice(-1)));
  if(event.code==='KeyN')car.shift(0);
  if(event.code==='KeyH')handbrake();if(event.code==='KeyS')holdClutch();if(event.code==='Enter')car.start();
});
window.addEventListener('keyup',event=>{if(keyboard[event.code]){keys.delete(keyboard[event.code]);syncInput()}});

function render(){
  $('rpm').textContent=Math.round(car.rpm).toLocaleString('en-US');
  $('rpm-bar').style.width=Math.min(100,car.rpm/60)+'%';
  $('rpm-bar').style.background=car.rpm>5800?'#ffb08a':'#cfeda1';
  $('speed').textContent=Math.round(Math.abs(car.v)*3.6);
  $('gear').textContent=car.gear===0?'N':car.gear===-1?'R':car.gear;
  $('grade').textContent=(car.grade>0?'+':'')+Math.round(car.grade*100)+'%';
  $('engine').textContent=car.running?'● Máy đang chạy':'● ĐÃ TẮT MÁY';
  $('distance').textContent=(car.v<-.1?'← ':'')+Math.round(car.x)+' / '+car.length+' m';
  $('time').textContent=Math.floor(car.time/60).toString().padStart(2,'0')+':'+Math.floor(car.time%60).toString().padStart(2,'0');
  $('fault-count').textContent=car.errors.length+' lỗi';
  $('progress').style.width=clamp(car.x/car.length*100,0,100)+'%';
  for(const button of document.querySelectorAll('[data-pedal]')){
    const name=button.dataset.pedal,value=Math.round(car[name]*100);
    $(name+'-percent').textContent=value+'%';button.querySelector('i').style.width=value+'%';
    button.classList.toggle('held',input[name]>0);button.setAttribute('aria-pressed',String(input[name]>0));
  }
  for(const button of document.querySelectorAll('[data-gear]')){
    const selected=Number(button.dataset.gear)===car.gear;
    button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
  }
  $('handbrake').textContent=car.handbrake?'Phanh tay · ĐANG GIỮ':'Phanh tay · ĐÃ NHẢ';
  $('handbrake').setAttribute('aria-pressed',String(car.handbrake));
  $('clutch-hold').textContent=heldClutch===null?'Giữ mức côn':`Giữ ${Math.round(heldClutch*100)}% · Nhả`;
  $('clutch-hold').setAttribute('aria-pressed',String(heldClutch!==null));
  if(seenErrors!==car.errors.length){
    seenErrors=car.errors.length;noticeUntil=car.time+8;
    const error=car.errors[0];feedback(error.title,error.detail,true);
    $('logs').replaceChildren(...car.errors.slice(0,30).map(error=>{
      const article=document.createElement('article'),title=document.createElement('b'),detail=document.createElement('p');
      title.textContent=error.title;detail.textContent=error.detail;article.append(title,detail);return article;
    }));
  }else if(car.time>=noticeUntil)normalFeedback();
}
function frame(now){
  const dt=lastFrame?Math.min((now-lastFrame)/1000,.05):0;lastFrame=now;
  if(playable()){
    car.step(dt,input);
    if(car.finished){
      mode='complete';clearInput();$('paused').hidden=false;
      $('pause-title').textContent='Hoàn thành chặng đường!';
      $('pause-detail').textContent=`${car.errors.length} lỗi thao tác · ${car.stalls} lần tắt máy. Tập lại để phối hợp mượt hơn.`;
      $('resume').textContent='Tập lại';
    }
  }
  // Render at most 30 times per second, with capped canvas resolution for mobile GPUs.
  if(now-lastPaint>=1000/30){
    lastPaint=now;render();
    if(!portrait.matches){
      const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,1.5);
      if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
      ctx.setTransform(dpr,0,0,dpr,0,0);drawCockpit(ctx,w,h,car,routes);
    }
  }
  requestAnimationFrame(frame);
}
orientationChanged();render();requestAnimationFrame(frame);
