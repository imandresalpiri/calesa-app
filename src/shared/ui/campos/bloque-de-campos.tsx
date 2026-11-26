'use client'

import type { CampoDeFormulario as Campo, ValorDeFormulario } from '@/shared/lib/campos'
import { Bloque } from '../bloque'
import { CampoDeFormulario } from './campo-de-formulario'

type Props = {
  titulo: string
  descripcion?: string
  campos: readonly Campo[]
  valores: Readonly<Record<string, ValorDeFormulario>>
  errores: Readonly<Record<string, string | undefined>>
  alCambiar: (clave: string, valor: ValorDeFormulario) => void
  deshabilitado: boolean
  // El primer campo del formulario recibe el foco al abrir.
  enfocarPrimero?: boolean
}

// Un bloque de campos a la vista, con su título: un texto largo ocupa las dos columnas.
export function BloqueDeCampos({
  titulo,
  descripcion,
  campos,
  valores,
  errores,
  alCambiar,
  deshabilitado,
  enfocarPrimero,
}: Props) {
  if (campos.length === 0) {
    return null
  }
  return (
    <Bloque titulo={titulo} {...(descripcion ? { descripcion } : {})}>
      <div className="grid gap-3 sm:grid-cols-2">
        {campos.map((campo, indice) => (
          <div
            key={campo.clave}
            className={campo.control.tipo === 'texto_largo' ? 'sm:col-span-2' : undefined}
          >
            <CampoDeFormulario
              campo={campo}
              valor={valores[campo.clave]}
              error={errores[campo.clave]}
              alCambiar={(valor) => {
                alCambiar(campo.clave, valor)
              }}
              deshabilitado={deshabilitado}
              enfocar={enfocarPrimero === true && indice === 0}
            />
          </div>
        ))}
      </div>
    </Bloque>
  )
}
