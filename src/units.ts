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
export function stepDistance(value:number,direction:number,minimum:number):number|undefined {
  const nearBoundary=(boundary:number)=>Math.abs(value-boundary)<=1e-9;
  const distance=nearBoundary(1)?1:nearBoundary(10)?10:value;
  const increment=distance<1||(distance===1&&direction<0)?.01:distance<10||(distance===10&&direction<0)?.1:1;
  const next=Math.max(minimum,Number((distance+direction*increment).toPrecision(15)));
  // 단위가 바뀌는 경계를 넘을 때는 먼저 경계값에 맞춘다.
  const boundary=[1,10].find(b=>b>=minimum&&(b-distance)*direction>0&&(next-b)*direction>0);
  return (next-value)*direction>0?boundary??next:undefined;
}
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

/** 셔터 입력 "1/125"·"2"를 초로 바꾼다. */
export function parseSeconds(text:string):number {
  const parts=text.split('/').map(parseNumber);
  if(parts.length===1)return parts[0];
  return parts.length===2&&parts.every(value=>Number.isFinite(value)&&value>0)?parts[0]/parts[1]:NaN;
}
/** 초를 편집 칸에 넣을 글자로: 1초 미만의 1/n은 분수로, 나머지는 숫자로. parseSeconds로 다시 읽으면 같은 값이 된다. */
export function formatSeconds(seconds:number):string {
  if(Number.isFinite(seconds)&&seconds>0&&seconds<1){
    const n=Math.round(1/seconds);
    if(1/n===seconds||Math.abs(n*seconds-1)<1e-9)return `1/${n}`;
  }
  return String(seconds);
}
