import type { CodigoError } from '@/shared/lib/errores'

// Lo que se dice si el PDF de una guardada no baja (el pie de «Vista previa» y la línea del «⋯»): textos propios, nunca el cuerpo de la respuesta.
export function textoDelFalloDelPdf(codigo: CodigoError): string {
  if (codigo === 'no_encontrado') {
    return 'Esta cotización ya no está disponible.'
  }
  if (codigo === 'no_autenticado') {
    return 'Tu sesión ya no vale: vuelve a entrar.'
  }
  return 'No se pudo armar el PDF.'
}

// El aviso de un PDF con la plantilla de arte que salió sin alguna imagen (no cargó a tiempo o ya no existe); sin ninguna, nada. El mismo texto
// que el editor de artes (`textoDeImagenesQueFaltanEnElPdf()` de `artes`), escrito acá porque `cotizaciones` no depende de `artes`.
export function textoDeLasImagenesQueFaltan(cuantas: number): string | null {
  if (cuantas <= 0) {
    return null
  }
  return cuantas === 1
    ? 'El PDF salió sin 1 imagen que no cargó.'
    : `El PDF salió sin ${String(cuantas)} imágenes que no cargaron.`
}
