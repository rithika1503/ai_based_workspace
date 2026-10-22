import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days

export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ userId }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign({ userId, jti: uuidv4() }, REFRESH_SECRET, {
    expiresIn: '7d',
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
};

export const register = async (
  name: string,
  email: string,
  password: string
) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already in use', 409);

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true, avatar: true },
  });

  const { accessToken, refreshToken } = generateTokens(user.id);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_IN),
    },
  });

  return { user, accessToken, refreshToken };
};

export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw new AppError('Invalid credentials', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid credentials', 401);

  const { accessToken, refreshToken } = generateTokens(user.id);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_IN),
    },
  });

  const safeUser = { id: user.id, name: user.name, email: user.email, avatar: user.avatar };
  return { user: safeUser, accessToken, refreshToken };
};

export const refresh = async (token: string) => {
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  let decoded: { userId: string };
  try {
    decoded = jwt.verify(token, REFRESH_SECRET) as { userId: string };
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }

  // Rotate: revoke old, issue new
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: decoded.userId,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_IN),
    },
  });

  return { accessToken, refreshToken: newRefreshToken };
};

export const logout = async (token: string) => {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revoked: true },
  });
};
