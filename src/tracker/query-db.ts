import { getDb } from "../db/client.js";

async function run() {
  const db = getDb();
  const res = await db.execute("SELECT * FROM price_snapshots WHERE id > 45 ORDER BY id ASC LIMIT 10");
  console.log("Snapshots with ID > 45:");
  console.log(JSON.stringify(res.rows, null, 2));
}

run();
