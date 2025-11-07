<script>
    // @ts-nocheck

    import { getCardsByNo } from "$lib/db";
    import { sendToTTSTesting } from "$lib/ttsClient";

    export let show = false;
    export let onCancel = () => {};

    // 点击背景关闭（可选）
    export let closeOnBackground = true;

    // @ts-ignore
    function handleBackgroundClick(e) {
        if (e.target.classList.contains("popup-overlay") && closeOnBackground) {
            onCancel();
        }
    }

    let mode = "默认";
    let text = "";
    let result = "";

    function parseCardCodes(input) {
        if (!input || typeof input !== "string") return [];

        // 按空格分割输入
        const parts = input.trim().split(/\s+/);
        const results = [];
        const quantities = [];

        // 匹配模式：系列-编号-数量
        const pattern = /^([A-Z]{3})-(\d{3}[a-zA-Z]?)-(\d+)$/;

        for (const part of parts) {
            const match = part.match(pattern);
            if (match) {
                const series = match[1];
                const number = match[2]
                    .replaceAll("s", "*")
                    .replaceAll("S", "*");
                results.push(`${series}-${number}`);
                switch (mode) {
                    case "SFC":
                        quantities.push(1);
                        break;

                    default:
                        quantities.push(match[3]);
                        break;
                }
            } else {
                result += `无效卡号格式: ${part}`;
            }
        }

        return { data: results, quantities };
    }

    const spawnDeck = async () => {
        result = "";
        if (!text.trim()) {
            result = "请输入卡牌代码。";
            return;
        }

        const { data, quantities } = parseCardCodes(text);
        const details = await getCardsByNo(data);
        const deck = [];
        const missing = new Set();
        for (let i = 0; i < data.length; i++) {
            const code = data[i];
            const cardDetail = details.find((c) => c.card_no === code);

            if (!cardDetail) {
                missing.add(data[i]);
                continue;
            }

            deck.push({
                ...cardDetail,
                quantity: quantities[i],
            });
        }

        if (missing.size > 0) {
            result = `未找到的卡牌：${Array.from(missing).join(",")}`;
        }

        sendToTTSTesting(deck)
            .then(() => {
                result += "生成完成！";
            })
            .catch((reason) => {
                result += "未连接。请打开并连接到TTS。";
            });
    };

    const generateDeck = async () => {
        if (!text.trim()) {
            result = "请输入卡牌代码。";
            return;
        }

        const data = parseCardCodes(text);
        const deckDetails = await getCardsByNo(data);
        result = `已提交：模式 = ${mode}，内容 = ${text}`;
    };
</script>

{#if show}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        class="popup-overlay"
        role="dialog"
        tabindex="0"
        on:mousedown={handleBackgroundClick}
    >
        <div class="popup-content">
            <form>
                <fieldset>
                    <legend>模式选择</legend>
                    <label>
                        <input
                            type="radio"
                            name="mode"
                            value="默认"
                            bind:group={mode}
                            class="accent-blue-600"
                        />
                        <span>默认</span>
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="mode"
                            value="SFC"
                            bind:group={mode}
                        />
                        <span>SFC 静森</span>
                    </label>
                </fieldset>

                <fieldset>
                    <legend>卡牌代码</legend>
                    <textarea
                        id="feedback"
                        bind:value={text}
                        placeholder="请输入..."
                        rows="8"
                        style="width: 100%; resize: vertical;"
                    ></textarea>
                </fieldset>

                <div class="button-group">
                    <button on:click={text = ""}> 清除 </button>
                    <button on:click={spawnDeck}> 生成 </button>
                </div>

                <p style="text-align: center;">{result}</p>
            </form>
        </div>
    </div>
{/if}

<style>
    .popup-overlay {
        position: fixed;
        top: 32px;
        left: 0;
        width: 100%;
        height: calc(100% - 32px);
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.4);
        z-index: 9999;
        animation: fadeIn 0.15s ease-out;
        box-sizing: border-box;
    }

    .popup-content {
        background: var(--background, #fff);
        padding: 20px;
        border-radius: 10px;
        width: 300px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: scaleIn 0.2s ease-out;
    }

    .button-group {
        margin-top: 20px;
        display: grid;
        justify-items: center;
        grid-template-columns: 1fr 1fr;
    }

    button {
        padding: 6px 12px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes scaleIn {
        from {
            transform: scale(0.9);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }
</style>
