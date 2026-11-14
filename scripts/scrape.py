import re,json,html,time,sys,os,urllib.request
OUT=sys.argv[1]; cats=json.load(open(os.path.join(OUT,'cats.json')))
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
TOPS={'490000':'kismama-490000','500000':'baba-es-gyerekruha-500000','510000':'labbeli-510000','520000':'furdetes-pelenkazas-520000','540000':'szoptatas-etetes-540000','550000':'babaszoba-550000','560000':'babakocsi-560000','570000':'biztonsag-570000','660000':'jatek-konyv-ajandek-660000','670000':'biztonsagi-ules-hordozo-670000'}
def get(url):
    for attempt in range(3):
        try:
            r=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA,'Accept-Language':'hu'}),timeout=40)
            return r.read().decode('utf-8','replace')
        except Exception as e:
            print('ERR',url,e,flush=True); time.sleep(20*(attempt+1))
    return None
def T(s): return html.unescape(re.sub(r'<[^>]+>','',s)).strip()
def num(s):
    m=re.search(r'([\d\s ]+)\s*Ft',s or '');
    return int(re.sub(r'\D','',m.group(1))) if m else None
def parse(h):
    out=[]
    for blk in h.split('<div class="product-grid-item ')[1:]:
        m=re.search(r'product-info-(\d+)',blk)
        if not m: continue
        pid=m.group(1)
        url=re.search(r'<a href="(https://kangaboo\.hu/[^"]+)"',blk).group(1)
        img=re.search(r'data-src="([^"]+)"',blk)
        name=re.search(r'<div class="name"><a[^>]*>(.*?)</a>',blk,re.S)
        brand=re.search(r'class="uniquemarka">(.*?)</div>',blk,re.S)
        labels=[T(x) for x in re.findall(r'<span[^>]*class="label-sale"[^>]*>(.*?)</span>',blk,re.S)]
        old=re.search(r'price-old">(.*?)</div>',blk,re.S)
        sp=re.search(r'price-special">(.*?)</div>',blk,re.S)
        nm=re.search(r'price-normal">(.*?)</div>',blk,re.S)
        price_txt=T((sp or nm).group(1)) if (sp or nm) else ''
        sizes=[T(x) for x in re.findall(r'div_option_meret">(.*?)</button>',blk,re.S)]
        out.append({'id':pid,'url':url,'name':T(name.group(1)) if name else '','brand':T(brand.group(1)) if brand else '',
          'img':img.group(1) if img else '','price':num(price_txt),'old':num(old.group(1)) if old else None,
          'from':'tól' in price_txt,'labels':[l for l in labels if l],'sizes':list(dict.fromkeys(s for s in sizes if s))[:40]})
    return out
prods={}
os.makedirs(os.path.join(OUT,'pages'),exist_ok=True)
subs=sorted(c for c in cats if c.endswith('00') and not c.endswith('0000'))
for sid in subs:
    top=sid[:2]+'0000'; base=f"https://kangaboo.hu/{TOPS[top]}/{cats[sid]['slug']}"
    page=1; pages=1
    while page<=pages:
        cache=os.path.join(OUT,'pages',f'{sid}_{page}.html')
        if os.path.exists(cache): h=open(cache,encoding='utf-8').read()
        else:
            h=get(base+(f'?page={page}' if page>1 else ''))
            time.sleep(1.2)
            if h and 'Just a moment' not in h[:600]: open(cache,'w',encoding='utf-8').write(h)
        if not h or 'Just a moment' in h[:600]: print('BLOCKED',base,page,flush=True); break
        m=re.search(r'Tételek:\s*\d+\s*-\s*\d+\s*/\s*(\d+)\s*\((\d+) oldal\)',h)
        if m: pages=int(m.group(2))
        for p in parse(h):
            e=prods.setdefault(p['id'],{**p,'cats':[]})
            if sid not in e['cats']: e['cats'].append(sid)
        page+=1
    print(sid,cats[sid]['name'],pages,'pages; total',len(prods),flush=True)
    json.dump(list(prods.values()),open(os.path.join(OUT,'products.json'),'w'),ensure_ascii=False)
print('DONE',len(prods))
