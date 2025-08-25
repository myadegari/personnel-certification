// فایل: app/layout.js
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import AuthProvider from "./context/AuthProvider";
import Header from "@/components/Header";

const vazirmatn = Vazirmatn({ subsets: ["latin"] });

export const metadata = {
  title: "سامانه کارمندان دانشگاه",
  description: "پرتال جامع خدمات کارمندان",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl"  suppressHydrationWarning="true" data-lt-installed="true">
      <body className={vazirmatn.className}>
        <AuthProvider>
          <div className="flex flex-col min-h-screen bg-gray-50">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}