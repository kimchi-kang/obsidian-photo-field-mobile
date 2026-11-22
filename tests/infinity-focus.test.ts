import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/model';
import {optics} from '../src/engine';
import {infinityFocus,ringPosition} from '../src/zone';
import {restore} from '../src/storage';
import {note,validateNote} from '../src/note';
import {readFileSync} from 'node:fs';

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

test('존 포커싱 노트는 화면과 같은 거리링·선명 구간을 적고 옛 목표 구간 역산을 쓰지 않는다',()=>{
  // 망원 렌즈에서 숨은 목표 근거리(2 m)가 4f보다 가까워도 저장이 막히지 않아야 한다.
  const base={...defaults,zoneOn:true,zoneGoal:'infinity' as const,focal:200,aperture:8};
  const r=infinityFocus(base),i={...base,cameraDistance:r.ring,focusInfinity:false};
  assert.doesNotThrow(()=>validateNote(i,'zone'));
  const md=note(i,new Date(0),{version:'시험',scope:'zone'});
  assert.match(md,/## 존 포커싱 · ∞까지 선명/);
  assert.match(md,/- 거리링: .*링 눈금/);
  assert.match(md,/zone_far_m: "?inf/);
  assert.doesNotMatch(md,/존 포커싱 역산|목표 근거리/);
  const range=note({...defaults,zoneOn:true,zoneGoal:'range',flashOn:true},new Date(0),{version:'시험',scope:'all'});
  assert.match(range,/## 존 포커싱 · 구간 옮기기/);
  assert.match(range,/zone_near_m:/);
  const main=readFileSync('src/main.ts','utf8');
  assert.match(main,/i\.zoneFlow='current';/);
  assert.match(main,/zoneGoal==='infinity'\)Object\.assign\(i,\{cameraDistance:infinityFocus\(i\)\.ring,focusInfinity:false\}\)/);
});

test('∞ 존과 플래시를 함께 켜면 안전 구간을 그림과 같은 심도로 계산하고 띠는 플래시 띠와 겹치지 않는다',()=>{
  const view=readFileSync('src/view.ts','utf8'),diagram=readFileSync('src/diagram.ts','utf8');
  assert.match(view,/shownLimits=optics\(shown\);[\s\S]*?safeShootingRange\(true,shownLimits,flashResult\)/);
  assert.doesNotMatch(view,/safeShootingRange\(true,focusLimits/);
  assert.match(diagram,/class:'pfm-safe-band'[\s\S]*?y:170,/);
  assert.doesNotMatch(diagram,/zone\?232/);
});
