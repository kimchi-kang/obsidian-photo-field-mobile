import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out=process.env.QA_OUT??'docs/releases/1.3.2/ui',vault='/private/tmp/photo-field-qa-vault';await mkdir(out,{recursive:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338');let page,original;const checks=[],errors=[];
try{
 for(const c of browser.contexts())for(const p of c.pages())if(p.url().includes('obsidian.md')&&await p.evaluate(()=>app.vault.adapter.basePath)===vault)page=p;
 assert.ok(page,'dedicated QA vault only');page.setDefaultTimeout(6000);
 original=await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p?.flush();return p?await p.loadData():null;});
 await page.evaluate(async()=>app.plugins.disablePlugin('photo-field-mobile'));
 for(const f of ['main.js','styles.css','manifest.json'])await copyFile(f,`${vault}/.obsidian/plugins/photo-field-mobile/${f}`);
 await writeFile(`${vault}/.obsidian/plugins/photo-field-mobile/data.json`,'null');
 await page.evaluate(async()=>{await app.plugins.loadManifest('.obsidian/plugins/photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');if(!app.isMobile)app.emulateMobile(true);await app.plugins.plugins['photo-field-mobile'].open();app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();});
 page.on('pageerror',e=>errors.push(e.message));const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});
 const f=k=>page.locator(`input[data-key=${k}]`),state=()=>page.evaluate(()=>({...app.plugins.plugins['photo-field-mobile'].state.inputs}));
 const tab=async name=>page.getByRole('button',{name,exact:true}).click();
 const check=async(name,fn)=>{try{await fn();checks.push({name,passed:true});console.log('PASS '+name);}catch(e){checks.push({name,passed:false,error:String(e)});console.log('FAIL '+name+' '+e.stack);}};
 const shot=async name=>{await page.bringToFront();await page.screenshot({path:`${out}/${name}.png`,animations:'disabled'});};
 await check('cm input conversion is deferred during editing; both directions and exact 1m preserve physics',async()=>{
  await tab('심도·화각');await f('cameraDistance').fill('0.5');assert.equal((await state()).cameraDistance,.5);assert.equal(await f('cameraDistance').getAttribute('data-display-unit'),'m');await f('cameraDistance').press('Tab');
  assert.equal(await f('cameraDistance').inputValue(),'50');assert.equal(await f('cameraDistance').getAttribute('data-display-unit'),'cm');
  await f('cameraDistance').fill('150');assert.equal((await state()).cameraDistance,1.5);assert.equal(await f('cameraDistance').getAttribute('data-display-unit'),'cm');await f('cameraDistance').press('Tab');assert.equal(await f('cameraDistance').inputValue(),'1.5');assert.equal(await f('cameraDistance').getAttribute('data-display-unit'),'m');
  await f('cameraDistance').fill('1');await f('cameraDistance').press('Tab');assert.equal(await f('cameraDistance').inputValue(),'100');assert.equal((await state()).cameraDistance,1);
  await f('cameraDistance').fill('29');await f('cameraDistance').press('Tab');assert.equal(await f('cameraDistance').inputValue(),'29');assert.equal((await state()).cameraDistance,.29);
  const slider=page.locator('[data-range=cameraDistance]');await slider.evaluate(e=>{e.value='.8';e.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await state()).cameraDistance,.8);assert.equal(await f('cameraDistance').inputValue(),'80');
 });
 await check('flash hero, depth, scene axes, tables and frame dimensions all expose units',async()=>{
  await tab('플래시');await page.locator('select[data-key=denominator]').selectOption('256');assert.equal(await page.locator('.pfm-value').innerText(),'62.5');assert.equal(await page.locator('.pfm-unit').innerText(),'cm');assert.match(await page.locator('.pfm-ev').innerText(),/80 cm/);
  await tab('존 포커싱');assert.match(await page.locator('.pfm-stat[data-stat=near]').innerText(),/cm/);assert.match(await page.locator('[data-pfm-subject]').getAttribute('aria-valuetext'),/80 cm/);
  const details=page.locator('.pfm-root details').filter({has:page.locator('summary',{hasText:'허용 범위·그림'})}).first();await details.locator('summary').click();await f('diagramMax').fill('0.8');await f('diagramMax').press('Tab');assert.equal(await f('diagramMax').inputValue(),'80');assert.match(await page.locator('svg text.pfm-axis-label').allTextContents().then(a=>a.join(' ')),/20 cm.*40 cm.*60 cm.*80 cm/);
  await page.locator('.pfm-results').scrollIntoViewIfNeeded();await shot('cm-scene');await tab('플래시');await page.locator('.pfm-results').scrollIntoViewIfNeeded();await shot('cm-flash');await tab('통합');await page.locator('.pfm-coverage-results summary').click();assert.match(await page.locator('.pfm-coverage-results').innerText(),/프레임 57.6 cm × 38.4 cm/);
 });
 await check('zone target cm edit, application and restore never introduce 100x conversion',async()=>{
  await tab('존 포커싱');await page.locator('select[data-key=zoneFlow]').selectOption('target');await f('focal').fill('14');await f('zoneNear').fill('0.5');await f('zoneNear').press('Tab');assert.equal(await f('zoneNear').inputValue(),'50');await f('zoneFar').fill('1');await f('zoneFar').press('Tab');assert.equal(await f('zoneFar').inputValue(),'100');
  await page.locator('[data-zone-apply]').click();const i=await state();assert.ok(Math.abs(i.cameraDistance-2/3)<1e-14);assert.equal(await f('cameraDistance').getAttribute('data-display-unit'),'cm');assert.match(await page.locator('.pfm-zone-status').innerText(),/목표 구간 포함/);
  const expected=await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();return (await p.loadData()).inputs;});await page.evaluate(async()=>{await app.plugins.disablePlugin('photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();});assert.deepEqual(await state(),expected);assert.equal(await f('zoneNear').inputValue(),'50');assert.equal(await f('zoneFar').inputValue(),'100');
 });
 await check('actual save button emits adaptive results, canonical input values and readable mobile layouts',async()=>{
  const old=await page.evaluate(()=>app.vault.getMarkdownFiles().map(f=>f.path));await page.getByRole('button',{name:'전체 계산을 노트로 저장',exact:true}).click();await page.waitForFunction(old=>app.vault.getMarkdownFiles().some(f=>!old.includes(f.path)),old);
  const md=await page.evaluate(async old=>{const f=app.vault.getMarkdownFiles().find(f=>!old.includes(f.path));return app.vault.read(f);},old);assert.match(md,/목표 50 cm ~ 100 cm/);assert.match(md,/\| 카메라 거리 m \| 0.6666666666666666 \|/);await writeFile(`${out}/saved.md`,md);
  for(const [width,height]of [[360,800],[390,844],[844,390]]){await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,mobile:true,deviceScaleFactor:1});assert.ok(await page.locator('.pfm-root').evaluate(e=>e.scrollWidth<=e.clientWidth+1));}
  assert.deepEqual(errors,[]);
 });
}finally{
 if(page&&original!==undefined){await page.evaluate(async()=>{await app.plugins.plugins['photo-field-mobile']?.flush();await app.plugins.disablePlugin('photo-field-mobile');});await writeFile(`${vault}/.obsidian/plugins/photo-field-mobile/data.json`,JSON.stringify(original));await page.evaluate(async()=>{await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();});}
 const fingerprints={};for(const f of ['main.js','styles.css','manifest.json'])fingerprints[f]=createHash('sha256').update(await readFile(f)).digest('hex');
 await writeFile(`${out}/results.json`,JSON.stringify({checks,errors,fingerprints,host:'actual Obsidian mobile emulation',actualIOS:false},null,2));await browser.close();
}
assert.ok(checks.length===4&&checks.every(c=>c.passed));
