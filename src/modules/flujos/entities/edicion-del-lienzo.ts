// Qué se puede editar sobre el diagrama (mover las fases, vincularlas, crear una) y por qué no, y la versión con la que va la próxima escritura del
// lienzo. Puro: sin I/O ni React.

export const MOTIVO_EN_EL_CELULAR = 'Para mover o vincular, usa una computadora.'
export const MOTIVO_SIN_MOVER_AQUI = 'No se pueden mover las fases desde aquí.'
export const MOTIVO_SIN_VINCULAR_AQUI = 'No se pueden vincular las fases desde aquí.'
export const MOTIVO_SIN_CREAR_AQUI = 'No se puede crear una fase desde aquí.'

export type EdicionDelLienzo = {
  // Cada uno: nulo si se puede; si no, el motivo que se dice.
  mover: string | null
  vincular: string | null
  crear: string | null
}

type Pedido = {
  // Lo que da el área `fases` (nulo sin su proveedor): por qué no se mueve (la lista cortada) y por qué no se crea (el tope).
  fases: { motivoDeMover: string | null; motivoDeNuevaFase: string | null } | null
  // Si el área `transiciones` está (su proveedor).
  conSalidas: boolean
  // Menos de 768 px: el diagrama se ve y se toca, pero no se arrastra ni se vincula.
  angosto: boolean
}

export function edicionDelLienzo({ fases, conSalidas, angosto }: Pedido): EdicionDelLienzo {
  return {
    mover:
      fases === null ? MOTIVO_SIN_MOVER_AQUI : angosto ? MOTIVO_EN_EL_CELULAR : fases.motivoDeMover,
    vincular: !conSalidas ? MOTIVO_SIN_VINCULAR_AQUI : angosto ? MOTIVO_EN_EL_CELULAR : null,
    crear: fases === null ? MOTIVO_SIN_CREAR_AQUI : fases.motivoDeNuevaFase,
  }
}

// Si la versión leída es igual o posterior a `otra`.
export function leidaNoAntesDe(leida: string, otra: string): boolean {
  return versionVigente(leida, otra) === leida
}

// Un instante de `flujos.actualizado_en` en microsegundos (el texto ISO tal cual: `Date.parse` pierde los microsegundos). NaN si no se entiende.
function microsegundos(version: string): number {
  const partes = /^(.+T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(.*)$/.exec(version)
  if (!partes) return Number.NaN
  const segundos = Date.parse(`${partes[1] ?? ''}${partes[3] ?? ''}`)
  const fraccion = Number((partes[2] ?? '').padEnd(6, '0').slice(0, 6))
  return segundos * 1000 + fraccion
}

// La versión con la que va la próxima escritura del lienzo: la más nueva entre la leída (la de la página) y la que devolvió la última escritura propia.
// Las versiones sólo avanzan: mientras la página no se releyó, la propia es la vigente; cuando llega una lectura más nueva (otra persona, o la misma
// relectura), manda la leída. Sin esto, dos escrituras seguidas del lienzo chocarían (`PT409`) contra uno mismo.
export function versionVigente(leida: string, propia: string | null): string {
  if (propia === null) return leida
  const l = microsegundos(leida)
  const p = microsegundos(propia)
  if (Number.isNaN(p)) return leida
  if (Number.isNaN(l)) return propia
  return p > l ? propia : leida
}

// Cómo terminó una escritura del lienzo, ya dicha por quien escribe (el toast, el aviso de conflicto): la versión nueva (nula si no la sabe: una salida que
// ya estaba creada), o por qué no. Sin red, lo pendiente queda y se reintenta al volver; un conflicto descarta lo pendiente y la pila; otro rechazo
// devuelve las cajas a lo leído.
export type ResultadoDelLienzo =
  { ok: true; version: string | null } | { ok: false; motivo: 'sin-red' | 'conflicto' | 'rechazo' }
