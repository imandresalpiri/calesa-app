// La lectura del lienzo del editor: la cuadrícula de trabajo con lo que nombra, como la entrega `cotizacion_tarjeta` (`LecturaEnCuadricula`), armada con el contexto
// reducido y el catálogo. Se recalcula en cada cambio. Los nombres de los tipos de cambio son la etiqueta de su nodo (la base nombra el de `tipos_cambio`). La variante
// va siempre que es del nivel «todos»: dice qué opción hace que una fila no aplique. Pura y plana. Todo por id va por `Map`.
import type { LecturaEnCuadricula, PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import { conNodoYMostrar, datosNombrados } from './datos-de-la-cuadricula'
import type { TonoDelCatalogo } from './lectura-de-la-plantilla'
import { pctDelPar, pctsDeLosPares } from './nodos-de-cuadricula'
import { esDeTodos, type NodoParaPlantilla } from './nodos-de-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'

type DatoDeNodo = { nodo: string; mostrar: string }

// Los «Decimales» del nodo, como `_hoja_decimales()` en `cotizacion_tarjeta`: sólo un número (la forma de la fórmula ya lo validó).
const decimalesDe = (n: NodoParaPlantilla | undefined): number | undefined =>
  typeof n?.decimales === 'number' ? n.decimales : undefined

// Lo que la cuadrícula muestra de un nodo: en una celda, en su lista de respaldo, en sus condiciones (sobre un dato) o en una rama.
const datosDe = (p: PlantillaEnCuadricula): DatoDeNodo[] => conNodoYMostrar(datosNombrados(p))

const usaLaVariable = (p: PlantillaEnCuadricula, variable: string) =>
  datosNombrados(p).some((d) => d.variable === variable)

function tiposDeCambio(
  datos: readonly DatoDeNodo[],
  contexto: ContextoDePlantilla,
  nodos: ReadonlyMap<string, NodoParaPlantilla>,
): LecturaEnCuadricula['tiposDeCambio'] {
  const grupos = new Map((contexto.definicion.grupos ?? []).map((g) => [g.id, g]))
  const buckets = new Set(
    datos.flatMap((d) => {
      if (d.mostrar !== 'tc_nombre' && d.mostrar !== 'tc_valor') return []
      const grupo = nodos.get(d.nodo)?.grupo
      const bucket = grupo == null ? null : grupos.get(grupo)?.bucket
      return bucket == null ? [] : [bucket]
    }),
  )
  const nombre = (nodo: string | null) =>
    nodo === null ? null : (nodos.get(nodo)?.etiqueta ?? nodo)
  const deOmision = contexto.definicion.buckets ?? {}
  return {
    buckets: [...buckets].map((bucket) => {
      const nodo = Object.hasOwn(deOmision, bucket) ? (deOmision[bucket] ?? null) : null
      return { bucket, nombre: nombre(nodo), nodo }
    }),
    modos: (contexto.diseno?.cabecera?.modos ?? []).flatMap((m) =>
      (m.buckets ?? []).flatMap((b) =>
        buckets.has(b.bucket) && m.clave != null
          ? [{ modo: m.clave, bucket: b.bucket, nombre: nombre(b.nodo), nodo: b.nodo }]
          : [],
      ),
    ),
  }
}

function varianteDe(
  contexto: ContextoDePlantilla,
  nodos: readonly NodoParaPlantilla[],
): LecturaEnCuadricula['variante'] {
  const opcion = nodos.find((n) => n.tipo === 'opcion')
  if (opcion === undefined || !esDeTodos(contexto.visibilidad ?? {}, opcion.id)) return null
  return {
    nodo: opcion.id,
    opciones: (opcion.opciones ?? []).map((o) => ({ clave: o.clave, titulo: o.titulo })),
  }
}

// Los nodos que nombran las filas y las celdas (también los de sus condiciones), con lo que la tarjeta dibuja de ellos (el `pct` de su par sólo si se muestra su
// porcentaje).
function nodosNombrados(
  p: PlantillaEnCuadricula,
  nodos: ReadonlyMap<string, NodoParaPlantilla>,
  pcts: ReadonlySet<string>,
): LecturaEnCuadricula['nodos'] {
  const datos = datosDe(p)
  const conPorcentaje = new Set(datos.filter((d) => d.mostrar === 'porcentaje').map((d) => d.nodo))
  const ids = new Set(datosNombrados(p).flatMap((d) => (d.nodo === null ? [] : [d.nodo])))
  return [...ids].map((id) => {
    const n = nodos.get(id)
    const pct = conPorcentaje.has(id) ? pctDelPar(n, pcts) : null
    const decimales = decimalesDe(n)
    const delPct = pct === null ? undefined : decimalesDe(nodos.get(pct))
    return {
      id,
      etiqueta: n?.etiqueta || id,
      descripcion: n?.descripcion ?? null,
      grupo: n?.grupo ?? null,
      pct,
      ...(decimales === undefined ? {} : { decimales }),
      ...(delPct === undefined ? {} : { decimalesDelPct: delPct }),
    }
  })
}

// Los grupos de un nodo con `tc_*` o `plazo`.
function gruposNombrados(
  p: PlantillaEnCuadricula,
  contexto: ContextoDePlantilla,
  nodos: ReadonlyMap<string, NodoParaPlantilla>,
): LecturaEnCuadricula['grupos'] {
  const conGrupo = new Set(
    datosDe(p).flatMap((d) => {
      const grupo = nodos.get(d.nodo)?.grupo
      return ['tc_nombre', 'tc_valor', 'plazo'].includes(d.mostrar) && grupo != null ? [grupo] : []
    }),
  )
  return (contexto.definicion.grupos ?? [])
    .filter((g) => conGrupo.has(g.id))
    .map((g) => ({
      id: g.id,
      etiqueta: g.etiqueta || g.id,
      plazo: typeof g.plazo === 'string' && g.plazo !== '' ? g.plazo : null,
      bucket: g.bucket ?? null,
    }))
}

export function lecturaEnCuadricula(
  cuadricula: PlantillaEnCuadricula,
  contexto: ContextoDePlantilla,
  tonos: readonly TonoDelCatalogo[],
): LecturaEnCuadricula {
  const lista = contexto.definicion.nodos ?? []
  const nodos = new Map(lista.map((n) => [n.id, n]))
  const usados = new Set(cuadricula.celdas.flatMap((c) => [c.estilo?.fondo, c.estilo?.texto]))
  return {
    definicion: cuadricula,
    nodos: nodosNombrados(cuadricula, nodos, pctsDeLosPares(lista)),
    grupos: gruposNombrados(cuadricula, contexto, nodos),
    tiposDeCambio: tiposDeCambio(datosDe(cuadricula), contexto, nodos),
    modos: usaLaVariable(cuadricula, 'modo_tc')
      ? (contexto.diseno?.cabecera?.modos ?? []).flatMap((m) =>
          m.clave == null ? [] : [{ clave: m.clave, nombre: m.nombre ?? m.clave }],
        )
      : [],
    variante: varianteDe(contexto, lista),
    colores: tonos.flatMap((t) =>
      usados.has(t.clave) && t.hex !== undefined ? [{ clave: t.clave, hex: t.hex }] : [],
    ),
    total: { nodo: lista.find((n) => n.salida === 'total')?.id ?? null },
  }
}
