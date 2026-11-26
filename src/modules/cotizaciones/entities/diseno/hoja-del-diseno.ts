// La hoja de la vista previa del diseño (4.22-5): lo que la hoja de cotizar dibujaría con el diseño que se está editando, armado en el navegador. Espeja `_cotizacion_hoja()`
// sin la parte de niveles, de `dato_del_vehiculo` ni de chips: la vista previa es la de quien lo ve todo (P4 a) y no lee tablas (P3 a). Puro y sin I/O; la hoja de verdad
// la arma la base y nada de aquí la reemplaza. Un ítem que apunta a un nodo que ya no existe se omite (`validarDiseno()` ya lo avisa en el editor).
import type { Tono } from '@/shared/ui/xcell'
import {
  aspectoDeCabecera,
  aspectoDeItem,
  aspectoDeItemConAncho,
  aspectoDeSeccion,
} from '../aspecto-de-la-hoja'
import { ayudaEnBloques } from '../ayuda-en-bloques'
import type { AyudaDeDiseno, Diseno, ItemDeDiseno } from '../diseno'
import type { Definicion } from '../formula'
import type { AyudaDeCelda, DisenoDeHoja, ItemDeHoja, NodoDeTarjeta, SeccionDeHoja } from '../hoja'
import { condicionDe, soloEnDe, type Nodo } from '../nodos'

// Un nodo sin formato propio se dibuja en dólares, como `coalesce(formato, 'usd')` de la base.
const formatoDe = (n: Nodo) => n.formato ?? 'usd'
// Los «Decimales» del nodo, como `_hoja_decimales()`: sólo si los trae.
const decimalesDe = (n: Nodo): { decimales?: number } =>
  n.decimales === undefined ? {} : { decimales: n.decimales }

// Sólo un nodo de valor tiene los dos: los demás tipos no condicionan ni piden nada.
const requeridoSiDe = (n: Nodo): string | null =>
  n.tipo === 'input' ? (n.requerido_si ?? null) : null

const FICHA_VACIA = { editable: true, motivo: null } as const

function tonoDe(n: Nodo, tonosDeGrupo: ReadonlyMap<string, string>): string | null {
  return n.grupo === undefined ? null : (tonosDeGrupo.get(n.grupo) ?? null)
}

function celdaDe(
  item: Extract<ItemDeDiseno, { tipo: 'celda' }>,
  n: Nodo,
  nodos: ReadonlyMap<string, Nodo>,
  tonosDeGrupo: ReadonlyMap<string, string>,
): ItemDeHoja {
  const pct =
    item.secundario !== undefined && n.tipo === 'calculo' && n.op === 'porcentaje_de'
      ? nodos.get(n.pct)
      : undefined
  return {
    ...FICHA_VACIA,
    tipo: 'celda',
    nodo: n.id,
    etiqueta: n.etiqueta,
    tipoDeNodo: n.tipo,
    formato: formatoDe(n),
    ...decimalesDe(n),
    ancho: item.ancho,
    ...aspectoDeItem(item),
    tono: tonoDe(n, tonosDeGrupo),
    ajustes: false,
    ayuda: ayudaDeLaVistaPrevia(item.ayuda),
    datoDelVehiculo: null,
    soloEn: soloEnDe(n)?.slice() ?? null,
    condicion: condicionDe(n) ?? null,
    requeridoSi: requeridoSiDe(n),
    secundario:
      item.secundario !== undefined && pct !== undefined
        ? {
            ...FICHA_VACIA,
            nodo: pct.id,
            tipoDeNodo: pct.tipo,
            como: item.secundario,
            formato: formatoDe(pct),
            ...decimalesDe(pct),
            ajustes: false,
          }
        : null,
  }
}

// La ayuda como la recibe la hoja (la de antes también, como bloques), sin recortes: la vista previa no tiene niveles ni tablas vivas (sin `casa` ni `id`).
function ayudaDeLaVistaPrevia(ayuda: AyudaDeDiseno | undefined): AyudaDeCelda | null {
  const bloques = ayudaEnBloques(ayuda)
  if (bloques.length === 0) return null
  return bloques.map((b) =>
    b.tipo !== 'tabla'
      ? b
      : {
          tipo: 'tabla',
          tabla: b.tabla,
          columnas:
            b.columnas?.map((c) => ({ columna: c.columna, llena: c.llena ?? null })) ?? null,
          resaltar: b.resaltar === true,
          casa: null,
          id: null,
        },
  )
}

function varianteDe(item: Extract<ItemDeDiseno, { tipo: 'variante' }>, n: Nodo): ItemDeHoja | null {
  if (n.tipo !== 'opcion') return null
  return {
    ...FICHA_VACIA,
    tipo: 'variante',
    nodo: n.id,
    etiqueta: n.etiqueta,
    opciones: n.opciones.map((o) => ({ clave: o.clave, etiqueta: o.etiqueta, titulo: o.titulo })),
    porDefecto: n.por_defecto ?? null,
    ...aspectoDeItemConAncho(item),
  }
}

// Un ítem del diseño como lo dibuja la hoja (nulo si su nodo no está en la fórmula). La tarjeta del total toma el nodo de `tarjeta_total`.
export function itemDe(
  item: ItemDeDiseno,
  nodos: ReadonlyMap<string, Nodo>,
  tonosDeGrupo: ReadonlyMap<string, string>,
  totalId: string,
): ItemDeHoja | null {
  const n = nodos.get(item.tipo === 'total' ? totalId : item.nodo)
  if (n === undefined) {
    return null
  }
  switch (item.tipo) {
    case 'celda':
      return celdaDe(item, n, nodos, tonosDeGrupo)
    case 'atajos':
      // Sin tablas no hay chips: la hoja no dibuja unos atajos vacíos.
      return { tipo: 'atajos', nodo: n.id, chips: [], ...aspectoDeItemConAncho(item) }
    case 'variante':
      return varianteDe(item, n)
    case 'interruptor':
      return {
        ...FICHA_VACIA,
        tipo: 'interruptor',
        nodo: n.id,
        etiqueta: n.etiqueta,
        efecto: item.efecto,
        soloEn: soloEnDe(n)?.slice() ?? null,
        ...aspectoDeItemConAncho(item),
      }
    case 'subtotal':
      return {
        tipo: 'subtotal',
        nodo: n.id,
        etiqueta: n.etiqueta,
        formato: formatoDe(n),
        ...decimalesDe(n),
        tono: tonoDe(n, tonosDeGrupo),
        ...aspectoDeItemConAncho(item),
      }
    case 'total':
      return {
        tipo: 'total',
        nodo: n.id,
        etiqueta: n.etiqueta,
        formato: formatoDe(n),
        ...decimalesDe(n),
        ...aspectoDeItemConAncho(item),
      }
    default: {
      const _: never = item
      return _
    }
  }
}

const nodoDeTarjeta = (id: string, nodos: ReadonlyMap<string, Nodo>): NodoDeTarjeta | null => {
  const n = nodos.get(id)
  return n === undefined
    ? null
    : { nodo: n.id, etiqueta: n.etiqueta, formato: formatoDe(n), ...decimalesDe(n) }
}

export type HojaDeLaVistaPrevia = DisenoDeHoja & { estado: 'lista' }

function tarjetaDeLaVistaPrevia(
  tarjeta: Diseno['tarjeta_total'],
  nodos: ReadonlyMap<string, Nodo>,
): HojaDeLaVistaPrevia['tarjetaTotal'] {
  const total = nodoDeTarjeta(tarjeta.nodo, nodos)
  return {
    nodo: total?.nodo ?? tarjeta.nodo,
    etiqueta: total?.etiqueta ?? '',
    formato: total?.formato ?? 'usd',
    ...(total?.decimales === undefined ? {} : { decimales: total.decimales }),
    secundarios: tarjeta.secundarios.flatMap((id) => nodoDeTarjeta(id, nodos) ?? []),
  }
}

// `tonos` es el catálogo de la empresa: la hoja de verdad manda sólo los que pinta (los de sus celdas y franjas, los de las secciones que dibuja y el de la
// cabecera), y una clave que el catálogo no tenga se descarta (la pieza cae al neutro).
export function hojaDeLaVistaPrevia(
  origen: { id: string; nombre: string },
  diseno: Diseno,
  definicion: Definicion,
  tonos: readonly Tono[],
): HojaDeLaVistaPrevia {
  const nodos = new Map(definicion.nodos.map((n) => [n.id, n]))
  const tonosDeGrupo = new Map((definicion.grupos ?? []).map((g) => [g.id, g.tono]))
  const secciones: SeccionDeHoja[] = diseno.secciones.flatMap((s) => {
    const items = s.items.flatMap(
      (i) => itemDe(i, nodos, tonosDeGrupo, diseno.tarjeta_total.nodo) ?? [],
    )
    return items.length === 0
      ? []
      : [
          {
            id: s.id,
            titulo: s.titulo ?? null,
            presentacion: s.presentacion,
            ...aspectoDeSeccion(s),
            items,
          },
        ]
  })
  const usados = new Set([
    ...secciones.flatMap((s) => [
      ...(s.tono === undefined ? [] : [s.tono]),
      ...s.items.flatMap((i) =>
        (i.tipo === 'celda' || i.tipo === 'subtotal') && i.tono !== null ? [i.tono] : [],
      ),
    ]),
    ...(diseno.cabecera.tono === undefined ? [] : [diseno.cabecera.tono]),
  ])
  return {
    estado: 'lista',
    origen,
    formula: { id: '', version: 0 },
    cabecera: {
      modos: diseno.cabecera.modos.map((m) => ({ clave: m.clave, nombre: m.nombre })),
      verTotalBs: diseno.cabecera.ver_total_bs,
      monedaBs: null,
      // La vista previa no tiene ⚙ de la cabecera (va `inert`); lo de por defecto, como lo trae el diseño.
      ajustes: false,
      modoPorDefecto: diseno.cabecera.modo_por_defecto ?? null,
      verTotalBsPorDefecto: diseno.cabecera.ver_total_bs_por_defecto ?? false,
      modosVisibles: diseno.cabecera.modos_visibles ?? null,
      ...aspectoDeCabecera(diseno.cabecera),
    },
    secciones,
    tarjetaTotal: tarjetaDeLaVistaPrevia(diseno.tarjeta_total, nodos),
    tonos: tonos.filter((t) => usados.has(t.clave)),
  }
}
