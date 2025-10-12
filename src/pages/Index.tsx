import { useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ConversationNode, ConversationNodeData } from "@/components/ConversationNode";
import { ChatPanel } from "@/components/ChatPanel";
import { ConversationNode as ConversationNodeType, ConversationGraph, Message, AIModel } from "@/types/conversation";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";
import { toast } from "sonner";

const nodeTypes = {
  conversation: ConversationNode,
};

function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [conversationData, setConversationData] = useState<Map<string, ConversationNodeType>>(new Map());
  const [activeNode, setActiveNode] = useState<ConversationNodeType | null>(null);

  useEffect(() => {
    // Initialize with first node
    if (nodes.length === 0) {
      createNewNode(null, { x: 250, y: 100 });
    }
  }, []);

  const createNewNode = useCallback((parentId: string | null, position: { x: number; y: number }) => {
    const nodeId = `node-${Date.now()}`;
    const newConversationNode: ConversationNodeType = {
      id: nodeId,
      model: "llama-3-8b",
      messages: [],
      parentId,
      position,
      createdAt: Date.now(),
    };

    const nodeData: ConversationNodeData = {
      ...newConversationNode,
      onBranch: handleBranch,
      onExpand: handleExpand,
    };

    const newNode: Node = {
      id: nodeId,
      type: "conversation",
      position,
      data: nodeData,
    };

    setConversationData((prev) => new Map(prev).set(nodeId, newConversationNode));
    setNodes((nds) => [...nds, newNode]);

    if (parentId) {
      const newEdge: Edge = {
        id: `edge-${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        animated: true,
        style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
      };
      setEdges((eds) => [...eds, newEdge]);
    }

    return nodeId;
  }, [setNodes, setEdges]);

  const handleBranch = useCallback((nodeId: string) => {
    const parentNode = conversationData.get(nodeId);
    if (!parentNode) return;

    const position = {
      x: parentNode.position.x + 450,
      y: parentNode.position.y + (Math.random() - 0.5) * 200,
    };

    const newNodeId = createNewNode(nodeId, position);
    
    // Copy parent messages to new node
    const newConversationNode = conversationData.get(newNodeId);
    if (newConversationNode) {
      newConversationNode.messages = [...parentNode.messages];
      setConversationData((prev) => new Map(prev).set(newNodeId, newConversationNode));
      updateNodeData(newNodeId, newConversationNode);
    }

    toast.success("Created new branch");
  }, [conversationData, createNewNode]);

  const handleExpand = useCallback((nodeId: string) => {
    const node = conversationData.get(nodeId);
    if (node) {
      setActiveNode(node);
    }
  }, [conversationData]);

  const updateNodeData = useCallback((nodeId: string, updatedNode: ConversationNodeType) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...updatedNode,
                onBranch: handleBranch,
                onExpand: handleExpand,
              },
            }
          : node
      )
    );
  }, [setNodes, handleBranch, handleExpand]);

  const handleUpdateNode = useCallback((nodeId: string, messages: Message[]) => {
    setConversationData((prev) => {
      const node = prev.get(nodeId);
      if (!node) return prev;
      const updated = { ...node, messages };
      const newMap = new Map(prev);
      newMap.set(nodeId, updated);
      updateNodeData(nodeId, updated);
      return newMap;
    });
  }, [updateNodeData]);

  const handleChangeModel = useCallback((nodeId: string, model: AIModel) => {
    setConversationData((prev) => {
      const node = prev.get(nodeId);
      if (!node) return prev;
      const updated = { ...node, model };
      const newMap = new Map(prev);
      newMap.set(nodeId, updated);
      updateNodeData(nodeId, updated);
      return newMap;
    });
    toast.success(`Switched to ${model}`);
  }, [updateNodeData]);

  const handleExportAll = () => {
    const exportData: ConversationGraph = {
      nodes: Array.from(conversationData.values()),
      activeNodeId: activeNode?.id || null,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-graph-${Date.now()}.json`;
    a.click();
    toast.success("Graph exported");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data: ConversationGraph = JSON.parse(event.target?.result as string);
          // Import logic here
          toast.success("Graph imported");
        } catch (error) {
          toast.error("Failed to import graph");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="h-screen w-screen bg-canvas-background">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button
          onClick={() => createNewNode(null, { x: Math.random() * 400, y: Math.random() * 400 })}
          className="gap-2 shadow-glow"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </Button>
        <Button variant="outline" onClick={handleExportAll} className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
        <Button variant="outline" onClick={handleImport} className="gap-2">
          <Upload className="w-4 h-4" />
          Import
        </Button>
      </div>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-canvas-background"
      >
        <Background color="hsl(var(--canvas-grid))" gap={20} size={1} />
        <Controls className="bg-card border-border" />
        <MiniMap
          className="bg-card border-border"
          nodeColor={(node) => "hsl(var(--primary))"}
        />
      </ReactFlow>

      {/* Chat Panel */}
      <ChatPanel
        node={activeNode}
        onClose={() => setActiveNode(null)}
        onUpdateNode={handleUpdateNode}
        onChangeModel={handleChangeModel}
      />
    </div>
  );
}

const Index = () => {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
};

export default Index;
