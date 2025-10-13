import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, CheckCircle } from "lucide-react";
import { serializeProject, generateProjectMetadata } from "@/utils/projectSerializer";
import { Progress } from "@/components/ui/progress";

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>("");

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
    setUploadProgress(0);
    setUploadStatus("Preparing project data...");

    try {
      // Step 1: Serialize project data (10%)
      setUploadProgress(10);
      setUploadStatus("Serializing conversation graph...");
      
      const serializedData = serializeProject(
        conversationGraph.nodes || [],
        conversationGraph.edges || []
      );

      // Step 2: Upload to Lighthouse IPFS (30%)
      setUploadProgress(30);
      setUploadStatus("Uploading to IPFS...");

      const { data: uploadResult, error: uploadError } = await supabase.functions.invoke(
        'lighthouse-upload',
        {
          body: {
            data: serializedData,
            name: `${projectName.replace(/\s+/g, '-')}-data.json`,
            mimeType: 'application/json',
          },
        }
      );

      if (uploadError) throw uploadError;
      if (!uploadResult.success) throw new Error(uploadResult.error || 'Upload failed');

      const dataCid = uploadResult.cid;
      console.log('Data uploaded to IPFS:', dataCid);

      // Step 3: Create metadata and upload (50%)
      setUploadProgress(50);
      setUploadStatus("Creating metadata...");

      const metadata = generateProjectMetadata(
        projectName,
        projectDescription,
        walletAddress,
        dataCid
      );

      const { data: metadataResult, error: metadataError } = await supabase.functions.invoke(
        'lighthouse-upload',
        {
          body: {
            data: metadata,
            name: `${projectName.replace(/\s+/g, '-')}-metadata.json`,
            mimeType: 'application/json',
          },
        }
      );

      if (metadataError) throw metadataError;
      if (!metadataResult.success) throw new Error(metadataResult.error || 'Metadata upload failed');

      const metadataCid = metadataResult.cid;
      console.log('Metadata uploaded to IPFS:', metadataCid);

      // Step 4: Create project record in database (70%)
      setUploadProgress(70);
      setUploadStatus("Saving to database...");

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          name: projectName.trim(),
          description: projectDescription.trim() || null,
          creator_wallet_address: walletAddress,
          owner_wallet_address: walletAddress,
          nft_status: "draft",
          lighthouse_cid: dataCid,
          metadata_cid: metadataCid,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Step 5: Save conversation graph snapshot (90%)
      setUploadProgress(90);
      setUploadStatus("Creating snapshot...");

      const { error: snapshotError } = await supabase
        .from("project_snapshots")
        .insert({
          project_id: project.id,
          snapshot_data: serializedData as any,
          version: 1,
        });

      if (snapshotError) throw snapshotError;

      // Step 6: Complete (100%)
      setUploadProgress(100);
      setUploadStatus("Complete!");

      toast({
        title: "Success",
        description: (
          <div className="space-y-1">
            <p>Project saved to IPFS successfully!</p>
            <p className="text-xs text-muted-foreground">CID: {dataCid.slice(0, 20)}...</p>
          </div>
        ),
      });

      // Reset form and close dialog after a short delay
      setTimeout(() => {
        setProjectName("");
        setProjectDescription("");
        setUploadProgress(0);
        setUploadStatus("");
        onOpenChange(false);
      }, 1500);

    } catch (error: any) {
      console.error("Error saving project:", error);
      setUploadStatus("Failed");
      toast({
        title: "Error",
        description: error.message || "Failed to save project",
        variant: "destructive",
      });
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

          {isSaving && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {uploadProgress < 100 ? (
                  <Upload className="h-4 w-4 animate-pulse" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <span className="text-sm text-muted-foreground">{uploadStatus}</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
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
