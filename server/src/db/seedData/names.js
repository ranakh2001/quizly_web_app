import { randomInt } from './rng.js';

const FIRST_NAMES_MALE = [
  'أحمد',
  'محمد',
  'عمر',
  'يوسف',
  'خالد',
  'زيد',
  'علي',
  'حسن',
  'ياسين',
  'طارق',
  'مصطفى',
  'كريم',
  'سامي',
  'فارس',
  'ماجد',
];

const FIRST_NAMES_FEMALE = [
  'سارة',
  'لين',
  'ريم',
  'نور',
  'دانة',
  'لمى',
  'رهف',
  'جنى',
  'ملك',
  'هدى',
  'ياسمين',
  'رغد',
  'ديما',
  'مي',
  'لارا',
];

const LAST_NAMES = [
  'الحمصي',
  'العبدالله',
  'الزعبي',
  'النجار',
  'الحوراني',
  'الخطيب',
  'السعدي',
  'قاسم',
  'عودة',
  'الفقيه',
  'شاهين',
  'درويش',
  'عساف',
  'الكردي',
  'حجازي',
];

// Combines name pools deterministically so the same rng seed always produces the same roster.
export function generatePersonName(rng) {
  const isMale = randomInt(rng, 0, 1) === 0;
  const first = isMale
    ? FIRST_NAMES_MALE[randomInt(rng, 0, FIRST_NAMES_MALE.length - 1)]
    : FIRST_NAMES_FEMALE[randomInt(rng, 0, FIRST_NAMES_FEMALE.length - 1)];
  const last = LAST_NAMES[randomInt(rng, 0, LAST_NAMES.length - 1)];
  return `${first} ${last}`;
}

export const ADMIN = { name: 'نور', username: 'admin' };

export const TEACHERS = [
  { name: 'أحمد الحمصي', username: 'teacher1' },
  { name: 'ريم الخطيب', username: 'teacher2' },
  { name: 'خالد النجار', username: 'teacher3' },
  { name: 'هدى شاهين', username: 'teacher4' },
];
