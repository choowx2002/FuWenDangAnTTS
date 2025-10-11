import Database from '@tauri-apps/plugin-sql';

/**
 * @type {Database}
 */
let db;

/** 初始化数据库（自动创建） */
export async function getDB() {
  if (!db) {

    db = await Database.load('sqlite:local.db');
    await db.execute(`PRAGMA journal_mode = WAL;`);
    await db.execute(`PRAGMA synchronous = NORMAL;`);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL  UNIQUE,
        updated_at TEXT NOT NULL
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_no TEXT NOT NULL UNIQUE,
        card_category TEXT,
        card_category_name TEXT,
        card_name TEXT,
        sub_title TEXT,
        card_color_list TEXT,
        card_qa_list TEXT,
        region TEXT,
        tag TEXT,
        artist TEXT,
        card_effect TEXT,
        flavor_text TEXT,
        energy INTEGER DEFAULT 0,
        return_energy INTEGER DEFAULT 0,
        power INTEGER DEFAULT 0,
        rarity TEXT,
        rarity_name TEXT,
        extend_rarity TEXT,
        extend_rarity_name TEXT,
        back_image TEXT,
        champion_tag TEXT,
        keywords TEXT,
        series_name TEXT DEFAULT '',
        front_image_en TEXT
      );
    `);
  }

  return db;
}

const safeTrim = (value) => {
  return typeof value === "string" ? value.trim() : (value ?? "");
}


export async function getVersion(name) {
  const rows = await db.select(
    "SELECT updated_at FROM versions WHERE name = ?1 LIMIT 1",
    [name]
  );

  if (rows.length === 0) return null;

  return rows[0].updated_at;
}

export async function upsertVersion(name, updated_at) {
  await db.execute(
    `
    INSERT INTO versions (name, updated_at)
    VALUES (?1, ?2)
    ON CONFLICT(name) DO UPDATE SET
      updated_at = excluded.updated_at;
    `,
    [name, updated_at]
  );
}

export async function upsertCards(cards) {
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error("upsertCards: 参数必须是非空数组");
  }

  for (const card of cards) {
    try {
      // 序列化字段
      const cardColorList = JSON.stringify(card.card_color_list || []);
      const cardQaList = JSON.stringify(card.card_qa_list || {});
      const keywords = JSON.stringify(card.keywords || []);

      const sql = `
        INSERT INTO cards (
          card_no, card_category, card_category_name, card_name, sub_title,
          card_color_list, card_qa_list, region, tag, artist,
          card_effect, flavor_text, energy, return_energy, power,
          rarity, rarity_name, extend_rarity, extend_rarity_name,
          back_image, champion_tag, keywords, series_name, front_image_en
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?
        )
        ON CONFLICT(card_no) DO UPDATE SET
          card_category=excluded.card_category,
          card_category_name=excluded.card_category_name,
          card_name=excluded.card_name,
          sub_title=excluded.sub_title,
          card_color_list=excluded.card_color_list,
          card_qa_list=excluded.card_qa_list,
          region=excluded.region,
          tag=excluded.tag,
          artist=excluded.artist,
          card_effect=excluded.card_effect,
          flavor_text=excluded.flavor_text,
          energy=excluded.energy,
          return_energy=excluded.return_energy,
          power=excluded.power,
          rarity=excluded.rarity,
          rarity_name=excluded.rarity_name,
          extend_rarity=excluded.extend_rarity,
          extend_rarity_name=excluded.extend_rarity_name,
          back_image=excluded.back_image,
          champion_tag=excluded.champion_tag,
          keywords=excluded.keywords,
          series_name=excluded.series_name,
          front_image_en=excluded.front_image_en;
      `;

      // 每次写操作独立提交，避免数据库锁死
      await db.execute(sql, [
        safeTrim(card.card_no),
        safeTrim(card.card_category),
        safeTrim(card.card_category_name),
        safeTrim(card.card_name),
        safeTrim(card.sub_title),
        cardColorList,
        cardQaList,
        safeTrim(card.region),
        safeTrim(card.tag),
        safeTrim(card.artist),
        safeTrim(card.card_effect),
        safeTrim(card.flavor_text),
        safeTrim(card.energy),
        safeTrim(card.return_energy),
        safeTrim(card.power),
        safeTrim(card.rarity),
        safeTrim(card.rarity_name),
        safeTrim(card.extend_rarity),
        safeTrim(card.extend_rarity_name),
        safeTrim(card.back_image),
        safeTrim(card.champion_tag),
        keywords,
        safeTrim(card.series_name),
        safeTrim(card.front_image_en)
      ]);


    } catch (err) {
      console.error(`upsert ${card.card_no} failed:`, err);
    }
  }
}

export async function getCardsCount() {
  const db = await getDB();

  // 使用 SELECT COUNT(*) 查询
  const rows = await db.select("SELECT COUNT(*) as count FROM cards");

  // 返回 count
  return rows[0].count;
}

export async function getDistinctFilters() {
  const db = await getDB();

  // 普通字段
  const series = await db.select('SELECT DISTINCT series_name FROM cards');
  const type = await db.select('SELECT DISTINCT card_category_name FROM cards');
  const tag = await db.select('SELECT DISTINCT tag FROM cards');
  const region = await db.select('SELECT DISTINCT region FROM cards');

  // JSON 数组字段（keywords）
  const rows = await db.select('SELECT keywords FROM cards WHERE keywords IS NOT NULL');
  const keywordSet = new Set();

  rows.forEach(r => {
    try {
      const arr = JSON.parse(r.keywords);
      if (Array.isArray(arr)) {
        arr.forEach(k => keywordSet.add(k));
      }
    } catch (e) {
      console.warn('keywords 解析失败:', r.keywords, e);
    }
  });

  return {
    series: series.map(r => r.series_name).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    color: ["red", "green", "blue", "orange", "purple", "yellow", "colorless"],
    rarity: ["普通", "不凡", "稀有", "史诗", "异画"],
    type: type.map(r => r.card_category_name).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    tag: tag.map(r => r.tag).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    region: region.map(r => r.region).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    keyword: Array.from(keywordSet).sort((a, b) => a.localeCompare(b)),
  };
}

export async function getDiffLimits() {
  const db = await getDB();

  // 直接用明确的字段名
  const might = await db.select(`
    SELECT 
      MIN(power) AS lowest,
      MAX(power) AS highest
    FROM cards
  `);

  const energy = await db.select(`
    SELECT 
      MIN(energy) AS lowest,
      MAX(energy) AS highest
    FROM cards
  `);

  const power = await db.select(`
    SELECT 
      MIN(return_energy) AS lowest,
      MAX(return_energy) AS highest
    FROM cards
  `);

  // 提取结果（db.select 返回数组）
  const mightRange = might?.[0] || {};
  const energyRange = energy?.[0] || {};
  const powerRange = power?.[0] || {};

  // 默认回退值（确保即使数据库为空也安全）
  const mightLimit = [
    Number(mightRange.lowest ?? 0),
    Number(mightRange.highest ?? 15),
  ];

  const energyLimit = [
    Number(energyRange.lowest ?? 0),
    Number(energyRange.highest ?? 13),
  ];

  const powerLimit = [
    Number(powerRange.lowest ?? 0),
    Number(powerRange.highest ?? 4),
  ];

  return {
    mightLimit,
    energyLimit,
    powerLimit,
  };
}


export async function searchCards({
  query = '',
  page = 1,
  color,
  type,
  rarity,
  series,
  tag,
  keyword,
  region,
  power,
  energy,
  might,
  pageSize = 50,
  isAsc = true,
  orderBy = 'card_no'
}) {
  const db = await getDB();
  const params = [];
  let whereClauses = [];

  // 模糊搜索
  if (query) {
    whereClauses.push(`(
      card_name LIKE ? OR
      card_effect LIKE ? OR
      card_no LIKE ? OR
      sub_title LIKE ?
    )`);
    params.push(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
  }

  // 普通字段过滤
  if (series?.length) {
    whereClauses.push(`series_name IN (${series.map(() => '?').join(',')})`);
    params.push(...series);
  }
  if (type?.length) {
    whereClauses.push(`card_category_name IN (${type.map(() => '?').join(',')})`);
    params.push(...type);
  }
  if (rarity?.length) {
    whereClauses.push(`rarity_name IN (${rarity.map(() => '?').join(',')})`);
    params.push(...rarity);
  }
  if (tag?.length) {
    whereClauses.push(`tag IN (${tag.map(() => '?').join(',')})`);
    params.push(...tag);
  }
  if (region?.length) {
    whereClauses.push(`region IN (${region.map(() => '?').join(',')})`);
    params.push(...region);
  }

  // 范围过滤
  if (power) {
    whereClauses.push(`return_energy >= ? AND return_energy <= ?`);
    params.push(power.Start, power.End);
  }
  if (energy) {
    whereClauses.push(`energy >= ? AND energy <= ?`);
    params.push(energy.Start, energy.End);
  }
  if (might) {
    whereClauses.push(`power >= ? AND power <= ?`);
    params.push(might.Start, might.End);
  }

  // JSON 数组过滤
  if (color?.length) {
    whereClauses.push(`EXISTS (
      SELECT 1 FROM json_each(cards.card_color_list)
      WHERE value IN (${color.map(() => '?').join(',')})
    )`);
    params.push(...color);
  }
  if (keyword?.length) {
    whereClauses.push(`EXISTS (
      SELECT 1 FROM json_each(cards.keywords)
      WHERE value IN (${keyword.map(() => '?').join(',')})
    )`);
    params.push(...keyword);
  }

  // 构建 WHERE
  const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

  // 获取总条数
  const totalRows = await db.select(`SELECT COUNT(*) AS total FROM cards ${whereSQL}`, params);
  const total = totalRows[0]?.total || 0;

  // 分页查询
  const offset = (page - 1) * pageSize;
  const sql = `
    SELECT * FROM cards
    ${whereSQL}
    ORDER BY ${orderBy} ${isAsc ? 'ASC' : 'DESC'}
    LIMIT ? OFFSET ?
  `;
  const rows = await db.select(sql, [...params, pageSize, offset]);

  return { rows, total };
}

