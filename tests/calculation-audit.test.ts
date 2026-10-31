import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {defaults,Inputs} from '../src/model';
import {optics,flash,flashDistance,requiredPower,angle,coverage,exposureEV,footprint} from '../src/engine';
import {solveZone,includesTarget,equivalence} from '../src/zone';
import {fmt,parseNumber,feetToMetres,metresToFeet} from '../src/units';
import {snapshot,restore} from '../src/storage';
import {applyEquipment,parseTable} from '../src/presets';
import {note} from '../src/note';
const input=(p:Partial<Inputs>={}):Inputs=>({...defaults,...p});
// Dimensionless relative error plus a unit-specific absolute floor. No production inverse oracle.
const close=(a:number,b:number,rel=2e-11,abs=1e-12)=>assert.ok(Math.abs(a-b)<=abs+rel*Math.abs(b),`${a} != ${b}`);
let seed=0x50484f54;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
const rows:object[]=[];
// Independent ray geometry: image distances from 1/u+1/v=1/f and a cone from a lens stop f/N.
function blur(i:Inputs,u:number,N=i.aperture,s=i.cameraDistance*1000){const v=1/(1/i.focal-1/u),vs=1/(1/i.focal-1/s);return i.focal/N*Math.abs(1-vs/v);}
// Independent minimax search over focus vergence; aperture requirement is worst endpoint blur at N=1 / c.
function optimum(i:Inputs){const a=i.zoneNear*1000,b=i.zoneInfinity?Infinity:i.zoneFar*1000,c=i.cocMode==='estimate'?Math.hypot(i.width,i.height)/1500:i.coc;
 let lo=1/b,hi=1/a;const objective=(q:number)=>Math.max(blur(i,a,1,1/q),blur(i,b,1,1/q))/c;
 for(let j=0;j<130;j++){const l=(2*lo+hi)/3,r=(lo+2*hi)/3;if(objective(l)<objective(r))hi=r;else lo=l;}
 return objective((lo+hi)/2);
}
test('independent flash exposure energy, inverse settings, EV and all supported steps: 600 seeded cases',()=>{
 for(let k=0;k<600;k++){
  const i=input({gn:5+random()*75,denominator:2**Math.floor(random()*9),iso:25*2**(random()*8),aperture:1+random()*31,loss:random()*6,cameraDistance:.1+random()*30,tolerance:.01+random()*4.99});
  const o=flash(i),energy=i.gn**2/i.denominator*(i.iso/100)/2**i.loss;
  close(o.d,Math.sqrt(energy/i.aperture**2));close(o.ev,Math.log2(energy/(i.aperture*i.cameraDistance)**2));
  close(o.needed,(i.aperture*i.cameraDistance/i.gn)**2*(100/i.iso)*2**i.loss);
  close(o.requiredAperture,Math.sqrt(energy)/i.cameraDistance);
  const choices=o.steps.map(n=>({n,ev:Math.log2(i.gn**2/n*i.iso/100/2**i.loss/(i.aperture*i.cameraDistance)**2)}));
  const best=choices.reduce((a,b)=>Math.abs(b.ev)<Math.abs(a.ev)?b:a);assert.equal(o.nearest,best.n);close(o.residual,best.ev);
  for(const [d,ev]of [[o.low,i.tolerance],[o.high,-i.tolerance]])close(Math.log2(energy/(i.aperture*d)**2),ev);
  if(k<8)rows.push({area:'flash',input:i,expected:Math.sqrt(energy/i.aperture**2),actual:o.d,error:o.d-Math.sqrt(energy/i.aperture**2)});
 }
});
test('independent thin-lens rays at DOF boundaries: 800 seeded physical cases',()=>{
 for(let k=0;k<800;k++){
  const i=input({focal:8+random()*592,aperture:1+random()*31,cameraDistance:.7+random()*200,cocMode:'custom',coc:.008+random()*.05});const o=optics(i);
  assert.ok(o.near<=i.cameraDistance&&o.far>=i.cameraDistance);close(blur(i,o.near*1000),i.coc,2e-8);
  if(Number.isFinite(o.far))close(blur(i,o.far*1000),i.coc,2e-8);else assert.ok(blur(i,Infinity)<=i.coc*(1+1e-10));
  assert.equal(o.total,o.far-o.near);assert.deepEqual(optics({...i,diagramMax:.001}),o);
 }
});
test('zone minimax independent continuous optimization, step optimality and endpoint rays: 300 seeded targets',()=>{
 for(let k=0;k<300;k++){
  const i=input({focal:8+random()*127,zoneNear:.2+random()*40,zoneFar:50+random()*150,zoneInfinity:k%3===0,apertureMax:32});const r=solveZone(i),required=optimum(i);
  close(r.required,required,1e-9);
  const steps=i.apertureSteps.split(',').map(Number).filter(n=>n>=i.apertureMin&&n<=i.apertureMax),best=steps.find(n=>n>=required);
  assert.equal(r.possible,best!==undefined);if(best!==undefined)assert.equal(r.aperture,best);
  if(r.possible){for(const u of [i.zoneNear*1000,i.zoneInfinity?Infinity:i.zoneFar*1000])assert.ok(blur(i,u,r.aperture,r.cameraDistance*1000)<=r.actual.c*(1+1e-10));}
  if(k<8)rows.push({area:'zone',input:i,expected:required,actual:r.required,error:r.required-required});
 }
});
test('mandatory examples, independent frame dimensions, nominal and dimensional crop',()=>{
 for(const [denominator,iso,loss,expected] of [[1,100,0,10],[4,100,0,5],[16,100,0,2.5],[16,400,0,5],[1,100,1,Math.sqrt(50)]]){const o=flash(input({denominator,iso,loss}));close(o.d,expected);rows.push({area:'example',denominator,iso,loss,expected,actual:o.d,error:o.d-expected});}
 close(exposureEV(5,10),-2);close(flashDistance(40,1,100,8),5);
 close(angle(1e308,1e308),53.13010235415598);close(angle(36,50),39.597752709049864);close(angle(24,50),26.991466561591622);
 for(let k=0;k<200;k++){const i=input({width:8+random()*50,height:6+random()*35,focal:8+random()*200,cameraDistance:.2+random()*50});const c=coverage(i);close(c.camera.width,i.width*i.cameraDistance/i.focal);close(c.camera.height,i.height*i.cameraDistance/i.focal);}
 for(const [sensor,crop]of [['ff',1],['apsc',1.5],['apsc16',1.6]]as const){const i=input({sensor,focal:35,aperture:2});close(equivalence(i).focal,35*crop);close(equivalence(i).aperture,2*crop);assert.deepEqual(flash({...i,cropBasis:'dimensions'}),flash(i));}
 close(optics(input({aperture:8})).airy,.010736);close(feetToMetres(1),.3048);close(feetToMetres(metresToFeet(40)),40);
});
test('hyperfocal adjacent representable distances retain finite vs mathematical infinity',()=>{
 const i=input({focal:50,aperture:4,cocMode:'custom',coc:.03});const H=optics(i).hyperfocal;
 for(const fraction of [1e-4,1e-8,1e-12,Number.EPSILON])assert.ok(Number.isFinite(optics({...i,cameraDistance:H*(1-fraction)}).far));
 assert.equal(optics({...i,cameraDistance:H}).far,Infinity);assert.equal(optics({...i,cameraDistance:H*(1+Number.EPSILON)}).far,Infinity);
});
test('fixed cancellation regression immediately below the exposed hyperfocal boundary',()=>{
 const i=input({focal:89.87400000000001,aperture:14.4,cocMode:'custom',coc:.0146});const H=optics(i).hyperfocal;
 const o=optics({...i,cameraDistance:H*(1-Number.EPSILON)});assert.ok(Number.isFinite(o.far));assert.ok(o.far>1e15);
});
test('narrow wide close far zone cases and smaller continuous apertures fail independent minimax',()=>{
 for(const [zoneNear,zoneFar]of [[2,2.0001],[.1,.15],[1,1e8],[1000,1001],[2,5]]){
  const i=input({focal:35,zoneNear,zoneFar,apertureMax:32}),r=solveZone(i),expected=optimum(i);close(r.required,expected,2e-8);
  const c=Math.hypot(i.width,i.height)/1500,s=r.cameraDistance*1000;
  assert.ok(Math.max(blur(i,zoneNear*1000,expected*.999,s),blur(i,zoneFar*1000,expected*.999,s))>c);
 }
});
test('extreme finite power requirement still chooses minimum supported output and finite residual',()=>{
 const o=flash(input({gn:1e160,cameraDistance:1,aperture:4,denominator:1}));assert.equal(o.nearest,256);assert.ok(Number.isFinite(o.residual));close(o.residual,2*(160*Math.log2(10)-2)-8);
});
test('overflowing secondary optical/equivalence outputs reject rather than return false infinity',()=>{
 assert.throws(()=>optics(input({focal:1e-160,coc:1e-320,cocMode:'custom',aperture:1e308,cameraDistance:1})));
 assert.throws(()=>equivalence(input({width:1e-300,height:1e-300,focal:1e100,cropBasis:'dimensions'})));
 assert.throws(()=>flash(input({gn:1e308,aperture:1,cameraDistance:1e308,denominator:1,tolerance:5})));
});
test('scale-aware inclusion does not turn sub-nanometre misses into coverage',()=>{
 assert.equal(includesTarget({near:1.5e-9,far:3e-9},{near:1e-9,far:2e-9}),false);
 assert.equal(includesTarget({near:1,far:5},{near:1,far:Infinity}),false);
});
test('format never displays signed zero; roundoff does not alter internal judgement',()=>{
 for(const v of [-0,-1e-8,-.004])assert.equal(fmt(v),'0');assert.equal(fmt(NaN),'—');assert.equal(fmt(-Infinity),'—');
 const f=flash(input({cameraDistance:10.000001,denominator:1}));assert.ok(f.ev<0);assert.equal(fmt(f.ev),'0');
});
test('invalid domain separated from random physical cases; infinity intent and values survive JSON',()=>{
 for(const key of ['gn','iso','aperture','cameraDistance','denominator','minDenominator','tolerance']as const)for(const value of [0,-1,NaN,Infinity,-Infinity])assert.throws(()=>flash(input({[key]:value})),key+':'+value);
 for(const key of ['width','height','focal','aperture','cameraDistance','coc']as const)for(const value of [0,-1,NaN,Infinity,-Infinity])assert.throws(()=>optics(input({cocMode:'custom',[key]:value})),key+':'+value);
 for(let k=0;k<100;k++){const i=input({zoneInfinity:!!(k%2),zoneFar:5+random()*100,cropBasis:'dimensions',cameraDistance:1+random()*20});const s=restore(JSON.parse(JSON.stringify(snapshot({version:2,inputs:i,equipment:[]},defaults))));assert.deepEqual(s.inputs,i);assert.equal(solveZone(s.inputs).target.far,i.zoneInfinity?Infinity:i.zoneFar);}
 assert.ok(Number.isNaN(parseNumber('')));assert.ok(Number.isNaN(parseNumber('NaN')));
 assert.throws(()=>footprint(1,180,20));
 const s=restore({version:2,inputs:input({gnMode:'equipment',equipmentId:'fixture',zoom:51}),equipment:[{id:'fixture',name:'fixture',source:'synthetic',conditions:'ISO100 full',table:{50:40,105:60},minDenominator:256,steps:defaults.steps}]});applyEquipment(s);assert.throws(()=>flash(s.inputs),/GN 자료 없음/);
 close(parseTable('50,100','ft')['50'],30.48);
 const md=note(input({zoneInfinity:true,zoneFlow:'target'}));assert.match(md,/목표 원거리 무한대 \| true/);assert.doesNotMatch(md,/NaN|undefined/);
});
test('250 seeded invalid-domain cases stay separate from physical-domain sampling',()=>{
 const keys=['gn','iso','aperture','cameraDistance','denominator','tolerance']as const;
 for(let j=0;j<250;j++){const key=keys[Math.floor(random()*keys.length)],bad=[0,-random()*1e6,NaN,Infinity,-Infinity][Math.floor(random()*5)];assert.throws(()=>flash(input({[key]:bad})),`invalid sample ${j}: ${key}=${bad}`);}
});
test('finite/infinite zone scale and invalid boundaries reject without serialization ambiguity',()=>{
 for(const patch of [{zoneNear:0},{zoneNear:-1},{zoneNear:NaN},{zoneFar:Infinity},{zoneNear:2,zoneFar:2},{zoneNear:3,zoneFar:2},{zoneFar:0},{zoneFar:-1},{zoneNear:1e306,zoneFar:1e307},{apertureMin:0},{apertureMax:Infinity},{apertureSteps:'1,,2'},{apertureSteps:'NaN'}])assert.throws(()=>solveZone(input(patch)));
 for(const mode of ['ttl','hss','bounce','modifier','near']as const)assert.throws(()=>flash(input({mode})));
 // Independent exact limit examples: maximum power at 10m, minimum at 10/16m.
 assert.equal(flash(input({cameraDistance:10})).status,'장비 출력 범위 안');assert.equal(flash(input({cameraDistance:.625})).status,'장비 출력 범위 안');
 assert.match(flash(input({cameraDistance:10.000001})).status,/최대/);assert.match(flash(input({cameraDistance:.624999})).status,/최소/);
});
test('write independent numerical evidence',()=>{mkdirSync('docs/calculation-audit',{recursive:true});writeFileSync('docs/calculation-audit/numerical-results.json',JSON.stringify({seed:'0x50484f54',rows},null,2));});
