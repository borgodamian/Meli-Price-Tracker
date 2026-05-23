import { createClient, type Client } from "@libsql/client"

let _client: Client | null = null

export const getDb = (): Client => {
  if (_client) return _client

  let url = process.env.TURSO_DATABASE_URL
  let authToken = process.env.TURSO_AUTH_TOKEN

  if (!url || url === "undefined" || url === "tu_database_url" || url.trim() === "") {
    url = "file:local.db"
  }

  if (authToken === "undefined" || authToken === "tu_auth_token" || (authToken && authToken.trim() === "")) {
    authToken = undefined
  }

  if (url.startsWith("file:")) {
    _client = createClient({ url })
  } else {
    if (!authToken) {
      throw new Error("Faltan TURSO_DATABASE_URL y/o TURSO_AUTH_TOKEN")
    }
    _client = createClient({ url, authToken })
  }
  return _client
}

