import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,writeFile,mkdtemp,mkdir} from 'node:fs/promises';
import {existsSync,statSync} from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
const out='docs/post-design-validation';await mkdir(out,{recursive:true});
const source=await readFile('main.js','utf8'),manifest=JSON.parse(await readFile('manifest.json','utf8'));
const directory=await mkdtemp('/private/tmp/photo-field-code-validation-');
const results=[],errors=[],notices=[],timers=new Set(),bindings=new Set(),registrations=new Map();
let storageFailure=false,noteFailure=false,settingsWrites=0,noteWrites=0;
const normalize=x=>JSON.parse(JSON.stringify(x));
class TFolder{constructor(p){this.path=p;}}
class Notice{constructor(text){this.text=text;this.hidden=false;notices.push(this);}hide(){this.hidden=true;}}
class Plugin{
 constructor(app){this.app=app;this.manifest=manifest;this.cleanup=[];}
 async loadData(){try{return JSON.parse(await readFile(path.join(directory,'data.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 async saveData(data){if(storageFailure)throw Error('Synthetic settings I/O failure');await writeFile(path.join(directory,'data.json'),JSON.stringify(data));settingsWrites++;}
 registerDomEvent(target,type,callback){target.addEventListener(type,callback);const record={target,type,callback};bindings.add(record);this.cleanup.push(()=>{target.removeEventListener(type,callback);bindings.delete(record);});}
 registerView(type,factory){registrations.set(type,factory);this.cleanup.push(()=>registrations.delete(type));}
 addCommand(){}addRibbonIcon(){}
 async unload(){this.onunload();await this.flush();for(const clean of this.cleanup)clean();}
}
const app={workspace:{getLeavesOfType:()=>[],detachLeavesOfType:()=>{}},vault:{
 getAbstractFileByPath(p){const f=path.join(directory,p);if(!existsSync(f))return null;return statSync(f).isDirectory()?new TFolder(p):{path:p};},
 async createFolder(p){await mkdir(path.join(directory,p));},
 async create(p,text){if(noteFailure)throw Error('Synthetic note I/O failure');await writeFile(path.join(directory,p),text,{flag:'wx'});noteWrites++;return {path:p};}
}};
const exports={};const document=new EventTarget();document.visibilityState='visible';const window=new EventTarget();window.setTimeout=setTimeout;
const context={module:{exports},exports,require(name){assert.equal(name,'obsidian');return {Plugin,ItemView:class{},Notice,TFolder,normalizePath:p=>p.replaceAll('\\','/')};},console:{error(...items){errors.push(items.map(String).join(' '));}},document,window,Date,AbortController,
 setTimeout(fn,delay){const id=setTimeout(()=>{timers.delete(id);fn();},delay);timers.add(id);return id;},clearTimeout(id){timers.delete(id);clearTimeout(id);}};
vm.runInNewContext(source,context,{filename:'main.js'});const PhotoPlugin=context.module.exports.default;
const load=async()=>{const p=new PhotoPlugin(app);await p.onload();return p;};
const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:String(e)});console.log('FAIL '+name+': '+e.message);}};
let p=await load();let measurement;
try{
 await check('actual bundle exports correct GN40/ISO100/f4 full/quarter distance and double-distance EV to Markdown',async()=>{
  p.update('denominator',1);let file=await p.saveNote();let md=await readFile(path.join(directory,file),'utf8');assert.match(md,/적정 노출 예상 거리: 10 m/);
  p.update('denominator',4);p.update('cameraDistance',10);p.update('flashDistance',10);file=await p.saveNote();md=await readFile(path.join(directory,file),'utf8');assert.match(md,/적정 노출 예상 거리: 5 m/);assert.match(md,/노출 차이: -2 EV/);assert.match(md,/Copyright \(c\) 2026 Jack Herrington/);
 });
 await check('aperture changes both optical/flash note results and fixed GN is independent of focal length',async()=>{
  const original=normalize(p.state.inputs);try{p.update('cameraDistance',5);p.update('flashDistance',5);let f=await p.saveNote();const first=await readFile(path.join(directory,f),'utf8');p.update('aperture',8);f=await p.saveNote();const second=await readFile(path.join(directory,f),'utf8');assert.match(first,/적정 노출 예상 거리: 5 m/);assert.match(second,/적정 노출 예상 거리: 2.5 m/);assert.notEqual(first.match(/심도 근거리[^\n]+/)[0],second.match(/심도 근거리[^\n]+/)[0]);p.update('focal',100);f=await p.saveNote();assert.match(await readFile(path.join(directory,f),'utf8'),/적정 노출 예상 거리: 2.5 m/);}finally{Object.assign(p.state.inputs,original);}
 });
 await check('offcamera camera/flash distance planes and EV remain independent in actual bundle notes',async()=>{
  const original=normalize(p.state.inputs);try{p.update('linked',false);p.update('cameraDistance',10);p.update('flashDistance',5);let f=await p.saveNote();let md=await readFile(path.join(directory,f),'utf8');assert.match(md,/노출 차이: 0 EV/);assert.match(md,/위치·방향 미입력, 공간 중첩 비교 불가/);p.update('cameraDistance',7);f=await p.saveNote();md=await readFile(path.join(directory,f),'utf8');assert.match(md,/노출 차이: 0 EV/);p.update('flashDistance',10);f=await p.saveNote();assert.match(await readFile(path.join(directory,f),'utf8'),/노출 차이: -2 EV/);}finally{Object.assign(p.state.inputs,original);}
 });
 await check('hyperfocal infinity and finite out-of-diagram depth stay distinct in exported results',async()=>{
  const original=normalize(p.state.inputs);try{const coc=Math.hypot(36,24)/1500,H=(50*50/(4*coc)+50)/1000;p.update('cameraDistance',H);let f=await p.saveNote();assert.match(await readFile(path.join(directory,f),'utf8'),/^- 심도 근거리[^\n]+원거리 ∞/m);p.update('cameraDistance',10);p.update('diagramMax',3);f=await p.saveNote();const md=await readFile(path.join(directory,f),'utf8');assert.doesNotMatch(md,/^- 심도 근거리[^\n]+원거리 ∞/m);assert.match(md,/^- 심도 근거리 6.85 m \/ 원거리 18.49 m \/ 전체 11.64 m/m);}finally{Object.assign(p.state.inputs,original);}
 });
 await check('inactive numeric blanks export as unused, active optical errors create no note',async()=>{
  const original=normalize(p.state.inputs);try{p.update('flashDistance',NaN);p.update('coc',NaN);p.update('horizontal',NaN);p.update('vertical',NaN);const f=await p.saveNote();const md=await readFile(path.join(directory,f),'utf8');assert.match(md,/미사용/);assert.doesNotMatch(md,/NaN/);const before=noteWrites;p.update('aperture',NaN);await assert.rejects(p.saveNote());assert.equal(noteWrites,before);}finally{Object.assign(p.state.inputs,original);}
 });
 await check('partial DOF note accepts unsupported flash but full note creates no false result',async()=>{
  p.update('mode','hss');p.update('gn',0);const before=noteWrites;await assert.rejects(p.saveNote());assert.equal(noteWrites,before);const f=await p.saveNote('dof');const md=await readFile(path.join(directory,f),'utf8');assert.match(md,/저장 범위: 현재 탭 · 심도·화각/);assert.match(md,/심도 근거리/);assert.doesNotMatch(md,/적정 노출 예상 거리:|플래시 조사 범위|NaN/);p.update('mode','manual');p.update('gn',40);
 });
 await check('12 concurrent notes preserve existing sentinel and create unique physical Markdown files',async()=>{
  const sentinel=path.join(directory,'사진 촬영 계산','keep.md');await writeFile(sentinel,'DO NOT OVERWRITE');const files=await Promise.all(Array.from({length:12},()=>p.saveNote()));assert.equal(new Set(files).size,12);assert.equal(await readFile(sentinel,'utf8'),'DO NOT OVERWRITE');for(const f of files)assert.ok((await readFile(path.join(directory,f),'utf8')).includes('저장 범위: 전체 계산'));
 });
 await check('note write rejects without success Notice and next request recovers',async()=>{
  const before=notices.length;noteFailure=true;await assert.rejects(p.saveNote(),/Synthetic note/);assert.equal(notices.length,before);noteFailure=false;const f=await p.saveNote();assert.ok(existsSync(path.join(directory,f)));assert.match(notices.at(-1).text,/저장 완료/);
 });
 await check('120 actual plugin persistence requests coalesce to one write and preserve last finite value',async()=>{
  const before=settingsWrites,start=performance.now();const jobs=[];for(let i=0;i<120;i++){p.update('cameraDistance',2+i/10);p.update('flashDistance',2+i/10);jobs.push(p.persist());}p.update('cameraDistance',NaN);p.update('flashDistance',NaN);jobs.push(p.persist());await p.flush();await Promise.all(jobs);const saved=await p.loadData();assert.equal(saved.inputs.cameraDistance,13.9);assert.equal(saved.inputs.flashDistance,13.9);assert.equal(settingsWrites-before,1);measurement={requests:121,writes:settingsWrites-before,elapsedMs:performance.now()-start,lastValue:saved.inputs.cameraDistance,scope:'Node + actual plugin writer + filesystem host double; not UI or phone performance'};
 });
 await check('settings failure retains last disk snapshot and explicit retry saves latest value',async()=>{
  const saved=await p.loadData();storageFailure=true;p.update('iso',320);const job=p.persist();const rejection=assert.rejects(job,/Synthetic settings/);await assert.rejects(p.flush(),/Synthetic settings/);await rejection;assert.match(p.saveError,/저장 실패/);assert.equal((await p.loadData()).inputs.iso,saved.inputs.iso);storageFailure=false;const retry=p.persist();await p.flush();await retry;assert.equal(p.saveError,'');assert.equal((await p.loadData()).inputs.iso,320);
 });
 await check('pagehide listener flushes the current pending snapshot',async()=>{
  p.update('iso',250);const job=p.persist();window.dispatchEvent(new Event('pagehide'));await job;assert.equal((await p.loadData()).inputs.iso,250);
 });
 await check('20 plugin unload/reactivation cycles leave no registered listeners or writer timers',async()=>{
  for(let i=0;i<20;i++){p.update('iso',200+i);const job=p.persist();await p.unload();await job;assert.equal(bindings.size,0);assert.equal(registrations.size,0);assert.equal(timers.size,0);p=await load();assert.equal(p.state.inputs.iso,200+i);assert.equal(bindings.size,2);assert.equal(registrations.size,1);}
 });
 await check('v1 migration preserves entire original, gear contents and manual GN before v2 save/restore',async()=>{
  await p.unload();const legacy={version:1,inputs:{gn:17,iso:200,aperture:8},equipment:[{name:'Synthetic gear',conditions:'ISO100 direct test',source:'test only',table:{50:40},steps:'1,2,4,8,16',minDenominator:16}]};await writeFile(path.join(directory,'data.json'),JSON.stringify(legacy));p=await load();assert.equal(p.state.version,2);assert.deepEqual(normalize(p.state.migrationBackup),legacy);assert.equal(p.state.inputs.gn,17);assert.equal(p.state.inputs.gnMode,'manual');assert.equal(p.state.equipment[0].id,'legacy-1');const job=p.persist();await p.flush();await job;await p.unload();p=await load();assert.deepEqual(normalize(p.state.migrationBackup),legacy);assert.equal(p.state.inputs.gn,17);assert.equal(p.state.equipment[0].source,'test only');
 });
 await check('equipment selection and incomplete draft survive actual plugin save/reload',async()=>{
  p.state.inputs.gnMode='equipment';p.state.inputs.equipmentId='legacy-1';p.update('zoom',50);p.state.draft={id:'legacy-1',name:'Incomplete synthetic draft',conditions:'test only',source:'not manufacturer data',table:'50,',unit:'m',minDenominator:'16',steps:'1,2,4,8,16'};const job=p.persist();await p.flush();await job;await p.unload();p=await load();assert.equal(p.state.inputs.equipmentId,'legacy-1');assert.equal(p.state.inputs.gn,40);assert.equal(p.state.draft.table,'50,');p.update('zoom',105);assert.equal(p.state.inputs.gn,0);await assert.rejects(p.saveNote(),/GN 자료 없음/);
 });
 await check('selected equipment unsupported output is explicitly theoretical with matching GN source',async()=>{
  p.update('zoom',50);p.update('iso',100);p.update('aperture',4);p.update('cameraDistance',5);p.update('flashDistance',5);p.update('denominator',3);const f=await p.saveNote();const md=await readFile(path.join(directory,f),'utf8');assert.match(md,/Synthetic gear/);assert.match(md,/test only/);assert.match(md,/이론값·장비 미지원 출력/);assert.match(md,/적정 노출 예상 거리: 5.77 m/);
 });
}finally{await p.unload();await writeFile(`${out}/bundle-integration.json`,JSON.stringify({date:'2026-10-29 KST',host:'Node VM + actual production main.js; Obsidian API boundary doubles and a separate temporary filesystem vault; no rendered UI claim',results,measurement,expectedInjectedErrors:errors,notices:notices.length,noteFiles:noteWrites,listenersAfterUnload:bindings.size,timersAfterUnload:timers.size},null,2)+'\n');}
assert.ok(results.every(r=>r.passed),'bundle integration failure');
