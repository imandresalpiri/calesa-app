// Los ids que comparten la entrada de la celda y la barra de fórmula (las dos escriben lo mismo): la lista de sugerencias, cada opción, el error bajo la barra y el
// texto de la barra (`fx ▾` lo enfoca).
export const idsDeLaEdicion = (prefijo: string) => ({
  lista: `${prefijo}-sugerencias`,
  opcion: (indice: number) => `${prefijo}-sugerencia-${String(indice)}`,
  error: `${prefijo}-error`,
  texto: `${prefijo}-texto`,
})
