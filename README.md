# Kangaboo – újratervezett webshop felület

Statikus, build-lépés nélküli webshop frontend: a kangaboo.hu teljes termékkínálata (12 925 termék, 10 főkategória, 63 alkategória) új, egységes dizájnban.

## Megnyitás

Nyisd meg az `index.html` fájlt böngészőben, vagy tedd fel bármilyen statikus tárhelyre (Netlify, Vercel, Apache/Nginx). Szerveroldali futtatás nem kell hozzá.

## Oldalak

| Útvonal | Tartalom |
|---|---|
| `#/` | Főoldal: hero, előnyök, kategóriák, akciós kampányok, népszerű / akciós / új termékek, tanácsadás, üzletek, hűségprogram, hírlevél, blog, márkák |
| `#/kategoriak` | Összes kategória és alkategória |
| `#/kategoria/<főkat>[/<alkat>]` | Terméklista szűrőkkel (akciós, újdonság, ár, márka, méret) és rendezéssel |
| `#/termek/<id>` | Termékoldal: galéria nagyítással, méretválasztó, mennyiség, MilPay-részlet, szállítási infó, leírás, hasonló termékek |
| `#/akciok`, `#/ujdonsagok` | Akciós és új termékek, főkategória-szűrővel |
| `#/markak`, `#/marka/<név>` | Márkák A–Z és márkaoldalak |
| `#/kereses?q=` | Keresés (ékezetfüggetlen), azonnali javaslatokkal a fejlécben |
| `#/kosar`, `#/penztar`, `#/koszonjuk` | Kosár, pénztár, visszaigazolás |
| `#/kedvencek` | Kedvencek |
| `#/uzleteink`, `#/szallitas`, `#/kapcsolat`, `#/tanacsadas`, `#/torzsvasarlo` | Információs oldalak |

## Mappák

```
index.html            oldalváz, fejléc, lábléc, ikonok
assets/style.css      teljes dizájn (reszponzív, 3 töréspont)
assets/app.js         útválasztás, oldalak, szűrés, kosár, pénztár
data/home.js          a főoldalhoz szükséges kis fájl: kategóriák, darabszámok, kiemelt termékek, adatdátum
data/cat/<id>.js      főkategóriánkénti termékkatalógus, csak az adott kategória megnyitásakor töltődik be
data/search.js        keresőindex, az első kereséskor töltődik be
data/idmap.js         melyik termék melyik kategóriafájlban van (termékoldal, kosár, kedvencek)
data/details/*.js     termékleírások + galériák, 128 darabban, igény szerint töltődnek
scripts/              adatgyűjtő és összeállító szkriptek
```

## Adatok frissítése

A nyers adatok egy `raw/` munkamappába kerülnek, amely nem része a bemutatónak. Előbb ezt kell létrehozni, letölteni bele a főoldalt, és abból kinyerni a kategóriafát:

```
mkdir -p raw && curl -sL -A "Mozilla/5.0" -o raw/home.html https://kangaboo.hu/
python3 -I scripts/tree.py raw/home.html raw/cats.json
python3 -I scripts/scrape.py raw      # terméklisták (friss árakhoz előtte töröld a raw/pages mappát)
python3 -I scripts/details.py raw     # leírások, galériák (csak a még hiányzókat tölti le)
python3 -I scripts/build.py raw data  # data/ újragenerálása
```

A kangaboo.hu kb. 1 000 termékoldal lekérése után letiltotta a további letöltést (HTTP 403), ezért a leírások csak részben vannak meg.

## Élesítés előtt

1. **Rendelésfogadás:** a pénztár egy JSON-rendelést állít össze (vevő, szállítás, fizetés, tételek cikkszámmal). Ha az `index.html`-ben beállítod a `window.KB_ORDER_ENDPOINT = 'https://…/api/order'` értéket, a rendelés ide megy POST kéréssel. Enélkül csak a böngészőben rögzül. A fogadó oldalt (OpenCart API vagy saját végpont) a webshop fejlesztőjének kell bekötnie, a bankkártyás fizetést pedig a SimplePay / MilPay átirányítással.
2. **Árak és készlet:** a katalógus egy pillanatkép. Éles üzemben a `data/products.js`-t rendszeresen újra kell generálni (pl. éjszakai cron), vagy a webshop API-jából kell kiszolgálni ugyanebben a formátumban.
3. **Képek:** a képek közvetlenül a kangaboo.hu-ról töltődnek be, így ott elérhetőnek kell maradniuk.
4. **SEO:** az oldalak `#/` útvonalakat használnak. A Google indexeléséhez érdemes szerveroldali útvonalakra (`/termek/...`) és előre renderelt oldalakra váltani, ez a sablonnak az OpenCart témába való átültetésével oldható meg.
