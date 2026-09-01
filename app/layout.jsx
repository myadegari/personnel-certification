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
  title: "گواهیار",
  description: "سامانه جامع مدیریت دوره‌ها و گواهینامه‌های کارکنان",
  icons: {
    icon: "/fav-icon.png",
  },
};


export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className={sahel.variable}>
        <AuthProvider>
          <Providers>
            <div className="min-h-screen bg-gray-50">
              {children}
            </div>
            <AppToaster />
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
