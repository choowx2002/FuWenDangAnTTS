<script>
    import { page } from "$app/state";
    import { loadDeck } from "$lib/db";
    import { onMount } from "svelte";
    $: deckId = page.url.searchParams.get("deckId");

    onMount(async () => {
        try {
            const deck = await loadDeck(deckId);
            console.log(deck);
        } catch (error) {
            console.log(error);
        }
    });
</script>

<p>当前卡组：{deckId}</p>

<style>
</style>
