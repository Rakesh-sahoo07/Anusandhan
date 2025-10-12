import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { ConversationNode as ConversationNodeType, AIModel, Message } from "@/types/conversation";
import { getModelInfo } from "@/lib/modelConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, GitBranch, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConversationNodeData extends Record<string, unknown> {
  id: string;
  model: AIModel;
  title: string;
  messages: Message[];
  parentId: string | null;
  position: { x: number; y: number };
  createdAt: number;
  onBranch: (nodeId: string) => void;
  onExpand: (nodeId: string) => void;
  onUpdateMessages: (nodeId: string, messages: Message[]) => void;
}

export const ConversationNode = memo((props: NodeProps) => {
  const data = props.data as ConversationNodeData;
  const modelInfo = getModelInfo(data.model);
  const messageCount = data.messages.filter((m: Message) => m.role !== "system").length;
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: Date.now()
    };

    const updatedMessages = [...data.messages, userMessage];
    data.onUpdateMessages(data.id, updatedMessages);
    setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: "This is a placeholder response. Connect to Groq AI to enable real AI conversations.",
        timestamp: Date.now()
      };
      data.onUpdateMessages(data.id, [...updatedMessages, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-w-[380px] max-w-[420px]" onClick={(e) => e.stopPropagation()}>
      <Handle type="target" position={Position.Top} className="!bg-white" />
      
      <div 
        className={cn(
          "rounded-xl border bg-[#1a1a1a] backdrop-blur-sm",
          "shadow-lg border-white/10 flex flex-col h-[500px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-sm text-white truncate">
                {data.title}
              </span>
              <span className="text-xs text-white/60">
                {modelInfo.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 text-xs text-white/60">
              <MessageSquare className="w-3 h-3" />
              <span>{messageCount}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1 border-white/20 hover:bg-white/10 text-white"
              onClick={(e) => {
                e.stopPropagation();
                data.onBranch(data.id);
              }}
            >
              <GitBranch className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          {data.messages.filter((m: Message) => m.role !== "system").length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white/40 text-sm">
                Start chatting...
              </div>
            </div>
          ) : (
            data.messages.filter((m: Message) => m.role !== "system").map((message: Message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-white text-black"
                      : "bg-white/10 text-white border border-white/20"
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-white/10 flex-shrink-0">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="bg-white text-black hover:bg-white/90 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-white" />
    </div>
  );
});

ConversationNode.displayName = "ConversationNode";
