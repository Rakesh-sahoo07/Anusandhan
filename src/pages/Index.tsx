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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Plus, Download, Upload, Save, ShoppingBag, BarChart3, FolderOpen, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { SaveProjectDialog } from "@/components/SaveProjectDialog";
import { WalletButton } from "@/components/WalletButton";
import { useWeb3 } from "@/contexts/Web3Context";
import { useNavigate, useLocation } from "react-router-dom";
import { PresenceIndicator } from "@/components/PresenceIndicator";
import { LoadProjectDialog } from "@/components/LoadProjectDialog";
import { loadProjectFromIPFS } from "@/utils/projectLoader";
import { SerializedProject } from "@/utils/projectSerializer";
import { cn } from "@/lib/utils";

const nodeTypes = {
  conversation: ConversationNode,
};

function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [conversationData, setConversationData] = useState<Map<string, ConversationNodeType>>(new Map());
  const [activeNode, setActiveNode] = useState<ConversationNodeType | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [derivedFromProjectId, setDerivedFromProjectId] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const { walletAddress } = useWeb3();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if we're loading a project from navigation state
    if (location.state?.projectData) {
      loadProjectData(
        location.state.projectData,
        location.state.projectId,
        location.state.derivedFromProjectId
      );
      // Clear the state after loading
      navigate(location.pathname, { replace: true, state: {} });
    } else if (nodes.length === 0) {
      // Initialize with first node centered on canvas
      createNewNode(null, { x: 400, y: 250 }, []);
    }
  }, [location.state]);

  // Update isActive state for all nodes when activeNode changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isActive: node.id === activeNode?.id,
        },
      }))
    );
  }, [activeNode?.id, setNodes]);

  const handleUpdateMessages = useCallback((id: string, msgs: Message[]) => {
    setConversationData((prev) => {
      const node = prev.get(id);
      if (!node) {
        return prev;
      }
      const updated = { ...node, messages: msgs };
      const newMap = new Map(prev);
      newMap.set(id, updated);
      
      // Update React Flow node data
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  messages: [...msgs],
                  initialInput: undefined,
                },
              }
            : n
        )
      );
      
      return newMap;
    });
  }, [setNodes]);

  const createNewNode = useCallback((parentId: string | null, position: { x: number; y: number }, initialMessages?: Message[], initialInput?: string) => {
    const nodeId = `node-${Date.now()}`;
    
    setConversationData((prev) => {
      const nodeCount = prev.size + 1;
      
      const newConversationNode: ConversationNodeType = {
        id: nodeId,
        model: "llama-3.3-70b-versatile",
        title: `untitled${nodeCount}`,
        messages: initialMessages || [],
        parentId,
        position,
        createdAt: Date.now(),
      };
      
      const newMap = new Map(prev).set(nodeId, newConversationNode);
      
      // Add to React Flow nodes after conversationData is updated
      setNodes((nds) => {
        const nodeData: ConversationNodeData = {
          id: nodeId,
          model: "llama-3.3-70b-versatile",
          title: `untitled${nodeCount}`,
          messages: initialMessages || [],
          parentId,
          position,
          createdAt: Date.now(),
          initialInput,
          isActive: false,
          onBranch: (id: string, selectedText?: string) => {
            setConversationData((prevData) => {
              const parentNode = prevData.get(id);
              if (!parentNode) {
                toast.error(`Parent node not found: ${id}`);
                return prevData;
              }

              const newPosition = {
                x: parentNode.position.x + 450,
                y: parentNode.position.y + (Math.random() - 0.5) * 200,
              };

              const newMessages = selectedText ? [] : [...parentNode.messages];
              
              // Schedule createNewNode to run after this state update completes
              setTimeout(() => {
                createNewNode(id, newPosition, newMessages, selectedText);
                toast.success(selectedText ? "Forked with selected text" : "Created new branch");
              }, 0);
              
              return prevData;
            });
          },
          onExpand: (id: string) => {
            setConversationData((prevData) => {
              const node = prevData.get(id);
              if (node) {
                setActiveNode(node);
              }
              return prevData;
            });
          },
          onUpdateMessages: handleUpdateMessages,
          onChangeModel: handleChangeModel,
          onUpdateTitle: handleUpdateTitle,
          onInputFocus: (focused: boolean) => setIsInputFocused(focused),
        };

        const newNode: Node = {
          id: nodeId,
          type: "conversation",
          position,
          data: nodeData,
          dragHandle: ".drag-handle",
        };

        return [...nds, newNode];
      });

      // Add edge if there's a parent
      if (parentId) {
        setEdges((eds) => {
          const newEdge: Edge = {
            id: `edge-${parentId}-${nodeId}`,
            source: parentId,
            target: nodeId,
            animated: true,
            style: { stroke: "#ffffff", strokeWidth: 2 },
          };
          return [...eds, newEdge];
        });
      }
      
      return newMap;
    });

    return nodeId;
  }, [setNodes, setEdges, handleUpdateMessages]);



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
                onUpdateTitle: node.data.onUpdateTitle,
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

  const loadProjectData = useCallback((
    projectData: SerializedProject,
    projectId?: string,
    derivedFrom?: string
  ) => {
    try {
      // Clear existing data
      setNodes([]);
      setEdges([]);
      setConversationData(new Map());
      setActiveNode(null);

      // Set project metadata
      if (projectId) setCurrentProjectId(projectId);
      if (derivedFrom) setDerivedFromProjectId(derivedFrom);

      // Load nodes
      const nodeMap = new Map<string, ConversationNodeType>();
      projectData.nodes.forEach((node) => {
        nodeMap.set(node.id, node);
      });
      setConversationData(nodeMap);

      // Create React Flow nodes
      const flowNodes: Node[] = projectData.nodes.map((node) => {
        const nodeData: ConversationNodeData = {
          ...node,
          isActive: false,
          onBranch: (id: string, selectedText?: string) => {
            setConversationData((prevData) => {
              const parentNode = prevData.get(id);
              if (!parentNode) {
                toast.error(`Parent node not found: ${id}`);
                return prevData;
              }

              const newPosition = {
                x: parentNode.position.x + 450,
                y: parentNode.position.y + (Math.random() - 0.5) * 200,
              };

              const newMessages = selectedText ? [] : [...parentNode.messages];
              
              setTimeout(() => {
                createNewNode(id, newPosition, newMessages, selectedText);
                toast.success(selectedText ? "Forked with selected text" : "Created new branch");
              }, 0);
              
              return prevData;
            });
          },
          onExpand: (id: string) => {
            setConversationData((prevData) => {
              const node = prevData.get(id);
              if (node) {
                setActiveNode(node);
              }
              return prevData;
            });
          },
          onUpdateMessages: handleUpdateMessages,
          onChangeModel: handleChangeModel,
          onUpdateTitle: handleUpdateTitle,
          onInputFocus: (focused: boolean) => setIsInputFocused(focused),
        };

        return {
          id: node.id,
          type: "conversation",
          position: node.position,
          data: nodeData,
          dragHandle: ".drag-handle",
        };
      });

      setNodes(flowNodes);
      setEdges(projectData.edges);

      toast.success("Project loaded successfully");
    } catch (error) {
      console.error("Error loading project data:", error);
      toast.error("Failed to load project");
    }
  }, [setNodes, setEdges, handleUpdateMessages, handleChangeModel, handleUpdateTitle]);

  const handleLoadProjectFromDialog = useCallback(async (projectId: string, lighthouseCid: string) => {
    try {
      const projectData = await loadProjectFromIPFS(lighthouseCid);
      loadProjectData(projectData, projectId);
    } catch (error) {
      console.error("Error loading project:", error);
      toast.error("Failed to load project");
    }
  }, [loadProjectData]);

  const serializeConversationGraph = () => {
    return {
      nodes: Array.from(conversationData.values()),
      edges: edges,
      activeNodeId: activeNode?.id || null,
      exportedAt: new Date().toISOString()
    };
  };

  const handleExportAll = () => {
    const exportData = serializeConversationGraph();
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
      {/* Derived Project Banner */}
      {derivedFromProjectId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-full px-4">
          <div className="bg-blue-500/10 backdrop-blur-xl border border-blue-500/20 rounded-lg p-3 flex items-center gap-3">
            <div className="bg-blue-500/20 rounded-full p-2">
              <GitBranch className="h-4 w-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white font-medium">Purchased NFT Project</p>
              <p className="text-xs text-white/60">This is your copy. You can freely edit and mint it as your own.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/marketplace?highlight=${derivedFromProjectId}`)}
              className="text-blue-400 hover:text-blue-300 text-xs"
            >
              View Original
            </Button>
          </div>
        </div>
      )}
      
      {/* Top Right - Wallet & Presence */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <PresenceIndicator />
        <WalletButton />
      </div>
      
      {/* Bottom Centered Toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <TooltipProvider>
          <div className="flex gap-2 items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-2">
            <Tooltip delayDuration={1000}>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => createNewNode(null, { x: Math.random() * 400, y: Math.random() * 400 }, [])}
                  size="icon"
                  className="bg-white text-black hover:bg-white/90"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>New Conversation</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={1000}>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleExportAll}
                  className="text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Export</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={1000}>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleImport}
                  className="text-white hover:bg-white/10"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Import</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={1000}>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setLoadDialogOpen(true)}
                  className="text-white hover:bg-white/10"
                  disabled={!walletAddress}
                >
                  <FolderOpen className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{walletAddress ? "Load Project" : "Connect wallet to load projects"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={1000}>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSaveDialogOpen(true)}
                  className="text-white hover:bg-white/10"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Save as Project</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={1000}>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate("/marketplace")}
                  className="text-white hover:bg-white/10"
                >
                  <ShoppingBag className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Marketplace</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={1000}>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate("/analytics")}
                  className="text-white hover:bg-white/10"
                >
                  <BarChart3 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Analytics</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* React Flow Canvas */}
      <div className={cn("h-screen w-full transition-all duration-300")}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-black"
          zoomOnScroll={!isInputFocused}
          panOnScroll={false}
          zoomOnPinch={true}
          zoomOnDoubleClick={true}
        >
          <Background color="#333333" gap={20} size={1} />
          <Controls 
            position="bottom-right"
            className="!bg-transparent border-none [&_button]:!bg-white/10 [&_button]:!border-white/20 [&_button]:hover:!bg-white/20 [&_button_svg]:!fill-white [&_button]:!text-white"
            showZoom={true}
            showFitView={true}
            showInteractive={true}
          />
        </ReactFlow>
      </div>

      {/* Chat Panel */}
      <ChatPanel
        node={activeNode}
        onClose={() => setActiveNode(null)}
        onUpdateNode={handleUpdateNode}
        onChangeModel={handleChangeModel}
        onUpdateTitle={handleUpdateTitle}
        onInputFocus={setIsInputFocused}
      />

      {/* Save Project Dialog */}
      <SaveProjectDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        conversationGraph={serializeConversationGraph()}
        walletAddress={walletAddress}
        currentProjectId={currentProjectId}
        derivedFromProjectId={derivedFromProjectId}
      />

      {/* Load Project Dialog */}
      {walletAddress && (
        <LoadProjectDialog
          open={loadDialogOpen}
          onOpenChange={setLoadDialogOpen}
          walletAddress={walletAddress}
          onLoadProject={handleLoadProjectFromDialog}
        />
      )}
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
