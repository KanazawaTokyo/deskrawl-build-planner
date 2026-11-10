'use strict';
// Deploy builds the latest source on every push. No external packages required.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const cssReference = '<link rel="stylesheet" href="styles.css">';
const jsReferences = ['master.js','runes.js','pets.js','talents.js','calc.js','combat.js','cloud-config.js','pet-ui.js','talent-ui.js','combat-ui.js','stats-view.js','jp-display.js','app.js'].map(file=>`<script src="${file}"></script>`).join('');
const template=read('index.source.html');
if (!template.includes(cssReference) || !template.includes(jsReferences)) {
  throw Error('Template references changed: refused to produce an incomplete build');
}
const css = read('styles.css');
const js = ['master.js','runes.js','pets.js','talents.js','calc.js','combat.js','cloud-config.js','pet-ui.js','talent-ui.js','combat-ui.js','stats-view.js','jp-display.js','app.js'].map(read).join('\n');
if (/<\/script/i.test(js)) throw Error('Unexpected closing script tag in source');
const html=template.replace(cssReference,`<style>\n${css}\n</style>`)
                   .replace(jsReferences,`<script>\n${js}\n</script>`);
const dist=path.join(root,'dist');
fs.mkdirSync(dist,{recursive:true});
fs.writeFileSync(path.join(dist,'index.html'),html,'utf8');
fs.writeFileSync(path.join(dist,'.nojekyll'),'','utf8');
console.log(`PASS: built dist/index.html (${Buffer.byteLength(html)} bytes)`);
