<script>
    // @ts-nocheck

    import {
        selectedTTSColor,
        syncDataRefresh,
        syncTTSConnection,
    } from "$lib/stores";
    import { detectTTSServer } from "$lib/ttsClient";
    import { onMount } from "svelte";
    import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

    const COLORS = [
        { name: "Red", label: "红色玩家", color: "rgb(218,26,24)" },
        { name: "Blue", label: "蓝色玩家", color: "rgb(30,135,255)" },
        { name: "Purple", label: "紫色玩家", color: "rgb(160,32,240)" },
        { name: "Green", label: "绿色玩家", color: "rgb(49,179,43)" },
    ];

    let connectionStatus = {
        success: false,
        sendPort: false,
        receivePort: false,
    };
    let checkingConnectionStatus = false;

    const playerColors = {};

    onMount(() => {
        console.log("开始检查");
    });

    function openChildWindow(color) {
        const win = new WebviewWindow(color, {
            url: "/hand", // 前端路由或 HTML
            width: 600,
            height: 400,
            transparent: true, // 透明背景
            decorations: false, // 去掉 topbar / frame
            alwaysOnTop: false, // 可选，是否置顶
            resizable: true, // 是否可调尺寸
        });

        win.once("tauri://created", () => {
            console.log("子窗口已成功创建");
        });

        win.once("tauri://error", (e) => {
            console.error("创建子窗口失败：", e);
        });
    }

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
            setTimeout(() => {
                checkingConnectionStatus = false;
            }, 3000);
        }
    }
</script>

<div class="container-box">
    <div class="connection-box">
        <h3>
            连接状态: {#if checkingConnectionStatus}
                <span style="color: var(--text);">检查中</span>
                <i class="fa-solid fa-spinner"></i>
            {:else}
                <span>{connectionStatus.success ? "已连接" : "未连接"}</span>
            {/if}
        </h3>
        <button type="button" on:click={checkAllConnections}>刷新</button>
    </div>
    <fieldset class="hands">
        <legend>手牌</legend>
        <div>
            {#each COLORS as c}
                <button type="button" on:click={()=>openChildWindow(c.name)}>
                    <span style="color: {c.color};margin-right: 5px;">■</span
                    >{c.label}
                </button>
            {/each}
        </div>
    </fieldset>
</div>

<style>
    .container-box {
        padding: 1vh 1rem;
    }

    .connection-box {
        display: flex;
        column-gap: 10px;
        justify-content: space-between;
        align-items: center;
    }

    .hands div button:not(:last-child) {
        margin-right: 0.5rem;
        margin-bottom: 0.3rem;
    }
</style>
