import type { Metadata } from "next";
import { Inter, Roboto, Open_Sans, Lato, Poppins, Source_Sans_3, JetBrains_Mono, Fira_Code, Source_Code_Pro, Inconsolata } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const roboto = Roboto({ 
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

const openSans = Open_Sans({ 
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

const lato = Lato({ 
  weight: ["300", "400", "700"],
  subsets: ["latin"],
  variable: "--font-lato",
  display: "swap",
});

const poppins = Poppins({ 
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

const sourceSansPro = Source_Sans_3({ 
  weight: ["300", "400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-source-sans-pro",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const firaCode = Fira_Code({ 
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
});

const sourceCodePro = Source_Code_Pro({ 
  subsets: ["latin"],
  variable: "--font-source-code-pro",
  display: "swap",
});

const inconsolata = Inconsolata({ 
  subsets: ["latin"],
  variable: "--font-inconsolata",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MCP Chat Client",
  description: "A modern chat client for MCP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${roboto.variable} ${openSans.variable} ${lato.variable} ${poppins.variable} ${sourceSansPro.variable} ${jetbrainsMono.variable} ${firaCode.variable} ${sourceCodePro.variable} ${inconsolata.variable}`}>
        {children}
      </body>
    </html>
  );
}
