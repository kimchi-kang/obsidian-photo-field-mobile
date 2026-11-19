import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const view=readFileSync(new URL('../src/view.ts',import.meta.url),'utf8');
const withoutFontFaces=(source:string)=>source.replace(/@font-face\s*\{[^{}]*\}/g,'');
function body(selector:string):string {const at=css.indexOf(selector+'{');assert.ok(at>=0,selector);return css.slice(at+selector.length+1,css.indexOf('}',at));}
function tokens(selector:string):Record<string,string>{return Object.fromEntries([...body(selector).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));}
function luminance(hex:string):number {const raw=hex.replace('#','');const full=raw.length===3?[...raw].map(c=>c+c).join(''):raw;assert.match(full,/^[\da-f]{6}$/i);const channel=(offset:number)=>{const n=parseInt(full.slice(offset,offset+2),16)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;};return channel(0)*.2126+channel(2)*.7152+channel(4)*.0722;}
function contrast(a:string,b:string):number {const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function variable(block:string,property:string):string {const escaped=property.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const match=block.match(new RegExp('(?:^|;)'+escaped+':[^;]*var\\((--[\\w-]+)\\)'));assert.ok(match,property+' in '+block);return match[1];}

test('important control edges meet 3:1 on the actual light/dark surface tokens',()=>{
 const controls=[['.pfm-root button','border','--pfm-surface'],['.pfm-root .pfm-dof-bar button','border-color','--pfm-bg'],['.pfm-root input:not([type=checkbox]),.pfm-root textarea,.pfm-root select','border','--pfm-surface'],['.pfm-root input[type=range]::-webkit-slider-runnable-track','background','--pfm-bg'],['.pfm-root input[type=range]::-moz-range-track','background','--pfm-bg']];
 for(const theme of ['light','dark']){const t={...tokens('.pfm-root'),...tokens(`.theme-${theme} .pfm-root`)};for(const [selector,property,bg]of controls){const color=variable(body(selector),property);assert.ok(contrast(t[color],t[bg])>=3,`${theme} ${selector}: ${contrast(t[color],t[bg]).toFixed(2)}:1`);}}
});
test('body, error, warning, primary action and focus colors meet their numeric contrast thresholds',()=>{
 for(const theme of ['light','dark']){const t={...tokens('.pfm-root'),...tokens(`.theme-${theme} .pfm-root`)};for(const [fg,bg,minimum]of [['--pfm-ink','--pfm-bg',4.5],['--pfm-muted','--pfm-bg',4.5],['--pfm-error','--pfm-bg',4.5],['--pfm-warning','--pfm-warning-bg',4.5],['--pfm-accent-ink','--pfm-accent',4.5],['--pfm-accent','--pfm-bg',3]] as const){assert.ok(contrast(t[fg],t[bg])>=minimum,`${theme} ${fg}/${bg}`);}}
});
test('every plugin CSS selector remains scoped and contains no remote asset import',()=>{
 const source=css.replace(/\/\*[\s\S]*?\*\//g,'');
 for(const match of withoutFontFaces(source).matchAll(/([^{}]+)\{/g)){const selector=match[1].trim();if(selector.startsWith('@'))continue;for(const branch of selector.split(/,(?![^()]*\))/)){assert.match(branch,/\.pfm-(root|container)\b/,branch);}}
 assert.doesNotMatch(source,/@import|https?:\/\//i);
});
test('선택자 검사에서 내장 글꼴 블록만 제외한다',()=>{
 const rule='.pfm-root .example{display:none;}';
 const font='@font-face {font-family:test;src:url(data:font/woff2;base64,AAAA);}';
 assert.equal(withoutFontFaces(font+rule+font),rule);
});
test('사용자 지정 CoC 모드에서만 CoC 필드를 표시한다',()=>{
 assert.match(view,/this\.root\.dataset\.cocMode=i\.cocMode/);
 assert.match(body('.pfm-root:not([data-coc-mode=custom]) [data-field=coc]'),/display:none/);
});
test('370px 이하에서 카메라 거리의 5열 그리드를 줄인다',()=>{
 const selector='.pfm-root div.pfm-field[data-field=cameraDistance]';
 const wide=selector+'{grid-template-columns:44px minmax(0,1fr) 92px 44px 44px;}';
 const narrow='@media(max-width:370px){'+selector+'{grid-template-columns:44px minmax(0,1fr) 80px 44px 44px;}}';
 assert.ok(css.includes(wide));
 assert.ok(css.lastIndexOf(narrow)>css.lastIndexOf(wide));
});

test('야간 팔레트가 라이트·다크의 주요 색과 플래시 카드 반전색을 덮어쓴다',()=>{
 const source=withoutFontFaces(css);
 const selector='.pfm-root[data-night=true]';
 assert.ok(source.indexOf(selector+'{')>source.indexOf('.theme-dark .pfm-root{'));
 assert.ok(source.indexOf(selector+' .pfm-flash-results{')>source.indexOf('.theme-dark .pfm-root .pfm-flash-results{'));
 const night=tokens(selector),card=tokens(selector+' .pfm-flash-results');
 assert.equal(night['--pfm-bg'],'#000');
 for(const token of ['ink','muted','line','control-line','surface','surface-2','accent','accent-ink','dof','beam','error','warning','warning-bg','ok','signal','lcd','lcd-dot']) {
   const color=night['--pfm-'+token];
   assert.match(color,/^#(?:000|[\da-f]{6}(?:[\da-f]{2})?)$/i,token);
   if(color==='#000')continue;
   const red=parseInt(color.slice(1,3),16),green=parseInt(color.slice(3,5),16),blue=parseInt(color.slice(5,7),16);
   assert.ok(red<=184&&red>green&&green>=blue,token);
 }
 for(const token of Object.keys(tokens('.theme-dark .pfm-root .pfm-flash-results')))assert.equal(card[token],'inherit',token);
 assert.equal(night['--pfm-signal-pressed'],'var(--pfm-signal)');
 assert.match(body('.pfm-root .pfm-mode-toggles button'),/min-width:44px/);
 assert.match(body('.pfm-root .pfm-mode-toggles button'),/min-height:44px/);
 assert.match(view,/this\.root\.dataset\.night=String\(i\.nightMode\)/);
 assert.match(view,/night\.setAttribute\('aria-pressed',String\(i\.nightMode\)\)/);
});

test('모드 토글 위 장비 칩 3개는 44px 이상이며 한 줄 값은 말줄임 처리한다',()=>{
 const chip=body('.pfm-root .pfm-gear-chip');
 assert.match(chip,/min-width:44px/);
 assert.match(chip,/min-height:44px/);
 assert.match(body('.pfm-root .pfm-gear-chips'),/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(body('.pfm-root .pfm-gear-chip strong'),/overflow:hidden;text-overflow:ellipsis;white-space:nowrap/);
 assert.match(body('.pfm-root .pfm-gear-option'),/min-height:44px/);
 assert.match(view,/this\.gearBar\(\);\s+const modes=node\(this\.root,'div',undefined,'pfm-mode-toggles'\)/);
 assert.doesNotMatch(view,/pfm-context/);
 assert.doesNotMatch(withoutFontFaces(css),/pfm-context|content:['"]STATUS['"]/);
});
