import {Car,routes} from './physics.js';
import {drawCockpit} from './cockpit.js';
const $=id=>document.getElementById(id);let car=new Car(),paused=false,started=false,last=0,seen=0;const keys=new Set(),pointers=new Map();const input={clutch:false,brake:false,gas:false};
let heldClutch=null;
function syncInput(){
  for(const p of Object.keys(input))input[p]=keys.has(p)||[...pointers.values()].includes(p);
  if(input.clutch)heldClutch=null;
  else if(heldClutch!==null)input.clutch=heldClutch;
}
function release(){keys.clear();pointers.clear();heldClutch=null;syncInput()}
function reset(route=car.route){car=new Car(route);paused=false;started=false;seen=0;release();$('log-count').textContent='0 SỰ KIỆN';$('pause').textContent='Ⅱ Tạm dừng';$('logs').innerHTML='<p class="empty">✓ &nbsp; Chưa có lỗi. Chậm rãi để cảm nhận điểm bắt côn.</p>';$('overlay').hidden=true;$('scene-name').textContent=routes[route].name.toLocaleUpperCase('vi');document.querySelectorAll('[data-route]').forEach(b=>b.classList.toggle('selected',b.dataset.route===route));coach();render()}
function coach(){let title='Bắt đầu thật nhẹ nhàng.',text='Giữ A để đạp hết côn, nhấn 1 vào số. Giữ L thêm ga rồi nhả A từ từ để xe lăn bánh.';if(!car.running){title='Bình tĩnh, khởi động lại.';text='Giữ A + J để ngắt côn và giữ xe. Nhấn Enter khởi động, chọn số 1 rồi thử lại.'}else if(car.grade>.03){title='Giữ lực kéo trên dốc.';text='Bật phanh tay (H), chọn số 1, nhả phanh chân rồi thêm ga và nhả côn tới điểm bắt. Nhả phanh tay khi đủ lực kéo; nếu trôi, phanh dừng và thử lại.'}else if(car.grade<-.03){title='Để động cơ hỗ trợ phanh.';text='Chọn số thấp phù hợp, nhả côn để giữ phanh động cơ. Phối hợp J để kiểm soát tốc độ.'}else if(Math.abs(car.v)>2){title='Lắng nghe vòng tua.';text='Khi vòng tua tăng, nhả ga, đạp hết côn rồi lên số. Khi dừng, nhớ đạp côn trước khi động cơ bị ì.'}$('coach-title').textContent=title;$('coach-text').textContent=text}
function togglePause(){if(car.finished)return;paused=!paused;release();$('overlay').hidden=!paused;$('overlay-title').textContent='Một nhịp nghỉ.';$('overlay-text').textContent='Buổi tập được giữ nguyên. Tiếp tục khi bạn sẵn sàng.';$('resume').textContent='Tiếp tục';$('pause').textContent=paused?'▶ Tiếp tục':'Ⅱ Tạm dừng'}
const map={KeyA:'clutch',KeyJ:'brake',KeyL:'gas'};
function toggleHandbrake(){if(paused||car.finished||$('guide').open)return;car.handbrake=!car.handbrake;started=true;updateTrainingControls()}
function toggleClutchHold(){
  if(paused||car.finished||$('guide').open)return;
  keys.delete('clutch');
  for(const [id,pedal] of pointers)if(pedal==='clutch')pointers.delete(id);
  heldClutch=heldClutch===null?car.clutch:null;syncInput();started=true;updateTrainingControls();
}
window.addEventListener('keydown',event=>{
  if(!['KeyH','KeyS'].includes(event.code)||$('guide').open)return;
  event.preventDefault();if(event.repeat)return;
  if(event.code==='KeyH')toggleHandbrake();else toggleClutchHold();
});
window.addEventListener('keydown',e=>{if($('guide').open)return;if(map[e.code]||/^Digit[1-6]$/.test(e.code)||['KeyN','Enter','Space'].includes(e.code)){e.preventDefault();if(e.repeat)return;if(e.code==='Space'){togglePause();return}if(paused||car.finished)return;started=true;if(map[e.code])keys.add(map[e.code]);else if(e.code==='Enter')car.start();else car.shift(e.code==='KeyN'?0:e.code==='Digit6'?-1:Number(e.code.slice(-1)));syncInput();render()}});
window.addEventListener('keyup',e=>{if(map[e.code]){keys.delete(map[e.code]);syncInput()}});window.addEventListener('blur',()=>{release();if(started&&!paused&&!car.finished)togglePause()});document.addEventListener('visibilitychange',()=>{if(document.hidden){release();if(started&&!paused&&!car.finished)togglePause()}});
document.querySelectorAll('[data-pedal]').forEach(b=>{b.addEventListener('pointerdown',e=>{if(paused||car.finished)return;e.preventDefault();started=true;b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b.dataset.pedal);syncInput()});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{pointers.delete(e.pointerId);syncInput()})});
document.querySelectorAll('[data-gear]').forEach(b=>b.onclick=()=>{if(!paused&&!car.finished){started=true;car.shift(Number(b.dataset.gear));render()}});document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>reset(b.dataset.route));$('start').onclick=()=>{if(!paused&&!car.finished){started=true;car.start();render()}};$('reset').onclick=()=>reset();$('pause').onclick=togglePause;$('resume').onclick=()=>car.finished?reset():togglePause();$('help').onclick=()=>{if(!paused&&!car.finished)togglePause();$('guide').showModal()};$('close-help').onclick=()=>$('guide').close();
function fmt(t){return `${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`}
function render(){ $('rpm').textContent=Math.round(car.rpm).toLocaleString('en-US');$('rpm-bar').style.width=Math.min(100,car.rpm/80)+'%';$('rpm-bar').style.background=car.rpm>5800?'#cd8063':'#83a15f';$('speed').textContent=Math.round(Math.abs(car.v)*3.6);$('gear').textContent=car.gear===0?'N':car.gear===-1?'R':car.gear;$('engine').textContent=car.running?'● Động cơ đang chạy':'● Đã tắt máy';$('engine').style.color=car.running?'#74905e':'#bc6f4e';$('grade').innerHTML=(car.grade>0?'+':'')+Math.round(car.grade*100)+'<span>%</span>';$('grade-name').textContent=car.grade>0?'Đang lên dốc':car.grade<0?'Đang xuống dốc':'Đường bằng';$('distance').textContent=`${Math.round(car.x).toLocaleString('vi')} / ${car.length.toLocaleString('vi')} m`;$('direction').textContent=car.v<-.1?'← ĐANG LÙI':car.v>.1?'ĐANG DI CHUYỂN →':'SẴN SÀNG KHỞI HÀNH';$('progress').style.width=Math.max(0,car.x/car.length*100)+'%';$('time').textContent=fmt(car.time);$('errors').textContent=car.errors.length;$('stalls').textContent=car.stalls;document.querySelectorAll('[data-pedal]').forEach(b=>{let n=Math.round(car[b.dataset.pedal]*100);$(b.dataset.pedal+'-percent').textContent=n+'%';b.querySelector('i').style.height=n+'%';b.classList.toggle('held',input[b.dataset.pedal])});document.querySelectorAll('[data-gear]').forEach(b=>b.classList.toggle('active',Number(b.dataset.gear)===car.gear));if(seen!==car.errors.length){seen=car.errors.length;$('logs').innerHTML=car.errors.slice(0,20).map(e=>`<div class="log"><b>! &nbsp; ${e.title}</b><time>${fmt(e.time)}</time><p>${e.detail}</p></div>`).join('');$('log-count').textContent=seen+' SỰ KIỆN'}coach();if(car.finished){$('overlay').hidden=false;$('overlay-title').textContent='Hoàn thành chặng đường!';$('overlay-text').textContent=`${fmt(car.time)} · ${car.errors.length} lỗi thao tác · ${car.stalls} lần tắt máy. Tập lại để phối hợp mượt hơn.`;$('resume').textContent='Tập lại chặng này'}}
const canvas=$('road'),ctx=canvas.getContext('2d');function elevation(x){let y=0,p=x;if(x<0)return x*routes[car.route].segments[0][1];for(const [len,g]of routes[car.route].segments){y+=Math.min(p,len)*g;p-=Math.min(p,len);if(p<=0)break}return y}
function draw(){const w=canvas.clientWidth,h=canvas.clientHeight,dpr=devicePixelRatio||1;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#dce8e4');sky.addColorStop(1,'#f2f1dd');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);ctx.fillStyle='#f7f5dd';ctx.beginPath();ctx.arc(w*.72,h*.27,28,0,Math.PI*2);ctx.fill();for(let layer=0;layer<3;layer++){ctx.fillStyle=['#c6d6cd','#b2c8b7','#9eb79b'][layer];ctx.beginPath();ctx.moveTo(0,h);for(let x=0;x<=w+8;x+=8){let y=h*(.53+layer*.09)+Math.sin((x+car.x*(.08+layer*.08))/160+layer*2)*22+Math.sin(x/75+layer)*10;ctx.lineTo(x,y)}ctx.lineTo(w,h);ctx.fill()}
const cx=w*.37,base=h*.73,scale=1.8;const roadY=x=>base-(elevation(car.x+(x-cx)/scale)-elevation(car.x))*scale;ctx.fillStyle='#6f8a65';ctx.beginPath();ctx.moveTo(0,h);for(let x=0;x<=w+5;x+=5)ctx.lineTo(x,roadY(x)+25);ctx.lineTo(w,h);ctx.fill();ctx.beginPath();for(let x=0;x<=w+5;x+=5)ctx.lineTo(x,roadY(x));ctx.strokeStyle='#e4dfc5';ctx.lineWidth=41;ctx.stroke();ctx.strokeStyle='#64736a';ctx.lineWidth=34;ctx.stroke();ctx.setLineDash([21,19]);ctx.lineDashOffset=car.x*scale;ctx.strokeStyle='#c3cab8';ctx.lineWidth=1.5;ctx.stroke();ctx.setLineDash([]);
for(let i=-1;i<12;i++){const x=i*130-((car.x*scale)%130);const y=roadY(x)-24;ctx.fillStyle='#e8e9d7';ctx.fillRect(x,y-12,3,20);ctx.fillStyle='#6d8061';ctx.fillRect(x,y-12,3,6)}
ctx.save();ctx.translate(cx,base-5);ctx.rotate(-Math.atan(car.grade));ctx.fillStyle='#344b3b33';ctx.beginPath();ctx.ellipse(0,11,55,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#35473d';for(const x of [-32,32]){ctx.beginPath();ctx.arc(x,0,10,0,7);ctx.fill()}ctx.fillStyle='#c5cebd';for(const x of [-32,32]){ctx.beginPath();ctx.arc(x,0,5,0,7);ctx.fill()}ctx.fillStyle='#e6e8cf';ctx.beginPath();ctx.moveTo(-53,-6);ctx.lineTo(-52,-22);ctx.lineTo(-32,-26);ctx.lineTo(-18,-42);ctx.lineTo(15,-42);ctx.lineTo(34,-26);ctx.lineTo(51,-22);ctx.quadraticCurveTo(58,-19,56,-6);ctx.closePath();ctx.fill();ctx.fillStyle='#536f68';ctx.beginPath();ctx.moveTo(-26,-27);ctx.lineTo(-15,-38);ctx.lineTo(-3,-38);ctx.lineTo(-3,-27);ctx.fill();ctx.beginPath();ctx.moveTo(1,-38);ctx.lineTo(13,-38);ctx.lineTo(27,-27);ctx.lineTo(1,-27);ctx.fill();ctx.fillStyle='#fff6cd';ctx.fillRect(48,-19,8,5);ctx.fillStyle=car.brake>.1?'#ff6950':'#b98369';ctx.fillRect(-53,-19,5,6);ctx.strokeStyle='#a5b29b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-2,-25);ctx.lineTo(-2,-8);ctx.stroke();ctx.fillStyle='#96a48f';ctx.fillRect(2,-23,7,2);ctx.restore();}
let cockpitView=true;
const viewButton=document.createElement('button');
viewButton.id='view';viewButton.textContent='Góc nhìn: Khoang lái';
viewButton.setAttribute('aria-label','Đổi giữa khoang lái và góc nhìn bên ngoài');
document.querySelector('.scene-top').insertBefore(viewButton,$('pause'));
viewButton.onclick=()=>{cockpitView=!cockpitView;viewButton.textContent=cockpitView?'Góc nhìn: Khoang lái':'Góc nhìn: Bên ngoài'};
canvas.setAttribute('aria-label','Góc nhìn người ngồi trong khoang lái với hai tay trên vô-lăng, đường thẳng và địa hình dốc phía trước');
document.querySelector('.pedal-area .section-label span').textContent='GIỮ PHÍM / CHẠM GIỮ';
for(const button of document.querySelectorAll('[data-pedal]')){
  button.setAttribute('aria-label',`Giữ để đạp ${button.querySelector('span').textContent.toLowerCase()}`);
  button.addEventListener('contextmenu',event=>event.preventDefault());
}
// Shift on pointer-down so a second finger can select a gear while the first holds the clutch.
for(const button of document.querySelectorAll('[data-gear]')){
  button.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'||paused||car.finished)return;
    event.preventDefault();started=true;car.shift(Number(button.dataset.gear));render();
  });
}
const mobileHint=document.createElement('p');mobileHint.className='mobile-hint';
mobileHint.textContent='Giữ Côn → chọn số 1 → thêm Ga → thả Côn. Dùng “Giữ mức côn” để giữ điểm bắt. Đề-pa dốc: bật phanh tay trước, phối hợp côn–ga rồi nhả phanh tay.';
document.querySelector('.controls').before(mobileHint);
const trainingControls=document.createElement('div');trainingControls.className='training-controls';
const handbrakeButton=document.createElement('button');handbrakeButton.id='handbrake';handbrakeButton.onclick=toggleHandbrake;
const clutchHoldButton=document.createElement('button');clutchHoldButton.id='clutch-hold';clutchHoldButton.onclick=toggleClutchHold;
trainingControls.append(handbrakeButton,clutchHoldButton);document.querySelector('.controls').append(trainingControls);
function updateTrainingControls(){
  handbrakeButton.textContent=car.handbrake?'Phanh tay: ĐANG GIỮ · H':'Phanh tay: ĐÃ NHẢ · H';
  handbrakeButton.setAttribute('aria-pressed',String(car.handbrake));
  clutchHoldButton.textContent=heldClutch===null?'Giữ mức côn · S':`Đang giữ côn ${Math.round(heldClutch*100)}% · S để nhả`;
  clutchHoldButton.setAttribute('aria-pressed',String(heldClutch!==null));
}
function frame(t){
  const dt=last?Math.min((t-last)/1000,.05):0;last=t;
  if(started&&!paused&&!$('guide').open){car.step(dt,input);render()}
  updateTrainingControls();
  if(cockpitView){
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
    ctx.setTransform(dpr,0,0,dpr,0,0);drawCockpit(ctx,w,h,car,routes);
  }else draw();
  requestAnimationFrame(frame);
}
reset();requestAnimationFrame(frame);
