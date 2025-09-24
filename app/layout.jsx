/* FILE: app/layout.js */
// import { Vazirmatn } from "next/font/google";
import localFont from 'next/font/local';
import "./globals.css";
import AuthProvider from "./context/AuthProvider";
import Header from "@/components/Header";
import Providers from "@/components/Providers";
import Image from "next/image";
import universityLogo from '@/public/universityLogo.jpg';
import { Theme } from "@radix-ui/themes";
// import { ToastContainer, ToastContentProps } from 'react-toastify';
import toast, { Toaster } from 'react-hot-toast';
// const vazirmatn = Vazirmatn({ subsets: ["arabic"] });
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
    // {
    //   path: './fonts/Sahel-Black-FD-WOL.woff2',
    //   weight: '900', // Black
    //   style: 'normal',
    // },
  ],
  display: 'swap', // Improves font loading performance
  variable: '--font-sahel', // This creates a CSS variable
});

export const metadata = {
  title: "سامانه کارمندان دانشگاه",
  description: "پورتال جامع خدمات کارمندان",
};


export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning="true" data-lt-installed="true">
      <body className={sahel.variable}>
        <AuthProvider>
          <Providers>
            <Theme>
            <div className="min-h-screen bg-gray-50">
              {/* Header commented out as in your original code */}
              {/* <Header /> */}
              
          
                {children}
       
              
            </div>
                <Toaster   position="top-center"
  reverseOrder={false} />
            </Theme>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}