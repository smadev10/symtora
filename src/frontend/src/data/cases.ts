import type { Lang } from '@/i18n/translations';

/** Chip order on the "new entry" screen: chip i selects CASE_ORDER[i]. */
export const CASE_ORDER = ['headache', 'stomach', 'throat', 'knee'] as const;
export type CaseKey = (typeof CASE_ORDER)[number];

/** Headline counters on the home screen. */
export const DEMO_KPIS = { entries: 9, regions: 3, emergencies: 0 } as const;

/** Order the home screen lists recent entries in, newest first. */
export const HISTORY_ORDER = ['headache', 'knee', 'stomach', 'throat'] as const;

/** How often each recurring trigger was seen, aligned with TR.triggers. */
export const TRIGGER_COUNTS = [6, 4, 3] as const;

/** Dialable numbers, aligned with TR.emergencyContacts. */
export const EMERGENCY_NUMBERS = [
  { number: '144', tel: 'tel:144' },
  { number: '112', tel: 'tel:112' },
  { number: '145', tel: 'tel:145' },
  { number: '143', tel: 'tel:143' },
] as const;

/** Drives the urgency badge colour on the home history rows. */
export const URGENCIES = ['low', 'mid', 'high'] as const;
export type Urgency = (typeof URGENCIES)[number];

/** Drives the probability pill on each possible cause. */
export const PROBABILITIES = ['high', 'mid', 'low'] as const;
export type Probability = (typeof PROBABILITIES)[number];

/**
 * Transcript highlight colours. Capitalised and prefixed with `tint` to look up
 * a theme token, so these names are load-bearing.
 */
export const SEGMENT_TINTS = ['blue', 'orange', 'green', 'neutral'] as const;
export type SegmentTint = (typeof SEGMENT_TINTS)[number];

export type TranscriptSegment = { t: string; c: SegmentTint | null };
export type Finding = { label: string; pct: number };
export type Cause = { label: string; prob: Probability; desc: string };

export type DemoCase = {
  title: string;
  urgency: Urgency;
  urgencyLabel: string;
  urgencyTag: string;
  urgencyDesc: string;
  segments: TranscriptSegment[];
  findings: Finding[];
  causes: Cause[];
  steps: string[];
};

export const CASES: Record<Lang, Record<CaseKey, DemoCase>> = {
  de: {
    headache: {
      title: 'Kopfschmerzen',
      urgency: 'low',
      urgencyLabel: 'Niedrig',
      urgencyTag: 'kein Notfall',
      urgencyDesc: 'Keine Anzeichen für einen Notfall erkannt. Beobachte den Verlauf über 24 Stunden.',
      segments: [
        { t: 'Seit heute Mittag habe ich ', c: null },
        { t: 'starke Kopfschmerzen', c: 'blue' },
        { t: ', vor allem hinter der Stirn. ', c: null },
        { t: 'Das Licht im Klassenzimmer tut weh', c: 'orange' },
        { t: ' und ', c: null },
        { t: 'mein Nacken ist steif', c: 'green' },
        { t: '. ', c: null },
        { t: 'Fieber habe ich keines', c: 'neutral' },
        { t: '.', c: null },
      ],
      findings: [
        { label: 'Kopf-Schmerz', pct: 84 },
        { label: 'Lichtempfindlichkeit', pct: 61 },
        { label: 'Nackensteifigkeit', pct: 47 },
      ],
      causes: [
        { label: 'Spannungskopfschmerz', prob: 'high', desc: 'Passt zu Nackensteifigkeit und langer Bildschirmzeit.' },
        { label: 'Migräne', prob: 'mid', desc: 'Lichtempfindlichkeit spricht dafür, Übelkeit fehlt.' },
        { label: 'Flüssigkeitsmangel', prob: 'mid', desc: 'Häufig bei Kopfschmerz am Nachmittag.' },
      ],
      steps: ['Wasser trinken, 30 Minuten ruhen.', 'Bildschirmzeit heute reduzieren.', 'Bei Fieber, Sehstörung oder Erbrechen ärztliche Hilfe suchen.'],
    },
    knee: {
      title: 'Knieschmerzen',
      urgency: 'mid',
      urgencyLabel: 'Mittel',
      urgencyTag: 'Beobachten',
      urgencyDesc: 'Kein akuter Notfall, aber Belastung vermeiden und Verlauf beobachten.',
      segments: [
        { t: 'Seit dem Training heute Abend habe ich ', c: null },
        { t: 'Schmerzen im Knie', c: 'blue' },
        { t: ', vor allem aussen. ', c: null },
        { t: 'Eine leichte Schwellung ist sichtbar', c: 'orange' },
        { t: ' und ', c: null },
        { t: 'Belastung tut weh', c: 'green' },
        { t: '. ', c: null },
        { t: 'Ein Sturz war es nicht', c: 'neutral' },
        { t: '.', c: null },
      ],
      findings: [
        { label: 'Knie-Schmerz', pct: 88 },
        { label: 'Schwellung sichtbar', pct: 66 },
        { label: 'Belastungsschmerz', pct: 73 },
      ],
      causes: [
        { label: 'Überlastung', prob: 'high', desc: 'Passt zu intensivem Training und Schmerz bei Belastung.' },
        { label: 'Bänderreizung', prob: 'mid', desc: 'Schwellung aussen kann auf Reizung hindeuten.' },
        { label: 'Prellung', prob: 'low', desc: 'Kein Sturz oder Schlag berichtet.' },
      ],
      steps: ['Knie kühlen und hochlagern.', 'Belastung für 2–3 Tage reduzieren.', 'Bei anhaltender Schwellung ärztliche Hilfe suchen.'],
    },
    stomach: {
      title: 'Bauchschmerzen',
      urgency: 'mid',
      urgencyLabel: 'Mittel',
      urgencyTag: 'Beobachten',
      urgencyDesc: 'Kein akuter Notfall, aber bei Verschlechterung ärztlich abklären lassen.',
      segments: [
        { t: 'Seit heute Morgen vor der Prüfung habe ich ', c: null },
        { t: 'krampfartige Bauchschmerzen', c: 'blue' },
        { t: '. ', c: null },
        { t: 'Mir ist leicht übel', c: 'orange' },
        { t: ' und ', c: null },
        { t: 'ich bin nervös', c: 'green' },
        { t: '. ', c: null },
        { t: 'Fieber habe ich keines', c: 'neutral' },
        { t: '.', c: null },
      ],
      findings: [
        { label: 'Bauch-Schmerz', pct: 80 },
        { label: 'Übelkeit', pct: 58 },
        { label: 'Stressanzeichen', pct: 69 },
      ],
      causes: [
        { label: 'Stressbedingt', prob: 'high', desc: 'Zeitlicher Zusammenhang mit der Prüfung spricht dafür.' },
        { label: 'Verdauungsstörung', prob: 'mid', desc: 'Krampfartiger Schmerz ohne Fieber.' },
        { label: 'Magen-Darm-Infekt', prob: 'low', desc: 'Kein Fieber oder Durchfall berichtet.' },
      ],
      steps: ['Ruhig atmen, leichte Mahlzeit.', 'Auf ausreichend Flüssigkeit achten.', 'Bei Fieber oder starken Schmerzen ärztliche Hilfe suchen.'],
    },
    throat: {
      title: 'Halsschmerzen',
      urgency: 'low',
      urgencyLabel: 'Niedrig',
      urgencyTag: 'kein Notfall',
      urgencyDesc: 'Keine Anzeichen für einen Notfall erkannt. Beobachte den Verlauf über 24 Stunden.',
      segments: [
        { t: 'Seit gestern Abend habe ich ', c: null },
        { t: 'Halsschmerzen', c: 'blue' },
        { t: ' beim Schlucken. ', c: null },
        { t: 'Ein leichter Husten ist dazugekommen', c: 'orange' },
        { t: ' und ', c: null },
        { t: 'die Stimme ist etwas belegt', c: 'green' },
        { t: '. ', c: null },
        { t: 'Fieber habe ich keines', c: 'neutral' },
        { t: '.', c: null },
      ],
      findings: [
        { label: 'Hals-Schmerz', pct: 82 },
        { label: 'Schluckbeschwerden', pct: 70 },
        { label: 'Husten', pct: 44 },
      ],
      causes: [
        { label: 'Virale Erkältung', prob: 'high', desc: 'Passt zu Husten und belegter Stimme ohne Fieber.' },
        { label: 'Reizung/trockene Luft', prob: 'mid', desc: 'Kann Schluckbeschwerden ohne Infekt erklären.' },
        { label: 'Bakterielle Angina', prob: 'low', desc: 'Ohne Fieber weniger wahrscheinlich.' },
      ],
      steps: ['Viel trinken, Stimme schonen.', 'Warme Getränke oder Lutschtabletten.', 'Bei Fieber oder Atemnot ärztliche Hilfe suchen.'],
    },
  },
  en: {
    headache: {
      title: 'Headache',
      urgency: 'low',
      urgencyLabel: 'Low',
      urgencyTag: 'not an emergency',
      urgencyDesc: 'No signs of an emergency detected. Monitor over the next 24 hours.',
      segments: [
        { t: 'Since this afternoon I’ve had ', c: null },
        { t: 'a strong headache', c: 'blue' },
        { t: ', mostly behind the forehead. ', c: null },
        { t: 'The classroom light hurts', c: 'orange' },
        { t: ' and ', c: null },
        { t: 'my neck feels stiff', c: 'green' },
        { t: '. ', c: null },
        { t: 'No fever', c: 'neutral' },
        { t: '.', c: null },
      ],
      findings: [
        { label: 'Head pain', pct: 84 },
        { label: 'Light sensitivity', pct: 61 },
        { label: 'Neck stiffness', pct: 47 },
      ],
      causes: [
        { label: 'Tension headache', prob: 'high', desc: 'Matches neck stiffness and long screen time.' },
        { label: 'Migraine', prob: 'mid', desc: 'Light sensitivity supports this, but no nausea.' },
        { label: 'Dehydration', prob: 'mid', desc: 'Common with afternoon headaches.' },
      ],
      steps: ['Drink water, rest for 30 minutes.', 'Reduce screen time today.', 'Seek medical help if fever, vision changes, or vomiting occur.'],
    },
    knee: {
      title: 'Knee pain',
      urgency: 'mid',
      urgencyLabel: 'Medium',
      urgencyTag: 'monitor',
      urgencyDesc: 'Not an acute emergency, but avoid load and monitor the course.',
      segments: [
        { t: 'Since training this evening I have ', c: null },
        { t: 'knee pain', c: 'blue' },
        { t: ', mostly on the outside. ', c: null },
        { t: 'A slight swelling is visible', c: 'orange' },
        { t: ' and ', c: null },
        { t: 'it hurts under load', c: 'green' },
        { t: '. ', c: null },
        { t: 'No fall happened', c: 'neutral' },
        { t: '.', c: null },
      ],
      findings: [
        { label: 'Knee pain', pct: 88 },
        { label: 'Visible swelling', pct: 66 },
        { label: 'Pain under load', pct: 73 },
      ],
      causes: [
        { label: 'Overuse', prob: 'high', desc: 'Matches intense training and pain under load.' },
        { label: 'Ligament strain', prob: 'mid', desc: 'Outer swelling may indicate strain.' },
        { label: 'Bruise', prob: 'low', desc: 'No fall or impact reported.' },
      ],
      steps: ['Cool and elevate the knee.', 'Reduce load for 2–3 days.', 'Seek medical help if swelling persists.'],
    },
    stomach: {
      title: 'Stomach ache',
      urgency: 'mid',
      urgencyLabel: 'Medium',
      urgencyTag: 'monitor',
      urgencyDesc: 'Not an acute emergency, but see a doctor if it worsens.',
      segments: [
        { t: 'Since this morning before the exam I have ', c: null },
        { t: 'cramp-like stomach pain', c: 'blue' },
        { t: '. ', c: null },
        { t: 'I feel slightly nauseous', c: 'orange' },
        { t: ' and ', c: null },
        { t: 'I’m nervous', c: 'green' },
        { t: '. ', c: null },
        { t: 'No fever', c: 'neutral' },
        { t: '.', c: null },
      ],
      findings: [
        { label: 'Stomach pain', pct: 80 },
        { label: 'Nausea', pct: 58 },
        { label: 'Stress signs', pct: 69 },
      ],
      causes: [
        { label: 'Stress-related', prob: 'high', desc: 'Timing with the exam supports this.' },
        { label: 'Indigestion', prob: 'mid', desc: 'Cramp-like pain without fever.' },
        { label: 'Stomach bug', prob: 'low', desc: 'No fever or diarrhea reported.' },
      ],
      steps: ['Breathe calmly, light meal.', 'Stay well hydrated.', 'Seek medical help if fever or severe pain.'],
    },
    throat: {
      title: 'Sore throat',
      urgency: 'low',
      urgencyLabel: 'Low',
      urgencyTag: 'not an emergency',
      urgencyDesc: 'No signs of an emergency detected. Monitor over the next 24 hours.',
      segments: [
        { t: 'Since last night I have ', c: null },
        { t: 'a sore throat', c: 'blue' },
        { t: ' when swallowing. ', c: null },
        { t: 'A mild cough has started', c: 'orange' },
        { t: ' and ', c: null },
        { t: 'my voice is a bit hoarse', c: 'green' },
        { t: '. ', c: null },
        { t: 'No fever', c: 'neutral' },
        { t: '.', c: null },
      ],
      findings: [
        { label: 'Throat pain', pct: 82 },
        { label: 'Swallowing difficulty', pct: 70 },
        { label: 'Cough', pct: 44 },
      ],
      causes: [
        { label: 'Viral cold', prob: 'high', desc: 'Matches cough and hoarse voice without fever.' },
        { label: 'Dry air irritation', prob: 'mid', desc: 'Can explain swallowing difficulty without infection.' },
        { label: 'Bacterial strep', prob: 'low', desc: 'Less likely without fever.' },
      ],
      steps: ['Drink plenty, rest your voice.', 'Warm drinks or lozenges.', 'Seek medical help if fever or breathing trouble.'],
    },
  },
  fr: {
    headache: {
      title: 'Maux de tête',
      urgency: 'low',
      urgencyLabel: 'Faible',
      urgencyTag: 'pas une urgence',
      urgencyDesc: 'Aucun signe d’urgence détecté. Surveille l’évolution sur 24 heures.',
      segments: [
        { t: 'Depuis cet après-midi j’ai ', c: null },
        { t: 'un fort mal de tête', c: 'blue' },
        { t: ', surtout derrière le front. ', c: null },
        { t: 'La lumière de la classe fait mal', c: 'orange' },
        { t: ' et ', c: null },
        { t: 'ma nuque est raide', c: 'green' },
        { t: '. ', c: null },
        { t: 'Pas de fièvre', c: 'neutral' },
        { t: '.', c: null },
      ],
      findings: [
        { label: 'Douleur à la tête', pct: 84 },
        { label: 'Sensibilité à la lumière', pct: 61 },
        { label: 'Raideur de nuque', pct: 47 },
      ],
      causes: [
        { label: 'Céphalée de tension', prob: 'high', desc: 'Correspond à la raideur de nuque et au temps d’écran.' },
        { label: 'Migraine', prob: 'mid', desc: 'La sensibilité à la lumière va dans ce sens, mais pas de nausée.' },
        { label: 'Déshydratation', prob: 'mid', desc: 'Fréquent en cas de mal de tête l’après-midi.' },
      ],
      steps: ['Boire de l’eau, se reposer 30 minutes.', 'Réduire le temps d’écran aujourd’hui.', 'Consulter en cas de fièvre, troubles visuels ou vomissements.'],
    },
    knee: {
      title: 'Douleur au genou',
      urgency: 'mid',
      urgencyLabel: 'Moyenne',
      urgencyTag: 'à surveiller',
      urgencyDesc: 'Pas une urgence aiguë, mais évite l’effort et surveille l’évolution.',
      segments: [
        { t: 'Depuis l’entraînement de ce soir j’ai ', c: null },
        { t: 'mal au genou', c: 'blue' },
        { t: ', surtout côté externe. ', c: null },
        { t: 'Un léger gonflement est visible', c: 'orange' },
        { t: ' et ', c: null },
        { t: 'ça fait mal à l’effort', c: 'green' },
        { t: '. ', c: null },
        { t: 'Pas de chute', c: 'neutral' },
        { t: '.', c: null },
      ],
      findings: [
        { label: 'Douleur au genou', pct: 88 },
        { label: 'Gonflement visible', pct: 66 },
        { label: 'Douleur à l’effort', pct: 73 },
      ],
      causes: [
        { label: 'Surmenage', prob: 'high', desc: 'Correspond à un entraînement intense et à la douleur à l’effort.' },
        { label: 'Entorse ligamentaire', prob: 'mid', desc: 'Le gonflement externe peut l’indiquer.' },
        { label: 'Contusion', prob: 'low', desc: 'Aucune chute ou choc signalé.' },
      ],
      steps: ['Glacer et surélever le genou.', 'Réduire l’effort 2–3 jours.', 'Consulter si le gonflement persiste.'],
    },
    stomach: {
      title: 'Douleur au ventre',
      urgency: 'mid',
      urgencyLabel: 'Moyenne',
      urgencyTag: 'à surveiller',
      urgencyDesc: 'Pas une urgence aiguë, mais consulte si ça s’aggrave.',
      segments: [
        { t: 'Depuis ce matin avant l’examen j’ai ', c: null },
        { t: 'des douleurs abdominales type crampes', c: 'blue' },
        { t: '. ', c: null },
        { t: 'J’ai une légère nausée', c: 'orange' },
        { t: ' et ', c: null },
        { t: 'je suis nerveux', c: 'green' },
        { t: '. ', c: null },
        { t: 'Pas de fièvre', c: 'neutral' },
        { t: '.', c: null },
      ],
      findings: [
        { label: 'Douleur au ventre', pct: 80 },
        { label: 'Nausée', pct: 58 },
        { label: 'Signes de stress', pct: 69 },
      ],
      causes: [
        { label: 'Lié au stress', prob: 'high', desc: 'Le moment de l’examen va dans ce sens.' },
        { label: 'Trouble digestif', prob: 'mid', desc: 'Douleur type crampes sans fièvre.' },
        { label: 'Gastro-entérite', prob: 'low', desc: 'Aucune fièvre ou diarrhée signalée.' },
      ],
      steps: ['Respirer calmement, repas léger.', 'Bien s’hydrater.', 'Consulter en cas de fièvre ou forte douleur.'],
    },
    throat: {
      title: 'Mal de gorge',
      urgency: 'low',
      urgencyLabel: 'Faible',
      urgencyTag: 'pas une urgence',
      urgencyDesc: 'Aucun signe d’urgence détecté. Surveille l’évolution sur 24 heures.',
      segments: [
        { t: 'Depuis hier soir j’ai ', c: null },
        { t: 'mal à la gorge', c: 'blue' },
        { t: ' en avalant. ', c: null },
        { t: 'Une toux légère est apparue', c: 'orange' },
        { t: ' et ', c: null },
        { t: 'ma voix est un peu enrouée', c: 'green' },
        { t: '. ', c: null },
        { t: 'Pas de fièvre', c: 'neutral' },
        { t: '.', c: null },
      ],
      findings: [
        { label: 'Douleur à la gorge', pct: 82 },
        { label: 'Difficulté à avaler', pct: 70 },
        { label: 'Toux', pct: 44 },
      ],
      causes: [
        { label: 'Rhume viral', prob: 'high', desc: 'Correspond à la toux et la voix enrouée sans fièvre.' },
        { label: 'Air sec', prob: 'mid', desc: 'Peut expliquer la difficulté à avaler sans infection.' },
        { label: 'Angine bactérienne', prob: 'low', desc: 'Moins probable sans fièvre.' },
      ],
      steps: ['Boire beaucoup, ménager sa voix.', 'Boissons chaudes ou pastilles.', 'Consulter en cas de fièvre ou gêne respiratoire.'],
    },
  },
};

/** Entries per pattern region (rows) per ISO week (columns). */
export const HEAT: number[][] = [
  [1, 2, 1, 3, 2, 1, 3, 2],
  [0, 1, 0, 1, 1, 0, 0, 1],
  [0, 2, 1, 0, 2, 1, 2, 2],
  [0, 0, 1, 0, 0, 1, 0, 0],
  [1, 0, 1, 0, 1, 0, 1, 0],
];
