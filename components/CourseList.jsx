// File: components/CourseList.jsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import EnrollButton from "@/components/EnrollButton";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { fetchCourses } from '@/app/dashboard/courses/page'; // Import the Server Action

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


  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const enrollmentStatus = enrollmentMap.get(course._id.toString());
          const enrollmentDeadline = course.enrollmentDeadline || (course.date + 86399);
          
          return (
            <Card key={course._id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{course.name}</CardTitle>
                <CardDescription>{course.organizingUnit}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p><strong>تاریخ برگزاری:</strong> {new DateObject({date:new Date(course.date*1000),calendar: persian, locale: persian_fa }).format()}</p>
                <p><strong>مهلت ثبت‌نام:</strong> {new DateObject({date:new Date(enrollmentDeadline * 1000),calendar: persian, locale: persian_fa }).format("YYYY/MM/DD")}</p>
                <p><strong>مدت زمان:</strong> {course.duration} ساعت</p>
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