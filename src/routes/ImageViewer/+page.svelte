<script>
    // @ts-nocheck
    import { onMount } from "svelte";

    let src = "";
    let scale = 0.8;
    let translateX = 0;
    let translateY = -30;
    let isDragging = false;
    let startX, startY;

    onMount(() => {
        // 从 URL 获取图片路径
        const params = new URLSearchParams(window.location.href.split("?")[1]);
        src = decodeURIComponent(params.get("src"));
    });

    // 处理滚轮缩放
    function handleWheel(e) {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        scale = Math.min(Math.max(0.5, scale + delta), 5); // 限制缩放倍数 0.5 - 5倍
    }

    // 处理拖拽逻辑
    function handleMouseDown(e) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
    }

    function handleMouseMove(e) {
        if (!isDragging) return;

        translateX = e.clientX - startX;

        translateY = e.clientY - startY;
    }

    function handleMouseUp() {
        isDragging = false;
    }

    function reset() {
        scale = 0.8;
        translateX = 0;
        translateY = -30;
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="viewer-container"
    on:wheel={handleWheel}
    on:mousedown={handleMouseDown}
    on:mousemove={handleMouseMove}
    on:mouseup={handleMouseUp}
    on:mouseleave={handleMouseUp}
>
    <div class="toolbar">
        <div>
            <span>缩放: {Math.round(scale * 100)}%</span>
            <button on:click={reset}>重置</button>
        </div>

        <p>滚轮缩放，左键拖拽</p>
    </div>

    <div
        class="img-wrapper"
        style="transform: translate({translateX}px, {translateY}px) scale({scale})"
    >
        <img {src} alt="Loading..." draggable="false" />
    </div>
</div>

<style>
    :global(body, html) {
        margin: 0;
        padding: 0;
        overflow: hidden;
        background-color: #1a1a1a;
    }

    :global(.content) {
        overflow: hidden !important;
    }

    .viewer-container {
        width: 100vw;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        overflow: hidden;
    }
    .viewer-container:active {
        cursor: grabbing;
    }
    .toolbar {
        display: flex;
        justify-content: space-between;
        position: fixed;
        bottom: 10px;
        left: 10px;
        right: 10px;
        z-index: 100;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        pointer-events: auto;
        opacity: 0.3;
        transition: opacity 0.3s ease-in;
        transition-delay: 3s;
    }

    .toolbar:hover {
        opacity: 1;
        transition-delay: 0s;
    }

    .toolbar span {
        font-size: 14px;
    }

    .toolbar button {
        all: unset;
        font-size: 12px;
        color: black;
        background-color: whitesmoke;
        padding: 1px 4px;
        margin-left: 4px;
    }

    .toolbar p {
        font-size: 10px;
        margin: 4px 0 0 0;
        opacity: 0.7;
    }

    .img-wrapper {
        transition: transform 0.05s linear;
        will-change: transform;
    }
    img {
        max-width: 90vw;
        max-height: 90vh;
        user-select: none;
        filter: drop-shadow( 0 0 30px rgba(0, 0, 0, 0.5));
    }
</style>
