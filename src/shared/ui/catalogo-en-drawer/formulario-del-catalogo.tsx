'use client'

import { useId } from 'react'
import type { ElementoDeCatalogo } from '@/shared/lib/catalogo'
import { Button } from '@/shared/ui/button'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { Campo } from '@/shared/ui/campo'
import { useEnLinea } from '@/shared/ui/use-en-linea'

type Props = {
  nombre: string
  alCambiar: (texto: string) => void
  // El que se está renombrando, o nulo si el formulario agrega uno.
  editando: ElementoDeCatalogo | null
  error: string | undefined
  enCurso: boolean
  maximo: number
  alEnviar: () => void
  alCancelar: () => void
}

// El nombre de un elemento: «Agregar» al final, o «Guardar» sobre el que se renombra. Va dentro del `<Drawer>` (su contexto recibe lo
// escrito). Un nombre repetido lo dice la base, con el que existe («Ya existe «X».»), junto al campo.
export function FormularioDelCatalogo({
  nombre,
  alCambiar,
  editando,
  error,
  enCurso,
  maximo,
  alEnviar,
  alCancelar,
}: Props) {
  const id = useId()
  const enLinea = useEnLinea()
  return (
    <>
      <CambiosSinGuardar hayCambios={nombre.trim() !== '' && nombre !== (editando?.nombre ?? '')} />
      <form
        id={id}
        noValidate
        className="grid gap-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          alEnviar()
        }}
      >
        <Campo
          nombre="nombre-del-elemento"
          etiqueta={editando ? `Renombrar «${editando.nombre}»` : 'Nombre'}
          maxLength={maximo}
          autoComplete="off"
          value={nombre}
          onChange={(evento) => {
            alCambiar(evento.target.value)
          }}
          error={error}
          disabled={enCurso}
        />
        <div className="flex flex-wrap justify-end gap-2">
          {editando ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 md:min-h-9"
              onClick={alCancelar}
              disabled={enCurso}
            >
              Cancelar
            </Button>
          ) : null}
          <Button type="submit" className="min-h-11 md:min-h-9" disabled={enCurso || !enLinea}>
            {editando ? 'Guardar' : 'Agregar'}
          </Button>
        </div>
        {enLinea ? null : (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            No hay conexión. Lo que escribiste sigue acá.
          </p>
        )}
      </form>
    </>
  )
}
