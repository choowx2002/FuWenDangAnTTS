<script>
  // @ts-nocheck
  import { getSettings, getTableState } from "$lib/db";
  import { CARD_IMAGE } from "$lib/fs";
  import { appLocalDataDir, join } from "@tauri-apps/api/path";
  import { writeText } from "@tauri-apps/plugin-clipboard-manager";
  import { revealItemInDir } from "@tauri-apps/plugin-opener";
  import { onMount } from "svelte";
  import BottomToast from "../../components/BottomToast.svelte";

  let resourceRegions = [];
  let selectedRegion;
  let resPath;

  let localDB = {
    cards: {
      label: "卡牌数据",
      size: 0,
      tableName: ["cards"],
    },
    decks: {
      label: "构筑数据",
      size: 0,
      tableName: ["decks", "deck_cards"],
    },
    versions: {
      label: "版本数据",
      size: 0,
      tableName: ["versions"],
    },
  };

  onMount(async () => {
    try {
      let tempPath = await appLocalDataDir();
      resPath = await join(tempPath, CARD_IMAGE);
      const tableStats = await getTableState([
        "cards",
        "decks",
        "deck_cards",
        "versions",
      ]);

      const tableSizeMap = Object.fromEntries(
        tableStats.map(({ name, bytes }) => [name, bytes]),
      );

      localDB = Object.fromEntries(
        Object.entries(localDB).map(([key, cfg]) => [
          key,
          {
            ...cfg,
            size: cfg.tableName.reduce(
              (sum, table) => sum + (tableSizeMap[table] ?? 0),
              0,
            ),
          },
        ]),
      );

      console.log(localDB);

      const settings = await getSettings();
      settings.forEach(({ name, value, options }) => {
        switch (name) {
          case "region":
            resourceRegions = options.split(",");
            selectedRegion = value;
            break;
          default:
            break;
        }
      });
    } catch (error) {
      console.log(error);
    }
  });

  let message = null;

  const copyPath = () => {
    writeText(resPath).then(() => {
      message = "复制成功";
    });
  };

  const formatBytes = (bytes, fraction = 2) => {
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let size = bytes;

    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }

    return `${size.toFixed(fraction)} ${units[i]}`;
  };
</script>

<div class="setting-container">
  <BottomToast {message} />
  <div class="setting-row">
    <h3>资源来源 :</h3>

    <div>
      {#each resourceRegions as res}
        <label for="res-default">
          <input
            type="radio"
            id={`res-${res}`}
            name="resource"
            value={res}
            checked={res === selectedRegion}
          />
          {res}
        </label>
      {/each}
    </div>
  </div>

  <div class="setting-row">
    <h3>资源目录 :</h3>

    <div>
      <p style="cursor: copy;" on:click={copyPath()} role="presentation">
        {resPath || ""}
      </p>
    </div>
  </div>

  <div class="setting-row local-data-container">
    <h3>本地数据库 :</h3>
    <div style="display: flex; flex-direction: column">
      <table style="width: 60vw;max-width: 500px; min-width: 200px"> 
        <tbody>
          <tr>
            <th>名称</th>
            <th>大小</th>
            <th>操作</th>
          </tr> 
          {#each Object.keys(localDB) as tableName}
            <tr>
              <td>{localDB[tableName].label}</td>
              <td>{formatBytes(localDB[tableName].size)} </td>
              <td><button style="color: red; font-weight:800">移除</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
      <button style="color: red; font-weight:800;">移除所有数据</button>
    </div>
  </div>
</div>

<style>
  .setting-container {
    padding: 12px 16px;
  }

  .setting-row {
    display: flex;
    column-gap: 20px;
    align-items: center;

    & > h3 {
      margin: 0;
      margin-block: 12px;
    }
  }

  .local-data-container {
    align-items: flex-start;
    margin-block: 12px;

    & > h3 {
      margin: 0;
    }
  }
</style>
