import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {copyFile,mkdir,writeFile} from 'node:fs/promises';
const out='docs/bauhaus';await mkdir(`${out}/screenshots`,{recursive:true});
const b=await chromium.connectOverCDP('http://127.0.0.1:9338'),page=b.contexts()[0].pages().find(p=>p.url().startsWith('app://obsidian.md/index.html'));
assert.equal(await page.evaluate(()=>app.vault.adapter.basePath),'/private/tmp/photo-field-qa-vault');
const cdp=await page.context().newCDPSession(page),results=[],exceptions=[];page.on('pageerror',e=>exceptions.push({message:e.message,stack:e.stack}));page.setDefaultTimeout(4000);
const run=f=>page.evaluate(f),input=k=>page.locator(`.pfm-root input[data-key=${k}]`);
const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:String(e)});console.log('FAIL '+name+': '+e.message);}};
const size=async(w,h)=>{await cdp.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,mobile:true,deviceScaleFactor:1});};
const theme=async t=>page.evaluate(t=>{document.body.classList.remove('theme-light','theme-dark');document.body.classList.add('theme-'+t);},t);
const top=()=>page.locator('.pfm-container').evaluate(e=>e.scrollTop=0);
const snapshot=async(name)=>{await page.mouse.move(1,1);await page.screenshot({animations:'disabled',path:`${out}/screenshots/${name}.png`});};
const original=await run(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();return p.loadData();});
try{
 for(const f of ['main.js','styles.css','manifest.json'])await copyFile(f,`/private/tmp/photo-field-qa-vault/.obsidian/plugins/photo-field-mobile/${f}`);
 await run(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await app.plugins.disablePlugin('photo-field-mobile');await p.saveData(null);await app.plugins.enablePlugin('photo-field-mobile');if(!app.isMobile)app.emulateMobile(true);await app.plugins.plugins['photo-field-mobile'].open();});await size(390,844);await theme('light');await top();await snapshot('combined-light');
 await check('scene leads combined/DOF while flash leads exposure; contextual quick controls stay available',async()=>{
  for(const [tab,first] of [['통합','pfm-diagram'],['플래시','pfm-flash-results'],['심도·화각','pfm-diagram']]){await page.getByRole('button',{name:tab,exact:true}).click();assert.ok(await page.locator('.pfm-results').evaluate((e,c)=>e.firstElementChild.classList.contains(c),first));assert.equal(await input('iso').isVisible(),tab!=='심도·화각');assert.equal(await page.locator('[data-range=cameraDistance]').isVisible(),true);assert.equal(await page.locator('[data-range=aperture]').isVisible(),true);}
 });
 await check('360/390 portrait and landscape, both themes and large text have no overflow and >=44px controls',async()=>{
  for(const [w,h] of [[360,800],[390,844],[844,390]])for(const t of ['light','dark'])for(const large of [false,true]){await size(w,h);await theme(t);await page.evaluate(large=>document.documentElement.style.fontSize=large?'20px':'',large);for(const tab of ['플래시','심도·화각','통합']){await page.getByRole('button',{name:tab,exact:true}).click();assert.ok(await page.locator('.pfm-root').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${w} ${t} ${tab} ${large}`);const short=await page.locator('.pfm-root button:visible,.pfm-root input:not([type=checkbox]):visible,.pfm-root select:visible,.pfm-root summary:visible,.pfm-check:visible').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().height<43.9).map(e=>e.outerHTML.slice(0,150)));assert.deepEqual(short,[]);}}
  await run(()=>document.documentElement.style.fontSize='');
 });
 await size(390,844);await theme('light');await page.getByRole('button',{name:'통합',exact:true}).click();
 await check('GN40.5 decimal and mid-string edits preserve focus, cursor order and scroll',async()=>{
  await page.locator('.pfm-root details').filter({has:page.locator('summary',{hasText:'플래시·GN'})}).first().evaluate(e=>e.open=true);
  const gn=input('gn');await gn.fill('');await gn.pressSequentially('40.5');assert.equal(await gn.inputValue(),'40.5');const scroll=await page.locator('.pfm-container').evaluate(e=>e.scrollTop);await gn.press('ArrowLeft');await gn.pressSequentially('2');assert.equal(await gn.inputValue(),'40.25');assert.ok(await gn.evaluate(e=>e===document.activeElement));assert.ok(Math.abs(await page.locator('.pfm-container').evaluate(e=>e.scrollTop)-scroll)<2);await gn.fill('40');
 });
 await check('long equipment names, error explanations and warning states wrap without clipping',async()=>{
  await run(()=>{const p=app.plugins.plugins['photo-field-mobile'];p.state.equipment=[{id:'bauhaus-qa',name:'긴 장비 이름과 제조사 조건을 확인하는 가상 디자인 테스트 장비 '.repeat(4),conditions:'합성 조건',source:'실제 장비 아님',table:{50:40},minDenominator:16,steps:'1,2,4,8,16'}];p.state.inputs.gnMode='equipment';p.state.inputs.equipmentId='bauhaus-qa';app.workspace.getLeavesOfType('photo-field-mobile')[0].view.render();});
  await input('denominator').fill('3');assert.match(await page.locator('.pfm-warning').innerText(),/이론값/);await top();await snapshot('long-name-theoretical');assert.ok(await page.locator('.pfm-root').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await input('zoom').fill('105');assert.match(await page.locator('.pfm-flash-results').innerText(),/GN 자료 없음/);await top();await snapshot('missing-gn');
  await run(()=>{const p=app.plugins.plugins['photo-field-mobile'];p.saveError='설정 저장 실패: '+'기기 저장소와 권한을 확인하고 다시 저장하세요. '.repeat(6);app.workspace.getLeavesOfType('photo-field-mobile')[0].view.updateSaveStatus();});await page.locator('footer [role=status]').scrollIntoViewIfNeeded();await snapshot('long-save-error');assert.ok(await page.locator('.pfm-root').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 });
 await check('light/dark text and primary action token pairs retain at least 4.5:1 contrast',async()=>{
  const luminance=hex=>{const raw=hex.trim().replace('#','');const full=raw.length===3?[...raw].map(c=>c+c).join(''):raw;const values=full.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;};
  for(const t of ['light','dark']){await theme(t);const tokens=await page.locator('.pfm-root').evaluate(e=>{const s=getComputedStyle(e);return Object.fromEntries(['ink','bg','muted','accent','accent-ink','warning','warning-bg'].map(k=>[k,s.getPropertyValue('--pfm-'+k).trim()]));});for(const [fg,bg] of [['ink','bg'],['muted','bg'],['accent-ink','accent'],['warning','warning-bg']]){const a=luminance(tokens[fg]),z=luminance(tokens[bg]);assert.ok((Math.max(a,z)+.05)/(Math.min(a,z)+.05)>=4.5,`${t} ${fg}/${bg}`);}}
 });
 // Fixed comparison state, using normal plugin reload and defaults instead of a second rendering implementation.
 await run(async()=>{const p=app.plugins.plugins['photo-field-mobile'];p.saveError='';await p.flush();await app.plugins.disablePlugin('photo-field-mobile');await p.saveData(null);await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();});
 for(const t of ['light','dark']){await theme(t);for(const [w,h] of [[390,844],[360,800],[844,390]]){await size(w,h);for(const name of ['통합','플래시','심도·화각']){await page.getByRole('button',{name,exact:true}).click();await top();await snapshot(`${w}-${t}-${name}`);}}}
 await size(390,844);await theme('light');await page.getByRole('button',{name:'통합',exact:true}).click();await top();await snapshot('combined-light');
 await check('no uncaught runtime exception in Bauhaus states',()=>assert.deepEqual(exceptions,[]));
}finally{
 await run(async data=>{const p=app.plugins.plugins['photo-field-mobile'];p.saveError='';await p.flush();await app.plugins.disablePlugin('photo-field-mobile');await p.saveData(data);await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();},original);await run(()=>document.documentElement.style.fontSize='');
 await writeFile(`${out}/results.json`,JSON.stringify({date:new Date().toISOString(),host:'macOS Obsidian1.14.5 mobile emulation / Chromium',actualIos:false,actualAndroid:false,results,exceptions},null,2));await b.close();
}
assert.ok(results.every(x=>x.passed),'bauhaus QA failures');
