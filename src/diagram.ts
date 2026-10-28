import {Inputs} from './model';
import {optics,flash,coverage} from './engine';
import {metres,fmt} from './units';
const ns='http://www.w3.org/2000/svg';
let nextId=0;
export function diagram(host:HTMLElement,i:Inputs):void {
  host.replaceChildren();
  if(!Number.isFinite(i.diagramMax)||i.diagramMax<=0)return;
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 320 230');svg.setAttribute('role','img');svg.setAttribute('aria-label','카메라 심도와 플래시 노출 거리의 독립 축 도식. 실제 배광 지도가 아닙니다.');host.append(svg);
  function el(tag:string,attrs:Record<string,string|number>,text?:string,parent:Element=svg):SVGElement {
    const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text)n.textContent=text;parent.append(n);return n;
  }
  const id=`pfm-hatch-${++nextId}`;
  const defs=el('defs',{}),pat=el('pattern',{id,width:6,height:6,patternUnits:'userSpaceOnUse'},undefined,defs);
  el('path',{d:'M0 6 L6 0',stroke:'currentColor','stroke-width':1},undefined,pat);
  const x=(d:number)=>20+280*Math.max(0,Math.min(d/i.diagramMax,1));
  const marker=(d:number,y:number)=>el('line',{x1:x(d),x2:x(d),y1:y-15,y2:y+15,stroke:'var(--text-accent)','stroke-width':2});
  el('text',{x:20,y:16},`독립 거리 축 · 0 → ${metres(i.diagramMax)}`);
  try {const o=optics(i);el('text',{x:20,y:38},'카메라: 초점·심도');
    el('line',{x1:20,x2:300,y1:66,y2:66,stroke:'currentColor'});
    el('rect',{x:x(o.near),y:51,width:Math.max(0,x(o.far)-x(o.near)),height:30,fill:`url(#${id})`});marker(i.cameraDistance,66);
    el('text',{x:20,y:99},`심도 ${o.near>i.diagramMax?'→ ':''}${metres(o.near)} ~ ${o.far>i.diagramMax&&o.far!==Infinity?'→ ':''}${metres(o.far)}`);
  }catch{el('text',{x:20,y:66},'심도 입력을 확인하세요.');}
  try {const f=flash(i);el('text',{x:20,y:124},'플래시: 과다 / 빗금=허용 / 부족');
    el('rect',{x:20,y:136,width:x(f.low)-20,height:28,fill:'var(--color-orange)','fill-opacity':0.25,stroke:'currentColor','stroke-dasharray':'2 3'});
    el('rect',{x:x(f.low),y:136,width:x(f.high)-x(f.low),height:28,fill:`url(#${id})`});
    el('rect',{x:x(f.high),y:136,width:300-x(f.high),height:28,fill:'var(--color-blue)','fill-opacity':0.2,stroke:'currentColor','stroke-dasharray':'6 3'});marker(f.r,150);
    el('text',{x:20,y:186},`허용 ${f.low>i.diagramMax?'→ ':''}${metres(f.low)} ~ ${f.high>i.diagramMax?'→ ':''}${metres(f.high)}`);
    el('text',{x:20,y:207},`적정 ${f.d>i.diagramMax?'→ ':''}${metres(f.d)} · 피사체 ${f.r>i.diagramMax?'→ ':''}${metres(f.r)}`);
  }catch{el('text',{x:20,y:155},'플래시: 계산할 수 없는 조건');}
  // Angular shapes are separate, normalized geometry; never an irradiance heat map.
  try {const c=coverage(i);const geometry=document.createElementNS(ns,'svg');geometry.setAttribute('viewBox','0 0 320 160');geometry.setAttribute('role','img');geometry.setAttribute('aria-label',i.linked?'같은 위치와 방향에서 수평 화각 및 조사각 원뿔 비교':'화각과 조사각의 정규화된 독립 도식, 위치 중첩 비교 아님');host.append(geometry);
    const cam=Math.tan(angleHalf(i.width,i.focal)),beam=Math.tan(c.h*Math.PI/360),scale=45/Math.max(cam,beam);
    const cone=(s:number,cl:string,origin:number)=> {const n=document.createElementNS(ns,'path');n.setAttribute('d',`M20 ${origin} L300 ${origin-s*scale} L300 ${origin+s*scale} Z`);n.setAttribute('class',cl);geometry.append(n);};
    if(i.linked){cone(cam,'pfm-camera-cone',75);cone(beam,'pfm-flash-cone',75);}else {cone(cam,'pfm-camera-cone',45);cone(beam,'pfm-flash-cone',110);}
    const label=document.createElementNS(ns,'text');label.setAttribute('x','20');label.setAttribute('y','155');label.textContent=i.linked?'실선=카메라 · 점선=플래시 (균일 광량 아님)':'독립 정규화 원뿔 · 정확한 공간 중첩 아님';geometry.append(label);
    const p=document.createElement('p');p.textContent=`수평 조사각 ${fmt(c.h)}° · 수직 ${fmt(c.v)}°. ${i.coverage==='approx'?'풀프레임 커버리지 가정. 제조사 자료 아님.':'수동 조사각.'}`;host.append(p);
  }catch{/* Text errors are reported in the results panel. */}
}
function angleHalf(size:number,f:number):number{return Math.atan(size/(2*f));}
