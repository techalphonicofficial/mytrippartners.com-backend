/* Exports the website catalogue (packages, destinations, departures, coupons) to admin/catalog.json.
   Usage: node tools/export-catalog.js ../site/src   (run again whenever the website data changes) */
const fs=require('fs'), path=require('path'), vm=require('vm');
const src=path.resolve(process.argv[2]||path.join(__dirname,'../../site/src'));
const code=['data.js','places-data.js','weekend-data.js','festive-data.js','packages2-data.js'].map(f=>fs.readFileSync(path.join(src,f),'utf8')).join('\n');
const dep=fs.readFileSync(path.join(src,'extra.js'),'utf8').match(/const DEPARTURES = \[[\s\S]*?\n\];/)[0];
const cp=fs.readFileSync(path.join(src,'improve.js'),'utf8').match(/CONFIG\.coupons = CONFIG\.coupons \|\| \{[\s\S]*?\n\};/)[0];
const ctx={}; vm.createContext(ctx);
vm.runInContext(code+'\n'+dep+'\n'+cp+'\nFESTIVE.forEach(p=>DEPARTURES.push([p.id,p.fx.dep]));\nthis.OUT={CONFIG,DEST,PKG,DEPARTURES,THEMES};',ctx);
const {CONFIG,DEST,PKG,DEPARTURES,THEMES}=ctx.OUT, D=id=>DEST.find(d=>d.id===id)||{};
const out={exported:new Date().toISOString(),
 config:{phone:CONFIG.phone,whatsapp:CONFIG.whatsapp,email:CONFIG.email,support:CONFIG.support,address:CONFIG.address,hours:CONFIG.hours},
 themes:THEMES.map(t=>({id:t.id,name:t.name})),
 dests:DEST.map(d=>({id:d.id,name:d.name,short:d.short,type:d.type,region:d.region,price:d.price,img:d.img,best:d.best,hl:d.hl,about:d.about,air:d.air})),
 packages:PKG.map(p=>({id:p.id,title:p.title,dest:p.dest,destName:D(p.dest).name,type:D(p.dest).type,n:p.n,price:p.price,img:p.img,themes:p.themes,tag:p.tag||'',route:p.route||'',fx:p.fx||null,wk:p.wk?{km:p.wk.km}:null})),
 departures:DEPARTURES.map(([pkg,date])=>({pkg,date})),
 coupons:Object.entries(CONFIG.coupons).map(([code,c])=>({code,...c})),
 seoPages:(()=>{ try{ return JSON.parse(fs.readFileSync(path.join(src,'..','public','assets','pages.json'),'utf8')); }catch(e){ return []; } })()};
out.config.domain=CONFIG.domain;
fs.writeFileSync(path.join(__dirname,'../admin/catalog.json'),JSON.stringify(out));
console.log(`catalog.json: ${out.seoPages.length} SEO pages, ${out.packages.length} packages, ${out.dests.length} destinations, ${out.departures.length} departures`);
