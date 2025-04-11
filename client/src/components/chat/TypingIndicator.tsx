
import { Avatar, AvatarImage } from "@/components/ui/avatar";

export default function TypingIndicator() {
  return (
    <div className="chat-message bot-message flex items-start gap-2" style={{ width: "auto", display: "inline-flex" }}>
      <Avatar className="w-8 h-8 animate-pulse">
        <AvatarImage src="https://i.postimg.cc/h40sSgpH/Untitled-design-2.png" alt="Mervin thinking" />
      </Avatar>
      <div className="flex items-center gap-1 px-1 bg-muted rounded-md p-2">
        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce delay-0"></span>
        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce delay-300"></span>
        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce delay-600"></span>
      </div>
    </div>
  );
}
