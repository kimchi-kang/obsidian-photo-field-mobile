import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const b=await chromium.connectOverCDP('http://127.0.0.1:9338');let page,original;const out='docs/zone-focus/after';
try{
 for(const c of b.contexts())for(const p of c.pages())if(p.url().startsWith('app://obsidian.md/index.html')&&await p.evaluate(()=>app.vault.adapter.basePath)==='/private/tmp/photo-field-qa-vault')page=p;
 assert.ok(page);original=await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();return p.loadData();});
 await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await app.plugins.disablePlugin('photo-field-mobile');await p.saveData(null);await app.plugins.loadManifest('.obsidian/plugins/photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');if(!app.isMobile)app.emulateMobile(true);await app.plugins.plugins['photo-field-mobile'].open();document.body.classList.remove('theme-dark');document.body.classList.add('theme-light');});
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 const field=k=>page.locator(`input[data-key=${k}]`);
 await page.getByRole('button',{name:'존 포커싱',exact:true}).click();await field('cameraDistance').fill('3');
 const current=await page.locator('.pfm-zone-result').innerText();assert.match(current,/3 m에 초점/);
 await page.locator('.pfm-zone-panel').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/current-3m.png`,scale:'css'});
 await page.locator('select[data-key=sensor]').selectOption('apsc');await field('focal').fill('35');await field('aperture').fill('2');
 await page.locator('.pfm-equivalence').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/equivalent-35mm-f2-15x.png`,scale:'css'});
 assert.match(await page.locator('.pfm-equivalence').innerText(),/52.5mm.*f\/3/);
 const camera=page.locator('.pfm-root details').filter({has:page.locator('summary',{hasText:'카메라·렌즈'})}).first();await camera.locator('summary').click();
 await page.locator('select[data-key=cocMode]').selectOption('custom');await field('coc').fill('0.02345');
 await page.locator('.pfm-equivalence').scrollIntoViewIfNeeded();assert.ok(await page.locator('.pfm-equivalence-caveat').isVisible());await page.screenshot({path:`${out}/custom-coc-visible-caveat.png`,scale:'css'});
 await page.locator('select[data-key=cocMode]').selectOption('estimate');

 await page.locator('select[data-key=sensor]').selectOption('ff');await page.locator('select[data-key=zoneFlow]').selectOption('target');
 await field('zoneNear').fill('2');await field('zoneFar').fill('5');await page.locator('[data-zone-apply]').click();assert.equal(await field('aperture').inputValue(),'7.1');
 await page.locator('.pfm-zone-result').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/example-2m-5m-result.png`,scale:'css'});
 await page.locator('.pfm-container').evaluate(e=>e.scrollTop=0);await page.screenshot({path:`${out}/example-2m-5m-scene.png`,scale:'css'});
 await writeFile(`${out}/extra-evidence.json`,JSON.stringify({current,conversion:'APS-C 1.5x actual 35mm f/2 -> 52.5mm, DOF f/3',zoneResult:await page.locator('.pfm-zone-result').innerText(),passed:true},null,2));
 console.log('PASS current-flow 3m, conversion screenshot, FF 35mm 2~5m example at f/7.1');
}finally{
 if(page&&original)await page.evaluate(async d=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();await app.plugins.disablePlugin('photo-field-mobile');await p.saveData(d);await app.plugins.loadManifest('.obsidian/plugins/photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();},original);
 await b.close();
}
