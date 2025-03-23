import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, role, level, techstack, amount, userid } = body;

    // 🔍 Validate required fields
    if (!type || !role || !level || !techstack || !amount || !userid) {
      return Response.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 🎯 Generate AI Interview Questions
    const { text: questions } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
        
        Thank you! <3
    `,
    });

    // 🔎 Ensure AI response is valid
    if (!questions) {
      return Response.json(
        { success: false, error: "AI response is empty or invalid" },
        { status: 500 }
      );
    }

    // 📌 Format Data for Firestore
    const interview = {
      role,
      type,
      level,
      techstack: techstack.split(","), // Convert string to array
      questions: JSON.parse(questions), // Parse AI-generated questions
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    // 🔥 Save interview to Firestore
    await db.collection("interviews").add(interview);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("❌ Error:", error);
    return Response.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ Simple GET Route
export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
