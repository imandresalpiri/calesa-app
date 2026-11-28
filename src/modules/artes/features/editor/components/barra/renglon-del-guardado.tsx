'use client'

import {
  CheckIcon,
  CircleDotIcon,
  CloudOffIcon,
  Loader2Icon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { TEXTOS_DEL_GUARDADO, type EstadoDelGuardado } from '../../../../entities/editor/guardado'
import { ANCHOS_DE_LA_BARRA } from '../rejilla'

const ICONOS: Readonly<Record<EstadoDelGuardado, typeof CheckIcon>> = {
  guardado: CheckIcon,
  cambios: CircleDotIcon,
  guardando: Loader2Icon,
  'sin-conexion': CloudOffIcon,
  conflicto: CircleDotIcon,
  error: TriangleAlertIcon,
}

type Props = {
  id?: string
  estado: EstadoDelGuardado
  // Por qué no se guarda («Corrige {x} para guardar.»): con cambios, se dice en vez del estado.
  motivo: string | null
  alReintentar: () => void
}

// El renglón del guardado en la barra, de ancho fijo (un estado más largo no empuja nada): «Guardado», «Cambios sin guardar», «Guardando…»,
// sin conexión (sale solo al volver) o «No se pudo guardar.» con «Reintentar». Con un motivo para no guardar y cambios, el motivo en el color
// del aviso. El lector de pantalla lo oye sin perder el foco.
export function RenglonDelGuardado({ id, estado, motivo, alReintentar }: Props) {
  if (motivo !== null && estado !== 'guardado' && estado !== 'guardando') {
    return (
      <div
        id={id}
        role="status"
        data-estado="sin-guardar"
        title={motivo}
        className={`flex h-8 ${ANCHOS_DE_LA_BARRA.guardado} shrink-0 items-center justify-end gap-1.5 text-(length:--text-sm) text-(--color-peligro-ink)`}
      >
        <TriangleAlertIcon aria-hidden className="size-4 shrink-0" />
        <span className="truncate">{motivo}</span>
      </div>
    )
  }
  const Icono = ICONOS[estado]
  return (
    <div
      id={id}
      role="status"
      data-estado={estado}
      className={`flex h-8 ${ANCHOS_DE_LA_BARRA.guardado} shrink-0 items-center justify-end gap-1.5 text-(length:--text-sm) text-(--color-ink-soft)`}
    >
      <Icono
        aria-hidden
        className={estado === 'guardando' ? 'size-4 shrink-0 animate-spin' : 'size-4 shrink-0'}
      />
      <span className="truncate">{TEXTOS_DEL_GUARDADO[estado]}</span>
      {estado === 'error' ? (
        <Button type="button" variant="outline" size="xs" onClick={alReintentar}>
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}
