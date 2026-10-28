import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/model';
import {restore,snapshot} from '../src/storage';
import {flash,optics,footprint,flashDistance} from '../src/engine';

test('blank input preserves its last finite value while equipment and tab changes persist',()=>{
 const equipment={name:'test',conditions:'ISO100 full',source:'synthetic',table:{'50':40},minDenominator:256,steps:defaults.steps};
 const saved=snapshot({version:1,inputs:{...defaults,aperture:NaN,tab:'dof'},equipment:[equipment]}, {...defaults,aperture:8});
 assert.equal(saved.inputs.aperture,8);assert.equal(saved.inputs.tab,'dof');assert.deepEqual(restore(saved).equipment,[equipment]);assert.ok(!JSON.stringify(saved).includes('null'));
});
test('rapid valid then blank edits preserve latest finite snapshot',()=>{
 const one=snapshot({version:1,inputs:{...defaults,cameraDistance:7},equipment:[]},defaults);
 const two=snapshot({version:1,inputs:{...defaults,cameraDistance:NaN,flashDistance:NaN},equipment:[]},one.inputs);
 assert.equal(two.inputs.cameraDistance,7);assert.equal(two.inputs.flashDistance,5);
});
test('missing preset GN remains unavailable after persistence and restore',()=>{
 const saved=snapshot({version:1,inputs:{...defaults,gnZoom:0},equipment:[]},defaults);
 assert.throws(()=>flash(restore(saved).inputs),/GN 자료 없음/);
});
test('hyperfocal button distance reliably gives infinity across focal lengths and apertures',()=>{
 for(const focal of [8,14,24,35,50,85,135,200,600])for(const aperture of [1.4,2,2.8,4,5.6,8,11,16,22])for(const coc of [0.015,0.019,0.029,0.03]){
  const i={...defaults,focal,aperture,cocMode:'custom',coc};const h=optics(i).hyperfocal;
  const at=optics({...i,cameraDistance:h});assert.equal(at.far,Infinity,`${focal} ${aperture} ${coc}`);
  assert.ok(Number.isFinite(optics({...i,cameraDistance:h*(1-1e-8)}).far));
 }
});
test('inactive offcamera field does not invalidate linked flash calculation',()=>{
 assert.equal(flash({...defaults,linked:true,flashDistance:NaN}).d,5);
 assert.equal(flash({...defaults,linked:false,cameraDistance:NaN,flashDistance:5}).d,5);
});
test('overflowing footprints and underflowing distances reject rather than claim infinity/zero',()=>{
 assert.throws(()=>footprint(1e308,179,179));assert.throws(()=>flashDistance(1e-300,1,100,1e300));
});
