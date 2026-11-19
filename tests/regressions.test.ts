import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults as filmDefaults} from '../src/model';import {digitalDefaults as defaults} from './digital-reference';
import {restore,snapshot} from '../src/storage';
import {flash,optics,footprint,flashDistance} from '../src/engine';
import {note,noteTimestamp} from '../src/note';
import {stepDistance} from '../src/units';

const view=readFileSync(new URL('../src/view.ts',import.meta.url),'utf8');

test('blank input preserves its last finite value while equipment and tab changes persist',()=>{
 const equipment={id:'fixture',name:'test',conditions:'ISO100 full',source:'synthetic',table:{'50':40},minDenominator:256,steps:defaults.steps};
 const saved=snapshot({version:2,inputs:{...defaults,aperture:NaN,tab:'dof'},equipment:[equipment]}, {...defaults,aperture:8});
 assert.equal(saved.inputs.aperture,8);assert.equal(saved.inputs.tab,'dof');assert.deepEqual(restore(saved).equipment,[equipment]);assert.ok(!JSON.stringify(saved).includes('null'));
});
test('rapid valid then blank edits preserve latest finite snapshot',()=>{
 const one=snapshot({version:2,inputs:{...defaults,cameraDistance:7},equipment:[]},defaults);
 const two=snapshot({version:2,inputs:{...defaults,cameraDistance:NaN,flashDistance:NaN},equipment:[]},one.inputs);
 assert.equal(two.inputs.cameraDistance,7);assert.equal(two.inputs.flashDistance,5);
});
test('missing preset GN remains unavailable after persistence and restore',()=>{
 const saved=snapshot({version:2,inputs:{...defaults,gnZoom:0},equipment:[]},defaults);
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
test('저장 범위별 입력값 표는 구분선 바로 다음부터 연속된 행으로 이어진다',()=>{
 const metadata=['저장 범위','플러그인 버전','GN 입력 모드','선택 장비','장비 출처'];
 const zoneLabels=['존 흐름','목표 근거리','목표 유한 원거리 (무한대 선택 시 미사용)','목표 원거리 무한대','렌즈 최대 개방 f값','렌즈 최소 개방 f값','사용 가능한 실제 조리개 단계'];
 for(const scope of ['all','combined','flash','dof','zone'] as const){
  const lines=note({...filmDefaults,zoneInfinity:true},new Date(0),{version:'시험',scope}).split('\n');
  const header=lines.indexOf('| 항목 | 값 |');
  assert.ok(header>=0);
  assert.equal(lines[header+1],'| --- | --- |');
  const rows=lines.slice(header+2,lines.indexOf('',header+2));
  assert.ok(rows.length>0);
  assert.ok(rows.every(row=>row.startsWith('|')),scope);
  for(const label of metadata)assert.ok(lines.slice(0,header).some(line=>line.startsWith(label+':')),label);
  for(const label of zoneLabels)assert.equal(rows.some(row=>row.startsWith(`| ${label} | `)),scope!=='dof'&&scope!=='flash',label);
  if(scope==='zone')assert.ok(rows.includes('| 목표 유한 원거리 (무한대 선택 시 미사용) | 미사용 |'));
 }
 assert.match(note({...filmDefaults,zoneInfinity:false,zoneFar:5},new Date(0),{version:'시험',scope:'zone'}),/\| 목표 유한 원거리 \(무한대 선택 시 미사용\) \| 5 m \|/);
});
test('카메라 거리 슬라이더의 하한은 화면 갱신마다 현재 초점거리를 반영한다',()=>{
 assert.match(view,/'cameraDistance',\{min:\(\)=>minFocusDistance\(i\.focal\)/);
 assert.match(view,/const updateRangeMinimum=\(\)=>\{[\s\S]*?const next=options\.min\(\);[\s\S]*?range\.min=String\(minimum\);/);
 assert.match(view,/const updateControls=\(\)=>\{updateRangeMinimum\(\)/);
 assert.match(view,/for\(const pair of this\.numeric\.values\(\)\)pair\.updateControls\(\)/);
});
test('거리 증감은 1m와 10m 양쪽에서 되돌릴 수 있고 최소 초점거리를 지킨다',()=>{
 for(const [boundary,below,above] of [[1,.99,1.1],[10,9.9,11]]){
  for(const distance of [boundary,boundary-1e-12,boundary+1e-12]){
   assert.equal(stepDistance(distance,-1,.01),below);
   assert.equal(stepDistance(distance,1,.01),above);
  }
  assert.equal(stepDistance(below,1,.01),boundary);
  assert.equal(stepDistance(above,-1,.01),boundary);
 }
 assert.equal(stepDistance(.995,1,.01),1);
 assert.equal(stepDistance(1.05,-1,.01),1);
 assert.equal(stepDistance(9.95,1,.01),10);
 assert.equal(stepDistance(10.5,-1,.01),10);
 assert.equal(stepDistance(1.05,-1,1.02),1.02);
 assert.equal(stepDistance(1.02,-1,1.02),undefined);
 assert.equal(stepDistance(1-1e-12,-1,1-1e-12),undefined);
});
test('저장 파일명 시각은 기기 시간대와 날짜 경계를 반영한다',()=>{
 const previous=process.env.TZ;
 try{
  process.env.TZ='Asia/Seoul';
  const date=new Date('2026-01-08T15:04:05.123Z');
  assert.equal(noteTimestamp(date),'2026-01-09 00-04-05');
  process.env.TZ='America/Los_Angeles';
  assert.equal(noteTimestamp(date),'2026-01-08 07-04-05');
 }finally{
  if(previous===undefined)delete process.env.TZ;
  else process.env.TZ=previous;
 }
});
test('거리 칩과 출력 단계는 입력 동기화 후 한 번 갱신하고 포커스를 복원한다',()=>{
 const action=view.slice(view.indexOf('private fieldAction('),view.indexOf('private fieldPanel('));
 assert.equal(action.match(/this\.changed\(\)/g)?.length,1);
 assert.match(action,/if\(quick\)\{\s*this\.syncNumeric\(quick\.key\);[\s\S]*?setAttribute\('aria-invalid','false'\);\s*\}\s*this\.changed\(\);/);
 assert.match(action,/if\(quick\)\{[\s\S]*?target\?\.focus\(\{preventScroll:true\}\);\s*\}else this\.render\(\);/);
 assert.match(view,/\[data-distance-id=.*?\.pfm-distance-buttons details > summary/);
 assert.match(view,/this\.plugin\.update\(key,d\.metres\);[\s\S]*?\},\{key,focus\}\)/);
 assert.match(view,/\{key:'denominator',focus:`\[data-power-direction=\$\{dir\}\]:enabled`,fallback:'\[data-power-direction\]:enabled'\}/);
});
