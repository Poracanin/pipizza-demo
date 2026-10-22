"""Export the public RÚIAN snapshot to browser and PHP data; requires PROJ cs2cs."""
import json
import sqlite3
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'RUUAN Mpy databaze/RUIAN-data'
OUT = ROOT / 'verze-2/data'


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')))
    temp.replace(path)


def main():
    conn = sqlite3.connect(f'file:{BASE}/addresses.sqlite?mode=ro', uri=True)
    conn.row_factory = sqlite3.Row
    rows = conn.execute('SELECT * FROM addresses ORDER BY municipality_name, display_address').fetchall()
    located = [r for r in rows if r['sjtsk_x'] and r['sjtsk_y']]
    coordinates = subprocess.run(
        ['cs2cs', 'EPSG:5514', '+to', '+proj=longlat', '+datum=WGS84', '-f', '%.7f'],
        input=''.join(f"{-r['sjtsk_y']} {-r['sjtsk_x']}\n" for r in located),
        capture_output=True, text=True, check=True).stdout.splitlines()
    points = {}
    for row, line in zip(located, coordinates, strict=True):
        lng, lat, *_ = map(float, line.split())
        assert 17 < lng < 19 and 49 < lat < 51
        points[row['ruian_id']] = [lat, lng]
    assert len(points) == len(rows), 'Every deliverable address must have an actual location.'
    has_rules = conn.execute("SELECT 1 FROM sqlite_master WHERE name='delivery_rules'").fetchone()
    rules = list(conn.execute('SELECT * FROM delivery_rules ORDER BY rule_id')) if has_rules else []
    streets = {r['street_code']: r for r in rules if r['kind'] == 'street'}
    addresses = []
    for r in rows:
        address = {'id': str(r['ruian_id']), 'label': r['display_address'], 'point': points[r['ruian_id']],
                   'town': r['municipality_part_name'] or r['municipality_name']}
        if r['street_code'] in streets:
            rule = streets[r['street_code']]
            address['aliases'] = json.loads(rule['aliases'])
            address['areaLabel'] = rule['display_name']
        addresses.append(address)
    features = json.loads((ROOT / 'RUUAN Mpy databaze/mapy/map-data.json').read_text())['selected']
    source_manifest = None
    if has_rules:
        source_manifest = json.loads((BASE / 'rozsireni-20261022/sources.json').read_text())
        extra = json.loads((BASE / 'rozsireni-20261022/municipalities.geojson').read_text())
        by_code = {r['municipality_code']: r for r in rules if r['kind'] == 'municipality'}
        for feature in extra['features']:
            code = feature['properties']['kod']
            rule = by_code[code]
            parts = [p[0] for p in conn.execute('SELECT municipality_part_name FROM municipality_parts WHERE municipality_code=? ORDER BY municipality_part_name', (code,))]
            feature['properties'] = {'id': rule['rule_id'], 'code': code, 'name': rule['display_name'],
                                     'count': rule['address_count'], 'kind': 'Celá obec', 'parts': parts}
            features.append(feature)
        for code, rule in streets.items():
            selected = [r for r in rows if r['municipality_code'] == rule['municipality_code'] and r['street_code'] == code]
            assert len(selected) == rule['address_count']
            features.append({'type': 'Feature', 'properties': {
                'id': rule['rule_id'], 'code': code, 'name': rule['display_name'], 'count': len(selected),
                'kind': 'Vybraná ulice', 'parts': [selected[0]['municipality_part_name']],
                'addressIds': [str(r['ruian_id']) for r in selected],
                'description': 'Rozvoz do všech domů v ulici Sasanková. Na mapě jsou vyznačena jednotlivá adresní místa.'},
                'geometry': {'type': 'MultiPoint', 'coordinates': [list(reversed(points[r['ruian_id']])) for r in selected]}})
    assert len({a['id'] for a in addresses}) == len(addresses)
    assert len({f['properties']['id'] for f in features}) == len(features)
    write_json(OUT / 'addresses.json', addresses)
    # PHP resolves the submitted address ID against this identical authoritative snapshot.
    write_json(ROOT / 'private/addresses.json', addresses)
    write_json(OUT / 'delivery-areas.geojson', {'type': 'FeatureCollection', 'features': features})
    if source_manifest:
        scope = json.loads((OUT / 'delivery-extension-scope.json').read_text())
        sources = [{k: s[k] for k in ('code', 'url', 'feed_url', 'data_date', 'sha256', 'source_rows')} for s in source_manifest['sources']]
        report = {'updated': scope['approvedOn'], 'provider': 'ČÚZK / RÚIAN', 'license': 'CC BY 4.0',
                  'originalSourceDate': '2026-08-31', 'extensionSourceDate': '2026-09-30',
                  'totalAddresses': len(addresses), 'municipalityPolygons': len(features) - len(streets),
                  'streetAddressPoints': sum(r['address_count'] for r in streets.values()),
                  'rules': [dict(r) | {'aliases': json.loads(r['aliases'])} for r in rules],
                  'sources': sources, 'boundaries': source_manifest['boundaries'],
                  'streetMapGeometry': 'Exact RÚIAN address points; no whole-Svinov delivery polygon.'}
        write_json(OUT / 'delivery-sources.json', report)
    conn.close()
    print(f'Exported {len(addresses)} addresses, {len(points)} locations and {len(features)} map features. PHP snapshot synchronized.')


if __name__ == '__main__':
    main()
