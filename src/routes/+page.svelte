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
    <div>
        <p>卡牌数量：{count}张</p>
        <p>更新时间：{localTime ?? "无"}</p>
    </div>
    <section>
        <div>
            <h3>系列 ({filters.series.length})</h3>
            <ul>
                {#each filters.series as s}<li>{s}</li>{/each}
            </ul>
        </div>

        <div>
            <h3>类型 ({filters.type.length})</h3>
            <ul>
                {#each filters.type as t}<li>{t}</li>{/each}
            </ul>
        </div>

        <div>
            <h3>标签 ({filters.tag.length})</h3>
            <ul>
                {#each filters.tag as t}<li>{t}</li>{/each}
            </ul>
        </div>

        <div>
            <h3>地区 ({filters.region.length})</h3>
            <ul>
                {#each filters.region as r}<li>{r}</li>{/each}
            </ul>
        </div>

        <div>
            <h3>关键字 ({filters.keyword.length})</h3>
            <ul>
                {#each filters.keyword as k}<li>{k}</li>{/each}
            </ul>
        </div>
    </section>
</div>

<style>
    section {
        display: grid;
        grid-template-columns: repeat(auto-fill, 200px);
        justify-items: left;
    }

    section h3 {
        margin-bottom: 1px;
    }

    section ul {
        margin: 0;
        padding: 0 20px;
    }
</style>
