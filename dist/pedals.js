export const pedalKeys={KeyQ:['clutch',1],KeyA:['clutch',-1],KeyI:['brake',1],KeyK:['brake',-1],KeyO:['gas',1],KeyL:['gas',-1]};
const clamp=value=>Math.max(0,Math.min(1,value));
const TAP=.02,RATE=.2,DELAY=.25;

// Input is based on elapsed time, never the operating system's key repeat rate.
export class PedalControls{
  constructor(){this.active=new Map();this.levels={clutch:1,brake:0,gas:0}}
  press(code,source=code){
    if(!pedalKeys[code]||this.active.has(source))return;
    const [name,direction]=pedalKeys[code];
    const alreadyActive=[...this.active.values()].some(item=>pedalKeys[item.code][0]===name);
    this.active.set(source,{code,elapsed:0});
    if(!alreadyActive)this.levels[name]=clamp(this.levels[name]+direction*TAP);
  }
  lift(source){this.active.delete(source)}
  release(){this.active.clear()}
  reset(){this.release();Object.assign(this.levels,{clutch:1,brake:0,gas:0})}
  set(name,value){if(name in this.levels&&Number.isFinite(value))this.levels[name]=clamp(value)}
  step(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    const directions={clutch:new Map(),brake:new Map(),gas:new Map()};
    for(const item of this.active.values()){
      const [name,direction]=pedalKeys[item.code],before=item.elapsed;
      item.elapsed+=dt;
      const duration=Math.max(0,item.elapsed-DELAY)-Math.max(0,before-DELAY);
      directions[name].set(direction,Math.max(directions[name].get(direction)||0,duration));
    }
    for(const [name,active] of Object.entries(directions)){
      if(active.size!==1)continue; // Opposite keys cancel; duplicate sources do not double the speed.
      const [[direction,duration]]=active;
      this.levels[name]=clamp(this.levels[name]+direction*RATE*duration);
    }
  }
}
