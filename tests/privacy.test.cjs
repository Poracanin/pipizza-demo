const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../verze-2/privacy.js'), 'utf8');
const key = 'pipizza-map-consent-v1';
const now = 1800000000000;
function setup(raw = null, storageBlocked = false) {
  let stored = raw;
  let clock = now;
  const windowEvents = {};
  const timers = [];
  const attrs = new Map();
  const frame = {dataset:{consentSrc:'https://www.google.com/maps/embed?test'}, hidden:true,
    hasAttribute:name=>attrs.has(name), setAttribute:(name,value)=>attrs.set(name,value), removeAttribute:name=>attrs.delete(name)};
  const placeholder = {hidden:false};
  const status = {textContent:''};
  const buttons = ['allow','deny'].map(value=>({dataset:{mapConsent:value}, setAttribute(){}, addEventListener(_,fn){this.click=fn;}}));
  vm.runInNewContext(source, {
    document:{hidden:false,addEventListener(){},querySelectorAll(selector){return selector==='iframe[data-consent-src]'?[frame]:selector==='[data-map-placeholder]'?[placeholder]:selector==='[data-map-status]'?[status]:selector==='[data-map-consent]'?buttons:[];}},
    window:{addEventListener:(name,fn)=>{windowEvents[name]=fn;}},
    localStorage:{getItem(){if(storageBlocked)throw Error('Blocked');return stored;},setItem(_,value){if(storageBlocked)throw Error('Blocked');stored=value;},removeItem(){stored=null;}},
    Date:{now:()=>clock}, setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){}
  });
  return {frame,placeholder,status,buttons,attrs,stored:()=>stored,expire(){clock+=180*86400000;timers.at(-1)();},revokeElsewhere(){stored=JSON.stringify({version:1,maps:false,updatedAt:now});windowEvents.storage({key});}};
}
test('Google Maps has no external src until explicit consent, and revocation unloads it',()=>{
  const app=setup();
  assert.equal(app.attrs.has('src'),false);
  assert.equal(app.placeholder.hidden,false);
  app.buttons[0].click();
  assert.equal(app.attrs.get('src'),app.frame.dataset.consentSrc);
  assert.equal(app.placeholder.hidden,true);
  assert.equal(JSON.parse(app.stored()).maps,true);
  app.buttons[1].click();
  assert.equal(app.attrs.has('src'),false);
  assert.equal(app.frame.hidden,true);
  assert.equal(JSON.parse(app.stored()).maps,false);
});
test('A valid saved consent is restored and revoking it in another tab unloads the map',()=>{
  const app=setup(JSON.stringify({version:1,maps:true,updatedAt:now-1000}));
  assert.equal(app.attrs.has('src'),true);
  app.revokeElsewhere();
  assert.equal(app.attrs.has('src'),false);
});
test('Expired, future, malformed and differently-versioned consent fails closed',()=>{
  for(const raw of ['broken',JSON.stringify({version:1,maps:true,updatedAt:now-180*86400000}),JSON.stringify({version:1,maps:true,updatedAt:now+1000}),JSON.stringify({version:2,maps:true,updatedAt:now}),JSON.stringify({version:1,maps:'true',updatedAt:now})]){
    assert.equal(setup(raw).attrs.has('src'),false);
  }
});
test('Blocked storage permits an explicit in-page choice but never defaults to consent',()=>{
  const app=setup(null,true);
  assert.equal(app.attrs.has('src'),false);
  app.buttons[0].click();
  assert.equal(app.attrs.has('src'),true);
  assert.match(app.status.textContent,/nepodařilo uložit/);
  app.buttons[1].click();
  assert.equal(app.attrs.has('src'),false);
});
test('The HTML cannot contact Google Maps before the consent script runs',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../verze-2/index.html'),'utf8');
  const iframe=html.match(/<iframe\b[^>]*>/g);
  assert.ok(iframe?.length);
  for(const tag of iframe) assert.doesNotMatch(tag,/\ssrc\s*=/);
  assert.match(html,/data-consent-src="https:\/\/www\.google\.com\/maps\/embed/);
  assert.match(html,/id="brand-intro" data-intro-disabled/);
});

test('Expiring consent is deleted and an already-loaded map is unloaded',()=>{
  const app=setup(JSON.stringify({version:1,maps:true,updatedAt:now}));
  assert.equal(app.attrs.has('src'),true);
  app.expire();
  assert.equal(app.attrs.has('src'),false);
  assert.equal(app.stored(),null);
});
