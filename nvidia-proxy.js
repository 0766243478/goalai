const http = require('http');
const API_KEY = "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";
const TARGET_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && (req.url === '/v1/chat/completions' || req.url === '/chat/completions')) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                let parsedBody = JSON.parse(body);
                parsedBody.chat_template_kwargs = { "thinking": true };
                
                if (parsedBody.messages) {
                    parsedBody.messages = parsedBody.messages.map(msg => {
                        if (typeof msg.content === 'object') {
                            return { ...msg, content: msg.content[0]?.text || "" };
                        }
                        return msg;
                    });
                }

                const nvidiaReq = require('https').request(TARGET_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json',
                        'Accept': req.headers['accept'] || 'text/event-stream'
                    }
                }, (nvidiaRes) => {
                    res.writeHead(nvidiaRes.statusCode, nvidiaRes.headers);
                    nvidiaRes.pipe(res);
                });

                nvidiaReq.on('error', () => {
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: "Nvidia Connection Failed" }));
                });

                nvidiaReq.write(JSON.stringify(parsedBody));
                nvidiaReq.end();

            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(4000, '127.0.0.1', () => {
    console.log("🚀 Nvidia Proxy Running successfully on http://127.0.0.1:4000");
});
