// El enlace de un video de la guía: lo que la persona pega (youtu.be, m.youtube.com, /shorts/, con `&t=`, vimeo.com/ID/…) pasa a la única forma
// que admite la base (`_web_doc_video`): `https://www.youtube.com/watch?v=<11>` o `https://vimeo.com/<número>`. Lo que no reconoce da `null`.
import { PATRON_DE_VIMEO, PATRON_DE_YOUTUBE } from './doc-bloques'

export type ProveedorDeVideo = 'youtube' | 'vimeo'
export type EnlaceDeVideo = { url: string; proveedor: ProveedorDeVideo }

const ID_DE_YOUTUBE = /^[A-Za-z0-9_-]{11}$/
const ID_DE_VIMEO = /^[0-9]{1,12}$/
const HOSTS_DE_YOUTUBE = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

function leerUrl(escrito: string): URL | null {
  const limpio = escrito.trim()
  if (limpio === '' || /\s/.test(limpio)) {
    return null
  }
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(limpio) ? limpio : `https://${limpio}`)
  } catch {
    return null
  }
}

function idDeYoutube(url: URL): string | null {
  const host = url.hostname.toLowerCase()
  const partes = url.pathname.split('/').filter((parte) => parte !== '')
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    return partes[0] ?? null
  }
  if (!HOSTS_DE_YOUTUBE.has(host)) {
    return null
  }
  if (partes[0] === 'watch') {
    return url.searchParams.get('v')
  }
  return partes[0] === 'shorts' || partes[0] === 'embed' || partes[0] === 'live'
    ? (partes[1] ?? null)
    : null
}

function idDeVimeo(url: URL): string | null {
  const host = url.hostname.toLowerCase()
  const partes = url.pathname.split('/').filter((parte) => parte !== '')
  if (host === 'player.vimeo.com') {
    return partes[0] === 'video' ? (partes[1] ?? null) : null
  }
  return host === 'vimeo.com' || host === 'www.vimeo.com' ? (partes[0] ?? null) : null
}

export function enlaceDeVideo(escrito: string): EnlaceDeVideo | null {
  const url = leerUrl(escrito)
  if (url === null || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
    return null
  }
  const youtube = idDeYoutube(url)
  if (youtube !== null && ID_DE_YOUTUBE.test(youtube)) {
    const canonica = `https://www.youtube.com/watch?v=${youtube}`
    return PATRON_DE_YOUTUBE.test(canonica) ? { url: canonica, proveedor: 'youtube' } : null
  }
  const vimeo = idDeVimeo(url)
  if (vimeo !== null && ID_DE_VIMEO.test(vimeo)) {
    const canonica = `https://vimeo.com/${vimeo}`
    return PATRON_DE_VIMEO.test(canonica) ? { url: canonica, proveedor: 'vimeo' } : null
  }
  return null
}
