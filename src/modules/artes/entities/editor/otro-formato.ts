// «Duplicar en otro formato» (docs/GLOSARIO.md › «Duplicar en otro formato»): la copia reacomoda cada capa anclada a su centro. Con
// sx = ancho nuevo / ancho viejo y sy igual con el alto, el centro de cada capa suelta va a (cx·sx, cy·sy); imágenes, formas, líneas y trazos
// escalan por k = min(sx, sy) alrededor de su centro (con su borde, radio y sombra) y **el texto conserva su tamaño, su caja, su interlineado y
// su borde**: sólo se mueve. Un grupo se mueve entero: el centro de la caja que junta a sus miembros va × (sx, sy) y lo de adentro se acerca o
// aleja de él × k. Nada se redondea: A → B → A deja cada texto como estaba (V1 multiplicaba y redondeaba la letra y se achicaba a cada vuelta).
// Sólo entre formatos del mismo tipo: px y pt no son la misma unidad. Puro.
import type { CapaDeArte, DocumentoDeArte, NodoDelTrazo, PaginaDeArte, Punto } from '../documento'
import {
  FORMATOS_DE_ARTE,
  tipoDelFormato,
  type ClaveDeFormato,
  type FormatoDeArte,
  type Medidas,
} from '../formatos'

// Los formatos a los que se puede duplicar: los del mismo tipo, sin el propio (salvo «Personalizado», que pide medidas y puede ser otro).
export function formatosDestino(clave: ClaveDeFormato): FormatoDeArte[] {
  const tipo = tipoDelFormato(clave)
  return FORMATOS_DE_ARTE.filter(
    (formato) =>
      formato.tipo === tipo && (formato.clave !== clave || formato.clave === 'personalizado'),
  )
}

type Escala = { sx: number; sy: number; k: number }

const centroDe = (capa: CapaDeArte): Punto => ({
  x: capa.x + capa.ancho / 2,
  y: capa.y + capa.alto / 2,
})

const por = (punto: Punto, k: number): Punto => ({ x: punto.x * k, y: punto.y * k })

const nodoPor = (nodo: NodoDelTrazo, k: number): NodoDelTrazo => ({
  x: nodo.x * k,
  y: nodo.y * k,
  entrada: nodo.entrada === null ? null : por(nodo.entrada, k),
  salida: nodo.salida === null ? null : por(nodo.salida, k),
})

// Lo propio de cada tipo que escala con la capa (el grosor del borde, el radio, lo que dibuja por dentro). El texto, nada.
function escalarLoPropio(capa: CapaDeArte, k: number): CapaDeArte {
  switch (capa.tipo) {
    case 'texto':
      return capa
    case 'forma':
      return { ...capa, grosor: capa.grosor * k, radio: capa.radio * k }
    case 'linea': {
      const [desde, hasta] = capa.puntos
      return { ...capa, grosor: capa.grosor * k, puntos: [por(desde, k), por(hasta, k)] }
    }
    case 'trazo':
      return { ...capa, grosor: capa.grosor * k, nodos: capa.nodos.map((n) => nodoPor(n, k)) }
    case 'imagen':
    case 'logo':
    case 'foto':
    case 'tarjeta':
      return { ...capa, grosor: capa.grosor * k, radio: capa.radio * k }
  }
}

// La capa con su centro en `centro`: el texto con la misma caja; lo demás, con la caja y la sombra × k.
function conCentro(capa: CapaDeArte, centro: Punto, k: number): CapaDeArte {
  if (capa.tipo === 'texto') {
    return { ...capa, x: centro.x - capa.ancho / 2, y: centro.y - capa.alto / 2 }
  }
  const ancho = capa.ancho * k
  const alto = capa.alto * k
  const sombra =
    capa.sombra === null
      ? null
      : {
          ...capa.sombra,
          desenfoque: capa.sombra.desenfoque * k,
          x: capa.sombra.x * k,
          y: capa.sombra.y * k,
        }
  return {
    ...escalarLoPropio(capa, k),
    x: centro.x - ancho / 2,
    y: centro.y - alto / 2,
    ancho,
    alto,
    sombra,
  }
}

// El centro de la caja (sin rotar) que junta a los miembros de un grupo.
function centroDelGrupo(miembros: readonly CapaDeArte[]): Punto {
  const izquierda = Math.min(...miembros.map((c) => c.x))
  const arriba = Math.min(...miembros.map((c) => c.y))
  const derecha = Math.max(...miembros.map((c) => c.x + c.ancho))
  const abajo = Math.max(...miembros.map((c) => c.y + c.alto))
  return { x: (izquierda + derecha) / 2, y: (arriba + abajo) / 2 }
}

function reacomodarLaPagina(pagina: PaginaDeArte, escala: Escala): PaginaDeArte {
  const { sx, sy, k } = escala
  const centrosDeGrupo = new Map<string, Punto>()
  for (const grupo of pagina.grupos) {
    const miembros = pagina.capas.filter((capa) => capa.grupoId === grupo.id)
    if (miembros.length > 0) {
      centrosDeGrupo.set(grupo.id, centroDelGrupo(miembros))
    }
  }
  const capas = pagina.capas.map((capa) => {
    const centro = centroDe(capa)
    const delGrupo = capa.grupoId === null ? undefined : centrosDeGrupo.get(capa.grupoId)
    if (delGrupo === undefined) {
      return conCentro(capa, { x: centro.x * sx, y: centro.y * sy }, k)
    }
    const nuevo = {
      x: delGrupo.x * sx + (centro.x - delGrupo.x) * k,
      y: delGrupo.y * sy + (centro.y - delGrupo.y) * k,
    }
    return conCentro(capa, nuevo, k)
  })
  return { ...pagina, capas }
}

// El documento reacomodado de las medidas `desde` a `hacia` (todas sus páginas). No cambia el documento que recibe.
export function reacomodarEnOtroFormato(
  documento: DocumentoDeArte,
  desde: Medidas,
  hacia: Medidas,
): DocumentoDeArte {
  const sx = hacia.ancho / desde.ancho
  const sy = hacia.alto / desde.alto
  const escala: Escala = { sx, sy, k: Math.min(sx, sy) }
  return {
    ...documento,
    paginas: documento.paginas.map((pagina) => reacomodarLaPagina(pagina, escala)),
  }
}
