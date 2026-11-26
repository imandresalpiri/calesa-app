'use client'

import { useId, useRef } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { CampoParaQuien } from '@/shared/ui/campo-para-quien'
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
  // El origen del drawer: la tabla nace suya o compartida con todos los orígenes.
  origen: OrigenDeLasTablas
  // Dónde se dibujan las tablas: al entrar se abre ahí la nueva.
  lugar: LugarDeLasTablas
}

// Qué pasa con cada opción, bajo el título del panel; la compartida la usan los orígenes que no tienen una propia con su clave.
const DESCRIPCION: Record<ParaQuien, string> = {
  origen: 'Nace vacía y sin publicar: después le sumas filas y la publicas.',
  compartida:
    'La usan los orígenes que no tienen una propia con su clave. Nace vacía y sin publicar.',
}

const OPCIONES: readonly { valor: ParaQuien; etiqueta: (origen: string) => string }[] = [
  { valor: 'origen', etiqueta: (origen) => `Sólo de ${origen}` },
  { valor: 'compartida', etiqueta: () => 'Compartida con todos los orígenes' },
]

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

// «Nueva tabla» (`?panel=nueva-tabla`): el nombre (con la clave que sale de él y no cambia), para quién es («Sólo de <origen>» o «Compartida con todos los orígenes») y las columnas. Quien lo monta le
// da `key` por apertura: cada apertura es un intento nuevo, con su id. Al entrar se abre la tabla nueva para sumarle filas.
export function PanelDeNuevaTabla({ abierto, alCerrar, origen, lugar }: Props) {
  const nueva = useNuevaTabla({ origenId: origen.id, lugar })
  const idFormulario = useId()
  const formulario = useRef<HTMLFormElement>(null)
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nueva tabla"
      descripcion={DESCRIPCION[nueva.para]}
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
        <CampoParaQuien
          valor={nueva.para}
          alCambiar={nueva.setPara}
          deshabilitado={nueva.enCurso}
          opciones={OPCIONES.map((opcion) => ({
            valor: opcion.valor,
            etiqueta: opcion.etiqueta(origen.nombre),
          }))}
        />
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
