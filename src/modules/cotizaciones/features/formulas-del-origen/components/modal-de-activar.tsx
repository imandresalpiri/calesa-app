'use client'

import { useAction } from 'next-safe-action/hooks'
import Link from 'next/link'
import { useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Label } from '@/shared/ui/label'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { Textarea } from '@/shared/ui/textarea'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import { esperadasDeActivar, loQueCambia } from '../../../entities/formulas-del-origen/activar'
import { destinoDelRechazoDeActivar } from '../../../entities/formulas-del-origen/destino-del-rechazo'
import type { FormulaDeLaLista } from '../../../entities/formulas-del-origen/lista'
import { activarFormulaDelOrigen } from '../actions/activar-formula'
import { useCerrarYReleer } from '../hooks/use-cerrar-y-releer'
import { LARGO_DE_LA_NOTA } from '../schemas/formulas-del-origen'
import { QueSePublica } from './que-se-publica'

type Props = {
  abierto: boolean
  alCerrar: () => void
  origen: { id: string; nombre: string }
  formula: FormulaDeLaLista
  // La activa del origen que se vio (nula: no tenía).
  activa: { id: string; nombre: string } | null
  // Tras activar, en vez de cerrar y volver a leer la pantalla (la puesta en marcha lleva a «Listo»). Se navega sin cerrar antes el panel.
  alActivar?: () => void
}

const FALTA_LA_NOTA = 'Escribe una nota: queda en las versiones que se publican.'

const ID_DE_LA_NOTA = 'formula-nota-de-activar'

function CampoDeLaNota({
  nota,
  error,
  alEscribir,
}: {
  nota: string
  error: string | undefined
  alEscribir: (valor: string) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={ID_DE_LA_NOTA}>Nota</Label>
      <Textarea
        id={ID_DE_LA_NOTA}
        required
        maxLength={LARGO_DE_LA_NOTA}
        value={nota}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${ID_DE_LA_NOTA}-error` : undefined}
        onChange={(e) => {
          alEscribir(e.target.value)
        }}
      />
      {error ? (
        <p
          id={`${ID_DE_LA_NOTA}-error`}
          className="text-(length:--text-sm) text-(--color-peligro-ink)"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

// «Activar «<nombre>»» (`?panel=activar-formula&cual=<id>`): qué se publica (los borradores de la planilla y de la tarjeta), qué cambia para cotizar y la nota.
// Lleva lo que se vio de cada pieza: si algo cambió, PT409 con «Recargar». Un rechazo que nombra una fila, un lugar de la tarjeta o una sub-pestaña ofrece ir ahí.
export function ModalDeActivar({ abierto, alCerrar, origen, formula, activa, alActivar }: Props) {
  const cerrarYReleer = useCerrarYReleer()
  const [nota, setNota] = useState('')
  const [rechazo, setRechazo] = useState<ErrorApp | null>(null)
  const activar = useAction(activarFormulaDelOrigen)
  const esperadas = esperadasDeActivar(formula, activa?.id ?? null)
  const envio = useEnvioConVersion({
    abierto,
    hayCambios: nota.trim() !== '',
    // Cualquier pieza que cambie es otra versión de lo que se activa.
    version: Object.values(esperadas).join('|'),
    validar: () => (nota.trim() === '' ? { nota: FALTA_LA_NOTA } : null),
    pedir: async () => {
      const hecho = await enviarAccion(
        activar.executeAsync({ ...esperadas, origenId: origen.id, nota: nota.trim() }),
        'No se pudo activar la fórmula.',
      )
      setRechazo(hecho.ok || 'sinRed' in hecho ? null : hecho.error)
      return hecho
    },
    alGuardar: () => {
      avisarExito(`«${formula.nombre}» es la fórmula activa de ${origen.nombre}.`)
      if (alActivar) {
        alActivar()
        return
      }
      cerrarYReleer()
    },
  })
  const destino = destinoDelRechazoDeActivar(rechazo?.causa, origen.id, formula.id)
  return (
    <ModalDeFormulario
      id="activar-formula"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Activar «${formula.nombre}»`}
      ancho="amplio"
      formulario={envio}
      guardar={{ etiqueta: `Activar «${formula.nombre}»`, enCurso: 'Activando…' }}
    >
      <QueSePublica formula={formula} />
      <section className="grid gap-1 text-(length:--text-sm)">
        <h3 className="font-semibold text-(--color-ink)">Qué cambia</h3>
        <ul className="grid gap-1 text-(--color-ink-soft)">
          {loQueCambia(origen.nombre, formula.nombre, activa?.nombre ?? null).map((linea) => (
            <li key={linea}>{linea}</li>
          ))}
        </ul>
      </section>
      <CampoDeLaNota
        nota={nota}
        error={envio.errores['nota']}
        alEscribir={(valor) => {
          setNota(valor)
          envio.quitarMotivo('nota')
        }}
      />
      {destino ? (
        <Link
          href={destino.ruta}
          className="inline-flex min-h-11 w-fit items-center font-medium text-(--color-ink) underline underline-offset-4 md:min-h-9"
        >
          {destino.etiqueta}
        </Link>
      ) : null}
    </ModalDeFormulario>
  )
}
