'use client'

import { useMemo, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import {
  MENSAJE_DE_FABRICA,
  MOTIVO_DE_MENSAJE_EN_BLANCO,
  validarMensajeDelPortal,
} from '../../../entities/portal-mensaje'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { guardarMensajeDelPortal } from '../actions/guardar-mensaje-del-portal'

type Guardado = {
  // Nulo: el de fábrica.
  mensaje: string | null
  actualizadoEn: string
}

type Opciones = Guardado & {
  // A la vista: cerrado, lo que esperaba la red no sale.
  abierto: boolean
  alGuardar: () => void
  // Con clave, lo escrito y no guardado queda en `sessionStorage` y vuelve al volver a dibujarse (el editor del arte). Sin ella, no (el modal).
  claveDelBorrador?: string
}

// Por qué lo escrito no se puede guardar, o nulo. En blanco no se guarda: volver al de fábrica es «Restablecer».
function motivoDe(texto: string): string | null {
  const validado = validarMensajeDelPortal(texto)
  if (!validado.ok) {
    return validado.motivo
  }
  return validado.texto === null ? MOTIVO_DE_MENSAJE_EN_BLANCO : null
}

// Lo que se guarda de lo escrito: el de fábrica tal cual queda nulo, así un cambio futuro del de fábrica le llega a la empresa.
function paraGuardar(texto: string): string | null {
  const validado = validarMensajeDelPortal(texto)
  const normalizado = validado.ok ? validado.texto : texto
  return normalizado === MENSAJE_DE_FABRICA ? null : normalizado
}

// Lo guardado y lo escrito. Lo guardado es la base de lo que sigue (quien no se vuelve a montar al guardar sigue con la versión nueva); al
// llegar otra versión por props, el texto la sigue si no había nada escrito y, si lo había, lo escrito queda.
function useTextoSobreLoGuardado({ mensaje, actualizadoEn }: Guardado) {
  const [base, setBase] = useState<Guardado>({ mensaje, actualizadoEn })
  const [versionVista, setVersionVista] = useState(actualizadoEn)
  const [texto, setTexto] = useState(mensaje ?? MENSAJE_DE_FABRICA)
  if (versionVista !== actualizadoEn) {
    setVersionVista(actualizadoEn)
    setBase({ mensaje, actualizadoEn })
    if (texto === (base.mensaje ?? MENSAJE_DE_FABRICA)) {
      setTexto(mensaje ?? MENSAJE_DE_FABRICA)
    }
  }
  return { base, setBase, texto, setTexto }
}

// El mensaje del portal mientras se edita, en el modal de Configuración › Leads o en el editor del arte: el texto parte del guardado o, si no
// hay, del de fábrica con sus variables. Las reglas se dicen antes de enviar (`validarMensajeDelPortal()`, espejo de la base); lo que la base
// rechaza vuelve con su motivo, un conflicto (`PT409`) espera a la versión nueva y, sin red, el guardado espera a que vuelva.
export function useMensajeDelPortal({
  mensaje,
  actualizadoEn,
  abierto,
  alGuardar,
  claveDelBorrador,
}: Opciones) {
  const { base, setBase, texto, setTexto } = useTextoSobreLoGuardado({ mensaje, actualizadoEn })
  const inicial = base.mensaje ?? MENSAJE_DE_FABRICA
  const hayCambios = texto !== inicial

  const escrito = useMemo(() => ({ texto }), [texto])
  const guardado = useMemo(() => ({ texto: inicial }), [inicial])
  const borrador = useBorradorDeEstado({
    clave: claveDelBorrador ?? '',
    valores: escrito,
    guardado,
    alReponer: (cambios) => {
      if ('texto' in cambios) {
        setTexto(cambios.texto)
      }
    },
    activo: abierto && claveDelBorrador !== undefined,
  })

  const formulario = useEnvioConVersion({
    abierto,
    hayCambios,
    version: base.actualizadoEn,
    validar: () => {
      const motivo = hayCambios ? motivoDe(texto) : null
      return motivo === null ? null : { texto: motivo }
    },
    pedir: async () => {
      if (!hayCambios || motivoDe(texto) !== null) {
        return { ok: true, data: { actualizadoEn: base.actualizadoEn } }
      }
      return enviarAccion(
        guardarMensajeDelPortal({
          actualizadoEnEsperado: base.actualizadoEn,
          texto: paraGuardar(texto),
        }),
        MENSAJE_DE_VALIDACION,
      )
    },
    alGuardar: (dato) => {
      const nuevo = hayCambios ? paraGuardar(texto) : base.mensaje
      setBase({ mensaje: nuevo, actualizadoEn: dato.actualizadoEn })
      // Lo escrito, como quedó en la base (sin los blancos de los bordes): sin cambios a la vista.
      setTexto(nuevo ?? MENSAJE_DE_FABRICA)
      if (claveDelBorrador !== undefined) {
        borrador.limpiar()
      }
      alGuardar()
    },
    campoDelRechazo: (error) =>
      error.codigo === 'regla' || error.codigo === 'validacion' ? 'texto' : null,
  })

  return {
    texto,
    escribir: (valor: string) => {
      setTexto(valor)
      formulario.quitarMotivo('texto')
    },
    // Pone el de fábrica en el campo; se guarda con «Guardar» (queda nulo).
    restablecer: () => {
      setTexto(MENSAJE_DE_FABRICA)
      formulario.quitarMotivo('texto')
    },
    hayCambios,
    esElDeFabrica: texto === MENSAJE_DE_FABRICA,
    // El motivo de lo que no se guardó (al enviar o lo que rechazó la base).
    motivo: formulario.errores['texto'] ?? null,
    // El de lo escrito, en vivo: con él no hay nada que enviar.
    motivoEnVivo: hayCambios ? motivoDe(texto) : null,
    // En blanco con el motivo a la vista: se ofrece volver al de fábrica.
    pideRestablecer: formulario.errores['texto'] === MOTIVO_DE_MENSAJE_EN_BLANCO,
    formulario,
  }
}
