import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338');
const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('app://obsidian.md/index.html'));
page.setDefaultTimeout(4000);
const results=[],exceptions=[];page.on('pageerror',e=>exceptions.push(String(e)));
const run=fn=>page.evaluate(fn),input=key=>page.locator(`.pfm-root input[data-key=${key}]`);
const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:String(e)});console.log('FAIL '+name+': '+e.message);}};
const open=async text=>{await page.locator('.pfm-root details').filter({has:page.locator('summary',{hasText:text})}).first().evaluate(e=>e.open=true);};
const reset=()=>run(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();await app.plugins.disablePlugin('photo-field-mobile');await p.saveData(null);await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();});
const reload=()=>run(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();await app.plugins.disablePlugin('photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();});
const saveButton=async name=>{const before=await run(()=>app.vault.getMarkdownFiles().map(f=>f.path));await page.getByRole('button',{name,exact:true}).click();await page.waitForFunction(old=>app.vault.getMarkdownFiles().some(f=>!old.includes(f.path)),before);return run(async()=>{const files=app.vault.getMarkdownFiles().sort((a,b)=>b.stat.ctime-a.stat.ctime);return app.vault.read(files[0]);});};
try{
 assert.equal(await run(()=>app.vault.adapter.basePath),'/private/tmp/photo-field-qa-vault');await run(()=>{if(!app.isMobile)app.emulateMobile(true);});await reset();
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});
 await check('A manual GN40 ISO100 f4 quarter power: screen, Markdown and restored state agree',async()=>{
  assert.match(await page.locator('.pfm-flash-results').innerText(),/연습용 GN/);assert.equal(await page.locator('.pfm-hero').innerText(),'5 m');assert.match(await page.locator('.pfm-ev').innerText(),/0 EV/);
  await input('cameraDistance').fill('10');assert.match(await page.locator('.pfm-ev').innerText(),/-2 EV/);
  const md=await saveButton('전체 계산을 노트로 저장');assert.match(md,/적정 노출 예상 거리: 5 m/);assert.match(md,/거리: 10 m · 노출 차이: -2 EV/);assert.match(md,/연습용 가상 GN/);
  await reload();assert.equal(await input('cameraDistance').inputValue(),'10');assert.match(await page.locator('.pfm-ev').innerText(),/-2 EV/);
 });
 await check('GN decimal typing retains focus and insertion order after clear and reentry',async()=>{
  await open('플래시·GN');const g=input('gn');await g.fill('');await g.pressSequentially('40.5');assert.equal(await g.inputValue(),'40.5');assert.ok(await g.evaluate(e=>e===document.activeElement));await g.fill('');assert.equal(await page.locator('.pfm-hero').innerText(),'—');await g.pressSequentially('40.25');assert.equal(await g.inputValue(),'40.25');await g.fill('40');
 });
 await check('distance and custom CoC decimals keep focus and restore after plugin reactivation',async()=>{
  await input('cameraDistance').fill('');await input('cameraDistance').pressSequentially('5.25');assert.equal(await input('cameraDistance').inputValue(),'5.25');
  await open('카메라·렌즈');await page.locator('select[data-key=cocMode]').selectOption('custom');await input('coc').fill('');await input('coc').pressSequentially('0.029');assert.equal(await input('coc').inputValue(),'0.029');assert.ok(await input('coc').evaluate(e=>e===document.activeElement));await reload();assert.equal(await input('coc').inputValue(),'0.029');assert.equal(await input('cameraDistance').inputValue(),'5.25');
 });
 await check('B create synthetic equipment, exact zoom, missing zoom, theoretical power, note, draft and selection restoration',async()=>{
  await open('내 장비');await page.getByLabel('새 장비 이름',{exact:true}).fill('촬영 준비 QA 가상 장비');await page.getByLabel('측정 조건 (ISO100·최대 출력·직접광 등)',{exact:true}).fill('ISO100 full direct · test only');await page.getByLabel('출처 URL·설명서 페이지 또는 실측 방법',{exact:true}).fill('합성 테스트 · 실제 장비 아님');await page.locator('.pfm-root textarea').fill('35,30\n50,40');await page.getByRole('button',{name:'새 장비 프리셋 저장',exact:true}).click();await page.locator('select[aria-label="저장된 장비"]').selectOption({label:'촬영 준비 QA 가상 장비'});
  await open('플래시·GN');await input('zoom').fill('35');assert.equal(await input('gn').inputValue(),'30');assert.equal(await page.locator('.pfm-hero').innerText(),'3.75 m');await input('zoom').fill('105');assert.equal(await page.locator('.pfm-hero').innerText(),'—');assert.equal(await input('gn').inputValue(),'0');await input('zoom').fill('50');await input('denominator').fill('3');assert.match(await page.locator('.pfm-flash-results').innerText(),/이론값·장비 미지원/);
  const md=await saveButton('전체 계산을 노트로 저장');assert.match(md,/촬영 준비 QA 가상 장비/);assert.match(md,/합성 테스트/);assert.match(md,/이론값·장비 미지원/);assert.match(md,/\| 선택 플래시 줌 mm \| 50 \|/);
  await page.getByRole('button',{name:'선택 장비 편집',exact:true}).click();await page.getByLabel('장비 이름',{exact:true}).fill('미완료 초안');await reload();assert.equal(await input('gn').inputValue(),'40');assert.equal(await page.getByLabel('장비 이름',{exact:true}).inputValue(),'미완료 초안');assert.equal(await page.getByLabel('저장된 장비',{exact:true}).inputValue(),await run(()=>app.plugins.plugins['photo-field-mobile'].state.inputs.equipmentId));
 });
 await check('C valid DOF with missing GN and HSS saves only current tab; full save rejects; reentry restores',async()=>{
  await open('플래시·GN');await input('zoom').fill('105');await page.locator('select[data-key=mode]').selectOption('hss');await page.getByRole('button',{name:'심도·화각',exact:true}).click();const near=await page.locator('[data-stat=near] strong').innerText();assert.ok(!near.includes('—'));
  const md=await saveButton('현재 탭 결과 저장');assert.match(md,/현재 탭 · 심도·화각/);assert.match(md,/심도 근거리/);assert.doesNotMatch(md,/적정 노출 예상 거리:|플래시 조사 범위|NaN/);
  const rejected=await run(async()=>{try{await app.plugins.plugins['photo-field-mobile'].saveNote();return false;}catch{return true;}});assert.equal(rejected,true);await reload();assert.equal(await page.locator('.pfm-root').getAttribute('data-tab'),'dof');assert.equal(await page.locator('[data-stat=near] strong').innerText(),near);
  await page.screenshot({path:'docs/screenshots/preparation-dof.png',fullPage:true});
 });
 await check('D offcamera axes, independent distances and explicit spatial limitation persist to note and restore',async()=>{
  await reset();await page.getByRole('button',{name:'통합',exact:true}).click();await page.locator('.pfm-check').click();await input('cameraDistance').fill('10');await input('flashDistance').fill('5');assert.match(await page.locator('.pfm-ev').innerText(),/0 EV/);await input('cameraDistance').fill('7');assert.match(await page.locator('.pfm-ev').innerText(),/0 EV/);assert.match(await page.locator('.pfm-diagram').innerText(),/별도|독립/);
  const md=await saveButton('전체 계산을 노트로 저장');assert.match(md,/위치·방향 미입력, 공간 중첩 비교 불가/);assert.match(md,/플래시 거리 평면/);await reload();assert.equal(await input('cameraDistance').inputValue(),'7');assert.equal(await input('flashDistance').inputValue(),'5');
 });
 await check('view close immediately after edit flushes final state before reactivation',async()=>{
  await input('cameraDistance').fill('8.75');await run(async()=>{const p=app.plugins.plugins['photo-field-mobile'];app.workspace.detachLeavesOfType('photo-field-mobile');await p.flush();await p.open();});assert.equal(await input('cameraDistance').inputValue(),'8.75');await reload();assert.equal(await input('cameraDistance').inputValue(),'8.75');
 });
 await check('background/pagehide hooks flush edits; failed setting save stays failed until explicit retry',async()=>{
  const r=await run(async()=>{const p=app.plugins.plugins['photo-field-mobile'];p.update('iso',250);const job=p.persist();window.dispatchEvent(new Event('pagehide'));await job;await p.flush();const saved=(await p.loadData()).inputs.iso;const original=p.saveData.bind(p);p.saveData=async()=>{throw Error('QA preparation write failure');};p.update('iso',320);const failed=p.persist().catch(()=>{});await p.flush().catch(()=>{});await failed;const error=p.saveError,lastSaved=(await p.loadData()).inputs.iso;p.saveData=original;return {saved,error,lastSaved};});assert.equal(r.saved,250);assert.equal(r.lastSaved,250);assert.match(r.error,/실패/);assert.match(await page.locator('footer [role=status]').innerText(),/실패/);await page.getByRole('button',{name:'설정 다시 저장',exact:true}).click();await page.waitForFunction(()=>!app.plugins.plugins['photo-field-mobile'].saveError);await reload();assert.equal(await input('iso').inputValue(),'320');
 });
 await check('rapid tabs and offline partial/full Markdown exports with view reentry',async()=>{
  await page.context().setOffline(true);try{for(const name of ['플래시','심도·화각','통합','플래시','심도·화각'])await page.getByRole('button',{name,exact:true}).click();const md=await saveButton('현재 탭 결과 저장');assert.match(md,/현재 탭 · 심도·화각/);await page.getByRole('button',{name:'통합',exact:true}).click();assert.match(await saveButton('전체 계산을 노트로 저장'),/전체 계산/);await reload();assert.equal(await page.locator('.pfm-root').getAttribute('data-tab'),'combined');}finally{await page.context().setOffline(false);}
 });
 await check('new save actions remain reachable at 360px, large rem font, landscape and reduced viewport',async()=>{
  for(const [width,height] of [[360,800],[844,390],[360,420]]){await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,mobile:true,deviceScaleFactor:1});await run(()=>document.documentElement.style.fontSize='20px');assert.ok(await page.locator('.pfm-root').evaluate(e=>e.scrollWidth<=e.clientWidth+1));for(const name of ['현재 탭 결과 저장','전체 계산을 노트로 저장']){const btn=page.getByRole('button',{name,exact:true});await btn.scrollIntoViewIfNeeded();const r=await btn.boundingBox();assert.ok(r&&r.height>=44&&r.width<=width);}}
  await page.screenshot({path:'docs/screenshots/preparation-save.png'});await run(()=>document.documentElement.style.fontSize='');
 });
 assert.deepEqual(exceptions,[]);
}finally{await mkdir('docs/preparation',{recursive:true});await writeFile('docs/preparation/results.json',JSON.stringify({date:new Date().toISOString(),host:'macOS Obsidian 1.14.5 Electron/Chromium mobile emulation',actualIos:false,actualAndroid:false,simulator:false,results,exceptions},null,2));await browser.close();}
assert.ok(results.every(x=>x.passed),'preparation flow failure');
