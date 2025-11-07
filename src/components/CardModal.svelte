<script>
    // @ts-nocheck
    import { urlMap } from "$lib/resManager";
    import { parse } from "svelte/compiler";
    import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
    import { onMount } from "svelte";
    import BottomToast from "./BottomToast.svelte";

    function openChildWindow() {
        const child = new WebviewWindow("child-window", {
            url: "https://github.com/tauri-apps/tauri",
            title: "预览窗口",
            width: 800,
            height: 600,
            resizable: true,
            center: true,
        });

        child.once("tauri://created", () => {
            console.log("子窗口已成功创建");
        });

        child.once("tauri://error", (e) => {
            console.error("创建子窗口失败：", e);
        });
    }

    export let show = false; // 控制显示/隐藏
    export let card = null; // 卡片数据对象
    export let imgPath = null;
    export let isConnected = false;
    export let confirmText = "添加";
    export let cancelText = "关闭";
    export let onConfirm = () => {};
    export let onCancel = () => {};

    // 点击背景关闭（可选）
    export let closeOnBackground = true;

    // 处理背景点击
    function handleBackgroundClick(e) {
        if (e.target.classList.contains("popup-overlay") && closeOnBackground) {
            onCancel();
        }
    }

    // 辅助函数：安全访问嵌套属性
    function getSafe(obj, path, defaultValue = "") {
        return path
            .split(".")
            .reduce(
                (acc, key) => (acc && acc[key] ? acc[key] : defaultValue),
                obj,
            );
    }

    /**
     * 将卡牌效果文本中的 {{关键字}} 替换成图片或符号。
     * @param {string} text - 原始的 card_effect 文本
     * @returns {string} - 替换后的 HTML 字符串
     */
    function renderCardEffect(text) {
        // openChildWindow();
        if (!text) return "";

        // 替换 {{关键字}}
        let html = text.replace(/\{\{(.*?)\}\}/g, (match, key) => {
            key = key.trim();

            const item = urlMap.get(key);
            if (!item) return match;

            // 如果是对象结构
            if (typeof item === "object" && item.url) {
                if (
                    item.url.startsWith("blob:") ||
                    /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(item.url)
                ) {
                    return `<img src="${item.url}" alt="${item.label || key}" style="height: 16px;vertical-align: text-bottom; margin: 0 2px;">`;
                } else {
                    // 若是文本或外链，可选逻辑
                    return `<a href="${item.url}" target="_blank">${item.label || key}</a>`;
                }
            }

            // 如果是字符串，可能是纯 URL
            if (typeof item === "string") {
                if (
                    item.startsWith("blob:") ||
                    /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(item)
                ) {
                    return `<img src="${item}" alt="${key}" style="height:1em;vertical-align:middle;">`;
                } else {
                    return item;
                }
            }

            return match;
        });

        // 处理换行符
        html = html.replace(/\\r\\n|\\n|\\r/g, "<br>");

        return html;
    }

    let message = null;
    const showToast = (text, type = "info") => {
        message = { id: Date.now(), text, type };
    };
</script>

{#if show && card}
    <BottomToast {message} />
    <div
        class="popup-overlay"
        role="dialog"
        tabindex="0"
        on:click={handleBackgroundClick}
        on:keydown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && closeOnBackground) {
                onCancel();
            }
        }}
    >
        <div class="card-modal-content">
            <!-- 卡片头部信息 -->
            <div class="card-header">
                <div class="card-basic-info">
                    <h3 class="card-name">{getSafe(card, "card_name")}</h3>
                    {#if getSafe(card, "sub_title")}
                        <p class="card-subtitle">
                            {getSafe(card, "sub_title")}
                        </p>
                    {/if}
                </div>
                <div class="card-meta">
                    <span class="card-no">{getSafe(card, "card_no")}</span>
                </div>
            </div>

            <!-- 卡片图片 -->
            {#if imgPath}
                <div
                    class={[
                        "card-image",
                        {
                            landscape:
                                getSafe(card, "card_category_name") === "战场",
                        },
                    ]}
                >
                    <img src={imgPath} alt={getSafe(card, "card_name")} />
                </div>
            {/if}

            <!-- 卡片属性 -->
            <div class="card-attributes">
                {#if getSafe(card, "energy") !== ""}
                    <div class="attribute">
                        <span class="label">法力：</span>
                        <span class="value">{getSafe(card, "energy")}</span>
                    </div>
                {/if}

                {#if getSafe(card, "return_energy") !== ""}
                    <div class="attribute">
                        <span class="label">符能：</span>
                        <span class="value"
                            >{getSafe(card, "return_energy")}</span
                        >
                    </div>
                {/if}

                {#if getSafe(card, "power") !== ""}
                    <div class="attribute">
                        <span class="label">战力：</span>
                        <span class="value">{getSafe(card, "power")}</span>
                    </div>
                {/if}

                {#if JSON.parse(card.card_color_list) && JSON.parse(card.card_color_list).length > 0 && !JSON.parse(card.card_color_list).includes("colorless")}
                    <div class="attribute">
                        <span class="label">符文：</span>
                        <div class="colors">
                            {#each JSON.parse(card.card_color_list) as color}
                                {#if urlMap.has(color) && urlMap.get(color)?.url}
                                    <img
                                        height="28"
                                        src={urlMap.get(color).url}
                                        alt={color}
                                    />
                                {/if}
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>

            <!-- 卡片效果 -->

            <div class="card-effect">
                {#if getSafe(card, "card_effect")}
                    <p>
                        {@html renderCardEffect(getSafe(card, "card_effect"))}
                    </p>
                {/if}

                <!-- 标签和关键词 -->
                <div class="card-tags">
                    {#if (() => {
                        const rarity = getSafe(card, "rarity_name");
                        const entry = urlMap.get(rarity);
                        return rarity && entry?.url;
                    })()}
                        <span class="tag rarity">
                            <img
                                height="14"
                                src={urlMap.get(getSafe(card, "rarity_name"))
                                    .url}
                                alt={getSafe(card, "rarity_name")}
                            />
                            {getSafe(card, "rarity_name")}
                        </span>
                    {/if}

                    {#if getSafe(card, "card_category_name")}
                        <span class="tag category"
                            >{getSafe(card, "card_category_name")}</span
                        >
                    {/if}

                    {#if card.champion_tag}
                        <span class="tag champion">{card.champion_tag}</span>
                    {/if}

                    {#if getSafe(card, "region")}
                        <span class="tag region">{getSafe(card, "region")}</span
                        >
                    {/if}

                    {#if card.tag}
                        <span class="tag champion">{card.tag}</span>
                    {/if}
                </div>
            </div>

            <!-- 列表数据：颜色和QA -->
            <div class="card-lists">
                {#if card.cardQaList && card.cardQaList.length > 0}
                    <div class="qa-list">
                        <h4>问答：</h4>
                        {#each card.cardQaList as qa, index}
                            <div class="qa-item">
                                <strong>Q{index + 1}:</strong>
                                {getSafe(qa, "question")}
                                <br />
                                <strong>A{index + 1}:</strong>
                                {getSafe(qa, "answer")}
                            </div>
                        {/each}
                    </div>
                {/if}

                <!-- {#if card.keywords && card.keywords.length > 0}
                    <div class="keywords">
                        <h4>关键词：</h4>
                        <div class="keyword-list">
                            {#each JSON.parse(card.keywords) as keyword}
                                <span class="keyword">{keyword}</span>
                            {/each}
                        </div>
                    </div>
                {/if} -->
            </div>

            <!-- 风味文字 -->
            {#if getSafe(card, "flavor_text")}
                <div class="flavor-text">
                    <p><em>{getSafe(card, "flavor_text")}</em></p>
                </div>
            {/if}

            <!-- 艺术家信息 -->
            {#if getSafe(card, "artist")}
                <div class="artist-info">
                    <small>画师：{getSafe(card, "artist")}</small>
                </div>
            {/if}

            <!-- 操作按钮 -->
            <div class="popup-actions">
                <button class="cancel-button" on:click={onCancel}
                    >{cancelText}</button
                >
                {#if isConnected}
                    <button class="confirm-button" on:click={onConfirm}
                        >{confirmText}</button
                    >
                {/if}
            </div>
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
        z-index: 9998;
        animation: fadeIn 0.15s ease-out;
        padding: 20px;
        box-sizing: border-box;
    }

    .card-modal-content {
        background: var(--card-background);
        padding: 24px;
        padding-bottom: 0;
        border-radius: 12px;
        width: 100%;
        max-width: 500px;
        max-height: calc(90vh - 32px);
        overflow-y: auto;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        animation: scaleIn 0.2s ease-out;
    }

    .card-modal-content::-webkit-scrollbar {
        display: none;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--secondary-text);
    }

    .card-name {
        margin: 0;
        font-size: 1.4em;
        color: var(--text);
    }

    .card-subtitle {
        margin: 4px 0 0 0;
        font-size: 0.9em;
        color: var(--secondary-text);
        font-style: italic;
    }

    .card-meta {
        text-align: right;
        font-size: 0.85em;
        color: var(--muted);
    }

    .card-no {
        display: block;
        font-weight: bold;
    }

    .card-image {
        text-align: center;
    }

    .card-image img {
        max-width: 200px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }

    .landscape {
        transform: rotate(270deg);
    }

    .card-attributes {
        flex: 1;
        display: flex;
        gap: 16px;
        padding: 12px;
        background: var(--card-background);
        border-radius: 6px;
        align-items: center;
        justify-content: center;
    }

    .attribute {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .attribute .label {
        font-size: 0.8em;
        color: var(--secondary-text);
    }

    .attribute .value {
        font-size: 1.2em;
        font-weight: bold;
        color: var(--text);
    }

    .card-effect,
    .flavor-text {
        padding: 12px;
        border-radius: 6px;
    }

    .qa-list h4 {
        margin: 0 0 8px 0;
        font-size: 1em;
        color: var(--text);
    }

    .card-effect p {
        margin: 0;
        font-size: 16px;
    }

    .flavor-text p {
        margin: 0;
        font-size: small;
    }

    .flavor-text {
        font-style: italic;
        color: var(--muted);
        border-left: 3px solid var(--accent);
    }

    .card-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
        align-items: flex-end;
    }

    .tag {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        border: var(--accent) 1px solid;
        user-select: none;
        cursor: pointer;
    }

    .tag:hover {
        box-shadow: 0 0 2px 1px var(--primary);
        background-color: var(--primary);
    }

    .card-lists {
        margin: 20px 0;
    }

    /* .keywords, */
    .qa-list {
        margin-bottom: 16px;
    }

    .colors {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .qa-item {
        margin-bottom: 12px;
        padding: 8px;
        border-radius: 4px;
        font-size: 0.9em;
        line-height: 1.4;
    }

    /* .keyword-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .keyword {
        padding: 2px 6px;
        background: #e3f2fd;
        color: #1976d2;
        border-radius: 8px;
        font-size: 0.8em;
    } */

    .artist-info {
        text-align: center;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid var(--secondary-text);
        color: var(--secondary-text);
    }

    .popup-actions {
        position: sticky;
        bottom: 10px;
        margin-top: 24px;
        margin-bottom: 24px;
        display: flex;
        justify-content: space-around;
        background-color: var(--card-background);
        gap: 12px;
    }

    button {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        flex: 1;
        transition: all 0.2s ease;
    }

    .cancel-button {
        background: var(--background);
        border: 0.3px solid var(--muted);
        color: var(--text);
    }

    .confirm-button {
        background: var(--primary, #6da9a8);
        color: var(--card-background);
    }

    .cancel-button:hover,
    .confirm-button:hover {
         box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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

    /* 响应式设计 */
    @media (max-width: 600px) {
        .card-modal-content {
            padding: 16px;
            max-width: 100%;
        }

        .card-meta {
            text-align: left;
            margin-top: 8px;
        }

        .card-attributes {
            gap: 8px;
        }
    }
</style>
