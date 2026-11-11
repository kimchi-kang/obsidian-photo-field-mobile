import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,sensors,FULL_STOP_APERTURES} from '../src/model';
import {circleOfConfusion,optics,flash} from '../src/engine';
import {solveZone} from '../src/zone';
import {restore} from '../src/storage';
import {restoreField,capture} from '../src/field';
import {note} from '../src/note';
import {metres,distanceParts} from '../src/units';
import {extension,filmBlur} from './film-plane';
const close=(a:number,b:number,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);

test('fresh defaults describe a Nikon FM2 with a 50mm lens and 400-speed film',()=>{
 assert.equal(defaults.sensor,'ff');assert.equal(defaults.width,36);assert.equal(defaults.height,24);
 assert.equal(defaults.focal,50);assert.equal(defaults.iso,400);assert.equal(defaults.cocMode,'film');assert.equal(defaults.coc,0.03);
 assert.equal(Object.keys(sensors)[0],'ff');assert.match(sensors.ff.name,/^35mm 필름/);
 assert.ok(['apsc','apsc16','mft'].every(k=>k in sensors),'digital formats stay available');
 assert.ok(Object.keys(sensors).indexOf('mf645')<Object.keys(sensors).indexOf('apsc'),'film formats are listed before digital ones');
});
test('default aperture steps are the full-stop ring positions of an AI/AI-S Nikkor',()=>{
 const steps=defaults.apertureSteps.split(',').map(Number);assert.equal(defaults.apertureSteps,FULL_STOP_APERTURES);
 for(const stop of [1.4,2,2.8,4,5.6,8,11,16,22])assert.ok(steps.includes(stop),String(stop));
 for(const third of [1.6,2.2,2.5,3.2,3.5,4.5,6.3,7.1,9,10,13,14,18,20])assert.ok(!steps.includes(third),`no third-stop value ${third}`);
 assert.ok(defaults.apertureMin<=1.4&&defaults.apertureMax===16);
 const r=solveZone({...defaults,zoneFlow:'target',zoneNear:2,zoneFar:5});assert.ok(r.possible);assert.ok(steps.includes(r.aperture));
});
test('film CoC is 0.03mm on 36x24 and scales with the frame diagonal; estimate and custom are unchanged',()=>{
 close(circleOfConfusion(defaults),0.03);
 close(circleOfConfusion({...defaults,cocMode:'estimate'}),Math.hypot(36,24)/1500);
 close(circleOfConfusion({...defaults,cocMode:'custom',coc:.05}),.05);
 close(circleOfConfusion({...defaults,width:56,height:56}),0.03*Math.hypot(56,56)/Math.hypot(36,24));
 // 50mm f/8 at the Nikon-scale CoC: H = f^2/(N*c)+f
 {const H=2500/(8*.03)+50;close(optics({...defaults,aperture:8}).hyperfocal,H*H/(H-50)/1000,1e-9);}
 assert.deepEqual(optics(defaults),optics({...defaults,cocMode:'custom',coc:.03}));
});
test('distances are referenced to the film plane like a lens distance scale; GN stays at ISO 100',()=>{
 const i={...defaults,iso:100,cocMode:'estimate' as const,coc:.029,aperture:4,cameraDistance:5};const o=optics(i);
 {const c=Math.hypot(36,24)/1500,H=50*50/(4*c)+50;close(o.hyperfocal,H*H/(H-50)/1000);
  for(const limit of [o.near,o.far])close(filmBlur(50,4,5000,limit*1000),c,1e-9);
  // 5 m on the scale is 5 m minus the lens extension from the lens; the limits move by about that extension.
  const s=5000-extension(5000,50);assert.ok(s<5000&&s>4940);}
 close(flash({...i,denominator:4}).d,5);
 close(flash({...defaults,denominator:4}).d,10,1e-9);// ISO 400 is exactly two stops (x2 in distance) above ISO 100
});
test('saved user data keeps its own values; only missing keys take film defaults',()=>{
 const old=restore({version:2,field:{version:1,shots:[],zones:[],distances:[]},inputs:{...defaults,iso:100,cocMode:'estimate',coc:.029,sensor:'apsc',width:23.6,height:15.6,apertureSteps:'1,1.4,1.6,2'},equipment:[]});
 assert.equal(old.inputs.iso,100);assert.equal(old.inputs.cocMode,'estimate');assert.equal(old.inputs.coc,.029);assert.equal(old.inputs.sensor,'apsc');assert.equal(old.inputs.apertureSteps,'1,1.4,1.6,2');
 const {cocMode:_c,iso:_i,...partial}=defaults;const fresh=restore({version:2,field:{version:1,shots:[],zones:[],distances:[]},inputs:partial,equipment:[]});
 assert.equal(fresh.inputs.cocMode,'film');assert.equal(fresh.inputs.iso,400);
 assert.equal(restore({version:2,inputs:{...defaults,cocMode:'bogus'},equipment:[]}).inputs.cocMode,'film');
 for(const mode of ['film','estimate','custom']){const s=restore(null);s.inputs.cocMode=mode;const shot=capture(s,'m',false);assert.equal(restoreField({version:1,shots:[shot]}).shots.length,1,mode);}
});
test('notes state the film baseline and show every distance with at most one decimal',()=>{
 const text=note({...defaults,cameraDistance:3.14159,flashDistance:3.14159,diagramMax:12.3456,denominator:2},new Date(0),{version:'t'});
 assert.match(text,/Nikon FM2/);assert.match(text,/1\/250초/);assert.match(text,/필름 감도 ISO \| 400/);assert.match(text,/\| 카메라 거리 \| 3.1 m \|/);assert.match(text,/\| 그림 최대 거리 \| 12.3 m \|/);
 assert.doesNotMatch(text,/\d+\.\d{2,} ?(m|cm)\b/);assert.doesNotMatch(text,/센서/);
});
test('every formatted distance has at most one decimal digit while values stay exact',()=>{
 for(const v of [0,1e-9,.00049,.0049,.05,.125,.3333333,.99,.9999,1,1.04,1.05,1.0001,2.675,9.95,10.04,99.999,1234.5678,123456.789]){
  const {value,unit}=distanceParts(v);assert.ok(/^(<0\.1|\d{1,3}(,\d{3})*(\.\d)?)$/.test(value),`${v} -> ${value}`);assert.ok(unit==='cm'||unit==='m');
  assert.ok(!/\.\d\d/.test(metres(v)),`${v} -> ${metres(v)}`);
 }
 const i={...defaults,cameraDistance:3.14159};assert.equal(i.cameraDistance,3.14159);close(optics(i).near,optics({...i,cameraDistance:3.14159}).near);
});
