'use client'

import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { Diseno, Posicion } from '../../../../entities/diseno'
import type { Nombrar } from '../../../../entities/diseno/anuncios-de-la-rejilla'
import { lugarDe } from '../../../../entities/diseno/lugar-en-la-rejilla'
import type { PiezaDeLaHoja } from '../../../../entities/diseno/pieza-de-la-hoja'
import {
  opcionesDelLugar,
  type OpcionDelLugar,
  type OpcionesDelLugar,
  type TamanoPedido,
} from '../../../../entities/diseno/tamano-en-la-rejilla'
import type { PiezaEnLaRejilla } from '../../../../entities/rejilla-de-la-hoja'
import {
  ANCHO_AUTOMATICO,
  AUTOMATICO,
  CAMPOS_DEL_LUGAR,
  errorDe,
  etiquetaDelLugar,
  type ErrorDelAspecto,
} from './etiquetas-del-aspecto'

export type PropsDelLugar = {
  // El prefijo de los nombres de sus campos.
  base: string
  pieza: PiezaDeLaHoja
  diseno: Diseno
  nombrar: Nombrar
  ocupado: boolean
  error: ErrorDelAspecto
  // Una sección: sin ancho es «Automática», y el «Ancho» lo ofrece.
  automatica?: boolean
  alMover: (posicion: Posicion) => void
  alCambiarTamano: (pedido: TamanoPedido) => void
}

type Opcion = { valor: string; etiqueta: string; deshabilitada: boolean }

type Campo = {
  clave: keyof typeof CAMPOS_DEL_LUGAR
  opciones: readonly Opcion[]
  valor: string
  alElegir: (valor: string) => void
}

const opcionDe = (o: OpcionDelLugar, etiqueta = etiquetaDelLugar(o)): Opcion => ({
  valor: String(o.valor),
  etiqueta,
  deshabilitada: o.motivo !== null,
})

// «Automático» es el ancho de 6 de una sección sin ancho: entra si entran sus 6 columnas.
function opcionesDelAncho(opciones: OpcionesDelLugar, automatica: boolean | undefined) {
  const numeros = opciones.ancho.map((o) => opcionDe(o))
  const seis = opciones.ancho[5]
  if (automatica === undefined || seis === undefined) return numeros
  const etiqueta = seis.motivo === null ? ANCHO_AUTOMATICO : `${ANCHO_AUTOMATICO} — ${seis.motivo}`
  return [{ ...opcionDe(seis, etiqueta), valor: AUTOMATICO }, ...numeros]
}

function camposDelLugar(
  props: PropsDelLugar,
  lugar: PiezaEnLaRejilla,
  opciones: OpcionesDelLugar,
): Campo[] {
  const { posicion } = lugar
  const { alMover, alCambiarTamano, automatica } = props
  return [
    {
      clave: 'columna',
      opciones: opciones.columna.map((o) => opcionDe(o)),
      valor: String(posicion.columna),
      alElegir: (v) => {
        alMover({ ...posicion, columna: Number(v) })
      },
    },
    {
      clave: 'fila',
      opciones: opciones.fila.map((o) => opcionDe(o)),
      valor: String(posicion.fila),
      alElegir: (v) => {
        alMover({ ...posicion, fila: Number(v) })
      },
    },
    {
      clave: 'ancho',
      opciones: opcionesDelAncho(opciones, automatica),
      valor: automatica === true ? AUTOMATICO : String(lugar.ancho),
      alElegir: (v) => {
        alCambiarTamano({ ancho: v === AUTOMATICO ? 'automatica' : Number(v) })
      },
    },
    {
      clave: 'alto',
      opciones: opciones.alto.map((o) => opcionDe(o)),
      valor: String(lugar.alto),
      alElegir: (v) => {
        alCambiarTamano({ alto: Number(v) })
      },
    },
  ]
}

// El lugar de una pieza en su rejilla: «Columna», «Fila», «Ancho» y «Alto» en una fila (en dos, si el inspector es angosto). Cada opción que no entra va
// apagada con su motivo («7 — se pisa con «Flete»»): cambiar uno nunca mueve ni achica a otra pieza (`opcionesDelLugar()`). El bloque «Avanzado» sólo tiene
// «Fila» (ocupa la fila entera); una avanzada, nada (va en el orden de su lista, a todo el ancho).
export function CamposDelLugar(props: PropsDelLugar) {
  const { base, pieza, diseno, nombrar, ocupado, error } = props
  const actual = lugarDe(diseno, pieza)
  const opciones = opcionesDelLugar(diseno, pieza, nombrar)
  if (actual === null || opciones === null || actual.espacio.tipo === 'avanzadas') return null
  const campos = camposDelLugar(props, actual.pieza, opciones).filter(
    (c) => pieza.pieza !== 'bloque-avanzado' || c.clave === 'fila',
  )
  return (
    <div data-lugar-de-la-pieza="" className="grid min-w-0 grid-cols-2 gap-2 @sm:grid-cols-4">
      {campos.map((c) => {
        const mensaje = errorDe(error, c.clave)
        return (
          <CampoSeleccion
            key={c.clave}
            nombre={`${base}-lugar-${c.clave}`}
            etiqueta={CAMPOS_DEL_LUGAR[c.clave]}
            opciones={c.opciones}
            value={c.valor}
            disabled={ocupado}
            {...(mensaje === undefined ? {} : { error: mensaje })}
            onChange={(evento) => {
              c.alElegir(evento.target.value)
            }}
          />
        )
      })}
    </div>
  )
}
