import { fileURLToPath } from 'node:url';
import logger from '../shared/logger.js';

// Placeholder. Seed data (admin, teachers, classes, students, quizzes) is added in Phase 1.
export function seed() {
  logger.info('seed: nothing to do yet');
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  seed();
}
