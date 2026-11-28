'use client'

import { useMemo, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import { normalizarTextoBase, validarTextoBase } from '../../../entities/datos/texto-base'
import { textoBaseInicial } from '../../../entities/datos/texto-base-inicial'
import type { TipoDeOrigenDelArte } from '../../../entities/datos/tipos'
import type { CatalogoDelArte } from '../../../entities/datos/variables-del-arte'
import { guardarTextoBaseDelOrigen } from '../actions/guardar-texto-base'
import { MENSAJE_DE_VALIDACION_DEL_TEXTO_BASE } from '../schemas/guardar-texto-base'

// Lo guardado: el texto y su versión tal como la dio la base (nula: la fila no se pudo leer; se parte del inicial del tipo).
type Guardado = { texto: string; actualizadoEn: string | null }

type Args = {
  origen: { id: string; tipo: TipoDeOrigenDelArte }
  textoBase: { texto: string; actualizadoEn: string } | null
  catalogo: CatalogoDelArte
  // En falso (sólo lectura) no guarda borrador ni envía.
  activo: boolean
}

// Lo que dice la línea del guardado debajo de los botones. El conflicto va en su lugar, con «Recargar».
export type EstadoDelTextoBase =
  | { tipo: 'guardando' }
  | { tipo: 'guardado' }
  | { tipo: 'conflicto'; mensaje: string }
  | { tipo: 'sin_red'; mensaje: string }
  | { tipo: 'error'; mensaje: string }
  | null

export const SIN_CONEXION = 'Sin conexión: no se guardó. Lo escrito queda como borrador.'

// Conflicto, guardando, sin red, un rechazo que no es del campo o lo recién guardado (hasta el próximo cambio).
function estadoDelGuardado(
  formulario: {
    conflicto: string | null
    enCurso: boolean
    esperandoConexion: boolean
    aviso: string | null
  },
  recienGuardado: boolean,
): EstadoDelTextoBase {
  if (formulario.conflicto !== null) {
    return { tipo: 'conflicto', mensaje: formulario.conflicto }
  }
  if (formulario.enCurso) {
    return { tipo: 'guardando' }
  }
  if (formulario.esperandoConexion) {
    return { tipo: 'sin_red', mensaje: SIN_CONEXION }
  }
  if (formulario.aviso) {
    return { tipo: 'error', mensaje: formulario.aviso }
  }
  return recienGuardado ? { tipo: 'guardado' } : null
}

// Lo guardado es la base de lo que sigue (guardar no remonta: se sigue con la versión que devolvió). Si llega otra versión por props
// («Recargar» tras un conflicto), el texto la sigue si no había nada escrito; si lo había, lo escrito queda.
function useTextoSobreLoGuardado(desdeProps: Guardado) {
  const [base, setBase] = useState<Guardado>(desdeProps)
  const [versionVista, setVersionVista] = useState(desdeProps.actualizadoEn)
  const [texto, setTexto] = useState(desdeProps.texto)
  if (versionVista !== desdeProps.actualizadoEn) {
    setVersionVista(desdeProps.actualizadoEn)
    setBase(desdeProps)
    if (texto === base.texto) {
      setTexto(desdeProps.texto)
    }
  }
  return { base, setBase, texto, setTexto }
}

// El texto base de un origen mientras se edita en la pestaña «Textos»: parte de lo guardado (o del inicial del tipo si no se pudo leer). Las
// reglas se dicen en vivo (`validarTextoBase()`, espejo de la base); un envío a la vez; un rechazo de la base vuelve junto al campo, un
// conflicto (`PT409`) espera a la versión nueva y, sin red, el guardado espera a que vuelva y lo escrito queda como borrador
// (`sessionStorage`, por origen y versión: una versión nueva no repone lo escrito sobre la vieja).
export function useTextoBase({ origen, textoBase, catalogo, activo }: Args) {
  const inicialDelTipo = textoBaseInicial(origen.tipo)
  const { base, setBase, texto, setTexto } = useTextoSobreLoGuardado(
    textoBase ?? { texto: inicialDelTipo, actualizadoEn: null },
  )
  const normalizado = normalizarTextoBase(texto)
  const hayCambios = normalizado !== base.texto
  const validado = validarTextoBase(texto, catalogo)
  const motivoEnVivo = validado.ok ? null : validado.motivo
  const [recienGuardado, setRecienGuardado] = useState(false)

  const escrito = useMemo(() => ({ texto }), [texto])
  const guardado = useMemo(() => ({ texto: base.texto }), [base.texto])
  const borrador = useBorradorDeEstado({
    clave: `artes:texto-base:${origen.id}:${base.actualizadoEn ?? 'sin-version'}`,
    valores: escrito,
    guardado,
    alReponer: (cambios) => {
      if ('texto' in cambios) {
        setTexto(cambios.texto)
      }
    },
    activo,
  })

  const formulario = useEnvioConVersion({
    abierto: activo,
    hayCambios,
    version: base.actualizadoEn,
    validar: () => (hayCambios && motivoEnVivo !== null ? { texto: motivoEnVivo } : null),
    pedir: async () => {
      if (!hayCambios || !validado.ok) {
        return { ok: true, data: { actualizadoEn: base.actualizadoEn ?? '' } }
      }
      return enviarAccion(
        guardarTextoBaseDelOrigen({
          origenId: origen.id,
          texto: validado.texto,
          actualizadoEnEsperado: base.actualizadoEn,
        }),
        MENSAJE_DE_VALIDACION_DEL_TEXTO_BASE,
      )
    },
    alGuardar: (dato) => {
      if (!hayCambios || !validado.ok) {
        return
      }
      borrador.limpiar()
      setBase({ texto: validado.texto, actualizadoEn: dato.actualizadoEn })
      // Lo escrito, como quedó en la base (sin los blancos de los bordes): sin cambios a la vista.
      setTexto(validado.texto)
      setRecienGuardado(true)
    },
    campoDelRechazo: (error) =>
      error.codigo === 'regla' || error.codigo === 'validacion' ? 'texto' : null,
  })

  return {
    texto,
    escribir: (valor: string) => {
      setRecienGuardado(false)
      setTexto(valor)
      formulario.quitarMotivo('texto')
    },
    // Pone el inicial del tipo del origen; se guarda con «Guardar».
    restablecer: () => {
      setRecienGuardado(false)
      setTexto(inicialDelTipo)
      formulario.quitarMotivo('texto')
    },
    hayCambios,
    esElInicial: normalizado === inicialDelTipo,
    // Lo que rechazó la base al guardar, o lo de lo escrito en vivo: va junto al campo.
    motivo: formulario.errores['texto'] ?? motivoEnVivo,
    puedeGuardar:
      activo &&
      !formulario.enCurso &&
      formulario.recargando !== true &&
      formulario.conflicto === null &&
      hayCambios &&
      validado.ok,
    estado: estadoDelGuardado(formulario, recienGuardado && !hayCambios),
    formulario,
  }
}
