import "@mantine/core/styles.css";

import '@mantine/charts/styles.css';
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/tiptap/styles.css";
import "mantine-datatable/styles.layer.css";
import "~/styles/globals.css";

import {
  ColorSchemeScript,
  MantineProvider,
  createTheme,
  mantineHtmlProps,
} from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { type Metadata } from "next";
import { Outfit } from "next/font/google";

import { env } from "~/env";
import { TRPCReactProvider } from "~/trpc/react";
import { HydrateClient } from "~/trpc/server";

const theme = createTheme({
  fontFamily: "var(--font-outfit-sans)",
  defaultRadius: "md",
});

export const metadata: Metadata = {
  title: env.NEXT_PUBLIC_APP_TITLE,
  description: "",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${outfit.variable}`} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body suppressHydrationWarning>
        <TRPCReactProvider>
          <HydrateClient>
            <MantineProvider theme={theme} defaultColorScheme="auto">
              <ModalsProvider>
                <Notifications />
                {children}
              </ModalsProvider>
            </MantineProvider>
          </HydrateClient>
        </TRPCReactProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
