"use client"

import Image from "next/image";
import universityLogo from '@/public/universityLogo.jpg';
import { motion } from "motion/react"

export default function AuthenticationLayout({ children }) {
  return (
    // This main div will center its children and act as a positioning container
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-emerald-950/60">
      
      <div className="max-lg:w-5/12 w-4/12 aspect-square bg-amber-400 absolute top-4/12 right-0 translate-x-[10%] scale-200 z-10 rounded-full blur-3xl " />
      <div className="max-lg:w-5/12 w-4/12 aspect-square bg-orange-500 absolute top-4/12 left-0 translate-y-[10%] scale-200 z-10 rounded-full blur-3xl" />
        <div className="max-lg:w-5/12 w-4/12 aspect-square bg-stone-100 absolute -top-4/12 left-1/2 translate-x-[-50%] scale-200 z-10 rounded-full blur-3xl" />
      {/* <div className="w-full h-full absolute bg-gray-600/15 z-10"/> */}

      {/* 2. Your page content (the form) is wrapped in a main tag. */}
      {/* 'relative' and 'z-10' ensure it sits on top of the orange box. */}
      <main className="z-10 flex-1">
        {children}
      </main>

      {/* The footer remains fixed at the bottom */}
      <footer className="bg-white py-2 border-t border-gray-200 w-full fixed bottom-0 z-20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-row-reverse gap-2 justify-center items-center">
            <motion.div 
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}  
            className="text-[0.65rem] text-gray-800 grid gap-1 w-fit">
              <p className="">مجتمع آموزش عالی لارستان</p>
              <p>Larestan Higher Education Complex</p>
            </motion.div>
            <motion.div
            initial={{ opacity: 0}}
            animate={{ opacity: 1}}
            transition={{ duration: 0.5 }}  
            >
            <Image 
              src={universityLogo} 
              width={35} 
              height={50} 
              alt="لوگوی دانشگاه"
              className="object-contain opacity-80 "
              priority={false}
            />
            </motion.div>
          </div>
        </div>
      </footer>
    </div>
  );
}