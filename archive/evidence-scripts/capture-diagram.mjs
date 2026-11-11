import {chromium} from 'playwright';
const b=await chromium.connectOverCDP('http://127.0.0.1:9338');const p=b.contexts()[0].pages().find(p=>p.url().startsWith('app://obsidian'));
await p.evaluate(async()=>{await app.plugins.enablePlugin('photo-field-mobile');const plug=app.plugins.plugins['photo-field-mobile'];Object.assign(plug.state.inputs,{cameraDistance:10,flashDistance:10,linked:true,diagramMax:3,aperture:4,focal:50});await plug.open();});
const svg=p.locator('.pfm-diagram svg');await svg.first().screenshot({path:'docs/screenshots/finite-outside-diagram.png'});await p.locator('.pfm-diagram').screenshot({path:'docs/screenshots/coverage-cones.png'});console.log(await p.locator('.pfm-diagram').innerText());await b.close();
