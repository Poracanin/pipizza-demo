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
test('v2 delivery scope adds eight municipalities and only Sasanková in Svinov',()=>{
  assert.equal(rows.length,19145);assert.equal(new Set(rows.map(r=>r.id)).size,19145);
  for(const r of rows) assert.ok(r.point[0]>49.5&&r.point[0]<50&&r.point[1]>17.5&&r.point[1]<18.5);
  const areas=JSON.parse(fs.readFileSync(require.resolve('../verze-2/data/delivery-areas.geojson'),'utf8'));
  assert.equal(areas.features.length,30);
  assert.equal(areas.features.filter(f=>['Polygon','MultiPolygon'].includes(f.geometry.type)).length,29);
  assert.deepEqual(areas.features.filter(f=>f.properties.kind==='Městský obvod Ostravy').map(f=>f.properties.name).sort(),['Polanka nad Odrou','Stará Bělá']);
  assert.ok(!areas.features.some(f=>f.properties.name==='Ostrava'));
  assert.ok(!areas.features.some(f=>f.properties.name==='Svinov'));
  const street=areas.features.find(f=>f.properties.id==='ulice-1418793');
  const houses=rows.filter(r=>r.town==='Svinov');
  assert.equal(houses.length,12);
  assert.ok(houses.every(r=>r.label.startsWith('Sasanková ')&&r.aliases.includes('Janová')));
  assert.equal(street.geometry.type,'MultiPoint');
  assert.deepEqual(street.properties.addressIds,houses.map(r=>r.id));
  assert.deepEqual(street.geometry.coordinates,houses.map(r=>[r.point[1],r.point[0]]));
  assert.ok(houses.some(r=>r.id==='88556581'),'September source includes newly added house 1307/22s');
});
test('all requested places have complete imported address sets and searchable real house numbers',()=>{
  const expected={'Nový Svět':42,'Slatina':224,'Těškovice':260,'Kyjovice':416,'Dolní Lhota':547,'Kateřinice':238,'Fryčovice':801,'Ptáčník':25,'Mošnov':339,'Pustějov':349};
  for(const [town,count] of Object.entries(expected)){
    assert.equal(rows.filter(r=>r.town===town).length,count,town);
    assert.ok(searchAddresses(indexed,town).some(r=>r.town===town),town);
  }
  for(const [query,id] of [['Novy Svet 1','8289450'],['Teskovice 1','4544510'],['Kyjovice 1','4633849'],['Dolni Lhota 1','4626397'],['Katerinice 1','8218544'],['Frycovice 1','14098261'],['Mosnov 2','8266786'],['Pustejov 1','8276315']]){
    assert.ok(searchAddresses(indexed,query).some(r=>r.id===id),query);
  }
});
test('Janová aliases and orientation suffixes work without matching another house number',()=>{
  for(const query of ['Janová 6','janova sasankova 6s','Sasanková 1298']){
    assert.deepEqual(searchAddresses(indexed,query).map(r=>r.id),['86170091']);
  }
  assert.deepEqual(searchAddresses(indexed,'Sasanková 1').map(r=>r.id),['76169570']);
  assert.deepEqual(searchAddresses(indexed,'Sasanková 1s').map(r=>r.id),['76169570']);
  assert.equal(searchAddresses(indexed,'Sasanková 1t').length,0);
  assert.equal(searchAddresses(indexed,'Janová 60').length,0);
  assert.equal(searchAddresses(indexed,'Svinov Bílovecká').length,0);
  assert.equal(searchAddresses(indexed,'Janová Vsetín').length,0);
});
test('server and browser use exactly the same delivery address snapshot',()=>{
  const server=JSON.parse(fs.readFileSync(require.resolve('../private/addresses.json'),'utf8'));
  assert.deepEqual(server,rows);
});
