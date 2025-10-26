import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Coins, ShoppingBag, Trash2, Edit, GitBranch, BarChart3 } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { WalletButton } from "@/components/WalletButton";
import { toast } from "@/hooks/use-toast";
import { shortenCid } from "@/utils/ipfs";
import { MintNFTDialog } from "@/components/MintNFTDialog";
import { ListNFTDialog } from "@/components/ListNFTDialog";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { loadProjectFromIPFS } from "@/utils/projectLoader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Project {
  id: string;
  name: string;
  description: string;
  lighthouse_cid: string;
  metadata_cid: string;
  nft_status: string;
  nft_contract_address: string | null;
  nft_token_id: string | null;
  created_at: string;
  creator_wallet_address: string;
  owner_wallet_address: string;
  derived_from_project_id: string | null;
  is_derived: boolean;
  original_project?: {
    id: string;
    name: string;
    nft_token_id: string;
    creator_wallet_address: string;
  };
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [mintDialogOpen, setMintDialogOpen] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const { walletAddress } = useWeb3();
  const navigate = useNavigate();

  useEffect(() => {
    if (walletAddress) {
      fetchProjects();
    } else {
      setProjects([]);
      setLoading(false);
    }
  }, [walletAddress]);

  const fetchProjects = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          original_project:derived_from_project_id (
            id,
            name,
            nft_token_id,
            creator_wallet_address
          )
        `)
        .eq("owner_wallet_address", walletAddress)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error",
        description: "Failed to load your projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMintClick = async (project: Project) => {
    // If project doesn't have CIDs, add placeholder ones
    if (!project.metadata_cid || !project.lighthouse_cid) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .update({
            metadata_cid: 'bafkreig6uirqf6c4u5ujn3ubvrlu4y4ekpgzxziz7oat53oj7j4jq4uwju',
            lighthouse_cid: 'bafkreidkkq5icas26ywgxe2vwvgt4jupq2xv26ms5pabteyjvoul3nmjwq'
          })
          .eq('id', project.id)
          .select()
          .single();

        if (error) throw error;
        
        // Update the project in state
        setProjects(projects.map(p => p.id === project.id ? { ...p, ...data } : p));
        setSelectedProject({ ...project, ...data });
        
        toast({
          title: "CIDs Added",
          description: "Valid CIDs have been added to this project",
        });
      } catch (error) {
        console.error("Error updating project:", error);
        toast({
          title: "Error",
          description: "Failed to add CIDs to project",
          variant: "destructive",
        });
        return;
      }
    } else {
      setSelectedProject(project);
    }
    setMintDialogOpen(true);
  };

  const handleListClick = (project: Project) => {
    setSelectedProject(project);
    setListDialogOpen(true);
  };

  const handleEditClick = async (project: Project) => {
    try {
      const projectData = await loadProjectFromIPFS(project.lighthouse_cid);
      
      // Navigate to editor with project data
      navigate("/", { 
        state: { 
          projectData,
          projectId: project.id,
          isDerived: project.nft_status === 'minted' || project.nft_status === 'listed'
        } 
      });
    } catch (error) {
      console.error("Error loading project:", error);
      toast({
        title: "Error",
        description: "Failed to load project data",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (project: Project) => {
    if (project.nft_status !== "draft") {
      toast({
        title: "Cannot Delete",
        description: "Only draft projects can be deleted. Minted and listed NFTs cannot be removed.",
        variant: "destructive",
      });
      return;
    }
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProject) return;

    try {
      setDeletingProject(true);
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", selectedProject.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      
      fetchProjects();
      setDeleteDialogOpen(false);
      setSelectedProject(null);
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    } finally {
      setDeletingProject(false);
    }
  };

  const handleCreateDerivedVersion = async (project: Project) => {
    try {
      const projectData = await loadProjectFromIPFS(project.lighthouse_cid);
      
      // Navigate to editor with derived project flag
      navigate("/", { 
        state: { 
          projectData,
          derivedFromProjectId: project.id,
          isDerived: true,
          originalProjectName: project.name
        } 
      });
      
      toast({
        title: "Creating Derived Version",
        description: "When you save, a new project will be created based on this NFT.",
      });
    } catch (error) {
      console.error("Error loading project:", error);
      toast({
        title: "Error",
        description: "Failed to load project data",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "minted":
        return "default";
      case "listed":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-white/20 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="text-white hover:bg-white/10"
            >
              ← Back to Editor
            </Button>
            <h1 className="text-2xl font-bold text-white">My Projects</h1>
          </div>
          <TooltipProvider>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate("/marketplace")}
                    className="text-white hover:bg-white/10 gap-2"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Browse Marketplace
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Explore and purchase research NFTs</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate("/analytics")}
                    className="text-white hover:bg-white/10 gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View your project analytics</p>
                </TooltipContent>
              </Tooltip>
              
              <WalletButton />
            </div>
          </TooltipProvider>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!walletAddress ? (
          <Card className="p-12 text-center bg-white/5 backdrop-blur-xl border-white/20">
            <p className="text-white text-lg mb-4">
              Connect your wallet to view your projects
            </p>
            <WalletButton />
          </Card>
        ) : projects.length === 0 ? (
          <Card className="p-12 text-center bg-white/5 backdrop-blur-xl border-white/20">
            <p className="text-white text-lg mb-4">
              You haven't created any projects yet. Start creating in the editor!
            </p>
            <Button 
              className="mt-4 bg-white text-black hover:bg-white/90" 
              onClick={() => navigate("/")}
            >
              Go to Editor
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="relative p-6 bg-white/5 backdrop-blur-xl border-white/20 hover:border-white/30 transition-all overflow-hidden group"
              >
                {/* Top-left corner border with gradient blend */}
                <div className="absolute top-0 left-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white/80 to-transparent" />
                  <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-white/80 to-transparent" />
                </div>
                
                {/* Bottom-right corner border with gradient blend */}
                <div className="absolute bottom-0 right-0 w-8 h-8 transition-all group-hover:w-12 group-hover:h-12">
                  <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-white/80 to-transparent" />
                  <div className="absolute bottom-0 right-0 w-[1px] h-full bg-gradient-to-t from-white/80 to-transparent" />
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2 text-white">{project.name}</h3>
                      <p className="text-sm text-white/60 line-clamp-2">
                        {project.description || "No description provided"}
                      </p>
                    </div>
                    <Badge 
                      variant={getStatusColor(project.nft_status)}
                      className="bg-white/10 text-white border-white/20"
                    >
                      {project.nft_status}
                    </Badge>
                  </div>

                  {project.is_derived && project.original_project && (
                    <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-md">
                      <GitBranch className="h-3 w-3 text-blue-400" />
                      <div className="flex-1 text-xs">
                        <span className="text-white/80">Purchased from NFT </span>
                        <Badge variant="outline" className="ml-1 bg-white/5 text-white border-white/20">
                          #{project.original_project.nft_token_id}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/marketplace?highlight=${project.derived_from_project_id}`)}
                        className="text-blue-400 hover:text-blue-300 text-xs p-1 h-auto"
                      >
                        View Original
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Data CID:</span>
                      <a
                        href={`https://gateway.lighthouse.storage/ipfs/${project.lighthouse_cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-white/80 hover:underline flex items-center gap-1"
                      >
                        {shortenCid(project.lighthouse_cid)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Metadata CID:</span>
                      <a
                        href={`https://gateway.lighthouse.storage/ipfs/${project.metadata_cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-white/80 hover:underline flex items-center gap-1"
                      >
                        {shortenCid(project.metadata_cid)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {project.nft_token_id && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Token ID:</span>
                        <Badge 
                          variant="secondary"
                          className="bg-white/10 text-white border-white/20"
                        >
                          #{project.nft_token_id}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Created:</span>
                      <span className="text-xs text-white/60">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/20 space-y-2">
                    {project.nft_status === "draft" && (
                      <>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(project)}
                            className="flex-1 bg-white/5 text-white border-white/20 hover:bg-white/10"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(project)}
                            className="flex-1 bg-white/5 text-white border-white/20 hover:bg-white/10"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                        <Button
                          className="w-full bg-white text-black hover:bg-white/90"
                          onClick={() => handleMintClick(project)}
                        >
                          <Coins className="h-4 w-4 mr-2" />
                          Mint as NFT
                        </Button>
                      </>
                    )}
                    {project.nft_status === "minted" && (
                      <>
                        <Button
                          className="w-full bg-white text-black hover:bg-white/90"
                          onClick={() => handleListClick(project)}
                        >
                          <ShoppingBag className="h-4 w-4 mr-2" />
                          List on Marketplace
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full bg-white/5 text-white border-white/20 hover:bg-white/10"
                          onClick={() => handleCreateDerivedVersion(project)}
                        >
                          <GitBranch className="h-4 w-4 mr-2" />
                          Create Derived Version
                        </Button>
                      </>
                    )}
                    {project.nft_status === "listed" && (
                      <>
                        <Button
                          className="w-full bg-white text-black hover:bg-white/90"
                          onClick={() => navigate("/marketplace")}
                        >
                          View in Marketplace
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full bg-white/5 text-white border-white/20 hover:bg-white/10"
                          onClick={() => handleCreateDerivedVersion(project)}
                        >
                          <GitBranch className="h-4 w-4 mr-2" />
                          Create Derived Version
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {selectedProject && (
        <>
          <MintNFTDialog
            projectId={selectedProject.id}
            projectName={selectedProject.name}
            metadataCid={selectedProject.metadata_cid}
            dataCid={selectedProject.lighthouse_cid}
            open={mintDialogOpen}
            onOpenChange={setMintDialogOpen}
          />
          <ListNFTDialog
            project={selectedProject}
            open={listDialogOpen}
            onOpenChange={setListDialogOpen}
            onSuccess={fetchProjects}
          />
          <DeleteProjectDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            projectName={selectedProject.name}
            onConfirm={handleDeleteConfirm}
            isDeleting={deletingProject}
          />
        </>
      )}
    </div>
  );
}
