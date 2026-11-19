import {minFocusDistance} from './engine';

export const FOCUS_SCALE_MAX=30;
export const FOCUS_SCALE_STEPS=1000;
export const FOCUS_SCALE_TICKS=[0.5,0.7,1,1.5,2,3,5,10,Infinity] as const;

export function focusScale(focal:number) {
  const minimum=minFocusDistance(focal);
  if(!Number.isFinite(focal)||focal<=0||minimum>=FOCUS_SCALE_MAX)return;

  const lower=Math.max(minimum,0.5);
  const upper=Math.max(lower,5);
  const left=Math.log(lower/minimum);
  const middle=Math.log(upper/lower);
  const right=Math.log(FOCUS_SCALE_MAX/upper);
  // 자주 쓰는 구간을 넓히되 각 구간 안에서는 로그 간격을 유지한다.
  const weight=minimum<=0.5?Math.max(1,(left+right)*0.55/(middle*0.45)):1;
  const total=left+middle*weight+right;

  function position(distance:number):number {
    if(Number.isNaN(distance)||distance<=minimum)return 0;
    if(distance>=FOCUS_SCALE_MAX)return 1;
    if(distance<=lower)return Math.log(distance/minimum)/total;
    if(distance<=upper)return (left+weight*Math.log(distance/lower))/total;
    return (left+middle*weight+Math.log(distance/upper))/total;
  }

  function distance(position:number):number {
    if(position<=0)return minimum;
    if(position>=1)return FOCUS_SCALE_MAX;
    const offset=position*total;
    if(offset<=left)return minimum*Math.exp(offset);
    if(offset<=left+middle*weight)return lower*Math.exp((offset-left)/weight);
    return upper*Math.exp(offset-left-middle*weight);
  }

  return {minimum,position,distance};
}
