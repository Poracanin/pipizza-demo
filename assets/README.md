# Obrazové podklady pro první návrh

## Logo a mapa

`images/logo-front.png`, `images/logo-back.png`, `images/favicon.gif` a `images/rozvoz.png` pocházejí z archivu původního webu PiPizza. Původní složené logo zůstává mezi podklady.

`images/logo-full.png` dodal uživatel 5. 10. 2026 jako `logo-full (1).png`. Soubor je zkopírovaný beze změn (1400 × 636 px, RGBA) a obsahuje zelené logo, červenou skvrnu a bílý slogan „CESTOU – NECESTOU“. Obě varianty webu jej používají v navigaci, patičce, objednávce a úvodní animaci.

## Pizzy

Soubory `pizza/*.webp` byly zkopírovány bez úprav z lokálního projektu `pizzabelizzi.cz/jidla-pizza-vylepsene-webp/` na výslovné přání uživatele. Vazby ke konkrétním položkám a upozornění na ilustrační charakter jsou v `../data/fotografie-zdroje.json`.

## Doprovodné fotografie

Vytvořené 23. 9. 2026 vestavěným nástrojem **imagegen**. Jde o ilustrační fotografie, nikoli dokumentaci skutečné kuchyně PiPizza. Do webu uložené jako optimalizovaný WebP:

- `images/priprava-testa.webp`
- `images/cerstve-suroviny.webp`

Finální zadání pro přípravu těsta:

> Use case: photorealistic-natural. Create a single editorial photograph asset for a Czech pizzeria website. Close-up of a baker's hands working fresh pizza dough on a flour-dusted wooden counter; natural cloud of flour, warm low sunlight, authentic artisan kitchen, very shallow depth of field, warm amber highlights with deep forest-green shadows, tasteful premium food magazine photography. Hands and dough in upper two thirds, bottom third dark uncluttered counter suitable for white HTML text overlaid later. Vertical 4:5 composition. Absolutely no text, logos, typography, collage, interface, or watermark. This is an illustrative culinary image, not a depiction of any specific restaurant.

Finální zadání pro suroviny:

> Use case: photorealistic-natural. Create a single editorial food photograph asset for a Czech pizzeria website. Lush fresh basil leaves, vivid red vine tomatoes, torn white fresh mozzarella, a small glass bottle of golden olive oil on rustic dark wooden countertop. Intimate close angle with depth, beautifully textured natural ingredients, cinematic warm side-light, strong forest-green and deep tomato red colors, tasteful premium Italian food magazine photography. Ingredients mostly upper two thirds, bottom third darker and uncluttered for later white HTML text overlay. Vertical 4:5 composition. Absolutely no text, logos, watermark, interface, collage, or packaging labels.

## Fonty

Lokální fonty Inter a Source Serif jsou převzaté z existujících lokálních WordPress motivů projektu Bellizzi. Licenční informace jsou ve složce `fonts/`.

## Radar rozvozu (5. 10. 2026)

`images/delivery-map.svg` je vektorový podklad sestavený z uživatelem dodaných geometrií RÚIAN / DATA50 (ČÚZK), stažených 30. 9. 2026. Skript `../tools/build-delivery-map.py` zjednodušuje hranice a kreslí mapu bez externího mapového API. Zelené cíle a přerušované spojnice představují **ukázkový rozvoz**, nikoli skutečné polohy řidičů, navigační trasy nebo garantované pokrytí. Zdrojové soubory zůstávají ve složce místních podkladů.
