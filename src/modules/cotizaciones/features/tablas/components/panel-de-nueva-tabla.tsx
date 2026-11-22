'use client'

import { cn } from 'cn'
import { useId, useRef } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { Drawer } from '@/shared/ui/drawer'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { LARGO_MAXIMO_DEL_NOMBRE } from '../../../entities/tablas/estructura'
import type { LugarDeLasTablas, OrigenDeLasTablas } from '../../../entities/tablas/rutas'
import { useNuevaTabla, type NuevaTabla, type ParaQuien } from '../hooks/use-nueva-tabla'
import { EditorDeColumnas } from './editor-de-columnas'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El origen de la pestaña; nulo en Catálogos (la tabla nace compartida y no se pregunta).
  origen: OrigenDeLasTablas | null
  // Dónde se dibujan las tablas: al entrar se abre ahí la nueva.
  lugar: LugarDeLasTablas
}

const OPCIONES: readonly { valor: ParaQuien; etiqueta: (origen: string) => string }[] = [
  { valor: 'origen', etiqueta: (origen) => `Sólo ${origen}` },
  { valor: 'compartida', etiqueta: () => 'Compartida: la usan los orígenes sin una propia' },
]

function CampoParaQuien({ nueva, origen }: { nueva: NuevaTabla; origen: string }) {
  const grupo = useId()
  return (
    <fieldset className="grid min-w-0 gap-1.5" disabled={nueva.enCurso}>
      <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">Para</legend>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        {OPCIONES.map((opcion) => (
          <label key={opcion.valor} className="min-w-0 cursor-pointer">
            <input
              type="radio"
              name={grupo}
              value={opcion.valor}
              checked={nueva.para === opcion.valor}
              className="peer sr-only"
              onChange={() => {
                nueva.setPara(opcion.valor)
              }}
            />
            <span
              className={cn(
                'flex min-h-11 items-center rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 py-2',
                'text-(length:--text-sm) break-words text-(--color-ink)',
                'peer-checked:border-(--color-primario) peer-checked:bg-(--color-surface-2)',
                'peer-focus-visible:shadow-(--shadow-focus) peer-disabled:opacity-60',
              )}
            >
              {opcion.etiqueta(origen)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// «Nombre», con la clave que sale de él al tipear.
function CampoDelNombre({ nueva }: { nueva: NuevaTabla }) {
  const idNombre = useId()
  const error = nueva.porCampo['nombre']
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={idNombre}>Nombre</Label>
      <Input
        id={idNombre}
        value={nueva.nombre}
        maxLength={LARGO_MAXIMO_DEL_NOMBRE + 10}
        disabled={nueva.enCurso}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${idNombre}-clave${error ? ` ${idNombre}-error` : ''}`}
        className="h-11 md:h-9"
        onChange={(evento) => {
          nueva.escribirNombre(evento.target.value)
        }}
      />
      <p
        id={`${idNombre}-clave`}
        className="text-(length:--text-sm) break-all text-(--color-ink-soft)"
      >
        {nueva.clave ? (
          <>
            Clave: <span className="font-mono">{nueva.clave}</span> · no cambia después
          </>
        ) : (
          'La clave sale del nombre y no cambia después.'
        )}
      </p>
      {error ? (
        <p
          id={`${idNombre}-error`}
          className="text-(length:--text-sm) break-words text-(--color-peligro-ink)"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

// «Nueva tabla» (`?panel=nueva-tabla`): el nombre (con la clave que sale de él y no cambia), para quién es (sólo en un origen) y las columnas. Quien lo monta le
// da `key` por apertura: cada apertura es un intento nuevo, con su id. Al entrar se abre la tabla nueva para sumarle filas.
export function PanelDeNuevaTabla({ abierto, alCerrar, origen, lugar }: Props) {
  const nueva = useNuevaTabla({ origenId: origen?.id ?? null, lugar })
  const idFormulario = useId()
  const formulario = useRef<HTMLFormElement>(null)
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nueva tabla"
      descripcion={
        origen
          ? 'Nace vacía y sin publicar: después le sumas filas y la publicas.'
          : 'Compartida: la usan los orígenes que no tienen una propia con su clave. Nace vacía y sin publicar.'
      }
      ancho="amplio"
      pie={
        <PieDelPanel
          idFormulario={idFormulario}
          enCurso={nueva.enCurso}
          alCancelar={alCerrar}
          etiquetaDeGuardar="Crear tabla"
          etiquetaEnCurso="Creando…"
        />
      }
    >
      <CambiosSinGuardar hayCambios={nueva.hayCambios} preguntaAlCerrar />
      <form
        ref={formulario}
        id={idFormulario}
        className="grid min-w-0 gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void nueva.enviar().then((entro) => {
            if (!entro) enfocarPrimerError(formulario.current)
          })
        }}
      >
        {nueva.error ? (
          <Aviso tono="peligro">
            <p className="break-words">{nueva.error}</p>
          </Aviso>
        ) : null}
        <CampoDelNombre nueva={nueva} />
        {origen ? <CampoParaQuien nueva={nueva} origen={origen.nombre} /> : null}
        <EditorDeColumnas
          edicion={nueva.edicion}
          editar={nueva.editar}
          porCampo={nueva.porCampo}
          enCurso={nueva.enCurso}
        />
      </form>
    </Drawer>
  )
}
