<script>
    // @ts-nocheck

    import {
        getCardsCount,
        getDistinctFilters,
        getVersion,
        searchCards,
    } from "$lib/db";
    import { syncDataRefresh } from "$lib/stores";
    import { onMount, onDestroy } from "svelte";

    let message = "欢迎使用符文档案";
    let count = 0;
    let localTime = "";
    let filters = {
        series: [],
        type: [],
        tag: [],
        region: [],
        keyword: [],
    };

    const refreshData = async () => {
        console.log("Home 页面刷新数据...");
        count = await getCardsCount();
        filters = await getDistinctFilters();
        const localVersion = await getVersion("cards");
        if (localVersion) {
            localTime = new Date(localVersion).toLocaleString();
        }
    };

    onMount(() => {
        refreshData();
        // 注册回调
        // @ts-ignore
        syncDataRefresh.set(refreshData);
    });

    onDestroy(() => {
        syncDataRefresh.set(null);
    });
</script>

<div style="padding: 10px 16px;">
    <h2>{message}</h2>

    <section>
        <p>卡牌数量：{count}张</p>
        <p>更新时间：{localTime ?? "无"}</p>
        <h3>系列</h3>
        <ul>
            {#each filters.series as s}<li>{s}</li>{/each}
        </ul>

        <h3>类型</h3>
        <ul>
            {#each filters.type as t}<li>{t}</li>{/each}
        </ul>

        <h3>标签</h3>
        <ul>
            {#each filters.tag as t}<li>{t}</li>{/each}
        </ul>

        <h3>地区</h3>
        <ul>
            {#each filters.region as r}<li>{r}</li>{/each}
        </ul>

        <h3>关键字</h3>
        <ul>
            {#each filters.keyword as k}<li>{k}</li>{/each}
        </ul>
    </section>
</div>
