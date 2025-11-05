interface FuturisticThinkingProps {
  state: 'thinking' | 'analyzing';
}

export function FuturisticThinking({ state }: FuturisticThinkingProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 backdrop-blur-sm">
      <div className="relative w-4 h-4">
        {/* Spinning outer ring */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-purple-400 animate-spin" />
        
        {/* Pulsing inner dot */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 animate-pulse" />
      </div>
      
      <span className="text-xs font-medium bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
        {state === 'thinking' ? 'Pensando' : 'Procesando'}
      </span>
      
      {/* Animated dots */}
      <div className="flex gap-0.5">
        <div className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
