import {defaults,Inputs,Saved} from './model';
import {applyEquipment,signature,manualFlash} from './presets';
export {signature,issue} from './presets';
import {powerSteps} from './engine';
export const shootingKeys=['sensor','width','height','focal','aperture','iso','gnMode','equipmentId','gn','gnUnit','gnZoom','zoom','conditions','denominator','linked','cocMode','coc','coverage','horizontal','vertical','loss','tolerance','minDenominator','steps','mode'] as const;
export type ShotValues=Pick<Inputs,typeof shootingKeys[number]>&Partial<Pick<Inputs,'cameraDistance'|'flashDistance'|'focusInfinity'>>;
export interface Shot {id:string;name:string;values:ShotValues;equipmentSignature?:string}
export interface ZoneFavorite {id:string;name:string;near:number;far:number;infinity:boolean}
export interface FieldData {version:1;simple:boolean;activeShotId?:string;shots:Shot[];distances:{id:string;metres:number}[];zones:ZoneFavorite[]}
export interface Patch {before:Partial<Inputs>;after:Partial<Inputs>}
export const freshField=():FieldData=>({version:1,simple:false,shots:[],zones:[],distances:[1,1.5,2,3,5].map((metres,n)=>({id:`distance-${n+1}`,metres}))});
export function field(s:Saved):FieldData{return s.field??=freshField();}
export function id():string{return crypto.randomUUID();}
export function name(value:string):string{const n=value.trim();if(!n||n.length>100)throw Error('이름은 1~100자로 입력하세요.');return n;}
export function capture(s:Saved,label:string,distances:boolean,existingId=id()):Shot {
 const values={} as ShotValues;for(const k of shootingKeys)Object.assign(values,{[k]:s.inputs[k]});
 if(distances)Object.assign(values,{cameraDistance:s.inputs.cameraDistance,flashDistance:s.inputs.linked?s.inputs.cameraDistance:s.inputs.flashDistance,focusInfinity:s.inputs.focusInfinity});
 for(const v of Object.values(values))if(typeof v==='number'&&!Number.isFinite(v))throw Error('빈칸 또는 잘못된 숫자가 있습니다. 입력을 완료하세요.');
 const e=s.equipment.find(e=>e.id===values.equipmentId);
 if(values.gnMode==='equipment'&&e){const normalized={...s,inputs:{...s.inputs},field:undefined};applyEquipment(normalized);for(const k of shootingKeys)Object.assign(values,{[k]:normalized.inputs[k]});}
 if(values.gnMode==='equipment'&&!e)throw Error('장비를 먼저 복구하거나 수동 GN을 선택하세요.');
 return {id:existingId,name:name(label),values,...(values.gnMode==='equipment'&&e?{equipmentSignature:signature(e)}:{})};
}
export function patch(i:Inputs,values:Partial<Inputs>):Patch {const before:Partial<Inputs>={},after:Partial<Inputs>={};for(const k of Object.keys(values) as (keyof Inputs)[])if(!Object.is(i[k],values[k])){Object.assign(before,{[k]:i[k]});Object.assign(after,{[k]:values[k]});}Object.assign(i,after);return {before,after};}
export function applyShot(s:Saved,shot:Shot):Patch {
 if(s.inputs.gnMode==='manual'&&shot.values.gnMode==='equipment')s.manualFlash=manualFlash(s.inputs);
 field(s).activeShotId=shot.id;const values={...shot.values};const before={...s.inputs};
 if('cameraDistance' in values&&!('focusInfinity' in values))values.focusInfinity=false;Object.assign(s.inputs,values);if(s.inputs.linked)s.inputs.flashDistance=s.inputs.cameraDistance;
 applyEquipment(s);
 const after={...s.inputs};Object.assign(s.inputs,before);return patch(s.inputs,after);
}
export function canUndo(i:Inputs,p:Patch):boolean{return Object.entries(p.after).every(([k,v])=>Object.is(i[k as keyof Inputs],v));}
export function undo(i:Inputs,p:Patch):boolean{if(!canUndo(i,p))return false;Object.assign(i,p.before);return true;}
export function distanceKey(i:Inputs):'cameraDistance'|'flashDistance'{return (i.tab==='flash'||i.tab==='combined')&&!i.linked?'flashDistance':'cameraDistance';}
export function validDistance(value:number,others:number[]=[]):number{if(!Number.isFinite(value)||value<=0||value>1e6||others.some(n=>Math.abs(n-value)<1e-9))throw Error('거리는 중복 없이 0 초과 1,000,000m 이하로 입력하세요.');return value;}
export function nextPower(i:Inputs,direction:'weaker'|'stronger'):number|undefined {try{const list=powerSteps(i.steps,i.minDenominator);return direction==='weaker'?list.find(n=>n>i.denominator):[...list].reverse().find(n=>n<i.denominator);}catch{return undefined;}}
export function restoreField(raw:unknown):FieldData {
 const f=freshField();if(!raw||typeof raw!=='object')return f;
 const d=raw as Partial<FieldData>;if(typeof d.version==='number'&&d.version>1)throw Error('더 새 현장 설정 스키마입니다. 덮어쓰지 않도록 로드를 중단합니다.');
 if(typeof d.activeShotId==='string')f.activeShotId=d.activeShotId;
 f.simple=d.simple===true;const used=new Set<string>();const identity=(x:{id:string;name?:string})=>{if(!x||typeof x.id!=='string'||!x.id||used.has(x.id))return false;used.add(x.id);return true;};
 if(Array.isArray(d.distances)){f.distances=[];for(const x of d.distances)if(identity(x)&&typeof x.metres==='number'&&Number.isFinite(x.metres)&&x.metres>0&&x.metres<=1e6&&!f.distances.some(y=>y.metres===x.metres))f.distances.push({id:x.id,metres:x.metres});}
 if(Array.isArray(d.zones))for(const x of d.zones)if(identity(x)&&typeof x.name==='string'&&x.name.trim()&&x.name.length<=100&&Number.isFinite(x.near)&&x.near>0&&Number.isFinite(x.far)&&x.far>0&&typeof x.infinity==='boolean'&&(x.infinity||x.far>x.near))f.zones.push({id:x.id,name:x.name,near:x.near,far:x.far,infinity:x.infinity});
 if(Array.isArray(d.shots))for(const x of d.shots){if(!identity(x)||typeof x.name!=='string'||!x.name.trim()||x.name.length>100||!x.values||typeof x.values!=='object')continue;
 const v=x.values;const good=shootingKeys.every(k=>typeof v[k]===typeof defaults[k]&&(typeof v[k]!=='number'||Number.isFinite(v[k])))&&['manual','equipment'].includes(v.gnMode)&&['m','ft'].includes(v.gnUnit)&&['approx','angles'].includes(v.coverage)&&['estimate','custom'].includes(v.cocMode)&&['manual','ttl','hss','bounce','modifier','near'].includes(v.mode)&&(!('focusInfinity' in v)||typeof v.focusInfinity==='boolean')&&['cameraDistance','flashDistance'].every(k=>!(k in v)||(Number.isFinite(v[k as keyof ShotValues])&&Number(v[k as keyof ShotValues])>0));
 if(!good)continue;const values={} as ShotValues;for(const k of [...shootingKeys,'cameraDistance','flashDistance','focusInfinity'] as const)if(k in v)Object.assign(values,{[k]:v[k]});f.shots.push({id:x.id,name:x.name,values,...(typeof x.equipmentSignature==='string'?{equipmentSignature:x.equipmentSignature}:{})});}
 return f;
}
