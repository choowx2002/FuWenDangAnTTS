import { loadExternalImage } from "./fs";

const resMap = new Map([
    // app icon
    ["logo", { label: "logo", imgPath: "app_icon.png" }],

    // color
    ["red", { label: "红色", imgPath: "Fury.png" }],
    ["green", { label: "绿色", imgPath: "Calm.png" }],
    ["blue", { label: "蓝色", imgPath: "Mental.png" }],
    ["orange", { label: "橙色", imgPath: "Physical.png" }],
    ["purple", { label: "紫色", imgPath: "Chaos.png" }],
    ["yellow", { label: "黄色", imgPath: "Order.png" }],
    ["colorless", { label: "无色", imgPath: "" }],

    // rarity
    ["普通", { label: "普通", imgPath: "Common.png" }],
    ["不凡", { label: "不凡", imgPath: "Uncommon.png" }],
    ["稀有", { label: "稀有", imgPath: "Rare.png" }],
    ["史诗", { label: "史诗", imgPath: "Epic.png" }],
    ["异画", { label: "异画", imgPath: "OverNumbered.png" }],

    // energy
    ["0", { label: "0", imgPath: "0.png" }],
    ["1", { label: "1", imgPath: "1.png" }],
    ["2", { label: "2", imgPath: "2.png" }],
    ["3", { label: "3", imgPath: "3.png" }],
    ["4", { label: "4", imgPath: "4.png" }],
    ["5", { label: "5", imgPath: "5.png" }],
    ["6", { label: "6", imgPath: "6.png" }],

    // power
    ["红色", { label: "红色", imgPath: "red.png" }],
    ["绿色", { label: "绿色", imgPath: "green.png" }],
    ["蓝色", { label: "蓝色", imgPath: "blue.png" }],
    ["橙色", { label: "橙色", imgPath: "orange.png" }],
    ["紫色", { label: "紫色", imgPath: "purple.png" }],
    ["黄色", { label: "黄色", imgPath: "yellow.png" }],
    ["A", { label: "符能", imgPath: "A.png" }],

    // action
    ["横置", { label: "横置", imgPath: "tap.png" }],

    // might
    ["S", { label: "战力", imgPath: "S.png" }],

    // keyword
    ["反应", { label: "反应", imgPath: "reaction.png" }],
    ["迅捷", { label: "迅捷", imgPath: "action.png" }],

    ["待命", { label: "待命", imgPath: "hidden.png" }],
    ["急速", { label: "急速", imgPath: "accelerate.png" }],
    ["游走", { label: "游走", imgPath: "ganking.png" }],
    ["预知", { label: "预知", imgPath: "vision.png" }],
    ["鼓舞", { label: "鼓舞", imgPath: "legion.png" }],
    ["壁垒", { label: "壁垒", imgPath: "tank.png" }],
    ["强力", { label: "强力", imgPath: "mighty.png" }],
    ["瞬息", { label: "瞬息", imgPath: "temporary.png" }],
    ["获得", { label: "获得", imgPath: "add.png" }],
    ["绝念", { label: "绝念", imgPath: "deathknell.png" }],
    ["百炼", { label: "百炼", imgPath: "equip.png" }],
    ["装配", { label: "装配", imgPath: "weaponmaster.png" }],
    ["灵便", { label: "灵便", imgPath: "quick-draw.png" }],

    ["坚守", { label: "坚守", imgPath: "shield.png" }],
    ["坚守2", { label: "坚守2", imgPath: "shield2.png" }],
    ["坚守3", { label: "坚守3", imgPath: "shield3.png" }],
    ["坚守5", { label: "坚守5", imgPath: "shield5.png" }],

    ["强攻", { label: "强攻", imgPath: "assault.png" }],
    ["强攻2", { label: "强攻2", imgPath: "assault2.png" }],
    ["强攻3", { label: "强攻3", imgPath: "assault3.png" }],

    ["法盾", { label: "法盾", imgPath: "deflect.png" }],
    ["法盾2", { label: "法盾2", imgPath: "deflect2.png" }],

    // 回响系列
    ["回响", { label: "回响", imgPath: "repeat.png" }],
    ["回响1", { label: "回响1", imgPath: "repeat_1.png" }],
    ["回响2", { label: "回响2", imgPath: "repeat_2.png" }],
    ["回响3", { label: "回响3", imgPath: "repeat_3.png" }],
    ["回响1蓝色", { label: "回响1蓝色", imgPath: "repeat_1_blue.png" }],
    ["回响2红色", { label: "回响2红色", imgPath: "repeat_2_red.png" }],
    ["回响4蓝色", { label: "回响4蓝色", imgPath: "repeat_4_blue.png" }],

    ["装配1蓝色", { label: "装配1蓝色", imgPath: "equip_1_blue.png" }],
    ["装配1绿色", { label: "装配1绿色", imgPath: "equip_1_green.png" }],
    ["装配1橙色", { label: "装配1橙色", imgPath: "equip_1_orange.png" }],

    ["装配红色", { label: "装配红色", imgPath: "equip_red.png" }],
    ["装配蓝色", { label: "装配蓝色", imgPath: "equip_blue.png" }],
    ["装配绿色", { label: "装配绿色", imgPath: "equip_green.png" }],
    ["装配黄色", { label: "装配黄色", imgPath: "equip_yellow.png" }],
    ["装配橙色", { label: "装配橙色", imgPath: "equip_orange.png" }],
    ["装配紫色", { label: "装配紫色", imgPath: "equip_purple.png" }],
]);

export const urlMap = new Map();

export const initSingletonMap = async () => {
    const entries = Array.from(resMap.entries());

    const loadPromises = entries.map(async ([key, value]) => {
        if (!value.imgPath) {
            return { key, data: { label: value.label, url: "" } };
        }

        try {
            const url = await loadExternalImage(value.imgPath, "icons");
            return { key, data: { label: value.label, url } };
        } catch (error) {
            console.error(`Failed to load image ${value.imgPath}:`, error);
            return { key, data: { label: value.label, url: "" } };
        }
    });

    const results = await Promise.all(loadPromises);

    // Populate the urlMap with results
    results.forEach(({ key, data }) => {
        urlMap.set(key, data);
    });

    return urlMap;
};