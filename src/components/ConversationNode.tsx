import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { ConversationNode as ConversationNodeType, AIModel, Message } from "@/types/conversation";
import { getModelInfo } from "@/lib/modelConfig";
import { Button } from "@/components/ui/button";
import { MessageSquare, GitBranch, Maximize2 } from "lucide-react";
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
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      
      <div className={cn(
        "rounded-lg border-2 bg-node-background backdrop-blur-sm",
        "shadow-node transition-all duration-300 hover:shadow-glow",
        "border-node-border hover:border-primary/50"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between p-3 border-b border-node-border",
          `bg-${modelInfo.color}/10`
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              `bg-${modelInfo.color}`
            )} />
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-foreground">
                {data.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {modelInfo.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="w-3 h-3" />
            <span>{messageCount}</span>
          </div>
        </div>

        {/* Content Preview */}
        <div className="p-4 space-y-2">
          {lastMessage && (
            <div className="text-sm text-muted-foreground line-clamp-3">
              {lastMessage.content}
            </div>
          )}
          {!lastMessage && (
            <div className="text-sm text-muted-foreground italic">
              New conversation
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-3 border-t border-node-border">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => data.onExpand(data.id)}
          >
            <Maximize2 className="w-3 h-3" />
            Open
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => data.onBranch(data.id)}
          >
            <GitBranch className="w-3 h-3" />
            Branch
          </Button>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
});

ConversationNode.displayName = "ConversationNode";
