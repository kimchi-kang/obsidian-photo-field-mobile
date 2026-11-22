import test from 'node:test';
import assert from 'node:assert/strict';
import {diffractionRisk,exposurePairs,EXPOSURE_SCENES,framingDistance,strides,FACE_DEPTH} from '../src/field-guide';
import {FM2_SHUTTERS,defaults} from '../src/model';
import {optics} from '../src/engine';
import {restore} from '../src/storage';

const F14=[1.4,2,2.8,4,5.6,8,11,16];

test('35mm CoC 0.03mm에서 회절 주의는 f/16부터 붙고 f/11까지는 붙지 않는다',()=>{
  assert.deepEqual(F14.filter(n=>diffractionRisk(n,0.03)),[16]);
  assert.equal(diffractionRisk(22,0.03),true);
  assert.equal(diffractionRisk(NaN,0.03),false);
});

test('맑음 EV15는 Sunny 16: EI 250이면 f/16 · 1/250, 더 열면 셔터 한계를 표시한다',()=>{
  assert.equal(EXPOSURE_SCENES.find(s=>s.id==='sun')!.ev,15);
  const rows=exposurePairs(15,250,F14,[...FM2_SHUTTERS],50);
  const at=(n:number)=>rows.find(r=>r.aperture===n)!;
  assert.equal(at(16).shutter,250);
  assert.equal(at(8).shutter,1000);
  assert.equal(at(4).shutter,4000);
  assert.ok(Math.abs(at(16).residual)<.4);
  assert.equal(at(4).tooBright,false);
  assert.equal(at(2).tooBright,true);
  assert.ok(rows.every(r=>!r.shake&&!r.long));
});

test('어두운 장면은 손떨림·장노출·B를 표시하고 플래시 동조 초과를 구분한다',()=>{
  const night=exposurePairs(6,250,F14,[...FM2_SHUTTERS,0],50);
  assert.equal(night.find(r=>r.aperture===2.8)!.shake,true);
  const slow=night.find(r=>r.aperture===16)!;
  assert.equal(slow.long,true);assert.equal(slow.shutter,'B');
  const sun=exposurePairs(15,100,F14,[...FM2_SHUTTERS],50,250);
  assert.equal(sun.find(r=>r.aperture===16)!.overSync,false);
  assert.equal(sun.find(r=>r.aperture===8)!.overSync,true);
});

test('구도별 거리는 50mm 세로 프레임에서 전신 약 2.9m, 상반신 약 1.35m이고 걸음으로 환산한다',()=>{
  const full=framingDistance(50,36,2.0),half=framingDistance(50,36,.9);
  assert.ok(Math.abs(full-2.88)<.02,String(full));
  assert.ok(Math.abs(half-1.35)<.02,String(half));
  assert.ok(framingDistance(50,24,2.0)>full);
  assert.ok(framingDistance(28,36,2.0)<full);
  assert.equal(strides(full),4);
  assert.ok(Number.isNaN(framingDistance(50,36,0)));
});

test('50mm f/1.4 · 1.2m 인물은 심도가 얼굴 두께보다 얕다',()=>{
  const o=optics({...defaults,focal:50,aperture:1.4,cameraDistance:1.2});
  assert.ok(o.total<FACE_DEPTH);
  assert.ok(optics({...defaults,focal:50,aperture:8,cameraDistance:3}).total>FACE_DEPTH);
});

test('장면·카메라 방향 저장값은 기본값이 있고 잘못된 값은 되돌린다',()=>{
  assert.equal(defaults.exposureScene,'sun');assert.equal(defaults.framing,'portrait');
  const bad=restore({version:2,inputs:{...defaults,exposureScene:'x',framing:'y'}}).inputs;
  assert.deepEqual([bad.exposureScene,bad.framing],['sun','portrait']);
  const good=restore({version:2,inputs:{...defaults,exposureScene:'night',framing:'landscape'}}).inputs;
  assert.deepEqual([good.exposureScene,good.framing],['night','landscape']);
});
