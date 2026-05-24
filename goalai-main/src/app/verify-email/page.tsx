import Image from "next/image";
import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-relief-bg p-6">
      <div className="mb-8 flex justify-center">
        <Image src="/logo.png" alt="Gaolaif" width={64} height={64} className="object-contain" />
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 text-center mb-2">Verify your email</h1>
      <p className="text-gray-400 text-center max-w-sm text-sm leading-relaxed mb-8">
        Open your inbox and confirm your email address. Then sign in again to continue.
      </p>
      <Link
        href="/"
        className="w-full max-w-xs text-center bg-gray-900 text-white rounded-xl text-base py-4 font-medium hover:bg-gray-800 transition-colors"
      >
        Back to sign in
      </Link>
    </div>
  );
}
