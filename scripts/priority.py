"""Fontossági lista a termékleírások letöltéséhez.
Sorrend: főoldal (népszerű, akciós, új), lenyíló menü kiemelt termékei,
Akciók és Újdonságok első 48 terméke, főkategóriák, majd alkategóriák első 24 terméke
(alapértelmezett rendezésben, ugyanúgy számolva, mint a build.py).
Használat: python3 -I scripts/priority.py raw  ->  raw/priority.json"""
import json,os,re,sys
R=sys.argv[1]
cats=json.load(open(os.path.join(R,'cats.json')))
raw=json.load(open(os.path.join(R,'products.json')))
TOPS=['490000','500000','510000','670000','560000','540000','520000','570000','550000','660000']
subs={t:[c for c in sorted(cats) if c[:2]==t[:2] and c.endswith('00') and not c.endswith('0000')] for t in TOPS}
SUB2TOP={s:t for t,l in subs.items() for s in l}
P=[]
for p in raw:
    if not p.get('name') or p.get('price') is None: continue
    q={'i':p['id'],'c':p['cats'],'p':p['price'],'m':p['img'] if p['img'] and 'transparent' not in p['img'] else '',
       'w':any(l.lower().startswith('újdonság') for l in p.get('labels',[])),
       'o':p['old'] if p.get('old') and p['old']>p['price'] else None}
    q['t']=list(dict.fromkeys(SUB2TOP[c] for c in q['c'] if c in SUB2TOP))
    q['d']=int((1-q['p']/q['o'])*100+0.5) if q['o'] else 0
    P.append(q)
byid={p['i']:p for p in P}
home=open(os.path.join(R,'home.html'),encoding='utf-8').read()
feat=[byid[i] for i in dict.fromkeys(re.findall(r'product-info-(\d+)',home)) if i in byid]
popular=feat if len(feat)>=4 else [p for p in P if p['m']][:12]
deals=sorted([p for p in P if p['d']>0 and p['m']],key=lambda p:-p['d'])[:16]
news=[p for p in P if p['w'] and p['m']][:16]
mega=[p for t in TOPS for p in sorted([p for p in P if t in p['t'] and p['m'] and p['d']>0],key=lambda p:-p['d'])[:4]]
sale=sorted([p for p in P if p['d']>0],key=lambda p:-p['d'])[:48]
new=[p for p in P if p['w']][:48]
topf=[p for t in TOPS for p in [p for p in P if t in p['t']][:24]]
subf=[p for t in TOPS for s in subs[t] for p in [p for p in P if s in p['c']][:24]]
order=list(dict.fromkeys(p['i'] for grp in (popular,deals,news,mega,sale,new,topf,subf) for p in grp))
json.dump(order,open(os.path.join(R,'priority.json'),'w'))
print('fontossági lista:',len(order),'termék')
