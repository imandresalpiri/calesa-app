'use client'

import { Trash2Icon } from 'lucide-react'
import {
  ETIQUETA_DE_ACCION_DE_COTIZACION,
  ETIQUETA_DE_REPORTAR_SI_YA_REPORTO,
  accionesDeCotizacion,
  type ClaveDeAccionDeCotizacion,
  type MenuDeUnaFila,
} from '@/modules/cotizaciones/pantallas/listado'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'

// Lo que pasa al elegir cada acción: lo decide quien compone la pantalla (`listado-con-acciones.tsx`), con las actions y los diálogos de cada área.
export type AccionesDeLaFila = {
  compartir: () => void
  aprobar: () => void
  marcarFinal: () => void
  // Hacerla privada (`true`) o pública (`false`): sólo la ofrece a quien la creó.
  cambiarPrivada: (privada: boolean) => void
  favorita: (valor: boolean) => void
  reportar: () => void
  moderar: (accion: 'invalidar' | 'descartar' | 'reactivar') => void
  enviarALaPapelera: () => void
}

type Props = {
  cotizacion: { id: string; numero: number }
  menu: MenuDeUnaFila
  // La favorita como se ve ahora (con lo tocado antes de que responda la base).
  favorita: boolean
  // Algo de esta fila está en vuelo (aprobar, enviar, la favorita): lo que se manda se apaga para no mandarlo dos veces.
  enCurso: { general: boolean; favorita: boolean }
  acciones: AccionesDeLaFila
  // La tarjeta de la lista ya tiene «Compartir» como acción principal: su «⋯» no lo repite.
  sinCompartir?: boolean
  // En la barra del resumen, junto a «Abrir» y «Compartir»: con borde y de su alto (`MasAcciones conBorde`).
  conBorde?: boolean
}

type Contexto = Props & { motivo: (clave: ClaveDeAccionDeCotizacion) => string | null }

type Constructor = (c: Contexto) => AccionDeMenu[]

const nota = (clave: string, motivo: string | null): AccionDeMenu[] =>
  motivo === null ? [] : [{ tipo: 'nota', clave: `motivo-${clave}`, texto: motivo }]

// Una acción que abre un diálogo: «…» al final, y espera a que el menú se cierre para que el foco que vuelve al botón no lo cierre.
function conDialogo(clave: ClaveDeAccionDeCotizacion, alElegir: () => void): Constructor {
  return (c) => [
    {
      tipo: 'accion',
      clave,
      etiqueta:
        clave === 'reportar' && c.menu.miMotivo !== null
          ? ETIQUETA_DE_REPORTAR_SI_YA_REPORTO
          : ETIQUETA_DE_ACCION_DE_COTIZACION[clave],
      despuesDeCerrar: true,
      deshabilitada: c.motivo(clave) !== null,
      alElegir,
    },
    ...nota(clave, c.motivo(clave)),
  ]
}

// «Hacer privada» / «Hacer pública»: sin diálogo; apagada mientras algo de la fila está en vuelo o con el motivo que la base daría (una final, la aprobada).
function lineaDePrivada(clave: 'hacer-privada' | 'hacer-publica', c: Contexto): AccionDeMenu[] {
  return [
    {
      tipo: 'accion',
      clave,
      etiqueta: ETIQUETA_DE_ACCION_DE_COTIZACION[clave],
      deshabilitada: c.enCurso.general || c.motivo(clave) !== null,
      alElegir: () => {
        c.acciones.cambiarPrivada(clave === 'hacer-privada')
      },
    },
    ...nota(clave, c.motivo(clave)),
  ]
}

// Las que el listado ofrece: las demás de la lista única (vista previa, PDF, revisiones, comprobante, cotizar encima) son sólo del «⋯» de la guardada.
type ClaveDeLaFila = Exclude<
  ClaveDeAccionDeCotizacion,
  'vista-previa' | 'pdf' | 'revisiones' | 'comprobante' | 'encima'
>

// Cada acción de la lista (`accionesDeCotizacion()`), con lo que hace en esta superficie.
const LINEAS: Readonly<Record<ClaveDeLaFila, Constructor>> = {
  compartir: (c) => conDialogo('compartir', c.acciones.compartir)(c),
  // Una privada abre la pregunta de que deja de serlo: «Aprobar…» y, como todo lo que abre un diálogo, después de cerrar el menú.
  aprobar: (c) => [
    {
      tipo: 'accion',
      clave: 'aprobar',
      etiqueta: `${ETIQUETA_DE_ACCION_DE_COTIZACION.aprobar}${c.menu.privada ? '…' : ''}`,
      ...(c.menu.privada ? { despuesDeCerrar: true } : {}),
      deshabilitada: c.enCurso.general || c.motivo('aprobar') !== null,
      alElegir: c.acciones.aprobar,
    },
    ...nota('aprobar', c.motivo('aprobar')),
  ],
  final: (c) => conDialogo('final', c.acciones.marcarFinal)(c),
  'hacer-privada': (c) => lineaDePrivada('hacer-privada', c),
  'hacer-publica': (c) => lineaDePrivada('hacer-publica', c),
  favorita: (c) => [
    {
      tipo: 'casilla',
      clave: 'favorita',
      etiqueta: ETIQUETA_DE_ACCION_DE_COTIZACION.favorita,
      marcada: c.favorita,
      deshabilitada: c.enCurso.favorita,
      alCambiar: c.acciones.favorita,
    },
  ],
  reportar: (c) => conDialogo('reportar', c.acciones.reportar)(c),
  invalidar: (c) =>
    conDialogo('invalidar', () => {
      c.acciones.moderar('invalidar')
    })(c),
  descartar: (c) =>
    conDialogo('descartar', () => {
      c.acciones.moderar('descartar')
    })(c),
  reactivar: (c) =>
    conDialogo('reactivar', () => {
      c.acciones.moderar('reactivar')
    })(c),
  papelera: (c) => [
    {
      tipo: 'accion',
      clave: 'papelera',
      etiqueta: ETIQUETA_DE_ACCION_DE_COTIZACION.papelera,
      icono: <Trash2Icon aria-hidden />,
      destructiva: true,
      deshabilitada: c.enCurso.general,
      alElegir: c.acciones.enviarALaPapelera,
    },
  ],
}

const esDeLaFila = (clave: ClaveDeAccionDeCotizacion): clave is ClaveDeLaFila => clave in LINEAS

// El «⋯» de una cotización del listado, en la fila de la tabla, en la tarjeta de la lista y en la barra del resumen: la lista de siempre (`accionesDeCotizacion()`), por bloques y con un separador
// entre ellos. Lo que quien mira no puede hacer no está; lo que se sabe que la base rechazaría se ve apagado con su motivo. En la tarjeta y el resumen no se ofrece
// «Compartir cotización…» (`sinCompartir`: ya está a la vista). Sin nada que ofrecer no se dibuja.
export function MenuDeLaFila(props: Props) {
  const { cotizacion, menu, sinCompartir = false, conBorde = false } = props
  const bloques = accionesDeCotizacion(
    sinCompartir ? { ...menu.ofertas, compartir: undefined } : menu.ofertas,
  )
  if (bloques.length === 0) {
    return null
  }
  const contexto: Contexto = { ...props, motivo: (clave) => menu.ofertas[clave]?.motivo ?? null }
  const acciones = bloques.flatMap((bloque, indice) => [
    ...(indice > 0 ? [{ tipo: 'separador' as const, clave: `separador-${String(indice)}` }] : []),
    ...bloque.flatMap((clave) => (esDeLaFila(clave) ? LINEAS[clave](contexto) : [])),
  ])
  return (
    <MasAcciones
      nombre={`N.º ${String(cotizacion.numero)}`}
      id={cotizacion.id}
      acciones={acciones}
      conBorde={conBorde}
    />
  )
}
