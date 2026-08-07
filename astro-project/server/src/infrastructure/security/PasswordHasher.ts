/**
 * PasswordHasher.ts (Bcrypt Şifre Güvenlik Servisi)
 * Görevi: Kullanıcı şifrelerini Bcrypt algoritması (Salt Rounds: 10) ile güvenli şekilde hash'ler
 * ve giriş sırasında ham şifre ile hash'lenmiş şifreyi kıyaslar.
 */
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;//tuzlama derecesi sistemi yormaması açısından normaldir

export class PasswordHasher {
  /**
   * Hashes plain text password using bcrypt
   */
  public static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);//hashleme işlemi
  }

  /**
   * passwor ham şifredir hash ise db tutulan haslenmiş şifredir biz hamı alıp tekrar hasleriz sonra hasleri karşılaştırırız anladın mı beni
   */
  public static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
