import {minFocusDistance} from './engine';
import {assignInput,defaults,FM2_SHUTTERS,FM2_SYNC_SHUTTER,sensors} from './model';
import type {Inputs,Saved} from './model';
import {isReciprocityFilmId} from './reciprocity';
import type {ReciprocityFilmId} from './reciprocity';

interface Preset {id:string;name:string;memo:string}
export interface CameraPreset extends Preset {
  sensor:string;
  shutters:number[];
  bulb:boolean;
  syncSeconds:number;
  isoMin:number;
  isoMax:number;
}
export interface LensPreset extends Preset {
  focal:number;
  apertureMin:number;
  apertureMax:number;
  apertureSteps:number[];
  mfd:number;
}
export const filmTypes={negative:'네거티브',slide:'슬라이드',bw:'흑백'} as const;
export interface FilmPreset extends Preset {
  iso:number;
  type:keyof typeof filmTypes;
  reciprocityFilm?:ReciprocityFilmId;
}
type Presets={cameras:CameraPreset;lenses:LensPreset;films:FilmPreset};
export type PresetKind=keyof Presets;
type PresetLists={[K in PresetKind]:Presets[K][]};
const activeKeys={cameras:'activeCameraId',lenses:'activeLensId',films:'activeFilmId'} as const;
type ActiveKey=(typeof activeKeys)[PresetKind];
type DeletedPreset={kind:PresetKind;index:number;preset:Presets[PresetKind]};
export interface PresetData extends PresetLists, Record<ActiveKey,string> {deletedPreset?:DeletedPreset}
export const presetLabels={cameras:'카메라',lenses:'렌즈',films:'필름'} as const;
export const presetKinds=['cameras','lenses','films'] as const;

export function presetDefaults():PresetData {
  return {
    cameras:[{
      id:'nikon-fm2n',name:'Nikon FM2N (신형, 1984~)',sensor:'ff',shutters:FM2_SHUTTERS.map(n=>1/n),
      bulb:true,syncSeconds:1/250,isoMin:12,isoMax:6400,
      memo:'기계식 셔터 · 중앙중점 측광 · TTL·HSS 없음 · 파인더 93%',
    }],
    lenses:[{
      id:'nikkor-50-14-ais',name:'Nikkor 50mm f/1.4 AI-S',focal:50,apertureMin:1.4,apertureMax:16,
      apertureSteps:[1.4,2,2.8,4,5.6,8,11,16],mfd:.45,memo:'필터 52mm',
    }],
    films:[
      {id:'vision3-250d',name:'Kodak Vision3 250D',iso:250,type:'negative',reciprocityFilm:'vision3-250d',memo:''},
      {id:'vision3-500t',name:'Kodak Vision3 500T',iso:500,type:'negative',reciprocityFilm:'vision3-500t',memo:'텅스텐 3200K'},
      {id:'double-x',name:'Eastman Double-X 5222',iso:250,type:'bw',reciprocityFilm:'double-x',memo:'텅스텐 EI 200'},
      {id:'ektachrome-100d',name:'Kodak Ektachrome 100D 7294',iso:100,type:'slide',reciprocityFilm:'ektachrome-100d',memo:''},
      {id:'ultramax-400',name:'Kodak Ultramax 400',iso:400,type:'negative',reciprocityFilm:'ultramax-400',memo:''},
    ],
    activeCameraId:'',activeLensId:'',activeFilmId:'',
  };
}

const positive=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>0;
const validIso=(value:number)=>positive(value)&&Number.isInteger(value);
const validSeconds=(value:number)=>positive(value)&&positive(1/value);

export function presetProblem<K extends PresetKind>(kind:K,value:unknown):string {
  if(!value||typeof value!=='object')return '프리셋을 입력하세요.';
  const p=value as Partial<Preset>;
  if(typeof p.id!=='string'||!p.id||typeof p.name!=='string'||!p.name.trim()||p.name.length>100)
    return '이름은 1~100자로 입력하세요.';
  if(typeof p.memo!=='string')return '메모를 확인하세요.';
  if(kind==='cameras'){
    const camera=p as CameraPreset;
    if(typeof camera.sensor!=='string'||!Object.prototype.hasOwnProperty.call(sensors,camera.sensor))return '카메라 포맷을 선택하세요.';
    if(!Array.isArray(camera.shutters)||!camera.shutters.length||!camera.shutters.every(validSeconds)||new Set(camera.shutters).size!==camera.shutters.length)
      return '셔터 속도는 중복 없이 0보다 큰 초 단위 숫자로 입력하세요.';
    if(typeof camera.bulb!=='boolean')return 'B 셔터 지원 여부를 확인하세요.';
    if(!validSeconds(camera.syncSeconds))return '최대 동조는 0보다 큰 초 단위 숫자로 입력하세요.';
    if(!validIso(camera.isoMin)||!validIso(camera.isoMax)||camera.isoMin>camera.isoMax)return 'ISO 범위는 양의 정수이며 최소가 최대 이하여야 합니다.';
  }else if(kind==='lenses'){
    const lens=p as LensPreset;
    if(!positive(lens.focal)||!Number.isFinite(minFocusDistance(lens.focal)))return '초점거리는 0보다 큰 유한한 숫자로 입력하세요.';
    if(!positive(lens.apertureMin)||!positive(lens.apertureMax)||lens.apertureMin>lens.apertureMax)return '최대 개방 f값은 0보다 크고 최소 조리개 f값 이하여야 합니다.';
    if(!Array.isArray(lens.apertureSteps)||!lens.apertureSteps.length||!lens.apertureSteps.every((n,index,steps)=>positive(n)&&n>=lens.apertureMin&&n<=lens.apertureMax&&(index===0||n>steps[index-1])))
      return '조리개 단계는 범위 안의 숫자를 중복 없이 오름차순으로 입력하세요.';
    if(!positive(lens.mfd))return '최단 초점거리는 0보다 큰 미터 값으로 입력하세요.';
  }else{
    const film=p as FilmPreset;
    if(!validIso(film.iso))return '박스 ISO는 양의 정수로 입력하세요.';
    if(typeof film.type!=='string'||!Object.prototype.hasOwnProperty.call(filmTypes,film.type))return '필름 종류를 선택하세요.';
    if(film.reciprocityFilm!==undefined&&!isReciprocityFilmId(film.reciprocityFilm))return '연결할 상반칙 필름을 확인하세요.';
  }
  return '';
}

function validPreset<K extends PresetKind>(kind:K,value:unknown):value is Presets[K] {
  return !presetProblem(kind,value);
}
// 복원 경로를 거치지 않은 상태(외부에서 state를 통째로 바꾼 경우 등)에서도 화면이 깨지지 않도록 빈 목록으로 본다.
function presets<K extends PresetKind>(data:PresetLists,kind:K):PresetLists[K] {return data[kind]??([] as unknown as PresetLists[K]);}

export function selectedPreset<K extends PresetKind>(data:PresetData,kind:K):Presets[K]|undefined {
  return presets(data,kind).find(p=>p.id===data[activeKeys[kind]]);
}

export function restorePresets(data:PresetData,raw:Partial<PresetData>):void {
  function restoreList<K extends PresetKind>(kind:K):void {
    const list=raw[kind];
    if(!Array.isArray(list))return;
    const restored=presets(data,kind);
    restored.length=0;
    for(const value of list)if(validPreset(kind,value)&&!restored.some(p=>p.id===value.id))
      restored.push(JSON.parse(JSON.stringify(value)));
    const key=activeKeys[kind];
    data[key]=restored.some(p=>p.id===raw[key])?raw[key]??'':'';
  }
  for(const kind of presetKinds)restoreList(kind);
  const deleted=raw.deletedPreset;
  if(deleted&&presetKinds.includes(deleted.kind)&&Number.isSafeInteger(deleted.index)&&deleted.index>=0&&validPreset(deleted.kind,deleted.preset))
    data.deletedPreset=JSON.parse(JSON.stringify(deleted));
}

export function cameraShutters(camera?:CameraPreset):number[] {
  // 저장된 셔터는 기존과 같이 1/n의 n을 사용하고, B는 0으로 저장한다.
  if(!camera)return [...FM2_SHUTTERS];
  const values=[...camera.shutters].sort((a,b)=>b-a).map(seconds=>1/seconds);
  if(camera.bulb)values.push(0);
  return values;
}

export function syncLimit(camera?:CameraPreset):number {return camera?1/camera.syncSeconds:FM2_SYNC_SHUTTER;}

export function effectiveMinFocus(inputs:Pick<Inputs,'focal'>,lens?:Pick<LensPreset,'mfd'>):number {
  const minimum=minFocusDistance(inputs.focal);
  return lens?Math.max(lens.mfd,minimum):minimum;
}

export function eiStops(ei:number,boxIso:number):number {return Math.log2(ei/boxIso);}

export function isoOutsideCamera(iso:number,camera?:CameraPreset):boolean {
  return !!camera&&Number.isFinite(iso)&&(iso<camera.isoMin||iso>camera.isoMax);
}

export function selectPreset(state:Saved,kind:PresetKind,id:string):void {
  const key=activeKeys[kind];
  if(id&&!presets(state,kind).some(p=>p.id===id))throw Error('프리셋을 찾을 수 없습니다.');
  state[key]=id;
  const i=state.inputs;
  if(kind==='cameras'){
    const camera=selectedPreset(state,'cameras');
    if(camera)Object.assign(i,{sensor:camera.sensor,width:sensors[camera.sensor].width,height:sensors[camera.sensor].height});
    const shutters=cameraShutters(camera);
    if(!shutters.includes(i.shutter)){
      const target=positive(i.shutter)?i.shutter:i.shutter===0?shutters[0]:defaults.shutter;
      i.shutter=shutters.reduce((best,n)=>n>0&&Math.abs(Math.log(n/target))<Math.abs(Math.log(best/target))?n:best);
    }
  }else if(kind==='lenses'){
    const lens=selectedPreset(state,'lenses');
    if(!lens)return;
    const {focal,apertureMin,apertureMax,apertureSteps}=lens;
    Object.assign(i,{focal,apertureMin,apertureMax,apertureSteps:apertureSteps.join(',')});
    if(!positive(i.aperture)||i.aperture<apertureMin)i.aperture=apertureSteps[0];
    else if(i.aperture>apertureMax)i.aperture=apertureSteps[apertureSteps.length-1];
    const minimum=effectiveMinFocus(i,lens);
    if(i.cameraDistance<minimum){
      i.cameraDistance=minimum;
      if(i.linked&&!i.focusInfinity)i.flashDistance=minimum;
    }
    if(i.zoneNear<minimum)i.zoneNear=minimum;
  }else{
    const film=selectedPreset(state,'films');
    if(!film)return;
    i.iso=film.iso;
    if(film.reciprocityFilm)i.reciprocityFilm=film.reciprocityFilm;
  }
}

export function updateShootingInput<K extends keyof Inputs>(state:Saved,key:K,value:Inputs[K]):void {
  if(key==='focal'&&!Object.is(state.inputs.focal,value))state.activeLensId='';
  assignInput(state.inputs,key,value);
}

export function savePreset<K extends PresetKind>(state:Saved,kind:K,preset:unknown):void {
  if(!validPreset(kind,preset))throw Error(presetProblem(kind,preset));
  const list=presets(state,kind);
  const index=list.findIndex(p=>p.id===preset.id);
  if(index<0)list.push(preset);
  else list[index]=preset;
  if(state[activeKeys[kind]]!==preset.id)return;
  const ei=state.inputs.iso;
  selectPreset(state,kind,preset.id);
  // 프리셋 설명을 수정해도 촬영 중인 EI를 보존한다.
  if(kind==='films')state.inputs.iso=ei;
}

export function deletePreset<K extends PresetKind>(state:Saved,kind:K,id:string):void {
  const list=presets(state,kind);
  const index=list.findIndex(p=>p.id===id);
  if(index<0)return;
  state.deletedPreset={kind,index,preset:list[index]};
  list.splice(index,1);
  if(state[activeKeys[kind]]===id)selectPreset(state,kind,'');
}

export function undoPresetDeletion(state:Saved):void {
  const deleted=state.deletedPreset;
  if(!deleted)return;
  function insert<K extends PresetKind>(kind:K,value:unknown,index:number):void {
    const list=presets(state,kind);
    if(validPreset(kind,value)&&!list.some(p=>p.id===value.id))list.splice(index,0,value);
  }
  insert(deleted.kind,deleted.preset,deleted.index);
  delete state.deletedPreset;
}
