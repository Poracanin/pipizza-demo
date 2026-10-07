const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {indexAddresses,searchAddresses} = require('../verze-2/address-model.js');
const rows = JSON.parse(fs.readFileSync(require.resolve('../verze-2/data/addresses.json'),'utf8'));
const indexed = indexAddresses(rows);
test('v2 real address search matches house numbers exactly and ignores accents and token order',()=>{
  const matches=searchAddresses(indexed,'181 jistebnik');
  assert.equal(matches.length,1);assert.equal(matches[0].id,'8214905');
  assert.equal(matches[0].label,'Jistebník 181, 742 82 Jistebník');
  assert.deepEqual(matches[0].point,[49.7534022,18.1287856]);
  assert.equal(searchAddresses(indexed,'Praha Václavské 1').length,0);
  assert.equal(searchAddresses(indexed,'ji').length,0);
  assert.ok(searchAddresses(indexed,'Klimkovice').length<=8);
});
test('v2 data preserves all supplied public addresses and only the two requested Ostrava districts',()=>{
  assert.equal(rows.length,15892);assert.equal(new Set(rows.map(r=>r.id)).size,15892);
  for(const r of rows) assert.ok(r.point[0]>49.5&&r.point[0]<50&&r.point[1]>17.5&&r.point[1]<18.5);
  const areas=JSON.parse(fs.readFileSync(require.resolve('../verze-2/data/delivery-areas.geojson'),'utf8'));
  assert.equal(areas.features.length,21);
  assert.deepEqual(areas.features.filter(f=>f.properties.kind==='Městský obvod Ostravy').map(f=>f.properties.name).sort(),['Polanka nad Odrou','Stará Bělá']);
  assert.ok(!areas.features.some(f=>f.properties.name==='Ostrava'));
});
