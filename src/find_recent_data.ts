import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.musicRecord.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      file: true,
      musicParts: {
        include: {
          singer: true,
        },
      },
    },
  });
  records.forEach((r) => {
    console.log(`ID: ${r.id}, URL: ${r.file?.fileUrl}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
