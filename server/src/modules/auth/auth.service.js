import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../../config.js';
import { SESSION_DURATION } from '../../constants.js';
import { unauthorized } from '../../shared/errors.js';
import * as authRepository from './auth.repository.js';

// Same error for "unknown identifier" and "wrong password" - rule 14 requires a generic
// login error so a caller can't tell which one it was.
const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

export function login(db, { studentCode, username, password }) {
  const user = studentCode
    ? authRepository.findByStudentCode(db, studentCode)
    : authRepository.findByUsername(db, username);

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    throw unauthorized(INVALID_CREDENTIALS_MESSAGE);
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: SESSION_DURATION,
  });

  return { token, user: toPublicUser(user) };
}

export function verifySession(db, token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized('Session expired or invalid');
  }

  const user = authRepository.findById(db, payload.sub);
  if (!user) throw unauthorized('Session expired or invalid');

  return toPublicUser(user);
}

function toPublicUser(user) {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    username: user.username,
    studentCode: user.studentCode,
    classId: user.classId,
    className: user.className,
  };
}
