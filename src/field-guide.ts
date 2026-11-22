/* 현장 목측 도우미: 회절 주의, 상황별 노출(Sunny 16 확장), 구도별 거리·보폭.
 * 모두 대략값이며 노출계·거리계를 대신하지 않는다. */

/** Airy 지름이 CoC의 이 비율 이상이면 회절로 원경 디테일이 무뎌지기 시작한다고 본다(35mm·50mm에서 f/16부터). */
export const DIFFRACTION_RATIO=0.6;
export const airyDiameter=(aperture:number):number=>2.44*0.00055*aperture;
export function diffractionRisk(aperture:number,coc:number):boolean {
  return Number.isFinite(aperture)&&aperture>0&&Number.isFinite(coc)&&coc>0&&airyDiameter(aperture)/coc>=DIFFRACTION_RATIO;
}

/** ISO 100 기준 장면 밝기. 맑음 EV15가 Sunny 16(f/16 · 1/ISO)이고 나머지는 전통적인 EV 표의 대략값이다. */
export const EXPOSURE_SCENES=[
  {id:'snow',label:'눈·모래',ev:16},
  {id:'sun',label:'맑음',ev:15},
  {id:'haze',label:'옅은 구름',ev:14},
  {id:'cloud',label:'흐림',ev:13},
  {id:'shade',label:'그늘·짙은 흐림',ev:12},
  {id:'dusk',label:'해질녘',ev:11},
  {id:'indoor',label:'밝은 실내',ev:8},
  {id:'night',label:'야간 거리',ev:6},
] as const;
export type ExposureSceneId=(typeof EXPOSURE_SCENES)[number]['id'];
export const isExposureScene=(value:unknown):value is ExposureSceneId=>EXPOSURE_SCENES.some(s=>s.id===value);

export interface ExposurePair {
  aperture:number;
  /** 필요한 노출 시간(초). */
  seconds:number;
  /** 가장 가까운 셔터 다이얼 값(1/n의 n). 1초보다 길어 다이얼에 없으면 'B'. */
  shutter:number|'B';
  /** 다이얼 값으로 찍었을 때 남는 노출 차(스톱, +면 과다). */
  residual:number;
  /** 최고 셔터로도 반 스톱 넘게 과다. */
  tooBright:boolean;
  /** 1/초점거리보다 느려 손떨림 주의. */
  shake:boolean;
  /** 플래시 동조 속도보다 빠름. */
  overSync:boolean;
  /** 1초 이상: 상반칙 불궤 확인. */
  long:boolean;
}

/** 장면 EV(ISO 100)와 필름 EI로 조리개별 셔터 짝을 만든다. shutters는 카메라 다이얼의 1/n 값(B=0 포함 가능). */
export function exposurePairs(ev100:number,ei:number,apertures:readonly number[],shutters:readonly number[],focal:number,syncDenominator?:number):ExposurePair[] {
  const ev=ev100+Math.log2(ei/100);
  const dial=shutters.filter(n=>n>0).sort((a,b)=>a-b);
  if(!dial.length||!Number.isFinite(ev))return [];
  const fastest=dial[dial.length-1],slowest=dial[0];
  return apertures.map(aperture=>{
    const seconds=aperture*aperture/2**ev;
    let shutter:number|'B';let residual:number;
    if(seconds>1/slowest*Math.SQRT2&&shutters.includes(0)){shutter='B';residual=0;}
    else{
      const n=dial.reduce((best,v)=>Math.abs(Math.log2(seconds*v))<Math.abs(Math.log2(seconds*best))?v:best);
      shutter=n;residual=Math.log2((1/n)/seconds);
    }
    return {aperture,seconds,shutter,residual,
      tooBright:seconds<1/fastest/Math.SQRT2,
      shake:Number.isFinite(focal)&&focal>0&&seconds>1/focal*1.05,
      overSync:syncDenominator!==undefined&&typeof shutter==='number'&&shutter>syncDenominator,
      long:seconds>=1};
  });
}

/** 한 걸음 거리(m). 보통 성인 보폭. */
export const STRIDE=0.7;
/** 세로·가로 프레임 짧은 쪽이 아니라, 선택한 방향의 세로 높이에 들어갈 피사체 높이(m). 여백을 조금 포함한다. */
export const FRAMINGS=[
  {id:'face',label:'얼굴',height:0.35},
  {id:'bust',label:'바스트',height:0.6},
  {id:'half',label:'상반신',height:0.9},
  {id:'full',label:'전신',height:2.0},
] as const;
/** 높이 subject(m)인 피사체가 프레임 frame(mm)에 꽉 찰 때의 필름면 기준 거리(m). 박막렌즈: D=f(2+m+1/m). */
export function framingDistance(focal:number,frame:number,subject:number):number {
  if(![focal,frame,subject].every(v=>Number.isFinite(v)&&v>0))return NaN;
  const m=frame/(subject*1000);
  return focal*(2+m+1/m)/1000;
}
export const strides=(distance:number):number=>Math.max(1,Math.round(distance/STRIDE));
/** 사람 얼굴 앞뒤 두께(m). 심도가 이보다 얕으면 눈에 초점을 맞추라고 알린다. */
export const FACE_DEPTH=0.15;
