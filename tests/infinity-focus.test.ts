import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/model';
import {optics} from '../src/engine';
import {infinityFocus,ringPosition} from '../src/zone';
import {restore} from '../src/storage';

const base={...defaults,focal:50,aperture:8,width:36,height:24,cocMode:'film' as const};

test('∞ 초점링 위치는 과초점이고, 그때 원거리는 ∞, 근거리는 약 절반이다',()=>{
  const r=infinityFocus(base);
  assert.equal(r.ring,optics(base).hyperfocal);
  const at=optics({...base,cameraDistance:r.ring,focusInfinity:false});
  assert.equal(at.far,Infinity);
  assert.ok(Math.abs(r.near-r.ring/2)/r.ring<.03,`${r.near} vs ${r.ring/2}`);
});
test('조리개를 조이면 초점링 위치가 가까워진다',()=>{
  const f4=infinityFocus(base,4),f16=infinityFocus(base,16);
  assert.ok(f16.ring<f4.ring&&f16.near<f4.near);
  assert.equal(f16.aperture,16);
});
test('거리링 눈금 위치를 눈금 위 또는 두 눈금 사이로 알려준다',()=>{
  assert.deepEqual(ringPosition(5.05),{on:5});
  assert.deepEqual(ringPosition(4),{between:[3,5]});
  assert.deepEqual(ringPosition(21.8),{between:[10,Infinity]});
  assert.deepEqual(ringPosition(.4),{between:[0,.45]});
});
test('존 목표 방식은 기본 ∞이고 잘못된 값은 ∞로 복원한다',()=>{
  assert.equal(defaults.zoneGoal,'infinity');
  assert.equal(restore({version:2,inputs:{...defaults,zoneGoal:'x'}}).inputs.zoneGoal,'infinity');
  assert.equal(restore({version:2,inputs:{...defaults,zoneGoal:'range'}}).inputs.zoneGoal,'range');
});
