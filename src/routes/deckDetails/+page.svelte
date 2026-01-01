<script>
    // @ts-nocheck

    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { loadDeck } from "$lib/db";
    import { loadExternalImage } from "$lib/fs";
    import { onMount } from "svelte";
    import CardModal from "../../components/CardModal.svelte";
    import { sendToTTSTesting } from "$lib/ttsClient.js";
    import BottomToast from "../../components/BottomToast.svelte";
    import Loading from "../../components/Loading.svelte";
    import { writeText } from "@tauri-apps/plugin-clipboard-manager";

    let deck = null;
    let imageUrls = {};
    let showCardModal = false;
    let selectedCardImg = null;
    let selectedCard = null;
    $: deckId = page.url.searchParams.get("deckId");

    onMount(async () => {
        try {
            deckId = page.url.searchParams.get("deckId");
            const dbDeck = await loadDeck(deckId);
            await loadImg(dbDeck);
            deck = dbDeck;
            //console.log(deck);
        } catch (error) {
            //console.log(error);
        }
    });

    const loadImg = async (dbDeck) => {
        const zoneTypes = [
            "legend",
            "chosen",
            "main",
            "runes",
            "battlefield",
            "sideboard",
        ];

        const promises = [];

        for (const zone of zoneTypes) {
            if (!dbDeck[zone] || !dbDeck[zone].length) continue;

            for (const d of dbDeck[zone]) {
                const cardno_filter = d.card_no.replace("*", "s");

                if (!imageUrls[d.card_no]) {
                    const p = loadExternalImage(`${cardno_filter}.png`).then(
                        (url) => {
                            imageUrls[d.card_no] = url;
                        },
                    );
                    promises.push(p);
                }
            }
        }

        await Promise.all(promises);
    };

    const goToBuiderPage = async () => {
        try {
            await goto(`/deckBuilder?deckId=${deckId}`);
        } catch (error) {
            //console.log("route issue: ", error);
        }
    };

    async function spwanDeck() {
        loading = true;
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
            if (!deck[zone] || !deck[zone].length) continue;
            deckList = deckList.concat(deck[zone]);
        }
        sendToTTSTesting(deckList)
            .catch((reason) => {
                showToast("未连接。请打开并连接到TTS。", "error");
            })
            .finally(() => {
                loading = false;
            });
    }

    let message = null;
    let loading = false;
    const showToast = (text, type = "info") => {
        message = { id: Date.now(), text, type };
    };

    const getImage = (card) => {
        return imageUrls[card.card_no]
            ? imageUrls[card.card_no]
            : card.front_image_en;
    };

    const copyDeckCode = async () => {
        const zoneTypes = [
            "legend",
            "chosen",
            "main",
            "battlefield",
            "runes",
            "sideboard",
        ];
        let deckList = [];
        for (const zone of zoneTypes) {
            if (!deck[zone] || !deck[zone].length) continue;
            deck[zone].forEach((element) => {
                deckList.push(`${element.card_no}-${element.quantity}`);
            });
        }

        const deckString = deckList.join(" ");
        //console.log(deckString);
        await writeText(deckString);

        showToast("复制成功");
    };
</script>

<Loading show={loading} imgSrc="/favicon.png" message="请稍候..." />
<BottomToast {message} />
<CardModal
    bind:show={showCardModal}
    card={selectedCard}
    imgPath={selectedCardImg}
    onCancel={() => {
        showCardModal = false;
    }}
    isConnected={false}
/>
{#if deck}
    <div class="deck-container">
        <!-- 顶部标题栏 -->
        <header class="deck-header">
            <h1>{deck.name}</h1>
            <div class="actions">
                <button onclick={copyDeckCode}>复制</button>
                <button onclick={goToBuiderPage}>编辑</button>
                <button onclick={spwanDeck}>生成</button>
            </div>
        </header>

        <!-- 主体区 -->
        <div>
            <!-- <div>
                <div class="card-grid">
                    {#each deck.legend || [] as card}
                        <div
                            class="card left"
                            onclick={() => {
                                showCardModal = true;
                                selectedCard = card;
                                selectedCardImg = imageUrls[card.card_no];
                            }}
                            role="presentation"
                        >
                            <img
                                src={imageUrls[card.card_no]}
                                alt={card.card_name}
                                title={card.card_name}
                            />
                        </div>
                    {/each}
                    {#each deck.chosen || [] as card}
                        <div
                            class="card"
                            onclick={() => {
                                showCardModal = true;
                                selectedCard = card;
                                selectedCardImg = imageUrls[card.card_no];
                            }}
                            role="presentation"
                        >
                            <img
                                src={imageUrls[card.card_no]}
                                alt={card.card_name}
                                title={card.card_name}
                            />
                            <h4>{card.quantity}</h4>
                        </div>
                    {/each}
                </div>

                <section class="card-grid">
                    {#each deck.runes || [] as card}
                        <div
                            class="card left"
                            onclick={() => {
                                showCardModal = true;
                                selectedCard = card;
                                selectedCardImg = imageUrls[card.card_no];
                            }}
                            role="presentation"
                        >
                            <img
                                src={imageUrls[card.card_no]}
                                alt={card.card_name}
                                title={card.card_name}
                            />
                            <h4>{card.quantity}</h4>
                        </div>
                    {/each}
                </section>

                <section class="card-grid potrait-img">
                    {#each deck.battlefield || [] as card}
                        <div
                            class="card left"
                            onclick={() => {
                                showCardModal = true;
                                selectedCard = card;
                                selectedCardImg = imageUrls[card.card_no];
                            }}
                            role="presentation"
                        >
                            <img
                                src={imageUrls[card.card_no]}
                                alt={card.card_name}
                                title={card.card_name}
                            />
                        </div>
                    {/each}
                </section>
            </div> -->

            <!-- 右边：主要展示区 -->
            <div class="container">
                <section class="section">
                    <div class="card-grid" style="grid-area: area1;">
                        {#each deck.legend || [] as card}
                            <div
                                class="card"
                                onclick={() => {
                                    showCardModal = true;
                                    selectedCard = card;
                                    selectedCardImg = imageUrls[card.card_no];
                                }}
                                role="presentation"
                            >
                                <img
                                    src={imageUrls[card.card_no]}
                                    alt={card.card_name}
                                />
                                <!-- <h4>{card.quantity}</h4> -->
                            </div>
                        {/each}
                        {#each deck.chosen || [] as card}
                            <div
                                class="card"
                                onclick={() => {
                                    showCardModal = true;
                                    selectedCard = card;
                                    selectedCardImg = imageUrls[card.card_no];
                                }}
                                role="presentation"
                            >
                                <img
                                    src={imageUrls[card.card_no]}
                                    alt={card.card_name}
                                />
                                <!-- <h4>{card.quantity}</h4> -->
                            </div>
                        {/each}
                        {#each deck.runes || [] as card}
                            <div
                                class="card left"
                                onclick={() => {
                                    showCardModal = true;
                                    selectedCard = card;
                                    selectedCardImg = imageUrls[card.card_no];
                                }}
                                role="presentation"
                            >
                                <img
                                    src={imageUrls[card.card_no]}
                                    alt={card.card_name}
                                    title={card.card_name}
                                />
                                <h4>{card.quantity}</h4>
                            </div>
                        {/each}
                    </div>
                    <!-- <h2>战场</h2> -->
                    <div class="card-grid" style="grid-area: area2;">
                        {#each deck.battlefield || [] as card}
                            <div
                                class="card"
                                onclick={() => {
                                    showCardModal = true;
                                    selectedCard = card;
                                    selectedCardImg = getImage(card);
                                }}
                                role="presentation"
                            >
                                <img
                                    src={getImage(card)}
                                    alt={card.card_name}
                                />
                                <!-- <h4>{card.quantity}</h4> -->
                            </div>
                        {/each}
                    </div>
                    <!-- <h2>主牌堆</h2> -->
                    <div class="card-grid" style="grid-area: area3;">
                        {#each deck.main || [] as card}
                            <div
                                class="card"
                                onclick={() => {
                                    showCardModal = true;
                                    selectedCard = card;
                                    selectedCardImg = getImage(card);
                                }}
                                role="presentation"
                            >
                                <img
                                    src={getImage(card)}
                                    alt={card.card_name}
                                />
                                <h4>{card.quantity}</h4>
                            </div>
                        {/each}
                    </div>
                    {#if deck.sideboard.length > 0}
                        <!-- <h2>备牌</h2> -->
                        <div
                            class="card-grid small-grid"
                            style="grid-area: area4;"
                        >
                            {#each deck.sideboard || [] as card}
                                <div
                                    class="card"
                                    onclick={() => {
                                        showCardModal = true;
                                        selectedCard = card;
                                        selectedCardImg = getImage(card);
                                    }}
                                    role="presentation"
                                >
                                    <img
                                        src={getImage(card)}
                                        alt={card.card_name}
                                    />
                                    <h4>{card.quantity}</h4>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </section>
            </div>
        </div>
    </div>
{:else}
    <p>正在载入卡组 {deckId}...</p>
{/if}

<style>
    * {
        transition:
            background-color 0.3s ease,
            color 0.3s ease;
    }

    .deck-container {
        margin: 0 auto;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .deck-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    h1 {
        font-size: 1.6rem;
        font-weight: 700;
        margin: 0 0 2px;
    }

    .actions button {
        margin-left: 0.5rem;
        background: var(--background);
        border: none;
        padding: 0.4rem 0.8rem;
        border-radius: 6px;
        cursor: pointer;
    }
    .actions button:hover {
        background: var(--primary);
        color: var(--background);
    }

    .section {
        display: grid;
        grid-template-areas:
            "area1 area2"
            "area3 area3"
            "area4 area4";
        gap: 16px; /* 间距 */
        align-items: start;
    }

    .section > div {
        border-radius: 10px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        padding: 8px 15px;
        background: var(--background);
        flex: 1; /* 在多列时平均分宽度 */
    }

    /* ≥1440px 时两列 */
    @media screen and (max-width: 800.9px) {
        .section {
            grid-template-areas:
                "area1"
                "area2"
                "area3"
                "area4";
        }
    }

    .card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, 130px);
        gap: 10px;
        margin-bottom: 10px;
        padding: 10px 0;
        border-radius: 20px;
        justify-content: center;
        border: 1px solid black;
        background: var(--background);
    }

    .card {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
    }

    .card img {
        /* height: 250px; */
        width: 100%;
        object-fit: cover;
        border-radius: 10px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
    }

    .card h4 {
        font-family: monospace;
        text-align: center;
        position: absolute;
        bottom: 10px;
        right: 0;
        background-color: var(--accent);
        color: var(--text);
        font-size: larger;
        font-weight: 800;
        padding: 2px 10px;
        margin: 0;
        border-radius: 5px 0 0 5px;
    }
</style>
