'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import { LARGO_DEL_NOMBRE, nombreDeLaFormula } from '../../../entities/formula-del-origen'
import type { FormulaDeLaLista } from '../../../entities/formulas-del-origen/lista'
import { renombrarFormulaDelOrigen } from '../actions/renombrar-formula'
import { useCerrarYReleer } from '../hooks/use-cerrar-y-releer'

type Props = {
  abierto: boolean
  alCerrar: () => void
  origenId: string
  formula: Pick<FormulaDeLaLista, 'id' | 'nombre' | 'actualizadoEn'>
}

// «Renombrar «<nombre>»» (`?panel=renombrar-formula&cual=<id>`): con la versión que se leyó. Un nombre repetido se dice junto al campo; un PT409, con
// «Recargar» (trae la versión de ahora y deja lo escrito).
export function ModalDeRenombrar({ abierto, alCerrar, origenId, formula }: Props) {
  const cerrarYReleer = useCerrarYReleer()
  const [nombre, setNombre] = useState(formula.nombre)
  const renombrar = useAction(renombrarFormulaDelOrigen)
  const envio = useEnvioConVersion({
    abierto,
    hayCambios: nombre.trim() !== formula.nombre,
    version: formula.actualizadoEn,
    validar: () => {
      const elNombre = nombreDeLaFormula(nombre)
      return elNombre.ok ? null : { nombre: elNombre.error.mensaje }
    },
    pedir: () =>
      enviarAccion(
        renombrar.executeAsync({
          id: formula.id,
          origenId,
          esperada: formula.actualizadoEn,
          nombre: nombre.trim(),
        }),
        'No se pudo renombrar la fórmula.',
      ),
    alGuardar: () => {
      avisarExito(`Ahora se llama «${nombre.trim()}».`)
      cerrarYReleer()
    },
  })
  return (
    <ModalDeFormulario
      id="renombrar-formula"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Renombrar «${formula.nombre}»`}
      formulario={envio}
      guardar={{ etiqueta: 'Renombrar', enCurso: 'Renombrando…' }}
    >
      <Campo
        nombre="formula-nuevo-nombre"
        etiqueta="Nombre"
        autoComplete="off"
        required
        maxLength={LARGO_DEL_NOMBRE * 2}
        value={nombre}
        onChange={(e) => {
          setNombre(e.target.value)
          envio.quitarMotivo('nombre')
        }}
        ayuda={`${String([...nombre].length)} de ${String(LARGO_DEL_NOMBRE)}`}
        error={envio.errores['nombre']}
      />
    </ModalDeFormulario>
  )
}
