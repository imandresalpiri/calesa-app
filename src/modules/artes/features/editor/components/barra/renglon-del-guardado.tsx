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

const ICONOS: Readonly<Record<EstadoDelGuardado, typeof CheckIcon>> = {
  guardado: CheckIcon,
  cambios: CircleDotIcon,
  guardando: Loader2Icon,
  'sin-conexion': CloudOffIcon,
  conflicto: CircleDotIcon,
  error: TriangleAlertIcon,
}

type Props = { estado: EstadoDelGuardado; alReintentar: () => void }

// El renglón del guardado en la barra, de ancho fijo (un estado más largo no empuja nada): «Guardado», «Cambios sin guardar», «Guardando…»,
// sin conexión (sale solo al volver) o «No se pudo guardar.» con «Reintentar». El lector de pantalla lo oye sin perder el foco.
export function RenglonDelGuardado({ estado, alReintentar }: Props) {
  const Icono = ICONOS[estado]
  return (
    <div
      role="status"
      data-estado={estado}
      className="flex h-8 w-72 shrink-0 items-center justify-end gap-1.5 text-(length:--text-sm) text-(--color-ink-soft)"
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
