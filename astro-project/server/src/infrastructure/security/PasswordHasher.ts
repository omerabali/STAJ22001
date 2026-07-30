import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export class PasswordHasher {
  /**
   * Hashes plain text password using bcrypt
   */
  public static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compares plain text password with hashed password
   */
  public static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
