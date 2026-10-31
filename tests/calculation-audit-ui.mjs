import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFile,mkdir,writeFile,readFile} from 'node:fs/promises';
const out=process.env.QA_OUT??'docs/calculation-audit/ui',vault='/private/tmp/photo-field-qa-vault';await mkdir(out,{recursive:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338');let page,original;const checks=[],errors=[];
try{
 for(const context of browser.contexts())for(const p of context.pages())if(p.url().startsWith('app://obsidian.md/index.html')&&await p.evaluate(()=>app.vault.adapter.basePath)===vault)page=p;
 assert.ok(page,'only isolated QA vault allowed');page.setDefaultTimeout(6000);
 original=await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];if(p){await p.flush();return p.loadData();}try{return JSON.parse(await app.vault.adapter.read('.obsidian/plugins/photo-field-mobile/data.json'));}catch{return null;}});
 await page.evaluate(async()=>{await app.plugins.disablePlugin('photo-field-mobile');});
 for(const f of ['main.js','styles.css','manifest.json'])await copyFile(f,`${vault}/.obsidian/plugins/photo-field-mobile/${f}`);
 await writeFile(`${vault}/.obsidian/plugins/photo-field-mobile/data.json`,'null');
 await page.evaluate(async()=>{await app.plugins.loadManifest('.obsidian/plugins/photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');if(!app.isMobile)app.emulateMobile(true);await app.plugins.plugins['photo-field-mobile'].open();app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();const w=require('electron').remote.getCurrentWindow();if(w.isMinimized())w.restore();w.show();});
 page.on('pageerror',e=>errors.push(e.message));const cdp=await page.context().newCDPSession(page);
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 const field=k=>page.locator(`input[data-key=${k}]`),select=k=>page.locator(`select[data-key=${k}]`);
 const state=()=>page.evaluate(()=>({...app.plugins.plugins['photo-field-mobile'].state.inputs}));
 const open=async text=>{const d=page.locator('.pfm-root details').filter({has:page.locator('summary',{hasText:text})}).first();if(!await d.evaluate(e=>e.open))await d.locator('summary').click();};
 const tab=async name=>{await page.getByRole('button',{name,exact:true}).click();};
 const shot=async name=>{await page.evaluate(()=>app.plugins.plugins['photo-field-mobile'].noteNotice?.hide());await page.bringToFront();await page.screenshot({path:`${out}/${name}.png`,animations:'disabled',timeout:15000});};
 const check=async(name,fn)=>{try{await fn();checks.push({name,passed:true});console.log('PASS '+name);}catch(e){checks.push({name,passed:false,error:String(e)});console.log('FAIL '+name+' '+e.stack);}};
 const save=async(name,label)=>{
  const paths=await page.evaluate(()=>app.vault.getMarkdownFiles().map(f=>f.path));
  await page.getByRole('button',{name:label,exact:true}).click();
  await page.waitForFunction(paths=>app.vault.getMarkdownFiles().some(f=>!paths.includes(f.path)),paths);
  const saved=await page.evaluate(async paths=>{const f=app.vault.getMarkdownFiles().find(f=>!paths.includes(f.path));return {path:f.path,text:await app.vault.read(f)};},paths);await writeFile(`${out}/${name}.md`,saved.text);return saved.text;
 };
 await check('real isolated Obsidian ItemView and mobile host',async()=>{assert.equal(await page.evaluate(()=>app.isMobile),true);assert.equal(await page.locator('.workspace-leaf-content[data-type=photo-field-mobile]').count(),1);});
 await check('direct entry: GN, energy, loss, EV signs, step table and unit conversion',async()=>{
  await tab('플래시');await field('aperture').fill('4');await field('iso').fill('100');await field('cameraDistance').fill('10');await select('denominator').selectOption('1');
  assert.equal(await page.locator('.pfm-flash-results .pfm-value').innerText(),'10');assert.match(await page.locator('.pfm-ev').innerText(),/0 EV/);
  await select('denominator').selectOption('4');assert.equal(await page.locator('.pfm-flash-results .pfm-value').innerText(),'5');assert.match(await page.locator('.pfm-ev').innerText(),/-2 EV/);
  await select('denominator').selectOption('16');assert.equal(await page.locator('.pfm-flash-results .pfm-value').innerText(),'2.5');await field('iso').fill('400');assert.equal(await page.locator('.pfm-flash-results .pfm-value').innerText(),'5');
  await open('플래시·GN');await field('loss').fill('1');assert.equal(await page.locator('.pfm-flash-results .pfm-value').innerText(),'3.54');
  await field('loss').fill('0');await select('gnUnit').selectOption('ft');assert.ok(Math.abs((await state()).gn-131.23359580052494)<1e-10);assert.equal(await page.locator('.pfm-flash-results .pfm-value').innerText(),'5');await select('gnUnit').selectOption('m');
  await open('필요 출력·조리개');assert.match(await page.locator('.pfm-flash-details').innerText(),/1\/1.*10 m/s);await page.locator('.pfm-flash-results').scrollIntoViewIfNeeded();await shot('flash-energy');
 });
 await check('coverage, actual dimensions and nominal equivalence do not change flash',async()=>{
  await tab('통합');await select('sensor').selectOption('ff');await field('focal').fill('50');await field('cameraDistance').fill('5');await field('iso').fill('100');await select('denominator').selectOption('4');
  await open('전체 심도·과초점');assert.match(await page.locator('.pfm-dof-details').innerText(),/39.6°.*27°/);
  await open('프레임·조사');assert.match(await page.locator('.pfm-coverage-results').innerText(),/3.6×2.4m/);
  await select('sensor').selectOption('apsc');await field('focal').fill('35');await field('aperture').fill('2');assert.match(await page.locator('.pfm-equivalence').innerText(),/52.5mm.*f\/3/);
  const before=await page.locator('.pfm-flash-results .pfm-value').innerText();await open('카메라·렌즈');await select('cropBasis').selectOption('dimensions');assert.equal(await page.locator('.pfm-flash-results .pfm-value').innerText(),before);assert.match(await page.locator('.pfm-equivalence').innerText(),/53.53mm/);
  await select('cropBasis').selectOption('nominal');await select('sensor').selectOption('apsc16');assert.match(await page.locator('.pfm-equivalence').innerText(),/56mm.*f\/3.2/);await shot('equivalence');
 });
 await check('finite target direct controls, harmonic focus, actual step, SVG coordinate, tab and all Markdown',async()=>{
  await select('sensor').selectOption('ff');await tab('존 포커싱');await select('zoneFlow').selectOption('target');await field('focal').fill('35');await field('zoneNear').fill('2');await field('zoneFar').fill('5');await field('apertureMax').fill('16');
  assert.match(await page.locator('.pfm-zone-result').innerText(),/f\/7.1/);await page.locator('[data-zone-apply]').click();const i=await state();assert.ok(Math.abs(i.cameraDistance-20/7)<1e-14);assert.equal(i.aperture,7.1);assert.equal(await field('cameraDistance').inputValue(),String(20/7));
  assert.match(await page.locator('.pfm-zone-status').innerText(),/목표 구간 포함/);assert.match(await page.locator('.pfm-zone-result').innerText(),/1.94 m ~ 5.41 m/);
  const x=Number(await page.locator('.pfm-focus-line').getAttribute('x1'));assert.ok(Math.abs(x-(54+328*(20/7)/15))<1e-10);
  const current=await save('zone-current-tab','현재 탭 결과 저장');assert.match(current,/제안 검산 1.94 m ~ 5.41 m/);assert.doesNotMatch(current,/적정 노출 예상 거리:/);
  const all=await save('all-calculations','전체 계산을 노트로 저장');assert.match(all,/적정 노출 예상 거리: 2.82 m/);assert.match(all,/심도 근거리 1.94 m/);assert.match(all,/표시 숫자만 반올림/);
  await page.locator('.pfm-zone-panel').scrollIntoViewIfNeeded();await shot('finite-zone');
  await open('허용 범위·그림');await field('diagramMax').fill('1');assert.equal(await page.locator('.pfm-focus-line').getAttribute('x1'),'382');assert.match(await page.locator('.pfm-scene-note').allTextContents().then(a=>a.join(' ')),/그림 밖 심도/);assert.equal((await state()).cameraDistance,i.cameraDistance);assert.match(await page.locator('.pfm-zone-result').innerText(),/1.94 m ~ 5.41 m/);await field('diagramMax').fill('15');
 });
 await check('infinity intent, impossible aperture, blank and inverted intervals clear old result',async()=>{
  await field('zoneInfinity').check();await page.locator('[data-zone-apply]').click();assert.match(await page.locator('.pfm-zone-status').innerText(),/포함/);assert.match(await page.locator('.pfm-zone-result').innerText(),/∞/);
  const md=await save('infinity-tab','현재 탭 결과 저장');assert.match(md,/목표 원거리 무한대 \| true/);assert.match(md,/목표 2 m ~ ∞/);
  await field('apertureMax').fill('2');assert.match(await page.locator('.pfm-zone-status').innerText(),/달성 불가/);assert.equal(await page.locator('[data-zone-apply]').count(),0);assert.match(await page.locator('.pfm-zone-result').innerText(),/달성 불가|전체 포함을 보장하지/);
  await field('zoneInfinity').uncheck();await field('zoneNear').fill('5');await field('zoneFar').fill('2');assert.match(await page.locator('.pfm-zone-result .pfm-error').innerText(),/작아야/);assert.equal(await page.locator('[data-zone-apply]').count(),0);
  await field('zoneNear').fill('');assert.ok(await page.locator('.pfm-zone-result .pfm-error').count());await field('zoneNear').fill('2');await field('zoneFar').fill('5');await field('apertureMax').fill('16');
 });
 await check('preset and zoom changes, missing GN, unsupported modes and offcamera independence',async()=>{
  await tab('플래시');await open('내 장비 프리셋');await page.getByRole('button',{name:'FlashQ Q20III 추가·선택',exact:true}).click();await field('aperture').fill('4');await field('iso').fill('100');await select('denominator').selectOption('1');assert.equal(await field('gn').inputValue(),'20');assert.equal(await page.locator('.pfm-flash-results .pfm-value').innerText(),'5');
  await open('플래시·GN');await field('zoom').fill('50');assert.match(await page.locator('.pfm-flash-results .pfm-error').innerText(),/GN 자료 없음/);assert.equal(await page.locator('.pfm-flash-results .pfm-value').count(),0);await field('zoom').fill('32');assert.equal(await page.locator('.pfm-flash-results .pfm-value').innerText(),'5');
  for(const mode of ['ttl','hss','bounce','modifier','near']){await select('mode').selectOption(mode);assert.match(await page.locator('.pfm-flash-results .pfm-error').innerText(),/계산할 수 없습니다/);}await select('mode').selectOption('manual');
  const linked=page.locator('.pfm-check input:not([data-key])');await linked.uncheck();await field('flashDistance').fill('10');assert.match(await page.locator('.pfm-ev').innerText(),/-2 EV/);await field('cameraDistance').fill('3');assert.match(await page.locator('.pfm-ev').innerText(),/-2 EV/);await linked.check();assert.match(await page.locator('.pfm-ev').innerText(),/\+1.47 EV/);
 });
 await check('rounding, extreme finite residual, overflow error and no stale numeric result',async()=>{
  await select('gnMode').selectOption('manual');await field('zoom').fill('50');await field('gnZoom').fill('50');await field('gn').fill('40');await field('cameraDistance').fill('10.000001');assert.doesNotMatch(await page.locator('.pfm-ev').innerText(),/-0/);
  await field('gn').fill('1e160');await field('cameraDistance').fill('1');await open('필요 출력·조리개');assert.match(await page.locator('.pfm-flash-details').innerText(),/권장 지원 단계 1\/256/);assert.doesNotMatch(await page.locator('.pfm-flash-details').innerText(),/∞|NaN|undefined/);
  await field('gn').fill('1e308');await field('aperture').fill('1');await field('cameraDistance').fill('1e308');await open('허용 범위·그림');await field('tolerance').fill('5');assert.ok(await page.locator('.pfm-flash-results .pfm-error').count());assert.equal(await page.locator('.pfm-flash-results .pfm-value').count(),0);await shot('overflow-error');
  await field('gn').fill('40');await field('aperture').fill('4');await field('cameraDistance').fill('5');await field('tolerance').fill('1');
 });
 await check('flush, disable/reload and reentry preserve exact values and infinity flag',async()=>{
  await tab('존 포커싱');await field('zoneInfinity').check();await page.locator('[data-zone-apply]').click();
  const expected=await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();return (await p.loadData()).inputs;});
  await page.evaluate(async()=>{await app.plugins.disablePlugin('photo-field-mobile');await app.plugins.loadManifest('.obsidian/plugins/photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();});assert.deepEqual(await state(),expected);assert.equal((await state()).zoneInfinity,true);assert.match(await page.locator('.pfm-zone-result').innerText(),/∞/);
  await tab('플래시');await tab('존 포커싱');assert.equal(await field('zoneInfinity').isChecked(),true);await writeFile(`${out}/restored-inputs.json`,JSON.stringify(await state(),null,2));
  for(const [width,height]of [[360,800],[390,844],[430,932],[844,390]]){await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,mobile:true,deviceScaleFactor:1});assert.ok(await page.locator('.pfm-root').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.locator('.pfm-results').scrollIntoViewIfNeeded();await shot(`${width}-${height}`);}
  assert.deepEqual(errors,[]);
 });
}finally{
 if(page&&original!==undefined){await page.evaluate(async()=>{await app.plugins.plugins['photo-field-mobile']?.flush();await app.plugins.disablePlugin('photo-field-mobile');});await writeFile(`${vault}/.obsidian/plugins/photo-field-mobile/data.json`,JSON.stringify(original));await page.evaluate(async()=>{await app.plugins.loadManifest('.obsidian/plugins/photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();});}
 const fingerprints={};for(const f of ['main.js','styles.css','manifest.json']){const local=await readFile(f),installed=await readFile(`${vault}/.obsidian/plugins/photo-field-mobile/${f}`);assert.deepEqual(local,installed);fingerprints[f]=createHash('sha256').update(local).digest('hex');}
 await writeFile(`${out}/results.json`,JSON.stringify({title:page?await page.title():'',fingerprints,date:new Date().toISOString(),vault,host:'actual Obsidian ItemView + app.emulateMobile(true) + CDP mobile metrics',actualIOS:false,checks,errors},null,2));await browser.close();
}
assert.ok(checks.every(c=>c.passed),'calculation UI audit failed');
