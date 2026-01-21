<script>
    // @ts-nocheck
    import { onMount, tick } from "svelte";
    import { writable } from "svelte/store";
    import { getDistinctFilters, searchCards, getDiffLimits } from "$lib/db";
    import { loadExternalImage } from "$lib/fs";
    import RangeSlider from "svelte-range-slider-pips";
    import { urlMap } from "$lib/resManager";
    import CardModal from "../../components/CardModal.svelte";
    import { syncTTSConnection } from "$lib/stores";
    import { sendToTTSTesting } from "$lib/ttsClient";
    import BottomToast from "../../components/BottomToast.svelte";

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

    const modeLabels = {
        eitherSelected: "任意匹配",
        onlySelected: "精确匹配",
        includeSelected: "包含匹配",
        excludeSelected: "排除匹配",
    };

    const filterMode = {
        series: ["eitherSelected", "excludeSelected"],
        type: ["eitherSelected", "excludeSelected"],
        rarity: ["eitherSelected", "excludeSelected"],
        tag: [
            "eitherSelected",
            "onlySelected",
            "includeSelected",
            "excludeSelected",
        ],
        region: ["eitherSelected", "excludeSelected"],
        keyword: [
            "eitherSelected",
            "onlySelected",
            "includeSelected",
            "excludeSelected",
        ],
        color: [
            "eitherSelected",
            "onlySelected",
            "includeSelected",
            "excludeSelected",
        ],
    };

    let selectModes = {
        series: "eitherSelected",
        type: "eitherSelected",
        tag: "eitherSelected",
        region: "eitherSelected",
        keyword: "eitherSelected",
        color: "eitherSelected",
        rarity: "eitherSelected"
    };

    function changeMode(filterKey, newMode) {
        const modeKey = filterKey;
        selectModes[modeKey] = newMode;
        loadCards(true);
    }

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

    $: currentStatus = $syncTTSConnection;

    $: hasFilter =
        (Object.keys(queryOptions).length > 0 &&
            Object.values(queryOptions).some(
                (arr) => Array.isArray(arr) && arr.length > 0,
            )) ||
        query.trim() !== "" ||
        !arraysEqual(powerValues, powerLimit) ||
        !arraysEqual(energyValues, energyLimit) ||
        !arraysEqual(mightValues, mightLimit);

    const selectedFilters = writable({});

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

    onMount(async () => {
        filters = await getDistinctFilters();
        await updateRange();
        initObserver();
        await loadCards();
    });

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

    const arraysEqual = (a, b) =>
        Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((v, i) => v === b[i]);

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
            selectModes,
            ...queryOptions,
        });

        total = t;
        if (rows.length < 50) hasMore = false;
        cards = [...cards, ...rows];

        for (const card of rows) {
            const cardno_filter = card.card_no.replace("*", "s");
            loadExternalImage(`${cardno_filter}.png`).then((url) => {
                imageUrls[card.card_no] = url ? url : card.front_image_en;
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
        for (const key in selectModes) {
            if (!Object.hasOwn(selectModes, key)) continue;
            selectModes[key] = "eitherSelected";
        }
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

    let selectedCardImg = null;
    let selectedCard = null;
    async function spawnCards() {
        if (currentStatus) {
            sendToTTSTesting([selectedCard]).catch((reason) => {
                showToast("未连接。请打开并连接到TTS。", "error");
            });
            return;
        }
    }

    async function spawnAllCards() {
        if (currentStatus) {
            sendToTTSTesting(cards).catch((reason) => {
                showToast("未连接。请打开并连接到TTS。", "error");
            });
            return;
        }
    }
    let message = null;
    const showToast = (text, type = "info") => {
        message = { id: Date.now(), text, type };
    };
</script>

<BottomToast {message} />

<CardModal
    bind:show={showCardModal}
    card={selectedCard}
    imgPath={selectedCardImg}
    onCancel={() => {
        showCardModal = false;
    }}
    isConnected={currentStatus}
    onConfirm={spawnCards}
/>

<!-- 顶部控制栏 -->
<div
    class="controls"
    role="presentation"
    onkeydown={(e) => e.key === "Escape" && (filterVisible = false)}
>
    <input
        type="text"
        placeholder="搜索卡牌..."
        bind:value={query}
        oninput={(e) => (query = e.target.value.trimStart())}
        onkeydown={(e) => e.key === "Enter" && onSearch(e)}
        style="flex:1;padding:6px 10px; border-radius: 5px;
        border: 1px solid var(--muted);"
    />
    <h5>数量: {total}</h5>
    <select onchange={onSortChange}>
        <option value="card_no-asc">编号（升序↑）</option>
        <option value="card_no-desc">编号（降序↓）</option>
        <option value="card_category-asc">类型（升序↑）</option>
        <option value="card_category-desc">类型（降序↓）</option>
        <option value="card_color_list-desc">颜色</option>
        <option value="power-asc">战力（升序↑）</option>
        <option value="power-desc">战力（降序↓）</option>
        <option value="energy-asc">法力（升序↑）</option>
        <option value="energy-desc">法力（降序↓）</option>
        <option value="return_energy-asc">符能（升序↑）</option>
        <option value="return_energy-desc">符能（降序↓）</option>
    </select>
    <button onclick={() => (filterVisible = true)}>筛选</button>
    {#if hasFilter}
        <button onclick={clearAllFilters}>重置</button>
    {/if}
    {#if currentStatus}
        <div>
            <button onclick={spawnAllCards}>添加全部</button>
        </div>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div style="user-select: none;">
            <label for="addingMode">添加模式</label>
            <input type="checkbox" bind:checked={addingMode} id="addingMode" />
        </div>
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
            {#each Object.entries(filters) as [key, values]}
                <div class="filter-section">
                    <div class="filter-title">
                        <h4>{filterLabelMap[key.toLowerCase()]}</h4>
                        <div class="filter-mode">
                            <select
                                id={key}
                                onchange={(e) =>
                                    changeMode(key, e.target.value)}
                                bind:value={selectModes[key]}
                            >
                                {#each filterMode[key] as mode}
                                    <option value={mode}
                                        >{modeLabels[mode]}</option
                                    >
                                {/each}
                            </select>
                        </div>
                    </div>
                    <div class="filter-options">
                        {#each values as v}
                            <button
                                type="button"
                                class="choice {queryOptions[key]?.includes(v)
                                    ? 'active'
                                    : ''}"
                                aria-pressed={queryOptions[key]?.includes(v)
                                    ? "true"
                                    : "false"}
                                onclick={() => toggleFilter(key, v)}
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

<!-- 卡牌展示区 -->
<div class="card-grid">
    {#each cards as card}
        <div
            class="card"
            onclick={() => {
                if (addingMode) {
                    sendToTTSTesting([card]).catch((reason) => {
                        showToast("未连接。请打开并连接到TTS。", "error");
                    });
                    return;
                }
                showCardModal = true;
                selectedCard = card;
                selectedCardImg = imageUrls[card.card_no]
                    ? imageUrls[card.card_no]
                    : card.front_image_en;
            }}
            role="presentation"
        >
            {#if imageUrls[card.card_no] || card.front_image_en}
                <img
                    src={imageUrls[card.card_no]
                        ? imageUrls[card.card_no]
                        : card.front_image_en}
                    alt={card.card_name}
                />
            {:else}
                <div class="placeholder">
                    <img src="/favicon.png" alt={card.card_name} />
                    暂时无图
                </div>
            {/if}
            <div class="card-name">
                {card.card_name}{card.sub_title ? " " + card.sub_title : ""}
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

<style>
    .controls {
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
        border: 0.8px solid rgba(128, 128, 128, 0.377);
        border-radius: 10px;
        background-color: rgba(0, 0, 0, 0.075);
    }

    .filter-section h4 {
        margin: 2px;
    }

    .filter-title {
        display: flex;
        justify-content: space-between;
        align-items: end;
        column-gap: 10px;
        margin: 10px 10px 5px;
        border-bottom: 0.8px solid rgba(128, 128, 128, 0.377);
        padding-bottom: 1px;
    }

    .filter-title > div {
        display: flex;
        align-items: center;
        column-gap: 4px;
    }

    .filter-limit {
        display: flex;
        align-items: flex-end;
        column-gap: 1px;
        margin: 0;
    }

    .filter-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 10px 10px 5px;
    }

    .filter-label * {
        margin: 0;
    }

    .filter-options {
        margin: 8px 10px 10px;
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

    .card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(144px, 1fr));
        gap: 16px;
        padding: 20px;
    }

    .card {
        overflow: hidden;
        transition: transform 0.2s;
        user-select: none;
    }

    .card:hover {
        transform: translateY(-5px);
    }

    .card img {
        border-radius: 10px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
        width: 100%;
        object-fit: contain;
    }

    .card-name {
        padding: 3px 0;
        font-weight: bold;
        text-align: center;
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

        @media (min-width: 767.99px) {
        .filter-modal {
            max-width: 1920px;
        }

        .filter-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 0.8rem;
        }
    }
</style>
