import {test} from 'node:test';
import assert from 'node:assert/strict';
import {distanceParts,metres} from '../src/units';
import {defaults as filmDefaults} from '../src/model';import {digitalDefaults as defaults} from './digital-reference';
import {note} from '../src/note';
import {flash,optics} from '../src/engine';
import {restore,snapshot} from '../src/storage';
test('distance display selects cm through exactly 1m and metres above it',()=>{
 for(const [value,text]of [[0,'0 cm'],[.005,'0.5 cm'],[.1,'10 cm'],[.29,'29 cm'],[.5,'50 cm'],[.9999,'100 cm'],[.0625,'6.3 cm'],[.12345,'12.3 cm'],[1,'100 cm'],[1.01,'1 m'],[1.05,'1.1 m'],[2.54,'2.5 m'],[12.34,'12.3 m'],[1234.56,'1,234.6 m'],[5,'5 m']]as const)assert.equal(metres(value),text);
 assert.deepEqual(distanceParts(.625),{value:'62.5',unit:'cm'});assert.equal(metres(.000001),'<0.1 cm');assert.equal(metres(Infinity),'∞');
 for(const value of [NaN,-Infinity,-1])assert.equal(metres(value),'—');assert.equal(metres(-0),'0 cm');
});
test('formatting never rescales physical values or serialized settings',()=>{
 const i={...defaults,cameraDistance:.5,flashDistance:.5,focal:35};const before={flash:flash(i),optics:optics(i)};
 for(const value of [.01,.5,1,1.01])metres(value);
 assert.deepEqual({flash:flash(i),optics:optics(i)},before);assert.equal(restore(snapshot({version:2,inputs:i,equipment:[]},defaults)).inputs.cameraDistance,.5);
});
test('saved results use cm with explicit units while original metre inputs remain reproducible',()=>{
 const text=note({...defaults,cameraDistance:.5,flashDistance:.5,denominator:256});
 assert.match(text,/적정 노출 예상 거리: 62.5 cm/);assert.match(text,/\| 그림 최대 거리 \| 15 m \|/);assert.match(text,/플래시–피사체 거리: 50 cm/);assert.match(text,/\| 카메라 거리 \| 50 cm \|/);
 assert.match(text,/카메라 프레임 28.3 cm × 18.9 cm/);assert.doesNotMatch(text,/NaN|undefined|-0 cm/);
});
