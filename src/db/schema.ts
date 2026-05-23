import { getDb } from "./client.js"

export const initDb = async () => {
  const db = getDb()

  await db.execute(`
    CREATE TABLE IF NOT EXISTS price_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asin TEXT NOT NULL,
      title TEXT,
      price REAL,
      currency TEXT,
      availability TEXT,
      rating REAL,
      reviews_count INTEGER,
      url TEXT,
      scraped_at TEXT NOT NULL
    )
  `)

  // Safely add image_url if it doesn't exist
  try {
    await db.execute(`ALTER TABLE price_snapshots ADD COLUMN image_url TEXT`)
  } catch (e) {
    // Column already exists, ignore
  }

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_price_snapshots_asin_scraped_at
    ON price_snapshots (asin, scraped_at)
  `)
}
