import {minFocusDistance} from './engine';

export const FOCUS_SCALE_MAX=30;
export const FOCUS_SCALE_STEPS=1000;
/** 유한 거리는 축의 이 지점까지만 쓴다. 남은 끝 칸은 ∞ 자리라서, 30 m보다 먼 초점(예: 과초점 59.6 m)이 ∞ 눈금과 겹쳐 보이지 않는다. */
export const FOCUS_SCALE_FINITE_END=0.92;
export const FOCUS_SCALE_TICKS=[0.5,0.7,1,1.5,2,3,5,10,Infinity] as const;

export function focusScale(focal:number,minimum=minFocusDistance(focal)) {
  if(!Number.isFinite(focal)||focal<=0||minimum>=FOCUS_SCALE_MAX)return;

  const lower=Math.max(minimum,0.5);
  const upper=Math.max(lower,5);
  const left=Math.log(lower/minimum);
  const middle=Math.log(upper/lower);
  const right=Math.log(FOCUS_SCALE_MAX/upper);
  // 자주 쓰는 구간을 넓히되 각 구간 안에서는 로그 간격을 유지한다.
  const weight=minimum<=0.5?Math.max(1,(left+right)*0.55/(middle*0.45)):1;
  const total=left+middle*weight+right;

  function finite(distance:number):number {
    if(distance<=lower)return Math.log(distance/minimum)/total;
    if(distance<=upper)return (left+weight*Math.log(distance/lower))/total;
    return (left+middle*weight+Math.log(distance/upper))/total;
  }
  function position(distance:number):number {
    if(Number.isNaN(distance)||distance<=minimum)return 0;
    if(distance===Infinity)return 1;
    if(distance>=FOCUS_SCALE_MAX)return FOCUS_SCALE_FINITE_END;
    return finite(distance)*FOCUS_SCALE_FINITE_END;
  }

  function distance(position:number):number {
    if(position<=0)return minimum;
    if(position>=FOCUS_SCALE_FINITE_END)return FOCUS_SCALE_MAX;
    const offset=position/FOCUS_SCALE_FINITE_END*total;
    if(offset<=left)return minimum*Math.exp(offset);
    if(offset<=left+middle*weight)return lower*Math.exp((offset-left)/weight);
    return upper*Math.exp(offset-left-middle*weight);
  }

  return {minimum,position,distance};
}
