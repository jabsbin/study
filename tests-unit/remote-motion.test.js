import test from 'node:test';
import assert from 'node:assert/strict';
import { RemoteMotion } from '../src/remote-motion.js';
const state=(time,x,moving=true,extra={})=>({updatedAt:time,x,z:0,rotation:0,moving,seatId:null,...extra});

test('60 Hz rendering stays at constant speed while 20 Hz packets arrive with jitter',()=>{
  const motion=new RemoteMotion();const packets=[];let arrival=0;
  for(let time=0,i=0;time<=1400;time+=50,i++){
    arrival=Math.max(arrival+1,time+40+[0,40,10,55,0,25][i%6]);
    packets.push({time,arrival,state:state(time,time*.0045)});
  }
  let index=0,previous=null;
  for(let now=0;now<1200;now+=1000/60){
    while(index<packets.length&&packets[index].arrival<=now){const p=packets[index++];motion.push(p.state,p.time,p.arrival);}
    const pose=motion.sample(now);if(!pose||now<300)continue;
    assert(Math.abs(pose.x-(now-160)*.0045)<1e-7);
    if(previous!==null)assert(Math.abs(pose.x-previous-.075)<1e-7);
    previous=pose.x;
  }
});
test('missing packets only predict a short bounded distance, then stop',()=>{
  const motion=new RemoteMotion();motion.push(state(0,0),0,20);motion.push(state(50,.375),50,70);
  const delayed=motion.sample(400),lost=motion.sample(10000);
  assert(Math.abs(delayed.x-.975)<1e-9);assert.equal(lost.x,delayed.x);assert.equal(lost.moving,false);
});
test('stopping is rendered at the same time as the final position',()=>{
  const motion=new RemoteMotion();motion.push(state(0,0),0,20);motion.push(state(50,.225,false),50,70);
  assert.equal(motion.sample(165).moving,true);assert.equal(motion.sample(190).moving,false);
  assert.equal(motion.sample(10000).x,.225);
});
test('rotation takes the short path across the angle boundary',()=>{
  const motion=new RemoteMotion();motion.push(state(0,0,true,{rotation:Math.PI*179/180}),0,20);
  motion.push(state(50,0,true,{rotation:-Math.PI*179/180}),50,70);
  assert(Math.abs(Math.abs(motion.sample(165).rotation)-Math.PI)<1e-9);
});
test('seat changes snap to the authoritative place and never predict through a bench',()=>{
  const motion=new RemoteMotion();motion.push(state(0,0),0,20);
  motion.push(state(50,5,false,{seatId:'bench-right-left',z:-21.7}),50,70);
  assert.equal(motion.sample(100).x,5);assert.equal(motion.sample(10000).z,-21.7);
});
test('movement restarts smoothly after a long stationary interval',()=>{
  const motion=new RemoteMotion();motion.push(state(0,0,false),0,40);motion.push(state(5000,.225),5000,5040);
  assert.equal(motion.sample(5100).x,0);assert(Math.abs(motion.sample(5135).x-.1125)<1e-9);
});
test('old packets and repeated full snapshots do not rewind motion',()=>{
  const motion=new RemoteMotion();motion.push(state(0,0),0,40);motion.push(state(50,.225),50,90);
  motion.push(state(50,.225),100,140);motion.push(state(100,.45),100,140);
  assert.equal(motion.push(state(0,-4),0,200),false);
  assert(Math.abs(motion.sample(235).x-.3375)<1e-9);
});

test('sender timestamps preserve constant velocity when packets bunch up before reaching the server',()=>{
 const motion=new RemoteMotion();const packets=[];let server=0;
 for(let time=0,i=0;time<=1400;time+=50,i++){
   server=Math.max(server+1,time+[20,80,30,60][i%4]);
   packets.push({server,arrival:server+40,state:state(server,time*.0045,true,{sampleTime:time})});
 }
 let index=0;
 for(let now=0;now<1200;now+=1000/60){
   while(index<packets.length&&packets[index].arrival<=now){const p=packets[index++];motion.push(p.state,p.server,p.arrival);}
   const pose=motion.sample(now);if(pose&&now>350)assert(Math.abs(pose.x-(now-180)*.0045)<1e-7);
 }
});
test('authoritative seating and source-clock movement can switch without stale history',()=>{
 const motion=new RemoteMotion();motion.push(state(1000,1,true,{sampleTime:20}),1000,1040);
 motion.push(state(1050,5,false,{seatId:'seat-0'}),1050,1090);
 assert.equal(motion.sample(1100).x,5);
 motion.push(state(2000,2,false),2000,2040);
 motion.push(state(2050,2.1,true,{sampleTime:1070}),2050,2090);
 assert.equal(motion.sample(2200).x>=2.1,true);assert.equal(motion.sample(2200).seatId,null);
});

test('a slow initial clock followed by a packet burst catches up gradually instead of jumping',()=>{
 const motion=new RemoteMotion(),packets=[];
 for(let time=0;time<=2000;time+=50)packets.push({time,arrival:time<400?400+time/50:time+50});
 let index=0,previous=null;
 for(let now=400;now<2000;now+=1000/60){
   while(index<packets.length&&packets[index].arrival<=now){const p=packets[index++];motion.push(state(p.time,p.time*.0045,true,{sampleTime:p.time}),p.time,p.arrival);}
   const pose=motion.sample(now);
   if(previous!==null){assert(pose.x>=previous-1e-8);assert(pose.x-previous<=.0045*(1000/60)*1.251+1e-8);}
   previous=pose.x;
 }
});

test('recovering from a missing batch never jumps the displayed avatar to the newest position',()=>{
 const motion=new RemoteMotion(),packets=[];
 for(let time=0;time<=800;time+=50)packets.push({time,arrival:time<=250?time+40:900+(time-300)/50});
 let index=0,previous=null;
 for(let now=0;now<3000;now+=1000/60){
   while(index<packets.length&&packets[index].arrival<=now){const p=packets[index++];motion.push(state(p.time,p.time*.002,p.time<800,{sampleTime:p.time}),p.time,p.arrival);}
   const pose=motion.sample(now);if(!pose)continue;
   if(previous!==null){assert(pose.x>=previous-1e-8);assert(pose.x-previous<=.002*(1000/60)*1.251+1e-6);}
   previous=pose.x;
 }
 assert(Math.abs(previous-1.6)<1e-8);
});

test('the final tiny movement against an obstacle does not make catch-up creep for seconds',()=>{
 const motion=new RemoteMotion();
 for(let time=0;time<=200;time+=50)motion.push(state(time,time*.0045,true,{sampleTime:time}),time,time+40);
 motion.push(state(250,.901,false,{sampleTime:250}),250,290);
 motion.sample(200);assert(motion.sample(400).x>.8);assert(Math.abs(motion.sample(1000).x-.901)<1e-9);
});
