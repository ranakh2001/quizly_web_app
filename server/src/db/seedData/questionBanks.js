import { randomInt, pick, shuffle } from './rng.js';

// Each bank entry is { text, points, options: [{ text, isCorrect }] } with exactly 4 options
// and exactly 1 correct one, matching the publish rule questions must satisfy.

const POINTS_CYCLE = [1, 2, 3];

function withShuffledOptions(rng, bank) {
  return bank.map((question, index) => ({
    text: question.text,
    points: POINTS_CYCLE[index % POINTS_CYCLE.length],
    options: shuffle(rng, question.options),
  }));
}

const MATH_OPERATIONS = [
  { symbol: '+', apply: (a, b) => a + b },
  { symbol: '-', apply: (a, b) => a - b },
  { symbol: '×', apply: (a, b) => a * b },
];

// Generated (not hand-authored) so correctness is guaranteed by construction: the distractors
// are just the correct answer nudged by a random offset.
export function generateMathQuestions(rng, count = 15) {
  const questions = [];

  for (let i = 0; i < count; i += 1) {
    const operation = pick(rng, MATH_OPERATIONS);
    const range = operation.symbol === '×' ? 12 : 60;
    const a = randomInt(rng, 2, range);
    const b = randomInt(rng, 2, range);
    const correct = operation.apply(a, b);

    const distractors = new Set();
    while (distractors.size < 3) {
      const offset = randomInt(rng, 1, 9) * pick(rng, [1, -1]);
      const candidate = correct + offset;
      if (candidate !== correct) distractors.add(candidate);
    }

    const options = shuffle(rng, [
      { text: String(correct), isCorrect: true },
      ...[...distractors].map((value) => ({ text: String(value), isCorrect: false })),
    ]);

    questions.push({
      text: `What is ${a} ${operation.symbol} ${b}?`,
      points: POINTS_CYCLE[i % POINTS_CYCLE.length],
      options,
    });
  }

  return questions;
}

const SCIENCE_BANK = [
  {
    text: 'What planet is known as the Red Planet?',
    options: [
      { text: 'Mars', isCorrect: true },
      { text: 'Venus', isCorrect: false },
      { text: 'Jupiter', isCorrect: false },
      { text: 'Saturn', isCorrect: false },
    ],
  },
  {
    text: 'What gas do plants absorb from the atmosphere for photosynthesis?',
    options: [
      { text: 'Oxygen', isCorrect: false },
      { text: 'Carbon dioxide', isCorrect: true },
      { text: 'Nitrogen', isCorrect: false },
      { text: 'Hydrogen', isCorrect: false },
    ],
  },
  {
    text: 'What is the chemical symbol for water?',
    options: [
      { text: 'H2O', isCorrect: true },
      { text: 'CO2', isCorrect: false },
      { text: 'O2', isCorrect: false },
      { text: 'NaCl', isCorrect: false },
    ],
  },
  {
    text: 'How many bones are in the adult human body?',
    options: [
      { text: '206', isCorrect: true },
      { text: '186', isCorrect: false },
      { text: '226', isCorrect: false },
      { text: '196', isCorrect: false },
    ],
  },
  {
    text: 'What force pulls objects toward the Earth?',
    options: [
      { text: 'Gravity', isCorrect: true },
      { text: 'Magnetism', isCorrect: false },
      { text: 'Friction', isCorrect: false },
      { text: 'Tension', isCorrect: false },
    ],
  },
  {
    text: 'What is the powerhouse of the cell?',
    options: [
      { text: 'Mitochondria', isCorrect: true },
      { text: 'Nucleus', isCorrect: false },
      { text: 'Ribosome', isCorrect: false },
      { text: 'Golgi apparatus', isCorrect: false },
    ],
  },
  {
    text: "What is water's boiling point at sea level in Celsius?",
    options: [
      { text: '100', isCorrect: true },
      { text: '90', isCorrect: false },
      { text: '120', isCorrect: false },
      { text: '80', isCorrect: false },
    ],
  },
  {
    text: 'Which planet has rings clearly visible from Earth?',
    options: [
      { text: 'Saturn', isCorrect: true },
      { text: 'Mercury', isCorrect: false },
      { text: 'Mars', isCorrect: false },
      { text: 'Venus', isCorrect: false },
    ],
  },
  {
    text: 'What type of energy is stored in food?',
    options: [
      { text: 'Chemical energy', isCorrect: true },
      { text: 'Kinetic energy', isCorrect: false },
      { text: 'Nuclear energy', isCorrect: false },
      { text: 'Sound energy', isCorrect: false },
    ],
  },
  {
    text: 'What is the largest organ in the human body?',
    options: [
      { text: 'Skin', isCorrect: true },
      { text: 'Liver', isCorrect: false },
      { text: 'Heart', isCorrect: false },
      { text: 'Lungs', isCorrect: false },
    ],
  },
  {
    text: 'What gas do humans need to breathe to survive?',
    options: [
      { text: 'Oxygen', isCorrect: true },
      { text: 'Nitrogen', isCorrect: false },
      { text: 'Carbon dioxide', isCorrect: false },
      { text: 'Helium', isCorrect: false },
    ],
  },
  {
    text: 'What instrument is used to measure temperature?',
    options: [
      { text: 'Thermometer', isCorrect: true },
      { text: 'Barometer', isCorrect: false },
      { text: 'Speedometer', isCorrect: false },
      { text: 'Altimeter', isCorrect: false },
    ],
  },
  {
    text: 'What is the process by which plants make their own food called?',
    options: [
      { text: 'Photosynthesis', isCorrect: true },
      { text: 'Respiration', isCorrect: false },
      { text: 'Digestion', isCorrect: false },
      { text: 'Fermentation', isCorrect: false },
    ],
  },
  {
    text: 'What is the closest star to Earth?',
    options: [
      { text: 'The Sun', isCorrect: true },
      { text: 'Proxima Centauri', isCorrect: false },
      { text: 'Sirius', isCorrect: false },
      { text: 'Betelgeuse', isCorrect: false },
    ],
  },
  {
    text: 'Which state of matter has a fixed shape and volume?',
    options: [
      { text: 'Solid', isCorrect: true },
      { text: 'Liquid', isCorrect: false },
      { text: 'Gas', isCorrect: false },
      { text: 'Plasma', isCorrect: false },
    ],
  },
];

const HISTORY_BANK = [
  {
    text: 'In which year did World War II end?',
    options: [
      { text: '1945', isCorrect: true },
      { text: '1939', isCorrect: false },
      { text: '1918', isCorrect: false },
      { text: '1950', isCorrect: false },
    ],
  },
  {
    text: 'Who was the first president of the United States?',
    options: [
      { text: 'George Washington', isCorrect: true },
      { text: 'Abraham Lincoln', isCorrect: false },
      { text: 'Thomas Jefferson', isCorrect: false },
      { text: 'John Adams', isCorrect: false },
    ],
  },
  {
    text: 'Which ancient civilization built the pyramids of Giza?',
    options: [
      { text: 'Ancient Egyptians', isCorrect: true },
      { text: 'Romans', isCorrect: false },
      { text: 'Greeks', isCorrect: false },
      { text: 'Persians', isCorrect: false },
    ],
  },
  {
    text: 'The Great Wall is located in which country?',
    options: [
      { text: 'China', isCorrect: true },
      { text: 'India', isCorrect: false },
      { text: 'Japan', isCorrect: false },
      { text: 'Mongolia', isCorrect: false },
    ],
  },
  {
    text: 'Who is known for developing the theory of relativity?',
    options: [
      { text: 'Albert Einstein', isCorrect: true },
      { text: 'Isaac Newton', isCorrect: false },
      { text: 'Nikola Tesla', isCorrect: false },
      { text: 'Galileo Galilei', isCorrect: false },
    ],
  },
  {
    text: 'Which empire was ruled by Julius Caesar?',
    options: [
      { text: 'Roman Empire', isCorrect: true },
      { text: 'Ottoman Empire', isCorrect: false },
      { text: 'British Empire', isCorrect: false },
      { text: 'Persian Empire', isCorrect: false },
    ],
  },
  {
    text: "In which city was the Islamic Golden Age's House of Wisdom located?",
    options: [
      { text: 'Baghdad', isCorrect: true },
      { text: 'Cairo', isCorrect: false },
      { text: 'Damascus', isCorrect: false },
      { text: 'Istanbul', isCorrect: false },
    ],
  },
  {
    text: 'Who wrote the Declaration of Independence?',
    options: [
      { text: 'Thomas Jefferson', isCorrect: true },
      { text: 'Benjamin Franklin', isCorrect: false },
      { text: 'George Washington', isCorrect: false },
      { text: 'John Adams', isCorrect: false },
    ],
  },
  {
    text: 'Which war was fought between the North and South regions of the United States?',
    options: [
      { text: 'The Civil War', isCorrect: true },
      { text: 'World War I', isCorrect: false },
      { text: 'The Revolutionary War', isCorrect: false },
      { text: 'The Cold War', isCorrect: false },
    ],
  },
  {
    text: 'The Silk Road primarily connected which two continents?',
    options: [
      { text: 'Asia and Europe', isCorrect: true },
      { text: 'Africa and Australia', isCorrect: false },
      { text: 'North America and Europe', isCorrect: false },
      { text: 'Asia and Australia', isCorrect: false },
    ],
  },
  {
    text: 'Who was the famous queen of ancient Egypt known for her alliance with Rome?',
    options: [
      { text: 'Cleopatra', isCorrect: true },
      { text: 'Nefertiti', isCorrect: false },
      { text: 'Hatshepsut', isCorrect: false },
      { text: 'Isis', isCorrect: false },
    ],
  },
  {
    text: 'Which country gifted the Statue of Liberty to the United States?',
    options: [
      { text: 'France', isCorrect: true },
      { text: 'Britain', isCorrect: false },
      { text: 'Spain', isCorrect: false },
      { text: 'Italy', isCorrect: false },
    ],
  },
  {
    text: 'What ancient wonder was located in Alexandria?',
    options: [
      { text: 'The Lighthouse of Alexandria', isCorrect: true },
      { text: 'The Colossus of Rhodes', isCorrect: false },
      { text: 'The Hanging Gardens', isCorrect: false },
      { text: 'The Great Pyramid', isCorrect: false },
    ],
  },
  {
    text: 'Which explorer is credited with reaching the Americas in 1492?',
    options: [
      { text: 'Christopher Columbus', isCorrect: true },
      { text: 'Vasco da Gama', isCorrect: false },
      { text: 'Ferdinand Magellan', isCorrect: false },
      { text: 'Marco Polo', isCorrect: false },
    ],
  },
  {
    text: 'The Renaissance began in which country?',
    options: [
      { text: 'Italy', isCorrect: true },
      { text: 'France', isCorrect: false },
      { text: 'Germany', isCorrect: false },
      { text: 'Spain', isCorrect: false },
    ],
  },
];

const CHEMISTRY_BANK = [
  {
    text: 'What is the atomic number of Hydrogen?',
    options: [
      { text: '1', isCorrect: true },
      { text: '2', isCorrect: false },
      { text: '6', isCorrect: false },
      { text: '8', isCorrect: false },
    ],
  },
  {
    text: 'What is the chemical symbol for Gold?',
    options: [
      { text: 'Au', isCorrect: true },
      { text: 'Ag', isCorrect: false },
      { text: 'Gd', isCorrect: false },
      { text: 'Go', isCorrect: false },
    ],
  },
  {
    text: 'What type of bond involves sharing electrons?',
    options: [
      { text: 'Covalent bond', isCorrect: true },
      { text: 'Ionic bond', isCorrect: false },
      { text: 'Metallic bond', isCorrect: false },
      { text: 'Hydrogen bond', isCorrect: false },
    ],
  },
  {
    text: 'What is the pH of a neutral solution?',
    options: [
      { text: '7', isCorrect: true },
      { text: '0', isCorrect: false },
      { text: '14', isCorrect: false },
      { text: '1', isCorrect: false },
    ],
  },
  {
    text: 'Which particle has a negative charge?',
    options: [
      { text: 'Electron', isCorrect: true },
      { text: 'Proton', isCorrect: false },
      { text: 'Neutron', isCorrect: false },
      { text: 'Positron', isCorrect: false },
    ],
  },
  {
    text: "What is the most abundant gas in Earth's atmosphere?",
    options: [
      { text: 'Nitrogen', isCorrect: true },
      { text: 'Oxygen', isCorrect: false },
      { text: 'Carbon dioxide', isCorrect: false },
      { text: 'Argon', isCorrect: false },
    ],
  },
  {
    text: 'What do we call a substance that speeds up a reaction without being consumed?',
    options: [
      { text: 'Catalyst', isCorrect: true },
      { text: 'Reactant', isCorrect: false },
      { text: 'Solvent', isCorrect: false },
      { text: 'Isotope', isCorrect: false },
    ],
  },
  {
    text: 'What is the chemical formula for table salt?',
    options: [
      { text: 'NaCl', isCorrect: true },
      { text: 'KCl', isCorrect: false },
      { text: 'CaCl2', isCorrect: false },
      { text: 'NaOH', isCorrect: false },
    ],
  },
  {
    text: 'Which state of matter has particles that are most tightly packed?',
    options: [
      { text: 'Solid', isCorrect: true },
      { text: 'Liquid', isCorrect: false },
      { text: 'Gas', isCorrect: false },
      { text: 'Plasma', isCorrect: false },
    ],
  },
  {
    text: 'What is the process of a liquid turning into a gas called?',
    options: [
      { text: 'Evaporation', isCorrect: true },
      { text: 'Condensation', isCorrect: false },
      { text: 'Sublimation', isCorrect: false },
      { text: 'Deposition', isCorrect: false },
    ],
  },
  {
    text: 'What is the smallest unit of an element that retains its properties?',
    options: [
      { text: 'Atom', isCorrect: true },
      { text: 'Molecule', isCorrect: false },
      { text: 'Ion', isCorrect: false },
      { text: 'Electron', isCorrect: false },
    ],
  },
  {
    text: 'Which element is essential for respiration in humans?',
    options: [
      { text: 'Oxygen', isCorrect: true },
      { text: 'Nitrogen', isCorrect: false },
      { text: 'Helium', isCorrect: false },
      { text: 'Neon', isCorrect: false },
    ],
  },
  {
    text: 'What is the term for a substance made of two or more elements chemically combined?',
    options: [
      { text: 'Compound', isCorrect: true },
      { text: 'Mixture', isCorrect: false },
      { text: 'Solution', isCorrect: false },
      { text: 'Alloy', isCorrect: false },
    ],
  },
  {
    text: 'What is the chemical symbol for Iron?',
    options: [
      { text: 'Fe', isCorrect: true },
      { text: 'Ir', isCorrect: false },
      { text: 'In', isCorrect: false },
      { text: 'Fr', isCorrect: false },
    ],
  },
  {
    text: 'Which of these is a noble gas?',
    options: [
      { text: 'Neon', isCorrect: true },
      { text: 'Nitrogen', isCorrect: false },
      { text: 'Hydrogen', isCorrect: false },
      { text: 'Chlorine', isCorrect: false },
    ],
  },
];

const ARABIC_BANK = [
  {
    text: 'ما هو جمع كلمة "كتاب"؟',
    options: [
      { text: 'كتب', isCorrect: true },
      { text: 'كتابات', isCorrect: false },
      { text: 'كتيب', isCorrect: false },
      { text: 'كتبة', isCorrect: false },
    ],
  },
  {
    text: 'ما هو مرادف كلمة "سعيد"؟',
    options: [
      { text: 'فرح', isCorrect: true },
      { text: 'حزين', isCorrect: false },
      { text: 'غاضب', isCorrect: false },
      { text: 'خائف', isCorrect: false },
    ],
  },
  {
    text: 'ما هو ضد كلمة "كبير"؟',
    options: [
      { text: 'صغير', isCorrect: true },
      { text: 'طويل', isCorrect: false },
      { text: 'قصير', isCorrect: false },
      { text: 'عريض', isCorrect: false },
    ],
  },
  {
    text: 'أي مما يلي من حروف الجر؟',
    options: [
      { text: 'إلى', isCorrect: true },
      { text: 'هو', isCorrect: false },
      { text: 'قد', isCorrect: false },
      { text: 'لن', isCorrect: false },
    ],
  },
  {
    text: 'ما نوع الفعل في جملة "يكتب الطالب الدرس"؟',
    options: [
      { text: 'فعل مضارع', isCorrect: true },
      { text: 'فعل ماضٍ', isCorrect: false },
      { text: 'فعل أمر', isCorrect: false },
      { text: 'اسم فعل', isCorrect: false },
    ],
  },
  {
    text: 'ما إعراب كلمة "الطالبُ" في جملة "نجح الطالبُ"؟',
    options: [
      { text: 'فاعل مرفوع', isCorrect: true },
      { text: 'مفعول به منصوب', isCorrect: false },
      { text: 'مبتدأ مرفوع', isCorrect: false },
      { text: 'خبر مرفوع', isCorrect: false },
    ],
  },
  {
    text: 'ما هو المفرد من كلمة "طلاب"؟',
    options: [
      { text: 'طالب', isCorrect: true },
      { text: 'طلبة', isCorrect: false },
      { text: 'طالبة', isCorrect: false },
      { text: 'طلابي', isCorrect: false },
    ],
  },
  {
    text: 'ما معنى كلمة "المجتهد"؟',
    options: [
      { text: 'من يبذل جهدًا كبيرًا', isCorrect: true },
      { text: 'الكسول', isCorrect: false },
      { text: 'المسافر', isCorrect: false },
      { text: 'المريض', isCorrect: false },
    ],
  },
  {
    text: 'ما هي علامة رفع الاسم المفرد؟',
    options: [
      { text: 'الضمة', isCorrect: true },
      { text: 'الفتحة', isCorrect: false },
      { text: 'الكسرة', isCorrect: false },
      { text: 'السكون', isCorrect: false },
    ],
  },
  {
    text: 'أي من الكلمات التالية اسم؟',
    options: [
      { text: 'مدرسة', isCorrect: true },
      { text: 'يذهب', isCorrect: false },
      { text: 'في', isCorrect: false },
      { text: 'لم', isCorrect: false },
    ],
  },
  {
    text: 'ما هو جمع كلمة "قلم"؟',
    options: [
      { text: 'أقلام', isCorrect: true },
      { text: 'قلمان', isCorrect: false },
      { text: 'أقلامة', isCorrect: false },
      { text: 'قلوم', isCorrect: false },
    ],
  },
  {
    text: 'ما هو ضد كلمة "بعيد"؟',
    options: [
      { text: 'قريب', isCorrect: true },
      { text: 'واسع', isCorrect: false },
      { text: 'عالٍ', isCorrect: false },
      { text: 'ثقيل', isCorrect: false },
    ],
  },
  {
    text: 'ما نوع الجملة "الجوُّ جميلٌ"؟',
    options: [
      { text: 'جملة اسمية', isCorrect: true },
      { text: 'جملة فعلية', isCorrect: false },
      { text: 'جملة شرطية', isCorrect: false },
      { text: 'جملة استفهامية', isCorrect: false },
    ],
  },
  {
    text: 'ما مرادف كلمة "جميل"؟',
    options: [
      { text: 'حسن', isCorrect: true },
      { text: 'قبيح', isCorrect: false },
      { text: 'بسيط', isCorrect: false },
      { text: 'غريب', isCorrect: false },
    ],
  },
  {
    text: 'ما إعراب كلمة "كتابًا" في جملة "قرأ الطالب كتابًا"؟',
    options: [
      { text: 'مفعول به منصوب', isCorrect: true },
      { text: 'فاعل مرفوع', isCorrect: false },
      { text: 'مبتدأ مرفوع', isCorrect: false },
      { text: 'نعت مجرور', isCorrect: false },
    ],
  },
];

export function scienceQuestions(rng) {
  return withShuffledOptions(rng, SCIENCE_BANK);
}

export function historyQuestions(rng) {
  return withShuffledOptions(rng, HISTORY_BANK);
}

export function chemistryQuestions(rng) {
  return withShuffledOptions(rng, CHEMISTRY_BANK);
}

export function arabicQuestions(rng) {
  return withShuffledOptions(rng, ARABIC_BANK);
}
