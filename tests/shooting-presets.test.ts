import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,sensors} from '../src/model';
import {restore,snapshot} from '../src/storage';
import {minFocusDistance,optics} from '../src/engine';
import {focusScale} from '../src/scale';
import {SCENE,sceneDistance} from '../src/diagram';
import {stepDistance} from '../src/units';
import {fillFlash} from '../src/flash-tools';
import {cheatsheetNote,note} from '../src/note';
import {cameraShutters,deletePreset,effectiveMinFocus,eiStops,isoOutsideCamera,lensFocusMarks,presetDefaults,presetProblem,restorePresets,savePreset,selectedPreset,selectPreset,undoPresetDeletion,updateShootingInput} from '../src/shooting-presets';

test('내장 프리셋은 지정된 사양을 독립된 기본값으로 제공한다',()=>{
  const data=presetDefaults();
  assert.deepEqual(data.cameras,[{
    id:'nikon-fm2n',name:'Nikon FM2N (신형, 1984~)',sensor:'ff',
    shutters:[1,1/2,1/4,1/8,1/15,1/30,1/60,1/125,1/250,1/500,1/1000,1/2000,1/4000],
    bulb:true,syncSeconds:1/250,isoMin:12,isoMax:6400,memo:'기계식 셔터 · 중앙중점 측광 · TTL·HSS 없음 · 파인더 93%',
  }]);
  assert.deepEqual(data.lenses,[{
    id:'nikkor-50-14-ais',name:'Nikkor 50mm f/1.4 AI-S',focal:50,apertureMin:1.4,apertureMax:16,
    apertureSteps:[1.4,2,2.8,4,5.6,8,11,16],mfd:.45,focusMarks:[.45,.5,.6,.7,.8,1,1.2,1.5,2,3,5,10],memo:'필터 52mm · 거리링 0.45 m~∞ · 심도 눈금 있음',
  }]);
  assert.deepEqual(data.films.map(({id,name,iso,type,reciprocityFilm,memo})=>[id,name,iso,type,reciprocityFilm,memo]),[
    ['vision3-250d','Kodak Vision3 250D',250,'negative','vision3-250d',''],
    ['vision3-500t','Kodak Vision3 500T',500,'negative','vision3-500t','텅스텐 3200K'],
    ['double-x','Eastman Double-X 5222',250,'bw','double-x','텅스텐 EI 200'],
    ['ektachrome-100d','Kodak Ektachrome 100D 7294',100,'slide','ektachrome-100d',''],
    ['ultramax-400','Kodak Ultramax 400',400,'negative','ultramax-400',''],
  ]);
  data.cameras[0].shutters.pop();
  data.lenses[0].apertureSteps.pop();
  assert.equal(presetDefaults().cameras[0].shutters.length,13);
  assert.equal(presetDefaults().lenses[0].apertureSteps.length,8);
});

test('기존 설정 복원은 목록만 추가하고 입력과 활성 상태를 유지한다',()=>{
  const {cameras,lenses,films}=presetDefaults();
  const legacy=restore({
    version:2,equipment:[],inputs:{...defaults,sensor:'half',width:24,height:18,focal:35,iso:800,aperture:22,
      cameraDistance:.3,apertureSteps:'2,4,8',nightMode:true,reciprocityFilm:'custom',reciprocityOverrides:{custom:1.4}},
  });
  assert.deepEqual(legacy.inputs,{
    ...defaults,sensor:'half',width:24,height:18,focal:35,iso:800,aperture:22,
    cameraDistance:.3,apertureSteps:'2,4,8',nightMode:true,reciprocityFilm:'custom',reciprocityOverrides:{custom:1.4},
  });
  assert.deepEqual([legacy.cameras,legacy.lenses,legacy.films],[cameras,lenses,films]);
  for(const state of [legacy,restore(null)])assert.deepEqual([state.activeCameraId,state.activeLensId,state.activeFilmId],['','','']);
  const stale=restore({...legacy,cameras:[],activeCameraId:cameras[0].id});
  assert.deepEqual(stale.cameras,[]);
  assert.equal(stale.activeCameraId,'');
});

test('렌즈 적용은 초점거리, 존 조리개 단계와 실제 최단거리를 한 번에 적용한다',()=>{
  const s=restore(null),lens=s.lenses[0];
  Object.assign(s.inputs,{focal:35,aperture:22,cameraDistance:.3,zoneNear:.4});
  selectPreset(s,'lenses',lens.id);
  assert.equal(s.inputs.focal,50);
  assert.equal(s.inputs.apertureMin,1.4);
  assert.equal(s.inputs.apertureMax,16);
  assert.equal(s.inputs.apertureSteps,'1.4,2,2.8,4,5.6,8,11,16');
  assert.deepEqual(selectedPreset(s,'lenses')?.apertureSteps,[1.4,2,2.8,4,5.6,8,11,16]);
  assert.equal(s.inputs.aperture,16);
  assert.equal(s.inputs.cameraDistance,.45);
  assert.equal(s.inputs.flashDistance,.45);
  assert.equal(s.inputs.zoneNear,.45);
  const min=effectiveMinFocus(s.inputs,lens);
  assert.equal(focusScale(s.inputs.focal,min)?.distance(0),.45);
  assert.equal(sceneDistance(SCENE.start,15,s.inputs.focal,min),.45);
  assert.equal(stepDistance(.455,-1,min),.45);
  assert.equal(effectiveMinFocus({focal:200},lens),minFocusDistance(200));
  assert.throws(()=>optics({...s.inputs,cameraDistance:.199}),/4배/);
  updateShootingInput(s,'aperture',1);
  selectPreset(s,'lenses',lens.id);
  assert.equal(s.inputs.aperture,1.4);
  updateShootingInput(s,'aperture',3.5);
  selectPreset(s,'lenses',lens.id);
  assert.equal(s.inputs.aperture,3.5);
});

test('조리개와 같은 초점거리를 입력하면 렌즈를 유지하고 초점거리가 달라지면 해제한다',()=>{
  const s=restore(null),lens=s.lenses[0];
  selectPreset(s,'lenses',lens.id);
  updateShootingInput(s,'aperture',5.6);
  updateShootingInput(s,'focal',50);
  assert.equal(s.activeLensId,lens.id);
  updateShootingInput(s,'focal',85);
  assert.equal(s.activeLensId,'');
  assert.equal(effectiveMinFocus(s.inputs,selectedPreset(s,'lenses')),minFocusDistance(85));
});

test('실제 최단거리를 적용해도 무한대 초점과 별도 플래시 거리는 유지된다',()=>{
  const s=restore(null);
  Object.assign(s.inputs,{cameraDistance:.25,focusInfinity:true,linked:false,flashDistance:.2});
  selectPreset(s,'lenses',s.lenses[0].id);
  assert.equal(s.inputs.focusInfinity,true);
  assert.equal(s.inputs.cameraDistance,.45);
  assert.equal(s.inputs.flashDistance,.2);
});

test('카메라 포맷, 셔터 목록, B와 동조 경계는 선택 카메라를 따른다',()=>{
  const s=restore(null);
  const camera={...s.cameras[0],id:'half-camera',sensor:'half',shutters:[1/500,2,1/100,1/200],syncSeconds:1/200};
  savePreset(s,'cameras',camera);
  s.inputs.iso=8000;
  selectPreset(s,'cameras',camera.id);
  assert.deepEqual([s.inputs.sensor,s.inputs.width,s.inputs.height],['half',sensors.half.width,sensors.half.height]);
  assert.deepEqual(cameraShutters(camera),[.5,100,200,500,0]);
  assert.equal(s.inputs.shutter,100);
  assert.equal(isoOutsideCamera(s.inputs.iso,camera),true);
  assert.equal(s.inputs.iso,8000);
  for(const iso of [12,6400])assert.equal(isoOutsideCamera(iso,camera),false);
  assert.equal(fillFlash({...s.inputs,shutter:200},camera).syncExceeded,false);
  assert.equal(fillFlash({...s.inputs,shutter:500},camera).syncExceeded,true);
  assert.equal(fillFlash({...s.inputs,shutter:0},camera).syncExceeded,false);
  assert.throws(()=>fillFlash({...s.inputs,shutter:250},camera),/셔터 속도/);
  assert.equal(fillFlash({...s.inputs,shutter:250}).syncExceeded,false);
  assert.equal(fillFlash({...s.inputs,shutter:500}).syncExceeded,true);
  s.inputs.shutter=200;
  const back=restore(snapshot(s,defaults));
  assert.equal(back.inputs.shutter,200);
  assert.equal(back.activeCameraId,camera.id);
  selectPreset(back,'cameras','');
  assert.ok(cameraShutters().includes(back.inputs.shutter));
});

test('필름은 박스 ISO와 상반칙 연결을 적용하고 이후의 사용 감도를 유지한다',()=>{
  const s=restore(null);
  selectPreset(s,'films','vision3-500t');
  assert.equal(s.inputs.iso,500);
  selectPreset(s,'films','double-x');
  assert.equal(s.inputs.reciprocityFilm,'double-x');
  assert.equal(s.inputs.iso,250);
  updateShootingInput(s,'iso',1000);
  const back=restore(snapshot(s,defaults));
  assert.equal(back.activeFilmId,'double-x');
  assert.equal(back.inputs.iso,1000);
  assert.equal(eiStops(1000,500),1);
  assert.equal(eiStops(250,500),-1);
  assert.equal(eiStops(500,500),0);
  const unlinked={...s.films[0],id:'unlinked',reciprocityFilm:undefined};
  savePreset(s,'films',unlinked);
  selectPreset(s,'films',unlinked.id);
  assert.equal(s.inputs.reciprocityFilm,'double-x');
});

test('프리셋 검증은 항목별 이유를 반환하고 실패한 변경을 저장하지 않는다',()=>{
  const s=restore(null),camera=s.cameras[0],lens=s.lenses[0],film=s.films[0],before=structuredClone(s);
  const invalid=[
    ['cameras',{...camera,sensor:'toString'},/포맷/],
    ['cameras',{...camera,shutters:[0,1/250]},/셔터 속도/],
    ['cameras',{...camera,shutters:[1,1]},/중복/],
    ['cameras',{...camera,syncSeconds:0},/최대 동조/],
    ['cameras',{...camera,isoMin:7000},/ISO 범위/],
    ['lenses',{...lens,focal:0},/초점거리/],
    ['lenses',{...lens,apertureMin:20},/최대 개방/],
    ['lenses',{...lens,apertureSteps:[2,1.4]},/오름차순/],
    ['lenses',{...lens,apertureSteps:[1.4,22]},/범위/],
    ['lenses',{...lens,mfd:0},/최단 초점거리/],
    ['films',{...film,iso:0},/박스 ISO/],
    ['films',{...film,type:'mono'},/필름 종류/],
    ['films',{...film,reciprocityFilm:'missing'},/상반칙/],
  ] as const;
  for(const [kind,preset,reason] of invalid)assert.throws(()=>savePreset(s,kind,preset),reason);
  assert.deepEqual(s,before);
});

test('프리셋 수정을 보존하며 최근 한 번의 삭제만 재로드 후에도 복구한다',()=>{
  const s=restore(null),lens=s.lenses[0],film=s.films[1];
  selectPreset(s,'films',film.id);
  updateShootingInput(s,'iso',1000);
  savePreset(s,'films',{...film,name:'촬영용 500T'});
  assert.equal(s.inputs.iso,1000);
  deletePreset(s,'lenses',lens.id);
  deletePreset(s,'films',film.id);
  const back=restore(snapshot(s,defaults));
  assert.equal(back.lenses.length,0);
  assert.equal(back.activeFilmId,'');
  assert.ok(!back.films.some(p=>p.id===film.id));
  undoPresetDeletion(back);
  assert.equal(back.films[1].name,'촬영용 500T');
  assert.equal(back.activeFilmId,'');
  assert.equal(back.inputs.iso,1000);
  assert.equal(back.deletedPreset,undefined);
});

test('결과 노트와 치트시트에 선택 프리셋 이름, 필름 종류와 감도를 기록한다',()=>{
  const s=restore(null),date=new Date(2026,10,20);
  const [camera]=s.cameras,[lens]=s.lenses,film=s.films[1];
  const keys=['camera','lens','film','film_type','film_iso','ei'];
  const frontmatter=(text:string)=>text.split('\n---\n')[0];
  for(const generate of [note,cheatsheetNote]){
    const i={...s.inputs,iso:1000};
    const noPresets=frontmatter(generate(i,date,{version:'1.7.0'}));
    for(const key of keys)assert.doesNotMatch(noPresets,new RegExp(`^${key}:`,'m'));
    const md=frontmatter(generate(i,date,{version:'1.7.0',camera,lens,film}));
    for(const [key,value] of Object.entries({camera:camera.name,lens:lens.name,film:film.name,film_type:'negative',film_iso:500,ei:1000})){
      assert.ok(md.split('\n').includes(`${key}: ${JSON.stringify(value)}`),key);
    }
  }
});

test('내장 Nikkor 50mm f/1.4 AI-S는 조리개 f/1.4~16 단계와 거리링 눈금 0.45 m~10 m를 가진다',()=>{
  const lens=presetDefaults().lenses.find(l=>l.id==='nikkor-50-14-ais')!;
  assert.deepEqual(lens.apertureSteps,[1.4,2,2.8,4,5.6,8,11,16]);
  assert.deepEqual(lens.focusMarks,[.45,.5,.6,.7,.8,1,1.2,1.5,2,3,5,10]);
  assert.equal(lens.mfd,.45);
  assert.deepEqual(lensFocusMarks(lens),lens.focusMarks);
  assert.equal(lensFocusMarks({...lens,focusMarks:undefined}),undefined);
});
test('거리링 눈금 검증: 오름차순·최단 거리 이상만 허용',()=>{
  const lens=presetDefaults().lenses[0];
  assert.equal(presetProblem('lenses',{...lens,focusMarks:[.5,.45]}).length>0,true);
  assert.equal(presetProblem('lenses',{...lens,focusMarks:[.3,.5]}).length>0,true);
  assert.equal(presetProblem('lenses',{...lens,focusMarks:[.45,1,3]}),'');
  assert.equal(presetProblem('lenses',{...lens,focusMarks:undefined}),'');
});
test('예전에 저장된 내장 렌즈에는 거리링 눈금을 채우고 사용자 렌즈는 그대로 둔다',()=>{
  const {focusMarks:_,...old}=presetDefaults().lenses[0];
  const mine={...old,id:'my-lens',name:'내 렌즈'};
  const data=presetDefaults();
  restorePresets(data,{lenses:[old,mine],activeLensId:'nikkor-50-14-ais'});
  assert.deepEqual(data.lenses[0].focusMarks,[.45,.5,.6,.7,.8,1,1.2,1.5,2,3,5,10]);
  assert.equal(data.lenses[1].focusMarks,undefined);
});
