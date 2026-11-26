// El HTML de la vista previa de una guía: el mismo que derivará la base (`htmlDelDocumento`), con las imágenes ya apuntando a su URL pública.
// Se dibuja sólo en la vista previa del editor; lo que ve el visitante lo arma el sitio con el HTML de la base.
import { escaparHtml, htmlDelDocumento } from './doc'

export type VistaPrevia = { ok: true; html: string } | { ok: false; motivo: string }

// `urlDeImagen` convierte la ruta del bucket `web` en una URL (`urlPublica('web', ruta)`): se inyecta para que esto siga siendo puro.
export function htmlParaLaVistaPrevia(
  documento: unknown,
  urlDeImagen: (ruta: string) => string,
): VistaPrevia {
  const resultado = htmlDelDocumento(documento)
  if (!resultado.ok) {
    return resultado
  }
  const html = resultado.html.replace(
    /<img data-ruta="([^"]*)"/g,
    (_, ruta: string) =>
      `<img src="${escaparHtml(urlDeImagen(desescapar(ruta)))}" data-ruta="${ruta}"`,
  )
  return { ok: true, html }
}

// La ruta sale escapada del HTML; la URL se arma con la ruta real.
const desescapar = (ruta: string): string =>
  ruta
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
