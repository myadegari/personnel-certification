/* FILE: app/layout.js (Update this file) */
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import AuthProvider from "./context/AuthProvider";
import Header from "@/components/Header";
import Providers from "@/components/Providers"; // <-- Import the new provider

const vazirmatn = Vazirmatn({ subsets: ["latin"] });

export const metadata = {
  title: "سامانه کارمندان دانشگاه",
  description: "پرتال جامع خدمات کارمندان",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body className={vazirmatn.className}>
        <AuthProvider>
          <Providers> {/* <-- Wrap your app with the provider */}
            <div className="flex flex-col min-h-screen bg-gray-50">
              <Header />
              <main className="flex-grow container mx-auto px-4 py-8">
                {children}
              </main>
            </div>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
