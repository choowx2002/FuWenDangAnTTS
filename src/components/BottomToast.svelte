<script>
    // @ts-nocheck
    import { fly, fade } from "svelte/transition";
    export let message = null; // { id, text, type }

    let timer;

    // 显示新消息时自动计时消失
    $: if (message) {
        clearTimeout(timer);
        timer = setTimeout(() => (message = null), 3000);
    }
</script>

{#if message}
    <div
        class="toast-container"
        in:fly={{ y: 50, duration: 300 }}
        out:fade={{ duration: 300 }}
    >
        <div class="toast {message.type}">
            {message.text}
        </div>
    </div>
{/if}

<style>
    .toast-container {
        position: fixed;
        bottom: 4px;
        left: 4px;
        display: flex;
        justify-content: left;
        z-index: 9999;
        pointer-events: none;
    }

    .toast {
        color: var(--text);
        padding: 5px 10px;
        border-bottom-left-radius: 6px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        pointer-events: all;
        background: var(--color-info);
    }

    .toast.info {
        background: var(--color-info);
    }
    .toast.success {
        background: var(--color-success);
    }
    .toast.error {
        color: var(--card-background);
        background: var(--color-error);
    }
</style>
