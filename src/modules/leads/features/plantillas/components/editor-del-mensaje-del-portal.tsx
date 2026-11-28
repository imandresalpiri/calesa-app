'use client'

import { cn } from 'cn'
import { useId, useState } from 'react'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import { EditorConVariables } from '@/shared/ui/editor-con-variables'
import type { FormularioDelModal } from '@/shared/ui/modal-de-formulario'
import {
  EJEMPLO_DEL_MENSAJE,
  LARGO_MAXIMO_DEL_MENSAJE,
  MENSAJE_DE_FABRICA,
  valoresDelMensaje,
} from '../../../entities/portal-mensaje'
import { useMensajeDelPortal } from '../hooks/use-mensaje-del-portal'
import { VARIABLES_DEL_EDITOR } from './variables-del-mensaje'

export type PropsDelEditorDelMensajeDelPortal = {
  // Lo guardado (nulo: el de fábrica) y su versión, tal como la mandó la base: nunca pasa por `Date`.
  mensaje: string | null
  actualizadoEn: string | null
  // La vista previa: el nombre del cliente de muestra y el de la empresa. Sin dirección, `{direccion}` dice «la web de <empresa>».
  cliente: string
  empresa: string
  // Por qué no se puede editar (lo decide quien lo dibuja): el editor queda de sólo lectura y lo dice.
  motivo: string | null
}

type Estado = { texto: string; tono: 'suave' | 'aviso' | 'peligro' } | null

const SIN_CONEXION = 'Sin conexión: no se guardó. Lo escrito queda como borrador.'
const SIN_VERSION = 'No se pudo leer el mensaje guardado. Recarga la página para editarlo.'
const TONO = {
  suave: 'text-(--color-ink-soft)',
  aviso: 'text-(--color-aviso-ink)',
  peligro: 'text-(--color-peligro-ink)',
} as const

// El campo con sus variables y su vista previa (los datos de ejemplo con el cliente y la empresa que llegan).
function Campo({
  texto,
  alCambiar,
  motivo,
  deshabilitado,
  cliente,
  empresa,
}: {
  texto: string
  alCambiar: (valor: string) => void
  motivo: string | null
  deshabilitado: boolean
  cliente: string
  empresa: string
}) {
  const id = useId()
  return (
    <EditorConVariables
      id={id}
      etiqueta="Texto para WhatsApp"
      valor={texto}
      alCambiar={alCambiar}
      variables={VARIABLES_DEL_EDITOR}
      valores={valoresDelMensaje({ ...EJEMPLO_DEL_MENSAJE, cliente, empresa, direccion: null })}
      motivo={motivo}
      largoMaximo={LARGO_MAXIMO_DEL_MENSAJE}
      deshabilitado={deshabilitado}
    />
  )
}

// «Guardar» y «Restablecer», y debajo la línea de lo que pasa con el guardado: su alto está reservado (dos renglones), así nada salta
// cuando llega o se va. Un conflicto va en su lugar.
function Pie({
  puedeGuardar,
  puedeRestablecer,
  alGuardar,
  alRestablecer,
  estado,
  conflicto,
}: {
  puedeGuardar: boolean
  puedeRestablecer: boolean
  alGuardar: () => void
  alRestablecer: () => void
  estado: Estado
  conflicto?: { mensaje: string; alRecargar: () => void; recargando: boolean } | null
}) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-11 md:min-h-9" disabled={!puedeGuardar} onClick={alGuardar}>
          Guardar
        </Button>
        <Button
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={!puedeRestablecer}
          onClick={alRestablecer}
        >
          Restablecer
        </Button>
      </div>
      {conflicto ? (
        <AvisoDeConflicto
          mensaje={conflicto.mensaje}
          alRecargar={conflicto.alRecargar}
          enCurso={conflicto.recargando}
          detalle="Lo que escribiste sigue acá."
        />
      ) : (
        <p
          role="status"
          aria-live="polite"
          className={cn(
            'min-h-[2lh] text-(length:--text-sm)',
            estado ? TONO[estado.tono] : undefined,
          )}
        >
          {estado?.texto}
        </p>
      )}
    </div>
  )
}

// Sin permiso (o sin la versión guardada): el texto a la vista, el editor apagado y ningún botón que haga algo.
function DeSoloLectura({
  mensaje,
  cliente,
  empresa,
  motivo,
}: Omit<PropsDelEditorDelMensajeDelPortal, 'actualizadoEn' | 'motivo'> & { motivo: string }) {
  return (
    <div className="grid gap-4">
      <Campo
        texto={mensaje ?? MENSAJE_DE_FABRICA}
        alCambiar={() => undefined}
        motivo={null}
        deshabilitado
        cliente={cliente}
        empresa={empresa}
      />
      <Pie
        puedeGuardar={false}
        puedeRestablecer={false}
        alGuardar={() => undefined}
        alRestablecer={() => undefined}
        estado={{ texto: motivo, tono: 'suave' }}
      />
    </div>
  )
}

// Lo que dice la línea del guardado: guardando, sin red, un rechazo que no es del campo o lo recién guardado.
function estadoDelGuardado(
  formulario: Pick<FormularioDelModal, 'enCurso' | 'esperandoConexion' | 'aviso'>,
  guardado: boolean,
): Estado {
  if (formulario.enCurso) {
    return { texto: 'Guardando…', tono: 'suave' }
  }
  if (formulario.esperandoConexion) {
    return { texto: SIN_CONEXION, tono: 'aviso' }
  }
  if (formulario.aviso) {
    return { texto: formulario.aviso, tono: 'peligro' }
  }
  return guardado ? { texto: 'Guardado.', tono: 'suave' } : null
}

function Editable({
  mensaje,
  actualizadoEn,
  cliente,
  empresa,
}: Omit<PropsDelEditorDelMensajeDelPortal, 'actualizadoEn' | 'motivo'> & {
  actualizadoEn: string
}) {
  const [recienGuardado, setRecienGuardado] = useState(false)
  const editor = useMensajeDelPortal({
    mensaje,
    actualizadoEn,
    abierto: true,
    claveDelBorrador: 'mensaje-del-portal',
    alGuardar: () => {
      setRecienGuardado(true)
    },
  })
  const { formulario } = editor
  const ocupado = formulario.enCurso || formulario.recargando === true
  const estado = estadoDelGuardado(formulario, recienGuardado && !editor.hayCambios)
  return (
    <div className="grid gap-4">
      <Campo
        texto={editor.texto}
        alCambiar={(valor) => {
          setRecienGuardado(false)
          editor.escribir(valor)
        }}
        motivo={editor.motivo ?? editor.motivoEnVivo}
        deshabilitado={formulario.enCurso}
        cliente={cliente}
        empresa={empresa}
      />
      <Pie
        puedeGuardar={
          !ocupado &&
          formulario.conflicto === null &&
          editor.hayCambios &&
          editor.motivoEnVivo === null
        }
        puedeRestablecer={!ocupado && !editor.esElDeFabrica}
        alGuardar={() => {
          void formulario.enviar()
        }}
        alRestablecer={() => {
          setRecienGuardado(false)
          editor.restablecer()
        }}
        estado={estado}
        conflicto={
          formulario.conflicto === null
            ? null
            : {
                mensaje: formulario.conflicto,
                alRecargar: () => formulario.recargar?.(),
                recargando: formulario.recargando === true,
              }
        }
      />
    </div>
  )
}

// El mensaje del portal editado en el lugar (la pestaña «Textos» del editor de artes): el mismo texto que el modal de Configuración › Leads,
// con sus variables, su vista previa, «Guardar» (apagado sin cambios o con algo que no se puede guardar) y «Restablecer» (pone el de fábrica;
// se guarda con «Guardar»). Un conflicto ofrece «Recargar» y lo escrito queda; sin red, el guardado espera a que vuelva y lo escrito queda como
// borrador (`sessionStorage`). Con `motivo`, de sólo lectura.
export function EditorDelMensajeDelPortal(props: PropsDelEditorDelMensajeDelPortal) {
  const { actualizadoEn, motivo, ...resto } = props
  if (motivo !== null || actualizadoEn === null) {
    return <DeSoloLectura {...resto} motivo={motivo ?? SIN_VERSION} />
  }
  return <Editable {...resto} actualizadoEn={actualizadoEn} />
}
