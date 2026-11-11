import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
const b=await chromium.connectOverCDP('http://127.0.0.1:9338');const page=b.contexts()[0].pages().find(p=>p.url().startsWith('app://obsidian.md/index.html'));
assert.equal(await page.evaluate(()=>app.vault.adapter.basePath),'/private/tmp/photo-field-qa-vault');
if(process.argv[2]==='prepare'){
 const expected=await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];p.update('iso',250);await p.persist();await p.flush();return p.loadData();});
 await writeFile('/private/tmp/photo-field-preparation-relaunch.json',JSON.stringify(expected));
 const cdp=await b.newBrowserCDPSession();const disconnected=new Promise(resolve=>b.once('disconnected',resolve));await Promise.race([cdp.send('Browser.close'),disconnected]);console.log('Dedicated QA app closed normally after confirmed settings write.');
}else{
 const expected=JSON.parse(await readFile('/private/tmp/photo-field-preparation-relaunch.json','utf8'));await page.waitForFunction(()=>!!app.plugins.plugins['photo-field-mobile']);const actual=await page.evaluate(()=>app.plugins.plugins['photo-field-mobile'].state);assert.deepEqual(actual,expected);
 await writeFile('docs/preparation/relaunch.json',JSON.stringify({date:new Date().toISOString(),passed:true,host:'macOS Obsidian 1.14.5 mobile emulation',method:'CDP Browser.close on dedicated QA app; relaunch same QA profile; compare restored full Saved state',actualIos:false,actualAndroid:false},null,2));console.log('PASS normal dedicated-app relaunch restores last completed snapshot');await b.close();
}
