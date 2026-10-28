import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {copyFile,mkdir,writeFile} from 'node:fs/promises';
const vault='/private/tmp/photo-field-qa-vault';
await mkdir('docs/screenshots',{recursive:true});
for(const f of ['main.js','styles.css','manifest.json'])await copyFile(f,`${vault}/.obsidian/plugins/photo-field-mobile/${f}`);
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338');
const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('app://obsidian.md/index.html'));
const cdp=await page.context().newCDPSession(page);const results=[];const exceptions=[];
page.on('pageerror',e=>exceptions.push(String(e)));
const pass=name=>{results.push(name);console.log('PASS '+name);};
const run=fn=>page.evaluate(fn);
const value=(key)=>run(()=>app.plugins.plugins['photo-field-mobile'].state.inputs).then(i=>i[key]);
const input=key=>page.locator(`.pfm-root input[data-key="${key}"]`);
const open=async(label)=>{const summary=page.locator('.pfm-root summary').filter({hasText:label}).first();const d=summary.locator('..');if(!await d.evaluate(e=>e.open))await summary.click();};
const set=async(key,v)=>{await input(key).fill(String(v));};
async function size(w,h){await cdp.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});}
async function noOverflow(){assert.ok(await page.locator('.pfm-root').evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
try {
 assert.equal(await run(()=>app.vault.adapter.basePath),vault);
 await run(()=>{if(!app.isMobile)app.emulateMobile(true);});
 await page.waitForFunction(()=>app.isMobile&&app.workspace.layoutReady);
 await run(async()=>{app.setting.close();await app.plugins.disablePlugin('photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');const p=app.plugins.plugins['photo-field-mobile'];p.state={version:1,inputs:{sensor:'ff',width:36,height:24,focal:50,aperture:4,iso:100,cameraDistance:5,linked:true,flashDistance:5,cocMode:'estimate',coc:.029,gn:40,gnUnit:'m',gnZoom:50,zoom:50,conditions:'연습용 가상 GN · 장비 사양 아님 · ISO100·최대출력·직접광·50mm',denominator:4,loss:0,tolerance:1,minDenominator:256,steps:'1,2,4,8,16,32,64,128,256',coverage:'approx',horizontal:40,vertical:27,mode:'manual',diagramMax:15,tab:'combined'},equipment:[]};await p.persist();await p.open();});
 await size(360,800);await page.locator('.pfm-root').waitFor();
 assert.match(await page.locator('.pfm-hero').innerText(),/^5 m$/);pass('actual Obsidian ItemView and commands load, GN40 1/4 = 5m');
 await noOverflow();
 // Both critical readouts are visible on a 360px first screen without opening settings.
 await run(()=>{document.body.classList.remove('theme-light');document.body.classList.add('theme-dark');});
 const far=await page.locator('[data-stat=far]').boundingBox();assert.ok(far&&far.y+far.height<=710,JSON.stringify(far));
 await page.screenshot({path:'docs/screenshots/360-dark.png'});
 const targets=await page.locator('.pfm-root button:visible,.pfm-root select:visible,.pfm-root input:not([type=checkbox]):visible,.pfm-root summary:visible,.pfm-check').evaluateAll(es=>es.map(e=>({text:e.textContent?.slice(0,60)||e.getAttribute('aria-label'),h:e.getBoundingClientRect().height})).filter(e=>e.h<43.9));assert.deepEqual(targets,[]);pass('360px no overflow, hero/exposure/near-far first screen, controls >=44px');
 await set('aperture',8);assert.match(await page.locator('.pfm-hero').innerText(),/2.5 m/);const changed=await page.locator('[data-stat=near] strong').innerText();assert.ok(!changed.includes('4.07 m'));pass('direct number entry updates flash and DOF together');
 await set('aperture',4);await set('cameraDistance',10);assert.match(await page.locator('.pfm-flash-results .pfm-ev').innerText(),/-2 EV/);assert.equal(await value('flashDistance'),10);pass('linked distances and -2EV at double distance');
 await page.locator('.pfm-check').click();await set('flashDistance',5);assert.match(await page.locator('.pfm-flash-results .pfm-ev').innerText(),/0 EV/);assert.match(await page.locator('.pfm-coverage-results').textContent(),/중첩/);pass('off camera independent distance and no spatial overlap claim');
 await open('카메라·렌즈');const before=await page.locator('.pfm-hero').innerText();await set('focal',100);assert.equal(await page.locator('.pfm-hero').innerText(),before);pass('focal change preserves fixed flash GN distance');
 await set('focal',50);await set('aperture','');assert.equal(await page.locator('.pfm-hero').innerText(),'—');assert.equal(await input('aperture').inputValue(),'');await page.screenshot({path:'docs/screenshots/invalid-input.png'});await set('aperture',4);pass('blank input not converted to zero or stale computed distance');
 await open('플래시·GN');await set('zoom',105);assert.match(await page.locator('.pfm-flash-results').innerText(),/GN 자료 없음/);await set('zoom',50);
 await page.locator('select[data-key=mode]').selectOption('hss');assert.equal(await page.locator('.pfm-hero').innerText(),'—');await page.locator('select[data-key=mode]').selectOption('manual');pass('unknown zoom and HSS withhold calculated distances');
 await page.locator('select[data-key=gnUnit]').selectOption('ft');assert.match(await page.locator('.pfm-hero').innerText(),/^5 m$/);await page.locator('select[data-key=gnUnit]').selectOption('m');pass('GN unit change converts value without changing exposure');
 await open('내 장비 프리셋');await page.getByLabel('새 장비 이름',{exact:true}).fill('QA 실측 예시');await page.getByLabel('측정 조건 (ISO100·최대 출력·직접광 등)',{exact:true}).fill('ISO100 최대출력 직접광, 테스트용');await page.getByLabel('출처 URL·설명서 페이지 또는 실측 방법',{exact:true}).fill('QA synthetic fixture, manufacturer data 아님');await page.locator('.pfm-root textarea').fill('35,30\n50,40');await page.getByRole('button',{name:'새 장비 프리셋 저장',exact:true}).click();
 assert.equal(await run(()=>app.plugins.plugins['photo-field-mobile'].state.equipment.length),1);pass('user zoom-GN equipment preset created');
 await run(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.persist();await app.plugins.disablePlugin('photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');await app.commands.executeCommandById('photo-field-mobile:open');});
 assert.equal(await value('cameraDistance'),10);assert.equal(await value('linked'),false);assert.equal(await run(()=>app.plugins.plugins['photo-field-mobile'].state.equipment[0].table['35']),30);pass('disable/enable restores inputs and zoom-GN preset through loadData/saveData');
 const persistence=await run(()=>app.plugins.plugins['photo-field-mobile'].loadData());await writeFile('docs/qa-persisted-data.json',JSON.stringify(persistence,null,2));
 await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 // Offline, save twice using the real visible control and compare ordinary vault content.
 const beforeFiles=await run(()=>app.vault.getMarkdownFiles().filter(f=>f.path.startsWith('사진 촬영 계산/')).map(f=>f.path));
 await page.getByRole('button',{name:'전체 계산을 노트로 저장',exact:true}).click();await page.waitForFunction(n=>app.vault.getMarkdownFiles().filter(f=>f.path.startsWith('사진 촬영 계산/')).length>n,beforeFiles.length);
 await page.getByRole('button',{name:'전체 계산을 노트로 저장',exact:true}).click();await page.waitForFunction(n=>app.vault.getMarkdownFiles().filter(f=>f.path.startsWith('사진 촬영 계산/')).length>n,beforeFiles.length+1);
 const notes=await run(async()=>{const fs=app.vault.getMarkdownFiles().filter(f=>f.path.startsWith('사진 촬영 계산/'));return Promise.all(fs.slice(-2).map(async f=>({path:f.path,text:await app.vault.read(f)})));});
 assert.notEqual(notes[0].path,notes[1].path);for(const n of notes){assert.ok(n.text.includes('적정 노출 예상 거리: 5 m'));assert.ok(n.text.includes('Copyright (c) 2026 Jack Herrington'));assert.ok(!n.text.includes('```photo'));}await writeFile('docs/example-note.md',notes[0].text);pass('offline real Vault API saves two distinct plain Markdown notes without overwrite');
 // Reopen while offline, then use synthetic touch on a real range control.
 await run(async()=>{app.workspace.detachLeavesOfType('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();});
 await input('aperture').scrollIntoViewIfNeeded();const range=page.locator('[data-range=aperture]');const rect=await range.boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+rect.width*.6,y:rect.y+rect.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(await value('aperture')!==4);await set('aperture',4);pass('offline view reentry and synthetic touch slider interaction');
 for(const [w,h,theme] of [[360,800,'light'],[390,844,'dark'],[844,390,'dark'],[360,420,'light']]){
   await size(w,h);await run(()=>{document.body.classList.remove('theme-dark','theme-light');});await page.evaluate(t=>document.body.classList.add('theme-'+t),theme);
   await run(()=>document.querySelectorAll('.notice').forEach(e=>e.click()));await page.waitForTimeout(200);await page.locator('.pfm-container').evaluate(e=>{e.scrollTop=0;});await noOverflow();await page.screenshot({path:`docs/screenshots/${w}x${h}-${theme}.png`});
 }
 pass('portrait/landscape, light/dark, reduced viewport keyboard surrogate, no overflow');
 // Native input focus remains while typing (no full view replacement), IME is not real-device tested.
 await input('cameraDistance').focus();await input('cameraDistance').fill('7.5');assert.equal(await input('cameraDistance').evaluate(e=>e===document.activeElement),true);pass('numeric input focus survives rerender of results');
 const cleanup=await run(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.persist();const view=app.workspace.getLeavesOfType('photo-field-mobile')[0].view;const controllers=[...view.aborters];app.workspace.detachLeavesOfType('photo-field-mobile');const closed=controllers.every(a=>a.signal.aborted);await p.open();const second=app.workspace.getLeavesOfType('photo-field-mobile')[0].view;const controllers2=[...second.aborters];await app.plugins.disablePlugin('photo-field-mobile');return {closed,disabled:controllers2.every(a=>a.signal.aborted),views:app.workspace.getLeavesOfType('photo-field-mobile').length};});
 assert.deepEqual(cleanup,{closed:true,disabled:true,views:0});pass('view close/plugin disable abort handlers and detach leaves');
 assert.deepEqual(exceptions,[]);pass('no uncaught runtime exception during QA');
 await writeFile('docs/mobile-results.json',JSON.stringify({date:new Date().toISOString(),host:'macOS Obsidian mobile emulation + Chromium DevTools',actualIos:false,actualAndroid:false,results,exceptions},null,2));
}finally{await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1}).catch(()=>{});await browser.close();}
