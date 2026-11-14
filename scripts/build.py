import json,re,sys,os
R=sys.argv[1]; OUT=sys.argv[2]
cats=json.load(open(os.path.join(R,'cats.json')))
prods=json.load(open(os.path.join(R,'products.json')))
TOPS=[('490000','Kismama','kismama-490000'),('500000','Baba- és gyerekruha','baba-es-gyerekruha-500000'),('510000','Lábbeli','labbeli-510000'),('670000','Biztonsági ülés, hordozó','biztonsagi-ules-hordozo-670000'),('560000','Babakocsi','babakocsi-560000'),('540000','Szoptatás, etetés','szoptatas-etetes-540000'),('520000','Fürdetés, pelenkázás','furdetes-pelenkazas-520000'),('570000','Biztonság','biztonsag-570000'),('550000','Babaszoba','babaszoba-550000'),('660000','Játék, könyv, ajándék','jatek-konyv-ajandek-660000')]
tops=[]
for tid,name,slug in TOPS:
    subs=[{'id':c,'name':cats[c]['name']} for c in sorted(cats) if c[:2]==tid[:2] and c.endswith('00') and not c.endswith('0000')]
    tops.append({'id':tid,'name':name,'subs':subs})
P=[]
for p in prods:
    if not p.get('name') or p.get('price') is None: continue
    m=p['img']; m=m.replace('https://kangaboo.hu/image/cache/','') if m and 'transparent' not in m else ''
    o={'i':p['id'],'u':p['url'].replace('https://kangaboo.hu/',''),'n':p['name'],'b':p['brand'],'m':m,'p':p['price'],'c':p['cats']}
    if p.get('old') and p['old']>p['price']: o['o']=p['old']
    if p.get('from'): o['f']=1
    if any(l.lower().startswith('újdonság') for l in p.get('labels',[])): o['w']=1
    if p.get('sizes'): o['s']=p['sizes']
    P.append(o)
import datetime
# az adatgyűjtés napja = a terméklista-fájl utolsó módosítása
ASOF=datetime.date.fromtimestamp(os.path.getmtime(os.path.join(R,'products.json'))).isoformat()
home=open(os.path.join(R,'home.html'),encoding='utf-8').read()
feat=list(dict.fromkeys(re.findall(r'product-info-(\d+)',home)))
os.makedirs(OUT,exist_ok=True)
J=lambda o: json.dumps(o,ensure_ascii=False,separators=(',',':'))
def W(name,txt):
    fp=os.path.join(OUT,name); os.makedirs(os.path.dirname(fp),exist_ok=True)
    open(fp,'w').write(txt); return os.path.getsize(fp)
# régi egyben lévő katalógus helyett részekre bontott fájlok
if os.path.exists(os.path.join(OUT,'products.js')): os.remove(os.path.join(OUT,'products.js'))
SUB2TOP={s['id']:t['id'] for t in tops for s in t['subs']}
TOPIDX={t['id']:i for i,t in enumerate(tops)}
for k,p in enumerate(P):
    p['k']=k
    p['_t']=list(dict.fromkeys(SUB2TOP[c] for c in p['c'] if c in SUB2TOP))
    p['_d']=int((1-p['p']/p['o'])*100+0.5) if p.get('o') and p.get('p') else 0
pub=lambda p:{k:v for k,v in p.items() if not k.startswith('_')}
byid={p['i']:p for p in P}
# főoldal
featured=[byid[i] for i in feat if i in byid]
popular=featured if len(featured)>=4 else [p for p in P if p['m']][:12]
deals=sorted([p for p in P if p['_d']>0 and p['m']],key=lambda p:-p['_d'])[:16]
news=[p for p in P if p.get('w') and p['m']][:16]
brands={}
for p in P:
    if p['b']: e=brands.setdefault(p['b'].upper(),{'name':p['b'],'n':0}); e['n']+=1
topN={t['id']:sum(1 for p in P if t['id'] in p['_t']) for t in tops}
subN={}
for p in P:
    for c in p['c']: subN[c]=subN.get(c,0)+1
mega={t['id']:[pub(p) for p in sorted([p for p in P if t['id'] in p['_t'] and p['m'] and p['_d']>0],key=lambda p:-p['_d'])[:4]] for t in tops}
home={'tops':tops,'asof':ASOF,'total':len(P),'saleCount':sum(1 for p in P if p['_d']>0),'brandCount':len(brands),
      'topBrands':sorted(brands.values(),key=lambda b:-b['n'])[:10],'topN':topN,'subN':subN,
      'popular':[pub(p) for p in popular],'deals':[pub(p) for p in deals],'news':[pub(p) for p in news],'mega':mega}
sz={'home.js':W('home.js','window.KB_HOME='+J(home)+';')}
for t in tops:
    sz['cat/'+t['id']+'.js']=W('cat/'+t['id']+'.js',f"KB_CAT('{t['id']}',"+J([pub(p) for p in P if t['id'] in p['_t']])+');')
# keresőindex: [id, név, márka, ár, főkategória-indexek]
sz['search.js']=W('search.js','KB_SEARCH('+J([[p['i'],p['n'],p['b'],p['p'],''.join(str(TOPIDX[x]) for x in p['_t'])] for p in P])+');')
# termék -> főkategória(k), és márkánként az első 13 termék (a "márka további termékei" sávhoz)
first={}
for p in P:
    if p['b']:
        l=first.setdefault(p['b'],[])
        if len(l)<13: l.append(p['i'])
sz['idmap.js']=W('idmap.js','KB_IDMAP('+J({'t':{p['i']:''.join(str(TOPIDX[x]) for x in p['_t']) for p in P},'b':first})+');')
print(len(P),'products'); [print(f'  {k}: {v//1024} KB') for k,v in sz.items()]
print('with sizes',sum(1 for p in P if p.get('s')),'new',sum(1 for p in P if p.get('w')),'sale',sum(1 for p in P if p.get('o')),'noimg',sum(1 for p in P if not p['m']))

dp=os.path.join(R,'details.json'); det=json.load(open(dp)) if os.path.exists(dp) else {}
ids={p['i'] for p in P}
det={k:v for k,v in det.items() if k in ids and v}
for v in det.values():
    if 'g' in v: v['g']=[g.replace('https://kangaboo.hu/image/cache/','') for g in v['g']]
import shutil
dd=os.path.join(OUT,'details'); shutil.rmtree(dd,ignore_errors=True); os.makedirs(dd)
NCH=128; chunks={}
for k,v in det.items(): chunks.setdefault(int(k)%NCH,{})[k]=v
for c in range(NCH):
    with open(os.path.join(dd,f'{c}.js'),'w') as f:
        f.write(f'KB_DET({c},');json.dump(chunks.get(c,{}),f,ensure_ascii=False,separators=(',',':'));f.write(');')
tot=sum(os.path.getsize(os.path.join(dd,x)) for x in os.listdir(dd))
print('details',len(det),'in',NCH,'chunks',tot//1024,'KB total')
