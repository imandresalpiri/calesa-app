import type { ColumnaEditable } from './celda'

// El panel del ítem en dos columnas (`docs/UX.md` › «Panel del ítem»): a la izquierda, lo del ítem en grupos con su título (se ven como texto y cada uno se edita en su modal);
// a la derecha, las demás secciones como tarjetas que abren su modal o su drawer. Puro: qué grupos hay, qué columnas edita cada uno y qué tarjetas ve quien mira.

export const GRUPOS_DEL_ITEM = [
  {
    clave: 'que-es',
    titulo: 'Qué es',
    columnas: ['tipo_pieza_id', 'condicion_id', 'descripcion'],
  },
  {
    clave: 'cantidades',
    titulo: 'Cantidades y precios',
    columnas: ['cantidad', 'precio_cliente', 'moneda'],
  },
  {
    clave: 'origen',
    titulo: 'Origen y envío',
    columnas: ['pais_origen_id', 'modo_transporte_id', 'tracking'],
  },
  { clave: 'notas', titulo: 'Notas del ítem', columnas: ['notas'] },
] as const satisfies readonly {
  clave: string
  titulo: string
  columnas: readonly ColumnaEditable[]
}[]

export type GrupoDelItem = (typeof GRUPOS_DEL_ITEM)[number]
export type ClaveDeGrupo = GrupoDelItem['clave']

/** El grupo de `?editar=<clave>`; nulo con cualquier otra cosa. */
export function grupoDe(clave: string | null): GrupoDelItem | null {
  return GRUPOS_DEL_ITEM.find((g) => g.clave === clave) ?? null
}

/** Los grupos que ofrecen «Editar»: todos con `repuestos.editar` y el proyecto abierto (`editable`, lo que la hoja ya calcula); si no, ninguno: se leen como texto. */
export function gruposQueSeEditan(editable: boolean): readonly ClaveDeGrupo[] {
  return editable ? GRUPOS_DEL_ITEM.map((g) => g.clave) : []
}

// Las tarjetas de la derecha, en el orden de uso: lo que se hace con el ítem (imágenes, stock, compras), lo que se consulta (documentos, historial, notas) y, al final, el contexto del
// proyecto (vehículo y cliente). Las compras, sólo con `repuestos.costos.ver`; «Vehículo y cliente», sólo donde hay un proyecto a la vista (no en la Cadena).
export const TARJETAS_DEL_ITEM = [
  'imagenes',
  'stock',
  'compras',
  'documentos',
  'historial',
  'notas',
  'proyecto',
] as const
export type ClaveDeTarjeta = (typeof TARJETAS_DEL_ITEM)[number]

export function tarjetasDelItem({
  costosVer,
  conProyecto,
}: {
  costosVer: boolean
  conProyecto: boolean
}): ClaveDeTarjeta[] {
  return TARJETAS_DEL_ITEM.filter((clave) => {
    if (clave === 'compras') return costosVer
    if (clave === 'proyecto') return conProyecto
    return true
  })
}
