import {effectiveGN,exposureEV,nearestPower,optics,positive,powerSteps} from './engine';
import {FILL_RATIOS,FULL_STOP_APERTURES,Inputs} from './model';
import {cameraShutters,syncLimit} from './shooting-presets';
import type {CameraPreset} from './shooting-presets';
import {feetToMetres,metres} from './units';

type DistanceRange={near:number;far:number};
export type SafeRange={kind:'range';near:number;far:number}|{kind:'off-camera'|'empty'|'unavailable'};

export function safeShootingRange(linked:boolean,depth?:DistanceRange,flashRange?:{low:number;high:number}):SafeRange {
  if(!linked)return {kind:'off-camera'};
  if(!depth||!flashRange||![depth.near,flashRange.low,flashRange.high].every(n=>Number.isFinite(n)&&n>0)
    ||!(depth.far>=depth.near)||flashRange.high<flashRange.low)return {kind:'unavailable'};
  const near=Math.max(depth.near,flashRange.low),far=Math.min(depth.far,flashRange.high);
  return near<=far?{kind:'range',near,far}:{kind:'empty'};
}

export function safeRangeText(result:SafeRange):string {
  if(result.kind==='range')return `안전 촬영 구간 ${metres(result.near)} ~ ${metres(result.far)}`;
  if(result.kind==='off-camera')return '오프카메라 · 교집합 계산 안 함';
  if(result.kind==='empty')return '겹치는 구간 없음 · 조리개 또는 출력 조정';
  return '안전 촬영 구간 계산 불가 · 초점·플래시 거리와 입력 조건 확인';
}

export function nominalGN(i:Inputs):number {
  if(!Number.isFinite(i.zoom)||i.zoom<=0)throw Error('플래시 줌은 양수로 입력하세요.');
  if(i.gnZoom!==i.zoom||!Number.isFinite(i.gn)||i.gn<=0)throw Error('현재 줌의 공칭 GN 자료가 없습니다.');
  return i.gnUnit==='ft'?feetToMetres(i.gn):i.gn;
}

export type GNMeasurement={iso:number;denominator:number;distance:number;aperture:number};

export function calibrateGN(measurement:GNMeasurement,steps:readonly number[],nominal?:number):{gn:number;loss?:number} {
  const {iso,denominator,distance,aperture}=measurement;
  if(![iso,distance,aperture].every(n=>Number.isFinite(n)&&n>0))throw Error('실측 ISO·거리·조리개는 각각 양의 유한한 수로 입력하세요.');
  if(!steps.includes(denominator))throw Error('실측에 사용한 지원 출력 단계를 선택하세요.');
  const gn=aperture*distance/Math.sqrt(iso/100)/Math.sqrt(1/denominator);
  if(!Number.isFinite(gn)||gn<=0)throw Error('실측 GN이 계산 범위를 벗어났습니다. 입력값을 확인하세요.');
  if(nominal===undefined)return {gn};
  positive(nominal);
  return {gn,loss:exposureEV(nominal,gn)};
}

function flashBasis(i:Inputs) {
  if(i.mode!=='manual')throw Error('수동 · 직접광 · 일반 동조에서 계산할 수 있습니다.');
  const gn=nominalGN(i);
  if(!i.conditions.trim())throw Error('GN 측정 조건을 입력하세요.');
  positive(i.aperture);
  return {gn,fullGN:effectiveGN(gn,1,i.iso,i.loss),steps:powerSteps(i.steps,i.minDenominator)};
}

function powerRecommendation(steps:readonly number[],targetEV:number) {
  const minimumEV=-Math.log2(steps[steps.length-1]);
  // 로그의 반올림 오차만 허용해 출력 단계 경계에서 판정이 뒤집히지 않게 한다.
  const epsilon=Number.EPSILON*8*Math.max(1,Math.abs(targetEV),Math.abs(minimumEV));
  const range=targetEV>epsilon?'above':targetEV<minimumEV-epsilon?'below':'within';
  return {...nearestPower(steps,targetEV),range};
}

export function fillFlash(i:Inputs,camera?:CameraPreset) {
  if(!cameraShutters(camera).includes(i.shutter))throw Error(`${camera?.name??'FM2'} 셔터 속도를 선택하세요.`);
  if(!FILL_RATIOS.some(value=>value===i.fillRatio))throw Error('필인 비율을 선택하세요.');
  if(i.linked&&i.focusInfinity)throw Error('무한대 초점에서는 거리 연동을 끄고 플래시 거리를 입력하세요.');
  const {fullGN,steps}=flashBasis(i),distance=i.linked?i.cameraDistance:i.flashDistance;
  const targetEV=exposureEV(distance,fullGN/i.aperture)+i.fillRatio;
  return {...powerRecommendation(steps,targetEV),syncExceeded:i.shutter>syncLimit(camera)};
}

const CHEATSHEET_DISTANCES=[0.7,1,1.5,2,3,5];
const APERTURES=FULL_STOP_APERTURES.split(',').map(Number);

export function flashCheatsheet(i:Inputs) {
  const {gn,fullGN,steps}=flashBasis(i);
  if(!Number.isFinite(i.denominator)||i.denominator<1)throw Error('현재 출력 분모를 1 이상으로 입력하세요.');
  const selectedGN=effectiveGN(gn,1/i.denominator,i.iso,i.loss);
  optics({...i,focusInfinity:true});
  const rows=CHEATSHEET_DISTANCES.map(distance=>{
    const power=powerRecommendation(steps,exposureEV(distance,fullGN/i.aperture));
    const requiredAperture=selectedGN/distance;
    const errorFor=(aperture:number)=>exposureEV(requiredAperture,aperture);
    const aperture=APERTURES.reduce((best,n)=>Math.abs(errorFor(n))<Math.abs(errorFor(best))?n:best);
    let depth:DistanceRange|undefined,depthError:string|undefined;
    try{depth=optics({...i,focusInfinity:false,cameraDistance:distance});}
    catch(e){depthError=e instanceof Error?e.message:String(e);}
    return {distance,power,requiredAperture,aperture,apertureEV:errorFor(aperture),depth,depthError};
  });
  return {gn,rows};
}
