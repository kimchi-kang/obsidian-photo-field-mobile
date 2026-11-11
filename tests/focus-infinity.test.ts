import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults as filmDefaults,assignInput} from '../src/model';import {digitalDefaults as defaults} from './digital-reference';
import {optics,flash,coverage} from '../src/engine';
import {restore} from '../src/storage';
import {capture,applyShot,restoreField,field} from '../src/field';
import {note,validateNote} from '../src/note';
import {solveZone} from '../src/zone';
const close=(a:number,b:number,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('focus infinity: near is (h+f)/1000 from the film plane, far and total are infinite, hyperfocal unchanged',()=>{
 const i={...defaults,focusInfinity:true,cameraDistance:Number.NaN},f=i.focal,c=Math.hypot(i.width,i.height)/1500;
 const o=optics(i),finite=optics({...defaults});
 close(o.near,(f*f/(i.aperture*c)+f)/1000);assert.equal(o.far,Infinity);assert.equal(o.total,Infinity);assert.equal(o.hyperfocal,finite.hyperfocal);
 assert.equal(finite.near,optics({...defaults,focusInfinity:false}).near);assert.ok(Number.isFinite(finite.far));
 assert.throws(()=>optics({...i,aperture:0}));
});
test('flash with focus infinity needs off-camera distance; coverage is refused',()=>{
 assert.throws(()=>flash({...defaults,focusInfinity:true,linked:true}),/무한대/);
 assert.ok(flash({...defaults,focusInfinity:true,linked:false,flashDistance:4}).r===4);
 assert.throws(()=>coverage({...defaults,focusInfinity:true}),/무한대/);
});
test('focusInfinity restores with false fallback',()=>{
 assert.equal(restore({version:2,inputs:{...defaults}}).inputs.focusInfinity,false);
 const {focusInfinity:_,...old}=defaults;assert.equal(restore({version:2,inputs:old,equipment:[]}).inputs.focusInfinity,false);
 assert.equal(restore({version:2,inputs:{...defaults,focusInfinity:true},equipment:[]}).inputs.focusInfinity,true);
 assert.equal(restore({version:2,inputs:{...defaults,focusInfinity:'yes'},equipment:[]}).inputs.focusInfinity,false);
});
test('shots: old shot without focusInfinity kept, round-trip with infinity, bad type rejected',()=>{
 const s=restore(null);const plain=capture(s,'old',true);const {focusInfinity:_,...values}=plain.values;
 const back=restoreField({version:1,shots:[{id:'a',name:'old',values},{id:'b',name:'bad',values:{...values,focusInfinity:'x'}}]});
 assert.deepEqual(back.shots.map(x=>x.id),['a']);assert.ok(!('focusInfinity' in back.shots[0].values));
 s.inputs.focusInfinity=true;const shot=capture(s,'inf',true);assert.equal(shot.values.focusInfinity,true);
 const kept=restoreField(JSON.parse(JSON.stringify({version:1,shots:[shot]}))).shots[0];assert.equal(kept.values.focusInfinity,true);
 s.inputs.focusInfinity=false;applyShot(s,kept);assert.equal(s.inputs.focusInfinity,true);
 applyShot(s,back.shots[0]);assert.equal(s.inputs.focusInfinity,false);
 s.inputs.focusInfinity=true;applyShot(s,capture(s,'no distance',false));assert.equal(s.inputs.focusInfinity,true);
});
test('DOF/zone notes save with infinity and print it',()=>{
 const i={...defaults,focusInfinity:true};
 for(const scope of ['dof','zone'] as const){assert.doesNotThrow(()=>validateNote(i,scope));assert.match(note(i,new Date(0),{version:'t',scope}),/∞ \(무한대 초점\)/);}
 assert.throws(()=>validateNote(i,'combined'));
 assert.doesNotThrow(()=>solveZone({...i,zoneFlow:'target'}));
});
test('explicit distance edits clear focusInfinity but the flag does not clear itself',()=>{
 const i={...defaults,focusInfinity:true};assignInput(i,'focusInfinity',true);assert.equal(i.focusInfinity,true);
 assignInput(i,'flashDistance',3);assert.equal(i.focusInfinity,true);
 assignInput(i,'cameraDistance',2);assert.equal(i.focusInfinity,false);assert.equal(i.cameraDistance,2);
});
