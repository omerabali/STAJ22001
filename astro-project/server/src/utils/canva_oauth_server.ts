import http from "http";
import url from "url";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const CLIENT_ID = process.env.CANVA_CLIENT_ID || "";
const CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.CANVA_REDIRECT_URI || "http://127.0.0.1:3000/oauth/redirect";


function base64URLEncode(str: Buffer) {
  return str.toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

const codeVerifier = base64URLEncode(crypto.randomBytes(32));
const codeChallenge = base64URLEncode(crypto.createHash("sha256").update(codeVerifier).digest());

const authUrl = `https://www.canva.com/api/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code_challenge=${codeChallenge}&code_challenge_method=S256&scope=design:content:read%20design:meta:read%20folder:read%20brandtemplate:meta:read`;

console.log("\n============================================================");
console.log("🚀 CANVA OAUTH SERVER LISTENING ON http://127.0.0.1:3000");
console.log("============================================================");
console.log("Click this link to authorize:\n");
console.log(authUrl);
console.log("\n============================================================\n");

const server = http.createServer(async (req, res) => {
  const reqUrl = url.parse(req.url || "", true);

  if (reqUrl.pathname === "/oauth/redirect") {
    const authCode = reqUrl.query.code as string;
    const error = reqUrl.query.error as string;

    if (error) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<h2>❌ Authorization Failed: ${error}</h2>`);
      return;
    }

    if (!authCode) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h2>❌ Missing authorization code</h2>");
      return;
    }

    console.log("✅ Received Canva Authorization Code:", authCode);

    // Exchange code for access token
    try {
      const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
      const tokenRes = await fetch("https://api.canva.com/rest/v1/oauth/token", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: authCode,
          code_verifier: codeVerifier,
          redirect_uri: REDIRECT_URI
        })
      });

      const tokenData: any = await tokenRes.json();
      console.log("\n🎉 Canva Access Token Result:", JSON.stringify(tokenData, null, 2));

      if (tokenData.access_token) {
        fs.writeFileSync(path.join(process.cwd(), ".canva_token.json"), JSON.stringify(tokenData, null, 2));
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1 style='color:green;'>✅ Canva Connect API Authorized Successfully!</h1><p>You can close this tab now.</p>");
      } else {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<h2>❌ Token exchange failed: ${JSON.stringify(tokenData)}</h2>`);
      }
    } catch (err) {
      console.error("Token exchange error:", err);
      res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h2>Server Error during token exchange</h2>");
    } finally {
      setTimeout(() => server.close(), 2000);
    }
  }
});

server.listen(3000, "127.0.0.1");
