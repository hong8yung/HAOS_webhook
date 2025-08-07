const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// SmartThings 웹훅을 수신할 엔드포인트
app.post('/smartthings', async (req, res) => {
    // 💡 웹훅이 도착했는지 확인하기 위해 전체 요청 본문을 로그에 출력
    console.log("SmartThings Webhook received.");
    console.log("Full Payload:", JSON.stringify(req.body, null, 2));

    try {
        const events = req.body.events;

        if (!events || events.length === 0) {
            console.log("No events in payload.");
            return res.status(200).send("No events to process.");
        }

        // 모든 이벤트를 순회하며 처리
        for (const event of events) {
            const deviceId = event.deviceId;
            const capability = event.capability;
            const attribute = event.attribute;
            const value = event.value;

            // 💡 stse.lockCredentialInfo 이벤트만 필터링
            if (capability === 'stse.lockCredentialInfo' && attribute === 'credential') {
                console.log(`Lock Credential Event from device ${deviceId} detected.`);
                console.log(`Credential Info: ${JSON.stringify(value)}`);

                // Home Assistant로 보낼 데이터 구조화
                const haPayload = {
                    eventType: 'doorlock_event',
                    data: {
                        userId: value.credentialId,
                        method: value.credentialType,
                        action: value.method,
                        message: `${value.credentialType}로 문이 ${value.method}되었습니다. (User ID: ${value.credentialId})`
                    }
                };

                // Home Assistant로 POST 요청 보내기
                const haWebhookUrl = process.env.HA_WEBHOOK_URL;
                if (haWebhookUrl) {
                    await axios.post(haWebhookUrl, haPayload);
                    console.log("Payload sent to Home Assistant.");
                } else {
                    console.error("HA_WEBHOOK_URL environment variable is not set.");
                }
            } else {
                console.log(`Ignoring event: capability=${capability}, attribute=${attribute}`);
            }
        }

        res.status(200).send('Webhook processed successfully.');
    } catch (error) {
        console.error("Error processing webhook:", error.message);
        res.status(500).send("Internal Server Error.");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
