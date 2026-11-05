// Draw remote movement a little behind server time, between two real samples.
// A small, bounded prediction bridges a late packet without drifting indefinitely.
export class RemoteMotion {
  constructor({delay=120,maxPrediction=80}={}) {
    this.delay=delay;this.maxPrediction=maxPrediction;this.samples=[];this.offset=null;this.clock=null;this.offsets=[];this.targetOffset=null;this.lastRender=null;this.display=null;this.speed=4.5;this.speeds=[];
  }
  push(state,serverNow=Date.now(),receivedAt=performance.now()) {
    const sourceClock=Number.isFinite(state.sampleTime),clock=sourceClock?'source':'server';
    if(this.clock!==clock){this.clock=clock;this.samples=[];this.offset=null;this.offsets=[];this.lastRender=null;this.display=null;this.speed=4.5;this.speeds=[];}
    const time=sourceClock?state.sampleTime:(state.updatedAt??serverNow);
    const offset=receivedAt-(sourceClock?time:serverNow),last=this.samples.at(-1);
    if(last&&time<last.time)return false;
    if(last&&time===last.time&&state.x===last.x&&state.z===last.z&&state.rotation===last.rotation&&state.moving===last.moving&&state.seatId===last.seatId)return false;
    // A stale standing snapshot is not a useful clock measurement on resuming movement.
    if(last&&!last.moving&&time-last.time>1000){this.offset=null;this.offsets=[];this.lastRender=null;this.display=null;this.speed=4.5;this.speeds=[];}
    this.offsets.push(offset);if(this.offsets.length>20)this.offsets.shift();
    this.targetOffset=Math.min(...this.offsets);
    if(this.offset===null)this.offset=this.targetOffset;
    if(last&&(last.seatId!==state.seatId||Math.hypot(state.x-last.x,state.z-last.z)>6)){this.samples=[];this.display=null;this.speed=4.5;this.speeds=[];}
    else if(last&&!last.moving&&state.moving&&time-last.time>200)this.samples.push({...last,time:time-50});
    const previous=this.samples.at(-1);
    if(previous&&time>previous.time){const speed=Math.hypot(state.x-previous.x,state.z-previous.z)*1000/(time-previous.time);if(speed>.01){this.speeds.push(Math.min(8.5,speed));if(this.speeds.length>6)this.speeds.shift();this.speed=Math.max(...this.speeds);}}
    if(this.samples.at(-1)?.time===time)this.samples.pop();
    this.samples.push({time,x:state.x,z:state.z,rotation:state.rotation,moving:state.moving,seatId:state.seatId});
    while(this.samples.length>32)this.samples.shift();
    return true;
  }
  sample(now=performance.now(),out={}) {
    const points=this.samples;if(!points.length)return null;
    // Retiming must not turn a network burst into a visible position jump.
    const elapsed=this.lastRender===null?0:Math.max(0,now-this.lastRender);this.lastRender=now;
    const correction=Math.max(-elapsed*.25,Math.min(elapsed*.25,this.targetOffset-this.offset));
    this.offset+=correction;
    const time=now-this.offset-this.delay;
    let a=points[0],b=null;
    for(let i=1;i<points.length;i++){
      if(points[i].time>time){b=points[i];break;}a=points[i];
    }
    Object.assign(out,a);
    if(b&&time>=a.time){
      const ratio=Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time)));
      out.x=a.x+(b.x-a.x)*ratio;out.z=a.z+(b.z-a.z)*ratio;
      out.moving=a.moving||(b.moving&&ratio>0);
      out.rotation=a.rotation+Math.atan2(Math.sin(b.rotation-a.rotation),Math.cos(b.rotation-a.rotation))*ratio;
    }else if(a===points.at(-1)&&a.moving&&!a.seatId&&points.length>1){
      const previous=points.at(-2),interval=a.time-previous.time,age=Math.max(0,time-a.time);
      if(interval>0){
        const dx=(a.x-previous.x)/interval,dz=(a.z-previous.z)/interval;
        const limit=Math.min(1,.0085/Math.max(.0085,Math.hypot(dx,dz)));
        const predict=Math.min(age,this.maxPrediction);
        out.x+=dx*limit*predict;out.z+=dz*limit*predict;
      }
      if(age>=this.maxPrediction)out.moving=false;
    }
    out.x=Math.max(-46,Math.min(46,out.x));out.z=Math.max(-46,Math.min(46,out.z));
    if(this.display&&elapsed>0){
      const dx=out.x-this.display.x,dz=out.z-this.display.z,length=Math.hypot(dx,dz),limit=this.speed*1.25*elapsed/1000+1e-7;
      if(length>limit){out.x=this.display.x+dx/length*limit;out.z=this.display.z+dz/length*limit;out.moving=true;}
    }
    this.display={x:out.x,z:out.z};out.renderedAt=now;return out;
  }
}
