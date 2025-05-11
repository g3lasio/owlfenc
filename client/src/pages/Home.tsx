import { Link } from "wouter";
import { MessagesSquare } from "lucide-react";

export default function Home() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Link href="/mervin">
        <button className="relative group">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div className="relative flex items-center justify-center w-48 h-48 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 border-4 border-blue-300 shadow-xl group-hover:scale-110 transition-transform duration-300">
            <div className="absolute inset-2 rounded-full bg-gradient-to-r from-blue-900 to-blue-700"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-blue-400/20 animate-pulse"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-blue-300/40 animate-ping"></div>
            </div>
            <MessagesSquare className="relative w-12 h-12 text-white z-10" />
          </div>
          <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur animate-pulse"></div>
          <span className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-lg font-semibold text-blue-500">
            Mervin AI
          </span>
        </button>
      </Link>
    </div>
  );
}