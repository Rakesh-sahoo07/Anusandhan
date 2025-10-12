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
    // Initialize with first node centered on canvas
    if (nodes.length === 0) {
      createNewNode(null, { x: 400, y: 250 }, []);
    }
  }, []);

  const createNewNode = useCallback((parentId: string | null, position: { x: number; y: number }, initialMessages?: Message[], initialInput?: string) => {
    const nodeId = `node-${Date.now()}`;
    
    setConversationData((prev) => {
      const nodeCount = prev.size + 1;
      
      const newConversationNode: ConversationNodeType = {
        id: nodeId,
        model: "llama-3-8b",
        title: `untitled${nodeCount}`,
        messages: initialMessages || [],
        parentId,
        position,
        createdAt: Date.now(),
      };

    const nodeData: ConversationNodeData = {
      ...newConversationNode,
      initialInput,
      onBranch: (id: string, selectedText?: string) => {
        handleBranch(id, selectedText);
      },
      onExpand: (id: string) => handleExpand(id),
      onUpdateMessages: (id: string, msgs: Message[]) => {
        setConversationData((prev) => {
          const node = prev.get(id);
          if (!node) return prev;
          const updated = { ...node, messages: msgs };
          const newMap = new Map(prev);
          newMap.set(id, updated);
          
          // Force complete node data refresh with new object reference
          setNodes((nds) =>
            nds.map((n) =>
              n.id === id
                ? {
                    ...n,
                    data: {
                      id,
                      model: updated.model,
                      title: updated.title,
                      messages: [...msgs], // New array reference
                      parentId: updated.parentId,
                      position: updated.position,
                      createdAt: updated.createdAt,
                      initialInput: undefined,
                      onBranch: (nodeId: string, selectedText?: string) => {
                        handleBranch(nodeId, selectedText);
                      },
                      onExpand: (nodeId: string) => handleExpand(nodeId),
                      onUpdateMessages: n.data.onUpdateMessages,
                    },
                  }
                : n
            )
          );
          
          return newMap;
        });
      },
    };

      const newNode: Node = {
        id: nodeId,
        type: "conversation",
        position,
        data: nodeData,
        dragHandle: ".drag-handle",
      };

      setNodes((nds) => [...nds, newNode]);

      if (parentId) {
        const newEdge: Edge = {
          id: `edge-${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          animated: true,
          style: { stroke: "#ffffff", strokeWidth: 2 },
        };
        setEdges((eds) => [...eds, newEdge]);
      }
      
      return new Map(prev).set(nodeId, newConversationNode);
    });

    return nodeId;
  }, [setNodes, setEdges]);

  const handleBranch = useCallback((nodeId: string, selectedText?: string) => {
    setConversationData((prev) => {
      const parentNode = prev.get(nodeId);
      if (!parentNode) {
        toast.error(`Parent node not found: ${nodeId}`);
        return prev;
      }

      const position = {
        x: parentNode.position.x + 450,
        y: parentNode.position.y + (Math.random() - 0.5) * 200,
      };

      let initialMessages: Message[] = [];
      
      if (!selectedText) {
        initialMessages = [...parentNode.messages];
      }

      createNewNode(nodeId, position, initialMessages, selectedText);
      toast.success(selectedText ? "Forked with selected text" : "Created new branch");
      
      return prev;
    });
  }, [createNewNode]);

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
                ...node.data,
                ...updatedNode,
                initialInput: undefined, // Clear initialInput after messages are added
                onBranch: node.data.onBranch,
                onExpand: node.data.onExpand,
                onUpdateMessages: node.data.onUpdateMessages,
              },
            }
          : node
      )
    );
  }, [setNodes]);

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

  const handleUpdateTitle = useCallback((nodeId: string, title: string) => {
    setConversationData((prev) => {
      const node = prev.get(nodeId);
      if (!node) return prev;
      const updated = { ...node, title };
      const newMap = new Map(prev);
      newMap.set(nodeId, updated);
      updateNodeData(nodeId, updated);
      return newMap;
    });
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
    <div className="h-screen w-screen bg-black">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button
          onClick={() => createNewNode(null, { x: Math.random() * 400, y: Math.random() * 400 }, [])}
          className="gap-2 bg-white text-black hover:bg-white/90"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </Button>
        <Button variant="outline" onClick={handleExportAll} className="gap-2 border-white/20 text-white hover:bg-white/10">
          <Download className="w-4 h-4" />
          Export
        </Button>
        <Button variant="outline" onClick={handleImport} className="gap-2 border-white/20 text-white hover:bg-white/10">
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
        className="bg-black"
      >
        <Background color="#333333" gap={20} size={1} />
        <Controls className="bg-[#1a1a1a] border-white/10" />
        <MiniMap
          className="bg-[#1a1a1a] border-white/10"
          nodeColor={() => "#ffffff"}
          maskColor="rgba(0, 0, 0, 0.6)"
        />
      </ReactFlow>

      {/* Chat Panel */}
      <ChatPanel
        node={activeNode}
        onClose={() => setActiveNode(null)}
        onUpdateNode={handleUpdateNode}
        onChangeModel={handleChangeModel}
        onUpdateTitle={handleUpdateTitle}
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
