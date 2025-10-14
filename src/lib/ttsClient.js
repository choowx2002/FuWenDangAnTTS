import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export async function detectTTSServer() {    
    try {
        // 添加前端超时保护
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('前端超时: 超过10秒')), 10000);
        });
        
        const invokePromise = invoke("check_tts_connections");
        
        const result = await Promise.race([invokePromise, timeoutPromise]);
        
        return {
            success: result.send_port.includes("正常") && result.receive_port.includes("正常"),
            sendPort: result.send_port.includes("正常"),
            receivePort: result.receive_port.includes("正常"),
            details: result
        };
    } catch (error) {
        return {
            success: false,
            sendPort: false,
            receivePort: false,
            details: error.toString()
        };
    }
}

// 启动监听 (39998)
export async function startTTSServer(onMessage) {
    await invoke("start_tts_listener");
    listen("tts-message", (event) => {
        try {
            const data = JSON.parse(event.payload);
            onMessage(data);
        } catch {
            onMessage(event.payload);
        }
    });
}

// 发送命令到 TTS (39999)
export async function sendToTTS(command) {
    const msg = {
        "messageID": 2,
        "customMessage": {
            "action": "spawn",
            "deck": "OGN-298-1 OGN-290-1 OGN-291-1 OGN-301S-3 ARC-001-2 ARC-001-2 ARC-001-2 OGN-003-1 OGN-003-1 OGN-003-1 OGN-006-1 OGN-006-1 OGN-006-1 OGN-012-1 OGN-012-1 OGN-012-1 OGN-030-1 OGN-185-1 OGN-185-1 OGN-185-1 OGN-197a-2 OGN-197a-2 OGN-197a-2 OGN-194-1 OGN-194-1 OGN-194-1 OGN-169-1 OGN-169-1 OGN-029-1 OGN-029-1 OGN-168-1 OGN-168-1 OGN-173-1 OGN-173-1 OGN-173-1 OGN-183-1 OGN-183-1 OGN-183-1 OGN-040-1 OGN-040-1 OGN-040-1 OGN-021-1 OGN-021-1 OGN-021-1 OGN-166a-2 OGN-166a-2 OGN-166a-2 OGN-166a-2 OGN-166a-2 OGN-007a-2 OGN-007a-2 OGN-007a-2 OGN-007a-2 OGN-007a-2 OGN-007a-2 OGN-007a-2"
        }
    };
    return await invoke("send_to_tts", {
        message: JSON.stringify(msg)
    });
}

