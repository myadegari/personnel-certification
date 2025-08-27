import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import CertificateSequence from '@/models/CertificateSequence';

export async function GET() {
  await dbConnect();
  const sequences = await CertificateSequence.find({}).lean();
  
  // افزودن وضعیت به هر الگو برای استفاده راحت‌تر در فرانت‌اند
  const sequencesWithStatus = sequences.map(seq => {
    const remaining = 999 - seq.lastNumber;
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