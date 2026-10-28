import {mkdir,writeFile,copyFile} from 'node:fs/promises';
const vault='/private/tmp/photo-field-qa-vault',profile='/private/tmp/photo-field-qa-profile';
await mkdir(`${vault}/.obsidian/plugins/photo-field-mobile`,{recursive:true});await mkdir(profile,{recursive:true});
for(const file of ['main.js','manifest.json','styles.css'])await copyFile(new URL('../'+file,import.meta.url),`${vault}/.obsidian/plugins/photo-field-mobile/${file}`);
await writeFile(`${profile}/obsidian.json`,JSON.stringify({vaults:{f0f0f0f0f0f0f0f0:{path:vault,ts:Date.now(),open:true}}}));
await writeFile(`${vault}/.obsidian/community-plugins.json`,JSON.stringify(['photo-field-mobile']));
console.log('QA fixture prepared. Launch Obsidian with --user-data-dir='+profile+' --remote-debugging-port=9338');
