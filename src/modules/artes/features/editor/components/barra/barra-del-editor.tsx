'use client'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { EstadoDelGuardado } from '../../../../entities/editor/guardado'
import type { ClaveDelMenuDelEditor } from '../../../../entities/editor/menu-del-editor'
import { textoDelFormato } from '../../../../entities/formatos'
import type { PlantillaDelEditor } from '../../../../entities/tipos'
import { useVolverAArtes } from '../../hooks/use-volver-a-artes'
import { CELDAS_DEL_EDITOR } from '../rejilla'
import { DuplicarParaEditar } from './duplicar-para-editar'
import { EnlaceVolverAArtes } from './enlace-volver-a-artes'
import { MenuDelEditor } from './menu-del-editor'
import { NombreEditable } from './nombre-editable'
import { RenglonDelGuardado } from './renglon-del-guardado'

type Props = {
  plantilla: PlantillaDelEditor
  nombre: string
  alCambiarNombre: (nombre: string) => void
  motivoDeSoloLectura: string | null
  guardado: { estado: EstadoDelGuardado; guardar: () => void }
  hacer: Readonly<Record<ClaveDelMenuDelEditor, () => void>>
}

// La barra del editor de artes (3rem, como en frío): «Volver a Artes», el nombre (se cambia con un clic) y el formato; a la derecha, el
// renglón del guardado y «Guardar» o, en sólo lectura, la insignia, el motivo y «Duplicar para editar»; al final, el «⋯».
export function BarraDelEditor({
  plantilla,
  nombre,
  alCambiarNombre,
  motivoDeSoloLectura,
  guardado,
  hacer,
}: Props) {
  const volver = useVolverAArtes()
  return (
    <header className={CELDAS_DEL_EDITOR.barra}>
      <EnlaceVolverAArtes href={volver} />
      <span aria-hidden className="h-5 w-px shrink-0 bg-(--color-line)" />
      <NombreEditable
        nombre={nombre}
        alCambiar={alCambiarNombre}
        soloLectura={motivoDeSoloLectura !== null}
      />
      <span className="shrink-0 text-(length:--text-sm) text-(--color-ink-soft) tabular-nums">
        {textoDelFormato(plantilla.formato, plantilla)}
      </span>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        {motivoDeSoloLectura === null ? (
          <>
            <RenglonDelGuardado estado={guardado.estado} alReintentar={guardado.guardar} />
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0"
              disabled={guardado.estado === 'guardado' || guardado.estado === 'guardando'}
              onClick={guardado.guardar}
            >
              Guardar
            </Button>
          </>
        ) : (
          <>
            <Badge variant="secondary">Sólo lectura</Badge>
            <span
              title={motivoDeSoloLectura}
              className="min-w-0 truncate text-(length:--text-sm) text-(--color-ink-soft)"
            >
              {motivoDeSoloLectura}
            </span>
            <DuplicarParaEditar id={plantilla.id} nombre={nombre} />
          </>
        )}
        <MenuDelEditor nombre={nombre} formato={plantilla.formato} hacer={hacer} />
      </div>
    </header>
  )
}
