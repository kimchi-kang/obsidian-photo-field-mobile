import assert from 'node:assert/strict';
import {test} from 'node:test';
import {defaults} from '../src/model';
import {note} from '../src/note';
import {RECIPROCITY_FILMS as films,correctedTime,formatExposureSeconds,formatExposureMinutes} from '../src/reciprocity';
import {restore,snapshot} from '../src/storage';

test('다섯 필름과 직접 입력만 제공하고 1초까지는 노출을 늘리지 않는다',()=>{
  assert.deepEqual(Object.keys(films),['vision3-250d','vision3-500t','double-x','ektachrome-100d','ultramax-400','custom']);
  for(const film of Object.values(films)){
    for(const metered of [0.5,1]){
      const result=correctedTime(metered,film);
      assert.equal(result.corrected,metered);
      assert.equal(result.extraStops,0);
      assert.equal(result.basis,'uncorrected');
      assert.equal(result.filter,undefined);
    }
  }
  assert.ok(correctedTime(1.00001,films['vision3-500t']).corrected<1.00002);
});

test('Vision3 두 종은 10초를 약 19.95초와 +1스톱으로 환산하고 5초부터 필터를 권장한다',()=>{
  for(const film of [films['vision3-250d'],films['vision3-500t']]){
    const result=correctedTime(10,film);
    assert.ok(Math.abs(result.corrected-19.95)<0.01);
    assert.ok(Math.abs(result.extraStops-1)<0.01);
    assert.equal(result.basis,'community');
    assert.equal(result.filter,'CC10R 필터 권장(Kodak 10초 기준)');
    assert.equal(correctedTime(4.999,film).filter,undefined);
    assert.equal(correctedTime(5,film).filter,result.filter);
  }
});

test('Double-X의 1.31 지수와 리버설 필름의 별도 브라케팅 안내를 적용한다',()=>{
  const result=correctedTime(10,films['double-x']);
  assert.equal(result.corrected,10**1.31);
  assert.equal(result.filter,undefined);
  assert.equal(result.bracket,'브라케팅 권장(+1스톱 한 장 추가)');
  const reversal=correctedTime(10,films['ektachrome-100d']);
  assert.equal(reversal.filter,undefined);
  assert.equal(reversal.bracket,'리버설 · ±1/2~1스톱 브라케팅 권장');
});

test('실측 지수를 필름별로 저장하고 초기화한 필름만 커뮤니티 지수로 돌아간다',()=>{
  const state=restore(undefined);
  Object.assign(state.inputs,{
    reciprocityFilm:'vision3-250d',meteredSeconds:10,
    reciprocityOverrides:{'vision3-250d':1.5,'vision3-500t':1.4,custom:2},
  });
  const {inputs}=restore(snapshot(state,defaults));
  assert.equal(inputs.reciprocityFilm,'vision3-250d');
  assert.equal(inputs.meteredSeconds,10);
  const selected=films[inputs.reciprocityFilm];
  const measured=correctedTime(inputs.meteredSeconds,selected,inputs.reciprocityOverrides[selected.id]);
  assert.equal(measured.corrected,10**1.5);
  assert.equal(measured.basis,'measured');
  delete inputs.reciprocityOverrides[selected.id];
  const reset=restore(snapshot({...state,inputs},defaults)).inputs.reciprocityOverrides;
  assert.equal(correctedTime(10,selected,reset[selected.id]).basis,'community');
  assert.equal(correctedTime(10,films.custom,reset.custom).corrected,100);
  assert.deepEqual(reset,{'vision3-500t':1.4,custom:2});
  assert.deepEqual(restore(undefined).inputs.reciprocityOverrides,{});
});

test('측광 시간·지수 오류와 계산 범위 초과에 각각 이유를 표시한다',()=>{
  const film=films['vision3-500t'];
  for(const value of [0,-1,NaN,Infinity])assert.throws(()=>correctedTime(value,film),/측광 시간은 양의 유한한/);
  for(const p of [0.99,2.01,NaN,Infinity])assert.throws(()=>correctedTime(1,film,p),/지수 p는 1.0~2.0/);
  assert.equal(correctedTime(3,film,1).corrected,3);
  assert.throws(()=>correctedTime(3,films.custom),/실측 지수/);
  assert.throws(()=>correctedTime(Number.MAX_VALUE,film,2),/계산 범위/);
});

test('이전 저장 데이터는 장노출 기본값을 채우고 잘못 저장된 값은 골라낸다',()=>{
  const {reciprocityFilm,reciprocityOverrides,meteredSeconds,...legacy}={...defaults,iso:800,nightMode:true};
  const restored=restore({version:2,inputs:legacy,equipment:[]});
  assert.deepEqual(restored.inputs,{...legacy,reciprocityFilm:'vision3-500t',reciprocityOverrides:{},meteredSeconds:4});
  const invalid=restore({version:2,inputs:{
    ...legacy,reciprocityFilm:'constructor',meteredSeconds:-1,
    reciprocityOverrides:JSON.parse('{"double-x":1.4,"custom":"1.5","vision3-500t":3,"__proto__":1.3}'),
  }});
  assert.equal(invalid.inputs.reciprocityFilm,reciprocityFilm);
  assert.equal(invalid.inputs.meteredSeconds,meteredSeconds);
  assert.deepEqual(invalid.inputs.reciprocityOverrides,{...reciprocityOverrides,'double-x':1.4});
});

test('60초부터 분·초를 병기하고 반올림으로 60초가 되면 다음 분으로 올린다',()=>{
  assert.equal(formatExposureSeconds(19.9526),'19.95초');
  assert.equal(formatExposureSeconds(.001),'0.01초 미만');
  assert.equal(formatExposureMinutes(59.999),'');
  assert.equal(formatExposureMinutes(60),'1분 0초');
  assert.equal(formatExposureMinutes(92),'1분 32초');
  assert.equal(formatExposureMinutes(92.25),'1분 32.25초');
  assert.equal(formatExposureMinutes(119.999),'2분 0초');
});

test('장노출 설정은 기존 촬영 노트에 영향을 주지 않는다',()=>{
  const at=new Date(2026,10,20);
  const changed={...defaults,reciprocityFilm:'custom' as const,meteredSeconds:95,reciprocityOverrides:{custom:1.5}};
  assert.equal(note(changed,at),note(defaults,at));
});
