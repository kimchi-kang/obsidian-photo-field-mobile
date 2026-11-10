import {field,capture,applyShot,issue,id,name,validDistance,distanceKey,nextPower,canUndo,undo,Patch,Shot,ZoneFavorite} from './field';
import {ItemView,WorkspaceLeaf,Notice} from 'obsidian';
import type PhotoPlugin from './main';
import {Inputs,sensors,Equipment,emptyDraft} from './model';
import {flash,optics,coverage,exposureEV,powerSteps} from './engine';
import {fmt,metres,distanceParts,parseNumber,feetToMetres,metresToFeet} from './units';
import {diagram,SCENE,sceneDistance} from './diagram';
import {equipmentValid,parseTable,selectedEquipment,applyEquipment,equipmentId,selectEquipment,addQ20iii} from './presets';
import {equivalence,solveZone,includesTarget} from './zone';
import {limitations} from './note';
export const VIEW='photo-field-mobile';
type NumericKey = {[K in keyof Inputs]: Inputs[K] extends number ? K : never}[keyof Inputs];
let nextControlId=0;
function node<K extends keyof HTMLElementTagNameMap>(parent:HTMLElement,tag:K,text?:string,cls?:string):HTMLElementTagNameMap[K] {
  const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;
}
export class PhotoView extends ItemView {
  private equivalent!:HTMLElement;private zoneResult!:HTMLElement;private results!:HTMLElement;private picture!:HTMLElement;private resultDetails!:HTMLElement;private root!:HTMLElement;
  private readonly aborters:AbortController[]=[];
  private gnDisplayUnit:'m'|'ft'='m';private power?:HTMLSelectElement;private saveStatus?:HTMLElement;private context!:HTMLElement;
  private detailState=new Map<string,boolean>();
  private outputUndo?:{before:number;applied:number};
  private fieldButton(parent:HTMLElement,text:string,fn:()=>void):HTMLButtonElement {const b=node(parent,'button',text);b.type='button';b.onclick=fn;return b;}
  private distanceButtons?:HTMLElement;private fieldStorage?:HTMLElement;private powerAdjust!:HTMLElement;private fieldHost!:HTMLElement;private fieldExtras!:HTMLElement;private shotChanges='';
  private shotUndo?:Patch;private previousShotId?:string;
  private fieldMessage='';
  private deletedField?:{kind:'shots'|'zones';value:Shot|ZoneFavorite;index:number};
  private closeFieldManager():void {const d=this.fieldExtras?.querySelector('details');if(d)d.open=false;this.detailState.set('즐겨찾기·내 거리 관리',false);}
  private fieldAction(fn:()=>void):void {try{fn();this.changed();this.render();}catch(e){this.plugin.report(e);}}
  private fieldPanel():void {
    const s=this.plugin.state,f=field(s),i=s.inputs;
    const bar=node(this.root,'nav',undefined,'pfm-field-viewbar');
    const mode=this.fieldButton(bar,f.simple?'상세 화면으로':'현장 간편 화면으로',()=>this.fieldAction(()=>{f.simple=!f.simple;if(f.simple)this.closeFieldManager();}));mode.dataset.fieldMode='true';this.fieldButton(bar,'즐겨찾기·거리 관리',()=>{const d=this.fieldExtras.querySelector('details');if(d){d.open=true;d.scrollIntoView({block:'start'});d.querySelector('summary')?.focus({preventScroll:true});}});
    this.fieldHost=node(this.root,'section',undefined,'pfm-field-tools');
  }
  private paintField():void {
    const s=this.plugin.state,f=field(s),i=s.inputs,h=this.fieldHost;this.distanceButtons?.remove();h.replaceChildren();this.fieldExtras.replaceChildren();this.root.dataset.simple=String(f.simple);
    const mode=this.root.querySelector('[data-field-mode]');if(mode)mode.textContent=f.simple?'상세 화면으로':'현장 간편 화면으로';
    const active=f.shots.find(x=>x.id===f.activeShotId);this.fieldStorage=node(h,'div');const status=node(this.fieldStorage,'p',this.plugin.saveError,'pfm-error');status.setAttribute('role','status');this.fieldButton(this.fieldStorage,'저장 재시도',()=>{void this.plugin.persist().then(()=>this.plugin.flush()).catch(e=>this.plugin.reportSaveError(e));});this.fieldStorage.hidden=!this.plugin.saveError;
    if(this.shotUndo&&!canUndo(i,this.shotUndo)){this.shotUndo=undefined;this.fieldMessage='촬영 적용 취소 만료 · 적용 항목이 이후 변경되었습니다.';}
    const shotHeading=node(h,'strong',active?`${active.name} · ${Object.entries(active.values).every(([k,v])=>Object.is(i[k as keyof Inputs],v))?'적용됨':'이후 수정됨'}`:'촬영 즐겨찾기 · 조건 묶음');shotHeading.className='pfm-shot-heading';
    const shots=node(h,'div',undefined,'pfm-field-buttons pfm-shot-buttons');
    for(const shot of f.shots){const b=this.fieldButton(shots,shot.name,()=>this.fieldAction(()=>{this.closeFieldManager();const expired=!!this.outputUndo;this.outputUndo=undefined;this.previousShotId=f.activeShotId;const applied=applyShot(s,shot);this.shotUndo=Object.keys(applied.after).length?applied:undefined;this.shotChanges=Object.entries(applied.after).map(([k,v])=>`${this.fieldLabel(k)}: ${this.fieldValue(k,applied.before[k as keyof Inputs])} → ${this.fieldValue(k,v)}`).join(' / ')||'변경 없음';this.fieldMessage=`${shot.name} 적용 · ${'cameraDistance' in shot.values?'카메라·별도 플래시 거리 포함':'현재 거리 유지'}${expired?' · 이전 출력 취소 만료':''}`;if(!this.shotUndo&&!expired)this.fieldMessage='';}));b.dataset.shotId=shot.id;b.setAttribute('aria-pressed',String(shot.id===f.activeShotId));}
    if(!f.shots.length)node(shots,'p','저장된 촬영 조건 없음 · 「즐겨찾기·거리 관리」에서 현재 조건을 저장하세요.','pfm-field-empty');
    if(active){const problem=issue(s,active);if(problem)node(h,'p',`불완전한 촬영 조건 · ${problem}`,'pfm-error');}
    if(this.shotUndo){const b=this.fieldButton(h,'촬영 적용 한 번 취소 · 변경 항목만',()=>this.fieldAction(()=>{if(this.shotUndo)undo(i,this.shotUndo);this.shotUndo=undefined;f.activeShotId=this.previousShotId;applyEquipment(s);this.fieldMessage='촬영 조건 적용 취소됨 · 삭제 복구와 별개';}));b.className='pfm-shot-undo';}
    let review:HTMLDetailsElement|undefined;if(this.fieldMessage){review=node(h,'details',undefined,'pfm-field-review');node(review,'summary',this.fieldMessage.includes(' 적용 · ')?'촬영 적용 내역 확인':this.fieldMessage.startsWith('촬영 적용 취소 만료')?'촬영 취소 만료 · 설정 변경됨':this.fieldMessage.startsWith('권장 출력 적용 취소 만료')?'권장 적용 취소 만료 · 출력 변경됨':this.fieldMessage);node(review,'p',this.fieldMessage);if(this.shotChanges)node(review,'p',this.shotChanges,'pfm-field-status');}
    const distance=node(h,'div',undefined,'pfm-distance-buttons');this.distanceButtons=distance;const key=distanceKey(i);
    node(distance,'p',key==='flashDistance'?`내 거리 · 플래시 → 피사체 ${metres(i.flashDistance)} (카메라 초점 유지)`:`내 거리 · 초점 맞출 거리 ${i.focusInfinity?'∞':metres(i.cameraDistance)}${i.linked&&(i.tab==='flash'||i.tab==='combined')?' · 플래시 연동':''}`);
    const addDistances=(parent:HTMLElement,start:number,end:number)=>{for(const d of f.distances.slice(start,end)){const b=this.fieldButton(parent,metres(d.metres),()=>this.fieldAction(()=>{this.plugin.update(key,d.metres);const more=distance.querySelector('details');if(more)more.open=false;this.detailState.set('거리 더보기',false);}));b.dataset.distanceId=d.id;b.setAttribute('aria-pressed',String(Object.is(i[key],d.metres)&&!(key==='cameraDistance'&&i.focusInfinity)));}};
    addDistances(distance,0,5);if(f.distances.length>5){const more=node(distance,'details');node(more,'summary','거리 더보기');addDistances(more,5,f.distances.length);}
    const actions=this.powerAdjust;actions.replaceChildren();
    for(const [dir,label]of [['weaker','출력 약하게'],['stronger','출력 강하게']] as const){const n=nextPower(i,dir);const b=this.fieldButton(actions,label,()=>this.fieldAction(()=>{if(n!==undefined)this.plugin.update('denominator',n);}));b.disabled=n===undefined;b.dataset.powerDirection=dir;}
    actions.classList.add('pfm-field-power','pfm-field-buttons');if(f.simple&&(i.tab==='flash'||i.tab==='combined')){const action=this.root.querySelector('.pfm-output-action');if(action)action.append(actions);else this.root.querySelector('.pfm-quick')?.prepend(actions);if(review&&this.fieldMessage.startsWith('권장 출력 적용 취소 만료'))action?.append(review);}
    const manage=node(this.fieldExtras,'details',undefined,'pfm-field-manage');node(manage,'summary','즐겨찾기·내 거리 관리');
    node(manage,'p','장비 프리셋은 사양, 촬영 즐겨찾기는 조건 묶음, 존 즐겨찾기는 목표 구간입니다.');
    const label=this.text(manage,'촬영 즐겨찾기 이름','');label.maxLength=100;
    const check=node(manage,'label',undefined,'pfm-check'),include=node(check,'input');include.type='checkbox';node(check,'span','거리도 저장 · 카메라 초점 거리 + 별도 플래시 거리 (온카메라: 연동 거리)');
    this.fieldButton(manage,'현재 촬영 조건 새로 저장',()=>this.fieldAction(()=>{f.shots.push(capture(s,label.value,include.checked));}));
    const editShot=(shot:Shot)=>{const row=node(manage,'div',undefined,'pfm-field-row'),n=this.text(row,'촬영 이름',shot.name);n.maxLength=100;
      this.fieldButton(row,'이름 변경',()=>this.fieldAction(()=>{shot.name=name(n.value);}));
      this.fieldButton(row,`현재 설정으로 갱신 · ${'cameraDistance' in shot.values?'거리 포함':'거리 제외'}`,()=>this.fieldAction(()=>{Object.assign(shot,capture(s,n.value,'cameraDistance' in shot.values,shot.id));applyEquipment(s);}));
      this.fieldButton(row,'촬영 삭제',()=>this.fieldAction(()=>{const index=f.shots.indexOf(shot);this.deletedField={kind:'shots',value:shot,index};f.shots.splice(index,1);}));};f.shots.forEach(editShot);
    const newDistance=this.text(manage,'새 내 거리 (m)','');newDistance.inputMode='decimal';
    this.fieldButton(manage,'거리 추가',()=>this.fieldAction(()=>{f.distances.push({id:id(),metres:validDistance(parseNumber(newDistance.value),f.distances.map(d=>d.metres))});}));
    f.distances.forEach((d,index)=>{const row=node(manage,'div',undefined,'pfm-field-row');const input=this.text(row,'내 거리 편집 (m)',String(d.metres));input.inputMode='decimal';this.fieldButton(row,'거리 수정',()=>this.fieldAction(()=>{d.metres=validDistance(parseNumber(input.value),f.distances.filter(x=>x!==d).map(x=>x.metres));}));for(const [offset,label]of [[-1,'앞으로'],[1,'뒤로']] as const){const b=this.fieldButton(row,label,()=>this.fieldAction(()=>{[f.distances[index],f.distances[index+offset]]=[f.distances[index+offset],d];}));b.disabled=index+offset<0||index+offset>=f.distances.length;}this.fieldButton(row,'거리 삭제',()=>this.fieldAction(()=>{f.distances.splice(index,1);}));});
    const zones=node(h,'div',undefined,'pfm-zone-favorites');node(zones,'strong','존 목표 즐겨찾기 · 목표만 변경');if(!f.zones.length)node(zones,'p','저장된 존 목표 없음 · 「즐겨찾기·거리 관리」에서 현재 목표를 저장하세요.','pfm-field-empty');
    for(const z of f.zones){const b=this.fieldButton(zones,`${z.name} · ${metres(z.near)}~${z.infinity?'∞':metres(z.far)}`,()=>this.fieldAction(()=>{this.closeFieldManager();Object.assign(i,{zoneNear:z.near,zoneFar:z.far,zoneInfinity:z.infinity,zoneFlow:'target'});}));b.dataset.zoneFavorite=z.id;b.setAttribute('aria-pressed',String(i.zoneFlow==='target'&&i.zoneNear===z.near&&i.zoneInfinity===z.infinity&&(z.infinity||i.zoneFar===z.far)));}
    const zoneName=this.text(manage,'존 목표 이름','');zoneName.maxLength=100;
    this.fieldButton(manage,'현재 존 목표 새로 저장',()=>this.fieldAction(()=>{solveZone(i);f.zones.push({id:id(),name:name(zoneName.value),near:i.zoneNear,far:i.zoneFar,infinity:i.zoneInfinity});}));
    for(const z of f.zones){const row=node(manage,'div',undefined,'pfm-field-row'),n=this.text(row,'존 이름',z.name),near=this.text(row,'목표 근거리 (m)',String(z.near)),far=this.text(row,'목표 원거리 (m)',String(z.far)),label=node(row,'label',undefined,'pfm-check'),inf=node(label,'input');inf.type='checkbox';inf.checked=z.infinity;node(label,'span','목표 원거리 무한대');
      this.fieldButton(row,'존 이름·구간 저장',()=>this.fieldAction(()=>{const a=validDistance(parseNumber(near.value)),b=inf.checked?z.far:validDistance(parseNumber(far.value));if(!inf.checked&&b<=a)throw Error('원거리는 근거리보다 커야 합니다.');Object.assign(z,{name:name(n.value),near:a,far:b,infinity:inf.checked});}));
      this.fieldButton(row,'존 삭제',()=>this.fieldAction(()=>{const index=f.zones.indexOf(z);this.deletedField={kind:'zones',value:z,index};f.zones.splice(index,1);}));}
    if(this.deletedField)this.fieldButton(manage,`${this.deletedField.kind==='shots'?'촬영':'존'} 즐겨찾기 삭제 복구`,()=>this.fieldAction(()=>{const d=this.deletedField!;if(d.kind==='shots')f.shots.splice(d.index,0,d.value as Shot);else f.zones.splice(d.index,0,d.value as ZoneFavorite);this.deletedField=undefined;}));
  }
  private fieldLabel(k:string):string{return ({sensor:'센서',width:'센서 가로(mm)',height:'센서 세로(mm)',focal:'실제 초점거리(mm)',aperture:'실제 조리개',iso:'ISO',denominator:'출력',cameraDistance:'카메라 거리',focusInfinity:'초점 무한대',flashDistance:'플래시 거리',linked:'거리 연동',gnMode:'GN 모드',equipmentId:'장비',gn:'GN',gnUnit:'GN 단위',gnZoom:'GN 측정 줌(mm)',zoom:'플래시 줌(mm)',conditions:'측정 조건',loss:'손실(stop)',tolerance:'허용 오차(EV)',minDenominator:'최소 출력',steps:'지원 출력 분모',coc:'CoC(mm)',cocMode:'CoC 기준',coverage:'조사각 기준',horizontal:'수평 조사각(도)',vertical:'수직 조사각(도)',mode:'동조·발광 조건'} as Record<string,string>)[k]??k;}
  private fieldValue(k:string,value:unknown):string {
    if(k==='focusInfinity')return value?'∞':'끔';
    if(typeof value==='number'){if(k==='denominator'||k==='minDenominator')return `1/${value}`;if(k==='cameraDistance'||k==='flashDistance')return metres(value);if(k==='aperture')return `f/${fmt(value)}`;return String(value);}
    if(k==='linked')return value?'온카메라':'오프카메라';
    if(k==='equipmentId')return this.plugin.state.equipment.find(e=>e.id===value)?.name??(value?'참조 장비 없음':'선택 없음');
    if(k==='sensor')return sensors[String(value)]?.name??'사용자 센서';
    const labels:Record<string,Record<string,string>>={gnMode:{manual:'수동 GN',equipment:'장비'},cocMode:{estimate:'센서 대각 기준',custom:'사용자 CoC'},coverage:{approx:'줌 기반 근사',angles:'직접 조사각'},mode:{manual:'직접광·일반 동조',ttl:'TTL',hss:'HSS',bounce:'바운스',modifier:'광질 조절 도구',near:'근거리 대형 광원'}};
    return labels[k]?.[String(value)]??String(value);
  }

  private lastNote?:string;
  private numeric=new Map<NumericKey,{input:HTMLInputElement;range?:HTMLInputElement;sync:()=>void;updateControls:()=>void}>();
  constructor(leaf:WorkspaceLeaf,private plugin:PhotoPlugin){super(leaf);}
  getViewType():string{return VIEW;}
  getDisplayText():string{return '사진 촬영 도우미';}
  getIcon():string{return 'camera';}
  async onOpen():Promise<void>{this.containerEl.dataset.ignoreSwipe='true';this.render();}
  async onClose():Promise<void>{delete this.containerEl.dataset.ignoreSwipe;this.clean();this.contentEl.replaceChildren();await this.plugin.flush().catch(e=>this.plugin.reportSaveError(e));}
  private clean():void {for(const a of this.aborters)a.abort();this.aborters.length=0;this.numeric.clear();this.power=undefined;}
  private listen(el:HTMLElement,event:string,fn:(e:Event)=>void):void {const a=new AbortController();el.addEventListener(event,fn,{signal:a.signal});this.aborters.push(a);}
  private focusHyperfocal():void {
    try{this.plugin.update('cameraDistance',optics(this.plugin.state.inputs).hyperfocal);this.syncNumeric('cameraDistance');this.changed();}catch(e){this.plugin.report(e);}
  }
  private sceneControls():void {
    let dragging:number|null=null,offset=0;
    const update=(x:number)=>{this.plugin.update('cameraDistance',sceneDistance(x,this.plugin.state.inputs.diagramMax,this.plugin.state.inputs.focal));this.syncNumeric('cameraDistance');this.changed();};
    const coordinate=(e:PointerEvent)=>{const r=this.picture.querySelector('svg')?.getBoundingClientRect();return r&&r.width>0?(e.clientX-r.left)/r.width*SCENE.width:null;};
    this.listen(this.contentEl,'pointerdown',event=>{
      if(!(event instanceof PointerEvent)||!(event.target instanceof Element)||!event.target.closest('[data-pfm-subject]'))return;
      const x=coordinate(event);if(x===null)return;
      const i=this.plugin.state.inputs;
      offset=x-(i.focusInfinity?SCENE.end:SCENE.start+(SCENE.end-SCENE.start)*Math.max(0,Math.min(1,(Number.isFinite(i.cameraDistance)?i.cameraDistance:0)/i.diagramMax)));
      dragging=event.pointerId;this.contentEl.setPointerCapture(event.pointerId);event.preventDefault();
    });
    this.listen(this.contentEl,'pointermove',event=>{if(!(event instanceof PointerEvent)||event.pointerId!==dragging)return;const x=coordinate(event);if(x!==null){event.preventDefault();update(x-offset);}});
    for(const kind of ['pointerup','pointercancel'])this.listen(this.contentEl,kind,event=>{if(!(event instanceof PointerEvent)||event.pointerId!==dragging)return;dragging=null;if(this.contentEl.hasPointerCapture(event.pointerId))this.contentEl.releasePointerCapture(event.pointerId);void this.plugin.flush().catch(e=>this.plugin.reportSaveError(e));});
    this.listen(this.contentEl,'click',event=>{if(event.target instanceof Element&&event.target.closest('[data-pfm-hyperfocal]'))this.focusHyperfocal();});
    this.listen(this.contentEl,'keydown',event=>{
      if(!(event instanceof KeyboardEvent)||!(event.target instanceof Element)||!event.target.closest('[data-pfm-subject]'))return;
      const i=this.plugin.state.inputs;let distance:number;
      if(event.key==='ArrowLeft')distance=i.cameraDistance-0.1;
      else if(event.key==='ArrowRight')distance=i.cameraDistance+0.1;
      else return;
      event.preventDefault();this.plugin.update('cameraDistance',Math.max(i.focal/1000+0.001,distance));this.syncNumeric('cameraDistance');this.changed();
      this.picture.querySelector<SVGElement>('[data-pfm-subject]')?.focus();
    });
  }
  private changed():void {
    if(this.plugin.state.inputs.linked){this.plugin.update('flashDistance',this.plugin.state.inputs.cameraDistance);this.syncNumeric('flashDistance');}
    this.paint();void this.plugin.persist().catch(e=>this.plugin.reportSaveError(e));this.plugin.refresh(this);
  }
  private button(parent:HTMLElement,text:string,fn:()=>void):HTMLButtonElement {const b=node(parent,'button',text);b.type='button';this.listen(b,'click',fn);return b;}
  private rangeProgress(range:HTMLInputElement):void {
    const percent=(Number(range.value)-Number(range.min))/(Number(range.max)-Number(range.min))*100;
    range.style.setProperty('--pfm-range-progress',`${percent}%`);
  }
  private number(parent:HTMLElement,label:string,key:NumericKey,options?:{min:number;max:number;step:number}):void {
    const wrap=node(parent,'div',undefined,'pfm-field');wrap.dataset.field=key;const infinite=()=>key==='cameraDistance'&&this.plugin.state.inputs.focusInfinity;const compact:Partial<Record<NumericKey,string>>={cameraDistance:'초점 맞출 거리 (m)',aperture:'실제 조리개 (f/)',focal:'초점거리 (mm)'};const caption=node(wrap,'label',compact[key]??label);
    const entry=node(wrap,'div',undefined,'pfm-number-entry');
    const input=node(wrap,'input');input.type='number';input.inputMode='decimal';input.step='any';input.value=Number.isFinite(this.plugin.state.inputs[key])?String(this.plugin.state.inputs[key]):'';input.dataset.key=key;input.setAttribute('aria-label',label);
    input.id=`pfm-control-${++nextControlId}`;caption.htmlFor=input.id;
    const isDistance=['cameraDistance','flashDistance','zoneNear','zoneFar','diagramMax'].includes(key);
    let scale=1;
    let range:HTMLInputElement|undefined;let infinityButton:HTMLButtonElement|undefined;
    if(options){wrap.classList.add('pfm-range-field');input.min=String(options.min);range=node(wrap,'input');range.type='range';range.min=String(options.min);range.max=String(options.max);range.step=String(options.step);range.value=input.value;this.rangeProgress(range);range.setAttribute('aria-label',`${label} 빠른 조절`);range.dataset.range=key;
      const r=range;this.listen(r,'input',()=>{this.plugin.update(key,Number(r.value));sync();input.setAttribute('aria-invalid','false');this.changed();});
    }
    if(key==='flashDistance')wrap.classList.add('pfm-flash-distance');
    if(key==='denominator')wrap.classList.add('pfm-custom-power');
    const infinityUi=()=>{if(key!=='cameraDistance')return;input.placeholder=infinite()?'∞':'';if(infinite()){input.value='';input.setAttribute('aria-invalid','false');}wrap.dataset.focusInfinity=String(infinite());infinityButton?.setAttribute('aria-pressed',String(infinite()));};
    const sync=()=>{
      const value=this.plugin.state.inputs[key];
      if(isDistance&&Number.isFinite(value)&&value>=0)scale=value<=1?100:1;
      const unit=scale===100?'cm':'m';
      if(isDistance){caption.textContent=(compact[key]??label).replace('(m)',`(${unit})`);input.setAttribute('aria-label',label.replace('(m)',`(${unit})`));input.dataset.displayUnit=unit;if(options)input.min=String(options.min*scale);}
      input.value=infinite()?'':Number.isFinite(value)?String(scale===100?Number((value*scale).toPrecision(15)):value):'';
      infinityUi();
      if(range){range.value=String(value);this.rangeProgress(range);}
    };
    const apply=(value:number)=>{if(input.disabled)return;this.plugin.update(key,value);sync();input.dispatchEvent(new Event('input',{bubbles:true}));};
    const choices:Partial<Record<NumericKey,number[]>>={aperture:[.7,1,1.4,2,2.8,4,5.6,8,11,16,22,32],apertureMin:[1,1.4,2,2.8,4,5.6,8,11,16,22,32],apertureMax:[1,1.4,2,2.8,4,5.6,8,11,16,22,32],iso:[50,100,200,400,800,1600,3200,6400],focal:[14,24,28,35,50,85,135,200],cameraDistance:[.3,.5,1,2,3,5,10],flashDistance:[.3,.5,1,2,3,5,10],zoneNear:[.3,.5,1,2,3,5],zoneFar:[1,2,3,5,10,20],loss:[0,.5,1,2,3],tolerance:[.3,.5,1,2],diagramMax:[1,3,5,10,15,30]};
    const candidate=(direction:number):number|undefined=>{
      const value=this.plugin.state.inputs[key];if(input.disabled||!Number.isFinite(value))return;
      let steps=choices[key];
      if(key==='denominator')try{steps=powerSteps(this.plugin.state.inputs.steps,this.plugin.state.inputs.minDenominator);}catch{return;}
      if(steps&&!isDistance&&key!=='loss'&&key!=='tolerance'){
        const next=direction>0?steps.find(n=>n>value):[...steps].reverse().find(n=>n<value);return next;
      }
      const increment=isDistance?(value<2?.01:value<10?.1:1):key==='coc'?.001:['width','height','loss','tolerance','apertureMin','apertureMax'].includes(key)?.1:1;
      const minimum=key==='loss'?0:['cameraDistance','zoneNear'].includes(key)?this.plugin.state.inputs.focal/1000+.001:isDistance?.01:key==='coc'?.001:increment;
      const result=Math.min(key==='tolerance'?5:Infinity,Math.max(minimum,Number((value+direction*increment).toPrecision(15))));
      if((key==='horizontal'||key==='vertical')&&result>=180)return;
      return (result-value)*direction>0?result:undefined;
    };
    const adjust=(direction:number)=>{if(infinite()){if(direction<0)apply(this.plugin.state.inputs[key]);return;}const value=candidate(direction);if(value!==undefined)apply(value);};
    const minus=this.button(entry,'−',()=>adjust(-1));minus.dataset.step='down';minus.setAttribute('aria-label',`${label} 줄이기`);entry.append(input);
    const plus=this.button(entry,'+',()=>adjust(1));plus.dataset.step='up';plus.setAttribute('aria-label',`${label} 늘리기`);
    let picker:HTMLSelectElement|undefined;
    if(choices[key]){picker=node(wrap,'select',undefined,'pfm-value-picker');picker.dataset.preset=key;picker.setAttribute('aria-label',`${label} 자주 쓰는 값`);const placeholder=node(picker,'option','자주 쓰는 값');placeholder.value='';for(const value of choices[key]){const option=node(picker,'option',isDistance?metres(value):key==='aperture'?`f/${value}`:key==='focal'?`${value} mm`:String(value));option.value=String(value);}const control=picker;this.listen(control,'change',()=>{if(control.value!=='')apply(Number(control.value));control.value='';});}
    const updateControls=()=>{infinityUi();minus.disabled=infinite()?false:candidate(-1)===undefined;plus.disabled=infinite()||candidate(1)===undefined;if(picker)picker.disabled=input.disabled;};
    if(key==='cameraDistance'){const b=node(wrap,'button','∞','pfm-infinity-toggle');b.type='button';b.dataset.focusInfinity='true';b.setAttribute('aria-label','무한대 초점');infinityButton=b;this.listen(b,'click',()=>{this.plugin.setFocusInfinity(!this.plugin.state.inputs.focusInfinity);sync();this.changed();b.focus({preventScroll:true});});}
    this.numeric.set(key,{input,range,sync,updateControls});sync();
    this.listen(input,'input',()=>{const v=parseNumber(input.value)/scale;this.plugin.update(key,v);if(key==='denominator')this.syncPower();if(range&&Number.isFinite(v)){range.value=String(v);this.rangeProgress(range);}input.setAttribute('aria-invalid',String(!Number.isFinite(v)||v<0||(v===0&&key!=='loss')));this.changed();});
    // Keep the unit fixed while typing; normalize only after editing to avoid a 100× jump.
    if(isDistance)this.listen(input,'blur',sync);
  }
  private select<K extends keyof Inputs>(parent:HTMLElement,label:string,key:K,values:Record<string,string>,after?:()=>void):HTMLSelectElement {
    const l=node(parent,'label',undefined,'pfm-field');l.dataset.field=key;node(l,'span',label);const s=node(l,'select');s.setAttribute('aria-label',label);s.dataset.key=key;
    for(const [v,t] of Object.entries(values)){const o=node(s,'option',t);o.value=v;}s.value=String(this.plugin.state.inputs[key]);
    this.listen(s,'change',()=>{this.plugin.update(key,s.value as Inputs[K]);after?.();this.changed();});return s;
  }
  private text(parent:HTMLElement,label:string,value:string):HTMLInputElement {const l=node(parent,'label',undefined,'pfm-field');node(l,'span',label);const t=node(l,'input');t.type='text';t.value=value;return t;}
  private jumpSettings(target:string):void {if(field(this.plugin.state).simple){field(this.plugin.state).simple=false;this.root.dataset.simple='false';void this.plugin.persist().catch(e=>this.plugin.reportSaveError(e));}const section=this.root.querySelector<HTMLDetailsElement>(`[data-pfm-settings=${target}]`);if(section){section.open=true;section.scrollIntoView({block:'start'});section.querySelector<HTMLElement>('summary')?.focus({preventScroll:true});}}
  private returnToResults():void {
    this.root.querySelector<HTMLElement>('.pfm-tabs [aria-pressed=true]')?.focus({preventScroll:true});this.contentEl.scrollTop=0;
  }
  private details(label:string,id?:string):HTMLElement {const d=node(this.root,'details');if(id)d.dataset.pfmSettings=id;node(d,'summary',label);const body=node(d,'div',undefined,'pfm-settings');if(id){const b=this.button(body,'결과로 돌아가기',()=>this.returnToResults());b.dataset.resultsReturn='true';}return body;}
  private async saveResult(scope:Inputs['tab']|'all'):Promise<void> {
    this.lastNote=await this.plugin.saveNote(scope);
    const open=this.root.querySelector<HTMLButtonElement>('[data-open-note]');if(open){open.hidden=false;open.textContent='저장한 노트 열기';}
  }
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
  updateSaveStatus():void {if(this.fieldStorage){this.fieldStorage.hidden=!this.plugin.saveError;const p=this.fieldStorage.querySelector('p');if(p)p.textContent=this.plugin.saveError;}if(this.saveStatus){this.saveStatus.textContent=this.plugin.saveError;this.saveStatus.hidden=!this.plugin.saveError;}}
  private flushOnEnd():void {for(const event of ['change','focusout'])this.listen(this.contentEl,event,()=>{void this.plugin.flush().catch(e=>this.plugin.reportSaveError(e));});}
  private syncPower():void {
    if(!this.power)return;
    this.power.replaceChildren();const i=this.plugin.state.inputs;
    let steps:number[]=[];try{steps=flash({...i,denominator:1}).steps;}catch{try{steps=powerSteps(i.steps,i.minDenominator);}catch{/* Invalid steps reported in results. */}}
    for(const n of steps){const o=node(this.power,'option',`1/${n}`);o.value=String(n);}
    const value=i.denominator;
    if(Number.isFinite(value)&&!steps.includes(value)){const option=node(this.power,'option',`이론값·장비 미지원 출력 1/${value}`);option.value=String(value);option.dataset.custom='true';}
    this.power.value=Number.isFinite(value)?String(value):'';
  }
  private syncNumeric(key:NumericKey):void {this.numeric.get(key)?.sync();if(key==='denominator')this.syncPower();}
  render():void {
    this.rememberDetails();this.clean();this.contentEl.replaceChildren();this.contentEl.addClass('pfm-container');
    this.root=node(this.contentEl,'div',undefined,'pfm-root');const i=this.plugin.state.inputs;
    const header=node(this.root,'header');node(header,'h1','사진 촬영 도우미');node(header,'p','조리개 하나로, 빛과 심도를 함께.');
    const tabs=node(this.root,'nav',undefined,'pfm-tabs');tabs.setAttribute('aria-label','계산 화면');
    for(const [v,t]of Object.entries({flash:'플래시',dof:'심도·화각',combined:'통합',zone:'존 포커싱'})) {const b=this.button(tabs,t,()=>{this.plugin.update('tab',v as Inputs['tab']);this.changed();for(const btn of tabs.querySelectorAll('button'))btn.setAttribute('aria-pressed',String(btn===b));if(this.results.getBoundingClientRect().top<this.contentEl.getBoundingClientRect().top)this.contentEl.scrollTop=0;});b.dataset.tab=v;b.setAttribute('aria-pressed',String(i.tab===v));}
    this.fieldPanel();
    this.context=node(this.root,'p',undefined,'pfm-context');
    this.results=node(this.root,'section',undefined,'pfm-results');this.results.setAttribute('aria-live','polite');
    this.results.after(this.fieldHost);
    this.picture=node(this.results,'figure',undefined,'pfm-diagram');this.sceneControls();this.flushOnEnd();
    const quick=node(this.root,'section',undefined,'pfm-quick');node(quick,'h2','빠른 조절');this.powerAdjust=node(quick,'div',undefined,'pfm-field-power');
    const shortcuts=node(quick,'nav',undefined,'pfm-settings-shortcuts');shortcuts.setAttribute('aria-label','상세 설정 바로가기');
    for(const [target,text]of [['camera','카메라 설정'],['flash','플래시 설정'],['equipment','내 장비']]as const){const b=this.button(shortcuts,text,()=>{this.jumpSettings(target);});b.dataset.settingsJump=target;}
    this.number(quick,'카메라 → 피사체 거리 (m)','cameraDistance',{min:0.1,max:30,step:0.1});
    this.number(quick,'조리개 f-number','aperture',{min:0.7,max:32,step:0.1});
    const power=this.select(quick,'출력 선택','denominator',{},()=>{this.plugin.update('denominator',Number(power.value));this.syncNumeric('denominator');});
    this.power=power;this.syncPower();
    // Custom n is always available even if it is not one of the quick stages.
    this.number(quick,'사용자 출력 1/n · n','denominator');
    const linked=node(quick,'label',undefined,'pfm-check');const check=node(linked,'input');check.type='checkbox';check.checked=i.linked;node(linked,'span','온카메라: 같은 위치·방향, 거리 연동');
    this.listen(check,'change',()=>{this.plugin.update('linked',check.checked);this.numeric.get('flashDistance')!.input.disabled=check.checked;this.changed();});
    this.number(quick,'플래시 → 피사체 거리 (m)','flashDistance',{min:0.1,max:30,step:0.1});this.numeric.get('flashDistance')!.input.disabled=i.linked;const flashRange=this.numeric.get('flashDistance')!.range;if(flashRange)flashRange.disabled=i.linked;
    // Keep the slider disabled state in sync with the explicit distance toggle.
    this.listen(check,'change',()=>{const r=this.numeric.get('flashDistance')?.range;if(r)r.disabled=check.checked;});
    this.equivalent=node(quick,'div',undefined,'pfm-equivalence');
    this.zonePanel();const zone=this.root.querySelector('.pfm-zone-panel');if(zone)this.fieldHost.before(zone);
    this.resultDetails=node(this.root,'section',undefined,'pfm-result-details');
    const camera=this.details('카메라·렌즈·CoC','camera');
    node(camera,'p','센서는 프리셋으로 간단히 선택하세요. 치수를 직접 수정하면 사용자 센서로 전환됩니다.');
    this.select(quick,'센서 프리셋','sensor',{...Object.fromEntries(Object.entries(sensors).map(([k,v])=>[k,v.name])),custom:'사용자 지정'},()=>{const preset=sensors[this.plugin.state.inputs.sensor];if(preset){this.plugin.update('width',preset.width);this.plugin.update('height',preset.height);this.syncNumeric('width');this.syncNumeric('height');}});
    this.select(camera,'풀프레임 환산 기준','cropBasis',{nominal:'프리셋 명목 계수 (사용자 센서는 실치수)',dimensions:'센서 실치수 대각 비율'});
    this.number(camera,'센서 가로 (mm)','width');this.number(camera,'센서 세로 (mm)','height');
    for(const key of ['width','height'] as const)this.listen(this.numeric.get(key)!.input,'input',()=>{this.plugin.update('sensor','custom');const s=this.root.querySelector<HTMLSelectElement>('select[data-key=sensor]');if(s)s.value='custom';this.changed();});
    this.number(quick,'ISO','iso');
    this.number(quick,'실제 초점거리 (mm)','focal',{min:8,max:200,step:1});
    // Match reading/focus order to the visible priority without rebuilding fields while typing.
    for(const selector of ['[data-field=cameraDistance]','[data-field=aperture]','label[data-field=denominator]:not(.pfm-custom-power)','[data-field=iso]','[data-field=focal]','[data-field=sensor]','.pfm-check','.pfm-flash-distance','.pfm-custom-power']){const field=quick.querySelector(selector);if(field)quick.append(field);}
    this.select(camera,'CoC 방식','cocMode',{estimate:'센서 대각 ÷1500 추정',custom:'사용자 지정 mm'});this.number(camera,'사용자 CoC (mm)','coc');
    node(camera,'p','CoC는 감상 크기·시력·확대율에 따른 허용 착란원입니다. 대각/1500은 경험적 기본값이며 픽셀 단위 선명도를 보장하지 않습니다. APS-C 크기는 제조사마다 다릅니다.');
    const fl=this.details('플래시·GN 조건·조사각','flash');
    node(fl,'h3','발광 조건');
    this.select(fl,'발광 조건','mode',{manual:'수동 · 직접광 · 일반 동조',ttl:'TTL (계산 미지원)',hss:'HSS (계산 미지원)',bounce:'바운스 (계산 미지원)',modifier:'소프트박스 (계산 미지원)',near:'근거리 대형 광원 (계산 미지원)'});
    this.select(fl,'GN 입력 모드','gnMode',{manual:'수동 GN',equipment:'선택 장비 표'},()=>{applyEquipment(this.plugin.state);this.syncNumeric('gn');this.syncNumeric('gnZoom');});
    this.number(fl,'선택 플래시 줌 (mm)','zoom');
    node(fl,'h3','가이드 넘버 기준');
    this.number(fl,'ISO100 · 최대 출력 GN','gn');
    this.gnDisplayUnit=i.gnUnit;
    this.select(fl,'GN 단위','gnUnit',{m:'m 기준',ft:'ft 기준'},()=>{const unit=this.plugin.state.inputs.gnUnit;const value=this.plugin.state.inputs.gn;if(unit!==this.gnDisplayUnit){Object.assign(this.plugin.state.inputs,{gn:unit==='ft'?metresToFeet(value):feetToMetres(value)});this.syncNumeric('gn');this.gnDisplayUnit=unit;}});
    this.number(fl,'GN이 측정된 줌 (mm)','gnZoom');
    const cond=this.text(fl,'GN 측정 조건·출처 (ISO100 최대 출력)',i.conditions);cond.dataset.key='conditions';this.listen(cond,'input',()=>{this.plugin.update('conditions',cond.value);this.changed();});
    this.number(fl,'추가 광량 손실 L (stop, 기본 0)','loss');
    node(fl,'p','GN에 이미 포함된 손실을 중복 적용하지 마세요. 손실 보정은 추정입니다. 줌 변경 시 해당 줌의 GN 자료가 필요합니다.');
    const powerSettings=node(fl,'details',undefined,'pfm-power-settings');node(powerSettings,'summary','출력 단계 직접 설정');const powerFields=node(powerSettings,'div',undefined,'pfm-settings');
    const customPower=quick.querySelector('.pfm-custom-power');if(customPower)powerFields.append(customPower);
    this.number(powerFields,'장비 최소 출력 1/n · n','minDenominator');
    const steps=this.text(powerFields,'장비 지원 출력 분모 (쉼표 구분)',i.steps);steps.dataset.key='steps';this.listen(steps,'input',()=>{this.plugin.update('steps',steps.value);this.changed();});
    node(fl,'h3','조사 범위');
    this.select(fl,'조사각 입력 방식','coverage',{approx:'풀프레임 커버리지 가정 (근사)',angles:'수평·수직 조사각 직접 입력'});
    this.number(fl,'수평 조사각 (°)','horizontal');this.number(fl,'수직 조사각 (°)','vertical');
    node(fl,'p','줌 mm 근사 모드는 36×24mm 직선투영 화각을 가정합니다. 제조사 기준 포맷을 확인한 실측 조사각이 있으면 직접 입력하세요.');
    this.equipmentPanel();
    const advanced=this.details('허용 범위·그림 범위·계산 근거','advanced');
    this.number(advanced,'적정 노출 허용 범위 ±EV','tolerance');this.number(advanced,'그림 최대 거리 (m)','diagramMax');
    const hyper=this.button(advanced,'과초점거리에 초점 맞추기',()=>this.focusHyperfocal());hyper.className='pfm-wide';
    node(advanced,'p','유효 GN=G√p√(ISO/100)×2^(−L/2), 적정 거리=GN/f-number. 필요 출력=(Nr/G)²(100/ISO)2^L. 노출 차이=2log₂(d/r). 양수=예상 과다, 음수=예상 부족. 빛이 이 거리에서 끝나는 것은 아닙니다.');
    node(advanced,'p','H=f²/(N·CoC)+f, h=H−f. 근거리=hs/(h+s−f), 원거리=hs/(h−s+f). s≥H이면 ∞. 광학은 mm, 출력은 m. 직선투영 화각=2atan(센서 길이/2f). 조사 범위=2r·tan(각/2).');
    node(advanced,'p','초점 맞출 거리는 박막렌즈 주평면 기준이며 센서면 기준 거리와 다릅니다. 화각·프레임은 무한대 초점의 직선투영 근사로 근접 촬영 배율 변화는 미반영합니다.');
    node(advanced,'p',limitations);
    const about=this.details('플러그인 정보·원본 저작권');node(about,'p',`사진 촬영 도우미 ${this.plugin.manifest.version} · depth-of-field의 심도·화각 시각화를 모바일 Obsidian용으로 수정·재구현하고 수동 플래시 계산을 확장했습니다. 원작자의 공식 또는 후원 플러그인이 아닙니다.`);
    const a=node(about,'a','원본: Jack Herrington · depth-of-field');a.href='https://github.com/jherr/depth-of-field';
    node(about,'p','Copyright (c) 2026 Jack Herrington · MIT. 참고 SHA c75dd6d40e4a96e96fd38e57657fe4b9737bf776. MIT 전문: main.js 내 고지 및 배포 ZIP의 vendor/depth-of-field-LICENSE.txt. 재사용 내역: GitHub의 THIRD_PARTY_NOTICES.md.');
    for(const section of this.root.querySelectorAll('[data-pfm-settings] > .pfm-settings')){const back=section.querySelector('[data-results-return]');if(back)section.append(back);}
    this.fieldExtras=node(this.root,'section',undefined,'pfm-field-extras');
    const footer=node(this.root,'footer');this.saveStatus=node(footer,'p',undefined,'pfm-error');this.saveStatus.setAttribute('role','status');this.updateSaveStatus();const retry=this.button(footer,'설정 다시 저장',()=>{void this.plugin.persist().then(()=>this.plugin.flush()).catch(e=>this.plugin.reportSaveError(e));});retry.className='pfm-retry';const tabSave=this.button(footer,'현재 탭 결과 저장',()=>{tabSave.disabled=true;void this.saveResult(this.plugin.state.inputs.tab).catch(e=>this.plugin.report(e)).finally(()=>{tabSave.disabled=false;});});
    tabSave.className='pfm-tab-save';
    const save=this.button(footer,'전체 계산을 노트로 저장',()=>{save.disabled=true;void this.saveResult('all').catch(e=>this.plugin.report(e)).finally(()=>{save.disabled=false;});});save.className='pfm-save';
    const openNote=this.button(footer,'저장한 노트 열기',()=>{if(this.lastNote)void this.app.workspace.openLinkText(this.lastNote,'',true).catch(e=>this.plugin.report(e));});openNote.dataset.openNote='true';openNote.hidden=!this.lastNote;
    const notes=node(footer,'details',undefined,'pfm-footer-notes');node(notes,'summary','표시·저장 안내');node(notes,'p','1m 이하 거리는 cm로 표시합니다. 거리 입력은 입력칸의 단위를 따르며 편집을 마치면 단위가 자동 전환됩니다. 표시 숫자만 반올림하며 포함·출력 경계·노출 판정은 반올림 전 값입니다. 같은 표시 숫자라도 판정이 다를 수 있습니다.');
    node(notes,'p','현재 탭: 심도·화각 또는 플래시 결과만 저장 · 통합/전체: 모든 계산 조건 필요 · 일반 Markdown · 새 노트 생성 · 오프라인');
    const version=node(this.root,'p',`v${this.plugin.manifest.version}`,'pfm-version');version.setAttribute('aria-label',`플러그인 버전 ${this.plugin.manifest.version}`);this.paint(false);
  }
  private zonePanel():void {
    const section=node(this.root,'section',undefined,'pfm-zone-panel');node(section,'h2','존 포커싱');
    this.select(section,'존 포커싱 흐름','zoneFlow',{current:'지금 설정으로 어디까지 선명한가?',target:'어디부터 어디까지 담고 싶은가?'});
    const target=node(section,'div',undefined,'pfm-zone-target');
    this.number(target,'목표 가장 가까운 거리 (m)','zoneNear');
    this.number(target,'목표 가장 먼 거리 (m)','zoneFar');
    const wrap=node(target,'label',undefined,'pfm-check');const infinity=node(wrap,'input');infinity.type='checkbox';infinity.checked=this.plugin.state.inputs.zoneInfinity;infinity.dataset.key='zoneInfinity';node(wrap,'span','목표 원거리 무한대');
    this.listen(infinity,'change',()=>{this.plugin.update('zoneInfinity',infinity.checked);this.changed();});
    const limits=node(target,'details',undefined,'pfm-zone-limits');limits.dataset.zoneLimits='true';node(limits,'summary','렌즈 조리개 한계·사용 가능 단계');const lens=node(limits,'div');
    this.number(lens,'렌즈 최대 개방 f값 (하한)','apertureMin');this.number(lens,'렌즈 최소 개방 f값 (상한)','apertureMax');
    const steps=this.text(lens,'실제 사용 가능한 조리개 단계 (쉼표 구분)',this.plugin.state.inputs.apertureSteps);steps.dataset.key='apertureSteps';this.listen(steps,'input',()=>{this.plugin.update('apertureSteps',steps.value);this.changed();});
    this.zoneResult=node(section,'div',undefined,'pfm-zone-result');this.zoneResult.setAttribute('aria-live','polite');target.after(this.zoneResult);this.zoneResult.after(limits);
    const coc=this.button(lens,'CoC 설정으로 이동',()=>this.jumpSettings('camera'));coc.dataset.zoneCoc='true';
    node(section,'p','초점 맞출 거리(m)는 렌즈의 실제 초점거리(mm)와 다릅니다. CoC 기준의 허용 범위이며 절대적인 선명·흐림 경계가 아닙니다. 이 도구는 촬영 참고용 계산이며 카메라·렌즈를 제어하지 않습니다.');
  }
  private paintEquivalence():void {
    const i=this.plugin.state.inputs;this.equivalent.replaceChildren();
    try{const e=equivalence(i);node(this.equivalent,'p',`실제 ${fmt(i.focal)}mm f/${fmt(i.aperture)} → 풀프레임 화각 ${fmt(e.focal,2)}mm / 심도 약 f/${fmt(e.aperture,2)}`);
      node(this.equivalent,'p',`노출·플래시 계산은 실제 조리개 f/${fmt(i.aperture)} 사용`);
      const detailText=`실제 센서 ${fmt(i.width)}×${fmt(i.height)}mm · 실치수 대각 계수 ${fmt(e.dimensional,4)}×. 화각·실제 심도는 이 치수로 계산합니다. ${e.differentAspect?'화면비가 다르므로 대각 기준 환산입니다. ':''}실제 조리개와 노출은 f/${fmt(i.aperture)}이며 ISO·플래시 출력은 바뀌지 않습니다.`;
      if(i.cocMode==='custom')node(this.equivalent,'p','사용자 지정 CoC · 심도 대응값은 정확한 일치가 아닙니다.','pfm-equivalence-caveat');
      const details=node(this.equivalent,'details');node(details,'summary','심도 대응 조건·화각');node(details,'small',`${sensors[i.sensor]?.name??'사용자 센서'} · ${e.basis} ${fmt(e.crop,3)}×. ${detailText}`);
      node(details,'p','같은 촬영 위치·구도와 비교 가능한 감상 조건에서의 근사입니다. 근접 촬영·포커스 브리딩·서로 다른 화면비에서는 완전 일치를 보장하지 않습니다.');
      node(details,'p',i.cocMode==='custom'?'사용자 지정 CoC: 비교 감상 조건이 달라 기본 심도 환산을 정확한 일치로 볼 수 없습니다.':'기본 CoC는 센서 대각/1500. 비교할 풀프레임 CoC도 같은 감상 기준으로 대응해야 합니다. 명목 계수와 실치수 계수 차이가 있어 정확한 심도 일치를 뜻하지 않습니다.');
      const o=optics(i);node(details,'p',`실제 화각 수평 ${fmt(o.horizontal,1)}° · 수직 ${fmt(o.vertical,1)}° · 대각 ${fmt(o.diagonal,1)}°`);
    }catch(e){node(this.equivalent,'p',e instanceof Error?e.message:String(e),'pfm-error');}
  }
  private showZoneLimits():void {
    const limits=this.root.querySelector<HTMLDetailsElement>('[data-zone-limits]');if(!limits)return;
    limits.open=true;
    if(field(this.plugin.state).simple){field(this.plugin.state).simple=false;this.changed();this.render();}
    const current=this.root.querySelector<HTMLDetailsElement>('[data-zone-limits]');if(!current)return;
    current.open=true;const target=current.querySelector<HTMLElement>('[data-field=apertureMax]')??current;target.scrollIntoView({block:'center'});target.tabIndex=-1;target.setAttribute('role','group');target.setAttribute('aria-label','렌즈 조리개 상한 확인');target.focus({preventScroll:true});
  }
  private paintZone():void {
    const i=this.plugin.state.inputs;this.root.dataset.zoneFlow=i.zoneFlow;
    const far=this.numeric.get('zoneFar');if(far)far.input.disabled=i.zoneInfinity;
    this.zoneResult.replaceChildren();
    try{
      const current=optics(i);if(i.zoneFlow==='current'){node(this.zoneResult,'p',`${i.focusInfinity?'∞':metres(i.cameraDistance)}에 초점을 맞추면 약 ${metres(current.near)} ~ ${metres(current.far)} 범위가 허용 선명도 안에 들어옵니다.`);
      node(this.zoneResult,'p',`전체 심도 ${metres(current.total)} · 과초점거리 ${metres(current.hyperfocal)}`);}
      if(i.zoneFlow==='target'){
        const r=solveZone(i);const included=includesTarget(current,r.target);node(this.zoneResult,'strong',!r.possible?'달성 불가 · 렌즈 조리개 제한':included?'목표 구간 포함':'일부 부족 · 제안 설정을 적용하세요','pfm-zone-status').dataset.state=!r.possible?'fail':included?'ok':'warn';
        node(this.zoneResult,'p',`목표 ${metres(r.target.near)} ~ ${metres(r.target.far)} · 이론 필요 f/${fmt(r.required,3)}`);
        node(this.zoneResult,'p',`${r.possible?'제안':'렌즈 한계에서 대안'}: 초점 맞출 거리 ${metres(r.cameraDistance)} · 실제 조리개 f/${fmt(r.aperture)} → ${metres(r.actual.near)} ~ ${metres(r.actual.far)}`);
        if(r.possible){node(this.zoneResult,'p',`적용 전 확인: 초점 맞출 거리 ${i.focusInfinity?'∞':metres(i.cameraDistance)} → ${metres(r.cameraDistance)} · 실제 조리개 f/${fmt(i.aperture)} → f/${fmt(r.aperture)}`);const b=node(this.zoneResult,'button','역산 결과를 현재 설정에 적용');b.type='button';b.dataset.zoneApply='true';b.onclick=()=>{const scrollTop=this.contentEl.scrollTop;this.plugin.update('cameraDistance',r.cameraDistance);this.plugin.update('aperture',r.aperture);this.syncNumeric('cameraDistance');this.syncNumeric('aperture');this.changed();this.contentEl.scrollTop=scrollTop;this.root.querySelector<HTMLElement>('[data-zone-apply]')?.focus({preventScroll:true});};}
        else {const edit=node(this.zoneResult,'button','렌즈 조리개 한계 확인');edit.type='button';edit.dataset.zoneLimitsJump='true';edit.onclick=()=>this.showZoneLimits();node(this.zoneResult,'p','지원하는 조리개 단계로 목표 전체를 포함할 수 없습니다. 목표 근거리를 더 멀리 하거나 원거리를 줄이거나 실제 렌즈 초점거리(mm)를 짧게 해 다시 계산하세요. 위 대안은 전체 포함을 보장하지 않습니다.','pfm-error');}
      }
    }catch(e){node(this.zoneResult,'p',e instanceof Error?e.message:String(e),'pfm-error');}
  }
  private equipmentPanel():void {
    const p=this.details('내 장비 프리셋 · 줌별 GN 표','equipment');
    node(p,'p','Q20III 공식 사양을 불러오거나, 설명서/실측의 ISO100·최대 출력 GN과 지원 출력을 직접 입력하세요.');
    const state=this.plugin.state;
    this.button(p,'FlashQ Q20III 추가·선택',()=>{addQ20iii(state);this.changed();this.render();void this.plugin.flush().then(()=>new Notice('Q20III 선택 · 고정 32mm 커버리지 · 제조사 공칭 GN20m')).catch(e=>this.plugin.reportSaveError(e));});
    node(p,'p','Q20III: ISO100 GN20m · 1/1~1/64의 7단계. 32mm는 플래시의 고정 커버리지이며 렌즈 초점거리와 별개입니다. 디퓨저·젤·바운스 손실은 포함하지 않습니다.');
    const list=node(p,'select');list.setAttribute('aria-label','저장된 장비');const placeholder=node(list,'option','장비 선택');placeholder.value='';
    for(const e of state.equipment){const o=node(list,'option',e.name);o.value=e.id;}list.value=state.inputs.equipmentId;
    const apply=()=>{if(!list.value){new Notice('장비를 선택하세요.');return;}selectEquipment(state,list.value);this.changed();this.render();};
    this.listen(list,'change',apply);this.button(p,'선택 장비의 현재 줌 GN 적용',apply);
    this.button(p,'선택 장비 편집',()=>{const e=state.equipment.find(e=>e.id===list.value);if(!e)return;if(state.draft&&(state.draft.name||state.draft.table)&&state.draft.id!==e.id){new Notice('작성 중인 프리셋을 먼저 저장하거나 편집 취소하세요.');return;}
      state.draft={id:e.id,name:e.name,conditions:e.conditions,source:e.source,unit:'m',table:Object.entries(e.table).map(([z,g])=>`${z},${g}`).join('\n'),minDenominator:String(e.minDenominator),steps:e.steps};this.changed();this.render();});
    this.button(p,'선택 장비 삭제',()=>{const index=state.equipment.findIndex(e=>e.id===list.value);if(index<0)return;state.deletedEquipment={equipment:state.equipment[index],index};state.equipment.splice(index,1);applyEquipment(state);this.changed();this.render();new Notice('장비 삭제됨 · 삭제 되돌리기로 복구할 수 있습니다.');});
    if(state.deletedEquipment)this.button(p,'삭제 되돌리기',()=>{const deleted=state.deletedEquipment!;if(!state.equipment.some(e=>e.id===deleted.equipment.id))state.equipment.splice(deleted.index,0,deleted.equipment);delete state.deletedEquipment;applyEquipment(state);this.changed();this.render();});
    const draft=state.draft??{...emptyDraft(),unit:state.inputs.gnUnit,minDenominator:String(state.inputs.minDenominator),steps:state.inputs.steps};
    node(p,'p',draft.id?'기존 장비 편집 중 · 저장 시 같은 ID 유지':'새 장비 작성 · 작성 중 내용 자동 보존');
    const saveDraft=()=>{state.draft=draft;void this.plugin.persist().catch(e=>this.plugin.reportSaveError(e));};
    for(const [key,label]of [['name',draft.id?'장비 이름':'새 장비 이름'],['conditions','측정 조건 (ISO100·최대 출력·직접광 등)'],['source','출처 URL·설명서 페이지 또는 실측 방법'],['minDenominator','프리셋 최소 출력 분모'],['steps','프리셋 지원 출력 분모']] as const){const t=this.text(p,label,draft[key]);this.listen(t,'input',()=>{draft[key]=t.value;saveDraft();});}
    const unit=node(p,'select');unit.setAttribute('aria-label','프리셋 GN 단위');for(const u of ['m','ft']as const){const o=node(unit,'option',u);o.value=u;}unit.value=draft.unit;this.listen(unit,'change',()=>{draft.unit=unit.value==='ft'?'ft':'m';saveDraft();});
    const l=node(p,'label',undefined,'pfm-field');node(l,'span','줌mm,GN · 한 줄에 한 측정값');const table=node(l,'textarea');table.placeholder='줌mm,GN';table.rows=5;table.value=draft.table;this.listen(table,'input',()=>{draft.table=table.value;saveDraft();});
    this.button(p,draft.id?'장비 변경 저장':'새 장비 프리셋 저장',()=>{try{
      const e:Equipment={id:draft.id||equipmentId(state.equipment),name:draft.name.trim(),conditions:draft.conditions.trim(),source:draft.source.trim(),table:parseTable(draft.table,draft.unit),minDenominator:parseNumber(draft.minDenominator),steps:draft.steps};
      if(!equipmentValid(e))throw Error('이름·측정 조건·출처·유효한 GN 표와 지원 출력이 필요합니다.');
      const index=state.equipment.findIndex(v=>v.id===e.id);if(index<0)state.equipment.push(e);else state.equipment[index]=e;
      delete state.draft;applyEquipment(state);this.changed();void this.plugin.flush().then(()=>new Notice('장비 저장 완료')).catch(e=>this.plugin.reportSaveError(e));this.render();
    }catch(e){this.plugin.report(e);}});
    this.button(p,'편집 취소 · 초안 비우기',()=>{delete state.draft;this.changed();this.render();});
  }
  private paint(remember=true):void {
    if(remember)this.rememberDetails();
    const inputs=this.plugin.state.inputs;this.root.dataset.cocMode=inputs.cocMode;this.root.dataset.coverage=inputs.coverage;
    for(const key of ['coc','horizontal','vertical']as const){const pair=this.numeric.get(key);if(pair)pair.input.disabled=key==='coc'?inputs.cocMode==='estimate':inputs.coverage==='approx';}
    const i=this.plugin.state.inputs;const selected=selectedEquipment(this.plugin.state);const compactFlash=field(this.plugin.state).simple&&(i.tab==='flash'||i.tab==='combined');this.context.textContent=compactFlash?`실제 ${fmt(i.focal)}mm · f/${fmt(i.aperture)} · ISO ${fmt(i.iso,0)} / ${i.gnMode==='equipment'?(selected?.name??'장비 미선택'):'수동 GN'} · ${i.linked?'온카메라':'오프카메라'}${i.mode==='manual'?'':' · GN 모델 미지원'}`:`${sensors[i.sensor]?.name.split(' (')[0]??'사용자 센서'} · 실제 ${fmt(i.focal)}mm · f/${fmt(i.aperture)}${i.tab==='zone'?'':` · ISO ${fmt(i.iso,0)}`}${i.tab==='flash'||i.tab==='combined'?` / ${i.gnMode==='equipment'?(selected?.name??'장비 미선택'):'수동 GN'} · ${i.linked?'온카메라':'오프카메라'} · ${i.mode==='manual'?'직접광·일반 동조':'GN 모델 미지원'}`:''}`;const tabSave=this.root.querySelector<HTMLButtonElement>('.pfm-tab-save');if(tabSave)tabSave.textContent=`${{flash:'플래시',dof:'심도·화각',combined:'통합',zone:'존 포커싱'}[i.tab]} 결과 저장`;if(this.outputUndo&&this.outputUndo.applied!==i.denominator){this.outputUndo=undefined;this.fieldMessage='권장 출력 적용 취소 만료 · 이후 출력 변경을 보존합니다.';}this.syncPower();for(const key of ['gn','gnZoom','minDenominator'] as const)if(document.activeElement!==this.numeric.get(key)?.input)this.syncNumeric(key);const mode=this.root.querySelector<HTMLSelectElement>('select[data-key=gnMode]');if(mode)mode.value=i.gnMode;this.gnDisplayUnit=i.gnUnit;const unit=this.root.querySelector<HTMLSelectElement>('select[data-key=gnUnit]');if(unit)unit.value=i.gnUnit;for(const key of ['conditions','steps']as const){const field=this.root.querySelector<HTMLInputElement>(`input[data-key=${key}]`);if(field&&document.activeElement!==field)field.value=i[key];}this.results.replaceChildren();this.resultDetails.replaceChildren();this.root.dataset.tab=i.tab;this.root.dataset.linked=String(i.linked);
    const flashPanel=node(this.results,'div',undefined,'pfm-flash-results');const equipment=selectedEquipment(this.plugin.state);
    if(i.gnMode==='equipment')node(flashPanel,'small',equipment?`${equipment.name} · 사용 가능 줌 ${Object.keys(equipment.table).join(', ')}mm`:'선택 장비 없음 · 장비를 선택하거나 수동 GN으로 전환하세요.');
    try {const f=flash(i);if(!f.supported)node(flashPanel,'p',f.powerLabel,'pfm-warning');node(flashPanel,'p','적정 노출 예상 거리','pfm-eyebrow');const hero=node(flashPanel,'div',undefined,'pfm-hero');const display=distanceParts(f.d);node(hero,'span',display.value,'pfm-value');hero.append(document.createTextNode(' '));node(hero,'span',display.unit,'pfm-unit');
      node(flashPanel,'p',field(this.plugin.state).simple?`출력 1/${i.denominator} · GN ${fmt(f.g)}m (${fmt(i.zoom)}mm·ISO100 최대)`:`1/${i.denominator} · f/${fmt(i.aperture)} · ISO ${fmt(i.iso,0)} · GN ${fmt(f.g)}m (${fmt(i.zoom)}mm·ISO100 최대)`);
      if(i.conditions.includes('연습용 가상 GN'))node(flashPanel,'small','연습용 GN · 실제 장비 사양 아님','pfm-model-note');
      const label=f.ev>i.tolerance?'예상 과다 노출':f.ev< -i.tolerance?'예상 부족 노출':'허용 범위 내';
      node(flashPanel,'p',`${metres(f.r)}에서 ${f.ev>0?'+':''}${fmt(f.ev)} EV · ${label}`,'pfm-ev').dataset.state=f.ev>i.tolerance?'over':f.ev< -i.tolerance?'under':'ok';
      const action=node(flashPanel,'div',undefined,'pfm-output-action');
      node(action,'p',`권장 지원 출력 1/${f.nearest} · 적용 후 남는 오차 ${f.residual>0?'+':''}${fmt(f.residual)} EV${f.status==='장비 출력 범위 안'?'':` · ${f.status}`}`);
      const apply=node(action,'button',i.denominator===f.nearest?'권장 출력과 같음':`권장 출력 1/${f.nearest} 적용`);apply.type='button';apply.dataset.flashApply='true';apply.disabled=i.denominator===f.nearest;apply.onclick=()=>{this.outputUndo={before:i.denominator,applied:f.nearest};if(this.fieldMessage.startsWith('권장 출력 적용 취소 만료'))this.fieldMessage='';this.plugin.update('denominator',f.nearest);this.syncNumeric('denominator');this.changed();this.root.querySelector<HTMLElement>('[data-flash-undo]')?.focus({preventScroll:true});};
      if(this.outputUndo){const before=this.outputUndo.before;const undo=node(action,'button',`권장 출력 적용 취소 · 1/${before}로`);undo.type='button';undo.dataset.flashUndo='true';undo.onclick=()=>{this.outputUndo=undefined;this.plugin.update('denominator',before);this.syncNumeric('denominator');this.changed();this.root.querySelector<HTMLElement>('[data-flash-apply]')?.focus({preventScroll:true});};}
      const d=node(this.resultDetails,'details',undefined,'pfm-flash-details');node(d,'summary','필요 출력·조리개·거리별 표');node(d,'p',`${f.powerLabel} · ${i.gnMode==='equipment'?'장비 표':'수동 GN'}`);node(d,'p',i.conditions);node(d,'p',`±${fmt(i.tolerance)}EV: ${metres(f.low)} ~ ${metres(f.high)}. 가까우면 과다 노출될 수 있습니다.`);
      node(d,'p',`필요 조리개 f/${fmt(f.requiredAperture)} · 필요 출력 ${fmt(f.needed*100)}% · ${f.status}`);

      this.table(d,['출력','예상 거리'],f.distances.map(x=>[`1/${x.n}`,metres(x.d)]));
      this.table(d,['플래시 거리','노출 차이'],[0.5,0.70710678,1,1.41421356,2].map(v=>[metres(f.d*v),`${fmt(exposureEV(f.d,f.d*v))} EV · ${v<1?'과다':v>1?'부족':'기준 적정'}`]));
    }catch(e){node(flashPanel,'p','적정 노출 예상 거리','pfm-eyebrow');node(flashPanel,'div','—','pfm-hero');node(flashPanel,'p',i.gnMode==='equipment'&&!equipment?'선택 장비를 찾을 수 없습니다. 내 장비에서 복구하거나 장비를 다시 선택하세요.':i.gnMode==='equipment'&&i.gn<=0?(equipment?.table[String(i.zoom)]===undefined?`${fmt(i.zoom)}mm 줌의 GN 자료가 없습니다. 이 장비의 사용 가능 줌: ${Object.keys(equipment?.table??{}).join(', ')}mm. 플래시 줌 또는 장비 GN 표를 확인하세요.`:i.conditions):!Number.isFinite(i.gn)||i.gn<=0?'수동 GN이 비었거나 0 이하입니다. ISO100 최대 출력 GN을 입력하세요.':e instanceof Error?e.message:String(e),'pfm-error');const disabled=node(flashPanel,'button','권장 출력 적용 불가');disabled.type='button';disabled.disabled=true;disabled.dataset.flashApply='true';disabled.className='pfm-error-action';const fix=node(flashPanel,'button',i.gnMode==='equipment'&&i.gn<=0?(equipment?'장비 줌·GN 확인':'장비 선택 확인'):'플래시 조건 확인');fix.type='button';fix.className='pfm-error-action';fix.onclick=()=>this.jumpSettings(i.gnMode==='equipment'&&!equipment?'equipment':'flash');}
    if(i.tab==='flash')this.results.append(this.picture);else this.results.prepend(this.picture);
    const dof=node(this.results,'div',undefined,'pfm-dof-results');
    try {const o=optics(i);node(dof,'h2','심도·화각');
      const grid=node(dof,'div',undefined,'pfm-stat-grid');
      for(const [key,label,value]of [['near','근거리',o.near],['far','원거리',o.far],['total','전체 심도',o.total],['hyperfocal','과초점',o.hyperfocal]] as const){const card=node(grid,'div',undefined,'pfm-stat');card.dataset.stat=key;node(card,'span',label);node(card,'strong',metres(value));}
      const bar=node(dof,'div',undefined,'pfm-dof-bar');node(bar,'span',o.total<0.1524?'접사·제품 참고':o.total<0.6096?'인물 참고':o.total<3.048?'그룹·행사 참고':o.total<9.144?'거리·건축 참고':'풍경 참고','pfm-dof-badge');const focus=node(bar,'button','과초점 맞추기');focus.type='button';focus.dataset.pfmHyperfocal='true';
      const od=node(this.resultDetails,'details',undefined,'pfm-dof-details');node(od,'summary','전체 심도·과초점·화각·회절');node(od,'p',`근거리 ${metres(o.near)} · 원거리 ${metres(o.far)} · 전체 ${metres(o.total)} · 과초점 ${metres(o.hyperfocal)}`);
      node(od,'p',`화각 수평 ${fmt(o.horizontal,1)}° / 수직 ${fmt(o.vertical,1)}° / 대각 ${fmt(o.diagonal,1)}°`);
      node(od,'p',`실제 ${fmt(i.focal)}mm → 실치수 대각 기준 환산 ${fmt(o.equivalent,1)}mm · CoC ${fmt(o.c,5)}mm`);
      node(od,'p',`회절 근사: 파장 550nm, Airy 지름 ${fmt(o.airy,5)}mm (${fmt(o.airy/o.c)}×CoC). ${o.airy>o.c?'CoC보다 커질 수 있음.':'CoC 이하.'} 절대 선명도 판정이 아닙니다.`);
    }catch(e){node(dof,'p',e instanceof Error?e.message:String(e),'pfm-error');}
    try {const c=coverage(i);const p=node(this.resultDetails,'details',undefined,'pfm-coverage-results');node(p,'summary','프레임·조사 범위 비교');
      node(p,'p',`프레임 ${metres(c.camera.width)} × ${metres(c.camera.height)} · 조사 범위 ${metres(c.flash.width)} × ${metres(c.flash.height)}`);
      node(p,'p',i.linked?(c.narrow?'주의: 프레임 가장자리 광량 부족 가능성. 실제 배광은 균일하지 않습니다.':'동일 위치·방향 가정. 실제 배광은 균일하지 않습니다.'):'오프카메라: 각각의 거리 평면 범위입니다. 위치·방향을 입력하지 않아 공간 중첩을 계산하지 않습니다.');
    }catch(e){node(this.resultDetails,'p',`프레임·조사 범위 비교: ${e instanceof Error?e.message:String(e)}`,'pfm-error pfm-coverage-results');}
    if(i.loss>0)node(this.resultDetails,'p','추가 손실을 적용한 추정. GN에 포함된 손실의 중복 보정에 주의하세요.');
    this.paintEquivalence();this.paintZone();this.paintField();
    for(const pair of this.numeric.values())pair.updateControls();
    this.restoreDetails();diagram(this.picture,i);if(field(this.plugin.state).simple){this.root.querySelector('.pfm-quick')?.after(this.picture);if(i.tab==='zone'){const panel=this.zoneResult.closest('.pfm-zone-panel');if(panel){this.results.before(panel);if(this.distanceButtons)panel.after(this.distanceButtons);}}}
  }
  private table(parent:HTMLElement,headers:string[],rows:string[][]):void {const t=node(parent,'table');const h=node(node(t,'thead'),'tr');headers.forEach(x=>node(h,'th',x));const body=node(t,'tbody');for(const row of rows){const tr=node(body,'tr');row.forEach(x=>node(tr,'td',x));}}
}
