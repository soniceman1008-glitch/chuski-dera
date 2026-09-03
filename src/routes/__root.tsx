import { createRootRoute, HeadContent, Link, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
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
const SITE = "https://chuski-dera.vercel.app";
const DESCRIPTION =
  "Chuski Dera — burgers, shawarma, juices and shakes in Satellite Town, Jhang. Call +923139235654.";

const LOCAL_BUSINESS = {
  "@context": "https://schema.org",
  "@type": "FastFoodRestaurant",
  name: APP_NAME,
  image: `${SITE}/og.jpg`,
  url: SITE,
  telephone: "+923139235654",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Satellite Town B Block, Green Belt",
    addressLocality: "Jhang",
    addressCountry: "PK",
  },
  servesCuisine: ["Pakistani", "Fast food"],
  priceRange: "PKR",
};

function NotFoundPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-24 text-center">
      <p className="font-display text-5xl tracking-wide">Page not found</p>
      <p className="mt-3 text-muted">That link is not on the Chuski Dera menu.</p>
      <Link
        to="/"
        className="mt-6 inline-flex h-12 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-fg"
      >
        Back to home
      </Link>
    </main>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content: DESCRIPTION,
      },
      { name: "theme-color", content: "#0b0b0b" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_PK" },
      { property: "og:title", content: APP_NAME },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: SITE },
      { property: "og:image", content: `${SITE}/og.jpg` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: APP_NAME },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: SITE },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
      { rel: "preload", href: "/audio/choice.mp3?v=prev", as: "audio" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap",
      },
    ],
  }),
  component: RootDocument,
  notFoundComponent: NotFoundPage,
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
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS) }} />
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
