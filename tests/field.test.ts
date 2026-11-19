import {test} from 'node:test';
import assert from 'node:assert/strict';
import {restore,snapshot} from '../src/storage';
import {canUndo,nextPower,patch,undo,shootingKeys,restoreField} from '../src/field';
import {flash} from '../src/engine';
import {defaults} from '../src/model';
import {selectEquipment} from '../src/presets';

const legacyValues=Object.fromEntries(shootingKeys.map(key=>[key,defaults[key]]));

test('실측 GN 되돌리기는 이후 변경과 겹치면 적용하지 않는다',()=>{
  const i={...defaults};
  const first=patch(i,{loss:1});
  i.iso=800;
  assert.ok(undo(i,first));
  assert.equal(i.iso,800);
  const second=patch(i,{loss:2});
  i.loss=3;
  assert.equal(canUndo(i,second),false);
  assert.equal(undo(i,second),false);
  assert.equal(i.loss,3);
});

test('불규칙한 지원 출력은 이론값과 양 끝에서도 실제 장비 단계대로 이동한다',()=>{
  const i={...defaults,steps:'1,3,7,20',minDenominator:20};
  for(const [value,weaker,stronger] of [[1,3,undefined],[3,7,1],[5,7,3],[7,20,3],[20,undefined,7],[30,undefined,20],[.5,1,undefined]] as const){
    i.denominator=value;
    assert.equal(nextPower(i,'weaker'),weaker);
    assert.equal(nextPower(i,'stronger'),stronger);
  }
  i.gn=0;i.denominator=5;
  assert.equal(nextPower(i,'weaker'),7);
  assert.throws(()=>flash(i));
});

test('사용하지 않는 현장 즐겨찾기와 거리, 조사각, 그림 범위는 저장·복원 후 유지된다',()=>{
  const field={
    version:1,simple:true,activeShotId:'shot',
    distances:[{id:'distance-b',metres:19},{id:'distance-a',metres:.8}],
    shots:[{id:'shot',name:'거리 촬영',values:{...legacyValues,cameraDistance:4,flashDistance:3,focusInfinity:false}}],
    zones:[{id:'zone',name:'무한대',near:4,far:6,infinity:true}],
  };
  const s=restore({version:2,field,inputs:{...defaults,coverage:'angles',horizontal:61,vertical:39,diagramMax:12,tolerance:.5,zoneFlow:'current',flashDistance:7}});
  Object.assign(s.inputs,{zoneOn:true,flashOn:true,cameraDistance:2});
  const recovered=restore(snapshot(s,defaults));
  assert.deepEqual(recovered.field,field);
  for(const key of ['coverage','horizontal','vertical','diagramMax','tolerance','zoneFlow','flashDistance'] as const)
    assert.equal(recovered.inputs[key],s.inputs[key],key);
});

test('기존 즐겨찾기의 장비 정보가 바뀌면 이전 GN을 차단하고 장비 재선택 후 기록을 보존한다',()=>{
  const equipment={id:'gear',name:'장비',source:'시험',conditions:'ISO100',table:{50:20},steps:'1,3,7,20',minDenominator:20};
  const field={version:1,activeShotId:'shot',shots:[{
    id:'shot',name:'기존 설정',values:{...legacyValues,gnMode:'equipment',equipmentId:'gear'},equipmentSignature:'이전 장비 사양'
  }]};
  const s=restore({version:2,field,equipment:[equipment],inputs:{...defaults,gnMode:'equipment',equipmentId:'gear'}});
  const original=s.field;
  assert.throws(()=>flash(s.inputs));
  assert.equal(nextPower(s.inputs,'weaker'),7);
  selectEquipment(s,'gear');
  const recovered=restore(snapshot(s,defaults));
  assert.equal(flash(recovered.inputs).g,20);
  assert.deepEqual(recovered.field,original);
  const missing=restore({version:2,field,inputs:{...defaults,gnMode:'equipment',equipmentId:'gear'}});
  assert.throws(()=>flash(missing.inputs));
  assert.equal(nextPower(missing.inputs,'stronger'),undefined);
});

test('현장 설정의 유효한 기록만 복원하고 더 새 스키마는 보존을 위해 거부한다',()=>{
  const old={version:2,inputs:defaults,equipment:[],draft:{name:'미완성',table:'50,'}};
  const s=restore(old);
  assert.deepEqual(s.inputs,old.inputs);
  assert.equal(s.draft?.table,'50,');
  assert.deepEqual(s.migrationBackup,old);
  assert.throws(()=>restore({...s,field:{version:2}}),/스키마/);
  const invalid=restoreField({
    version:1,distances:[{id:'a',metres:-1},{id:'b',metres:1},{id:'c',metres:1}],
    shots:[{id:'x',name:'잘못된 기록',values:{}}],zones:[{id:'z',name:'잘못된 범위',near:5,far:1,infinity:false}],
  });
  assert.equal(invalid.distances.length,1);
  assert.equal(invalid.shots.length,0);
  assert.equal(invalid.zones.length,0);
});
