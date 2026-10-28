import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('runtime imports only Obsidian host API, all bundled inputs are our TS',()=>{
 const meta=JSON.parse(readFileSync(new URL('../docs/build-meta.json',import.meta.url),'utf8'));
 for(const name of Object.keys(meta.inputs))assert.ok(/^src\/.+\.ts$/.test(name),name);
 for(const entry of meta.outputs['main.js'].imports)assert.equal(entry.path,'obsidian');
 const source=readFileSync(new URL('../main.js',import.meta.url),'utf8');assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket|eval)\s*\(/.test(source));assert.ok(!/require\(["'](node:|fs|path|electron|https?)/.test(source));
 assert.ok(source.includes(readFileSync(new URL('../vendor/depth-of-field-LICENSE.txt',import.meta.url),'utf8')), 'BRAT 3-file installation preserves full upstream MIT license');
 assert.equal(JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url),'utf8')).isDesktopOnly,false);
});
