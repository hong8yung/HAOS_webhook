const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
app.use(bodyParser.json());

// 🔐 HA Webhook 주소는 환경변수에서 읽음
const HA_WEBHOOK_URL = process.env.HA_WEBHOOK_URL;

if (!HA_WEBHOOK_URL) {
  console.error("❌ HA_WEBHOOK_URL 환경변수가 설정되어 있지 않습니다.");
  process.exit(1); // 환경변수가 없으면 서버 중단
}

app.post('/smartthings', async (req, res) => {
  const body = req.body;
  console.log("📥 SmartThings Event:", JSON.stringify(body, null, 2));

  if (body.lifecycle === 'EVENT') {
    const events = body.eventData?.events || [];
    for (let e of events) {
      if (
        e.eventType === 'DEVICE_EVENT' &&
        e.deviceEvent.capability === 'lock' &&
        e.deviceEvent.value === 'unlocked'
      ) {
        try {
          await axios.post(HA_WEBHOOK_URL, {
            user: e.deviceEvent.data?.usedCode || 'unknown',
            method: e.deviceEvent.data?.method || 'fingerprint',
            timestamp: new Date().toISOString()
          });
          console.log("✅ Forwarded to Home Assistant webhook.");
        } catch (error) {
          console.error("❌ Error sending to HA:", error.message);
        }
      }
    }
  }

  res.status(200).send('OK');
});

// Render 환경에서는 PORT 환경변수를 자동 지정함
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ SmartThings Webhook listening on port ${port}`);
});
