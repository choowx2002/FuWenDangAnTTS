<script>
    export let show = false; // 控制显示/隐藏
    export let title = "提示"; // 弹窗标题
    export let message = ""; // 弹窗内容
    export let confirmText = "确定";
    export let cancelText = "取消";
    export let onConfirm = () => {};
    export let onCancel = () => {};

    // 点击背景关闭（可选）
    export let closeOnBackground = true;

    // @ts-ignore
    function handleBackgroundClick(e) {
        if (e.target.classList.contains("popup-overlay") && closeOnBackground) {
            onCancel();
        }
    }
</script>

{#if show}
    <div
        class="popup-overlay"
        role="dialog"
        tabindex="0"
        on:click={handleBackgroundClick}
        on:keydown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && closeOnBackground) {
                onCancel();
            }
        }}
    >
        <div class="popup-content">
            <h3>{title}</h3>
            {#if message}<p>{message}</p>{/if}
            <slot />
            <div class="popup-actions">
                <button class="cancel-button" on:click={onCancel}
                    >{cancelText}</button
                >
                <button class="confirm-button" on:click={onConfirm}
                    >{confirmText}</button
                >
            </div>
        </div>
    </div>
{/if}

<style>
    .popup-overlay {
        position: fixed;
        top: 32px;
        left: 0;
        width: 100%;
        height: calc(100% - 32px);
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.4);
        z-index: 9999;
        animation: fadeIn 0.15s ease-out;
        box-sizing: border-box;
    }

    .popup-content {
        background: var(--background, #fff);
        padding: 20px;
        border-radius: 10px;
        width: 300px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: scaleIn 0.2s ease-out;
    }

    .popup-actions {
        margin-top: 20px;
        display: flex;
        justify-content: space-around;
    }

    button {
        padding: 6px 12px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
    }

    .cancel-button {
        background: #ccc;
        color: #333;
    }

    .cancel-button:hover {
        background: #bbb;
    }

    .confirm-button {
        background: var(--primary, #6da9a8);
        color: white;
    }

    .confirm-button:hover {
        background: var(--accent, #85c1c0);
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes scaleIn {
        from {
            transform: scale(0.9);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }
</style>
