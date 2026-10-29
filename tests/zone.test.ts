import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,Inputs} from '../src/model';
import {equivalence,solveZone,includesTarget} from '../src/zone';
import {optics,flash} from '../src/engine';
import {restore,snapshot} from '../src/storage';
import {note,validateNote} from '../src/note';
const input=(p:Partial<Inputs>={}):Inputs=>({...defaults,...p});
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('nominal 1.5, 1.6 and full frame examples remain explicit',()=>{
 for(const [sensor,width,height,crop]of [['apsc',23.6,15.6,1.5],['apsc16',22.3,14.9,1.6],['ff',36,24,1]]as const){const e=equivalence(input({sensor,width,height,focal:35,aperture:2}));close(e.crop,crop);close(e.focal,35*crop);close(e.aperture,2*crop);assert.equal(e.basis,'명목 계수');}
});
test('dimensional factor, aspect ratio and custom CoC caveats',()=>{
 const i=input({sensor:'apsc',width:23.6,height:15.6,cropBasis:'dimensions',cocMode:'custom'}),e=equivalence(i);
 close(e.crop,Math.hypot(36,24)/Math.hypot(23.6,15.6));assert.equal(e.comparable,false);
 assert.equal(equivalence(input({sensor:'custom',width:17.3,height:13})).differentAspect,true);
});
test('equivalence never changes exposure or feeds crop back into real optics',()=>{
 const a=input({sensor:'apsc',width:23.6,height:15.6,focal:35,aperture:2});const original={...a},o=optics(a),f=flash(a);
 equivalence(a);assert.deepEqual(a,original);assert.deepEqual(optics(a),o);assert.deepEqual(flash(a),f);
 const b={...a,cropBasis:'dimensions' as const};equivalence(b);assert.deepEqual(optics(b),o);assert.deepEqual(flash(b),f);
 close(o.near,optics({...defaults,width:23.6,height:15.6,focal:35,aperture:2}).near);
});
test('finite and infinite inverse results include targets after actual stage rounding',()=>{
 let successes=0,failures=0;
 for(const focal of [14,24,35,50,85])for(const zoneNear of [.5,1.25,2,5])for(const zoneFar of [3,10,50])for(const zoneInfinity of [false,true]){
  if(!zoneInfinity&&zoneNear>=zoneFar)continue;
  const i=input({focal,zoneNear,zoneFar,zoneInfinity,apertureMax:32});const r=solveZone(i);
  if(r.possible){successes++;assert.ok(includesTarget(optics({...i,aperture:r.aperture,cameraDistance:r.cameraDistance}),r.target));assert.ok(i.apertureSteps.split(',').map(Number).includes(r.aperture));
   const preceding=i.apertureSteps.split(',').map(Number).filter(n=>n>=i.apertureMin&&n<r.aperture);for(const aperture of preceding){const cameraDistance:number=zoneInfinity?optics({...i,aperture}).hyperfocal:r.cameraDistance;assert.equal(includesTarget(optics({...i,aperture,cameraDistance}),r.target),false);}
  }else{failures++;assert.equal(includesTarget(r.actual,r.target),false);}
 }
 assert.ok(successes>50);assert.ok(failures>0);
});
test('finite focus is harmonic; infinity uses hyperfocal and correct boundary',()=>{
 const i=input({focal:35,zoneNear:2,zoneFar:5});const r=solveZone(i);assert.ok(r.possible);close(r.cameraDistance,20/7);assert.notEqual(r.cameraDistance,3.5);
 const inf=solveZone({...i,zoneInfinity:true});assert.ok(inf.possible);close(inf.cameraDistance,inf.actual.hyperfocal);assert.equal(inf.actual.far,Infinity);
 const H=optics(i).hyperfocal;assert.equal(optics({...i,cameraDistance:H}).far,Infinity);assert.ok(Number.isFinite(optics({...i,cameraDistance:H*(1-1e-8)}).far));
});
test('invalid, impossible thin lens ranges and unavailable aperture stages reject',()=>{
 for(const patch of [{zoneNear:0},{zoneNear:-1},{zoneNear:NaN},{zoneFar:NaN},{zoneNear:5,zoneFar:5},{zoneNear:6,zoneFar:5},{zoneNear:.035,focal:35},{apertureMin:16,apertureMax:2},{apertureSteps:''},{apertureSteps:'2,,4'},{apertureSteps:'2,NaN'},{apertureSteps:'2,0'},{apertureSteps:'2,-4'},{apertureMin:2,apertureMax:2.1,apertureSteps:'1.4,4'}])assert.throws(()=>solveZone(input(patch)));
 assert.equal(solveZone(input({focal:85,zoneNear:1,zoneInfinity:true,apertureMax:4})).possible,false);
 assert.ok(solveZone(input({focal:35,zoneInfinity:true,zoneFar:NaN})).possible);
});
test('matching dimensional CoC and actual FF counterparts preserves distant DOF approximately',()=>{
 const i=input({sensor:'apsc',width:23.6,height:15.6,cropBasis:'dimensions',focal:35,aperture:2,cameraDistance:10});const e=equivalence(i),o=optics(i),ff=optics({...i,width:36,height:24,focal:e.focal,aperture:e.aperture});
 assert.ok(Math.abs(ff.near/o.near-1)<.01);assert.ok(Math.abs(ff.far/o.far-1)<.01);
});
test('legacy equipment, drafts and all new settings survive migration and snapshots',()=>{
 const legacy=restore({version:2,inputs:{focal:35,tab:'dof'},equipment:[],draft:{name:'draft'}});assert.equal(legacy.inputs.focal,35);assert.equal(legacy.draft?.name,'draft');assert.ok(legacy.migrationBackup);
 const state=restore({...legacy,inputs:input({tab:'zone',zoneFlow:'target',zoneNear:1.25,zoneFar:9.75,cropBasis:'dimensions'})});const next=restore(snapshot(state,defaults));assert.deepEqual(next.inputs,state.inputs);
});
test('zone Markdown remains independent of missing flash and describes inputs, actual and suggestion',()=>{
 const i=input({tab:'zone',zoneFlow:'target',zoneNear:2,zoneFar:5,focal:35,gn:NaN,zoom:NaN,conditions:''});validateNote(i,'zone');const text=note(i,new Date(),{scope:'zone',version:'1.3.0'});
 for(const term of ['목표 근거리','목표 유한 원거리','존 포커싱 역산','제안 검산','심도 근거리','명목 계수','실제 노출 조리개','s=2ab'])assert.ok(text.includes(term),term);
 assert.doesNotMatch(text,/적정 노출 예상 거리:|플래시 계산 불가:/);assert.throws(()=>validateNote(i,'all'));
});
