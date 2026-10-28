import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SCENE,sceneDistance} from '../src/diagram';
test('scene position maps to metric focus distance independent of view size',()=>{
 assert.equal(sceneDistance((SCENE.start+SCENE.end)/2,10,50),5);
 assert.equal(sceneDistance(SCENE.end,10,50),10);
});
test('dragging cannot produce a nonphysical focus distance or exceed scene extent',()=>{
 assert.ok(Math.abs(sceneDistance(-100,10,50)-0.051)<1e-12);
 assert.equal(sceneDistance(1000,10,50),10);
 assert.ok(sceneDistance(0,0.01,50)>0.05);
});
