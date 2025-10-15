import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  name: string;
  description: string | null;
  nft_status: string;
  created_at: string;
  lighthouse_cid: string | null;
  is_derived: boolean;
}

interface LoadProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
  onLoadProject: (projectId: string, lighthouseCid: string) => void;
}

export const LoadProjectDialog = ({
  open,
  onOpenChange,
  walletAddress,
  onLoadProject,
}: LoadProjectDialogProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && walletAddress) {
      fetchProjects();
    }
  }, [open, walletAddress]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, nft_status, created_at, lighthouse_cid, is_derived")
        .eq("owner_wallet_address", walletAddress)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadProject = (project: Project) => {
    if (!project.lighthouse_cid) {
      toast({
        title: "Error",
        description: "Project data not found on IPFS",
        variant: "destructive",
      });
      return;
    }
    onLoadProject(project.id, project.lighthouse_cid);
    onOpenChange(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-500";
      case "minted":
        return "bg-blue-500";
      case "listed":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Load Project</DialogTitle>
          <DialogDescription>
            Select a project to load into the editor
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No projects found
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold truncate">{project.name}</h3>
                      <Badge className={getStatusColor(project.nft_status)}>
                        {project.nft_status}
                      </Badge>
                      {project.is_derived && (
                        <Badge variant="outline">Derived</Badge>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Created: {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleLoadProject(project)}
                    disabled={!project.lighthouse_cid}
                  >
                    Load
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
