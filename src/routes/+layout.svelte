<script>
    // @ts-nocheck

    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { onMount } from "svelte";
    import { getDB, getVersion, upsertCards, upsertVersion } from "$lib/db";
    import { fetchCards, fetchVersion } from "$lib/supabaseClient.js";
    import { syncDataRefresh, syncTTSConnection } from "$lib/stores";
    import { detectTTSServer } from "$lib/ttsClient";
    import { initSingletonMap, urlMap } from "$lib/resManager";
    import Popup from "../components/Popup.svelte";
    import Loading from "../components/Loading.svelte";
    import BottomToast from "../components/BottomToast.svelte";
    import { get } from "svelte/store";

    // 当前路径
    $: current = $page.url.pathname;
    let showSyncDialog = false;
    let loading = false;
    let message = null;
    let updateVersion;
    let isOnTop = false;
    let connectionStatus = {
        success: false,
        sendPort: false,
        receivePort: false,
    };
    let checkingConnectionStatus = false;
    let store;

    const showToast = (text, type = "info") => {
        message = { id: Date.now(), text, type };
    };

    const handleConfirm = async () => {
        loading = true;
        showSyncDialog = false;

        try {
            const res = await fetchCards();
            if (!res.success) {
                showToast(res.error, "error");
                return;
            }

            await upsertCards(res.data);
            await upsertVersion("cards", updateVersion);
            showToast("更新完成! 感谢使用。", "success");
            const callback = $syncDataRefresh;
            if (callback) callback();
        } catch (err) {
            console.error(err);
            showToast(err.message || "同步失败", "error");
        } finally {
            loading = false;
        }
    };

    const handleCancel = () => {
        showSyncDialog = false;
    };

    const isUpdated = (latestVersion, localVersion) => {
        if (!latestVersion?.success || !latestVersion?.data)
            throw new Error("Invalid latestVersion data");

        const latest = latestVersion.data.updated_at;

        // 本地还没有记录
        if (!localVersion)
            return {
                needUpdate: true,
                lVersion: latest,
            };

        // 转换时间
        const latestTime = new Date(latest).toISOString();
        const localTime = new Date(localVersion).toISOString();

        return {
            needUpdate: latestTime !== localTime,
            lVersion: latest,
        };
    };

    const minimizeWindow = async () => {
        await getCurrentWindow().minimize();
    };

    let isMaximized = false;

    export async function toggleFullscreen() {
        const win = getCurrentWindow();
        const currentlyMax = await win.isMaximized();

        if (currentlyMax) {
            await win.unmaximize(); // 如果已经最大化 → 还原
            isMaximized = false;
        } else {
            await win.maximize(); // 否则 → 最大化
            isMaximized = true;
        }
    }

    const closeWindow = async () => {
        await getCurrentWindow().close();
    };

    const toggleOntop = async () => {
        const res = await getCurrentWindow().isAlwaysOnTop();
        isOnTop = !res;
        await getCurrentWindow().setAlwaysOnTop(isOnTop);
    };

    onMount(async () => {
        try {
            await initSingletonMap();
            console.log("initializing...");
            const db = await getDB();

            if (navigator.onLine) {
                const latestVersion = await fetchVersion("cards");
                const localVersion = await getVersion("cards");
                const { needUpdate, lVersion } = isUpdated(
                    latestVersion,
                    localVersion,
                );
                if (needUpdate) {
                    updateVersion = lVersion;
                    showSyncDialog = true;
                }
            } else {
                showToast("当前处于离线模式，跳过更新检查。");
            }
            isOnTop = await getCurrentWindow().isAlwaysOnTop();
            await checkAllConnections();
        } catch (err) {
            console.error("检查更新失败:", err);
        }
    });

    async function checkAllConnections() {
        if (checkingConnectionStatus) return;
        checkingConnectionStatus = true;
        // 立即更新状态
        connectionStatus = "连接中";

        try {
            connectionStatus = await detectTTSServer();
            syncTTSConnection.set(
                connectionStatus.sendPort || connectionStatus.success,
            );
        } catch (error) {
            connectionStatus.success = false;
            syncTTSConnection.set(false);
        } finally {
            checkingConnectionStatus = false;
        }
    }
</script>

<!-- ======= 标题栏 ======= -->
<div class="titlebar" role="toolbar" aria-label="窗口控制栏">
    <div class="left">
        <div class="app-title">符文档案</div>
    </div>

    <div class="win-controls">
        <button
            class="ctrl"
            id="btn-min"
            title="置顶"
            type="button"
            on:click={toggleOntop}
            aria-label="置顶"
        >
            {#if isOnTop}
                <i class="fa-solid fa-thumbtack"></i>
            {:else}
                <i class="fa-solid fa-thumbtack-slash"></i>
            {/if}
        </button>

        <button
            class="ctrl min"
            id="btn-min"
            title="最小化"
            type="button"
            on:click={minimizeWindow}
            aria-label="最小化窗口"
        >
            <i class="fa-solid fa-minus"></i>
        </button>

        <button
            class="ctrl fullscreen"
            id="btn-fullscreen"
            title="切换全屏"
            type="button"
            on:click={toggleFullscreen}
            aria-label="切换全屏"
        >
            <i class="fa-regular fa-square-full"></i>
        </button>

        <button
            class="ctrl close"
            id="btn-close"
            title="关闭"
            type="button"
            on:click={closeWindow}
            aria-label="关闭窗口"
        >
            <i class="fa-solid fa-xmark"></i>
        </button>
    </div>
</div>

<!-- ======= 主界面内容 ======= -->
<div class="app">
    <BottomToast {message} />
    <Loading show={loading} imgSrc="/favicon.png" message="请稍候..." />
    <Popup
        bind:show={showSyncDialog}
        title="提示"
        message="是否要更新数据？"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        closeOnBackground={false}
    />

    {#if current !== "/deckBuilder"}
        <!-- Sidebar -->
        <nav class="sidebar">
            <button
                class="nav-btn"
                class:selected={current === "/"}
                on:click={() => goto("/")}
                type="button"
                title="首页"
            >
               <span>首页</span>
            </button>

            <button
                class="nav-btn"
                class:selected={current.startsWith("/list")}
                on:click={() => goto("/list")}
                type="button"
                title="卡牌库"
            >
                <span>卡牌图鉴</span>
            </button>

            <button
                class="nav-btn"
                class:selected={current.startsWith("/deck")}
                on:click={() => goto("/deck")}
                type="button"
                title="卡组构筑"
            >
                <span>卡组构筑</span>
            </button>

            <div class="bottom-btn-group">
                <button
                    class="connection-btn"
                    type="button"
                    class:isConnected={connectionStatus.success ||
                        connectionStatus.sendPort}
                    on:click={checkAllConnections}
                    title="点击刷新"
                >
                    {#if checkingConnectionStatus}
                        <span style="color: var(--text);">
                            <i class="fa-solid fa-spinner"></i>
                        </span>
                    {:else}
                        <span class="circle-color">
                            <i class="fa-solid fa-circle"></i>
                        </span>
                    {/if}

                    {#if checkingConnectionStatus}
                        <span style="color: var(--text);">TTS: 检查中</span>
                    {:else}
                        <span
                            >TTS: {connectionStatus.success ||
                            connectionStatus.sendPort
                                ? "已连接"
                                : "未连接"}</span
                        >
                    {/if}
                    <div
                        class="connection-popup"
                        on:click|stopPropagation
                        role="presentation"
                    >
                        <div>
                            <span>发送端：</span>
                            <span>
                                {#if connectionStatus.sendPort}
                                    <i class="fa-solid fa-check"></i>
                                {:else}
                                    <i class="fa-solid fa-xmark"></i>
                                {/if}
                            </span>
                        </div>
                        <div>
                            <span>接受端：</span>
                            <span>
                                {#if connectionStatus.receivePort}
                                    <i class="fa-solid fa-check"></i>
                                {:else}
                                    <i class="fa-solid fa-xmark"></i>
                                {/if}
                            </span>
                        </div>
                    </div>
                </button>
            </div>
        </nav>
    {/if}

    <!-- Main content -->
    <main class="content">
        <slot />
    </main>
</div>

<!-- ======= 样式 ======= -->
<style>
    :root {
        --text: #0e1515;
        --secondary-text: #7f8c8d;
        --background: #ced8d5;
        --card-background: #e8ecec;
        --primary: #6da9a8;
        --secondary: #a3cdcc;
        --accent: #85c1c0;
        --muted: #7f8c8d;

        --color-success: #28a745;
        --color-warning: #ffc107;
        --color-error: #dc3545;
        --color-info: #17a2b8;

        /* slider */
        --range-slider: hsl(80, 5%, 89%);

        --range-handle-inactive: hsl(180, 4.6%, 61.8%);
        --range-handle: hsl(179, 25.9%, 54.5%);
        --range-handle-focus: hsl(179, 32.6%, 63.9%);
        --range-handle-border: hsl(179, 25.9%, 54.5%);

        --range-range-inactive: hsl(180, 4.6%, 61.8%);
        --range-range: hsl(179, 32.6%, 63.9%);
        --range-range-hover: hsl(179, 25.9%, 54.5%);
        --range-range-limit: hsl(180, 6.9%, 74.3%);

        --range-float-inactive: hsl(180, 4.6%, 61.8%);
        --range-float: hsl(179, 32.6%, 63.9%);
        --range-float-text: hsl(0, 0%, 100%);

        --range-pip: hsl(210, 14.3%, 53.3%);
        --range-pip-text: hsl(210, 14.3%, 53.3%);
        --range-pip-active: hsl(180, 25.4%, 24.7%);
        --range-pip-active-text: hsl(180, 25.4%, 24.7%);
        --range-pip-hover: hsl(180, 25.4%, 24.7%);
        --range-pip-hover-text: hsl(180, 25.4%, 24.7%);
        --range-pip-in-range: hsl(180, 25.4%, 24.7%);
        --range-pip-in-range-text: hsl(180, 25.4%, 24.7%);
        --range-pip-out-of-limit: hsl(210.9, 25.6%, 74.7%);
        --range-pip-out-of-limit-text: hsl(210.9, 25.6%, 74.7%);
    }

    /* ===== titlebar ===== */
    .titlebar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        height: 32px;
        background-color: var(--background);
        box-sizing: border-box;
        border-bottom: 1px solid var(--secondary-text);
        color: var(--text);
        user-select: none;
        -webkit-app-region: drag;
    }

    .left {
        padding-left: 12px;
        font-weight: 600;
    }

    .app-title {
        font-size: 0.9em;
    }

    .win-controls {
        display: flex;
        align-items: center;
    }

    .ctrl {
        width: 40px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        -webkit-app-region: no-drag;
        transition: background 0.2s;
    }

    .ctrl:hover {
        color: var(--background);
    }

    .ctrl.close:hover {
        background-color: var(--color-error);
    }

    /* ===== layout ===== */
    .app {
        display: flex;
        height: calc(100vh - 32px); /* titlebar 高度 */
        overflow: hidden;
        background: var(--background);
        color: var(--text);
    }

    .sidebar {
        width: 100px;
        background: var(--background);
        border-right: 1px solid var(--secondary-text);
        box-shadow: 0 0 2px var(--secondary-text);
        display: flex;
        flex-direction: column;
        align-items: center;
        /* padding-top: 10px; */
    }

    button {
        all: unset;
        box-sizing: border-box;
        width: 100px;
        display: block;
        padding: 20px 0px;
        cursor: pointer;
        color: var(--text);
        transition:
            background 0.2s,
            color 0.2s;
        text-align: center;
    }

    button:hover {
        background: var(--primary);
        /* color: var(--card-background); */
    }

    button.selected {
        background: var(--primary);
        /* color: var(--card-background); */
    }

    button.nav-btn span {
        margin-left: 5px;
        font-size: medium;
        font-weight: 600;
    }

    .bottom-btn-group {
        margin-top: auto;
    }

    button.connection-btn {
        all: unset;
        cursor: pointer;
        font-size: 12px;
        padding: 10px 5px;
        width: 100%;
        box-sizing: border-box;
        position: relative;
        display: flex;
        justify-content: space-around;
        align-items: baseline;
    }

    button.connection-btn {
        color: var(--color-error);
        filter: drop-shadow(0 2px 2px #0000002d);
    }

    button.connection-btn.isConnected {
        color: var(--color-success) !important;
    }

    .connection-popup {
        position: absolute;
        width: 90px;
        height: 50px;
        display: none;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        margin-left: 5px;
        padding: 5px;
        box-sizing: border-box;
        background-color: var(--background);
        border: 0.3px solid var(--muted);
        left: 0;
        color: var(--text);
    }

    button.connection-btn:hover .connection-popup {
        display: flex;
        top: -40px;
    }

    .content {
        flex-grow: 1;
        overflow-y: auto;
        background-color: var(--card-background);
    }
</style>
