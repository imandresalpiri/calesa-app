'use client'

import { useEffect, useMemo } from 'react'

// La URL local (`blob:`) de un archivo que todavía no se subió: sirve para dibujar su miniatura y su vista previa sin pedir nada al servidor. Se crea con el archivo y se revoca al cambiar o al irse;
// sin archivo, `null`.
export function useUrlLocal(archivo: File | null): string | null {
  const url = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo])
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])
  return url
}
