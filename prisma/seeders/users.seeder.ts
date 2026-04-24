import { PrismaClient, UserRole } from "@prisma/client";
import crypto from "crypto";

/**
 * Seeds initial users with PBKDF2 hashed passwords
 */
export async function seedUsers(prisma: PrismaClient) {
  console.log("🌱 Seeding Users...");

  const users = [
    {
      email: "aiforhu@gmail.com",
      username: "ChummeAI",
      name: "Chumme Global Connect",
      role: UserRole.SUPER_ADMIN,
      password: "Forhu2026!",
      isEmailVerified: true,
      onboardingCompleted: true,
    },
    {
      email: "melomaku01@gmail.com",
      username: "pogi123",
      name: "Mark Pogi It",
      role: UserRole.DEVELOPER,
      password: "Password123!",
      isEmailVerified: true,
      onboardingCompleted: true,
    },
    {
      email: "sumoaccnt@gmail.com",
      username: "sumoDev",
      name: "Sumo Suntok",
      role: UserRole.DEVELOPER,
      password: "@Password17",
      isEmailVerified: true,
      onboardingCompleted: true,
    },
    {
      email: "euanthieu@yopmail.com",
      username: "u1",
      name: "u1",
      role: UserRole.DEVELOPER,
      password: "Abc12345",
      isEmailVerified: true,
      onboardingCompleted: true,
    },
    {
      email: "jewish@test.com",
      username: "Jewish",
      name: "Jewish",
      role: UserRole.CREATOR,
      password: "Password123!",
      isEmailVerified: true,
      onboardingCompleted: true,
    },
    {
      email: "userTwo@test.com",
      username: "TestUser2",
      name: "Test User Two",
      role: UserRole.ADMIN,
      password: "Abc12345",
      isEmailVerified: true,
      onboardingCompleted: true,
    },
    {
      email: "userThree@test.com",
      username: "TestThree2",
      name: "Test User Three",
      role: UserRole.ADMIN,
      password: "Abc12345",
      isEmailVerified: true,
      onboardingCompleted: true,
    },
    {
      email: "ibaloiakhehe@gmail.com",
      username: "JUTS_CLYDE",
      name: "JUTS_CLYDE ding ba",
      role: UserRole.ADMIN,
      password: "PogiJun123456",
      isEmailVerified: true,
      onboardingCompleted: true,
    },
  ];

  for (const userData of users) {
    const { password, ...rest } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: rest.email },
    });

    if (!existingUser) {
      // Hash password using the same method as AuthSvc
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto
        .pbkdf2Sync(password, salt, 1000, 64, "sha512")
        .toString("hex");
      const hashedPassword = `${salt}:${hash}`;

      await prisma.user.create({
        data: {
          ...rest,
          password: hashedPassword,
        },
      });
      console.log(`✅ Created user: ${rest.email}`);
    } else {
      console.log(`ℹ️ User already exists: ${rest.email}`);
    }
  }
}
