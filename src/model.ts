export type Mode = 'manual'|'ttl'|'hss'|'bounce'|'modifier'|'near';
export interface Inputs {
  sensor: string; width: number; height: number; focal: number; aperture: number; iso: number;
  cameraDistance: number; linked: boolean; flashDistance: number; cocMode: string; coc: number;
  gn: number; gnUnit: 'm'|'ft'; gnZoom: number; zoom: number; conditions: string;
  denominator: number; loss: number; tolerance: number; minDenominator: number; steps: string;
  coverage: 'approx'|'angles'; horizontal: number; vertical: number; mode: Mode;
  diagramMax: number; tab: 'flash'|'dof'|'combined';
}
export interface Equipment {name: string; conditions: string; source: string; table: Record<string, number>; minDenominator: number; steps: string}
export interface Saved {version: 1; inputs: Inputs; equipment: Equipment[]}
export const defaults: Inputs = {
  sensor:'ff',width:36,height:24,focal:50,aperture:4,iso:100,cameraDistance:5,linked:true,flashDistance:5,
  cocMode:'estimate',coc:0.029,gn:40,gnUnit:'m',gnZoom:50,zoom:50,
  conditions:'연습용 가상 GN · 장비 사양 아님 · ISO100·최대출력·직접광·50mm',
  denominator:4,loss:0,tolerance:1,minDenominator:256,steps:'1,2,4,8,16,32,64,128,256',
  coverage:'approx',horizontal:40,vertical:27,mode:'manual',diagramMax:15,tab:'combined'
};
export const sensors: Record<string,{name:string;width:number;height:number}>={
  ff:{name:'풀프레임',width:36,height:24},apsc:{name:'APS-C (23.6×15.6)',width:23.6,height:15.6},mft:{name:'Micro Four Thirds',width:17.3,height:13}
};
