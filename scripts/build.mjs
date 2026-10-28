import {readFile,mkdir,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const files={'/index.html':'app/index.html','/styles.css':'app/styles.css','/app.js':'app/app.js','/i18n.mjs':'app/i18n.mjs','/concept/index.html':'dist/index.html','/concept/styles.css':'dist/styles.css','/concept/app.js':'dist/app.js'};
const assets=Object.fromEntries(await Promise.all(Object.entries(files).map(async([path,file])=>[path,await readFile(new URL(file,root),'utf8')])));
const engine=await readFile(new URL('server/core.mjs',root),'utf8');
await mkdir(new URL('dist/server/',root),{recursive:true});
await writeFile(new URL('dist/server/language.mjs',root),await readFile(new URL('server/language.mjs',root),'utf8'));
await writeFile(new URL('dist/server/index.js',root),`${engine}\nconst embeddedAssets=${JSON.stringify(assets)};\nexport default {fetch:createHandler(embeddedAssets)};\n`);
console.log('Built portable Worker with embedded assets and the shared evaluation engine.');
