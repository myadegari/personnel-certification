import Image from "next/image";
import universityLogo from '@/public/universityLogo.jpg';

export default function AuthenticationLayout({ children }) {
  return (
    // This main div will center its children and act as a positioning container
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      
      {/* 1. The orange box is now in the layout. */}
      {/* It's positioned absolutely relative to the main div and has a negative z-index to place it behind everything. */}

      {/* <div className="w-11/12 h-12/12 bg-amber-400 absolute -top-1/12 -right-3/12 z-10 rounded-full blur-2xl" /> */}
      {/* <div className="w-11/12 h-12/12 bg-emerald-600 absolute -top-1/12 right-5/12 z-10 rounded-full blur-2xl" /> */}
      {/* <div className="w-4/12 aspect-square bg-white/50 absolute top-1/2 right-1/2 translate-x-[50%] translate-y-[-50%] z-10 rounded-full blur-2xl" /> */}
      {/* <div className="w-11/12 h-11/12 bg-emerald-200 absolute top-1/12 right-8/12 z-10 rounded-full blur-2xl" /> */}

      {/* 2. Your page content (the form) is wrapped in a main tag. */}
      {/* 'relative' and 'z-10' ensure it sits on top of the orange box. */}
      <main className="z-10 flex-1">
        {children}
      </main>

      {/* The footer remains fixed at the bottom */}
      <footer className="bg-white py-4 border-t border-gray-200 w-full fixed bottom-0 z-20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-row-reverse gap-2 justify-center items-center">
            <div className="text-xs text-gray-500 grid gap-1 w-fit">
              <p className=" font-black">مجتمع آموزش عالی لارستان</p>
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
        </div>
      </footer>
    </div>
  );
}