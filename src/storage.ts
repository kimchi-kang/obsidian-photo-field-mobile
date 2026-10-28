import {defaults,Equipment,Inputs,Saved} from './model';
import {equipmentValid} from './presets';
export function restore(data:unknown):Saved {
  const result:Saved={version:1,inputs:{...defaults},equipment:[]};
  if(!data||typeof data!=='object')return result;
  const d=data as Partial<Saved>;
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
  return result;
}

// Transient blank edits must not prevent independent equipment/tab changes saving.
export function snapshot(state:Saved,previous:Inputs):Saved {
  const inputs={...state.inputs};
  for(const key of Object.keys(inputs) as (keyof Inputs)[]) {
    const value=inputs[key];
    if(typeof value==='number'&&!Number.isFinite(value))Object.assign(inputs,{[key]:previous[key]});
  }
  return JSON.parse(JSON.stringify({...state,inputs})) as Saved;
}
