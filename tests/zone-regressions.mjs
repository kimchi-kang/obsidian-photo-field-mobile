// Reuse original regression scripts without overwriting earlier QA evidence.
import {readFile,writeFile,unlink,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const mappings=[['mobile-followup','docs/mobile-followup','followup'],['q20iii-ui','docs/q20iii','q20iii'],['slider-alignment','docs/slider-alignment','slider'],['mobile-host-qa','docs/mobile-host-qa','host']];
await mkdir('docs/zone-focus',{recursive:true});let failed=false;
for(const [name,old,out]of mappings){
 const file=new URL(`.zone-regression-${name}.mjs`,import.meta.url);
 let source=(await readFile(new URL(`${name}.mjs`,import.meta.url),'utf8')).replaceAll(old,`docs/zone-focus/regressions/${out}`);
 source=source.replaceAll("await app.plugins.enablePlugin('photo-field-mobile');","await app.plugins.loadManifest('.obsidian/plugins/photo-field-mobile');await app.plugins.enablePlugin('photo-field-mobile');");
 if(name==='slider-alignment')source=source.replace("page.locator('.pfm-check')","page.locator('.pfm-quick .pfm-check')");
 try{await writeFile(file,source);const r=spawnSync(process.execPath,[file.pathname],{encoding:'utf8'});const log=(r.stdout??'')+(r.stderr??'');await writeFile(`docs/zone-focus/regression-${out}.log`,log);process.stdout.write(log);if(r.status!==0)failed=true;}finally{await unlink(file);}
}
if(failed)process.exitCode=1;
