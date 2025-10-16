<script>
    // @ts-nocheck

    import { getDiffLimits, getDistinctFilters, searchCards } from "$lib/db";
    import { loadExternalImage } from "$lib/fs";
    import { onMount, tick } from "svelte";
    import CardModal from "../../components/CardModal.svelte";
    import { preventDefault } from "svelte/legacy";
    import { urlMap } from "$lib/resManager";
    import RangeSlider from "svelte-range-slider-pips";

    let deck = {
        legend: [],
        chosen: [],
        main: [],
        runes: [],
        battlefield: [],
        sideboard: [],
    };

    let cardImage;

    let filters = {
        series: [],
        type: [],
        tag: [],
        region: [],
        keyword: [],
        color: [],
    };
    let mightValues = [0, 15];
    let powerValues = [0, 4];
    let energyValues = [0, 13];

    let mightLimit = [0, 15];
    let powerLimit = [0, 4];
    let energyLimit = [0, 13];

    const filterLabelMap = {
        type: "类型",
        series: "系列",
        tag: "标签",
        region: "区域",
        keyword: "关键词",
        power: "符能",
        energy: "法力",
        might: "战力",
        color: "符文",
        rarity: "稀有度",
    };
    let queryOptions = {};
    let query = "";
    let orderBy = "card_no";
    let isAsc = true;
    let cards = [];
    let imageUrls = {};
    let page = 1;
    let total = 0;
    let loading = false;
    let hasMore = true;
    let observer;
    let lastCardElement = null;
    let observerInitialized = false;
    let filterVisible = false;
    let showCardModal = false;
    let addingMode = false;
    let selectedCardImg = null;
    let selectedCard = null;

    const updateRange = async () => {
        const res = await getDiffLimits();
        if (res) {
            mightValues = res.mightLimit;
            powerValues = res.powerLimit;
            energyValues = res.energyLimit;

            mightLimit = res.mightLimit;
            powerLimit = res.powerLimit;
            energyLimit = res.energyLimit;
        }
    };

    const arraysEqual = (a, b) =>
        Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((v, i) => v === b[i]);

    const checkFilterExists = () => {
        return (
            (Object.keys(queryOptions).length > 0 &&
                Object.values(queryOptions).some(
                    (arr) => Array.isArray(arr) && arr.length > 0,
                )) ||
            query.trim() !== "" ||
            !arraysEqual(powerValues, powerLimit) ||
            !arraysEqual(energyValues, energyLimit) ||
            !arraysEqual(mightValues, mightLimit)
        );
    };

    function toggleFilter(type, value) {
        const current = { ...queryOptions };
        if (!current[type]) current[type] = [];
        const idx = current[type].indexOf(value);
        if (idx === -1) current[type].push(value);
        else current[type].splice(idx, 1);
        queryOptions = current;
        loadCards(true);
    }

    function clearAllFilters() {
        queryOptions = {};
        query = "";
        mightValues = mightLimit;
        powerValues = powerLimit;
        energyValues = energyLimit;
        loadCards(true);
    }

    function onSearch(e) {
        loadCards(true);
    }

    function onSortChange(e) {
        const [field, dir] = e.target.value.split("-");
        orderBy = field;
        isAsc = dir === "asc";
        loadCards(true);
    }

    function initObserver() {
        observer = new IntersectionObserver(
            async (entries) => {
                if (entries[0].isIntersecting && !loading && hasMore) {
                    page++;
                    await loadCards();
                }
            },
            {
                rootMargin: "100px",
                threshold: 0.1,
            },
        );
        observerInitialized = true;
    }

    async function loadCards(reset = false) {
        if (loading) return;
        loading = true;

        if (lastCardElement) {
            observer.unobserve(lastCardElement);
            lastCardElement = null;
        }

        if (reset) {
            page = 1;
            cards = [];
            imageUrls = {};
            hasMore = true;
        }

        const might = {
            Start: mightValues[0],
            End: mightValues[1],
        };

        const energy = {
            Start: energyValues[0],
            End: energyValues[1],
        };

        const power = {
            Start: powerValues[0],
            End: powerValues[1],
        };

        const { rows, total: t } = await searchCards({
            query,
            page,
            orderBy,
            isAsc,
            might,
            energy,
            power,
            ...queryOptions,
        });

        total = t;
        if (rows.length < 50) hasMore = false;
        cards = [...cards, ...rows];

        for (const card of rows) {
            const cardno_filter = card.card_no.replace("*", "s");
            loadExternalImage(`${cardno_filter}.png`).then((url) => {
                imageUrls[card.card_no] = url;
            });
        }

        loading = false;

        await tick();
        const lastCard = document.querySelector(".card:last-child");
        if (observerInitialized && hasMore) {
            const lastCard = document.querySelector(".card:last-child");
            if (lastCard) {
                lastCardElement = lastCard;
                observer.observe(lastCardElement);
            }
        }
    }

    const addToDeck = () => {
        console.log(selectedCard);
        console.log(selectedCardImg);
    };

    onMount(async () => {
        cardImage = await loadExternalImage("OGN-038.png");
        filters = await getDistinctFilters();
        await updateRange();
        initObserver();
        await loadCards();
    });

    const zoneNames = {
        legend: "传奇",
        chosen: "选定英雄",
        main: "主卡",
        runes: "符文",
        battlefield: "战场",
        sideboard: "备牌",
    };

    const zoneLimit = {
        legend: 1,
        chosen: 1,
        main: 40,
        runes: 12,
        battlefield: 3,
        sideboard: 8,
    };
</script>

<CardModal
    bind:show={showCardModal}
    card={selectedCard}
    imgPath={selectedCardImg}
    onCancel={() => {
        showCardModal = false;
    }}
    isConnected={true}
    onConfirm={addToDeck}
/>

<div class="deck-info">
    <div class="deck-name-container">
        <input class="deck-name" type="text" placeholder="卡组名称" />
    </div>
    <div
        style="display:flex;flex: 1; background-color: var(--background); font-size: smaller; gap: 10px; justify-content: center;"
    >
        {#each Object.entries(zoneLimit) as [zoneKey, limit]}
            <div>
                <div>{zoneNames[zoneKey]}</div>
                <div style="text-align: center;">{limit}</div>
            </div>
        {/each}
    </div>
    <div>
        <i class="fa-solid fa-list"></i>
        <!-- <button title="网格" aria-label="网格"><i class="fa-solid fa-table-cells"></i></button> -->
        <i class="fa-solid fa-square-poll-vertical"></i>
    </div>
</div>
<div class="page">
    <div class="part sidebar">
        <div class="deck">
            <div class="deck-container">
                {#each Object.entries(deck) as [zoneKey, cards]}
                    {#if cards.length > 0}
                        <div class="zone">
                            <!-- <h3 class="zone-title">
                                {zoneNames[zoneKey] || zoneKey} ({cards.reduce(
                                    (sum, c) => sum + (c.quantity || 1),
                                    0,
                                )}/40)
                            </h3> -->

                            <div class="cards">
                                {#each cards as cardDeck}
                                    <div class="deckcard">
                                        <img
                                            src={cardDeck.img}
                                            alt={cardDeck.data.card_name}
                                        />
                                        <div class="name">
                                            {cardDeck.data.card_name}
                                            {cardDeck.data.sub_title
                                                ? " " + cardDeck.data.sub_title
                                                : ""}
                                        </div>
                                        <div class="count">
                                            {cardDeck.quantity}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                {/each}
            </div>
        </div>
    </div>
    <div class="part card-list">
        <div
            class="controls"
            role="presentation"
            onkeydown={(e) => e.key === "Escape" && (filterVisible = false)}
        >
            <input
                type="text"
                class="query-input"
                placeholder="搜索卡牌..."
                bind:value={query}
                oninput={(e) => (query = e.target.value.trimStart())}
                onkeydown={(e) => e.key === "Enter" && onSearch(e)}
                style="flex:1;padding:6px 10px;"
            />
            <select onchange={onSortChange} class="select-option">
                <option value="card_no-asc">编号↑</option>
                <option value="card_no-desc">编号↓</option>
                <option value="power-asc">战力↑</option>
                <option value="power-desc">战力↓</option>
                <option value="energy-asc">法力↑</option>
                <option value="energy-desc">法力↓</option>
                <option value="return_energy-asc">符能↑</option>
                <option value="return_energy-desc">符能↓</option>
            </select>
            <button onclick={() => (filterVisible = true)}>筛选</button>
            {#if checkFilterExists()}
                <button onclick={clearAllFilters}>重置</button>
            {/if}
        </div>

        <!-- 筛选弹窗 -->
        {#if filterVisible}
            <div
                class="filter-modal-backdrop"
                role="presentation"
                onclick={(e) => (filterVisible = false)}
                onkeydown={(e) => e.key === "Escape" && (filterVisible = false)}
            ></div>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="filter-modal" role="dialog" tabindex="0">
                <div class="filter-content">
                    {#each Object.entries(filters) as [key, values]}
                        <div class="filter-section">
                            <h4>{filterLabelMap[key.toLowerCase()]}</h4>
                            <div class="filter-options">
                                {#each values as v}
                                    <button
                                        type="button"
                                        class="choice {queryOptions[
                                            key
                                        ]?.includes(v)
                                            ? 'active'
                                            : ''}"
                                        aria-pressed={queryOptions[
                                            key
                                        ]?.includes(v)
                                            ? "true"
                                            : "false"}
                                        onclick={() => toggleFilter(key, v)}
                                        onkeydown={(e) =>
                                            (e.key === "Enter" ||
                                                e.key === " ") &&
                                            toggleFilter(key, v)}
                                    >
                                        {#if key.toLowerCase() === "color"}
                                            {#if urlMap.get(v)?.url}
                                                <img
                                                    class="choice-img"
                                                    width="24"
                                                    height="24"
                                                    src={urlMap.get(v)?.url}
                                                    alt={urlMap.get(v).label}
                                                />
                                            {:else}
                                                {urlMap.get(v)?.label ?? v}
                                            {/if}
                                        {:else if key.toLowerCase() === "rarity"}
                                            <img
                                                class="choice-img"
                                                width="20"
                                                height="20"
                                                src={urlMap.get(v)?.url}
                                                alt={urlMap.get(v).label}
                                            />
                                            {v}
                                        {:else}
                                            {v}
                                        {/if}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/each}

                    <div class="filter-section">
                        <div class="filter-label">
                            <h4>战力</h4>
                            <p>
                                {#if mightValues[0] === mightValues[1]}
                                    <b>{mightValues[0]}</b>
                                {:else if mightValues[0] === mightLimit[0] && mightValues[1] === mightLimit[1]}
                                    全部
                                {:else}
                                    <b>{mightValues[0]} - {mightValues[1]}</b>
                                {/if}
                            </p>
                        </div>
                        <RangeSlider
                            step={1}
                            min={mightLimit[0]}
                            max={mightLimit[1]}
                            pips
                            pipstep={1}
                            all="label"
                            rest="label"
                            range
                            on:stop={loadCards}
                            bind:values={mightValues}
                        />
                    </div>

                    <div class="filter-section">
                        <div class="filter-label">
                            <h4>法力</h4>
                            <p>
                                {#if energyValues[0] === energyValues[1]}
                                    <b>{energyValues[0]}</b>
                                {:else if energyValues[0] === energyLimit[0] && energyValues[1] === energyLimit[1]}
                                    全部
                                {:else}
                                    <b>{energyValues[0]} - {energyValues[1]}</b>
                                {/if}
                            </p>
                        </div>
                        <RangeSlider
                            step={1}
                            min={energyLimit[0]}
                            max={energyLimit[1]}
                            pips
                            pipstep={1}
                            all="label"
                            rest="label"
                            range
                            on:stop={loadCards}
                            bind:values={energyValues}
                        />
                    </div>

                    <div class="filter-section">
                        <div class="filter-label">
                            <h4>符能</h4>
                            <p>
                                {#if powerValues[0] === powerValues[1]}
                                    <b>{powerValues[0]}</b>
                                {:else if powerValues[0] === powerLimit[0] && powerValues[1] === powerLimit[1]}
                                    全部
                                {:else}
                                    <b>{powerValues[0]} - {powerValues[1]}</b>
                                {/if}
                            </p>
                        </div>

                        <RangeSlider
                            step={1}
                            min={powerLimit[0]}
                            max={powerLimit[1]}
                            pips
                            pipstep={1}
                            all="label"
                            rest="label"
                            range
                            on:stop={loadCards}
                            bind:values={powerValues}
                        />
                    </div>
                </div>

                <div class="filter-footer">
                    <button
                        type="button"
                        class="clear"
                        tabindex="0"
                        onclick={clearAllFilters}>清空</button
                    >
                    <button
                        type="button"
                        class="confirm"
                        tabindex="0"
                        onclick={() => (filterVisible = false)}>关闭</button
                    >
                </div>
            </div>
        {/if}
        <div class="card-grid">
            {#each cards as card}
                <div
                    class="card"
                    onclick={(e) => {
                        const existingIndex = deck.main.findIndex(
                            (c) => c.card_no === card.card_no,
                        );

                        if (existingIndex !== -1) {
                            // 已存在 → 增加数量
                            const updated = [...deck.main];
                            updated[existingIndex] = {
                                ...updated[existingIndex],
                                quantity: updated[existingIndex].quantity + 1,
                            };
                            deck = { ...deck, main: updated };
                        } else {
                            // 不存在 → 添加新卡
                            const cardData = {
                                card_no: card.card_no,
                                zone: "main",
                                quantity: 1,
                                img: imageUrls[card.card_no],
                                data: card,
                            };
                            deck = { ...deck, main: [...deck.main, cardData] };
                        }
                    }}
                    oncontextmenu={(e) => {
                        e.preventDefault();
                        showCardModal = true;
                        selectedCard = card;
                        selectedCardImg = imageUrls[card.card_no];
                    }}
                    role="presentation"
                >
                    {#if imageUrls[card.card_no]}
                        <img
                            src={imageUrls[card.card_no]}
                            alt={card.card_name}
                        />
                    {:else}
                        <div class="placeholder">
                            <img src="/favicon.png" alt={card.card_name} />
                            暂时无图
                        </div>
                    {/if}
                    <div class="card-name">
                        {card.card_name}{card.sub_title
                            ? " " + card.sub_title
                            : ""}
                    </div>
                </div>
            {/each}
        </div>

        {#if loading}
            <div class="loading">加载中...</div>
        {/if}

        {#if !hasMore}
            <div class="loading">没有更多卡牌了</div>
        {/if}
    </div>
</div>

<style>
    * {
        box-sizing: border-box;
    }

    .page {
        display: flex;
        flex-direction: row;
    }

    .page .part {
        box-sizing: border-box;
        height: calc(100vh - 32px - 52px);
    }

    .sidebar {
        width: 250px;
        display: flex;
        flex-direction: column;
        background-color: var(--background);
    }

    .deck-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        padding: 12px 16px;
        height: 52px;
        gap: 10px;
        border-bottom: 1px solid var(--muted);
    }

    div.deck-name-container {
        padding: 5px;
        width: 218px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        border-radius: 5px;
        border: 1px solid var(--muted);
    }

    input.deck-name {
        all: unset;
        font-size: small;
        width: 100%;
    }

    input.query-input {
        /* all: unset; */
        width: 70%;
        padding: 5px;
        border-radius: 5px;
        border: 1px solid var(--muted);
    }

    .deck {
        padding: 12px 16px;
        padding-top: 10px;
        flex: 1;
        overflow-y: auto;
    }

    .deck::-webkit-scrollbar {
        display: none;
    }

    .deck-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .cards {
        display: flex;
        flex-wrap: wrap;
        row-gap: 8px;
    }

    .zone-title {
        margin-top: 0.2rem;
        margin-bottom: 0.5rem;
    }

    .zone .deckcard {
        user-select: none;
        background-color: var(--text);
        width: 100%;
        height: 40px;
        object-fit: cover;
        border-radius: 5px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        position: relative;
        transition: transform 0.2s ease-in-out;
        /* cursor: grab; */
    }

    .zone .deckcard img {
        position: absolute;
        top: -60%;
        right: 20px;
        width: 60%;
        object-fit: cover;
        transform: scale(1.1);
    }

    .zone .deckcard .name {
        font-size: small;
        position: absolute;
        color: whitesmoke;
        background: linear-gradient(
            90deg,
            rgba(2, 0, 36, 1) 0%,
            rgba(0, 0, 0, 0.6) 30%,
            rgba(0, 212, 255, 0) 100%
        );
        padding-left: 12px;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
    }

    .zone .deckcard .count {
        display: flex;
        justify-content: center;
        align-items: center;
        position: absolute;
        color: var(--text);
        height: 100%;
        right: 0;
        background-color: var(--primary);
        width: 25px;
        font-size: large;
        font-family: system-ui;
        font-weight: bold;
    }

    .deckcard:hover {
        transform: translateX(5px);
    }

    /* control filter */

    .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        background: var(--card-background);
        padding: 12px 16px;
        position: sticky;
        top: 0;
        z-index: 10;
    }

    .filter-modal-backdrop {
        position: fixed; /* 固定在视口 */
        top: 32px;
        right: 0;
        bottom: 0;
        left: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 99;
    }

    .filter-modal {
        position: fixed; /* 保持固定定位 */
        top: calc(50% + 16px);
        left: 50%;
        transform: translate(-50%, -50%); /* 水平居中 */
        background: var(--background);
        border-radius: 8px;
        width: 80%;
        max-width: 600px;
        max-height: calc(100vh - 48px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 100;
    }

    .filter-content {
        user-select: none;
        overflow-y: overlay;
        padding: 10px 16px;
    }

    .filter-content::-webkit-scrollbar {
        width: 8px;
        background: transparent;
    }

    .filter-content::-webkit-scrollbar-thumb {
        background: var(--primary);
    }

    .filter-section {
        margin-bottom: 12px;
    }

    .filter-section h4 {
        margin: 2px;
    }

    .filter-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .filter-label * {
        margin: 0;
    }

    .filter-options {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .filter-footer {
        display: flex;
        justify-content: space-between;
        padding: 10px 16px;
        border-top: 1px solid #444;
        gap: 10px;
    }

    .filter-footer button {
        all: unset;
        cursor: pointer;
        padding: 5px 8px;
        border-radius: 8px;
    }

    .filter-footer button.clear {
        color: var(--color-error);
    }

    .filter-footer button.clear:hover {
        background-color: var(--color-error);
        color: var(--background);
    }

    .filter-footer button.confirm:hover {
        background-color: var(--primary);
        color: var(--background);
    }

    .choice {
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid var(--secondary-text);
        gap: 5px;
        cursor: pointer;
        user-select: none;
        display: flex;
        align-items: center;
    }

    .choice.active {
        background: var(--primary);
        color: var(--background);
        border-color: var(--primary);
    }

    .choice.active:has(img) img {
        filter: brightness(100);
    }

    select {
        height: 29px;
        padding: 5px;
        border-radius: 5px;
        border: 1px solid var(--muted);
    }

    /* cards */
    .card-list {
        flex: 1;
        overflow-y: auto;
    }

    .card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
        gap: 16px;
        padding: 20px;
    }

    .card-grid .card {
        overflow: hidden;
        transition: transform 0.2s;
        user-select: none;
    }

    .card-grid .card:hover {
        transform: translateY(-5px);
    }

    .card-grid .card img {
        border-radius: 10px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
        width: 100%;
        object-fit: contain;
    }

    .card-name {
        padding: 3px 0;
        font-weight: bold;
        text-align: center;
        font-size: small;
        filter: drop-shadow(0 2px 2px #0000002d);
    }

    .loading {
        text-align: center;
        padding: 20px;
    }

    .placeholder {
        flex-direction: column;
        justify-content: center;
        align-items: center;
        display: flex;
        width: 100%;
        aspect-ratio: 5/7;
        row-gap: 10px;
    }

    .placeholder img {
        all: unset;
        width: 90%;
    }

    @media (max-width: 650px) {
        .card-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        }

        .filter-modal {
            width: 95%;
            max-width: 500px;
        }
    }
</style>
