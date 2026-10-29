import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addQ20iii,applyEquipment,setGnMode} from '../src/presets';
import {restore,snapshot} from '../src/storage';
import {defaults} from '../src/model';
import {flash} from '../src/engine';
import {note} from '../src/note';

test('Q20III nominal GN20m and seven power levels match the manufacturer manual distances',()=>{
 const state=restore(null);const equipment=addQ20iii(state);assert.deepEqual(equipment.table,{'32':20});assert.equal(state.inputs.zoom,32);
 assert.deepEqual(flash(state.inputs).steps,[1,2,4,8,16,32,64]);
 for(const [denominator,distance]of [[1,5],[4,2.5],[64,.625]])assert.equal(flash({...state.inputs,denominator}).d,distance);
 assert.equal(flash({...state.inputs,denominator:128}).supported,false);
 const md=note(state.inputs,new Date('2026-10-29T00:00:00Z'),{version:'1.2.0',equipment});
 for(const text of ['FlashQ Q20III','https://www.lightpixlabs.com/pages/q20iii','실측값 아님','고정 32mm'])assert.ok(md.includes(text),text);
 assert.equal(flash({...state.inputs,focal:85}).d,2.5);
 state.inputs.zoom=50;applyEquipment(state);assert.throws(()=>flash(state.inputs),/GN 자료 없음/);
});

test('Q20III import preserves custom equipment, draft, manual snapshot and edited copies across restoration',()=>{
 const state=restore(null);state.inputs.gn=17;state.draft={id:'',name:'작성 중 초안',conditions:'합성',source:'QA',table:'50,',unit:'m',minDenominator:'16',steps:'1,2,4,8,16'};
 const first=addQ20iii(state);assert.equal(addQ20iii(state).id,first.id);assert.equal(state.equipment.length,1);assert.equal(state.draft.name,'작성 중 초안');
 first.table['32']=18;const fresh=addQ20iii(state);assert.notEqual(fresh.id,first.id);assert.equal(first.table['32'],18);assert.equal(fresh.table['32'],20);
 const back=restore(snapshot(state,defaults));assert.equal(back.equipment.length,2);assert.equal(back.draft?.table,'50,');assert.equal(back.inputs.equipmentId,fresh.id);assert.equal(flash(back.inputs).d,2.5);
 setGnMode(back,'manual');assert.equal(back.inputs.gn,17);
});
