// File: components/CourseList.jsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import EnrollButton from "@/components/EnrollButton";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { fetchCourses } from '@/app/dashboard/courses/page'; // Import the Server Action
import { Badge } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

const CourseStatusElement= ({ status }) => {
  switch(status){
    case 1:
      return <p className="text-xs py-2 text-blue-600 bg-blue-400/25 px-4 rounded-full">دوره پیش‌رو</p>;
    case 2:
      return <p className="text-xs py-2 text-green-600 bg-green-400/25 px-4 rounded-full">درحال برگزاری</p>;
    case 3:
      return <p className="text-xs py-2 text-red-600 bg-red-400/25 px-4 rounded-full">امروز آخرین مهلت ثبت‌نام</p>;
    case 4:
      return <p className="text-xs py-2 text-gray-600 bg-gray-400/25 px-4 rounded-full">اتمام ثبت نام</p>;
    default:
      return <p className="text-xs py-2 text-gray-600 bg-gray-400/25 px-4 rounded-full">وضعیت نامشخص</p>;
  }
}

export default function CourseList({ initialCourses, enrollmentMap }) {
  const [courses, setCourses] = useState(initialCourses);
  const [page, setPage] = useState(2); // Start with the next page to fetch
  const [hasMore, setHasMore] = useState(initialCourses.length > 0);
  const [isLoading, setIsLoading] = useState(false);
  const loaderRef = useRef(null);

  const loadMoreCourses = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    const newCourses = await fetchCourses({ page });
    
    if (newCourses.length > 0) {
      setCourses((prevCourses) => [...prevCourses, ...newCourses]);
      setPage((prevPage) => prevPage + 1);
    } else {
      setHasMore(false); // No more courses to load
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && hasMore && !isLoading) {
          loadMoreCourses();
        }
      },
      { threshold: 1.0 } // Trigger when the loader is fully visible
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    // Cleanup observer on component unmount
    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasMore, isLoading]); // Re-run effect if these dependencies change

// New, more robust function to determine course status
const getCourseStatus = (course) => {
  const now = new Date();
  // Get start and end of day in UTC to avoid timezone issues
  const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const courseDateUTC = new Date(course.date * 1000);
  const enrollmentDeadlineUTC = new Date((course.enrollmentDeadline || course.date) * 1000);

  // If enrollment deadline has passed, the course is closed for registration
  if (now > enrollmentDeadlineUTC) {
    return 4; // Canceled or Closed
  }

  // If the course date is in the future, it's an upcoming course
  if (courseDateUTC > startOfTodayUTC) {
    return 1; // Upcoming
  }

  // If the course date is today or has passed, but the enrollment is still open, it's ongoing or enrollment is open
  if (now <= enrollmentDeadlineUTC) {
    // If the course has already started, it's in progress
    if (now >= courseDateUTC) {
      return 2; // In Progress
    }
    // If the course starts today, it's the last day to enroll
    if (startOfTodayUTC.getTime() === enrollmentDeadlineUTC.getTime() && now < enrollmentDeadlineUTC) {
      return 3; // Last Day to Enroll
    }
  }

  // Default to a status indicating an unknown state
  return 0;
};

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const enrollmentStatus = enrollmentMap.get(course._id.toString());
          const enrollmentDeadline = course.enrollmentDeadline || (course.date + 86399);
          
          return (
            <Card key={course._id} className={cn("flex flex-col drop-shadow-slate-300/50 drop-shadow-[0px_10px_5px]",{"opacity-50":[4,0].includes(getCourseStatus(course)) })}>
              <CardHeader>
                <div  className="flex justify-between items-center">
                <div>
                  <CardTitle className={cn("text-2xl", { "text-green-600": [1,2,3].includes(getCourseStatus(course)) })}>{course.name}</CardTitle>
                  <CardDescription>{course.organizingUnit}</CardDescription>
                </div>
                  <CourseStatusElement status={getCourseStatus(course)}/>
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex justify-around border-t pt-5">
                <p className="flex flex-col gap-2 items-center text-lg"><span className="text-[13px] font-normal text-gray-500">تاریخ برگزاری</span> {new DateObject({date:new Date(course.date*1000),calendar: persian, locale: persian_fa }).format()}</p>
                {/* <p className="flex flex-col gap-2 items-center text-lg"><span className="text-[13px] font-normal text-gray-500">مهلت ثبت‌نام</span> {new DateObject({date:new Date(enrollmentDeadline * 1000),calendar: persian, locale: persian_fa }).format("YYYY/MM/DD")}</p> */}
                <p className="flex flex-col gap-2 items-center text-lg"><span className="text-[13px] font-normal text-gray-500">مدت زمان</span> {course.duration} ساعت</p>
              </CardContent>
              <CardFooter>
                <EnrollButton courseId={course._id.toString()} status={enrollmentStatus} enrollmentDeadline={enrollmentDeadline}/>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Loader element to trigger fetching more data */}
      <div ref={loaderRef} className="col-span-full text-center p-4">
        {isLoading && <p>در حال بارگذاری دوره‌های بیشتر...</p>}
        {/* {!hasMore && courses.length > 0 && <p>شما به انتهای لیست رسیده‌اید.</p>} */}
        {courses.length === 0 && !isLoading && <p>هیچ دوره‌ای برای نمایش وجود ندارد.</p>}
      </div>
    </>
  );
}