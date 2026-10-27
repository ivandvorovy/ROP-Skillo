# Skillo backend: ako to funguje a prečo

Platforma na komunitnú výmenu zručností medzi študentmi za interné body (nie peniaze). Tento zip obsahuje **serverovú časť**: Next.js API routes + Firebase Admin SDK (Auth + Firestore), nasadenie na Vercel. Nie je tu žiadne UI, `package.json` ani `firestore.rules` (viď sekcia "Čo v zipe chýba").

---

## 1. Hlavná myšlienka (prečo je to postavené takto)

Firestore nemá JOINy ani cudzie kľúče a klient (prehliadač) je nedôveryhodný. Preto:

- **Všetko, čo hýbe bodmi, robí iba server** cez Admin SDK (ten obchádza Firestore security rules).
- **Klient nikdy neposiela svoje uid.** Server ho berie z overeného Firebase ID tokenu (`lib/auth.ts`).
- **Každá zmena bodov je Firestore transakcia** (`runTransaction`). Bez nej by dvojklik alebo dve karty prehliadača minuli tie isté body dvakrát.
- **Každá zmena bodov zanechá záznam** v `points_transactions` (append-only audit).

---

## 2. Štruktúra súborov

```
.env.example                              premenné prostredia (bez tajomstiev)
vercel.json                               denný cron
lib/
  firebase-admin.ts                       inicializácia Admin SDK (len server)
  firebase-client.ts                      inicializácia Firebase v prehliadači (len Auth)
  auth.ts                                 requireUser / requireAdmin
  http.ts                                 HttpError + handle() wrapper
  api-client.ts                           funkcie pre prehliadač, ktoré volajú API
  points.ts                               JADRO: všetka logika bodov a lekcií
app/api/
  auth/register/route.ts                  registrácia (školská doména)
  auth/welcome-bonus/route.ts             pripísanie 35 bodov po overení e-mailu
  lessons/route.ts                        žiadosť o lekciu (zablokuje body)
  lessons/[lessonId]/complete/route.ts    potvrdenie "lekcia prebehla"
  lessons/[lessonId]/cancel/route.ts      zrušenie, vrátenie bodov
  documents/[documentId]/purchase/route.ts  nákup dokumentu za body
  admin/lessons/[lessonId]/resolve/route.ts rozhodnutie admina o spore
  cron/dispute-overdue/route.ts           denné presúvanie nepotvrdených lekcií do sporu
```

### `.env.example`
- `FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY`: service account, **tajné**, len server. Kľúč sa vkladá s `\n` namiesto nových riadkov (`firebase-admin.ts` ich vracia späť).
- `SCHOOL_EMAIL_DOMAIN`: povolená doména e-mailu (napr. `skola.sk`).
- `NEXT_PUBLIC_FIREBASE_*`: verejná konfigurácia webovej appky, smie byť v prehliadači.
- `CRON_SECRET`: tajný reťazec, ktorým sa overuje volanie cronu.

### `vercel.json`
Raz denne o 06:00 UTC zavolá `/api/cron/dispute-overdue`.

### `lib/firebase-admin.ts`
Inicializuje Admin SDK a exportuje `adminAuth` a `adminDb`. Kontrola `getApps()[0]` je tu preto, že Next.js v dev režime načíta modul viackrát a `initializeApp` by padol na "app already exists".

### `lib/firebase-client.ts`
Inicializuje Firebase v prehliadači, exportuje len `auth`. Konfigurácia je verejná, bezpečnosť zabezpečuje server.

### `lib/auth.ts`
- `requireUser(req)`: vytiahne `Authorization: Bearer <token>`, overí ho cez `verifyIdToken`, vráti `{ uid }`. Ak niečo nesedí, 401.
- `requireAdmin(req)`: to isté a navyše načíta `users/{uid}.role` z Firestore, musí byť `'admin'`. Admina nastavíš **ručne vo Firebase konzole**.

### `lib/http.ts`
- `HttpError(status, message)`: chyba s HTTP kódom (napr. 402 "Nedostatok bodov").
- `handle(fn, successStatus)`: obalí každú route. Úspech pošle ako JSON, `HttpError` pošle s jeho kódom, **iné chyby zaloguje a klientovi pošle len všeobecné 500** (interné detaily sa neprezrádzajú).

### `lib/api-client.ts` (prehliadač)
- `authedPost(url, body)`: POST s čerstvým ID tokenom.
- `registerStudent(...)`: zavolá `/api/auth/register`, potom prihlási používateľa a cez Firebase pošle overovací e-mail (Admin SDK e-maily posielať nevie, len generovať odkazy).
- `claimWelcomeBonus()`: `user.reload()` (stiahne aktuálne `emailVerified`) a potom `/api/auth/welcome-bonus`.

### `lib/points.ts` (jadro)
Jediné miesto, ktoré smie meniť body. Funkcie:

| Funkcia | Čo robí |
|---|---|
| `calculateLessonPrice` | cena = `ceil(min/15 × 2 × koeficient)`, koeficient easy 1 / medium 1.5 / hard 2. **Placeholder**, vzorec treba dohodnúť s Filipom a konzultantom |
| `grantWelcomeBonus` | +35 bodov, nastaví `welcomeBonusGranted`, druhý pokus = 409 |
| `requestLesson` | validuje vstup, vytvorí lekciu `requested`, presunie body `pointsBalance → pointsHeld`, zapíše `lesson_hold` |
| `confirmLessonCompleted` | prvé potvrdenie len zapíše časovú značku, druhé (od druhej strany) lekciu uzavrie a pripíše body učiteľovi |
| `cancelLesson` | plná refundácia študentovi, zrušiť sa nedá, ak už niekto potvrdil |
| `purchaseDocument` | kúpa dokumentu, body idú autorovi |
| `markOverdueLessonsDisputed` | `confirmed` lekcie po 72 h od konca bez oboch potvrdení → `disputed` |
| `resolveDispute` | admin: `pay_tutor` alebo `refund_student` |

Pravidlo Firestore transakcií: **najprv všetky čítania (`tx.get`), potom zápisy**. Preto je v kóde vždy blok čítaní a potom blok zápisov.

### Routes
Sú to tenké obaly: overia používateľa, vytiahnu parametre a zavolajú funkciu z `points.ts`. Logika v nich nie je.

---

## 3. Tok bodov krok za krokom

1. **Registrácia** (`/api/auth/register`): server skontroluje doménu e-mailu, vytvorí účet v Auth a profil `users/{uid}` s **0 bodmi**. Ak zápis profilu zlyhá, účet sa zmaže, aby nezostal účet bez profilu.
2. **Overenie e-mailu**: klient pošle overovací e-mail. Po kliknutí na odkaz zavolá `claimWelcomeBonus()`.
3. **Uvítací bonus** (`/api/auth/welcome-bonus`): stav overenia sa berie z `adminAuth.getUser()`, **nie z tokenu** (token má `email_verified` zamrznuté na čas vydania, hneď po overení by ešte hovoril `false`). Potom +35 bodov, raz.
4. **Žiadosť o lekciu** (`POST /api/lessons`): server vypočíta cenu, v jednej transakcii vytvorí lekciu `requested` a zablokuje body. Ak nie sú body, 402.
5. **Potvrdenie učiteľom** (`requested → confirmed`, vytvorenie JaaS miestnosti): **v tomto zipe nie je**, je to Filipova časť.
6. **Po skončení lekcie** volá `complete` študent aj učiteľ každý zvlášť. Druhé potvrdenie nastaví `completed`, zníži študentovi `pointsHeld`, zvýši učiteľovi `pointsBalance` a zapíše `lesson_earned`. Odpoveď `{ completed: false }` znamená "čaká sa na druhú stranu".
7. **Ak nepotvrdia obaja do 72 h** (`DISPUTE_AFTER_HOURS`): cron presunie lekciu do `disputed`, body ostanú zablokované a vznikne záznam v `reports` (`dispute_{lessonId}`, `reason: 'unconfirmed_lesson'`, `confirmedBy`: student / tutor / none). Admin rozhodne cez `resolve`, ktoré uzavrie lekciu aj report.
8. **Zrušenie**: `lesson_refund`, body sa vrátia študentovi.
9. **Nákup dokumentu**: záznam `document_purchases/{documentId}_{buyerId}`. Dvojitý nákup nejde, lebo druhá transakcia nájde existujúci záznam.

Stavy lekcie: `requested → confirmed → completed`, vedľajšie vetvy `cancelled`, `disputed`. Stavy `no_show_student` a `no_show_tutor` sú v type, ale **zatiaľ ich nič nenastavuje**.

---

## 4. Čo v zipe chýba

- **`firestore.rules` a `storage.rules`**: komentáre na ne odkazujú, v zipe nie sú. Bez nich je celá bezpečnosť len na polovicu. Kľúčové je, aby klient nemohol zapisovať `pointsBalance`, `pointsHeld`, `role`, `welcomeBonusGranted` ani `lessons`.
- **Potvrdenie lekcie učiteľom** a JaaS miestnosť.
- **Zobrazenie dokumentu s watermarkom**, nahrávanie dokumentov.
- **Hodnotenia** (`reviews`, prepočet `ratingAvg`), **nahlásenia** (`reports`).
- **Pripomienky 24 h pred lekciou**.
- **`package.json`, `tsconfig.json`, UI**: zip je modul na vloženie do Next.js 15 projektu (v routes je `params` ako `Promise`).

---

## 5. Známe slabé miesta v existujúcom kóde

1. **Zrušenie po skončení lekcie** je už zakázané (`cancelLesson` kontroluje `endsAt`). Dôsledok: ak sa študent nedostaví, učiteľ musí počkať na spor a admina. Samostatné tlačidlo "nedostavil sa" (`no_show_*`) zatiaľ nie je.
2. **`requestLesson` nekontroluje, či učiteľ danú zručnosť ponúka** (`offeredSkillIds`) ani kolízie termínov. Študent môže požiadať kohokoľvek o čokoľvek.
3. **Žiadosť, ktorú učiteľ nikdy nepotvrdí**, drží body zablokované, kým ju študent sám nezruší. Cron rieši len `confirmed`.
4. **Registrácia nemá rate limit.** Kto pozná doménu školy, môže hromadne vytvárať účty. Bonus síce vyžaduje overený e-mail, ale účty a e-maily vzniknú.
5. **Vypni verejnú registráciu vo Firebase Auth**, inak sa školská doména dá obísť priamym volaním Firebase API (viď komentár v `register/route.ts`).
6. **`firebase-admin.ts` hádže chybu pri importe**, ak chýbajú env premenné. Pri `next build` bez nich build spadne.
7. **Vzorec ceny je placeholder**, rovnako ako ostatné otvorené body v schéme (pravidlá zrušenia, výmena zručnosť za zručnosť, viditeľnosť zostatku).

---

## 6. Ako to lokálne rozbehnúť

1. Skopíruj `.env.example` na `.env.local` a vyplň hodnoty (nikdy necommituj).
2. Vo Firebase konzole vytvor service account, zapni Email/Password, vypni sign-up pre klientov.
3. Nastav `role: 'admin'` ručne vo Firestore na svojom `users/{uid}`.
4. Na Verceli nastav rovnaké env premenné vrátane `CRON_SECRET` (Vercel ho pri cron volaní pošle sám v hlavičke).
5. Nasaď `firestore.indexes.json` (`firebase deploy --only firestore:indexes`). Bez indexov padnú dotazy na kalendár a históriu.
