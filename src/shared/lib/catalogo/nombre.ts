// El nombre de un elemento de catálogo (un grupo de campos, una categoría): el mismo nombre es el mismo elemento sin importar
// mayúsculas, tildes ni espacios de más. Espejo de `public._nombre_limpio()` y `public._nombre_de_catalogo()`: la base guarda el
// nombre limpio y su índice único compara la clave.

// Sin marcas diacríticas y en minúsculas: «Dátos» → «datos», «Año» → «ano». Espejo de `public._sin_tildes()` en tildes, ñ y
// mayúsculas (`unaccent` además cambia ligaduras como «ß» o «æ», que NFD deja: esos nombres no se usan en un catálogo).
export function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

// Los espacios seguidos (también tabulaciones y saltos) quedan en uno y se quitan los de las puntas. Espejo exacto de
// `btrim(regexp_replace(t, '\s+', ' ', 'g'))`: `\s` es `[ \t\n\r\f\v]` y `btrim` sólo quita U+0020, por eso no `trim()`.
export function nombreLimpio(texto: string): string {
  return texto.replace(/[ \t\n\r\f\v]+/g, ' ').replace(/^ +| +$/g, '')
}

// La clave que decide si dos nombres son el mismo: «  Datos   del CLIENTE » y «datos del cliente» dan la misma.
export function claveDeNombre(texto: string): string {
  return sinTildes(nombreLimpio(texto))
}
