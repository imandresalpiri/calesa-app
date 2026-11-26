'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useEditorState, type Editor } from '@tiptap/react'
import {
  EyeIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  Redo2Icon,
  Undo2Icon,
} from 'lucide-react'
import type { RefObject } from 'react'
import { Button } from '@/shared/ui/button'
import { ConfirmarDescarte } from '@/shared/ui/confirmar-descarte'
import {
  RUTA_DE_LA_LISTA_DE_GUIAS,
  type AccionDeLaBarra,
  type AccionesDeLaBarra,
} from '../../../../entities/contenido/guias'
import { AccionesDePublicacion } from './acciones-de-publicacion'
import { EstadoDeLaGuia } from './estado-de-la-guia'

type Salida = { pendiente: boolean; seguir: () => void; descartar: () => void }

type Props = {
  editor: Editor | null
  publicadaEn: string | null
  ahora: string
  zona: string
  acciones: AccionesDeLaBarra
  motivo: string | null
  enCurso: boolean
  panelAbierto: boolean
  salida: Salida
  // El grupo de las acciones: un enlace suyo no cuenta como salir de la pantalla (`useSalidaConCambios`).
  refDeLasAcciones: RefObject<HTMLDivElement | null>
  alEjecutar: (accion: AccionDeLaBarra['accion']) => void
  alVerVistaPrevia: () => void
  alAlternarPanel: () => void
}

const TACTIL = 'min-h-11 md:min-h-9'

function Historia({ editor }: { editor: Editor | null }) {
  const estado = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      deshacer: e ? e.can().undo() : false,
      rehacer: e ? e.can().redo() : false,
    }),
  })
  return (
    <div className="flex gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 md:size-9"
        aria-label="Deshacer"
        title="Deshacer"
        disabled={!estado?.deshacer}
        onClick={() => editor?.chain().focus().undo().run()}
      >
        <Undo2Icon aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 md:size-9"
        aria-label="Rehacer"
        title="Rehacer"
        disabled={!estado?.rehacer}
        onClick={() => editor?.chain().focus().redo().run()}
      >
        <Redo2Icon aria-hidden />
      </Button>
    </div>
  )
}

// La barra de arriba de la guía, pegada arriba al desplazar: volver a Guías, deshacer y rehacer, el estado y, a la derecha, la vista previa, guardar y
// publicar y el interruptor del panel. Con cambios sin guardar, salir pregunta aquí mismo (reemplaza a las acciones, sin mover la barra).
export function BarraDeLaGuia({
  editor,
  publicadaEn,
  ahora,
  zona,
  acciones,
  motivo,
  enCurso,
  panelAbierto,
  salida,
  refDeLasAcciones,
  alEjecutar,
  alVerVistaPrevia,
  alAlternarPanel,
}: Props) {
  return (
    <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center gap-x-2 gap-y-1 border-b border-(--color-line) bg-(--color-paper) px-2 py-1">
      <Link
        href={RUTA_DE_LA_LISTA_DE_GUIAS as Route}
        className="inline-flex min-h-11 items-center px-2 text-(length:--text-sm) text-(--color-ink-soft) underline-offset-2 hover:underline md:min-h-9"
      >
        ← Guías
      </Link>
      <Historia editor={editor} />
      <EstadoDeLaGuia publicadaEn={publicadaEn} ahora={ahora} zona={zona} />
      <div ref={refDeLasAcciones} className="ms-auto flex flex-wrap items-center gap-2">
        {salida.pendiente ? (
          <ConfirmarDescarte alSeguir={salida.seguir} alDescartar={salida.descartar} />
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              className={`${TACTIL} max-sm:min-w-11`}
              onClick={alVerVistaPrevia}
            >
              <EyeIcon aria-hidden /> <span className="max-sm:sr-only">Vista previa</span>
            </Button>
            <AccionesDePublicacion
              acciones={acciones}
              enCurso={enCurso}
              idDelMotivo="motivo-de-publicacion"
              alEjecutar={alEjecutar}
            />
          </>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 md:size-9"
          aria-label={panelAbierto ? 'Ocultar el panel' : 'Mostrar el panel'}
          aria-pressed={panelAbierto}
          onClick={alAlternarPanel}
        >
          {panelAbierto ? <PanelRightCloseIcon aria-hidden /> : <PanelRightOpenIcon aria-hidden />}
        </Button>
      </div>
      {motivo ? (
        <p id="motivo-de-publicacion" className="sr-only">
          {motivo}
        </p>
      ) : null}
    </header>
  )
}
