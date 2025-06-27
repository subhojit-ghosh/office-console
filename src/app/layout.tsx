import "@mantine/core/styles.css";
import "~/styles/globals.css";

import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Office Console",
  description: "",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <TRPCReactProvider>
          <HydrateClient>
            <MantineProvider>{children}</MantineProvider>
          </HydrateClient>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
