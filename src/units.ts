export const feetToMetres = (v:number):number => v*0.3048;
export const metresToFeet = (v:number):number => v/0.3048;
export function parseNumber(v:string):number {return v.trim()==='' ? NaN : Number(v);}
export function fmt(v:number,digits=2):string {
  if(v===Infinity)return '∞';if(!Number.isFinite(v))return '—';
  // Normalize only the displayed value; status decisions always keep the original number.
  return (Math.abs(v)<0.5*10**(-digits)?0:v).toLocaleString('ko-KR',{maximumFractionDigits:digits});
}
/** Distances are shown with at most one decimal place (display only; calculations keep full precision). */
export const DISTANCE_DIGITS=1;
export function distanceParts(v:number,digits=DISTANCE_DIGITS):{value:string;unit:'cm'|'m'|''} {
  if(v===Infinity)return {value:'∞',unit:''};
  if(!Number.isFinite(v)||v<0)return {value:'—',unit:''};
  const unit=v<=1?'cm':'m',scaled=unit==='cm'?v*100:v;
  const value=scaled>0&&scaled<0.5*10**(-digits)?`<${fmt(10**(-digits),digits)}`:fmt(scaled,digits);
  return {value,unit};
}
export function metres(v:number,digits=DISTANCE_DIGITS):string {
  const d=distanceParts(v,digits);return d.unit?`${d.value} ${d.unit}`:d.value;
}
