
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center min-h-screen">
      <Link href="/mervin">
        <button className="relative group">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div className="relative flex items-center justify-center w-48 h-48 md:w-64 md:h-64 lg:w-72 lg:h-72 group-hover:scale-110 transition-transform duration-300">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-full bg-blue-300/20 animate-pulse"></div>
            </div>
            <img 
              src="https://i.postimg.cc/FK6hvMbf/logo-mervin.png" 
              alt="Mervin AI" 
              className="relative w-32 h-32 md:w-48 md:h-48 lg:w-56 lg:h-56 object-contain z-10"
            />
          </div>
          <span className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-lg font-semibold text-blue-500">
            Mervin AI
          </span>
        </button>
      </Link>
    </div>
  );
}
