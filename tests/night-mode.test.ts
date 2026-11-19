import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/model';
import {restore,snapshot} from '../src/storage';
import {flash,optics} from '../src/engine';

test('새 야간 모드 기본값은 꺼짐이며 이전 저장 데이터에는 이 값만 추가한다',()=>{
  assert.equal(defaults.nightMode,false);
  assert.equal(restore(undefined).inputs.nightMode,false);
  const {nightMode,...legacyInputs}={...defaults,cameraDistance:3.14159,flashDistance:3.14159,iso:800};
  const legacy={version:2,inputs:legacyInputs,equipment:[],field:{version:1,distances:[],shots:[],zones:[]}};
  const original=JSON.stringify(legacy);
  assert.deepEqual(restore(legacy).inputs,{...legacyInputs,nightMode:false});
  assert.equal(JSON.stringify(legacy),original);
  assert.equal(restore({...legacy,inputs:{...legacyInputs,nightMode:'true'}}).inputs.nightMode,false);
});

test('야간 모드 설정을 복원하고 심도 및 플래시 계산값을 유지한다',()=>{
  const state=restore(null);
  const expected={optics:optics(state.inputs),flash:flash(state.inputs)};
  state.inputs.nightMode=true;
  const saved=restore(snapshot(state,defaults));
  assert.equal(saved.inputs.nightMode,true);
  assert.deepEqual({optics:optics(saved.inputs),flash:flash(saved.inputs)},expected);
});
