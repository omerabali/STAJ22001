import { PrismaClient } from "@prisma/client";
import { PasswordHasher } from "../../infrastructure/security/PasswordHasher.js";
import { JwtService } from "../../infrastructure/security/JwtService.js";

export interface LoginDTO {
  email?: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string;
    role: "ADMIN" | "CANDIDATE";
    avatarUrl: string | null;
  };
}

export class LoginUserUseCase {
  public static async execute(
    dto: LoginDTO,
    prisma: PrismaClient
  ): Promise<LoginResponse> {
    const trimmedEmail = (dto.email || "").trim().toLowerCase();
    const passwordStr = dto.password || "";

    if (!trimmedEmail || !passwordStr) {
      throw new Error("Email ve şifre zorunludur.");
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error("Lütfen geçerli bir @gmail.com adresi girin.");
    }

    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (!user) {
      throw new Error("Geçersiz email veya şifre.");
    }

    const isValid = await PasswordHasher.compare(passwordStr, user.passwordHash);
    if (!isValid) {
      throw new Error("Geçersiz email veya şifre.");
    }

    const token = JwtService.signToken({ id: user.id, email: user.email, role: user.role, name: user.name });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl
      }
    };
  }
}
