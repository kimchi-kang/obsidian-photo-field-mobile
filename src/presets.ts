import {Equipment,Inputs,Saved,ManualFlash} from './model';
import {positive,powerSteps} from './engine';
import {feetToMetres} from './units';
export function parseTable(text:string,unit:'m'|'ft'):Record<string,number> {
  const table:Record<string,number>={};
  for(const row of text.trim().split('\n')) {const parts=row.split(',').map(v=>Number(v.trim()));
    if(parts.length!==2)throw Error('각 줄은 줌mm,GN 형식이어야 합니다.');
    const [zoom,gn]=parts;positive(zoom,gn);if(String(zoom) in table)throw Error('줌 위치가 중복되었습니다.');table[String(zoom)]=unit==='ft'?feetToMetres(gn):gn;
  }return table;
}
export function equipmentValid(p:Omit<Equipment,'id'>):boolean {
  try {if(!p.name.trim()||!p.conditions.trim()||!p.source.trim()||!Object.keys(p.table).length)return false;
    for(const [z,g] of Object.entries(p.table))positive(Number(z),g);
    positive(p.minDenominator);powerSteps(p.steps,p.minDenominator);return true;
  }catch{return false;}
}

export function selectedEquipment(state:Saved):Equipment|undefined {return state.inputs.gnMode==='equipment'?state.equipment.find(e=>e.id===state.inputs.equipmentId):undefined;}
export function applyEquipment(state:Saved):void {
  const i=state.inputs;if(i.gnMode!=='equipment')return;
  const e=selectedEquipment(state);if(!e){i.gn=0;i.gnZoom=0;i.conditions='선택 장비를 찾을 수 없습니다. 장비 선택 또는 수동 모드가 필요합니다.';return;}
  const g=e.table[String(i.zoom)];Object.assign(i,{gn:g??0,gnUnit:'m',gnZoom:g===undefined?0:i.zoom,conditions:`${e.conditions} · 출처: ${e.source}`,minDenominator:e.minDenominator,steps:e.steps});
}
export function equipmentId(equipment:Equipment[]):string {let id=`equipment-${Date.now().toString(36)}`,n=1;while(equipment.some(e=>e.id===id))id=`equipment-${Date.now().toString(36)}-${n++}`;return id;}

export function manualFlash(i:Inputs):ManualFlash {return {gn:i.gn,gnUnit:i.gnUnit,gnZoom:i.gnZoom,conditions:i.conditions,minDenominator:i.minDenominator,steps:i.steps};}
export function selectEquipment(state:Saved,id:string):void {
  if(state.inputs.gnMode==='manual')state.manualFlash=manualFlash(state.inputs);
  Object.assign(state.inputs,{equipmentId:id,gnMode:'equipment'});applyEquipment(state);
}
export function setGnMode(state:Saved,mode:Inputs['gnMode']):void {
  if(mode===state.inputs.gnMode)return;
  if(mode==='equipment'){state.manualFlash=manualFlash(state.inputs);state.inputs.gnMode=mode;applyEquipment(state);}
  else {state.inputs.gnMode=mode;if(state.manualFlash)Object.assign(state.inputs,state.manualFlash);}
}
