// Synthetic data only. This runner refuses every vault except the isolated QA vault.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out='docs/releases/1.3.4/post-release/investigation',vault='/private/tmp/photo-field-qa-vault';await mkdir(out,{recursive:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338');let page;
for(const c of browser.contexts())for(const p of c.pages())if(p.url().includes('obsidian.md')&&await p.evaluate(()=>app.vault.adapter.basePath)===vault)page=p;
assert.ok(page,'isolated vault required');page.setDefaultTimeout(6000);
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>structuredClone(app.plugins.plugins['photo-field-mobile'].state));
let original;
try{
 original=await state();
 await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();Object.assign(p.state.inputs,{tab:'zone',zoneFlow:'target',zoneNear:1.5,zoneFar:1000000,zoneInfinity:false,focal:35,aperture:11,cameraDistance:4.2,flashDistance:4.2,linked:true,gnMode:'manual',gn:40.5,gnZoom:50,zoom:50});await p.persist();await p.flush();app.workspace.getLeavesOfType('photo-field-mobile')[0].view.render();window.__pfmNavigationTrace=[];const update=p.update.bind(p);p.update=(key,value)=>{const before=p.state.inputs[key];window.__pfmNavigationTrace.push({key,before,after:value});return update(key,value);};});
 const expected=await state(),withoutTab=s=>({...s,inputs:{...s.inputs,tab:''}});
 for(let cycle=0;cycle<25;cycle++)for(const name of ['플래시','심도·화각','통합','존 포커싱']){
  const numeric=page.locator('input[data-key=cameraDistance]');if(await numeric.isVisible())await numeric.focus();
  await page.getByRole('button',{name,exact:true}).click();assert.deepEqual(withoutTab(await state()),withoutTab(expected));
 }
 checks.push({name:'100 tab transitions with numeric focus preserve every other input and equipment',passed:true});
 for(let n=0;n<15;n++){
  await page.evaluate(()=>app.workspace.getLeavesOfType('photo-field-mobile')[0].detach());await page.waitForFunction(()=>app.workspace.getLeavesOfType('photo-field-mobile').length===0);
  assert.equal(await page.evaluate(()=>app.commands.executeCommandById('photo-field-mobile:open')),true);await page.locator('.pfm-root').waitFor();assert.deepEqual(withoutTab(await state()),withoutTab(expected));
 }
 checks.push({name:'15 close/reopen cycles preserve every input and equipment',passed:true});
 await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();});
 const disk=await page.evaluate(async()=>app.plugins.plugins['photo-field-mobile'].loadData());assert.deepEqual(disk.inputs,(await state()).inputs);
 checks.push({name:'persisted inputs agree with runtime after navigation',passed:true});
 const trace=await page.evaluate(()=>window.__pfmNavigationTrace);assert.deepEqual([...new Set(trace.filter(t=>t.before!==t.after).map(t=>t.key))],['tab']);await writeFile(`${out}/navigation-trace.json`,JSON.stringify(trace,null,2));
 checks.push({name:'mutation trace changes only tab',passed:true});assert.deepEqual(errors,[]);
 await page.locator('.pfm-container').evaluate(e=>e.scrollTop=0);await page.screenshot({path:`${out}/reentered.png`,animations:'disabled'});
 console.log('PASS '+checks.map(c=>c.name).join('\nPASS '));
}finally{
 if(original){await page.evaluate(async original=>{const p=app.plugins.plugins['photo-field-mobile'];p.state=original;await p.persist();await p.flush();await app.plugins.disablePlugin('photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();delete window.__pfmNavigationTrace;},original);}
 const fingerprints={};for(const f of ['main.js','manifest.json','styles.css'])fingerprints[f]=createHash('sha256').update(await readFile(`${vault}/.obsidian/plugins/photo-field-mobile/${f}`)).digest('hex');
 await writeFile(`${out}/navigation-results.json`,JSON.stringify({checks,errors,fingerprints,syntheticOnly:true,actualIOS:false,actualAndroid:false},null,2));await browser.close();
}
