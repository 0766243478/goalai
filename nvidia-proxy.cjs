const http = require('http');
const API_KEY = "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";
const TARGET_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                console.log("📥 Incoming request from Trae...");
                let parsedBody = JSON.parse(body);
                
                // إجبار السيرفر على الاسم الصحيح وحقن التفكير وتطهير الباقي
                parsedBody.model = "moonshotai/kimi-k2.6";
                parsedBody.chat_template_kwargs = { "thinking": true };
                
                // معالجة وحماية نصوص الشات الصادرة من Trae
                if (parsedBody.messages) {
                    parsedBody.messages = parsedBody.messages.map(msg => {
                        if (typeof msg.content === 'object') {
                            return { ...msg, content: msg.content[0]?.text || "" };
                        }
                        return msg;
                    });
                }

                console.log("🚀 Forwarding clean payload to Nvidia NIM...");

                const nvidiaReq = require('https').request(TARGET_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json',
                        'Accept': 'text/event-stream'
                    }
                }, (nvidiaRes) => {
                    res.writeHead(nvidiaRes.statusCode, nvidiaRes.headers);
                    nvidiaRes.pipe(res);
                });

                nvidiaReq.on('error', (err) => {
                    console.error("❌ Nvidia API Error:", err.message);
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: err.message }));
                });

                nvidiaReq.write(JSON.stringify(parsedBody));
                nvidiaReq.end();

            } catch (e) {
                console.error("❌ JSON Parse Error:", e.message);
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid JSON Structure" }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(4000, '127.0.0.1', () => {
    console.log("🔥 Proxy Active on http://127.0.0.1:4000");
    console.log("Ready to clean and capture Trae requests.");
});
