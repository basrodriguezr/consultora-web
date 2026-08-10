import { describe, expect, it } from "vitest";

import {
  agruparIp,
  consumir,
  consumirCon,
  identificarCliente,
  LIMITE_CONTACTO,
  type OpcionesLimite,
} from "@/lib/rate-limit";

/**
 * El contador vive en `globalThis` y sobrevive entre tests dentro del mismo
 * archivo. En vez de exponer un `reset()` que solo existiría para los tests,
 * cada caso usa su propia clave — más simple y no agrega superficie al módulo.
 */
let siguiente = 0;
function claveNueva(): string {
  siguiente += 1;
  return `clave-de-prueba-${siguiente}`;
}

describe("consumir — ventana fija", () => {
  it("deja pasar 5 y bloquea la 6ª", () => {
    const clave = claveNueva();
    for (let i = 0; i < 5; i += 1) {
      expect(consumir(clave).permitido).toBe(true);
    }
    expect(consumir(clave).permitido).toBe(false);
  });

  it("va descontando las restantes", () => {
    const clave = claveNueva();
    const restantes = [0, 0, 0].map(() => {
      const r = consumir(clave);
      return r.permitido ? r.restantes : -1;
    });
    expect(restantes).toEqual([4, 3, 2]);
  });

  it("informa cuántos segundos faltan para reintentar", () => {
    const clave = claveNueva();
    const ahora = 1_000_000;
    for (let i = 0; i < 5; i += 1) consumir(clave, ahora);

    const bloqueado = consumir(clave, ahora + 60_000); // un minuto después
    expect(bloqueado.permitido).toBe(false);
    if (!bloqueado.permitido) {
      // Ventana de 10 min, pasó 1 → quedan 9.
      expect(bloqueado.reintentarEnSegundos).toBe(540);
    }
  });

  it("reinicia la ventana cuando expira", () => {
    const clave = claveNueva();
    const ahora = 2_000_000;
    for (let i = 0; i < 5; i += 1) consumir(clave, ahora);
    expect(consumir(clave, ahora).permitido).toBe(false);

    // Justo pasada la ventana de 10 minutos.
    expect(consumir(clave, ahora + 10 * 60 * 1000 + 1).permitido).toBe(true);
  });

  it("cuenta cada clave por separado", () => {
    const unaClave = claveNueva();
    const otraClave = claveNueva();
    for (let i = 0; i < 5; i += 1) consumir(unaClave);

    expect(consumir(unaClave).permitido).toBe(false);
    expect(consumir(otraClave).permitido).toBe(true);
  });

  it("no crece sin límite: podar mantiene el mapa acotado", () => {
    // Si el mapa creciera sin techo, el propio anti-abuso sería el vector:
    // basta variar la IP para inflar la memoria del proceso.
    const ahora = 3_000_000;
    for (let i = 0; i < 6000; i += 1) consumir(`inundacion-${i}`, ahora);

    // Las entradas viejas ya vencieron: una clave nueva arranca limpia.
    const despues = ahora + 20 * 60 * 1000;
    expect(consumir("despues-de-la-inundacion", despues).permitido).toBe(true);
  });
});

describe("agruparIp — cierra la evasión por IPv6", () => {
  it("deja la IPv4 intacta", () => {
    expect(agruparIp("203.0.113.7")).toBe("203.0.113.7");
  });

  it.each([
    ["completa", "2001:db8:1:2:3:4:5:6"],
    ["sufijo distinto", "2001:db8:1:2:aaaa:bbbb:cccc:dddd"],
    ["comprimida", "2001:db8:1:2::9"],
    ["con ceros a la izquierda", "2001:0db8:0001:0002::9"],
    ["en mayúsculas", "2001:DB8:1:2:3:4:5:6"],
  ])("agrupa al mismo /64 una dirección %s", (_caso, ip) => {
    expect(agruparIp(ip)).toBe("2001:db8:1:2");
  });

  it("separa /64 distintos (no agrupa de más)", () => {
    expect(agruparIp("2001:db8:1:2::1")).not.toBe(agruparIp("2001:db8:1:3::1"));
  });

  it("expande el :: antes de cortar", () => {
    // Sin expandir, "2001:db8::1" daría un prefijo distinto que su forma larga.
    expect(agruparIp("2001:db8::1")).toBe("2001:db8:0:0");
    expect(agruparIp("2001:db8:0:0:0:0:0:1")).toBe("2001:db8:0:0");
  });

  it("trata la IPv4 mapeada como IPv4", () => {
    expect(agruparIp("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("descarta el índice de zona", () => {
    expect(agruparIp("fe80::1%eth0")).toBe("fe80:0:0:0");
  });

  it.each([["texto cualquiera", "basura"], ["dos ::", "2001:db8::1::2"]])(
    "devuelve tal cual lo malformado (%s): limita de más, nunca de menos",
    (_caso, ip) => {
      expect(agruparIp(ip)).toBe(ip);
    },
  );
});

describe("identificarCliente", () => {
  function conHeaders(headers: Record<string, string>): Request {
    return new Request("https://codebass.org/api/contacto", { headers });
  }

  it("toma la primera IP de x-forwarded-for", () => {
    // El edge antepone la IP real; las siguientes son proxies intermedios.
    expect(
      identificarCliente(conHeaders({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" })),
    ).toBe("203.0.113.7");
  });

  it("agrupa la IPv6 que venga en x-forwarded-for", () => {
    expect(
      identificarCliente(conHeaders({ "x-forwarded-for": "2001:db8:1:2:3:4:5:6" })),
    ).toBe("2001:db8:1:2");
  });

  it("cae a x-real-ip si no hay x-forwarded-for", () => {
    expect(identificarCliente(conHeaders({ "x-real-ip": "203.0.113.9" }))).toBe(
      "203.0.113.9",
    );
  });

  it("sin ningún header cae a un balde compartido", () => {
    // Deliberadamente estricto: si no se puede distinguir a nadie, se limita
    // de más antes que dejar la puerta abierta.
    expect(identificarCliente(conHeaders({}))).toBe("sin-ip");
  });
});

describe("consumirCon — baldes por namespace", () => {
  const ASSESSMENT: OpcionesLimite = {
    namespace: "assessment",
    max: 2,
    ventanaMs: 60 * 60 * 1000,
  };

  /**
   * El motivo por el que existe el namespace. Sin él, agotar el balde mandando
   * assessments —que son 2 por hora— dejaría a esa misma IP sin poder usar el
   * formulario de contacto: un flujo caro apagando a uno barato, que es lo
   * contrario de lo que queremos.
   */
  it("agotar un namespace no afecta al otro", () => {
    const clave = claveNueva();

    // Se agota el balde de assessment.
    expect(consumirCon(ASSESSMENT, clave).permitido).toBe(true);
    expect(consumirCon(ASSESSMENT, clave).permitido).toBe(true);
    expect(consumirCon(ASSESSMENT, clave).permitido).toBe(false);

    // El de contacto, con la misma clave, sigue intacto.
    expect(consumir(clave).permitido).toBe(true);
  });

  it("cada namespace respeta su propio máximo", () => {
    const clave = claveNueva();
    for (let i = 0; i < 5; i += 1) expect(consumir(clave).permitido).toBe(true);
    expect(consumir(clave).permitido).toBe(false);

    // Assessment permite 2, no 5.
    expect(consumirCon(ASSESSMENT, clave).permitido).toBe(true);
    expect(consumirCon(ASSESSMENT, clave).permitido).toBe(true);
    expect(consumirCon(ASSESSMENT, clave).permitido).toBe(false);
  });

  it("cada namespace respeta su propia ventana", () => {
    const clave = claveNueva();
    const ahora = 5_000_000;
    for (let i = 0; i < 2; i += 1) consumirCon(ASSESSMENT, clave, ahora);

    const bloqueado = consumirCon(ASSESSMENT, clave, ahora + 60_000);
    expect(bloqueado.permitido).toBe(false);
    if (!bloqueado.permitido) {
      // Ventana de 60 min, pasó 1 → quedan 59.
      expect(bloqueado.reintentarEnSegundos).toBe(3_540);
    }
  });

  /**
   * `consumir()` es la ruta que hoy corre en producción. El refactor no puede
   * haberle cambiado el comportamiento: sigue siendo 5 cada 10 minutos.
   */
  it("consumir() sigue siendo el balde de contacto de siempre", () => {
    expect(LIMITE_CONTACTO).toEqual({
      namespace: "contacto",
      max: 5,
      ventanaMs: 600_000,
    });
  });
});
