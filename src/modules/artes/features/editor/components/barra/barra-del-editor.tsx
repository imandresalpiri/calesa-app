'use client'

import { useId, type ComponentProps } from 'react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { EstadoDelGuardado } from '../../../../entities/editor/guardado'
import type { ClaveDelMenuDelEditor } from '../../../../entities/editor/menu-del-editor'
import { textoDelFormato, tipoDelFormato } from '../../../../entities/formatos'
import type { PlantillaDelEditor } from '../../../../entities/tipos'
import { useVolverAArtes } from '../../hooks/use-volver-a-artes'
import { CELDAS_DEL_EDITOR } from '../rejilla'
import { BotonDescargarPdf, type PdfDeLaBarra } from './boton-descargar-pdf'
import { DuplicarParaEditar } from './duplicar-para-editar'
import { EnlaceVolverAArtes } from './enlace-volver-a-artes'
import { MenuDelEditor } from './menu-del-editor'
import { NombreEditable } from './nombre-editable'
import { RenglonDelGuardado } from './renglon-del-guardado'
import { VehiculoDeEjemplo } from './vehiculo-de-ejemplo'

type Props = {
  plantilla: PlantillaDelEditor
  nombre: string
  alCambiarNombre: (nombre: string) => void
  motivoDeSoloLectura: string | null
  // `motivo`: por qué no se guarda («Corrige {x} para guardar.»); nulo si se puede.
  guardado: { estado: EstadoDelGuardado; guardar: () => void; motivo: string | null }
  hacer: Readonly<Record<ClaveDelMenuDelEditor, () => void>>
  ejemplo: ComponentProps<typeof VehiculoDeEjemplo>
  // Lo que «Descargar PDF» lee al pedirlo (sólo se dibuja en una plantilla de PDF): el texto abierto y el documento que se ve.
  pdf: PdfDeLaBarra
}

// La barra del editor de artes (3rem, como en frío): «Volver a Artes», el nombre (se cambia con un clic) y el formato; a la derecha, el
// vehículo de ejemplo (de ancho fijo), el renglón del guardado y «Guardar» (apagado, con el motivo en el renglón, mientras un texto lleve una
// variable desconocida) o, en sólo lectura, la insignia, el motivo y «Duplicar para editar»; al final, en un PDF «Descargar PDF», y el «⋯». A
// 1024 px entra entera: lo de la derecha no se encoge (sus anchos son fijos, `ANCHOS_DE_LA_BARRA`) y se corta el nombre; en sólo lectura se
// cortan el nombre (con su tope) y el motivo.
export function BarraDelEditor({
  plantilla,
  nombre,
  alCambiarNombre,
  motivoDeSoloLectura,
  guardado,
  hacer,
  ejemplo,
  pdf,
}: Props) {
  const volver = useVolverAArtes()
  const idDelRenglon = useId()
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
      <div
        className={`ml-auto flex items-center gap-2 ${motivoDeSoloLectura === null ? 'shrink-0' : 'min-w-0'}`}
      >
        <VehiculoDeEjemplo {...ejemplo} />
        {motivoDeSoloLectura === null ? (
          <>
            <RenglonDelGuardado
              id={idDelRenglon}
              estado={guardado.estado}
              motivo={guardado.motivo}
              alReintentar={guardado.guardar}
            />
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0"
              aria-describedby={guardado.motivo === null ? undefined : idDelRenglon}
              disabled={
                guardado.estado === 'guardado' ||
                guardado.estado === 'guardando' ||
                guardado.motivo !== null
              }
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
        {tipoDelFormato(plantilla.formato) === 'pdf' ? (
          <BotonDescargarPdf
            {...pdf}
            plantilla={plantilla}
            nombre={nombre}
            ejemplo={ejemplo.ejemplo}
          />
        ) : null}
        <MenuDelEditor nombre={nombre} formato={plantilla.formato} hacer={hacer} />
      </div>
    </header>
  )
}
