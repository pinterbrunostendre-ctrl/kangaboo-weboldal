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
home=open(os.path.join(R,'home.html'),encoding='utf-8').read()
feat=list(dict.fromkeys(re.findall(r'product-info-(\d+)',home)))
os.makedirs(OUT,exist_ok=True)
with open(os.path.join(OUT,'products.js'),'w') as f:
    f.write('window.KB=');json.dump({'tops':tops,'products':P,'featured':feat},f,ensure_ascii=False,separators=(',',':'));f.write(';')
print(len(P),'products',len(feat),'featured',os.path.getsize(os.path.join(OUT,'products.js'))//1024,'KB')
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
