// Actual plugin bundle in the separate macOS Obsidian QA vault.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {copyFile,mkdir,writeFile} from 'node:fs/promises';
const baseline=process.env.BASELINE==='1',phase=baseline?'before':'after',out=`docs/zone-focus/${phase}`,vault='/private/tmp/photo-field-qa-vault';
await mkdir(out,{recursive:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338');let page,original;const checks=[],errors=[];
try{
 for(const c of browser.contexts())for(const p of c.pages())if(p.url().startsWith('app://obsidian.md/index.html')&&await p.evaluate(()=>app.vault.adapter.basePath)===vault)page=p;
 assert.ok(page,'dedicated QA vault required');page.setDefaultTimeout(5000);
 original=await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];if(p){await p.flush();return p.loadData();}return JSON.parse(await app.vault.adapter.read('.obsidian/plugins/photo-field-mobile/data.json'));});
 await page.evaluate(async()=>{await app.plugins.disablePlugin('photo-field-mobile');});
 for(const f of ['main.js','styles.css','manifest.json'])await copyFile(baseline?`docs/zone-focus/before/${f}`:f,`${vault}/.obsidian/plugins/photo-field-mobile/${f}`);
 await writeFile(`${vault}/.obsidian/plugins/photo-field-mobile/data.json`,'null');
 await page.evaluate(async()=>{await app.plugins.loadManifest('.obsidian/plugins/photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');if(!app.isMobile)app.emulateMobile(true);await app.plugins.plugins['photo-field-mobile'].open();app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();const w=require('electron').remote.getCurrentWindow();if(w.isMinimized())w.restore();if(!w.isVisible())w.show();});
 page.on('pageerror',e=>errors.push(e.message));
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 const size=async(w,h)=>cdp.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,mobile:true,deviceScaleFactor:1});
 const theme=async(t,large=false)=>page.evaluate(({t,large})=>{document.body.classList.remove('theme-light','theme-dark');document.body.classList.add('theme-'+t);document.documentElement.style.fontSize=large?'20px':'';},{t,large});
 const top=()=>page.locator('.pfm-container').evaluate(e=>e.scrollTop=0);
 const shot=async name=>{await page.evaluate(()=>app.plugins.plugins['photo-field-mobile']?.noteNotice?.hide());await page.bringToFront();await page.screenshot({path:`${out}/${name}.png`,scale:'css',animations:'disabled',timeout:15000});};
 const field=k=>page.locator(`input[data-key=${k}]`);
 const tab=async name=>{await page.getByRole('button',{name,exact:true}).click();await top();};
 const open=async name=>{const d=page.locator('.pfm-root details').filter({has:page.locator('summary',{hasText:name})}).first();if(!await d.evaluate(e=>e.open))await d.locator('summary').click();};
 const check=async(name,fn)=>{try{await fn();checks.push({name,passed:true});console.log('PASS '+name);}catch(e){checks.push({name,passed:false,error:String(e)});console.log('FAIL '+name+': '+e.stack);}};
 if(baseline){for(const [w,h]of [[360,800],[390,844],[430,932],[844,390]]){await size(w,h);await theme('light');await tab('심도·화각');await shot(`${w}-${h}-light-dof`);} }
 else{
 await check('real ItemView runs in dedicated vault with mobile emulation',async()=>{assert.equal(await page.evaluate(()=>app.isMobile),true);assert.equal(await page.locator('.pfm-version').innerText(),'v1.3.0');assert.ok(await page.locator('.pfm-version').isVisible());assert.equal(await page.locator('.workspace-leaf-content[data-type=photo-field-mobile]').count(),1);});
 await check('decimal target and focus entry, explicit application, infinity and independent flash save',async()=>{
  await size(390,844);await theme('light');await tab('존 포커싱');await page.locator('select[data-key=zoneFlow]').selectOption('target');
  await field('focal').fill('35');await field('zoneNear').fill('2.25');await field('zoneFar').fill('7.75');
  await field('cameraDistance').fill('3.125');assert.equal(await field('cameraDistance').inputValue(),'3.125');
  await page.locator('[data-zone-apply]').click();assert.match(await page.locator('.pfm-zone-status').innerText(),/목표 구간 포함/);
  await page.locator('.pfm-zone-panel').scrollIntoViewIfNeeded();await shot('390-target-finite');
  await page.locator('input[data-key=zoneInfinity]').check();assert.equal(await field('zoneFar').isDisabled(),true);await page.locator('[data-zone-apply]').click();assert.match(await page.locator('.pfm-zone-result').innerText(),/∞/);await shot('390-target-infinity');
  await open('플래시·GN');await field('gn').fill('');await field('zoom').fill('');
  await page.getByRole('button',{name:'현재 탭 결과 저장',exact:true}).click();
  const saved=await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];const path=await p.saveNote('zone');return {path,text:await app.vault.adapter.read(path),inputs:{...p.state.inputs}};});
  assert.match(saved.text,/존 포커싱 역산/);assert.match(saved.text,/목표 원거리 무한대 \| true/);assert.doesNotMatch(saved.text,/플래시 계산 불가/);
  await writeFile(`${out}/saved-zone.md`,saved.text);await writeFile(`${out}/saved-inputs.json`,JSON.stringify(saved.inputs,null,2));
 });
 await check('nominal conversion label and camera dimension caveats update without losing input focus',async()=>{
  await page.locator('select[data-key=sensor]').selectOption('apsc');await field('focal').fill('35');await field('aperture').fill('2');
  assert.match(await page.locator('.pfm-equivalence').innerText(),/52.5mm.*f\/3/);assert.match(await page.locator('.pfm-equivalence').innerText(),/실치수 대각 계수/);
  await page.locator('select[data-key=sensor]').selectOption('apsc16');assert.match(await page.locator('.pfm-equivalence').innerText(),/56mm.*f\/3.2/);
  await page.locator('select[data-key=sensor]').selectOption('apsc');
  await field('cameraDistance').fill('');await field('cameraDistance').pressSequentially('3.125');await field('cameraDistance').press('ArrowLeft');await field('cameraDistance').pressSequentially('2');assert.equal(await field('cameraDistance').inputValue(),'3.1225');assert.ok(await field('cameraDistance').evaluate(e=>document.activeElement===e));
 });
 await check('viewport/theme/large font matrix, all tabs, scroll and footer reachability',async()=>{
  await page.locator('input[data-key=zoneInfinity]').uncheck();await field('zoneNear').fill('2');await field('zoneFar').fill('5');await page.locator('[data-zone-apply]').click();
  for(const [w,h]of [[360,800],[390,844],[430,932],[844,390],[390,440],[844,260]])for(const t of ['light','dark'])for(const large of [false,true]){
   await size(w,h);await theme(t,large);
   for(const name of ['플래시','심도·화각','통합','존 포커싱']){
    await tab(name);assert.ok(await page.locator('.pfm-root').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${w}/${h}/${t}/${large}/${name}`);
   }
   await shot(`${w}-${h}-${t}-${large?'large':'normal'}-zone`);
   await page.locator('.pfm-zone-panel').scrollIntoViewIfNeeded();await shot(`${w}-${h}-${t}-${large?'large':'normal'}-controls`);
   const save=page.getByRole('button',{name:'현재 탭 결과 저장',exact:true});await save.scrollIntoViewIfNeeded();assert.ok(await save.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'footer overlap');
  }
 });
 await check('touch drag, slider and vertical scrolling keep working',async()=>{
  await size(390,844);await theme('light');await tab('존 포커싱');
  const before=Number(await field('cameraDistance').inputValue());const box=await page.locator('[data-pfm-subject]').boundingBox();assert.ok(box);
  const x=box.x+box.width/2,y=box.y+box.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+40,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(Math.abs(Number(await field('cameraDistance').inputValue())-before)>.1);
  const slider=page.locator('input[data-range=cameraDistance]');await slider.scrollIntoViewIfNeeded();const r=await slider.boundingBox();
  // CDP produces actual touch events even though the existing context has no Playwright hasTouch flag.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width*.6,y:r.y+r.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(Number(await field('cameraDistance').inputValue())>10);
  await top();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:300,y:600}]});for(let y=550;y>=250;y-=50)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:300,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(await page.locator('.pfm-container').evaluate(e=>e.scrollTop)>0);
 });
 await check('impossible ranges, blank values, long finite endpoints and custom CoC stay readable',async()=>{
  await tab('존 포커싱');await field('zoneNear').fill('5');await field('zoneFar').fill('2');assert.match(await page.locator('.pfm-zone-result').innerText(),/작아야/);
  await field('zoneNear').fill('');assert.ok(await page.locator('.pfm-zone-result .pfm-error').count());
  await field('zoneNear').fill('1');await field('zoneFar').fill('10000000000');await field('focal').fill('85');await field('apertureMax').fill('2');assert.match(await page.locator('.pfm-zone-status').innerText(),/달성 불가/);
  await open('카메라·렌즈');await page.locator('select[data-key=cocMode]').selectOption('custom');await field('coc').fill('0.02345');assert.match(await page.locator('.pfm-equivalence').innerText(),/사용자 지정 CoC/);
  await field('cameraDistance').fill('123456789.125');await top();await shot('long-finite-error');assert.ok(await page.locator('.pfm-root').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 });
 await check('settings restore and ItemView reentry retain zone and conversion criteria',async()=>{
  await open('카메라·렌즈');await page.locator('select[data-key=cropBasis]').selectOption('dimensions');
  const expected=await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();return (await p.loadData()).inputs;});
  await page.evaluate(async()=>{await app.plugins.disablePlugin('photo-field-mobile');await app.plugins.loadManifest('.obsidian/plugins/photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();});
  assert.deepEqual(await page.evaluate(()=>({...app.plugins.plugins['photo-field-mobile'].state.inputs})),expected);
  assert.equal(await page.locator('select[data-key=cropBasis]').inputValue(),'dimensions');await tab('통합');await tab('존 포커싱');assert.equal(await field('zoneNear').inputValue(),'1');assert.deepEqual(errors,[]);
 });
 }
}finally{
 if(page){await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];if(p)await p.flush();await app.plugins.disablePlugin('photo-field-mobile');});await writeFile(`${vault}/.obsidian/plugins/photo-field-mobile/data.json`,JSON.stringify(original??null));await page.evaluate(async()=>{await app.plugins.loadManifest('.obsidian/plugins/photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();document.documentElement.style.fontSize='';});}
 await writeFile(`${out}/results.json`,JSON.stringify({date:new Date().toISOString(),phase,vault,host:'Obsidian ItemView + app.emulateMobile(true) + CDP mobile viewport and actual touch events',actualIOS:false,checks,errors},null,2));await browser.close();
}
assert.ok(checks.every(c=>c.passed),'zone mobile QA failed');
