import {build} from 'esbuild';
import {writeFileSync,readFileSync} from 'node:fs';
const license=readFileSync('vendor/depth-of-field-LICENSE.txt','utf8');
const r=await build({entryPoints:['src/main.ts'],bundle:true,external:['obsidian'],platform:'browser',format:'cjs',target:'es2020',outfile:'main.js',metafile:true,banner:{js:'/* Photo Field Mobile — independent mobile adaptation and extension.\n'+license+'\nSee THIRD_PARTY_NOTICES.md for attribution and changes. */'}});
writeFileSync('docs/build-meta.json',JSON.stringify(r.metafile,null,2));
