export const routes={
  basic:{name:'Làm quen côn số',segments:[[350,0],[220,.04],[180,0],[220,-.04],[350,0]]},
  hill:{name:'Khởi hành ngang dốc',segments:[[250,.08],[180,0],[350,.12],[220,-.06],[300,0]]},
  descent:{name:'Kiểm soát xuống dốc',segments:[[220,-.08],[380,-.12],[180,0],[280,.06],[240,0]]}
};
// Generic training car: consistent behaviour, not specifications of a real model.
const MASS=1250,RADIUS=.31,FINAL_DRIVE=4,INERTIA=.28;
const IDLE=850,REDLINE=6000,RPM_PER_RAD=60/(2*Math.PI);
const RATIOS={'-1':-3.4,0:0,1:3.6,2:2.1,3:1.4,4:1.05,5:.82};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const pedal=v=>typeof v==='number'&&Number.isFinite(v)?clamp(v,0,1):v===true?1:0;
const approach=(v,t,r,dt)=>v+clamp(t-v,-r*dt,r*dt);
export class Car{
  constructor(route='basic'){
    this.route=routes[route]?route:'basic';this.x=0;this.v=0;this.rpm=IDLE;this.gear=0;
    this.clutch=1;this.gas=0;this.brake=0;this.handbrake=false;
    this.running=true;this.stallTime=0;this.time=0;this.errors=[];this.cooldown={};
    this.finished=false;this.stalls=0;this.maxSpeed=0;
  }
  get length(){return routes[this.route].segments.reduce((a,[len])=>a+len,0)}
  get grade(){
    let p=Math.max(0,this.x);
    for(const [len,g] of routes[this.route].segments){if(p<len)return g;p-=len}
    return 0;
  }
  fault(code,title,detail){
    if(this.time-(this.cooldown[code]??-100)<5)return;
    this.cooldown[code]=this.time;this.errors.unshift({code,title,detail,time:this.time});
  }
  shift(n){
    if(!Number.isInteger(n)||!(n in RATIOS)||n===this.gear)return;
    if(this.clutch<.9){
      this.fault('clutch','Chưa đạp hết côn','Giữ A đến khi côn đạt 100%, rồi chọn số. Côn chưa ngắt nên mô phỏng chưa cho gài số.');return;
    }
    if((n===-1&&Math.abs(this.v)>.3)||(n>0&&this.v<-.3)){
      this.fault('reverse','Dừng xe trước khi đổi hướng','Đạp phanh cho xe dừng hẳn rồi mới chọn số lùi hoặc đổi sang số tiến.');return;
    }
    if(Math.abs(this.v*RATIOS[n]*FINAL_DRIVE/RADIUS)*RPM_PER_RAD>REDLINE){
      this.fault('downshift','Số quá thấp cho tốc độ hiện tại','Phanh giảm tốc trước khi về số. Bài tập chặn số này vì bánh xe có thể ép động cơ vượt giới hạn vòng tua.');return;
    }
    this.gear=n;
  }
  start(){
    if(this.running)return;
    if(this.clutch<.9&&this.gear!==0){
      this.fault('start','Đạp côn để khởi động','Giữ A hoặc về N trước khi bấm khởi động.');return;
    }
    this.running=true;this.rpm=IDLE;this.stallTime=0;
  }
  stall(){
    this.running=false;this.stalls++;
    const backward=this.gear!==0&&this.v*Math.sign(RATIOS[this.gear])<-.3;
    const reason=backward?'Xe đang trôi ngược chiều số đang gài; nhả côn khiến động cơ bị kéo ngược.':
      this.brake>.3||this.handbrake?'Xe bị giữ lại bằng phanh nhưng côn vẫn truyền lực, làm vòng tua tụt quá thấp.':
      this.gear>1?'Số đang chọn quá cao so với tốc độ và tải, khiến động cơ không đủ lực kéo.':
      'Côn bắt nhanh hơn mức lực kéo hiện có; cần thêm ga vừa đủ và nhả côn chậm hơn.';
    this.fault('stall','Động cơ đã tắt máy',reason+' Đạp hết côn, giữ phanh, khởi động lại rồi chọn số phù hợp.');
  }
  step(dt,input={}){
    if(this.finished||!Number.isFinite(dt)||dt<=0)return;
    // Substeps keep coupling stable across common display refresh rates.
    const duration=Math.min(dt,.1),count=Math.ceil(duration*240),h=duration/count;
    for(let i=0;i<count;i++)this.integrate(h,input);
    if(this.running&&this.rpm>5800)this.fault('rpm','Vòng tua quá cao','Nhả bớt ga và lên số khi phù hợp. Bộ giới hạn tua giảm lực kéo; nếu xuống dốc, cần phanh giảm tốc.');
    if(this.v<-.65&&this.gear>=0)this.fault('rollback','Xe đang trôi lùi','Giữ phanh để dừng xe. Dùng phanh tay khi đề-pa dốc, chọn số 1 rồi phối hợp côn và ga trước khi nhả phanh tay.');
    if(this.running&&this.gear>1&&this.rpm<1100&&this.gas>.35&&this.clutch<.3)this.fault('lug','Động cơ đang bị ì','Số hiện tại quá cao với tốc độ và tải. Đạp côn, về số thấp phù hợp rồi phối hợp ga và côn.');
    if(this.grade*this.v<-.15&&Math.abs(this.v)>5&&(this.gear===0||this.clutch>.9))this.fault('coast','Đang thả trôi xuống dốc','Về N hoặc giữ côn làm mất phanh động cơ. Chọn số phù hợp, nhả côn và dùng phanh để kiểm soát tốc độ.');
    if(this.x>=this.length){this.x=this.length;this.finished=true;this.v=0;}
  }
  integrate(dt,input){
    this.time+=dt;
    const target=pedal(input.clutch);
    this.clutch=approach(this.clutch,target,target>this.clutch?3.5:.65,dt);
    this.gas=approach(this.gas,pedal(input.gas),1.8,dt);
    this.brake=approach(this.brake,pedal(input.brake),3,dt);
    const ratio=RATIOS[this.gear]*FINAL_DRIVE;
    const coupling=ratio===0?0:clamp((.9-this.clutch)/.9,0,1);
    let omega=this.rpm/RPM_PER_RAD;
    const friction=18+.025*omega;
    // Idle support has limited torque; excessive load can still stall the engine.
    const idleTorque=clamp(friction+(IDLE-this.rpm)*.18,0,65);
    const torqueCurve=clamp(1-Math.max(0,this.rpm-3500)/6500,.35,1);
    const limiter=clamp((REDLINE-this.rpm)/250,0,1);
    const combustion=this.running?(idleTorque+this.gas*185*torqueCurve)*limiter:0;
    omega=Math.max(0,omega+(combustion-friction)*dt/INERTIA);
    this.v+=(-9.81*Math.sin(Math.atan(this.grade))-.0005*this.v*Math.abs(this.v))*dt;
    // Equal/opposite impulse transfers torque. Signed ratio handles wrong-way rolling.
    if(coupling>0){
      const slip=omega-this.v*ratio/RADIUS;
      const inverseInertia=1/INERTIA+ratio*ratio/(MASS*RADIUS*RADIUS);
      const capacity=280*coupling*coupling*dt;
      const impulse=clamp(slip/inverseInertia,-capacity,capacity);
      omega-=impulse/INERTIA;this.v+=impulse*ratio/(MASS*RADIUS);
    }
    const braking=(this.brake*9+(this.handbrake?7:0)+.12)*dt;
    this.v=approach(this.v,0,1,braking);
    if(this.running){
      this.stallTime=omega*RPM_PER_RAD<500?this.stallTime+dt:0;
      if(omega*RPM_PER_RAD<150||this.stallTime>.18)this.stall();
    }
    // Wheels may turn an engine without combustion; there is no automatic restart.
    this.rpm=Math.max(0,omega*RPM_PER_RAD);
    this.x+=this.v*dt;this.maxSpeed=Math.max(this.maxSpeed,Math.abs(this.v)*3.6);
  }
}
