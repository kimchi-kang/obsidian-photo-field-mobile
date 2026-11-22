import test from 'node:test';
import assert from 'node:assert/strict';
import {formatSeconds,parseSeconds} from '../src/units';
import {FM2_SHUTTERS} from '../src/model';

test('카메라 편집 칸의 셔터·동조는 분수로 보이고 다시 읽으면 같은 값이다',()=>{
  assert.equal(formatSeconds(1/60),'1/60');
  assert.equal(formatSeconds(1/250),'1/250');
  assert.equal(formatSeconds(0.004),'1/250');
  assert.equal(formatSeconds(1),'1');
  assert.equal(formatSeconds(2),'2');
  assert.equal(formatSeconds(0.3),'0.3');
  for(const n of FM2_SHUTTERS){const s=1/n;assert.equal(parseSeconds(formatSeconds(s)),s,String(n));}
  assert.doesNotMatch(FM2_SHUTTERS.map(n=>formatSeconds(1/n)).join(','),/0\.0/);
});
