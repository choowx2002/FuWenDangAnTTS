<script>
	import Popup from "../../components/Popup.svelte";
	let showDialog = false;

	function handleConfirm() {
		console.log("用户确认更新");
		showDialog = false;
	}

	function handleCancel() {
		console.log("用户取消");
		showDialog = false;
	}
</script>

<button on:click={() => showDialog = true}>打开更新提示</button>

<Popup
	bind:show={showDialog}
	title="提示"
	message="是否要更新数据？"
	onConfirm={handleConfirm}
	onCancel={handleCancel}
	closeOnBackground={false}
/>
