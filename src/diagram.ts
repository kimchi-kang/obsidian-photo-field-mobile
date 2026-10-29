/* Original scene concept: jherr/depth-of-field (MIT, Jack Herrington).
 * All geometry and figure symbols below are newly authored; no original asset paths are reused. */
import {Inputs} from './model';
import {optics,flash,coverage} from './engine';
import {zoneTarget} from './zone';
import {metres,fmt} from './units';
const ns='http://www.w3.org/2000/svg';
export const SCENE={width:400,start:54,end:382};
let nextId=0;
export function sceneDistance(x:number,max:number,focal:number):number {
  return Math.max(focal/1000+0.001,Math.min(max,(x-SCENE.start)/(SCENE.end-SCENE.start)*max));
}
export function diagram(host:HTMLElement,i:Inputs):void {
  host.replaceChildren();
  if(!Number.isFinite(i.diagramMax)||i.diagramMax<=0){const p=document.createElement('p');p.textContent='그림 최대 거리를 양수로 입력하세요.';host.append(p);return;}
  const showDof=i.tab!=='flash',showFlash=i.tab!=='dof'&&i.tab!=='zone';
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 400 ${showFlash?260:212}`);svg.setAttribute('role','group');svg.setAttribute('aria-label','카메라와 피사체, 렌즈 화각과 심도를 함께 보는 촬영 장면');svg.dataset.scene='true';host.append(svg);
  function el(tag:string,attrs:Record<string,string|number>,text?:string,parent:Element=svg):SVGElement {
    const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;parent.append(n);return n;
  }
  const id=`pfm-scene-${++nextId}`,defs=el('defs',{}),clip=el('clipPath',{id:id+'-clip'},undefined,defs);
  el('rect',{x:SCENE.start,y:24,width:SCENE.end-SCENE.start,height:140},undefined,clip);
  const pattern=el('pattern',{id:id+'-hatch',width:7,height:7,patternUnits:'userSpaceOnUse'},undefined,defs);
  el('path',{d:'M0 7 L7 0',stroke:'var(--text-accent)','stroke-width':1.2},undefined,pattern);
  const x=(d:number)=>SCENE.start+(SCENE.end-SCENE.start)*Math.max(0,Math.min(d/i.diagramMax,1));
  const out=(d:number)=>`${d>i.diagramMax&&Number.isFinite(d)?'→ ':''}${metres(d)}`;
  const cone=(degrees:number,cl:string)=>{const half=(SCENE.end-SCENE.start)*Math.tan(degrees*Math.PI/360);el('path',{d:`M${SCENE.start} 92 L${SCENE.end} ${92-half} L${SCENE.end} ${92+half} Z`,class:cl,'clip-path':`url(#${id}-clip)`});};
  try {
    const o=optics(i);cone(o.vertical,'pfm-camera-cone');
    if(showDof){
      el('rect',{x:x(o.near),y:24,width:Math.max(0,x(o.far)-x(o.near)),height:140,class:'pfm-dof-zone'});
      for(const d of [o.near,o.far])el('line',{x1:x(d),x2:x(d),y1:24,y2:164,class:'pfm-dof-limit'});
    }
  }catch{el('text',{x:70,y:65},'렌즈·초점 입력을 확인하세요.');}
  if(i.tab==='zone'&&i.zoneFlow==='target')try{const t=zoneTarget(i);el('rect',{x:x(t.near),y:145,width:Math.max(0,x(t.far)-x(t.near)),height:13,fill:`url(#${id}-hatch)`,class:'pfm-target-zone'});el('text',{x:SCENE.start,y:57,class:'pfm-axis-label'},'목표 구간 · 빗금');}catch{/* Target errors appear in the zone result. */}
  if(showFlash&&i.linked)try{cone(coverage(i).v,'pfm-flash-cone');}catch{/* Coverage errors remain visible in the result details. */}
  el('line',{x1:4,x2:390,y1:164,y2:164,class:'pfm-ground'});
  // Photographer and camera are symbols rather than life-size or licensed illustrations.
  const photographer=el('g',{class:'pfm-person'});
  el('circle',{cx:24,cy:75,r:8},undefined,photographer);
  el('path',{d:'M22 88 L15 116 L9 151 M15 116 L31 151 M22 91 L36 99 L42 87',fill:'none',stroke:'currentColor','stroke-width':9,'stroke-linecap':'round','stroke-linejoin':'round'},undefined,photographer);
  el('rect',{x:35,y:80,width:17,height:13,rx:2},undefined,photographer);el('rect',{x:49,y:83,width:7,height:7},undefined,photographer);
  el('text',{x:6,y:16,class:'pfm-scene-lens'},`${fmt(i.focal)} mm · f/${fmt(i.aperture)}`);
  const subject=x(Number.isFinite(i.cameraDistance)&&i.cameraDistance>0?i.cameraDistance:0);
  el('line',{x1:subject,x2:subject,y1:24,y2:180,class:'pfm-focus-line'});
  const person=el('g',{transform:`translate(${subject},0)`,class:'pfm-person pfm-subject','data-pfm-subject':'true',tabindex:0,role:'slider','aria-label':'피사체 거리 · 좌우 드래그 또는 화살표 키로 조절','aria-valuenow':Number.isFinite(i.cameraDistance)?i.cameraDistance:0,'aria-valuemin':Number.isFinite(i.focal)?i.focal/1000+0.001:0.001,'aria-valuemax':Math.max(i.diagramMax,Number.isFinite(i.cameraDistance)?i.cameraDistance:0),'aria-valuetext':metres(i.cameraDistance)});
  el('rect',{x:-26,y:68,width:52,height:102,fill:'transparent'},undefined,person);
  el('circle',{cx:0,cy:82,r:8},undefined,person);
  el('path',{d:'M0 96 L0 129 M-13 113 L0 100 L13 113 M0 129 L-10 155 M0 129 L10 155',fill:'none',stroke:'currentColor','stroke-width':9,'stroke-linecap':'round','stroke-linejoin':'round'},undefined,person);
  el('circle',{cx:0,cy:177,r:5,class:'pfm-focus-dot'},undefined,person);
  el('text',{x:Math.max(92,Math.min(subject,340)),y:38,'text-anchor':'middle',class:'pfm-subject-label'},`${i.tab==='zone'?'초점':'피사체'} ${i.cameraDistance>i.diagramMax?'→ 그림 밖':out(i.cameraDistance)}`);
  el('line',{x1:SCENE.start,x2:SCENE.end,y1:192,y2:192,class:'pfm-distance-axis'});
  for(let n=0;n<=4;n++){const d=i.diagramMax*n/4;el('line',{x1:x(d),x2:x(d),y1:189,y2:195,class:'pfm-distance-axis'});el('text',{x:x(d),y:208,'text-anchor':n===4?'end':'middle',class:'pfm-axis-label'},`${fmt(d,1)}m`);}
  if(showFlash)try{
    const f=flash(i);const y=228;
    el('rect',{x:SCENE.start,y,width:x(f.low)-SCENE.start,height:12,class:'pfm-over-zone'});
    el('rect',{x:x(f.low),y,width:x(f.high)-x(f.low),height:12,fill:`url(#${id}-hatch)`});
    el('rect',{x:x(f.high),y,width:SCENE.end-x(f.high),height:12,class:'pfm-under-zone'});
    el('line',{x1:x(f.r),x2:x(f.r),y1:y-5,y2:y+17,class:'pfm-flash-marker'});
    el('text',{x:SCENE.start,y:257,class:'pfm-axis-label'},`${i.linked?'플래시':'플래시 독립 거리 축'} · 허용 ${out(f.low)} ~ ${out(f.high)}`);
  }catch{el('text',{x:SCENE.start,y:243,class:'pfm-axis-label'},'플래시 거리: 현재 조건에서 계산 불가');}
  const legend=document.createElement('figcaption');legend.className='pfm-scene-legend';
  const items=[['pfm-key-camera','카메라 화각'],...(showDof?[['pfm-key-dof','실제 심도 · 실선']]:[]),...(i.tab==='zone'&&i.zoneFlow==='target'?[['pfm-key-target','목표 구간 · 빗금']]:[]),...(showFlash&&i.linked?[['pfm-key-flash','플래시 조사각']]:[])];
  for(const [cls,text]of items){const label=document.createElement('span');label.className=cls;label.textContent=text;legend.append(label);}host.append(legend);
  if(i.tab==='zone'&&i.zoneFlow==='target')try{const t=zoneTarget(i),p=document.createElement('p');p.className='pfm-scene-note';p.textContent=`목표 구간 · 빗금 ${out(t.near)} ~ ${out(t.far)} · 실제 심도는 실선`;host.append(p);}catch{/* Errors are shown by the zone panel. */}
  const hint=document.createElement('p');hint.className='pfm-scene-hint';hint.textContent='피사체 드래그 · 거리 직접 입력';host.append(hint);
  if(showFlash){const p=document.createElement('p');p.className='pfm-scene-note';p.textContent=i.linked?'플래시 띠: 점선=과다 · 빗금=허용 · 파선=부족 (배광 아님)':'오프카메라: 위치·방향 미입력. 플래시 거리와 카메라 장면은 독립 계산입니다.';host.append(p);}
  try{const o=optics(i);if(showDof&&(o.near>i.diagramMax||o.far>i.diagramMax)){const p=document.createElement('p');p.className='pfm-scene-note';p.textContent=`그림 밖 심도: ${out(o.near)} ~ ${out(o.far)}`;host.append(p);}}catch{/* Result details report the input error. */}
}
