// ¿Hay cambios en el documento? Todo cuenta salvo el alto de los textos: lo mide el lienzo con los datos que se ven (`medirTexto`), y con otro
// vehículo de ejemplo el mismo texto ocupa otras líneas. Elegir un vehículo no deja «Cambios sin guardar»; lo que se guarda lleva el alto de
// ahora. Puro.
import type { DocumentoDeArte } from '../documento'
import { mismoJson } from './mismo-json'

function sinElAltoDeLosTextos(documento: DocumentoDeArte): unknown {
  return {
    ...documento,
    paginas: documento.paginas.map((pagina) => ({
      ...pagina,
      capas: pagina.capas.map((capa) => (capa.tipo === 'texto' ? { ...capa, alto: 0 } : capa)),
    })),
  }
}

export function mismoDocumento(a: DocumentoDeArte, b: DocumentoDeArte): boolean {
  return a === b || mismoJson(sinElAltoDeLosTextos(a), sinElAltoDeLosTextos(b))
}
