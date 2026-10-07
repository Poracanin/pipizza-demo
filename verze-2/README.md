# PiPizza — aktivní verze 2

Od posledního pokynu uživatele se upravuje pouze tato verze. Verze 1 se již nepoužívá; soubory v kořeni a sdílené styly neměnit způsobem, který by ji ovlivnil. Nové úpravy vzhledu patří do `verze-2/`.

Místní náhled: http://127.0.0.1:8765/verze-2/ (server spuštěný z kořene projektu).

Tmavý vzhled tvoří `dark.css`: černohnědý podklad, jemný kouř, krémové texty, zelené a červené akcenty. Původní inspirace: https://new.pipizza.cz/, kouřová fotografie lokálně v `assets/smoke.jpg`. Fotografie a logo jsou sdílené z `../assets/`.

Fonty odpovídají projektu Pizza Visi: **Bebas Neue 400** pro nadpisy, ceny a tlačítka, **Work Sans** pro běžné texty a formuláře. Čtyři nezměněné WOFF2 soubory včetně české diakritiky jsou z lokálního projektu `Pizza visi/public/assets/fonts/` zkopírované do `assets/fonts/`; načítá je `fonts.css`. Přiložené licence pocházejí z oficiálního repozitáře Google Fonts: [Bebas Neue](https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/OFL.txt), [Work Sans](https://raw.githubusercontent.com/google/fonts/main/ofl/worksans/OFL.txt).

`typography.css` a `order-typography.css` se načítají pouze zde a přebírají velikosti i responzivní zlomy Visi pro nabídku, hero, editor pizzy, košík a checkout. U výjimečně dlouhých názvů pizzy se písmo zmenší tak, aby platil dřívější požadavek na celý název v jednom řádku. Barvy a pravidla objednávky zůstávají PiPizza.

Připomínky z 5. 10. 2026 jsou zapracované do obou variant: ceny 219/229 Kč, platby bez příplatku, QR při převzetí, min. 75 minut pro doručení na čas, tři základy, doplněné suroviny, pizza napůl, logo a úvodní animace jednou za 24 hodin, radar s mapou a ukázková administrace.

HTML, menu, konfigurátor a checkout zůstávají samostatné. `../updates.css`, `../experience.js` a administrační soubory jsou sdílené. Vstup do administrace je `admin.html`.

Objednávky, platby, radar a administrace jsou označené demonstrace. Podrobná pravidla, zdroje, omezení a testy jsou v [hlavním README](../README.md).


## Úpravy podle 20 komentářů z 7. 10. 2026

Pouze verze 2 má nový vzhled v `refinement-20261007.css`. Nízký banner je přes celou šířku a zobrazuje vždy jednu nabídku. Dvě nabídky se po 7 sekundách posouvají do strany; lze je přepnout gestem nebo drobnými tečkami. Interakce automatické střídání zastaví a omezený pohyb jej vypne. Vyhledávání nabídky je odstraněné. Kategorie Pizzy, Pikantní, Bez masa, Nápoje a Něco navíc se vejdou do jedné řady i na 320px mobilu. Nadpis nabídky je malý a mění se s kategorií, cenová poznámka je v patičce. Čísla pizz jsou větší a bez rámečku; kliknutí do karty nebo na fotografii otevře editor. Nadpisy nemají závěrečnou tečku.

Editor má kompaktní hlavičku a návrat vpravo nahoře, karty základů, obrázkový výběr druhé poloviny přes téměř celou obrazovku a dva úplné seznamy úprav pod sebou. Hlavička pizzy i nadpis upravované poloviny jsou při rolování přichycené; jejich odsazení reaguje na skutečnou výšku hlavičky. „Co vynecháme?“ je otevřené pod všemi přídavky, následuje poznámka. Košík ukládá `removed`/`extras` pro první (nebo celou) pizzu a `halfRemoved`/`halfExtras` pro druhou polovinu. Souhrny i opětovná editace zachovávají jejich příslušnost. Základní cena půlené pizzy zůstává vyšší cena +12 Kč. Původní sazba +29 Kč se nyní počítá za přídavek na vybranou polovinu; v UI je to výslovně uvedené. Výměny zdarma platí na stejné polovině. Tři suroviny v ceně u vlastní receptury zůstávají jednou za celou pizzu.

Nápoje mají produktové fotografie a bílé karty v nabídce i košíku. Fanta, Sprite a Coca-Cola jsou převzaté beze změny z lokálního Visi. Kofola a Monster jsou oficiální produktové packshoty; značky a fotografie patří jejich vlastníkům, použité pro tento místní návrh. Zdroje: https://www.kofola.cz/produkty a https://www.monsterenergy.com/en-za/energy-drinks/monster-energy/the-original-green-monster-energy/.

Mapa používá stejnou knihovnu a podklad jako Visi (Leaflet a OpenStreetMap) s vlastními daty PiPizza: 21 skutečných polygonů obcí/obvodů a 15 892 adres. Jen Polanka nad Odrou a Stará Bělá jsou zahrnuté z Ostravy. Vyhledávání běží lokálně, bez odesílání textu adres externímu geokodéru. Po výběru se zobrazí bod konkrétního domu, také pod adresou v checkoutu. Checkout vyžaduje výběr adresy z nabídky. Mapové dlaždice se načítají z OpenStreetMap; při chybě připojení se zobrazí zpráva, hranice a bod zůstávají dostupné. Samotné objednávky zůstávají demo.

`address-model.js` zajišťuje hledání, `delivery.js` společný našeptávač a mapy. Data v `data/` vznikají skriptem `tools/export-delivery.py` z dodané SQLite databáze a mapového JSON; souřadnice převádí PROJ `cs2cs` z EPSG:5514 do WGS84. Zdroj ČÚZK / RÚIAN, adresy k 31. 8. 2026, dodaný výběr hranic z 30. 9. 2026, CC BY 4.0. Leaflet má přiloženou licenci v `assets/vendor/leaflet/LICENSE.txt`.

Kontrola: `node --test tests/*.test.cjs` (z kořene projektu), 46 testů včetně oddělených polovin, výměn, ceny, zachování editací a přesnosti vyhledávání adres. Prohlížeč: mobil 320/390/511 px a desktop 1440 px, obrázky nápojů, mapové dlaždice, 21 polygonů, bod domu Jistebník 181 a návrat z úpravy v košíku.

## Dalších 11 připomínek z 7. 10. 2026

Odstraněna lišta s řazením a duplicitní akční karta pod nabídkou; odkaz na akci vede na horní banner. Zmenšeny mezery u kategorií. Neprázdný košík má spodní tlačítko s počtem a cenou, které otevírá objednávku. Při rolování je vpravo nenápadný návrat nahoru. Otevírací doba je zvýrazněná vpravo vedle kontaktních údajů. Detail má širší tlačítko „Zpět“. Výběr druhé poloviny používá samostatný nativní dialog s obrázky a vlastní rolovací plochou; zůstává dostupné zavření klávesou Escape. Úpravy obou polovin jsou vykreslené najednou a tlačítka mají výslovný rozsah první/druhé poloviny.

Ověření nové úpravy: 46 testů prošlo; prohlížeč 320 / 511 / 1440 px bez vodorovného přetečení, velký výběr a Escape, přichycení obou nadpisů, samostatné příplatky a výměny, opětovná editace z košíku, spodní košík a návrat nahoru. Kontrolní obrázky jsou v `../docs/qa-20261007/`. Testovací položky byly odstraněny.

## Jemnější kategorie, animace košíku a živé cenovky

Kategorie mají průhledný podklad a jen tenké podtržení vybrané položky, výšku 34–36 px. Při přidání z katalogu letí dekorativní kopie celé karty do horního košíku, zmenší se a košík krátce pulzuje. Skutečná položka se přidá ihned; animace neblokuje objednávání a respektuje omezení pohybu. Kopie není interaktivní, je skrytá asistivním technologiím a po animaci se odstraní.

Celková cena v editoru je výraznější (39–46 px) a má rozpis i násobení počtem kusů. `priceBreakdown` nyní vrací konkrétní ceny přídavků v každé polovině, ze kterých se počítá také konečný součet. Nabídka tak ukazuje 0 Kč u výměny zdarma a aktualizuje zbývající počet výměn. Klasické suroviny financují pouze klasické přídavky na stejné polovině; zelenina a prémiové suroviny se výměny neúčastní. Dosavadní tři suroviny v ceně vlastní pizzy platí jednou za celou pizzu.

Ověření: všech 49 testů prošlo, včetně konkrétních cenovek, vyloučení zeleniny/prémiových surovin, samostatných polovin a vrácení odebrané suroviny při více kusech. V prohlížeči ověřena animace a odstranění její kopie, živé 0/+29 Kč, výsledné ceny i jejich přenos do košíku; mobil 320/509/612 px a tablet 820 px.

## Zelená z loga a hlavička půlené pizzy

`brand-green.css` sjednocuje zelené ovládací prvky na `#79B43E`, nejčastější světlý odstín uvnitř písmen v `assets/images/logo-full.png`. Plná zelená tlačítka mají tmavý text `#17230D` (kontrast 6,56:1); ostatní stavy používají odstíny odvozené od stejné barvy. Paleta zahrnuje košík, výběr základu, suroviny, checkout, akční banner a mapové zvýraznění. Červená tlačítka zůstávají červená.

„Chcete pizzu napůl?“ je nyní výrazný nadpis. Přichycená hlavička sleduje aktuální výběr: oba názvy, složený obrázek ½ + ½, název dokumentu a společný seznam alergenů. Při návratu na celou pizzu se obnoví původní fotografie, popis i název. Stejná aktualizace proběhne při otevření uložené položky z košíku.

Ověřeno v prohlížeči na 320 a 509 px včetně dlouhého názvu San Francisco, změny/zrušení druhé poloviny a editace z košíku. Bez chyb konzole. Všech 49 testů prošlo. Náhled: `../docs/qa-20261007/logo-green-split-header.jpg`.

## Hero s logem a surovinami

Akční karusel nahrazuje jedno hero s velkým původním logem, barevným zeleným podkladem, plovoucími surovinami, telefonem a odkazem na menu. V průhledné hlavičce je nahoře pouze kulatý košík; po posunu se vrací běžná tmavá navigace. Dekorace jsou skryté čtečkám a při `prefers-reduced-motion` se nehýbou. Odstraněn časovač původního karuselu i odkaz na akce v patičce. Styly jsou ve `brand-hero.css`.

Ověřeno na 320 px i 1280 px, otevření košíku a přechod do menu; 49 testů prošlo.

## Stav otevření a živý odpočet

Horní proužek ukazuje „Máme otevřeno / Máme zavřeno“ a odpočet do nejbližší změny v hodinách, minutách a sekundách. Používá stávající týdenní otevírací dobu v `Europe/Prague`; `openingStatus` v `checkout-model.js` sdílí denní pravidla s nabídkou doručovacích časů. Odpočet se vždy počítá z aktuálního času a při návratu na kartu se okamžitě obnoví. Změna stavu automaticky přepne proužek a propracované pozadí hero mezi zelenou a červenou. Pozadí tvoří světelné přechody, jemná textura, kruhové linky a drobné světelné body.

Odsazení kategorií a detailu zahrnuje výšku nového proužku. Čtečka oznamuje změnu stavu, ne každou sekundu odpočtu. Přidáno 5 testů hranic otevírací doby, víkendu, půlnoci, konce roku a obou změn letního času; celkem 54 testů prošlo. Ověřeno na 320 a 1280 px a obě barevné varianty. Statický náhled zavřeného stavu je pouze QA soubor v `docs/qa-20261007/closed-hero-preview.html`, živý web vždy používá skutečný čas.

Proužek se při rolování skryje a zobrazí se znovu po návratu nahoru. Desktop od 1024 px má čtyři produkty vedle sebe; mobil zůstává se dvěma sloupci.
