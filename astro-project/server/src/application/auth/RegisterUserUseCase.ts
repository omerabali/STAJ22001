/**
 * RegisterUserUseCase.ts (Yeni Kullanıcı Kaydı Kullanım Senaryosu)
 * Görevi: Yeni aday kaydı talebini işler. E-posta ve telefon numarasının benzersizliğini doğrular,
 * şifreyi Bcrypt ile güvenli şekilde hash'ler, kullanıcıyı oluşturur ve JWT jetonunu döner.
 */
import { PrismaClient } from "@prisma/client";
import { PasswordHasher } from "../../infrastructure/security/PasswordHasher.js";
import { JwtService } from "../../infrastructure/security/JwtService.js";

export interface RegisterDTO {
  email?: string;
  phone?: string;
  name?: string;
  password?: string;
}

export interface RegisterResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string;
    role: "ADMIN" | "CANDIDATE";
  };
}

export class RegisterUserUseCase {
  public static async execute(
    dto: RegisterDTO,
    prisma: PrismaClient
  ): Promise<RegisterResponse> {
    const trimmedEmail = (dto.email || "").trim().toLowerCase();
    const phoneStr = (dto.phone || "").trim();
    const nameStr = (dto.name || "").trim();
    const passwordStr = dto.password || "";

    // Validation rules
    if (!nameStr) {
      throw new Error("Ad Soyad zorunludur.");
    }
    const nameRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]{3,}$/;
    if (!nameRegex.test(nameStr)) {
      throw new Error("Ad Soyad en az 3 karakter olmalı ve yalnızca harflerden oluşmalıdır.");
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error("Yalnızca @gmail.com uzantılı e-posta adresleri kabul edilmektedir.");
    }

    const phoneRegex = /^5\d{9}$/;
    if (!phoneRegex.test(phoneStr)) {
      throw new Error("Telefon numarası 10 haneli olmalı ve 5 ile başlamalıdır (Örn: 5xxxxxxxxx).");
    }

    if (passwordStr.length < 6) {
      throw new Error("Şifre en az 6 karakter olmalıdır.");
    }

    if (passwordStr.includes(" ")) {
      throw new Error("Şifre boşluk karakteri içeremez.");
    }

    // Check duplicate email / phone
    const existingEmail = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existingEmail) {
      throw new Error("Bu email zaten kayıtlı.");
    }

    const existingPhone = await prisma.user.findUnique({ where: { phone: phoneStr } });
    if (existingPhone) {
      throw new Error("Bu telefon numarası zaten kayıtlı.");
    }

    // Hash password & assign role
    const passwordHash = await PasswordHasher.hash(passwordStr);//hashleme kısmı
    const role = trimmedEmail.startsWith("admin") ? "ADMIN" : "CANDIDATE";//kayıtın admin mi yoksa aday mı olduğunu kontrol ediyor.

    const user = await prisma.user.create({
      data: { email: trimmedEmail, phone: phoneStr, name: nameStr, passwordHash, role }
    });

    const token = JwtService.signToken({ id: user.id, email: user.email, role: user.role, name: user.name });//şifreleme

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role }
    };
  }
}
