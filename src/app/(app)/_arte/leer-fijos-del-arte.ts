// Lo que un arte nombra y no depende del vehículo elegido (`FijosDelArte`): quien comparte (quien mira el editor, con su WhatsApp) y la empresa
// (nombre, web, redes, zona y formato). Lo lee la página del editor una vez, con la sesión de quien mira y en paralelo. Una lectura que falla no
// tumba el editor: la empresa sale con lo de fábrica y sin web ni redes, y el asesor, sin nombrar (el arte dice qué le falta).
import 'server-only'
import type { FijosDelArte } from '@/modules/artes'
import { leerAjustes } from '@/modules/empresa'
import { leerAjustesDelSitio } from '@/modules/web'
import { NOMBRE_POR_DEFECTO } from '@/shared/config/app'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import { LOCALE_POR_DEFECTO } from '@/shared/lib/formato'
import { asesorQueMira } from '../cotizaciones/datos-de-la-tarjeta'
import { fijosDelArte } from './datos-del-arte'

const oNada = <T>(lectura: Promise<T>): Promise<T | null> => lectura.catch(() => null)

export async function leerFijosDelArte(): Promise<FijosDelArte> {
  const [asesor, empresa, sitio] = await Promise.all([
    oNada(asesorQueMira()),
    oNada(leerAjustes()),
    oNada(leerAjustesDelSitio()),
  ])
  const ajustes = empresa?.ok ? empresa.data.ajustes : null
  return fijosDelArte({
    asesor,
    empresa: {
      nombre: ajustes?.nombre.trim() || NOMBRE_POR_DEFECTO,
      locale: ajustes?.locale ?? LOCALE_POR_DEFECTO,
      zona: ajustes?.zonaHoraria ?? ZONA_POR_DEFECTO,
    },
    sitio: sitio?.ok
      ? { direccionPublica: sitio.data.direccionPublica, redes: sitio.data.redes }
      : null,
  })
}
