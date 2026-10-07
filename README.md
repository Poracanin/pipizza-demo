# PiPizza — návrh webu

Statický responzivní návrh se světlou a tmavou variantou a kompletní demo objednávkou. Lokální spuštění: `python3 -m http.server 8765 --bind 127.0.0.1`.

- Světlý návrh: http://127.0.0.1:8765/
- Tmavý návrh: http://127.0.0.1:8765/verze-2/
- Administrace: http://127.0.0.1:8765/admin.html (také pod `/verze-2/admin.html`)

## Připomínky z 5. 10. 2026

Obě varianty používají stejná pravidla. Původní ceny 209 Kč se změnily na 219 Kč a původní 219 Kč na 229 Kč. Platba kartou je bez poplatku, krabice je v ceně pizzy a rozvoz zdarma. Přesný text o konečné ceně je v nabídce i checkoutu. Dobrovolné spropitné je oddělené a dostupné u online plateb.

Konfigurátor nabízí rajčatový, smetanový a hořčicový základ. Výchozí je rajčatový, Brokolice má smetanový a Oregon hořčicový. Pizza napůl stojí cenu dražší poloviny + 12 Kč; obě poloviny mohou mít samostatný základ. Úpravy surovin se vztahují na celou pizzu. Košík rozlišuje základy, poloviny, suroviny i poznámky a umožňuje jejich další úpravu.

Požadované extra sýry a maso jsou v sekci „Prémiové suroviny“, vše +29 Kč. Doplněná zelenina a chilli omáčka stojí také +29 Kč. Pravidlo výměn v návrhu: odebrané klasické maso/sýr lze vyměnit 1:1 za klasickou surovinu (mozzarella, niva, šunka, kuře, anglická slanina). Zelenina nevytváří ani nečerpá výměnu; prémiové přídavky jsou placené. Stávající pizza „Podle vašeho přání“ si zachovává 3 jakékoliv suroviny v ceně, také při půlení (jednou za pizzu).

Checkout nabízí online kartu, Apple Pay, Google Pay a při převzetí hotovost, kartu či QR kód. Zmiňuje QR kód na účtence; funkční platební QR není generován bez skutečného účtu a napojení plateb. Potvrzení obsahuje „Jsme rádi, že vám chutná.“ s červeným srdcem.

Radar i checkout používají `window.PiDelivery`: 1 čtvereček = cca 40–60 minut, 2 = cca 1 hodina 25 minut. Ukázkové vytížení lze přepnout v radaru. „Doručení na čas“ nabízí 15minutové sloty v otevírací době, nejméně 75 minut předem, na následujících 7 dní v pásmu Europe/Prague. Platnost se kontroluje i těsně před potvrzením.

Dodané kompletní logo `assets/images/logo-full.png` je použité bez přebarvování v navigaci, patičce, objednávce a úvodní animaci. Obsahuje slogan „CESTOU – NECESTOU“; v navigaci se proporcionálně zmenšuje. Úvodní animace se zobrazuje nejvýše jednou za 24 hodin v daném prohlížeči, společně pro obě varianty. Pamatuje si pouze čas zobrazení v `localStorage`; při omezeném pohybu, blokovaném úložišti nebo přímém odkazu na detail/sekci se vynechá.

## Vzhled podle Pizza Visi

Na přání uživatele je rozložení nabídky, detailu pizzy a košíku inspirované projektem Pizza Visi: kompaktní kategorie, velké fotografie přesahující karty, výrazné názvy a tlačítka, skupiny surovin s přepínači, boční košík s nabídkou nápojů a přehledná objednávka. Světlá i tmavá varianta zachovávají vlastní barvy PiPizza. Ceny, nabídka, příplatky, základy, půlení, doručení a platební pravidla se touto vizuální úpravou nemění.

Společné styly jsou v `catalog-view.css`, `customizer-view.css`, `order-view.css` a `brand-layout.css`. `cart-view.js` doplňuje zobrazení počtu kusů a nápoje ze stávajícího menu; výpočty zajišťují původní modely PiPizza.

Podle následných komentářů je vpravo v mobilní hlavičce pouze košík. Pět kategorií bez čísel se vejde do jedné řady bez horizontálního posouvání; delší názvy kategorií se na úzkém mobilu zalomí uvnitř svého tlačítka. Kategorie „Pro celou partu“ byla odebraná. Nad nabídkou se střídají bannery akce 3 + 1 (čtvrtá pizza za 129 Kč) a tipu týdne Boston. Karusel lze ručně přepnout a pozastavit, při omezeném pohybu se automaticky nestřídá.

Karty jsou nižší, číslo pizzy je u fotografie, názvy se vejdou na jeden řádek a červené tlačítko má i na mobilu text „Přidat do košíku“. Alergeny jsou v detailu, nikoli na kartě. H1 nadpisy se píší bez závěrečné tečky. Úvodní animace zvětší dodané kompletní logo přes obrazovku a odkryje web; limit jednou za 24 hodin zůstává. Hero a animaci obsluhují `hero-intro.css` a `experience.js`.

## Radar a administrace

Radar zobrazuje označené ukázkové cíle Klimkovice, Polanka nad Odrou a Studénka. Offline mapa vychází z dodaných podkladů ČÚZK RÚIAN / DATA50 z 30. 9. 2026. Nejde o živé GPS polohy ani o potvrzení provozního pokrytí všech zobrazených hranic. Mapu lze znovu sestavit pomocí `python3 tools/build-delivery-map.py`, pokud jsou přítomné místní zdrojové soubory ve složce `RUUAN Mpy databaze/`; pro zobrazení webu tyto soubory nejsou potřeba.

Samostatná administrace obsahuje denní tržbu, součet vybraného a předchozího dne, měsíční tržbu do vybraného dne, krátký denní přehled, inkaso podle metod, dluhy a denní uzávěrku s porovnáním hotovosti. Používá označená syntetická data bez zákaznických údajů. Úhrady a uzávěrky se ukládají jen lokálně jako demo stav; obnovením ukázky se resetují. Nejde o zabezpečenou produkční administraci ani účetní systém.

Objednávky a platby se pouze simulují. Kontakty a košík zůstávají v paměti stránky, objednávky se neodesílají pizzerii. Skutečný provoz vyžaduje backend, napojení plateb/účtenek, rozvozu a chráněnou administraci. Akce 3 + 1 je prezentovaná podle původního návrhu, v košíku se automaticky nepřepočítává.

## Soubory a kontrola

Menu pro prohlížeč je `menu-data.js`, chování `script.js`, pravidla variant a cen `cart-model.js`, checkout `checkout.js` a `checkout-model.js`. Druhá varianta má vlastní kopie těchto souborů. Společné doplňky vzhledu, logo/intro a radar jsou v `updates.css` a `experience.js`. Administrace sdílí `admin.css`, `admin.js` a `admin-model.js`.

Testy: `node --test tests/*.test.cjs`. Ověřují ceny, výměny, půlené pizzy, košík, platební metody, termíny včetně změn letního času a výpočty administrace. Původní archiv a `data/pizza.json` zachovávají historická data; aktuální prohlížeč je nepoužívá.

Původní logo, červená skvrna a mapa z archivu jsou zachované jako podklady. Nové kompletní logo dodal uživatel 5. 10. 2026. Fotografie pizz jsou ilustrační z projektu Bellizzi, vazby v `data/fotografie-zdroje.json`. Doprovodné fotografie jsou generované; původ a licence fontů viz `assets/README.md` a `assets/fonts/`.

## Publikování

Repozitář: https://github.com/Poracanin/pipizza-demo. GitHub Pages používá větev `main` a kořen repozitáře; žádný build není potřeba. Veřejný náhled po publikování: https://poracanin.github.io/pipizza-demo/ a `/verze-2/`. Push do `main` aktualizuje veřejný náhled. Samotná místní editace nic nepublikuje. Návrh má nastaveno `noindex`.
