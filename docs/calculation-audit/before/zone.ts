import {Inputs} from './model';
import {optics,positive} from './engine';

export function equivalence(i:Inputs) {
  positive(i.width,i.height,i.focal,i.aperture);
  const dimensional=Math.hypot(36,24)/Math.hypot(i.width,i.height);
  const nominal:Record<string,number>={ff:1,apsc:1.5,apsc16:1.6,mft:2};
  const useNominal=i.cropBasis==='nominal'&&i.sensor in nominal;
  const crop=useNominal?nominal[i.sensor]:dimensional;
  return {crop,dimensional,basis:useNominal?'명목 계수':'실치수 대각 비율',focal:i.focal*crop,aperture:i.aperture*crop,
    differentAspect:Math.abs(i.width/i.height-1.5)>0.001,
    comparable:i.cocMode==='estimate'};
}
export function zoneTarget(i:Inputs) {
  positive(i.zoneNear,i.focal);
  if(i.zoneNear*1000<=i.focal)throw Error('목표 근거리는 실제 렌즈 초점거리보다 커야 합니다.');
  if(!i.zoneInfinity){positive(i.zoneFar);if(i.zoneNear>=i.zoneFar)throw Error('목표 근거리는 원거리보다 작아야 합니다.');}
  return {near:i.zoneNear,far:i.zoneInfinity?Infinity:i.zoneFar};
}
export function includesTarget(o:{near:number;far:number},t:{near:number;far:number}):boolean {
  return o.near<=t.near+1e-9&&(t.far===Infinity?o.far===Infinity:o.far+1e-9>=t.far);
}
export function solveZone(i:Inputs) {
  const target=zoneTarget(i);
  positive(i.apertureMin,i.apertureMax);
  if(i.apertureMin>i.apertureMax)throw Error('렌즈 최대 개방 f값은 최소 개방 f값 이하여야 합니다.');
  const c=i.cocMode==='estimate'?Math.hypot(i.width,i.height)/1500:i.coc;
  positive(i.width,i.height,c);
  const a=target.near*1000,b=target.far*1000,f=i.focal;
  const focus=target.far===Infinity?2*a:2*a/(1+a/b);
  const h=target.far===Infinity?2*a-f:(2*a-f*(1+a/b))/(1-a/b);
  positive(h);const required=f*f/(c*h);
  const raw=i.apertureSteps.split(',').map(v=>v.trim());
  if(raw.some(v=>!v||!Number.isFinite(Number(v))||Number(v)<=0))throw Error('사용 가능한 조리개 단계를 양수 f값으로 입력하세요.');
  const steps=[...new Set(raw.map(Number))].filter(v=>v>=i.apertureMin&&v<=i.apertureMax).sort((a,b)=>a-b);
  if(!steps.length)throw Error('렌즈 범위 안에 선택 가능한 조리개 단계가 없습니다.');
  // Try the widest actual step first, then verify with the unchanged forward engine.
  for(const aperture of steps){
    const cameraDistance=target.far===Infinity?(f*f/(aperture*c)+f)/1000:focus/1000;
    const actual=optics({...i,aperture,cameraDistance});
    if(includesTarget(actual,target))return {possible:true as const,aperture,cameraDistance,actual,required,target};
  }
  const aperture=steps[steps.length-1];
  const cameraDistance=target.far===Infinity?(f*f/(aperture*c)+f)/1000:focus/1000;
  return {possible:false as const,aperture,cameraDistance,actual:optics({...i,aperture,cameraDistance}),required,target};
}
