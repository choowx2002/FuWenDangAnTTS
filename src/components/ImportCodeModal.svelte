<script>
    // @ts-nocheck

    import { getCardByNo, getCardsByNo } from "$lib/db";
    import { sendToTTSTesting } from "$lib/ttsClient";

    export let show = false;
    export let onCancel = () => {};
    export let onDoneImport = () => {};

    // 点击背景关闭（可选）
    export let closeOnBackground = true;

    // @ts-ignore
    function handleBackgroundClick(e) {
        if (e.target.classList.contains("popup-overlay") && closeOnBackground) {
            onCancel();
            importDeck = {
                legend: [],
                chosen: [],
                main: [],
                runes: [],
                battlefield: [],
                sideboard: [],
            };
        }
    }

    let mode = "默认";
    let text = "";
    let result = "";
    let importDeck = {
        legend: [],
        chosen: [],
        main: [],
        runes: [],
        battlefield: [],
        sideboard: [],
    };

    function parseCardCodes(input) {
        if (!input || typeof input !== "string") return [];

        // 按空格分割输入
        const parts = input.trim().split(/\s+/);
        const results = [];
        const quantities = [];

        for (const part of parts) {
            const codeParts = part.split("-");
            if (codeParts.length === 3) {
                const series = codeParts[0];
                const number = codeParts[1].substring(0, 3);
                results.push(`${series}-${number}`);
                switch (mode) {
                    case "SFC":
                        quantities.push(1);
                        break;

                    default:
                        quantities.push(codeParts[2]);
                        break;
                }
            } else {
                result += `无效卡号格式: ${part}`;
            }
        }

        return { data: results, quantities };
    }

    const checkZone = (cat, champion_tag) => {
        let zone = "main";
        if (
            importDeck["main"].reduce(
                (accumulator, currentValue) =>
                    accumulator + (currentValue.quantities || 1),
                0,
            ) === 39
        ) {
            zone = "sideboard";
        }

        switch (cat) {
            case "legendary":
                zone = "legend";
                break;
            case "battlefield":
                zone = "battlefield";
                break;
            case "rune":
                zone = "runes";
                break;
            case "hero_unit":
                if (importDeck["chosen"].length > 0) break;
                if (
                    importDeck["legend"].length > 0 &&
                    importDeck["legend"][0]?.data.champion_tag == champion_tag
                ) {
                    zone = "chosen";
                }

                break;
            default:
                break;
        }
        return zone;
    };

    function mergeByCardNo(cards) {
        const map = new Map();

        for (const card of cards) {
            const key = card.card_no;

            if (!map.has(key)) {
                map.set(key, {
                    ...card,
                    quantity: Number(card.quantity) || 1,
                });
            } else {
                map.get(key).quantity += Number(card.quantity) || 1;
            }
        }

        // 如果你坚持 quantity 是字符串
        return Array.from(map.values()).map((c) => ({
            ...c,
            quantity: Number(c.quantity),
        }));
    }

    const importCodes = async () => {
        result = "";
        if (!text.trim()) {
            result = "请输入卡牌代码。";
            return;
        }

        const { data, quantities } = parseCardCodes(text);
        const missing = new Set();
        for (let i = 0; i < data.length; i++) {
            const code = data[i];
            const cardDetail = await getCardByNo(code);
            const zone = checkZone(
                cardDetail.card_category,
                cardDetail?.champion_tag,
            );
            const cardData = {
                card_no: code,
                zone,
                quantity: +quantities[i],
                img: cardDetail.front_image_en,
                data: cardDetail,
            };

            if (!cardDetail) {
                missing.add(data[i]);
                continue;
            }
            importDeck[zone].push(cardData);
        }

        for (const key in importDeck) {
            if (!Object.hasOwn(importDeck, key)) continue;

            const tempZoneList = [...importDeck[key]];

            importDeck[key] = mergeByCardNo(tempZoneList);
        }

        if (missing.size > 0) {
            result = `未找到的卡牌：${Array.from(missing).join(",")}`;
            return;
        }

        onDoneImport(importDeck);

        importDeck = {
            legend: [],
            chosen: [],
            main: [],
            runes: [],
            battlefield: [],
            sideboard: [],
        };
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
                            disabled
                        />
                        <span>SFC 静森（没做好）</span>
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
                    <button on:click={(text = "")}> 清除 </button>
                    <button on:click={importCodes}> 生成 </button>
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
