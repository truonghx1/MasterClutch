const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// Four-cylinder, four-stroke engine: two combustion pulses per crank revolution.
// Pitch follows the physics RPM, including free revving with the clutch depressed.
export function engineVoice(car){
  const rpm=clamp(car.rpm,0,9000),throttle=clamp(car.gas,0,1);
  const connected=car.gear!==0&&car.clutch<.9;
  const load=connected?clamp((car.clutchTorque||0)/185,0,1):0;
  const braking=connected?clamp(-(car.clutchTorque||0)/100,0,1)*(1-throttle):0;
  const lug=connected?clamp((1150-rpm)/650,0,1)*clamp(load*2,0,1):0;
  const firing=car.running&&rpm>0;
  return {
    frequency:Math.max(5,rpm/30),
    exhaust:firing?.12+throttle*.12+load*.15+braking*.035:0,
    intake:firing?.008+throttle*.055+load*.025:0,
    mechanical:firing?.018+rpm/9000*.025:0,
    cutoff:450+rpm*.32+throttle*1100+load*500,
    roughness:firing?.008+lug*.15:0,
    pulseRate:7+rpm/600,
    // A soft flutter near the physics limiter makes held full throttle audible.
    limiter:firing?clamp((rpm-5750)/250,0,1)*throttle*.55:0
  };
}

export class EngineAudio{
  constructor(){
    this.Context=globalThis.AudioContext||globalThis.webkitAudioContext;
    this.supported=!!this.Context;this.enabled=true;this.active=false;
    this.context=null;this.audible=false;this.suspendTimer=null;
  }
  createGraph(){
    const ctx=this.context=new this.Context();
    const gain=value=>{const node=ctx.createGain();node.gain.value=value;return node};
    this.master=gain(0);
    const compressor=ctx.createDynamicsCompressor();
    compressor.threshold.value=-14;compressor.knee.value=12;compressor.ratio.value=4;
    compressor.attack.value=.008;compressor.release.value=.15;
    compressor.connect(this.master);this.master.connect(ctx.destination);

    this.exhaust=gain(0);this.intake=gain(0);this.mechanical=gain(0);
    this.filter=ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.Q.value=.7;
    this.exhaust.connect(this.filter);this.filter.connect(compressor);
    this.intake.connect(compressor);this.mechanical.connect(compressor);

    this.engine=ctx.createOscillator();
    const real=new Float32Array(33),imag=new Float32Array(33);
    for(let i=1;i<imag.length;i++)imag[i]=1/Math.pow(i,1.15);
    this.engine.setPeriodicWave(ctx.createPeriodicWave(real,imag));
    this.engine.connect(this.exhaust);this.engine.start();
    this.crank=ctx.createOscillator();this.crank.type='triangle';
    this.crank.connect(this.mechanical);this.crank.start();

    // A reusable filtered noise bed adds intake/combustion texture, without samples.
    const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;
    this.intakeFilter=ctx.createBiquadFilter();this.intakeFilter.type='bandpass';this.intakeFilter.Q.value=.6;
    noise.connect(this.intakeFilter);this.intakeFilter.connect(this.intake);noise.start();

    this.pulse=ctx.createOscillator();this.pulse.type='sine';
    this.roughness=gain(0);this.pitchWobble=gain(0);
    this.pulse.connect(this.roughness);this.roughness.connect(this.exhaust.gain);
    this.pulse.connect(this.pitchWobble);this.pitchWobble.connect(this.engine.detune);
    this.pulse.start();
    this.limiter=ctx.createOscillator();this.limiter.frequency.value=24;
    this.limiterDepth=gain(0);this.limiter.connect(this.limiterDepth);
    this.limiterDepth.connect(this.exhaust.gain);this.limiter.start();
  }
  smooth(param,value,seconds=.045){param.setTargetAtTime(value,this.context.currentTime,seconds)}
  unlock(){
    if(!this.supported||!this.enabled||!this.active)return;
    try{
      if(!this.context)this.createGraph();
      // Must also be called from pointerup/keydown, so mobile autoplay can unlock.
      if(this.context.state!=='running')this.context.resume().catch(()=>{});
      this.syncPlayback();
    }catch{
      this.supported=false;
      if(this.context)this.context.close().catch(()=>{});
    }
  }
  setEnabled(enabled){this.enabled=enabled;this.syncPlayback()}
  setActive(active){this.active=active;this.syncPlayback()}
  syncPlayback(){
    if(!this.context||!this.supported)return;
    const audible=this.active&&this.enabled;
    if(audible===this.audible)return;
    this.audible=audible;clearTimeout(this.suspendTimer);
    this.smooth(this.master.gain,audible?.65:0,.018);
    if(audible){
      this.context.resume().catch(()=>{});
    }else{
      // Fade before suspending to avoid clicks; resume cancels the pending suspend.
      this.suspendTimer=setTimeout(()=>{
        if(!this.audible)this.context.suspend().catch(()=>{});
      },160);
    }
  }
  update(car,active){
    this.setActive(active);
    if(!this.context||!this.supported||!this.audible)return;
    const voice=engineVoice(car);
    this.smooth(this.engine.frequency,voice.frequency,.025);
    this.smooth(this.crank.frequency,voice.frequency/2,.025);
    this.smooth(this.exhaust.gain,voice.exhaust);
    this.smooth(this.intake.gain,voice.intake);
    this.smooth(this.mechanical.gain,voice.mechanical);
    this.smooth(this.filter.frequency,voice.cutoff);
    this.smooth(this.intakeFilter.frequency,voice.cutoff*.8);
    this.smooth(this.pulse.frequency,voice.pulseRate);
    this.smooth(this.roughness.gain,voice.roughness);
    this.smooth(this.pitchWobble.gain,voice.roughness*180);
    this.smooth(this.limiterDepth.gain,voice.limiter*voice.exhaust);
  }
}

export function attachEngineAudio(button,isActive){
  const audio=new EngineAudio();
  function label(){
    button.textContent=audio.enabled?'🔊':'🔇';
    button.disabled=!audio.supported;
    const title=!audio.supported?'Trình duyệt chưa hỗ trợ âm thanh':audio.enabled?'Tắt âm thanh động cơ':'Bật âm thanh động cơ';
    button.title=title;button.setAttribute('aria-label',title);
    button.setAttribute('aria-pressed',String(audio.enabled&&audio.supported));
  }
  function unlock(){
    audio.setActive(isActive()&&!document.hidden);audio.unlock();label();
  }
  button.addEventListener('click',()=>{audio.setEnabled(!audio.enabled);unlock()});
  button.addEventListener('keydown',event=>{
    if(event.code==='Space'||event.code==='Enter')event.stopPropagation();
  });
  // Do not prevent pointerup: pedals use pointer capture and multi-touch.
  for(const event of ['pointerdown','pointerup','keydown','click'])window.addEventListener(event,unlock);
  window.addEventListener('blur',()=>audio.setActive(false));
  window.addEventListener('pagehide',()=>audio.setActive(false));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.setActive(false)});
  label();return audio;
}
