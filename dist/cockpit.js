// First-person cockpit, drawn locally so it stays sharp on phones and works offline.
export function drawCockpit(ctx, w, h, car, routes) {
  const polygon = (points, fill) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    ctx.closePath(); ctx.fill();
  };
  const ellipse = (x,y,rx,ry,color) => {
    ctx.fillStyle=color; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill();
  };
  const line = (points, color, width) => {
    ctx.strokeStyle=color; ctx.lineWidth=width; ctx.lineCap='round';ctx.beginPath();
    points.forEach(([x,y], i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
  };
  const elevation = x => {
    if(x<0)return x*routes[car.route].segments[0][1];
    let result=0;
    for(const [length, grade] of routes[car.route].segments){
      const distance=Math.min(x,length);result+=distance*grade;x-=distance;if(x<=0)break;
    }
    return result;
  };
  const sky=ctx.createLinearGradient(0,0,0,h*.75);
  sky.addColorStop(0,'#a9c8ce');sky.addColorStop(1,'#edf0d8');
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  ellipse(w*.74,h*.24,h*.055,h*.055,'#fbefca');
  for(let layer=0;layer<3;layer++){
    const points=[[0,h*.75]];
    for(let x=0;x<=w+10;x+=10)points.push([x,h*(.4+layer*.055)+Math.sin(x/w*8+layer*2)*h*.045]);
    points.push([w,h*.75]);polygon(points,['#a6beb4','#8ca996','#73937b'][layer]);
  }
  const horizon=h*(.4+car.grade*.65), near=h*.78, center=w*.5;
  const currentElevation=elevation(car.x);
  const project=z=>{
    const perspective=4/(z+4);
    const relative=elevation(car.x+z)-currentElevation-car.grade*z;
    return {y:horizon+(near-horizon)*perspective-relative*h*.055*perspective,half:w*.65*perspective};
  };
  // Draw far-to-near strips: stripe travel reverses naturally when the car rolls back.
  for(let z=240;z>0;z-=2){
    const far=project(z),close=project(Math.max(0,z-2));
    polygon([[0,far.y],[w,far.y],[w,close.y],[0,close.y]],Math.floor((car.x+z)/9)%2?'#81996b':'#89a273');
    polygon([[center-far.half*1.05,far.y],[center+far.half*1.05,far.y],[center+close.half*1.05,close.y],[center-close.half*1.05,close.y]],'#d8d9bf');
    polygon([[center-far.half,far.y],[center+far.half,far.y],[center+close.half,close.y],[center-close.half,close.y]],'#68736d');
    if(((Math.floor((car.x+z)/5)%2)+2)%2===0)polygon([[center-far.half*.012,far.y],[center+far.half*.012,far.y],[center+close.half*.012,close.y],[center-close.half*.012,close.y]],'#eee8c8');
  }
  // Windshield pillars, mirror and dashboard.
  polygon([[0,0],[w*.07,0],[w*.15,h*.73],[0,h]],'#263a35');
  polygon([[w,0],[w*.93,0],[w*.85,h*.73],[w,h]],'#263a35');
  polygon([[0,0],[w,0],[w*.94,h*.055],[w*.06,h*.055]],'#263a35');
  line([[w*.52,h*.045],[w*.52,h*.105]],'#263a35',8);
  ctx.fillStyle='#293b35';ctx.fillRect(w*.43,h*.08,w*.18,h*.09);
  ctx.fillStyle='#b6c9bc';ctx.fillRect(w*.438,h*.09,w*.164,h*.065);
  polygon([[w*.5,h*.155],[w*.54,h*.155],[w*.525,h*.11],[w*.515,h*.11]],'#7b8c7b');
  polygon([[0,h*.72],[w*.2,h*.67],[w*.8,h*.67],[w,h*.72],[w,h],[0,h]],'#263631');
  line([[w*.12,h*.72],[w*.88,h*.72]],'#728078',2);
  // Instrument hood visible through the wheel.
  ellipse(w*.35,h*.79,w*.14,h*.075,'#182721');
  for(const [x,value,max] of [[w*.29,car.rpm,8000],[w*.41,Math.abs(car.v)*3.6,160]]){
    const radius=Math.min(w*.045,h*.043);
    ellipse(x,h*.77,radius,radius,'#344b41');
    ctx.strokeStyle='#b6c6a5';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,h*.77,radius*.8,Math.PI*.8,Math.PI*2.2);ctx.stroke();
    const angle=Math.PI*.8+Math.min(1,value/max)*Math.PI*1.4;
    line([[x,h*.77],[x+Math.cos(angle)*radius*.7,h*.77+Math.sin(angle)*radius*.7]],'#d8e6aa',2);
  }
  const cx=w*.35,cy=h*.88,r=Math.min(w*.16,h*.19);
  ctx.strokeStyle='#111f1b';ctx.lineWidth=r*.17;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#6a7971';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,r*.96,Math.PI,Math.PI*2);ctx.stroke();
  line([[cx-r*.9,cy],[cx,cy+r*.12],[cx+r*.9,cy]],'#3e5147',r*.15);
  line([[cx,cy],[cx,cy+r*.92]],'#3e5147',r*.16);
  ellipse(cx,cy,r*.33,r*.23,'#34483d');
  // Driver sleeves, forearms and hands holding the steering wheel.
  for(const side of [-1,1]){
    const handX=cx+side*r*.88,handY=cy-r*.25;
    line([[cx+side*r*1.35,h*1.06],[cx+side*r*1.15,cy+r*.35]],'#879b87',r*.39);
    line([[cx+side*r*1.15,cy+r*.35],[handX,handY]],'#c99778',r*.29);
    ellipse(handX,handY,r*.17,r*.25,'#dfb091');
    for(let i=0;i<3;i++)line([[handX-side*r*.09,handY-r*.12+i*r*.1],[handX+side*r*.07,handY-r*.12+i*r*.1]],'#bc896f',1);
  }
  ctx.fillStyle='#172721';ctx.fillRect(w*.61,h*.77,w*.2,h*.1);
  ctx.fillStyle='#c8d8b4';ctx.font=`500 ${Math.max(10,h*.027)}px sans-serif`;ctx.textAlign='center';
  ctx.fillText(car.running?'CLUTCH / DRIVING LAB':'ĐÃ TẮT MÁY',w*.71,h*.83);
  line([[w*.72,h],[w*.72,h*.93]],'#9ca69c',7);
  ellipse(w*.72,h*.92,h*.035,h*.026,'#14251e');
  ctx.fillStyle='#d9e4c7';ctx.font=`bold ${Math.max(12,h*.035)}px sans-serif`;
  ctx.fillText(car.gear===0?'N':car.gear===-1?'R':String(car.gear),w*.72,h*.932);
}
