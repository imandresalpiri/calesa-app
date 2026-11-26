'use client'

import { Button } from '@/shared/ui/button'
import { useLive } from '@/shared/ui/live'
import { filaDe } from '../../../../../entities/formula/hoja-de-la-planilla'
import { nombreDeLaCelda } from '../../../../../entities/formula/texto-de-la-celda'
import { useGrillaQuieta } from '../../../hooks/use-grilla-quieta'
import type { Planilla } from '../../../hooks/use-planilla'
import { idsDeLaEdicion } from '../ids-de-la-edicion'
import { esMontoQueSeEscribe } from '../monto-secreto'
import { AccionesDeLaBarraDeFormula } from './acciones-de-la-barra-de-formula'
import { ErrorBajoLaBarra } from './error-bajo-la-barra'
import { LeyendaDeReferencias } from './leyenda-de-referencias'
import { LineaBajoLaBarra, RENGLON_BAJO_LA_BARRA } from './linea-bajo-la-barra'
import { ListaDeSugerencias } from './lista-de-sugerencias'
import { RenglonDeLaEdicion } from './renglon-de-la-edicion'
import { BotonDeFunciones } from './boton-de-funciones'
import { EJEMPLO_DE_LA_BARRA, TextoDeLaBarra } from './texto-de-la-barra'

type Props = { planilla: Planilla; puedeCambiarTiposDeCambio: boolean }

const CAJA_QUIETA =
  'min-h-[44px] min-w-0 rounded-(--radius-md) border border-dashed border-(--color-line) px-3 py-2.5 text-(length:--text-sm) text-(--color-ink-soft) break-words md:pointer-fine:min-h-9 md:pointer-fine:py-1.5'
const BOTON = 'min-h-[44px] md:pointer-fine:min-h-9'

// Lo que la barra muestra de la celda activa: su texto si se escribe; si no, por qué (o un monto con el Modo Live). Nulo hasta que se elige una celda.
function textoDeLaCelda(planilla: Planilla, live: boolean) {
  const { cuadricula, edicion, hoja } = planilla
  const celda = edicion.edicion ?? cuadricula.activaElegida
  if (celda === null) return null
  const fila = filaDe(hoja, hoja.numeroDe.get(celda.id) ?? 0)
  if (fila === undefined) return null
  const nombre = `${nombreDeLaCelda(celda.col, fila.numero)}, ${fila.nodo.etiqueta}`
  const t = planilla.textoDe(celda)
  const quieto =
    live && esMontoQueSeEscribe(fila.nodo, celda.col)
      ? 'Con el Modo Live, el monto se escribe en la celda.'
      : t.editable
        ? null
        : t.motivo
  return { celda, fila, nombre, texto: t.editable ? t.texto : '', quieto }
}

// Con algo escrito: «Aplicar» (sin mover la celda activa) y «Descartar».
function AplicarODescartar({ planilla }: { planilla: Planilla }) {
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      <Button
        type="button"
        className={BOTON}
        onClick={() => {
          planilla.aplicarYSeguir(null)
        }}
      >
        Aplicar
      </Button>
      <Button type="button" variant="outline" className={BOTON} onClick={planilla.descartar}>
        Descartar
      </Button>
    </div>
  )
}

// La barra de fórmula (D15, D16), como la de Excel: la celda activa («C5», «Ejemplo 5»), `fx ▾` (las funciones), lo que se escribe con sus referencias de color
// (vacío, la única guía: «Escribe = y toca las celdas: =C5+C7»), su leyenda, el autocompletar y el error con su salida; escribiendo, «Aplicar» y «Descartar». A la
// derecha, «?» (los tipos de celda). Debajo, un renglón: sin nada escrito, de dónde sale la fila elegida; escribiendo, la firma en el cursor o la guía de tocar.
// Va pegada arriba (también en el celular).
export function BarraDeFormula({ planilla, puedeCambiarTiposDeCambio }: Props) {
  const { live } = useLive()
  const e = planilla.edicion.edicion
  const ids = idsDeLaEdicion(planilla.prefijo)
  const activa = textoDeLaCelda(planilla, live)
  const caja = useGrillaQuieta()
  return (
    <section
      ref={caja}
      aria-label="Barra de fórmula"
      data-barra-de-formula=""
      className="sticky top-(--topbar) z-20 grid min-w-0 gap-1.5 border-b border-(--color-line) bg-(--color-surface) py-2"
    >
      {/* En una línea sólo si cabe: con un panel al costado la planilla se angosta y la fila se parte en vez de meterse debajo del panel. */}
      <div className="flex min-w-0 flex-wrap items-start gap-2 @2xl/formula:flex-nowrap">
        <span
          data-celda-de-la-barra=""
          className="flex min-h-[44px] w-auto min-w-14 shrink-0 items-center justify-center rounded-(--radius-md) border border-(--color-line) px-2 font-mono text-(length:--text-sm) whitespace-nowrap md:pointer-fine:min-h-9"
        >
          {activa === null ? '—' : nombreDeLaCelda(activa.celda.col, activa.fila.numero)}
        </span>
        <BotonDeFunciones funcion={planilla.funcion} />
        <div className="min-w-0 flex-1 basis-60">
          {activa === null ? (
            <p className={CAJA_QUIETA}>{EJEMPLO_DE_LA_BARRA}</p>
          ) : activa.quieto !== null && e === null ? (
            <p className={CAJA_QUIETA}>{activa.quieto}</p>
          ) : (
            <TextoDeLaBarra
              planilla={planilla}
              celda={activa.celda}
              nombre={activa.nombre}
              texto={activa.texto}
            />
          )}
        </div>
        {e === null ? null : <AplicarODescartar planilla={planilla} />}
        <AccionesDeLaBarraDeFormula paneles={planilla.paneles} />
      </div>
      <LeyendaDeReferencias leyenda={planilla.leyenda} anuncio={planilla.anuncio} />
      <ListaDeSugerencias sugerencias={planilla.sugerencias} ids={ids} />
      {e?.error == null ? null : (
        <ErrorBajoLaBarra
          id={ids.error}
          error={e.error}
          nodos={planilla.calculo.dicho.nodos}
          alMover={planilla.edicion.moverYAplicar}
          alPisar={() => {
            planilla.aplicarYSeguir(null, false, true)
          }}
        />
      )}
      {/* El renglón siempre está: sin celda elegida, reservado (si no, el primer clic lo agrega, la grilla baja y el segundo clic de un doble clic cae en otra
          fila); escribiendo, la firma o la guía de tocar. */}
      {e !== null ? (
        <RenglonDeLaEdicion planilla={planilla} />
      ) : activa === null ? (
        <div data-linea-bajo-la-barra="" aria-hidden className={RENGLON_BAJO_LA_BARRA} />
      ) : (
        <LineaBajoLaBarra
          planilla={planilla}
          fila={activa.fila}
          puedeCambiarTiposDeCambio={puedeCambiarTiposDeCambio}
        />
      )}
    </section>
  )
}
