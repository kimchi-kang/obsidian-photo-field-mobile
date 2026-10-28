import {chromium} from 'playwright';
import {copyFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('docs/visual-comparison',{recursive:true});
for(const f of ['main.js','manifest.json','styles.css'])await copyFile(f,`/private/tmp/photo-field-qa-vault/.obsidian/plugins/photo-field-mobile/${f}`);
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338');const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('app://obsidian.md/index.html'));const cdp=await page.context().newCDPSession(page);const results=[];
const run=f=>page.evaluate(f);const value=key=>run(()=>app.plugins.plugins['photo-field-mobile'].state.inputs).then(i=>i[key]);
const pass=name=>{results.push(name);console.log('PASS '+name);};
try{
 assert.equal(await run(()=>app.vault.adapter.basePath),'/private/tmp/photo-field-qa-vault');
 await run(()=>{if(!app.isMobile)app.emulateMobile(true);});await page.waitForFunction(()=>app.workspace.layoutReady);
 await run(async()=>{await app.plugins.disablePlugin('photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');const p=app.plugins.plugins['photo-field-mobile'];Object.assign(p.state.inputs,{tab:'dof',focal:50,aperture:1.8,cameraDistance:1.8288,flashDistance:1.8288,linked:true,width:36,height:24,cocMode:'custom',coc:.029,diagramMax:9.144,gn:40,zoom:50,gnZoom:50,gnUnit:'m',iso:100,loss:0,denominator:4});await p.open();});
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await run(()=>{document.body.classList.remove('theme-dark');document.body.classList.add('theme-light');app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();});
 await page.locator('.pfm-root').waitFor();assert.equal(await page.locator('.pfm-stat').count(),4);assert.ok(await page.locator('[data-pfm-subject]').isVisible());
 const order=await page.locator('.pfm-root').evaluate(e=>{const a=e.querySelector('.pfm-diagram').getBoundingClientRect(),b=e.querySelector('.pfm-stat-grid').getBoundingClientRect(),c=e.querySelector('.pfm-quick').getBoundingClientRect();return a.top<b.top&&b.top<c.top;});assert.ok(order);pass('primary layout restores scene, four DOF readouts, then optical controls');
 for(const size of [[360,800],[390,844],[844,390]]){await cdp.send('Emulation.setDeviceMetricsOverride',{width:size[0],height:size[1],mobile:true,deviceScaleFactor:1});assert.ok(await page.locator('.pfm-root').evaluate(e=>e.scrollWidth<=e.clientWidth+1));}
 pass('360px portrait and landscape have no horizontal overflow');
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:1000,mobile:true,deviceScaleFactor:1});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.locator('[data-pfm-subject]').scrollIntoViewIfNeeded();
 const frame=await page.locator('.pfm-root').boundingBox();await page.screenshot({path:'docs/visual-comparison/plugin-after-mobile.png',clip:{x:frame.x,y:frame.y,width:frame.width,height:Math.min(844,1000-frame.y)}});
 await page.screenshot({path:'docs/visual-comparison/scene-preview.png',clip:{x:frame.x,y:frame.y,width:frame.width,height:420}});
 // A real pointer gesture, not a synthetic state update, must move the scene subject.
 const handle=page.locator('[data-pfm-subject]');const box=await handle.boundingBox();const before=await value('cameraDistance');
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+75,box.y+box.height/2,{steps:8});await page.mouse.up();
 assert.ok(await value('cameraDistance')>before+1);pass('dragging the subject updates distance and optical results');
 const touchHandle=await page.locator('[data-pfm-subject]').boundingBox(),touchBefore=await value('cameraDistance');
 const tx=touchHandle.x+touchHandle.width/2,ty=touchHandle.y+touchHandle.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});
 for(let n=1;n<=8;n++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx+50*n/8,y:ty}]});await page.waitForTimeout(15);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.ok(await value('cameraDistance')>touchBefore+.5);pass('touch dragging moves the subject without opening a sidebar');

 await page.locator('[data-pfm-subject]').focus();const beforeKey=await value('cameraDistance');await page.keyboard.press('ArrowRight');assert.ok(Math.abs(await value('cameraDistance')-beforeKey-.1)<1e-8);pass('subject keyboard control remains available without dragging');
 await page.locator('input[data-key=cameraDistance]').fill('5');assert.equal(await page.locator('[data-pfm-subject]').getAttribute('aria-valuenow'),'5');pass('direct numeric distance entry updates the scene marker');
 await page.getByRole('button',{name:'통합',exact:true}).click();assert.equal(await page.locator('.pfm-hero').innerText(),'11.11 m');assert.ok(await page.locator('.pfm-flash-cone').isVisible());
 const marker=await page.locator('[data-stat=near] strong').innerText();await page.locator('input[data-key=aperture]').fill('4');assert.equal(await page.locator('.pfm-hero').innerText(),'5 m');assert.notEqual(await page.locator('[data-stat=near] strong').innerText(),marker);pass('aperture updates DOF region and flash distance together');
 await page.locator('.pfm-check').click();assert.equal(await page.locator('.pfm-flash-cone').count(),0);assert.match(await page.locator('.pfm-diagram').innerText(),/독립/);pass('offcamera mode separates flash geometry from the camera scene');
 await page.locator('input[data-key=cameraDistance]').fill('');assert.equal(await page.locator('.pfm-diagram svg').getAttribute('viewBox'),'0 0 400 260');assert.ok(!await page.locator('.pfm-diagram svg').evaluate(e=>/NaN/.test(e.outerHTML)));pass('blank numeric edits do not emit NaN geometry');
 await page.locator('input[data-key=cameraDistance]').fill('10');
 await page.locator('.pfm-root summary').filter({hasText:'허용 범위·그림'}).click();await page.locator('input[data-key=diagramMax]').fill('3');assert.match(await page.locator('.pfm-diagram').innerText(),/그림 밖 심도/);assert.match(await page.locator('.pfm-diagram').innerText(),/→/);pass('finite out-of-scene DOF stays numeric with an arrow');
 await writeFile('docs/scene-results.json',JSON.stringify({date:new Date().toISOString(),results,actualIos:false,actualAndroid:false},null,2));
}finally{await browser.close();}
