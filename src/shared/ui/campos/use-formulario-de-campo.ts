'use client'

import { useState } from 'react'
import {
  problemaDelRango,
  rangoDe,
  tieneRango,
  valorDefectoPara,
  type CampoBase,
  type ResumenDeImpacto,
} from '@/shared/lib/campos'
import type { ErrorApp } from '@/shared/lib/errores'
import { useConflictoHastaLaVersion } from '@/shared/ui/use-conflicto-hasta-la-version'
import { useAlAbrir } from './use-borrador-del-campo'
import type {
  ConfiguracionDeCampos,
  EdicionesDeCampos,
  ErroresDeCampo,
  ValoresDeCampo,
} from './tipos'

type Aviso = { modo: 'guardar' | 'eliminar'; resumen: ResumenDeImpacto }

type Args<Campo extends CampoBase, Cambios extends object, Nuevo> = {
  campo: Campo | null
  todos: readonly Campo[]
  configuracion: ConfiguracionDeCampos<Campo, Cambios, Nuevo>
  ediciones: EdicionesDeCampos<Cambios, Nuevo>
  // «Eliminar…» del «⋯» (`&eliminar=1`): al abrir, cuenta y muestra el aviso de eliminar (uno de fábrica no se elimina).
  eliminarAlAbrir?: boolean
  alTerminar: () => void
}

// Un valor por defecto que deja de servir (cambió el tipo, se sacó su opción) se va solo; el rango, si el tipo ya no es un número
// ni un monto (como la base).
function conDefectoVigente(valores: ValoresDeCampo): ValoresDeCampo {
  const conRango = tieneRango(valores.tipo)
  return {
    ...valores,
    valorDefecto: valorDefectoPara(valores.tipo, valores.opciones, valores.valorDefecto),
    minimo: conRango ? valores.minimo : null,
    maximo: conRango ? valores.maximo : null,
  }
}

type ResultadoDeGuardar =
  | { estado: 'guardado' | 'sin_cambios' }
  | { estado: 'fallo'; error: ErrorApp }
  | { estado: 'pregunta'; resumen: ResumenDeImpacto }

// Guarda los cambios de un campo. Un cambio que puede tocar datos se cuenta primero; con algo
// que decir (o algo que lo impide) devuelve la pregunta en vez de guardar.
async function guardarCambios<Campo extends CampoBase, Cambios extends object, Nuevo>(
  editado: Campo,
  valores: ValoresDeCampo,
  confirmado: boolean,
  { configuracion, ediciones }: Pick<Args<Campo, Cambios, Nuevo>, 'configuracion' | 'ediciones'>,
): Promise<ResultadoDeGuardar> {
  const cambios = configuracion.cambiosDe(editado, valores)
  if (Object.keys(cambios).length === 0) {
    return { estado: 'sin_cambios' }
  }
  if (!confirmado && configuracion.necesitaVistaPrevia(editado, cambios)) {
    const conteo = await ediciones.vistaPrevia(editado.id, rangoDe(cambios))
    if (!conteo.ok) {
      return { estado: 'fallo', error: conteo.error }
    }
    const resumen = configuracion.resumenDeImpacto(editado, cambios, conteo.data)
    if (resumen.bloquea || resumen.avisos.length > 0) {
      return { estado: 'pregunta', resumen }
    }
  }
  const resultado = await ediciones.guardar(editado, cambios)
  return resultado.ok ? { estado: 'guardado' } : { estado: 'fallo', error: resultado.error }
}

// Lo que la persona escribe en el formulario y lo que se le avisa. Cualquier cambio descarta el
// aviso y los errores: lo que se confirma es lo que se está viendo.
function useEstadoDelFormulario(inicial: ValoresDeCampo) {
  const [valores, setValores] = useState(inicial)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [errores, setErrores] = useState<ErroresDeCampo>({})

  function actualizar(cambio: (actuales: ValoresDeCampo) => ValoresDeCampo) {
    setAviso(null)
    setErrores({})
    setValores((actuales) => conDefectoVigente(cambio(actuales)))
  }

  return {
    valores,
    aviso,
    errores,
    setAviso,
    setErrores,
    cambiar: (parcial: Partial<Omit<ValoresDeCampo, 'banderas' | 'textos'>>) => {
      actualizar((actuales) => ({ ...actuales, ...parcial }))
    },
    cambiarBandera: (nombre: string, valor: boolean) => {
      actualizar((actuales) => ({
        ...actuales,
        banderas: { ...actuales.banderas, [nombre]: valor },
      }))
    },
    cambiarTexto: (nombre: string, valor: string) => {
      actualizar((actuales) => ({ ...actuales, textos: { ...actuales.textos, [nombre]: valor } }))
    },
  }
}

// Eliminar pide primero contar: el aviso dice si se puede; confirmar lo elimina.
function eliminacion<Campo extends CampoBase, Cambios extends object, Nuevo>({
  campo,
  configuracion,
  ediciones,
  setAviso,
  alTerminar,
}: Omit<Args<Campo, Cambios, Nuevo>, 'todos' | 'eliminarAlAbrir'> & {
  setAviso: (aviso: Aviso | null) => void
}) {
  return {
    pedirEliminar: async () => {
      if (campo === null) {
        return
      }
      const conteo = await ediciones.vistaPrevia(campo.id)
      if (conteo.ok) {
        setAviso({
          modo: 'eliminar',
          resumen: configuracion.resumenDeEliminacion(campo, conteo.data),
        })
      }
    },
    confirmarEliminar: async () => {
      if (campo === null) {
        return
      }
      const resultado = await ediciones.eliminar(campo)
      if (resultado.ok) {
        alTerminar()
      } else {
        setAviso(null)
      }
    },
  }
}

// El estado de crear o editar un campo, con el aviso de impacto que va antes de guardar un cambio
// que toca datos ya cargados.
export function useFormularioDeCampo<Campo extends CampoBase, Cambios extends object, Nuevo>(
  args: Args<Campo, Cambios, Nuevo>,
) {
  const { campo, todos, configuracion, ediciones, alTerminar } = args
  const { valores, aviso, errores, setAviso, setErrores, ...cambios } = useEstadoDelFormulario(
    configuracion.valoresIniciales(campo),
  )
  // Lo que había al abrir: contra eso se mide si algo se escribió.
  const [inicial] = useState(() => JSON.stringify(valores))
  // Otra persona guardó este campo (`PT409`): se dice en el panel hasta que «Recargar» trae la versión nueva.
  const [conflicto, setConflicto] = useConflictoHastaLaVersion(campo?.actualizadoEn ?? null)
  // Un rechazo al crear que no va junto a un dato (sin red, sin permiso): se dice en el panel, junto a «Crear campo».
  const [rechazo, setRechazo] = useState<string | null>(null)

  const clave =
    campo?.clave ??
    configuracion.claveDe(
      valores.etiqueta.trim() || 'campo',
      todos.map((otro) => otro.clave),
    )

  async function crear() {
    const resultado = await ediciones.crear(configuracion.paraCrear({ ...valores, clave }))
    if (resultado.ok) {
      alTerminar()
    } else if (resultado.error.codigo === 'duplicado') {
      setErrores({ clave: configuracion.textos.claveDuplicada })
    } else if (resultado.error.codigo !== 'validacion') {
      setRechazo(resultado.error.mensaje)
    }
    return resultado.ok
  }

  async function guardar(editado: Campo) {
    const confirmado = aviso?.modo === 'guardar' && !aviso.resumen.bloquea
    const resultado = await guardarCambios(editado, valores, confirmado, {
      configuracion,
      ediciones,
    })
    if (resultado.estado === 'pregunta') {
      setAviso({ modo: 'guardar', resumen: resultado.resumen })
    } else if (resultado.estado === 'fallo') {
      if (resultado.error.codigo === 'conflicto') {
        setConflicto(resultado.error.mensaje)
      }
    } else {
      alTerminar()
    }
    return resultado.estado === 'guardado' || resultado.estado === 'sin_cambios'
  }

  const { pedirEliminar, confirmarEliminar } = eliminacion({
    campo,
    configuracion,
    ediciones,
    setAviso,
    alTerminar,
  })
  useAlAbrir(() => {
    if (args.eliminarAlAbrir === true && campo !== null && !campo.esSistema) {
      void pedirEliminar()
    }
  })

  return {
    valores: { ...valores, clave },
    // Algo escrito que todavía no se guardó (un aviso que sale de la pantalla pregunta antes de irse).
    hayCambios: JSON.stringify(valores) !== inicial,
    ...cambios,
    aviso,
    errores,
    conflicto,
    rechazo,
    enviar: async () => {
      setRechazo(null)
      // El rango se revisa antes de enviar, con los textos de la base, y se dice junto al dato.
      const problema = problemaDelRango(valores)
      if (problema) {
        setErrores({ [problema.campo]: problema.mensaje })
        return false
      }
      return campo === null ? crear() : guardar(campo)
    },
    pedirEliminar,
    confirmarEliminar,
  }
}
