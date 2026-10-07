const MERCADO_PAGO_SDK_URL = 'https://sdk.mercadopago.com/js/v2'

let sdkPromise = null

export const loadMercadoPagoSdk = () => {
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago)
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${MERCADO_PAGO_SDK_URL}"]`)

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.MercadoPago), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Não foi possível carregar o Mercado Pago.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = MERCADO_PAGO_SDK_URL
    script.async = true
    script.onload = () => resolve(window.MercadoPago)
    script.onerror = () => reject(new Error('Não foi possível carregar o Mercado Pago.'))
    document.body.appendChild(script)
  })

  return sdkPromise
}
