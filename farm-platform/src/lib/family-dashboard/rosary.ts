/**
 * Helpers for displaying the day's Holy Rosary mysteries on the Family
 * Dashboard. The weekday-to-chaplet mapping follows the disposition given
 * in Pope St. John Paul II's Apostolic Letter *Rosarium Virginis Mariae*
 * (16 October 2002): see `ROSARY_SOURCE` below.
 *
 * Each decade pairs (1) a **verbatim quotation** from a public-domain source
 * (Montfort's *Secret of the Rosary* English text on Internet Archive; or the
 * Douay–Rheims Bible on DRBO.org) with (2) a brief local meditation line for
 * vocal prayer. The weekday schedule itself still follows RVM; luminous
 * decades use Gospel verses because Montfort's fifteen mysteries predate them.
 */

export type MysterySetId = "joyful" | "sorrowful" | "glorious" | "luminous";

/** Reference for exposition text excerpted / quoted in the rosary drawer. */
export interface RosaryTraditionalSourceRef {
  /** Inline author attribution. */
  shortLabel: string;
  /** Work, section paragraph or rose number. */
  detail: string;
  url: string;
}

/** Verbatim excerpt from a cited edition (Montfort Archive text; DRBO Gospel chapter). */
export interface RosaryTraditionalExcerpt {
  text: string;
  source: RosaryTraditionalSourceRef;
}

export interface RosaryMystery {
  /** 1–5 within the set. */
  decade: number;
  title: string;
  /** Short prayer-aide lines for the decade (shown in the card under the verbatim quotation). */
  reflection: string;
  /** Verbatim quoted excerpt (see `traditional.source`). */
  traditional: RosaryTraditionalExcerpt;
}

export interface RosaryForDay {
  weekdayIndex: number;
  /** Sunday = 0 … Saturday = 6 (JavaScript `Date.getDay()`). */
  weekdayLabel: string;
  setId: MysterySetId;
  setTitle: string;
  mysteries: RosaryMystery[];
}

/** Citation shown in the UI — links to the Vatican's official text. */
export const ROSARY_SOURCE = {
  /** Latin title of the apostolic letter. */
  letterLatinTitle: "Rosarium Virginis Mariæ",
  author: "Pope St. John Paul II",
  date: "16 October 2002",
  /** Mysteries-by-day disposition: nn. 37–39; Luminous Mysteries: nn. 19–21. */
  sections: "nn. 19–21, 37–39",
  url: "https://www.vatican.va/content/john-paul-ii/en/apost_letters/documents/hf_jp-ii_apl_20021016_rosarium-virginis-mariae.html",
} as const;

export const SOURCE_MONTFORT_SECRET: RosaryTraditionalSourceRef = {
  shortLabel: "Saint Louis Marie de Montfort",
  detail:
    "The Secret of the Rosary (English translation, classic ed.; Twenty‑First Rose et seq.)",
  url: "https://archive.org/details/St.LouisMarieDeMontfortTheSecretOfTheRosary",
};

/** Encyclopedia *In gravescentibus malis* — Rosary exposition in the lineage of Leo XIII & St Pius X. */
export const SOURCE_PIUS_XI_INGRAVESCENTIBUS: RosaryTraditionalSourceRef = {
  shortLabel: "Pope Pius XI",
  detail:
    "Encyclical Letter *In gravescentibus malis* on the Rosary (29 September 1937)",
  url: "https://www.newadvent.org/library/docs_pi11im.htm",
};

/** Douay–Rheims (Challoner) verse quotation; `chapterUrl` should point at the chapter on DRBO.org. */
function SOURCE_DRBO(chapterUrl: string, verseRef: string): RosaryTraditionalSourceRef {
  return {
    shortLabel: "Douay-Rheims Bible",
    detail: `${verseRef} (Challoner revision, DRBO.org)`,
    url: chapterUrl,
  };
}

/** Montfort *Secret of the Rosary* — Internet Archive English full text; `loc` names the rose / paragraph in that scan. */
function SOURCE_MONTFORT_ARCHIVE(loc: string): RosaryTraditionalSourceRef {
  return {
    shortLabel: "Saint Louis Marie de Montfort",
    detail: `The Secret of the Rosary (English translation), ${loc} — Internet Archive`,
    url: "https://archive.org/details/St.LouisMarieDeMontfortTheSecretOfTheRosary",
  };
}

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SET_LABELS: Record<MysterySetId, string> = {
  joyful: "The Joyful Mysteries",
  sorrowful: "The Sorrowful Mysteries",
  glorious: "The Glorious Mysteries",
  luminous: "The Luminous Mysteries",
};

/**
 * Vatican arrangement (RVM nn. 37–39): Mon & Sat joyful; Tue & Fri sorrowful;
 * Wed & Sun glorious; Thu luminous (added in the same Letter, nn. 19–21).
 */
export function mysteriesForJsWeekday(day: number): MysterySetId {
  switch (day) {
    case 0:
      return "glorious"; // Sunday
    case 1:
      return "joyful"; // Monday
    case 2:
      return "sorrowful"; // Tuesday
    case 3:
      return "glorious"; // Wednesday
    case 4:
      return "luminous"; // Thursday
    case 5:
      return "sorrowful"; // Friday
    case 6:
      return "joyful"; // Saturday
    default:
      return "joyful";
  }
}

/* —— Verbatim Montfort (Third Decade, twenty-first rose, ¶62–64): Joyful enumeration + joy of each mystery. —— */
const MF_JOY_ANNUN =
  "Our Lady and the angels were overwhelmed with joy the moment the Son of God became incarnate.";
const MF_JOY_VISIT =
  "Saint Elizabeth and St. John the Baptist were filled with joy by the visit of Jesus and Mary.";
const MF_JOY_NAT = "Heaven and earth rejoiced at the birth of the Saviour.";
const MF_JOY_PRESENT =
  "Holy Simeon felt great consolation and was filled with joy when he took the holy child into his arms.";
const MF_JOY_FIND =
  "The doctors were lost in admiration and wonderment at the replies which Jesus gave; and who could express the joy of Mary and Joseph when they found Jesus after three days' absence?";

/* —— Verbatim Montfort (same work, ¶63): Sorrowful mysteries listed by name. —— */
const MF_SORROW_OPEN =
  "The second part of the Rosary is also composed of five mysteries, which are called the Sorrowful " +
  "Mysteries because they show us our Lord weighed down with sadness, covered with wounds, laden with " +
  "insults, sufferings and torments. The first of these mysteries is our Lord's prayer and his Agony in the Garden of Olives;";
const MF_SORROW_SCOURGE = "the second, his Scourging;";
const MF_SORROW_CROWN = "the third, his being Crowned with thorns;";
const MF_SORROW_CROSS = "the fourth, his Carrying of the Cross;";
const MF_SORROW_DEATH = "the fifth, his Crucifixion and death on Calvary.";

/* —— Verbatim Montfort (same work, ¶64): Glorious mysteries listed by name. —— */
const MF_GLO_RES =
  "The third part of the Rosary contains five more mysteries, which are called the Glorious Mysteries, " +
  "because when we say them we meditate on Jesus and Mary in their triumph and glory. The first is the Resurrection of Jesus;";
const MF_GLO_ASC = "the second, his Ascension into heaven;";
const MF_GLO_PENT = "the third, the Descent of the Holy Spirit upon the apostles;";
const MF_GLO_ASS = "the fourth, our Lady's Assumption in glory;";
const MF_GLO_CROWN = "the fifth, her Coronation.";

/* —— Verbatim Douay–Rheims (DRBO.org, Challoner): luminous decades —— */
const DRBO_MK_1_9_11 =
  "And it came to pass, in those days, Jesus came from Nazareth of Galilee, and was baptized by John in the Jordan. " +
  "And forthwith coming up out of the water, he saw the heavens opened, and the Spirit as a dove descending, and remaining on him. " +
  "And there came a voice from heaven: Thou art my beloved Son; in thee I am well pleased.";

const DRBO_JN_2_11 =
  "This beginning of miracles did Jesus in Cana of Galilee; and manifested his glory, and his disciples believed in him.";

const DRBO_MT_4_17 = "From that time Jesus began to preach, and to say: Do penance, for the kingdom of heaven is at hand.";

const DRBO_MT_17_5 =
  "And lo, a voice out of the cloud, saying: This is my beloved Son, in whom I am well pleased: hear ye him.";

const DRBO_LK_22_19_20 =
  "And taking bread, he gave thanks, and brake; and gave to them, saying: This is my body, which is given for you. Do this for a commemoration of me. " +
  "In like manner the chalice also, after he had supped, saying: This is the chalice, the new testament in my blood, which shall be shed for you.";

const MYSTERY_BANK: Record<MysterySetId, Omit<RosaryMystery, "decade">[]> = {
  joyful: [
    {
      title: "The Annunciation of the Angel Gabriel to Mary",
      reflection:
        "Ponder Our Lady's perfect obedience at Nazareth—*Fiat mihi*: in her consent the Eternal Word takes flesh in her womb. Beg the grace of docility to God's will.",
      traditional: {
        text: MF_JOY_ANNUN,
        source: SOURCE_MONTFORT_ARCHIVE("Third Decade, twenty-first rose, ¶62 (Joyful Mysteries)"),
      },
    },
    {
      title: "The Visitation of Mary to Saint Elizabeth",
      reflection:
        "Walk with Mary in haste to her cousin—charity leaps in the visitation, and John's joy stirs beneath Our Lady's voice. Pray to love one's neighbor without delay.",
      traditional: {
        text: MF_JOY_VISIT,
        source: SOURCE_MONTFORT_ARCHIVE("Third Decade, twenty-first rose, ¶62 (Joyful Mysteries)"),
      },
    },
    {
      title: "The Nativity of Our Lord Jesus Christ in Bethlehem",
      reflection:
        "Adore the Child laid in poverty while heaven sings *Gloria*; humility and silence guard the Mystery of the Word made man. Offer your heart's stable to Him.",
      traditional: {
        text: MF_JOY_NAT,
        source: SOURCE_MONTFORT_ARCHIVE("Third Decade, twenty-first rose, ¶62 (Joyful Mysteries)"),
      },
    },
    {
      title: "The Presentation of Jesus in the Temple",
      reflection:
        "With Simeon and Anna receive the Light of Revelation; Mary's heart learns the prophecy of the sword. Ask purity of conscience and fidelity to God's law.",
      traditional: {
        text: MF_JOY_PRESENT,
        source: SOURCE_MONTFORT_ARCHIVE("Third Decade, twenty-first rose, ¶62 (Joyful Mysteries)"),
      },
    },
    {
      title: "The Finding of Jesus in the Temple",
      reflection:
        "Mary and Joseph seek the Boy who is about His Father's business; Wisdom is heard in His questions among the doctors. Desire to remain always in dwelling with Him.",
      traditional: {
        text: MF_JOY_FIND,
        source: SOURCE_MONTFORT_ARCHIVE("Third Decade, twenty-first rose, ¶62 (Joyful Mysteries)"),
      },
    },
  ],
  sorrowful: [
    {
      title: "The Agony of Our Lord Jesus Christ in the Garden",
      reflection:
        "Keep watch one hour with Christ—His solitary prayer, the cup submitted to the Father's will for our ransom. Beg strength in every trial.",
      traditional: {
        text: MF_SORROW_OPEN,
        source: SOURCE_MONTFORT_ARCHIVE("Third Decade, twenty-first rose, ¶63 (Sorrowful Mysteries)"),
      },
    },
    {
      title: "The Scourging at the Pillar",
      reflection:
        "See innocent Flesh bruised for our sins—the whip spares Him nothing. Offer reparation for the sins of the flesh and lukewarmness.",
      traditional: {
        text: MF_SORROW_SCOURGE,
        source: SOURCE_MONTFORT_ARCHIVE("Third Decade, twenty-first rose, ¶63 (Sorrowful Mysteries)"),
      },
    },
    {
      title: "The Crowning with Thorns",
      reflection:
        "Mock homage encircles the true King—the reed, the purple cloak, *Ecce Rex vester*. Honour Christ's kingship over mind and society.",
      traditional: {
        text: MF_SORROW_CROWN,
        source: SOURCE_MONTFORT_ARCHIVE("Third Decade, twenty-first rose, ¶63 (Sorrowful Mysteries)"),
      },
    },
    {
      title: "Jesus Carrying the Cross to Mount Calvary",
      reflection:
        "Follow behind His falling steps—the wood of salvation meets Simon of Cyrene. Embrace willingly the crosses God sends today.",
      traditional: {
        text: MF_SORROW_CROSS,
        source: SOURCE_MONTFORT_ARCHIVE("Third Decade, twenty-first rose, ¶63 (Sorrowful Mysteries)"),
      },
    },
    {
      title: "The Crucifixion and Death of Our Lord Jesus Christ",
      reflection:
        "Stand with Mary and John at the wood—*Consummatum est*; from His pierced side flow Church and Sacraments. Unite your whole life to His oblation.",
      traditional: {
        text: MF_SORROW_DEATH,
        source: SOURCE_MONTFORT_ARCHIVE("Third Decade, twenty-first rose, ¶63 (Sorrowful Mysteries)"),
      },
    },
  ],
  glorious: [
    {
      title: "The Resurrection of Our Lord Jesus Christ",
      reflection:
        "The stone is rolled away—Christ lives, the first fruits of those who sleep. Rejoice in hope; live as one already raised in grace.",
      traditional: {
        text: MF_GLO_RES,
        source: SOURCE_MONTFORT_ARCHIVE("Third Decade, twenty-first rose, ¶64 (Glorious Mysteries)"),
      },
    },
    {
      title: "The Ascension of Our Lord Jesus Christ into Heaven",
      reflection:
        "He leads captivity captive and sits at the Father's right hand; the disciples return with joy to pray. Seek the things that are above.",
      traditional: {
        text: MF_GLO_ASC,
        source: SOURCE_MONTFORT_ARCHIVE("Third Decade, twenty-first rose, ¶64 (Glorious Mysteries)"),
      },
    },
    {
      title: "The Descent of the Holy Spirit at Pentecost",
      reflection:
        "Wind and flame clothe Mary and the apostles—the Church speaks Christ to every nation. Ask a fresh outpouring upon your family.",
      traditional: {
        text: MF_GLO_PENT,
        source: SOURCE_MONTFORT_ARCHIVE("Third Decade, twenty-first rose, ¶64 (Glorious Mysteries)"),
      },
    },
    {
      title: "The Assumption of the Blessed Virgin Mary into Heaven",
      reflection:
        "The immaculate Mother follows her Son body and soul in glory—death cannot hold what Life itself has overshadowed. Trust in Mary's intercession.",
      traditional: {
        text: MF_GLO_ASS,
        source: SOURCE_MONTFORT_ARCHIVE("Third Decade, twenty-first rose, ¶64 (Glorious Mysteries)"),
      },
    },
    {
      title: "The Coronation of the Blessed Virgin Mary as Queen",
      reflection:
        "Heaven crowns her who said *Yes* unto death—Mother of the Son of David reigns beside Him. Honour her queenship through filial devotion.",
      traditional: {
        text: MF_GLO_CROWN,
        source: SOURCE_MONTFORT_ARCHIVE("Third Decade, twenty-first rose, ¶64 (Glorious Mysteries)"),
      },
    },
  ],
  luminous: [
    {
      title: "The Baptism of the Lord Jesus in the Jordan",
      reflection:
        "The heavens open—the Spirit descends like a dove, the Father declares the Beloved Son. Renew your baptismal vocation in Him.",
      traditional: {
        text: DRBO_MK_1_9_11,
        source: SOURCE_DRBO("https://www.drbo.org/chapter/48001.htm", "Mark 1:9–11"),
      },
    },
    {
      title: "The Self-Manifestation of Jesus at Cana through His First Sign",
      reflection:
        "Mary's whispered *Do whatever He tells you* begins the revelation of bridal glory turned to Eucharistic wine; bring every need through her mediation.",
      traditional: {
        text: DRBO_JN_2_11,
        source: SOURCE_DRBO("https://www.drbo.org/chapter/50002.htm", "John 2:11"),
      },
    },
    {
      title: "Jesus' Proclamation of the Kingdom with His Call to Conversion",
      reflection:
        "Repent—*the kingdom is at hand*; Christ heals and forgives amid the Galilean dawn. Hear His word with contrite humility.",
      traditional: {
        text: DRBO_MT_4_17,
        source: SOURCE_DRBO("https://www.drbo.org/chapter/47004.htm", "Matthew 4:17"),
      },
    },
    {
      title: "Jesus' Transfiguration on Mount Thabor before Peter, James, and John",
      reflection:
        "Moses and Elias speak of His exodus; the Father repeats the Baptism decree—listen to Him. Desire the holiness that shines forth in prayer.",
      traditional: {
        text: DRBO_MT_17_5,
        source: SOURCE_DRBO("https://www.drbo.org/chapter/47017.htm", "Matthew 17:5"),
      },
    },
    {
      title: "Jesus' Institution of the Eucharist",
      reflection:
        "This is My Body… This is the chalice of My Blood—in the Passover upper room Sacrifice anticipates altar and cross until He comes again. Love the Mass.",
      traditional: {
        text: DRBO_LK_22_19_20,
        source: SOURCE_DRBO("https://www.drbo.org/chapter/49022.htm", "Luke 22:19–20"),
      },
    },
  ],
};

/** Build today's rosary chaplet metadata and meditations from `now`. */
export function getRosaryForDate(d: Date): RosaryForDay {
  const weekdayIndex = d.getDay();
  const setId = mysteriesForJsWeekday(weekdayIndex);
  const bank = MYSTERY_BANK[setId];
  return {
    weekdayIndex,
    weekdayLabel: WEEKDAY[weekdayIndex] ?? "",
    setId,
    setTitle: SET_LABELS[setId],
    mysteries: bank.map((m, i) => ({ ...m, decade: i + 1 })),
  };
}
