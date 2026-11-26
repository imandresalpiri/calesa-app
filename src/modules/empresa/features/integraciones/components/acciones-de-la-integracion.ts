import type { AccionDeMenu } from '@/shared/ui/lista'
import type { PanelesDeIntegraciones } from '../hooks/use-paneles-de-integraciones'

type Abrir = { clave: string; etiqueta: string; abrir: () => void; principal?: boolean }

// Una línea del «⋯» que abre un modal: apagada si no se puede (la nota con el motivo va una vez, al final: `notaDelMotivo()`).
export function accionQueAbre(
  { clave, etiqueta, abrir, principal }: Abrir,
  motivo: string | null,
): AccionDeMenu {
  return {
    tipo: 'accion',
    clave,
    etiqueta,
    ...(principal ? { principal } : {}),
    deshabilitada: motivo !== null,
    despuesDeCerrar: true,
    alElegir: abrir,
  }
}

export function notaDelMotivo(motivo: string | null): AccionDeMenu[] {
  return motivo === null ? [] : [{ tipo: 'nota', clave: 'motivo', texto: motivo }]
}

type DeApibara = {
  paneles: PanelesDeIntegraciones
  sinClave: boolean
  motivo: string | null
  // Por qué «Ver uso» no se puede (sin permiso, o sin clave), o null.
  motivoDelUso: string | null
  consultando: boolean
  verUso: () => void
}

// El «⋯» de apibara: configurar (la principal), la clave y «Ver uso».
export function accionesDeApibara(datos: DeApibara): AccionDeMenu[] {
  const { paneles, sinClave, motivo, motivoDelUso } = datos
  return [
    accionQueAbre(
      {
        clave: 'configurar',
        etiqueta: 'Configurar…',
        abrir: paneles.apibara.abrir,
        principal: true,
      },
      motivo,
    ),
    accionQueAbre(
      {
        clave: 'clave',
        etiqueta: sinClave ? 'Cargar la clave' : 'Reemplazar la clave',
        abrir: paneles.claveApibara.abrir,
      },
      motivo,
    ),
    {
      tipo: 'accion',
      clave: 'uso',
      etiqueta: 'Ver uso',
      deshabilitada: motivoDelUso !== null || datos.consultando,
      alElegir: datos.verUso,
    },
    ...notaDelMotivo(motivoDelUso),
  ]
}

type DeLaWeb = {
  paneles: PanelesDeIntegraciones
  conSecreto: boolean
  motivo: string | null
  // Por qué «Probar» no se puede (sin permiso, sin dirección o sin secreto), o null.
  motivoDeProbar: string | null
  probando: boolean
  probar: () => void
}

// El «⋯» de la web pública: configurar (la principal), el secreto y «Probar».
export function accionesDeLaWeb(datos: DeLaWeb): AccionDeMenu[] {
  const { paneles, conSecreto, motivo, motivoDeProbar } = datos
  return [
    accionQueAbre(
      {
        clave: 'configurar',
        etiqueta: 'Configurar…',
        abrir: paneles.webPublica.abrir,
        principal: true,
      },
      motivo,
    ),
    accionQueAbre(
      {
        clave: 'secreto',
        etiqueta: conSecreto ? 'Reemplazar el secreto' : 'Cargar el secreto',
        abrir: paneles.secretoWeb.abrir,
      },
      motivo,
    ),
    {
      tipo: 'accion',
      clave: 'probar',
      etiqueta: datos.probando ? 'Probando…' : 'Probar',
      deshabilitada: motivoDeProbar !== null || datos.probando,
      alElegir: datos.probar,
    },
    ...notaDelMotivo(motivoDeProbar),
  ]
}

type DelAsistente = {
  paneles: PanelesDeIntegraciones
  conClave: boolean
  motivo: string | null
  // Por qué «Probar conexión» no se puede (sin permiso o sin clave), o null.
  motivoDeProbar: string | null
  probando: boolean
  probar: () => void
}

// El «⋯» del asistente de IA: configurar el proveedor (la principal), el prompt base y los atajos, la clave y «Probar conexión».
export function accionesDelAsistente(datos: DelAsistente): AccionDeMenu[] {
  const { paneles, conClave, motivo, motivoDeProbar } = datos
  return [
    accionQueAbre(
      {
        clave: 'configurar',
        etiqueta: 'Configurar…',
        abrir: paneles.asistente.abrir,
        principal: true,
      },
      motivo,
    ),
    accionQueAbre(
      {
        clave: 'indicaciones',
        etiqueta: 'Editar el prompt base y los atajos…',
        abrir: paneles.indicaciones.abrir,
      },
      motivo,
    ),
    accionQueAbre(
      {
        clave: 'clave',
        etiqueta: conClave ? 'Reemplazar la clave' : 'Cargar la clave',
        abrir: paneles.claveAsistente.abrir,
      },
      motivo,
    ),
    {
      tipo: 'accion',
      clave: 'probar',
      etiqueta: datos.probando ? 'Probando…' : 'Probar conexión',
      deshabilitada: motivoDeProbar !== null || datos.probando,
      alElegir: datos.probar,
    },
    ...notaDelMotivo(motivoDeProbar),
  ]
}
