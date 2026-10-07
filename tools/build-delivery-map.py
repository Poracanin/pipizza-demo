"""Build an offline SVG from the supplied local RUIAN / DATA50 reference geometry."""
import json
from pathlib import Path
from html import escape

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'RUUAN Mpy databaze/mapy/map-data.json').read_text())
# Local equirectangular projection, aspect corrected at 49.76 N.
def xy(point):
    return ((point[0] - 17.965) * 2285, (49.85 - point[1]) * 3500)
def simplify(points, tolerance=1.2):
    if len(points) <= 2: return points
    a, b = points[0], points[-1]
    dx, dy = b[0]-a[0], b[1]-a[1]
    den = dx*dx+dy*dy
    def distance(p):
        t = max(0,min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)) if den else 0
        return ((p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2)**.5
    i = max(range(1,len(points)-1), key=lambda n:distance(points[n]))
    if distance(points[i]) <= tolerance: return [a,b]
    return simplify(points[:i+1],tolerance)[:-1]+simplify(points[i:],tolerance)
def path(g):
    kind, c = g['type'],g['coordinates']
    if kind == 'Polygon': lines = c
    elif kind == 'MultiPolygon': lines = [ring for polygon in c for ring in polygon]
    elif kind == 'LineString': lines = [c]
    elif kind == 'MultiLineString': lines = c
    else: return ''
    return ' '.join('M'+' L'.join(f'{x:.1f},{y:.1f}' for x,y in simplify([xy(p) for p in line]))+(' Z' if 'Polygon' in kind else '') for line in lines)
parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 620" role="img" aria-labelledby="map-title map-description">', '<title id="map-title">Radar rozvozu PiPizza</title>', '<desc id="map-description">Mapa Jistebníku a okolí. Ukázkové cíle rozvozu: Klimkovice, Polanka nad Odrou a Studénka. Nejde o živé polohy řidičů.</desc>', '<rect width="700" height="620" fill="#f2f0e5"/>']
for f in data['context']:
    parts.append(f'<path d="{path(f["geometry"])}" fill="#e9e8dc" stroke="#d7d7c7" stroke-width=".7"/>')
for f in data['selected']:
    active=f['properties']['name'] in ['Klimkovice','Polanka nad Odrou','Studénka']
    parts.append(f'<path d="{path(f["geometry"])}" fill="{"#b5caaa" if active else "#dce3ce"}" stroke="#90a681" stroke-width=".9"><title>{escape(f["properties"]["name"])}</title></path>')
for layer,fill,stroke,width in [('water','#cadbd9','none',0),('rivers','none','#a7c9cc',1.3),('roads','none','#fdfbf5',2.4)]:
    for f in data[layer]:
        parts.append(f'<path d="{path(f["geometry"])}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>')
labels={i['name']:i for i in data['labels']}
origin=xy(labels['Jistebník']['coordinates'])
for name in ['Klimkovice','Polanka','Studénka']:
    x,y=xy(labels[name]['coordinates']); ox,oy=origin
    parts.append(f'<path d="M{ox:.1f},{oy:.1f} Q{ox+30:.1f},{y:.1f} {x:.1f},{y:.1f}" fill="none" stroke="#346147" stroke-width="2.5" stroke-dasharray="5 6"/>')
    parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="12" fill="#386144" stroke="#fffaf0" stroke-width="3"/><circle cx="{x:.1f}" cy="{y:.1f}" r="3.5" fill="#fffaf0"/>')
for l in data['labels']:
    if l['secondary'] or l['name']=='Velké Albrechtice': continue
    x,y=xy(l['coordinates']); name=l['name']
    active=name in ['Klimkovice','Polanka','Studénka','Jistebník']
    parts.append(f'<text x="{x:.1f}" y="{y+26 if active else y+4:.1f}" text-anchor="middle" font-family="Arial,sans-serif" font-size="{13 if active else 11}" font-weight="{700 if active else 400}" fill="#284332" stroke="#f5f3e9" stroke-width="3" paint-order="stroke">{escape(name)}</text>')
x,y=origin
parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="17" fill="#b83829" stroke="#fffaf0" stroke-width="3"/><text x="{x:.1f}" y="{y+5:.1f}" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="14" fill="white">π</text>')
parts.append('<text x="671" y="31" font-family="Arial,sans-serif" font-size="12" text-anchor="middle" fill="#496048">S</text><path d="M671 38v30m-5-24 5-9 5 9" fill="none" stroke="#496048" stroke-width="1.5"/><text x="20" y="601" font-family="Arial,sans-serif" font-size="10" fill="#55634d">Podklad: ČÚZK · RÚIAN / DATA50, 30. 9. 2026</text></svg>')
(root / 'assets/images/delivery-map.svg').write_text('\n'.join(parts))
print('Created delivery-map.svg:',(root / 'assets/images/delivery-map.svg').stat().st_size,'bytes')
