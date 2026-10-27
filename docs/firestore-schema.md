# Skillo: Firestore schéma

Zdroj pravdy pre štruktúru dát. Každá zmena polí, indexov alebo rules sa píše sem v tom istom PR.

**Značky:**
- `[kód]` = pole alebo pravidlo, ktoré existuje v kóde (`lib/points.ts`, `register/route.ts`). Zmena = zmena kódu.
- `[návrh]` = ešte nie je v kóde, treba odsúhlasiť (Ivan + Filip) a až potom implementovať.

**Základné pravidlá:**
- Body (`pointsBalance`, `pointsHeld`) a `role`, `welcomeBonusGranted` mení **len server** cez Admin SDK. Klient ich nikdy nezapisuje.
- Všetky ID používateľov sú Firebase Auth `uid`. Klient svoje uid neposiela, server ho berie z tokenu.
- Čas = Firestore `Timestamp`. Body = celé čísla.

---

## users/{uid} `[kód]`

Vytvára `POST /api/auth/register`.

| Pole | Typ | Poznámka |
|---|---|---|
| displayName | string | |
| bio | string | default `''` |
| role | `'user' \| 'admin'` | admina nastavuje ručne Ivan vo Firebase konzole |
| offeredSkillIds | string[] | sekcia "Ponúkam", ID z `skills` |
| wantedSkillIds | string[] | sekcia "Hľadám", ID z `skills` |
| pointsBalance | number | dostupné body, štart 0 |
| pointsHeld | number | zablokované body za lekcie čakajúce na uzavretie |
| welcomeBonusGranted | boolean | bonus 35 bodov, najviac raz |
| ratingAvg | number | `[návrh]` prepočítava server pri novom hodnotení |
| ratingCount | number | `[návrh]` rovnako |
| createdAt | Timestamp | |

Invariant: `pointsBalance >= 0` a `pointsHeld >= 0`.

---

## skills/{skillId} `[návrh]`

Kód len číta, či dokument existuje (`requestLesson`). Nič ju zatiaľ nevytvára. Navrhnuté polia:

| Pole | Typ | Poznámka |
|---|---|---|
| name | string | |
| category | string | |
| status | `'active' \| 'hidden'` | namiesto mazania |
| createdAt | Timestamp | |

Zručnosti vytvára len admin (jednotný zoznam, aby sa nerobili duplicity typu "Python" a "python").

---

## lessons/{lessonId} `[kód]`

Vytvára `POST /api/lessons`.

| Pole | Typ | Poznámka |
|---|---|---|
| skillId | string | → `skills` |
| tutorId | string | → `users` |
| studentId | string | → `users` |
| startsAt | Timestamp | |
| endsAt | Timestamp | |
| durationMin | number | |
| difficulty | `'easy' \| 'medium' \| 'hard'` | |
| pricePoints | number | vzorec ceny je placeholder |
| status | viď nižšie | |
| cancelledBy | string \| null | uid alebo admin |
| meetingRoom | string \| null | doplní Filipov JaaS modul po potvrdení |
| reminderSentAt | Timestamp \| null | Filipove pripomienky |
| studentConfirmedAt | Timestamp \| null | potvrdenie "lekcia prebehla" |
| tutorConfirmedAt | Timestamp \| null | |
| disputedAt | Timestamp | len pri sporoch |
| resolvedBy, resolution, resolvedAt | | len po rozhodnutí admina (`pay_tutor` / `refund_student`) |
| createdAt | Timestamp | |

**Stavy:** `requested → confirmed → completed`. Vedľajšie: `cancelled`, `disputed`. `no_show_student` a `no_show_tutor` sú v type, ale zatiaľ ich nič nenastavuje.

---

## points_transactions/{autoId} `[kód]`

Append-only audit. Nikdy sa nemení ani nemaže, zapisuje sa vždy v rovnakej transakcii ako zmena bodov.

| Pole | Typ |
|---|---|
| userId | string |
| lessonId | string \| null |
| documentId | string \| null |
| amount | number (záporné = výdaj) |
| type | `signup_bonus`, `lesson_hold`, `lesson_earned`, `lesson_refund`, `document_purchase`, `document_sale` |
| createdAt | Timestamp |

---

## documents/{documentId} `[kód čiastočne]`

Kód používa len: `ownerId`, `pricePoints`, `status` (`'active' \| 'removed'`), `purchasesCount`. Zvyšok je `[návrh]` pre Filipovu časť (nahrávanie, watermark):

| Pole | Typ | Poznámka |
|---|---|---|
| title | string | `[návrh]` |
| description | string | `[návrh]` |
| skillId | string | `[návrh]` → `skills` |
| storagePath | string | `[návrh]` cesta v Storage, nikdy verejná URL |
| purchasesCount | number | `[kód]` |
| createdAt | Timestamp | `[návrh]` |

## document_purchases/{documentId}_{buyerId} `[kód]`

ID zaručuje, že dokument sa dá kúpiť najviac raz. Polia: `documentId`, `buyerId`, `sellerId`, `pricePaid`, `createdAt`.

---

## reports/{reportId} `[kód čiastočne]`

Fronta pre admina. Systémové spory majú ID `dispute_{lessonId}` (najviac jeden na lekciu).

| Pole | Typ | Poznámka |
|---|---|---|
| reporterId | string | `'system'` pri automatických sporoch |
| targetType | string | zatiaľ `'lesson'` |
| targetId | string | |
| reason | string | zatiaľ `'unconfirmed_lesson'` |
| confirmedBy | `'student' \| 'tutor' \| 'none'` | |
| status | `'open' \| 'resolved'` | |
| createdAt | Timestamp | |
| resolvedBy, resolvedAt | | po rozhodnutí |

Používateľské nahlásenia (dokument, používateľ) zatiaľ nie sú v kóde, `[návrh]` rovnaká kolekcia s iným `reporterId` a `reason`.

---

## reviews/{reviewId} `[návrh]`

Hodnotenie učiteľa po dokončenej lekcii. Patrí Filipovi, ale schéma musí byť dohodnutá pred implementáciou.

| Pole | Typ | Poznámka |
|---|---|---|
| lessonId | string | ID dokumentu = `{lessonId}_{reviewerId}`, aby sa nedalo hodnotiť dvakrát |
| reviewerId | string | študent z lekcie |
| tutorId | string | |
| rating | number | 1 až 5, celé číslo |
| comment | string | voliteľné |
| createdAt | Timestamp | |

Zápis len cez server: overí, že lekcia je `completed` a reviewer je jej študent. Server v tej istej transakcii prepočíta `ratingAvg` a `ratingCount` na `users/{tutorId}`.

---

## Pravidlá mazania `[návrh]`

Firestore nemá cudzie kľúče, takže ich treba vynútiť disciplínou:

1. **`points_transactions`, `lessons`, `document_purchases`, `reviews`** sa nemažú nikdy.
2. **Používateľ sa nemaže, deaktivuje sa** (`status: 'deactivated'` na `users`). Mazanie by zanechalo lekcie a transakcie odkazujúce na neexistujúce uid. Zmazanie účtu na požiadanie (GDPR) = anonymizácia `displayName` a `bio`, záznamy ostávajú.
3. **Zručnosť sa nemaže, skryje sa** (`status: 'hidden'`). Existujúce lekcie a profily na ňu stále odkazujú.
4. **Dokument sa nemaže, nastaví sa `status: 'removed'`**, aby kupujúci o zakúpený obsah neprišli bez refundu (rozhodnutie o refunde je otvorené).
5. Používateľ s `pointsHeld > 0` alebo s lekciou v stave `requested`, `confirmed` alebo `disputed` sa nedá deaktivovať.

---

## Indexy (`firestore.indexes.json`) `[návrh]`

Zatiaľ nie je v repe. Kód už potrebuje:
- `lessons`: `status` (==) + `endsAt` (<=), cron `dispute-overdue`.

Kalendár a história budú potrebovať ďalšie (napr. `tutorId` + `startsAt`, `studentId` + `startsAt`). Každý nový dotaz s dvoma podmienkami doplň sem aj do súboru indexov.

---

## Otvorené otázky

- Vzorec ceny lekcie (placeholder v `calculateLessonPrice`).
- Pravidlá zrušenia a nedostavenia sa (`no_show_*`).
- Refund za odstránený dokument.
- Viditeľnosť zostatku bodov pre ostatných používateľov.
- `requestLesson` nekontroluje `offeredSkillIds` učiteľa ani kolízie termínov.