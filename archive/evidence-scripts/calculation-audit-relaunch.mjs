import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,readFile,writeFile} from 'node:fs/promises';
const dir='docs/calculation-audit/relaunch',vault='/private/tmp/photo-field-qa-vault',profile='/private/tmp/photo-field-qa-profile';await mkdir(dir,{recursive:true});
const b=await chromium.connectOverCDP('http://127.0.0.1:9338');let page;
for(const c of b.contexts())for(const p of c.pages())if(p.url().includes('obsidian.md')&&await p.evaluate(()=>app.vault.adapter.basePath)===vault)page=p;
assert.ok(page);assert.equal(await page.evaluate(()=>require('electron').remote.app.getPath('userData')),profile);
if(process.argv[2]==='prepare'){
 const backup=await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();return p.loadData();});await writeFile(`${dir}/original-qa-data.json`,JSON.stringify(backup));
 await page.getByRole('button',{name:'존 포커싱',exact:true}).click();await page.locator('select[data-key=zoneFlow]').selectOption('target');
 const f=k=>page.locator(`input[data-key=${k}]`);await f('zoneInfinity').uncheck();await f('zoneNear').fill('2.125');await f('zoneFar').fill('9.75');await f('zoneInfinity').check();await f('cameraDistance').fill('3.141592653589793');
 const expected=await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();return (await p.loadData()).inputs;});await writeFile(`${dir}/expected.json`,JSON.stringify(expected,null,2));
 const disconnected=new Promise(resolve=>b.once('disconnected',resolve));await page.evaluate(()=>{window.setTimeout(()=>require('electron').remote.app.quit(),200);});await disconnected;console.log('PASS isolated test app quit normally after exact state flush');
}else{
 const expected=JSON.parse(await readFile(`${dir}/expected.json`,'utf8'));await page.evaluate(async()=>{if(!app.isMobile)app.emulateMobile(true);await app.plugins.plugins['photo-field-mobile'].open();});
 const actual=await page.evaluate(()=>({...app.plugins.plugins['photo-field-mobile'].state.inputs}));assert.deepEqual(actual,expected);assert.equal(actual.zoneInfinity,true);assert.equal(actual.zoneFar,9.75);assert.equal(actual.cameraDistance,Math.PI);
 const result={passed:true,scope:'normal isolated app quit and fresh process launch',title:await page.title(),vault,profile,actual};await writeFile(`${dir}/results.json`,JSON.stringify(result,null,2));
 const original=await readFile(`${dir}/original-qa-data.json`,'utf8');await page.evaluate(async()=>{await app.plugins.disablePlugin('photo-field-mobile');});await writeFile(`${vault}/.obsidian/plugins/photo-field-mobile/data.json`,original);await page.evaluate(async()=>{await app.plugins.loadManifest('.obsidian/plugins/photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();});await b.close();console.log('PASS actual process relaunch preserves exact numeric values and infinity intent; QA baseline restored');
}
