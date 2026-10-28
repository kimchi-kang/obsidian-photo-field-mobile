import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../src/model';
import {note,validateNote} from '../src/note';

test('valid optics can be exported with missing GN, unsupported mode and invalid coverage',()=>{
 const i={...defaults,tab:'dof' as const,mode:'hss' as const,gn:0,zoom:105,horizontal:NaN,coverage:'angles' as const};
 validateNote(i,'dof');assert.throws(()=>validateNote(i));assert.throws(()=>validateNote(i,'combined'));
 const md=note(i,new Date(),{version:'1.2.0',scope:'dof'});
 assert.match(md,/현재 탭 · 심도·화각/);assert.match(md,/심도 근거리/);assert.match(md,/수평\/수직\/대각 화각/);
 assert.doesNotMatch(md,/적정 노출 예상 거리:|플래시 조사 범위|NaN|ISO100 최대 출력 GN \|/);
});
test('optics-only export still rejects invalid optics rather than exporting unavailable results',()=>{
 for(const patch of [{aperture:NaN},{cameraDistance:0},{cocMode:'custom' as const,coc:NaN}])assert.throws(()=>validateNote({...defaults,...patch},'dof'));
});
test('flash export keeps theoretical classification and rejects unsupported flash model',()=>{
 const i={...defaults,denominator:3,cocMode:'custom' as const,coc:NaN};
 validateNote(i,'flash');assert.throws(()=>validateNote(i));
 const md=note(i,new Date(),{version:'1.2.0',scope:'flash'});assert.match(md,/이론값·장비 미지원 출력/);assert.doesNotMatch(md,/심도 근거리|플래시 조사 범위/);
 assert.throws(()=>validateNote({...i,mode:'hss'},'flash'));
});
test('all and combined exports retain full validation and result sections',()=>{
 for(const scope of ['all','combined'] as const){validateNote(defaults,scope);const md=note(defaults,new Date(),{version:'1.2.0',scope});for(const text of ['심도 근거리','적정 노출 예상 거리: 5 m','플래시 조사 범위'])assert.ok(md.includes(text));assert.throws(()=>validateNote({...defaults,coverage:'angles',horizontal:NaN},scope));}
});
