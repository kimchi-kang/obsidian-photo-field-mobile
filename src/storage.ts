import {defaults,Equipment,Inputs,Saved,emptyDraft} from './model';
import {equipmentValid,applyEquipment,manualFlash} from './presets';
export function restore(data:unknown):Saved {
  const result:Saved={version:2,inputs:{...defaults},equipment:[]};
  if(!data||typeof data!=='object')return result;
  const d=data as Partial<Saved>;
  if(typeof d.version==='number'&&d.version>2)throw Error('이 데이터는 더 새 플러그인 버전에서 저장되었습니다. 덮어쓰지 않도록 로드를 중단합니다.');
  if(d.version!==2)result.migrationBackup=JSON.parse(JSON.stringify(data));else if(d.migrationBackup)result.migrationBackup=d.migrationBackup;
  if(d.inputs&&typeof d.inputs==='object') {
    for(const key of Object.keys(defaults) as (keyof Inputs)[]) {
      const value=d.inputs[key];
      if(typeof value===typeof defaults[key]&&(typeof value!=='number'||Number.isFinite(value)))Object.assign(result.inputs,{[key]:value});
    }
  }
  const i=result.inputs;
  if(!['manual','ttl','hss','bounce','modifier','near'].includes(i.mode))i.mode='manual';
  if(!['flash','dof','combined'].includes(i.tab))i.tab='combined';
  if(!['m','ft'].includes(i.gnUnit))i.gnUnit='m';
  if(!['approx','angles'].includes(i.coverage))i.coverage='approx';
  if(!['estimate','custom'].includes(i.cocMode))i.cocMode='estimate';
  if(Array.isArray(d.equipment))result.equipment=d.equipment.filter((p):p is Equipment=>{
    if(!p||typeof p!=='object')return false;
    const e=p as Equipment;
    return typeof e.name==='string'&&typeof e.conditions==='string'&&typeof e.source==='string'&&typeof e.steps==='string'&&typeof e.minDenominator==='number'&&!!e.table&&typeof e.table==='object'&&equipmentValid(e);
  });
  if(!['manual','equipment'].includes(i.gnMode))i.gnMode='manual';
  const used=new Set<string>();result.equipment=result.equipment.map((e,n)=>{let id=typeof e.id==='string'&&e.id?e.id:`legacy-${n+1}`;while(used.has(id))id+='-copy';used.add(id);return {...e,table:{...e.table},id};});
  if(d.draft&&typeof d.draft==='object'){const draft=emptyDraft();for(const k of Object.keys(draft) as (keyof typeof draft)[])if(typeof d.draft[k]==='string')Object.assign(draft,{[k]:d.draft[k]});if(draft.unit!=='ft')draft.unit='m';result.draft=draft;}
  if(d.deletedEquipment&&equipmentValid(d.deletedEquipment.equipment)&&typeof d.deletedEquipment.equipment.id==='string')result.deletedEquipment=JSON.parse(JSON.stringify(d.deletedEquipment));
  if(d.manualFlash&&typeof d.manualFlash==='object'){const m={...defaults};for(const k of Object.keys(manualFlash(defaults))as (keyof typeof d.manualFlash)[]){const v=d.manualFlash[k];if(typeof v===typeof defaults[k]&&(typeof v!=='number'||Number.isFinite(v)))Object.assign(m,{[k]:v});}result.manualFlash=manualFlash(m);}
  applyEquipment(result);
  return result;
}

// Transient blank edits must not prevent independent equipment/tab changes saving.
export function snapshot(state:Saved,previous:Inputs):Saved {
  const inputs={...state.inputs};
  for(const key of Object.keys(inputs) as (keyof Inputs)[]) {
    const value=inputs[key];
    if(typeof value==='number'&&!Number.isFinite(value))Object.assign(inputs,{[key]:previous[key]});
  }
  const manual=state.manualFlash?{...state.manualFlash}:undefined;
  if(manual)for(const key of Object.keys(manual) as (keyof typeof manual)[])if(typeof manual[key]==='number'&&!Number.isFinite(manual[key]))Object.assign(manual,{[key]:previous[key]});
  return JSON.parse(JSON.stringify({...state,...(manual?{manualFlash:manual}:{}),inputs,...(inputs.gnMode==='manual'?{manualFlash:manualFlash(inputs)}:{})})) as Saved;
}
