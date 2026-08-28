import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Indicator from '@/models/Indicator';
import { requireAdmin } from '@/lib/authGuard';
import { INDICATOR_MAX_NUMBER } from '@/lib/certificateService';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  await dbConnect();
  const sequences = await Indicator.find({}).lean();

  // افزودن وضعیت به هر الگو برای استفاده راحت‌تر در فرانت‌اند
  const sequencesWithStatus = sequences.map((seq) => {
    const remaining = INDICATOR_MAX_NUMBER - seq.lastNumber;
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
