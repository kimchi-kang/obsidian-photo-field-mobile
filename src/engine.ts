/* Optical concepts adapted from jherr/depth-of-field App.tsx (MIT).
 * Copyright (c) 2026 Jack Herrington. Original MIT text: vendor/depth-of-field-LICENSE.txt.
 * Reimplemented using a consistent thin-lens model; no display clamp in physics.
 * Subject distances are referenced to the film plane (lens distance-scale convention).
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
/** Circle of confusion in mm. 'film' = 0.03 mm on the 36x24 frame (Nikon DOF-scale convention), scaled with the frame diagonal. */
export const FILM_COC_35MM=0.03;
export function circleOfConfusion(i:Pick<Inputs,'cocMode'|'coc'|'width'|'height'>):number {
  const diagonal=Math.hypot(i.width,i.height);
  return i.cocMode==='custom'?i.coc:i.cocMode==='estimate'?diagonal/1500:FILM_COC_35MM*diagonal/Math.hypot(36,24);
}
/** Distances are measured from the film plane, like a lens distance scale. Thin lens focused at lens distance s: D = s + v = s²/(s−f). All in mm. */
export const filmFromLens=(s:number,f:number):number=>s*s/(s-f);
/** Closest focus setting the model accepts (m, from the film plane): just beyond 1:1, where D = 4f. */
export const minFocusDistance=(focal:number):number=>4*focal/1000+0.001;
/** Inverse of filmFromLens for magnification ≤ 1 (D ≥ 4f). */
export function lensFromFilm(D:number,f:number):number {
  positive(D,f);if(D<4*f)throw Error('초점 맞출 거리는 필름면 기준으로 초점거리의 4배 이상이어야 합니다. (등배보다 가까운 접사는 계산하지 않습니다)');
  return (D+Math.sqrt(D*(D-4*f)))/2;
}
/** Film-plane distance (mm) of the hyperfocal focus setting; h0 = f²/(N·c). Shared with the zone solver so the infinity boundary compares exactly. */
export const hyperfocalFilm=(h0:number,f:number):number=>{const H=h0+f;return H*H/h0;};
export function optics(i:Inputs) {
  positive(i.width,i.height,i.focal,i.aperture);if(!i.focusInfinity)positive(i.cameraDistance);
  const c=circleOfConfusion(i);
  positive(c);const f=i.focal,h0=f*f/(i.aperture*c),H=h0+f;positive(h0,H);
  const hyperfocal=hyperfocalFilm(h0,f)/1000;positive(hyperfocal);
  let near:number,far:number;
  if(i.focusInfinity){near=H/1000;far=Infinity;} // lens at f from the film: near limit h0 from the lens
  else{
    const s=lensFromFilm(i.cameraDistance*1000,f),v=f*s/(s-f);positive(s,v);
    // Compare in the input's metre domain: the hyperfocal value itself is exposed in metres.
    const atInfinity=i.cameraDistance>=hyperfocal;
    // H−s = (D_H−D)·h0(s−f)/(Hs−f(H+s)); taking the difference in metres keeps the last finite input finite.
    near=(h0*s/(h0+s-f)+v)/1000;far=atInfinity?Infinity:s*(H*s-f*(H+s))/((hyperfocal-i.cameraDistance)*1000*(s-f))/1000+v/1000;
    if(!atInfinity)positive(far);
  }
  positive(near);
  const equivalent=f*(Math.hypot(36,24)/Math.hypot(i.width,i.height)),airy=2.44*0.00055*i.aperture;
  positive(equivalent,airy);
  return {c,hyperfocal,near,far,total:far-near,
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
  if(i.linked&&i.focusInfinity)throw Error('초점이 무한대라 플래시→피사체 거리를 정할 수 없습니다. 오프카메라로 플래시 거리를 직접 입력하세요.');
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
  if(i.focusInfinity)throw Error('초점 무한대에서는 프레임·조사 범위를 계산하지 않습니다.');
  const h=i.coverage==='approx'?angle(36,i.zoom):i.horizontal;
  const v=i.coverage==='approx'?angle(24,i.zoom):i.vertical;
  const r=i.linked?i.cameraDistance:i.flashDistance;
  // Frame at the focused subject: film size ÷ magnification, with the lens extended for this focus distance.
  positive(i.width,i.height);const s=lensFromFilm(i.cameraDistance*1000,i.focal),scale=(s-i.focal)/i.focal/1000,camera={width:i.width*scale,height:i.height*scale};positive(camera.width,camera.height);
  return {h,v,flash:footprint(r,h,v),camera,narrow:h<angle(i.width,i.focal)||v<angle(i.height,i.focal)};
}
export function validate(i:Inputs):string[] {
  const errors:string[]=[];
  for(const fn of [()=>optics(i),()=>flash(i),()=>coverage(i),()=>positive(i.diagramMax)])try{fn();}catch(e){errors.push(e instanceof Error?e.message:String(e));}
  return [...new Set(errors)];
}
