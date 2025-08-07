const express = require("express");
const axios = require("axios");
const app = express();

require("dotenv").config();

const PORT = process.env.PORT || 10000;
const HA_WEBHOOK_URL = process.env.HA_WEBHOOK_URL;
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN;

if (!HA_WEBHOOK_URL || !WEBHOOK_TOKEN) {
  console.error("환경변수 HA_WEBHOOK_URL 또는 WEBHOOK_TOKEN 누락");
  process.exit(1);
}

app.use(express.json());

app.post("/smartthings", async (req, res) => {
  const incomingToken = req.query.token;
  const body = req.body;
  const lifecycle = body.lifecycle;

  // 🔐 Token 인증
  if (incomingToken !== WEBHOOK_TOKEN) {
    console.warn("❌ 잘못된 토큰:", incomingToken);
    return res.status(403).send("Forbidden");
  }

  // 📡 PING: SmartThings 검증용
  if (lifecycle === "PING") {
    console.log("📡 PING 수신됨");
    return res.json({
      statusCode: 200,
      pingData: {
        challenge: body.pingData.challenge
      }
    });
  }

  // ✅ CONFIRMATION: SmartThings 앱 등록 확인용
  if (lifecycle === "CONFIRMATION") {
    const confirmUrl = body.confirmationData.confirmationUrl;
    console.log("🔗 CONFIRMATION URL 호출 중:", confirmUrl);
    try {
      await axios.get(confirmUrl); // SmartThings로 직접 GET 호출
      console.log("✅ CONFIRMATION GET 성공");
      return res.status(200).send("CONFIRMATION DONE");
    } catch (err) {
      console.error("❌ CONFIRMATION 실패:", err.message);
      return res.status(500).send("CONFIRMATION FAILED");
    }
  }

  // 📦 INSTALL: 앱이 설치될 때
  if (lifecycle === "INSTALL") {
    console.log("📦 SmartApp 설치됨");
    return res.status(200).json({ statusCode: 200 });
  }

  // 🔔 EVENT: 도어락 이벤트 등
  if (lifecycle === "EVENT") {
    console.log("📨 EVENT 수신 → HA로 전달 시도");

    try {
      await axios.post(HA_WEBHOOK_URL, body); // HA로 전달
      return res.status(200).send("OK");
    } catch (err) {
      console.error("🚨 HA Webhook 전송 실패:", err.message);
      return res.status(500).send("HA 전송 실패");
    }
  }

  // ❓ 알 수 없는 요청
  console.warn("❓ 알 수 없는 lifecycle:", lifecycle);
  return res.status(400).send("Unsupported lifecycle");
});

app.listen(PORT, () => {
  console.log(`✅ SmartThings Webhook listening on port ${PORT}`);
});
