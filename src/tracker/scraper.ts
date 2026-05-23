import { loadEnvFileIfPresent } from "./load-env.js"

loadEnvFileIfPresent()

import type { ProductSnapshot } from "../db/queries.js"
import { toNumber, toInteger } from "./utils.js"
import crypto from "crypto"

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  MÓDULO INTERCAMBIABLE DE SCRAPING - MERCADOLIBRE
 *
 *  Contrato: exportar scrapeProduct(url: string) → ProductSnapshot
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

export const getMeliId = (url: string): string => {
  const filterMatch = url.match(/item_id(?:%3A|=)(MLA\d+)/i)
  if (filterMatch) return filterMatch[1].toUpperCase()

  const upMatch = url.match(/\/up\/(MLAU?\d+)/i)
  if (upMatch) return upMatch[1].toUpperCase()

  const pMatch = url.match(/\/p\/(MLAU?\d+)/i)
  if (pMatch) return pMatch[1].toUpperCase()

  const m = url.match(/(MLA-?\d+)/i)
  if (m) return m[1].replace("-", "").toUpperCase()

  // Simple base64/md5 fallback for safety
  const hash = crypto.createHash("md5").update(url).digest("hex").substring(0, 10).toUpperCase()
  return `MLI${hash}`
}

export const scrapeProduct = async (url: string): Promise<ProductSnapshot> => {
  const googlebotUA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
  const meliId = getMeliId(url)

  const response = await fetch(url, {
    headers: {
      "User-Agent": googlebotUA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9",
    },
  })

  if (!response.ok) {
    throw new Error(`Error al obtener producto (${response.status})`)
  }

  const html = await response.text()

  // Extract variables via JSON-LD
  let title: string | null = null
  let price: number | null = null
  let currency: string | null = null
  let availability: string | null = null
  let rating: number | null = null
  let reviewsCount: number | null = null
  let imageUrl: string | null = null

  const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  if (jsonLdMatches) {
    for (const block of jsonLdMatches) {
      const jsonText = block
        .replace(/<script[^>]*>/i, "")
        .replace(/<\/script>/i, "")
        .trim()
      try {
        const parsed = JSON.parse(jsonText)
        const obj = Array.isArray(parsed) ? parsed[0] : parsed
        if (obj?.["@type"] === "Product" || obj?.offers) {
          title = obj.name || null
          price = toNumber(obj.offers?.price || obj.offers?.lowPrice)
          currency = obj.offers?.priceCurrency || null
          availability = obj.offers?.availability || null
          
          if (obj.image) {
            imageUrl = Array.isArray(obj.image) ? obj.image[0] : obj.image
          }
          
          if (obj.aggregateRating) {
            rating = toNumber(obj.aggregateRating.ratingValue)
            reviewsCount = toInteger(obj.aggregateRating.reviewCount)
          }
          break
        }
      } catch (e) {
        // Silently skip malformed JSON blocks
      }
    }
  }

  // Fallbacks if JSON-LD is missing or incomplete
  if (!title) {
    const titleMatch = html.match(/<h1[^>]*class="[^"]*ui-pdp-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
                       html.match(/<title>([\s\S]*?)<\/title>/i)
    title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : null
  }

  if (price === null) {
    const metaPrice = html.match(/<meta[^>]*itemprop="price"[^>]*content="([^"]+)"/i) ||
                      html.match(/<meta[^>]*property="product:price:amount"[^>]*content="([^"]+)"/i)
    price = metaPrice ? toNumber(metaPrice[1]) : null
  }

  if (!currency) {
    const metaCurrency = html.match(/<meta[^>]*itemprop="priceCurrency"[^>]*content="([^"]+)"/i) ||
                         html.match(/<meta[^>]*property="product:price:currency"[^>]*content="([^"]+)"/i)
    currency = metaCurrency ? metaCurrency[1].trim() : null
  }

  if (!imageUrl) {
    const metaImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
                      html.match(/<meta[^>]*property="twitter:image"[^>]*content="([^"]+)"/i)
    imageUrl = metaImage ? metaImage[1].trim() : null
  }

  // Normalize availability
  let isAvailableStr = availability
  if (availability) {
    if (availability.includes("InStock")) {
      isAvailableStr = "En stock"
    } else if (availability.includes("OutOfStock")) {
      isAvailableStr = "Sin stock"
    }
  } else {
    isAvailableStr = html.includes("Stock disponible") ? "En stock" : "Sin stock"
  }

  return {
    asin: meliId,
    title: title || "Producto MercadoLibre",
    price: price,
    currency: currency || "ARS",
    availability: isAvailableStr,
    rating: rating,
    reviewsCount: reviewsCount,
    url: url,
    imageUrl: imageUrl,
    scrapedAt: new Date().toISOString(),
  }
}
