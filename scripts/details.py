import re,json,html,time,sys,os,urllib.request
R=sys.argv[1]
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
def T(s): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',s))).strip()
def parse(h):
    d={}
    m=re.search(r'id="tab-description2"[^>]*>(.*?)</div>\s*</div>\s*(?:<div class="tab-content"|<div id="tab-|</div>)',h,re.S) or re.search(r'id="tab-description2"[^>]*>(.{0,8000}?)<div (?:id|class)="tab',h,re.S)
    if m:
        body=re.sub(r'<script.*?</script>','',m.group(1),flags=re.S)
        parts=[T(x) for x in re.split(r'<br\s*/?>|</div>|</p>|</li>',body)]
        lines=[x for x in parts if x and len(x)>1][:40]
        if lines: d['d']=lines
    g=re.search(r'image-gallery"[^>]*>(.*?)</div>',h,re.S)
    if g:
        imgs=list(dict.fromkeys(re.findall(r'href="(https://kangaboo\.hu/image/[^"]+)"',g.group(1))))
        if imgs: d['g']=imgs[:10]
    s=re.search(r'"item_id":"([^"]+)"',h)
    if s: d['sku']=s.group(1)
    return d
if __name__=='__main__' and len(sys.argv)>2 and sys.argv[2]=='test':
    print(json.dumps(parse(open(os.path.join(R,'prod.html'),encoding='utf-8').read()),ensure_ascii=False,indent=1)); sys.exit()
prods=json.load(open(os.path.join(R,'products.json')))
byid={p['id']:p for p in prods}
outp=os.path.join(R,'details.json')
det=json.load(open(outp)) if os.path.exists(outp) else {}
# ha van fontossági lista (scripts/priority.py), csak azt tölti le, abban a sorrendben
pri=os.path.join(R,'priority.json')
ids=json.load(open(pri)) if os.path.exists(pri) else [p['id'] for p in prods]
todo=[byid[i] for i in ids if i in byid and i not in det]   # a már letöltötteket nem kéri le újra
PAUSE=1.5   # legalább ennyi másodperc két kérés között
print('letöltendő',len(todo),'| már megvan',len(det),flush=True)
def save(): 
    tmp=outp+'.tmp'; json.dump(det,open(tmp,'w'),ensure_ascii=False); os.replace(tmp,outp)
def stop(msg):
    save(); print('MEGÁLLT:',msg,'| leírások összesen:',len(det),flush=True); sys.exit(2)
errs=0
for n,p in enumerate(todo):
    try:
        h=urllib.request.urlopen(urllib.request.Request(p['url'],headers={'User-Agent':UA,'Accept-Language':'hu'}),timeout=40).read().decode('utf-8','replace')
    except urllib.error.HTTPError as e:
        if e.code in (403,429,503): stop(f'a szerver blokkol (HTTP {e.code}) a(z) {n+1}. kérésnél, termék {p["id"]}')
        errs+=1; print('HIBA',p['id'],e,flush=True)
        if errs>=3: stop('három hiba egymás után')
        time.sleep(30); continue
    except Exception as e:
        errs+=1; print('HIBA',p['id'],e,flush=True)
        if errs>=3: stop('három hálózati hiba egymás után')
        time.sleep(30); continue
    if 'Just a moment' in h[:600]: stop(f'védelmi (Cloudflare) oldal a(z) {n+1}. kérésnél, termék {p["id"]}')
    errs=0
    det[p['id']]=parse(h)
    if n%25==0: save(); print(n+1,'/',len(todo),'| összesen',len(det),flush=True)
    time.sleep(PAUSE)
save(); print('KÉSZ | leírások összesen:',len(det),flush=True)
