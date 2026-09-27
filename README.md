# PiPizza — redesign

Statická responzivní stránka podle dodaných vizuálních referencí s kompletním demo objednávkovým postupem inspirovaným lokálním projektem Bellizzi. Lokálně spusťte `python3 -m http.server 8765 --bind 127.0.0.1` a přejděte na `http://127.0.0.1:8765/`.

- Původní logo PiPizza z archivu, jeho zelená je ztmavená pomocí CSS; obrazové soubory zůstávají zachované.
- Krémová, tmavě zelená a červená; lokálně uložené fonty Libre Franklin a Oswald (licence OFL v `assets/fonts/`). Libre Franklin odpovídá referenci Turbo Pizza, Oswald tvoří podobný úzký styl objednávkových tlačítek.
- Fotografie pizz z předchozího projektu Bellizzi, podle zadání. Jsou ilustrační, přesné složení vychází z PiPizza. Vazby jsou v `data/fotografie-zdroje.json`.
- Kompletní nabídka 26 pizz, doplňky a nápoje ze stažených podkladů.
- Všech 26 pizz se zobrazí rovnou. Kategorie mají počty položek, nabídku lze prohledávat bez diakritiky a řadit podle čísla, ceny nebo názvu.
- Při rolování se pevná hlavička zmenší a původní logo dostane světlou variantu pomocí CSS; červená skvrna zůstává viditelná. Kategorie se změní na nízkou lištu pod hlavičkou, vyhledávání se skryje. Zelený panel obsahuje tip týdne s přidáním a úpravou pizzy.
- Tlačítko „Upravit“ otevírá samostatnou stránku s adresou `?pizza=01-margarita`, velkou fotografií a rozbalovacími skupinami surovin podle reference Turbo Pizza. Mobil má fotografii nahoře. Lze přidat poznámku k pizze. Odebrání je bez změny ceny, ingredience navíc stojí 29 Kč. Pizza „Podle vašeho přání“ má první tři v ceně.
- Různé varianty pizzy se v objednávce vedou odděleně; stejné se sloučí. Poznámka je součástí varianty. V objednávce lze měnit suroviny i počet kusů. Cena se přepočítává okamžitě.
- Karty mají přirozenou výšku podle délky složení a stejně velká tlačítka „Upravit“ a košík. Pizzy jsou v obrázcích vidět celé, bez ořezu i bez přibližování při najetí. Detail má při úpravách trvale přichycenou spodní lištu s cenou a přidáním do košíku.
- Kontakt obsahuje oficiální Google Maps iframe pro adresu Jistebník 181 (Google zde uvádí Restauraci Na Obci Jistebník) a odkaz na otevření mapy. V interním prohlížeči zůstává externí iframe prázdný; jeho vykreslení není ověřené, odkaz na Google Mapy funguje.
- Demo checkout: doručení nebo osobní vyzvednutí, kontaktní údaje, lokální našeptávač ukázkových adres (s ručním zadáním), čas, poznámka, karta online, Apple Pay, Google Pay, hotovost nebo karta při převzetí, volitelné spropitné a závěrečné potvrzení s číslem objednávky.
- Platební metody mají vlastní ikonky a odpovídající potvrzovací tlačítka. Skutečné údaje o kartě se nezadávají; všechny online platby se simulují a objednávka se nikam neposílá. Kontakty ani objednávky se neukládají, všechny údaje zůstávají v paměti stránky. Po demo dokončení se košík vyprázdní.
- Karta online, Apple Pay, Google Pay i karta při převzetí počítají příplatek 1,49 % podle původních podkladů; částky se zaokrouhlují na haléře. Spropitné je dostupné pouze u online metod. Hotovost nepřebírá příplatek ani spropitné. Na simulaci upozorňuje nenápadná informace v patičce objednávkového okna. Ikonky plateb pocházejí z dodaného lokálního projektu Bellizzi.
- Ceník akce 3 + 1 je prezentovaný podle původního webu. Cena akce se ve výběru automaticky nepřepočítává; upřesňuje se po telefonu.
- Doplňkové fotografie přípravy těsta a surovin vytvořené nástrojem imagegen. [Zdroje a zadání fotografií](assets/README.md).

Původní stažené podklady jsou zachované lokálně ve složce `podklady/`; do veřejného repozitáře se nenahrávají. Aktuální menu pro prohlížeč je `menu-data.js`, chování `script.js`, výpočet variant a cen `cart-model.js`, vzhled `styles.css`, `menu.css`, `refinements.css` a `checkout.css`. Demo checkout je v `checkout.js`, lokální našeptávač a výpočty v `checkout-model.js`. Veřejný náhled je publikovaný pomocí GitHub Pages.

Testy cen, úprav a slučování variant: `node --test tests/*.test.cjs`.

## Publikování

- Náhled: https://poracanin.github.io/pipizza-demo/
- Repozitář: https://github.com/Poracanin/pipizza-demo
- GitHub Pages: větev `main`, složka `/(root)`. `index.html` je přímo v kořeni; žádný build ani instalace závislostí nejsou potřeba.
- `.nojekyll` zapíná přímé publikování statických souborů. Relativní cesty podporují i umístění pod `/pipizza-demo/`.
- Každý push do `main` aktualizuje veřejný náhled.
- Demo má nastaveno `noindex` a `robots.txt`, aby se nepletlo s ostrým webem ve vyhledávačích.
