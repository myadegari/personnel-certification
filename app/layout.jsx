/* FILE: app/layout.jsx */
import localFont from 'next/font/local';
import "./globals.css";
import AuthProvider from "./context/AuthProvider";
import Providers from "@/components/Providers";
import AppToaster from "@/components/AppToaster";

const sahel = localFont({
  src: [
    {
      path: './fonts/Shabnam-FD.woff2',
      weight: '400', // Regular
      style: 'normal',
    },
    {
      path: './fonts/Shabnam-Bold-FD.woff2',
      weight: '700', // Bold
      style: 'normal',
    },
  ],
  display: 'swap', // Improves font loading performance
  variable: '--font-sahel', // This creates a CSS variable
});

export const metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: {
    default: "گواهیار",
    template: "%s | گواهیار",
  },
  description: "سامانه جامع مدیریت دوره‌ها و گواهینامه‌های کارکنان",
  icons: {
    icon: "/fav-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "گواهیار",
    title: "گواهیار",
    description: "سامانه جامع مدیریت دوره‌ها و گواهینامه‌های کارکنان",
  },
  twitter: {
    card: "summary",
    title: "گواهیار",
    description: "سامانه جامع مدیریت دوره‌ها و گواهینامه‌های کارکنان",
  },
};

export const viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
};


export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className={sahel.variable}>
        <AuthProvider>
          <Providers>
            <div className="min-h-screen bg-background">
              {children}
            </div>
            <AppToaster />
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
