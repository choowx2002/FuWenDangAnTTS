<script>
// @ts-nocheck

  import { fly, fade } from 'svelte/transition';
  export let messages = []; // [{ id, text, type }] type 可选: 'info'|'success'|'error'

  // 自动消失
  function removeMessage(id) {
    messages = messages.filter(m => m.id !== id);
  }
</script>

<div class="toast-container">
  {#each messages as msg (msg.id)}
    <div
      class="toast {msg.type}"
      in:fly="{{ y: 50, duration: 300 }}"
      out:fade="{{ duration: 300 }}"
      on:introend={() => {
        setTimeout(() => removeMessage(msg.id), 3000);
      }}
    >
      {msg.text}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    z-index: 9999;
    pointer-events: none; /* 不阻塞鼠标事件 */
  }

  .toast {
    color: var(--text);
    padding: 5px 8px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    pointer-events: all;
  }

  .toast.info { background: var(--color-info); }
  .toast.success { background: var(--color-success); }
  .toast.error { background: var(--color-error); }
</style>
