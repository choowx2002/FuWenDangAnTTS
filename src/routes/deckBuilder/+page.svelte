<script>
    // @ts-nocheck

    import {
        getDiffLimits,
        getDistinctFilters,
        loadDeck,
        saveDeck,
        searchCards,
    } from "$lib/db";
    import { loadExternalImage } from "$lib/fs";
    import { onMount, tick } from "svelte";
    import CardModal from "../../components/CardModal.svelte";
    import { preventDefault } from "svelte/legacy";
    import { urlMap } from "$lib/resManager";
    import RangeSlider from "svelte-range-slider-pips";
    import { page } from "$app/state";

    let deck = {
        legend: [],
        chosen: [],
        main: [],
        runes: [],
        battlefield: [],
        sideboard: [],
    };

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
        rarity: "eitherSelected",
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
    let page_num = 1;
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
    let contextMenuVisible = false;
    let contextMenuZoneFrom = null;
    let contextMenuX = 0;
    let contextMenuY = 0;
    let selectMode = "default";
    let deckName = null;
    let deckDesc = null;
    const options = [
        { value: "default", label: "默认" },
        { value: "sideboard", label: "备牌" },
    ];

    $: hasFilter =
        (Object.keys(queryOptions).length > 0 &&
            Object.values(queryOptions).some(
                (arr) => Array.isArray(arr) && arr.length > 0,
            )) ||
        query.trim() !== "" ||
        !arraysEqual(powerValues, powerLimit) ||
        !arraysEqual(energyValues, energyLimit) ||
        !arraysEqual(mightValues, mightLimit);
    $: deckId = page.url.searchParams.get("deckId");

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

    function toggleFilter(type, value) {
        const current = { ...queryOptions };
        if (!current[type]) current[type] = [];
        const idx = current[type].indexOf(value);
        if (idx === -1) current[type].push(value);
        else current[type].splice(idx, 1);
        queryOptions = current;
        loadCards(true);
    }

    function clearAllFilters(needLoad = true) {
        queryOptions = {};
        query = "";
        mightValues = mightLimit;
        powerValues = powerLimit;
        energyValues = energyLimit;
        for (const key in selectModes) {
            if (!Object.hasOwn(selectModes, key)) continue;
            selectModes[key] = "eitherSelected";
        }
        if (needLoad) loadCards(true);
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
                    page_num++;
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
            page_num = 1;
            cards = [];
            // imageUrls = {};
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
            page: page_num,
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

    const isSignCardAvailable = (championTag) => {
        if (!deck.legend.length) return true;
        const legendTag = deck.legend[0].data.champion_tag;
        return championTag === legendTag;
    };

    const isChosenAvailable = (championTag) => {
        if (!deck.legend.length) return true;
        const legendTag = deck.legend[0].data.champion_tag;
        return championTag === legendTag;
    };

    const isColorAvailable = (card_color_list) => {
        if (!deck.legend.length) return true;
        const legendColor = JSON.parse(deck.legend[0].data.card_color_list);
        const colorList = JSON.parse(card_color_list);
        for (const color of colorList) {
            if (!legendColor.includes(color) && color !== "colorless") {
                return false;
            }
        }
        return true;
    };

    const normalize = (v) => (v ?? "").trim();
    const signatureTypes = new Set(["专属单位", "专属法术", "专属装备"]);
    const addToDeck = (card) => {
        const scrollToCard = (id, zone) => {
            setTimeout(() => {
                const el = document.getElementById(`${zone}-${id}`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 50);
        };
        switch (card.card_category_name) {
            case "传奇": {
                const updated = [...deck.legend];
                const cardData = {
                    card_no: card.card_no,
                    zone: "legend",
                    quantity: 1,
                    img: imageUrls[card.card_no],
                    data: card,
                };
                deck = { ...deck, legend: [cardData] };
                scrollToCard(card.card_no, cardData.zone);
                break;
            }

            case "专属装备":
            case "专属单位":
            case "专属法术": {
                const inputzone =
                    selectMode === "default" ? "main" : "sideboard";
                if (
                    deck[inputzone].reduce(
                        (sum, c) => sum + (c.quantity || 1),
                        0,
                    ) >= zoneLimit[inputzone]
                ) {
                    // //console.log(inputzone, "满了");
                    return;
                }

                const threeCombineDeck = [
                    ...deck.chosen,
                    ...deck.main,
                    ...deck.sideboard,
                ];

                const signatures = threeCombineDeck.filter((card) =>
                    signatureTypes.has(card.data.card_category_name),
                );

                // 检查总体数量
                if (
                    signatures.reduce((sum, c) => sum + (c.quantity || 1), 0) >=
                    3
                ) {
                    //console.log("专属满了");
                    return;
                }

                // 检查传奇适配度
                if (!isSignCardAvailable(card.champion_tag)) return;

                const existingIndex = deck[inputzone].findIndex(
                    (c) => c.card_no === card.card_no,
                );

                if (existingIndex !== -1) {
                    const updated = [...deck[inputzone]];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        quantity: updated[existingIndex].quantity + 1,
                    };
                    deck = { ...deck, [inputzone]: updated };
                } else {
                    const cardData = {
                        card_no: card.card_no,
                        zone: inputzone,
                        quantity: 1,
                        img: imageUrls[card.card_no],
                        data: card,
                    };
                    deck = {
                        ...deck,
                        [inputzone]: [...deck[inputzone], cardData],
                    };
                }
                scrollToCard(card.card_no, inputzone);
                break;
            }

            case "法术":
            case "装备":
            case "单位":
            case "英雄单位": {
                // if (selectMode === "chosen") {
                //     selectedCard = card;
                //     setAsChosen();
                //     selectedCard = null;
                //     return;
                // }
                const inputzone =
                    selectMode === "default" ? "main" : "sideboard";

                if (
                    deck[inputzone].reduce(
                        (sum, c) => sum + (c.quantity || 1),
                        0,
                    ) >= zoneLimit[inputzone]
                ) {
                    //console.log("主卡堆满了");
                    return;
                }

                const threeCombineDeck = [
                    ...deck.chosen,
                    ...deck.main,
                    ...deck.sideboard,
                ];

                const sameNameCards = threeCombineDeck.filter(
                    (c) =>
                        normalize(card.card_name) ===
                            normalize(c.data.card_name) &&
                        normalize(card.sub_title) ===
                            normalize(c.data.sub_title),
                );

                const sameCardCount = sameNameCards.reduce(
                    (sum, c) => sum + (c.quantity || 1),
                    0,
                );

                if (sameCardCount >= 3) return;

                const existingIndex = deck[inputzone].findIndex(
                    (c) => c.card_no === card.card_no,
                );

                if (existingIndex !== -1) {
                    const updated = [...deck[inputzone]];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        quantity: updated[existingIndex].quantity + 1,
                    };
                    deck = { ...deck, [inputzone]: updated };
                } else {
                    const cardData = {
                        card_no: card.card_no,
                        zone: inputzone,
                        quantity: 1,
                        img: imageUrls[card.card_no],
                        data: card,
                    };
                    deck = {
                        ...deck,
                        [inputzone]: [...deck[inputzone], cardData],
                    };
                }
                scrollToCard(card.card_no, inputzone);
                break;
            }

            case "符文": {
                if (
                    deck.runes.reduce((sum, c) => sum + (c.quantity || 1), 0) >=
                    12
                ) {
                    //console.log("符文满了");
                    return;
                }
                const existingIndex = deck.runes.findIndex(
                    (c) => c.card_no === card.card_no,
                );

                if (existingIndex !== -1) {
                    const updated = [...deck.runes];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        quantity: updated[existingIndex].quantity + 1,
                    };
                    deck = { ...deck, runes: updated };
                } else {
                    const cardData = {
                        card_no: card.card_no,
                        zone: "runes",
                        quantity: 1,
                        img: imageUrls[card.card_no],
                        data: card,
                    };
                    deck = {
                        ...deck,
                        runes: [...deck.runes, cardData],
                    };
                }
                scrollToCard(card.card_no, "runes");
                break;
            }

            case "战场": {
                if (
                    deck.battlefield.reduce(
                        (sum, c) => sum + (c.quantity || 1),
                        0,
                    ) >= 3
                ) {
                    //console.log("战场满了");
                    return;
                }
                const existingIndex = deck.battlefield.findIndex(
                    (c) => c.card_no === card.card_no,
                );

                if (existingIndex === -1) {
                    const cardData = {
                        card_no: card.card_no,
                        zone: "battlefield",
                        quantity: 1,
                        img: imageUrls[card.card_no],
                        data: card,
                    };
                    deck = {
                        ...deck,
                        battlefield: [...deck.battlefield, cardData],
                    };
                }
                scrollToCard(card.card_no, "battlefield");
                break;
            }

            default:
                break;
        }
    };

    onMount(async () => {
        window.addEventListener("click", closeMenu);
        filters = await getDistinctFilters();
        await updateRange();
        initObserver();
        await loadCards(true);
        if (deckId) {
            try {
                const dbDeck = await loadDeck(deckId);
                deckName = dbDeck.name;
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
                            const p = loadExternalImage(
                                `${cardno_filter}.png`,
                            ).then((url) => {
                                imageUrls[d.card_no] = d.front_image_en;
                            });
                            promises.push(p);
                        }
                    }
                }

                await Promise.all(promises);
                const tempDeck = {};
                for (const zone of zoneTypes) {
                    if (!dbDeck[zone] || !dbDeck[zone].length) {
                        tempDeck[zone] = [];
                        continue;
                    }
                    dbDeck[zone].forEach((d) => {
                        const cardData = {
                            card_no: d.card_no,
                            zone: d.zone,
                            quantity: d.quantity,
                            img: imageUrls[d.card_no],
                            data: d,
                        };
                        (tempDeck[zone] ??= []).push(cardData);
                    });
                }
                deck = { ...tempDeck };
            } catch (error) {
                //console.log(error);
            }

            //console.log(deck);
        }
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
        main: 39,
        runes: 12,
        battlefield: 3,
        sideboard: 8,
    };

    const zoneQuery = {
        legend: { type: ["传奇"] },
        main: {
            type: [
                "专属单位",
                "专属法术",
                "专属装备",
                "单位",
                "法术",
                "英雄单位",
                "装备",
            ],
        },
        chosen: { type: ["英雄单位"] },
        signature: { type: ["专属单位", "专属法术", "专属装备"] },
        runes: { type: ["符文"] },
        battlefield: { type: ["战场"] },
        sideboard: {
            type: [
                "专属单位",
                "专属法术",
                "专属装备",
                "单位",
                "法术",
                "英雄单位",
                "装备",
            ],
        },
    };

    const filterWithZone = (zone) => {
        clearAllFilters(false);
        queryOptions = {};
        query = "";
        queryOptions = { ...zoneQuery[zone] };
        selectMode = zone === "sideboard" ? "sideboard" : "default";
        switch (zone) {
            case "signature":
            case "chosen": {
                if (deck.legend && deck.legend.length > 0) {
                    const legendChampion = deck.legend[0].data.champion_tag;
                    query = legendChampion;
                    const legendColor = JSON.parse(
                        deck.legend[0].data.card_color_list,
                    );
                    queryOptions.color = legendColor;
                }
                break;
            }
            case "main":
            case "sideboard":
            case "runes": {
                if (deck.legend && deck.legend.length > 0) {
                    const legendColor = JSON.parse(
                        deck.legend[0].data.card_color_list,
                    );
                    queryOptions.color = legendColor;
                }
                break;
            }
            default:
                break;
        }
        loadCards(true);
    };

    const goBack = () => {
        window.history.back();
    };

    function handleContextMenu(e, card, zone) {
        e.preventDefault();
        selectedCard = card;
        contextMenuX = e.clientX;
        contextMenuY = e.clientY;
        contextMenuVisible = false;
        setTimeout(() => {
            contextMenuVisible = true;
        }, 50);
        contextMenuZoneFrom = zone;
    }

    function closeMenu() {
        contextMenuVisible = false;
        contextMenuZoneFrom = null;
    }

    const setAsChosen = () => {
        const card = selectedCard;
        if (!card) return;
        if (!isChosenAvailable(selectedCard.champion_tag)) return;

        const cardData = {
            card_no: card.card_no,
            zone: "chosen",
            quantity: 1,
            img: imageUrls[card.card_no],
            data: card,
        };

        const chosenList = [...deck.chosen];

        const existingIndex = deck.main.findIndex(
            (c) => c.card_no === card.card_no,
        );

        if (existingIndex === -1) return;

        const mainList = [...deck.main];
        const needRemove = mainList[existingIndex].quantity === 1;

        if (needRemove) {
            mainList.splice(existingIndex, 1);
        } else {
            mainList[existingIndex] = {
                ...mainList[existingIndex],
                quantity: mainList[existingIndex].quantity - 1,
            };
        }

        if (!chosenList.length) {
            deck = { ...deck, chosen: [cardData], main: mainList };
        } else {
            const prevChosen = { ...chosenList[0] };
            deck = { ...deck, chosen: [cardData], main: mainList };
            addToDeck(prevChosen.data);
        }
    };

    const removeCardFromDeck = (zone, card_no) => {
        const index = deck[zone].findIndex((c) => c.card_no === card_no);

        if (index === -1) return;
        const updated = [...deck[zone]];

        updated.splice(index, 1);

        deck = {
            ...deck,
            [zone]: updated,
        };
    };

    function handleMenuAction(action) {
        switch (action) {
            case "view":
                selectedCardImg =
                    imageUrls[selectedCard.card_no] ?? card.front_image_en;
                showCardModal = true;
                break;
            case "copyCardName":
                const sub = selectedCard.sub_title
                    ? " " + selectedCard.sub_title
                    : "";
                navigator.clipboard.writeText(selectedCard.card_name + sub);
                break;
            case "copyCardNo":
                navigator.clipboard.writeText(selectedCard.card_no);
                break;
            case "setAsChosenFromDeck":
                setAsChosen();
                break;
            case "removeCardFromDeck":
                removeCardFromDeck(contextMenuZoneFrom, selectedCard.card_no);
                break;
        }
        contextMenuVisible = false;
    }

    const getMenuList = () => {
        const base = [
            { label: "查看信息", action: "view" },
            { label: "复制编号", action: "copyCardNo" },
            { label: "复制名字", action: "copyCardName" },
            { label: "移除此卡牌", action: "removeCardFromDeck" },
        ];
        if (
            contextMenuZoneFrom === "main" &&
            selectedCard.card_category_name === "英雄单位" &&
            isChosenAvailable(selectedCard.champion_tag)
        ) {
            base.push({ label: "设为选定英雄", action: "setAsChosenFromDeck" });
        }
        return base;
    };

    const isCardValid = (card, zone) => {
        if (!card || !card.data) return;

        const errors = [];
        const data = card.data;

        // === 1. 传奇相关检查 ===
        if (deck?.legend && deck?.legend?.length) {
            const isChosenZone = zone === "chosen";

            if (isChosenZone) {
                if (!isChosenAvailable(data.champion_tag)) {
                    errors.push("选定英雄不符合传奇。");
                }
            } else if (!isColorAvailable(data.card_color_list)) {
                errors.push("符文特性不符合传奇。");
            }
        }

        // === 2. 专属卡牌适配检查 ===
        const isSignature = signatureTypes.has(data.card_category_name);
        if (
            data.champion_tag &&
            isSignature &&
            !isSignCardAvailable(data.champion_tag)
        ) {
            errors.push("专属卡牌不符合传奇。");
        }

        // === 3. 同名卡数量限制检查 ===
        const allDeckCards = [...deck.chosen, ...deck.main, ...deck.sideboard];

        const sameNameCards = allDeckCards.filter(
            (c) =>
                normalize(c.data.card_name) === normalize(data.card_name) &&
                normalize(c.data.sub_title) === normalize(data.sub_title),
        );

        const totalSameCards = sameNameCards.reduce(
            (sum, c) => sum + (c.quantity || 1),
            0,
        );

        if (totalSameCards > 3) {
            errors.push("同名卡牌超过3张。");
        }

        // === 4. 生成校验结果 ===
        const result = {
            valid: errors.length === 0,
            errors,
        };

        card.errors = result.valid ? [] : result.errors;
        return result;
    };

    const beforeSaveDeck = () => {
        const isZoneInvalid = (zoneKey) =>
            deck[zoneKey]?.some((c) => c?.errors?.length > 0);
        for (const zone in deck) {
            if (!Object.hasOwn(deck, zone)) continue;
            //console.log(zone, deck[zone]);
        }

        const newDeckData = {
            id: deckId,
            name: deckName ?? "",
            description: deckDesc ?? "",
            ...deck,
        };

        saveDeck(newDeckData)
            .then((id) => {
                //console.log("ID: ", id);
                goBack();
            })
            .catch((err) => {
                //console.log("err: ", err);
            });
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
    onConfirm={() => addToDeck(selectedCard)}
/>

<div class="deck-info">
    <div class="deck-name-container">
        <input
            class="deck-name"
            type="text"
            bind:value={deckName}
            placeholder="卡组名称"
        />
    </div>
    <div>
        <button aria-label="取消" onclick={goBack}>取消</button>
        <button aria-label="完成" onclick={beforeSaveDeck}>完成</button>
    </div>
</div>

{#if contextMenuVisible}
    <div
        class="context-menu"
        style="top: {contextMenuY}px; left: {contextMenuX}px;"
    >
        {#each getMenuList() as item}
            <div
                class="menu-item"
                role="presentation"
                onclick={() => handleMenuAction(item.action)}
            >
                {item.label}
            </div>
        {/each}
    </div>
{/if}

<div class="page">
    <div class="part sidebar">
        <div class="deck">
            <div class="selected-mode">
                添加模式：
                {#each options as opt}
                    <label>
                        <input
                            type="radio"
                            name="selectMode"
                            bind:group={selectMode}
                            value={opt.value}
                        />
                        {opt.label}
                    </label>
                {/each}
                <hr />
            </div>
            <div class="deck-container">
                {#each Object.entries(deck) as [zoneKey, cards]}
                    <!-- {#if cards.length > 0} -->
                    <div class="zone">
                        <h6
                            class="zone-title"
                            role="presentation"
                            onclick={() => {
                                filterWithZone(zoneKey);
                            }}
                        >
                            <div>
                                {zoneNames[zoneKey] || zoneKey} ({cards.reduce(
                                    (sum, c) => sum + (c.quantity || 1),
                                    0,
                                )}/{zoneLimit[zoneKey]})
                            </div>
                        </h6>

                        <div class="cards">
                            {#each cards as cardDeck}
                                {@const result = isCardValid(cardDeck, zoneKey)}
                                <div
                                    role="presentation"
                                    class="deckcard"
                                    id={`${zoneKey}-${cardDeck.card_no}`}
                                    title={result.errors.join("\n")}
                                    onclick={() => {
                                        const index = deck[zoneKey].findIndex(
                                            (c) =>
                                                c.card_no === cardDeck.card_no,
                                        );

                                        if (index === -1) return;
                                        const updated = [...deck[zoneKey]];

                                        if (updated[index].quantity <= 1) {
                                            updated.splice(index, 1);
                                        } else {
                                            updated[index] = {
                                                ...updated[index],
                                                quantity:
                                                    updated[index].quantity - 1,
                                            };
                                        }

                                        deck = {
                                            ...deck,
                                            [zoneKey]: updated,
                                        };
                                    }}
                                    oncontextmenu={(e) => {
                                        handleContextMenu(
                                            e,
                                            cardDeck.data,
                                            zoneKey,
                                        );
                                    }}
                                >
                                    <img
                                        class={cardDeck.data
                                            .card_category_name === "战场"
                                            ? "landscape"
                                            : ""}
                                        src={cardDeck.img}
                                        alt={cardDeck.data.card_name}
                                    />
                                    <div class="name">
                                        <div>
                                            {cardDeck.data.card_name}{cardDeck
                                                .data.sub_title
                                                ? "·" + cardDeck.data.sub_title
                                                : ""}
                                        </div>
                                        <div
                                            style="font-size: smaller; opacity: 70%;"
                                        >
                                            {cardDeck.card_no}
                                        </div>
                                    </div>
                                    <div
                                        class="count"
                                        style="background-color: {result.valid
                                            ? 'var(--primary)'
                                            : 'var(--color-error)'};"
                                        title={result.errors.join("\n")}
                                    >
                                        {cardDeck.quantity}
                                    </div>
                                </div>
                            {/each}
                        </div>
                        <hr />
                    </div>
                    <!-- {/if} -->
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
                <option value="card_category_name-desc">类型</option>
            </select>
            <button onclick={() => (filterVisible = true)}>筛选</button>
            {#if hasFilter}
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
        <div class="card-grid">
            {#each cards as card}
                <div
                    class="card"
                    onclick={() => {
                        addToDeck(card);
                    }}
                    oncontextmenu={(e) => {
                        handleContextMenu(e, card, "list");
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
        /* flex-wrap: wrap; */
        padding: 12px 16px;
        height: 52px;
        gap: 10px;
        border-bottom: 1px solid var(--muted);
    }

    .selected-mode {
        font-size: small;
        font-weight: bold;
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
    }

    .cards {
        display: flex;
        flex-wrap: wrap;
        row-gap: 8px;
    }

    .zone-title {
        margin: 0;
        margin-bottom: 5px;
        font-size: small;
        cursor: pointer;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .zone .deckcard {
        user-select: none;
        background-color: var(--text);
        width: 100%;
        height: 40px;
        object-fit: cover;
        border-radius: 5px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
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

    .deckcard img.landscape {
        transform: rotate(0.75turn) scale(0.75);
        top: -160%;
    }

    .zone .deckcard .name {
        font-size: small;
        position: absolute;
        color: whitesmoke;
        background: linear-gradient(
            90deg,
            rgba(2, 0, 36, 1) 0%,
            rgba(0, 0, 0, 0.6) 20%,
            rgba(0, 212, 255, 0) 100%
        );
        padding-left: 12px;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        align-content: center;
    }

    .zone .deckcard .name div {
        width: 100%;
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
        box-shadow: 0 0 10px rgb(34, 34, 34, 0.8);
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
