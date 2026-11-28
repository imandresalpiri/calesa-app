'use client'

import { cn } from 'cn'
import { useId } from 'react'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import { EditorConVariables } from '@/shared/ui/editor-con-variables'
import { LARGO_MAXIMO_DEL_TEXTO_BASE } from '../../../entities/datos/texto-base'
import { valeEnElOrigen } from '../../../entities/datos/variables-del-arte'
import { useTextoBase, type EstadoDelTextoBase } from '../hooks/use-texto-base'
import type { PropsDelPanelDeTextos } from '../tipos'
import { VistaPreviaConDatos } from './vista-previa-con-datos'

type Props = Pick<
  PropsDelPanelDeTextos,
  'origen' | 'catalogo' | 'textoBase' | 'motivoDelTextoBase' | 'datos' | 'sinMoneda'
>

type Linea = { texto: string; tono: 'suave' | 'aviso' | 'peligro' } | null

const TONO = {
  suave: 'text-(--color-ink-soft)',
  aviso: 'text-(--color-aviso-ink)',
  peligro: 'text-(--color-peligro-ink)',
} as const

// La línea debajo de los botones: sin permiso, su motivo; si no, lo que pasa con el guardado.
function lineaDelEstado(estado: EstadoDelTextoBase, motivoDeSoloLectura: string | null): Linea {
  if (motivoDeSoloLectura !== null) {
    return { texto: motivoDeSoloLectura, tono: 'suave' }
  }
  switch (estado?.tipo) {
    case 'guardando':
      return { texto: 'Guardando…', tono: 'suave' }
    case 'guardado':
      return { texto: 'Guardado.', tono: 'suave' }
    case 'sin_red':
      return { texto: estado.mensaje, tono: 'aviso' }
    case 'error':
      return { texto: estado.mensaje, tono: 'peligro' }
    // El conflicto va en lugar de la línea, con «Recargar».
    case 'conflicto':
    case undefined:
      return null
  }
}

// La línea del estado, de dos renglones reservados: aparecer o cambiar no corre lo de abajo.
function RenglonDelEstado({ linea }: { linea: Linea }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn('min-h-[2lh] text-(length:--text-sm)', linea ? TONO[linea.tono] : undefined)}
    >
      {linea?.texto}
    </p>
  )
}

// El texto base del origen (docs/GLOSARIO.md › «Texto base»): el que acompaña al arte al compartir una cotización de este origen. El campo con
// las variables del catálogo del origen (y las `{ficha.<campo>}` y `{celda.<concepto>}` que se escriban, si valen), la vista previa con los datos
// del lienzo, «Guardar» y «Restablecer» (pone el inicial del tipo; se guarda con «Guardar»). Un conflicto ofrece «Recargar» y lo escrito queda;
// sin red, el guardado espera a que vuelva. Con `motivoDelTextoBase`, de sólo lectura y lo dice.
export function SeccionDelTextoBase({
  origen,
  catalogo,
  textoBase,
  motivoDelTextoBase,
  datos,
  sinMoneda,
}: Props) {
  const id = useId()
  const idTitulo = useId()
  const editable = motivoDelTextoBase === null
  const editor = useTextoBase({ origen, textoBase, catalogo, activo: editable })
  const { formulario, estado } = editor
  const ocupado = formulario.enCurso || formulario.recargando === true
  const linea = lineaDelEstado(estado, motivoDelTextoBase)
  return (
    <section aria-labelledby={idTitulo} className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <h3 id={idTitulo} className="text-(length:--text-base) font-semibold text-(--color-ink)">
        Texto base de {origen.nombre}
      </h3>
      <EditorConVariables
        id={id}
        etiqueta="Texto al compartir"
        valor={editor.texto}
        alCambiar={editor.escribir}
        variables={catalogo.variables}
        motivo={editable ? editor.motivo : null}
        largoMaximo={LARGO_MAXIMO_DEL_TEXTO_BASE}
        deshabilitado={!editable || formulario.enCurso}
        aceptaLaClave={(clave) => valeEnElOrigen(clave, catalogo)}
        compacto
      />
      <VistaPreviaConDatos
        texto={editor.texto}
        catalogo={catalogo}
        datos={datos}
        sinMoneda={sinMoneda}
      />
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            className="min-h-11 md:min-h-9"
            disabled={!editor.puedeGuardar}
            onClick={() => {
              void formulario.enviar()
            }}
          >
            Guardar
          </Button>
          <Button
            variant="outline"
            className="min-h-11 md:min-h-9"
            disabled={!editable || ocupado || editor.esElInicial}
            onClick={editor.restablecer}
          >
            Restablecer
          </Button>
        </div>
        {estado?.tipo === 'conflicto' ? (
          <AvisoDeConflicto
            mensaje={estado.mensaje}
            alRecargar={() => formulario.recargar?.()}
            enCurso={formulario.recargando === true}
            detalle="Lo que escribiste sigue acá."
          />
        ) : (
          <RenglonDelEstado linea={linea} />
        )}
      </div>
    </section>
  )
}
