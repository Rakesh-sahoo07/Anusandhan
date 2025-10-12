import { useState, useRef, useEffect } from "react";
import { ConversationNode, Message, AIModel } from "@/types/conversation";
import { getModelInfo, AI_MODELS } from "@/lib/modelConfig";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Send, Paperclip, Download, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatPanelProps {
  node: ConversationNode | null;
  onClose: () => void;
  onUpdateNode: (nodeId: string, messages: Message[]) => void;
  onChangeModel: (nodeId: string, model: AIModel) => void;
}

export function ChatPanel({ node, onClose, onUpdateNode, onChangeModel }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // Simulate AI response (will be replaced with actual Groq API call)
    setTimeout(() => {
      const aiMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: "This is a placeholder response. Connect to Groq AI to enable real AI conversations with context preservation and model switching.",
        timestamp: Date.now()
      };
      onUpdateNode(node.id, [...updatedMessages, aiMessage]);
      setIsLoading(false);
    }, 1000);
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

  return (
    <div className="fixed inset-y-0 left-0 w-[500px] bg-card border-r border-border shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-node">
        <div className="flex items-center gap-3">
          <Select value={node.model} onValueChange={(value) => onChangeModel(node.id, value as AIModel)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", `bg-${model.color}`)} />
                    {model.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleCopy}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleExport}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {node.messages.filter(m => m.role !== "system").map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg p-3",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              <div className="text-xs opacity-50 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary text-secondary-foreground rounded-lg p-3">
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
      <div className="p-4 border-t border-border bg-gradient-node">
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="w-4 h-4" />
          </Button>
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
            className="min-h-[60px] resize-none"
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
