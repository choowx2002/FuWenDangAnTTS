import { writable } from 'svelte/store';

// 用于通知 Home 刷新
export const syncDataRefresh = writable(null);

export const syncTTSConnection = writable(false);

export const selectedTTSColor = writable("Black");