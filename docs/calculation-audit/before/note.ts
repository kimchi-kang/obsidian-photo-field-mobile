import {Inputs,Equipment} from './model';
import {optics,flash,coverage} from './engine';
import {equivalence,solveZone} from './zone';
import {fmt,metres} from './units';
export const limitations='수동 플래시·직접광·일반 동조·중심부 노출의 추정입니다. 실제 배광·반사율·환경광·장비 편차를 포함하지 않습니다. TTL, HSS, 바운스, 소프트박스, 근거리 대형 광원은 이 기본 모델로 확정할 수 없습니다. 손실 보정은 추정이며 GN에 이미 포함된 손실을 중복 적용하지 마세요.';
export type NoteScope='all'|Inputs['tab'];
export function validateNote(i:Inputs,scope:NoteScope='all'):void {
  if(scope!=='flash')optics(i);
  if(scope==='zone'&&i.zoneFlow==='target')solveZone(i);
  if(scope!=='dof'&&scope!=='zone')flash(i);
  if(scope==='all'||scope==='combined')coverage(i);
}
export function note(i:Inputs,date=new Date(),context?:{version:string;equipment?:Equipment;scope?:NoteScope}):string {
  const scope=context?.scope??'all';
  const lines=['# 사진 촬영 계산',`\n날짜: ${date.toISOString()} (${date.toLocaleString('ko-KR')}, 기기 현지 시각)`,`\n## 입력값\n`,`| 항목 | 값 |`,`| --- | --- |`];
  lines.push(`저장 범위: ${scope==='zone'?'현재 탭 · 존 포커싱 (플래시 제외)':scope==='dof'?'현재 탭 · 심도·화각 (플래시·조사 범위 제외)':scope==='flash'?'현재 탭 · 플래시 (심도·조사 범위 제외)':scope==='combined'?'현재 탭 · 통합 (전체 계산)':'전체 계산'}`);
  lines.push(`플러그인 버전: ${context?.version??'개발/미지정'}`,`GN 입력 모드: ${i.gnMode==='equipment'?'장비 표':'수동 GN'}`,`선택 장비: ${context?.equipment?.name??'없음 · 수동 GN'}`,`장비 출처: ${context?.equipment?.source??'GN 조건 참조'}`);
  const labels:Record<keyof Inputs,string>={gnMode:'GN 모드',equipmentId:'장비 ID (수동 모드에서는 적용 안 함)',sensor:'센서 프리셋',width:'센서 가로 mm',height:'센서 세로 mm',focal:'실제 초점거리 mm',aperture:'조리개 f/',iso:'ISO',cameraDistance:'카메라 거리 m',linked:'온카메라 연동',flashDistance:'별도 플래시 거리 m',cocMode:'CoC 방식',coc:'사용자 CoC mm',gn:'ISO100 최대 출력 GN',gnUnit:'GN 단위',gnZoom:'GN 측정 줌 mm',zoom:'선택 플래시 줌 mm',conditions:'GN 조건',denominator:'출력 1/n의 n',loss:'추가 손실 stop',tolerance:'허용 오차 ±EV',minDenominator:'최소 출력 1/n의 n',steps:'지원 출력 분모',coverage:'조사각 방식 (approx=풀프레임 가정)',horizontal:'직접 입력 수평 조사각 °',vertical:'직접 입력 수직 조사각 °',mode:'발광 조건',diagramMax:'그림 최대 거리 m',tab:'화면',cropBasis:'환산 기준',zoneFlow:'존 흐름',zoneNear:'목표 근거리 m',zoneFar:'목표 유한 원거리 m (무한대 선택 시 미사용)',zoneInfinity:'목표 원거리 무한대',apertureMin:'렌즈 최대 개방 f값',apertureMax:'렌즈 최소 개방 f값',apertureSteps:'사용 가능한 실제 조리개 단계'};
  const opticalKeys:ReadonlySet<keyof Inputs>=new Set(['sensor','width','height','focal','aperture','cameraDistance','cocMode','coc','tab','cropBasis']);
  const flashKeys:ReadonlySet<keyof Inputs>=new Set(['gnMode','equipmentId','aperture','iso','linked','cameraDistance','flashDistance','gn','gnUnit','gnZoom','zoom','conditions','denominator','loss','tolerance','minDenominator','steps','mode','tab']);
  for(const key of Object.keys(labels) as (keyof Inputs)[]){if(((scope==='dof'||scope==='zone')&&!opticalKeys.has(key)&&!['zoneFlow','zoneNear','zoneFar','zoneInfinity','apertureMin','apertureMax','apertureSteps'].includes(key))||(scope==='flash'&&!flashKeys.has(key)))continue;lines.push(`| ${labels[key]} | ${String((key==='flashDistance'&&i.linked)||(key==='cameraDistance'&&scope==='flash'&&!i.linked)||(key==='coc'&&i.cocMode==='estimate')||(['horizontal','vertical'].includes(key)&&i.coverage==='approx')?'미사용':i[key]).replace(/\|/g,'\\|').replace(/\n/g,' / ')} |`);}
  lines.push('\n## 계산 결과\n');
  if(scope!=='dof'&&scope!=='zone')try {const f=flash(i);lines.push(`- 선택 출력 1/${i.denominator}: **${f.powerLabel}**`,`- 적정 노출 예상 거리: ${metres(f.d)}`,`- 플래시–피사체 거리: ${metres(f.r)} · 노출 차이: ${fmt(f.ev)} EV (${f.ev>0?'예상 과다':f.ev<0?'예상 부족':'기준 적정'})`,`- 유효 GN(m): ${fmt(f.gn)}`,`- ±${i.tolerance}EV 거리 구간: ${metres(f.low)} ~ ${metres(f.high)}`,`- 필요한 조리개 f/${fmt(f.requiredAperture)} · 필요 출력 ${fmt(f.needed*100)}% · ${f.status}`,`- 권장 지원 단계 1/${f.nearest} · 해당 단계 예상 거리 ${metres(f.nearestDistance)}, 남는 노출 오차 ${fmt(f.residual)} EV`);
    lines.push('\n### 출력별 거리\n','| 출력 | 적정 노출 예상 거리 |','| --- | --- |',...f.distances.map(x=>`| 1/${x.n} | ${metres(x.d)} |`));
  }catch(e){lines.push(`- 플래시 계산 불가: ${e instanceof Error?e.message:String(e)}`);}
  if(scope!=='flash')try {const o=optics(i);lines.push(`\n- 심도 근거리 ${metres(o.near)} / 원거리 ${metres(o.far)} / 전체 ${metres(o.total)}`,`- 과초점거리 ${metres(o.hyperfocal)} · CoC ${fmt(o.c,5)} mm`, `- 수평/수직/대각 화각 ${fmt(o.horizontal)}° / ${fmt(o.vertical)}° / ${fmt(o.diagonal)}°`, `- 실치수 대각 기준 풀프레임 환산 초점거리 ${fmt(o.equivalent)} mm`, `- 회절 Airy 지름 (파장 550nm) ${fmt(o.airy,5)} mm, CoC 대비 ${fmt(o.airy/o.c)}배 (근사)`);}catch(e){lines.push(`- 광학 계산 불가: ${e instanceof Error?e.message:String(e)}`);}
  if(scope!=='flash')try {
    const e=equivalence(i);lines.push(`\n## 풀프레임 환산\n- ${e.basis} ${fmt(e.crop,4)}× · 실치수 대각 계수 ${fmt(e.dimensional,4)}×`, `- 실제 ${fmt(i.focal)}mm f/${fmt(i.aperture)} → 화각 환산 ${fmt(e.focal)}mm · 심도 대응 약 f/${fmt(e.aperture)}`, '- 실제 노출 조리개는 그대로입니다. 같은 위치·구도·비교 감상 조건의 근사이며 근접 촬영·브리딩·화면비 차이는 미반영.',i.cocMode==='custom'?'- 사용자 지정 CoC: 정확한 심도 일치 아님.':'- CoC는 센서 대각/1500. 풀프레임 CoC도 대응시켜 비교해야 합니다. 명목/실치수 차이 존재.');
    if(i.zoneFlow==='target') {const r=solveZone(i);lines.push('\n## 존 포커싱 역산',`- 목표 ${metres(r.target.near)} ~ ${metres(r.target.far)}`,`- ${r.possible?'제안 가능':'달성 불가 · 조리개 제한'}: 초점 맞출 거리 ${metres(r.cameraDistance)}, 실제 f/${fmt(r.aperture)}`,`- 제안 검산 ${metres(r.actual.near)} ~ ${metres(r.actual.far)} · 이론 필요 f/${fmt(r.required,4)}`);}
    lines.push('- 역산 가정: 유한 구간 a,b에서 s=2ab/(a+b), h=(2ab−f(a+b))/(b−a), N=f²/(c·h). 무한대는 H≤2a, 적용 초점=H. 실제 사용 단계 중 가장 개방된 조리개부터 기존 심도 엔진으로 재검산. CoC 허용 범위이며 절대 선명도 경계 아님.');
  }catch(e){lines.push(`- 존/환산 계산 불가: ${e instanceof Error?e.message:String(e)}`);}
  if(scope==='all'||scope==='combined')try {const c=coverage(i);lines.push(`- 카메라 프레임 ${fmt(c.camera.width)} × ${fmt(c.camera.height)} m (카메라 거리 평면)`,`- 플래시 조사 범위 ${fmt(c.flash.width)} × ${fmt(c.flash.height)} m (플래시 거리 평면)`,`- 조사각 ${fmt(c.h)}° × ${fmt(c.v)}° · ${i.coverage==='approx'?'풀프레임 커버리지 가정, 제조사 사양 아님':'수동 입력 조사각'}`,`- ${i.linked?(c.narrow?'프레임 가장자리 광량 부족 가능성':'동일 위치·방향 가정의 범위 비교'):'오프카메라: 위치·방향 미입력, 공간 중첩 비교 불가'}`);}catch(e){lines.push(`- 조사 범위 계산 불가: ${e instanceof Error?e.message:String(e)}`);}
  lines.push('\n## 조건과 한계\n',limitations,'빛은 예상 거리에서 끝나지 않습니다. 가까우면 과다 노출될 수 있습니다. CoC=센서 대각/1500은 감상 크기·시력·확대율에 의존하는 경험적 추정입니다. 직선투영 박막렌즈 모델이며 근접 촬영·포커스 브리딩·동공 배율은 반영하지 않습니다.',
    '\n## 공식\n','유효 GN = G√p√(ISO/100) × 2^(−L/2), d = 유효 GN/N, 필요 p = (Nr/G)²(100/ISO)2^L, EV = 2log₂(d/r).',
    'H=f²/(N·CoC)+f, h=H−f, Dnear=h·s/(h+s−f), Dfar=h·s/(h−s+f); s≥H이면 원거리 ∞. 광학 길이는 mm로 통일 후 m로 표시.',
    '\n## 출처\n','심도·화각 표현의 기반: [depth-of-field](https://github.com/jherr/depth-of-field), Jack Herrington, Copyright (c) 2026 Jack Herrington, MIT. 참고 SHA c75dd6d40e4a96e96fd38e57657fe4b9737bf776. 모바일용 재구현·수정 및 플래시 확장. 공식·후원 플러그인이 아닙니다.',
    '[심도 공식](https://dofmaster.com/equations.html) · [GN 기본 관계 Nikon](https://download.nikonimglib.com/archive2/rOYAB007rd7k028ePIg11W7lyc97/SB-500_CH%28En%2904.pdf)');
  return lines.join('\n')+'\n';
}
