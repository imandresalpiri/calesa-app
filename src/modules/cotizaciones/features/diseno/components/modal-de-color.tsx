'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { LARGO_MAXIMO_DEL_NOMBRE_DE_TONO, type Tono } from '../../../entities/diseno/tonos'
import type { Colores } from '../hooks/use-colores'
import { useFormularioDeColor } from '../hooks/use-formulario-de-color'
import { CampoDeColor } from './campo-de-color'
import { ComoSeVeElColor } from './como-se-ve-el-color'

type Props = {
  abierto: boolean
  alCerrar: () => void
  colores: Colores
  // Nulo = «Nuevo color».
  original: Tono | null
  // Ya no se puede guardar lo escrito (otra persona eliminó el color que se editaba).
  noDisponible: string | null
}

const IDS = { formulario: 'color', nombre: 'nombre', hex: 'hex' } as const

// «Nuevo color» y «Editar color» (`?panel=nuevo-tono`, `?panel=editar-tono&tono=<id>`: la URL conserva el nombre técnico): el nombre, el color (un hex) y cómo se ve
// en la hoja y en la tarjeta. Del nombre sale la clave, que no cambia nunca (la nombran los grupos de una fórmula). El contrato del modal (preguntar antes de cerrar
// con algo escrito, no cerrarse mientras guarda, el conflicto con «Recargar» que conserva lo escrito) es de `ModalDeFormulario`. Quien lo monta le da una `key` por
// apertura: cada una empieza de cero, con un id de intento nuevo.
export function ModalDeColor({ abierto, alCerrar, colores, original, noDisponible }: Props) {
  const formulario = useFormularioDeColor({ colores, original, alCerrar, abierto })

  return (
    <ModalDeFormulario
      id={IDS.formulario}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar color' : 'Nuevo color'}
      {...(original
        ? { descripcion: `La clave «${original.clave}» no cambia: la nombran los grupos.` }
        : {})}
      focoInicial={() => document.getElementById(IDS.nombre)}
      // Al cerrarse vuelve la lista de colores, que se queda con el foco.
      focoAlCerrar={() => false}
      formulario={formulario}
      noDisponible={noDisponible}
      detalleDelConflicto="Lo que escribiste sigue acá."
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Crear color', enCurso: 'Creando…' }
      }
    >
      <Campo
        nombre={IDS.nombre}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DEL_NOMBRE_DE_TONO + 20}
        value={formulario.nombre}
        onChange={(evento) => {
          formulario.escribirNombre(evento.target.value)
        }}
        error={formulario.errores['nombre']}
        ayuda={`Hasta ${String(LARGO_MAXIMO_DEL_NOMBRE_DE_TONO)} caracteres. Dos colores no pueden llamarse igual.`}
      />
      <CampoDeColor
        nombre={IDS.hex}
        valor={formulario.hex}
        error={formulario.errores['hex']}
        alEscribir={formulario.escribirHex}
      />
      <ComoSeVeElColor hex={formulario.hex} />
    </ModalDeFormulario>
  )
}
