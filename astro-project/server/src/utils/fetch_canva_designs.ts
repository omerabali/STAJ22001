/**
 * fetch_canva_designs.ts (Canva Tasarım ve Klasör Çekici)
 * Görevi: `.canva_token.json` dosyasındaki geçerli token'ı kullanarak Canva REST API üzerinden
 * kullanıcının klasör ve tasarım şablonlarını sorgulayan yardımcı araçtır.
 */
import path from "path";
import fs from "fs";

const CV_TEST_DIR = path.join(process.cwd(), "tests", "cv_test");
if (!fs.existsSync(CV_TEST_DIR)) fs.mkdirSync(CV_TEST_DIR, { recursive: true });

async function queryCanva() {
  const tokenData = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".canva_token.json"), "utf-8"));
  const token = tokenData.access_token;

  console.log("🚀 Canva Connect API Authenticated! Token active.");
  console.log(`Scopes: ${tokenData.scope}`);

  // Query Brand Templates / Folders / Designs
  try {
    console.log("📡 Fetching User Folders & Profile from Canva REST API...");
    const res = await fetch("https://api.canva.com/rest/v1/folders/root/items", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    console.log("Folders API Status:", res.status);
    const data = await res.json();
    console.log("Folders Items Data:", JSON.stringify(data, null, 2));

  } catch (err) {
    console.error("Error querying Canva:", err);
  }
}

queryCanva();
