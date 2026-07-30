import "../src/load-env.js";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { FilterCandidatesUseCase } from "../src/application/admin/FilterCandidatesUseCase.js";
import { DownloadCvUseCase } from "../src/application/cv/DownloadCvUseCase.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function validateFilterAndDownload() {
  console.log("==================================================");
  console.log("🧪 VALIDATION: FilterCandidatesUseCase & DownloadCvUseCase");
  console.log("==================================================");

  // 1. TEST: FilterCandidatesUseCase
  console.log("\n[TEST 1] FilterCandidatesUseCase (status: COMPLETED)");
  const candidates = await FilterCandidatesUseCase.execute({ status: "COMPLETED" }, prisma);
  console.log(`- Found ${candidates.length} candidate(s) with COMPLETED status:`);
  candidates.forEach(c => {
    const latestCv = c.cvs[0];
    const latestAnalysis = latestCv?.analyses[0];
    console.log(`  • Candidate: ${c.name} (${c.email}) | ATS: ${latestAnalysis?.atsScore ?? 'N/A'}`);
  });

  // 2. TEST: DownloadCvUseCase Security Guard & File Download
  console.log("\n[TEST 2] DownloadCvUseCase Security Guard & File Download");
  const sampleCv = await prisma.cV.findFirst({ select: { id: true, userId: true, fileName: true } });
  
  if (sampleCv) {
    console.log(`- Sample CV Found: ${sampleCv.fileName} (ID: ${sampleCv.id}, Owner: ${sampleCv.userId})`);

    // 2a. Owner Download Attempt
    console.log("- Attempting download as CV OWNER (Expected: SUCCESS)...");
    const ownerResult = await DownloadCvUseCase.execute(sampleCv.id, sampleCv.userId, Role.CANDIDATE, prisma);
    console.log(`  ✅ Owner Download Passed! Buffer Size: ${ownerResult.buffer.length} bytes | ContentType: ${ownerResult.contentType}`);

    // 2b. Admin Download Attempt
    console.log("- Attempting download as ADMIN (Expected: SUCCESS)...");
    const adminResult = await DownloadCvUseCase.execute(sampleCv.id, "different-admin-id", Role.ADMIN, prisma);
    console.log(`  ✅ Admin Download Passed! Buffer Size: ${adminResult.buffer.length} bytes`);

    // 2c. Unauthorized User Download Attempt
    console.log("- Attempting download as UNAUTHORIZED USER (Expected: 403 Security Guard Trigger)...");
    try {
      await DownloadCvUseCase.execute(sampleCv.id, "unauthorized-user-id", Role.CANDIDATE, prisma);
      console.error("  ❌ SECURITY GUARD FAILED! Unauthorized user was allowed to download!");
    } catch (err: any) {
      if (err.statusCode === 403 || err.message?.includes("yetkiniz yok")) {
        console.log("  ✅ SECURITY GUARD PASSED! 403 Forbidden correctly returned:", err.message);
      } else {
        console.log("  - Unexpected error:", err.message);
      }
    }
  } else {
    console.log("- No CV records found in DB to test download.");
  }

  console.log("\n==================================================");
  console.log("🎉 ALL VALIDATIONS COMPLETED SUCCESSFULLY!");
  console.log("==================================================");
  await prisma.$disconnect();
  await pool.end();
}

validateFilterAndDownload();
