// route.js

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import CertificateSequence from '@/models/Indicator';

// حداکثر ظرفیت برای یک زیرالگو (بر اساس شرط nextNumber > 9999 در certificateService.js)
const MAX_NUMBER = 9999;

export async function GET() {
  await dbConnect();
  
  // 1. واکشی تمام Indicatorها (شامل زیرالگوها)
  const allSequences = await CertificateSequence.find({}).lean();
  
  // ساخت یک نقشه برای گروه‌بندی زیرالگوها بر اساس الگوی پایه
  const basePatternsMap = new Map();

  for (const seq of allSequences) {
    // الگوی پایه را استخراج می‌کنیم. اگر الگوی کامل شامل '/' باشد، بخش آخر (زیرالگو) را حذف می‌کنیم.
    // مثال: '404/الف/ک' -> '404/الف'
    const parts = seq.pattern.split('/');
    const isSubPattern = parts.length > 2 && (parts[parts.length - 1] === 'ک' || parts[parts.length - 1] === 'ع');
    
    // اگر یک زیرالگوی شناخته شده بود، الگوی پایه را استخراج کن. در غیر این صورت، خودش الگوی پایه است.
    const basePattern = isSubPattern 
      ? parts.slice(0, parts.length - 1).join('/')
      : seq.pattern;

    if (!basePatternsMap.has(basePattern)) {
      basePatternsMap.set(basePattern, { 
        pattern: basePattern,
        totalLastNumber: 0,
        subPatterns: [] // برای ذخیره زیرالگوها و محاسبه مجموع
      });
    }

    basePatternsMap.get(basePattern).subPatterns.push(seq);
  }

  // 2. محاسبه مجموع ظرفیت مصرف شده برای هر الگوی پایه
  const baseSequences = Array.from(basePatternsMap.values()).map(baseEntry => {
    // مجموع آخرین شماره‌های استفاده شده در تمام زیرالگوهای مربوطه
    const totalLastNumber = baseEntry.subPatterns.reduce((sum, subSeq) => sum + subSeq.lastNumber, 0);
    
    // ظرفیت باقی‌مانده. فرض می‌کنیم هر زیرالگو حداکثر ظرفیت MAX_NUMBER را دارد.
    // اگر الگوی پایه دو زیرالگو داشته باشد، ظرفیت کل MAX_NUMBER * 2 است.
    const totalCapacity = baseEntry.subPatterns.length * MAX_NUMBER;
    const totalRemaining = totalCapacity - totalLastNumber;

    let status = 'available';
    if (totalRemaining < 10) {
      status = 'disabled';
    } else if (totalRemaining <= 30) {
      status = 'warning';
    }

    // بازگرداندن فقط اطلاعات الگوی پایه برای کامبوباکس
    return { 
      pattern: baseEntry.pattern, 
      lastNumber: totalLastNumber, // مجموع آخرین شماره‌ها (برای نمایش میزان مصرف)
      remaining: totalRemaining, 
      status: status,
    };
  });

  return NextResponse.json(baseSequences);
}