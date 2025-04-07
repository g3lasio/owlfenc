export default function TypingIndicator() {
  return (
    <div className="chat-message bot-message" style={{ width: "auto", display: "inline-block" }}>
      <div className="flex items-center gap-1 px-1">
        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-0"></span>
        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-300"></span>
        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-600"></span>
      </div>
    </div>
  );
}
