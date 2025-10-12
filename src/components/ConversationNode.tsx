import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { ConversationNode as ConversationNodeType, AIModel, Message } from "@/types/conversation";
import { getModelInfo } from "@/lib/modelConfig";
import { Button } from "@/components/ui/button";
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
  onBranch: (nodeId: string) => void;
  onExpand: (nodeId: string) => void;
}

export const ConversationNode = memo((props: NodeProps) => {
  const data = props.data as ConversationNodeData;
  const modelInfo = getModelInfo(data.model);
  const lastMessage = data.messages[data.messages.length - 1];
  const messageCount = data.messages.filter((m: Message) => m.role !== "system").length;

  return (
    <div className="min-w-[320px] max-w-[400px]">
      <Handle type="target" position={Position.Top} className="!bg-white" />
      
      <div 
        className={cn(
          "rounded-xl border bg-[#1a1a1a] backdrop-blur-sm cursor-pointer",
          "shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
          "border-white/10 hover:border-white/30"
        )}
        onClick={() => data.onExpand(data.id)}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-white">
                {data.title}
              </span>
              <span className="text-xs text-white/60">
                {modelInfo.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/60">
            <MessageSquare className="w-3 h-3" />
            <span>{messageCount}</span>
          </div>
        </div>

        {/* Content Preview */}
        <div className="p-4 space-y-2">
          {lastMessage && (
            <div className="text-sm text-white/70 line-clamp-3">
              {lastMessage.content}
            </div>
          )}
          {!lastMessage && (
            <div className="space-y-1">
              <div className="text-sm text-white/70">
                Click to start chatting
              </div>
              <div className="text-xs text-white/40">
                No messages yet
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-3 border-t border-white/10">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-white/20 hover:bg-white/10 hover:border-white/40 text-white"
            onClick={(e) => {
              e.stopPropagation();
              data.onBranch(data.id);
            }}
          >
            <GitBranch className="w-3 h-3" />
            Branch
          </Button>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-white" />
    </div>
  );
});

ConversationNode.displayName = "ConversationNode";
