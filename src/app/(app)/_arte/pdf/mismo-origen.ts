// Si un pedido que arma algo con la sesión de quien pide viene de una página de la app y no de otro sitio (un formulario ajeno que manda la
// cookie): el navegador dice de dónde con `Sec-Fetch-Site`; uno que no la manda, con un `Origin` igual al host. Sin ninguna de las dos, no. Puro.
export function vieneDelMismoOrigen(cabeceras: Headers): boolean {
  const sitio = cabeceras.get('sec-fetch-site')
  if (sitio !== null) {
    return sitio === 'same-origin'
  }
  const origen = cabeceras.get('origin')
  const host = cabeceras.get('x-forwarded-host') ?? cabeceras.get('host')
  if (origen === null || host === null) {
    return false
  }
  try {
    return new URL(origen).host === host
  } catch {
    return false
  }
}
