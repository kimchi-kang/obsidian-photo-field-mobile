import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338');
const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('app://obsidian'));
const cdp=await page.context().newCDPSession(page);const results=[];
const run=f=>page.evaluate(f);const pass=name=>{results.push(name);console.log('PASS '+name);};
const closed=()=>run(()=>({left:app.workspace.leftSplit.collapsed,right:app.workspace.rightSplit.collapsed}));
const collapse=async()=>{await run(()=>{app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();});await page.waitForTimeout(250);};
async function swipe(x1,y1,x2,y2){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x1,y:y1}]});for(let step=1;step<=12;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x1+(x2-x1)*step/12,y:y1+(y2-y1)*step/12}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(250);}
try{
 assert.equal(await run(()=>app.vault.adapter.basePath),'/private/tmp/photo-field-qa-vault');
 await run(()=>{if(!app.isMobile)app.emulateMobile(true);});await page.waitForFunction(()=>app.workspace.layoutReady);
 await run(async()=>{await app.plugins.disablePlugin('photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();});
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await page.locator('.pfm-root').waitFor();await collapse();
 // Control: the unguarded same surface must actually reproduce the sidebar gesture.
 await page.locator('.workspace-leaf-content[data-type=photo-field-mobile]').evaluate(e=>delete e.dataset.ignoreSwipe);
 await swipe(50,400,330,400);const before=await closed();assert.equal(before.left,false,'control gesture should open the left sidebar');pass('unguarded control reproduces sidebar opening');
 await collapse();await page.locator('.workspace-leaf-content[data-type=photo-field-mobile]').evaluate(e=>e.dataset.ignoreSwipe='true');
 for(const [x1,x2] of [[50,330],[330,50],[3,330],[387,30]]){await swipe(x1,400,x2,400);assert.deepEqual(await closed(),{left:true,right:true});}
 pass('both horizontal directions and edge starts keep sidebars closed');
 const content=page.locator('.pfm-container');await content.evaluate(e=>{e.scrollTop=0;});await swipe(200,650,200,300);assert.ok(await content.evaluate(e=>e.scrollTop)>30);pass('native vertical touch scrolling remains functional');
 const slider=page.locator('[data-range=aperture]');await slider.scrollIntoViewIfNeeded();const box=await slider.boundingBox();const beforeValue=await slider.inputValue();await swipe(box.x+box.width*.3,box.y+box.height/2,box.x+box.width*.7,box.y+box.height/2);assert.notEqual(await slider.inputValue(),beforeValue);assert.deepEqual(await closed(),{left:true,right:true});pass('range dragging changes aperture without opening sidebars');
 await run(()=>{const p=app.plugins.plugins['photo-field-mobile'];p.update('aperture',4);});
 const cleanup=await run(async()=>{const leaf=app.workspace.getLeavesOfType('photo-field-mobile')[0],el=leaf.view.containerEl;leaf.detach();const cleared=!el.hasAttribute('data-ignore-swipe');await app.plugins.plugins['photo-field-mobile'].open();return {cleared,restored:app.workspace.getLeavesOfType('photo-field-mobile')[0].view.containerEl.dataset.ignoreSwipe==='true'};});assert.deepEqual(cleanup,{cleared:true,restored:true});pass('closing cleans attribute and reentry restores scoped guard');
 await run(async()=>{const p=app.plugins.plugins['photo-field-mobile'];const file=app.vault.getFileByPath('Swipe-control.md')??await app.vault.create('Swipe-control.md','# Control\n\nOrdinary note.');await app.workspace.getLeaf(false).openFile(file);});await collapse();await swipe(50,400,330,400);assert.equal((await closed()).left,false);pass('ordinary notes still retain standard sidebar gestures');
 await writeFile('docs/swipe-results.json',JSON.stringify({date:new Date().toISOString(),host:'macOS Obsidian 1.14.5 mobile emulation / CDP touch',actualIos:false,actualAndroid:false,results},null,2));
}finally{await browser.close();}
