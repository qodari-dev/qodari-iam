import argon2 from "argon2";

export async function hashPassword(passStr: string): Promise<string> {
  try {
    // Argon2 generates salt internally and returns the full hash string
    return await argon2.hash(passStr);
  } catch (e) {
    console.log(`[Error]@hashPassword: `, e);
    throw e;
  }
}

export async function verifyPassword(
  passStr: string,
  passHash: string,
): Promise<boolean> {
  try {
    // Argon2's verify function handles the comparison
    return await argon2.verify(passHash, passStr);
  } catch (e) {
    console.log(`[Error]@verifyPassword: `, e);
    throw e;
  }
}
