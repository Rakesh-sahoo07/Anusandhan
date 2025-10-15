import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Coins, ShoppingBag, Trash2, Edit, GitBranch } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { WalletButton } from "@/components/WalletButton";
import { toast } from "@/hooks/use-toast";
import { shortenCid } from "@/utils/ipfs";
import { MintNFTDialog } from "@/components/MintNFTDialog";
import { ListNFTDialog } from "@/components/ListNFTDialog";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { loadProjectFromIPFS } from "@/utils/projectLoader";

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
        .select("*")
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

  const handleMintClick = (project: Project) => {
    setSelectedProject(project);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              ← Back to Editor
            </Button>
            <h1 className="text-2xl font-bold">My Projects</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/marketplace")}>
              Browse Marketplace
            </Button>
            <Button variant="outline" onClick={() => navigate("/analytics")}>
              Analytics
            </Button>
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!walletAddress ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-lg mb-4">
              Connect your wallet to view your projects
            </p>
            <WalletButton />
          </Card>
        ) : projects.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-lg">
              You haven't created any projects yet. Start creating in the editor!
            </p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Go to Editor
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{project.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description || "No description provided"}
                      </p>
                    </div>
                    <Badge variant={getStatusColor(project.nft_status)}>
                      {project.nft_status}
                    </Badge>
                  </div>

                  {project.is_derived && project.derived_from_project_id && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <GitBranch className="h-3 w-3" />
                      <span>Derived version</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Data CID:</span>
                      <a
                        href={`https://gateway.lighthouse.storage/ipfs/${project.lighthouse_cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {shortenCid(project.lighthouse_cid)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Metadata CID:</span>
                      <a
                        href={`https://gateway.lighthouse.storage/ipfs/${project.metadata_cid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {shortenCid(project.metadata_cid)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {project.nft_token_id && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Token ID:</span>
                        <Badge variant="secondary">#{project.nft_token_id}</Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="text-xs">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border space-y-2">
                    {project.nft_status === "draft" && (
                      <>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(project)}
                            className="flex-1"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(project)}
                            className="flex-1"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                        <Button
                          className="w-full"
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
                          className="w-full"
                          onClick={() => handleListClick(project)}
                        >
                          <ShoppingBag className="h-4 w-4 mr-2" />
                          List on Marketplace
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
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
                          className="w-full"
                          variant="outline"
                          onClick={() => navigate("/marketplace")}
                        >
                          View in Marketplace
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
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
