<!-- {
  id: 1, // 可选，更新时需要
  name: "卡组名称",
  description: "卡组描述", // 可选
  
  // 各区域卡牌数组
  legend: [
    { card_no: "01DE001", card_name: "盖伦", quantity: 1, ...其他卡牌字段 }
  ],
  chosen: [
    { card_no: "02DE015", card_name: "精锐护卫", quantity: 2, ... }
  ],
  main: [
    { card_no: "01DE003", card_name: "无畏先锋", quantity: 3, ... },
    // ... 更多主卡组卡牌
  ],
  runes: [
    { card_no: "03RU001", card_name: "攻击符文", quantity: 1, ... }
  ],
  sideboard: [
    { card_no: "01DE020", card_name: "备用卡", quantity: 2, ... }
  ],
  battlefield: [
    { card_no: "04BF001", card_name: "战场装备", quantity: 1, ... }
  ]
} -->
<script>
    // @ts-nocheck

    import { onMount } from "svelte";
    import { startTTSServer, sendToTTS } from "$lib/ttsClient.js";
    import { loadDeckList } from "$lib/db";
    import { loadExternalImage } from "$lib/fs";
    import { urlMap } from "$lib/resManager";
    import { goto } from "$app/navigation";

    let decks = [];

    $: if (decks?.length > 0) {
        loadAllImages(decks);
    }
    let logs = [];

    const fakeData = [
        {
            id: 1,
            name: "德玛西亚冲锋",
            description: "快速进攻卡组",
            created_at: "2024-01-15T10:30:00.000Z",
            updated_at: "2024-01-15T14:20:00.000Z",
            total_cards: 52,
            legend: {
                card_no: "OGS-023",
                card_name: "德玛西亚之力",
                card_color_list: ["orange", "yellow"],
                front_image_en: "/images/garen.jpg",
                power: 5,
                energy: 5,
            },
            legend_card_no: "OGS-023",
            legend_name: "德玛西亚之力",
            legend_colors: ["orange", "yellow"],
        },
        {
            id: 2,
            name: "626 Jinx",
            description: "后期控制卡组",
            created_at: "2024-01-14T09:15:00.000Z",
            updated_at: "2024-01-14T16:45:00.000Z",
            total_cards: 58,
            legend: {
                card_no: "OGN-301",
                card_name: "暴走萝莉",
                card_color_list: "SI0000",
                front_image_en: "/images/hecarim.jpg",
                power: 4,
                energy: 6,
            },
            legend_card_no: "OGN-301",
            legend_name: "暴走萝莉",
            legend_colors: ["red", "purple"],
        },
        {
            id: 3,
            name: "艾欧尼亚速攻",
            description: "",
            created_at: "2024-01-16T11:00:00.000Z",
            updated_at: "2024-01-16T11:00:00.000Z",
            total_cards: 45,
            legend: {
                card_no: "OGN-305*",
                card_name: "亚索",
                card_color_list: "IO0000",
                front_image_en: "/images/yasuo.jpg",
                power: 4,
                energy: 4,
            },
            legend_card_no: "OGN-305*",
            legend_name: "亚索",
            legend_colors: ["green", "purple"],
        },
        {
            id: 4,
            name: "弗雷尔卓德组合技",
            description: "冰霜组合技",
            created_at: "2024-01-13T08:20:00.000Z",
            updated_at: "2024-01-13T08:20:00.000Z",
            total_cards: 0,
            legend: null,
            legend_card_no: null,
            legend_name: "无传奇",
            legend_colors: [],
        },
        {
            id: 5,
            name: "诺克萨斯压制",
            description: "中期压制卡组",
            created_at: "2024-01-12T15:40:00.000Z",
            updated_at: "2024-01-12T15:40:00.000Z",
            total_cards: 62,
            legend: {
                card_no: "OGN-302",
                card_name: "德莱厄斯",
                card_color_list: "NX0000",
                front_image_en: "/images/darius.jpg",
                power: 6,
                energy: 6,
            },
            legend_card_no: "OGN-302",
            legend_name: "德莱厄斯",
            legend_colors: ["red", "yellow"],
        },
    ];

    let cardImages = {};

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

    onMount(async () => {
        decks = await loadDeckList();
        decks = fakeData;
        // startTTSServer((msg) => {
        //     logs.push("收到TTS回调: " + JSON.stringify(msg));
        // });
    });

    async function spawnCard() {
        await sendToTTS({ cmd: "spawn_card" });
        logs.push("已请求生成卡牌");
    }
</script>

<main>
    <div class="topbar">
        <input
            type="text"
            placeholder="搜索构筑..."
            style="flex:1;padding:6px 10px;"
        />
        <button class="add-deck-btn"> <div>添加卡组</div></button>
    </div>

    {#if !decks.length}
        <div class="no-deck-content">目前没有任何卡组构筑</div>
    {:else}
        <div class="card-grid">
            {#each decks as deck}
                <!-- show deck info -->
                <div class="deck-card" role="presentation" on:click={() => goto(`/deckDetails?deckId=${deck.id}`)}>
                    <!-- 英雄头像 -->
                    {#if cardImages[deck.legend_card_no]}
                        <div
                            class="deck-hero"
                            style={`background-image: url(${cardImages[deck.legend_card_no]});`}
                        ></div>
                    {:else}
                        <div class="deck-hero placeholder">?</div>
                    {/if}

                    <!-- 卡组信息 -->
                    <div class="deck-info">
                        <div class="deck-name">
                            {deck.name}
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
                        <div class="deck-hero-name">
                            {deck.legend_name}
                        </div>

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
        background-size: 100%;
        border: 2px solid #e5e7eb;
        background-repeat: no-repeat;
        background-position: top;
        image-rendering: crisp-edges;
        transition: background-size 0.3s ease-in-out;
    }

    .deck-card:hover .deck-hero {
        background-size: 110%;
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
</style>
