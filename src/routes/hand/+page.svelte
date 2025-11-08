<script>
    import { getCurrentWebview } from "@tauri-apps/api/webview";

    async function closeWindow() {
        const webview = await getCurrentWebview();
        await webview.close();
    }

    const currentWindow = getCurrentWebview();
    $: label = currentWindow.label;
</script>

<div role="presentation" on:click={closeWindow}>{label} hand</div>
