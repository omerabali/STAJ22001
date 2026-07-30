import { PrismaClient, Role } from "@prisma/client";

export interface ChangeUserRoleDTO {
  targetUserId: string;
  newRole: Role;
  requestingAdminId?: string;
}

export class ChangeUserRoleUseCase {
  public static async execute(
    dto: ChangeUserRoleDTO,
    prisma: PrismaClient
  ): Promise<{ id: string; role: Role }> {
    const { targetUserId, newRole, requestingAdminId } = dto;

    if (!newRole || !Object.values(Role).includes(newRole)) {
      throw new Error("Geçersiz rol belirtildi.");
    }

    // Kendi rolünü değiştirme engeli
    if (requestingAdminId && requestingAdminId === targetUserId) {
      const err = new Error("Kendi rolünüzü değiştiremezsiniz.");
      (err as any).statusCode = 400;
      throw err;
    }

    // Hedef kullanıcı var mı?
    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!existingUser) {
      const err = new Error("Kullanıcı bulunamadı.");
      (err as any).statusCode = 404;
      throw err;
    }

    // GÜVENLİK KURALI: Yönetici olan biri CANDIDATE rolüne düşürülemez!
    if (existingUser.role === Role.ADMIN && newRole === Role.CANDIDATE) {
      const err = new Error("Yöneticiler aday rolüne düşürülemez.");
      (err as any).statusCode = 403;
      throw err;
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: { id: true, role: true }
    });

    return updatedUser;
  }
}
