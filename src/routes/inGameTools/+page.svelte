<script>
    //@ts-nocheck
    import { onMount } from "svelte";
    import Sortable from "sortablejs";
    let redDeck = [
        { id: 2, name: "卡牌 B", url: "https://steamusercontent-a.akamaihd.net/ugc/16983250337762221327/6CC124B60A9BB7DD044B3BCF1250BEE1778E7A98/" },
        { id: 3, name: "卡牌 A", url: "https://steamusercontent-a.akamaihd.net/ugc/16983250337762221327/6CC124B60A9BB7DD044B3BCF1250BEE1778E7A98/" },
    ];

    let blueDeck = [
        { id: 1, name: "卡牌 C", url: "https://steamusercontent-a.akamaihd.net/ugc/16983250337762221327/6CC124B60A9BB7DD044B3BCF1250BEE1778E7A98/" },
        { id: 2, name: "卡牌 B", url: "https://steamusercontent-a.akamaihd.net/ugc/16983250337762221327/6CC124B60A9BB7DD044B3BCF1250BEE1778E7A98/" },
        { id: 3, name: "卡牌 A", url: "https://steamusercontent-a.akamaihd.net/ugc/16983250337762221327/6CC124B60A9BB7DD044B3BCF1250BEE1778E7A98/" },
    ];

    let redRunes = [
        { id: 1, name: "1" },
        { id: 2, name: "2" },
        { id: 3, name: "3" },
        { id: 4, name: "4" },
    ];
    onMount(() => {
        const redHand = document.getElementById("redHand");
        const redRunes = document.getElementById("redRunes");
        const redTrash = document.getElementById("redTrash");
        // const redRuneDeck = document.getElementById("redRuneDeck");
        // const redMainDeck = document.getElementById("redMainDeck");
        // const redBase = document.getElementById("redBase");
        // const redLegend = document.getElementById("redLegend");
        // const redChosen = document.getElementById("redChosen");

        const blueHand = document.getElementById("blueHand");
        // const blueRunes = document.getElementById("blueRunes");
        // const blueTrash = document.getElementById("blueTrash");
        // const blueRuneDeck = document.getElementById("blueRuneDeck");
        // const blueMainDeck = document.getElementById("blueMainDeck");
        // const blueBase = document.getElementById("blueBase");
        // const blueLegend = document.getElementById("blueLegend");
        // const blueChosen = document.getElementById("blueChosen");

        Sortable.create(redRunes, {
            group: "shared",
            animation: 150,
        });

        Sortable.create(redTrash, {
            group: "shared",
            animation: 150,
            onAdd: (evt) => {
                const item = evt.item;
                redTrash.appendChild(item);
                const children = Array.from(redTrash.children);
                children.forEach((el, i) => {
                    el.style.setProperty("--i", i);
                });
            },
        });

        Sortable.create(redHand, {
            group: "shared",
            animation: 150,
        });

        Sortable.create(blueHand, {
            group: "shared",
            animation: 150,
        });
    });

    const addCard = () => {
        blueDeck = [...blueDeck, { id: Date.now(), name: "卡牌 C", url: "https://steamusercontent-a.akamaihd.net/ugc/16983250337762221327/6CC124B60A9BB7DD044B3BCF1250BEE1778E7A98/" }];
    };
</script>

<section id="viewport">
    <div class="redPlayer red">
        <div id="redHand" class="hand">
            {#each redDeck as card, i (card.id)}
                <div class="draggable" style="--i:{redDeck.length - 1 - i}">
                    <img class="card-image" src={card.url} alt={card.name}>
                </div>
            {/each}
        </div>
    </div>
    <div id="zoom-container">
        <div class="grid-row">
            <div
                id="redTrash"
                class="area deck trash"
                style="grid-column: span 1;"
            >
                {#each redDeck as card, i (card.id)}
                    <div class="draggable" style="--i:{redDeck.length - 1 - i}">
                        {card.name}
                    </div>
                {/each}
            </div>
            <div id="redRunes" class="area runes" style="grid-column: span 10;">
                {#each redRunes as rune}
                    <div class="rune">{rune.name}</div>
                {/each}
            </div>
            <div class="area deck runeDeck" style="grid-column: span 1;"></div>
        </div>

        <div class="grid-row">
            <div class="area deck mainDeck" style="grid-column: span 1;"></div>
            <div class="area" style="grid-column: span 9;"></div>
            <div class="area" style="grid-column: span 1;"></div>
            <div class="area" style="grid-column: span 1;"></div>
        </div>

        <div class="battle-zone">
            <div class="card-slot field area"></div>
            <div class="card-slot field area"></div>
        </div>

        <div class="grid-row">
            <div class="area" style="grid-column: span 1;"></div>
            <div class="area" style="grid-column: span 1;"></div>
            <div class="area" style="grid-column: span 9;"></div>
            <div class="area deck mainDeck" style="grid-column: span 1;"></div>
        </div>
        <div class="grid-row">
            <div class="area deck runeDeck" style="grid-column: span 1;"></div>
            <div class="area" style="grid-column: span 10;"></div>
            <div class="area deck trash" style="grid-column: span 1;"></div>
        </div>
    </div>
    <div class="bluePlayer blue">
        <!-- svelte-ignore a11y_consider_explicit_label -->
        <button type="button" on:click={addCard}>Add card</button>
        <div id="blueHand" class="hand">
            {#each blueDeck as card, i (card.id)}
                <div class="draggable" style="--i:{blueDeck.length - 1 - i}">
                    <img class="card-image" src={card.url} alt={card.name}>
                </div>
            {/each}
        </div>
    </div>
</section>

<style>
    * {
        box-sizing: border-box;
    }

    /* 全局重置，防止出现滚动条 */
    :global(body) {
        margin: 0;
        padding: 0;
        overflow: hidden;
    }

    #viewport {
        width: 100%;
        height: calc(100dvh - 32px);
        background-color: #1a1a1a;
        display: grid;
        grid-template-columns: 1fr 6fr 1fr;
        align-items: center;
    }

    .bluePlayer,
    .redPlayer {
        box-sizing: border-box;
        height: calc(100dvh - 32px);
        background-color: var(--text);
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    /* 画布完全由 vw 驱动 */
    #zoom-container {
        aspect-ratio: 1.5 / 1;
        max-height: calc(100dvh - 32px);
        background-color: #004d61;
        display: grid;
        grid-template-rows: auto auto 1fr auto auto;
        gap: 1vw;
        padding: 1.5vw;
        box-sizing: border-box;
        border: 1px solid rgba(255, 255, 255, 0.2);
        position: relative;
    }

    .grid-row {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        gap: 0.8vw;
    }

    .area {
        border: 0.1vw solid rgba(255, 255, 255, 0.4);
        border-radius: 0.4vw;
        display: flex;
        align-items: center;
        /* justify-content: center; */
        color: white;
        font-size: 1vw;
        text-align: center;
    }

    .battle-zone {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1vw;
    }

    .card-slot {
        border: 0.1vw solid rgba(255, 255, 255, 0.3);
        border-radius: 0.8vw;
    }

    .card-slot {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .field {
        background: rgba(255, 255, 255, 0.05);
    }

    .hand {
        display: grid;
        gap: 0.3vw;
        grid-template-columns: 1fr 1fr;
        align-content: start;
        padding: 10px 5px;
        height: 90%;
        grid-auto-rows: min-content;
        overflow-y: auto;
    }

    .hand > * {
        color: #fff;
        width: 100%;
        aspect-ratio: 250 / 349;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 0.5vw;
        overflow: hidden;
    }

    img.card-image {
        width: 100%;
        object-fit: cover;
    }

    .red .draggable {
        border: 0.8px solid red;
    }

    .blue .draggable {
        border: 0.8px solid blue;
    }

    .runes {
        display: grid;
        gap: 1%;
        grid-template-columns: repeat(auto-fit, calc(100% / 12));
        padding: 1% 1%;
    }

    .runes > * {
        color: #fff;
        flex: 1;
        background-color: black;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .deck > * {
        position: absolute;
        inset: 0;
        cursor: grab;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        border-radius: 0.3vw;
        background-color: rgb(3, 3, 76);
        z-index: calc(var(--i) + 1);
        user-select: none;
    }

    .deck {
        position: relative;
        border-radius: 0.5vw;
        overflow: hidden;
        aspect-ratio: 250 / 349;
    }

    .deck::after {
        content: "";
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .trash::after {
        content: "废牌堆";
    }

    .runeDeck::after {
        content: "符文堆";
    }

    .mainDeck::after {
        content: "主牌堆";
    }
</style>
