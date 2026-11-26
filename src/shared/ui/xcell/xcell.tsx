'use client'

// La celda de la hoja de cotizar (`docs/COTIZADOR.md` › «Binding con la XCell»). Dibuja y maneja UNA celda a partir de props: no lee la base y
// no calcula nada, dice «esta celda pasó a N» (`onCommit`) o «volver» (`onReset`) y la base recalcula (4.13). Ver `CLAUDE.md` de esta carpeta.
import { Fragment, memo, useId, useRef, type KeyboardEvent } from 'react'
import { useRegional } from '../regional'
import { AccionesDeXCell, PARADA_DE_ACCIONES_DESDE, RotuloDeXCell } from './cabecera-de-xcell'
import { RAIZ } from './clases'
import {
  accionesDe,
  candadosDe,
  estadosDe,
  notaDe,
  notasDe,
  type Candados,
  type FormatoDeXCell,
  type NotasDeXCell,
} from './estado'
import { LadoDeXCell } from './lado-de-xcell'
import { CalculadoDeXCell, NotaDeXCell } from './nota-de-xcell'
import { useToqueDeLaCelda } from './toque-de-xcell'
import { useEdicion, type DatosDeLado, type Lado } from './use-edicion'

export type XCellProps = {
  // El id del nodo de la fórmula: es lo que `onCommit` y `onReset` devuelven.
  id: string
  label: string
  format: FormatoDeXCell
  currency?: string | undefined
  // Sólo la vista; lo que se edita siempre lleva la precisión completa.
  decimals?: number | undefined
  value: number | null
  // Lo trae una constante o un tipo de cambio. Sin él, ↺ vuelve «al calculado» (con `handEdited`) o «al sugerido».
  defaultValue?: number | null | undefined
  suggested: boolean
  // `fuentes[id] === 'override'`: la persona cambió un default o un sugerido.
  overridden: boolean
  // Lo escrito pisó un cálculo (`docs/COTIZADOR.md` › «Pisar un cálculo»): la marca «Editado a mano» y, con `calculatedValue`, lo que daría sin lo escrito
  // («Calculado: $480», en `calculatedFormat` y `calculatedDecimals`; `null` es «—»). Sin `calculatedValue` (el recálculo no llegó), sólo la marca.
  handEdited?: boolean | undefined
  calculatedValue?: number | null | undefined
  calculatedFormat?: FormatoDeXCell | undefined
  calculatedDecimals?: number | undefined
  // El candado (en las acciones, con el motivo de nombre y de descripción del lado); la celda se lee y se alcanza con el teclado, pero no abre la edición. En un par es el del principal: cada lado tiene el suyo.
  disabledReason?: string | undefined
  // El candado del secundario de un par (4.13-3c); sin él, el porcentaje se edita aunque el monto esté bloqueado.
  secondaryDisabledReason?: string | undefined
  // La clave de un tono de la empresa; una desconocida cae al neutro.
  tone?: string | undefined
  // El mensaje de la base sobre lo que se guardó (rango, obligatorio): la celda no valida nada de eso.
  error?: string | undefined
  // El par porcentaje–monto es UNA celda con su secundario, editable por los dos lados.
  secondaryId?: string | undefined
  secondaryValue?: number | null | undefined
  secondaryFormat?: FormatoDeXCell | undefined
  secondaryDecimals?: number | undefined
  // El secundario es el que se lee primero (el diseño dice `secundario: 'monto'`: el % es el valor de la celda, como «14.94 % $181»): va primero, en
  // grande, y el principal detrás, chico. Sólo cambia el aspecto y el orden: cada lado emite con su id, como siempre.
  secondaryProminent?: boolean | undefined
  // La ayuda de la celda (una tabla o un texto: lo que abre lo decide la hoja) y el ⚙ (cambia el valor por defecto, global). Banderas y callbacks
  // aparte: la hoja pasa los MISMOS callbacks a todas las celdas y el `memo` aguanta. La celda no decide permisos y no mueve el foco al accionarlas.
  hasHelp?: boolean | undefined
  hasSettings?: boolean | undefined
  onHelp?: ((id: string) => void) | undefined
  onSettings?: ((id: string) => void) | undefined
  onCommit: (id: string, valor: number | null) => void
  onReset: (id: string) => void
}

function moverParada(raiz: HTMLElement, desde: HTMLElement, paso: 1 | -1) {
  const paradas = [...raiz.querySelectorAll<HTMLElement>('[data-parada]')].sort(
    (a, b) => Number(a.dataset['parada']) - Number(b.dataset['parada']),
  )
  paradas[paradas.indexOf(desde) + paso]?.focus()
}

// El valor de cada lado: el que dice el binding o el del secundario del par.
function datosDeLado(props: XCellProps, lado: Lado): DatosDeLado {
  const { id, format, value, decimals, secondaryId, secondaryFormat } = props
  if (lado === 'principal' || secondaryId === undefined || secondaryFormat === undefined) {
    return { id, formato: format, valor: value, decimales: decimals }
  }
  return {
    id: secondaryId,
    formato: secondaryFormat,
    valor: props.secondaryValue ?? null,
    decimales: props.secondaryDecimals,
  }
}

// Las flechas son de la celda: moverse entre sus paradas (los valores, el candado y los botones de acción). Las acciones y el candado no son paradas de
// Tab (`tabIndex -1`), así Tab va de valor en valor.
function teclasDeLaCelda(evento: KeyboardEvent<HTMLDivElement>, valor: HTMLElement | null) {
  const objetivo = evento.target
  if (!(objetivo instanceof HTMLElement) || objetivo.dataset['parada'] === undefined) {
    return
  }
  if (evento.key === 'ArrowRight' || evento.key === 'ArrowLeft') {
    evento.preventDefault()
    moverParada(evento.currentTarget, objetivo, evento.key === 'ArrowRight' ? 1 : -1)
  } else if (
    evento.key === 'Escape' &&
    Number(objetivo.dataset['parada']) >= PARADA_DE_ACCIONES_DESDE
  ) {
    evento.stopPropagation()
    valor?.focus()
  }
}

// El orden en que se ven (y se recorren con Tab y las flechas) los lados: el grande primero.
function ordenDeLados(hayPar: boolean, secundarioPrimero: boolean | undefined): Lado[] {
  if (!hayPar) {
    return ['principal']
  }
  return secundarioPrimero === true ? ['secundario', 'principal'] : ['principal', 'secundario']
}

// Lo que va escrito en la línea de la nota, dentro de la celda y justo después del rótulo en el DOM (el orden en que se ve y se lee): el aviso de lo tipeado
// o el error y, en una celda pisada, lo que daría sin lo escrito.
function PieDeXCell({ notas, props }: { notas: NotasDeXCell; props: XCellProps }) {
  return (
    <>
      {notas.aviso === undefined ? null : (
        <NotaDeXCell id={notas.aviso.id} nota={notas.aviso.nota} />
      )}
      {notas.calculado === undefined ? null : (
        <CalculadoDeXCell
          id={notas.calculado}
          valor={props.calculatedValue ?? null}
          formato={props.calculatedFormat ?? props.format}
          moneda={props.currency}
          decimales={props.calculatedDecimals}
        />
      )}
    </>
  )
}

// El aviso de lo tipeado que no se leyó o, si no hay, el error de la base; en una celda pisada, la marca y lo calculado. Con sus ids y a quién describen.
function notasDeLaCelda(
  uid: string,
  props: XCellProps,
  tipeado: string | null | undefined,
  candados: Candados,
) {
  return notasDe(uid, notaDe(tipeado, props.error), candados, {
    marca: props.handEdited === true,
    calculado: props.calculatedValue !== undefined,
  })
}

function XCellBase(props: XCellProps) {
  const { id, label, currency, suggested, overridden, onReset } = props
  const { locale } = useRegional()
  const uid = useId()
  const principalRef = useRef<HTMLElement | null>(null)

  const hayPar = props.secondaryId !== undefined && props.secondaryFormat !== undefined
  const { candados, toda } = candadosDe(props.disabledReason, props.secondaryDisabledReason, hayPar)
  const bloqueado = (cual: Lado) => candados[cual] !== undefined
  const acciones = accionesDe({ ...props, bloqueada: toda !== undefined })
  const estados = estadosDe({ suggested, overridden, disabledReason: toda })

  const edicion = useEdicion({
    ladoDe: (lado) => datosDeLado(props, lado),
    bloqueado,
    locale,
    onCommit: props.onCommit,
  })
  const notas = notasDeLaCelda(uid, props, edicion.edicion?.aviso, candados)
  const orden = ordenDeLados(hayPar, props.secondaryProminent)
  const toque = useToqueDeLaCelda(orden, bloqueado, edicion.edicion !== null, notas.candadoDe)

  const lado = (cual: Lado) => (
    <LadoDeXCell
      lado={cual}
      datos={datosDeLado(props, cual)}
      etiqueta={label}
      moneda={currency}
      idDelBoton={`${uid}${cual === 'principal' ? 'p' : 's'}`}
      idDeLaEtiqueta={`${uid}e`}
      idDeLaNota={notas.deLado[cual]}
      idDeLaNotaDeLaEntrada={notas.deLaEntrada}
      grande={orden[0] === cual}
      parada={orden.indexOf(cual)}
      bloqueada={bloqueado(cual)}
      blanco={toque.blanco === cual}
      alBloqueado={toque.mostrarMotivo}
      soloEsteLado={bloqueado(cual) && toda === undefined}
      conAtajo={acciones.hay}
      principalRef={principalRef}
      edicion={edicion}
    />
  )

  return (
    <div
      role="group"
      aria-label={label}
      data-xcell=""
      data-tono={props.tone}
      data-estado={estados}
      data-par={hayPar ? '' : undefined}
      data-aviso={notas.aviso?.nota.texto}
      className={`group/xc ${RAIZ}`}
      onKeyDown={(evento) => {
        teclasDeLaCelda(evento, principalRef.current)
      }}
      {...toque.manejadores}
    >
      <RotuloDeXCell
        idDeLaEtiqueta={`${uid}e`}
        label={label}
        sugerido={estados.includes('sugerido')}
      />
      <PieDeXCell notas={notas} props={props} />
      {orden.map((cual) => (
        <Fragment key={cual}>{lado(cual)}</Fragment>
      ))}
      <AccionesDeXCell
        label={label}
        marca={notas.marca}
        candados={notas.candados}
        alAyudar={acciones.alAyudar}
        alAjustar={acciones.alAjustar}
        restablecer={acciones.restablecer}
        alRestablecer={() => {
          // El foco pasa al valor antes de que ↺ desaparezca.
          principalRef.current?.focus()
          onReset(id)
        }}
      />
    </div>
  )
}

export const XCell = memo(XCellBase)
