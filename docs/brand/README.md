# Skillo: značka

Podklady: `primarne-logo.png` (logo, paleta, písmo) a `ikona-a-pouzitie.png` (app ikona, favicon, použitie na webe).

## Kde je logo v kóde

| Čo | Súbor |
|---|---|
| Značka S a celé logo (SVG) | `components/logo.tsx` (`SkilloMark`, `SkilloLogo`) |
| Favicon | `app/icon.svg` |
| Ikona pre iPhone (180 px) | `app/apple-icon.tsx` |
| Farby a písmo | `app/globals.css` |

## Pravidlá

- **Značka S:** dvaja študenti si podávajú bod. Horný oblúk je čierny, bod v strede, dolný oblúk ružový. Na ružovej ploche (app ikona) je dolný oblúk biely.
- **Pod 64 px** používaj `<SkilloMark small />`: hrubší ťah a bez bodu, inak sa bod zleje so znakom.
- **Wordmark „skillo“** je Bricolage Grotesque 800 (`font-logo`). Toto písmo je len pre logo, texty webu sú Inter / Inter Tight.
- **Pri bodoch** sa môže dať malá značka S pred číslo (napr. „60 min · S 8 bodov“).

| Farba | Hex |
|---|---|
| Ink | `#121117` |
| Pink | `#FF7AAC` |
| Soft pink | `#FFE3EE` |
| Muted | `#63627A` |
