<script>
    // @ts-nocheck

    import { onMount } from "svelte";
    import { confirm } from "@tauri-apps/plugin-dialog";
    import { sendToTTSTesting } from "$lib/ttsClient.js";
    import { deleteDeck, loadDeck, loadDeckList } from "$lib/db";
    import { loadExternalImage } from "$lib/fs";
    import { urlMap } from "$lib/resManager";
    import { goto } from "$app/navigation";
    import BottomToast from "../../components/BottomToast.svelte";
    import Loading from "../../components/Loading.svelte";

    let decks = [];
    let loading = false;

    $: if (decks?.length > 0) {
        loadAllImages(decks);
    }
    let logs = [];
    let cardImages = {};
    let selectedDeck = null;
    let contextMenuX = 0;
    let contextMenuY = 0;
    let contextMenuVisible = false;

    function handleContextMenu(e, deck) {
        e.preventDefault();
        selectedDeck = deck;
        contextMenuX = e.clientX;
        contextMenuY = e.clientY;
        contextMenuVisible = false;
        setTimeout(() => {
            contextMenuVisible = true;
        }, 50);
    }

    function closeMenu() {
        contextMenuVisible = false;
    }

    async function loadAllImages(list) {
        cardImages = {}; // 清空旧数据
        for (const card of list) {
            if (!card.legend_card_no) continue;
            try {
                cardImages[card.legend_card_no] = await loadExternalImage(
                    `${card.legend_card_no.replace("*", "s")}.png`,
                );
            } catch (e) {
                console.warn(`找不到图片 ${card.legend_card_no}`, e);
                cardImages[card.legend_card_no] = null;
            }
        }
    }

    const openBuilder = () => {
        goto("/deckBuilder");
    };

    onMount(async () => {
        window.addEventListener("click", closeMenu);
        decks = await loadDeckList();
        // console.log(decks);
        // startTTSServer((msg) => {
        //     logs.push("收到TTS回调: " + JSON.stringify(msg));
        // });
    });

    async function spwanDeck() {
        loading = true;
        loadDeck(selectedDeck.id)
            .then((res) => {
                const zoneTypes = [
                    "legend",
                    "chosen",
                    "battlefield",
                    "main",
                    "runes",
                    "sideboard",
                ];
                let deckList = [];
                for (const zone of zoneTypes) {
                    if (!res[zone] || !res[zone].length) continue;
                    deckList = deckList.concat(res[zone]);
                }
                sendToTTSTesting(deckList)
                    .catch((reason) => {
                        showToast("未连接。请打开并连接到TTS。", "error");
                    })
                    .finally(() => {
                        loading = false;
                    });
            })
            .catch(() => {
                loading = false;
            });
    }

    const removeBuilder = async () => {
        const answer = await confirm("你确定要删除卡组吗？此操作不能恢复。", {
            title: "删除卡组",
            kind: "warning",
        });
        if (answer) {
            deleteDeck(selectedDeck.id).then(async () => {
                showToast("卡组已经删除");
                decks = await loadDeckList();
            });
        }
    };
    let message = null;
    const showToast = (text, type = "info") => {
        message = { id: Date.now(), text, type };
    };
</script>

{#if contextMenuVisible}
    <div
        class="context-menu"
        style="top: {contextMenuY}px; left: {contextMenuX}px;"
    >
        <div class="menu-item" role="presentation" onclick={spwanDeck}>
            生成卡组
        </div>
        <div
            class="menu-item"
            role="presentation"
            onclick={() => goto(`/deckBuilder?deckId=${selectedDeck.id}`)}
        >
            编辑卡组
        </div>
        <div
            style="background-color: var(--color-error); color:snow"
            class="menu-item"
            role="presentation"
            onclick={removeBuilder}
        >
            移除卡组
        </div>
    </div>
{/if}
<Loading show={loading} imgSrc="/favicon.png" message="请稍候..." />

<BottomToast {message} />
<main>
    <div class="topbar">
        <input
            type="text"
            placeholder="搜索构筑..."
            style="flex:1;padding:6px 10px;"
        />
        <button class="add-deck-btn" onclick={openBuilder}>
            <div>添加卡组</div></button
        >
    </div>

    {#if !decks.length}
        <div class="no-deck-content">目前没有任何卡组构筑</div>
    {:else}
        <div class="card-grid">
            {#each decks as deck}
                <!-- show deck info -->
                <div
                    class="deck-card"
                    role="presentation"
                    onclick={() => goto(`/deckDetails?deckId=${deck.id}`)}
                    oncontextmenu={(e) => {
                        handleContextMenu(e, deck);
                    }}
                >
                    <!-- 英雄头像 -->
                    {#if deck.legend.front_image_en}
                        <div
                            class="deck-hero"
                            style={`background-image: url(${deck.legend.front_image_en});`}
                        ></div>
                    {:else}
                        <div class="deck-hero placeholder">?</div>
                    {/if}

                    <!-- 卡组信息 -->
                    <div class="deck-info">
                        <div class="deck-name">
                            {deck.name.trim() === "" ? "无卡组名称" : deck.name}
                            {#each deck.legend_colors as color}
                                {#if urlMap.get(color)?.url}
                                    <img
                                        src={urlMap.get(color).url}
                                        alt={color}
                                        width="24"
                                        height="24"
                                    />
                                {/if}
                            {/each}
                        </div>
                        {#if deck.legend}
                            <div class="deck-hero-name">
                                {deck.legend.champion_tag}·{deck.legend_name}
                            </div>
                        {/if}
                        <div class="deck-stats">
                            {deck.total_cards} 张卡 • {new Date(
                                deck.updated_at,
                            ).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</main>

<style>
    .topbar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        background: var(--background);
        padding: 12px 16px;
        position: sticky;
        top: 0;
        z-index: 10;
    }

    .no-deck-content {
        padding: 12px 16px;
        box-sizing: border-box;
        height: calc(100vh - 88px);
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: x-large;
        color: var(--secondary-text);
        opacity: 0.7;
    }
    .add-deck-btn {
        cursor: pointer;
        font-size: medium;
        text-align: center;
        transition:
            background 0.2s,
            color 0.2s;
    }

    .card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 16px;
        padding: 16px;
    }

    .deck-card {
        background: var(--card-background);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition:
            transform 0.2s,
            box-shadow 0.2s;
    }

    .deck-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    }

    .deck-hero {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background-size: 110%;
        border: 2px solid #e5e7eb;
        background-repeat: no-repeat;
        background-position: top;
        image-rendering: crisp-edges;
        transition: background-size 0.3s ease-in-out;
    }

    .deck-card:hover .deck-hero {
        background-size: 125%;
    }

    .deck-hero.placeholder {
        background: var(--background);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--secondary-text);
        font-size: 20px;
        font-weight: bold;
    }

    .deck-info {
        flex: 1;
    }

    .deck-name {
        display: flex;
        align-items: center;
        font-size: 16px;
        font-weight: 600;
        color: var(--text);
        margin-bottom: 4px;
    }

    .deck-hero-name {
        font-size: 14px;
        color: var(--secondary-text);
        margin-bottom: 4px;
    }

    .deck-stats {
        font-size: 12px;
        color: var(--secondary-text);
    }

    .no-deck-content {
        text-align: center;
        padding: 60px 20px;
        color: var(--secondary-text);
        font-size: 16px;
    }

    /* contextmenu */
    .context-menu {
        position: fixed;
        overflow: hidden;
        background: var(--background);
        border: 1px solid var(--muted);
        border-radius: 8px;
        min-width: 150px;
        z-index: 9999;
        color: var(--text);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .menu-item {
        font-size: small;
        padding: 8px 12px;
        cursor: pointer;
        transition: background 0.15s;
    }
    .menu-item:hover {
        background: var(--card-background);
    }
</style>
