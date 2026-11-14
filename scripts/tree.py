import re,sys,json,html
h=open(sys.argv[1],encoding='utf-8').read()
links=set(re.findall(r'<a[^>]+href="https://kangaboo\.hu/([^"?&]+)"[^>]*>\s*([^<]{1,80}?)\s*</a>',h))
cats={}
for path,name in links:
    m=re.search(r'-(\d{6})$',path)
    if not m: continue
    cid=m.group(1); name=html.unescape(name).strip()
    if not name: continue
    slug=path.split('/')[-1]
    cats.setdefault(cid,{'id':cid,'slug':slug,'name':name})
    if len(name)>len(cats[cid]['name']): pass
json.dump(cats,open(sys.argv[2],'w'),ensure_ascii=False,indent=0)
tops=sorted(c for c in cats if c.endswith('0000'))
for t in tops:
    print(t,cats[t]['name'])
    for s in sorted(c for c in cats if c[:2]==t[:2] and c.endswith('00') and not c.endswith('0000')):
        leaves=[cats[l]['name'] for l in sorted(cats) if l[:4]==s[:4] and not l.endswith('00')]
        print('  ',s,cats[s]['name'],'|',len(leaves))
print(len(cats))
