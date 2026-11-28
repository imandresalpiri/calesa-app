// Leer sin que una imagen o un cuerpo traben el PDF de un arte: de a pocas a la vez, con un tiempo de espera y con un tope de bytes. Lo que se
// pasa del tiempo o del tope es «no llegó», nunca un error.

// `hacer` sobre cada elemento, con a lo sumo `aLaVez` en curso; el resultado, en el orden de `elementos`.
export async function deAPocas<T, R>(
  elementos: readonly T[],
  aLaVez: number,
  hacer: (elemento: T) => Promise<R>,
): Promise<R[]> {
  const resultados: R[] = []
  let siguiente = 0
  const trabajar = async () => {
    for (let i = siguiente++; i < elementos.length; i = siguiente++) {
      const elemento = elementos[i]
      if (elemento !== undefined) {
        resultados[i] = await hacer(elemento)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(aLaVez, elementos.length) }, trabajar))
  return resultados
}

// Lo que da la promesa si llega antes de `ms`; si tarda más o falla, nulo.
export function conEspera<T>(promesa: Promise<T>, ms: number): Promise<T | null> {
  let reloj: ReturnType<typeof setTimeout> | undefined
  const vencida = new Promise<null>((listo) => {
    reloj = setTimeout(() => {
      listo(null)
    }, ms)
  })
  return Promise.race([promesa.catch(() => null), vencida]).finally(() => {
    clearTimeout(reloj)
  })
}

// Los bytes de un cuerpo si no pasan de `tope`; si pasan, deja de leer y da nulo.
export async function bytesConTope(
  cuerpo: ReadableStream<Uint8Array>,
  tope: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const lector = cuerpo.getReader()
  const partes: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await lector.read()
    if (done) {
      break
    }
    total += value.byteLength
    if (total > tope) {
      await lector.cancel()
      return null
    }
    partes.push(value)
  }
  const bytes = new Uint8Array(total)
  let desde = 0
  for (const parte of partes) {
    bytes.set(parte, desde)
    desde += parte.byteLength
  }
  return bytes
}
