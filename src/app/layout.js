import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Touch & Glow Salon",
  description: "Created by autodata",
  manifest: "/manifest.json", // <-- PWA ke liye ye add kiya
  themeColor: "#000000",      // <-- Mobile chrome ka color black karega
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0", // <-- App jaisa feel dene ke liye zoom band kiya
  appleWebApp: {              // <-- iPhone ke liye settings
    capable: true,
    statusBarStyle: "default",
    title: "Touch & Glow",
  },
  icons : {
    icon: "/favicon.ico",
    apple: "/icon-192.png",   // <-- iPhone home screen icon (Ensure ye image public folder me ho)
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}