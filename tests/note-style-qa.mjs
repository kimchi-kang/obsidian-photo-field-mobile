import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338');let page;
try{
 for(const c of browser.contexts())for(const p of c.pages())if(p.url().startsWith('app://obsidian.md/index.html')&&await p.evaluate(()=>app.vault.adapter.basePath)==='/private/tmp/photo-field-qa-vault')page=p;
 assert.ok(page,'Dedicated test vault required');
 const result=await page.evaluate(async()=>{
  const file=await app.vault.create(`QA-style-${Date.now()}.md`,'# 일반 노트 스타일 검사\n\n합성 테스트 문장입니다. 실사용 노트가 아닙니다.\n\n- 기본 목록\n');
  const leaf=app.workspace.getLeaf(false);await leaf.openFile(file,{state:{mode:'preview'}});
  return {path:file.path};
 });
 await page.locator('.markdown-preview-view h1').waitFor();
 result.comparison=await page.evaluate(()=>{
  const sheet=[...document.styleSheets].find(s=>s.ownerNode?.textContent?.startsWith('/* Bauhaus field instrument:'));
  if(!sheet)throw Error('Current plugin stylesheet missing');
  const selectors=['body','.view-header','.mobile-navbar','.markdown-preview-view','.markdown-preview-view h1','.markdown-preview-view p'];
  const props=['color','backgroundColor','fontSize','fontFamily','lineHeight','padding','border','borderRadius','minHeight','display'];
  const read=()=>Object.fromEntries(selectors.map(sel=>{const e=document.querySelector(sel);if(!e)return[sel,null];const s=getComputedStyle(e);return[sel,Object.fromEntries(props.map(p=>[p,s[p]]))];}));
  const enabled=read();try{sheet.disabled=true;return {enabled,disabled:read()};}finally{sheet.disabled=false;}
 });
 assert.deepEqual(result.comparison.enabled,result.comparison.disabled);
 await page.screenshot({path:'docs/mobile-host-qa/screenshots/ordinary-note.png',scale:'css',animations:'disabled'});
 await writeFile('docs/mobile-host-qa/note-style-result.json',JSON.stringify({passed:true,host:'macOS Obsidian mobile emulation',...result},null,2)+'\n');
 console.log('PASS ordinary note and host toolbar computed styles unchanged when plugin CSS is enabled/disabled');
}finally{
 if(page)await page.evaluate(()=>app.plugins.plugins['photo-field-mobile'].open());
 await browser.close();
}
