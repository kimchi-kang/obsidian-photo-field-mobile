export const feetToMetres = (v:number):number => v*0.3048;
export const metresToFeet = (v:number):number => v/0.3048;
export function parseNumber(v:string):number {return v.trim()==='' ? NaN : Number(v);}
export function fmt(v:number,digits=2):string {return v===Infinity?'∞':Number.isFinite(v)?v.toLocaleString('ko-KR',{maximumFractionDigits:digits}):'—';}
export const metres = (v:number):string => v===Infinity?'∞':`${fmt(v)} m`;
