import type {ExposureSceneId} from './field-guide';
import type {ReciprocityFilmId,ReciprocityOverrides} from './reciprocity';
import type {PresetData} from './shooting-presets';

export type Mode = 'manual'|'ttl'|'hss'|'bounce'|'modifier'|'near';
export interface Inputs {
  gnMode: 'manual'|'equipment'; equipmentId: string;
  sensor: string; /* 포맷 키. ff는 35mm 필름(36×24mm)이다. */ width: number; height: number; focal: number; aperture: number; iso: number;
  cameraDistance: number; focusInfinity: boolean; linked: boolean; flashDistance: number; cocMode: string; coc: number;
  gn: number; gnUnit: 'm'|'ft'; gnZoom: number; zoom: number; conditions: string;
  denominator: number; loss: number; tolerance: number; minDenominator: number; steps: string;
  coverage: 'approx'|'angles'; horizontal: number; vertical: number; mode: Mode;
  diagramMax: number; tab: 'flash'|'dof'|'combined'|'zone';
  flashOn: boolean; zoneOn: boolean; flashWasEnabled: boolean; nightMode: boolean;
  shutter: number; fillRatio: number;
  reciprocityFilm: ReciprocityFilmId; meteredSeconds: number; reciprocityOverrides: ReciprocityOverrides;
  cropBasis:'nominal'|'dimensions'; zoneFlow:'current'|'target'; zoneGoal:'infinity'|'range'; exposureScene:ExposureSceneId; framing:'portrait'|'landscape'; zoneNear:number; zoneFar:number; zoneInfinity:boolean; apertureMin:number; apertureMax:number; apertureSteps:string;
}
export interface Equipment {id:string; name: string; conditions: string; source: string; table: Record<string, number>; minDenominator: number; steps: string}
export interface EquipmentDraft {id:string;name:string;conditions:string;source:string;table:string;unit:'m'|'ft';minDenominator:string;steps:string}
export const emptyDraft=():EquipmentDraft=>({id:'',name:'',conditions:'',source:'',table:'',unit:'m',minDenominator:'256',steps:'1,2,4,8,16,32,64,128,256'});
export type ManualFlash=Pick<Inputs,'gn'|'gnUnit'|'gnZoom'|'conditions'|'minDenominator'|'steps'>;
export interface Saved extends PresetData {field?:import('./field').FieldData; legacyShotDetached?:boolean; version: 2; inputs: Inputs; equipment: Equipment[]; manualFlash?:ManualFlash; draft?:EquipmentDraft; deletedEquipment?:{equipment:Equipment;index:number}; migrationBackup?:unknown}
/** Nikkor AI/AI-S 전 단계와 50mm f/1.8의 개방값을 포함한다. */
export const FULL_STOP_APERTURES='1.2,1.4,1.8,2,2.8,4,5.6,8,11,16,22,32';
export const FM2_SHUTTERS=[1,2,4,8,15,30,60,125,250,500,1000,2000,4000] as const;
export const FM2_SYNC_SHUTTER=250;
export const FILL_RATIOS=[-1,-1.5,-2,-3] as const;
export const defaults: Inputs = {
  gnMode:'manual',equipmentId:'',sensor:'ff',width:36,height:24,focal:50,aperture:4,iso:400,cameraDistance:5,focusInfinity:false,linked:true,flashDistance:5,
  cocMode:'film',coc:0.03,gn:40,gnUnit:'m',gnZoom:50,zoom:50,
  conditions:'연습용 가상 GN · 장비 사양 아님 · ISO100·최대출력·직접광·50mm',
  reciprocityFilm:'vision3-500t',meteredSeconds:4,reciprocityOverrides:{},
  denominator:4,loss:0,tolerance:1,minDenominator:256,steps:'1,2,4,8,16,32,64,128,256',
  coverage:'approx',horizontal:40,vertical:27,mode:'manual',diagramMax:15,tab:'combined',flashOn:false,zoneOn:false,flashWasEnabled:false,nightMode:false,shutter:125,fillRatio:-1.5,cropBasis:'nominal',zoneFlow:'current',zoneGoal:'infinity',exposureScene:'sun',framing:'portrait',zoneNear:2,zoneFar:5,zoneInfinity:false,apertureMin:1.4,apertureMax:16,apertureSteps:FULL_STOP_APERTURES
};
export function assignInput<K extends keyof Inputs>(i:Inputs,key:K,value:Inputs[K]):void {
  i[key]=value;
  if(key==='cameraDistance')i.focusInfinity=false;
  // 기존 오프카메라 거리를 보존하면서 최초 활성화만 연동으로 시작한다.
  if(key==='flashOn'&&i.flashOn&&!i.flashWasEnabled){
    i.linked=true;
    i.flashWasEnabled=true;
  }
}
/** 저장된 ff 키는 35mm 필름과 디지털 풀프레임에 공통으로 쓴다. */
export const sensors: Record<string,{name:string;width:number;height:number}>={
  ff:{name:'35mm 필름',width:36,height:24},half:{name:'하프프레임 필름',width:24,height:18},
  mf645:{name:'중형 645 필름',width:56,height:41.5},mf66:{name:'중형 6×6 필름',width:56,height:56},mf67:{name:'중형 6×7 필름',width:70,height:56},
  apsc:{name:'디지털 APS-C 1.5×',width:23.6,height:15.6},apsc16:{name:'디지털 APS-C 1.6×',width:22.3,height:14.9},mft:{name:'디지털 마이크로 포서즈',width:17.3,height:13}
};
