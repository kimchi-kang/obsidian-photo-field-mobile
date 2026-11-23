import {nextPower,canUndo,undo,patch,Patch} from './field';
import {ItemView,WorkspaceLeaf,Notice} from 'obsidian';
import type PhotoPlugin from './main';
import {restore} from './storage';
import {Inputs,sensors,Equipment,emptyDraft,FILL_RATIOS,FULL_STOP_APERTURES} from './model';
import {circleOfConfusion,flash,optics,powerSteps} from './engine';
import {diffractionRisk,EXPOSURE_SCENES,exposurePairs,FACE_DEPTH,FRAMINGS,framingDistance,STRIDE,strides} from './field-guide';
import {fmt,metres,distanceParts,parseNumber,parseSeconds,formatSeconds,feetToMetres,metresToFeet,stepDistance} from './units';
import {diagram,SCENE,sceneDistance,sceneUpperLimit} from './diagram';
import {equipmentValid,parseTable,selectedEquipment,applyEquipment,equipmentId,selectEquipment,addQ20iii} from './presets';
import {infinityFocus,ringLabel} from './zone';
import {focusScale,FOCUS_SCALE_FINITE_END,FOCUS_SCALE_STEPS,FOCUS_SCALE_TICKS} from './scale';
import {calibrateGN,fillFlash,nominalGN,safeRangeText,safeShootingRange,GNMeasurement} from './flash-tools';
import {RECIPROCITY_FILMS,correctedTime,formatExposureSeconds,formatExposureMinutes,isReciprocityFilmId,validMeteredSeconds,validReciprocityExponent} from './reciprocity';
import {cameraShutters,deletePreset,effectiveMinFocus,eiStops,filmTypes,isoOutsideCamera,lensFocusMarks,presetKinds,presetLabels,savePreset,selectedPreset,selectPreset,syncLimit,undoPresetDeletion} from './shooting-presets';
import type {FilmPreset,PresetKind} from './shooting-presets';
export const VIEW='photo-field-mobile';
const FILM_SPEEDS=[12,25,50,100,200,400,800,1600,3200,6400];
type NumericKey = {[K in keyof Inputs]: Inputs[K] extends number ? K : never}[keyof Inputs];
type FocusLimits = ReturnType<typeof optics>;
const EI_MIN=6,EI_MAX=25600;
let nextControlId=0;
function node<K extends keyof HTMLElementTagNameMap>(parent:HTMLElement,tag:K,text?:string,cls?:string):HTMLElementTagNameMap[K] {
  const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;
}
function shutterLabel(denominator:number):string {
  if(denominator===0)return 'B';
  if(denominator>1&&Number.isInteger(denominator))return `1/${denominator}초`;
  return `${Number((1/denominator).toPrecision(12))}초`;
}
function filmInfo(film:FilmPreset,ei:number):string {
  const stops=eiStops(ei,film.iso);
  const delta=Number.isFinite(stops)&&stops!==0?` · ${stops>0?'+':''}${fmt(stops)} 증감`:'';
  return `${film.name} · ${filmTypes[film.type]} · 박스 ISO ${fmt(film.iso)} · EI ${Number.isFinite(ei)?ei:'—'}${delta}`;
}
export class PhotoView extends ItemView {
  private results!:HTMLElement;private picture!:HTMLElement;private root!:HTMLElement;
  private sceneMax=5;
  private dragMax?:number;
  private retry?:HTMLButtonElement;
  private powerButtons:Partial<Record<'weaker'|'stronger',HTMLButtonElement>>={};
  private linkToggle?:HTMLButtonElement;
  private readonly aborters:AbortController[]=[];
  private ringTableOpen=false;
  private gnDisplayUnit:'m'|'ft'='m';private power?:HTMLSelectElement;private saveStatus?:HTMLElement;
  private gearList!:HTMLElement;
  private gearOpen?:PresetKind;
  private paintGear!:()=>void;
  private detailState=new Map<string,boolean>();
  private outputUndo?:{before:number;applied:number};
  private calibrationUndo?:Patch;
  private calibrationMessage='';
  private calibrationDraft:Partial<Record<keyof GNMeasurement,string>>={};
  private paintCalibration!:()=>void;
  private paintFill!:()=>void;
  private paintGuides:(()=>void)[]=[];
  private bulbTimeout?:number;
  private bulbRemaining?:number;
  private paintBulbTimer?:()=>void;
  private bulbFlash?:Animation;
  private gearBar():void {
    const bar=node(this.root,'section',undefined,'pfm-gear-bar');
    bar.setAttribute('aria-label','촬영 장비');
    const chips=node(bar,'div',undefined,'pfm-gear-chips');
    const controls=presetKinds.map(kind=>{
      const chip=this.button(chips,'',()=>{
        this.gearOpen=this.gearOpen===kind?undefined:kind;
        this.paintGear();
        this.paintGearList();
      });
      chip.className='pfm-gear-chip';
      chip.dataset.presetChip=kind;
      const label=node(chip,'span',presetLabels[kind],'pfm-gear-label');
      return {kind,chip,label,value:node(chip,'strong'),tag:node(chip,'small',undefined,'pfm-gear-tag')};
    });
    this.gearList=node(bar,'div',undefined,'pfm-gear-picker');
    this.gearList.id=`pfm-presets-${++nextControlId}`;
    for(const {chip} of controls)chip.setAttribute('aria-controls',this.gearList.id);
    this.paintGear=()=>{
      const s=this.plugin.state;
      const lens=selectedPreset(s,'lenses'),camera=selectedPreset(s,'cameras'),film=selectedPreset(s,'films');
      const filmName=film?.name.replace(/^Kodak /,'');
      const values={
        cameras:camera?.id==='nikon-fm2n'&&camera.name==='Nikon FM2N (신형, 1984~)'?'FM2N':camera?.name??'선택 안 함',
        lenses:lens?.id==='nikkor-50-14-ais'&&lens.name==='Nikkor 50mm f/1.4 AI-S'
          ?`${fmt(lens.focal)}mm f/${fmt(lens.apertureMin)}`:lens?.name??`${fmt(s.inputs.focal)}mm`,
        films:film?filmName??film.name:'선택 안 함',
      };
      const accessible={cameras:camera?.name,lenses:lens?.name,films:film?filmInfo(film,s.inputs.iso):undefined};
      // 좁은 폰에서도 EI가 잘리지 않도록 필름 칩은 위 작은 라벨에 EI를 둔다.
      const ei=Number.isFinite(s.inputs.iso)?fmt(s.inputs.iso,0):'—';
      for(const {kind,chip,label,value,tag} of controls){
        label.textContent=kind==='films'?`${presetLabels[kind]} · EI ${ei}`:presetLabels[kind];
        value.textContent=values[kind];
        // 렌즈를 안 골랐으면 초점거리만 크게, '저장값'은 아래 작은 태그로 내려 잘리지 않게 한다.
        tag.textContent=kind==='films'&&film?filmTypes[film.type]:kind==='lenses'&&!lens?'저장값':'';
        tag.hidden=!tag.textContent;
        chip.setAttribute('aria-expanded',String(this.gearOpen===kind));
        const description=accessible[kind]??values[kind];
        chip.setAttribute('aria-label',`${presetLabels[kind]} · ${description}`);
        chip.title=description;
      }
      const info=this.root.querySelector<HTMLElement>('.pfm-film-info');
      if(info){
        const text=film?filmInfo(film,s.inputs.iso):'';
        if(info.textContent!==text)info.textContent=text;
        info.hidden=!film;
      }
      const warning=this.root.querySelector<HTMLElement>('.pfm-iso-warning');
      if(warning){
        const text=camera&&isoOutsideCamera(s.inputs.iso,camera)?`ISO ${fmt(s.inputs.iso)} · 카메라 범위 ${camera.isoMin}–${camera.isoMax} 밖`:'';
        if(warning.textContent!==text)warning.textContent=text;
        warning.hidden=!text;
      }
    };
    bar.onkeydown=event=>{
      if(event.key!=='Escape'||!this.gearOpen)return;
      const kind=this.gearOpen;
      this.gearOpen=undefined;
      this.paintGear();this.paintGearList();
      controls.find(control=>control.kind===kind)?.chip.focus({preventScroll:true});
    };
    this.paintGearList();
  }
  /** 필름 피커 맨 위의 EI 한 스톱 증감. 증감 현상 테스트나 필름 없이 감도만 바꿀 때 쓴다. */
  private eiStepper(parent:HTMLElement):void {
    const i=this.plugin.state.inputs;
    const row=node(parent,'div',undefined,'pfm-ei-stepper');
    row.setAttribute('role','group');row.setAttribute('aria-label','사용 감도 EI');
    const film=selectedPreset(this.plugin.state,'films');
    const current=node(row,'output');
    const paint=()=>{
      const delta=film&&Number.isFinite(i.iso)?eiStops(i.iso,film.iso):0;
      const push=Math.abs(delta)<0.05?'':` · ${delta>0?'+':'−'}${fmt(Math.abs(delta),1)}스톱`;
      current.textContent=`EI ${Number.isFinite(i.iso)?fmt(i.iso,0):'—'}${push}`;
      down.disabled=!(i.iso/2>=EI_MIN);up.disabled=!(i.iso*2<=EI_MAX);
    };
    const step=(factor:number)=>{
      const next=Math.round(i.iso*factor);
      if(!Number.isFinite(next)||next<EI_MIN||next>EI_MAX)return;
      this.plugin.update('iso',next);this.syncNumeric('iso');this.changed();paint();
    };
    const down=this.button(row,'−1',()=>step(0.5));down.setAttribute('aria-label','EI 한 스톱 낮추기');down.dataset.eiStep='down';
    row.append(current);
    const up=this.button(row,'+1',()=>step(2));up.setAttribute('aria-label','EI 한 스톱 올리기');up.dataset.eiStep='up';
    paint();
  }
  private paintGearList():void {
    const kind=this.gearOpen,list=this.gearList;
    list.replaceChildren();
    list.hidden=!kind;
    if(!kind)return;
    const state=this.plugin.state;
    const selected=selectedPreset(state,kind)?.id??'';
    if(kind==='films')this.eiStepper(list);
    const group=node(list,'div');
    group.setAttribute('role','radiogroup');group.setAttribute('aria-label',`${presetLabels[kind]} 프리셋 선택`);
    const items=[{id:'',name:'선택 안 함'},...state[kind]];
    for(const preset of items){
      const label=node(group,'label',undefined,'pfm-gear-option');
      const radio=node(label,'input');radio.type='radio';radio.name=list.id;radio.checked=preset.id===selected;
      node(label,'span',preset.name);
      radio.onclick=()=>{
        selectPreset(state,kind,preset.id);
        this.gearOpen=undefined;
        this.changed();this.render();
        this.root.querySelector<HTMLElement>(`[data-preset-chip=${kind}]`)?.focus({preventScroll:true});
      };
    }
    const manage=node(list,'button','관리…');manage.type='button';
    manage.onclick=()=>{
      this.gearOpen=undefined;
      this.paintGear();this.paintGearList();
      this.jumpSettings('presets');
      const category=this.root.querySelector<HTMLDetailsElement>(`[data-preset-manager=${kind}]`);
      if(category){
        category.open=true;category.scrollIntoView({block:'start'});
        category.querySelector('summary')?.focus({preventScroll:true});
      }
    };
  }
  private presetManager():void {
    const parent=this.details('카메라·렌즈·필름 프리셋','presets'),state=this.plugin.state;
    const i=state.inputs;
    for(const kind of presetKinds){
      const section=node(parent,'details');
      section.dataset.presetManager=kind;
      node(section,'summary',presetLabels[kind]);
      const body=node(section,'div',undefined,'pfm-preset-manager');
      if(kind==='cameras'){
        this.select(body,'CoC 방식','cocMode',{film:'필름 관례 (35mm 기준 0.03mm)',estimate:'프레임 대각 ÷1500',custom:'사용자 지정 mm'});
        this.number(body,'사용자 CoC (mm)','coc');
      }
      if(kind==='films'){
        node(body,'p',undefined,'pfm-film-info');
        node(body,'p',undefined,'pfm-iso-warning').setAttribute('role','status');
        this.number(body,'사용 감도 (ISO/EI)','iso');
      }
      const list=node(body,'select');list.setAttribute('aria-label',`저장된 ${presetLabels[kind]} 프리셋`);
      node(list,'option','새 프리셋').value='';
      for(const preset of state[kind])node(list,'option',preset.name).value=preset.id;
      list.value=selectedPreset(state,kind)?.id??'';
      const editor=node(body,'form',undefined,'pfm-preset-form');
      const edit=()=>{
        editor.replaceChildren();
        const existing=state[kind].find(p=>p.id===list.value);
        const title=this.text(editor,'이름',existing?.name??'');title.maxLength=100;
        const memo=this.text(editor,'메모',existing?.memo??'');
        const description=(label:string,values:Record<string,string>,value:string)=>{
          const field=node(editor,'label',undefined,'pfm-field');node(field,'span',label);
          const select=node(field,'select');
          for(const [key,text] of Object.entries(values))node(select,'option',text).value=key;
          select.value=value;
          return select;
        };
        const numeric=(label:string,value?:number)=>{
          const input=this.text(editor,label,value===undefined?'':String(value));
          input.inputMode='decimal';
          return ()=>parseNumber(input.value);
        };
        let fields:()=>object;
        if(kind==='cameras'){
          const camera=existing&&'shutters' in existing?existing:undefined;
          const sensor=description('포맷',Object.fromEntries(Object.entries(sensors).map(([key,value])=>[key,value.name])),camera?.sensor??'ff');
          const shutters=this.text(editor,'셔터 속도 (초, 쉼표 구분)',camera?.shutters.map(formatSeconds).join(',')??'');
          shutters.placeholder='1,1/2,1/125';
          const label=node(editor,'label',undefined,'pfm-check');
          const bulb=node(label,'input');bulb.type='checkbox';bulb.checked=camera?.bulb??false;node(label,'span','B 셔터 지원');
          const sync=this.text(editor,'최대 플래시 동조 (초)',camera?formatSeconds(camera.syncSeconds):'');
          sync.placeholder='1/250';
          const isoMin=numeric('ISO 최소',camera?.isoMin),isoMax=numeric('ISO 최대',camera?.isoMax);
          fields=()=>({sensor:sensor.value,shutters:shutters.value.split(',').map(parseSeconds),bulb:bulb.checked,syncSeconds:parseSeconds(sync.value),isoMin:isoMin(),isoMax:isoMax()});
        }else if(kind==='lenses'){
          const lens=existing&&'mfd' in existing?existing:undefined;
          const focal=numeric('초점거리 (mm)',lens?.focal),apertureMin=numeric('최대 개방 f값',lens?.apertureMin),apertureMax=numeric('최소 조리개 f값',lens?.apertureMax);
          const steps=this.text(editor,'조리개 단계 (쉼표 구분)',lens?.apertureSteps.join(',')??'');
          const mfd=numeric('최단 초점거리 (m, 필름면 기준)',lens?.mfd);
          const marks=this.text(editor,'거리링 눈금 (m, 쉼표 구분, ∞ 제외)',lens?.focusMarks?.join(',')??'');
          marks.placeholder='0.45,0.5,0.7,1,1.5,2,3,5,10';
          fields=()=>({focal:focal(),apertureMin:apertureMin(),apertureMax:apertureMax(),apertureSteps:steps.value.split(',').map(parseNumber),mfd:mfd(),
            ...(marks.value.trim()?{focusMarks:marks.value.split(',').map(parseNumber)}:{})});
        }else{
          const film=existing&&'iso' in existing?existing:undefined;
          const iso=numeric('박스 ISO',film?.iso);
          const type=description('필름 종류',filmTypes,film?.type??'negative');
          const reciprocity=description('상반칙 필름 연결',{'':'연결 안 함',...Object.fromEntries(Object.entries(RECIPROCITY_FILMS).map(([key,value])=>[key,value.name]))},film?.reciprocityFilm??'');
          fields=()=>({iso:iso(),type:type.value,reciprocityFilm:reciprocity.value||undefined});
        }
        const error=node(editor,'p','','pfm-error');error.setAttribute('role','alert');error.hidden=true;
        const submit=node(editor,'button',existing?'변경 저장':'프리셋 추가');submit.type='submit';
        editor.onsubmit=event=>{
          event.preventDefault();
          const presetId=existing?.id??crypto.randomUUID();
          try{savePreset(state,kind,{id:presetId,name:title.value.trim(),memo:memo.value.trim(),...fields()});}
          catch(e){error.hidden=false;error.textContent=e instanceof Error?e.message:String(e);return;}
          this.changed();this.render();
          const select=this.root.querySelector<HTMLSelectElement>(`[data-preset-manager=${kind}] select`);
          if(select){select.value=presetId;select.dispatchEvent(new Event('change'));}
          select?.focus({preventScroll:true});
        };
        if(existing){
          const remove=this.button(editor,'삭제',()=>{
            deletePreset(state,kind,existing.id);this.changed();this.render();
            this.root.querySelector<HTMLElement>('[data-preset-undo]')?.focus({preventScroll:true});
          });
          remove.setAttribute('aria-label',`${existing.name} 삭제`);
        }
      };
      list.onchange=edit;edit();
    }
    if(state.deletedPreset){
      const deleted=state.deletedPreset;
      const undo=this.button(parent,`${deleted.preset.name} 삭제 되돌리기`,()=>{
        undoPresetDeletion(state);this.changed();this.render();
        this.root.querySelector<HTMLElement>(`[data-preset-manager=${deleted.kind}] summary`)?.focus({preventScroll:true});
      });
      undo.dataset.presetUndo='true';
    }
  }
  private numeric=new Map<NumericKey,{input:HTMLInputElement;range?:HTMLInputElement;sync:()=>void;updateControls:(limits?:FocusLimits)=>void}>();
  constructor(leaf:WorkspaceLeaf,private plugin:PhotoPlugin){super(leaf);}
  getViewType():string{return VIEW;}
  getDisplayText():string{return '사진 촬영 도우미';}
  getIcon():string{return 'camera';}
  async onOpen():Promise<void>{this.containerEl.dataset.ignoreSwipe='true';this.render();}
  async onClose():Promise<void>{delete this.containerEl.dataset.ignoreSwipe;this.dispose();this.contentEl.replaceChildren();await this.plugin.flush().catch(e=>this.plugin.reportSaveError(e));}
  dispose():void {this.stopBulbTimer();this.clean();}
  private clean():void {for(const a of this.aborters)a.abort();this.aborters.length=0;this.numeric.clear();this.power=undefined;this.powerButtons={};this.linkToggle=undefined;this.dragMax=undefined;this.paintBulbTimer=undefined;}
  private listen(el:HTMLElement,event:string,fn:(e:Event)=>void):void {const a=new AbortController();el.addEventListener(event,fn,{signal:a.signal});this.aborters.push(a);}
  private minimumFocus():number {
    const s=this.plugin.state;
    return effectiveMinFocus(s.inputs,selectedPreset(s,'lenses'));
  }
  private focusHyperfocal():void {
    try{
      const s=this.plugin.state,{hyperfocal}=optics(s.inputs);
      this.plugin.update('cameraDistance',selectedPreset(s,'lenses')?Math.max(this.minimumFocus(),hyperfocal):hyperfocal);
      this.syncNumeric('cameraDistance');this.changed();
    }catch(e){this.plugin.report(e);}
  }
  private sceneControls():void {
    // 끌 수 있는 것은 초점 거리 하나: 기본 화면은 피사체, 존 포커싱 "구간 옮기기"는 선명 구간 띠.
    let dragging:{pointer:number;offset:number}|undefined;
    const coordinate=(e:PointerEvent)=>{
      const rect=this.picture.querySelector('svg')?.getBoundingClientRect();
      return rect&&rect.width>0?(e.clientX-rect.left)/rect.width*SCENE.width:null;
    };
    const grabbable=(e:Event)=>{
      if(!(e.target instanceof Element))return false;
      if(e.target.closest('[data-pfm-subject]'))return true;
      // 구간 옮기기에서는 그림 어디를 짚어도 선명 구간을 잡는다.
      const i=this.plugin.state.inputs;
      return i.zoneOn&&i.zoneGoal==='range'&&!!this.picture.querySelector('svg')?.contains(e.target);
    };
    const update=(distance:number)=>{
      const minimum=this.minimumFocus(),maximum=this.dragMax??this.sceneMax;
      if(!Number.isFinite(distance)||minimum>maximum)return;
      this.plugin.update('cameraDistance',Math.max(minimum,Math.min(maximum,distance)));
      this.syncNumeric('cameraDistance');this.numeric.get('cameraDistance')?.input.setAttribute('aria-invalid','false');this.changed();
    };
    this.listen(this.picture,'pointerdown',event=>{
      if(!(event instanceof PointerEvent)||dragging||!grabbable(event))return;
      const x=coordinate(event);if(x===null)return;
      const i=this.plugin.state.inputs;
      const fraction=i.focusInfinity?1:Number.isFinite(i.cameraDistance)?Math.max(0,Math.min(1,i.cameraDistance/this.sceneMax)):0;
      const anchor=SCENE.start+(SCENE.end-SCENE.start)*fraction;
      this.dragMax=this.sceneMax;
      // 짚은 자리와 초점 위치의 차이를 유지해, 띠가 손가락을 따라 그대로 움직이게 한다.
      dragging={pointer:event.pointerId,offset:x-anchor};
      this.picture.setPointerCapture(event.pointerId);
    });
    this.listen(this.picture,'pointermove',event=>{
      if(!(event instanceof PointerEvent)||event.pointerId!==dragging?.pointer)return;
      const x=coordinate(event);if(x===null)return;
      event.preventDefault();
      update(sceneDistance(x-dragging.offset,this.dragMax??this.sceneMax,this.plugin.state.inputs.focal,this.minimumFocus()));
    });
    for(const kind of ['pointerup','pointercancel','lostpointercapture'])this.listen(this.picture,kind,event=>{
      if(!(event instanceof PointerEvent)||event.pointerId!==dragging?.pointer)return;
      dragging=undefined;this.dragMax=undefined;
      if(this.picture.hasPointerCapture(event.pointerId))this.picture.releasePointerCapture(event.pointerId);
      this.paint();void this.plugin.flush().catch(e=>this.plugin.reportSaveError(e));
    });
    this.listen(this.picture,'keydown',event=>{
      if(!(event instanceof KeyboardEvent)||!['ArrowLeft','ArrowRight'].includes(event.key))return;
      if(!(event.target instanceof Element)||!event.target.closest('[data-pfm-subject]'))return;
      event.preventDefault();
      const next=stepDistance(this.plugin.state.inputs.cameraDistance,event.key==='ArrowLeft'?-1:1,this.minimumFocus());
      if(next===undefined)return;
      update(next);
      this.picture.querySelector<SVGElement>('[data-pfm-subject]')?.focus({preventScroll:true});
    });
  }
  private changed():void {
    // 온카메라 연동 중에는 플래시 거리를 카메라 거리와 같게 유지해, 오프카메라로 바꿀 때 오래된 값이 남지 않게 한다.
    const i=this.plugin.state.inputs;
    if(i.linked&&Number.isFinite(i.cameraDistance)&&!i.focusInfinity&&i.flashDistance!==i.cameraDistance){this.plugin.update('flashDistance',i.cameraDistance);this.syncNumeric('flashDistance');}
    this.paint();void this.plugin.persist().catch(e=>this.plugin.reportSaveError(e));this.plugin.refresh(this);
  }
  private button(parent:HTMLElement,text:string,fn:()=>void):HTMLButtonElement {const b=node(parent,'button',text);b.type='button';this.listen(b,'click',fn);return b;}
  private rangeProgress(range:HTMLInputElement):void {
    const span=Number(range.max)-Number(range.min);
    const percent=span>0?(Number(range.value)-Number(range.min))/span*100:0;
    range.style.setProperty('--pfm-range-progress',`${percent}%`);range.style.setProperty('--pfm-range-fraction',String(percent/100));
  }
  private apertureStops():number[] {
    const lens=selectedPreset(this.plugin.state,'lenses');
    if(lens)return lens.apertureSteps;
    const {apertureSteps,apertureMin,apertureMax}=this.plugin.state.inputs;
    const stops=[...new Set(apertureSteps.split(',').map(Number))].filter(n=>n>0&&Number.isFinite(n)&&n>=apertureMin&&n<=apertureMax).sort((a,b)=>a-b);
    return stops.length?stops:FULL_STOP_APERTURES.split(',').map(Number);
  }
  private number(parent:HTMLElement,label:string,key:NumericKey,options?:{min:number;max:number;step:number}):void {
    const isFocus=key==='cameraDistance';
    const hasFocusMinimum=isFocus||key==='zoneNear';
    const apertureStops=()=>this.apertureStops();
    const wrap=node(parent,'div',undefined,'pfm-field');wrap.dataset.field=key;const infinite=()=>isFocus&&this.plugin.state.inputs.focusInfinity;const compact:Partial<Record<NumericKey,string>>={cameraDistance:'초점 맞출 거리 (m)',aperture:'실제 조리개 (f/)'};const caption=node(wrap,'label',compact[key]??label);
    const entry=node(wrap,'div',undefined,'pfm-number-entry');
    const input=node(wrap,'input');input.type='number';input.inputMode='decimal';input.step='any';input.value=Number.isFinite(this.plugin.state.inputs[key])?String(this.plugin.state.inputs[key]):'';input.dataset.key=key;input.setAttribute('aria-label',label);
    input.id=`pfm-control-${++nextControlId}`;caption.htmlFor=input.id;
    const isDistance=['cameraDistance','flashDistance','zoneNear','zoneFar'].includes(key);
    let scale=1,minimum=options?.min??0.1;
    let range:HTMLInputElement|undefined;let infinityButton:HTMLButtonElement|undefined;
    const ruler=isFocus?node(wrap,'div',undefined,'pfm-focus-ruler'):undefined;
    const ticks=ruler?node(ruler,'div',undefined,'pfm-focus-ticks'):undefined;
    ticks?.setAttribute('aria-hidden','true');
    const depth=ruler?node(ruler,'div',undefined,'pfm-focus-depth'):undefined;
    depth?.setAttribute('role','img');
    let axis:ReturnType<typeof focusScale>;
    let lastScaleKey='';
    // 조리개 슬라이더는 눈금 번호를 사용하고 초점 슬라이더는 로그 축의 정수 위치를 사용한다.
    const currentStops=()=>key==='aperture'?apertureStops():undefined;
    let stops=currentStops();
    const toRange=(v:number):string=>{
      if(isFocus) {
        const fraction=infinite()?1:axis?.position(v)??0;
        return String(Math.round(fraction*FOCUS_SCALE_STEPS));
      }
      const values=stops;
      if(!values)return String(v);
      if(!Number.isFinite(v)||v<=0)return '0';
      let best=0;
      values.forEach((stop,n)=>{if(Math.abs(Math.log(v/stop))<Math.abs(Math.log(v/values[best])))best=n;});
      return String(best);
    };
    const rangeText=(v:number):string=>key==='aperture'?`f/${fmt(stops?stops[Number(toRange(v))]:v)}`:fmt(v);
    const updateFocusScale=()=>{
      if(!ruler||!ticks||!range)return;
      const {focal}=this.plugin.state.inputs;
      const floor=this.minimumFocus();
      const marks=lensFocusMarks(selectedPreset(this.plugin.state,'lenses'));
      const cacheKey=`${floor};${marks?.join(',')??''}`;
      if(cacheKey===lastScaleKey)return;
      lastScaleKey=cacheKey;
      axis=focusScale(focal,floor);
      if(Number.isFinite(focal)&&focal>0)minimum=floor;
      input.min=String(minimum*scale);
      range.disabled=!axis;
      ruler.hidden=!axis;
      ticks.replaceChildren();
      if(!axis)return;
      // 렌즈를 고르면 그 렌즈의 거리링 눈금을 그대로 보여 준다. 너무 붙는 눈금은 숫자 없이 선만 둔다.
      // 1·2·3·5·10 m처럼 중요한 눈금부터 숫자를 붙이고, 숫자끼리 너무 붙으면 선만 둔다. 숫자는 위·아래 두 줄에 번갈아 놓는다.
      const all=(marks?[...marks,Infinity]:[...FOCUS_SCALE_TICKS]).filter(d=>d>=axis!.minimum);
      const priority=[Infinity,all[0],1,2,3,5,10,.5,1.5,.7];
      const order=[...all].sort((a,b)=>{const pa=priority.indexOf(a),pb=priority.indexOf(b);return (pa<0?99:pa)-(pb<0?99:pb);});
      const labelled=new Set<number>();
      for(const d of order)if([...labelled].every(o=>Math.abs(axis!.position(o)-axis!.position(d))>=.05))labelled.add(d);
      let row=0;
      for(const distance of all){
        const position=axis.position(distance),label=labelled.has(distance);
        const text=distance===Infinity?'∞':distance<1?String(distance).replace(/^0/,''):String(distance);
        const tick=node(ticks,'span',label?text:'');
        tick.className=label?(row?'pfm-tick-b':'pfm-tick-a'):'pfm-tick-minor';
        if(label)row=1-row;
        tick.style.left=`${position*100}%`;
      }
    };
    const syncRange=(value:number)=>{
      if(!range)return;
      range.value=toRange(value);this.rangeProgress(range);
      if(isFocus)range.setAttribute('aria-valuetext',infinite()?'무한대':metres(value));
      else if(stops)range.setAttribute('aria-valuetext',rangeText(value));
    };
    const rangeOptions=isFocus?{min:0,max:FOCUS_SCALE_STEPS,step:1}:options;
    if(rangeOptions){
      wrap.classList.add('pfm-range-field');input.min=String(minimum);range=node(wrap,'input');range.type='range';
      range.min=stops?'0':String(rangeOptions.min);
      range.max=String(stops?stops.length-1:rangeOptions.max);
      range.step=String(stops?1:rangeOptions.step);
      if(stops){range.dataset.stops=String(stops.length);range.style.setProperty('--pfm-range-div',String(stops.length-1));}
      range.setAttribute('aria-label',`${label} 빠른 조절`);range.dataset.range=key;
      const r=range;this.listen(r,'input',()=>{
        const position=Number(r.value);
        // 초점 축 끝의 ∞ 칸까지 끌면 무한대 초점으로 둔다(마지막 유한 거리는 보존).
        if(isFocus&&position/FOCUS_SCALE_STEPS>=(1+FOCUS_SCALE_FINITE_END)/2){
          if(!infinite()){this.plugin.setFocusInfinity(true);sync();this.changed();}
          return;
        }
        const value=isFocus?axis?.distance(position/FOCUS_SCALE_STEPS):stops?stops[position]:position;
        if(value===undefined)return;
        this.plugin.update(key,value);sync();input.setAttribute('aria-invalid','false');this.changed();
      });
    }
    if(key==='flashDistance')wrap.classList.add('pfm-flash-distance');
    const infinityUi=()=>{if(key!=='cameraDistance')return;input.placeholder=infinite()?'∞':'';if(infinite()){input.value='';input.setAttribute('aria-invalid','false');}wrap.dataset.focusInfinity=String(infinite());infinityButton?.setAttribute('aria-pressed',String(infinite()));};
    const sync=()=>{
      const value=this.plugin.state.inputs[key];
      if(isDistance&&Number.isFinite(value)&&value>=0)scale=value<=1?100:1;
      const unit=scale===100?'cm':'m';
      if(isDistance){caption.textContent=(compact[key]??label).replace('(m)',`(${unit})`);input.setAttribute('aria-label',label.replace('(m)',`(${unit})`));input.dataset.displayUnit=unit;if(hasFocusMinimum)minimum=this.minimumFocus();if((options||hasFocusMinimum)&&Number.isFinite(minimum))input.min=String(minimum*scale);}
      input.value=infinite()?'':Number.isFinite(value)?String(isDistance&&document.activeElement!==input?Number((value*scale).toFixed(1)):scale===100?Number((value*scale).toPrecision(15)):value):'';
      infinityUi();
      syncRange(value);
    };
    const apply=(value:number)=>{if(input.disabled)return;this.plugin.update(key,value);sync();input.dispatchEvent(new Event('input',{bubbles:true}));};
    const choices:Partial<Record<NumericKey,number[]>>={aperture:apertureStops(),iso:FILM_SPEEDS,cameraDistance:[.3,.5,1,2,3,5,10],flashDistance:[.3,.5,1,2,3,5,10],loss:[0,.5,1,2,3]};
    const candidate=(direction:number):number|undefined=>{
      const value=this.plugin.state.inputs[key];if(input.disabled||!Number.isFinite(value))return;
      let steps=key==='aperture'?apertureStops():choices[key];
      if(key==='denominator')try{steps=powerSteps(this.plugin.state.inputs.steps,this.plugin.state.inputs.minDenominator);}catch{return;}
      if(steps&&!isDistance&&key!=='loss'){
        const next=direction>0?steps.find(n=>n>value):[...steps].reverse().find(n=>n<value);return next;
      }
      if(isDistance)return stepDistance(value,direction,hasFocusMinimum?this.minimumFocus():.01);
      const increment=key==='coc'?.001:['loss'].includes(key)?.1:1;
      const result=Math.max(key==='loss'?-Infinity:increment,Number((value+direction*increment).toPrecision(15)));
      return (result-value)*direction>0?result:undefined;
    };
    const adjust=(direction:number)=>{if(infinite()){if(direction<0)apply(this.plugin.state.inputs[key]);return;}const value=candidate(direction);if(value!==undefined)apply(value);};
    const minus=this.button(entry,'−',()=>adjust(-1));minus.dataset.step='down';minus.setAttribute('aria-label',`${label} 줄이기`);entry.append(input);
    const plus=this.button(entry,'+',()=>adjust(1));plus.dataset.step='up';plus.setAttribute('aria-label',`${label} 늘리기`);
    let picker:HTMLSelectElement|undefined;
    if(choices[key]){
      picker=node(wrap,'select',undefined,'pfm-value-picker');picker.dataset.preset=key;
      picker.setAttribute('aria-label',`${label} 자주 쓰는 값`);
      const control=picker;this.listen(control,'change',()=>{if(control.value!=='')apply(Number(control.value));control.value='';});
    }
    let pickerOptions='';
    const updateControls=(limits?:FocusLimits)=>{
      const lens=selectedPreset(this.plugin.state,'lenses'),value=this.plugin.state.inputs[key];
      if(hasFocusMinimum){
        minimum=this.minimumFocus();
        if(Number.isFinite(minimum))input.min=String(minimum*scale);
        else input.removeAttribute('min');
      }
      if(key==='aperture'&&range){
        stops=currentStops();
        if(stops){
          range.max=String(stops.length-1);range.disabled=stops.length===1;
          range.dataset.stops=String(stops.length);
          range.style.setProperty('--pfm-range-div',String(Math.max(1,stops.length-1)));
          syncRange(value);
        }
        if(lens){input.min=String(lens.apertureMin);input.max=String(lens.apertureMax);}
        else{input.min=String(options?.min??0);input.removeAttribute('max');}
      }
      if(picker){
        const marks=key==='cameraDistance'?lensFocusMarks(lens):undefined;
        let values=(key==='aperture'?apertureStops():marks??choices[key])??[];
        if(hasFocusMinimum&&lens)values=values.filter(n=>n>=minimum);
        const optionKey=values.join(',')+';';
        if(pickerOptions!==optionKey){
          pickerOptions=optionKey;picker.replaceChildren();
          const placeholder=node(picker,'option','자주 쓰는 값');placeholder.value='';
          for(const n of values){
            const option=node(picker,'option',isDistance?metres(n):key==='aperture'?`f/${n}`:String(n));
            option.value=String(n);
          }
        }
        picker.disabled=input.disabled||!values.length;
      }
      infinityUi();minus.disabled=infinite()?false:candidate(-1)===undefined;plus.disabled=infinite()||candidate(1)===undefined;
      if(!depth)return;
      updateFocusScale();
      const focus=this.plugin.state.inputs.cameraDistance;
      syncRange(focus);
      depth.hidden=!axis||!limits;
      if(!axis||!limits)return;
      depth.style.setProperty('--pfm-depth-near',`${axis.position(limits.near)*100}%`);
      depth.style.setProperty('--pfm-depth-far',`${axis.position(limits.far)*100}%`);
      depth.style.setProperty('--pfm-depth-focus',`${axis.position(infinite()?Infinity:focus)*100}%`);
      depth.setAttribute('aria-label',`심도 ${metres(limits.near)} ~ ${metres(limits.far)} · 초점 ${infinite()?'무한대':metres(focus)}`);
    };
    if(isFocus){const b=node(wrap,'button','∞','pfm-infinity-toggle');b.type='button';b.dataset.focusInfinity='true';b.setAttribute('aria-label','무한대 초점');infinityButton=b;this.listen(b,'click',()=>{this.plugin.setFocusInfinity(!this.plugin.state.inputs.focusInfinity);sync();this.changed();b.focus({preventScroll:true});});}
    updateFocusScale();
    this.numeric.set(key,{input,range,sync,updateControls});sync();
    this.listen(input,'input',()=>{const v=parseNumber(input.value)/scale;this.plugin.update(key,v);if(key==='denominator')this.syncPower();if(range&&Number.isFinite(v)){range.value=toRange(v);this.rangeProgress(range);}input.setAttribute('aria-invalid',String(!Number.isFinite(v)||(key!=='loss'&&v<=0)));this.changed();});
    // 입력 중에는 단위를 유지하고 편집을 마친 뒤 환산한다.
    if(isDistance)this.listen(input,'blur',()=>{
      const value=this.plugin.state.inputs[key],lens=selectedPreset(this.plugin.state,'lenses');
      if(lens&&hasFocusMinimum&&!infinite()&&Number.isFinite(value)&&value<this.minimumFocus()){
        this.plugin.update(key,this.minimumFocus());input.setAttribute('aria-invalid','false');this.changed();
      }
      sync();
    });
  }
  private select<K extends keyof Inputs>(parent:HTMLElement,label:string,key:K,values:Record<string,string>,after?:()=>void):HTMLSelectElement {
    const l=node(parent,'label',undefined,'pfm-field');l.dataset.field=key;node(l,'span',label);const s=node(l,'select');s.setAttribute('aria-label',label);s.dataset.key=key;
    for(const [v,t] of Object.entries(values)){const o=node(s,'option',t);o.value=v;}s.value=String(this.plugin.state.inputs[key]);
    this.listen(s,'change',()=>{
      const value=typeof this.plugin.state.inputs[key]==='number'?Number(s.value):s.value;
      this.plugin.update(key,value as Inputs[K]);after?.();this.changed();
    });return s;
  }
  private text(parent:HTMLElement,label:string,value:string):HTMLInputElement {const l=node(parent,'label',undefined,'pfm-field');node(l,'span',label);const t=node(l,'input');t.type='text';t.value=value;return t;}
  private jumpSettings(target:string):void {
    const section=this.root.querySelector<HTMLDetailsElement>(`[data-pfm-settings=${target}]`);
    if(!section)return;
    section.open=true;section.scrollIntoView({block:'start'});
    section.querySelector('summary')?.focus({preventScroll:true});
  }
  private details(label:string,id?:string):HTMLElement {
    const d=node(this.root,'details');
    if(id)d.dataset.pfmSettings=id;
    node(d,'summary',label);
    return node(d,'div',undefined,'pfm-settings');
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
  updateSaveStatus():void {
    if(this.saveStatus){this.saveStatus.textContent=this.plugin.saveError;this.saveStatus.hidden=!this.plugin.saveError;}
    if(this.retry)this.retry.hidden=!this.plugin.saveError;
  }
  private flushOnEnd():void {for(const event of ['change','focusout'])this.listen(this.contentEl,event,()=>{void this.plugin.flush().catch(e=>this.plugin.reportSaveError(e));});}
  private syncPower():void {
    if(!this.power)return;
    this.power.replaceChildren();const i=this.plugin.state.inputs;
    let steps:number[]=[];
    try{steps=powerSteps(i.steps,i.minDenominator);}catch{/* 결과 카드에서 잘못된 출력 단계를 알린다. */}
    for(const n of steps){const o=node(this.power,'option',`1/${n}`);o.value=String(n);}
    const value=i.denominator;
    if(Number.isFinite(value)&&!steps.includes(value)){const option=node(this.power,'option',`이론값·장비 미지원 출력 1/${value}`);option.value=String(value);option.dataset.custom='true';}
    this.power.value=Number.isFinite(value)?String(value):'';
  }
  private syncNumeric(key:NumericKey):void {this.numeric.get(key)?.sync();if(key==='denominator')this.syncPower();}
  private applyOutput(denominator:number):void {
    this.outputUndo={before:this.plugin.state.inputs.denominator,applied:denominator};
    this.plugin.update('denominator',denominator);
    this.syncNumeric('denominator');this.changed();
  }
  private stopBulbTimer():void {
    if(this.bulbRemaining===undefined)return;
    window.clearTimeout(this.bulbTimeout);
    this.bulbTimeout=undefined;
    this.bulbRemaining=undefined;
    this.bulbFlash?.cancel();
    this.bulbFlash=undefined;
    this.root?.removeAttribute('data-bulb-ended');
    this.paintBulbTimer?.();
  }
  private startBulbTimer(seconds:number):void {
    this.stopBulbTimer();
    const started=Date.now();
    const tick=()=>{
      // 실제 경과 시간으로 보정해 백그라운드에서 늦어진 틱을 누적하지 않는다.
      const elapsed=Math.max(0,(Date.now()-started)/1000);
      const left=seconds-elapsed;
      if(left<=0){
        this.bulbTimeout=undefined;
        this.bulbRemaining=0;
        this.paintBulbTimer?.();
        this.root.dataset.bulbEnded='true';
        if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
          this.bulbFlash=this.root.querySelector('.pfm-bulb-flash')?.animate([{opacity:.88},{opacity:0}],{duration:220,easing:'ease-out'});
        }
        navigator.vibrate?.(160);
        return;
      }
      this.bulbRemaining=seconds-Math.floor(elapsed);
      this.bulbTimeout=window.setTimeout(tick,Math.ceil(1000*Math.min(left,1-elapsed%1)));
      this.paintBulbTimer?.();
    };
    tick();
  }
  /** 상황별 노출: 장면 EV(Sunny 16 확장)와 필름 EI로 조리개·셔터 짝을 보여 준다. 대략값. */
  private exposurePanel():void {
    const body=this.details('상황별 노출 · Sunny 16');
    body.classList.add('pfm-exposure-guide');
    const paint=()=>{
      const i=this.plugin.state.inputs,state=this.plugin.state;
      const camera=selectedPreset(state,'cameras'),film=selectedPreset(state,'films');
      body.replaceChildren();
      const chips=node(body,'div',undefined,'pfm-scene-chips');chips.setAttribute('role','group');chips.setAttribute('aria-label','장면 밝기');
      for(const scene of EXPOSURE_SCENES){
        const chip=this.button(chips,'',()=>{
          if(i.exposureScene===scene.id)return;
          this.plugin.update('exposureScene',scene.id);this.changed();
          body.querySelector<HTMLButtonElement>(`[data-exposure-scene=${scene.id}]`)?.focus({preventScroll:true});
        });
        node(chip,'span',scene.label);node(chip,'small',`EV${scene.ev}`);
        chip.dataset.exposureScene=scene.id;chip.setAttribute('aria-pressed',String(i.exposureScene===scene.id));
      }
      const scene=EXPOSURE_SCENES.find(s=>s.id===i.exposureScene)??EXPOSURE_SCENES[1];
      const ei=i.iso,ev=scene.ev+Math.log2(ei/100);
      node(body,'p',`${scene.label} EV${scene.ev} · EI ${fmt(ei,0)}이면 EV${fmt(ev,1)} · 누르면 그 조리개로`,'pfm-exposure-basis');
      const sync=i.flashOn?syncLimit(camera):undefined;
      const pairs=exposurePairs(scene.ev,ei,this.apertureStops(),cameraShutters(camera),i.focal,sync);
      const list=node(body,'div',undefined,'pfm-exposure-pairs');
      for(const pair of pairs){
        const row=node(list,'button');row.type='button';row.className='pfm-exposure-row';row.dataset.exposureAperture=String(pair.aperture);
        const shutter=pair.shutter==='B'?`B ${formatExposureSeconds(pair.seconds)}`:pair.shutter===1?'1초':`1/${pair.shutter}`;
        const off=pair.shutter!=='B'&&Math.abs(pair.residual)>=.45?` ${pair.residual>0?'+':''}${fmt(pair.residual,1)}`:'';
        node(row,'span',`f/${fmt(pair.aperture)}`);node(row,'strong',shutter+off);
        const flags=[pair.tooBright?'셔터 한계 · 과다':'',pair.overSync?'동조 초과':'',pair.shake?'손떨림':'',pair.long?'상반칙':''].filter(Boolean);
        node(row,'small',flags.join(' · '));
        if(pair.tooBright||pair.overSync)row.dataset.state='bad';else if(pair.shake||pair.long)row.dataset.state='warn';
        if(pair.aperture===i.aperture)row.setAttribute('aria-current','true');
        row.setAttribute('aria-label',`f/${fmt(pair.aperture)} ${shutter}${off?` (${off.trim()} 스톱)`:''}${flags.length?' · '+flags.join(', '):''}. 누르면 이 조리개와 셔터로`);
        this.listen(row,'click',()=>{
          this.plugin.update('aperture',pair.aperture);
          if(typeof pair.shutter==='number')this.plugin.update('shutter',pair.shutter);
          this.syncNumeric('aperture');this.changed();
          body.querySelector<HTMLButtonElement>(`[data-exposure-aperture="${pair.aperture}"]`)?.focus({preventScroll:true});
        });
      }
      const notes:string[]=[`손떨림 기준 1/${fmt(i.focal,0)}초보다 느리면 표시`];
      if(sync)notes.push(`플래시 동조 1/${sync} 이하`);
      node(body,'p',notes.join(' · '),'pfm-exposure-note');
      if(film?.type==='slide')node(body,'p','슬라이드 필름은 관용도가 ±½스톱 정도로 좁아요 · 노출계로 확인하세요.','pfm-warning');
      if(film&&/텅스텐/.test(film.memo??''))node(body,'p','텅스텐 필름 · 주광에서 85 필터를 쓰면 EI를 약 ⅔스톱 낮추세요(500T → 320).','pfm-exposure-note');
      node(body,'p','장면 EV는 대략값이에요. 정확한 기준은 맑음(Sunny 16)뿐이고 해질녘·실내·야간은 ±2스톱 이상 달라질 수 있습니다.','pfm-exposure-note');
    };
    this.paintGuides.push(paint);
  }
  /** 구도별 거리: 현재 렌즈로 얼굴·바스트·상반신·전신이 프레임에 차는 거리와 걸음 수. 누르면 그 거리에 초점. */
  private framingPanel():void {
    const body=this.details('구도별 거리 · 보폭');
    body.classList.add('pfm-framing-guide');
    const paint=()=>{
      const i=this.plugin.state.inputs,lens=selectedPreset(this.plugin.state,'lenses');
      body.replaceChildren();
      const toggle=node(body,'div',undefined,'pfm-zone-goals pfm-framing-toggle');toggle.setAttribute('role','group');toggle.setAttribute('aria-label','카메라 방향');
      for(const [value,label] of [['portrait','세로'],['landscape','가로']] as const){
        const b=this.button(toggle,label,()=>{if(i.framing===value)return;this.plugin.update('framing',value);this.changed();body.querySelector<HTMLButtonElement>(`[data-framing=${value}]`)?.focus({preventScroll:true});});
        b.dataset.framing=value;b.setAttribute('aria-pressed',String(i.framing===value));
      }
      const frame=i.framing==='portrait'?Math.max(i.width,i.height):Math.min(i.width,i.height);
      const minimum=effectiveMinFocus(i,lens);
      node(body,'p',`${fmt(i.focal)}mm · 프레임 높이에 꽉 찰 때 · 한 걸음 ${metres(STRIDE)}`,'pfm-exposure-basis');
      for(const framing of FRAMINGS){
        const distance=framingDistance(i.focal,frame,framing.height);
        const row=node(body,'button');row.type='button';row.className='pfm-exposure-row pfm-framing-row';row.dataset.framingTarget=framing.id;
        node(row,'span',framing.label);
        if(!Number.isFinite(distance)){node(row,'strong','—');row.disabled=true;continue;}
        const close=distance<minimum;
        node(row,'strong',metres(distance));node(row,'small',close?'최단 거리보다 가까움':`약 ${strides(distance)}걸음`);
        if(close){row.dataset.state='bad';row.disabled=true;}
        if(!i.focusInfinity&&Math.abs(i.cameraDistance-distance)<=distance*.01)row.setAttribute('aria-current','true');
        row.setAttribute('aria-label',`${framing.label}: ${metres(distance)}${close?', 렌즈 최단 거리보다 가까움':`, 약 ${strides(distance)}걸음. 누르면 이 거리에 초점`}`);
        this.listen(row,'click',()=>{
          this.plugin.update('cameraDistance',distance);this.syncNumeric('cameraDistance');this.changed();
          body.querySelector<HTMLButtonElement>(`[data-framing-target=${framing.id}]`)?.focus({preventScroll:true});
        });
      }
      node(body,'p','사람 키 170cm 기준에 여백을 조금 둔 대략값이에요. 걸음 수는 피사체까지 걸어가며 세는 목측용입니다.','pfm-exposure-note');
    };
    this.paintGuides.push(paint);
  }
  private reciprocityPanel():void {
    const body=this.details('장노출 · 상반칙 불궤');
    body.classList.add('pfm-reciprocity');
    node(this.root,'div',undefined,'pfm-bulb-flash').setAttribute('aria-hidden','true');
    const i=this.plugin.state.inputs;
    // 복원 경로를 거치지 않은 상태(외부에서 state를 바꾼 경우 등)에서도 패널이 깨지지 않도록 기본값을 채운다.
    if(!isReciprocityFilmId(i.reciprocityFilm))i.reciprocityFilm='vision3-500t';
    if(!i.reciprocityOverrides||typeof i.reciprocityOverrides!=='object'||Array.isArray(i.reciprocityOverrides))i.reciprocityOverrides={};
    if(!validMeteredSeconds(i.meteredSeconds))i.meteredSeconds=4;
    const filmLabel=node(body,'label',undefined,'pfm-field');
    node(filmLabel,'span','필름');
    const filmSelect=node(filmLabel,'select');
    for(const film of Object.values(RECIPROCITY_FILMS))node(filmSelect,'option',film.name).value=film.id;
    filmSelect.value=i.reciprocityFilm;
    const time=this.text(body,'측광 시간 (초)',String(i.meteredSeconds));
    const meteredEquivalent=node(body,'p');
    const exponent=this.text(body,'지수 p (1.0~2.0)','');
    for(const input of [time,exponent]){
      input.type='number';input.step='any';input.inputMode='decimal';
    }
    exponent.min='1';exponent.max='2';
    const persist=()=>{
      void this.plugin.persist().catch(e=>this.plugin.reportSaveError(e));
      this.plugin.refresh(this);
    };
    const reset=this.button(body,'실측 지수 초기화',()=>{
      this.stopBulbTimer();
      delete i.reciprocityOverrides[i.reciprocityFilm];
      syncExponent();
      paintResult();
      persist();
    });
    const result=node(body,'div');
    result.setAttribute('role','status');
    const duration=node(result,'p',undefined,'pfm-exposure-time');
    const equivalent=node(result,'p');
    const basis=node(result,'p');
    const official=node(result,'p');
    const note=node(result,'p');
    const advice=node(result,'p');
    const bulb=node(result,'p','B 셔터 · 릴리즈 잠금');
    const error=node(result,'p',undefined,'pfm-reciprocity-error');
    const countdown=node(body,'p',undefined,'pfm-bulb-countdown');
    countdown.setAttribute('role','timer');
    countdown.setAttribute('aria-label','남은 노출 시간');
    const timerStatus=node(body,'p');
    timerStatus.setAttribute('role','status');
    let corrected:number|undefined;
    const timer=this.button(body,'벌브 타이머 시작',()=>{
      if(this.bulbTimeout!==undefined)this.stopBulbTimer();
      else if(corrected!==undefined&&corrected>1)this.startBulbTimer(corrected);
    });
    const syncExponent=()=>{
      exponent.value=String(i.reciprocityOverrides[i.reciprocityFilm]??RECIPROCITY_FILMS[i.reciprocityFilm].p??'');
    };
    this.paintBulbTimer=()=>{
      const running=this.bulbTimeout!==undefined;
      const remaining=this.bulbRemaining;
      countdown.hidden=remaining===undefined;
      countdown.textContent=remaining===undefined?'':formatExposureSeconds(remaining);
      const status=remaining===0?'노출 종료 · 릴리즈 잠금 해제':'';
      if(timerStatus.textContent!==status)timerStatus.textContent=status;
      timer.textContent=running?'벌브 타이머 정지':'벌브 타이머 시작';
      const canStart=corrected!==undefined&&corrected>1;
      timer.hidden=!canStart&&!running;
      filmSelect.disabled=time.disabled=exponent.disabled=running;
      reset.disabled=running||(i.reciprocityOverrides[i.reciprocityFilm]===undefined
        &&exponent.value===String(RECIPROCITY_FILMS[i.reciprocityFilm].p??'')&&!exponent.validity.badInput);
    };
    const paintResult=()=>{
      const film=RECIPROCITY_FILMS[i.reciprocityFilm];
      const metered=time.valueAsNumber;
      const override=i.reciprocityOverrides[film.id];
      const p=override===undefined&&!exponent.validity.badInput
        &&exponent.value===String(film.p??'')?undefined:exponent.valueAsNumber;
      const validTime=validMeteredSeconds(metered);
      time.setAttribute('aria-invalid',String(!validTime));
      meteredEquivalent.textContent=validTime?formatExposureMinutes(metered):'';
      exponent.setAttribute('aria-invalid',String(p!==undefined?!validReciprocityExponent(p):film.p===undefined&&metered>film.uncorrectedMax));
      try{
        const value=correctedTime(metered,film,p);
        corrected=value.corrected;
        duration.textContent=`실제 노출 ${formatExposureSeconds(corrected)}`;
        equivalent.textContent=formatExposureMinutes(corrected);
        const label=value.basis==='uncorrected'
          ?`${film.id==='custom'?'1초 기준':'공식 범위'} · 보정 불필요`
          :value.basis==='measured'?'실측 지수 기반 추정':film.source;
        const extra=value.extraStops>0?'+':'';
        basis.textContent=`${label} · ${extra}${fmt(value.extraStops)}스톱${override===undefined?'':` · 내 실측 지수 p=${fmt(override)}`}`;
        official.textContent=film.id==='custom'?'':film.officialNote;
        note.textContent=override!==undefined&&'filter' in film?'':film.note;
        advice.textContent=[value.filter,value.bracket].filter(Boolean).join(' · ');
        bulb.hidden=corrected<=1;
        error.textContent='';
      }catch(e){
        corrected=undefined;
        for(const line of [duration,equivalent,basis,official,note,advice])line.textContent='';
        bulb.hidden=true;
        error.textContent=e instanceof Error?e.message:String(e);
      }
      this.paintBulbTimer?.();
    };
    this.listen(filmSelect,'change',()=>{
      if(!isReciprocityFilmId(filmSelect.value))return;
      i.reciprocityFilm=filmSelect.value;
      this.stopBulbTimer();
      syncExponent();
      paintResult();
      persist();
    });
    this.listen(time,'input',()=>{
      this.stopBulbTimer();
      const value=time.valueAsNumber;
      if(validMeteredSeconds(value)){
        i.meteredSeconds=value;
        persist();
      }
      paintResult();
    });
    this.listen(exponent,'input',()=>{
      this.stopBulbTimer();
      const p=exponent.valueAsNumber;
      if(validReciprocityExponent(p)){
        i.reciprocityOverrides[i.reciprocityFilm]=p;
        persist();
      }
      paintResult();
    });
    syncExponent();
    paintResult();
  }
  private fillPanel():void {
    // 야외 역광에서 바로 꺼내 쓰도록 상황별 노출·구도별 거리와 같은 단계에 둔다.
    const fill=this.details('필인 플래시','fill');fill.classList.add('pfm-fill-tool');
    node(fill,'p','주광 노출을 먼저 맞추세요. 현재 조리개로 필인 출력을 계산합니다.');
    const camera=selectedPreset(this.plugin.state,'cameras');const limit=syncLimit(camera);
    const shutter=this.select(fill,'셔터 속도','shutter',{});
    for(const n of cameraShutters(camera))node(shutter,'option',shutterLabel(n)).value=String(n);
    shutter.value=String(this.plugin.state.inputs.shutter);
    const ratio=this.select(fill,'필인 비율','fillRatio',Object.fromEntries(FILL_RATIOS.map(ev=>[ev,`−${Math.abs(ev)} EV`])));
    const result=node(fill,'p');result.setAttribute('role','status');
    const warning=node(fill,'p',`${camera?.name??'FM2'} 동조 한계 ${shutterLabel(limit)}${camera?'':' (초기 FM2는 1/200초)'} · 현재 셔터가 더 빨라 플래시가 일부만 찍힐 수 있습니다`,'pfm-flash-warning');
    warning.setAttribute('role','status');
    let recommended:number|undefined;
    const apply=this.button(fill,'출력 적용',()=>{if(recommended!==undefined)this.applyOutput(recommended);});
    this.paintFill=()=>{
      const i=this.plugin.state.inputs;
      shutter.value=String(i.shutter);ratio.value=String(i.fillRatio);
      try {
        const value=fillFlash(i,camera);
        warning.hidden=!value.syncExceeded;
        recommended=value.nearest;
        const range=value.range==='below'?' · 최소 출력으로도 과함 · 거리를 늘리거나 조리개를 조이세요'
          :value.range==='above'?' · 최대 출력으로도 부족':'';
        result.textContent=`권장 1/${recommended} · 목표 대비 오차 ${fmt(value.residual)} EV${range}`;
        result.classList.toggle('pfm-flash-warning',value.range!=='within');
      }catch(e){
        warning.hidden=i.shutter<=limit;
        recommended=undefined;result.textContent=e instanceof Error?e.message:String(e);
        result.classList.add('pfm-flash-warning');
      }
      apply.disabled=recommended===undefined||recommended===i.denominator;
      apply.textContent=recommended===undefined?'출력 적용':`출력 1/${recommended} ${apply.disabled?'적용됨':'적용'}`;
    };
  }
  private calibrationPanel(parent:HTMLElement):void {
    const panel=node(parent,'details',undefined,'pfm-calibration');
    node(panel,'summary','실측으로 GN 맞추기');
    const i=this.plugin.state.inputs;
    const fields=[
      ['iso','실측 ISO',()=>i.iso],
      ['distance','플래시–피사체 실측 거리 (m)',()=>i.linked?(i.focusInfinity?NaN:i.cameraDistance):i.flashDistance],
      ['aperture','적정이었던 조리개 f/',()=>i.aperture],
    ] as const;
    const controls=fields.map(([key,label,current])=>{
      const input=this.text(panel,label,this.calibrationDraft[key]??'');
      input.type='number';input.step='any';input.inputMode=key==='iso'?'numeric':'decimal';
      this.listen(input,'input',()=>{this.calibrationDraft[key]=input.value;this.paintCalibration();});
      return {key,current,input};
    });
    const powerLabel=node(panel,'label',undefined,'pfm-field');
    controls[0].input.closest('label')?.after(powerLabel);
    node(powerLabel,'span','실측 출력');
    const power=node(powerLabel,'select');
    this.listen(power,'change',()=>{this.calibrationDraft.denominator=power.value;this.paintCalibration();});
    const result=node(panel,'p');result.setAttribute('role','status');
    const status=node(panel,'p');status.setAttribute('role','status');status.hidden=true;
    let measurement:GNMeasurement,calibration:ReturnType<typeof calibrateGN>|undefined;
    const apply=(manual:boolean)=>{
      if(!calibration||(!manual&&calibration.loss===undefined))return;
      const {iso,denominator,distance,aperture}=measurement;
      const values:Partial<Inputs>=manual?{
        gnMode:'manual',gn:calibration.gn,gnUnit:'m',gnZoom:i.zoom,loss:0,
        conditions:`실측 역산 · ISO ${iso} · 출력 1/${denominator} · 거리 ${distance} m · f/${aperture}`,
      }:{loss:calibration.loss};
      const change=patch(i,values);
      if(Object.keys(change.after).length){
        this.calibrationUndo={...change,after:{...change.after,gnMode:i.gnMode,zoom:i.zoom,equipmentId:i.equipmentId}};
        this.calibrationMessage=manual?`수동 GN ${fmt(i.gn)} m 적용 · 광량 보정 0 EV`:`광량 보정 ${fmt(i.loss)} EV 적용`;
      }else this.calibrationMessage='현재 설정과 같은 값입니다.';
      this.syncNumeric('loss');this.changed();
      if(this.calibrationUndo)undoButton.focus({preventScroll:true});
    };
    const lossButton=this.button(panel,'광량 보정에 적용',()=>apply(false));
    const manualButton=this.button(panel,'수동 GN으로 적용',()=>apply(true));
    const undoButton=this.button(panel,'실측 GN 적용 취소',()=>{
      if(this.calibrationUndo&&undo(i,this.calibrationUndo))this.calibrationMessage='실측 GN 적용을 취소했습니다.';
      this.calibrationUndo=undefined;
      this.syncNumeric('loss');this.changed();
      (lossButton.disabled?manualButton:lossButton).focus({preventScroll:true});
    });
    let powerOptions='';
    this.paintCalibration=()=>{
      if(this.calibrationUndo&&!canUndo(i,this.calibrationUndo)){
        this.calibrationUndo=undefined;
        this.calibrationMessage='설정이 변경되어 실측 GN 적용 취소가 만료되었습니다.';
      }
      undoButton.hidden=!this.calibrationUndo;
      status.textContent=this.calibrationMessage;status.hidden=!this.calibrationMessage;
      for(const {key,current,input} of controls){
        if(this.calibrationDraft[key]===undefined){
          const value=current();input.value=Number.isFinite(value)?String(value):'';
        }
      }
      calibration=undefined;
      let steps:number[]=[];
      try{steps=powerSteps(i.steps,i.minDenominator);}
      catch(e){result.textContent=e instanceof Error?e.message:String(e);}
      const options=steps.join(',');
      if(options!==powerOptions||!power.options.length){
        power.replaceChildren();
        node(power,'option','지원 출력 선택').value='';
        for(const n of steps)node(power,'option',`1/${n}`).value=String(n);
        powerOptions=options;
      }
      const selected=this.calibrationDraft.denominator??String(i.denominator);
      power.value=steps.includes(Number(selected))?selected:'';
      power.disabled=!steps.length;
      if(steps.length)try{
        const [iso,distance,aperture]=controls.map(({input})=>parseNumber(input.value));
        measurement={iso,distance,aperture,denominator:parseNumber(power.value)};
        let nominal:number|undefined;
        try{nominal=nominalGN(i);}catch{/* 공칭 GN이 없어도 실측값은 수동 GN으로 쓸 수 있다. */}
        calibration=calibrateGN(measurement,steps,nominal);
        result.textContent=`실측 ISO100 최대출력 GN ${fmt(calibration.gn)} m · ${calibration.loss===undefined?'현재 줌의 공칭 GN 자료 없음':`공칭 ${fmt(nominal!)} m 대비 광량 보정 ${fmt(calibration.loss)} EV`}`;
      }catch(e){result.textContent=e instanceof Error?e.message:String(e);}
      result.classList.toggle('pfm-flash-warning',!calibration);
      lossButton.disabled=calibration?.loss===undefined;
      manualButton.disabled=!calibration||!Number.isFinite(i.zoom)||i.zoom<=0;
    };
  }
  render():void {
    // 복원 경로를 거치지 않고 통째로 바뀐 예전 형식 상태는 저장 데이터와 같은 경로로 한 번 정리한다.
    if(this.plugin.state.version!==2||!Array.isArray((this.plugin.state as {lenses?:unknown}).lenses))this.plugin.state=restore(this.plugin.state);
    this.rememberDetails();this.clean();this.contentEl.replaceChildren();this.contentEl.addClass('pfm-container');
    this.root=node(this.contentEl,'div',undefined,'pfm-root');
    const i=this.plugin.state.inputs;
    this.root.dataset.night=String(i.nightMode);
    this.gearBar();
    const modes=node(this.root,'div',undefined,'pfm-mode-toggles');
    modes.setAttribute('role','group');modes.setAttribute('aria-label','촬영 모드');
    for(const [key,label] of [['flashOn','플래시'],['zoneOn','존 포커싱']] as const){
      const button=this.button(modes,label,()=>{
        this.plugin.update(key,!i[key]);this.render();
        this.root.querySelector<HTMLButtonElement>(`[data-mode=${key}]`)?.focus({preventScroll:true});
        void this.plugin.persist().catch(e=>this.plugin.reportSaveError(e));this.plugin.refresh(this);
      });
      button.dataset.mode=key;button.setAttribute('aria-pressed',String(i[key]));
    }
    // 야간 모드는 촬영 중 자주 켜고 끄므로 모드 토글 줄 끝에 작게 둔다.
    const night=this.button(modes,'야간',()=>{
      this.plugin.update('nightMode',!i.nightMode);syncNight();
      void this.plugin.persist().catch(e=>this.plugin.reportSaveError(e));this.plugin.refresh(this);
    });
    night.className='pfm-night-toggle';night.setAttribute('aria-label','적색 야간 모드');
    const syncNight=()=>{
      this.root.dataset.night=String(i.nightMode);
      night.setAttribute('aria-pressed',String(i.nightMode));
    };
    syncNight();
    this.results=node(this.root,'section',undefined,'pfm-results');this.results.setAttribute('aria-live','polite');
    // 결과를 보면서 바로 조절하도록 빠른 조절을 결과 바로 밑에 둔다.
    // 존 포커싱은 그림의 선명 구간 띠를 끄는 것이 조작이라 그림을 먼저 둔다.
    const scene=()=>{this.picture=node(this.root,'figure',undefined,'pfm-diagram');this.sceneControls();this.flushOnEnd();};
    if(i.zoneOn){scene();this.quickControls();}else{this.quickControls();scene();}
    this.paintGuides=[];
    this.exposurePanel();
    this.framingPanel();
    if(i.flashOn){this.fillPanel();this.flashPanel();}
    this.reciprocityPanel();
    this.presetManager();
    this.saveControls();
    this.restoreDetails();
    this.paint();
  }
  private quickControls():void {
    const i=this.plugin.state.inputs;
    const quick=node(this.root,'section',undefined,'pfm-quick');
    node(quick,'h2','빠른 조절');
    // ∞ 목표는 조리개만 바꾸면 된다.
    if(!(i.zoneOn&&i.zoneGoal==='infinity'))this.number(quick,'초점 맞출 거리 (m)','cameraDistance');
    this.number(quick,'조리개 (f/)','aperture',{min:0.7,max:32,step:0.1});
    if(!i.flashOn)return;
    // 플래시 출력은 [− | 출력 ▾ | +] 한 줄로 둔다.
    const powerRow=node(quick,'div',undefined,'pfm-field-power');
    const powerButton=(direction:'weaker'|'stronger',sign:string,label:string)=>{
      const button=this.button(powerRow,sign,()=>{
        const next=nextPower(i,direction);if(next===undefined)return;
        this.plugin.update('denominator',next);this.syncNumeric('denominator');this.changed();
        if(button.disabled)this.powerButtons[direction==='weaker'?'stronger':'weaker']?.focus({preventScroll:true});
      });
      button.setAttribute('aria-label',label);button.title=label;
      button.dataset.powerDirection=direction;this.powerButtons[direction]=button;
    };
    powerButton('weaker','−','출력 약하게');
    this.power=this.select(powerRow,'플래시 출력','denominator',{},()=>this.numeric.get('denominator')?.sync());
    powerButton('stronger','+','출력 강하게');
    this.linkToggle=this.button(quick,'',()=>{this.plugin.update('linked',!i.linked);this.changed();});
    this.linkToggle.className='pfm-link-toggle';
    this.number(quick,'플래시 → 피사체 거리 (m)','flashDistance',{min:0.1,max:30,step:0.1});
  }
  private flashPanel():void {
    const i=this.plugin.state.inputs;
    const fl=this.details('플래시 장비·고급','flash');
    this.equipmentPanel(fl);
    this.select(fl,'발광 조건','mode',{manual:'수동 · 직접광 · 일반 동조',ttl:'TTL (FM2 본체 미지원)',hss:'HSS (FM2 미지원 · 계산 미지원)',bounce:'바운스 (계산 미지원)',modifier:'소프트박스 (계산 미지원)',near:'근거리 대형 광원 (계산 미지원)'});
    this.select(fl,'GN 입력 모드','gnMode',{manual:'수동 GN',equipment:'선택 장비 표'},()=>applyEquipment(this.plugin.state));
    this.number(fl,'선택 플래시 줌 (mm)','zoom');
    this.number(fl,'ISO100 · 최대 출력 GN','gn');
    this.gnDisplayUnit=i.gnUnit;
    this.select(fl,'GN 단위','gnUnit',{m:'m 기준',ft:'ft 기준'},()=>{
      if(i.gnUnit!==this.gnDisplayUnit){
        i.gn=i.gnUnit==='ft'?metresToFeet(i.gn):feetToMetres(i.gn);
        this.syncNumeric('gn');this.gnDisplayUnit=i.gnUnit;
      }
    });
    this.number(fl,'GN이 측정된 줌 (mm)','gnZoom');
    const conditions=this.text(fl,'GN 측정 조건·출처 (ISO100 최대 출력)',i.conditions);
    conditions.dataset.key='conditions';
    this.listen(conditions,'input',()=>{this.plugin.update('conditions',conditions.value);this.changed();});
    this.number(fl,'광량 보정 (EV)','loss');
    const output=node(fl,'details');
    node(output,'summary','출력 단계 직접 설정');
    this.number(output,'사용자 출력 1/n · n','denominator');
    this.number(output,'장비 최소 출력 1/n · n','minDenominator');
    const steps=this.text(output,'지원 출력 분모 (쉼표 구분)',i.steps);steps.dataset.key='steps';
    this.listen(steps,'input',()=>{this.plugin.update('steps',steps.value);this.changed();});
    this.calibrationPanel(fl);
  }
  private saveControls():void {
    const footer=node(this.root,'footer');
    this.saveStatus=node(footer,'p',undefined,'pfm-error');this.saveStatus.setAttribute('role','status');
    this.retry=this.button(footer,'설정 다시 저장',()=>{
      void this.plugin.persist().then(()=>this.plugin.flush()).catch(e=>this.plugin.reportSaveError(e));
    });
    this.retry.className='pfm-retry';this.updateSaveStatus();
    const actions=node(footer,'div',undefined,'pfm-save-actions');
    const save=(label:string,action:()=>Promise<string>,className:string)=>{
      const button=this.button(actions,label,()=>{
        button.disabled=true;
        void action().catch(e=>this.plugin.report(e)).finally(()=>{button.disabled=false;});
      });
      button.className=className;
    };
    save('노트로 저장',()=>this.plugin.saveNote(),'pfm-save');
    if(this.plugin.state.inputs.flashOn)save('치트시트 저장',()=>this.plugin.saveCheatsheet(),'pfm-cheatsheet-save');
  }
  private paintZone(limits?:FocusLimits):void {
    const i=this.plugin.state.inputs;
    const card=node(this.results,'div',undefined,'pfm-zone-result');
    node(card,'h2','존 포커싱');
    const goals=node(card,'div',undefined,'pfm-zone-goals');goals.setAttribute('role','group');goals.setAttribute('aria-label','존 포커싱 목표');
    for(const [goal,label] of [['infinity','∞까지 선명'],['range','구간 옮기기']] as const){
      const button=this.button(goals,label,()=>{
        if(i.zoneGoal===goal)return;
        this.plugin.update('zoneGoal',goal);this.render();
        this.root.querySelector<HTMLButtonElement>(`[data-zone-goal=${goal}]`)?.focus({preventScroll:true});
        void this.plugin.persist().catch(e=>this.plugin.reportSaveError(e));this.plugin.refresh(this);
      });
      button.dataset.zoneGoal=goal;button.setAttribute('aria-pressed',String(i.zoneGoal===goal));
    }
    if(i.zoneGoal==='infinity'){this.paintInfinity(card);return;}
    // 구간 옮기기: 지금 조리개의 선명 구간을 그림에서 끌어 옮기고, 거리링 위치를 읽는다.
    if(!limits){node(card,'p','초점 거리와 조리개를 확인하세요.','pfm-error');return;}
    const ring=i.focusInfinity?Infinity:i.cameraDistance;
    node(card,'p','거리링을 여기에','pfm-zone-eyebrow');
    node(card,'strong',Number.isFinite(ring)?metres(ring):'∞','pfm-zone-solution');
    node(card,'p',`${Number.isFinite(ring)?this.ringText(ring):'링 눈금 ∞'} · f/${fmt(i.aperture)}이면 ${metres(limits.near)} ~ ${Number.isFinite(limits.far)?metres(limits.far):'∞'} 선명`);
    node(card,'p','그림의 선명 구간을 좌우로 끌어 옮기세요. 조리개를 바꾸면 구간 폭이 바뀝니다.','pfm-zone-tip');
  }
  private ringText(distance:number):string {
    return ringLabel(distance,lensFocusMarks(selectedPreset(this.plugin.state,'lenses')));
  }
  /** ∞까지 선명하게: 지금 조리개에서 거리링을 둘 위치(과초점)와 조리개별 표. */
  private paintInfinity(card:HTMLElement):void {
    const i=this.plugin.state.inputs;
    try{
      const r=infinityFocus(i);
      node(card,'p','거리링을 여기에','pfm-zone-eyebrow');
      node(card,'strong',metres(r.ring),'pfm-zone-solution');
      node(card,'p',`${this.ringText(r.ring)} · f/${fmt(r.aperture)}이면 ${metres(r.near)}부터 ∞까지 선명`);
      node(card,'p',`렌즈 심도 눈금을 쓴다면: ∞ 표시를 f/${fmt(r.aperture)} 눈금선에 맞추면 같습니다.`,'pfm-zone-tip');
      if(diffractionRisk(r.aperture,circleOfConfusion(i)))node(card,'p',`f/${fmt(r.aperture)}부터는 회절로 원경 디테일이 무뎌질 수 있어요. 풍경은 보통 f/8~f/11이 타협점입니다.`,'pfm-zone-tip pfm-diffraction-tip');
      const set=!i.focusInfinity&&Math.abs(i.cameraDistance-r.ring)<=r.ring*.005;
      const apply=node(card,'button',set?'초점이 여기에 맞춰져 있음':'초점을 여기에 맞추기');apply.type='button';apply.dataset.zoneApply='true';apply.disabled=set;
      apply.onclick=()=>{
        this.plugin.update('focusInfinity',false);this.plugin.update('cameraDistance',r.ring);
        this.syncNumeric('cameraDistance');this.changed();
      };
      const table=node(card,'details',undefined,'pfm-ring-table');table.open=this.ringTableOpen;
      this.listen(table,'toggle',()=>{this.ringTableOpen=table.open;});
      node(table,'summary','조리개별 거리링 위치');
      const coc=circleOfConfusion(i);
      for(const aperture of this.apertureStops()){
        const row=infinityFocus(i,aperture),soft=diffractionRisk(aperture,coc);
        const button=node(table,'button');button.type='button';button.className='pfm-ring-row';
        const stop=node(button,'span',`f/${fmt(aperture)}`);if(soft){node(stop,'small','회절','pfm-diffraction');button.dataset.diffraction='true';}
        node(button,'strong',metres(row.ring));node(button,'span',`${metres(row.near)}~∞`);
        if(aperture===i.aperture)button.setAttribute('aria-current','true');
        button.setAttribute('aria-label',`f/${fmt(aperture)}: 거리링 ${metres(row.ring)}, ${metres(row.near)}부터 무한대까지 선명${soft?', 회절로 원경 디테일이 무뎌질 수 있음':''}. 누르면 이 조리개로`);
        button.onclick=()=>{this.plugin.update('aperture',aperture);this.syncNumeric('aperture');this.changed();};
      }
    }catch(e){node(card,'p',e instanceof Error?e.message:String(e),'pfm-error');}
  }
  private equipmentPanel(parent:HTMLElement):void {
    const section=node(parent,'details');
    node(section,'summary','장비 프리셋 · 줌별 GN 표');
    const p=node(section,'div',undefined,'pfm-settings');
    const state=this.plugin.state;
    this.button(p,'FlashQ Q20III 추가·선택',()=>{addQ20iii(state);this.changed();this.render();void this.plugin.flush().then(()=>new Notice('Q20III 선택 · 고정 32mm 커버리지 · 제조사 공칭 GN20m')).catch(e=>this.plugin.reportSaveError(e));});
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
    const unit=node(p,'select');unit.setAttribute('aria-label','프리셋 GN 단위');for(const u of ['m','ft']as const){const o=node(unit,'option',`GN 단위 ${u}`);o.value=u;}unit.value=draft.unit;this.listen(unit,'change',()=>{draft.unit=unit.value==='ft'?'ft':'m';saveDraft();});
    const l=node(p,'label',undefined,'pfm-field');node(l,'span','줌mm,GN · 한 줄에 한 측정값');const table=node(l,'textarea');table.placeholder='줌mm,GN';table.rows=5;table.value=draft.table;this.listen(table,'input',()=>{draft.table=table.value;saveDraft();});
    this.button(p,draft.id?'장비 변경 저장':'새 장비 프리셋 저장',()=>{try{
      const e:Equipment={id:draft.id||equipmentId(state.equipment),name:draft.name.trim(),conditions:draft.conditions.trim(),source:draft.source.trim(),table:parseTable(draft.table,draft.unit),minDenominator:parseNumber(draft.minDenominator),steps:draft.steps};
      if(!equipmentValid(e))throw Error('이름·측정 조건·출처·유효한 GN 표와 지원 출력이 필요합니다.');
      const index=state.equipment.findIndex(v=>v.id===e.id);if(index<0)state.equipment.push(e);else state.equipment[index]=e;
      delete state.draft;applyEquipment(state);this.changed();void this.plugin.flush().then(()=>new Notice('장비 저장 완료')).catch(e=>this.plugin.reportSaveError(e));this.render();
    }catch(e){this.plugin.report(e);}});
    this.button(p,'편집 취소 · 초안 비우기',()=>{delete state.draft;this.changed();this.render();});
  }
  private paintFlash():ReturnType<typeof flash>|undefined {
    const i=this.plugin.state.inputs;
    const flashPanel=node(this.results,'div',undefined,'pfm-flash-results');const equipment=selectedEquipment(this.plugin.state);
    if(i.gnMode==='equipment')node(flashPanel,'small',equipment?`${equipment.name} · 사용 가능 줌 ${Object.keys(equipment.table).join(', ')}mm`:'선택 장비 없음 · 장비를 선택하거나 수동 GN으로 전환하세요.');
    try {const f=flash(i);if(!f.supported)node(flashPanel,'p',f.powerLabel,'pfm-warning');node(flashPanel,'p','적정 노출 예상 거리','pfm-eyebrow');const hero=node(flashPanel,'div',undefined,'pfm-hero');const display=distanceParts(f.d);node(hero,'span',display.value,'pfm-value');hero.append(document.createTextNode(' '));node(hero,'span',display.unit,'pfm-unit');
      node(flashPanel,'p',`1/${i.denominator} · f/${fmt(i.aperture)} · ISO ${fmt(i.iso,0)} · GN ${fmt(f.g)}m@${fmt(i.zoom)}mm · ${i.linked?'온카메라':'오프카메라'}`);
      if(i.conditions.includes('연습용 가상 GN'))node(flashPanel,'small','연습용 GN · 실제 장비 사양 아님','pfm-model-note');
      const label=f.ev>i.tolerance?'예상 과다 노출':f.ev< -i.tolerance?'예상 부족 노출':'허용 범위 내';
      node(flashPanel,'p',`${metres(f.r)}에서 ${f.ev>0?'+':''}${fmt(f.ev)} EV · ${label}`,'pfm-ev').dataset.state=f.ev>i.tolerance?'over':f.ev< -i.tolerance?'under':'ok';
      const action=node(flashPanel,'div',undefined,'pfm-output-action');
      // 이미 권장 출력이면 버튼 없이 한 줄만 남긴다.
      const matched=i.denominator===f.nearest;action.dataset.matched=String(matched);
      node(action,'p',`${matched?'권장 출력 1/'+f.nearest+' 사용 중 · 남는 오차':'권장 지원 출력 1/'+f.nearest+' · 적용 후 남는 오차'} ${f.residual>0?'+':''}${fmt(f.residual)} EV${f.status==='장비 출력 범위 안'?'':` · ${f.status}`}`);
      if(!matched){const apply=node(action,'button',`권장 출력 1/${f.nearest} 적용`);apply.type='button';apply.dataset.flashApply='true';apply.onclick=()=>{this.applyOutput(f.nearest);this.root.querySelector<HTMLElement>('[data-flash-undo]')?.focus({preventScroll:true});};}
      if(this.outputUndo){const before=this.outputUndo.before;const undo=node(action,'button',`권장 출력 적용 취소 · 1/${before}로`);undo.type='button';undo.dataset.flashUndo='true';undo.onclick=()=>{this.outputUndo=undefined;this.plugin.update('denominator',before);this.syncNumeric('denominator');this.changed();this.root.querySelector<HTMLElement>('[data-flash-apply]')?.focus({preventScroll:true});};}
      return f;
    }catch(e){node(flashPanel,'p','적정 노출 예상 거리','pfm-eyebrow');node(flashPanel,'div','—','pfm-hero');node(flashPanel,'p',i.gnMode==='equipment'&&!equipment?'선택 장비를 찾을 수 없습니다. 내 장비에서 복구하거나 장비를 다시 선택하세요.':i.gnMode==='equipment'&&i.gn<=0?(equipment?.table[String(i.zoom)]===undefined?`${fmt(i.zoom)}mm 줌의 GN 자료가 없습니다. 이 장비의 사용 가능 줌: ${Object.keys(equipment?.table??{}).join(', ')}mm. 플래시 줌 또는 장비 GN 표를 확인하세요.`:i.conditions):!Number.isFinite(i.gn)||i.gn<=0?'수동 GN이 비었거나 0 이하입니다. ISO100 최대 출력 GN을 입력하세요.':e instanceof Error?e.message:String(e),'pfm-error');const disabled=node(flashPanel,'button','권장 출력 적용 불가');disabled.type='button';disabled.disabled=true;disabled.dataset.flashApply='true';disabled.className='pfm-error-action';const fix=node(flashPanel,'button',i.gnMode==='equipment'&&i.gn<=0?(equipment?'장비 줌·GN 확인':'장비 선택 확인'):'플래시 조건 확인');fix.type='button';fix.className='pfm-error-action';fix.onclick=()=>this.jumpSettings('flash');}
  }
  private paint():void {
    const i=this.plugin.state.inputs;
    this.root.dataset.cocMode=i.cocMode;this.root.dataset.linked=String(i.linked);
    const coc=this.numeric.get('coc');if(coc)coc.input.disabled=i.cocMode!=='custom';
    this.paintGear();
    for(const paintGuide of this.paintGuides)paintGuide();
    this.results.replaceChildren();
    if(this.outputUndo&&this.outputUndo.applied!==i.denominator)this.outputUndo=undefined;
    let flashResult:ReturnType<typeof flash>|undefined;
    if(i.flashOn){
      this.syncFlashControls();
      flashResult=this.paintFlash();
      this.paintCalibration();this.paintFill();
    }
    let focusLimits:FocusLimits|undefined,focusError='';
    try{focusLimits=optics(i);}catch(e){focusError=e instanceof Error?e.message:String(e);}
    if(i.zoneOn)this.paintZone(focusLimits);
    else this.paintDepth(focusLimits,focusError);
    for(const pair of this.numeric.values())pair.updateControls(focusLimits);
    let shown=i,shownLimits=focusLimits;
    if(i.zoneOn&&i.zoneGoal==='infinity'){
      // ∞ 목표에서는 "거리링을 과초점에 두면" 선명해지는 구간을 그린다.
      try{const r=infinityFocus(i);shown={...i,cameraDistance:r.ring,focusInfinity:false};shownLimits=optics(shown);}catch{/* 오류는 존 카드에 표시한다. */}
    }
    // 안전 촬영 구간은 그림과 같은 선명 구간(∞ 목표면 과초점에 둔 심도)으로 계산한다.
    const safe=i.flashOn&&i.linked?safeShootingRange(true,shownLimits,flashResult):undefined;
    if(safe)node(this.results,'p',safeRangeText(safe),'pfm-safe-range').dataset.state=safe.kind;
    this.sceneMax=this.dragMax??sceneUpperLimit(shown,shownLimits?.far);
    diagram(this.picture,shown,this.sceneMax,shownLimits,flashResult,safe);
  }
  private syncFlashControls():void {
    const i=this.plugin.state.inputs;
    this.syncPower();
    for(const direction of ['weaker','stronger'] as const){
      const button=this.powerButtons[direction];
      if(button)button.disabled=nextPower(i,direction)===undefined;
    }
    if(this.linkToggle){
      this.linkToggle.textContent=i.linked?'플래시 거리 연동 · 온카메라':'플래시 거리 독립 · 오프카메라';
      this.linkToggle.setAttribute('aria-pressed',String(i.linked));
    }
    const distance=this.numeric.get('flashDistance');
    if(distance){distance.input.disabled=i.linked;if(distance.range)distance.range.disabled=i.linked;}
    for(const key of ['gn','gnZoom','minDenominator'] as const)
      if(document.activeElement!==this.numeric.get(key)?.input)this.syncNumeric(key);
    for(const key of ['gnMode','gnUnit','conditions','steps'] as const){
      const control=this.root.querySelector<HTMLInputElement|HTMLSelectElement>(`[data-key=${key}]`);
      if(control&&document.activeElement!==control)control.value=i[key];
    }
    this.gnDisplayUnit=i.gnUnit;
  }
  private paintDepth(limits:FocusLimits|undefined,error:string):void {
    const card=node(this.results,'div',undefined,'pfm-dof-results');
    node(card,'h2','선명하게 나오는 거리');
    if(!limits){node(card,'p',error,'pfm-error');return;}
    // 네 칸 대신 "시작 — 끝" 한 줄과 범위 한 줄로 줄인다. 과초점은 버튼 하나로 합친다.
    const range=node(card,'div',undefined,'pfm-dof-range');
    for(const [key,label,value] of [['near','시작',limits.near],['far','끝',limits.far]] as const){
      const stat=node(range,'div',undefined,'pfm-stat');
      stat.dataset.stat=key;node(stat,'span',label);node(stat,'strong',metres(value));
      if(key==='near')node(range,'span','—','pfm-dof-dash');
    }
    const total=node(card,'p',undefined,'pfm-stat pfm-dof-total');total.dataset.stat='total';
    node(total,'span','범위 ');node(total,'strong',metres(limits.total));
    if(limits.total<FACE_DEPTH)node(card,'p',`얼굴 앞뒤(약 ${metres(FACE_DEPTH)})보다 얕아요 · 가까운 눈에 초점을 맞추세요.`,'pfm-shallow');
    // 과초점: 이 거리에 초점을 맞추면 그 절반 거리부터 무한대까지 선명하다.
    const bar=node(card,'div',undefined,'pfm-dof-bar');
    const focus=node(bar,'button',Number.isFinite(limits.hyperfocal)?`∞까지 선명하게 · ${metres(limits.hyperfocal)}에 맞추기`:'∞까지 선명하게');
    focus.type='button';focus.dataset.pfmHyperfocal='true';focus.dataset.stat='hyperfocal';
    focus.setAttribute('aria-label',Number.isFinite(limits.hyperfocal)?`과초점 ${metres(limits.hyperfocal)}에 맞추기: 약 ${metres(limits.hyperfocal/2)}부터 무한대까지 선명`:'과초점에 맞추기');
    focus.onclick=()=>{
      this.focusHyperfocal();
      this.results.querySelector<HTMLButtonElement>('[data-pfm-hyperfocal]')?.focus({preventScroll:true});
    };
  }
}
