'use client'

import { useState, type PointerEvent } from 'react'
import { useLive } from '@/shared/ui/live'
import type { PlantillaEnCuadricula } from '../../../../entities/cuadricula-de-la-tarjeta'
import type { Geometria } from '../../../../entities/tarjeta/geometria-de-la-tarjeta'
import {
  campoTapadoPorLive,
  MOTIVO_DEL_TEXTO_CON_UN_MONTO,
} from '../../../../entities/tarjeta/retoques/live-del-modo'
import { filaEnY } from '../../../../entities/tarjeta/retoques/modo-de-la-tarjeta'
import type { ModoRetocar } from '../../hooks/use-modo-retocar'
import { useTarjetaRetocable } from '../../hooks/use-tarjeta-retocable'
import { TarjetaDeCotizacion } from '../tarjeta-de-cotizacion'
import { BotonDeCelda, textoDeLaCelda } from './boton-de-celda'
import { CampoDelRetoque } from './campo-del-retoque'
import { CanalDeFilas } from './canal-de-filas'
import { FilaElegida } from './fila-elegida'

type DeLaTarjeta = Omit<ReturnType<typeof useTarjetaRetocable>, 'ref'>

type Props = {
  modo: ModoRetocar
  geometria: Geometria
  logo: { nombre: string; url: string } | null
  plantilla: PlantillaEnCuadricula
}

// El campo de la celda elegida, con el texto del borrador (o el de la plantilla, si todavía no se retocó); con Live, tapado si lleva un monto.
function CampoDeLaElegida({
  modo,
  t,
  geometria,
  live,
}: {
  modo: ModoRetocar
  t: DeLaTarjeta
  geometria: Geometria
  live: boolean
}) {
  const { celdaElegida: celda, lugar } = t
  if (celda === undefined || lugar === null) return null
  const { celdas } = modo.borrador
  return (
    <CampoDelRetoque
      celda={celda}
      texto={Object.hasOwn(celdas, celda.id) ? (celdas[celda.id] ?? '') : textoDeLaCelda(celda)}
      lugar={lugar}
      escala={t.escala}
      anchoDelMarco={geometria.ancho * t.escala}
      error={t.errorDe('celda', celda.id)}
      tapado={campoTapadoPorLive(celda, live) ? MOTIVO_DEL_TEXTO_CON_UN_MONTO : null}
      enCurso={modo.enCurso}
      alEscribir={(texto) => {
        modo.escribir(celda.id, texto)
      }}
      alDejar={modo.dejar}
      alCancelar={modo.cancelarCampo}
    />
  )
}

// La capa sobre la tarjeta escalada (fuera del lienzo transformado): las filas ocultas atenuadas, un botón por celda y, si cabe, el campo encima de la celda.
function CapaDeCeldas({
  modo,
  t,
  geometria,
  live,
}: {
  modo: ModoRetocar
  t: DeLaTarjeta
  geometria: Geometria
  live: boolean
}) {
  const { escala } = t
  return (
    <div className="absolute inset-x-0 top-0" style={{ height: geometria.alto * escala }}>
      {t.filas
        .filter((f) => f.oculta)
        .map((f) => (
          <div
            key={f.id}
            aria-hidden
            data-fila-oculta-por-retoque={f.id}
            className="pointer-events-none absolute left-0 bg-white/60"
            style={{ top: f.y * escala, height: f.alto * escala, width: geometria.ancho * escala }}
          />
        ))}
      {geometria.celdas.map((c) => {
        const esTexto = t.tipos.get(c.id) === 'texto'
        return (
          <BotonDeCelda
            key={c.id}
            celda={c}
            escala={escala}
            esTexto={esTexto}
            elegida={t.celdaElegida?.id === c.id}
            largo={t.largo === c.id}
            rotulo={t.porId.get(c.fila)?.rotulo ?? c.fila}
            live={live}
            enCurso={modo.enCurso}
            alTocar={() => {
              if (esTexto) modo.elegirCelda(c.id)
              else modo.elegirFila(c.fila, c.id)
            }}
          />
        )
      })}
      {t.lugar === 'en_la_celda' ? (
        <CampoDeLaElegida modo={modo} t={t} geometria={geometria} live={live} />
      ) : null}
    </div>
  )
}

// La tarjeta del borrador en el modo «Retocar»: la misma tarjeta (con las filas ocultas dibujadas y atenuadas), encima la capa de celdas, a la derecha el canal
// de filas y, con algo elegido, el campo de la celda (encima de ella o bajo la tarjeta) o la fila elegida.
export function TarjetaRetocable({ modo, geometria, logo, plantilla }: Props) {
  const { ref, ...t } = useTarjetaRetocable(modo, geometria, plantilla)
  const { live } = useLive()
  const [bajoElPuntero, setBajoElPuntero] = useState<string | null>(null)
  const [conFoco, setConFoco] = useState<string | null>(null)
  const alMover = (e: PointerEvent<HTMLDivElement>) => {
    const caja = e.currentTarget.getBoundingClientRect()
    setBajoElPuntero(filaEnY(t.filas, (e.clientY - caja.top) / t.escala)?.id ?? null)
  }
  return (
    <>
      <div data-modo-retocar="" className="grid grid-cols-[minmax(0,1fr)_44px] gap-1">
        <div
          ref={ref}
          className="relative min-w-0"
          onPointerMove={alMover}
          onPointerLeave={() => {
            setBajoElPuntero(null)
          }}
        >
          <TarjetaDeCotizacion geometria={geometria} logo={logo} />
          <CapaDeCeldas modo={modo} t={t} geometria={geometria} live={live} />
        </div>
        <CanalDeFilas
          filas={t.filas}
          escala={t.escala}
          alto={geometria.alto}
          activa={t.filaElegida?.id ?? conFoco ?? bajoElPuntero}
          enCurso={modo.enCurso}
          alAlternar={modo.alternarFila}
          alPasar={setBajoElPuntero}
          alEnfocar={setConFoco}
        />
      </div>
      {t.lugar === 'ancho_del_modal' ? (
        <CampoDeLaElegida modo={modo} t={t} geometria={geometria} live={live} />
      ) : null}
      {t.filaElegida === undefined ? null : (
        <FilaElegida
          fila={t.filaElegida}
          motivo={t.motivoDeLaFila}
          error={t.errorDe('fila', t.filaElegida.id)}
          enCurso={modo.enCurso}
          alAlternar={modo.alternarFila}
        />
      )}
    </>
  )
}
