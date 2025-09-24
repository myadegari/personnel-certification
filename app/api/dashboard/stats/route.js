import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";
import Course from "@/models/Course";
import mongoose from "mongoose";
import User from "@/models/User";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!mongoose.Types.ObjectId.isValid(session.user.id)) {
      return new Response(JSON.stringify({ message: "Invalid user ID" }), {
        status: 400,
      });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const startTimestampStr = searchParams.get("startTimestamp");
    const endTimestampStr = searchParams.get("endTimestamp");

    // ✅ 1. Convert timestamps from strings to numbers
    const startTimestamp = startTimestampStr ? parseInt(startTimestampStr, 10) : null;
    const endTimestamp = endTimestampStr ? parseInt(endTimestampStr, 10) : null;

    const dbUser = await User.findById(session.user.id);
    const matchFilter = {
      user: dbUser._id,
      status: "APPROVED",
    };

    const pipeline = [
      { $match: matchFilter },
      {
        $lookup: {
          from: "courses",
          localField: "course", // Use simple local/foreign field lookup
          foreignField: "_id",
          as: "courseDetails",
        },
      },
      { $unwind: "$courseDetails" },
      // ✅ 2. Add a new $match stage AFTER the lookup and unwind
      //    This ensures we filter the combined results correctly.
      {
        $match: {
          ...(startTimestamp &&
            endTimestamp && {
              "courseDetails.date": {
                $gte: startTimestamp,
                $lt: endTimestamp,
              },
            }),
        },
      },
      {
        $group: {
          _id: null,
          totalAnnualHours: { $sum: "$courseDetails.duration" },
        },
      },
    ];

    const result = await Enrollment.aggregate(pipeline);
    const totalAnnualHours = result[0]?.totalAnnualHours || 0;
    
    return new Response(
      JSON.stringify({
        annualHours: totalAnnualHours,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("API Error:", error);
    return new Response(
      JSON.stringify({
        message: "Internal Server Error",
        ...(process.env.NODE_ENV === "development" && {
          error: error.message,
        }),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}