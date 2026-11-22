'use client'

import { useRouter } from 'next/navigation'
import { fechaRelativa } from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import { ToqueDeLaTarjeta } from '@/shared/ui/tarjetas-de-ajustes'
import type { TablaDeReferencia } from '../../../entities/tablas/lectura'
import { rutaDeLasTablas, type LugarDeLasTablas } from '../../../entities/tablas/rutas'
import { AccionesDeLaTablaEnLaLista } from './acciones-de-la-tabla'

type Props = {
  tabla: TablaDeReferencia
  lugar: LugarDeLasTablas
  // El origen del drawer: una compartida que su propia tabla tapa lo dice.
  origen: string
}

function Publicada({ tabla }: { tabla: TablaDeReferencia }) {
  const { zonaHoraria, locale } = useRegional()
  const partes = [
    `Versión ${formatearNumero(tabla.version, { locale, decimales: 0 })}`,
    tabla.publicadoPor,
    tabla.publicadoEn ? fechaRelativa(tabla.publicadoEn, { zona: zonaHoraria }) : null,
  ].filter((parte): parte is string => parte !== null)
  return <p className="text-(--color-ink-soft)">{partes.join(' · ')}</p>
}

// Una tabla de la lista: su nombre, su clave, la versión publicada y, si es compartida y el origen tiene una propia con su clave, «Tapada por la de <origen>». Sin
// botones sueltos: sólo su «⋯» (Editar filas · Columnas · Desactivar) y tocar la fila abre «Editar filas». Con el teclado, la fila es un botón con nombre («Editar
// <nombre>») y el «⋯» va aparte («Más acciones de <nombre>»).
export function FilaDeTabla({ tabla, lugar, origen }: Props) {
  const router = useRouter()
  return (
    <li
      data-tabla={tabla.clave}
      className="relative flex min-w-0 items-start gap-2 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm) has-[[data-slot=toque-de-la-tarjeta]:hover]:bg-(--color-surface-2)"
    >
      <ToqueDeLaTarjeta
        etiqueta={`Editar ${tabla.nombre}`}
        abrir={() => {
          router.push(rutaDeLasTablas(lugar, tabla.id))
        }}
      />
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold break-words text-(--color-ink)">{tabla.nombre}</span>
          <span className="break-all text-(--color-ink-faint)">{tabla.clave}</span>
          {tabla.tapada ? <Badge variant="outline">Tapada por la de {origen}</Badge> : null}
        </div>
        <Publicada tabla={tabla} />
      </div>
      <AccionesDeLaTablaEnLaLista tabla={tabla} lugar={lugar} />
    </li>
  )
}
