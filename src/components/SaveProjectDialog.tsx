import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface SaveProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationGraph: any;
  walletAddress: string | null;
}

export const SaveProjectDialog = ({ open, onOpenChange, conversationGraph, walletAddress }: SaveProjectDialogProps) => {
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!projectName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a project name",
        variant: "destructive",
      });
      return;
    }

    if (!walletAddress) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Create project record
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: projectName.trim(),
          description: projectDescription.trim() || null,
          creator_wallet_address: walletAddress,
          owner_wallet_address: walletAddress,
          nft_status: "draft",
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Save conversation graph snapshot
      const { error: snapshotError } = await supabase
        .from("project_snapshots")
        .insert({
          project_id: project.id,
          snapshot_data: conversationGraph,
          version: 1,
        });

      if (snapshotError) throw snapshotError;

      toast({
        title: "Success",
        description: "Project saved successfully!",
      });

      // Reset form and close dialog
      setProjectName("");
      setProjectDescription("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving project:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save project",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save as Project</DialogTitle>
          <DialogDescription>
            Save your conversation graph as a project. You can later mint it as an NFT.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              placeholder="Enter project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your research project..."
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              disabled={isSaving}
              rows={4}
            />
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="text-muted-foreground">
              <strong>Preview:</strong> {conversationGraph.nodes?.length || 0} nodes, {conversationGraph.edges?.length || 0} connections
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
