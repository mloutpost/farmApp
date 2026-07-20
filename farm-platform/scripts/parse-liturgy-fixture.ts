/**
 * Smoke-test fixture for `parseLiturgicalEmail`.
 *
 * The fixture is a trimmed real-world snapshot of the Liturgical Year
 * Project's daily email (May 10, 2026 — the Fifth Sunday after Easter
 * + St. Antoninus + Sts. Gordian and Epimachus). It exercises:
 *
 *   - Multi-entry detection (3 ALL-CAPS entry titles).
 *   - Mass *Collect* extraction with Latin/English split.
 *   - Mass readings (*Epistle* + *Gospel*) concatenation.
 *   - Reflection prose between the entry title and *MASS*.
 *   - Footer / boilerplate stripping.
 *   - Season detection from the intro.
 *
 * Run with `npm run check:parser` from `farm-platform/`. Exits 0 on
 * success, 1 on any assertion failure.
 */

import {
  parseLiturgicalEmail,
  sundayCommemorationHeadlines,
} from "../src/lib/family-dashboard/email-parser";

const FIXTURE = `Liturgical Year Project
-----------------------

From stlawrence.cc.

Visit livemass.net to watch the Mass online.

*Introduction to the Season of Paschaltide*

* Chapter 1: The History of Paschal Time
* Chapter 2: The Mystery of Paschal Time

CONTENTS:

• The Fifth Sunday after Easter
• May 10: St. Antoninus, Bishop and Confessor
• May 10 (the Same Day): Sts. Gordian and Epimachus, Martyrs

*THE FIFTH SUNDAY AFTER EASTER* ( https://example.com/sunday )

From Dom Guéranger's The Liturgical Year.

Yet four days, and our risen Jesus, whose company has been so dear and
precious to us, will have disappeared from the earth. This fifth Sunday
after Easter seems to prepare us for the separation.

But, after His Resurrection, what must these privileged men have felt,
when they perceived, as we do, that this beloved Master was soon to leave
them!

*MASS*
------

The Introit is taken from Isaias.

*Introit*

>
> Vocem jucunditatis annuntiate, et audiatur, alleluia.

>
> With the voice of joy make this to be heard, alleluia.

In the Collect, holy Church teaches us how to pray.

*Collect*

>
> Deus, a quo bona cuncta procedunt, largire supplicibus tuis: ut
> cogitemus, te inspirante, quæ recta sunt, et, te gubernante, eadem
> faciamus. Per Dominum.

>
> O God, from whom all that is good proceeds: grant that thy people, by thy
> inspiration, may resolve on what is right, and by thy direction, put it
> in practice. Through, &c.

*Of the Blessed Virgin*

>
> Concede nos famulos tuos, quæsumus Domine Deus.

>
> Grant, O Lord, we beseech thee, that we thy servants may enjoy.

*Epistle*

>
> Lectio Epistolæ beati Jacobi Apostoli. Cap. i.
>
> Charissimi, estote factores verbi, et non auditores tantum.

>
> Lesson of the Epistle of Saint James the Apostle. Ch. i.
>
> Dearly beloved: Be ye doers of the word, and not hearers only.

*Gospel*

>
> Sequentia sancti Evangelii secundum Joannem. Cap. xvi.
>
> In illo tempore: Dixit Jesus discipulis suis.

>
> Sequel of the holy Gospel according to John. Ch. xvi.
>
> At that time: Jesus said to his disciples.

[1] St. John, xvi. 16.
[2] St. Luke, xxiv. 26.

*MAY 10: ST. ANTONINUS, BISHOP AND CONFESSOR* ( https://example.com/antoninus )

From Dom Guéranger's The Liturgical Year.

THE Order of St Dominic offers him to-day one of the many bishops trained
and formed in its admirable school.

>
> Antoninus Florentiæ honestis parentibus natus.

>
> Antoninus was born at Florence, of respectable parents.

*MAY 10 (THE SAME DAY): STS. GORDIAN AND EPIMACHUS, MARTYRS* ( https://example.com/gordian )

From Dom Guéranger's The Liturgical Year.

TWO more martyrs ascend from our earth on this day and are admitted to
share in Jesus' glory.

>
> Gordianus judex, quum ad eum Januarius presbyter.

>
> During the reign of Julian the Apostate, Januarius, a priest, was
> brought before the judge, Gordian.

[1] St John xi 25.

This email message is part of the Liturgical Year Project at LYP.network.
`;

const result = parseLiturgicalEmail(FIXTURE);

console.log("Parsed result:");
console.log(JSON.stringify(result, null, 2));

const failures: string[] = [];
function assert(cond: boolean, msg: string): void {
  if (!cond) failures.push(msg);
}

// ── Sunday commemorations helper (dashboard header saints line) ────
const commLabels = sundayCommemorationHeadlines(result, 0);
assert(commLabels.length === 2, `expected 2 commemoration headlines, got ${commLabels.length}`);
assert(
  commLabels[0] === "MAY 10: ST. ANTONINUS, BISHOP AND CONFESSOR",
  `commLabels[0] — got ${JSON.stringify(commLabels[0])}`
);
assert(
  commLabels[1] === "MAY 10 (THE SAME DAY): STS. GORDIAN AND EPIMACHUS, MARTYRS",
  `commLabels[1] — got ${JSON.stringify(commLabels[1])}`
);

// ── Sunday commemorations omit when principal is not entry 0 ────────
assert(
  sundayCommemorationHeadlines(result, 1).length === 0,
  "commemorations should be omitted when primary entry index is not 0"
);

// ── Multi-entry detection ──────────────────────────────────────────
assert(result.entries.length === 3, `expected 3 entries, got ${result.entries.length}`);
assert(
  result.entries[0]?.title === "THE FIFTH SUNDAY AFTER EASTER",
  `entries[0].title — got: ${JSON.stringify(result.entries[0]?.title)}`
);
assert(
  result.entries[1]?.title === "MAY 10: ST. ANTONINUS, BISHOP AND CONFESSOR",
  `entries[1].title — got: ${JSON.stringify(result.entries[1]?.title)}`
);
assert(
  result.entries[2]?.title === "MAY 10 (THE SAME DAY): STS. GORDIAN AND EPIMACHUS, MARTYRS",
  `entries[2].title — got: ${JSON.stringify(result.entries[2]?.title)}`
);

// ── Mass detection ─────────────────────────────────────────────────
assert(result.entries[0]?.hasMass === true, "Sunday entry should have hasMass=true");
assert(result.entries[1]?.hasMass === false, "Antoninus entry should have hasMass=false");

// ── Top-level (entries[0]) backward-compat ─────────────────────────
assert(result.title === "THE FIFTH SUNDAY AFTER EASTER", `top-level title — got: ${JSON.stringify(result.title)}`);
assert(result.feast === "THE FIFTH SUNDAY AFTER EASTER", `top-level feast — got: ${JSON.stringify(result.feast)}`);

// ── Collect ────────────────────────────────────────────────────────
assert(!!result.collect, "result.collect should be populated");
assert(
  result.collect?.startsWith("O God, from whom all that is good proceeds:") ?? false,
  `result.collect should start with the English Collect — got: ${JSON.stringify(result.collect?.slice(0, 80) ?? null)}`
);
assert(!result.collect?.includes(">"), "result.collect should not contain '>' markers");
assert(!result.collect?.includes("*Collect*"), "result.collect should not contain '*Collect*'");
assert(
  !(result.collect ?? "").includes("Deus, a quo bona cuncta"),
  "result.collect (English) should not contain Latin Collect text"
);

assert(!!result.collectLatin, "result.collectLatin should be populated");
assert(
  result.collectLatin?.startsWith("Deus, a quo bona cuncta procedunt") ?? false,
  `result.collectLatin should start with "Deus, a quo bona cuncta procedunt" — got: ${JSON.stringify(result.collectLatin?.slice(0, 80) ?? null)}`
);
assert(
  result.collectLatin?.endsWith("Per Dominum.") ?? false,
  `result.collectLatin should end with "Per Dominum." — got: ${JSON.stringify(result.collectLatin?.slice(-40) ?? null)}`
);

// ── Reflection ─────────────────────────────────────────────────────
assert(!!result.reflection && result.reflection.length > 50, "result.reflection should be populated");
assert(!result.reflection?.includes(">"), "result.reflection should not contain '>' markers");
assert(!result.reflection?.includes("From Dom Guéranger"), "reflection should not include the byline");
assert(
  !!result.reflection?.includes("Yet four days"),
  "reflection should include the opening line"
);

// ── Readings ───────────────────────────────────────────────────────
assert(!!result.readings, "result.readings should be populated");
assert(!result.readings?.includes(">"), "result.readings should not contain '>' markers");
assert(!result.readings?.includes("*Epistle*"), "result.readings should not contain '*Epistle*'");
assert(
  result.readings?.includes("Lesson of the Epistle of Saint James") ?? false,
  `result.readings should include the Epistle lesson — got first 200 chars: ${JSON.stringify(result.readings?.slice(0, 200))}`
);
assert(
  result.readings?.includes("Sequel of the holy Gospel according to John") ?? false,
  "result.readings should include the Gospel sequel"
);

// ── Season ─────────────────────────────────────────────────────────
assert(result.season === "Paschaltide", `result.season — got: ${JSON.stringify(result.season)}`);

// ── Footer / boilerplate stripping ─────────────────────────────────
const fullText = JSON.stringify(result);
assert(!fullText.includes("LYP.network"), "result must not include the trailing footer text");
assert(!fullText.includes("Liturgical Year Project at"), "result must not include 'part of the Liturgical Year Project'");
assert(!fullText.includes("[1]"), "result must not include footnote markers");
assert(!fullText.includes("From Dom Guéranger"), "result must not repeat the byline");

// ── Saint entries should still extract their reflection prose ─────
const antoninus = result.entries[1];
assert(
  !!antoninus?.reflection?.includes("Order of St Dominic"),
  `antoninus reflection — got: ${JSON.stringify(antoninus?.reflection?.slice(0, 80) ?? null)}`
);
const gordian = result.entries[2];
assert(
  !!gordian?.reflection?.includes("TWO more martyrs"),
  `gordian reflection — got: ${JSON.stringify(gordian?.reflection?.slice(0, 80) ?? null)}`
);

if (failures.length) {
  console.error("\nFAILED:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}

console.log("\nOK — all parser assertions passed.");
