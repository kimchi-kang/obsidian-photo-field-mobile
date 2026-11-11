// Actual Obsidian ItemView only. Never select or mutate the live vault.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/mobile-host-qa',shots=`${out}/screenshots`;
await mkdir(shots,{recursive:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338',{timeout:5000});
let page,original,cdp;const results=[],screenshots=[],errors=[];
try{
 for(const context of browser.contexts())for(const candidate of context.pages()){
  if(!candidate.url().startsWith('app://obsidian.md/index.html'))continue;
  if(await candidate.evaluate(()=>app.vault.adapter.basePath)==='/private/tmp/photo-field-qa-vault')page=candidate;
 }
 assert.ok(page,'Dedicated photo test vault must be running');
 page.setDefaultTimeout(4000);page.on('pageerror',e=>errors.push(e.message));
 original=await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();return {data:await p.loadData(),theme:document.body.classList.contains('theme-dark')?'dark':'light',font:document.documentElement.style.fontSize};});
 cdp=await page.context().newCDPSession(page);
 await page.evaluate(async()=>{if(!app.isMobile)app.emulateMobile(true);const p=app.plugins.plugins['photo-field-mobile'];await app.plugins.disablePlugin('photo-field-mobile');await p.saveData(null);await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();});
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 const size=async(w,h)=>cdp.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,mobile:true,deviceScaleFactor:1});
 const theme=async(t,large=false)=>page.evaluate(({t,large})=>{document.body.classList.remove('theme-dark','theme-light');document.body.classList.add('theme-'+t);document.documentElement.style.fontSize=large?'20px':'';},{t,large});
 const capture=async name=>{await page.screenshot({path:`${shots}/${name}.png`,scale:'css',animations:'disabled'});screenshots.push(name);};
 const top=()=>page.locator('.pfm-container').evaluate(e=>e.scrollTop=0);
 const open=async text=>{const d=page.locator('.pfm-root details').filter({has:page.locator('summary',{hasText:text})}).first();if(!await d.evaluate(e=>e.open))await d.locator('summary').click();};
 const check=async(name,fn)=>{try{await fn();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:String(e)});console.log('FAIL '+name+': '+e.message);}};
 await check('four mobile viewports and both themes keep all three tab layouts inside the viewport',async()=>{
  for(const [w,h]of [[360,800],[390,844],[430,932],[844,390]])for(const t of ['light','dark']){
   await size(w,h);await theme(t);
   for(const [name,key]of [['통합','combined'],['플래시','flash'],['심도·화각','dof']]){
    await page.getByRole('button',{name,exact:true}).click();await top();
    assert.ok(await page.locator('.pfm-root').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${w}/${t}/${key}`);
    await capture(`${w}-${h}-${t}-${key}`);
   }
  }
 });
 await check('large text and reduced available height keep both save buttons reachable above host overlays',async()=>{
  for(const[w,h,t]of [[390,534,'light'],[430,600,'dark'],[844,260,'light']]){
   await size(w,h);await theme(t,true);
   assert.ok(await page.locator('.pfm-root').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   for(const name of ['현재 탭 결과 저장','전체 계산을 노트로 저장']){
    const button=page.getByRole('button',{name,exact:true});await button.scrollIntoViewIfNeeded();
    assert.ok(await button.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.height>=44&&e.contains(hit);}),`${w}/${h}/${name}`);
   }
   await capture(`${w}-${h}-${t}-large-footer`);
  }
 });
 await size(390,844);await theme('light');await page.getByRole('button',{name:'통합',exact:true}).click();
 await check('expanded camera and GN controls retain scroll position when closed in view',async()=>{
  await open('카메라·렌즈');await open('플래시·GN');
  // Target the actual Korean summary, without relying on source ordering.
  const camera=page.locator('.pfm-root details > summary').filter({hasText:'카메라·렌즈'});
  await camera.scrollIntoViewIfNeeded();await capture('expanded-camera');
  const before=await page.locator('.pfm-container').evaluate(e=>e.scrollTop);await camera.click();
  const after=await page.locator('.pfm-container').evaluate(e=>e.scrollTop);
  assert.ok(Math.abs(after-before)<3,`scroll changed ${before} -> ${after}`);
  await open('플래시·GN');await page.locator('input[data-key=gn]').scrollIntoViewIfNeeded();await capture('expanded-gn');
 });
 await check('blank input and equipment editor states remain readable without horizontal overflow',async()=>{
  await page.locator('input[data-key=gn]').fill('');await top();await capture('blank-gn');
  await page.locator('input[data-key=gn]').fill('40');
  await open('내 장비');
  await page.getByLabel('새 장비 이름',{exact:true}).fill('합성 QA 장비 · 긴 이름과 출처 확인 '.repeat(4));
  await page.getByLabel('측정 조건 (ISO100·최대 출력·직접광 등)',{exact:true}).fill('합성 ISO100 최대출력 직접광 조건');
  await page.getByLabel('출처 URL·설명서 페이지 또는 실측 방법',{exact:true}).fill('합성 출처 · 실제 장비 아님 '.repeat(8));
  await page.getByPlaceholder('줌mm,GN',{exact:true}).fill('50,40\n105,55');
  await page.getByLabel('새 장비 이름',{exact:true}).scrollIntoViewIfNeeded();await capture('equipment-add');
  await page.getByRole('button',{name:'새 장비 프리셋 저장',exact:true}).click();
  const equipment=page.getByLabel('저장된 장비',{exact:true});
  const id=await equipment.locator('option').nth(1).getAttribute('value');assert.ok(id);
  await equipment.selectOption(id);
  await page.getByRole('button',{name:'선택 장비 편집',exact:true}).click();
  await page.getByLabel('장비 이름',{exact:true}).scrollIntoViewIfNeeded();await capture('equipment-edit');
  assert.ok(await page.locator('.pfm-root').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await page.getByRole('button',{name:'편집 취소 · 초안 비우기',exact:true}).click();
  await page.getByRole('button',{name:'선택 장비 삭제',exact:true}).click();
  await page.getByRole('button',{name:'삭제 되돌리기',exact:true}).scrollIntoViewIfNeeded();await capture('equipment-delete-undo');
  await page.getByRole('button',{name:'삭제 되돌리기',exact:true}).click();
  assert.equal(await page.getByLabel('저장된 장비',{exact:true}).locator('option').count(),2);
 });
 await check('all visible control targets remain at least 44px and no uncaught errors were observed',async()=>{
  const short=await page.locator('.pfm-root button:visible,.pfm-root input:not([type=checkbox]):visible,.pfm-root select:visible,.pfm-root summary:visible').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().height<43.9).map(e=>e.outerHTML.slice(0,120)));
  assert.deepEqual(short,[]);assert.deepEqual(errors,[]);
 });
}finally{
 if(original&&page)await page.evaluate(async o=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();await app.plugins.disablePlugin('photo-field-mobile');await p.saveData(o.data);await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();document.documentElement.style.fontSize=o.font;document.body.classList.remove('theme-light','theme-dark');document.body.classList.add('theme-'+o.theme);},original);
 if(cdp)await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});
 await writeFile(`${out}/emulation-results.json`,JSON.stringify({date:new Date().toISOString(),host:'macOS Obsidian mobile emulation; Chromium; iOS screen-size proxy only',vault:'/private/tmp/photo-field-qa-vault',mobileMode:'app.emulateMobile(true)',cdpMobile:true,touchEnabled:true,actualIos:false,results,errors,screenshots},null,2)+'\n');
 await browser.close();
}
assert.ok(results.every(r=>r.passed),'mobile host QA failed');
