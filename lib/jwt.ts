import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

export interface JWTPayload {
  phoneNumber: string;
  exp?: number;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT({ phoneNumber: payload.phoneNumber })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d') // 1 year - won't expire until user logs out
    .sign(JWT_SECRET);

  return token;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      phoneNumber: payload.phoneNumber as string,
      exp: payload.exp,
    };
  } catch (error) {
    return null;
  }
}
