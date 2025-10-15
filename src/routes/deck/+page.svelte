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

    let decks = [];
    let logs = [];

    const fakeData = [
        {
            id: 1,
            name: "德玛西亚冲锋",
            description: "快速进攻卡组",
            created_at: "2024-01-15T10:30:00.000Z",
            updated_at: "2024-01-15T14:20:00.000Z",
            total_cards: 64,
            legend: {
                card_no: "01DE001",
                card_name: "盖伦",
                card_color_list: "DE0000",
                front_image_en: "/images/garen.jpg",
                power: 5,
                energy: 5
            },
            legend_card_no: "01DE001",
            legend_name: "盖伦",
            legend_colors: "DE0000"
        },
        {
            id: 2,
            name: "暗影岛控制",
            description: "后期控制卡组",
            created_at: "2024-01-14T09:15:00.000Z",
            updated_at: "2024-01-14T16:45:00.000Z",
            total_cards: 58,
            legend: {
                card_no: "01SI003",
                card_name: "赫卡里姆",
                card_color_list: "SI0000",
                front_image_en: "/images/hecarim.jpg",
                power: 4,
                energy: 6
            },
            legend_card_no: "01SI003",
            legend_name: "赫卡里姆", 
            legend_colors: "SI0000"
        },
        {
            id: 3,
            name: "艾欧尼亚速攻",
            description: "",
            created_at: "2024-01-16T11:00:00.000Z",
            updated_at: "2024-01-16T11:00:00.000Z",
            total_cards: 45,
            legend: {
                card_no: "01IO007",
                card_name: "亚索",
                card_color_list: "IO0000",
                front_image_en: "/images/yasuo.jpg",
                power: 4,
                energy: 4
            },
            legend_card_no: "01IO007",
            legend_name: "亚索",
            legend_colors: "IO0000"
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
            legend_colors: null
        },
        {
            id: 5,
            name: "诺克萨斯压制",
            description: "中期压制卡组",
            created_at: "2024-01-12T15:40:00.000Z",
            updated_at: "2024-01-12T15:40:00.000Z",
            total_cards: 62,
            legend: {
                card_no: "01NX002",
                card_name: "德莱厄斯",
                card_color_list: "NX0000", 
                front_image_en: "/images/darius.jpg",
                power: 6,
                energy: 6
            },
            legend_card_no: "01NX002",
            legend_name: "德莱厄斯",
            legend_colors: "NX0000"
        }
    ];

    onMount(async () => {
        decks = await loadDeckList();
        decks = fakeData;
        console.log("decks", decks);
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
                <div class="deck-card">
                    <!-- 英雄头像 -->
                    {#if deck.legend_card_no}
                        <!-- <img
                            src={deck.legend_image}
                            alt={deck.legend_name}
                            class="deck-hero"
                        /> -->
                    {:else}
                        <div class="deck-hero placeholder">?</div>
                    {/if}

                    <!-- 卡组信息 -->
                    <div class="deck-info">
                        <div class="deck-name">{deck.name}</div>
                        <div class="deck-hero-name">{deck.legend_name}</div>
                        <div class="deck-stats">
                            {deck.total_cards} 张卡 • {new Date(
                                deck.updated_at
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
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
        padding: 16px;
    }

    .deck-card {
        background: white;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .deck-hero {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #e5e7eb;
    }

    .deck-hero.placeholder {
        background: #f3f4f6;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9ca3af;
        font-size: 20px;
        font-weight: bold;
    }

    .deck-info {
        flex: 1;
    }

    .deck-name {
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 4px;
    }

    .deck-hero-name {
        font-size: 14px;
        color: #6b7280;
        margin-bottom: 4px;
    }

    .deck-stats {
        font-size: 12px;
        color: #9ca3af;
    }

    .no-deck-content {
        text-align: center;
        padding: 60px 20px;
        color: #6b7280;
        font-size: 16px;
    }
</style>
