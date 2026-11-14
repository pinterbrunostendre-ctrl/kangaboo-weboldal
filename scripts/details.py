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
outp=os.path.join(R,'details.json')
det=json.load(open(outp)) if os.path.exists(outp) else {}
todo=[p for p in prods if p['id'] not in det]
print('todo',len(todo),flush=True)
for n,p in enumerate(todo):
    try:
        h=urllib.request.urlopen(urllib.request.Request(p['url'],headers={'User-Agent':UA,'Accept-Language':'hu'}),timeout=40).read().decode('utf-8','replace')
    except Exception as e:
        print('ERR',p['id'],e,flush=True); time.sleep(15); continue
    if 'Just a moment' in h[:600]: print('BLOCKED at',n,flush=True); time.sleep(120); continue
    det[p['id']]=parse(h)
    if n%50==0:
        json.dump(det,open(outp,'w'),ensure_ascii=False); print(n,len(det),flush=True)
    time.sleep(0.7)
json.dump(det,open(outp,'w'),ensure_ascii=False); print('DONE',len(det))
