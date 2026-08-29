/* FILE: app/verify/layout.js */
import Image from "next/image";
import universityLogo from '@/public/universityLogo.jpg';

export default function VerifyLayout({ children }) {
  return (
    <div className="bg-gray-50 relative">
      {children}

      {/* Static (not fixed) so it never overlaps the full-height PDF embed. */}
      <footer className="bg-white py-4 border-t border-gray-200 w-full">
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
