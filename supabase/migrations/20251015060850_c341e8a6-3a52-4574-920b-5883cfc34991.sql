-- Add columns to track project derivation and versioning
ALTER TABLE public.projects
ADD COLUMN derived_from_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN is_derived BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance on derived projects
CREATE INDEX idx_projects_derived_from ON public.projects(derived_from_project_id) WHERE derived_from_project_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.derived_from_project_id IS 'References the parent project if this is a derived version of a minted NFT';
COMMENT ON COLUMN public.projects.is_derived IS 'Flag to quickly identify derived projects';