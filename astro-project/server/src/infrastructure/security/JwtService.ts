import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

export interface TokenPayload {
  id: string;
  email: string;
  role: "ADMIN" | "CANDIDATE";
  name?: string | null;
}

export class JwtService {
  /**
   * Signs a new JWT token for authenticated user
   */
  public static signToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Verifies and decodes JWT token
   */
  public static verifyToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  }
}
