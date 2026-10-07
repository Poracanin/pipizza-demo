"""Export supplied public RÚIAN records and boundaries; requires PROJ cs2cs."""
import json, sqlite3, subprocess
from pathlib import Path
root = Path(__file__).resolve().parents[2]
out = root / 'verze-2/data'
out.mkdir(exist_ok=True)
conn = sqlite3.connect(f'file:{root}/RUUAN Mpy databaze/RUIAN-data/addresses.sqlite?mode=ro', uri=True)
conn.row_factory = sqlite3.Row
rows = conn.execute('SELECT ruian_id, display_address, sjtsk_y, sjtsk_x, municipality_name, municipality_part_name FROM addresses ORDER BY municipality_name, display_address').fetchall()
located = [r for r in rows if r['sjtsk_x'] and r['sjtsk_y']]
coordinates = subprocess.run(['cs2cs','EPSG:5514','+to','+proj=longlat','+datum=WGS84','-f','%.7f'],input=''.join(f"{-r['sjtsk_y']} {-r['sjtsk_x']}\n" for r in located),capture_output=True,text=True,check=True).stdout.splitlines()
points = {}
for row,line in zip(located,coordinates,strict=True):
    lng,lat,*_ = map(float,line.split()); assert 17 < lng < 19 and 49 < lat < 51
    points[row['ruian_id']] = [lat,lng]
addresses = [{'id':str(r['ruian_id']),'label':r['display_address'],'point':points.get(r['ruian_id']),'town':r['municipality_part_name'] or r['municipality_name']} for r in rows]
(out/'addresses.json').write_text(json.dumps(addresses,ensure_ascii=False,separators=(',',':')))
data=json.loads((root/'RUUAN Mpy databaze/mapy/map-data.json').read_text())
(out/'delivery-areas.geojson').write_text(json.dumps({'type':'FeatureCollection','features':data['selected']},ensure_ascii=False,separators=(',',':')))
print(f'Exported {len(addresses)} addresses, {len(points)} coordinates and {len(data["selected"])} polygons.')
