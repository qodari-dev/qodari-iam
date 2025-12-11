import argon2 from 'argon2';

export async function hashPassword(passStr: string): Promise<string> {
  try {
    return await argon2.hash(passStr);
  } catch (e) {
    console.log(`[Error]@hashPassword: `, e);
    throw e;
  }
}

export async function verifyPassword(passStr: string, passHash: string): Promise<boolean> {
  try {
    return await argon2.verify(passHash, passStr);
  } catch (e) {
    console.log(`[Error]@verifyPassword: `, e);
    throw e;
  }
}
