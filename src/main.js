import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import './style.css';
import { BIRTHDAY_LETTER, GIFT_MESSAGES } from './content.js';
import { GardenAudio } from './audio.js';

const $ = (id) => document.getElementById(id);
document.body.classList.add('welcome');
$('letter-content').textContent = BIRTHDAY_LETTER;
const mobile = matchMedia('(max-width:700px)').matches;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#aaa0cf');
scene.fog = new THREE.FogExp2('#b9a9d0', .0065);
const sky=new THREE.Mesh(new THREE.SphereGeometry(190,24,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 vPos;void main(){float t=smoothstep(-0.05,0.5,normalize(vPos).y);gl_FragColor=vec4(mix(vec3(0.79,0.67,0.78),vec3(0.35,0.32,0.57),t),1.0);}'}));sky.castShadow=false;scene.add(sky);
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'}); }
catch { const error=document.createElement('div'); error.className='webgl-error';error.textContent='이 작은 세상에는 WebGL이 필요해요. 하드웨어 가속을 켜거나 최신 브라우저에서 다시 만나주세요.';document.body.append(error);throw new Error('WebGL is unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const camera=new THREE.PerspectiveCamera(mobile?57:51,innerWidth/innerHeight,.1,240);
const hemi=new THREE.HemisphereLight('#e4d8ff','#87986a',1.65);scene.add(hemi);
const sun=new THREE.DirectionalLight('#ffe4c8',2.1);sun.position.set(-18,35,15);sun.castShadow=true;
sun.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:100});sun.shadow.bias=-.0005;scene.add(sun);
const fill=new THREE.DirectionalLight('#c3b7ff',1.7);fill.position.set(15,15,-25);scene.add(fill);
const mats=new Map();
function mat(color,emissive=false){const key=color+emissive;if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness:.85,metalness:0,emissive:emissive?color:0,emissiveIntensity:emissive?1.4:0}));return mats.get(key);}
function mesh(geo,color,parent=scene,x=0,y=0,z=0){const o=new THREE.Mesh(geo,typeof color==='string'?mat(color):color);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function sphere(parent,color,x,y,z,r,s=14){return mesh(new THREE.SphereGeometry(r,s,10),color,parent,x,y,z);}
function box(parent,color,x,y,z,w,h,d){return mesh(new THREE.BoxGeometry(w,h,d),color,parent,x,y,z);}
function cyl(parent,color,x,y,z,r1,r2,h,n=32){return mesh(new THREE.CylinderGeometry(r1,r2,h,n),color,parent,x,y,z);}
function group(x=0,y=0,z=0,parent=scene){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
function line(points,color,parent=scene){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const l=new THREE.Line(g,new THREE.LineBasicMaterial({color}));parent.add(l);return l;}
const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=64;const haloContext=haloCanvas.getContext('2d'),haloGradient=haloContext.createRadialGradient(32,32,0,32,32,32);haloGradient.addColorStop(0,'rgba(255,255,255,.8)');haloGradient.addColorStop(.2,'rgba(255,255,255,.25)');haloGradient.addColorStop(1,'rgba(255,255,255,0)');haloContext.fillStyle=haloGradient;haloContext.fillRect(0,0,64,64);const haloTexture=new THREE.CanvasTexture(haloCanvas);
function glow(parent,color,x,y,z,r=.1){const s=sphere(parent,mat(color,true),x,y,z,r,8);s.castShadow=false;if(r<.4){const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:haloTexture,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.6}));halo.scale.set(r*9,r*9,1);s.add(halo);}return s;}
function heart(parent,color,x,y,z,size=.3){const shape=new THREE.Shape();shape.moveTo(0,.25);shape.bezierCurveTo(-.7,1,-1.3,.2,0,-.8);shape.bezierCurveTo(1.3,.2,.7,1,0,.25);const o=mesh(new THREE.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.09,bevelThickness:.09}),color,parent,x,y,z);o.scale.setScalar(size);return o;}
function label(parent,text,x,y,z,w=8,h=1.3,color='#ffedcb',background=null){const cv=document.createElement('canvas');cv.width=1536;cv.height=256;const c=cv.getContext('2d');if(background){c.fillStyle=background;c.fillRect(0,0,cv.width,cv.height);}c.textAlign='center';c.textBaseline='middle';c.font=`${text.includes('Birthday')?'italic 100px Georgia':'bold 76px sans-serif'}`;c.fillStyle=color;c.shadowColor=color;c.shadowBlur=12;c.fillText(text,768,136,1480);const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,side:THREE.DoubleSide}));o.position.set(x,y,z);parent.add(o);return o;}
const colliders=[];
function obstacle(x,z,r){colliders.push({x,z,r});}
// A complete 100 × 100 garden, with the main composition clustered around the path.
box(scene,'#96b78c',0,-.65,0,100,1,100);
cyl(scene,'#b1c99e',0,-.1,-6,13,13,.22,64);
cyl(scene,'#d8cabd',0,.05,-6,10,10,.22,64);
cyl(scene,'#ecddcb',0,.17,-6,8.9,8.9,.15,64);
// Curving, hand-laid stepping stones lead from the visitor to the cake.
for(let i=0;i<23;i++){const z=24-i*1.22;const x=Math.sin(i*.24)*1.7;for(let j=-1;j<=1;j++){const s=cyl(scene,['#d9d2c2','#eee0cc','#cec6b8'][(i+j+3)%3],x+j*1.1,.03,z, .72,.77,.16,6);s.rotation.y=i*.7+j;s.scale.z=.8;}}
for(let side of [-1,1])for(let i=0;i<13;i++){const z=20-i*2.1,x=side*(4+Math.sin(i*.5));const b=sphere(scene,'#8eae7f',x,.15,z,.48,7);b.scale.y=.7;}
// Soft layered mountain silhouettes and moon.
for(let i=0;i<22;i++){const angle=Math.PI+(i/21)*Math.PI;const x=Math.cos(angle)*112,z=Math.sin(angle)*35-95;const m=mesh(new THREE.ConeGeometry(14+Math.random()*12,14+Math.random()*12,5),i%2?'#a599c0':'#928eaf',scene,x,-1,z);m.rotation.y=i;}
const moon=glow(scene,'#fff2cc',-26,19,-76,2.5);moon.scale.z=.3;
const starPositions=[];for(let i=0;i<200;i++)starPositions.push((Math.random()-.5)*180,22+Math.random()*65,-35-Math.random()*65);
const stars=new THREE.BufferGeometry();stars.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));scene.add(new THREE.Points(stars,new THREE.PointsMaterial({color:'#fff4d7',size:.17,sizeAttenuation:true})));
for(let i=0;i<9;i++){const g=group(-65+i*17,23+Math.random()*9,-55-Math.random()*16);for(let j=0;j<4;j++){const s=sphere(g,'#d8c5e3',j*2,Math.sin(j)*.5,0,2.4);s.scale.set(1.6,.45,.6);}}
// Flowers, shrubs and cherry trees frame each destination.
function flower(x,z,color='#f6c1cc',scale=1,parent=scene,y=0){const g=group(x,y,z,parent);g.scale.setScalar(scale);cyl(g,'#69895e',0,.3,0,.025,.035,.6,5);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;const p=sphere(g,color,Math.cos(a)*.13,.63,Math.sin(a)*.13,.115,6);p.scale.y=.5;}sphere(g,'#f7d895',0,.66,0,.075,6);return g;}
function tree(x,z,s=1){const g=group(x,0,z);g.scale.setScalar(s);const trunk=cyl(g,'#907663',0,2.6,0,.27,.5,5.3,7);trunk.rotation.z=.06;for(const side of [-1,1]){const b=cyl(g,'#907663',side*.6,4,0,.15,.23,2.4,6);b.rotation.z=side*-.6;}
for(let i=0;i<14;i++){const a=i*2.4;const r=1.3+Math.sin(i)*.6;const b=sphere(g,['#f1b5ce','#e9a6c7','#f8c7d8'][i%3],Math.cos(a)*r,5.1+Math.sin(i*1.7)*1,Math.sin(a)*r,1.55,8);b.scale.y=.78;}obstacle(x,z,.8*s);return g;}
[[-15,12,1.3],[14,15,1.25],[-23,-2,1.4],[23,-5,1.3],[-15,-23,1.1],[15,-25,1.2],[-29,17,1.1],[29,13,1.15],[-8,27,.85],[26,-23,1]].forEach(p=>tree(...p));
for(let i=0;i<220;i++){const x=(Math.random()-.5)*67,z=(Math.random()-.5)*63;if(Math.abs(x)<5&&z>0||Math.hypot(x,z+6)<11||Math.hypot(x-16,z+2)<6||Math.hypot(x+15,z)<5)continue;flower(x,z,['#f5c0d3','#ffdf99','#ded0f4'][i%3],.7+Math.random()*.6);}
for(let i=0;i<28;i++){const a=i*2.4;const x=Math.cos(a)*(23+Math.random()*15),z=Math.sin(a)*(25+Math.random()*13);const b=sphere(scene,i%2?'#8aa77d':'#a4bc8f',x,.5,z,1.1+Math.random(),8);b.scale.y=.6;}
// Lanterns and hanging party lights.
function lantern(x,z){const g=group(x,0,z);cyl(g,'#8d7966',0,1.6,0,.06,.09,3.2,6);box(g,'#8d7966',0,3.35,0,.65,.12,.65);box(g,mat('#ffdb8a',true),0,3,0,.39,.55,.39);mesh(new THREE.ConeGeometry(.52,.35,4),'#8d7966',g,0,3.58,0);const light=new THREE.PointLight('#ffcf84',5,6,2);light.position.set(0,3,0);if(z>16||z<-20)g.add(light);obstacle(x,z,.3);}
[[-5,18],[5,13],[-6,6],[6,1],[-10,-12],[11,-14],[-7,-23],[7,-23]].forEach(p=>lantern(...p));
for(let side of [-1,1]){const points=[];for(let i=0;i<=30;i++){const x=-21+i*1.4;const y=8.9-Math.sin(i/30*Math.PI)*2;points.push([x,y,side===1?-12:9]);if(i%2===0)glow(scene,i%4?'#ffe3a2':'#ffc5cb',x,y,side===1?-12:9,.09);}line(points,'#a08a92');for(let x of [-21,21])cyl(scene,'#a08a81',x,4.5,side===1?-12:9,.08,.12,9,6);}
function balloons(x,z){const g=group(x,0,z);for(let i=0;i<4;i++){const bx=(i%2)*.9-.4,by=4.2+Math.sin(i*2)*.7,bz=(i>1?.5:-.2);const b=sphere(g,['#edacc6','#c4b0e5','#f5d9a1','#c3d9c0'][i],bx,by,bz,.58);b.scale.y=1.25;line([[bx,by-.7,bz],[bx*.2,.3,0]],'#e9dcca',g);mesh(new THREE.ConeGeometry(.08,.15,8),'#e4aec7',g,bx,by-.75,bz);}return g;}
const floatingBalloons=[balloons(-7,-8),balloons(7,-8),balloons(-18,3),balloons(-12,-3),balloons(19,3)];
// Cake plaza: a huge three tier strawberry cake and illuminated arch.
const cake=group(0,0,-7);cyl(cake,'#cfadbd',0,.4,0,4.3,4.5,.55,64);cyl(cake,'#fff0d9',0,.76,0,3.9,3.9,.15,64);
for(let t=0;t<3;t++){const r=3.3-t*.83,base=.85+t*1.4;cyl(cake,t%2?'#eeb8c8':'#f6d6cf',0,base+.6,0,r,r,1.3,64);cyl(cake,'#fff0dd',0,base+1.3,0,r+.06,r+.06,.2,64);
for(let i=0;i<30;i++){const a=i/30*Math.PI*2;const s=sphere(cake,'#fff0dd',Math.cos(a)*r,base+1.18,Math.sin(a)*r,.19,8);s.scale.y=1.5;}
for(let i=0;i<10-t*2;i++){const a=i/(10-t*2)*Math.PI*2;const x=Math.cos(a)*(r-.32),z=Math.sin(a)*(r-.32);const strawberry=sphere(cake,'#d96d86',x,base+1.65,z,.23,8);strawberry.scale.y=1.4;mesh(new THREE.ConeGeometry(.17,.13,5),'#769f72',cake,x,base+1.97,z);const cream=sphere(cake,'#fff4df',Math.cos(a+.25)*(r-.35),base+1.57,Math.sin(a+.25)*(r-.35),.21,8);cream.scale.y=1.3;}
for(let i=0;i<8;i++){const a=i/8*Math.PI*2;box(cake,'#775951',Math.cos(a)*r,base+.5,Math.sin(a)*r,.1,.24,.12);}}
const flames=[];
for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const x=Math.cos(a)*.85,z=Math.sin(a)*.85;cyl(cake,i%2?'#bcb2dc':'#f4b3c9',x,5.55,z,.075,.075,.75,12);const flame=glow(cake,'#ffe5a1',x,6.02,z,.14);flame.scale.y=1.7;flames.push(flame);}
const candleLight=new THREE.PointLight('#ffbe75',12,12,2);candleLight.position.set(0,6,-7);scene.add(candleLight);obstacle(0,-7,4.25);
const arch=group(0,0,-11.6);const curve=new THREE.EllipseCurve(0,0,6.5,6.5,0,Math.PI,false,0);const pts=curve.getPoints(48).map(p=>new THREE.Vector3(p.x,p.y+2,0));mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),64,.16,8,false),'#e7c4a8',arch);for(let side of [-1,1])cyl(arch,'#e7c4a8',side*6.5,1,0,.16,.16,2,12);label(arch,'Happy Birthday ♡',0,7.1,.25,11,1.8);
for(let i=0;i<17;i++){const a=i/16*Math.PI;glow(arch,'#ffe9b2',Math.cos(a)*6.5,Math.sin(a)*6.5+2,.2,.12);}
for(let i=0;i<11;i++){const x=-5+i;const y=5.2-Math.sin(i/10*Math.PI)*.8;const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([-.3,0,0,.3,0,0,0,-.6,0],3));geo.computeVertexNormals();const flag=mesh(geo,new THREE.MeshStandardMaterial({color:['#f3b2c8','#dfc6f3','#f8d59f'][i%3],side:THREE.DoubleSide}),arch,x,y,.15);}
// A plush bear holding a rose heart, and permanently opening gifts.
const animals=[];
function bear(x,z,scale=1,bunny=false){const g=group(x,0,z);g.scale.setScalar(scale);const cream=bunny?'#ead4ce':'#f3dfb8';sphere(g,cream,0,1.6,0,1.15);const head=group(0,3,0,g);sphere(head,cream,0,0,0,1.05);for(let side of [-1,1]){const ear=sphere(head,cream,side*.7,.75,0,.43);if(bunny)ear.scale.y=2.4;sphere(head,'#dcb5ac',side*.7,.77,.2,.24);sphere(head,'#51434a',side*.34,.08,.91,.085,10);const cheek=sphere(head,'#e8aaa9',side*.62,-.16,.84,.2);cheek.scale.set(1,.6,.2);sphere(g,cream,side*.62,.35,.45,.48);const arm=sphere(g,cream,side*.9,1.7,.65,.43);arm.scale.y=1.3;}sphere(head,'#fff0d2',0,-.27,.85,.4);sphere(head,'#6f5650',0,-.14,1.21,.13,8);heart(g,'#e99aaf',0,1.8,1.05,.85);animals.push({g,head,base:0,phase:Math.random()*6});obstacle(x,z,1.5*scale);return g;}
const bigBear=bear(-14,0,1.7);bigBear.rotation.y=.23;
bear(9,-13,.6,true).rotation.y=-.25;bear(-8,-17,.52,true);bear(22,9,.52).rotation.y=-.4;
const gifts=[];const giftColors=['#d9b4d9','#b7cbb8','#efc4ad'];
for(let i=0;i<3;i++){const x=-18+i*3.1,z=5+(i===1?1.5:0);const g=group(x,0,z);const size=1.5;box(g,giftColors[i],0,.75,0,size,1.5,size);box(g,'#fff0d2',0,.76,.76,.2,1.5,.03);box(g,'#fff0d2',.76,.76,0,.03,1.5,.2);const lid=group(0,1.55,-.82,g);box(lid,giftColors[i],0,.02,.82,1.7,.28,1.7);box(lid,'#fff0d2',0,.18,.82,.22,.035,1.7);box(lid,'#fff0d2',0,.18,.82,1.7,.035,.22);for(let side of [-1,1]){const bow=mesh(new THREE.TorusGeometry(.27,.075,7,16),'#fff0d2',lid,side*.26,.35,.82);bow.rotation.x=.5;bow.rotation.y=side*.5;}gifts.push({g,lid,x,z,opened:false,angle:0});obstacle(x,z,1.1);}
const sign=group(-11,0,4);cyl(sign,'#9e7c64',0,.7,0,.1,.1,1.4,7);box(sign,'#bd997a',0,1.55,0,3,.9,.16);label(sign,'생일 축하해!',0,1.55,.1,2.7,.55,'#fff3d6');
// Cozy cottage: gabled roof, warm framed windows, chimney and flower eaves.
const house=group(16,0,-1);house.rotation.y=-.2;
box(house,'#ead4be',0,2.4,0,6.8,4.8,5.6);box(house,'#b1957d',0,.25,0,7.2,.5,6);
for(let side of [-1,1]){const roof=box(house,'#9c7b9e',side*1.9,5.5,0,4.5,.32,6.9);roof.rotation.z=side*-.58;for(let k=0;k<8;k++){const tile=box(house,'#ac8aaa',side*1.9,5.65,-3.1+k*.9,4.55,.08,.07);tile.rotation.z=side*-.58;}}
const tri=new THREE.Shape();tri.moveTo(-3.4,0);tri.lineTo(3.4,0);tri.lineTo(0,2.2);tri.closePath();mesh(new THREE.ShapeGeometry(tri),'#ead4be',house,0,4.8,2.81);
box(house,'#ab8d77',0,1.5,2.85,1.5,2.8,.16);for(let i=0;i<5;i++)box(house,'#997a65',-.6+i*.3,1.5,2.95,.025,2.6,.04);sphere(house,'#f2cd87',.47,1.5,3,.07,8);
for(let side of [-1,1]){box(house,mat('#ffdc93',true),side*2.2,2.8,2.85,1.4,1.6,.1);for(let a of [-1,1]){box(house,'#9f7f68',side*2.2+a*.8,2.8,2.96,.12,1.9,.13);box(house,'#9f7f68',side*2.2,2.8+a*.9,2.96,1.7,.12,.13);}box(house,'#9f7f68',side*2.2,2.8,3,.1,1.6,.1);box(house,'#9f7f68',side*2.2,2.8,3,1.5,.1,.1);box(house,'#b9957e',side*2.2,1.75,3.05,1.9,.3,.5);for(let i=0;i<6;i++)flower(side*2.2-.7+i*.27,3.1,'#e5aac4',.65,house,1.85);}
box(house,'#b49791',1.8,6.7,-1.3,.9,2.6,.9);box(house,'#937b81',1.8,8,-1.3,1.15,.25,1.15);
for(let i=0;i<3;i++)box(house,'#b6a18b',0,.15+i*.15,3.65-i*.3,2.2,.3,.85);
for(let i=0;i<16;i++){const side=i<8?-1:1;flower(side*(.4+(i%8)*.4),3.25,'#f1bad0',.75,house,6.5-(i%8)*.25);}
const warm=new THREE.PointLight('#ffcf89',14,12,2);warm.position.set(0,2.7,3.4);house.add(warm);obstacle(16,-1,4.7);
const table=group(15,0,7);cyl(table,'#c3a387',0,.85,0,.15,.3,1.7,12);cyl(table,'#e0c3a2',0,1.75,0,1.5,1.5,.18,32);cyl(table,'#fff0d7',0,2,0,.46,.46,.35,24);cyl(table,'#e9b5bd',0,2.21,0,.47,.47,.12,24);cyl(table,'#fff1c5',0,2.49,0,.035,.035,.45,8);glow(table,'#ffdb88',0,2.8,0,.08);flower(.9,0,'#e9a6c5',.75,table,1.85);obstacle(15,7,1.7);
for(let side of [-1,1]){const chair=group(15+side*2.2,0,7);box(chair,'#c6a68b',0,.95,0,.9,.15,.95);box(chair,'#c6a68b',side*.4,1.65,0,.13,1.4,.95);for(let a of [-1,1])for(let b of [-1,1])box(chair,'#ac8c75',a*.33,.45,b*.33,.12,.9,.12);obstacle(15+side*2.2,7,.6);}
label(house,'a little birthday café',0,4.35,3,4.8,.6,'#8c685f');
// The hidden-in-plain-sight letter garden beyond the cake.
const gazebo=group(0,0,-23);cyl(gazebo,'#d4b9bd',0,.2,0,4,4,.35,6);for(let i=0;i<6;i++){const a=i/6*Math.PI*2;cyl(gazebo,'#e9d6c0',Math.cos(a)*3.4,2.6,Math.sin(a)*3.4,.12,.15,5,8);}mesh(new THREE.ConeGeometry(4.8,2.1,6),'#c09ebb',gazebo,0,6,0);glow(gazebo,'#ffdfad',0,4.5,0,.25);const envLight=new THREE.PointLight('#ffdca4',9,11,2);envLight.position.set(0,4,0);gazebo.add(envLight);
const envelope=group(0,2,-22);box(envelope,'#ffedcf',0,0,0,1.4,.9,.13);line([[-.7,.45,.08],[0,-.05,.08],[.7,.45,.08]],'#dcb9ac',envelope);heart(envelope,'#e59aaa',0,-.02,.11,.17);label(scene,'별빛 편지 정원',0,4,-19,4.5,.7);
for(let side of [-1,1]){const bench=group(side*5.3,0,-22);box(bench,'#b8957d',0,.8,0,2.5,.18,.9);box(bench,'#b8957d',0,1.4,-.4,2.5,.8,.12);for(let a of [-1,1])box(bench,'#a28471',a*.9,.4,0,.16,.8,.7);obstacle(side*5.3,-22,1.4);}
for(let i=0;i<70;i++){const a=i/70*Math.PI*2;const x=16*Math.sin(a)**3*.35,z=-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*.3-30;flower(x,z,i%2?'#efadc8':'#f6d1d8',1.1);}
// Star shaped garden ornaments.
function star(x,y,z){const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=i/10*Math.PI*2+Math.PI/2,r=i%2?.18:.42;const px=Math.cos(a)*r,py=Math.sin(a)*r;if(!i)shape.moveTo(px,py);else shape.lineTo(px,py);}shape.closePath();return mesh(new THREE.ExtrudeGeometry(shape,{depth:.08,bevelEnabled:false}),mat('#ffe0a0',true),scene,x,y,z);}
for(const p of [[-6,3,-16],[6,3,-17],[-8,2,-29],[8,2,-28],[-5,3,-3],[5,3,-5]]){star(...p);cyl(scene,'#b5a186',p[0],p[1]/2,p[2],.025,.025,p[1],6);}
// Playable SD visitor, facing toward the cake on arrival.
const player=group(0,0,19);const body=group(0,0,0,player);cyl(body,'#f0e3cc',0,1.05,0,.42,.47,.8,12);sphere(body,'#f2e5cd',0,1.36,.05,.4);heart(body,'#e7a5b6',0,1.12,.431,.2);
const head=group(0,1.9,0,body);sphere(head,'#f5d3bc',0,0,0,.58);const hair=sphere(head,'#79564a',0,.16,.03,.6);hair.scale.y=.85;box(head,'#79564a',0,.02,.42,.83,.48,.23);for(let side of [-1,1]){sphere(head,'#f4cbb8',side*.55,-.05,0,.12);sphere(head,'#54434b',side*.2,-.02,-.52,.045,8);sphere(head,'#e9a5a4',side*.32,-.14,-.48,.09,8);}
const hat=mesh(new THREE.ConeGeometry(.34,.95,16),'#e7a5bd',head,0,.88,0);hat.rotation.z=-.12;glow(head,'#ffedc8',-.05,1.38,0,.11);
const limbs=[];for(let side of [-1,1]){const arm=group(side*.52,1.34,0,body);cyl(arm,'#eddec4',0,-.25,0,.15,.16,.5,10);sphere(arm,'#f5d3bc',0,-.55,0,.14);const leg=group(side*.22,.7,0,body);cyl(leg,'#665e75',0,-.28,0,.15,.17,.57,10);box(leg,'#f1e4da',0,-.56,-.08,.32,.2,.48);limbs.push({arm,leg,side});}
function particleTexture(kind){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');c.fillStyle='white';if(kind==='heart'){c.beginPath();c.moveTo(32,55);c.bezierCurveTo(-15,23,10,0,32,20);c.bezierCurveTo(54,0,79,23,32,55);c.fill();}else if(kind==='star'){c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?12:29;c.lineTo(32+Math.cos(a)*r,32+Math.sin(a)*r);}c.closePath();c.fill();}else{c.beginPath();c.ellipse(32,32,12,25,.6,0,Math.PI*2);c.fill();}return new THREE.CanvasTexture(canvas);}
const heartTexture=particleTexture('heart'),starTexture=particleTexture('star'),petalTexture=particleTexture('petal');
// Petals and fireflies use a single point cloud each.
const ambientCount=mobile?150:300;const ambientArray=new Float32Array(ambientCount*3);for(let i=0;i<ambientCount;i++){ambientArray[i*3]=(Math.random()-.5)*65;ambientArray[i*3+1]=Math.random()*13+.5;ambientArray[i*3+2]=(Math.random()-.5)*65;}
const ambientGeometry=new THREE.BufferGeometry();ambientGeometry.setAttribute('position',new THREE.BufferAttribute(ambientArray,3));const petals=new THREE.Points(ambientGeometry,new THREE.PointsMaterial({color:'#ffd5e0',size:.2,map:petalTexture,transparent:true,opacity:.8,depthWrite:false}));scene.add(petals);
const fireflyArray=new Float32Array(90*3);for(let i=0;i<90;i++){fireflyArray[i*3]=(Math.random()-.5)*55;fireflyArray[i*3+1]=.5+Math.random()*4;fireflyArray[i*3+2]=(Math.random()-.5)*55;}const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.BufferAttribute(fireflyArray,3));const fireflies=new THREE.Points(fg,new THREE.PointsMaterial({color:'#fff2a8',size:.09,transparent:true,opacity:.85}));scene.add(fireflies);
// Bake static primitives by material: hundreds of flowers become a handful of draw calls.
const animatedRoots=new Set([player,envelope,...animals.map(a=>a.g),...gifts.map(g=>g.g),...floatingBalloons,...flames]);
scene.updateMatrixWorld(true);
const buckets=new Map(),staticMeshes=[];
scene.traverse(o=>{if(!o.isMesh||o.children.length||o.material.transparent||o.material.isShaderMaterial)return;let parent=o;while(parent){if(animatedRoots.has(parent))return;parent=parent.parent;}const key=o.material.uuid;let bucket=buckets.get(key);if(!bucket){bucket={material:o.material,geometries:[]};buckets.set(key,bucket);}const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);bucket.geometries.push(geometry);staticMeshes.push(o);});
for(const o of staticMeshes)o.removeFromParent();
for(const b of buckets.values()){const geometry=mergeGeometries(b.geometries);if(geometry){const m=new THREE.Mesh(geometry,b.material);m.castShadow=true;m.receiveShadow=true;scene.add(m);}b.geometries.forEach(g=>g.dispose());}
const audio=new GardenAudio();let entered=false,locked=false,modal=false,celebrating=false,currentTarget=null,intro=0;
let yaw=0,pitch=.32,distance=mobile?22:20;const keys=new Set(),joy=new THREE.Vector2(),clock=new THREE.Clock();
let toastTimer;function toast(message,duration=4000){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),duration);}
function soundUI(){$('sound').innerHTML=`♫<span>${audio.enabled?'ON':'OFF'}</span>`;$('sound').setAttribute('aria-label',audio.enabled?'소리 끄기':'소리 켜기');$('sound').setAttribute('aria-pressed',String(audio.enabled));}
$('enter').onclick=async()=>{entered=true;intro=1;$('welcome').classList.add('leaving');document.body.classList.remove('welcome');try{await audio.start();audio.effect('click');}catch{toast('소리 없이도 동산을 즐길 수 있어요');}soundUI();setTimeout(()=>{$('welcome').hidden=true;toast('어서 와! 오늘은 너를 위한 날이야 ♡');},1100);};
$('sound').onclick=async()=>{if(!entered)return;try{await audio.toggle();soundUI();}catch{toast('이 브라우저에서 소리를 시작하지 못했어요.');}};
function setModal(id,open){$(id).hidden=!open;modal=open;keys.clear();joy.set(0,0);if(open)$(id).querySelector('button').focus();}
$('help').onclick=()=>{if(entered)setModal('help-modal',true);};$('close-help').onclick=()=>setModal('help-modal',false);$('close-letter').onclick=()=>{setModal('letter',false);audio.effect('click');};
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase());if(e.key.toLowerCase()==='e'&&!e.repeat)interact();if(e.key==='Escape'){if(!$('letter').hidden)setModal('letter',false);if(!$('help-modal').hidden)setModal('help-modal',false);}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();joy.set(0,0);});
let drag=null;$('world').addEventListener('pointerdown',e=>{if(!entered||modal)return;drag={x:e.clientX,y:e.clientY,id:e.pointerId};$('world').setPointerCapture(e.pointerId);});$('world').addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;yaw-=(e.clientX-drag.x)*.005;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-drag.y)*.003,.18,.95);drag.x=e.clientX;drag.y=e.clientY;});for(const event of ['pointerup','pointercancel'])$('world').addEventListener(event,()=>drag=null);
$('world').addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.015,10,33);},{passive:false});
let joyPointer=null;function joystick(e){const r=$('joystick').getBoundingClientRect();joy.set((e.clientX-r.left-r.width/2)/35,(e.clientY-r.top-r.height/2)/35);if(joy.length()>1)joy.normalize();$('stick').style.transform=`translate(${joy.x*29}px,${joy.y*29}px)`;}
$('joystick').onpointerdown=e=>{if(!entered||modal)return;joyPointer=e.pointerId;$('joystick').setPointerCapture(e.pointerId);joystick(e);};$('joystick').onpointermove=e=>{if(e.pointerId===joyPointer)joystick(e);};for(const event of ['pointerup','pointercancel'])$('joystick').addEventListener(event,()=>{joyPointer=null;joy.set(0,0);$('stick').style.transform='';});
const bursts=[];function burst(x,y,z,count=80,color=null,speed=5){const positions=new Float32Array(count*3),velocities=[],colors=new Float32Array(count*3);for(let i=0;i<count;i++){positions.set([x,y,z],i*3);velocities.push(new THREE.Vector3((Math.random()-.5)*speed,(Math.random()-.2)*speed,(Math.random()-.5)*speed));const c=new THREE.Color(color||['#ffafd0','#ffe1a3','#d6b7ff','#bde6d7'][i%4]);colors.set([c.r,c.g,c.b],i*3);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('color',new THREE.BufferAttribute(colors,3));const m=new THREE.PointsMaterial({size:.35,map:color?heartTexture:starTexture,vertexColors:true,transparent:true,opacity:1,depthWrite:false});const p=new THREE.Points(g,m);scene.add(p);bursts.push({p,velocities,age:0});}
function interact(){if(!entered||locked||modal||!currentTarget)return;audio.effect('click');if(currentTarget.kind==='gift'){const gift=gifts[currentTarget.index];if(gift.opened)return;gift.opened=true;audio.effect('gift');toast(GIFT_MESSAGES[currentTarget.index],5500);burst(gift.x,2,gift.z,65,'#ffbfd5',4);const opened=gifts.filter(g=>g.opened).length;$('gift-count').textContent=`${opened} / 3`;if(opened===3)$('q-gift').classList.add('done');}else if(currentTarget.kind==='letter'){setModal('letter',true);$('q-letter').classList.add('done');$('q-letter').querySelector('b').textContent='✓';}else birthday();}
$('interact').onclick=interact;
function birthday(){locked=true;celebrating=true;keys.clear();joy.set(0,0);flames.forEach(f=>f.visible=true);toast('마음속으로 소원을 빌어봐 ✨',3500);setTimeout(()=>{audio.effect('blow');flames.forEach((f,i)=>setTimeout(()=>f.visible=false,i*160));},3000);setTimeout(()=>{audio.effect('birthday');toast('HAPPY BIRTHDAY! 💗',6500);$('q-cake').classList.add('done');$('q-cake').querySelector('b').textContent='✓';for(let i=0;i<14;i++)setTimeout(()=>{burst((Math.random()-.5)*23,12+Math.random()*8,-8-Math.random()*12,mobile?65:120,null,9);audio.effect('firework');},i*420);},4200);setTimeout(()=>{locked=false;celebrating=false;toast('네 소원이 꼭 이루어지길. 케이크 뒤의 편지도 만나봐 ♡',5000);},11500);}
let previousLocation='';function targetUpdate(){if(!entered||locked||modal){$('interact').hidden=true;currentTarget=null;return;}const p=player.position;let best=null,bestDist=Infinity;for(let i=0;i<gifts.length;i++){const g=gifts[i],d=Math.hypot(p.x-g.x,p.z-g.z);if(!g.opened&&d<3.4&&d<bestDist){best={kind:'gift',index:i,text:'🎁 선물 열기 [E]'};bestDist=d;}}if(Math.hypot(p.x,p.z+7)<7)best={kind:'cake',text:'🎂 소원 빌고 촛불 끄기 [E]'};if(Math.hypot(p.x,p.z+22)<4)best={kind:'letter',text:'💌 편지 읽기 [E]'};currentTarget=best;$('interact').hidden=!best;if(best)$('interact').textContent=best.text;
let location='설렘의 산책길',sub='작은 행복이 너를 기다리고 있어';if(p.z<-17){location='별빛 편지 정원';sub='별빛 아래 남겨둔 진심';}else if(p.x<-8){location='곰돌이 선물 정원';sub='마음을 담아, 너에게';}else if(p.x>9){location='작은 생일 오두막';sub='따뜻한 차 한 잔의 여유';}else if(p.z<2){location='소원이 피어나는 광장';sub='가장 빛나는 오늘의 주인공';}if(previousLocation!==location){previousLocation=location;$('location-name').textContent=location;const small=document.createElement('small');small.textContent=sub;$('location-name').append(small);}}
const desiredCamera=new THREE.Vector3(),look=new THREE.Vector3(),move=new THREE.Vector3(),lookOffset=new THREE.Vector3(0,2.1,0);
function canStand(x,z){return x>-46&&x<46&&z>-46&&z<46&&!colliders.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+.42);}
let elapsed=0,frameNumber=0,qualityFrames=0,qualityTime=performance.now();function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.1);elapsed+=dt;const time=elapsed;
let mx=joy.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),mz=joy.y+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
const walking=entered&&!locked&&!modal&&(Math.abs(mx)+Math.abs(mz)>.05);if(walking){const norm=Math.max(1,Math.hypot(mx,mz));mx/=norm;mz/=norm;const speed=keys.has('shift')?7.5:4.5;move.set(mx*Math.cos(yaw)+mz*Math.sin(yaw),0,-mx*Math.sin(yaw)+mz*Math.cos(yaw)).multiplyScalar(speed*dt);if(canStand(player.position.x+move.x,player.position.z))player.position.x+=move.x;if(canStand(player.position.x,player.position.z+move.z))player.position.z+=move.z;const target=Math.atan2(-move.x,-move.z);player.rotation.y+=Math.atan2(Math.sin(target-player.rotation.y),Math.cos(target-player.rotation.y))*Math.min(1,dt*12);}
body.position.y=walking?Math.abs(Math.sin(time*11))*.08:Math.sin(time*2)*.025;for(const l of limbs){l.arm.rotation.x=walking?Math.sin(time*(keys.has('shift')?16:11))*l.side*.6:Math.sin(time*2)*.03;l.leg.rotation.x=walking?-Math.sin(time*(keys.has('shift')?16:11))*l.side*.65:0;}
for(const a of animals){a.head.rotation.z=Math.sin(time*.8+a.phase)*.055;a.g.position.y=celebrating?Math.abs(Math.sin(time*5+a.phase))*.6:0;}for(const g of gifts){g.angle=THREE.MathUtils.damp(g.angle,g.opened?-2:0,5,dt);g.lid.rotation.x=g.angle;}
flames.forEach((f,i)=>f.scale.y=1.5+Math.sin(time*11+i)*.25);candleLight.intensity=flames.some(f=>f.visible)?10+Math.sin(time*8)*2:0;floatingBalloons.forEach((g,i)=>g.position.y=Math.sin(time*.9+i)*.16);envelope.position.y=2+Math.sin(time*1.5)*.18;envelope.rotation.y=Math.sin(time*.7)*.12;
for(let i=0;i<ambientCount;i++){ambientArray[i*3]+=Math.sin(time+i)*dt*.22;ambientArray[i*3+1]-=dt*(.3+(i%3)*.12);ambientArray[i*3+2]+=dt*.15;if(ambientArray[i*3+1]<.1)ambientArray[i*3+1]=13;}ambientGeometry.attributes.position.needsUpdate=true;fireflies.material.opacity=.5+Math.sin(time*1.5)*.25;
for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.age+=dt;const pos=b.p.geometry.attributes.position;for(let j=0;j<b.velocities.length;j++){b.velocities[j].y-=dt*1.4;pos.array[j*3]+=b.velocities[j].x*dt;pos.array[j*3+1]+=b.velocities[j].y*dt;pos.array[j*3+2]+=b.velocities[j].z*dt;}pos.needsUpdate=true;b.p.material.opacity=Math.max(0,1-b.age/3);if(b.age>3){scene.remove(b.p);b.p.geometry.dispose();b.p.material.dispose();bursts.splice(i,1);}}
lookOffset.set(-Math.sin(yaw)*12,2.7,-Math.cos(yaw)*12);look.copy(player.position).add(lookOffset);desiredCamera.set(player.position.x+Math.sin(yaw)*distance*Math.cos(pitch),3+Math.sin(pitch)*distance,player.position.z+Math.cos(yaw)*distance*Math.cos(pitch));if(!entered){desiredCamera.set(mobile?4:3,mobile?13:12,mobile?40:36);look.set(0,4,-3);}else if(intro>0){intro=Math.max(0,intro-dt*.65);desiredCamera.y+=intro*intro*22;}if(locked){desiredCamera.set(10,10,10);look.set(0,3.5,-7);}if(Math.hypot(desiredCamera.x-16,desiredCamera.z+1)<7)desiredCamera.y=Math.max(desiredCamera.y,10);desiredCamera.y=Math.max(desiredCamera.y,3);camera.position.lerp(desiredCamera,1-Math.exp(-dt*3));camera.lookAt(look);targetUpdate();frameNumber++;if(frameNumber%12===0||(walking&&frameNumber%4===0))renderer.shadowMap.needsUpdate=true;
qualityFrames++;if(performance.now()-qualityTime>2500){const fps=qualityFrames*1000/(performance.now()-qualityTime);if(fps<24&&renderer.getPixelRatio()>.75)renderer.setPixelRatio(Math.max(.75,renderer.getPixelRatio()-.25));qualityFrames=0;qualityTime=performance.now();}renderer.render(scene,camera);}
camera.position.set(4,25,42);frame();window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
window.__garden={get ready(){return renderer.info.render.calls>0;},get position(){return {x:player.position.x,z:player.position.z};},get openedGifts(){return gifts.filter(g=>g.opened).length;},get celebrating(){return celebrating;},get intro(){return intro;}};
