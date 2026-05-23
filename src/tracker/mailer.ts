import nodemailer from "nodemailer"

/**
 * Sends an email notification when a product price drops.
 */
export const sendPriceAlert = async (
  productTitle: string,
  url: string,
  oldPrice: number,
  newPrice: number,
  currency: string,
  threshold: number
) => {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_PASSWORD

  if (!user || !pass) {
    console.log("[Mailer] Credenciales de correo (GMAIL_USER / GMAIL_PASSWORD) no configuradas. Alerta por correo omitida.")
    return
  }

  // Configure Gmail SMTP transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user,
      pass: pass,
    },
  })

  const percentDrop = ((oldPrice - newPrice) / oldPrice * 100).toFixed(1)
  const currencySymbol = currency === "ARS" || currency === "$" ? "$" : (currency || "$")

  const mailOptions = {
    from: `"Meli Price Tracker" <${user}>`,
    to: user, // Send notifications to themselves
    subject: `🚨 ¡Baja de precio! ${percentDrop}% en: ${productTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1a202c;">
        <h2 style="color: #2D3277; margin-top: 0; font-size: 1.5rem; border-bottom: 2px solid #FFF159; padding-bottom: 10px;">
          🚨 Alerta de Descuento MercadoLibre
        </h2>
        <p style="font-size: 1rem; line-height: 1.5; color: #4a5568;">
          El producto que estás monitoreando ha bajado de precio superando tu umbral del <strong>${threshold}%</strong>.
        </p>
        
        <div style="background-color: #f7fafc; border: 1px solid #edf2f7; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <h3 style="margin-top: 0; font-size: 1.1rem; color: #2d3748; line-height: 1.4;">${productTitle}</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 4px 0; color: #718096; font-size: 0.9rem;">Precio Anterior:</td>
              <td style="padding: 4px 0; text-align: right; color: #718096; text-decoration: line-through; font-size: 0.9rem;">
                ${currencySymbol} ${oldPrice.toLocaleString("es-AR")}
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #2d3748; font-weight: bold; font-size: 1.1rem;">Nuevo Precio:</td>
              <td style="padding: 4px 0; text-align: right; color: #e53e3e; font-weight: bold; font-size: 1.1rem;">
                ${currencySymbol} ${newPrice.toLocaleString("es-AR")}
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #38a169; font-weight: bold;">Descuento:</td>
              <td style="padding: 4px 0; text-align: right; color: #38a169; font-weight: bold; font-size: 1.05rem;">
                ${percentDrop}%
              </td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0 10px 0;">
          <a href="${url}" target="_blank" style="background-color: #FFF159; color: #1a1900; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; border: 1px solid #e2d100; display: inline-block; font-size: 1rem;">
            Ver Producto en MercadoLibre
          </a>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0 15px 0;" />
        <p style="font-size: 0.75rem; color: #a0aec0; text-align: center; margin: 0;">
          Meli Price Tracker • Monitoreo automatizado en tiempo real
        </p>
      </div>
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log(`[Mailer] Alerta de precio enviada con éxito: ${info.messageId}`)
  } catch (error) {
    console.error("[Mailer] Error al enviar el correo electrónico:", error)
  }
}
