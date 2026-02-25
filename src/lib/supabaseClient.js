// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nibzqrneyjrvvzffschp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pYnpxcm5leWpydnZ6ZmZzY2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NDQyNzMsImV4cCI6MjA2NjMyMDI3M30.bAGzdYqa1eyvQzSRTxtvzNQVfag44rqybs0JN7RHEjg'

// 创建客户端实例
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * 获取版本信息（支持按 name 或获取最新一条）
 * @param {string} [name] 可选，版本名称
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function fetchVersion(name) {
    try {
        if (!supabase) {
            throw new Error("Supabase client not initialized");
        }

        let query = supabase.from("version").select("*");

        if (name) {
            query = query.eq("name", name).maybeSingle();
        } else {
            query = query.order("updated_at", { ascending: false }).limit(1).maybeSingle();
        }

        const { data, error } = await query;

        if (error) {
            console.error("Supabase 查询错误:", error.message);
            return { success: false, error: error.message };
        }

        if (!data) {
            return { success: false, error: "未找到数据" };
        }

        return { success: true, data };

    } catch (err) {
        console.error("fetchVersion 异常:", err);
        return { success: false, error: err.message || "未知错误" };
    }
}

/**
 * 查询指定表（例如 cards）
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function fetchCards() {
  try {
    if (!supabase) throw new Error('Supabase client not initialized');

    let query = supabase.from('cards').select(`
      card_no,
      card_category,
      card_category_name,
      card_name,
      sub_title,
      card_color_list,
      card_qa_list,
      region,
      tag,
      artist,
      card_effect,
      flavor_text,
      energy,
      return_energy,
      power,
      rarity,
      rarity_name,
      extend_rarity,
      extend_rarity_name,
      back_image,
      champion_tag,
      keywords,
      series_name,
      front_image_en,
      card_name_en,
      effect_en
    `);

    const { data, error } = await query;

    if (error) {
      console.error('Supabase 查询错误:', error.message);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: '未找到数据' };
    }

    return { success: true, data };

  } catch (err) {
    console.error('fetchTable 异常:', err);
    return { success: false, error: err.message || '未知错误' };
  }
}

