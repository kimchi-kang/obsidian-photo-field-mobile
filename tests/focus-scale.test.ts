import {test} from 'node:test';
import assert from 'node:assert/strict';
import {minFocusDistance,optics} from '../src/engine';
import {defaults} from '../src/model';
import {focusScale,FOCUS_SCALE_FINITE_END,FOCUS_SCALE_MAX,FOCUS_SCALE_STEPS,FOCUS_SCALE_TICKS} from '../src/scale';

test('초점거리별 로그 축은 거리와 정수 슬라이더 위치를 왕복한다',()=>{
  for(const focal of [14,50,85,135,200,1500]) {
    const axis=focusScale(focal);
    assert.ok(axis);
    for(let step=0;step<=FOCUS_SCALE_FINITE_END*FOCUS_SCALE_STEPS;step++) {
      const position=step/FOCUS_SCALE_STEPS;
      assert.equal(Math.round(axis.position(axis.distance(position))*FOCUS_SCALE_STEPS),step);
    }
    for(const metres of [0.5,0.7,1,1.5,2,3,5,10,20].filter(d=>d>=axis.minimum)) {
      assert.ok(Math.abs(axis.distance(axis.position(metres))-metres)<1e-10, String(metres));
    }
  }
});

test('양 끝과 근접 한계는 초점거리에 따르고 범위 밖 거리는 끝에 표시한다',()=>{
  for(const focal of [14,50,200,500]) {
    const axis=focusScale(focal);
    assert.ok(axis);
    const min=minFocusDistance(focal);
    assert.equal(axis.distance(0),min);
    assert.equal(axis.distance(1),FOCUS_SCALE_MAX);
    assert.equal(axis.position(min),0);
    // 30 m보다 먼 유한 거리는 유한 구간 끝에 두고, 그 뒤의 끝 칸은 ∞만 쓴다.
    assert.equal(axis.position(FOCUS_SCALE_MAX),FOCUS_SCALE_FINITE_END);
    assert.equal(axis.position(min/2),0);
    assert.equal(axis.position(100),FOCUS_SCALE_FINITE_END);
    assert.equal(axis.position(Infinity),1);
    assert.ok((axis.position(Infinity)-axis.position(59.6))*FOCUS_SCALE_STEPS>=50);
  }
  const wide=focusScale(50), tele=focusScale(200);
  assert.ok(wide&&tele);
  assert.ok(tele.position(1)<wide.position(1));
  for(const focal of [NaN,Infinity,0,-1,8000])assert.equal(focusScale(focal),undefined);
});

test('표시 가능한 거리 눈금은 단조 증가하고 0.5~5m에 폭의 절반 이상을 쓴다',()=>{
  for(const focal of [8,14,35,50,85,124,135,200]) {
    const axis=focusScale(focal);
    assert.ok(axis);
    const ticks=FOCUS_SCALE_TICKS.filter(d=>d>=axis.minimum).map(axis.position);
    assert.ok(ticks.every((position,index)=>index===0||position>ticks[index-1]));
    if(axis.minimum<=0.5)assert.ok(axis.position(5)-axis.position(0.5)>=0.5);
  }
});

test('심도 근거리와 원거리는 같은 축에 투영되고 무한대는 오른쪽 끝에 닿는다',()=>{
  const axis=focusScale(defaults.focal);
  assert.ok(axis);
  const finite=optics(defaults);
  assert.ok(axis.position(finite.near)<axis.position(defaults.cameraDistance));
  assert.ok(axis.position(defaults.cameraDistance)<axis.position(finite.far));
  const infinity=optics({...defaults,focusInfinity:true});
  assert.ok(axis.position(infinity.near)<1);
  assert.equal(axis.position(infinity.far),1);
});
