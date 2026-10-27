// lib/points.ts
// Kreditový systém Skillo (body). JEDINÉ miesto, ktoré smie meniť body.
//
// Pravidlá zo špecifikácie:
//  - nový používateľ po overení e-mailu dostane 35 bodov (jednorazovo),
//  - pri žiadosti o lekciu sa body študentovi ZABLOKUJÚ (pointsBalance -> pointsHeld),
//  - učiteľovi sa body pripíšu až keď OBAJA (študent aj učiteľ) potvrdia, že lekcia prebehla,
//  - body sa nedajú previesť na iný účet (menia sa len cez lekciu alebo nákup dokumentu).
//
// Prečo všade runTransaction: každá operácia číta zostatok a podľa neho zapisuje.
// Bez transakcie by dve súbežné požiadavky (dvojklik, dve karty prehliadača) mohli
// minúť tie isté body dvakrát. Transakcia sa pri konflikte sama zopakuje.
//
// Pravidlo Firestore transakcií: najprv VŠETKY čítania (tx.get), potom zápisy.

import { FieldValue, Timestamp, type Transaction } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { HttpError } from '@/lib/http';

// ---------------------------------------------------------------------------
// Konštanty a cena lekcie
// ---------------------------------------------------------------------------

export const WELCOME_BONUS_POINTS = 35;

export type Difficulty = 'easy' | 'medium' | 'hard';

// POZOR: toto je PLACEHOLDER. Spec hovorí len, že cena závisí od dĺžky a náročnosti.
// Presný vzorec treba dohodnúť s Filipom a konzultantom, zmeníš ho len tu.
const POINTS_PER_15_MIN = 2;
const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2,
};

// Príklad: 60 min, easy = 8 bodov; 60 min, hard = 16 bodov.
// Math.ceil zaručí celé číslo (Firestore rules aj zvyšok kódu počítajú s celými bodmi).
export function calculateLessonPrice(durationMin: number, difficulty: Difficulty): number {
  return Math.ceil((durationMin / 15) * POINTS_PER_15_MIN * DIFFICULTY_MULTIPLIER[difficulty]);
}

// ---------------------------------------------------------------------------
// Typy dokumentov (len polia, ktoré tu čítame)
// ---------------------------------------------------------------------------

interface UserDoc {
  pointsBalance: number; // dostupné body
  pointsHeld: number; // zablokované body (čakajú na lekciu)
  welcomeBonusGranted: boolean;
}

interface LessonDoc {
  tutorId: string;
  studentId: string;
  pricePoints: number;
  status:
    | 'requested'
    | 'confirmed'
    | 'completed'
    | 'cancelled'
    | 'disputed'
    | 'no_show_student'
    | 'no_show_tutor';
  endsAt: Timestamp;
  // Kedy potvrdil danú stranu, že lekcia prebehla (null = ešte nepotvrdil).
  studentConfirmedAt?: Timestamp | null;
  tutorConfirmedAt?: Timestamp | null;
}

interface DocumentDoc {
  ownerId: string;
  pricePoints: number;
  status: 'active' | 'removed';
}

type PointsTxType =
  | 'signup_bonus'
  | 'lesson_hold'
  | 'lesson_earned'
  | 'lesson_refund'
  | 'document_purchase'
  | 'document_sale';

// ---------------------------------------------------------------------------
// Pomocné funkcie
// ---------------------------------------------------------------------------

// Zapíše záznam do histórie bodov (points_transactions). Je append-only:
// záznamy sa nikdy nemenia ani nemažú, slúžia ako audit.
function recordTx(
  tx: Transaction,
  data: { userId: string; amount: number; type: PointsTxType; lessonId?: string; documentId?: string },
) {
  tx.set(adminDb.collection('points_transactions').doc(), {
    userId: data.userId,
    lessonId: data.lessonId ?? null,
    documentId: data.documentId ?? null,
    amount: data.amount, // + prírastok, - výdavok
    type: data.type,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// Načíta používateľa v rámci transakcie, alebo vyhodí 404.
async function readUser(tx: Transaction, uid: string) {
  const ref = adminDb.collection('users').doc(uid);
  const snap = await tx.get(ref);
  if (!snap.exists) throw new HttpError(404, 'Používateľ neexistuje');
  return { ref, data: snap.data() as UserDoc };
}

// ---------------------------------------------------------------------------
// 1) Uvítací bonus
// ---------------------------------------------------------------------------

// Volá sa až keď route overí, že e-mail je potvrdený.
// Príznak welcomeBonusGranted zaručí, že bonus dostane každý najviac raz,
// aj keby klient poslal požiadavku 10-krát naraz.
export async function grantWelcomeBonus(uid: string): Promise<void> {
  await adminDb.runTransaction(async (tx) => {
    const user = await readUser(tx, uid);
    if (user.data.welcomeBonusGranted) {
      throw new HttpError(409, 'Uvítací bonus už bol pripísaný');
    }

    tx.update(user.ref, {
      pointsBalance: user.data.pointsBalance + WELCOME_BONUS_POINTS,
      welcomeBonusGranted: true,
    });
    recordTx(tx, { userId: uid, amount: WELCOME_BONUS_POINTS, type: 'signup_bonus' });
  });
}

// ---------------------------------------------------------------------------
// 2) Žiadosť o lekciu = vytvorenie lekcie + zablokovanie bodov
// ---------------------------------------------------------------------------

export interface RequestLessonInput {
  studentId: string; // uid z tokenu, nie z tela požiadavky
  tutorId: string;
  skillId: string;
  startsAt: Date;
  durationMin: number;
  difficulty: Difficulty;
}

// Lekcia a zablokovanie bodov sa musia stať naraz: ak by vznikla lekcia bez
// zablokovaných bodov, študent by mohol "rezervovať zadarmo". Preto jedna transakcia.
// Kalendár (kolízie termínov, potvrdenie učiteľom, JaaS miestnosť) je Filipova časť
// a nadväzuje na lekciu so stavom 'requested'.
export async function requestLesson(
  input: RequestLessonInput,
): Promise<{ lessonId: string; pricePoints: number }> {
  const { studentId, tutorId, skillId, startsAt, durationMin, difficulty } = input;

  // Validácia vstupu (na serveri vždy, klientovi sa neverí).
  if (!studentId || !tutorId || !skillId) throw new HttpError(400, 'Chýbajú povinné údaje');
  if (studentId === tutorId) throw new HttpError(400, 'Nemôžeš si rezervovať vlastnú lekciu');
  if (!(difficulty in DIFFICULTY_MULTIPLIER)) throw new HttpError(400, 'Neplatná náročnosť');
  if (!Number.isInteger(durationMin) || durationMin < 15 || durationMin > 240 || durationMin % 15 !== 0) {
    throw new HttpError(400, 'Dĺžka lekcie musí byť 15 až 240 minút po 15 minútach');
  }
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
    throw new HttpError(400, 'Termín musí byť v budúcnosti');
  }

  const pricePoints = calculateLessonPrice(durationMin, difficulty);
  const endsAt = new Date(startsAt.getTime() + durationMin * 60_000);
  const lessonRef = adminDb.collection('lessons').doc();

  await adminDb.runTransaction(async (tx) => {
    // Všetky čítania najprv.
    const student = await readUser(tx, studentId);
    const tutor = await tx.get(adminDb.collection('users').doc(tutorId));
    const skill = await tx.get(adminDb.collection('skills').doc(skillId));
    if (!tutor.exists) throw new HttpError(404, 'Učiteľ neexistuje');
    if (!skill.exists) throw new HttpError(404, 'Zručnosť neexistuje');
    if (student.data.pointsBalance < pricePoints) {
      throw new HttpError(402, `Nedostatok bodov (treba ${pricePoints})`);
    }

    // Zápisy.
    tx.set(lessonRef, {
      skillId,
      tutorId,
      studentId,
      startsAt: Timestamp.fromDate(startsAt),
      endsAt: Timestamp.fromDate(endsAt),
      durationMin,
      difficulty,
      pricePoints,
      status: 'requested',
      cancelledBy: null,
      meetingRoom: null, // doplní Filipov JaaS modul po potvrdení
      reminderSentAt: null,
      studentConfirmedAt: null, // potvrdenie "lekcia prebehla" od študenta
      tutorConfirmedAt: null, // potvrdenie "lekcia prebehla" od učiteľa
      createdAt: FieldValue.serverTimestamp(),
    });

    // Presun bodov z "dostupných" do "zablokovaných". Celkový súčet sa nemení,
    // študent ich len nemôže minúť inde.
    tx.update(student.ref, {
      pointsBalance: student.data.pointsBalance - pricePoints,
      pointsHeld: student.data.pointsHeld + pricePoints,
    });
    recordTx(tx, { userId: studentId, amount: -pricePoints, type: 'lesson_hold', lessonId: lessonRef.id });
  });

  return { lessonId: lessonRef.id, pricePoints };
}

// ---------------------------------------------------------------------------
// 3) Lekcia prebehla = potvrdenie OBOMA stranami, až potom sa body uvoľnia
// ---------------------------------------------------------------------------

// Študent aj učiteľ musia (každý zvlášť) potvrdiť, že lekcia prebehla.
//  - Prvé potvrdenie len zapíše, kto potvrdil. Body sa nehýbu.
//  - Druhé potvrdenie uzavrie lekciu a uvoľní zablokované body učiteľovi.
// Prečo obaja: jedna strana sama by mohla klamať (učiteľ tvrdí "bola lekcia",
// ktorá nebola, alebo študent tvrdí "nebola", aby nezaplatil). Dve nezávislé
// potvrdenia to uzatvárajú.
// Ak niektorá strana nepotvrdí, po DISPUTE_AFTER_HOURS hodinách sa lekcia presunie
// do sporu a vznikne nahlásenie v reports pre admina (markOverdueLessonsDisputed +
// resolveDispute nižšie).
export async function confirmLessonCompleted(
  lessonId: string,
  actorId: string,
): Promise<{ completed: boolean }> {
  let completed = false;

  await adminDb.runTransaction(async (tx) => {
    // Firestore môže callback transakcie pri konflikte spustiť znova;
    // premenná mimo transakcie sa preto musí vždy vynulovať.
    completed = false;

    const lessonRef = adminDb.collection('lessons').doc(lessonId);
    const lessonSnap = await tx.get(lessonRef);
    if (!lessonSnap.exists) throw new HttpError(404, 'Lekcia neexistuje');
    const lesson = lessonSnap.data() as LessonDoc;

    const isStudent = lesson.studentId === actorId;
    const isTutor = lesson.tutorId === actorId;
    if (!isStudent && !isTutor) throw new HttpError(403, 'Nie si účastníkom lekcie');
    if (lesson.status !== 'confirmed') throw new HttpError(409, 'Lekcia nie je v stave "potvrdená"');
    // Potvrdiť sa dá až po skončení, aby nikto nepotvrdil vopred.
    if (lesson.endsAt.toMillis() > Date.now()) throw new HttpError(409, 'Lekcia ešte neskončila');

    const has = (v: Timestamp | null | undefined) => v != null;
    const myField = isStudent ? 'studentConfirmedAt' : 'tutorConfirmedAt';
    const iAlreadyConfirmed = has(isStudent ? lesson.studentConfirmedAt : lesson.tutorConfirmedAt);
    const otherConfirmed = has(isStudent ? lesson.tutorConfirmedAt : lesson.studentConfirmedAt);

    if (iAlreadyConfirmed) throw new HttpError(409, 'Túto lekciu si už potvrdil');

    // Prvé potvrdenie: len ho zapíš, body sa nemenia.
    if (!otherConfirmed) {
      tx.update(lessonRef, { [myField]: FieldValue.serverTimestamp() });
      return;
    }

    // Druhé potvrdenie: obaja súhlasia, uvoľni body. Všetky čítania pred zápismi.
    const student = await readUser(tx, lesson.studentId);
    const tutor = await readUser(tx, lesson.tutorId);
    if (student.data.pointsHeld < lesson.pricePoints) {
      // Nemalo by nastať; ak áno, dáta sú nekonzistentné a radšej nič nezapíšeme.
      throw new HttpError(500, 'Nekonzistentné zablokované body');
    }

    tx.update(lessonRef, { status: 'completed', [myField]: FieldValue.serverTimestamp() });
    tx.update(student.ref, { pointsHeld: student.data.pointsHeld - lesson.pricePoints });
    tx.update(tutor.ref, { pointsBalance: tutor.data.pointsBalance + lesson.pricePoints });
    recordTx(tx, {
      userId: lesson.tutorId,
      amount: lesson.pricePoints,
      type: 'lesson_earned',
      lessonId,
    });
    completed = true;
  });

  return { completed };
}

// ---------------------------------------------------------------------------
// 4) Zrušenie lekcie = vrátenie bodov študentovi
// ---------------------------------------------------------------------------

// Zatiaľ vždy plná refundácia. Pravidlá zrušenia a nedostavenia sa (napr. neskoré
// zrušenie prepadne učiteľovi) sú v špecifikácii Filipova časť; dopíšu sa sem,
// kam ukazuje komentár nižšie.
export async function cancelLesson(lessonId: string, actorId: string): Promise<void> {
  await adminDb.runTransaction(async (tx) => {
    const lessonRef = adminDb.collection('lessons').doc(lessonId);
    const lessonSnap = await tx.get(lessonRef);
    if (!lessonSnap.exists) throw new HttpError(404, 'Lekcia neexistuje');
    const lesson = lessonSnap.data() as LessonDoc;

    if (lesson.studentId !== actorId && lesson.tutorId !== actorId) {
      throw new HttpError(403, 'Nie si účastníkom lekcie');
    }
    if (lesson.status !== 'requested' && lesson.status !== 'confirmed') {
      throw new HttpError(409, 'Túto lekciu už nie je možné zrušiť');
    }
    // Po skončení lekcie sa už nedá zrušiť: ostáva len potvrdenie oboma stranami,
    // alebo po lehote spor u admina. Inak by študent po absolvovanej lekcii mohol
    // zrušiť a dostať body späť skôr, než učiteľ stihne potvrdiť.
    if (lesson.endsAt.toMillis() <= Date.now()) {
      throw new HttpError(409, 'Lekcia už skončila. Potvrď ju, alebo počkaj na rozhodnutie admina');
    }
    // Ak už niekto potvrdil, že lekcia prebehla, zrušiť ju nejde (inak by sa dal obísť spor).
    if (lesson.studentConfirmedAt != null || lesson.tutorConfirmedAt != null) {
      throw new HttpError(409, 'Lekcia už bola jednou stranou potvrdená ako uskutočnená');
    }

    const student = await readUser(tx, lesson.studentId);
    if (student.data.pointsHeld < lesson.pricePoints) {
      throw new HttpError(500, 'Nekonzistentné zablokované body');
    }

    // TU pribudnú pravidlá neskorého zrušenia (napr. ak lesson.status === 'confirmed'
    // a do začiatku zostáva menej ako X hodín, časť bodov pripísať učiteľovi).

    tx.update(lessonRef, { status: 'cancelled', cancelledBy: actorId });
    tx.update(student.ref, {
      pointsHeld: student.data.pointsHeld - lesson.pricePoints,
      pointsBalance: student.data.pointsBalance + lesson.pricePoints,
    });
    recordTx(tx, {
      userId: lesson.studentId,
      amount: lesson.pricePoints,
      type: 'lesson_refund',
      lessonId,
    });
  });
}

// ---------------------------------------------------------------------------
// 5) Nákup dokumentu
// ---------------------------------------------------------------------------

// Body idú autorovi okamžite (predpoklad; spec to neurčuje, treba potvrdiť).
// Záznam o nákupe má ID "{documentId}_{buyerId}", takže dvojitý nákup je nemožný
// aj pri súbežných požiadavkách: druhá transakcia už nájde existujúci záznam.
export async function purchaseDocument(buyerId: string, documentId: string): Promise<{ pricePaid: number }> {
  let pricePaid = 0;

  await adminDb.runTransaction(async (tx) => {
    const docRef = adminDb.collection('documents').doc(documentId);
    const purchaseRef = adminDb.collection('document_purchases').doc(`${documentId}_${buyerId}`);

    const docSnap = await tx.get(docRef);
    if (!docSnap.exists) throw new HttpError(404, 'Dokument neexistuje');
    const document = docSnap.data() as DocumentDoc;
    if (document.status !== 'active') throw new HttpError(410, 'Dokument už nie je v predaji');
    if (document.ownerId === buyerId) throw new HttpError(400, 'Vlastný dokument si nemôžeš kúpiť');

    const purchaseSnap = await tx.get(purchaseRef);
    if (purchaseSnap.exists) throw new HttpError(409, 'Tento dokument už máš kúpený');

    const buyer = await readUser(tx, buyerId);
    const seller = await readUser(tx, document.ownerId);
    if (buyer.data.pointsBalance < document.pricePoints) {
      throw new HttpError(402, `Nedostatok bodov (treba ${document.pricePoints})`);
    }

    pricePaid = document.pricePoints;

    tx.set(purchaseRef, {
      documentId,
      buyerId,
      sellerId: document.ownerId,
      pricePaid,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(docRef, { purchasesCount: FieldValue.increment(1) });
    tx.update(buyer.ref, { pointsBalance: buyer.data.pointsBalance - pricePaid });
    tx.update(seller.ref, { pointsBalance: seller.data.pointsBalance + pricePaid });

    // Pri cene 0 nezapisujeme transakcie so sumou 0 (nemajú v histórii zmysel).
    if (pricePaid > 0) {
      recordTx(tx, { userId: buyerId, amount: -pricePaid, type: 'document_purchase', documentId });
      recordTx(tx, { userId: document.ownerId, amount: pricePaid, type: 'document_sale', documentId });
    }
  });

  return { pricePaid };
}

// ---------------------------------------------------------------------------
// 6) Spory: lehota na potvrdenie a rozhodnutie admina
// ---------------------------------------------------------------------------

// Koľko hodín po skončení lekcie majú obe strany čas potvrdiť, že prebehla.
// Po uplynutí sa lekcia, ktorú nepotvrdili obaja, presunie do stavu 'disputed'
// a body ostanú zablokované, kým nerozhodne admin.
export const DISPUTE_AFTER_HOURS = 72;

// Spúšťa ju plánovač (Vercel Cron, route /api/cron/dispute-overdue).
// Nájde potvrdené lekcie, ktoré skončili pred viac ako DISPUTE_AFTER_HOURS hodinami
// a ešte nie sú 'completed' (tie, čo obaja potvrdili, už majú iný stav a dotaz ich
// nevráti). Spracúva max. 200 lekcií na jedno spustenie; zvyšok príde pri ďalšom.
export async function markOverdueLessonsDisputed(): Promise<{ disputed: number }> {
  const cutoff = Timestamp.fromMillis(Date.now() - DISPUTE_AFTER_HOURS * 3_600_000);
  const overdue = await adminDb
    .collection('lessons')
    .where('status', '==', 'confirmed')
    .where('endsAt', '<=', cutoff)
    .limit(200)
    .get();

  let disputed = 0;
  for (const doc of overdue.docs) {
    // Každá lekcia vo vlastnej transakcii a so zopakovanou kontrolou stavu:
    // medzi dotazom a zápisom mohol niekto práve dať druhé potvrdenie
    // (lekcia je už 'completed') a to by sme prepísali.
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(doc.ref);
      if (!snap.exists) return;
      const lesson = snap.data() as LessonDoc;
      if (lesson.status !== 'confirmed') return;

      // Kto stihol potvrdiť, pomôže adminovi pri rozhodovaní.
      const confirmedBy =
        lesson.studentConfirmedAt != null ? 'student' : lesson.tutorConfirmedAt != null ? 'tutor' : 'none';

      tx.update(doc.ref, { status: 'disputed', disputedAt: FieldValue.serverTimestamp() });
      // Fronta pre admina = kolekcia reports. ID "dispute_{lessonId}" zaručí, že pre jednu
      // lekciu vznikne najviac jedno nahlásenie (aj keby cron bežal dvakrát).
      tx.set(adminDb.collection('reports').doc(`dispute_${doc.id}`), {
        reporterId: 'system',
        targetType: 'lesson',
        targetId: doc.id,
        reason: 'unconfirmed_lesson',
        confirmedBy, // 'student' | 'tutor' | 'none'
        status: 'open',
        createdAt: FieldValue.serverTimestamp(),
      });
      disputed += 1;
    });
  }
  return { disputed };
}

export type DisputeResolution = 'pay_tutor' | 'refund_student';

// Rozhodnutie admina o spornej lekcii:
//  - 'pay_tutor': lekcia sa konala, body idú učiteľovi,
//  - 'refund_student': lekcia sa nekonala, body sa vrátia študentovi.
// Volá sa len z admin route; kto je admin, kontroluje requireAdmin (lib/auth.ts).
export async function resolveDispute(
  lessonId: string,
  adminId: string,
  resolution: DisputeResolution,
): Promise<void> {
  if (resolution !== 'pay_tutor' && resolution !== 'refund_student') {
    throw new HttpError(400, 'Neplatné rozhodnutie');
  }

  await adminDb.runTransaction(async (tx) => {
    const lessonRef = adminDb.collection('lessons').doc(lessonId);
    const lessonSnap = await tx.get(lessonRef);
    if (!lessonSnap.exists) throw new HttpError(404, 'Lekcia neexistuje');
    const lesson = lessonSnap.data() as LessonDoc;
    if (lesson.status !== 'disputed') throw new HttpError(409, 'Lekcia nie je v stave sporu');

    const student = await readUser(tx, lesson.studentId);
    const tutor = await readUser(tx, lesson.tutorId);
    // Aj toto čítanie musí byť pred zápismi.
    const reportRef = adminDb.collection('reports').doc(`dispute_${lessonId}`);
    const reportSnap = await tx.get(reportRef);
    if (student.data.pointsHeld < lesson.pricePoints) {
      throw new HttpError(500, 'Nekonzistentné zablokované body');
    }

    // Zaznamenáme, kto a ako spor vyriešil (audit).
    const audit = { resolvedBy: adminId, resolution, resolvedAt: FieldValue.serverTimestamp() };

    // Nahlásenie vo fronte admina sa uzavrie spolu s lekciou.
    if (reportSnap.exists) {
      tx.update(reportRef, { status: 'resolved', resolvedBy: adminId, resolvedAt: FieldValue.serverTimestamp() });
    }

    // V oboch prípadoch sa študentovi zablokované body odoberú z pointsHeld;
    // líši sa len to, kam putujú (učiteľovi, alebo späť študentovi).
    if (resolution === 'pay_tutor') {
      tx.update(student.ref, { pointsHeld: student.data.pointsHeld - lesson.pricePoints });
      tx.update(lessonRef, { status: 'completed', ...audit });
      tx.update(tutor.ref, { pointsBalance: tutor.data.pointsBalance + lesson.pricePoints });
      recordTx(tx, { userId: lesson.tutorId, amount: lesson.pricePoints, type: 'lesson_earned', lessonId });
    } else {
      tx.update(lessonRef, { status: 'cancelled', cancelledBy: adminId, ...audit });
      tx.update(student.ref, {
        pointsHeld: student.data.pointsHeld - lesson.pricePoints,
        pointsBalance: student.data.pointsBalance + lesson.pricePoints,
      });
      recordTx(tx, { userId: lesson.studentId, amount: lesson.pricePoints, type: 'lesson_refund', lessonId });
    }
  });
}
