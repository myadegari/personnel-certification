'use client';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from './ui/button';

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-blue-600">
          سامانه کارمندان
        </Link>
        <div>
          {status === 'authenticated' && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">خوش آمدید، {session.user.name}</span>
              <Button variant="destructive" size="sm" onClick={() => signOut()}>خروج</Button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
