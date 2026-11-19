import assert from 'node:assert/strict';
import {test} from 'node:test';
import {flash,optics} from '../src/engine';
import {calibrateGN,fillFlash,flashCheatsheet,nominalGN,safeShootingRange} from '../src/flash-tools';
import {defaults} from '../src/model';
import {cheatsheetNote,note} from '../src/note';
import {restore,snapshot} from '../src/storage';

test('안전 구간은 두 계산의 교집합이며 경계 한 점과 원거리 무한대를 포함한다',()=>{
  const depth={near:2,far:Infinity};
  assert.deepEqual(safeShootingRange(true,depth,{low:1,high:3.6}),{kind:'range',near:2,far:3.6});
  assert.deepEqual(safeShootingRange(true,depth,{low:1,high:2}),{kind:'range',near:2,far:2});
  assert.deepEqual(safeShootingRange(true,depth,{low:1,high:1.99}),{kind:'empty'});
  assert.deepEqual(safeShootingRange(false),{kind:'off-camera'});
  assert.deepEqual(safeShootingRange(true,optics({...defaults,focusInfinity:true})),{kind:'unavailable'});
  assert.deepEqual(safeShootingRange(true,{near:NaN,far:Infinity},flash(defaults)),{kind:'unavailable'});
  const i={...defaults,cameraDistance:30,denominator:1,aperture:2.8};
  const o=optics(i),f=flash(i);
  assert.equal(o.far,Infinity);
  assert.deepEqual(safeShootingRange(i.linked,o,f),{kind:'range',near:Math.max(o.near,f.low),far:f.high});
});

test('통합·전체 노트에만 안전 구간을 기록하며 교집합이 없으면 속성을 생략한다',()=>{
  const date=new Date(2026,10,20,9,12,33);
  const i={...defaults,iso:100};
  for(const scope of ['all','combined'] as const){
    const md=note(i,date,{version:'테스트',scope});
    assert.match(md,/^safe_near_m: [\d.]+$/m);
    assert.match(md,/^safe_far_m: [\d.]+$/m);
    assert.match(md,/^- 안전 촬영 구간 .+ ~ .+$/m);
  }
  assert.doesNotMatch(note(i,date,{version:'테스트',scope:'flash'}),/safe_near_m|안전 촬영 구간/);
  const offCamera=note({...i,linked:false},date);
  assert.match(offCamera,/오프카메라 · 교집합 계산 안 함/);
  assert.doesNotMatch(offCamera,/safe_(near|far)_m/);
  const nonoverlap=note({...i,denominator:256},date);
  assert.match(nonoverlap,/겹치는 구간 없음/);
  assert.doesNotMatch(nonoverlap,/safe_(near|far)_m/);
  const infinity=note({...i,focusInfinity:true},date);
  assert.match(infinity,/안전 촬영 구간 계산 불가/);
  assert.doesNotMatch(infinity,/safe_(near|far)_m/);
});

test('실측 GN 역산은 ISO·출력을 정규화하고 공칭보다 강한 광량도 적용한다',()=>{
  const measurement={iso:400,denominator:4,distance:2,aperture:5.6};
  const steps=[1,2,4,8];
  assert.deepEqual(calibrateGN(measurement,steps),{gn:11.2});
  assert.ok(Math.abs(calibrateGN(measurement,steps,22.4).loss!-2)<1e-12);
  const nominal=nominalGN({...defaults,gn:5.6/0.3048,gnUnit:'ft',loss:3});
  const {loss}=calibrateGN(measurement,steps,nominal);
  assert.ok(Math.abs(loss!+2)<1e-12);
  const {iso,denominator,aperture,distance}=measurement;
  const result=flash({...defaults,gn:nominal,loss:loss!,iso,denominator,aperture,cameraDistance:distance});
  assert.ok(Math.abs(result.ev)<1e-12);
  assert.throws(()=>calibrateGN({...measurement,iso:0},steps),/양의 유한한 수/);
  assert.throws(()=>calibrateGN({...measurement,denominator:3},steps),/지원 출력 단계/);
  assert.throws(()=>calibrateGN({...measurement,distance:Infinity},steps),/양의 유한한 수/);
  assert.throws(()=>nominalGN({...defaults,zoom:32}),/공칭 GN 자료/);
});

test('필인 출력 단계와 최소 출력 경계 및 1/250초 동조 한계를 계산한다',()=>{
  const i={...defaults,gn:16,aperture:4,iso:100,cameraDistance:2,steps:'1,2,4,8,16,32',minDenominator:32,shutter:250,fillRatio:-1};
  assert.deepEqual(fillFlash(i),{nearest:8,residual:0,range:'within',syncExceeded:false});
  assert.deepEqual(fillFlash({...i,fillRatio:-3}),{nearest:32,residual:0,range:'within',syncExceeded:false});
  const weakest=fillFlash({...i,cameraDistance:1,shutter:500,fillRatio:-3});
  assert.deepEqual(weakest,{nearest:32,residual:2,range:'below',syncExceeded:true});
  assert.deepEqual(fillFlash({...i,linked:false,focusInfinity:true,flashDistance:2}),fillFlash(i));
  assert.throws(()=>fillFlash({...i,focusInfinity:true}),/거리 연동/);
  assert.throws(()=>fillFlash({...i,shutter:251}),/셔터 속도/);
});

test('치트시트의 여섯 행은 출력, 풀스톱 조리개, 현재 조리개 심도를 독립 계산한다',()=>{
  const i={...defaults,gn:16,aperture:4,iso:100,denominator:4,steps:'1,2,4,8',minDenominator:8,focusInfinity:true};
  const {rows}=flashCheatsheet(i);
  assert.deepEqual(rows.map(row=>row.distance),[.7,1,1.5,2,3,5]);
  assert.equal(rows[0].power.range,'below');
  assert.equal(rows[5].power.range,'above');
  const row=rows[3];
  assert.deepEqual(row.power,{nearest:4,residual:0,range:'within'});
  assert.equal(row.requiredAperture,4);
  assert.equal(row.aperture,4);
  assert.equal(row.apertureEV,0);
  assert.deepEqual(row.depth,optics({...i,cameraDistance:2,focusInfinity:false}));
  const fast=flashCheatsheet({...i,denominator:1}).rows[4];
  assert.equal(fast.aperture,5.6);
  assert.ok(fast.apertureEV<0);
  assert.match(flashCheatsheet({...i,focal:200}).rows[0].depthError??'',/접사/);
  const md=cheatsheetNote(i,new Date(2026,10,20,9,12,33),{version:'테스트'});
  assert.match(md,/^type: "cheatsheet"$/m);
  assert.match(md,/^date: "2026-11-20T09:12:33"$/m);
  assert.match(md,/^gn: 16$/m);
  assert.match(md,/^\| 2 m \| 1\/4 · 0 EV \| f\/4 → f\/4 · 0 EV \| /m);
  assert.match(md,/최소 출력으로도 과함/);
  assert.match(md,/최대 출력으로도 부족/);
});

test('예전 설정은 기존 입력을 보존하고 필인 필드에 기본값을 채운다',()=>{
  const {shutter:_,fillRatio:__,...inputs}={...defaults,iso:800,nightMode:true,loss:1.75};
  const legacy={version:2,inputs,equipment:[]};
  assert.deepEqual(restore(legacy).inputs,{...inputs,shutter:125,fillRatio:-1.5});
  const state=restore(legacy);
  state.inputs.shutter=500;state.inputs.fillRatio=-3;
  assert.deepEqual(restore(snapshot(state,defaults)).inputs,state.inputs);
  const invalid=restore({...legacy,inputs:{...inputs,shutter:251,fillRatio:-8}});
  assert.equal(invalid.inputs.shutter,125);
  assert.equal(invalid.inputs.fillRatio,-1.5);
});
