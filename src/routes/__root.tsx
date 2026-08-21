import { createRootRoute, HeadContent, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CartDrawer } from "@/components/cart-drawer";
import { FloatActions } from "@/components/float-actions";
import { VoicePrime } from "@/lib/choice-voice";
import { CatalogProvider, CatalogStatusBanner } from "@/lib/catalog-store";
import appCss from "../styles.css?url";

const APP_NAME = "Chuski Dera";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Chuski Dera — burgers, shawarma, juices and shakes in Satellite Town, Jhang. Call +923139235645.",
      },
      { name: "theme-color", content: "#0b0b0b" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preload", href: "/audio/choice.mp3?v=prev", as: "audio" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap",
      },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const chrome = !pathname.startsWith("/admin") && pathname !== "/login";

  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <VoicePrime />
        <AuthProvider>
          <CatalogProvider>
            <div className="flex min-h-dvh flex-col">
              {chrome && <SiteHeader />}
              {chrome && <CatalogStatusBanner />}
              <Outlet />
              {chrome && <SiteFooter />}
            </div>
            {chrome && <CartDrawer />}
            {chrome && <FloatActions />}
          </CatalogProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
