"use server";

import { auth, db } from "@/firebase/admin";
import { cookies } from "next/headers";

// Session duration (1 week)
const SESSION_DURATION = 60 * 60 * 24 * 7; // 1 week in seconds

// 🔹 Set session cookie securely
export async function setSessionCookie(idToken: string) {
  try {
    const cookieStore = await cookies();

    // Create Firebase session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION * 1000, // Convert to milliseconds
    });

    // Set session cookie
    cookieStore.set("session", sessionCookie, {
      maxAge: SESSION_DURATION,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false, // 🔹 Prevent issues in localhost
      path: "/",
      sameSite: "lax",
    });

    console.log("✅ Session cookie set successfully.");
  } catch (error) {
    console.error("❌ Error setting session cookie:", error);
  }
}

// 🔹 Sign up user
export async function signUp(params: SignUpParams) {
  const { uid, name, email } = params;

  try {
    // Check if user exists in Firestore
    const userRecord = await db.collection("users").doc(uid).get();
    if (userRecord.exists) {
      return {
        success: false,
        message: "User already exists. Please sign in.",
      };
    }

    // Save user to Firestore
    await db.collection("users").doc(uid).set({
      name,
      email,
    });

    console.log(`✅ User created: ${name} (${email})`);
    return { success: true, message: "Account created successfully. Please sign in." };
    
  } catch (error: any) {
    console.error("❌ Error creating user:", error);

    // Handle Firebase specific errors
    if (error.code === "auth/email-already-exists") {
      return { success: false, message: "This email is already in use" };
    }

    return { success: false, message: "Failed to create account. Please try again." };
  }
}

// 🔹 Sign in user
export async function signIn(params: SignInParams) {
  const { email, idToken } = params;

  try {
    const userRecord = await auth.getUserByEmail(email);
    if (!userRecord) {
      return { success: false, message: "User does not exist. Create an account." };
    }

    await setSessionCookie(idToken);
    console.log(`✅ User signed in: ${email}`);
    return { success: true, message: "Signed in successfully." };
  } catch (error) {
    console.error("❌ Error signing in:", error);
    return { success: false, message: "Failed to log into account. Please try again." };
  }
}

// 🔹 Sign out user
export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  console.log("✅ User signed out.");
}

// 🔹 Get current user from session
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) {
    console.warn("⚠ No session cookie found.");
    return null;
  }

  try {
    // Verify session
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const userRecord = await db.collection("users").doc(decodedClaims.uid).get();

    if (!userRecord.exists) {
      console.warn(`⚠ User record not found for UID: ${decodedClaims.uid}`);
      return null;
    }

    console.log(`✅ User authenticated: ${decodedClaims.uid}`);
    return { ...userRecord.data(), id: userRecord.id } as User;
  } catch (error) {
    console.error("❌ Error verifying session:", error);
    return null;
  }
}

// 🔹 Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
