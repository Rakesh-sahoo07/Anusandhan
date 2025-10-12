import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { ConversationNode as ConversationNodeType, AIModel, Message } from "@/types/conversation";
import { getModelInfo } from "@/lib/modelConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ConversationNodeData extends Record<string, unknown> {
  id: string;
  model: AIModel;
  title: string;
  messages: Message[];
  parentId: string | null;
  position: { x: number; y: number };
  createdAt: number;
  initialInput?: string;
  onBranch: (nodeId: string, selectedText?: string) => void;
  onExpand: (nodeId: string) => void;
  onUpdateMessages: (nodeId: string, messages: Message[]) => void;
}

export const ConversationNode = memo((props: NodeProps) => {
  const data = props.data as ConversationNodeData;
  const modelInfo = getModelInfo(data.model);
  const messageCount = data.messages.filter((m: Message) => m.role !== "system").length;
  const [input, setInput] = useState(data.initialInput || "");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [showForkButton, setShowForkButton] = useState(false);
  const [forkPosition, setForkPosition] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    toast.info(`Node ${data.id.substring(5, 9)} has ${data.messages.length} messages`);
  }, [data.messages, data.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data.messages]);

  useEffect(() => {
    if (!isLoading && data.messages.length > 0) {
      inputRef.current?.focus();
    }
  }, [isLoading, data.messages.length]);

  const handleTextSelection = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0) {
      setSelectedText(text);
      setShowForkButton(true);
      
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) {
        // Position at center top of selection
        setForkPosition({ 
          x: rect.left + (rect.width / 2), 
          y: rect.top 
        });
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
      
      setTimeout(() => {
        window.getSelection()?.removeAllRanges();
      }, 100);
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
    <div className="min-w-[380px] max-w-[420px] relative pointer-events-auto" onClick={(e) => e.stopPropagation()}>
      <Handle type="target" position={Position.Top} className="!bg-white" />
      
      {/* Fork Button */}
      {showForkButton && (
        <div 
          className="fixed z-[9999] animate-in fade-in duration-200"
          style={{ 
            left: `${forkPosition.x}px`, 
            top: `${forkPosition.y}px`,
            transform: 'translate(-50%, calc(-100% - 8px))',
            pointerEvents: 'auto'
          }}
        >
          <Button
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFork();
            }}
            className="bg-white text-black hover:bg-white/90 gap-1 shadow-lg pointer-events-auto"
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
        <div className="nodrag flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {data.messages.filter((m: Message) => m.role !== "system").length === 0 ? (
            <div className="flex flex-col h-full">
              <Input
                ref={inputRef}
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
                autoFocus
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
                        className="text-white/80 text-sm whitespace-pre-wrap break-words leading-relaxed select-text cursor-text [&::selection]:bg-yellow-400/30 [&::selection]:text-white"
                        onMouseUp={handleTextSelection}
                      >
                        {message.content}
                      </div>
                    )}
                    
                    {/* Show input after last message (user or assistant) */}
                    {isLastMessage && !isLoading && (
                      <div className="pt-2">
                        <Input
                          ref={inputRef}
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
                          autoFocus
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
