export type Mode = 'manual'|'ttl'|'hss'|'bounce'|'modifier'|'near';
export interface Inputs {
  gnMode: 'manual'|'equipment'; equipmentId: string;
  sensor: string; width: number; height: number; focal: number; aperture: number; iso: number;
  cameraDistance: number; linked: boolean; flashDistance: number; cocMode: string; coc: number;
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
export interface Saved {version: 2; inputs: Inputs; equipment: Equipment[]; manualFlash?:ManualFlash; draft?:EquipmentDraft; deletedEquipment?:{equipment:Equipment;index:number}; migrationBackup?:unknown}
export const defaults: Inputs = {
  gnMode:'manual',equipmentId:'',sensor:'ff',width:36,height:24,focal:50,aperture:4,iso:100,cameraDistance:5,linked:true,flashDistance:5,
  cocMode:'estimate',coc:0.029,gn:40,gnUnit:'m',gnZoom:50,zoom:50,
  conditions:'연습용 가상 GN · 장비 사양 아님 · ISO100·최대출력·직접광·50mm',
  denominator:4,loss:0,tolerance:1,minDenominator:256,steps:'1,2,4,8,16,32,64,128,256',
  coverage:'approx',horizontal:40,vertical:27,mode:'manual',diagramMax:15,tab:'combined',cropBasis:'nominal',zoneFlow:'current',zoneNear:2,zoneFar:5,zoneInfinity:false,apertureMin:1.4,apertureMax:16,apertureSteps:'1,1.2,1.4,1.6,1.8,2,2.2,2.5,2.8,3.2,3.5,4,4.5,5,5.6,6.3,7.1,8,9,10,11,13,14,16,18,20,22,25,29,32'
};
export const sensors: Record<string,{name:string;width:number;height:number}>={
  ff:{name:'풀프레임',width:36,height:24},apsc:{name:'APS-C 명목 1.5× (23.6×15.6mm)',width:23.6,height:15.6},apsc16:{name:'APS-C 명목 1.6× (22.3×14.9mm)',width:22.3,height:14.9},mft:{name:'Micro Four Thirds',width:17.3,height:13}
};
