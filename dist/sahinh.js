// Practice milestones, deliberately separate from official driving-test rules.
export const exercises={
  bridge:{title:'Dừng và khởi hành trên dốc cầu',description:'Lên dốc 10%, dừng trong vùng 43–47 m và giữ phanh 2 giây. Đề-pa lại, không trôi lùi quá 0,5 m, rồi qua cầu tới mốc 195 m.',markers:[[43,'DỪNG TRÊN DỐC'],[47,'HẾT VÙNG DỪNG'],[195,'ĐÍCH']]},
  acceleration:{title:'Tăng tốc trên đường thẳng',description:'Khởi hành số 1, lần lượt lên số 2 rồi số 3. Đạt ít nhất 25 km/h trong đoạn 60–140 m, sau đó giảm tốc và dừng trong vùng 190–205 m.',markers:[[60,'TĂNG TỐC ≥25 km/h · SỐ 3'],[140,'GIẢM TỐC'],[190,'VÙNG DỪNG'],[205,'HẾT VÙNG DỪNG']]}
};
export class Exercise{
  constructor(route){this.route=route;this.phase='approach';this.hold=0;this.peak=0;this.lastTime=0;this.done=false;this.passed=false;this.reason='';this.second=false;this.third=false;this.stalls=0}
  finish(passed,reason){this.done=true;this.passed=passed;this.reason=reason}
  update(car){
    if(this.done)return;
    const dt=Math.max(0,car.time-this.lastTime);this.lastTime=car.time;
    if(car.stalls>this.stalls){this.finish(false,'Động cơ tắt máy. Tập lại và phối hợp côn, ga chậm hơn.');return}
    if(car.x< -1){this.finish(false,'Xe trôi lùi khỏi điểm xuất phát.');return}
    if(this.route==='bridge'){
      if(this.phase==='approach'){
        if(car.x>47){this.finish(false,'Đã vượt vùng dừng trên dốc 43–47 m.');return}
        this.hold=car.x>=43&&Math.abs(car.v)<.1&&(car.handbrake||car.brake>.2)?this.hold+dt:0;
        if(this.hold>=2){this.phase='launch';this.peak=car.x}
      }else{
        this.peak=Math.max(this.peak,car.x);
        if(this.peak-car.x>.5){this.finish(false,'Xe trôi lùi quá 0,5 m sau khi dừng trên dốc.');return}
        if(car.x>=85)this.phase='cross';
        if(car.x>=195)this.finish(true,'Đã dừng đúng vùng, đề-pa và qua cầu không trôi lùi quá 0,5 m.');
      }
    }else{
      if(car.gear===2)this.second=true;
      if(this.second&&car.gear===3)this.third=true;
      if(this.phase==='approach'&&car.x>=60&&car.x<=140&&car.v*3.6>=25&&car.gear===3&&this.third&&car.clutch<.2)this.phase='stop';
      if(this.phase==='approach'&&car.x>140){this.finish(false,'Chưa đạt 25 km/h ở số 3 trong vùng 60–140 m.');return}
      if(this.phase==='stop'&&car.x>=190&&car.x<=205&&Math.abs(car.v)<.1&&(car.brake>.2||car.handbrake))this.finish(true,'Đã tăng tốc qua số 2, số 3 và dừng đúng vùng.');
      if(car.x>205)this.finish(false,'Đã vượt vùng dừng 190–205 m.');
    }
  }
  get hint(){
    if(this.route==='bridge'){
      if(this.phase==='approach')return [`Dừng trên dốc · 43–47 m · ${Math.min(2,this.hold).toFixed(1)}/2 s`,`Giữ xe bằng phanh 2 giây (${Math.min(2,this.hold).toFixed(1)}/2 s). Đạp hết côn khi gần dừng.`];
      if(this.phase==='launch')return ['Đề-pa lên cầu','Số 1, thêm ga, tìm điểm bắt côn rồi nhả phanh tay. Không trôi lùi quá 0,5 m.'];
      return ['Qua cầu · đích 195 m','Giảm ga, chọn số phù hợp và kiểm soát phanh khi xuống cầu.'];
    }
    return this.phase==='approach'?['Tăng tốc · 60–140 m','Số 1 → 2 → 3; nhả côn, đạt ít nhất 25 km/h ở số 3 trong vùng.']:['Giảm tốc · dừng 190–205 m','Nhả ga, phanh giảm tốc; đạp hết côn khi gần dừng để tránh tắt máy.'];
  }
}
