'use client'

import { useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/shared/ui/button'
import { totalDelResumen, type ContextoDeHoja } from '../../../entities/binding'
import type { HojaLista } from '../../../entities/hoja'
import type { EleccionDeLoQueFalta, LoQueFalta } from '../../../entities/obligatorios-al-cotizar'
import type { EstadoDeRecalculo } from '../../../entities/recalculo'
import { useResumenPlegado } from '../hooks/use-resumen-plegado'
import { ElegirLoQueFalta } from './elegir-lo-que-falta'
import { LiveDelResumen } from './live-del-resumen'
import { useRanuraDeGuardar } from './menu-de-la-guardada/use-ranura-de-guardar'
import { ModoDelResumen } from './modo-del-resumen'
import { AvisoDeFallo, CabezaDelResumen, SecundariosDelResumen } from './partes-del-resumen'

type Props = {
  tarjeta: HojaLista['tarjetaTotal']
  // La moneda del total en la moneda local, si «Ver total Bs» está encendido; nula, no se dibuja.
  monedaDelTotalBs: string | null
  // El nombre del modo de tipo de cambio con que se calculó; nulo, la hoja no tiene modos.
  modo: string | null
  contexto: ContextoDeHoja
  estado: EstadoDeRecalculo
  // Lo que se dice del vehículo: el de la URL no se pudo usar.
  avisoDelVehiculo: string | null
  alReintentar: () => void
  alRecargar: () => void
  // Nulo: esta hoja no guarda (una guardada todavía sin «Guardar», o de sólo lectura).
  guardar: BotonDeGuardar | null
  // Quien sólo ve una cotización guardada: lo dice donde iría «Guardar» (P13).
  soloLectura?: boolean
  // El total con que se guardó cuando lo de hoy no es lo guardado (`<TotalGuardado>`, C11): va bajo el total.
  totalGuardado?: ReactNode
  // Lo que dice el último guardado (`<AvisoDelGuardado>`): va en la misma región viva.
  avisoDeGuardado: ReactNode
  // «Vista previa» de la tarjeta (4.18-2): va en el pie, antes de Live; nulo sin el proveedor del área `tarjeta`.
  vistaPrevia?: ReactNode
  // La hoja en par (glosario: «Variante en par»): los dos totales, cada uno con lo suyo, en vez del total, sus avisos y el detalle.
  totales?: ReactNode
  // El interruptor «Privada» de la hoja nueva (`InterruptorPrivada`): va sobre el pie, a la vista aunque el resumen esté plegado. Nulo, no se dibuja.
  interruptor?: ReactNode
  // Lo pisado (`ListaDePisadasDiferida`): lo primero del detalle, bajo el total y sus avisos. Nulo sin nada pisado.
  pisadas?: ReactNode
}

export type BotonDeGuardar = {
  // Por qué no se guarda ahora, dicho junto al botón; nulo, se puede.
  motivo: string | null
  // El resumen ya lo dice (sin total): no se repite junto al botón.
  motivoYaDicho: boolean
  // Esperando el total al día o guardando: «Guardando…» y apagado (nunca un doble envío).
  ocupado: boolean
  alGuardar: () => void
  // Lo que falta elegir y cómo se elige (el botón de su panel o el pedido): bajo el motivo. Nulo, nada falta.
  paraElegir: { que: LoQueFalta; eleccion: EleccionDeLoQueFalta } | null
}

// «Guardar», además de `Ctrl/Cmd+S` (el celular no tiene atajo). Frena el `mousedown`: así el foco no sale de una celda abierta (un clic afuera descartaría lo que no es un
// número) y el clic hace lo mismo que el atajo, que confirma la celda antes de guardar. En una guardada va en la cabecera, junto a «Compartir» (`useRanuraDeGuardar()`, por un
// portal: sigue siendo de la hoja, con su estado, su motivo y su atajo); mientras la cabecera no montó su lugar, no se dibuja.
function BotonGuardar({ motivo, motivoYaDicho, ocupado, alGuardar, paraElegir }: BotonDeGuardar) {
  const ranura = useRanuraDeGuardar()
  const dicho = motivo !== null && !motivoYaDicho
  if (ranura === null) {
    return null
  }
  const enLaCabecera = ranura !== undefined
  const boton = (
    <div className={enLaCabecera ? 'grid gap-1' : 'mr-auto grid gap-1'}>
      <Button
        className={
          enLaCabecera
            ? 'min-h-11 w-full md:min-h-8 md:w-auto'
            : 'min-h-11 justify-self-start md:min-h-8'
        }
        disabled={motivo !== null || ocupado}
        aria-describedby={dicho ? 'motivo-para-no-guardar' : undefined}
        onMouseDown={(evento) => {
          evento.preventDefault()
        }}
        onClick={alGuardar}
      >
        {ocupado ? 'Guardando…' : 'Guardar'}
      </Button>
      {!dicho ? null : (
        <p id="motivo-para-no-guardar" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {motivo}
        </p>
      )}
      {paraElegir === null ? null : (
        <ElegirLoQueFalta que={paraElegir.que} eleccion={paraElegir.eleccion} />
      )}
    </div>
  )
  return enLaCabecera ? createPortal(boton, ranura) : boton
}

// El pie: «Guardar», o, en una cotización guardada que quien mira sólo ve, que es de sólo lectura (P13); y el botón Live.
function PieDelResumen({
  guardar,
  soloLectura,
  vistaPrevia,
}: {
  guardar: BotonDeGuardar | null
  soloLectura: boolean
  vistaPrevia: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-end gap-2">
      {guardar === null ? (
        soloLectura ? (
          <p className="mr-auto text-(length:--text-sm) text-(--color-ink-soft)">
            Sólo lectura: no puedes guardar esta cotización.
          </p>
        ) : null
      ) : (
        <BotonGuardar {...guardar} />
      )}
      {vistaPrevia}
      <LiveDelResumen />
    </div>
  )
}

export function ResumenDeHoja({
  tarjeta,
  monedaDelTotalBs,
  modo,
  contexto,
  estado,
  avisoDelVehiculo,
  alReintentar,
  alRecargar,
  guardar,
  soloLectura = false,
  totalGuardado = null,
  avisoDeGuardado,
  vistaPrevia = null,
  totales = null,
  interruptor,
  pisadas,
}: Props) {
  const total = totalDelResumen(contexto)
  const viejo = estado.tipo !== 'al_dia'
  const ocupado = estado.tipo === 'esperando' || estado.tipo === 'recalculando'
  const variante = contexto.indice.variante?.etiqueta
  const { plegado, alternar } = useResumenPlegado()
  const idDelDetalle = useId()
  return (
    <aside
      aria-label="Resumen"
      data-resumen=""
      data-viejo={viejo}
      aria-busy={ocupado}
      data-pie-de-panel=""
      className="sticky bottom-0 z-10 grid max-h-[40dvh] gap-2 overflow-y-auto rounded-(--radius-card) border border-(--color-line-strong) bg-(--color-surface) p-4 @4xl/hoja:top-[calc(var(--topbar)+1rem)] @4xl/hoja:bottom-auto @4xl/hoja:max-h-[calc(100dvh-var(--topbar)-2rem)] @4xl/hoja:w-[22rem] @4xl/hoja:shrink-0"
    >
      {totales ?? (
        <CabezaDelResumen
          tarjeta={tarjeta}
          total={total}
          estado={estado}
          variante={variante}
          plegado={plegado}
          alternar={alternar}
          idDelDetalle={idDelDetalle}
        />
      )}
      {totalGuardado}
      {/* Plegado sólo esconde lo secundario: el total, sus avisos, lo guardado, la región viva y «Guardar» quedan siempre a la vista. */}
      <div id={idDelDetalle} className={plegado ? 'hidden @4xl/hoja:contents' : 'contents'}>
        {pisadas}
        {totales === null ? (
          <SecundariosDelResumen
            tarjeta={tarjeta}
            contexto={contexto}
            monedaDelTotalBs={monedaDelTotalBs}
          />
        ) : null}
        <ModoDelResumen nombre={modo} />
      </div>
      <div role="status" className="grid gap-1">
        {totales === null ? (
          <AvisoDeFallo estado={estado} alReintentar={alReintentar} alRecargar={alRecargar} />
        ) : null}
        {avisoDelVehiculo === null ? null : (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{avisoDelVehiculo}</p>
        )}
        {avisoDeGuardado}
      </div>
      {interruptor}
      <PieDelResumen guardar={guardar} soloLectura={soloLectura} vistaPrevia={vistaPrevia} />
    </aside>
  )
}
