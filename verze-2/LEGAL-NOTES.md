# Právní stránky — podklady a rozsah, 7. 10. 2026

Stránky `ochrana-osobnich-udaju.html`, `alergeny.html` a `obchodni-podminky.html` jsou psané pro aktuální prezentační verzi. Neprohlašují, že demo přijímá objednávky, provádí platby nebo má zapojené reklamní měření. Provozní údaje a postupy dosud provozovatel výslovně nepotvrdil; před ostrým nasazením je nutné texty, smluvní proces a níže uvedené body ověřit s provozovatelem a právním poradcem. Samotné vytvoření textů není právním auditem provozu.

## Ověřené skutečnosti

- ARES, IČO 63051192: Vladimír Mamula, sídlo Jistebník 467, 742 82; aktivní živnostenský rejstřík. Ověřeno přes oficiální [ARES API](https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/63051192), datum aktualizace záznamu 23. 5. 2026. Sídlo není zaměněno za provozovnu Jistebník 181.
- Telefon 720 400 500, e-mail info@pipizza.cz a provozovna odpovídají [původnímu webu](https://pipizza.cz/). Staré ceny/poplatek za kartu nepřebíráme, protože uživatel pro tento návrh výslovně zadal platbu bez příplatku.
- Košík a checkout drží údaje jen v paměti stránky; nejsou napojeny na objednávkový backend ani platební službu. Nejsou načítány Google Analytics, Google Ads ani Meta Pixel. Účetní systém a doby uchovávání skutečných objednávek proto nelze ověřit z kódu.
- Hosting náhledu je GitHub Pages. OpenStreetMap načítá mapové dlaždice při zobrazení mapy, čímž získá IP adresu a zobrazenou oblast. Hledání adres probíhá lokálně.

## Co bylo technicky doplněno

- Tři samostatné statické HTML stránky mají vlastní titulky, čitelnou typografii, navigaci mezi dokumenty, obsah a tiskové styly. Odkazy v patičce a checkoutu otevírají novou kartu, takže nezahodí rozpracovaný košík v paměti původní stránky.
- Google iframe má pouze `data-consent-src`; atribut `src` získá až po výslovném povolení. Souhlas jde odmítnout/odvolat na stránce soukromí, také z jiné karty. Odvolání odpojí iframe. Již uložené cizí cookies může odstranit uživatel v prohlížeči.
- `pipizza-map-consent-v1` obsahuje pouze verzi, boolean a čas, platí 180 dní. Expirace, jiná verze, poškozená hodnota nebo nedostupné úložiště mapu samy neaktivují. Při blokovaném úložišti je výslovná volba jen v paměti otevřené stránky.
- Nepoužívané intro ve verzi 2 má `data-intro-disabled`: sdílený `experience.js` pro něj nečte ani nezapisuje starý `pipizza-intro-last-shown`. Světlá varianta zůstává se svým dosavadním chováním.
- Google Analytics / Ads / Meta jsou v textu jasně označené jako plánované a neaktivní. Nevkládáme žádné reklamní ID ani měřicí skript a nevybíráme souhlas s neexistujícím měřením.

## Před skutečným provozem

1. Potvrdit prodávajícího/správce, sídlo, provozovnu, kontakt a že hostování náhledu spravuje oprávněná osoba. Ověřit pravidla skutečných objednávek, doručení, plateb, potvrzení smlouvy na trvalém nosiči a přijetí reklamace. Webové potvrzovací tlačítko musí jednoznačně vyjadřovat platební povinnost, až se z dema stane skutečný checkout.
2. Ověřit alergeny všech receptur, základů, přídavků, omáček a nápojů podle dodavatelských specifikací. Seznam 14 skupin je pouze legenda. Zajistit aktuální informace i při úpravě/půlení a při doručení. Přehled ani obecná věta o stopách nenahrazuje kontrolu konkrétního složení.
3. Potvrdit skutečné zpracovatele, příjemce, lhůty uchování, oprávněné zájmy a smluvní záruky u hostingu, objednávek, rozvozu, účetnictví a plateb. Aktualizovat informace, pokud se hosting nebo ukládání údajů změní.
4. Při nasazení Google/Meta doplnit skutečný seznam cookies, dobu uchování událostí, zapojené funkce, případné společné správcovství Meta, přenosy a záruky. Teprve pak implementovat odpovídající oddělené souhlasy, odmítnutí ve stejné vrstvě a blokování požadavků před souhlasem. Zkontrolovat skutečný provoz, nestačí pouze „denied“ v Consent Mode.

## Zdroje

- [GDPR, zejména články 6, 7, 12–22 a 44 a násl.](https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=CELEX%3A32016R0679)
- [ÚOOÚ — cookies, souhlas a odmítnutí](https://uoou.gov.cz/verejnost/qa-otazky-a-odpovedi/cookies)
- [ČOI — nákup přes internet a výjimky z odstoupení](https://coi.gov.cz/faq/a-nakup-pres-internet/)
- [ČOI — reklamace](https://coi.gov.cz/pro-spotrebitele/spotrebitelsky-pruvodce/reklamace-zbozi-a-sluzeb/)
- [ČOI — ADR a aktuální adresa Gorazdova 1969/24](https://coi.gov.cz/pro-podnikatele/informace-pro-prodejce-zbozi-a-sluzeb/mimosoudni-reseni-spotrebitelskych-sporu-adr/)
- [ČOI — lhůta pro podání návrhu ADR](https://coi.gov.cz/informace-o-adr/)
- [Nařízení (EU) 1169/2011, příloha II](https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=CELEX%3A32011R1169)
- [SZPI — alergenní složky v pokrmech a při prodeji na dálku](https://www.szpi.gov.cz/clanek/povinnost-provozovatelu-zarizeni-spolecneho-stravovani-poskytovat-informace-o-alergennich-slozkach.aspx)
- [Google Analytics — skutečné výchozí doby cookies](https://support.google.com/analytics/answer/11397207?hl=en-GB), [uchovávání údajů](https://support.google.com/analytics/answer/7667196)
- [Google soukromí](https://policies.google.com/privacy?hl=cs), [Meta soukromí](https://www.facebook.com/privacy/policy/) (bez přihlášení vrací přesměrování)
- [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement), [OpenStreetMap Foundation Privacy Policy](https://osmfoundation.org/wiki/Privacy_Policy)

## Ověření

60 testů prošlo včetně 6 nových testů souhlasu, jeho odvolání, obnovy, chyb a expirace. JavaScript syntaxe a `git diff --check` bez chyb. V prohlížeči ověřeny tři stránky na 320 a 1280 px, 14 alergenů, rozbalení informací o odstoupení, souhlas s mapou a odvolání mezi dvěma kartami. Na 481 px ověřena kontaktní mapa a její ovládání.
