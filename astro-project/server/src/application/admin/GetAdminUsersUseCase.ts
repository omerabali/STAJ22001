export class GetAdminUsersUseCase {
  public static async execute(currentAdminId: string, prisma: any) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: "CANDIDATE" },
          { id: currentAdminId }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return { users };
  }
}
