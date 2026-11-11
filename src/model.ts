export type Mode = 'manual'|'ttl'|'hss'|'bounce'|'modifier'|'near';
export interface Inputs {
  gnMode: 'manual'|'equipment'; equipmentId: string;
  sensor: string; /* frame/format preset key; 'ff' = 35mm film (36x24) */ width: number; height: number; focal: number; aperture: number; iso: number;
  cameraDistance: number; focusInfinity: boolean; linked: boolean; flashDistance: number; cocMode: string; coc: number;
  gn: number; gnUnit: 'm'|'ft'; gnZoom: number; zoom: number; conditions: string;
  denominator: number; loss: number; tolerance: number; minDenominator: number; steps: string;
  coverage: 'approx'|'angles'; horizontal: number; vertical: number; mode: Mode;
  diagramMax: number; tab: 'flash'|'dof'|'combined'|'zone';
  cropBasis:'nominal'|'dimensions'; zoneFlow:'current'|'target'; zoneNear:number; zoneFar:number; zoneInfinity:boolean; apertureMin:number; apertureMax:number; apertureSteps:string;
}
export interface Equipment {id:string; name: string; conditions: string; source: string; table: Record<string, number>; minDenominator: number; steps: string}
export interface EquipmentDraft {id:string;name:string;conditions:string;source:string;table:string;unit:'m'|'ft';minDenominator:string;steps:string}
export const emptyDraft=():EquipmentDraft=>({id:'',name:'',conditions:'',source:'',table:'',unit:'m',minDenominator:'256',steps:'1,2,4,8,16,32,64,128,256'});
export type ManualFlash=Pick<Inputs,'gn'|'gnUnit'|'gnZoom'|'conditions'|'minDenominator'|'steps'>;
export interface Saved {field?:import('./field').FieldData; version: 2; inputs: Inputs; equipment: Equipment[]; manualFlash?:ManualFlash; draft?:EquipmentDraft; deletedEquipment?:{equipment:Equipment;index:number}; migrationBackup?:unknown}
/** Nikkor AI/AI-S aperture rings click in full stops; 1.8 is kept for the common 50mm f/1.8 kit lens. */
export const FULL_STOP_APERTURES='1.2,1.4,1.8,2,2.8,4,5.6,8,11,16,22,32';
export const defaults: Inputs = {
  gnMode:'manual',equipmentId:'',sensor:'ff',width:36,height:24,focal:50,aperture:4,iso:400,cameraDistance:5,focusInfinity:false,linked:true,flashDistance:5,
  cocMode:'film',coc:0.03,gn:40,gnUnit:'m',gnZoom:50,zoom:50,
  conditions:'연습용 가상 GN · 장비 사양 아님 · ISO100·최대출력·직접광·50mm',
  denominator:4,loss:0,tolerance:1,minDenominator:256,steps:'1,2,4,8,16,32,64,128,256',
  coverage:'approx',horizontal:40,vertical:27,mode:'manual',diagramMax:15,tab:'combined',cropBasis:'nominal',zoneFlow:'current',zoneNear:2,zoneFar:5,zoneInfinity:false,apertureMin:1.4,apertureMax:16,apertureSteps:FULL_STOP_APERTURES
};
/** Any explicit finite-distance edit turns infinity focus off; the flag itself is set directly. */
export function assignInput<K extends keyof Inputs>(i:Inputs,key:K,value:Inputs[K]):void {i[key]=value;if(key==='cameraDistance')i.focusInfinity=false;}
/** Frame/format presets. The key 'ff' is kept for saved data; it is the 35mm film frame (also the digital full-frame size). */
export const sensors: Record<string,{name:string;width:number;height:number}>={
  ff:{name:'35mm 필름',width:36,height:24},half:{name:'하프프레임 필름',width:24,height:18},
  mf645:{name:'중형 645 필름',width:56,height:41.5},mf66:{name:'중형 6×6 필름',width:56,height:56},mf67:{name:'중형 6×7 필름',width:70,height:56},
  apsc:{name:'디지털 APS-C 1.5×',width:23.6,height:15.6},apsc16:{name:'디지털 APS-C 1.6×',width:22.3,height:14.9},mft:{name:'디지털 마이크로 포서즈',width:17.3,height:13}
};
