import { loadEnvFileIfPresent } from "./load-env.js"

loadEnvFileIfPresent()

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { initDb } from "../db/schema.js"
import { saveSnapshot } from "../db/queries.js"
import { scrapeProduct } from "./scraper.js"

interface ProductConfig {
  url: string
  categoryPath: string
  customName?: string
  thresholdPercentage?: number
}

const loadProductsFromConfig = (filePath: string): ProductConfig[] => {
  const fileContent = readFileSync(filePath, "utf-8")
  const data = JSON.parse(fileContent)
  const products: ProductConfig[] = []

  const traverse = (val: any, path: string[]) => {
    if (!val || typeof val !== "object") return

    if (typeof val.url === "string") {
      products.push({
        url: val.url,
        categoryPath: path.join(" > "),
        thresholdPercentage: val.threshold_percentage,
      })
      return
    }

    if (Array.isArray(val.urls) && val.urls.every((u: any) => typeof u === "string")) {
      for (const u of val.urls) {
        products.push({
          url: u,
          categoryPath: path.join(" > "),
          customName: val.name,
          thresholdPercentage: val.threshold_percentage,
        })
      }
      return
    }

    if (Array.isArray(val)) {
      for (const item of val) {
        traverse(item, path)
      }
      return
    }

    for (const [key, value] of Object.entries(val)) {
      traverse(value, [...path, key])
    }
  }

  traverse(data, [])
  return products
}

const main = async () => {
  await initDb()

  const configPath = join(process.cwd(), "products.json")
  console.log(`Cargando productos desde: ${configPath}`)
  const products = loadProductsFromConfig(configPath)

  console.log(`Tracking ${products.length} producto(s) en MercadoLibre...\n`)

  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    console.log(`[${i + 1}/${products.length}] Scrapeando URL: ${product.url}`)
    try {
      const snapshot = await scrapeProduct(product.url)
      
      // Keep title custom name if configured
      if (product.customName && (!snapshot.title || snapshot.title === "Producto MercadoLibre")) {
        snapshot.title = product.customName
      }
      
      await saveSnapshot(snapshot)

      console.log(`  -> OK: ID=${snapshot.asin} | ${snapshot.title} | Precio=${snapshot.price} ${snapshot.currency} | ${snapshot.availability}\n`)
    } catch (error) {
      console.error(`  -> ERROR: ${error instanceof Error ? error.message : "Error desconocido"}\n`)
    }
    
    // Add a randomized delay (1.5s - 3.5s) between requests to avoid rate limits
    if (i < products.length - 1) {
      const ms = 1500 + Math.random() * 2000
      await new Promise((resolve) => setTimeout(resolve, ms))
    }
  }
  console.log("Proceso de scraping finalizado.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
