import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { get } from "svelte/store";
import { selectedTTSColor } from "./stores.js";

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
    console.log(onMessage)
    await invoke("start_tts_listener");
    listen("tts-message", (event) => {
        console.log("event", event);
        try {
            const data = JSON.parse(event.payload);
            onMessage(data);
        } catch {
            onMessage(event.payload);
        }
    });
}

// 发送命令到 TTS (39999)
export async function sendToTTS(deck) {
    const list = deck.trim().split(/\s+/).filter(Boolean);

    const processedList = list.map(card => {
        return card.toString().replace("*", "S") + "-1";
    });

    const msg = {
        "messageID": 2,
        "customMessage": {
            "action": "spawn",
            "deck": processedList.join(" ")
        }
    };
    return await invoke("send_to_tts", {
        message: JSON.stringify(msg)
    });
}

export async function sendToTTSTesting(deck) {
    const deckString = deckToString([...deck]);
    const color = get(selectedTTSColor);
    const msg = {
        messageID: 2,
        customMessage: {
            action: "spawntest",
            deck: deckString,
            color
        }
    };

    console.log(msg);


    return await invoke("send_to_tts", {
        message: JSON.stringify(msg)
    });
}

function deckToString(deck) {
    return deck
        .map(card => {
            const encode = str =>
                String(str || "")
                    .replace(/\r/g, "")
                    .replace(/\n/g, "\\n")
                    .replace(/\|/g, "｜")

            const fullName = [
                card.card_no || " ",
                card.card_name || "无名",
                card.sub_title ? `- ${card.sub_title}` : ""
            ].filter(Boolean).join(" ")

            const parts = [
                fullName,
                encode(card.card_effect || card.flavor_text || "无效果"),
                card.back_image || "",
                card.front_image_en || "",
                card.quantity ?? 1,
            ]

            return `###CARD###\n${parts.join("|")}`
        }).join("\n");
}

