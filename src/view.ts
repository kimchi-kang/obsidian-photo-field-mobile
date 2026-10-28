import {ItemView,WorkspaceLeaf,Notice} from 'obsidian';
import type PhotoPlugin from './main';
import {Inputs,sensors} from './model';
import {flash,optics,coverage,exposureEV} from './engine';
import {fmt,metres,parseNumber,feetToMetres,metresToFeet} from './units';
import {diagram} from './diagram';
import {equipmentValid,parseTable} from './presets';
import {limitations} from './note';
export const VIEW='photo-field-mobile';
type NumericKey = {[K in keyof Inputs]: Inputs[K] extends number ? K : never}[keyof Inputs];
function node<K extends keyof HTMLElementTagNameMap>(parent:HTMLElement,tag:K,text?:string,cls?:string):HTMLElementTagNameMap[K] {
  const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;
}
export class PhotoView extends ItemView {
  private results!:HTMLElement;private picture!:HTMLElement;private root!:HTMLElement;
  private readonly aborters:AbortController[]=[];
  private power?:HTMLSelectElement;
  private detailState=new Map<string,boolean>();
  private numeric=new Map<NumericKey,{input:HTMLInputElement;range?:HTMLInputElement}>();
  constructor(leaf:WorkspaceLeaf,private plugin:PhotoPlugin){super(leaf);}
  getViewType():string{return VIEW;}
  getDisplayText():string{return '사진 촬영 도우미';}
  getIcon():string{return 'camera';}
  async onOpen():Promise<void>{this.render();}
  async onClose():Promise<void>{this.clean();this.contentEl.replaceChildren();}
  private clean():void {for(const a of this.aborters)a.abort();this.aborters.length=0;this.numeric.clear();this.power=undefined;}
  private listen(el:HTMLElement,event:string,fn:(e:Event)=>void):void {const a=new AbortController();el.addEventListener(event,fn,{signal:a.signal});this.aborters.push(a);}
  private changed():void {
    if(this.plugin.state.inputs.linked){this.plugin.update('flashDistance',this.plugin.state.inputs.cameraDistance);this.syncNumeric('flashDistance');}
    this.paint();void this.plugin.persist().catch(e=>this.plugin.report(e));this.plugin.refresh(this);
  }
  private button(parent:HTMLElement,text:string,fn:()=>void):HTMLButtonElement {const b=node(parent,'button',text);b.type='button';this.listen(b,'click',fn);return b;}
  private number(parent:HTMLElement,label:string,key:NumericKey,options?:{min:number;max:number;step:number}):void {
    const wrap=node(parent,'label',undefined,'pfm-field');node(wrap,'span',label);
    const input=node(wrap,'input');input.type='number';input.inputMode='decimal';input.step='any';input.value=Number.isFinite(this.plugin.state.inputs[key])?String(this.plugin.state.inputs[key]):'';input.dataset.key=key;input.setAttribute('aria-label',label);
    let range:HTMLInputElement|undefined;
    if(options){input.min=String(options.min);range=node(wrap,'input');range.type='range';range.min=String(options.min);range.max=String(options.max);range.step=String(options.step);range.value=input.value;range.setAttribute('aria-label',`${label} 빠른 조절`);range.dataset.range=key;
      const r=range;this.listen(r,'input',()=>{input.value=r.value;input.setAttribute('aria-invalid','false');this.plugin.update(key,Number(r.value));this.changed();});
    }
    this.numeric.set(key,{input,range});
    this.listen(input,'input',()=>{const v=parseNumber(input.value);this.plugin.update(key,v);if(key==='denominator')this.syncPower();if(range&&Number.isFinite(v))range.value=String(v);input.setAttribute('aria-invalid',String(!Number.isFinite(v)||v<0||(v===0&&key!=='loss')));this.changed();});
  }
  private select<K extends keyof Inputs>(parent:HTMLElement,label:string,key:K,values:Record<string,string>,after?:()=>void):HTMLSelectElement {
    const l=node(parent,'label',undefined,'pfm-field');node(l,'span',label);const s=node(l,'select');s.setAttribute('aria-label',label);s.dataset.key=key;
    for(const [v,t] of Object.entries(values)){const o=node(s,'option',t);o.value=v;}s.value=String(this.plugin.state.inputs[key]);
    this.listen(s,'change',()=>{this.plugin.update(key,s.value as Inputs[K]);after?.();this.changed();});return s;
  }
  private text(parent:HTMLElement,label:string,value:string):HTMLInputElement {const l=node(parent,'label',undefined,'pfm-field');node(l,'span',label);const t=node(l,'input');t.type='text';t.value=value;return t;}
  private details(label:string):HTMLElement {const d=node(this.root,'details');node(d,'summary',label);return node(d,'div',undefined,'pfm-settings');}
  private rememberDetails():void {
    if(!this.root)return;
    for(const d of this.root.querySelectorAll('details')) {
      const label=d.querySelector('summary')?.textContent;if(label)this.detailState.set(label,d.open);
    }
  }
  private restoreDetails():void {
    for(const d of this.root.querySelectorAll('details')) {
      const label=d.querySelector('summary')?.textContent;if(label)d.open=this.detailState.get(label)??false;
    }
  }
  private syncPower():void {
    if(!this.power)return;
    this.power.querySelector('[data-custom]')?.remove();
    const value=this.plugin.state.inputs.denominator;
    if(Number.isFinite(value)&&![1,2,4,8,16,32,64,128,256].includes(value)) {
      const option=node(this.power,'option',`사용자 1/${value}`);option.value=String(value);option.dataset.custom='true';
    }
    this.power.value=String(value);
  }
  private syncNumeric(key:NumericKey):void {const pair=this.numeric.get(key);if(pair){const value=this.plugin.state.inputs[key];pair.input.value=typeof value==='number'&&!Number.isFinite(value)?'':String(value);if(pair.range)pair.range.value=pair.input.value;}if(key==='denominator')this.syncPower();}
  render():void {
    this.rememberDetails();this.clean();this.contentEl.replaceChildren();this.contentEl.addClass('pfm-container');
    this.root=node(this.contentEl,'div',undefined,'pfm-root');const i=this.plugin.state.inputs;
    const header=node(this.root,'header');node(header,'p','PHOTO FIELD / OFFLINE','pfm-eyebrow');node(header,'h1','사진 촬영 도우미');node(header,'p','조리개 하나로, 빛과 심도를 함께.');
    const tabs=node(this.root,'nav',undefined,'pfm-tabs');tabs.setAttribute('aria-label','계산 화면');
    for(const [v,t]of Object.entries({flash:'플래시',dof:'심도·화각',combined:'통합'})) {const b=this.button(tabs,t,()=>{this.plugin.update('tab',v as Inputs['tab']);this.changed();for(const btn of tabs.querySelectorAll('button'))btn.setAttribute('aria-pressed',String(btn===b));});b.setAttribute('aria-pressed',String(i.tab===v));}
    this.results=node(this.root,'section',undefined,'pfm-results');this.results.setAttribute('aria-live','polite');
    const quick=node(this.root,'section',undefined,'pfm-quick');node(quick,'h2','빠른 조절');
    this.number(quick,'조리개 f-number','aperture',{min:0.7,max:32,step:0.1});
    const power=this.select(quick,'출력 선택','denominator',Object.fromEntries([1,2,4,8,16,32,64,128,256].map(n=>[n,`1/${n}`])),()=>{this.plugin.update('denominator',Number(power.value));this.syncNumeric('denominator');});
    this.power=power;this.syncPower();
    // Custom n is always available even if it is not one of the quick stages.
    this.number(quick,'사용자 출력 1/n · n','denominator');
    this.number(quick,'카메라 → 피사체 거리 (m)','cameraDistance',{min:0.1,max:30,step:0.1});
    const linked=node(quick,'label',undefined,'pfm-check');const check=node(linked,'input');check.type='checkbox';check.checked=i.linked;node(linked,'span','온카메라: 같은 위치·방향, 거리 연동');
    this.listen(check,'change',()=>{this.plugin.update('linked',check.checked);this.numeric.get('flashDistance')!.input.disabled=check.checked;this.changed();});
    this.number(quick,'플래시 → 피사체 거리 (m)','flashDistance',{min:0.1,max:30,step:0.1});this.numeric.get('flashDistance')!.input.disabled=i.linked;const flashRange=this.numeric.get('flashDistance')!.range;if(flashRange)flashRange.disabled=i.linked;
    // Keep the slider disabled state in sync with the explicit distance toggle.
    this.listen(check,'change',()=>{const r=this.numeric.get('flashDistance')?.range;if(r)r.disabled=check.checked;});
    this.picture=node(this.root,'figure',undefined,'pfm-diagram');
    const camera=this.details('카메라·렌즈·CoC');
    this.select(camera,'센서 프리셋','sensor',{...Object.fromEntries(Object.entries(sensors).map(([k,v])=>[k,v.name])),custom:'사용자 지정'},()=>{const preset=sensors[this.plugin.state.inputs.sensor];if(preset){this.plugin.update('width',preset.width);this.plugin.update('height',preset.height);this.syncNumeric('width');this.syncNumeric('height');}});
    this.number(camera,'센서 가로 (mm)','width');this.number(camera,'센서 세로 (mm)','height');
    for(const key of ['width','height'] as const)this.listen(this.numeric.get(key)!.input,'input',()=>{this.plugin.update('sensor','custom');const s=camera.querySelector<HTMLSelectElement>('select[data-key=sensor]');if(s)s.value='custom';void this.plugin.persist().catch(e=>this.plugin.report(e));});
    this.number(camera,'실제 초점거리 (mm)','focal');this.number(camera,'ISO','iso');
    this.select(camera,'CoC 방식','cocMode',{estimate:'센서 대각 ÷1500 추정',custom:'사용자 지정 mm'});this.number(camera,'사용자 CoC (mm)','coc');
    node(camera,'p','CoC는 감상 크기·시력·확대율에 따른 허용 착란원입니다. 대각/1500은 경험적 기본값이며 픽셀 단위 선명도를 보장하지 않습니다. APS-C 크기는 제조사마다 다릅니다.');
    const fl=this.details('플래시·GN 조건·조사각');
    this.select(fl,'발광 조건','mode',{manual:'수동 · 직접광 · 일반 동조',ttl:'TTL (계산 미지원)',hss:'HSS (계산 미지원)',bounce:'바운스 (계산 미지원)',modifier:'소프트박스 (계산 미지원)',near:'근거리 대형 광원 (계산 미지원)'});
    this.number(fl,'선택 플래시 줌 (mm)','zoom');
    this.number(fl,'ISO100 · 최대 출력 GN','gn');
    let lastUnit=i.gnUnit;
    this.select(fl,'GN 단위','gnUnit',{m:'m 기준',ft:'ft 기준'},()=>{const unit=this.plugin.state.inputs.gnUnit;const value=this.plugin.state.inputs.gn;if(unit!==lastUnit){this.plugin.update('gn',unit==='ft'?metresToFeet(value):feetToMetres(value));this.syncNumeric('gn');lastUnit=unit;}});
    this.number(fl,'GN이 측정된 줌 (mm)','gnZoom');
    const cond=this.text(fl,'GN 측정 조건·출처 (ISO100 최대 출력)',i.conditions);this.listen(cond,'input',()=>{this.plugin.update('conditions',cond.value);this.changed();});
    this.number(fl,'추가 광량 손실 L (stop, 기본 0)','loss');
    node(fl,'p','GN에 이미 포함된 손실을 중복 적용하지 마세요. 손실 보정은 추정입니다. 줌 변경 시 해당 줌의 GN 자료가 필요합니다.');
    this.number(fl,'장비 최소 출력 1/n · n','minDenominator');
    const steps=this.text(fl,'장비 지원 출력 분모 (쉼표 구분)',i.steps);this.listen(steps,'input',()=>{this.plugin.update('steps',steps.value);this.changed();});
    this.select(fl,'조사각 입력 방식','coverage',{approx:'풀프레임 커버리지 가정 (근사)',angles:'수평·수직 조사각 직접 입력'});
    this.number(fl,'수평 조사각 (°)','horizontal');this.number(fl,'수직 조사각 (°)','vertical');
    node(fl,'p','줌 mm 근사 모드는 36×24mm 직선투영 화각을 가정합니다. 제조사 기준 포맷을 확인한 실측 조사각이 있으면 직접 입력하세요.');
    this.equipmentPanel();
    const advanced=this.details('허용 범위·그림 범위·계산 근거');
    this.number(advanced,'적정 노출 허용 범위 ±EV','tolerance');this.number(advanced,'그림 최대 거리 (m)','diagramMax');
    const hyper=this.button(advanced,'과초점거리에 초점 맞추기',()=>{try{this.plugin.update('cameraDistance',optics(this.plugin.state.inputs).hyperfocal);this.syncNumeric('cameraDistance');this.changed();}catch(e){this.plugin.report(e);}});hyper.className='pfm-wide';
    node(advanced,'p','유효 GN=G√p√(ISO/100)×2^(−L/2), 적정 거리=GN/f-number. 필요 출력=(Nr/G)²(100/ISO)2^L. 노출 차이=2log₂(d/r). 양수=예상 과다, 음수=예상 부족. 빛이 이 거리에서 끝나는 것은 아닙니다.');
    node(advanced,'p','H=f²/(N·CoC)+f, h=H−f. 근거리=hs/(h+s−f), 원거리=hs/(h−s+f). s≥H이면 ∞. 광학은 mm, 출력은 m. 직선투영 화각=2atan(센서 길이/2f). 조사 범위=2r·tan(각/2).');
    node(advanced,'p',limitations);
    const about=this.details('플러그인 정보·원본 저작권');node(about,'p',`사진 촬영 도우미 ${this.plugin.manifest.version} · depth-of-field의 심도·화각 시각화를 모바일 Obsidian용으로 수정·재구현하고 수동 플래시 계산을 확장했습니다. 원작자의 공식 또는 후원 플러그인이 아닙니다.`);
    const a=node(about,'a','원본: Jack Herrington · depth-of-field');a.href='https://github.com/jherr/depth-of-field';
    node(about,'p','Copyright (c) 2026 Jack Herrington · MIT. 참고 SHA c75dd6d40e4a96e96fd38e57657fe4b9737bf776. MIT 전문: main.js 내 고지 및 배포 ZIP의 vendor/depth-of-field-LICENSE.txt. 재사용 내역: GitHub의 THIRD_PARTY_NOTICES.md.');
    const footer=node(this.root,'footer');const save=this.button(footer,'현재 계산을 노트로 저장',()=>{save.disabled=true;void this.plugin.saveNote().catch(e=>this.plugin.report(e)).finally(()=>{save.disabled=false;});});save.className='mod-cta pfm-save';
    node(footer,'p','일반 Markdown · 새 노트 생성 · 인터넷 연결 불필요');this.paint(false);
  }
  private equipmentPanel():void {
    const p=this.details('내 장비 프리셋 · 줌별 GN 표');
    node(p,'p','제조사 내장 수치 없음. 설명서나 실측 자료를 입력하세요. 아래 GN은 현재 선택한 m/ft 단위로 읽고, 저장 시 m로 정규화합니다.');
    const list=node(p,'select');list.setAttribute('aria-label','저장된 장비');const placeholder=node(list,'option','장비 선택');placeholder.value='';
    this.plugin.state.equipment.forEach((v,index)=>{const o=node(list,'option',v.name);o.value=String(index);});
    this.button(p,'선택 장비의 현재 줌 GN 적용',()=>{const e=this.plugin.state.equipment[Number(list.value)];if(list.value===''||!e){new Notice('장비를 선택하세요.');return;}
      const i=this.plugin.state.inputs,g=e.table[String(i.zoom)];
      if(g===undefined){this.plugin.update('gnZoom',0);this.syncNumeric('gnZoom');this.changed();new Notice('선택 장비의 현재 줌 GN이 없습니다. 수동 입력이 필요합니다.');return;}
      Object.assign(i,{gn:g,gnUnit:'m',gnZoom:i.zoom,conditions:`${e.conditions} · 출처: ${e.source}`,minDenominator:e.minDenominator,steps:e.steps});void this.plugin.persist().catch(x=>this.plugin.report(x));this.render();});
    this.button(p,'선택 장비 삭제',()=>{if(list.value==='')return;this.plugin.state.equipment.splice(Number(list.value),1);void this.plugin.persist().catch(x=>this.plugin.report(x));this.render();});
    const name=this.text(p,'새 장비 이름',''),conditions=this.text(p,'측정 조건 (ISO100·최대 출력·직접광 등)',''),source=this.text(p,'출처 URL·설명서 페이지 또는 실측 방법','');
    const l=node(p,'label',undefined,'pfm-field');node(l,'span','줌mm,GN · 한 줄에 한 측정값');const table=node(l,'textarea');table.placeholder='줌mm,GN';table.rows=5;
    this.button(p,'새 장비 프리셋 저장',()=>{try{
      const i=this.plugin.state.inputs;
      const e={name:name.value.trim(),conditions:conditions.value.trim(),source:source.value.trim(),table:parseTable(table.value,i.gnUnit),minDenominator:i.minDenominator,steps:i.steps};
      if(!equipmentValid(e))throw Error('이름·측정 조건·출처·유효한 GN 표와 지원 출력이 필요합니다.');
      this.plugin.state.equipment.push(e);void this.plugin.persist().then(()=>new Notice('장비 저장 완료')).catch(x=>this.plugin.report(x));this.render();
    }catch(e){this.plugin.report(e);}});
  }
  private paint(remember=true):void {
    if(remember)this.rememberDetails();
    const i=this.plugin.state.inputs;this.results.replaceChildren();this.root.dataset.tab=i.tab;
    const flashPanel=node(this.results,'div',undefined,'pfm-flash-results');
    try {const f=flash(i);node(flashPanel,'p','적정 노출 예상 거리','pfm-eyebrow');node(flashPanel,'div',metres(f.d),'pfm-hero');
      node(flashPanel,'p',`1/${i.denominator} · f/${fmt(i.aperture)} · ISO ${fmt(i.iso,0)} · GN ${fmt(f.g)}m @ ${fmt(i.zoom)}mm`);
      node(flashPanel,'p',i.conditions,'pfm-conditions');
      const label=f.ev>i.tolerance?'예상 과다 노출':f.ev< -i.tolerance?'예상 부족 노출':'허용 범위 내';
      node(flashPanel,'p',`${metres(f.r)}에서 ${f.ev>0?'+':''}${fmt(f.ev)} EV · ${label}`,'pfm-ev');
      node(flashPanel,'p',`±${fmt(i.tolerance)}EV: ${metres(f.low)} ~ ${metres(f.high)}. 가까우면 과다 노출될 수 있습니다.`);
      const d=node(flashPanel,'details',undefined,'pfm-flash-details');node(d,'summary','필요 출력·조리개·거리별 표');
      node(d,'p',`필요 조리개 f/${fmt(f.requiredAperture)} · 필요 출력 ${fmt(f.needed*100)}% · ${f.status}`);
      node(d,'p',`가까운 지원 단계 1/${f.nearest} → 남는 오차 ${f.residual>0?'+':''}${fmt(f.residual)} EV`);
      this.table(d,['출력','예상 거리'],f.distances.map(x=>[`1/${x.n}`,metres(x.d)]));
      this.table(d,['플래시 거리','노출 차이'],[0.5,0.70710678,1,1.41421356,2].map(v=>[metres(f.d*v),`${fmt(exposureEV(f.d,f.d*v))} EV · ${v<1?'과다':v>1?'부족':'기준 적정'}`]));
    }catch(e){node(flashPanel,'p','적정 노출 예상 거리','pfm-eyebrow');node(flashPanel,'div','—','pfm-hero');node(flashPanel,'p',e instanceof Error?e.message:String(e),'pfm-error');}
    const dof=node(this.results,'div',undefined,'pfm-dof-results');
    try {const o=optics(i);node(dof,'h2','심도·화각');node(dof,'p',`근거리 ${metres(o.near)} · 원거리 ${metres(o.far)}`,'pfm-ev');const od=node(dof,'details');node(od,'summary','전체 심도·과초점·화각·회절');node(od,'p',`전체 ${metres(o.total)} · 과초점 ${metres(o.hyperfocal)}`);
      node(od,'p',`화각 수평 ${fmt(o.horizontal,1)}° / 수직 ${fmt(o.vertical,1)}° / 대각 ${fmt(o.diagonal,1)}°`);
      node(od,'p',`실제 ${fmt(i.focal)}mm → 35mm 환산 ${fmt(o.equivalent,1)}mm · CoC ${fmt(o.c,5)}mm`);
      node(od,'p',`회절 근사: 파장 550nm, Airy 지름 ${fmt(o.airy,5)}mm (${fmt(o.airy/o.c)}×CoC). ${o.airy>o.c?'CoC보다 커질 수 있음.':'CoC 이하.'} 절대 선명도 판정이 아닙니다.`);
    }catch(e){node(dof,'p',e instanceof Error?e.message:String(e),'pfm-error');}
    const exposureDetails=flashPanel.querySelector('details');if(exposureDetails)this.results.append(exposureDetails);
    try {const c=coverage(i);const p=node(this.results,'details',undefined,'pfm-coverage-results');node(p,'summary','프레임·조사 범위 비교');
      node(p,'p',`프레임 ${fmt(c.camera.width)}×${fmt(c.camera.height)}m · 조사 범위 ${fmt(c.flash.width)}×${fmt(c.flash.height)}m`);
      node(p,'p',i.linked?(c.narrow?'주의: 프레임 가장자리 광량 부족 가능성. 실제 배광은 균일하지 않습니다.':'동일 위치·방향 가정. 실제 배광은 균일하지 않습니다.'):'오프카메라: 각각의 거리 평면 범위입니다. 위치·방향을 입력하지 않아 공간 중첩을 계산하지 않습니다.');
    }catch(e){node(this.results,'p',e instanceof Error?e.message:String(e),'pfm-error');}
    if(i.loss>0)node(this.results,'p','추가 손실을 적용한 추정. GN에 포함된 손실의 중복 보정에 주의하세요.');
    this.restoreDetails();diagram(this.picture,i);
  }
  private table(parent:HTMLElement,headers:string[],rows:string[][]):void {const t=node(parent,'table');const h=node(node(t,'thead'),'tr');headers.forEach(x=>node(h,'th',x));const body=node(t,'tbody');for(const row of rows){const tr=node(body,'tr');row.forEach(x=>node(tr,'td',x));}}
}
