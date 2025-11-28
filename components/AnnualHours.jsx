"use client";
import React from "react";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import DateObject from "react-date-object";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useSession } from "next-auth/react";

const getBaseUrl = () => {
  // If we are on the server, use the internal Docker URL
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL || 'http://localhost:3000';
  }
  // If on client, use relative path or public URL
  return ''; 
};

// Update the API call to accept date parameters
async function getAnnualHours(startTimestamp, endTimestamp) {
  try {
    const response = await fetch(`${getBaseUrl()}/api/dashboard/stats?startTimestamp=${startTimestamp}&endTimestamp=${endTimestamp}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch annual hours:", error);
    return null;
  }
}

function AnnualHours() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = React.useState(true);
  const [annualHours, setAnnualHours] = React.useState(0);
  const [selectedJalaliYear, setSelectedJalaliYear] = React.useState(
    new DateObject({ date: new Date(), calendar: persian, locale: persian_fa })
  );

  const getJalaliYearTimestamps = (jalaliYear) => {
    // Get the start and end of the Jalali year in Gregorian
    const date = new DateObject({
      date: jalaliYear,
      calendar: persian,
      locale: persian_fa,
    });
    const startJalaliDate = new DateObject({
      year: date.year,
      month: 1,
      day: 1,
      calendar: persian,
      locale: persian_fa,
    });
    const endJalaliDate = new DateObject({
      year: date.year + 1,
      month: 1,
      day: 1,
      calendar: persian,
      locale: persian_fa,
    }); // Accounts for leap years
    const startTimestamp = startJalaliDate.valueOf()/1000;
    const endTimestamp = endJalaliDate.valueOf()/1000;
    return { startTimestamp, endTimestamp };
  };

  React.useEffect(() => {
    async function fetchData() {
      const { startTimestamp, endTimestamp } = getJalaliYearTimestamps(selectedJalaliYear);
      const data = await getAnnualHours(startTimestamp, endTimestamp);
      if (data) {
        setAnnualHours(data.annualHours);
      }
      setLoading(false);
    }
    fetchData();
  }, [selectedJalaliYear]); // The effect now depends only on the selected year

  return (
    <Card className="rounded-2xl cursor-default hover:z-10 bg-white dark:bg-gray-800 shadow-md">
      <CardHeader className="text-center flex-col space-y-2">
        <CardTitle>مجموع ساعات آموزشی سالانه</CardTitle>
        <div className="flex justify-center items-center">
          <DatePicker
            calendar={persian}
            locale={persian_fa}
            onlyYearPicker
            value={selectedJalaliYear}
            onChange={(date) => setSelectedJalaliYear(date)}
            className="prime"
            inputClass="text-center w-20 bg-transparent border-none focus:outline-none"
          />
        </div>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
          {annualHours} ساعت
        </p>
      </CardContent>
    </Card>
  );
}

export default AnnualHours;