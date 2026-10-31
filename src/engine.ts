/* Optical concepts adapted from jherr/depth-of-field App.tsx (MIT).
 * Copyright (c) 2026 Jack Herrington. Original MIT text: vendor/depth-of-field-LICENSE.txt.
 * Reimplemented using a consistent thin-lens model; no display clamp in physics.
 */
import {Inputs} from './model';
import {feetToMetres} from './units';
export function positive(...values:number[]):void {if(values.some(v=>!Number.isFinite(v)||v<=0))throw Error('양의 유한한 수가 필요합니다.');}
export function angle(size:number,focal:number):number {
  positive(size,focal);const result=2*Math.atan((size/focal)/2)*180/Math.PI;
  positive(result);if(result>=180)throw Error('화각이 수치 표현 한계에 도달했습니다. 입력 규모를 줄이세요.');return result;
}
export function footprint(r:number,h:number,v:number):{width:number;height:number} {
  positive(r,h,v);if(h>=180||v>=180)throw Error('조사각은 180° 미만이어야 합니다.');
  const width=2*r*Math.tan(h*Math.PI/360),height=2*r*Math.tan(v*Math.PI/360);
  positive(width,height);return {width,height};
}
export function optics(i:Inputs) {
  positive(i.width,i.height,i.focal,i.aperture,i.cameraDistance);
  const c=i.cocMode==='estimate'?Math.hypot(i.width,i.height)/1500:i.coc;
  positive(c); const s=i.cameraDistance*1000,f=i.focal;positive(s);
  if(s<=f)throw Error('카메라 거리는 실제 초점거리보다 커야 합니다. (박막렌즈 모델)');
  const h0=f*f/(i.aperture*c), H=h0+f;
  // H includes +f. Use H-f in both numerators and denominators for s=H -> infinity.
  positive(h0,H);
  const near=h0/(h0+s-f)*(s/1000);
  const atInfinity=i.cameraDistance>=H/1000;
  // Subtract in the input's metre domain: H itself is exposed in metres.
  // This keeps the immediately preceding representable input finite, without an infinity epsilon band.
  const far=atInfinity?Infinity:(h0/1000)/(H/1000-i.cameraDistance)*i.cameraDistance;
  positive(near);if(!atInfinity)positive(far);
  const equivalent=f*(Math.hypot(36,24)/Math.hypot(i.width,i.height)),airy=2.44*0.00055*i.aperture;
  positive(equivalent,airy);
  return {c,hyperfocal:H/1000,near,far,total:far-near,
    horizontal:angle(i.width,f),vertical:angle(i.height,f),diagonal:angle(Math.hypot(i.width,i.height),f),
    equivalent,airy};
}
export function effectiveGN(g:number,p:number,iso:number,loss:number):number {
  positive(g,p,iso);if(p>1||!Number.isFinite(loss)||loss<0)throw Error('출력은 0 초과 1 이하, 추가 손실은 0 이상이어야 합니다.');
  const result=g*Math.sqrt(p)*Math.sqrt(iso/100)*2**(-loss/2);
  positive(result);return result;
}
export function flashDistance(g:number,p:number,iso:number,n:number,loss=0):number {positive(n);const result=effectiveGN(g,p,iso,loss)/n;positive(result);return result;}
export function requiredPower(g:number,n:number,r:number,iso:number,loss=0):number {positive(n,r);const result=(n*r/effectiveGN(g,1,iso,loss))**2;positive(result);return result;}
export function exposureEV(d:number,r:number):number {positive(d,r);return 2*(Math.log2(d)-Math.log2(r));}
export function powerSteps(text:string,minDenominator:number):number[] {
  const list=text.split(',').map(v=>Number(v.trim()));
  if(!list.length||list.some(v=>!Number.isFinite(v)||v<1||v>minDenominator)||!list.includes(1)||!list.includes(minDenominator))throw Error('지원 출력 분모는 1과 최소 출력 분모를 포함하고 그 사이의 수여야 합니다.');
  return [...new Set(list)].sort((a,b)=>a-b);
}
export function flash(i:Inputs) {
  if(i.mode!=='manual')throw Error('선택 조건은 기본 GN 모델로 계산할 수 없습니다. 실측 또는 전용 자료가 필요합니다.');
  positive(i.zoom);
  if(i.gnZoom!==i.zoom)throw Error(`선택 줌 ${i.zoom}mm의 GN 자료 없음. 해당 줌의 GN과 측정 줌을 직접 입력하세요.`);
  positive(i.gn,i.gnZoom,i.denominator,i.minDenominator,i.tolerance,i.linked?i.cameraDistance:i.flashDistance);
  if(!i.conditions.trim())throw Error('GN 측정 조건을 입력하세요.');
  if(i.denominator<1)throw Error('출력 분모는 1 이상이어야 합니다.');
  if(i.tolerance>5)throw Error('허용 범위는 0 초과 5EV 이하로 입력하세요.');
  const steps=powerSteps(i.steps,i.minDenominator);
  const g=i.gnUnit==='ft'?feetToMetres(i.gn):i.gn;
  const r=i.linked?i.cameraDistance:i.flashDistance;
  const gn=effectiveGN(g,1/i.denominator,i.iso,i.loss),d=gn/i.aperture;
  positive(i.aperture,d); const needed=requiredPower(g,i.aperture,r,i.iso,i.loss);
  // log(a/b) can overflow even while both a, b and the EV result are representable.
  // Compute before squaring the power fraction: subnormal p has fewer significant bits.
  const neededEV=2*(Math.log2(i.aperture)+Math.log2(r)-Math.log2(effectiveGN(g,1,i.iso,i.loss)));
  const residualFor=(n:number)=>-Math.log2(n)-neededEV;
  const nearest=steps.reduce((best,v)=>Math.abs(residualFor(v))<Math.abs(residualFor(best))?v:best,steps[0]);
  const low=d/2**(i.tolerance/2),high=d*2**(i.tolerance/2),requiredAperture=gn/r;
  positive(low,high,requiredAperture);
  return {gn,d,r,g,supported:steps.includes(i.denominator),powerLabel:steps.includes(i.denominator)?(i.gnMode==='equipment'?'장비 지원 출력':'수동 GN · 입력한 지원 단계'):'이론값·장비 미지원 출력',nearestDistance:flashDistance(g,1/nearest,i.iso,i.aperture,i.loss),ev:exposureEV(d,r),needed,requiredAperture,nearest,
    residual:residualFor(nearest),low,high,
    status:needed>1?'최대 출력으로도 부족':needed<1/i.minDenominator?'최소 출력보다 낮은 출력 필요':'장비 출력 범위 안',steps,
    distances:steps.map(n=>({n,d:flashDistance(g,1/n,i.iso,i.aperture,i.loss)}))};
}
export function coverage(i:Inputs) {
  const h=i.coverage==='approx'?angle(36,i.zoom):i.horizontal;
  const v=i.coverage==='approx'?angle(24,i.zoom):i.vertical;
  const r=i.linked?i.cameraDistance:i.flashDistance;
  return {h,v,flash:footprint(r,h,v),camera:footprint(i.cameraDistance,angle(i.width,i.focal),angle(i.height,i.focal)),narrow:h<angle(i.width,i.focal)||v<angle(i.height,i.focal)};
}
export function validate(i:Inputs):string[] {
  const errors:string[]=[];
  for(const fn of [()=>optics(i),()=>flash(i),()=>coverage(i),()=>positive(i.diagramMax)])try{fn();}catch(e){errors.push(e instanceof Error?e.message:String(e));}
  return [...new Set(errors)];
}
