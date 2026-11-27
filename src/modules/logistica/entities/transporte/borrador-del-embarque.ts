import type { DatosDelEmbarqueLeido } from './embarque'
import type { DatosDelContenedor, DatosDelEmbarque } from './repositorio-de-embarques'
import { LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE } from './transporte'

// Lo tipeado en «Nuevo embarque» / «Editar el embarque» y en el formulario de un contenedor: textos (`''` = vacío) que se vuelven lo que admite la base. Al editar sólo viaja lo que cambió.
// La base vuelve a revisar todo (forma del booking, fechas, unicidad); acá se avisa antes lo que se ve a simple vista.

export type BorradorDelEmbarque = {
  booking: string
  naviera: string
  puertoOrigen: string
  puertoDestino: string
  zarpeEstimado: string
  zarpe: string
  eta: string
  arribo: string
  notas: string
}

export type BorradorDelContenedor = {
  numero: string
  tipo: string
  sello: string
  // El embarque en que va (`''`: sin embarque).
  embarque: string
  notas: string
}

export type Validado<D> = { ok: true; datos: D } | { ok: false; errores: Record<string, string> }

// La forma de la base: sin ningún espacio y en mayúsculas.
const FORMA_DEL_CODIGO = /^[A-Z0-9./-]{1,40}$/
export const LARGO_MAXIMO_DEL_SELLO = 40

export const normalizarCodigo = (texto: string) => texto.replace(/\s/g, '').toUpperCase()
const nulo = (texto: string) => (texto.trim() === '' ? null : texto.trim())

const BORRADOR_NUEVO_DEL_EMBARQUE: BorradorDelEmbarque = {
  booking: '',
  naviera: '',
  puertoOrigen: '',
  puertoDestino: '',
  zarpeEstimado: '',
  zarpe: '',
  eta: '',
  arribo: '',
  notas: '',
}

const texto = (valor: string | null) => valor ?? ''

export function borradorDelEmbarque(
  e: (DatosDelEmbarqueLeido & { notas: string | null }) | null,
): BorradorDelEmbarque {
  if (e === null) return BORRADOR_NUEVO_DEL_EMBARQUE
  return {
    booking: e.booking,
    naviera: texto(e.navieraId),
    puertoOrigen: texto(e.puertoOrigenId),
    puertoDestino: texto(e.puertoDestinoId),
    zarpeEstimado: texto(e.zarpeEstimadoEl),
    zarpe: texto(e.zarpeEl),
    eta: texto(e.etaEl),
    arribo: texto(e.arriboEl),
    notas: texto(e.notas),
  }
}

function errorDelCodigo(texto: string, que: 'booking' | 'número'): string | null {
  const codigo = normalizarCodigo(texto)
  if (codigo === '') return `Escribe el ${que}.`
  return FORMA_DEL_CODIGO.test(codigo)
    ? null
    : `El ${que} lleva sólo letras, dígitos, punto, barra o guion (hasta 40).`
}

/** Lo que va a `embarque_crear|guardar`, con todas sus claves; o los errores por campo. */
export function validarEmbarque(
  b: BorradorDelEmbarque,
): Validado<DatosDelEmbarque & { booking: string }> {
  const errores: Record<string, string> = {}
  const booking = errorDelCodigo(b.booking, 'booking')
  if (booking) errores['booking'] = booking
  // Se comparan textos `AAAA-MM-DD`, nunca `Date`.
  if (b.zarpe !== '' && b.arribo !== '' && b.arribo < b.zarpe) {
    errores['arribo_el'] = 'El arribo no puede ser antes del zarpe.'
  }
  const zarpe = b.zarpe !== '' ? b.zarpe : b.zarpeEstimado
  if (zarpe !== '' && b.eta !== '' && b.eta < zarpe) {
    errores['eta_el'] = 'La ETA no puede ser antes del zarpe.'
  }
  if (b.notas.length > LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE) {
    errores['notas'] = 'Las notas llevan hasta 2.000 caracteres.'
  }
  if (Object.keys(errores).length > 0) return { ok: false, errores }
  return {
    ok: true,
    datos: {
      booking: normalizarCodigo(b.booking),
      naviera_id: nulo(b.naviera),
      puerto_origen_id: nulo(b.puertoOrigen),
      puerto_destino_id: nulo(b.puertoDestino),
      zarpe_estimado_el: nulo(b.zarpeEstimado),
      zarpe_el: nulo(b.zarpe),
      eta_el: nulo(b.eta),
      arribo_el: nulo(b.arribo),
      notas: nulo(b.notas),
    },
  }
}

/** Sólo las claves que cambiaron respecto de lo leído; nulo si nada cambió. */
export function cambiosDe<D extends Record<string, unknown>>(
  original: Partial<D>,
  datos: D,
): Partial<D> | null {
  const cambios: Partial<D> = {}
  for (const clave of Object.keys(datos) as (keyof D)[]) {
    if ((original[clave] ?? null) !== (datos[clave] ?? null)) {
      cambios[clave] = datos[clave]
    }
  }
  return Object.keys(cambios).length === 0 ? null : cambios
}

export function borradorDelContenedor(
  c: {
    numero: string
    tipo: string | null
    sello: string | null
    notas: string | null
    embarqueId: string | null
  } | null,
  embarqueInicial: string | null = null,
): BorradorDelContenedor {
  if (c === null) {
    return { numero: '', tipo: '', sello: '', embarque: texto(embarqueInicial), notas: '' }
  }
  return {
    numero: c.numero,
    tipo: texto(c.tipo),
    sello: texto(c.sello),
    embarque: texto(c.embarqueId),
    notas: texto(c.notas),
  }
}

/** Lo que va a `contenedor_crear|guardar`; o los errores por campo. */
export function validarContenedor(
  b: BorradorDelContenedor,
): Validado<DatosDelContenedor & { numero: string }> {
  const errores: Record<string, string> = {}
  const numero = errorDelCodigo(b.numero, 'número')
  if (numero) errores['numero'] = numero
  if (b.sello.trim().length > LARGO_MAXIMO_DEL_SELLO) {
    errores['sello'] = 'El sello lleva hasta 40 caracteres.'
  }
  if (b.notas.length > LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE) {
    errores['notas'] = 'Las notas llevan hasta 2.000 caracteres.'
  }
  if (Object.keys(errores).length > 0) return { ok: false, errores }
  return {
    ok: true,
    datos: {
      numero: normalizarCodigo(b.numero),
      tipo: nulo(b.tipo),
      sello: nulo(b.sello),
      embarque_id: nulo(b.embarque),
      notas: nulo(b.notas),
    },
  }
}
