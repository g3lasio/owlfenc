
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="home-container w-full h-full">
      <Link href="/mervin">
        <button className="relative group">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div className="relative flex items-center justify-center w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 xl:w-72 xl:h-72 group-hover:scale-110 transition-transform duration-300">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 xl:w-56 xl:h-56 rounded-full bg-blue-300/20 animate-pulse"></div>
            </div>
            <img 
              src="https://i.postimg.cc/FK6hvMbf/logo-mervin.png" 
              alt="Mervin AI" 
              className="relative w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 xl:w-56 xl:h-56 object-contain z-10"
            />
          </div>
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-lg font-semibold text-blue-500 whitespace-nowrap">
            Mervin AI
          </div>
        </button>
      </Link>
    </div>
  );
}
