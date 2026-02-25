import { resolveResource, appDataDir, join } from "@tauri-apps/api/path";
import {
  exists,
  readFile,
  writeFile,
  mkdir,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";

const CARD_IMAGE = "cardImages";

const cache = new Map();

export async function loadExternalImage(fileName, folder = "card_img") {
  if (cache.has(fileName)) return cache.get(fileName);

  try {
    const paths = await resolveResource(
      `resources/external/${folder}/${fileName}`,
    );
    const data = await readFile(paths);
    const bytes = await readFile(paths);
    const blob = new Blob([bytes]);
    const url = URL.createObjectURL(blob);
    cache.set(fileName, url);
    return url;
  } catch (err) {
    // console.warn("加载图片失败:", fileName, err);
    return "";
  }
}

function safeSegment(str) {
  return str.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

function urlToFilename(dataUrl, name = "undefined") {
  const id =
    dataUrl.replace(/\/$/, "").split("/").pop()?.split(".")[0] || "file";

  const filename = `${name}-${id}`;
  return safeSegment(filename);
}

async function safeRead(path) {
  try {
    return await readFile(path, {
      baseDir: BaseDirectory.AppLocalData,
    });
  } catch {
    return null;
  }
}

const saveImageToAppFolder = async (dataUrl, filename) => {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const imagesDir = CARD_IMAGE;

    const tokenExists = await exists(imagesDir, {
      baseDir: BaseDirectory.AppLocalData,
    });

    if (!tokenExists) {
      await mkdir(imagesDir, { baseDir: BaseDirectory.AppLocalData });
    }

    await writeFile(`${imagesDir}/${filename}`, new Uint8Array(arrayBuffer), {
      baseDir: BaseDirectory.AppLocalData,
    });

    console.log(`Image saved successfully to: ${imagesDir}/${filename}`);
  } catch (error) {
    console.error("Error saving image:", error);
  }
};

export const loadImageFromAppFolder = async (url, name) => {
  if (!url) return null;

  const filename = urlToFilename(url, name);
  const targetPath = await join(CARD_IMAGE, filename);

  let bytes = await safeRead(targetPath);

  if (!bytes) {
    await saveImageToAppFolder(url, filename);
    bytes = await safeRead(targetPath);
    if (!bytes) return null;
  }

  const blob = new Blob([bytes], { type: "image/*" });
  return URL.createObjectURL(blob);
};
