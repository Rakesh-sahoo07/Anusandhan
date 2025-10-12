import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { ConversationNode as ConversationNodeType, AIModel, Message } from "@/types/conversation";
import { getModelInfo } from "@/lib/modelConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConversationNodeData extends Record<string, unknown> {
  id: string;
  model: AIModel;
  title: string;
  messages: Message[];
  parentId: string | null;
  position: { x: number; y: number };
  createdAt: number;
  onBranch: (nodeId: string, selectedText?: string) => void;
  onExpand: (nodeId: string) => void;
  onUpdateMessages: (nodeId: string, messages: Message[]) => void;
}

export const ConversationNode = memo((props: NodeProps) => {
  const data = props.data as ConversationNodeData;
  const modelInfo = getModelInfo(data.model);
  const messageCount = data.messages.filter((m: Message) => m.role !== "system").length;
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [showForkButton, setShowForkButton] = useState(false);
  const [forkPosition, setForkPosition] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data.messages]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0) {
      setSelectedText(text);
      setShowForkButton(true);
      
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) {
        setForkPosition({ x: rect.right, y: rect.bottom });
      }
    } else {
      setShowForkButton(false);
      setSelectedText("");
    }
  };

  const handleFork = () => {
    if (selectedText) {
      data.onBranch(data.id, selectedText);
      setShowForkButton(false);
      setSelectedText("");
      window.getSelection()?.removeAllRanges();
    }
  };

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
    <div className="min-w-[380px] max-w-[420px] relative" onClick={(e) => e.stopPropagation()}>
      <Handle type="target" position={Position.Top} className="!bg-white" />
      
      {/* Fork Button */}
      {showForkButton && (
        <div 
          className="fixed z-50 animate-in fade-in duration-200"
          style={{ 
            left: `${forkPosition.x + 10}px`, 
            top: `${forkPosition.y + 10}px` 
          }}
        >
          <Button
            size="sm"
            onClick={handleFork}
            className="bg-white text-black hover:bg-white/90 gap-1 shadow-lg"
          >
            <GitBranch className="w-3 h-3" />
            Fork
          </Button>
        </div>
      )}
      
      <div 
        className={cn(
          "rounded-xl border bg-[#1a1a1a] backdrop-blur-sm",
          "shadow-lg border-white/10 flex flex-col h-[500px]"
        )}
      >
        {/* Header - Drag Handle */}
        <div className="drag-handle flex items-center justify-between p-3 border-b border-white/10 bg-white/5 flex-shrink-0 cursor-move">
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
                data.onBranch(data.id, "");
              }}
            >
              <GitBranch className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {data.messages.filter((m: Message) => m.role !== "system").length === 0 ? (
            <div className="flex flex-col h-full">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Ask a question..."
                className="bg-transparent border-none text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-base h-auto"
                disabled={isLoading}
              />
            </div>
          ) : (
            <>
              {data.messages.filter((m: Message) => m.role !== "system").map((message: Message, index: number) => {
                const filteredMessages = data.messages.filter((m: Message) => m.role !== "system");
                const isLastMessage = index === filteredMessages.length - 1;
                
                return (
                  <div key={message.id} className="space-y-3">
                    {message.role === "user" ? (
                      <>
                        <div className="font-semibold text-white text-base">
                          {message.content}
                        </div>
                        <div className="h-px bg-white/10 w-full" />
                      </>
                    ) : (
                      <div 
                        className="text-white/80 text-sm whitespace-pre-wrap break-words leading-relaxed select-text cursor-text"
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={handleTextSelection}
                      >
                        {message.content}
                      </div>
                    )}
                    
                    {/* Show input after AI response */}
                    {message.role === "assistant" && isLastMessage && !isLoading && (
                      <div className="pt-2">
                        <Input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSend(e);
                            }
                          }}
                          placeholder="Ask a question..."
                          className="bg-transparent border-none text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-base h-auto"
                          disabled={isLoading}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex gap-1 py-2">
                  <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-white" />
    </div>
  );
});

ConversationNode.displayName = "ConversationNode";
