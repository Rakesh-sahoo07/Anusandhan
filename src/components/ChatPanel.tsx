import { useState, useRef, useEffect } from "react";
import { ConversationNode, Message, AIModel } from "@/types/conversation";
import { getModelInfo, AI_MODELS } from "@/lib/modelConfig";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { X, Download, Copy, GripVertical, Trash2, Pencil, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatPanelProps {
  node: ConversationNode | null;
  onClose: () => void;
  onUpdateNode: (nodeId: string, messages: Message[]) => void;
  onChangeModel: (nodeId: string, model: AIModel) => void;
  onUpdateTitle?: (nodeId: string, title: string) => void;
}

export function ChatPanel({ node, onClose, onUpdateNode, onChangeModel, onUpdateTitle }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (node) {
      setTitle(node.title || "untitled");
    }
  }, [node?.id]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [node?.messages]);

  if (!node) return null;

  const modelInfo = getModelInfo(node.model);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: Date.now()
    };

    const updatedMessages = [...node.messages, userMessage];
    onUpdateNode(node.id, updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/groq-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          model: node.model
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response from Groq');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                assistantContent += content;
                const aiMessage: Message = {
                  id: `msg-${Date.now()}`,
                  role: "assistant",
                  content: assistantContent,
                  timestamp: Date.now()
                };
                onUpdateNode(node.id, [...updatedMessages, aiMessage]);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error calling Groq:', error);
      toast.error('Failed to get AI response');
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = {
      node: node,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${node.id}.json`;
    a.click();
    toast.success("Conversation exported");
  };

  const handleCopy = () => {
    const text = node.messages
      .filter(m => m.role !== "system")
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Conversation copied to clipboard");
  };

  const handleTitleSave = () => {
    if (node && title.trim() && onUpdateTitle) {
      onUpdateTitle(node.id, title.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      setTitle(node?.title || "untitled");
      setIsEditingTitle(false);
    }
  };

  return (
    <div className="fixed inset-y-0 left-0 w-[600px] bg-[#1a1a1a] border-r border-white/10 shadow-2xl flex flex-col z-50 rounded-r-2xl">
      {/* Header - Draggable */}
      <div className="group flex items-center justify-between p-4 border-b border-white/10 cursor-move hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3 flex-1">
          <div className="opacity-0 group-hover:opacity-40 transition-opacity">
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>
          
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="bg-transparent border-none outline-none text-lg font-medium text-foreground px-2 -mx-2 rounded focus:bg-white/5"
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="text-lg font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2 group/title"
            >
              {title}
              <Pencil className="w-3 h-3 opacity-0 group-hover/title:opacity-50 transition-opacity" />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/10" onClick={handleExport}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/10" onClick={handleCopy}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/10" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/10 text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {node.messages.filter(m => m.role !== "system").length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">Start a conversation</p>
              <p className="text-sm opacity-60">Ask a question to begin...</p>
            </div>
          </div>
        ) : (
          node.messages.filter(m => m.role !== "system").map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-secondary-foreground border border-white/10"
                )}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                <div className="text-xs opacity-50 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary/50 border border-white/10 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="bg-[#2a2a2a] rounded-2xl border border-white/10 overflow-hidden">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask a question..."
            className="min-h-[100px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base px-4 py-3"
          />
          <div className="flex items-center justify-between px-4 pb-3 pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 px-3 text-sm hover:bg-white/10 gap-2">
                  {getModelInfo(node.model).name}
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[240px]">
                {AI_MODELS.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    onClick={() => onChangeModel(node.id, model.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={cn("w-2 h-2 rounded-full", `bg-${model.color}`)} />
                      <div className="flex-1">
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-muted-foreground">{model.description}</div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading}
              size="sm"
              className="h-8 px-4"
            >
              Ask
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
