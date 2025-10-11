<script>
    // @ts-nocheck

    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { getCurrentWindow } from "@tauri-apps/api/window";
    import { onMount } from "svelte";
    import { getDB, getVersion, upsertCards, upsertVersion } from "$lib/db";
    import { fetchCards, fetchVersion } from "$lib/supabaseClient.js";
    import { syncDataRefresh } from "$lib/stores";
    import { initSingletonMap, urlMap } from "$lib/resManager";
    import Popup from "../components/Popup.svelte";
    import Loading from "../components/Loading.svelte";
    import BottomToast from "../components/BottomToast.svelte";

    // 当前路径
    $: current = $page.url.pathname;
    let showSyncDialog = false;
    let loading = false;
    let messages = [];
    let updateVersion;

    let toastCounter = 0;

    const showToast = (text, type = "info") => {
        toastCounter += 1;
        messages = [...messages, { id: "ToastId-" + toastCounter, text, type }];
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

    onMount(async () => {
        try {
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

            await initSingletonMap();
        } catch (err) {
            console.error("检查更新失败:", err);
        }
    });
</script>

<!-- ======= 标题栏 ======= -->
<div class="titlebar" role="toolbar" aria-label="窗口控制栏">
    <div class="left">
        <div class="app-title">符文档案</div>
    </div>

    <div class="win-controls">
        <button
            class="ctrl min"
            id="btn-min"
            title="最小化"
            type="button"
            on:click={minimizeWindow}
            aria-label="最小化窗口"
        >
            <i class="fa-solid fa-window-minimize"></i>
        </button>

        <button
            class="ctrl fullscreen"
            id="btn-fullscreen"
            title="切换全屏"
            type="button"
            on:click={toggleFullscreen}
            aria-label="切换全屏"
        >
            <i class="fa-regular fa-window-maximize"></i>
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
    <BottomToast {messages} />
    <Loading show={loading} imgSrc="/favicon.png" message="请稍候..." />
    <Popup
        bind:show={showSyncDialog}
        title="提示"
        message="是否要更新数据？"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        closeOnBackground={false}
    />
    <!-- Sidebar -->
    <nav class="sidebar">
        <button
            class="nav-btn"
            class:selected={current === "/"}
            on:click={() => goto("/")}
            type="button"
            title="home"
        >
            <i class="fa-solid fa-home fa-lg"></i><span>Home</span>
        </button>

        <button
            class="nav-btn"
            class:selected={current.startsWith("/list")}
            on:click={() => goto("/list")}
            type="button"
            title="cards"
        >
            <i class="fa-solid fa-image fa-lg"></i><span>Cards</span>
        </button>

        <button
            class="nav-btn"
            class:selected={current.startsWith("/deck")}
            on:click={() => goto("/deck")}
            type="button"
            title="gallery"
        >
            <i class="fa-solid fa-folder fa-lg"></i><span>Decks</span>
        </button>
    </nav>

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
        --background: #f6f9f9;
        --card-background: #ffffff;
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
        /* border-right: 1px solid var(--secondary-text); */
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
        color: var(--background);
    }

    button.selected {
        background: var(--primary);
        color: var(--background);
    }

    button.nav-btn span {
        margin-left: 5px;
        font-size: medium;
        font-weight: 600;
    }

    .content {
        flex-grow: 1;
        overflow-y: auto;
        background-color: var(--card-background);
    }
</style>
