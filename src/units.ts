export const feetToMetres = (v:number):number => v*0.3048;
export const metresToFeet = (v:number):number => v/0.3048;
export function parseNumber(v:string):number {return v.trim()==='' ? NaN : Number(v);}
export function fmt(v:number,digits=2):string {
  if(v===Infinity)return '∞';if(!Number.isFinite(v))return '—';
  // Normalize only the displayed value; status decisions always keep the original number.
  return (Math.abs(v)<0.5*10**(-digits)?0:v).toLocaleString('ko-KR',{maximumFractionDigits:digits});
}
export const metres = (v:number):string => v===Infinity?'∞':`${fmt(v)} m`;
