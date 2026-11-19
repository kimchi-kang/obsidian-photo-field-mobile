import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,Equipment} from '../src/model';
import {flash,optics} from '../src/engine';
import {note,NoteScope} from '../src/note';

const date=new Date(2026,10,19,3,4,5);
const version='1.6.1';
const opticalKeys=['coc_mm','dof_near_m','dof_far_m','hyperfocal_m'];
const flashKeys=['flash_gn','flash_power','flash_distance_m','flash_ev','equipment'];
const zoneKeys=['zone_near_m','zone_far_m'];

function splitNote(markdown:string) {
  const block=/^---\n([\s\S]*?)\n---\n\n(#[\s\S]+)$/.exec(markdown);
  assert.ok(block);
  const properties=new Map<string,unknown>();
  for(const line of block[1].split('\n')) {
    const entry=/^([a-z_]+): (.+)$/.exec(line);
    assert.ok(entry,line);
    const [,key,value]=entry;
    assert.ok(!properties.has(key),key);
    properties.set(key,key==='tags'?value:JSON.parse(value));
  }
  return {properties,body:block[2]};
}

test('노트 범위별 속성, 로컬 날짜와 숫자 타입을 기록한다',()=>{
  for(const scope of ['all','flash','combined','dof','zone'] as const satisfies NoteScope[]) {
    const inputs={...defaults,cameraDistance:5.1234};
    const {properties}=splitNote(note(inputs,date,{scope,version}));
    assert.equal(properties.get('date'),'2026-11-19T03:04:05');
    assert.equal(properties.get('plugin_version'),version);
    assert.equal(properties.get('scope'),scope);
    assert.equal(properties.get('format'),'35mm 필름');
    assert.equal(properties.get('focal_mm'),50);
    assert.equal(properties.get('aperture'),4);
    assert.equal(properties.get('iso'),400);
    assert.equal(properties.get('focus_m'),5.12);
    assert.equal(properties.get('tags'),'[photo-field]');
    for(const key of opticalKeys)assert.equal(typeof properties.get(key),'number',key);
    const withFlash=scope==='all'||scope==='flash'||scope==='combined';
    for(const key of flashKeys)assert.equal(properties.has(key),withFlash,key);
    for(const key of zoneKeys)assert.equal(properties.has(key),scope==='zone',key);
    if(withFlash) {
      assert.equal(properties.get('equipment'),'manual');
      assert.equal(properties.get('flash_power'),'1/4');
      assert.equal(properties.get('flash_gn'),flash(inputs).gn);
      assert.equal(properties.get('flash_distance_m'),5.12);
      assert.equal(properties.get('flash_ev'),Number(flash(inputs).ev.toFixed(2)));
    }
    if(scope==='zone') {
      assert.equal(properties.get('zone_near_m'),Number(optics(inputs).near.toFixed(2)));
      assert.equal(properties.get('zone_far_m'),Number(optics(inputs).far.toFixed(2)));
    }
  }
});

test('장비 이름에 든 콜론, 주석 기호, 따옴표와 줄바꿈을 문자열로 보존한다',()=>{
  const equipment:Equipment={
    id:'flash',name:`헤드: "A" #1 '직접광'\\\n보조\u0085장비`,conditions:'직접광',
    source:'제조사',table:{50:40},minDenominator:256,steps:defaults.steps,
  };
  const inputs={...defaults,gnMode:'equipment' as const,equipmentId:equipment.id};
  const {properties}=splitNote(note(inputs,date,{version,equipment}));
  assert.equal(properties.get('equipment'),equipment.name);
});

test('무한대 속성은 문자열이고 실패한 계산 속성은 생략한다',()=>{
  const infinite=splitNote(note({...defaults,focusInfinity:true,zoneFlow:'target',zoneInfinity:true},date,{scope:'zone',version})).properties;
  for(const key of ['focus_m','dof_far_m','zone_far_m'])assert.equal(infinite.get(key),'inf');
  assert.equal(infinite.get('zone_near_m'),defaults.zoneNear);
  const invalid=splitNote(note({...defaults,aperture:NaN},date,{version})).properties;
  for(const key of ['aperture',...opticalKeys,...flashKeys.filter(key=>key!=='equipment')])assert.ok(!invalid.has(key),key);
});

test('입력값과 출력별 거리 표는 프론트매터 뒤에서 연속된 행을 유지한다',()=>{
  const {body}=splitNote(note(defaults,date,{version}));
  assert.match(body,/^# 사진 촬영 계산\n/);
  assert.match(body,/## 입력값\n\n\| 항목 \| 값 \|\n\| --- \| --- \|\n(?:\|[^\n]+\n){38}\n## 계산 결과/);
  assert.match(body,/### 출력별 거리\n\n\| 출력 \| 적정 노출 예상 거리 \|\n\| --- \| --- \|\n(?:\|[^\n]+\n){9}\n/);
  assert.equal(note({...defaults,nightMode:true},date,{version}),note(defaults,date,{version}));
});
