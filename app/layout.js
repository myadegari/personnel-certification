/* FILE: app/layout.js */
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import AuthProvider from "./context/AuthProvider";
import Header from "@/components/Header";
import Providers from "@/components/Providers";
import Image from "next/image";
import universityLogo from '@/public/universityLogo.jpg';

const vazirmatn = Vazirmatn({ subsets: ["arabic"] });

export const metadata = {
  title: "سامانه کارمندان دانشگاه",
  description: "پورتال جامع خدمات کارمندان",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning="true" data-lt-installed="true">
      <body className={vazirmatn.className}>
        <AuthProvider>
          <Providers>
            <div className="flex flex-col min-h-screen bg-gray-50 relative">
              {/* Header commented out as in your original code */}
              {/* <Header /> */}
              
              <main className="flex-grow container mx-auto px-4">
                {children}
              </main>
              
              <footer className="bg-white py-4 border-t border-gray-200 fixed bottom-0 w-full">
                <div className="container mx-auto px-4 text-center">
                  {/* Proper image implementation with appropriate size */}
                  <div className="flex flex-row-reverse gap-2 justify-center items-center">
                    <div className="text-xs text-gray-500 grid gap-1 w-fit">
                      <p>مجتمع آموزش عالی لارستان</p>
                      <p>Larestan Higher Education Complex</p>
                    </div>
                    <Image 
                      src={universityLogo} 
                      width={55} 
                      height={50} 
                      alt="لوگوی دانشگاه"
                      className="object-contain opacity-60"
                      priority={false}
                    />
                  </div>
                  {/* <p className="text-gray-600 text-sm">
                    © {new Date().getFullYear()} سامانه کارمندان دانشگاه. تمام حقوق محفوظ است.
                  </p> */}
                </div>
              </footer>
            </div>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}