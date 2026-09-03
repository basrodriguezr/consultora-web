/**
 * Rate limiting en memoria para las rutas de API públicas.
 *
 * Por qué existe: `/api/contacto` gasta un envío de Resend por request y el free
 * tier son ~100/día. Un loop de `curl` lo agota en minutos y, a partir de ahí,
 * los leads legítimos fallan en silencio — se cae justo el objetivo del sitio.
 * El honeypot no frena esto (basta con no mandar el campo).
 *
 * Alcance honesto de esta implementación: el contador vive **en la memoria del
 * proceso**. En Vercel eso significa por instancia de función, y se reinicia en
 * cada cold start o deploy. No es un límite distribuido: un atacante con muchas
 * IPs, o que dé con instancias distintas, lo diluye. Lo que sí corta —y es el
 * escenario real de un sitio de este tamaño— es el abuso repetitivo desde un
 * origen. Es la opción de costo $0 y cero dependencias; si algún día aparece
 * abuso real, el reemplazo natural es un contador compartido (Upstash Redis
 * tiene free tier) manteniendo esta misma interfaz.
 */

type Registro = {
  /** Requests contadas dentro de la ventana vigente. */
  conteo: number;
  /** Momento (epoch ms) en que la ventana se reinicia. */
  expiraEn: number;
};

export type ResultadoLimite =
  | { permitido: true; restantes: number }
  | { permitido: false; reintentarEnSegundos: number };

/**
 * Parámetros de un balde. Cada ruta pública trae los suyos: no comparten ni el
 * límite ni el contador.
 */
export interface OpcionesLimite {
  /**
   * Separa los contadores de rutas distintas. Sin esto, agotar el balde
   * mandando assessments dejaría a la misma IP sin poder usar el formulario de
   * contacto — un flujo caro apagando a uno barato, que es justo lo contrario
   * de lo que queremos.
   */
  namespace: string;
  /** Requests permitidas por ventana. */
  max: number;
  /** Largo de la ventana, en milisegundos. */
  ventanaMs: number;
}

/**
 * El balde de `/api/contacto`. Una persona real manda uno, quizá dos si se
 * equivocó en el email; cinco deja margen de sobra sin regalar cuota de Resend.
 */
export const LIMITE_CONTACTO: OpcionesLimite = {
  namespace: "contacto",
  max: 5,
  ventanaMs: 10 * 60 * 1000,
};

/**
 * El balde de `/api/assessment` (§12 del plan de Fase 2). Mucho más angosto que
 * el de contacto, y por una razón de costo: cada request acá gasta **un email
 * más tokens pagos** de la API de Claude, mientras que una de contacto gasta un
 * email. Completar quince campos a mano es además un acto deliberado: nadie
 * manda tres en una hora sin querer.
 */
export const LIMITE_ASSESSMENT: OpcionesLimite = {
  namespace: "assessment",
  max: 2,
  ventanaMs: 60 * 60 * 1000,
};

/**
 * Techo de IPs recordadas. Sin esto el mapa crece sin límite y el propio
 * anti-abuso se vuelve el vector: basta variar la IP de origen para inflar la
 * memoria del proceso.
 */
const MAX_CLAVES = 5_000;

/**
 * El estado cuelga de `globalThis` a propósito: en desarrollo el hot reload
 * reevalúa el módulo y un `const` normal reiniciaría el contador en cada
 * cambio de archivo, dando la falsa impresión de que el límite no aplica.
 */
const almacen: Map<string, Registro> = ((
  globalThis as typeof globalThis & { __rateLimit?: Map<string, Registro> }
).__rateLimit ??= new Map());

/** Borra lo vencido; si aun así se pasa del techo, corta por lo más viejo. */
function podar(ahora: number): void {
  for (const [clave, registro] of almacen) {
    if (registro.expiraEn <= ahora) almacen.delete(clave);
  }

  if (almacen.size <= MAX_CLAVES) return;

  // `Map` itera en orden de inserción, así que los primeros son los más
  // antiguos. Se descartan los que sobran: perder un contador solo relaja el
  // límite para esa IP, nunca bloquea a nadie de más.
  const sobrantes = almacen.size - MAX_CLAVES;
  let borradas = 0;
  for (const clave of almacen.keys()) {
    almacen.delete(clave);
    if (++borradas >= sobrantes) break;
  }
}

/**
 * Reduce una IPv6 a su prefijo /64 — los primeros 4 hextetos.
 *
 * Sin esto el límite es evadible sin ningún esfuerzo: un ISP le delega al
 * cliente residencial un /64 **entero**, así que una sola máquina puede emitir
 * cada request desde una dirección distinta (basta con las privacy extensions,
 * ni siquiera hace falta configurarlo) y no chocar nunca con su propio
 * contador. Agrupando por /64 el atacante vuelve a tener un solo balde, que es
 * lo que asumíamos al contar por IP.
 *
 * El /64 es la unidad correcta: es lo mínimo que se asigna a un cliente, así
 * que agrupar ahí no mezcla a personas distintas de un mismo ISP.
 *
 * IPv4 se devuelve intacta. Las direcciones mal formadas se devuelven tal cual:
 * ante la duda conviene una clave de más (limitar de más) que una de menos.
 */
export function agruparIp(ip: string): string {
  // El índice de zona (`fe80::1%eth0`) no identifica al cliente.
  const limpia = ip.split("%")[0];

  if (!limpia.includes(":")) return limpia; // IPv4

  // IPv4 mapeada en IPv6 (`::ffff:1.2.3.4`): es una IPv4, se trata como tal.
  const mapeada = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(limpia);
  if (mapeada) return mapeada[1];

  // Hay que expandir el `::` antes de cortar, o `2001:db8::1` daría un prefijo
  // distinto que su forma larga siendo la misma dirección.
  const lados = limpia.split("::");
  if (lados.length > 2) return limpia; // inválida: dos `::` no existen

  const izquierda = lados[0] ? lados[0].split(":") : [];
  const derecha = lados[1] ? lados[1].split(":") : [];

  let hextetos: string[];
  if (lados.length === 2) {
    const faltantes = 8 - izquierda.length - derecha.length;
    if (faltantes < 0) return limpia;
    hextetos = [...izquierda, ...Array<string>(faltantes).fill("0"), ...derecha];
  } else {
    hextetos = izquierda;
    if (hextetos.length !== 8) return limpia;
  }

  return hextetos
    .slice(0, 4)
    // Normalizar para que `2001:0db8:…` y `2001:db8:…` compartan contador.
    .map((h) => h.toLowerCase().replace(/^0+(?=.)/, ""))
    .join(":");
}

/**
 * Identifica al cliente. En Vercel `x-forwarded-for` lo escribe el edge y no es
 * falseable por el cliente; el primer valor es la IP real de origen.
 *
 * Si no hay ningún header (local, o un runtime que no los provee) todos caen en
 * un mismo balde compartido. Es deliberadamente estricto: prefiere limitar de
 * más antes que dejar la puerta abierta cuando no se puede distinguir a nadie.
 */
export function identificarCliente(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const primera = forwarded?.split(",")[0]?.trim();
  if (primera) return agruparIp(primera);

  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return agruparIp(real);

  return "sin-ip";
}

/**
 * Registra una request en el balde indicado y responde si se puede seguir.
 * Cuenta ventana fija: la primera request abre la ventana y las siguientes se
 * acumulan hasta que expira.
 *
 * **El namespace se compone dentro de la clave del mapa**, no en un mapa por
 * ruta. Así el techo de `MAX_CLAVES` y el podado siguen siendo del proceso
 * entero: son un límite de memoria, no una cuota que cada ruta pueda gastar por
 * su cuenta. Un mapa por namespace multiplicaría el techo por la cantidad de
 * rutas, que es exactamente el vector que `MAX_CLAVES` existe para cerrar.
 *
 * @param opciones balde a usar (ver `LIMITE_CONTACTO`)
 * @param clave    identificador del cliente (ver `identificarCliente`)
 * @param ahora    inyectable para poder testear sin depender del reloj
 */
export function consumirCon(
  opciones: OpcionesLimite,
  clave: string,
  ahora: number = Date.now(),
): ResultadoLimite {
  podar(ahora);

  const { namespace, max, ventanaMs } = opciones;
  const claveConNamespace = `${namespace}:${clave}`;
  const registro = almacen.get(claveConNamespace);

  if (!registro || registro.expiraEn <= ahora) {
    almacen.set(claveConNamespace, { conteo: 1, expiraEn: ahora + ventanaMs });
    return { permitido: true, restantes: max - 1 };
  }

  if (registro.conteo >= max) {
    return {
      permitido: false,
      reintentarEnSegundos: Math.max(1, Math.ceil((registro.expiraEn - ahora) / 1000)),
    };
  }

  registro.conteo += 1;
  return { permitido: true, restantes: max - registro.conteo };
}

/**
 * El límite de `/api/contacto`. Se mantiene como función propia —y no como una
 * llamada a `consumirCon` desde el route— para que la ruta que hoy funciona en
 * producción no cambie de firma en un refactor pensado para otra fase.
 */
export function consumir(clave: string, ahora: number = Date.now()): ResultadoLimite {
  return consumirCon(LIMITE_CONTACTO, clave, ahora);
}
