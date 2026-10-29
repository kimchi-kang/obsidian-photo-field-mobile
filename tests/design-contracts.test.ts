import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
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
 for(const match of source.matchAll(/([^{}]+)\{/g)){const selector=match[1].trim();if(selector.startsWith('@'))continue;for(const branch of selector.split(/,(?![^()]*\))/)){assert.match(branch,/\.pfm-(root|container)\b/,branch);}}
 assert.doesNotMatch(source,/@import|https?:\/\//i);
});
