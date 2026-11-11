import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {copyFile,mkdir,writeFile} from 'node:fs/promises';
const out='docs/mobile-followup',phase=process.env.BASELINE==='1'?'baseline':'after',vault='/private/tmp/photo-field-qa-vault';
await mkdir(`${out}/${phase}`,{recursive:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338');let page,original;const results=[],exceptions=[];
try{
 for(const c of browser.contexts())for(const p of c.pages())if(p.url().startsWith('app://obsidian.md/index.html')&&await p.evaluate(()=>app.vault.adapter.basePath)===vault)page=p;
 assert.ok(page,'Dedicated test vault required before copying or changing anything');page.setDefaultTimeout(4000);
 await page.evaluate(()=>{const w=require('electron').remote.getCurrentWindow();if(w.isMinimized())w.restore();if(!w.isVisible())w.show();});
 original=await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();return p.loadData();});
 for(const file of ['main.js','manifest.json','styles.css'])await copyFile(phase==='baseline'?`${out}/before/${file}`:file,`${vault}/.obsidian/plugins/photo-field-mobile/${file}`);
 page.on('pageerror',e=>exceptions.push(e.message));
 await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await app.plugins.disablePlugin('photo-field-mobile');await p.saveData(null);await app.plugins.enablePlugin('photo-field-mobile');if(!app.isMobile)app.emulateMobile(true);await app.plugins.plugins['photo-field-mobile'].open();app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 const input=k=>page.locator(`.pfm-root input[data-key=${k}]`);
 const size=async(w,h)=>cdp.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,mobile:true,deviceScaleFactor:1});
 const theme=async(t,font)=>page.evaluate(({t,font})=>{document.body.classList.remove('theme-light','theme-dark');document.body.classList.add('theme-'+t);document.documentElement.style.fontSize=font===16?'':'20px';},{t,font});
 const top=()=>page.locator('.pfm-container').evaluate(e=>e.scrollTop=0);
 const capture=async name=>{await page.bringToFront();await page.screenshot({path:`${out}/${phase}/${name}.png`,scale:'css',animations:'disabled',timeout:15000});};
 const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:String(e)});console.log('FAIL '+name+': '+e.message);}};
 await check('large flash values and EV never overlap at normal/large text in either theme',async()=>{
  const failures=[];
  for(const [w,h]of [[360,800],[390,844],[430,932],[844,390]])for(const t of ['light','dark'])for(const font of [16,20]){
   await size(w,h);await theme(t,font);await page.getByRole('button',{name:'플래시',exact:true}).click();
   for(const[iso,n]of [[100,4],[6400,1.4],[102400,.7]]){
    await input('iso').fill(String(iso));await input('aperture').fill(String(n));await input('denominator').fill('1');await top();
    const geometry=await page.locator('.pfm-flash-results').evaluate(e=>{
     const panel=e.getBoundingClientRect(),ev=e.querySelector('.pfm-ev').getBoundingClientRect();
     const rects=[e.querySelector('.pfm-value'),e.querySelector('.pfm-unit')].flatMap(el=>[...el.getClientRects()]);
     const overlaps=rects.some(r=>r.left<ev.right-1&&r.right>ev.left+1&&r.top<ev.bottom-1&&r.bottom>ev.top+1);
     return {overlaps,clipped:rects.some(r=>r.right>panel.right+1||r.left<panel.left-1),value:e.querySelector('.pfm-hero').innerText};
    });
    if(w===390&&t==='light'&&font===20&&iso===6400)await capture('large-text-high-iso');
    if(geometry.overlaps||geometry.clipped)failures.push({w,h,t,font,iso,n,...geometry});
   }
  }
  await writeFile(`${out}/${phase}/result-layout-failures.json`,JSON.stringify(failures,null,2)+'\n');assert.deepEqual(failures,[]);
 });
 await check('DOF does not show unused flash-coverage errors; combined still reports them',async()=>{
  await size(390,844);await theme('light',16);await input('iso').fill('100');await input('aperture').fill('4');await input('denominator').fill('4');
  const d=page.locator('.pfm-root details').filter({has:page.locator('summary',{hasText:'플래시·GN'})}).first();if(!await d.evaluate(e=>e.open))await d.locator('summary').click();
  await input('zoom').fill('');await page.getByRole('button',{name:'심도·화각',exact:true}).click();
  await page.locator('.pfm-dof-details summary').scrollIntoViewIfNeeded();await capture('dof-unused-flash-error');
  assert.equal(await page.locator('[data-stat=near] strong').innerText(),'4.07 m');
  assert.equal(await page.locator('.pfm-result-details .pfm-error:visible').count(),0);
  assert.equal(await page.locator('.pfm-coverage-results:visible').count(),0);
  await page.getByRole('button',{name:'통합',exact:true}).click();assert.ok(await page.locator('.pfm-result-details .pfm-error:visible').count()>0);
  assert.match(await page.locator('.pfm-result-details .pfm-error:visible').innerText(),/프레임·조사 범위 비교/);
 });
 await check('valid DOF-only Markdown saves with missing flash zoom while full/invalid optical results reject',async()=>{
  await page.getByRole('button',{name:'심도·화각',exact:true}).click();
  const before=await page.evaluate(()=>app.vault.getMarkdownFiles().map(f=>f.path));await page.getByRole('button',{name:'현재 탭 결과 저장',exact:true}).click();
  await page.waitForFunction(old=>app.vault.getMarkdownFiles().some(f=>!old.includes(f.path)),before);
  const content=await page.evaluate(async old=>{const f=app.vault.getMarkdownFiles().find(f=>!old.includes(f.path));return app.vault.read(f);},before);
  assert.match(content,/현재 탭 · 심도·화각/);assert.doesNotMatch(content,/적정 노출 예상 거리:|플래시 조사 범위/);
  assert.equal(await page.evaluate(async()=>{try{await app.plugins.plugins['photo-field-mobile'].saveNote();return false;}catch{return true;}}),true);
  await input('aperture').fill('');assert.ok(await page.locator('.pfm-dof-results .pfm-error:visible').count()>0);
  assert.equal(await page.evaluate(async()=>{try{await app.plugins.plugins['photo-field-mobile'].saveNote('dof');return false;}catch{return true;}}),true);
 });
 await check('GN decimal cursor regression remains fixed after layout changes',async()=>{
  await input('aperture').fill('4');await input('zoom').fill('50');await page.getByRole('button',{name:'통합',exact:true}).click();
  const gn=input('gn');await gn.fill('');await gn.pressSequentially('40.5');assert.equal(await gn.inputValue(),'40.5');await gn.press('ArrowLeft');await gn.pressSequentially('2');assert.equal(await gn.inputValue(),'40.25');assert.ok(await gn.evaluate(e=>e===document.activeElement));assert.deepEqual(exceptions,[]);
 });
}finally{
 if(page&&original)await page.evaluate(async data=>{document.documentElement.style.fontSize='';const p=app.plugins.plugins['photo-field-mobile'];await p.flush();await app.plugins.disablePlugin('photo-field-mobile');await p.saveData(data);await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();},original);
 await writeFile(`${out}/${phase}/results.json`,JSON.stringify({date:new Date().toISOString(),host:'macOS Obsidian mobile emulation; no actual iOS claim',phase,results,exceptions},null,2)+'\n');await browser.close();
}
assert.ok(results.every(r=>r.passed),'mobile followup regression failed');
