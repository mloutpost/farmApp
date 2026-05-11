/**
 * Static MM-DD → { feast, season? } placeholder map for the family dashboard
 * cartouche header. These are *placeholders* shown ONLY until the morning
 * Guéranger email arrives (or the static `gueranger.json` has an entry for
 * the day). As soon as a real `LiturgicalYearEntry` lands in the Zustand
 * store, the dashboard renders that instead.
 *
 * The flavor is the Traditional Latin Mass (1962) calendar — major fixed
 * feasts (Annunciation, Assumption, Immaculate Conception, etc.) and the
 * sanctoral cycle for well-known saints. Moveable feasts that depend on
 * Easter (Lent, Paschaltide, Pentecost) are intentionally NOT placed here —
 * those should always come from the live email feed once it's wired up.
 *
 * For any date not in this map we fall back to a generic "Feria of the Day"
 * (or "Sunday of the Liturgical Year" if it's a Sunday). Seasons are mostly
 * left blank so the placeholder stays unobtrusive; the only seasons we
 * pin are the fixed Christmastide / Epiphanytide windows.
 *
 * Edit me freely — getting these strictly historically accurate every day
 * is a non-goal. The real liturgical calendar lives in the Guéranger email.
 */

export interface PlaceholderFeast {
  feast: string;
  season?: string;
}

const CHRISTMAS_OCTAVE: PlaceholderFeast["season"] = "Christmastide";
const EPIPHANY_OCTAVE: PlaceholderFeast["season"] = "Epiphanytide";

/**
 * Sanctoral placeholders, keyed by MM-DD (zero-padded).
 * Only well-known feast days need entries here; everything else falls
 * through to the Sunday/Feria default in `getPlaceholderFeast`.
 */
const PLACEHOLDER_BY_MMDD: Record<string, PlaceholderFeast> = {
  // ---------- January ----------
  "01-01": { feast: "Octave Day of the Nativity", season: CHRISTMAS_OCTAVE },
  "01-02": { feast: "Octave of St. Stephen", season: CHRISTMAS_OCTAVE },
  "01-03": { feast: "Octave of St. John, Apostle", season: CHRISTMAS_OCTAVE },
  "01-04": { feast: "Octave of the Holy Innocents", season: CHRISTMAS_OCTAVE },
  "01-05": { feast: "Vigil of the Epiphany", season: CHRISTMAS_OCTAVE },
  "01-06": { feast: "Epiphany of Our Lord", season: EPIPHANY_OCTAVE },
  "01-07": { feast: "Feria within the Octave of the Epiphany", season: EPIPHANY_OCTAVE },
  "01-08": { feast: "Feria within the Octave of the Epiphany", season: EPIPHANY_OCTAVE },
  "01-09": { feast: "Feria within the Octave of the Epiphany", season: EPIPHANY_OCTAVE },
  "01-10": { feast: "Feria within the Octave of the Epiphany", season: EPIPHANY_OCTAVE },
  "01-11": { feast: "Feria within the Octave of the Epiphany", season: EPIPHANY_OCTAVE },
  "01-12": { feast: "Feria within the Octave of the Epiphany", season: EPIPHANY_OCTAVE },
  "01-13": { feast: "Octave Day of the Epiphany", season: EPIPHANY_OCTAVE },
  "01-14": { feast: "St. Hilary, Bishop, Confessor, Doctor" },
  "01-15": { feast: "St. Paul, the First Hermit" },
  "01-16": { feast: "St. Marcellus I, Pope and Martyr" },
  "01-17": { feast: "St. Anthony, Abbot" },
  "01-18": { feast: "Chair of St. Peter at Rome" },
  "01-19": { feast: "Sts. Marius and Companions, Martyrs" },
  "01-20": { feast: "Sts. Fabian and Sebastian, Martyrs" },
  "01-21": { feast: "St. Agnes, Virgin and Martyr" },
  "01-22": { feast: "Sts. Vincent and Anastasius, Martyrs" },
  "01-23": { feast: "St. Raymund of Peñafort, Confessor" },
  "01-24": { feast: "St. Timothy, Bishop and Martyr" },
  "01-25": { feast: "Conversion of St. Paul, Apostle" },
  "01-26": { feast: "St. Polycarp, Bishop and Martyr" },
  "01-27": { feast: "St. John Chrysostom, Bishop, Confessor, Doctor" },
  "01-28": { feast: "St. Peter Nolasco, Confessor" },
  "01-29": { feast: "St. Francis de Sales, Bishop, Confessor, Doctor" },
  "01-30": { feast: "St. Martina, Virgin and Martyr" },
  "01-31": { feast: "St. John Bosco, Confessor" },

  // ---------- February ----------
  "02-01": { feast: "St. Ignatius of Antioch, Bishop and Martyr" },
  "02-02": { feast: "Purification of the Blessed Virgin Mary" },
  "02-03": { feast: "St. Blaise, Bishop and Martyr" },
  "02-04": { feast: "St. Andrew Corsini, Bishop and Confessor" },
  "02-05": { feast: "St. Agatha, Virgin and Martyr" },
  "02-06": { feast: "St. Titus, Bishop and Confessor" },
  "02-07": { feast: "St. Romuald, Abbot" },
  "02-08": { feast: "St. John of Matha, Confessor" },
  "02-09": { feast: "St. Cyril of Alexandria, Bishop, Confessor, Doctor" },
  "02-10": { feast: "St. Scholastica, Virgin" },
  "02-11": { feast: "Apparition of Our Lady at Lourdes" },
  "02-12": { feast: "Seven Holy Founders of the Servites" },
  "02-14": { feast: "St. Valentine, Priest and Martyr" },
  "02-15": { feast: "Sts. Faustinus and Jovita, Martyrs" },
  "02-18": { feast: "St. Simeon, Bishop and Martyr" },
  "02-22": { feast: "Chair of St. Peter at Antioch" },
  "02-23": { feast: "St. Peter Damian, Bishop, Confessor, Doctor" },
  "02-24": { feast: "St. Matthias, Apostle" },
  "02-27": { feast: "St. Gabriel of Our Lady of Sorrows, Confessor" },

  // ---------- March ----------
  "03-04": { feast: "St. Casimir, Confessor" },
  "03-06": { feast: "Sts. Perpetua and Felicity, Martyrs" },
  "03-07": { feast: "St. Thomas Aquinas, Confessor and Doctor" },
  "03-08": { feast: "St. John of God, Confessor" },
  "03-09": { feast: "St. Frances of Rome, Widow" },
  "03-10": { feast: "Forty Holy Martyrs of Sebaste" },
  "03-12": { feast: "St. Gregory the Great, Pope, Confessor, Doctor" },
  "03-17": { feast: "St. Patrick, Bishop and Confessor" },
  "03-18": { feast: "St. Cyril of Jerusalem, Bishop, Confessor, Doctor" },
  "03-19": { feast: "St. Joseph, Spouse of the Blessed Virgin Mary" },
  "03-21": { feast: "St. Benedict, Abbot" },
  "03-24": { feast: "St. Gabriel the Archangel" },
  "03-25": { feast: "Annunciation of the Blessed Virgin Mary" },
  "03-27": { feast: "St. John Damascene, Confessor and Doctor" },
  "03-28": { feast: "St. John Capistran, Confessor" },

  // ---------- April ----------
  "04-02": { feast: "St. Francis of Paola, Confessor" },
  "04-04": { feast: "St. Isidore of Seville, Bishop, Confessor, Doctor" },
  "04-05": { feast: "St. Vincent Ferrer, Confessor" },
  "04-11": { feast: "St. Leo the Great, Pope, Confessor, Doctor" },
  "04-13": { feast: "St. Hermenegild, Martyr" },
  "04-14": { feast: "St. Justin, Martyr" },
  "04-17": { feast: "St. Anicetus, Pope and Martyr" },
  "04-21": { feast: "St. Anselm, Bishop, Confessor, Doctor" },
  "04-22": { feast: "Sts. Soter and Caius, Popes and Martyrs" },
  "04-23": { feast: "St. George, Martyr" },
  "04-24": { feast: "St. Fidelis of Sigmaringen, Martyr" },
  "04-25": { feast: "St. Mark, Evangelist" },
  "04-26": { feast: "Sts. Cletus and Marcellinus, Popes and Martyrs" },
  "04-27": { feast: "St. Peter Canisius, Confessor and Doctor" },
  "04-28": { feast: "St. Paul of the Cross, Confessor" },
  "04-29": { feast: "St. Peter of Verona, Martyr" },
  "04-30": { feast: "St. Catherine of Siena, Virgin" },

  // ---------- May ----------
  "05-01": { feast: "Sts. Philip and James, Apostles" },
  "05-02": { feast: "St. Athanasius, Bishop, Confessor, Doctor" },
  "05-03": { feast: "Finding of the Holy Cross" },
  "05-04": { feast: "St. Monica, Widow" },
  "05-05": { feast: "St. Pius V, Pope and Confessor" },
  "05-06": { feast: "St. John before the Latin Gate" },
  "05-07": { feast: "St. Stanislaus, Bishop and Martyr" },
  "05-08": { feast: "Apparition of St. Michael the Archangel" },
  "05-09": { feast: "St. Gregory Nazianzen, Bishop, Confessor, Doctor" },
  "05-10": { feast: "Sts. Gordian and Epimachus, Martyrs" },
  "05-12": { feast: "Sts. Nereus, Achilleus, Domitilla and Pancras, Martyrs" },
  "05-13": { feast: "St. Robert Bellarmine, Bishop, Confessor, Doctor" },
  "05-14": { feast: "St. Boniface, Martyr" },
  "05-15": { feast: "St. John Baptist de la Salle, Confessor" },
  "05-16": { feast: "St. Ubaldus, Bishop and Confessor" },
  "05-17": { feast: "St. Paschal Baylon, Confessor" },
  "05-18": { feast: "St. Venantius, Martyr" },
  "05-19": { feast: "St. Peter Celestine, Pope and Confessor" },
  "05-20": { feast: "St. Bernardine of Siena, Confessor" },
  "05-25": { feast: "St. Gregory VII, Pope and Confessor" },
  "05-26": { feast: "St. Philip Neri, Confessor" },
  "05-27": { feast: "St. Bede the Venerable, Confessor and Doctor" },
  "05-28": { feast: "St. Augustine of Canterbury, Bishop and Confessor" },
  "05-29": { feast: "St. Mary Magdalen de' Pazzi, Virgin" },
  "05-30": { feast: "St. Felix I, Pope and Martyr" },
  "05-31": { feast: "Queenship of the Blessed Virgin Mary" },

  // ---------- June ----------
  "06-01": { feast: "St. Angela Merici, Virgin" },
  "06-02": { feast: "Sts. Marcellinus, Peter, and Erasmus, Martyrs" },
  "06-04": { feast: "St. Francis Caracciolo, Confessor" },
  "06-05": { feast: "St. Boniface, Bishop and Martyr" },
  "06-06": { feast: "St. Norbert, Bishop and Confessor" },
  "06-09": { feast: "Sts. Primus and Felicianus, Martyrs" },
  "06-10": { feast: "St. Margaret, Queen and Widow" },
  "06-11": { feast: "St. Barnabas, Apostle" },
  "06-12": { feast: "St. John of San Facundo, Confessor" },
  "06-13": { feast: "St. Anthony of Padua, Confessor and Doctor" },
  "06-14": { feast: "St. Basil the Great, Bishop, Confessor, Doctor" },
  "06-15": { feast: "Sts. Vitus, Modestus and Crescentia, Martyrs" },
  "06-17": { feast: "St. Gregory Barbarigo, Bishop and Confessor" },
  "06-18": { feast: "St. Ephrem the Syrian, Confessor and Doctor" },
  "06-19": { feast: "St. Juliana Falconieri, Virgin" },
  "06-20": { feast: "St. Silverius, Pope and Martyr" },
  "06-21": { feast: "St. Aloysius Gonzaga, Confessor" },
  "06-22": { feast: "St. Paulinus of Nola, Bishop and Confessor" },
  "06-24": { feast: "Nativity of St. John the Baptist" },
  "06-26": { feast: "Sts. John and Paul, Martyrs" },
  "06-28": { feast: "Vigil of Sts. Peter and Paul" },
  "06-29": { feast: "Sts. Peter and Paul, Apostles" },
  "06-30": { feast: "Commemoration of St. Paul, Apostle" },

  // ---------- July ----------
  "07-01": { feast: "Most Precious Blood of Our Lord" },
  "07-02": { feast: "Visitation of the Blessed Virgin Mary" },
  "07-03": { feast: "St. Leo II, Pope and Confessor" },
  "07-05": { feast: "St. Anthony Mary Zaccaria, Confessor" },
  "07-06": { feast: "Octave of Sts. Peter and Paul" },
  "07-07": { feast: "Sts. Cyril and Methodius, Bishops and Confessors" },
  "07-08": { feast: "St. Elizabeth of Portugal, Queen" },
  "07-10": { feast: "Seven Holy Brothers, Martyrs" },
  "07-11": { feast: "St. Pius I, Pope and Martyr" },
  "07-12": { feast: "St. John Gualbert, Abbot" },
  "07-13": { feast: "St. Anacletus, Pope and Martyr" },
  "07-14": { feast: "St. Bonaventure, Bishop, Confessor, Doctor" },
  "07-15": { feast: "St. Henry, Emperor and Confessor" },
  "07-16": { feast: "Our Lady of Mount Carmel" },
  "07-17": { feast: "St. Alexius, Confessor" },
  "07-18": { feast: "St. Camillus de Lellis, Confessor" },
  "07-19": { feast: "St. Vincent de Paul, Confessor" },
  "07-20": { feast: "St. Jerome Emiliani, Confessor" },
  "07-21": { feast: "St. Praxedes, Virgin" },
  "07-22": { feast: "St. Mary Magdalen, Penitent" },
  "07-23": { feast: "St. Apollinaris, Bishop and Martyr" },
  "07-24": { feast: "Vigil of St. James, Apostle" },
  "07-25": { feast: "St. James the Greater, Apostle" },
  "07-26": { feast: "St. Anne, Mother of the Blessed Virgin Mary" },
  "07-27": { feast: "St. Pantaleon, Martyr" },
  "07-28": { feast: "Sts. Nazarius, Celsus, Victor I, and Innocent I, Popes and Martyrs" },
  "07-29": { feast: "St. Martha, Virgin" },
  "07-30": { feast: "Sts. Abdon and Sennen, Martyrs" },
  "07-31": { feast: "St. Ignatius of Loyola, Confessor" },

  // ---------- August ----------
  "08-01": { feast: "St. Peter in Chains" },
  "08-02": { feast: "St. Alphonsus Liguori, Bishop, Confessor, Doctor" },
  "08-03": { feast: "Finding of St. Stephen, Protomartyr" },
  "08-04": { feast: "St. Dominic, Confessor" },
  "08-05": { feast: "Dedication of Our Lady of the Snows" },
  "08-06": { feast: "Transfiguration of Our Lord" },
  "08-07": { feast: "St. Cajetan, Confessor" },
  "08-08": { feast: "Sts. Cyriacus, Largus, and Smaragdus, Martyrs" },
  "08-09": { feast: "Vigil of St. Lawrence" },
  "08-10": { feast: "St. Lawrence, Martyr" },
  "08-11": { feast: "Sts. Tiburtius and Susanna, Martyrs" },
  "08-12": { feast: "St. Clare, Virgin" },
  "08-13": { feast: "Sts. Hippolytus and Cassian, Martyrs" },
  "08-14": { feast: "Vigil of the Assumption" },
  "08-15": { feast: "Assumption of the Blessed Virgin Mary" },
  "08-16": { feast: "St. Joachim, Father of the Blessed Virgin Mary" },
  "08-17": { feast: "St. Hyacinth, Confessor" },
  "08-18": { feast: "St. Agapitus, Martyr" },
  "08-19": { feast: "St. John Eudes, Confessor" },
  "08-20": { feast: "St. Bernard of Clairvaux, Abbot and Doctor" },
  "08-21": { feast: "St. Jane Frances de Chantal, Widow" },
  "08-22": { feast: "Immaculate Heart of Mary" },
  "08-23": { feast: "St. Philip Benizi, Confessor" },
  "08-24": { feast: "St. Bartholomew, Apostle" },
  "08-25": { feast: "St. Louis IX, King and Confessor" },
  "08-26": { feast: "St. Zephyrinus, Pope and Martyr" },
  "08-27": { feast: "St. Joseph Calasanctius, Confessor" },
  "08-28": { feast: "St. Augustine, Bishop, Confessor, Doctor" },
  "08-29": { feast: "Beheading of St. John the Baptist" },
  "08-30": { feast: "St. Rose of Lima, Virgin" },
  "08-31": { feast: "St. Raymond Nonnatus, Confessor" },

  // ---------- September ----------
  "09-01": { feast: "St. Giles, Abbot" },
  "09-02": { feast: "St. Stephen of Hungary, King and Confessor" },
  "09-05": { feast: "St. Lawrence Justinian, Bishop and Confessor" },
  "09-08": { feast: "Nativity of the Blessed Virgin Mary" },
  "09-09": { feast: "St. Gorgonius, Martyr" },
  "09-10": { feast: "St. Nicholas of Tolentino, Confessor" },
  "09-11": { feast: "Sts. Protus and Hyacinth, Martyrs" },
  "09-12": { feast: "Most Holy Name of Mary" },
  "09-14": { feast: "Exaltation of the Holy Cross" },
  "09-15": { feast: "Seven Sorrows of the Blessed Virgin Mary" },
  "09-16": { feast: "Sts. Cornelius and Cyprian, Martyrs" },
  "09-17": { feast: "Stigmata of St. Francis" },
  "09-18": { feast: "St. Joseph of Cupertino, Confessor" },
  "09-19": { feast: "Sts. Januarius and Companions, Martyrs" },
  "09-20": { feast: "Sts. Eustace and Companions, Martyrs" },
  "09-21": { feast: "St. Matthew, Apostle and Evangelist" },
  "09-22": { feast: "St. Thomas of Villanova, Bishop and Confessor" },
  "09-23": { feast: "St. Linus, Pope and Martyr" },
  "09-24": { feast: "Our Lady of Ransom" },
  "09-26": { feast: "Sts. Cyprian and Justina, Martyrs" },
  "09-27": { feast: "Sts. Cosmas and Damian, Martyrs" },
  "09-28": { feast: "St. Wenceslaus, Duke and Martyr" },
  "09-29": { feast: "Dedication of St. Michael the Archangel" },
  "09-30": { feast: "St. Jerome, Confessor and Doctor" },

  // ---------- October ----------
  "10-01": { feast: "St. Remigius, Bishop and Confessor" },
  "10-02": { feast: "Holy Guardian Angels" },
  "10-03": { feast: "St. Thérèse of the Child Jesus, Virgin" },
  "10-04": { feast: "St. Francis of Assisi, Confessor" },
  "10-05": { feast: "Sts. Placid and Companions, Martyrs" },
  "10-06": { feast: "St. Bruno, Confessor" },
  "10-07": { feast: "Our Lady of the Most Holy Rosary" },
  "10-08": { feast: "St. Bridget of Sweden, Widow" },
  "10-09": { feast: "St. John Leonardi, Confessor" },
  "10-10": { feast: "St. Francis Borgia, Confessor" },
  "10-11": { feast: "Maternity of the Blessed Virgin Mary" },
  "10-13": { feast: "St. Edward the Confessor, King" },
  "10-14": { feast: "St. Callistus I, Pope and Martyr" },
  "10-15": { feast: "St. Teresa of Avila, Virgin" },
  "10-16": { feast: "St. Hedwig, Widow" },
  "10-17": { feast: "St. Margaret Mary Alacoque, Virgin" },
  "10-18": { feast: "St. Luke, Evangelist" },
  "10-19": { feast: "St. Peter of Alcantara, Confessor" },
  "10-20": { feast: "St. John Cantius, Confessor" },
  "10-21": { feast: "St. Hilarion, Abbot" },
  "10-24": { feast: "St. Raphael the Archangel" },
  "10-25": { feast: "Sts. Chrysanthus and Daria, Martyrs" },
  "10-26": { feast: "St. Evaristus, Pope and Martyr" },
  "10-28": { feast: "Sts. Simon and Jude, Apostles" },
  "10-31": { feast: "Vigil of All Saints" },

  // ---------- November ----------
  "11-01": { feast: "All Saints" },
  "11-02": { feast: "Commemoration of All the Faithful Departed" },
  "11-04": { feast: "St. Charles Borromeo, Bishop and Confessor" },
  "11-08": { feast: "Octave of All Saints" },
  "11-09": { feast: "Dedication of the Archbasilica of the Most Holy Savior" },
  "11-10": { feast: "St. Andrew Avellino, Confessor" },
  "11-11": { feast: "St. Martin of Tours, Bishop and Confessor" },
  "11-12": { feast: "St. Martin I, Pope and Martyr" },
  "11-13": { feast: "St. Didacus, Confessor" },
  "11-14": { feast: "St. Josaphat, Bishop and Martyr" },
  "11-15": { feast: "St. Albert the Great, Bishop, Confessor, Doctor" },
  "11-16": { feast: "St. Gertrude, Virgin" },
  "11-17": { feast: "St. Gregory the Wonderworker, Bishop and Confessor" },
  "11-18": { feast: "Dedication of the Basilicas of Sts. Peter and Paul" },
  "11-19": { feast: "St. Elizabeth of Hungary, Widow" },
  "11-20": { feast: "St. Felix of Valois, Confessor" },
  "11-21": { feast: "Presentation of the Blessed Virgin Mary" },
  "11-22": { feast: "St. Cecilia, Virgin and Martyr" },
  "11-23": { feast: "St. Clement I, Pope and Martyr" },
  "11-24": { feast: "St. John of the Cross, Confessor and Doctor" },
  "11-25": { feast: "St. Catherine of Alexandria, Virgin and Martyr" },
  "11-26": { feast: "St. Sylvester, Abbot" },
  "11-29": { feast: "Vigil of St. Andrew" },
  "11-30": { feast: "St. Andrew, Apostle" },

  // ---------- December ----------
  "12-02": { feast: "St. Bibiana, Virgin and Martyr" },
  "12-03": { feast: "St. Francis Xavier, Confessor" },
  "12-04": { feast: "St. Peter Chrysologus, Bishop, Confessor, Doctor" },
  "12-05": { feast: "St. Sabbas, Abbot" },
  "12-06": { feast: "St. Nicholas, Bishop and Confessor" },
  "12-07": { feast: "St. Ambrose, Bishop, Confessor, Doctor" },
  "12-08": { feast: "Immaculate Conception of the Blessed Virgin Mary" },
  "12-10": { feast: "St. Melchiades, Pope and Martyr" },
  "12-11": { feast: "St. Damasus I, Pope and Confessor" },
  "12-13": { feast: "St. Lucy, Virgin and Martyr" },
  "12-16": { feast: "St. Eusebius of Vercelli, Bishop and Martyr" },
  "12-21": { feast: "St. Thomas, Apostle" },
  "12-24": { feast: "Vigil of the Nativity" },
  "12-25": { feast: "Nativity of Our Lord Jesus Christ", season: CHRISTMAS_OCTAVE },
  "12-26": { feast: "St. Stephen, Protomartyr", season: CHRISTMAS_OCTAVE },
  "12-27": { feast: "St. John, Apostle and Evangelist", season: CHRISTMAS_OCTAVE },
  "12-28": { feast: "Holy Innocents, Martyrs", season: CHRISTMAS_OCTAVE },
  "12-29": { feast: "St. Thomas Becket, Bishop and Martyr", season: CHRISTMAS_OCTAVE },
  "12-30": { feast: "Sixth Day within the Octave of the Nativity", season: CHRISTMAS_OCTAVE },
  "12-31": { feast: "St. Sylvester I, Pope and Confessor", season: CHRISTMAS_OCTAVE },
};

/**
 * Returns a placeholder feast/season for the given Date. This value is
 * only meant to fill the cartouche header until the morning Guéranger
 * email lands and provides authoritative data for the day.
 */
export function getPlaceholderFeast(d: Date): PlaceholderFeast {
  const mmdd = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const hit = PLACEHOLDER_BY_MMDD[mmdd];
  if (hit) return hit;
  if (d.getDay() === 0) {
    return { feast: "Sunday of the Liturgical Year" };
  }
  return { feast: "Feria of the Day" };
}
