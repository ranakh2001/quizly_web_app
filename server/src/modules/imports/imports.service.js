import bcrypt from 'bcryptjs';
import { badRequest } from '../../shared/errors.js';
import { parseSpreadsheet } from './spreadsheet.js';
import * as importsRepository from './imports.repository.js';

const STUDENT_HEADERS = ['name', 'student_code', 'class', 'password'];
const TEACHER_HEADERS = ['name', 'username', 'password'];

// Rule 12: validate everything first, then report created/updated/rejected rows with a
// row number and reason. A file missing a required column is rejected entirely (nothing
// saved); an individual bad row (e.g. unknown class) is skipped but the rest still import.
export async function importStudents(db, file) {
  return runImport(db, file, {
    requiredHeaders: STUDENT_HEADERS,
    buildContext: (database) => importsRepository.mapClassNamesToIds(database),
    mapRow: (row, classByName) => {
      const { name, student_code: studentCode, class: className, password } = row;
      if (!name || !studentCode || !className || !password) {
        return { error: 'Missing required field(s)' };
      }
      const classId = classByName.get(className.toLowerCase());
      if (!classId) return { error: `Unknown class "${className}"` };
      return { data: { name, studentCode, classId, password } };
    },
    upsertRow: (database, data) => {
      const passwordHash = bcrypt.hashSync(data.password, 10);
      const existing = importsRepository.findStudentByCode(database, data.studentCode);
      if (existing) {
        importsRepository.updateStudent(database, existing.id, {
          name: data.name,
          classId: data.classId,
          passwordHash,
        });
        return 'updated';
      }
      importsRepository.insertStudent(database, {
        name: data.name,
        studentCode: data.studentCode,
        classId: data.classId,
        passwordHash,
      });
      return 'created';
    },
  });
}

export async function importTeachers(db, file) {
  return runImport(db, file, {
    requiredHeaders: TEACHER_HEADERS,
    mapRow: (row) => {
      const { name, username, password } = row;
      if (!name || !username || !password) {
        return { error: 'Missing required field(s)' };
      }
      return { data: { name, username, password } };
    },
    upsertRow: (database, data) => {
      const passwordHash = bcrypt.hashSync(data.password, 10);
      const existing = importsRepository.findTeacherByUsername(database, data.username);
      if (existing) {
        importsRepository.updateTeacher(database, existing.id, { name: data.name, passwordHash });
        return 'updated';
      }
      importsRepository.insertTeacher(database, {
        name: data.name,
        username: data.username,
        passwordHash,
      });
      return 'created';
    },
  });
}

async function runImport(db, file, { requiredHeaders, buildContext, mapRow, upsertRow }) {
  const { headers, rows } = await parseSpreadsheet(file.buffer, file.filename);
  assertHeaders(headers, requiredHeaders);
  const context = buildContext ? buildContext(db) : undefined;

  const report = { createdCount: 0, updatedCount: 0, rejected: [] };
  rows.forEach((row, index) => {
    const rowNumber = index + 2; // row 1 is the header
    const mapped = mapRow(row, context);
    if (mapped.error) {
      report.rejected.push({ row: rowNumber, reason: mapped.error });
      return;
    }
    const outcome = upsertRow(db, mapped.data);
    if (outcome === 'created') report.createdCount += 1;
    else report.updatedCount += 1;
  });

  return report;
}

function assertHeaders(actualHeaders, requiredHeaders) {
  const missing = requiredHeaders.filter((header) => !actualHeaders.includes(header));
  if (missing.length > 0) {
    throw badRequest(`File is missing required column(s): ${missing.join(', ')}`);
  }
}
