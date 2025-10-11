<script>
  export let show = false;          // 控制显示/隐藏
  export let message = "加载中...";  // 提示文字
  export let imgSrc = "";           // 加载图片路径
</script>

{#if show}
<div class="loading-overlay">
  <div class="loading-content">
    {#if imgSrc}
      <img src={imgSrc} alt="loading" class="loading-img" />
    {/if}
    <p>{message}</p>
  </div>
</div>
{/if}

<style>
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.2s ease-out;
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--background, #fff);
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  .loading-img {
    width: 60px;
    height: 60px;
    margin-bottom: 10px;
    /* animation: spin 1s linear infinite; */
  }

  p {
    margin: 0;
    color: var(--text-color, #333);
    font-weight: 500;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
