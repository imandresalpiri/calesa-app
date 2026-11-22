'use client'

import { useMemo, useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { esquemaDiseno, type Diseno } from '../../../entities/diseno'
import {
  esquemaCambiosDeNodos,
  SIN_CAMBIOS_DE_NODOS,
  type CambiosDeNodos,
} from '../../../entities/diseno/edicion-de-nodos'
import {
  hayCambiosEnElDiseno,
  pedidoDeGuardarDiseno,
  type BaseDelDiseno,
  type BorradorDelDisenoGuardado,
  type DisenoParaEditar,
} from '../../../entities/diseno/edicion-del-diseno'
import type { Definicion } from '../../../entities/formula'
import { guardarDiseno } from '../actions/guardar-diseno'
import {
  MENSAJE_DE_VALIDACION,
  motivoParaNoGuardarElDiseno,
  type EstadoDelGuardadoDelDiseno,
} from './use-guardar-diseno.soporte'

type EnvioALaVez = {
  mandar: <T>(envio: () => Promise<T>) => Promise<T | null>
  enCurso: boolean
}

function estadoDelError(
  envio: Exclude<Envio<BorradorDelDisenoGuardado>, { ok: true }>,
): EstadoDelGuardadoDelDiseno {
  if ('sinRed' in envio) return { tipo: 'sin_respuesta' }
  const { codigo, mensaje } = envio.error
  // Sólo el PT409 trae el texto de la base (nombra a una persona y cuándo); lo demás, su texto propio.
  if (codigo === 'conflicto') return { tipo: 'conflicto', mensaje }
  if (codigo === 'regla') return { tipo: 'regla' }
  if (codigo === 'sin_permiso') return { tipo: 'sin_permiso' }
  return { tipo: 'error' }
}

// Lo que se edita en la pestaña: el diseño y el rótulo y el formato de las filas.
export type LoEditado = { diseno: Diseno; nodos: CambiosDeNodos }
type Valores = { diseno: unknown; nodos: unknown }

const baseDe = ({
  id,
  formulaDelOrigenId,
  estado,
  actualizadoEn,
  nota,
}: DisenoParaEditar): BaseDelDiseno => ({
  id,
  formulaDelOrigenId,
  estado,
  actualizadoEn,
  nota,
})

type Args = {
  origenId: string
  leida: DisenoParaEditar
  // El diseño de este editor (nunca nulo: sin diseño no se abre).
  disenoLeido: Diseno
  trabajo: Diseno
  // Lo editado de las filas y la definición que resulta (la que se manda).
  nodos: CambiosDeNodos
  definicion: Definicion
  // Por qué todavía no se guarda (una sección vacía); nulo: se puede.
  bloqueo: string | null
  envio: EnvioALaVez
  // Lo editado pasa a otro: lo que trae el borrador local o, al descartar, lo guardado.
  alReemplazar: (editado: LoEditado) => void
}

// «Guardar el borrador» de la hoja: la base sobre la que guarda (la versión leída y, tras guardar, la fila que devolvió la base, sin releer: releer dejaría
// entrar a otra persona entremedio), lo guardado contra lo que se mide si hay cambios (el diseño y los rótulos y formatos), y lo cambiado en la pestaña con
// `useBorradorDeEstado`, por origen, id y hora de la base (otra versión no lo repone; tras guardar se limpia). Manda la definición con lo editado de las filas.
export function useGuardadoDelDiseno({
  origenId,
  leida,
  disenoLeido,
  trabajo,
  nodos,
  definicion,
  bloqueo,
  envio,
  alReemplazar,
}: Args) {
  const [base, setBase] = useState<BaseDelDiseno>(() => baseDe(leida))
  const [guardado, setGuardado] = useState<LoEditado>(() => ({
    diseno: disenoLeido,
    nodos: SIN_CAMBIOS_DE_NODOS,
  }))
  const [estado, setEstado] = useState<EstadoDelGuardadoDelDiseno>({ tipo: 'quieto' })

  const valores = useMemo<LoEditado>(() => ({ diseno: trabajo, nodos }), [trabajo, nodos])
  const { limpiar } = useBorradorDeEstado<Valores>({
    clave: `hoja-editor:${origenId}:${base.id}:${base.actualizadoEn}`,
    valores,
    guardado,
    // Llegan sólo las claves que cambian: la otra queda como está.
    alReponer: (cambios) => {
      const diseno = 'diseno' in cambios ? esquemaDiseno.safeParse(cambios.diseno) : null
      const repuestos = 'nodos' in cambios ? esquemaCambiosDeNodos.safeParse(cambios.nodos) : null
      if (diseno?.success === false || repuestos?.success === false) return
      alReemplazar({ diseno: diseno?.data ?? trabajo, nodos: repuestos?.data ?? nodos })
    },
  })

  const hayCambios = useMemo(() => hayCambiosEnElDiseno(guardado, valores), [guardado, valores])

  async function guardar() {
    if (bloqueo !== null) return
    const pedido = pedidoDeGuardarDiseno(
      base,
      { definicion, params: leida.params },
      trabajo,
      origenId,
    )
    const editado = valores
    // Lo que dijo el intento anterior no queda a la vista mientras corre este.
    setEstado({ tipo: 'quieto' })
    const r = await envio.mandar(() => enviarAccion(guardarDiseno(pedido), MENSAJE_DE_VALIDACION))
    if (r === null) return
    if (!r.ok) {
      setEstado(estadoDelError(r))
      return
    }
    limpiar()
    setBase((b) => ({
      ...b,
      id: r.data.id,
      actualizadoEn: r.data.actualizadoEn,
      estado: 'borrador',
      nota: b.estado === 'publicada' ? null : b.nota,
    }))
    setGuardado(editado)
    setEstado({ tipo: 'entro' })
  }

  // «Descartar» de la barra de los cambios sin guardar: vuelve a lo guardado y suelta el borrador de la pestaña.
  function descartar() {
    limpiar()
    alReemplazar(guardado)
  }

  return {
    enCurso: envio.enCurso,
    estado,
    motivo: bloqueo ?? motivoParaNoGuardarElDiseno(hayCambios),
    guardar,
    descartar,
    hayCambios,
    // La versión que se edita ahora: guardar sobre la publicada crea el borrador.
    versionEditada: base.estado,
  }
}
