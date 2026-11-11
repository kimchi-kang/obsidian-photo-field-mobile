import{chromium}from'playwright';import assert from'node:assert/strict';import{copyFile,mkdir,writeFile}from'node:fs/promises';
const out='docs/slider-alignment',phase=process.env.BASELINE==='1'?'baseline':'after',vault='/private/tmp/photo-field-qa-vault';await mkdir(`${out}/${phase}`,{recursive:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9338');let page,original;const samples=[],results=[];
try{
 for(const c of browser.contexts())for(const p of c.pages())if(p.url().startsWith('app://obsidian.md/index.html')&&await p.evaluate(()=>app.vault.adapter.basePath)===vault)page=p;
 assert.ok(page,'Dedicated test vault required');page.setDefaultTimeout(4000);original=await page.evaluate(async()=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();return p.loadData();});
 for(const f of['main.js','manifest.json','styles.css'])await copyFile(phase==='baseline'?`${out}/before/${f}`:f,`${vault}/.obsidian/plugins/photo-field-mobile/${f}`);
 await page.evaluate(async()=>{const w=require('electron').remote.getCurrentWindow();if(w.isMinimized())w.restore();if(!w.isVisible())w.show();const p=app.plugins.plugins['photo-field-mobile'];await app.plugins.disablePlugin('photo-field-mobile');await p.saveData(null);await app.plugins.enablePlugin('photo-field-mobile');if(!app.isMobile)app.emulateMobile(true);await app.plugins.plugins['photo-field-mobile'].open();document.documentElement.style.fontSize='';});
 await page.locator('.pfm-check').click();
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});await cdp.send('DOM.enable');
 async function geometry(key){
  const document=await cdp.send('DOM.getDocument',{depth:0}),q=await cdp.send('DOM.querySelector',{nodeId:document.root.nodeId,selector:`input[data-range=${key}]`});
  const tree=await cdp.send('DOM.describeNode',{nodeId:q.nodeId,depth:8,pierce:true});const ids={};
  function walk(n){const a=n.attributes??[],i=a.indexOf('id');if(i>=0&&['track','thumb'].includes(a[i+1]))ids[a[i+1]]=n.backendNodeId;for(const type of['children','shadowRoots'])for(const c of n[type]??[])walk(c);}walk(tree.node);
  assert.ok(ids.track&&ids.thumb,'Native range shadow track and thumb must be measurable');
  const boxes={};for(const key of['track','thumb']){const {model}=await cdp.send('DOM.getBoxModel',{backendNodeId:ids[key]});boxes[key]={centreX:(model.border[0]+model.border[2]+model.border[4]+model.border[6])/4,centreY:(model.border[1]+model.border[3]+model.border[5]+model.border[7])/4,height:model.height};}
  return {...boxes,delta:boxes.thumb.centreY-boxes.track.centreY};
 }
 for(const [width,height]of [[360,800],[390,844],[430,932],[844,390]])for(const theme of['light','dark']){
  await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,mobile:true,deviceScaleFactor:1});await page.evaluate(t=>{document.body.classList.remove('theme-light','theme-dark');document.body.classList.add('theme-'+t);},theme);
  for(const key of['cameraDistance','aperture','focal','flashDistance']){
   const range=page.locator(`input[data-range=${key}]`);
   // Start at the opposite endpoint so the native touch gesture crosses drag slop.
   await page.locator(`input[data-key=${key}]`).fill(await range.evaluate(e=>e.max));
   await range.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
   for(const fraction of[0,.5,1]){
    const box=await range.boundingBox();assert.ok(box&&box.height>=44);const x=box.x+12+(box.width-24)*fraction,y=box.y+box.height/2;
    const limits=await range.evaluate(e=>({min:Number(e.min),max:Number(e.max),step:Number(e.step),value:Number(e.value)}));
    const initial=await geometry(key),start=initial.thumb.centreX,dragY=initial.thumb.centreY;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y:dragY}]});
    for(let n=1;n<=12;n++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start+(x-start)*n/12,y:dragY}]});await page.waitForTimeout(20);}
    samples.push({width,height,theme,key,fraction,state:'pressed',...await geometry(key)});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    samples.push({width,height,theme,key,fraction,state:'released',...await geometry(key)});
    const value=Number(await range.inputValue());
    assert.equal(value,Number(await page.locator(`input[data-key=${key}]`).inputValue()),`${key} numeric/slider sync`);
    if(fraction===0||fraction===1)assert.equal(value,fraction===0?limits.min:limits.max,`${key} reaches endpoint by touch`);
    else assert.ok(Math.abs(value-(limits.min+(limits.max-limits.min)*fraction))<=limits.step,`${key} reaches the middle by touch`);
   }
  }
 }
 const failures=samples.filter(s=>Math.abs(s.delta)>.5);results.push({name:'native thumb and track centres align within 0.5px at rest and while pressed',passed:failures.length===0,failures:failures.length,samples:samples.length});
 results.push({name:'CDP touch min/middle/max values match the direct numeric inputs and targets stay >=44px',passed:true});
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});
 await page.evaluate(()=>{const p=app.plugins.plugins['photo-field-mobile'];Object.assign(p.state.inputs,{cameraDistance:5,aperture:4,focal:50,flashDistance:5,linked:false});app.workspace.getLeavesOfType('photo-field-mobile')[0].view.render();document.body.classList.remove('theme-dark');document.body.classList.add('theme-light');});
 await page.locator('.pfm-quick').evaluate(e=>{const c=e.closest('.pfm-container');c.scrollTop+=e.getBoundingClientRect().top-c.getBoundingClientRect().top-12;});
 await page.screenshot({path:`${out}/${phase}/quick-controls.png`,scale:'css',animations:'disabled',timeout:15000});
 for(const result of results)console.log(`${result.passed?'PASS':'FAIL'} ${result.name}: ${result.failures??0} failures`);
}finally{if(page&&original)await page.evaluate(async data=>{const p=app.plugins.plugins['photo-field-mobile'];await p.flush();await app.plugins.disablePlugin('photo-field-mobile');await p.saveData(data);await app.plugins.enablePlugin('photo-field-mobile');await app.plugins.plugins['photo-field-mobile'].open();},original);await writeFile(`${out}/${phase}/results.json`,JSON.stringify({host:'macOS Obsidian mobile emulation; Chromium native range shadow geometry',actualIos:false,phase,results,samples},null,2)+'\n');await browser.close();}
assert.ok(results.length===2&&results.every(r=>r.passed),'slider alignment regression failed');
