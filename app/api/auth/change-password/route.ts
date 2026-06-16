import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { newPassword, confirmPassword } = await req.json();

  if (!newPassword || !confirmPassword) {
    return NextResponse.json(
      { error: "Both fields are required" },
      { status: 400 },
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "Passwords do not match" },
      { status: 400 },
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const username = (session.user as any).username;
  const hashed = await bcrypt.hash(newPassword, 12);

  await User.findOneAndUpdate({ username }, { password: hashed });

  return NextResponse.json({ success: true });
}
