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
      CREATE TABLE IF NOT EXISTS setting_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        type INTEGER DEFAULT 0,
        options TEXT DEFAULT '',
      );
    `);

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
        front_image_en TEXT,
        card_name_en TEXT DEFAULT '',
        effect_en TEXT DEFAULT ''
      );
    `);

    await db.execute(`
      -- 卡组主表
      CREATE TABLE IF NOT EXISTS decks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 卡组卡牌关联表
      CREATE TABLE IF NOT EXISTS deck_cards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          deck_id INTEGER NOT NULL,
          card_no TEXT NOT NULL,
          zone TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (deck_id) REFERENCES decks (id) ON DELETE CASCADE,
          FOREIGN KEY (card_no) REFERENCES cards (card_no) ON DELETE CASCADE,
          
          -- 确保同一卡组同一区域不会重复添加同一卡牌
          UNIQUE(deck_id, card_no, zone)
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
          back_image, champion_tag, keywords, series_name, front_image_en, card_name_en, effect_en
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
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
          front_image_en=excluded.front_image_en,
          card_name_en=excluded.card_name_en, 
          effect_en=excluded.effect_en
          ;
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
        safeTrim(card.front_image_en),
        safeTrim(card.card_name_en),
        safeTrim(card.effect_en)
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

  const tagSet = new Set();

  tag.forEach(t => {
    if (!t || t.tag.trim() === "") return;

    let tagList = t.tag.split("|");

    tagList.forEach(x => {
      if (x.trim() !== "") {
        tagSet.add(x.trim());
      }
    });
  });

  return {
    series: series.map(r => r.series_name).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    color: ["red", "green", "blue", "orange", "purple", "yellow", "colorless"],
    rarity: ["普通", "不凡", "稀有", "史诗", "异画"],
    type: type.map(r => r.card_category_name).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    tag: Array.from(tagSet).sort((a, b) => a.localeCompare(b)),
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
  orderBy = 'card_no',
  selectModes,
}) {
  console.log(selectModes);
  const db = await getDB();
  const params = [];
  let whereClauses = [];

  // 模糊搜索
  if (query) {
    whereClauses.push(`(
      card_name LIKE ? OR
      card_effect LIKE ? OR
      card_no LIKE ? OR
      sub_title LIKE ? OR
      champion_tag LIKE ? OR
      card_name_en LIKE ? OR
      card_name Like ?
    )`);
    params.push(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
  }

  // 普通字段过滤
  if (series?.length) {

    switch (selectModes["series"]) {
      case 'excludeSelected':
        // 排除：集合中不能出现任何选中
        whereClauses.push(`series_name NOT IN (${series.map(() => '?').join(',')})`);
        params.push(...series);
        break;


      case 'eitherSelected':
      default:
        // 任意匹配
        whereClauses.push(`series_name IN (${series.map(() => '?').join(',')})`);
        params.push(...series);
        break;
    }

  }

  if (type?.length) {

    switch (selectModes["type"]) {
      case 'excludeSelected':
        // 排除：集合中不能出现任何选中
        whereClauses.push(`card_category_name NOT IN (${type.map(() => '?').join(',')})`);
        params.push(...type);
        break;


      case 'eitherSelected':
      default:
        // 任意匹配
        whereClauses.push(`card_category_name IN (${type.map(() => '?').join(',')})`);
        params.push(...type);
        break;
    }
  }

  if (rarity?.length) {
    switch (selectModes["rarity"]) {
      case 'excludeSelected':
        // 排除：集合中不能出现任何选中
        whereClauses.push(`rarity_name NOT IN (${rarity.map(() => '?').join(',')})`);
        params.push(...rarity);
        break;


      case 'eitherSelected':
      default:
        // 任意匹配
        whereClauses.push(`rarity_name IN (${rarity.map(() => '?').join(',')})`);
        params.push(...rarity);
        break;
    }
  }

  if (tag?.length) {
    // 预处理标签，清理空格
    const cleanTags = tag.map(t => t.trim()).filter(t => t !== '');
    if (cleanTags.length === 0) return;

    switch (selectModes["tag"]) {
      case 'onlySelected':
        // 1. 确保标签数量一致 (通过计算分隔符 '|' 的数量)
        whereClauses.push(`(LENGTH(cards.tag) - LENGTH(REPLACE(cards.tag, '|', ''))) = ?`);
        params.push(cleanTags.length - 1);

        // 2. 确保包含所有选中的标签
        cleanTags.forEach(t => {
          whereClauses.push(`'|' || cards.tag || '|' LIKE ?`);
          params.push(`%|${t}|%`);
        });
        break;

      case 'includeSelected':
        // 必须包含每一个选中的标签 (AND 逻辑)
        cleanTags.forEach(t => {
          whereClauses.push(`'|' || cards.tag || '|' LIKE ?`);
          params.push(`%|${t}|%`);
        });
        break;

      case 'excludeSelected':
        // 排除逻辑：只要包含其中任意一个，就排除
        // 使用 NOT EXISTS 或者多个 AND NOT 逻辑更稳健
        cleanTags.forEach(t => {
          whereClauses.push(`'|' || COALESCE(cards.tag, '') || '|' NOT LIKE ?`);
          params.push(`%|${t}|%`);
        });
        break;

      case 'eitherSelected':
      default:
        // 任意命中一个 (OR 逻辑)
        const anyMatch = cleanTags.map(() => `'|' || cards.tag || '|' LIKE ?`).join(' OR ');
        whereClauses.push(`(${anyMatch})`);
        cleanTags.forEach(t => params.push(`%|${t}|%`));
        break;
    }
  }

  if (region?.length) {
    switch (selectModes["region"]) {
      case 'excludeSelected':
        // 排除：集合中不能出现任何选中
        whereClauses.push(`region NOT IN (${region.map(() => '?').join(',')})`);
        params.push(...region);
        break;


      case 'eitherSelected':
      default:
        // 任意匹配
        whereClauses.push(`region IN (${region.map(() => '?').join(',')})`);
        params.push(...region);
        break;
    }
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
    const placeholders = color.map(() => '?').join(',');

    switch (selectModes["color"]) {
      case 'onlySelected':
        whereClauses.push(`
          NOT EXISTS (
            SELECT 1 FROM json_each(cards.card_color_list)
            WHERE value NOT IN (${placeholders})
          )
        `);

        whereClauses.push(`
          (
            SELECT COUNT(DISTINCT value)
            FROM json_each(cards.card_color_list)
            WHERE value IN (${placeholders})
          ) = ?
        `);

        params.push(...color);
        params.push(...color);
        params.push(color.length);
        break;


      case 'includeSelected':
        // 每个选中都必须存在 json 数组里
        const mustIncludeAllConditions = color.map(() => `
          EXISTS (
            SELECT 1 FROM json_each(cards.card_color_list)
            WHERE json_each.value = ?
          )
        `).join(' AND ');

        whereClauses.push(`(${mustIncludeAllConditions})`);

        // 将所有 color 参数依次 push
        params.push(...color);
        break;

      case 'excludeSelected':
        // 排除：集合中不能出现任何选中
        whereClauses.push(`
          NOT EXISTS (
            SELECT 1 FROM json_each(cards.card_color_list)
            WHERE value IN (${placeholders})
          )
        `);
        params.push(...color);
        break;

      case 'eitherSelected':
      default:
        // 任意匹配
        whereClauses.push(`
        EXISTS (
          SELECT 1 FROM json_each(cards.card_color_list)
          WHERE value IN (${placeholders})
        )
      `);
        params.push(...color);
        break;

    }
  }


  if (keyword?.length) {
    const placeholders = keyword.map(() => '?').join(',');

    switch (selectModes["keyword"]) {
      case 'onlySelected':
        // 精确匹配：数量必须相等，且没有多余
        whereClauses.push(`
        NOT EXISTS (
          SELECT 1 FROM json_each(cards.keywords)
          WHERE value NOT IN (${placeholders})
        )
      `);

        whereClauses.push(`
        (
          SELECT COUNT(DISTINCT value)
          FROM json_each(cards.keywords)
          WHERE value IN (${placeholders})
        ) = ?
      `);

        params.push(...keyword);  // for NOT IN
        params.push(...keyword);  // for IN
        params.push(keyword.length); // exact count
        break;

      case 'includeSelected':
        // 每个选中的关键词都必须存在 json 数组里
        const mustIncludeAllConditions = keyword.map(() => `
          EXISTS (
            SELECT 1 FROM json_each(cards.keywords)
            WHERE json_each.value = ?
          )
        `).join(' AND ');

        whereClauses.push(`(${mustIncludeAllConditions})`);

        // 将所有 keyword 参数依次 push
        params.push(...keyword);
        break;


      case 'excludeSelected':
        // 排除：集合中不能出现任何选中关键词
        whereClauses.push(`
        NOT EXISTS (
          SELECT 1 FROM json_each(cards.keywords)
          WHERE value IN (${placeholders})
        )
      `);
        params.push(...keyword);
        break;


      case 'eitherSelected':
      default:
        // 任意匹配：只要有一个关键词匹配
        whereClauses.push(`
        EXISTS (
          SELECT 1 FROM json_each(cards.keywords)
          WHERE value IN (${placeholders})
        )
      `);
        params.push(...keyword);
        break;
    }

  }

  // 构建 WHERE
  const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

  // 获取总条数
  const totalRows = await db.select(`SELECT COUNT(*) AS total FROM cards ${whereSQL}`, params);
  const total = totalRows[0]?.total || 0;

  // 分页查询
  const offset = (page - 1) * pageSize;
  let orderByRules = []
  if (orderBy === "card_no") {
    orderByRules = [
      { col: 'card_no', asc: isAsc }
    ];
  } else {
    orderByRules = [
      { col: orderBy, asc: isAsc },
      { col: 'card_no', asc: true }
    ];
  }

  const orderBySQL = orderByRules
    .map(o => `${o.col} ${o.asc ? 'ASC' : 'DESC'}`)
    .join(', ');

  const sql = `
    SELECT * FROM cards
    ${whereSQL}
    ORDER BY ${orderBySQL}
    LIMIT ? OFFSET ?
  `;
  const rows = await db.select(sql, [...params, pageSize, offset]);

  return { rows, total };
}

// deck sql

// 保存/更新卡组
export async function saveDeck(deckData) {
  try {
    let deckId;

    if (deckData.id) {
      await db.execute(
        'UPDATE decks SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [deckData.name, deckData.id]
      );
      deckId = deckData.id;
      await db.execute('DELETE FROM deck_cards WHERE deck_id = ?', [deckId]);
    } else {
      const result = await db.execute(
        'INSERT INTO decks (name, description) VALUES (?, ?)',
        [deckData.name, deckData.description]
      );
      deckId = result.lastInsertId;
    }

    const zones = ['legend', 'chosen', 'main', 'runes', 'sideboard', 'battlefield'];
    for (const zone of zones) {
      const cards = deckData[zone] || [];
      for (const card of cards) {
        await db.execute(
          `INSERT INTO deck_cards (deck_id, card_no, zone, quantity) 
           VALUES (?, ?, ?, ?)`,
          [deckId, card.card_no, zone, card.quantity ?? 1]
        );
      }
    }

    return deckId;

  } catch (error) {
    console.error("保存卡组失败：", error);
    throw error;
  }
}


// 加载卡组列表（简要信息）
// 加载卡组列表（包含英雄信息）
export async function loadDeckList() {
  await getDB();
  // 先获取基础列表
  const deckList = await db.select(`
        SELECT d.*, 
               COALESCE(SUM(dc.quantity), 0) AS total_cards
        FROM decks d
        LEFT JOIN deck_cards dc ON d.id = dc.deck_id
        GROUP BY d.id
        ORDER BY d.updated_at DESC
    `);

  // 为每个卡组获取英雄信息
  for (let deck of deckList) {
    const legend = await db.select(`
            SELECT c.* 
            FROM deck_cards dc
            JOIN cards c ON dc.card_no = c.card_no
            WHERE dc.deck_id = ? AND dc.zone = 'legend'
            LIMIT 1
        `, [deck.id]);

    deck.legend = legend[0] || null;
    deck.legend_card_no = deck?.legend?.card_no || null;
    deck.legend_name = deck?.legend?.card_name || '无传奇';
    try {
      const colorList = deck?.legend?.card_color_list;
      deck.legend_colors = colorList ? JSON.parse(colorList) : [];
    } catch (e) {
      console.warn("解析颜色列表失败:", deck?.legend?.card_color_list, e);
      deck.legend_colors = [];
    }
  }

  return deckList;
}

// 加载完整卡组数据
export async function loadDeck(deckId) {
  await getDB();

  const [deck] = await db.select(
    'SELECT * FROM decks WHERE id = ?',
    [deckId]
  );

  if (!deck) return null;

  const deckCards = await db.select(`
        SELECT dc.*, c.* 
        FROM deck_cards dc
        JOIN cards c ON dc.card_no = c.card_no
        WHERE dc.deck_id = ?
        ORDER BY dc.zone
    `, [deckId]);

  // 按区域组织卡牌数据
  const zones = {};
  const zoneTypes = ['legend', 'chosen', 'main', 'runes', 'sideboard', 'battlefield'];

  for (const zone of zoneTypes) {
    zones[zone] = [];
  }

  for (const card of deckCards) {
    if (zones[card.zone]) {
      zones[card.zone].push({
        ...card,
        quantity: card.quantity
      });
    }
  }

  return {
    ...deck,
    ...zones
  };
}

// 删除卡组
export async function deleteDeck(deckId) {
  await db.execute('DELETE FROM decks WHERE id = ?', [deckId]);
}

export async function getCardsByNo(cardNos = []) {
  if (!cardNos?.length) return [];

  const db = await getDB();
  const placeholders = cardNos.map(() => '?').join(', ');
  const sql = `
    SELECT 
      card_no,
      card_name,
      sub_title,
      card_effect,
      flavor_text,
      back_image,
      front_image_en,
      card_category
    FROM cards
    WHERE card_no IN (${placeholders})
  `;

  const rows = await db.select(sql, cardNos);
  return rows;
}

export async function getCardByNo(cardNo) {
  if (!cardNo.trim()) return null;

  const db = await getDB();

  const sql = `
    SELECT 
      *
    FROM cards
    WHERE card_no = ?
  `;

  const rows = await db.select(sql, [cardNo]);
  if (rows.length === 0) return null;
  return rows[0];
}
