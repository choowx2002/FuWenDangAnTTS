<script>
// @ts-nocheck

  import { onMount } from "svelte";
  import { startTTSServer, sendToTTS } from "$lib/ttsClient.js";

  let logs = [];

  onMount(() => {
    startTTSServer((msg) => {
      logs.push("收到TTS回调: " + JSON.stringify(msg));
    });
  });

  async function spawnCard() {
    await sendToTTS({ cmd: "spawn_card" });
    logs.push("已请求生成卡牌");
  }
</script>

<main class="p-4">
  <button on:click={spawnCard}>生成卡牌</button>
  <div class="mt-4">
    {#each logs as l}
      <div>{l}</div>
    {/each}
  </div>
</main>
