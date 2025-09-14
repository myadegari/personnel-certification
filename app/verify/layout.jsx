/* FILE: app/layout.js */
import Image from "next/image";
import universityLogo from '@/public/universityLogo.jpg';

export default function AuthenticationLayout({ children }) {
  return (
 
            <div className="bg-gray-50 relative">
          
                {children}
              
                <footer className="bg-white py-4 border-t border-gray-200 w-full fixed bottom-0">
                <div className="container mx-auto px-4 text-center">
                  {/* Proper image implementation with appropriate size */}
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
                  {/* <p className="text-gray-600 text-sm">
                    © {new Date().getFullYear()} سامانه کارمندان دانشگاه. تمام حقوق محفوظ است.
                  </p> */}
                </div>
              </footer>
            </div>

  );
}

`
<
`