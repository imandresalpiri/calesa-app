import {
  documentoLimpio,
  type DocumentoDelSitio,
} from '../../../../entities/contenido/documento-limpio'
import type { GuiaCompleta } from '../../../../entities/contenido/guias'

// Lo que la página de la guía edita, todo como texto (un selector vacío es `''`) salvo el documento. Es también lo que mide el borrador.
export type ValoresDeGuia = {
  titulo: string
  slug: string
  resumen: string
  categoriaId: string
  autorId: string
  portadaRuta: string
  seoTitulo: string
  seoDescripcion: string
  cuerpo: DocumentoDelSitio | null
}

// La guía guardada como valores del formulario; el documento se reduce a la lista blanca al abrirlo.
export function valoresDeGuia(guia: GuiaCompleta): ValoresDeGuia {
  return {
    titulo: guia.titulo,
    slug: guia.slug,
    resumen: guia.resumen ?? '',
    categoriaId: guia.categoriaId ?? '',
    autorId: guia.autorId ?? '',
    portadaRuta: guia.portadaRuta ?? '',
    seoTitulo: guia.seoTitulo ?? '',
    seoDescripcion: guia.seoDescripcion ?? '',
    cuerpo: documentoLimpio(guia.cuerpoDoc),
  }
}

// El editor deja siempre un párrafo vacío al final (para seguir escribiendo después de una imagen o un botón): no es un cambio de la persona.
function sinParrafosFinalesVacios(cuerpo: DocumentoDelSitio | null): unknown {
  if (cuerpo === null) {
    return null
  }
  const bloques = [...cuerpo.content]
  while (bloques.length > 0) {
    const ultimo = bloques[bloques.length - 1]
    if (ultimo?.type === 'paragraph' && (ultimo.content?.length ?? 0) === 0) {
      bloques.pop()
    } else {
      break
    }
  }
  return bloques
}

// ¿Lo que se escribió difiere de lo guardado? Compara todo salvo los párrafos vacíos del final del cuerpo.
export function hayCambiosEnLaGuia(valores: ValoresDeGuia, guardado: ValoresDeGuia): boolean {
  const { cuerpo, ...resto } = valores
  const { cuerpo: cuerpoGuardado, ...restoGuardado } = guardado
  return (
    JSON.stringify(resto) !== JSON.stringify(restoGuardado) ||
    JSON.stringify(sinParrafosFinalesVacios(cuerpo)) !==
      JSON.stringify(sinParrafosFinalesVacios(cuerpoGuardado))
  )
}
