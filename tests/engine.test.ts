import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/model';
import {angle,coverage,exposureEV,flash,flashDistance,optics,requiredPower,validate} from '../src/engine';
import {feetToMetres,metresToFeet,parseNumber} from '../src/units';
import {restore} from '../src/storage';
import {parseTable,equipmentValid} from '../src/presets';
import {note} from '../src/note';
const close=(a:number,b:number,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('GN40 ISO100 f4 最大 output -> 10m',()=>close(flashDistance(40,1,100,4),10));
test('1/4 -> 5m, not 2.5m',()=>close(flashDistance(40,1/4,100,4),5));
test('1/16 -> 2.5m',()=>close(flashDistance(40,1/16,100,4),2.5));
test('ISO400 1/16 -> 5m',()=>close(flashDistance(40,1/16,400,4),5));
test('one stop loss reduces distance by sqrt2',()=>close(flashDistance(40,1,100,4,1),10/Math.sqrt(2)));
test('double distance -> -2EV',()=>close(exposureEV(5,10),-2));
test('inverse power round trip across ISO, loss, apertures',()=>{
 for(const iso of [64,100,400,1600])for(const loss of [0,1,3])for(const r of [0.5,1,2]){const p=requiredPower(40,2.8,r,iso,loss);close(flashDistance(40,p,iso,2.8,loss),r);}
});
test('36x24 / 50mm angles',()=>{close(angle(36,50),39.59775,0.00001);close(angle(24,50),26.99147,0.00001);});
test('finite DOF beyond old 360in scene remains finite',()=>{
 const o=optics({...defaults,cameraDistance:10,aperture:4,cocMode:'custom',coc:0.03});assert.ok(Number.isFinite(o.far)&&o.far>360*0.0254);
 assert.equal(o.far,optics({...defaults,cameraDistance:10,aperture:4,cocMode:'custom',coc:0.03,diagramMax:1}).far);
});
test('hyperfocal boundary consistent with H=f²/Nc+f',()=>{
 const base={...defaults,cocMode:'custom',coc:0.03};const H=optics(base).hyperfocal;close(H,(2500/(4*0.03)+50)/1000);
 const at=optics({...base,cameraDistance:H});assert.equal(at.far,Infinity);close(at.near,H/2);
 assert.ok(Number.isFinite(optics({...base,cameraDistance:H*(1-1e-8)}).far));assert.equal(optics({...base,cameraDistance:H*1.01}).far,Infinity);
});
test('unit conversion m-ft round trip including GN',()=>{close(feetToMetres(metresToFeet(40)),40);close(flash({...defaults,gn:metresToFeet(40),gnUnit:'ft'}).d,5);});
test('reject zero, negative, NaN, empty and impossible focus distance',()=>{
 for(const x of [0,-1,NaN,Infinity]){assert.throws(()=>flashDistance(x,1,100,4));assert.throws(()=>optics({...defaults,cameraDistance:x}));}
 assert.ok(Number.isNaN(parseNumber('')));assert.ok(Number.isNaN(parseNumber(' ')));assert.ok(Number.isNaN(parseNumber('NaN')));
 assert.throws(()=>optics({...defaults,cameraDistance:0.05}));assert.throws(()=>optics({...defaults,cocMode:'custom',coc:0}));
 assert.throws(()=>flash({...defaults,denominator:0}));assert.throws(()=>coverage({...defaults,coverage:'angles',horizontal:180}));
});
test('fixed flash unaffected by focal/sensor changes',()=>{const f=flash(defaults).d;assert.equal(f,flash({...defaults,focal:135,width:17.3,height:13}).d);});
test('missing zoom GN and unsupported modes do not compute',()=>{
 assert.throws(()=>flash({...defaults,zoom:105}),/GN 자료 없음/);for(const mode of ['ttl','hss','bounce','modifier','near'] as const)assert.throws(()=>flash({...defaults,mode}),/계산할 수 없습니다/);
});
test('power limit, rounding residual and exposure tolerance',()=>{
 assert.match(flash({...defaults,cameraDistance:30}).status,/최대 출력/);assert.match(flash({...defaults,cameraDistance:0.1}).status,/최소 출력/);
 const f=flash({...defaults,cameraDistance:6});close(f.residual,Math.log2((1/f.nearest)/f.needed));close(exposureEV(f.d,f.low),1);close(exposureEV(f.d,f.high),-1);
 assert.throws(()=>flash({...defaults,steps:'1,4'}));
});
test('off camera distances independent; coverage warns on narrow flash',()=>{
 const f=flash({...defaults,linked:false,flashDistance:10,cameraDistance:2});close(f.ev,-2);close(f.r,10);
 assert.ok(coverage({...defaults,focal:24}).narrow);close(coverage(defaults).flash.width,3.6);
});
test('equipment table normalizes ft and refuses duplicate/blank values',()=>{
 const table=parseTable('35,100\n50,130','ft');close(table['35'],30.48);assert.throws(()=>parseTable('50,40\n50,45','m'));assert.throws(()=>parseTable('','m'));assert.throws(()=>parseTable('50,','m'));
 assert.ok(equipmentValid({name:'실측',conditions:'ISO100 full',source:'사용자 측정',table,minDenominator:128,steps:'1,2,4,8,16,32,64,128'}));
});
test('restores only well formed data and presets',()=>{
 const data=restore({inputs:{aperture:8,iso:null,mode:'bad'},equipment:[null,{name:1}]});assert.equal(data.inputs.aperture,8);assert.equal(data.inputs.iso,100);assert.equal(data.inputs.mode,'manual');assert.deepEqual(data.equipment,[]);
 assert.deepEqual(restore(null).inputs,defaults);
});
test('plain markdown includes inputs, results, source, date and limits',()=>{
 const md=note(defaults,new Date('2026-10-28T00:00:00Z'));for(const text of ['적정 노출 예상 거리: 5 m','Copyright','2026-10-28','ISO100','GN','심도','HSS','c75dd6'])assert.ok(md.includes(text),text);
 assert.ok(note({...defaults,mode:'hss'}).includes('플래시 계산 불가'));
 assert.ok(validate({...defaults,gn:0}).length>0);
});
test('independent thin lens defocus circle equals CoC at both DOF bounds',()=>{
 const i={...defaults,cocMode:'custom',coc:0.03,cameraDistance:5};const o=optics(i);
 const f=i.focal,s=i.cameraDistance*1000,focusImage=f*s/(s-f),opening=f/i.aperture;
 for(const r of [o.near,o.far]){const object=r*1000,image=f*object/(object-f);close(opening*Math.abs(focusImage-image)/image,i.coc);}
});
test('rounding EV agrees with forward distance equation at selected output',()=>{
 const i={...defaults,cameraDistance:6};const f=flash(i),rounded=flashDistance(40,1/f.nearest,i.iso,i.aperture);close(exposureEV(rounded,6),f.residual);
});
test('huge values reject arithmetic overflow instead of displaying spurious infinity',()=>{
 assert.throws(()=>optics({...defaults,focal:1e200,cameraDistance:1e300}));assert.throws(()=>requiredPower(40,4,1e300,100));assert.ok(Number.isFinite(exposureEV(1e300,1e-300)));
});
