// El Modo Live en una cookie (`modo-live`): la escribe el navegador al conmutar y la lee el servidor (`getSesion()`), que con ella encendida
// no dibuja ni manda lo que los ajustes del Live ocultan. `localStorage['modo-live']` y el evento `storage` siguen para el primer pintado de
// una pestaña nueva y para avisar a las otras. No lleva nada de la persona.

// La clase de `<html>` que oculta los símbolos de moneda y la clave de `localStorage`.
export const CLASE_LIVE = 'live'
export const CLAVE_LIVE = 'modo-live'
export const COOKIE_DEL_LIVE = 'modo-live'

export function cookieDelLive(encendido: boolean, seguro: boolean): string {
  return `${COOKIE_DEL_LIVE}=${encendido ? '1' : '0'}; Path=/; Max-Age=31536000; SameSite=Lax${seguro ? '; Secure' : ''}`
}

// El valor tal como llegó: sólo `1` es encendido.
export function liveDeLaCookie(valor: string | undefined): boolean {
  return valor === '1'
}

// El valor de la cookie en `document.cookie`, o `undefined` si no está.
export function valorDeLaCookie(cookies: string): string | undefined {
  const par = cookies.split('; ').find((p) => p.startsWith(`${COOKIE_DEL_LIVE}=`))
  return par?.slice(COOKIE_DEL_LIVE.length + 1)
}

// Va en el HTML del layout raíz, antes del contenido: aplica la clase del Live antes del primer pintado. Manda la cookie; sin cookie (lo
// guardado antes de que existiera), `localStorage`, y la interfaz escribe la cookie al montar (`useSincronizarElLive`).
export function codigoDelGuionDelLive(): string {
  return `try{var c=document.cookie.split('; ').filter(function(p){return p.indexOf('${COOKIE_DEL_LIVE}=')===0})[0];var v=c?c.slice(${COOKIE_DEL_LIVE.length + 1}):(localStorage.getItem('${CLAVE_LIVE}')==='1'?'1':'0');if(v==='1')document.documentElement.classList.add('${CLASE_LIVE}')}catch(e){}`
}
