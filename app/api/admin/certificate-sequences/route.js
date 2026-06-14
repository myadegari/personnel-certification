import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/dbConnect';
import CertificateSequence from '@/models/Indicator';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  await dbConnect();
  const sequences = await CertificateSequence.find({}).lean();
  
  // افزودن وضعیت به هر الگو برای استفاده راحت‌تر در فرانت‌اند
  const sequencesWithStatus = sequences.map(seq => {
    const remaining = 9999 - seq.lastNumber; 
    let status = 'available';
    if (remaining < 10) {
      status = 'disabled';
    } else if (remaining <= 30) {
      status = 'warning';
    }
    return { ...seq, remaining, status };
  });

  return NextResponse.json(sequencesWithStatus);
}