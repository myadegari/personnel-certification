// File: components/CourseList.jsx
'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, Clock, Users, Hashtag as Hash, Timer, Inbox, GraduationCap } from "reicon-react";
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/admin/ui/PageHeader';
import EnrollButton from '@/components/EnrollButton';
import { fadeUp, staggerContainer } from '@/lib/motion';
import { formatDate, toPersianDigits } from '@/lib/persian-date';
import { cn } from '@/lib/utils';

const TONES = {
  emerald: {
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    accent: 'from-emerald-500/10 to-emerald-500/0',
  },
  amber: {
    pill: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    accent: 'from-amber-500/10 to-amber-500/0',
  },
  rose: {
    pill: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    accent: 'from-rose-500/10 to-rose-500/0',
  },
  sky: {
    pill: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    accent: 'from-sky-500/10 to-sky-500/0',
  },
  stone: {
    pill: 'bg-muted text-muted-foreground ring-border',
    accent: 'from-muted-foreground/10 to-transparent',
  },
};

const FILTERS = [
  { value: 'ALL', label: 'همه' },
  { value: 'OPEN', label: 'قابل ثبت‌نام' },
  { value: 'PENDING', label: 'در انتظار بررسی' },
  { value: 'APPROVED', label: 'ثبت‌نام‌شده' },
  { value: 'REJECTED', label: 'رد شده' },
  { value: 'CLOSED', label: 'اتمام مهلت' },
];

const SORTS = [
  { value: 'date-asc', label: 'نزدیک‌ترین تاریخ' },
  { value: 'date-desc', label: 'جدیدترین' },
  { value: 'duration-asc', label: 'کوتاه‌ترین مدت' },
];

function deadlineOf(course) {
  return course.enrollmentDeadline || course.date + 86399;
}

function decorate(course, enrollmentStatus, approvedCount) {
  const nowSec = Math.floor(Date.now() / 1000);
  const deadline = deadlineOf(course);
  const registrationOpen = nowSec <= deadline;
  const capacityFull = course.enrollmentLimit ? approvedCount >= course.enrollmentLimit : false;
  const daysLeft = Math.ceil((deadline - nowSec) / 86400);

  let bucket;
  if (enrollmentStatus === 'APPROVED') bucket = 'APPROVED';
  else if (enrollmentStatus === 'PENDING') bucket = 'PENDING';
  else if (enrollmentStatus === 'REJECTED') bucket = 'REJECTED';
  else if (!registrationOpen || capacityFull) bucket = 'CLOSED';
  else bucket = 'OPEN';

  return { course, enrollmentStatus, approvedCount, registrationOpen, capacityFull, daysLeft, bucket };
}

function pillFor(d) {
  switch (d.bucket) {
    case 'APPROVED':
      return { label: 'تایید شده', tone: 'emerald' };
    case 'PENDING':
      return { label: 'در انتظار بررسی', tone: 'amber' };
    case 'REJECTED':
      return { label: 'رد شده', tone: 'rose' };
    case 'CLOSED':
      return { label: d.capacityFull && d.registrationOpen ? 'ظرفیت تکمیل' : 'اتمام مهلت', tone: 'stone' };
    default:
      return { label: 'قابل ثبت‌نام', tone: 'sky' };
  }
}

function MetaRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function Countdown({ d }) {
  if (!d.registrationOpen) {
    return <span className="text-muted-foreground">مهلت ثبت‌نام به پایان رسیده است</span>;
  }
  if (d.capacityFull) {
    return <span className="text-muted-foreground">ظرفیت این دوره تکمیل شده است</span>;
  }
  if (d.daysLeft <= 0) {
    return <span className="font-medium text-rose-600">امروز آخرین مهلت ثبت‌نام است</span>;
  }
  if (d.daysLeft === 1) {
    return <span className="font-medium text-amber-600">فقط ۱ روز تا پایان مهلت</span>;
  }
  return <span className="text-muted-foreground">{toPersianDigits(String(d.daysLeft))} روز تا پایان مهلت</span>;
}

function CourseCard({ d, onEnrolled }) {
  const { course } = d;
  const pill = pillFor(d);
  const tone = TONES[pill.tone];
  return (
    <motion.article
      layout
      variants={fadeUp}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-white/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm"
    >
      <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70 transition-opacity group-hover:opacity-100', tone.accent)} />
      <div className="relative flex flex-1 flex-col">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-foreground" title={course.name}>{course.name}</h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{course.organizingUnit}</p>
          </div>
          <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', tone.pill)}>
            {pill.label}
          </span>
        </header>

        <div className="mt-5 grid grid-cols-1 gap-2.5 border-t border-border/60 pt-4 sm:grid-cols-2">
          <MetaRow icon={Calendar} label="تاریخ" value={formatDate(new Date(course.date * 1000), 'yyyy/MM/dd')} />
          <MetaRow icon={Clock} label="مدت" value={`${toPersianDigits(String(course.duration))} ساعت`} />
          {course.courseCode ? <MetaRow icon={Hash} label="کد" value={course.courseCode} /> : null}
          {course.enrollmentLimit ? (
            <MetaRow
              icon={Users}
              label="ظرفیت"
              value={`${toPersianDigits(String(d.approvedCount))} / ${toPersianDigits(String(course.enrollmentLimit))}`}
            />
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <Timer className="size-4 text-muted-foreground" />
          <Countdown d={d} />
        </div>

        <footer className="mt-5 pt-1">
          <EnrollButton
            courseId={course._id}
            status={d.enrollmentStatus}
            deadlinePassed={!d.registrationOpen}
            capacityFull={d.capacityFull}
            onEnrolled={onEnrolled}
          />
        </footer>
      </div>
    </motion.article>
  );
}

export default function CourseList({ initialCourses, enrollmentMap, approvedCounts }) {
  const [enrollments, setEnrollments] = useState(() => ({ ...enrollmentMap }));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [sort, setSort] = useState('date-asc');

  const handleEnrolled = (courseId, status) => {
    setEnrollments((prev) => ({ ...prev, [courseId]: status }));
  };

  const decorated = useMemo(
    () =>
      initialCourses.map((c) =>
        decorate(c, enrollments[c._id], approvedCounts[c._id] || 0)
      ),
    [initialCourses, enrollments, approvedCounts]
  );

  const counts = useMemo(() => {
    const base = { ALL: decorated.length, OPEN: 0, PENDING: 0, APPROVED: 0, REJECTED: 0, CLOSED: 0 };
    for (const d of decorated) base[d.bucket] = (base[d.bucket] || 0) + 1;
    return base;
  }, [decorated]);

  const visible = useMemo(() => {
    let list = decorated;
    if (filter !== 'ALL') list = list.filter((d) => d.bucket === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          (d.course.name || '').toLowerCase().includes(q) ||
          (d.course.organizingUnit || '').toLowerCase().includes(q) ||
          String(d.course.courseCode || '').includes(q)
      );
    }
    const sorted = [...list];
    switch (sort) {
      case 'date-asc':
        sorted.sort((a, b) => a.course.date - b.course.date);
        break;
      case 'duration-asc':
        sorted.sort((a, b) => a.course.duration - b.course.duration);
        break;
      case 'date-desc':
      default:
        sorted.sort((a, b) => b.course.date - a.course.date);
        break;
    }
    return sorted;
  }, [decorated, filter, query, sort]);

  const hasCourses = initialCourses.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="دوره‌های آموزشی"
        description="ثبت‌نام در دوره‌های مرکز و مشاهده وضعیت درخواست‌های شما"
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جست‌وجوی دوره، واحد یا کد..."
            aria-label="جست‌وجوی دوره"
            className="rounded-xl border-border/60 bg-white/70 pr-9 backdrop-blur-sm"
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-full cursor-pointer rounded-xl border-border/60 bg-white/70 backdrop-blur-sm lg:w-52">
            <SelectValue placeholder="مرتب‌سازی" />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={active}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'border border-border/60 bg-white/70 text-muted-foreground hover:bg-white'
              )}
            >
              {f.label}
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  active ? 'bg-white/25' : 'bg-muted text-muted-foreground'
                )}
              >
                {toPersianDigits(String(counts[f.value] || 0))}
              </span>
            </button>
          );
        })}
      </div>

      {!hasCourses ? (
        <EmptyState
          icon={GraduationCap}
          title="هنوز دوره‌ای تعریف نشده است"
          description="به‌محض انتشار دوره‌ها، آن‌ها را اینجا مشاهده خواهید کرد."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="موردی یافت نشد"
          description="با این جست‌وجو یا فیلترها دوره‌ای وجود ندارد."
        />
      ) : (
        <motion.div
          variants={staggerContainer(0.06)}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {visible.map((d) => (
              <CourseCard key={d.course._id} d={d} onEnrolled={handleEnrolled} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-white/60 py-16 text-center backdrop-blur-sm">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
        <Icon className="size-7" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
