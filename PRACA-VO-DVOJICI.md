# Skillo: ako pracovať vo dvojici cez Git

Platí pre Ivana a Filipa. Repo: `ROP-Skillo` na GitHube.

---

## 1. Hlavné pravidlo

**Nikto nepushuje priamo na `main`.** Každý robí na vlastnej vetve a na `main` sa to dostane cez Pull request (PR).

Prečo: `main` má byť vždy v stave, ktorý funguje a dá sa nasadiť. Ak obaja pushujete rovno naň, skôr či neskôr si navzájom prepíšete prácu a nebude jasné, kto čo pokazil.

```
main        ●────────●──────────●──────────●   (vždy funkčný)
             \      / \        /
ivan/credits  ●──●──●   \      /
                         \    /
filip/calendar            ●──●
```

---

## 2. Jednorazové nastavenie

**Ivan (owner repa):**
1. GitHub → repo → Settings → Collaborators → Add people → Filip.
2. Voliteľne: Settings → Branches → Add rule pre `main`: *Require a pull request before merging*. Na súkromnom repe to na bezplatnom účte nemusí byť dostupné [Likely]. Ak voľba chýba, drž sa pravidla z bodu 1 disciplínou.

**Filip:**
```powershell
git clone https://github.com/ivandvorovy/ROP-Skillo.git
cd ROP-Skillo
npm install
copy .env.example .env.local     # vyplniť hodnoty, nikdy necommitovať
```
Filip sa musí prihlásiť do GitHubu pod účtom, ktorý dostal pozvánku (prijať ju v e-maile alebo na `github.com/notifications`).

---

## 3. Denný postup (každá nová úloha)

### a) Začni od čerstvého `main`
```powershell
git checkout main
git pull origin main
```

### b) Vytvor si vetvu pre úlohu
```powershell
git checkout -b ivan/credits-cancel-fix
```
Pomenovanie: `meno/čo-robím`, malými písmenami, pomlčky. Príklady: `filip/calendar-view`, `ivan/review-api`.

### c) Pracuj a commituj často
```powershell
git add .
git status                      # skontroluj, čo ide do commitu
git commit -m "feat: add lesson cancel after end check"
```
Malé commity (jedna myšlienka = jeden commit) sa oveľa ľahšie kontrolujú a vracajú. Odporúčané predpony: `feat:` nová vec, `fix:` oprava, `docs:` dokumentácia, `refactor:` prepísanie bez zmeny správania.

### d) Pushni vetvu
```powershell
git push -u origin ivan/credits-cancel-fix
```
Pri ďalších pushoch stačí `git push`.

### e) Otvor Pull request
Na GitHube sa po pushi objaví žltý pás **Compare & pull request**. Klikni naň a:
- Base: `main`, compare: tvoja vetva.
- Napíš 2 až 3 vety: čo si zmenil a ako to otestovať.
- Priraď druhého ako reviewera.

### f) Review
Druhý otvorí **Files changed**, prečíta zmeny a buď schváli, alebo napíše komentár k riadku. Čo kontrolovať:
- Nie sú v zmenách kľúče, `.env` súbory ani `node_modules`?
- Bežia body a lekcie cez `lib/points.ts` a nie obchádzkou?
- Dá sa to spustiť (`npm run build` bez chyby)?

### g) Merge
Po schválení klikni **Squash and merge** a potvrď. Squash zlúči všetky commity vetvy do jedného čistého commitu na `main`.
Potom **Delete branch** (tlačidlo sa ukáže hneď po merge).

### h) Vráť sa na čistý `main`
```powershell
git checkout main
git pull origin main
git branch -d ivan/credits-cancel-fix
```
Ak `-d` odmietne zmazať vetvu, lebo ju nepovažuje za zlúčenú (pri squash sa to stáva), použi `-D`, ale len ak vidíš, že PR je na GitHube merged.

---

## 4. Ako držať vetvu aktuálnu

Ak pracuješ na vetve niekoľko dní, `main` sa medzitým zmenil. Raz denne do vetvy dotiahni zmeny:

```powershell
git checkout main
git pull origin main
git checkout ivan/credits-cancel-fix
git merge main
```

Ak merge prejde bez hlášky o konflikte, pokračuj ďalej. Čím dlhšie to odkladáš, tým väčší konflikt neskôr dostaneš.

---

## 5. Konflikty

Konflikt znamená, že obaja ste zmenili tie isté riadky. Git ich neurčí za vás.

1. `git merge main` vypíše `CONFLICT in <súbor>`.
2. Otvor súbor vo VS Code. Uvidíš značky:
   ```
   <<<<<<< HEAD
   tvoja verzia
   =======
   verzia z main
   >>>>>>> main
   ```
   VS Code nad nimi ponúka **Accept Current / Accept Incoming / Accept Both**. Nikdy neklikaj naslepo, prečítaj obe verzie a rozhodni, čo má zostať (často treba spojiť obe).
3. Po vyriešení všetkých súborov:
   ```powershell
   git add .
   git commit            # otvorí sa predvyplnená správa, ulož a zavri
   ```
4. Spusti projekt a skontroluj, že funguje, až potom pushni.

**Konflikt v `package-lock.json`:** nerieš ručne. Zober verziu z `main` (`git checkout --theirs package-lock.json`), potom spusti `npm install`, ktorý ho vygeneruje znova, a commitni.

---

## 6. Rozdelenie práce (aby ste sa nebili)

Konflikty vznikajú, keď obaja upravujete rovnaký súbor. Podľa špecifikácie projektu:

| Ivan | Filip |
|---|---|
| Kreditový systém (`lib/points.ts`) | Kalendár a termíny lekcií |
| Registrácia, uvítací bonus | Dokumenty: nahrávanie, watermark |
| Databáza a schéma | Hodnotenie (`reviews`) |
| Spory a admin (`reports`) | JaaS (Jitsi) video, pripomienky |

Pravidlá:
- **`lib/points.ts` mení len Ivan.** Ak Filip potrebuje novú funkciu s bodmi, napíše Ivanovi alebo otvorí issue.
- **Spoločné súbory** (`package.json`, `tsconfig.json`, `.env.example`, `firestore.rules`, `vercel.json`) menia malé PR a hneď sa zlučujú, nenechávajú sa týždeň na vetve.
- Nové API route (`app/api/...`) a stránky (`app/...`) si každý pridáva do **svojho** priečinka, tým sa nebijete.
- Ak potrebujete súbor, ktorý patrí druhému, dohodnite sa pred začatím, nie až v PR.

---

## 7. Pravidlá, ktoré sa neporušujú

1. **Žiadne tajomstvá v Gite.** `.env.local`, service account JSON a `FIREBASE_PRIVATE_KEY` do repa nikdy nepatria. Pred každým commitom:
   ```powershell
   git status
   git ls-files | Select-String -Pattern "env|serviceAccount|adminsdk"
   ```
   Smie vypísať len `.env.example`. Ak sa tajný kľúč dostane do histórie, zmazanie súboru nestačí: kľúč treba vo Firebase konzole zrušiť a vygenerovať nový.
2. **Žiadny `git push --force`** na `main` ani na cudziu vetvu. Prepíše prácu druhého bez možnosti návratu.
3. **`node_modules/` a `.next/` sa necommitujú** (sú v `.gitignore`).
4. **Malé PR.** Čím menej riadkov, tým rýchlejší a kvalitnejší review. Cieľ je do pár stoviek riadkov.
5. **Pred PR spusť `npm run build`.** Ak nepreide u teba, nepreide ani na Verceli.
6. **Zmeny schémy** (nové polia vo Firestore, indexy, rules) vždy popíš v PR a uprav `docs/firestore-schema.md`, aby druhý vedel, čo sa zmenilo.

---

## 8. Keď sa niečo pokazí

| Situácia | Riešenie |
|---|---|
| Commitol si na `main` namiesto vetvy (ešte nepushnuté) | `git branch ivan/oprava` (vytvorí vetvu s commitmi), `git reset --hard origin/main` (vráti `main` späť), `git checkout ivan/oprava` |
| Potrebuješ prepnúť vetvu, ale máš rozrobené zmeny | `git stash`, prepni vetvu, neskôr `git stash pop` |
| Chceš zahodiť všetky neuložené zmeny v súbore | `git checkout -- cesta/k/suboru` (nevratné) |
| Zlúčený PR rozbil `main` | Na GitHube otvor zlúčený PR a klikni **Revert**, vytvorí sa nový PR, ktorý zmenu vráti |
| Nevieš, v akom si stave | `git status` a `git log --oneline -5` |
| Push hlási "rejected, non-fast-forward" | Niekto pushol pred tebou: `git pull` (alebo `git merge main`), vyrieš konflikty a pushni znova |

---

## 9. Vercel (ak ho napojíte)

- Production branch nastav na `main`.
- Každý PR dostane automaticky vlastnú **preview URL**. Použite ju pri review na vyskúšanie zmien bez lokálneho spúšťania.
- Env premenné (Firebase kľúče, `CRON_SECRET`) nastavte v nastaveniach Vercel projektu, nie v repe.

---

## 10. Rýchla ťaháčka

```powershell
# Začiatok úlohy
git checkout main
git pull origin main
git checkout -b meno/uloha

# Počas práce
git add .
git status
git commit -m "feat: popis"
git push -u origin meno/uloha

# Dotiahnutie zmien z main do mojej vetvy
git checkout main
git pull origin main
git checkout meno/uloha
git merge main

# Po zlúčení PR
git checkout main
git pull origin main
git branch -d meno/uloha
```