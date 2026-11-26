export const CLASE_DEL_TEXTO =
  'documento-de-seguimiento documento-del-sitio min-h-64 text-(length:--text-base) text-(--color-ink) outline-none [&_blockquote]:border-s-4 [&_blockquote]:border-(--color-line) [&_blockquote]:ps-3 [&_blockquote]:text-(--color-ink-soft) [&_h2]:mt-4 [&_h2]:text-(length:--text-xl) [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-(length:--text-lg) [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-(--color-line) [&_.es-vacio]:pe-12 [&_.es-vacio]:before:pointer-events-none [&_.es-vacio]:before:float-left [&_.es-vacio]:before:h-0 [&_.es-vacio]:before:text-(--color-ink-soft) [&_.es-vacio]:before:content-[attr(data-vacio)]'

// Los atributos del cuadro de texto del lienzo de la guía: su nombre, su error y el hueco del «+» en el párrafo vacío.
export function atributosDelLienzo(
  etiquetaId: string,
  errorId: string | undefined,
  invalido: boolean,
) {
  return {
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-labelledby': etiquetaId,
    ...(errorId ? { 'aria-describedby': errorId } : {}),
    ...(invalido ? { 'aria-invalid': 'true' } : {}),
    class: CLASE_DEL_TEXTO,
  }
}
