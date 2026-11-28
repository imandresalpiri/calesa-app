// ¿Son el mismo JSON, sin mirar el orden de las claves? Lo que el editor de artes compara para saber si hay cambios (lo guardado contra lo que
// se edita, el borrador contra lo guardado): la base devuelve el `jsonb` con sus claves en otro orden. Copia de la idea de `mismoJson()` de
// cotizaciones (un módulo no importa a otro por dentro). Puro.

function esObjeto(valor: unknown): valor is Readonly<Record<string, unknown>> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

// El texto del valor con las claves de cada objeto ordenadas; una clave con `undefined` es una clave ausente, como en JSON.
function textoCanonico(valor: unknown): string {
  if (Array.isArray(valor)) {
    return `[${valor.map((v) => (v === undefined ? 'null' : textoCanonico(v))).join(',')}]`
  }
  if (esObjeto(valor)) {
    const pares = Object.keys(valor)
      .filter((clave) => valor[clave] !== undefined)
      .sort()
      .map((clave) => `${JSON.stringify(clave)}:${textoCanonico(valor[clave])}`)
    return `{${pares.join(',')}}`
  }
  // `JSON.stringify` da `undefined` con una función o un símbolo: en JSON, nulo.
  return (JSON.stringify(valor) as string | undefined) ?? 'null'
}

export function mismoJson(a: unknown, b: unknown): boolean {
  return a === b || textoCanonico(a) === textoCanonico(b)
}
