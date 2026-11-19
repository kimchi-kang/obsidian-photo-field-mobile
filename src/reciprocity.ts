import {fmt} from './units';

const vision3 = {
  uncorrectedMax:1,
  officialNote:'10초 전후 +1스톱, CC10R 필터 (Kodak, 대략값)',
  p:1.30,
  source:'커뮤니티 추정 (FilmMeter 등)',
  note:'p=1.30이면 10초 → 약 20초로 Kodak의 +1스톱과 거의 같습니다.',
  filter:'CC10R 필터 권장(Kodak 10초 기준)',
};

export const RECIPROCITY_FILMS = {
  'vision3-250d':{...vision3,id:'vision3-250d',name:'Kodak Vision3 250D (5207)'},
  'vision3-500t':{...vision3,id:'vision3-500t',name:'Kodak Vision3 500T (5219)'},
  'double-x':{
    id:'double-x',name:'Eastman Double-X (5222)',uncorrectedMax:1,
    officialNote:'1초 초과 데이터 없음 (Kodak)',p:1.31,
    source:'커뮤니티 추정 (Photrio, Ilford 방식 차용)',note:'흑백 필름 · 보정 필터 불필요',
  },
  'ektachrome-100d':{
    id:'ektachrome-100d',name:'Kodak Ektachrome 100D (7294)',uncorrectedMax:1,
    officialNote:'1초 초과 데이터 없음 (Kodak)',p:1.30,
    source:'커뮤니티 추정 (FilmMeter, Estimated)',note:'리버설 필름은 노출 관용도가 좁습니다.',
    bracket:'리버설 · ±1/2~1스톱 브라케팅 권장',
  },
  'ultramax-400':{
    id:'ultramax-400',name:'Kodak Ultramax 400',uncorrectedMax:1,
    officialNote:'1초 초과 시 보정이 필요할 수 있음 · 수치 없음 (Kodak E-7023)',p:1.30,
    source:'커뮤니티 추정 (FilmMeter, Estimated)',note:'',
  },
  custom:{
    id:'custom',name:'직접 입력',uncorrectedMax:1,
    officialNote:'—',p:undefined,source:'실측 지수',note:'',
  },
} as const;

export type ReciprocityFilmId = keyof typeof RECIPROCITY_FILMS;
export type ReciprocityFilm = (typeof RECIPROCITY_FILMS)[ReciprocityFilmId];
export type ReciprocityOverrides = Partial<Record<ReciprocityFilmId,number>>;

export function isReciprocityFilmId(value:unknown):value is ReciprocityFilmId {
  return typeof value==='string'&&Object.prototype.hasOwnProperty.call(RECIPROCITY_FILMS,value);
}

export function validMeteredSeconds(value:unknown):value is number {
  return typeof value==='number'&&Number.isFinite(value)&&value>0;
}

export function validReciprocityExponent(value:unknown):value is number {
  return typeof value==='number'&&value>=1&&value<=2;
}

export function correctedTime(metered:number,film:ReciprocityFilm,pOverride?:number) {
  if(!validMeteredSeconds(metered))throw Error('측광 시간은 양의 유한한 초로 입력하세요.');
  if(pOverride!==undefined&&!validReciprocityExponent(pOverride))throw Error('지수 p는 1.0~2.0으로 입력하세요.');
  const uncorrected=metered<=film.uncorrectedMax;
  const p=pOverride??film.p;
  if(!uncorrected&&p===undefined)throw Error('실측 지수 p를 1.0~2.0으로 입력하세요.');
  const corrected=uncorrected?metered:metered**(p??1);
  if(!Number.isFinite(corrected))throw Error('보정 시간이 계산 범위를 벗어났습니다. 측광 시간이나 지수를 확인하세요.');
  return {
    corrected,
    extraStops:Math.log2(corrected/metered),
    basis:uncorrected?'uncorrected':pOverride===undefined?'community':'measured',
    filter:metered>=5&&'filter' in film?film.filter:undefined,
    bracket:'bracket' in film?film.bracket:'브라케팅 권장(+1스톱 한 장 추가)',
  } as const;
}

export function formatExposureSeconds(seconds:number):string {
  if(seconds>0&&seconds<0.005)return '0.01초 미만';
  return `${fmt(seconds)}초`;
}

export function formatExposureMinutes(seconds:number):string {
  if(seconds<60)return '';
  const remainder=Math.round((seconds%60)*100)/100;
  const minutes=Math.floor(seconds/60)+(remainder===60?1:0);
  return `${fmt(minutes,0)}분 ${formatExposureSeconds(remainder%60)}`;
}
