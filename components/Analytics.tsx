import Script from "next/script";

import { env } from "@/lib/env";

/**
 * Google Analytics 4 (property `G-H9D0RSS3RH`, sirviendo en producción).
 *
 * Se inyecta solo si `NEXT_PUBLIC_GA_ID` está configurada, así el sitio corre
 * en local y en preview sin ensuciar las métricas ni romper si falta el dato.
 */
/**
 * El id se interpola en un script inline. No es input de usuario —lo setea
 * quien despliega— pero validar el formato evita que un valor mal pegado
 * (con comillas, por ejemplo) inyecte JS en todas las páginas.
 */
const FORMATO_GA_ID = /^G-[A-Z0-9]+$/;

export default function Analytics() {
  // `env()` aplica la convención del proyecto: variable vacía = ausente.
  const gaId = env(process.env.NEXT_PUBLIC_GA_ID);

  // Sin variable no hay nada que avisar: correr sin analítica es la
  // degradación deliberada de local y preview, y tiene que ser muda.
  if (!gaId) return null;

  if (!FORMATO_GA_ID.test(gaId)) {
    // Una variable presente pero malformada es un error de configuración, no
    // una degradación: apaga la analítica sin emitir un solo síntoma. Ya pasó
    // —un container de GTM pegado acá dejó `codebass.org` sin medir— y el
    // silencio es justo lo que hizo que tardara en verse.
    //
    // El aviso va solo en desarrollo: en producción esta rama se elimina en
    // build (`NODE_ENV` es constante) y quien visita el sitio no ve ruido en
    // su consola. El valor se imprime porque no es secreto — una
    // `NEXT_PUBLIC_` viaja en el HTML de todas formas.
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[analytics] NEXT_PUBLIC_GA_ID con formato inválido: "${gaId}". ` +
          "Se esperaba un measurement ID de GA4 (G-XXXXXXXXXX). " +
          "Ojo con la confusión clásica: un GTM-XXXXXXX es un container de " +
          "Google Tag Manager, no un measurement ID, y necesita otro snippet " +
          "que este componente no monta. GA4 queda apagado.",
      );
    }

    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
