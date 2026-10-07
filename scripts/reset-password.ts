import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI!;

// Prompt for input; when hidden, typed characters are not echoed
function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      (rl as any)._writeToOutput = (s: string) => {
        if (s.includes(question)) process.stdout.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

async function resetPassword() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in .env.local');
    process.exit(1);
  }

  const username = (process.argv[2] || (await ask('Username: '))).toLowerCase();
  const newPassword = await ask('New password: ', true);
  const confirmPassword = await ask('Confirm password: ', true);

  if (newPassword !== confirmPassword) {
    console.error('❌ Passwords do not match');
    process.exit(1);
  }
  if (newPassword.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);

    const hashed = await bcrypt.hash(newPassword, 12);
    const result = await mongoose.connection
      .collection('users')
      .updateOne({ username }, { $set: { password: hashed, updatedAt: new Date() } });

    if (result.matchedCount === 0) {
      const users = await mongoose.connection.collection('users').find({}, { projection: { username: 1 } }).toArray();
      console.error(`❌ No user '${username}'. Existing users: ${users.map((u) => u.username).join(', ')}`);
      process.exit(1);
    }

    console.log(`✅ Password updated for '${username}'`);
  } finally {
    await mongoose.disconnect();
  }
}

resetPassword().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
