"""Import verified public CSVs into a backed-up RÚIAN SQLite snapshot.

Run fetch-delivery-extension.py first, then this importer, then export-delivery.py.
No order database or customer records are read or changed.
"""
import csv
import hashlib
import io
import json
import sqlite3
import unicodedata
import re
from collections import Counter
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'RUUAN Mpy databaze/RUIAN-data'
SOURCES = BASE / 'rozsireni-20261022'
DB = BASE / 'addresses.sqlite'
SCOPE = json.loads((ROOT / 'verze-2/data/delivery-extension-scope.json').read_text())


def normalize(value):
    value = ''.join(c for c in unicodedata.normalize('NFKD', value.casefold()) if not unicodedata.combining(c))
    return re.sub('[^a-z0-9]+', ' ', value).strip()


def address_record(row, source, row_number):
    def nullable(key):
        return row[key] or None
    def integer(key):
        return int(row[key]) if row[key] else None
    def coordinate(key):
        return float(row[key].replace(',', '.')) if row[key] else None
    municipality, part, street = row['Název obce'], row['Název části obce'], row['Název ulice']
    number = row['Číslo domovní']
    orientation = row['Číslo orientační'] + row['Znak čísla orientačního']
    assert row['Typ SO'] in ('č.p.', 'č.ev.') and number
    house_type = 'popisne' if row['Typ SO'] == 'č.p.' else 'evidencni'
    number_label = ('č. ev. ' if house_type == 'evidencni' else '') + number
    if orientation:
        number_label += '/' + orientation
    label = (street or part) + ' ' + number_label
    if street and part != municipality:
        label += ', ' + part
    postal = row['PSČ']
    assert re.fullmatch(r'\d{5}', postal)
    label += ', ' + postal[:3] + ' ' + postal[3:] + ' ' + municipality
    fields = {
        'ruian_id': integer('Kód ADM'), 'municipality_code': integer('Kód obce'),
        'municipality_name': municipality, 'municipality_part_code': integer('Kód části obce'),
        'municipality_part_name': part, 'city_district_code': integer('Kód MOMC'),
        'city_district_name': nullable('Název MOMC'), 'prague_district_code': integer('Kód obvodu Prahy'),
        'prague_district_name': nullable('Název obvodu Prahy'), 'street_code': integer('Kód ulice'),
        'street_name': street or None, 'street_name_normalized': normalize(street) or None,
        'house_number_type': house_type, 'house_number_type_source': row['Typ SO'], 'house_number': number,
        'orientation_number': nullable('Číslo orientační'), 'orientation_letter': nullable('Znak čísla orientačního'),
        'orientation_number_full': orientation or None, 'postal_code': postal, 'display_address': label,
        'search_text': normalize(' '.join([municipality, part, row['Název MOMC'], street, number, orientation, postal, label])),
        'sjtsk_y': coordinate('Souřadnice Y'), 'sjtsk_x': coordinate('Souřadnice X'),
        'sjtsk_y_raw': nullable('Souřadnice Y'), 'sjtsk_x_raw': nullable('Souřadnice X'),
        'coordinate_system': 'S-JTSK', 'coordinate_crs_uri': 'http://www.opengis.net/def/crs/EPSG/0/5513',
        'valid_from': row['Platí Od'][:10] or None, 'valid_from_raw': nullable('Platí Od'),
        'source_data_date': source['data_date'], 'source_file_id': source['source_file_id'],
        'source_row_number': row_number,
    }
    assert fields['sjtsk_y'] and fields['sjtsk_x'], label
    if fields['street_code'] == SCOPE['street']['code']:
        fields['search_text'] += ' ' + normalize(' '.join(SCOPE['street']['aliases']))
    return fields


def main():
    manifest = json.loads((SOURCES / 'sources.json').read_text())
    by_code = {m['code']: m for m in SCOPE['municipalities']}
    street = SCOPE['street']
    batches = []
    for source in manifest['sources']:
        assert source['data_date'] == SCOPE['sourceDate']
        raw = (SOURCES / source['file']).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == source['sha256']
        with ZipFile(io.BytesIO(raw)) as archive:
            assert archive.testzip() is None
            rows = list(csv.DictReader(io.StringIO(archive.read(source['csv_member']).decode('cp1250')), delimiter=';'))
        assert len(rows) == source['source_rows']
        included = [(i, r) for i, r in enumerate(rows, 2) if source['code'] in by_code or r['Kód ulice'] == str(street['code'])]
        assert included
        assert all(int(r['Kód obce']) == source['code'] for _, r in included)
        if source['code'] in by_code:
            assert all(r['Název obce'] == by_code[source['code']]['name'] for _, r in included)
        else:
            assert source['code'] == street['municipalityCode']
            assert all(int(r['Kód části obce']) == street['partCode'] and r['Název ulice'] == street['name'] for _, r in included)
        source['included_rows'] = len(included)
        batches.append((source, included))

    original = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
    original_count = original.execute('SELECT count(*) FROM addresses').fetchone()[0]
    backup = BASE / 'addresses-before-extension-20261022.sqlite'
    if not backup.exists():
        with sqlite3.connect(backup) as saved:
            original.backup(saved)
    with sqlite3.connect(f'file:{backup}?mode=ro', uri=True) as saved:
        baseline_count = saved.execute('SELECT count(*) FROM addresses').fetchone()[0]
    temp = BASE / 'addresses-extension.tmp.sqlite'
    assert not temp.exists(), 'Unexpected previous import; inspect the temporary database first.'
    conn = sqlite3.connect(temp)
    original.backup(conn)
    original.close()
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys=ON')
    try:
        with conn:
            conn.execute('''CREATE TABLE IF NOT EXISTS delivery_rules (
              rule_id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('municipality','part','street')),
              municipality_code INTEGER NOT NULL REFERENCES municipalities(municipality_code),
              part_code INTEGER REFERENCES municipality_parts(municipality_part_code), street_code INTEGER,
              display_name TEXT NOT NULL, aliases TEXT NOT NULL DEFAULT '[]', address_count INTEGER NOT NULL,
              CHECK((kind='municipality' AND part_code IS NULL AND street_code IS NULL)
                OR (kind='part' AND part_code IS NOT NULL AND street_code IS NULL)
                OR (kind='street' AND part_code IS NOT NULL AND street_code IS NOT NULL)))''')
            baseline = json.loads((ROOT / 'RUUAN Mpy databaze/mapy/map-data.json').read_text())['selected']
            for feature in baseline:
                p = feature['properties']
                part = p.get('part_code')
                conn.execute('INSERT OR IGNORE INTO delivery_rules VALUES (?,?,?,?,?,?,?,?)',
                             (p['id'], 'part' if part else 'municipality', 554821 if part else p['code'], part, None, p['name'], '[]', p['count']))
            for source, rows in batches:
                path = 'rozsireni-20261022/' + source['file']
                previous = conn.execute('SELECT source_file_id FROM source_files WHERE file_path=?', (path,)).fetchone()
                source_id = previous[0] if previous else conn.execute('SELECT max(source_file_id)+1 FROM source_files').fetchone()[0]
                source['source_file_id'] = source_id
                conn.execute('INSERT OR REPLACE INTO source_files VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                             (source_id, 'addresses', path, source['url'], source['requested_url'], source['downloaded_at'], source['data_date'],
                              source['sha256'], source['bytes'], source['http_last_modified'], source['csv_member'], source['encoding'], source['source_rows'], len(rows)))
                code = source['code']
                if code in by_code:
                    m = by_code[code]
                    conn.execute('''INSERT INTO municipalities VALUES (?,?,?,?,?,?,?) ON CONFLICT(municipality_code)
                      DO UPDATE SET address_count=excluded.address_count,source_file_id=excluded.source_file_id''',
                                 (code, m['name'], m['districtCode'], m['districtName'], 'whole_municipality', len(rows), source_id))
                parts = Counter((int(r['Kód části obce']), r['Název části obce']) for _, r in rows)
                for (part_code, part_name), count in parts.items():
                    conn.execute('''INSERT INTO municipality_parts VALUES (?,?,?,?) ON CONFLICT(municipality_part_code)
                      DO UPDATE SET address_count=excluded.address_count''', (part_code, part_name, code, count))
                for row_number, row in rows:
                    record = address_record(row, source, row_number)
                    columns = list(record)
                    sql = 'INSERT INTO addresses (' + ','.join(columns) + ') VALUES (' + ','.join('?' for _ in columns) + ')'
                    sql += ' ON CONFLICT(ruian_id) DO UPDATE SET ' + ','.join(c + '=excluded.' + c for c in columns if c != 'ruian_id')
                    conn.execute(sql, list(record.values()))
                if code in by_code:
                    m = by_code[code]
                    conn.execute('INSERT OR REPLACE INTO delivery_rules VALUES (?,?,?,?,?,?,?,?)',
                                 (f'obec-{code}', 'municipality', code, None, None, m.get('mapName', m['name']), '[]', len(rows)))
                    conn.execute('INSERT OR REPLACE INTO map_coverage VALUES (?,?,?,?,?,?)',
                                 (m['name'], code, None, 'whole_municipality', len(rows), 'Celá obec včetně všech částí; rozšíření 22. 10. 2026'))
                    if code == 568406:
                        count = sum(r['Kód části obce'] == '149705' for _, r in rows)
                        conn.execute('INSERT OR REPLACE INTO map_coverage VALUES (?,?,?,?,?,?)',
                                     ('Nový Svět', code, 149705, 'part', count, 'Součást Slatiny; nesčítat duplicitně.'))
                else:
                    conn.execute('INSERT OR REPLACE INTO delivery_rules VALUES (?,?,?,?,?,?,?,?)',
                                 (f'ulice-{street["code"]}', 'street', code, street['partCode'], street['code'], street['mapName'], json.dumps(street['aliases'], ensure_ascii=False), len(rows)))
                    conn.execute('UPDATE municipalities SET address_count=(SELECT count(*) FROM addresses WHERE municipality_code=?) WHERE municipality_code=?', (code, code))
            conn.execute("INSERT INTO addresses_fts(addresses_fts) VALUES('rebuild')")
            conn.execute("INSERT INTO addresses_fts(addresses_fts,rank) VALUES('integrity-check',1)")
            metadata = {'schema_version': '2', 'updated_at': SCOPE['approvedOn'],
                        'source_data_date': '2026-08-31 (původní rozsah); 2026-09-30 (rozšíření)',
                        'map_label_count': '34', 'usage': 'Public address snapshot; delivery_rules defines complete municipalities, selected parts and an exact street.',
                        'extension_scope': street['scope']}
            conn.executemany('INSERT OR REPLACE INTO metadata VALUES (?,?)', metadata.items())
            conn.execute('PRAGMA user_version=2')
            assert conn.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
            assert not conn.execute('PRAGMA foreign_key_check').fetchall()
            total = conn.execute('SELECT count(*) FROM addresses').fetchone()[0]
            counts = {r['municipality_name']: r['n'] for r in conn.execute('SELECT municipality_name,count(*) n FROM addresses GROUP BY municipality_name')}
            assert conn.execute('SELECT count(*) FROM addresses WHERE municipality_part_code=? AND street_code<>?', (street['partCode'], street['code'])).fetchone()[0] == 0
        conn.close()
        temp.replace(DB)
    except BaseException:
        conn.close()
        temp.unlink(missing_ok=True)
        raise
    report = {'date': SCOPE['approvedOn'], 'total': total, 'previousTotal': baseline_count,
              'addedTotal': total - baseline_count, 'lastRunPreviousTotal': original_count,
              'sourceDate': '2026-09-30', 'counts': counts, 'sources': manifest['sources'],
              'street': {**street, 'count': next(len(rows) for s, rows in batches if s['code'] == street['municipalityCode'])}}
    (SOURCES / 'import-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(f'Imported {total - original_count} additional addresses. Total {total}. Backup: {backup.name}')
    print('SQLite integrity, foreign keys and FTS index verified.')


if __name__ == '__main__':
    main()
