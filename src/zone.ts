import {Inputs} from './model';
import {optics,positive,circleOfConfusion,filmFromLens,hyperfocalFilm} from './engine';

export function equivalence(i:Inputs) {
  positive(i.width,i.height,i.focal,i.aperture);
  const dimensional=Math.hypot(36,24)/Math.hypot(i.width,i.height);
  const nominal:Record<string,number>={ff:1,apsc:1.5,apsc16:1.6,mft:2};
  const useNominal=i.cropBasis==='nominal'&&i.sensor in nominal;
  const crop=useNominal?nominal[i.sensor]:dimensional;
  const focal=i.focal*crop,aperture=i.aperture*crop;positive(dimensional,crop,focal,aperture);
  return {crop,dimensional,basis:useNominal?'명목 계수':'실치수 대각 비율',focal,aperture,
    differentAspect:Math.abs(i.width/i.height-1.5)>0.001,
    comparable:i.cocMode!=='custom'};
}
export function zoneTarget(i:Inputs) {
  positive(i.zoneNear,i.focal);
  if(i.zoneNear*1000<=4*i.focal)throw Error('목표 근거리는 필름면 기준으로 초점거리의 4배보다 커야 합니다.');
  if(!i.zoneInfinity){positive(i.zoneFar);if(i.zoneNear>=i.zoneFar)throw Error('목표 근거리는 원거리보다 작아야 합니다.');}
  return {near:i.zoneNear,far:i.zoneInfinity?Infinity:i.zoneFar};
}
export function includesTarget(o:{near:number;far:number},t:{near:number;far:number}):boolean {
  // Relative roundoff budget (film-plane conversion adds a square root), not a physical extension of the DOF interval.
  const le=(a:number,b:number)=>a<=b||(Number.isFinite(a)&&Number.isFinite(b)&&a-b<=1e-12*Math.max(Math.abs(a),Math.abs(b)));
  return le(o.near,t.near)&&(t.far===Infinity?o.far===Infinity:le(t.far,o.far));
}
const tooClose=()=>Error('목표 구간이 너무 가깝습니다. 등배보다 가까운 접사는 계산하지 않습니다.');
/** Lens-side focus distance s and h0=f²/(N·c) whose DOF limits, measured from the film plane, are exactly a..b (mm). */
function solveFinite(a:number,b:number,f:number):{s:number;h:number} {
  // Limits from the lens are a−v and b−v with v=f·s/(s−f); focus is their harmonic mean. v moves slowly with s, so iterate.
  let s=2*a*b/(a+b),nl=0,fl=0,done=false;
  for(let n=0;n<500&&!done;n++){
    if(!(s>2*f))throw tooClose();
    const v=f*s/(s-f);nl=a-v;fl=b-v;if(!(nl>f))throw tooClose();
    const next=2*nl*fl/(nl+fl);done=Math.abs(next-s)<=4*Number.EPSILON*s;s=next;
  }
  if(!done||!(s>2*f))throw tooClose();
  const v=f*s/(s-f);nl=a-v;fl=b-v;
  return {s,h:(2*nl*fl-f*(nl+fl))/(fl-nl)};
}
export function solveZone(i:Inputs) {
  const target=zoneTarget(i);
  positive(i.apertureMin,i.apertureMax);
  if(i.apertureMin>i.apertureMax)throw Error('렌즈 최대 개방 f값은 최소 개방 f값 이하여야 합니다.');
  const c=circleOfConfusion(i);
  positive(i.width,i.height,c);
  const a=target.near*1000,b=target.far*1000,f=i.focal;
  positive(a);if(!i.zoneInfinity)positive(b);
  let h:number,focus=0;
  if(target.far===Infinity){
    // Focused at the hyperfocal setting the near limit from the film plane is (h+f)/2 + f(h+f)/h = a.
    const p=2*a-3*f,disc=p*p-8*f*f;if(!(p>0)||!(disc>=0))throw tooClose();
    h=(p+Math.sqrt(disc))/2;
  }else{const r=solveFinite(a,b,f);h=r.h;focus=filmFromLens(r.s,f);positive(focus);}
  positive(h);const required=f*f/(c*h);positive(required);
  const raw=i.apertureSteps.split(',').map(v=>v.trim());
  if(raw.some(v=>!v||!Number.isFinite(Number(v))||Number(v)<=0))throw Error('사용 가능한 조리개 단계를 양수 f값으로 입력하세요.');
  const steps=[...new Set(raw.map(Number))].filter(v=>v>=i.apertureMin&&v<=i.apertureMax).sort((a,b)=>a-b);
  if(!steps.length)throw Error('렌즈 범위 안에 선택 가능한 조리개 단계가 없습니다.');
  const distanceFor=(aperture:number)=>target.far===Infinity?hyperfocalFilm(f*f/(aperture*c),f)/1000:focus/1000;
  // Try the widest actual step first, then verify with the unchanged forward engine.
  for(const aperture of steps){
    const cameraDistance=distanceFor(aperture);
    const actual=optics({...i,aperture,cameraDistance,focusInfinity:false});
    if(includesTarget(actual,target))return {possible:true as const,aperture,cameraDistance,actual,required,target};
  }
  const aperture=steps[steps.length-1],cameraDistance=distanceFor(aperture);
  return {possible:false as const,aperture,cameraDistance,actual:optics({...i,aperture,cameraDistance,focusInfinity:false}),required,target};
}
