/* Kangaboo – újratervezett webshop (bemutató). Adatok: data/home.js (főoldal); igény szerint: data/facet/*.js (szűrőadat), data/cards/*.js (kártyák), data/brands.js, data/search.js, data/details/*.js */
(function(){
'use strict';
const KB = window.KB_HOME || {tops:[],topN:{},subN:{},popular:[],deals:[],news:[],mega:{},topBrands:[],total:0,saleCount:0,brandCount:0};
// <script> alapú betöltő: fájlból (file://) megnyitva is működik, ahol a fetch nem
const LOADS={};
function loadScript(src){
  return LOADS[src]||(LOADS[src]=new Promise((res,rej)=>{
    const s=document.createElement('script'); s.src=src; s.async=true;
    s.onload=()=>res(); s.onerror=()=>{ delete LOADS[src]; s.remove(); rej(new Error(src)); };
    document.head.appendChild(s);
  }));
}
const DET = {}; const DCH = {}; const NCH = 128;
window.KB_DET = (c,data) => { Object.assign(DET,data); (DCH[c]||{}).done=true; ((DCH[c]||{}).cbs||[]).forEach(f=>f()); };
function loadDetails(id){
  const c=(+id)%NCH;
  return new Promise(res=>{
    if(DCH[c]&&DCH[c].done) return res();
    if(DCH[c]){ DCH[c].cbs.push(res); return; }
    DCH[c]={cbs:[res]};
    const s=document.createElement('script'); s.src='data/details/'+c+'.js'; s.async=true;
    s.onerror=()=>{ DCH[c].done=true; DCH[c].cbs.forEach(f=>f()); };
    document.head.appendChild(s);
  });
}
const ORIGIN = 'https://kangaboo.hu/';
const IMGBASE = 'https://kangaboo.hu/image/cache/';
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const app = $('#app');

/* ---------- helpers ---------- */
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const ft = n => n==null ? '' : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ')+' Ft';
const icon = (id,cls='') => `<svg class="icon ${cls}"><use href="#${id}"/></svg>`;
const store = {
  get(k,d){try{const v=localStorage.getItem('kb_'+k);return v?JSON.parse(v):d}catch(e){return d}},
  set(k,v){try{localStorage.setItem('kb_'+k,JSON.stringify(v))}catch(e){}},
  del(k){try{localStorage.removeItem('kb_'+k)}catch(e){}}
};
window.go = h => { location.hash = h; };
// hiányzó kép helyett rendezett helykitöltő, ugyanazzal a mérettel és osztállyal
window.imgFail = el => {
  const ph=document.createElement('span');
  ph.className=(el.className?el.className+' ':'')+'ph ph-img'; ph.style.cssText=el.style.cssText;
  ph.setAttribute('role','img'); ph.setAttribute('aria-label',el.alt?el.alt+' – a kép nem érhető el':'A kép nem érhető el');
  ph.innerHTML='<svg class="icon" aria-hidden="true"><use href="#i-image"/></svg>';
  el.replaceWith(ph);
};

/* ---------- category metadata ---------- */
const TOPMETA = {
  '490000':{i:'c-mama',bg:'var(--lilac)',fg:'var(--lilac-d)',d:'Kényelmes ruházat, szoptatós fehérnemű és ápolás a várandósság idejére.'},
  '500000':{i:'c-onesie',bg:'var(--blush)',fg:'var(--pink-d)',d:'Rugdalózók, bodyk, felsők, kabátok és kiegészítők újszülött kortól.'},
  '510000':{i:'c-shoe',bg:'var(--butter)',fg:'var(--butter-d)',d:'Kocsicipők, első lépés cipők, szandálok és csizmák.'},
  '520000':{i:'c-bath',bg:'var(--sky)',fg:'var(--sky-d)',d:'Pelenkázás, fürdetés, babakádak, bilik és babakozmetikumok.'},
  '540000':{i:'c-bottle',bg:'var(--blush)',fg:'var(--pink-d)',d:'Mellszívók, cumisüvegek, sterilizálók, etetőszékek és etetési kellékek.'},
  '550000':{i:'c-crib',bg:'var(--butter)',fg:'var(--butter-d)',d:'Kiságyak, matracok, komódok, járókák és ágyneműk a babaszobába.'},
  '560000':{i:'c-stroller',bg:'var(--sage-l)',fg:'var(--sage-d)',d:'Multifunkciós és sport babakocsik, mózesek és kiegészítők.'},
  '570000':{i:'c-shield',bg:'var(--sage-l)',fg:'var(--sage-d)',d:'Babaőrzők, légzésfigyelők és lakásbiztonsági eszközök.'},
  '660000':{i:'c-toy',bg:'var(--lilac)',fg:'var(--lilac-d)',d:'Bébijátékok, fajátékok, plüssök, társasjátékok, könyvek és ajándékok.'},
  '670000':{i:'c-seat',bg:'var(--sky)',fg:'var(--sky-d)',d:'Autósülések, hordozók, kerékpárülések és kiegészítők.'}
};
// kategóriaszínek: bg = telített lapka, fg = ikon a lapkán (kontraszt ≥ 3:1), tint = világos fejléc, deep = szöveg/ikon fehéren vagy a világos árnyalaton
const PALETTE=[
  {bg:'var(--brand-orange)',fg:'#fff',tint:'var(--orange-100)',deep:'var(--coral-text)'},
  {bg:'var(--brand-pink)',fg:'#fff',tint:'var(--pink-100)',deep:'var(--pink-d)'},
  {bg:'var(--brand-sun)',fg:'var(--ink)',tint:'var(--sun-100)',deep:'var(--butter-d)'},
  {bg:'var(--brand-lime)',fg:'var(--ink)',tint:'var(--lime-100)',deep:'var(--sage-d)'},
  {bg:'var(--brand-blue)',fg:'var(--ink)',tint:'var(--blue-100)',deep:'var(--sky-d)'}];
const TOP = {}, SUB = {}, SUB2TOP = {};
KB.tops.forEach((t,ix)=>{ TOP[t.id]=t; t.meta={...(TOPMETA[t.id]||{i:'c-gift',d:''}),...PALETTE[ix%PALETTE.length]}; t.subs.forEach(s=>{SUB[s.id]=s;SUB2TOP[s.id]=t.id;}); });

/* ---------- products (igény szerint betöltve) ---------- */
// Két adatfajta:
//  - kártya: a teljes termékrekord (név, kép, ár, méretek…), data/cards/<id%512>.js – csak a megjelenített termékekhez
//  - szűrőadat (facet): tömör sorok a szűréshez, rendezéshez, darabszámokhoz – data/facet/*.js, data/search.js
const BYID = {};            // id -> kártya (minden eddig betöltött)
const FACETS = {};          // kulcs -> szűrőadat-sorok, eredeti sorrendben
const NCARD = 512, SHARDS = {};
let SEARCH = null, BRANDS = null, NAMES = null;
const SUBS = KB.tops.flatMap(t=>t.subs.map(s=>s.id));
function reg(p){
  if(BYID[p.i]) return BYID[p.i];
  p.t=[...new Set((p.c||[]).map(c=>SUB2TOP[c]).filter(Boolean))];
  p.d=p.o&&p.p? Math.round((1-p.p/p.o)*100):0;
  p._s=norm(p.b+' '+p.n);
  return BYID[p.i]=p;
}
// tömör sor -> ugyanazok a mezők, amelyekkel a lista eddig szűrt és rendezett
// szűrőfájl:  [id, sorrend, márka, ár, régi ár, újdonság, méretek, alkategóriák]
// keresőindex: [id, név, márka, ár, régi ár, újdonság, méretek, alkategóriák, sorrend]
function facetRow(r,bl,sl,withName){
  const o={i:r[0]}; let j=1;
  if(withName) o.n=r[j++]; else o.k=r[j++];
  o.b=bl[r[j++]]; o.p=r[j++];
  const old=r[j++]; if(old) o.o=old;
  o.w=r[j++]||0;
  o.s=r[j++].map(x=>sl[x]);
  o.c=r[j++].map(x=>SUBS[x]);
  if(withName){ o.k=r[j++]; o._s=norm(o.b+' '+o.n); }
  o.t=[...new Set(o.c.map(c=>SUB2TOP[c]).filter(Boolean))];
  o.d=o.o&&o.p? Math.round((1-o.p/o.o)*100):0;
  if(NAMES&&o.n==null&&NAMES[o.i]!=null) o.n=NAMES[o.i];
  return o;
}
['popular','deals','news'].forEach(k=>KB[k]=(KB[k]||[]).map(reg));
Object.keys(KB.mega||{}).forEach(t=>KB.mega[t]=KB.mega[t].map(reg));
window.KB_CARDS=(n,list)=>{ list.forEach(reg); SHARDS[n]=true; };
window.KB_FACET=(key,d)=>{ (d.cards||[]).forEach(reg); FACETS[key]=d.r.map(r=>facetRow(r,d.b,d.s,false)); };
window.KB_SEARCH=d=>{
  SEARCH=d.r.map(r=>facetRow(r,d.b,d.s,true));
  NAMES={}; SEARCH.forEach(x=>NAMES[x.i]=x.n);
  Object.values(FACETS).forEach(rows=>rows.forEach(x=>{ if(x.n==null) x.n=NAMES[x.i]; }));
};
window.KB_BRANDS=d=>{ BRANDS=d; };
const ensureFacet=key=>FACETS[key]?Promise.resolve():loadScript('data/facet/'+key+'.js');
const ensureSearch=()=>SEARCH?Promise.resolve():loadScript('data/search.js');
const ensureBrands=()=>BRANDS?Promise.resolve():loadScript('data/brands.js');
const shardOf=id=>(+id)%NCARD;
const ensureCards=ids=>Promise.all([...new Set(ids.filter(id=>!BYID[id]).map(shardOf))].map(n=>loadScript('data/cards/'+n+'.js')));
const cardsReady=ids=>ids.every(id=>BYID[id]||SHARDS[shardOf(id)]);
const img = p => p && p.m ? (p.m.startsWith('http')?p.m:IMGBASE+p.m) : '';
const topCount = id => KB.topN[id]||0;
const subCount = KB.subN||{};

/* ---------- state: cart & favourites ---------- */
let cart = store.get('cart',[]).filter(x=>x&&x.id&&x.q>0);
let favs = new Set(store.get('favs',[]));
// betöltés után: a már nem létező termékek kiszűrése
function pruneState(){
  // a kártyafájl betöltése után ami nincs benne, az már nem létező termék
  const gone=id=>SHARDS[shardOf(id)]&&!BYID[id];
  const c=cart.filter(x=>!gone(x.id)); if(c.length!==cart.length){ cart=c; saveCart(); }
  const f=[...favs].filter(id=>!gone(id)); if(f.length!==favs.size){ favs=new Set(f); saveFavs(); }
}
function saveCart(){ store.set('cart',cart); badge(); }
function saveFavs(){ store.set('favs',[...favs]); badge(); }
function badge(){
  const n=cart.reduce((a,x)=>a+x.q,0);
  const cc=$('#cartCount'); cc.textContent=n; cc.hidden=!n;
  const fc=$('#favCount'); fc.textContent=favs.size; fc.hidden=!favs.size;
}
window.addCart = (id,size,q=1) => {
  const p=BYID[id]; if(!p) return;
  if(p.s && p.s.length && !size){ go('#/termek/'+id); toast('Válassz méretet a termékoldalon'); return; }
  const ex=cart.find(x=>x.id===id && (x.sz||'')===(size||''));
  if(ex) ex.q+=q; else cart.push({id,sz:size||'',q});
  saveCart(); toast('Kosárba téve: '+p.n, '#/kosar', 'Kosár');
};
window.toggleFav = (id,btn) => {
  if(favs.has(id)){favs.delete(id);} else {favs.add(id); toast('Hozzáadva a kedvencekhez');}
  saveFavs();
  $$(`[data-fav="${id}"]`).forEach(b=>b.classList.toggle('on',favs.has(id)));
  if(location.hash.startsWith('#/kedvencek')) route();
};
let tt;
function toast(msg,link,label){
  const t=$('#toast'); const s=t.querySelector('span');
  s.textContent=msg;
  const old=t.querySelector('a'); if(old) old.remove();
  if(link){ const a=document.createElement('a'); a.href=link; a.textContent=label; t.appendChild(a); }
  t.classList.add('show'); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove('show'),msg.length>60?6000:2800);
}
window.toast = toast;

/* ---------- product card ---------- */
function card(p){
  const ph = icon(TOP[p.t[0]]?.meta.i||'c-gift','ph-art');
  const isNew=p.w, sale=p.o&&p.o>p.p;
  return `<article class="prod">
    <div class="pv" style="color:${TOP[p.t[0]]?.meta.deep||'var(--muted)'}">${ph}
      ${p.m?`<img src="${esc(img(p))}" alt="${esc(p.n)}" loading="lazy" onerror="this.remove()">`:''}
      <div class="tags">${isNew?'<span class="tag new">Újdonság</span>':''}${sale?`<span class="tag sale">−${p.d}%</span>`:''}</div>
      <button class="fav ${favs.has(p.i)?'on':''}" data-fav="${p.i}" aria-label="Kedvencekhez" onclick="event.stopPropagation();toggleFav('${p.i}')">${icon('i-heart')}</button>
      <div class="quick"><button class="btn btn-primary" onclick="event.stopPropagation();addCart('${p.i}')">${icon('i-bag','sm')}${p.s&&p.s.length?'Méretválasztás':'Kosárba'}</button></div>
    </div>
    <div class="pi">
      <span class="pb">${esc(p.b)}</span>
      <h3><a href="#/termek/${p.i}">${esc(p.n)}</a></h3>
      ${p.s&&p.s.length?`<span class="sizes">Méret: ${esc(p.s[0])}${p.s.length>1?' – '+esc(p.s[p.s.length-1]):''}</span>`:''}
      <div class="price">${sale?`<b class="sale-p">${ft(p.p)}</b><s>${ft(p.o)}</s>`:`<b>${p.f?'<small>már </small>':''}${ft(p.p)}</b>`}</div>
    </div>
  </article>`;
}
const crumbs = list => `<nav class="crumbs" aria-label="Morzsamenü"><a href="#/">Főoldal</a>${list.map((c,i)=>icon('i-chev-r')+(i===list.length-1||!c[1]?`<b>${esc(c[0])}</b>`:`<a href="${c[1]}">${esc(c[0])}</a>`)).join('')}</nav>`;

/* ---------- header: mega menu, drawer, footer cats ---------- */
function buildNav(){
  const mega=$('#mega');
  mega.innerHTML=`<div class="mega-in"><div class="mega-tops">${KB.tops.map((t,i)=>`<a href="#/kategoria/${t.id}" data-top="${t.id}" class="${i?'':'on'}"><span class="mi" style="background:${t.meta.bg};color:${t.meta.fg}">${icon(t.meta.i)}</span>${esc(t.name)}${icon('i-chev-r','sm chev')}</a>`).join('')}</div><div class="mega-pane" id="megaPane"></div></div>`;
  const pane=$('#megaPane');
  const show=id=>{
    const t=TOP[id]; if(!t) return;
    $$('.mega-tops a').forEach(a=>a.classList.toggle('on',a.dataset.top===id));
    const feat=(KB.mega||{})[id]||[];
    pane.innerHTML=`<h3>${esc(t.name)} <a href="#/kategoria/${t.id}">Összes termék (${topCount(t.id)}) →</a></h3>
      <div class="mega-subs">${t.subs.map(s=>`<a href="#/kategoria/${t.id}/${s.id}">${esc(s.name)}<span>${subCount[s.id]||0}</span></a>`).join('')}</div>
      ${feat.length?`<div class="mega-feat">${feat.map(p=>`<a href="#/termek/${p.i}"><img src="${esc(img(p))}" alt="" loading="lazy" onerror="imgFail(this)"><div><b>${esc(p.n)}</b><span>${ft(p.p)} · −${p.d}%</span></div></a>`).join('')}</div>`:''}`;
  };
  $$('.mega-tops a').forEach(a=>{ a.addEventListener('mouseenter',()=>show(a.dataset.top)); a.addEventListener('focus',()=>show(a.dataset.top)); });
  $('.has-mega > a').addEventListener('focus',()=>$('#mega').classList.remove('closed'));
  if(KB.tops[0]) show(KB.tops[0].id);
  // nyitott menü: a mögötte lévő oldal elsötétül; a sötét rétegre kattintva bezárul
  const hm=$('.has-mega'), scrim=document.createElement('div');
  scrim.className='mega-scrim'; scrim.setAttribute('aria-hidden','true'); document.body.appendChild(scrim);
  const isOpen=()=>!mega.classList.contains('closed')&&(hm.matches(':hover')||hm.contains(document.activeElement));
  const sync=()=>document.body.classList.toggle('mega-open',isOpen());
  window.closeMega=()=>{ mega.classList.add('closed'); if(hm.contains(document.activeElement)) document.activeElement.blur(); sync(); };
  hm.addEventListener('mouseenter',()=>{ mega.classList.remove('closed'); sync(); });
  hm.addEventListener('mouseleave',()=>{ mega.classList.remove('closed'); setTimeout(sync,0); });
  hm.addEventListener('focusin',()=>setTimeout(sync,0));
  hm.addEventListener('focusout',()=>setTimeout(sync,0));
  scrim.addEventListener('click',closeMega);
  mega.addEventListener('click',e=>{ if(e.target.closest('a')){ mega.classList.add('closed'); setTimeout(sync,0); } });

  $('#drawerBody').innerHTML = KB.tops.map(t=>`<details><summary><span class="mi" style="background:${t.meta.bg};color:${t.meta.fg}">${icon(t.meta.i)}</span>${esc(t.name)}${icon('i-chev','sm chev')}</summary>
    <div class="dsubs"><a href="#/kategoria/${t.id}"><b>Összes ${esc(t.name.toLowerCase())}</b></a>${t.subs.map(s=>`<a href="#/kategoria/${t.id}/${s.id}">${esc(s.name)}</a>`).join('')}</div></details>`).join('')
    + `<div class="dlinks"><a href="#/akciok" style="color:var(--coral-text)">Akciók<span>›</span></a><a href="#/ujdonsagok">Újdonságok<span>›</span></a><a href="#/markak">Márkák<span>›</span></a><a href="#/uzleteink">Üzleteink<span>›</span></a><a href="#/szallitas">Szállítás és fizetés<span>›</span></a><a href="#/torzsvasarlo">Törzsvásárlóknak<span>›</span></a><a href="#/tanacsadas">Ingyenes tanácsadás<span>›</span></a><a href="#/kapcsolat">Kapcsolat<span>›</span></a></div>`;
  $('#drawerBody').addEventListener('click',e=>{ if(e.target.closest('a')) toggleDrawer(false); });
  $('#footCats').innerHTML = KB.tops.map(t=>`<li><a href="#/kategoria/${t.id}">${esc(t.name)}</a></li>`).join('');
}
const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
const visible=el=>el.getClientRects().length>0;
let PANEL=null;
function openPanel(el,opener,close){
  if(PANEL) closePanel(true);
  PANEL={el,opener,close};
  // a megjelenési animáció alatt az elem még nem fókuszálható: rövid ideig újrapróbáljuk
  const target=[...el.querySelectorAll(FOCUSABLE)].find(visible)||el; let n=0;
  (function tryFocus(){ target.focus(); if(document.activeElement!==target&&PANEL&&PANEL.el===el&&n++<20) setTimeout(tryFocus,25); })();
}
function closePanel(silent){
  if(!PANEL) return; const p=PANEL; PANEL=null; p.close();
  if(!silent&&p.opener&&document.contains(p.opener)) p.opener.focus();
}
document.addEventListener('keydown',e=>{
  if(!PANEL) return;
  if(e.key==='Escape'){ e.preventDefault(); closePanel(); return; }
  if(e.key==='Tab'){
    const f=[...PANEL.el.querySelectorAll(FOCUSABLE)].filter(visible); if(!f.length) return;
    const a=f[0], z=f[f.length-1], cur=document.activeElement;
    if(!PANEL.el.contains(cur)){ e.preventDefault(); a.focus(); }
    else if(e.shiftKey&&cur===a){ e.preventDefault(); z.focus(); }
    else if(!e.shiftKey&&cur===z){ e.preventDefault(); a.focus(); }
  }
});
function drawerClose(){ const d=$('#drawer'); d.classList.remove('open'); d.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
window.toggleDrawer = o => {
  if(o){ const d=$('#drawer'); d.classList.add('open'); d.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
         openPanel($('#drawer .panel'),$('.menu-toggle'),drawerClose); }
  else if(PANEL&&PANEL.el.closest('#drawer')) closePanel(); else drawerClose();
};
window.openFilters = btn => {
  const f=$('#filters'); f.classList.add('open'); f.setAttribute('role','dialog'); f.setAttribute('aria-modal','true'); f.setAttribute('aria-label','Szűrők');
  document.body.style.overflow='hidden';
  openPanel(f,btn,()=>{ f.classList.remove('open'); f.removeAttribute('role'); f.removeAttribute('aria-modal'); f.removeAttribute('aria-label'); document.body.style.overflow=''; });
};
window.closeFilters = () => { if(PANEL&&PANEL.el.id==='filters') closePanel(); else { const f=$('#filters'); if(f) f.classList.remove('open'); } };

/* ---------- search ---------- */
function searchP(q){
  const toks=norm(q).split(/\s+/).filter(Boolean);
  if(!toks.length||!SEARCH) return [];
  return SEARCH.filter(p=>toks.every(t=>p._s.includes(t)));
}
let SBRANDS=null;
function searchBrands(){
  if(SBRANDS) return SBRANDS;
  const m={}; (SEARCH||[]).forEach(p=>{ if(!p.b) return; const k=p.b.toUpperCase(); (m[k]=m[k]||{name:p.b,n:0}).n++; });
  return SBRANDS=Object.values(m);
}
function hl(text,q){
  let out=esc(text);
  norm(q).split(/\s+/).filter(t=>t.length>1).forEach(t=>{
    const n=norm(text); const i=n.indexOf(t);
    if(i>=0){ out=esc(text.slice(0,i))+'<mark>'+esc(text.slice(i,i+t.length))+'</mark>'+esc(text.slice(i+t.length)); }
  });
  return out;
}
function buildSearch(){
  const f=$('#searchForm'), q=$('#q'), sg=$('#suggest');
  let sel=-1;
  const render=()=>{
    const v=q.value.trim();
    if(v.length<2){ sg.hidden=true; return; }
    if(!SEARCH){
      sg.innerHTML='<div class="sg-title" aria-live="polite">Keresés betöltése…</div>'; sg.hidden=false;
      ensureSearch().then(render,()=>{ sg.innerHTML='<div class="sg-title">A keresés most nem érhető el.</div>'; });
      return;
    }
    const res=searchP(v);
    const brands=searchBrands().filter(b=>norm(b.name).includes(norm(v))).slice(0,3);
    const cats=KB.tops.flatMap(t=>t.subs.map(s=>({t,s}))).filter(x=>norm(x.s.name).includes(norm(v))).slice(0,3);
    sg.innerHTML=
      (cats.length?`<div class="sg-title">Kategóriák</div>`+cats.map(x=>`<a href="#/kategoria/${x.t.id}/${x.s.id}"><span class="ph" style="display:grid;place-items:center;background:${x.t.meta.bg};color:${x.t.meta.fg}">${icon(x.t.meta.i)}</span><div><div class="sn">${hl(x.s.name,v)}</div><div class="sp">${esc(x.t.name)}</div></div></a>`).join(''):'')+
      (brands.length?`<div class="sg-title">Márkák</div>`+brands.map(b=>`<a href="#/marka/${encodeURIComponent(b.name)}"><span class="ph" style="display:grid;place-items:center;font-family:var(--serif);font-weight:700">${esc(b.name[0])}</span><div><div class="sn">${hl(b.name,v)}</div><div class="sp">${b.n} termék</div></div></a>`).join(''):'')+
      (res.length?`<div class="sg-title">Termékek</div>`+res.slice(0,6).map(r=>{const p=BYID[r.i]||r;return `<a href="#/termek/${p.i}">${p.m?`<img src="${esc(img(p))}" alt="" onerror="imgFail(this)">`:'<span class="ph"></span>'}<div><div class="sn">${hl(p.n,v)}</div><div class="sp">${esc(p.b)} · ${ft(p.p)}</div></div></a>`}).join(''):'')+
      `<a class="all" href="#/kereses?q=${encodeURIComponent(v)}">${res.length?`Mind a ${res.length} találat megtekintése →`:'Nincs találat – keresés újra'}</a>`;
    sg.hidden=false; sel=-1;
  };
  let deb; q.addEventListener('input',()=>{clearTimeout(deb);deb=setTimeout(render,120)});
  q.addEventListener('focus',()=>{ ensureSearch().catch(()=>{}); render(); });
  q.addEventListener('keydown',e=>{
    const links=$$('a',sg); if(sg.hidden||!links.length) return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); sel=(sel+(e.key==='ArrowDown'?1:-1)+links.length)%links.length; links.forEach((a,i)=>a.classList.toggle('on',i===sel)); }
    else if(e.key==='Enter'&&sel>=0){ e.preventDefault(); location.hash=links[sel].getAttribute('href'); sg.hidden=true; q.blur(); }
    else if(e.key==='Escape'){ sg.hidden=true; }
  });
  document.addEventListener('click',e=>{ if(!f.contains(e.target)) sg.hidden=true; else if(e.target.closest('#suggest a')) { sg.hidden=true; } });
  f.addEventListener('submit',e=>{ e.preventDefault(); const v=q.value.trim(); if(v){ go('#/kereses?q='+encodeURIComponent(v)); sg.hidden=true; q.blur(); } });
}

/* ---------- static content ---------- */
const PROMOS=[
 ['CYBEX','Stílus és biztonság felsőfokon: CYBEX Gold','Ergonomikus CYBEX Gold babakocsik és autósülések akciós áron.','2026-11-30','xAKC260331-350x350.jpg.pagespeed.ic.DiaOamJYJq.jpg'],
 ['LOSAN','Színesebb hétköznapok a hűvös időben','Spanyol LOSAN kollekció a kényelmes szettektől a bélelt télikabátokig.','2026-11-18','xAKC260327-350x350.jpg.pagespeed.ic.qmjGd4NbPI.jpg'],
 ['MALPLAY','Határtalan alkotás maszatolás nélkül','Törölhető rajztáblák és mágneses táblák kis alkotóknak (MALPLAY, BABYSYS).','2026-11-18','xAKC260328-350x350.jpg.pagespeed.ic.NtBhv6krwj.jpg'],
 ['HAPPY HORSE','Ölelnivaló puhaság az édes álmokért','Puha alvókendők és szundikendők a nyugodt éjszakákért.','2026-11-18','xAKC260329-350x350.jpg.pagespeed.ic.5zswWMMxVI.jpg'],
 ['KIKKA BOO','Biztonságos első lépések és vidám felfedezések','Járássegítők és bébikompok játékpanellel.','2026-11-18','xAKC260330-350x350.jpg.pagespeed.ic.L-0-Y-Nq3j.jpg'],
 ['NATTOU','Ölelnivaló Teddy barátok','Teddy kollekció: plüss hold, szundikendő és orrszarvú hintaszék.','2026-11-15','xAKC260326-350x350.jpg.pagespeed.ic.h1HQ_c4m23.jpg'],
];
const STORES=[
 ['Dunakeszi City Market','2 500 m²','2120 Dunakeszi, Nádas u. 8. (az Auchan mellett)','+36 30 565 2683',[10,20],[10,18],'xDunakeszi_ss.jpg.pagespeed.ic.X_NXubUuUI.jpg'],
 ['Törökbálint AUCHAN','1 400 m²','2045 Törökbálint, Torbágy u. 1.','+36 30 978 5146',[9,20],[9,19],'xTorokbalint-ss.jpg.pagespeed.ic.Gv8hx7pANs.jpg'],
 ['Ferencváros ILLA Center','850 m²','1095 Budapest, Soroksári út 138–142.','+36 30 173 9854',[10,19],[10,18],'xilla_ss2_2.jpg.pagespeed.ic.t1rVVRhntK.jpg'],
 ['STOP.SHOP. Debrecen','820 m²','4031 Debrecen, Kishatár út 34.','+36 30 565 3173',[9,20],[9,18],'xdebrecen_s2.jpg.pagespeed.ic.AcoHvkUMX4.jpg'],
 ['STOP.SHOP. Óbuda','800 m²','1037 Budapest, Bécsi út 136.','+36 30 565 3147',[9,20],[9,18],'xObuda-ss.jpg.pagespeed.ic.D9qs2bPwul.jpg'],
 ['Soroksár AUCHAN','480 m²','1239 Budapest, Bevásárló út 2.','+36 30 565 3538',[9,20],[9,19],'xSoroksar-ss_n.png.pagespeed.ic.D71g1ZZRHs.jpg'],
];
// naptári napok a kampány utolsó napjáig (0 = ma az utolsó nap, negatív = lejárt)
const daysLeft=d=>{const t=new Date();t.setHours(0,0,0,0);return Math.round((new Date(d+'T00:00:00')-t)/864e5);};
const activePromos=()=>PROMOS.filter(p=>daysLeft(p[3])>=0);
const leftLabel=d=>{const n=daysLeft(d);return n===0?'Ma jár le':n===1?'Holnap jár le':`Még ${n} napig`;};
const MONTHS=['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'];
const huDate=iso=>{const [y,m,d]=iso.split('-').map(Number);return `${y}. ${MONTHS[m-1]} ${d}`;};
const asofText=()=>KB.asof?`Árak és készlet: ${huDate(KB.asof)}${+KB.asof.slice(8)===1?'-jei':'-i'} állapot`:'';
function storesHTML(){
  const now=new Date(),h=now.getHours()+now.getMinutes()/60,sun=now.getDay()===0;
  return `<div class="stores">${STORES.map(s=>{const hrs=sun?s[5]:s[4],open=h>=hrs[0]&&h<hrs[1];return `
  <article class="store"><div class="simg"><img src="https://kangaboo.hu/image/data/uzletek/${s[6]}" alt="${esc(s[0])} áruház" loading="lazy" onerror="imgFail(this)">
  <span class="open ${open?'':'closed'}"><i></i>${open?`Nyitva ${hrs[1]}:00-ig`:'Most zárva'}</span><span class="size">${s[1]}</span></div>
  <div class="sb"><h3>${esc(s[0])}</h3>
  <div class="line">${icon('i-pin')}${esc(s[2])}</div>
  <div class="line">${icon('i-clock')}H–Szo ${s[4][0]}:00–${s[4][1]}:00 · V ${s[5][0]}:00–${s[5][1]}:00</div>
  <div class="line">${icon('i-phone')}<a href="tel:${s[3].replace(/\s/g,'')}">${s[3]}</a></div>
  <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Kangaboo '+s[2])}" target="_blank" rel="noopener" class="link-arrow" style="margin-top:6px;justify-self:start;font-size:.87rem">Útvonaltervezés</a></div></article>`}).join('')}</div>`;
}
function adviceHTML(){
  return `<div class="advice">
    <div class="ad-l">
      <span class="panel-badge" style="background:var(--brand-lime);color:var(--ink)" aria-hidden="true">${icon('i-chat')}</span>
      <span class="eyebrow" style="color:var(--sage-d)">Ingyenes szakmai tanácsadás</span>
      <h2>Nem tudod, mi kell a baba érkezése előtt?</h2>
      <p style="color:var(--ink-2)">Szakértő kollégánk visszahív, és egyeztetünk egy időpontot, amikor személyesen végigvesszük a teendőket.</p>
      <ul>
        <li><span class="ck">${icon('i-check')}</span>Milyen szempontok alapján válassz babakocsit, autósülést?</li>
        <li><span class="ck">${icon('i-check')}</span>Mire lesz szükséged a születés utáni első hetekben?</li>
      </ul>
    </div>
    <form class="form-card" onsubmit="event.preventDefault();toast('Bemutató: a visszahíváskérés nem került elküldésre, az adatok nem kerültek továbbításra.');this.reset()">
      <h3>Kérj visszahívást</h3>
      <div class="row2">
        <div class="field"><label for="an">Név</label><input id="an" required placeholder="Kovács Anna"></div>
        <div class="field"><label for="ap">Telefonszám</label><input id="ap" type="tel" required placeholder="+36 30 123 4567"></div>
      </div>
      <div class="field"><label for="as">Melyik áruházban?</label><select id="as">${STORES.map(s=>`<option>${esc(s[0])}</option>`).join('')}</select></div>
      <div class="field"><label for="am">Miben segíthetünk? (opcionális)</label><textarea id="am" rows="3" placeholder="Pl. a 32. hétben vagyok, babakocsit és autósülést keresek…"></textarea></div>
      <label class="consent"><input type="checkbox" required><span>Elolvastam és elfogadom az <a href="https://kangaboo.hu/adatvedelmi-szabalyzat" target="_blank" rel="noopener">adatvédelmi tájékoztatót</a>.</span></label>
      <button class="btn btn-primary">Visszahívást kérek</button>
    </form>
  </div>`;
}
const railNav = id => `<div class="rail-nav"><button aria-label="Előző" onclick="document.getElementById('${id}').scrollBy({left:-document.getElementById('${id}').clientWidth,behavior:'smooth'})">${icon('i-arrow','sm flip')}</button><button aria-label="Következő" onclick="document.getElementById('${id}').scrollBy({left:document.getElementById('${id}').clientWidth,behavior:'smooth'})">${icon('i-arrow','sm')}</button></div>`;

/* ---------- pages ---------- */
function pageHome(){
  const popular=KB.popular, news=KB.news, deals=KB.deals, topBrands=KB.topBrands;
  const promoImg=f=>'https://kangaboo.hu/image/cache/data/IAKCIO/'+f;
  const active=activePromos();
  const heroPref=['CYBEX','HAPPY HORSE','NATTOU'];
  const heroTiles=[...[...active].sort((x,y)=>{const i=heroPref.indexOf(x[0]),j=heroPref.indexOf(y[0]);return (i<0?9:i)-(j<0?9:j);}).map(p=>({href:'#/marka/'+encodeURIComponent(p[0]),src:promoImg(p[4]),alt:p[0]+' akció'})),
    ...deals.map(p=>({href:'#/termek/'+p.i,src:img(p),alt:p.n,contain:true}))].slice(0,3);
  app.innerHTML=`
  <section class="hero"><div class="wrap hero-grid">
    <div class="fade-in">
      <span class="eyebrow">Babaáruházak és webshop</span>
      <h1>Minden, ami az <em>első évekhez</em> kell – egy helyen.</h1>
      <p class="lead">Babaruha, kismama termékek, babakocsik, autósülések és játékok ${KB.brandCount} márkától. Webshopban és 6 áruházunkban, szakértő tanácsadással.</p>
      <div class="ctas"><a href="#/kategoriak" class="btn btn-primary">Vásárlás indítása ${icon('i-arrow','sm')}</a><a href="#/akciok" class="btn btn-ghost">Aktuális akciók</a></div>
      <div class="stats"><div><strong>${KB.total.toLocaleString('hu-HU')}</strong><span>termék a kínálatban</span></div><div><strong>6</strong><span>áruház országszerte</span></div><div><strong>0% THM</strong><span>MilPay részletfizetés</span></div></div>
    </div>
    <div class="collage fade-in">
      ${heroTiles.map((x,i)=>`<a href="${x.href}" class="tile ${i?'':'t1'}" style="background:${['var(--blush)','var(--sky)','var(--sage-l)'][i]}"><img src="${esc(x.src)}" alt="${esc(x.alt)}" ${x.contain?'style="object-fit:contain;background:#fff;padding:12px"':''} onerror="imgFail(this)"></a>`).join('')}
      
      <div class="float-card"><a class="ribbon-in" href="#/akciok">${KB.saleCount} akciós termék →</a><div class="fi">${icon('i-store')}</div><div><b>Rendeld online, vedd át ingyen</b><span>1–3 munkanapon belül, bármelyik áruházunkban</span></div></div>
    </div>
  </div></section>
  <section class="usp" aria-label="Előnyeink"><div class="wrap">
    <a href="#/szallitas" class="usp-item"><div class="ui" style="background:var(--blush);color:var(--coral-d)">${icon('i-truck')}</div><div><b>Ingyenes szállítás</b><span>30 000 Ft feletti rendelésnél</span></div></a>
    <a href="#/uzleteink" class="usp-item"><div class="ui" style="background:var(--sage-l);color:var(--sage-d)">${icon('i-store')}</div><div><b>Személyes átvétel</b><span>Díjmentesen, 6 áruházban</span></div></a>
    <a href="#/szallitas" class="usp-item"><div class="ui" style="background:var(--sky);color:var(--sky-d)">${icon('i-card')}</div><div><b>0% THM részletfizetés</b><span>MilPay – 4 havi részlet</span></div></a>
    <a href="#/tanacsadas" class="usp-item"><div class="ui" style="background:var(--butter);color:var(--butter-d)">${icon('i-chat')}</div><div><b>Szakértő tanácsadás</b><span>Ingyenes, személyre szabott</span></div></a>
  </div></section>
  <section><div class="wrap">
    <div class="sec-head"><div><span class="eyebrow">Kategóriák</span><h2>Válogass igény szerint</h2></div><a href="#/kategoriak" class="link-arrow">Összes kategória ${icon('i-arrow','sm')}</a></div>
    <div class="cats">${KB.tops.map(t=>`<a href="#/kategoria/${t.id}" class="cat" style="--cc:${t.meta.bg}"><div class="ci" style="background:${t.meta.bg};color:${t.meta.fg}">${icon(t.meta.i)}</div><div><h3>${esc(t.name)}</h3><p>${topCount(t.id)} termék · ${t.subs.length} alkategória</p></div><span class="go">Megnézem ${icon('i-arrow','xs')}</span></a>`).join('')}</div>
  </div></section>
  <section class="promos-sec"><div class="wrap">
    <div class="sec-head"><div><span class="eyebrow">Aktuális akciók</span><h2>Most éri meg igazán</h2><p>Válogatott márkák kedvezményes áron – a készlet erejéig.</p></div><a href="#/akciok" class="btn btn-primary">Összes akciós termék ${icon('i-arrow','sm')}</a></div>
    ${active.length?`<div class="promos">${active.map(p=>{return `<a href="#/marka/${encodeURIComponent(p[0])}" class="promo"><div class="pimg"><img src="${promoImg(p[4])}" alt="${esc(p[0])} akció" loading="lazy" onerror="imgFail(this)"><span class="brand">${esc(p[0])}</span></div><div class="pbody"><h3>${esc(p[1])}</h3><p>${esc(p[2])}</p><div class="valid"><span>Érvényes: <b>${p[3].replaceAll('-','.')}.</b>-ig</span><span class="countdown">${leftLabel(p[3])}</span></div></div></a>`}).join('')}</div>`:`<div class="products">${deals.slice(0,8).map(card).join('')}</div>`}
  </div></section>
  <section><div class="wrap">
    <div class="sec-head"><div><span class="eyebrow">Népszerű most</span><h2>Legnépszerűbb termékek</h2></div>${railNav('railPop')}</div>
    <div class="rail" id="railPop">${popular.map(card).join('')}</div>
  </div></section>
  ${deals.length?`<section class="band-pink"><div class="wrap">
    <div class="sec-head"><div><span class="eyebrow">Kiemelt akciók</span><h2>Akciós ajánlatok</h2></div><div style="display:flex;gap:16px;align-items:center"><a href="#/akciok" class="link-arrow">Mind</a>${railNav('railDeal')}</div></div>
    <div class="rail" id="railDeal">${deals.map(card).join('')}</div>
  </div></section>`:''}
  ${news.length?`<section class="band-blue"><div class="wrap">
    <div class="sec-head"><div><span class="eyebrow">Frissen érkezett</span><h2>Újdonságok</h2></div><div style="display:flex;gap:16px;align-items:center"><a href="#/ujdonsagok" class="link-arrow">Mind</a>${railNav('railNew')}</div></div>
    <div class="rail" id="railNew">${news.map(card).join('')}</div>
  </div></section>`:''}
  <section><div class="wrap">${adviceHTML()}</div></section>
  <section style="background:var(--surface);border-top:1px solid var(--line)"><div class="wrap">
    <div class="sec-head"><div><span class="eyebrow">Üzleteink</span><h2>Gyere el, próbáld ki személyesen</h2><p>Hat tágas áruházban várunk – összesen 6 850 m² eladótéren.</p></div><a href="#/uzleteink" class="link-arrow">Részletek</a></div>
    ${storesHTML()}
  </div></section>
  <section>${loyaltyNews()}</section>
  <section style="padding-top:0"><div class="wrap">
    <div class="sec-head"><div><span class="eyebrow">Kangaboo Blog</span><h2>Tanácsok szülőknek</h2></div><a href="https://kangaboo.hu/blog" target="_blank" rel="noopener" class="link-arrow">Minden cikk ${icon('i-ext','xs')}</a></div>
    <div class="posts">
      <a href="https://kangaboo.hu/blog" target="_blank" rel="noopener" class="post"><div class="bimg" style="background:var(--blush);color:var(--coral-d)">${icon('c-toy')}</div><span class="meta">Babaápolás · 3 téma</span><h3>Fogzás: mire számíts, és hogyan segíthetsz?</h3><p>A tünetektől a fogzáskönnyítőkig – minden, amit az első fogakról tudni érdemes.</p></a>
      <a href="https://kangaboo.hu/blog" target="_blank" rel="noopener" class="post"><div class="bimg" style="background:var(--sky);color:var(--sky-d)">${icon('c-onesie')}</div><span class="meta">Babaruha · GYIK</span><h3>Babaruha mosása – 10 gyakori kérdés</h3><p>Hány fokon, milyen szerrel, és kell-e mosni az új ruhát az első viselés előtt?</p></a>
      <a href="https://kangaboo.hu/blog" target="_blank" rel="noopener" class="post"><div class="bimg" style="background:var(--sage-l);color:var(--sage-d)">${icon('c-shield')}</div><span class="meta">Biztonság · 3 téma</span><h3>Biztonság otthon és úton</h3><p>Lakásbiztonsági eszközök, autósülés-választás és tippek a nyugodt hétköznapokhoz.</p></a>
    </div>
  </div></section>
  <div class="brands"><div class="wrap"><span class="lbl">Top márkáink</span><div class="list">${topBrands.map(b=>`<a href="#/marka/${encodeURIComponent(b.name)}">${esc(b.name)}</a>`).join('')}</div></div></div>`;
}
function loyaltyNews(){
  return `<div class="wrap duo">
    <div class="loyal">
      <span class="panel-badge" style="background:var(--brand-pink);color:#fff" aria-hidden="true">${icon('i-card')}</span>
      <span class="eyebrow">Törzsvásárlói program</span>
      <h2>Vásárolj és gyűjts pontokat</h2>
      <div class="pts"><strong>2 pont</strong><span style="color:var(--on-dark)">minden elköltött 100 Ft után</span></div>
      <p>Igényelj törzsvásárlói kártyát, és gyűjts pontokat minden vásárlásod után.</p>
      <a href="https://kangaboo.hu/torzsvasarlok" target="_blank" rel="noopener" class="btn btn-coral" style="margin-top:1.8rem">Kártyát igénylek</a>
      <div class="card-visual" aria-hidden="true"><span class="logo-chip sm"><img src="https://kangaboo.hu/image/cache/data/xkangaboo_logo-264x81.png.pagespeed.ic.E0vdkCZP6I.png" alt="" width="104" height="32"></span><span>TÖRZSVÁSÁRLÓ</span></div>
    </div>
    <div class="news">
      <span class="panel-badge" style="background:var(--brand-sun);color:var(--ink)" aria-hidden="true">${icon('i-mail')}</span>
      <span class="eyebrow" style="color:var(--butter-d)">Hírlevél</span>
      <h2>Heti akciók elsőként a postaládádba</h2>
      <p>Iratkozz fel, és értesülj elsőként az újdonságokról, kedvezményekről és szakértői tippjeinkről.</p>
      <form onsubmit="event.preventDefault();toast('Bemutató: a feliratkozás nem történt meg, az e-mail cím nem került elküldésre.');this.reset()">
        <input type="email" required placeholder="E-mail címed" aria-label="E-mail cím">
        <button class="btn btn-primary">Feliratkozom</button>
      </form>
      <p style="font-size:.78rem;color:var(--ink-2)">A feliratkozással elfogadod az <a href="https://kangaboo.hu/adatvedelmi-szabalyzat" target="_blank" rel="noopener" style="text-decoration:underline">adatvédelmi tájékoztatót</a>.</p>
    </div>
  </div>`;
}

/* ---------- listing (category / brand / search / sale / new) ---------- */
const SORTS={latest:'Legújabb elöl',pop:'Népszerűség',new:'Újdonságok elöl',asc:'Ár szerint növekvő',desc:'Ár szerint csökkenő',disc:'Legnagyobb kedvezmény',name:'Név (A–Z)'};
const PAGE=24;
let L=null; // current listing state
function listing(opt){
  // opt: {key, head, base[], chips:[{id,label,n,href,on}], defaultSort}
  if(!L||L.key!==opt.key){ L={key:opt.key,brands:new Set(),sizes:new Set(),min:'',max:'',sale:false,nw:false,sort:opt.defaultSort||'pop',shown:PAGE,bq:''}; }
  app.innerHTML=`${opt.head}${opt.pre||''}
  <div class="wrap">
    ${opt.chips&&opt.chips.length?`<div class="chips">${opt.chips.map(c=>`<a class="chip ${c.on?'on':''}" href="${c.href}">${esc(c.label)} <span>${c.n}</span></a>`).join('')}</div>`:''}
    <div class="listing">
      <aside class="filters" id="filters" aria-label="Szűrők"></aside>
      <div>
        <div class="toolbar">
          <button class="btn btn-soft filter-btn" onclick="openFilters(this)" aria-haspopup="dialog">${icon('i-filter','sm')}Szűrők</button>
          <div class="res" id="res"></div>
          <select id="sort" aria-label="Rendezés">${Object.entries(SORTS).filter(([k])=>(opt.sorts||Object.keys(SORTS).filter(x=>x!=='latest')).includes(k)).map(([k,v])=>`<option value="${k}" ${L.sort===k?'selected':''}>${v}</option>`).join('')}</select>
        </div>
        <div class="active-f" id="activeF"></div>
        <div class="products" id="grid"></div>
        <div class="loadmore" id="more"></div>
      </div>
    </div>
  </div>`;
  const base=opt.base;
  $('#sort').onchange=e=>{L.sort=e.target.value;L.shown=PAGE;draw();};
  function apply(skip){
    const mn=+L.min||0, mx=+L.max||Infinity;
    return base.filter(p=>
      (skip==='brand'||!L.brands.size||L.brands.has(p.b)) &&
      (skip==='size'||!L.sizes.size||(p.s||[]).some(s=>L.sizes.has(s))) &&
      (!L.sale||p.d>0) && (!L.nw||p.w) &&
      (p.p==null||(p.p>=mn&&p.p<=mx)));
  }
  function sorted(arr){
    const a=[...arr];
    switch(L.sort){
      case 'asc': a.sort((x,y)=>(x.p||0)-(y.p||0)); break;
      case 'desc': a.sort((x,y)=>(y.p||0)-(x.p||0)); break;
      case 'disc': a.sort((x,y)=>y.d-x.d||x.k-y.k); break;
      case 'name': a.sort((x,y)=>x.n.localeCompare(y.n,'hu')); break;
      case 'latest': a.sort((x,y)=>(+y.i)-(+x.i)); break;   // közelítés: a webshop sorban növekvő termékazonosítót ad
      case 'new': a.sort((x,y)=>(y.w|0)-(x.w|0)||x.k-y.k); break;
      default: a.sort((x,y)=>x.k-y.k);
    }
    return a;
  }
  function focusKey(root){
    const ae=document.activeElement; if(!ae||!root||!root.contains(ae)) return null;
    if(ae.id) return '#'+CSS.escape(ae.id);
    if(ae.dataset.brand!=null) return `[data-brand="${CSS.escape(ae.dataset.brand)}"]`;
    if(ae.dataset.size!=null) return `[data-size="${CSS.escape(ae.dataset.size)}"]`;
    return null;
  }
  function drawFilters(){
    const fk=focusKey($('#filters'));
    const forBrands=apply('brand'), forSizes=apply('size');
    const bc={}; forBrands.forEach(p=>{if(p.b) bc[p.b]=(bc[p.b]||0)+1});
    const allBrands=new Set(base.map(p=>p.b).filter(Boolean));
    const brands=[...allBrands].map(b=>[b,bc[b]||0]).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'hu'));
    const sc={}; forSizes.forEach(p=>(p.s||[]).forEach(s=>sc[s]=(sc[s]||0)+1));
    const allSizes=[...new Set(base.flatMap(p=>p.s||[]))];
    const sizeOrder=s=>{const m=String(s).match(/\d+/);return m?+m[0]:999};
    allSizes.sort((a,b)=>sizeOrder(a)-sizeOrder(b)||String(a).localeCompare(String(b)));
    const prices=base.map(p=>p.p).filter(Boolean);
    const pmin=prices.length?Math.min(...prices):0, pmax=prices.length?Math.max(...prices):0;
    const bq=norm(L.bq);
    $('#filters').innerHTML=`
      <div class="fsheet-head"><h3>Szűrők</h3><button class="icon-btn" onclick="closeFilters()" aria-label="Szűrők bezárása">${icon('i-close')}</button></div>
      <div class="fgroup"><h4>Gyors szűrők</h4>
        ${opt.hideSale?'':`<label class="toggle">Csak akciós termékek<input type="checkbox" id="fSale" ${L.sale?'checked':''}></label>`}
        ${opt.hideNew?'':`<label class="toggle">Csak újdonságok<input type="checkbox" id="fNew" ${L.nw?'checked':''}></label>`}
      </div>
      <div class="fgroup"><h4>Ár (Ft)</h4>
        <div class="prange"><input type="number" id="fMin" placeholder="${pmin}" value="${esc(L.min)}" min="0" inputmode="numeric" aria-label="Minimum ár"><span>–</span><input type="number" id="fMax" placeholder="${pmax}" value="${esc(L.max)}" min="0" inputmode="numeric" aria-label="Maximum ár"></div>
      </div>
      ${brands.length>1?`<div class="fgroup"><h4>Márka ${L.brands.size?`<button id="clrB">Törlés</button>`:''}</h4>
        ${brands.length>8?`<input class="fsearch" id="fbq" placeholder="Márka keresése…" value="${esc(L.bq)}">`:''}
        <div class="fbrands">${brands.filter(([b])=>!bq||norm(b).includes(bq)).map(([b,n])=>`<label class="fcheck"><input type="checkbox" data-brand="${esc(b)}" ${L.brands.has(b)?'checked':''}>${esc(b)}<span>${n}</span></label>`).join('')}</div>
      </div>`:''}
      ${allSizes.length>1?`<div class="fgroup"><h4>Méret ${L.sizes.size?`<button id="clrS">Törlés</button>`:''}</h4>
        <div class="sizes-pick">${allSizes.slice(0,60).map(s=>`<button type="button" data-size="${esc(s)}" class="${L.sizes.has(s)?'on':''}" ${sc[s]?'':'disabled style="opacity:.35"'}>${esc(s)}</button>`).join('')}</div>
      </div>`:''}
      <div class="fsheet-foot"><button class="btn btn-primary btn-block" onclick="closeFilters()">Találatok mutatása</button></div>`;
    const f=$('#filters');
    const fs=$('#fSale',f); if(fs) fs.onchange=e=>{L.sale=e.target.checked;L.shown=PAGE;draw();};
    const fn=$('#fNew',f); if(fn) fn.onchange=e=>{L.nw=e.target.checked;L.shown=PAGE;draw();};
    let pd; const pr=()=>{clearTimeout(pd);pd=setTimeout(()=>{L.min=$('#fMin').value;L.max=$('#fMax').value;L.shown=PAGE;draw(true);},400)};
    $('#fMin',f).oninput=pr; $('#fMax',f).oninput=pr;
    $$('[data-brand]',f).forEach(c=>c.onchange=()=>{const b=c.dataset.brand; c.checked?L.brands.add(b):L.brands.delete(b); L.shown=PAGE; draw();});
    $$('[data-size]',f).forEach(c=>c.onclick=()=>{const s=c.dataset.size; L.sizes.has(s)?L.sizes.delete(s):L.sizes.add(s); L.shown=PAGE; draw();});
    const cb=$('#clrB',f); if(cb) cb.onclick=()=>{L.brands.clear();draw();};
    const cs=$('#clrS',f); if(cs) cs.onclick=()=>{L.sizes.clear();draw();};
    if(fk){ const n=$(fk,f); if(n) n.focus(); }
    const fbq=$('#fbq',f); if(fbq) fbq.oninput=()=>{L.bq=fbq.value; drawFilters(); const n=$('#fbq'); n.focus(); n.setSelectionRange(n.value.length,n.value.length);};
  }
  let gver=0;
  const SKCARD='<div class="sk-card" aria-hidden="true"><div class="sk sk-img"></div><div class="sk sk-line"></div><div class="sk sk-line short"></div></div>';
  function renderGrid(shown,focusIdx){
    const my=++gver, grid=$('#grid'); if(!grid) return;
    const ids=shown.map(x=>x.i);
    const paint=()=>{
      if(my!==gver||!document.body.contains(grid)) return;
      grid.removeAttribute('aria-busy');
      grid.innerHTML=shown.length?shown.map(x=>BYID[x.i]).filter(Boolean).map(card).join(''):`<div class="empty" style="grid-column:1/-1">${icon('i-search')}<h3>Nincs a szűrésnek megfelelő termék</h3><p>Próbálj kevesebb szűrőt használni.</p><button class="btn btn-primary" onclick="document.querySelector('#activeF [data-clear]')?.click()||location.reload()">Szűrők törlése</button></div>`;
      if(focusIdx!=null){ const a=$$('#grid .prod h3 a')[focusIdx]; if(a) a.focus(); else { const m=$('#moreBtn')||$('#sort'); if(m) m.focus(); } }
    };
    if(cardsReady(ids)) return paint();
    grid.setAttribute('aria-busy','true');
    grid.innerHTML=shown.map(x=>BYID[x.i]?card(BYID[x.i]):SKCARD).join('');
    ensureCards(ids).then(paint,()=>{ if(my===gver&&document.body.contains(grid)) loadError(); });
  }
  function draw(keepFilters,focusIdx){
    if(L.sort==='name'&&base.some(x=>x.n==null)){
      // a névsorrendhez a nevek a keresőindexben vannak
      const g=$('#grid'); if(g){ g.setAttribute('aria-busy','true'); g.innerHTML=SKCARD.repeat(Math.min(PAGE,base.length)||1); }
      const key=L.key; ensureSearch().then(()=>{ base.forEach(x=>{ if(x.n==null) x.n=NAMES[x.i]; }); if(L.key===key) draw(keepFilters,focusIdx); },()=>loadError());
      return;
    }
    const res=sorted(apply());
    const shown=res.slice(0,L.shown);
    $('#res').innerHTML=`<b>${res.length}</b> termék${res.length!==base.length?` <span class="muted">(összesen ${base.length})</span>`:''}`;
    const act=[];
    if(L.sale) act.push(['Akciós',()=>L.sale=false]);
    if(L.nw) act.push(['Újdonság',()=>L.nw=false]);
    if(L.min||L.max) act.push([`${L.min||0} – ${L.max||'∞'} Ft`,()=>{L.min='';L.max='';}]);
    L.brands.forEach(b=>act.push([b,()=>L.brands.delete(b)]));
    L.sizes.forEach(s=>act.push(['Méret: '+s,()=>L.sizes.delete(s)]));
    $('#activeF').innerHTML=act.map((a,i)=>`<button class="chip on" data-i="${i}">${esc(a[0])} ${icon('i-close','xs')}</button>`).join('')+(act.length>1?`<button class="chip" data-clear>Összes törlése</button>`:'');
    const refocus=()=>{ const c=$('#activeF button'); (c||$('#sort')).focus(); };
    $$('#activeF [data-i]').forEach(b=>b.onclick=()=>{act[+b.dataset.i][1]();L.shown=PAGE;draw();refocus();});
    const cl=$('#activeF [data-clear]'); if(cl) cl.onclick=()=>{L.sale=L.nw=false;L.min=L.max='';L.brands.clear();L.sizes.clear();L.shown=PAGE;draw();refocus();};
    renderGrid(shown,focusIdx);
    $('#more').innerHTML=res.length>L.shown?`<span class="muted" style="font-size:.85rem">${shown.length} / ${res.length} termék megjelenítve</span><div class="progress"><i style="width:${shown.length/res.length*100}%"></i></div><button class="btn btn-ghost" id="moreBtn">Továbbiak betöltése</button>`:(res.length>PAGE?`<span class="muted" style="font-size:.85rem">Mind a ${res.length} termék megjelenítve</span>`:'');
    const mb=$('#moreBtn'); if(mb) mb.onclick=()=>{ const n=L.shown; L.shown+=PAGE; draw(true,n); };
    if(!keepFilters) drawFilters();
  }
  draw();
}
function catHero(t,title,sub,n){
  return `<div class="wrap">${crumbs(sub?[[t.name,'#/kategoria/'+t.id],[title]]:[[t.name]])}
    <div class="cat-hero" style="background:${t.meta.tint};border-top:8px solid ${t.meta.bg}">
      <div style="color:var(--ink)"><span class="eyebrow" style="color:${t.meta.deep}">${sub?esc(t.name):'Kategória'}</span><h1>${esc(title)}</h1><p>${esc(sub?`Válogass ${n} termék közül a(z) ${title.toLowerCase()} kategóriában.`:t.meta.d)}</p><span class="count">${n} termék</span></div>
      <span class="hero-tile" style="background:${t.meta.bg};color:${t.meta.fg}" aria-hidden="true">${icon(t.meta.i)}</span>
    </div></div>`;
}
function pageCategory(tid,sid){
  const t=TOP[tid]; if(!t) return page404();
  const s=sid?SUB[sid]:null; if(sid&&!s) return page404();
  const fkey=sid?'sub-'+sid:'top-'+tid;
  if(!FACETS[fkey]) return need(()=>ensureFacet(fkey),()=>pageCategory(tid,sid),'list');
  const base=FACETS[fkey];
  document.title=(s?s.name:t.name)+' – Kangaboo';
  const chips=[{label:'Összes',n:topCount(tid),href:'#/kategoria/'+tid,on:!sid},...t.subs.filter(x=>subCount[x.id]).map(x=>({label:x.name,n:subCount[x.id]||0,href:`#/kategoria/${tid}/${x.id}`,on:x.id===sid}))];
  listing({key:'cat'+tid+'/'+(sid||''),head:catHero(t,s?s.name:t.name,!!s,base.length),base,chips});
}
function simpleHead(title,lead,cr,eyebrow){
  return `<div class="wrap">${crumbs(cr)}<div class="page-head">${eyebrow?`<span class="eyebrow">${eyebrow}</span>`:''}<h1>${esc(title)}</h1>${lead?`<p>${lead}</p>`:''}</div></div>`;
}
function topChips(base,href){
  const c={}; base.forEach(p=>p.t.forEach(t=>c[t]=(c[t]||0)+1));
  return KB.tops.filter(t=>c[t.id]).map(t=>({label:t.name,n:c[t.id],href:href(t.id),on:false}));
}
function campaignsHTML(){
  const act=activePromos(); if(!act.length) return '';
  return `<div class="wrap"><h2 class="camp-title">Érvényes kampányok</h2><div class="camps">${act.map(p=>`<a href="#/marka/${encodeURIComponent(p[0])}" class="camp"><img src="https://kangaboo.hu/image/cache/data/IAKCIO/${p[4]}" alt="${esc(p[0])} akció" loading="lazy" onerror="imgFail(this)"><div><b>${esc(p[1])}</b><span>${esc(p[0])} · ${leftLabel(p[3])}</span></div></a>`).join('')}</div></div>`;
}
function pageSale(q){
  if(!FACETS.sale) return need(()=>ensureFacet('sale'),()=>pageSale(q),'list');
  const tf=q.get('k'); let base=FACETS.sale;
  const all=base; if(tf) base=base.filter(p=>p.t.includes(tf));
  document.title='Akciók – Kangaboo';
  const chips=[{label:'Összes',n:all.length,href:'#/akciok',on:!tf},...topChips(all,id=>'#/akciok?k='+id).map(c=>({...c,on:c.href.endsWith('='+tf)}))];
  listing({key:'sale'+tf,head:simpleHead('Akciós termékek',`${all.length} termék kedvezményes áron, akár ${Math.max(0,...all.map(p=>p.d))}% kedvezménnyel. Az akciók a készlet erejéig érvényesek.`,[['Akciók']],'Akciók'),base,chips,hideSale:true,pre:campaignsHTML()});
}
function pageNew(q){
  if(!FACETS.new) return need(()=>ensureFacet('new'),()=>pageNew(q),'list');
  const tf=q.get('k'); let base=FACETS.new;
  const all=base; if(tf) base=base.filter(p=>p.t.includes(tf));
  document.title='Újdonságok – Kangaboo';
  const chips=[{label:'Összes',n:all.length,href:'#/ujdonsagok',on:!tf},...topChips(all,id=>'#/ujdonsagok?k='+id).map(c=>({...c,on:c.href.endsWith('='+tf)}))];
  listing({key:'new'+tf,head:simpleHead('Újdonságok',`${all.length} frissen érkezett termék a teljes kínálatból.`,[['Újdonságok']],'Frissen érkezett'),base,chips,hideNew:true,defaultSort:'latest',sorts:['latest','pop','asc','desc','disc','name']});
}
function pageBrand(name,q){
  if(!BRANDS) return need(ensureBrands,()=>pageBrand(name,q),'list');
  const k=name.toUpperCase(); const be=BRANDS.list.find(x=>x[0].toUpperCase()===k);
  if(be&&!FACETS['brand-'+be[2]]) return need(()=>ensureFacet('brand/'+be[2]),()=>pageBrand(name,q),'list');
  const all=be?FACETS['brand-'+be[2]]:[];
  if(!all.length) return page404('Ez a márka jelenleg nem elérhető.');
  const tf=q.get('k'); const base=tf?all.filter(p=>p.t.includes(tf)):all;
  const disp=be?be[0]:name;
  document.title=disp+' – Kangaboo';
  const chips=[{label:'Összes',n:all.length,href:'#/marka/'+encodeURIComponent(name),on:!tf},...topChips(all,id=>`#/marka/${encodeURIComponent(name)}?k=${id}`).map(c=>({...c,on:c.href.endsWith('='+tf)}))];
  const promo=activePromos().find(p=>p[0]===k);
  listing({key:'brand'+k+tf,head:simpleHead(disp,promo?`<b>${esc(promo[1])}</b> – ${esc(promo[2])} Érvényes: ${promo[3].replaceAll('-','.')}.-ig.`:`${all.length} ${esc(disp)} termék a Kangaboo kínálatában.`,[['Márkák','#/markak'],[disp]],'Márka'),base,chips});
}
function pageSearch(q){
  const v=(q.get('q')||'').trim();
  document.title=(v?`„${v}” – `:'')+'Keresés – Kangaboo';
  if(!v){
    app.innerHTML=simpleHead('Keresés','',[['Keresés']])+`<div class="wrap" style="padding-bottom:90px"><form class="search" style="max-width:none" onsubmit="event.preventDefault();go('#/kereses?q='+encodeURIComponent(this.q.value))"><input type="search" name="q" placeholder="Mit keresel?" autofocus aria-label="Keresés"><button aria-label="Keresés">${icon('i-search')}</button></form>
    <div class="chips" style="margin-top:20px">${['babakocsi','autósülés','rugdalózó','etetőszék','mellszívó','kiságy','body','cipő'].map(w=>`<a class="chip" href="#/kereses?q=${encodeURIComponent(w)}">${w}</a>`).join('')}</div></div>`;
    return;
  }
  if(!SEARCH) return need(ensureSearch,()=>pageSearch(q),'list');
  const base=searchP(v);
  const head=simpleHead(`„${v}”`,`${base.length} találat`,[['Keresés','#/kereses'],[v]],'Keresési eredmények')+
    `<div class="wrap"><form class="search" style="max-width:640px;margin-bottom:6px" onsubmit="event.preventDefault();go('#/kereses?q='+encodeURIComponent(this.q.value))"><input type="search" name="q" value="${esc(v)}" aria-label="Keresés"><button aria-label="Keresés">${icon('i-search')}</button></form></div>`;
  if(!base.length){ app.innerHTML=head+`<div class="wrap" style="padding:20px 0 90px"><div class="empty">${icon('i-search')}<h3>Nincs találat</h3><p>Próbálj általánosabb kifejezést, vagy böngéssz a kategóriák között.</p><a class="btn btn-primary" href="#/kategoriak">Kategóriák</a></div></div>`; return; }
  listing({key:'s'+v,head,base,chips:topChips(base,id=>`#/kereses?q=${encodeURIComponent(v)}`).map(c=>({...c,href:'#/kategoria/'+KB.tops.find(t=>t.name===c.label).id}))});
}
function pageAllCats(){
  document.title='Kategóriák – Kangaboo';
  app.innerHTML=simpleHead('Termékkategóriák',`${KB.total.toLocaleString('hu-HU')} termék ${KB.tops.length} főkategóriában.`,[['Kategóriák']],'Termékeink')+
  `<div class="wrap" style="padding-bottom:90px;display:grid;gap:22px">${KB.tops.map(t=>`<div class="info-card" style="grid-template-columns:auto 1fr;gap:22px;align-items:start">
    <a href="#/kategoria/${t.id}" class="ui" style="width:72px;height:72px;border-radius:20px;background:${t.meta.bg};color:${t.meta.fg}">${icon(t.meta.i)}</a>
    <div><h3><a href="#/kategoria/${t.id}">${esc(t.name)}</a> <span class="muted" style="font-family:var(--sans);font-size:.85rem;font-weight:500">${topCount(t.id)} termék</span></h3><p style="margin:4px 0 12px">${esc(t.meta.d)}</p>
    <div class="chips" style="margin:0">${t.subs.map(s=>`<a class="chip" href="#/kategoria/${t.id}/${s.id}">${esc(s.name)} <span>${subCount[s.id]||0}</span></a>`).join('')}</div></div></div>`).join('')}</div>`;
}
function pageBrands(){
  document.title='Márkák – Kangaboo';
  if(!BRANDS) return need(ensureBrands,pageBrands,'list');
  const all=BRANDS.list.map(x=>({name:x[0],n:x[1]}));
  const list=[...all].sort((a,b)=>a.name.localeCompare(b.name,'hu'));
  const groups={}; list.forEach(b=>{let L0=norm(b.name[0]).toUpperCase(); if(!/[A-Z]/.test(L0)) L0='#'; (groups[L0]=groups[L0]||[]).push(b);});
  const top=[...all].sort((a,b)=>b.n-a.n).slice(0,12);
  app.innerHTML=simpleHead('Márkáink',`${list.length} márka a Kangaboo kínálatában – a legnépszerűbbektől a különlegességekig.`,[['Márkák']],'Márkák')+
  `<div class="wrap" style="padding-bottom:90px">
    <div class="topbrands">${top.map(b=>`<a href="#/marka/${encodeURIComponent(b.name)}"><b>${esc(b.name)}</b><span>${b.n} termék</span></a>`).join('')}</div>
    <nav class="az">${Object.keys(groups).sort().map(k=>`<a href="javascript:void 0" onclick="document.getElementById('bg-${k}').scrollIntoView({behavior:'smooth'})">${k}</a>`).join('')}</nav>
    ${Object.keys(groups).sort().map(k=>`<div class="bgroup" id="bg-${k}"><b>${k}</b><div class="blist">${groups[k].map(b=>`<a href="#/marka/${encodeURIComponent(b.name)}">${esc(b.name)}<span>${b.n}</span></a>`).join('')}</div></div>`).join('')}
  </div>`;
}

/* ---------- product page ---------- */
function pageProduct(id){
  if(!cardsReady([id])) return need(()=>ensureCards([id]),()=>pageProduct(id),'product');
  const p=BYID[id]; if(!p) return page404('A keresett termék nem található.');
  const subKeys=(p.c||[]).filter(c=>SUB[c]).map(c=>'sub-'+c);
  if(!BRANDS||!subKeys.every(k=>FACETS[k])) return need(()=>Promise.all([ensureBrands(),...subKeys.map(ensureFacet)]),()=>pageProduct(id),'product');
  const pool=[...new Map(subKeys.flatMap(k=>FACETS[k]).map(x=>[x.i,x])).values()].sort((a,b)=>a.k-b.k);
  const relIds=pool.filter(x=>x.i!==p.i&&(x.c||[]).some(c=>(p.c||[]).includes(c))).sort((a,b)=>((b.b===p.b)-(a.b===p.b))||a.k-b.k).slice(0,12).map(x=>x.i);
  const brandIds=(BRANDS.first[p.b]||[]);
  if(!cardsReady([...relIds,...brandIds])) return need(()=>ensureCards([...relIds,...brandIds]),()=>pageProduct(id),'product');
  const c=(+id)%NCH;
  if(!(DCH[c]&&DCH[c].done)) return need(()=>loadDetails(id),()=>pageProduct(id),'product');
  const d=DET[id]||{};
  const t=TOP[p.t[0]], s=SUB[(p.c||[])[0]];
  document.title=p.n+' – Kangaboo';
  const gal=(d.g&&d.g.length)?d.g.map(g=>g.startsWith('http')?g:IMGBASE+g):[img(p)].filter(Boolean);
  const sale=p.o&&p.o>p.p;
  const related=relIds.map(x=>BYID[x]).filter(Boolean);
  const sameBrand=brandIds.map(x=>BYID[x]).filter(x=>x&&x.i!==p.i).slice(0,12);
  const ph=icon(t?.meta.i||'c-gift','ph-art');
  const hasDesc=!!(d.d&&d.d.length);
  const catLinks=[...new Set(p.c||[])].filter(c=>SUB[c]).map(c=>{const tt=TOP[SUB2TOP[c]];return `<a href="#/kategoria/${tt.id}">${esc(tt.name)}</a> › <a href="#/kategoria/${tt.id}/${c}">${esc(SUB[c].name)}</a>`;});
  app.innerHTML=`<div class="wrap">
  ${crumbs([...(t?[[t.name,'#/kategoria/'+t.id]]:[]),...(s?[[s.name,`#/kategoria/${t.id}/${s.id}`]]:[]),[p.n]])}
  <div class="pdp">
    <div class="gallery ${gal.length>1?'':'single'}">
      ${gal.length>1?`<div class="thumbs">${gal.map((g,i)=>`<button class="${i?'':'on'}" data-g="${i}" aria-label="${i+1}. kép"><img src="${esc(g)}" alt="" loading="lazy" onerror="this.parentNode.remove()"></button>`).join('')}</div>`:''}
      <div class="main" id="gmain" role="button" tabindex="0" aria-pressed="false" aria-label="Kép nagyítása" style="color:${t?.meta.deep||'var(--muted)'}">${ph}${gal[0]?`<img src="${esc(gal[0])}" alt="${esc(p.n)}" style="position:absolute;inset:0;background:#fff" onerror="imgFail(this)">`:''}
        <div class="tags">${p.w?'<span class="tag new">Újdonság</span>':''}${sale?`<span class="tag sale">−${p.d}%</span>`:''}</div></div>
    </div>
    <div class="pinfo">
      <span class="pb"><a href="#/marka/${encodeURIComponent(p.b)}">${esc(p.b)}</a></span>
      <h1>${esc(p.n)}</h1>
      ${d.sku?`<span class="sku">Cikkszám: ${esc(d.sku)}</span>`:''}
      <div class="price">${sale?`<b class="sale-p">${ft(p.p)}</b><s>${ft(p.o)}</s><span class="save">Megtakarítás: ${ft(p.o-p.p)}</span>`:`<b>${p.f?'<small>már </small>':''}${ft(p.p)}</b>`}</div>
      <div class="milpay-note">Vagy <b>4 × ${ft(Math.ceil((p.p||0)/4))}</b> MilPay részletfizetéssel, 0% THM</div>
      ${p.s&&p.s.length?`<div class="opt-title"><span>Válassz méretet</span><span class="muted" id="szSel"></span></div><div class="sizes-pick" id="sizes">${p.s.map(x=>`<button type="button" data-s="${esc(x)}">${esc(x)}</button>`).join('')}</div>`:''}
      <div class="buy">
        <div class="qty"><button type="button" id="qm" aria-label="Kevesebb">−</button><input id="qv" value="1" inputmode="numeric" aria-label="Mennyiség"><button type="button" id="qp" aria-label="Több">+</button></div>
        <button class="btn btn-primary" id="addBtn">${icon('i-bag','sm')}Kosárba</button>
        <button class="fav-big ${favs.has(p.i)?'on':''}" data-fav="${p.i}" onclick="toggleFav('${p.i}')" aria-label="Kedvencekhez">${icon('i-heart')}</button>
      </div>
      <div class="perks">
        <div>${icon('i-truck')}<div><b>${(p.p||0)>=30000?'Ingyenes házhozszállítás':'Házhozszállítás 1 590 Ft-tól'}</b><span>${(p.p||0)>=30000?'Ez a termék önmagában eléri a 30 000 Ft-os határt.':`Még ${ft(30000-(p.p||0))} és ingyenes a szállítás.`} 1–4 munkanap.</span></div></div>
        <div>${icon('i-store')}<div><b>Ingyenes átvétel áruházainkban</b><span>1–3 munkanapon belül, 6 áruházban.</span></div></div>
        <div>${icon('i-return')}<div><b>14 napos elállási jog</b><span><a href="https://kangaboo.hu/elallasi-tajekoztato" target="_blank" rel="noopener" style="text-decoration:underline">Elállási tájékoztató</a></span></div></div>
      </div>
      <section class="specs" aria-labelledby="specsTitle">
        <h2 id="specsTitle">Termékadatok</h2>
        <dl>
          <div><dt>Márka</dt><dd><a href="#/marka/${encodeURIComponent(p.b)}">${esc(p.b)}</a></dd></div>
          ${catLinks.length?`<div><dt>Kategória</dt><dd>${catLinks.join('<br>')}</dd></div>`:''}
          ${sale?`<div><dt>Akciós ár</dt><dd><b class="sale-p">${ft(p.p)}</b></dd></div>
          <div><dt>Eredeti ár</dt><dd>${ft(p.o)}</dd></div>
          <div><dt>Megtakarítás</dt><dd>${ft(p.o-p.p)} (−${p.d}%)</dd></div>`:`<div><dt>Ár</dt><dd><b>${ft(p.p)}</b>${p.f?' -tól (méret szerint eltérhet)':''}</dd></div>`}
          ${p.s&&p.s.length?`<div><dt>Méretek</dt><dd>${p.s.map(esc).join(' · ')}</dd></div>`:''}
          ${p.w?`<div><dt>Jelölés</dt><dd>Újdonság</dd></div>`:''}
          ${d.sku?`<div><dt>Cikkszám</dt><dd>${esc(d.sku)}</dd></div>`:''}
          <div><dt>Szállítás</dt><dd>${(p.p||0)>=30000?'Ingyenes (a termék ára eléri a 30 000 Ft-ot)':'Csomagpont 1 190 Ft-tól, házhozszállítás 1 590 Ft-tól; 30 000 Ft feletti rendelésnél ingyenes'}</dd></div>
          <div><dt>Áruházi átvétel</dt><dd>Ingyenes, 6 áruházban, 1–3 munkanapon belül</dd></div>
        </dl>
      </section>
      <div class="acc">
        <details open><summary>Termékleírás${icon('i-chev')}</summary><div class="acc-body">${hasDesc?`<ul>${d.d.map(x=>`<li>${esc(x.replace(/^[•\-–]\s*/,''))}</li>`).join('')}</ul>`:`<div class="desc-later"><p>A részletes leírás az éles változatban a webáruház adatbázisából töltődik be.</p><a href="${ORIGIN+esc(p.u)}" target="_blank" rel="noopener">${icon('i-ext','xs')}A termék megtekintése a <span style="white-space:nowrap">kangaboo.hu-n</span></a></div>`}</div></details>
        <details><summary>Szállítás és fizetés${icon('i-chev')}</summary><div class="acc-body"><ul><li>Átvétel áruházban: ingyenes</li><li>GLS / MPL csomagpont: 1 190 / 1 290 Ft</li><li>Házhozszállítás GLS / MPL: 1 590 / 2 990 Ft</li><li>30 000 Ft felett a szállítás ingyenes</li><li>Fizetés: bankkártya, SimplePay, MilPay, utánvét (+590 Ft)</li></ul></div></details>
        <details><summary>Elérhetőség áruházainkban${icon('i-chev')}</summary><div class="acc-body"><p style="margin-bottom:10px">Online rendelés után bármelyik áruházunkban díjmentesen átvehető:</p><div class="avail">${STORES.map(st=>`<div><span>${esc(st[0])}</span></div>`).join('')}</div></div></details>
        <details><summary>Tanácsra van szükséged?${icon('i-chev')}</summary><div class="acc-body"><p>Hívd ügyfélszolgálatunkat (<a href="tel:+36205396930">+36 20 539 6930</a>, H–P 8–15h), vagy <a href="#/tanacsadas" style="text-decoration:underline">kérj ingyenes szakmai tanácsadást</a>.</p></div></details>
      </div>
      ${hasDesc?`<a class="ext" href="${ORIGIN+esc(p.u)}" target="_blank" rel="noopener">${icon('i-ext','xs')}Megnyitás az eredeti kangaboo.hu oldalon</a>`:''}
    </div>
  </div>
  ${related.length?`<section style="padding:20px 0 60px"><div class="sec-head"><div><span class="eyebrow">Hasonló termékek</span><h2>Ezek is érdekelhetnek</h2></div>${railNav('railRel')}</div><div class="rail" id="railRel">${related.map(card).join('')}</div></section>`:''}
  ${sameBrand.length>3?`<section style="padding:0 0 80px"><div class="sec-head"><div><span class="eyebrow">${esc(p.b)}</span><h2>A márka további termékei</h2></div><a class="link-arrow" href="#/marka/${encodeURIComponent(p.b)}">Mind</a></div><div class="rail" id="railBrand">${sameBrand.map(card).join('')}</div></section>`:''}
  </div>`;
  // gallery
  const main=$('#gmain');
  $$('.thumbs button').forEach(b=>b.onclick=()=>{ $$('.thumbs button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); const im=main.querySelector('img'); if(im) im.src=gal[+b.dataset.g]; else main.insertAdjacentHTML('beforeend',`<img src="${esc(gal[+b.dataset.g])}" alt="" style="position:absolute;inset:0;background:#fff">`); });
  main.onclick=e=>{ const im=main.querySelector('img'); if(!im) return; const z=main.classList.toggle('zoom'); main.setAttribute('aria-pressed',z); };
  main.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); main.click(); } };
  main.onmousemove=e=>{ if(!main.classList.contains('zoom')) return; const r=main.getBoundingClientRect(); const im=main.querySelector('img'); im.style.transformOrigin=`${(e.clientX-r.left)/r.width*100}% ${(e.clientY-r.top)/r.height*100}%`; };
  // size + qty
  let size='';
  $$('#sizes button').forEach(b=>b.onclick=()=>{ $$('#sizes button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); size=b.dataset.s; $('#szSel').textContent='Kiválasztva: '+size; });
  const qv=$('#qv'); const setQ=n=>qv.value=Math.max(1,Math.min(99,n|0||1));
  $('#qm').onclick=()=>setQ(+qv.value-1); $('#qp').onclick=()=>setQ(+qv.value+1); qv.onchange=()=>setQ(+qv.value);
  $('#addBtn').onclick=()=>{
    if(p.s&&p.s.length&&!size){ toast('Kérjük, válassz méretet!'); $('#sizes').animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:300}); return; }
    addCart(p.i,size,+qv.value);
  };
}

/* ---------- cart, favourites ---------- */
const SHIP={pickup:['Átvétel áruházban',0],gls_pt:['GLS csomagpont',1190],mpl_pt:['MPL csomagautomata / pont',1290],gls:['GLS házhozszállítás',1590],mpl:['MPL házhozszállítás',2990]};
function pageCart(){
  document.title='Kosár – Kangaboo';
  if(!cardsReady(cart.map(x=>x.id))) return need(()=>ensureCards(cart.map(x=>x.id)).then(pruneState),pageCart,'list');
  pruneState();
  const items=cart.map(x=>({...x,p:BYID[x.id]})).filter(x=>x.p);
  if(!items.length){
    app.innerHTML=simpleHead('Kosár','',[['Kosár']])+`<div class="wrap" style="padding-bottom:90px"><div class="empty">${icon('i-bag')}<h3>A kosarad üres</h3><p>Nézz körül kategóriáink között, vagy válogass aktuális akcióinkból.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn-primary" href="#/kategoriak">Vásárlás</a><a class="btn btn-ghost" href="#/akciok">Akciók</a></div></div></div>`;
    return;
  }
  const ship=store.get('ship','gls');
  const sub=items.reduce((a,x)=>a+(x.p.p||0)*x.q,0);
  const free=sub>=30000;
  const shipCost=ship==='pickup'||free?0:SHIP[ship][1];
  app.innerHTML=simpleHead('Kosár',`${items.reduce((a,x)=>a+x.q,0)} termék a kosaradban`,[['Kosár']])+`<div class="wrap"><div class="cart">
    <div class="citems">${items.map((x,i)=>`<div class="citem">
      <a href="#/termek/${x.p.i}">${x.p.m?`<img src="${esc(img(x.p))}" alt="" onerror="imgFail(this)">`:'<span class="ph"></span>'}</a>
      <div><span class="pb">${esc(x.p.b)}</span><h3><a href="#/termek/${x.p.i}">${esc(x.p.n)}</a></h3><div class="meta">${x.sz?'Méret: '+esc(x.sz)+' · ':''}Egységár: ${ft(x.p.p)}</div></div>
      <div class="right"><b>${ft((x.p.p||0)*x.q)}</b><div class="qty"><button data-q="${i}" data-d="-1" aria-label="Kevesebb">−</button><input value="${x.q}" readonly aria-label="Mennyiség"><button data-q="${i}" data-d="1" aria-label="Több">+</button></div><button class="rm" data-rm="${i}">${icon('i-trash','xs')}Törlés</button></div>
    </div>`).join('')}</div>
    <aside class="summary">
      <h3>Összesítés</h3>
      <div class="ship-bar">${free?'<b>🎉 Ingyenes szállítás!</b>':ship==='pickup'?`Az áruházi átvétel ingyenes. Házhozszállításnál és csomagpontnál még <b>${ft(30000-sub)}</b> hiányzik az ingyenes szállításhoz.`:`Még <b>${ft(30000-sub)}</b> és ingyenes a szállítás`}<div class="bar"><i style="width:${Math.min(100,sub/300)}%"></i></div></div>
      <div class="ship-opt">${Object.entries(SHIP).map(([k,v])=>`<label><input type="radio" name="ship" value="${k}" ${k===ship?'checked':''}>${v[0]}<span>${k==='pickup'||free?'Ingyenes':ft(v[1])}</span></label>`).join('')}</div>
      <div class="srow"><span>Részösszeg</span><span>${ft(sub)}</span></div>
      <div class="srow"><span>Szállítás</span><span>${shipCost?ft(shipCost):'Ingyenes'}</span></div>
      <div class="srow total"><span>Végösszeg</span><span>${ft(sub+shipCost)}</span></div>
      <div class="muted" style="font-size:.8rem">Vagy 4 × ${ft(Math.ceil((sub+shipCost)/4))} MilPay részletfizetéssel (0% THM). Az árak az ÁFÁ-t tartalmazzák.</div>
      <a class="btn btn-coral btn-block" href="#/penztar">Tovább a pénztárhoz ${icon('i-arrow','sm')}</a>
      <a class="btn btn-soft btn-block" href="#/kategoriak">Vásárlás folytatása</a>
    </aside>
  </div></div>`;
  $$('[data-q]').forEach(b=>b.onclick=()=>{const it=cart[+b.dataset.q]; it.q=Math.max(1,Math.min(99,it.q+ +b.dataset.d)); saveCart(); pageCart(); const n=$(`[data-q="${b.dataset.q}"][data-d="${b.dataset.d}"]`); if(n) n.focus();});
  $$('[data-rm]').forEach(b=>b.onclick=()=>{const i=+b.dataset.rm; cart.splice(i,1); saveCart(); pageCart(); const n=$(`[data-rm="${Math.min(i,cart.length-1)}"]`)||$('#app h1'); if(n){ if(n.tagName==='H1') n.setAttribute('tabindex','-1'); n.focus(); } });
  $$('input[name=ship]').forEach(r=>r.onchange=()=>{store.set('ship',r.value); pageCart(); const n=$(`input[name=ship][value="${r.value}"]`); if(n) n.focus();});
}
function pageFavs(){
  document.title='Kedvencek – Kangaboo';
  if(!cardsReady([...favs])) return need(()=>ensureCards([...favs]).then(pruneState),pageFavs,'list');
  pruneState();
  const list=[...favs].map(id=>BYID[id]).filter(Boolean);
  app.innerHTML=simpleHead('Kedvenceim',list.length?`${list.length} mentett termék`:'',[['Kedvencek']])+`<div class="wrap" style="padding-bottom:90px">${list.length?`<div class="products">${list.map(card).join('')}</div>`:`<div class="empty">${icon('i-heart')}<h3>Még nincs kedvenced</h3><p>Kattints a szív ikonra bármelyik terméknél, hogy később könnyen megtaláld.</p><a class="btn btn-primary" href="#/kategoriak">Böngészés</a></div>`}</div>`;
}


/* ---------- checkout ---------- */
// Éles bekötés: állítsd be a window.KB_ORDER_ENDPOINT értékét a webshop rendelésfogadó API-jára (POST, JSON).
const PAY={card:['Bankkártya / OTP SimplePay',0],milpay:['MilPay részletfizetés (0% THM)',0],cod:['Utánvét',590],store:['Fizetés az áruházban',0]};
function pageCheckout(){
  document.title='Pénztár – Kangaboo';
  if(!cardsReady(cart.map(x=>x.id))) return need(()=>ensureCards(cart.map(x=>x.id)).then(pruneState),pageCheckout,'list');
  pruneState();
  const items=cart.map(x=>({...x,p:BYID[x.id]})).filter(x=>x.p);
  if(!items.length){ go('#/kosar'); return; }
  const f=store.get('checkout',{});
  let ship=store.get('ship','gls');
  const draw=()=>{
    const sub=items.reduce((a,x)=>a+(x.p.p||0)*x.q,0), free=sub>=30000;
    const shipCost=ship==='pickup'||free?0:SHIP[ship][1];
    const payOpts=ship==='pickup'?['store','card','milpay']:(ship.endsWith('_pt')?['card','milpay','cod']:['card','milpay','cod']);
    let pay=f.pay&&payOpts.includes(f.pay)?f.pay:payOpts[0];
    const payCost=PAY[pay][1];
    const v=k=>esc(f[k]||'');
    app.innerHTML=simpleHead('Pénztár','',[['Kosár','#/kosar'],['Pénztár']])+`<div class="wrap"><form class="cart" id="co" novalidate>
      <div style="display:grid;gap:20px">
        <div class="form-card"><h3>1. Kapcsolattartási adatok</h3>
          <div class="row2"><div class="field"><label for="fn">Teljes név *</label><input id="fn" name="name" autocomplete="name" required value="${v('name')}"></div>
          <div class="field"><label for="fp">Telefonszám *</label><input id="fp" name="phone" type="tel" autocomplete="tel" required pattern="[+0-9 ()\\-]{7,}" value="${v('phone')}" placeholder="+36 30 123 4567"></div></div>
          <div class="field"><label for="fe">E-mail cím *</label><input id="fe" name="email" type="email" autocomplete="email" required value="${v('email')}"></div>
        </div>
        <div class="form-card"><h3>2. Szállítási mód</h3>
          <div class="ship-opt">${Object.entries(SHIP).map(([k,o])=>`<label><input type="radio" name="ship" value="${k}" ${k===ship?'checked':''}>${o[0]}<span>${k==='pickup'||free?'Ingyenes':ft(o[1])}</span></label>`).join('')}</div>
          ${ship==='pickup'?`<div class="field"><label for="fs">Átvételi áruház *</label><select id="fs" name="store" required>${STORES.map(st=>`<option ${f.store===st[0]?'selected':''}>${esc(st[0])}</option>`).join('')}</select></div><p class="muted" style="font-size:.84rem">A csomag 1–3 munkanapon belül érkezik az áruházba, ahol 5 napig veheted át.</p>`:''}
          ${ship.endsWith('_pt')?`<div class="field"><label for="fpt">Csomagpont neve / címe *</label><input id="fpt" name="point" required value="${v('point')}" placeholder="Pl. GLS CsomagPont – Budapest, Váci út 1."></div><p class="muted" style="font-size:.84rem">Nagy méretű vagy nehéz termékek csomagpontra nem kérhetők.</p>`:''}
          ${ship==='gls'||ship==='mpl'?`<div class="row2"><div class="field"><label for="fz">Irányítószám *</label><input id="fz" name="zip" inputmode="numeric" autocomplete="postal-code" required pattern="[0-9]{4}" value="${v('zip')}"></div><div class="field"><label for="fc">Település *</label><input id="fc" name="city" autocomplete="address-level2" required value="${v('city')}"></div></div>
          <div class="field"><label for="fa">Utca, házszám, emelet/ajtó *</label><input id="fa" name="addr" autocomplete="street-address" required value="${v('addr')}"></div>`:''}
        </div>
        <div class="form-card"><h3>3. Fizetési mód</h3>
          <div class="ship-opt">${payOpts.map(k=>`<label><input type="radio" name="pay" value="${k}" ${k===pay?'checked':''}>${PAY[k][0]}<span>${PAY[k][1]?'+'+ft(PAY[k][1]):''}</span></label>`).join('')}</div>
          <label class="consent" style="margin-top:6px"><input type="checkbox" name="company" ${f.company?'checked':''}><span>Céges számlát kérek</span></label>
          ${f.company?`<div class="row2"><div class="field"><label for="fcn">Cégnév *</label><input id="fcn" name="cname" required value="${v('cname')}"></div><div class="field"><label for="fvat">Adószám *</label><input id="fvat" name="vat" required pattern="[0-9]{8}-?[0-9]-?[0-9]{2}" value="${v('vat')}" placeholder="12345678-1-12"></div></div>`:''}
        </div>
        <div class="form-card"><h3>4. Megjegyzés</h3>
          <div class="field"><label for="fnote">Megjegyzés a rendeléshez (opcionális)</label><textarea id="fnote" name="note" rows="3">${v('note')}</textarea></div>
          <label class="consent"><input type="checkbox" name="news" ${f.news?'checked':''}><span>Feliratkozom a hírlevélre, és elsőként értesülök az akciókról.</span></label>
        </div>
      </div>
      <aside class="summary">
        <h3>Rendelés összesítése</h3>
        <div style="display:grid;gap:10px;max-height:300px;overflow:auto">${items.map(x=>`<div style="display:flex;gap:10px;align-items:center;font-size:.84rem">${x.p.m?`<img src="${esc(img(x.p))}" alt="" style="width:48px;height:48px;object-fit:contain;border:1px solid var(--line);border-radius:10px;background:#fff" onerror="imgFail(this)">`:''}<div style="flex:1;line-height:1.35">${esc(x.p.n)}<div class="muted">${x.q} db${x.sz?' · '+esc(x.sz):''}</div></div><b>${ft((x.p.p||0)*x.q)}</b></div>`).join('')}</div>
        <div class="srow"><span>Részösszeg</span><span>${ft(sub)}</span></div>
        <div class="srow"><span>Szállítás</span><span>${shipCost?ft(shipCost):'Ingyenes'}</span></div>
        ${payCost?`<div class="srow"><span>Utánvét díja</span><span>${ft(payCost)}</span></div>`:''}
        <div class="srow total"><span>Fizetendő</span><span>${ft(sub+shipCost+payCost)}</span></div>
        <label class="consent"><input type="checkbox" name="terms" required><span>Elolvastam és elfogadom az <a href="https://kangaboo.hu/aszf" target="_blank" rel="noopener">ÁSZF</a>-et és az <a href="https://kangaboo.hu/adatvedelmi-szabalyzat" target="_blank" rel="noopener">adatvédelmi tájékoztatót</a>. *</span></label>
        <p class="demo-note">Bemutató: a gomb nem ad le valódi rendelést, az adatok nem kerülnek elküldésre.</p>
        <div id="coErr" role="alert" style="color:var(--coral-text);font-size:.85rem;font-weight:600"></div>
        <button class="btn btn-coral btn-block" id="coBtn">Megrendelés elküldése (fizetési kötelezettséggel)</button>
        <a href="#/kosar" class="btn btn-soft btn-block">Vissza a kosárhoz</a>
      </aside>
    </form></div>`;
    const form=$('#co');
    const save=()=>{ const fd=new FormData(form); ['name','phone','email','store','point','zip','city','addr','note','cname','vat'].forEach(k=>{ if(fd.has(k)) f[k]=fd.get(k); }); f.news=fd.has('news'); f.company=fd.has('company'); f.pay=fd.get('pay'); store.set('checkout',{...f}); };
    form.addEventListener('input',save);
    const refocus=sel=>{ const n=$(sel); if(n) n.focus(); };
    $$('input[name=ship]',form).forEach(r=>r.onchange=()=>{ save(); ship=r.value; store.set('ship',ship); draw(); refocus(`input[name=ship][value="${r.value}"]`); });
    $$('input[name=pay]',form).forEach(r=>r.onchange=()=>{ save(); draw(); refocus(`input[name=pay][value="${r.value}"]`); });
    $('input[name=company]',form).onchange=()=>{ save(); draw(); refocus('input[name=company]'); };
    form.onsubmit=async e=>{
      e.preventDefault(); save();
      const bad=$$('input,select,textarea',form).filter(el=>!el.checkValidity());
      $$('.field input,.field select',form).forEach(el=>el.style.borderColor='');
      if(bad.length){ bad.forEach(el=>{ if(el.closest('.field')) el.style.borderColor='var(--coral)'; }); $('#coErr').textContent=bad.some(el=>el.name==='terms')&&bad.length===1?'Kérjük, fogadd el az ÁSZF-et.':'Kérjük, töltsd ki helyesen a megjelölt mezőket.'; bad[0].focus(); return; }
      const order={id:'KB'+Date.now().toString().slice(-8),date:new Date().toISOString(),customer:{name:f.name,email:f.email,phone:f.phone,company:f.company?{name:f.cname,vat:f.vat}:null},
        shipping:{method:ship,label:SHIP[ship][0],cost:shipCost,store:ship==='pickup'?f.store:null,point:ship.endsWith('_pt')?f.point:null,address:(ship==='gls'||ship==='mpl')?{zip:f.zip,city:f.city,addr:f.addr}:null},
        payment:{method:pay,label:PAY[pay][0],cost:payCost},note:f.note||'',newsletter:!!f.news,
        items:items.map(x=>({id:x.p.i,sku:(DET[x.p.i]||{}).sku||null,name:x.p.n,brand:x.p.b,size:x.sz||null,qty:x.q,price:x.p.p})),subtotal:sub,total:sub+shipCost+payCost};
      const btn=$('#coBtn'); btn.disabled=true; btn.textContent='Küldés…';
      try{
        if(window.KB_ORDER_ENDPOINT){
          const r=await fetch(window.KB_ORDER_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(order)});
          if(!r.ok) throw new Error('HTTP '+r.status);
        }
        // bemutató: személyes adat nem marad a böngészőben
        store.set('lastOrder',{id:order.id,shipping:{label:order.shipping.label},payment:{label:order.payment.label},items:order.items.map(x=>({name:x.name,qty:x.qty})),total:order.total});
        store.del('checkout'); cart=[]; saveCart(); go('#/koszonjuk');
      }catch(err){ btn.disabled=false; btn.textContent='Megrendelés elküldése (fizetési kötelezettséggel)'; $('#coErr').textContent='A rendelés elküldése nem sikerült. Kérjük, próbáld újra, vagy hívd ügyfélszolgálatunkat: +36 20 539 6930.'; }
    };
  };
  draw();
}
function pageThanks(){
  document.title='Köszönjük a rendelést – Kangaboo';
  const o=store.get('lastOrder',null);
  if(!o){ go('#/'); return; }
  app.innerHTML=`<div class="wrap" style="padding:60px 0 100px;max-width:760px">
    <div class="form-card" style="text-align:center;padding:48px 32px">
      <div class="ck" style="width:64px;height:64px;margin:0 auto 18px"><svg class="icon" style="width:32px;height:32px"><use href="#i-check"/></svg></div>
      <span class="eyebrow">Bemutató – minta visszaigazolás</span>
      <h1 style="font-size:2.2rem;margin:.4rem 0 .8rem">Köszönjük a rendelésed!</h1>
      <p class="demo-note" style="justify-content:center">Ez bemutató: rendelés nem jött létre, és az adatok nem kerültek elküldésre.</p>
      <p style="color:var(--ink-2)">Minta rendelésszám: <b>${esc(o.id)}</b></p>
      <div class="perks" style="text-align:left;margin:26px 0">
        <div>${icon('i-truck')}<div><b>${esc(o.shipping.label)}</b><span>Választott szállítási mód</span></div></div>
        <div>${icon('i-card')}<div><b>${esc(o.payment.label)}</b><span>Fizetendő: ${ft(o.total)}</span></div></div>
        <div>${icon('i-bag')}<div><b>${o.items.reduce((a,x)=>a+x.qty,0)} termék</b><span>${o.items.slice(0,3).map(x=>esc(x.name)).join(', ')}${o.items.length>3?'…':''}</span></div></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn-primary" href="#/">Vissza a főoldalra</a><a class="btn btn-ghost" href="#/akciok">Akciók böngészése</a></div>
    </div></div>`;
}


/* ---------- bemutató összefoglaló a cégvezetőnek ---------- */
function pageDemo(){
  document.title='A bemutatóról – Kangaboo';
  const subN=KB.tops.reduce((a,t)=>a+t.subs.length,0);
  const li=a=>`<ul class="demo-list">${a.map(x=>`<li><span class="ck">${icon('i-check')}</span><span>${x}</span></li>`).join('')}</ul>`;
  const step=(n,title,body)=>`<div class="info-card"><div class="ui" style="background:var(--lilac);color:var(--ink);font-family:var(--serif);font-weight:700;font-size:1.3rem">${n}</div><h3>${title}</h3><p>${body}</p></div>`;
  app.innerHTML=simpleHead('A bemutatóról','Ez az oldal a Kangaboo webáruház újratervezett felületét mutatja be a jelenlegi kangaboo.hu tartalmával. Nem éles bolt: rendelést, üzenetet és feliratkozást nem fogad.',[['A bemutatóról']],'Összefoglaló')+`<div class="wrap" style="padding-bottom:90px;display:grid;gap:28px">
  <div class="info-card">
    <h3>Mi van benne</h3>
    ${li([`A kangaboo.hu kategóriáiban szereplő teljes kínálat: <b>${KB.total.toLocaleString('hu-HU')} termék</b>, ${KB.tops.length} főkategória, ${subN} alkategória, ${KB.brandCount} márka – névvel, árral, akciós árral, méretekkel és fotóval.`,
      `${esc(asofText())}. Az árak és a készlet ennek a napnak az állapotát mutatják, azóta változhattak.`,
      `Részletes termékleírás és képgaléria ${(KB.detailCount||0).toLocaleString('hu-HU')} terméknél van. A többinél a termékoldal az eredeti kangaboo.hu-s oldalra mutat.`,
      `Az aktuális kampányok az eredeti főoldalról, a lejárati dátumukig jelennek meg.`])}
  </div>
  <div class="info-card">
    <h3>Mi változott a jelenlegi kangaboo.hu-hoz képest</h3>
    ${li([`<b>Felépítés és megjelenés:</b> fehér alapon a Kangaboo logó telített színei (narancs, pink, napsárga, lime, égkék, lila), kerek, barátságos címsorbetűvel (Nunito). A navigáció alatt és a lábléc végén ötszínű csík fut, minden főkategóriának állandó színe van a lenyíló menüben, a kategórialistán és a kategóriaoldal fejlécében. A „Termékeink” lenyíló menü bal oldalán két oszlopban a főkategóriák, jobb oldalon az alkategóriák darabszámmal és a kategória négy kiemelt akciós terméke: elöl azok, amelyekhez részletes leírás és képgaléria tartozik, ezeken belül a nagyobb kedvezményűek.`,
      `<b>Terméklisták:</b> a jelenlegi oldal kategóriánként 37 terméket mutat oldalszámozással. Az új felület 24-esével tölti be a termékeket egy „Továbbiak betöltése” gombbal, és mutatja, hány termék látszik az összesből. Az Akciók oldal tetején az érvényes kampányok látszanak. Az Újdonságok alapsorrendje a „Legújabb elöl”: ez a termékazonosító szerinti csökkenő sorrend. Közelítés: feltételezi, hogy az újabb termékek nagyobb azonosítót kapnak (a terméklistákban dátum nem szerepel, az „Újdonság” jelölésű termékek viszont a legmagasabb azonosítók között sűrűsödnek).`,
      `<b>Keresés:</b> gépelés közben termékeket, kategóriákat és márkákat javasol, ékezetek nélkül is talál (pl. „cipo lany”), és a javaslatok nyilakkal is bejárhatók.`,
      `<b>Szűrők:</b> csak akciós termékek, csak újdonságok, ártartomány, márka (kereshető listával), méret, valamint hatféle rendezés. A bekapcsolt szűrők címkeként látszanak, egyenként törölhetők.`,
      `<b>Termékoldal:</b> nagyítható képgaléria, méretválasztó, a MilPay 4 havi részlet összege, a szállítási díj az adott termékárhoz igazítva, hasonló termékek és a márka további termékei.`,
      `<b>Mobil nézet:</b> oldalról becsúszó menü, alulról felcsúszó szűrőpanel. Ellenőrizve 375, 768 és 1280 képpont szélességen, vízszintes görgetés nélkül.`,
      `<b>Kezelhetőség:</b> a menü, a lenyíló menü, a szűrők, a keresés, a termékoldal, a kosár és a pénztár csak billentyűzettel is kezelhető. A főoldalon, a kategória-, termék-, kosár- és pénztároldalon mért szövegkontraszt legalább 4,5:1.`])}
  </div>
  <div>
    <div class="sec-head" style="margin-bottom:18px"><div><span class="eyebrow">Pénztár</span><h2>A vásárlás lépései</h2></div></div>
    <div class="info-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin:0">
      ${step(1,'Kosár','Mennyiség módosítása, szállítási mód választása, és jelzés arról, mennyi hiányzik a 30 000 Ft feletti ingyenes szállításhoz.')}
      ${step(2,'Adatok','Név, telefonszám, e-mail. A szállítási mód szerint áruház, csomagpont vagy cím, kérésre céges számla.')}
      ${step(3,'Fizetés','Bankkártya / OTP SimplePay, MilPay részletfizetés, utánvét (+590 Ft) vagy fizetés az áruházban. A végösszeg azonnal frissül.')}
      ${step(4,'Visszaigazolás','Összefoglaló a rendelésről. A bemutatóban ez csak minta, és utána a megadott személyes adatok törlődnek a böngészőből.')}
    </div>
  </div>
  <div class="info-card" style="background:var(--butter);border:0">
    <h3>Mi kell ahhoz, hogy élesben is működjön</h3>
    ${li([`<b>Rendelésfogadás és fizetés:</b> a pénztár most semmit nem küld el. Be kell kötni a webáruház rendeléskezelőjébe, a bankkártyás fizetést pedig az OTP SimplePay és a MilPay rendszerébe.`,
      `<b>Élő árak és készlet:</b> a katalógus most egy pillanatkép (${esc(huDate(KB.asof||''))}). Élesben a webáruház adatbázisából kell frissülnie, legalább naponta, és ugyanonnan kell betölteni a hiányzó termékleírásokat is. Áruházankénti készletadat jelenleg nincs benne.`,
      `<b>Saját képtárolás:</b> a termék-, kampány- és üzletfotók most közvetlenül a kangaboo.hu-ról töltődnek be. Élesben saját tárhelyről kell kiszolgálni őket, hogy a régi oldal lekapcsolása után is megmaradjanak.`,
      `<b>Keresőbarát címek:</b> a bemutató oldalai „#/” kezdetű címeket használnak, és a keresők számára szándékosan tiltva vannak. Élesben minden termék- és kategóriaoldalnak saját, olvasható címe kell legyen (például /babakocsi/…), szerveroldalon előállított tartalommal, hogy a Google indexelni tudja.`])}
  </div>
  <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-primary" href="#/">Vissza a főoldalra</a><a class="btn btn-ghost" href="https://kangaboo.hu/" target="_blank" rel="noopener">A jelenlegi kangaboo.hu ${icon('i-ext','sm')}</a></div>
  </div>`;
}
/* ---------- info pages ---------- */
function pageStores(){
  document.title='Üzleteink – Kangaboo';
  app.innerHTML=simpleHead('Üzleteink','Hat áruházunkban babaruhával, kismama ruházattal, gyerekcipőkkel, játékokkal, babaápolási termékekkel, légzésfigyelőkkel, mellszívókkal, babakocsikkal, etetőszékekkel, autósülésekkel és bútorokkal várunk.',[['Üzleteink']],'6 áruház · 6 850 m²')+`<div class="wrap" style="padding-bottom:90px">${storesHTML()}</div>`;
}
function pageShipping(){
  document.title='Szállítás és fizetés – Kangaboo';
  app.innerHTML=simpleHead('Szállítás és fizetés','30 000 Ft feletti rendelés esetén a kiszállítás ingyenes Magyarország területén.',[['Szállítás és fizetés']],'Vásárlási információk')+`<div class="wrap" style="padding-bottom:90px">
  <div class="info-grid">
    <div class="info-card"><div class="ui" style="background:var(--sage-l);color:var(--sage-d)">${icon('i-store')}</div><h3>Átvétel áruházban</h3><p><b>Ingyenes.</b> A termék 1–3 munkanap alatt érkezik a választott áruházba, ahol 5 napig veheted át. Fizetés bankkártyával vagy készpénzzel.</p></div>
    <div class="info-card"><div class="ui" style="background:var(--sky);color:var(--sky-d)">${icon('i-pin')}</div><h3>Csomagpont / automata</h3><p>GLS 1 190 Ft (1–4 munkanap), MPL 1 290 Ft (2–5 munkanap). 30 000 Ft felett ingyenes. Nagy méretű vagy nehéz termékeknél nem választható.</p></div>
    <div class="info-card"><div class="ui" style="background:var(--blush);color:var(--coral-d)">${icon('i-truck')}</div><h3>Házhozszállítás</h3><p>GLS 1 590 Ft (1–4 munkanap), MPL 2 990 Ft (2–5 munkanap). 30 000 Ft felett ingyenes. A futár e-mailben vagy SMS-ben értesít.</p></div>
  </div>
  <table class="table"><thead><tr><th>Mód</th><th>Díj</th><th>30 000 Ft felett</th><th>Várható idő</th></tr></thead><tbody>
    <tr><td>Átvétel áruházban</td><td>Ingyenes</td><td>Ingyenes</td><td>1–3 munkanap</td></tr>
    <tr><td>GLS csomagpont</td><td>1 190 Ft</td><td>Ingyenes</td><td>1–4 munkanap</td></tr>
    <tr><td>MPL csomagpont / automata</td><td>1 290 Ft</td><td>Ingyenes</td><td>2–5 munkanap</td></tr>
    <tr><td>GLS házhozszállítás</td><td>1 590 Ft</td><td>Ingyenes</td><td>1–4 munkanap</td></tr>
    <tr><td>MPL házhozszállítás</td><td>2 990 Ft</td><td>Ingyenes</td><td>2–5 munkanap</td></tr>
  </tbody></table>
  <div class="info-grid" style="margin-top:28px">
    <div class="info-card"><div class="ui" style="background:var(--butter);color:var(--butter-d)">${icon('i-card')}</div><h3>Online fizetés</h3><p>Bankkártya és OTP SimplePay – gyors és biztonságos.</p></div>
    <div class="info-card"><div class="ui" style="background:var(--lilac);color:var(--lilac-d)">${icon('i-card')}</div><h3>MilPay részletfizetés</h3><p>0% THM, 4 havi részletben – kamat és rejtett költség nélkül.</p></div>
    <div class="info-card"><div class="ui" style="background:var(--sand);color:var(--ink)">${icon('i-bag')}</div><h3>Utánvét</h3><p>Házhozszállításnál készpénz vagy kártya, csomagpontnál csak kártya. Utánvét díja: 590 Ft.</p></div>
  </div></div>`;
}
function pageContact(){
  document.title='Kapcsolat – Kangaboo';
  app.innerHTML=simpleHead('Kapcsolat','Kérdésed van egy termékkel vagy rendeléssel kapcsolatban? Írj nekünk, vagy hívd ügyfélszolgálatunkat.',[['Kapcsolat']],'Ügyfélszolgálat')+`<div class="wrap"><div class="contact-grid">
    <div style="display:grid;gap:18px;align-content:start">
      <div class="info-card"><div class="line">${icon('i-phone')}<div><b style="color:var(--ink)"><a href="tel:+36205396930">+36 20 539 6930</a></b><br>Hétfő–Péntek 8–15 óra</div></div>
      <div class="line">${icon('i-mail')}<div><b style="color:var(--ink)"><a href="mailto:info@kangaboo.hu">info@kangaboo.hu</a></b><br>Ügyfélszolgálat</div></div>
      <div class="line">${icon('i-pin')}<div><b style="color:var(--ink)">Kangaboo Kft.</b><br>1097 Budapest, Soroksári út 164.</div></div></div>
      <div class="info-card" style="background:var(--sage-l);border:0"><h3>Inkább személyesen?</h3><p>Látogass el valamelyik áruházunkba – kollégáink szívesen segítenek.</p><a href="#/uzleteink" class="link-arrow" style="justify-self:start">Üzleteink</a></div>
    </div>
    <form class="form-card" onsubmit="event.preventDefault();toast('Bemutató: az üzenet nem került elküldésre, az adatok nem kerültek továbbításra.');this.reset()">
      <h3>Írj nekünk</h3>
      <div class="row2"><div class="field"><label for="cn">Név</label><input id="cn" required></div><div class="field"><label for="ce">E-mail cím</label><input id="ce" type="email" required></div></div>
      <div class="field"><label for="ct">Téma</label><select id="ct"><option>Termékkel kapcsolatos kérdés</option><option>Rendelés állapota</option><option>Elállás, csere</option><option>Törzsvásárlói kártya</option><option>Egyéb</option></select></div>
      <div class="field"><label for="cm">Üzenet</label><textarea id="cm" rows="6" required></textarea></div>
      <label class="consent"><input type="checkbox" required><span>Elfogadom az <a href="https://kangaboo.hu/adatvedelmi-szabalyzat" target="_blank" rel="noopener">adatvédelmi tájékoztatót</a>.</span></label>
      <button class="btn btn-primary">Üzenet küldése</button>
    </form>
  </div></div>`;
}
function pageAdvice(){
  document.title='Ingyenes tanácsadás – Kangaboo';
  app.innerHTML=`<div class="wrap">${crumbs([['Ingyenes tanácsadás']])}<div style="padding:28px 0 90px">${adviceHTML()}</div></div>`;
}
function pageLoyal(){
  document.title='Törzsvásárlói program – Kangaboo';
  // csak ellenőrzött adatok: pontszabály (kangaboo.hu főoldal), áruházak (kangaboo.hu/uzleteink)
  const step=(n,c,title,body)=>`<div class="info-card"><div class="ui" style="background:${c};color:${n===1||n===2?'#fff':'var(--ink)'};font-weight:800;font-size:1.25rem">${n}</div><h3>${title}</h3><p>${body}</p></div>`;
  app.innerHTML=simpleHead('Törzsvásárlói program','Minden elköltött 100 Ft után 2 pontot írunk jóvá.',[['Törzsvásárlói program']],'Hűségprogram')+`
  <div class="wrap" style="padding-bottom:28px">
    <h2 class="camp-title">Hogyan működik?</h2>
    <div class="info-grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin:0">
      ${step(1,'var(--brand-orange)','Kártyaigénylés','A törzsvásárlói kártya igénylésének menete a <a href="https://kangaboo.hu/torzsvasarlok" target="_blank" rel="noopener" style="text-decoration:underline">kangaboo.hu törzsvásárlói oldalán</a> olvasható.')}
      ${step(2,'var(--brand-pink)','Pontgyűjtés','Minden elköltött 100 Ft után 2 pontot írunk jóvá. Például egy 10 000 Ft-os vásárlás után 200 pont jár.')}
      ${step(3,'var(--brand-sun)','Áruházaink',STORES.map(st=>esc(st[0])).join(' · ')+'. <a href="#/uzleteink" style="text-decoration:underline">Címek és nyitvatartás</a>')}
    </div>
  </div>
  <div style="padding-bottom:90px">${loyaltyNews()}</div>`;
}
function page404(msg){
  document.title='Nem található – Kangaboo';
  app.innerHTML=`<div class="wrap" style="padding:80px 0 100px"><div class="empty">${icon('i-search')}<h3>Az oldal nem található</h3><p>${esc(msg||'A keresett oldal nem létezik vagy áthelyeztük.')}</p><a class="btn btn-primary" href="#/">Vissza a főoldalra</a></div></div>`;
}

/* ---------- betöltés: váz és hibaállapot ---------- */
let SEQ=0;
function need(load,render,kind){
  const my=SEQ; app.innerHTML=skeleton(kind); app.setAttribute('aria-busy','true');
  load().then(()=>{ if(my===SEQ){ app.removeAttribute('aria-busy'); render(); } },
              ()=>{ if(my===SEQ){ app.removeAttribute('aria-busy'); loadError(); } });
}
function skeleton(kind){
  const card='<div class="sk-card"><div class="sk sk-img"></div><div class="sk sk-line"></div><div class="sk sk-line short"></div></div>';
  if(kind==='product') return `<div class="wrap" aria-busy="true"><span class="sr-only">Betöltés…</span><div class="sk sk-crumb"></div><div class="pdp"><div class="sk" style="aspect-ratio:1/1;border-radius:24px"></div><div><div class="sk sk-line short"></div><div class="sk sk-title"></div><div class="sk sk-title" style="width:60%"></div><div class="sk sk-line" style="width:40%;height:28px;margin-top:22px"></div><div class="sk" style="height:52px;border-radius:999px;margin-top:26px"></div></div></div></div>`;
  return `<div class="wrap" aria-busy="true"><span class="sr-only">Betöltés…</span><div class="sk sk-crumb"></div><div class="sk sk-hero"></div><div class="products" style="margin:28px 0 90px">${card.repeat(8)}</div></div>`;
}
function loadError(){
  app.innerHTML=`<div class="wrap" style="padding:80px 0 100px"><div class="empty" role="alert">${icon('i-search')}<h3>Az adatok betöltése nem sikerült</h3><p>Ellenőrizd az internetkapcsolatot, majd próbáld újra.</p><button class="btn btn-primary" onclick="location.reload()">Újrapróbálás</button></div></div>`;
}

/* ---------- router ---------- */
function route(){
  SEQ++; app.removeAttribute('aria-busy');
  const h=location.hash.replace(/^#\/?/,'');
  const [path,qs]=h.split('?');
  const q=new URLSearchParams(qs||'');
  const seg=path.split('/').filter(Boolean).map(decodeURIComponent);
  document.title='Kangaboo – Baba- és gyermekáruház';
  $$('nav.main > .wrap > ul > li > a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#/'+seg[0]));
  switch(seg[0]){
    case undefined: case '': pageHome(); break;
    case 'kategoriak': pageAllCats(); break;
    case 'kategoria': pageCategory(seg[1],seg[2]); break;
    case 'termek': pageProduct(seg[1]); break;
    case 'akciok': pageSale(q); break;
    case 'ujdonsagok': pageNew(q); break;
    case 'markak': pageBrands(); break;
    case 'marka': pageBrand(seg[1]||'',q); break;
    case 'kereses': pageSearch(q); break;
    case 'kosar': pageCart(); break;
    case 'kedvencek': pageFavs(); break;
    case 'penztar': pageCheckout(); break;
    case 'koszonjuk': pageThanks(); break;
    case 'uzleteink': pageStores(); break;
    case 'szallitas': pageShipping(); break;
    case 'kapcsolat': pageContact(); break;
    case 'tanacsadas': pageAdvice(); break;
    case 'torzsvasarlo': pageLoyal(); break;
    case 'bemutato': pageDemo(); break;
    default: page404();
  }
}
let lastPath='';
window.addEventListener('hashchange',()=>{
  const p=location.hash.split('?')[0];
  const samePage=p===lastPath; lastPath=p;
  route();
  if(!samePage){ window.scrollTo({top:0,behavior:'instant'}); app.focus({preventScroll:true}); }
});
window.addEventListener('scroll',()=>$('#hdr').classList.toggle('scrolled',scrollY>10),{passive:true});
// Esc a lenyíló menüben: bezárja, és a fókusz a „Termékeink” linkre kerül
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||PANEL) return;
  const mega=$('#mega'); if(mega.contains(document.activeElement)){ $('.has-mega > a').focus(); mega.classList.add('closed'); document.body.classList.remove('mega-open'); }
});

buildNav(); buildSearch(); badge();
if(KB.asof){
  const db=document.querySelector('#demoBar span'); if(db) db.insertAdjacentHTML('afterend',`<span class="asof">${esc(asofText())}</span>`);
  if(db) db.parentNode.insertAdjacentHTML('beforeend','<a class="demo-link" href="#/bemutato">Mi változott? →</a>');
  const fb=document.querySelector('.f-bottom > span'); if(fb) fb.insertAdjacentHTML('afterend',`<span>${esc(asofText())}</span>`);
}
lastPath=location.hash.split('?')[0];
route();
})();
