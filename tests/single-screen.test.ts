import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {buildSync} from 'esbuild';
import {assignInput,defaults} from '../src/model';
import {restore,snapshot} from '../src/storage';
import {modeNoteScope,note} from '../src/note';
import {sceneUpperLimit} from '../src/diagram';

test('예전 탭을 한 번 매핑하고 이후에는 두 토글의 저장값을 따른다',()=>{
  const {flashOn:flashDefault,zoneOn:zoneDefault,...old}=defaults;
  assert.deepEqual([flashDefault,zoneDefault,restore(null).inputs.linked],[false,false,true]);
  for(const [tab,flashOn,zoneOn] of [['flash',true,false],['combined',true,false],['zone',false,true],['dof',false,false]] as const){
    const state=restore({version:2,inputs:{...old,tab}});
    assert.deepEqual([state.inputs.flashOn,state.inputs.zoneOn,state.inputs.tab],[flashOn,zoneOn,tab]);
    Object.assign(state.inputs,{flashOn:!flashOn,zoneOn:!zoneOn});
    const restored=restore(snapshot(state,defaults)).inputs;
    assert.deepEqual([restored.flashOn,restored.zoneOn,restored.tab],[!flashOn,!zoneOn,tab]);
  }
  const existing=restore({version:2,inputs:{...old,tab:'flash',linked:false,flashDistance:3}});
  assert.deepEqual([existing.inputs.flashOn,existing.inputs.linked,existing.inputs.flashDistance],[true,false,3]);
});

test('두 토글의 네 조합에 맞춰 저장 범위를 선택한다',()=>{
  for(const [flashOn,zoneOn,scope] of [[false,false,'dof'],[true,false,'combined'],[false,true,'zone'],[true,true,'all']] as const)
    assert.equal(modeNoteScope({flashOn,zoneOn}),scope);
  const both={...defaults,flashOn:true,zoneOn:true,zoneFlow:'target' as const};
  assert.match(note(both,new Date(0),{version:'시험',scope:modeNoteScope(both)}),/zone_near_m:.*[\s\S]*존 포커싱 역산/);
});

test('그림 상한은 유효한 거리의 1.3배를 포함하는 첫 눈금이며 저장값은 그대로 둔다',()=>{
  for(const [far,max] of [[3,5],[5,10],[10,15],[12,30],[50,30],[Infinity,5]]){
    const i={...defaults,cameraDistance:2,diagramMax:17,zoneFar:35,flashDistance:30,linked:false};
    assert.equal(sceneUpperLimit(i,far),max);
    assert.equal(i.diagramMax,17);
  }
  assert.equal(sceneUpperLimit({...defaults,zoneOn:true,zoneNear:3,zoneFar:8},5),15);
  assert.equal(sceneUpperLimit({...defaults,zoneOn:true,zoneNear:3,zoneFar:30,zoneInfinity:true,cameraDistance:2},Infinity),5);
  assert.equal(sceneUpperLimit({...defaults,flashOn:true,linked:false,flashDistance:14},5),30);
});

test('첫 활성화는 온카메라로 시작하고 이후에는 선택한 오프카메라 설정을 기억한다',()=>{
  const state=restore({version:2,inputs:{tab:'dof',linked:false,flashDistance:3}});
  assert.equal(state.inputs.flashWasEnabled,false);
  assignInput(state.inputs,'flashOn',true);
  assert.equal(state.inputs.linked,true);
  assert.equal(state.inputs.flashDistance,3);
  assignInput(state.inputs,'linked',false);
  assignInput(state.inputs,'flashOn',false);
  const recovered=restore(snapshot(state,defaults)).inputs;
  assignInput(recovered,'flashOn',true);
  assert.equal(recovered.flashWasEnabled,true);
  assert.equal(recovered.linked,false);
  assert.equal(recovered.flashDistance,3);
});

const require=createRequire(import.meta.url);
const {JSDOM}=require('jsdom') as {JSDOM:new (html:string,options:{runScripts:'outside-only'})=>{window:Window&typeof globalThis}};
test('모드별 DOM, 권장 출력, 존 조절과 저장 상태가 함께 갱신된다',()=>{
  const source=buildSync({
    stdin:{contents:`export {PhotoView} from './src/view'; export {restore} from './src/storage';
      export {updateShootingInput} from './src/shooting-presets';`,resolveDir:process.cwd()},
    bundle:true,format:'cjs',external:['obsidian'],write:false,
  }).outputFiles[0].text;
  const {window}=new JSDOM('<div id="host"></div>',{runScripts:'outside-only'});
  const {document}=window;
  try{
    const host=document.getElementById('host')!;
    class ItemView {
      containerEl=host;
      contentEl=host.appendChild(document.createElement('main'));
    }
    Object.assign(window.HTMLElement.prototype,{addClass(this:HTMLElement,name:string){this.classList.add(name);}});
    const bundle={exports:{}};
    new window.Function('module','require',source)(bundle,()=>({ItemView,Notice:class{}}));
    const {PhotoView,restore,updateShootingInput}=bundle.exports as {
      PhotoView:new (leaf:object,plugin:object)=>Pick<import('../src/view').PhotoView,'render'|'updateSaveStatus'>;
      restore:typeof import('../src/storage').restore;
      updateShootingInput:typeof import('../src/shooting-presets').updateShootingInput;
    };
    const state=restore(null);
    state.lenses.push({...state.lenses[0],id:'test-lens',name:'테스트 렌즈',apertureMin:11,apertureMax:16,apertureSteps:[11,16]});
    const plugin={
      state,saveError:'',persist:async()=>{},flush:async()=>{},refresh:()=>{},
      update:(key:keyof typeof state.inputs,value:typeof state.inputs[typeof key])=>updateShootingInput(state,key,value),
      saveNote:async()=>'',saveCheatsheet:async()=>'',
      setFocusInfinity:(on:boolean)=>{state.inputs.focusInfinity=on;},
      report:(e:unknown)=>{throw e;},reportSaveError:(e:unknown)=>{throw e;},
    };
    const view=new PhotoView({},plugin);
    view.render();
    const query=<E extends Element=Element>(selector:string)=>host.querySelector<E>(selector);
    const attribute=(selector:string,key:string)=>query(selector)?.getAttribute(key);
    const button=(selector:string)=>{
      const control=query(selector);
      assert.ok(control instanceof window.HTMLButtonElement,selector);
      return control;
    };
    const input=(key:string,value:string)=>{
      const control=query(`input[data-key=${key}]`);
      assert.ok(control instanceof window.HTMLInputElement,key);
      control.value=value;
      control.dispatchEvent(new window.Event('input',{bubbles:true}));
    };
    const cards=()=>[...host.querySelectorAll('.pfm-results > div')].map(n=>n.className);
    const subject='[data-pfm-subject]',flash='[data-mode=flashOn]',zone='[data-mode=zoneOn]';
    assert.deepEqual(cards(),['pfm-dof-results']);
    assert.ok(query(subject));
    assert.equal(attribute(flash,'aria-pressed'),'false');
    assert.equal(attribute(zone,'aria-pressed'),'false');
    assert.equal(host.querySelectorAll('.pfm-save').length,1);
    assert.equal(query('.pfm-cheatsheet-save'),null);
    assert.equal(button('.pfm-retry').hidden,true);
    plugin.saveError='저장 실패';view.updateSaveStatus();
    assert.equal(button('.pfm-retry').hidden,false);
    plugin.saveError='';view.updateSaveStatus();
    assert.equal(button('.pfm-retry').hidden,true);
    for(const selector of [
      '.pfm-tabs,.pfm-field-viewbar,.pfm-field-tools,.pfm-distance-buttons',
      '.pfm-dof-details,.pfm-equivalence,.pfm-footer-notes',
      '[data-key=tab],[data-key=zoneFlow],[data-key=coverage],[data-key=diagramMax],[data-key=tolerance]',
    ])assert.equal(query(selector),null,selector);
    const sections=[...host.querySelector('.pfm-root')!.children].filter(element=>!element.classList.contains('pfm-bulb-flash'));
    assert.deepEqual(sections.map(section=>section.className||section.querySelector('summary')?.textContent||section.tagName),[
      'pfm-gear-bar','pfm-mode-toggles','pfm-results','pfm-diagram','pfm-quick','장노출 · 상반칙 불궤','FOOTER','카메라·렌즈·필름 프리셋',
    ]);

    button(flash).click();
    assert.deepEqual(cards(),['pfm-flash-results','pfm-dof-results']);
    assert.ok(query('.pfm-safe-range'));
    assert.equal(attribute('[data-pfm-settings=flash]','open'),null);
    assert.ok(query('.pfm-cheatsheet-save'));
    const initialPower=state.inputs.denominator;
    button('[data-power-direction=weaker]').click();
    assert.ok(state.inputs.denominator>initialPower);
    button('[data-power-direction=stronger]').click();
    assert.equal(state.inputs.denominator,initialPower);
    const recommend='.pfm-output-action p',ev='.pfm-ev';
    const checkExposureChanges=(edit:()=>void)=>{
      const before=[query(recommend)?.textContent,query(ev)?.textContent];
      edit();
      assert.notEqual(query(recommend)?.textContent,before[0]);
      assert.notEqual(query(ev)?.textContent,before[1]);
    };
    checkExposureChanges(()=>input('cameraDistance','2'));
    checkExposureChanges(()=>input('aperture','8'));
    checkExposureChanges(()=>input('iso','100'));
    const selectPreset=(kind:string,index:number)=>{
      button(`[data-preset-chip=${kind}]`).click();
      const choice=host.querySelectorAll<HTMLInputElement>('.pfm-gear-picker input[type=radio]')[index];
      assert.ok(choice);
      choice.click();
    };
    checkExposureChanges(()=>selectPreset('films',1));
    checkExposureChanges(()=>selectPreset('lenses',2));
    selectPreset('lenses',1);
    const link='.pfm-link-toggle';
    assert.equal(attribute(link,'aria-pressed'),'true');
    button(link).click();
    assert.equal(query('.pfm-safe-range'),null);
    assert.equal(query<HTMLInputElement>('[data-key=flashDistance]')?.disabled,false);
    button(link).click();

    button(zone).click();
    assert.deepEqual(cards(),['pfm-flash-results','pfm-zone-result']);
    assert.equal(query(subject),null);
    assert.equal(query('[data-key=cameraDistance]'),null);
    // 기본 목표는 ∞까지: 거리링 위치·조리개별 표가 보이고 구간 손잡이는 없다.
    assert.equal(attribute('[data-zone-goal=infinity]','aria-pressed'),'true');
    assert.match(query('.pfm-zone-solution')!.textContent!,/\d m$/);
    assert.ok(host.querySelectorAll('.pfm-ring-row').length>=3);
    assert.equal(query('[data-zone-handle]'),null);
    const ring=state.inputs.cameraDistance;
    button('[data-zone-apply]').click();
    assert.notEqual(state.inputs.cameraDistance,ring);
    button('[data-zone-goal=range]').click();
    assert.equal(state.inputs.zoneGoal,'range');
    assert.ok(query('.pfm-target-zone'));
    assert.ok(query('.pfm-zone-depth'));
    assert.ok(query('.pfm-zone-miss'));
    for(const handle of host.querySelectorAll('.pfm-zone-hit')){
      assert.equal(handle.getAttribute('width'),'60');
      assert.equal(handle.getAttribute('height'),'60');
    }
    const near='[data-zone-handle=zoneNear]',far='[data-zone-handle=zoneFar]';
    const previous=state.inputs.zoneNear;
    query(near)!.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    assert.ok(state.inputs.zoneNear>previous);
    const oldFar=state.inputs.zoneFar;
    query(far)!.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
    assert.ok(state.inputs.zoneFar<oldFar);

    class TestPointerEvent extends window.MouseEvent {readonly pointerId=1;}
    Object.assign(window,{PointerEvent:TestPointerEvent});
    const picture=query<HTMLElement>('.pfm-diagram')!;
    let captured=false;
    picture.setPointerCapture=()=>{captured=true;};
    picture.hasPointerCapture=()=>captured;
    picture.releasePointerCapture=()=>{captured=false;};
    window.SVGSVGElement.prototype.getBoundingClientRect=()=>new window.DOMRect(0,0,400,250);
    const farBeforeDrag=state.inputs.zoneFar;
    const sceneMax=Number(attribute('[data-scene]','data-scene-max'));
    const handleX=Number(attribute(`${far} .pfm-zone-handle-dot`,'cx'));
    const pointer=(target:Element,type:string,x:number)=>target.dispatchEvent(new TestPointerEvent(type,{clientX:x,bubbles:true}));
    pointer(query(far)!,'pointerdown',handleX);
    assert.equal(captured,true);
    pointer(picture,'pointermove',handleX-15);
    assert.ok(state.inputs.zoneFar<farBeforeDrag);
    assert.equal(Number(attribute('[data-scene]','data-scene-max')),sceneMax);
    pointer(picture,'pointerup',handleX-15);
    assert.equal(captured,false);

    button('[data-zone-apply]').click();
    assert.equal(query('.pfm-zone-miss'),null);
    button(flash).click();
    assert.deepEqual(cards(),['pfm-zone-result']);
    const infinity=query('[data-key=zoneInfinity]');
    assert.ok(infinity instanceof window.HTMLInputElement);
    infinity.click();
    assert.equal(query(far),null);
    assert.match(query('.pfm-zone-axis-label')?.textContent??'',/∞/);
    assert.equal(state.inputs.zoneFlow,'current');
  }finally{window.close();}
});

test('플러그인 로드가 이전 탭을 한 번 저장하고 명령 세 개만 등록한다',async()=>{
  const source=buildSync({
    entryPoints:['src/main.ts'],bundle:true,format:'cjs',external:['obsidian'],write:false,
  }).outputFiles[0].text;
  const {window}=new JSDOM('',{runScripts:'outside-only'});
  const registered:string[]=[];
  let saved:unknown={version:2,inputs:{tab:'zone',zoneFlow:'current',diagramMax:12}};
  let writes=0;
  class HostPlugin {
    manifest={id:'photo-field-mobile',dir:'plugin'};
    app={
      workspace:{getLeavesOfType:()=>[]},
      vault:{adapter:{read:async()=>JSON.stringify(saved)}},
    };
    loadData=async()=>saved;
    saveData=async(value:unknown)=>{saved=value;writes++;};
    registerDomEvent=()=>{};
    registerView=()=>{};
    addCommand=({id}:{id:string})=>{registered.push(id);};
    addRibbonIcon=()=>{};
  }
  try{
    const bundle={exports:{}};
    new window.Function('module','require',source)(bundle,()=>({
      Plugin:HostPlugin,ItemView:class{},Notice:class{},normalizePath:(value:string)=>value,
    }));
    const {default:Plugin}=bundle.exports as {default:new()=>Pick<import('../src/main').default,'onload'|'flush'>};
    const first=new Plugin();
    await first.onload();await first.flush();
    const i=restore(saved).inputs;
    assert.deepEqual([i.tab,i.flashOn,i.zoneOn,i.zoneFlow,i.diagramMax],['zone',false,true,'current',12]);
    assert.equal(writes,1);
    assert.deepEqual(registered,['open','save-note','save-cheatsheet']);
    const second=new Plugin();
    await second.onload();await second.flush();
    assert.equal(writes,1);
  }finally{window.close();}
});
