/**
 * Cómo funciona — tres pasos.
 *
 * Pasó de 5 pasos a 3 en el rediseño (2026-07-31): los pasos 4 y 5 (entrega y
 * soporte) describían el después de la venta y le restaban peso al único
 * objetivo de la página, que es que alguien agende la conversación.
 *
 * `numero` es string (`"01"`) y no number a propósito: se renderiza en
 * `--font-mono` con el cero a la izquierda, y es el detalle que sostiene el
 * carácter "terminal" del tema sin repintar nada de ámbar.
 */

export interface Paso {
  numero: string;
  titulo: string;
  descripcion: string;
}

export const tituloProceso = "3 pasos. Sin compromiso anticipado.";

export const proceso: Paso[] = [
  {
    numero: "01",
    titulo: "Conversación de 30 minutos",
    descripcion:
      "Entendemos tu dolor. Sin presentaciones de 40 páginas. Te decimos honestamente si podemos ayudar o no.",
  },
  {
    numero: "02",
    titulo: "Propuesta clara en 48 horas",
    descripcion: "Alcance, plazo y precio. Sin letra chica, sin sorpresas.",
  },
  {
    numero: "03",
    titulo: "Implementación en tu cuenta",
    descripcion:
      "Código tuyo, infra tuya. Cuando terminamos, sigues operando sin nosotros.",
  },
];
