"""Download official RÚIAN sources for the October 2026 delivery extension.

Only downloads public source data. Importing and publishing are separate steps.
"""
import csv
import hashlib
import io
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from urllib.request import urlopen
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'RUUAN Mpy databaze/RUIAN-data/rozsireni-20261022'
CODES = [568406, 512745, 512907, 506711, 568643, 598135, 568686, 568775, 554821]
CATALOG = 'https://atom.cuzk.gov.cz/RUIAN-CSV-ADR-OB/RUIAN-CSV-ADR-OB.xml'
NS = {'a': 'http://www.w3.org/2005/Atom'}


def download(url):
    with urlopen(url, timeout=45) as response:
        data = response.read()
        return data, {
            'url': response.url, 'requested_url': url,
            'downloaded_at': datetime.now(timezone.utc).isoformat(),
            'http_last_modified': response.headers.get('Last-Modified'),
            'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data),
        }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    scope = json.loads((ROOT / 'verze-2/data/delivery-extension-scope.json').read_text())
    published = ROOT / 'verze-2/data/delivery-sources.json'
    pinned = {s['code']: s for s in json.loads(published.read_text())['sources']} if published.exists() else {}
    catalog, _ = download(CATALOG)
    (OUT / 'catalog.xml').write_bytes(catalog)
    entries = ET.fromstring(catalog).findall('a:entry', NS)

    def fetch_code(code):
        entry = next(e for e in entries if f'[{code}]' in e.findtext('a:title', namespaces=NS))
        feed_url = next(e.get('href') for e in entry.findall('a:link', NS) if e.get('rel') == 'alternate')
        feed, _ = download(feed_url)
        (OUT / f'feed-{code}.xml').write_bytes(feed)
        links = ET.fromstring(feed).findall('.//a:link', NS)
        zip_url = pinned[code]['url'] if code in pinned else next(e.get('href') for e in links if '.csv.zip' in e.get('href', ''))
        data, meta = download(zip_url)
        if code in pinned:
            assert meta['sha256'] == pinned[code]['sha256'], 'Published address source changed; review before importing.'
        filename = Path(urlsplit(meta['url']).path).name
        with ZipFile(io.BytesIO(data)) as archive:
            assert archive.testzip() is None
            member = next(n for n in archive.namelist() if n.endswith('.csv'))
            rows = list(csv.DictReader(io.StringIO(archive.read(member).decode('cp1250')), delimiter=';'))
        assert rows and all(int(r['Kód obce']) == code for r in rows)
        (OUT / filename).write_bytes(data)
        stamp = filename[:8]
        assert f'{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]}' == scope['sourceDate'], 'Unexpected CSV snapshot date for this frozen extension.'
        meta.update(code=code, file=filename, csv_member=member, encoding='Windows-1250',
                    data_date=f'{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]}', source_rows=len(rows), feed_url=feed_url)
        return meta

    with ThreadPoolExecutor(max_workers=4) as pool:
        sources = list(pool.map(fetch_code, CODES))
    params = {'where': 'kod IN (' + ','.join(map(str, CODES[:-1])) + ')',
              'outFields': 'kod,nazev,platiod,platido', 'returnGeometry': 'true', 'outSR': '4326', 'f': 'geojson'}
    url = 'https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN/MapServer/12/query?' + urlencode(params)
    data, boundary = download(url)
    geo = json.loads(data)
    assert len(geo['features']) == 8
    assert {f['properties']['kod'] for f in geo['features']} == set(CODES[:-1])
    (OUT / 'municipalities.geojson').write_bytes(data)
    boundary['file'] = 'municipalities.geojson'
    manifest = {'provider': 'ČÚZK / RÚIAN', 'license': 'CC BY 4.0', 'catalog': CATALOG,
                'sources': sources, 'boundaries': boundary}
    (OUT / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    for source in sources:
        print(source['code'], source['data_date'], source['source_rows'], source['file'])
    print('Downloaded 8 complete municipality boundaries; Sasanková will use exact address points.')


if __name__ == '__main__':
    main()
