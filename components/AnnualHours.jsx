"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { PersianYearPicker } from "@/components/admin/PersianDatePicker";
import { toShamsi, fromShamsi } from "@/lib/persian-date";

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
  const [selectedYear, setSelectedYear] = React.useState(
    () => toShamsi(new Date()).year
  );

  const getJalaliYearTimestamps = (jalaliYear) => {
    const start = fromShamsi({ year: jalaliYear, month: 1, day: 1 });
    const end = fromShamsi({ year: jalaliYear + 1, month: 1, day: 1 });
    return {
      startTimestamp: start.getTime() / 1000,
      endTimestamp: end.getTime() / 1000,
    };
  };

  React.useEffect(() => {
    async function fetchData() {
      const { startTimestamp, endTimestamp } = getJalaliYearTimestamps(selectedYear);
      const data = await getAnnualHours(startTimestamp, endTimestamp);
      if (data) {
        setAnnualHours(data.annualHours);
      }
      setLoading(false);
    }
    fetchData();
  }, [selectedYear]); // The effect now depends only on the selected year

  return (
    <Card className="rounded-2xl cursor-default hover:z-10 bg-white dark:bg-gray-800 shadow-md">
      <CardHeader className="text-center flex-col space-y-2">
        <CardTitle>مجموع ساعات آموزشی سالانه</CardTitle>
        <div className="flex justify-center items-center">
          <PersianYearPicker year={selectedYear} onYearChange={setSelectedYear} />
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