<script>
    // @ts-nocheck
    import { onMount } from "svelte";

    let src = "";
    let back = ""; // --- 新增：背面图片 ---
    let scale = 0.8;
    let translateX = 0;
    let translateY = -30;
    let isDragging = false;
    let startX, startY;

    // 3D 旋转与翻转状态
    let rotateX = 0;
    let rotateY = 0;
    let isFlipped = false; // --- 新增：是否已翻转 ---
    const maxTilt = 20;

    onMount(() => {
        const params = new URLSearchParams(window.location.href.split("?")[1]);
        console.log(window.location.href.split("?")[1]);
        src = decodeURIComponent(params.get("src"));
        // --- 获取背面图片 ---
        const backParam = params.get("back");
        back = backParam ? decodeURIComponent(backParam) : "";

        // 监听按键
        const handleKeyDown = (e) => {
            console.log(e, back, backParam);
            if (e.key.toLowerCase() === "f" && back) {
                isFlipped = !isFlipped;
            }
        };

        const handleContextMenu = (e) => e.preventDefault();

        window.addEventListener("keydown", handleKeyDown);
        document.addEventListener("contextmenu", handleContextMenu);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("contextmenu", handleContextMenu);
        };
    });

    function flip() {
        isFlipped = !isFlipped;
    }

    function handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        scale = Math.min(Math.max(0.5, scale + delta), 5);
    }

    function handleMouseDown(e) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
    }

    function handleMouseMove(e) {
        if (isDragging) {
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            rotateX = 0;
            rotateY = 0;
        } else {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const mouseX = (e.clientX - centerX) / centerX;
            const mouseY = (e.clientY - centerY) / centerY;

            // 如果翻转了，倾斜方向也要相应调整，否则视觉会反
            const flipFactor = isFlipped ? -1 : 1;
            rotateY = mouseX * maxTilt * flipFactor;
            rotateX = mouseY * -maxTilt;
        }
    }

    function handleMouseUp() {
        isDragging = false;
    }

    function reset() {
        scale = 0.8;
        translateX = 0;
        translateY = -30;
        rotateX = 0;
        rotateY = 0;
        isFlipped = false;
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="viewer-container"
    on:wheel={handleWheel}
    on:mousedown={handleMouseDown}
    on:mousemove={handleMouseMove}
    on:mouseup={handleMouseUp}
    on:mouseleave={() => {
        isDragging = false;
        rotateX = 0;
        rotateY = 0;
    }}
>
    <div class="toolbar">
        <div>
            <span>缩放: {Math.round(scale * 100)}%</span>
            <button on:click={reset}>重置</button>
        </div>
        <div>
            <p>滚轮缩放，左键拖拽，<b>按 <button on:click={flip}>F</button> 翻转卡牌</b></p>
        </div>
    </div>

    <div
        class="img-wrapper"
        style="transform: translate3d({translateX}px, {translateY}px, 0) scale({scale}) rotateX({rotateX}deg) rotateY({rotateY}deg);"
    >
        <div class="card-inner" class:is-flipped={isFlipped}>
            <div class="card-face card-front">
                <img {src} alt="Front" draggable="false" loading="eager" />
            </div>

            {#if back}
                <div class="card-face card-back">
                    <img src={back} alt="Back" draggable="false" loading="eager" />
                </div>
            {/if}
        </div>
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
        perspective: 1500px; /* 增加透视感 */
        overflow: hidden;
    }

    .img-wrapper {
        transform-style: preserve-3d;
        transition: transform 0.1s ease-out;
        will-change: transform;
    }

    /* --- 翻转核心容器 --- */
    .card-inner {
        position: relative;
        width: auto;
        height: auto;
        transform-style: preserve-3d;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); /* 翻转动画平滑点 */
    }

    .card-inner.is-flipped {
        transform: rotateY(180deg);
    }

    .card-face {
        backface-visibility: hidden; /* 关键：背向用户时隐藏 */
        -webkit-backface-visibility: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .card-back {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        transform: rotateY(180deg); /* 背面图片默认先转180度 */
    }

    img {
        max-width: 90vw;
        max-height: 90vh;
        user-select: none;
        filter: drop-shadow(0 20px 50px rgba(0, 0, 0, 0.8));
        image-rendering: high-quality;
        border-radius: 12px;
    }

    .toolbar {
        display: flex;
        margin: 0 auto;
        justify-content: space-between;
        position: fixed;
        bottom: 50px;
        left: 10px;
        right: 10px;
        z-index: 100;
        max-width: 600px;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        opacity: 0.3;
        transition: opacity 0.3s;
    }
    .toolbar:hover {
        opacity: 1;
    }

    .toolbar button {
        all: unset;
        font-size: 12px;
        color: black;
        background-color: whitesmoke;
        padding: 1px 4px;
        cursor: pointer;
        margin-left: 4px;
    }
    .toolbar p {
        font-size: 10px;
        margin: 4px 0 0 0;
    }
</style>
