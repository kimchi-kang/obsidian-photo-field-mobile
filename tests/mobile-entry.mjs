import {chromium} from 'playwright';
import {writeFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
for(const f of ['main.js','manifest.json','styles.css'])await copyFile(f,`/private/tmp/photo-field-qa-vault/.obsidian/plugins/photo-field-mobile/${f}`);
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338');const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('app://obsidian'));
try{
 assert.equal(await page.evaluate(()=>app.vault.adapter.basePath),'/private/tmp/photo-field-qa-vault');
 await page.evaluate(async()=>{await app.plugins.disablePlugin('photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');app.workspace.detachLeavesOfType('photo-field-mobile');});
 await page.locator('.mobile-navbar-action-menu').click();
 const item=page.locator('.menu-item').filter({hasText:'사진 촬영 도우미 열기'});await item.waitFor({state:'visible'});assert.equal(await item.count(),1);
 await page.screenshot({path:'docs/screenshots/mobile-entry-menu.png'});await item.click();await page.locator('.pfm-root').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>app.workspace.getLeavesOfType('photo-field-mobile').length),1);
 await page.screenshot({path:'docs/screenshots/mobile-entry-open.png'});
 await writeFile('docs/mobile-entry-results.json',JSON.stringify({date:new Date().toISOString(),host:'Obsidian mobile emulation on macOS',menu:'사진 촬영 도우미 열기',menuVisible:true,opensItemView:true,actualIos:false,actualAndroid:false},null,2));
 console.log('PASS mobile ribbon menu displays camera action and opens ItemView');
}finally{await browser.close();}
