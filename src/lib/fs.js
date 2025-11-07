import { readFile } from "@tauri-apps/plugin-fs";
import { resolveResource } from "@tauri-apps/api/path";

const cache = new Map();

export async function loadExternalImage(fileName, folder = "card_img") {
  if (cache.has(fileName)) return cache.get(fileName);

  try {
    const paths = await resolveResource(`resources/external/${folder}/${fileName}`);
    const data = await readFile(paths);
    const bytes = await readFile(paths);
    const blob = new Blob([bytes]);
    const url = URL.createObjectURL(blob);
    cache.set(fileName, url);
    return url;
  } catch (err) {
    console.warn("加载图片失败:", fileName, err);
    return "";
  }
}
