'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useFocoTrasMover } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { motivoParaNoAgregarAtajo } from '../../../entities/asistente-ia/atajos'
import type { ModalDeIndicaciones } from '../hooks/use-modal-de-indicaciones'
import { FilaDeAtajo, PREFIJO_DE_ATAJOS } from './fila-de-atajo'

// La sección «Atajos» del modal: «Nuevo atajo» arriba (apagado en el tope, con su motivo) y una fila por atajo, en el orden de los botones al
// compartir. Son a lo sumo 20: sin virtualizar.
export function FilasDeAtajos({ modal }: { modal: ModalDeIndicaciones }) {
  const { atajos, formulario } = modal
  const motivo = motivoParaNoAgregarAtajo(atajos)
  useFocoTrasMover(PREFIJO_DE_ATAJOS, modal.movimiento)
  return (
    <section aria-labelledby="atajos-del-asistente" className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="atajos-del-asistente" className="text-(length:--text-base) font-semibold">
          Atajos
        </h3>
        <Button
          variant="outline"
          className="h-11 md:h-8"
          disabled={motivo !== null || formulario.enCurso}
          onClick={modal.agregar}
        >
          <PlusIcon aria-hidden />
          Nuevo atajo
        </Button>
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        {motivo ?? 'Cada atajo es un botón al compartir: le pide a la IA su instrucción.'}
      </p>
      {formulario.errores['atajos'] ? (
        <p className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {formulario.errores['atajos']}
        </p>
      ) : null}
      {atajos.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Sin atajos: al compartir sólo se puede pedir con una instrucción libre.
        </p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {atajos.map((atajo, indice) => (
            <FilaDeAtajo
              key={atajo.id}
              atajo={atajo}
              puedeSubir={indice > 0}
              puedeBajar={indice < atajos.length - 1}
              nuevo={atajo.id === modal.nuevo}
              errores={formulario.errores}
              deshabilitado={formulario.enCurso}
              alCambiar={(cambio) => {
                modal.cambiar(atajo.id, cambio)
              }}
              alMover={(direccion) => {
                modal.mover(atajo.id, direccion)
              }}
              alQuitar={() => {
                modal.quitar(atajo.id)
              }}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
