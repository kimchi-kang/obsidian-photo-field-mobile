import{chromium}from'playwright';import assert from'node:assert/strict';import{copyFile,mkdir,writeFile}from'node:fs/promises';
const out='docs/q20iii',vault='/private/tmp/photo-field-qa-vault';await mkdir(out+'/screenshots',{recursive:true});
const b=await chromium.connectOverCDP('http://127.0.0.1:9338');let page,original;const results=[],errors=[];
try{
 for(const c of b.contexts())for(const p of c.pages())if(p.url().startsWith('app://obsidian.md/index.html')&&await p.evaluate(()=>app.vault.adapter.basePath)===vault)page=p;
 assert.ok(page);page.setDefaultTimeout(4000);original=await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();return p.loadData();});
 for(const f of['main.js','styles.css','manifest.json'])await copyFile(f,`${vault}/.obsidian/plugins/photo-field-mobile/${f}`);
 await page.evaluate(async()=>{const w=require('electron').remote.getCurrentWindow();if(w.isMinimized())w.restore();if(!w.isVisible())w.show();const p=app.plugins.plugins['photo-field-mobile'];await app.plugins.disablePlugin('photo-field-mobile');await p.saveData(null);await app.plugins.enablePlugin('photo-field-mobile');if(!app.isMobile)app.emulateMobile(true);await app.plugins.plugins['photo-field-mobile'].open();document.documentElement.style.fontSize='';document.body.classList.remove('theme-dark');document.body.classList.add('theme-light');});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});page.on('pageerror',e=>errors.push(e.message));
 const input=k=>page.locator(`.pfm-root input[data-key=${k}]`);
 const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:String(e)});console.log('FAIL '+name+': '+e.message);}};
 const shot=async name=>{await page.waitForFunction(()=>![...document.querySelectorAll('.notice-container .notice')].some(e=>e.getBoundingClientRect().height>0),null,{timeout:10000});await page.screenshot({path:`${out}/screenshots/${name}.png`,scale:'css',animations:'disabled',timeout:15000});};
 const gear=page.locator('.pfm-root details').filter({has:page.locator('summary',{hasText:'내 장비'})}).first();
 await gear.locator('summary').click();await page.getByLabel('새 장비 이름',{exact:true}).fill('QA 작성 중 초안');
 await check('touch import selects Q20III GN20/32mm and preserves the unfinished draft without duplicate imports',async()=>{
  const button=page.getByRole('button',{name:'FlashQ Q20III 추가·선택',exact:true});await button.scrollIntoViewIfNeeded();const r=await button.boundingBox();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>app.plugins.plugins['photo-field-mobile'].state.inputs.gnMode==='equipment');
  assert.equal(await input('gn').inputValue(),'20');assert.equal(await input('zoom').inputValue(),'32');assert.equal(await page.locator('.pfm-hero').innerText(),'2.5 m');
  await button.click();assert.equal(await page.evaluate(()=>app.plugins.plugins['photo-field-mobile'].state.equipment.length),1);assert.equal(await page.getByLabel('새 장비 이름',{exact:true}).inputValue(),'QA 작성 중 초안');
  await button.scrollIntoViewIfNeeded();await shot('preset-selected');
 });
 await check('all seven hardware powers calculate; lens focal length is independent and missing flash zoom blocks calculation',async()=>{
  const power=page.getByRole('combobox',{name:'출력 선택',exact:true});assert.deepEqual(await power.locator('option').evaluateAll(es=>es.map(e=>e.value)),['1','2','4','8','16','32','64']);
  for(const[n,d]of [['1','5 m'],['2','3.54 m'],['4','2.5 m'],['8','1.77 m'],['16','1.25 m'],['32','0.88 m'],['64','0.63 m']]){await power.selectOption(n);assert.equal(await page.locator('.pfm-hero').innerText(),d);}
  await power.selectOption('4');await input('focal').fill('85');assert.equal(await page.locator('.pfm-hero').innerText(),'2.5 m');
  const flash=page.locator('.pfm-root details').filter({has:page.locator('summary',{hasText:'플래시·GN'})}).first();if(!await flash.evaluate(e=>e.open))await flash.locator('summary').click();
  await input('zoom').fill('50');assert.equal(await page.locator('.pfm-hero').innerText(),'—');await input('zoom').fill('32');
  await input('denominator').fill('128');assert.match(await page.locator('.pfm-warning').innerText(),/이론값/);await input('denominator').fill('4');
  await page.locator('.pfm-container').evaluate(e=>e.scrollTop=0);await shot('q20iii-calculation');
 });
 await check('Markdown records Q20III manufacturer source and matched conditions; reload restores equipment and draft',async()=>{
  const before=await page.evaluate(()=>app.vault.getMarkdownFiles().map(f=>f.path));await page.getByRole('button',{name:'전체 계산을 노트로 저장',exact:true}).click();await page.waitForFunction(old=>app.vault.getMarkdownFiles().some(f=>!old.includes(f.path)),before);
  const md=await page.evaluate(async old=>{const f=app.vault.getMarkdownFiles().find(f=>!old.includes(f.path));return app.vault.read(f);},before);
  for(const text of['FlashQ Q20III','https://www.lightpixlabs.com/pages/q20iii','적정 노출 예상 거리: 2.5 m','실측값 아님'])assert.ok(md.includes(text),text);
  await writeFile(out+'/example-note.md',md);
  await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();await app.plugins.disablePlugin('photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();});
  assert.equal(await page.locator('.pfm-hero').innerText(),'2.5 m');assert.equal(await page.evaluate(()=>app.plugins.plugins['photo-field-mobile'].state.draft.name),'QA 작성 중 초안');assert.deepEqual(errors,[]);
 });
}finally{if(page&&original)await page.evaluate(async data=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();await app.plugins.disablePlugin('photo-field-mobile');await p.saveData(data);await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();},original);await writeFile(out+'/ui-results.json',JSON.stringify({date:new Date().toISOString(),host:'macOS Obsidian mobile emulation',actualIos:false,results,errors},null,2)+'\n');await b.close();}
assert.ok(results.every(r=>r.passed),'Q20III UI regression failed');
