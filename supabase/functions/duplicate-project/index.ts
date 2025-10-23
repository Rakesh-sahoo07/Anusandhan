import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { original_project_id, buyer_wallet_address, transaction_hash } = await req.json();

    console.log('Duplicating project:', { original_project_id, buyer_wallet_address, transaction_hash });

    // Fetch the original project
    const { data: originalProject, error: fetchError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', original_project_id)
      .single();

    if (fetchError || !originalProject) {
      console.error('Error fetching original project:', fetchError);
      throw new Error('Original project not found');
    }

    console.log('Original project fetched:', originalProject.name);

    // Create a new project record (copy for the buyer)
    const newProject = {
      name: `${originalProject.name}`,
      description: originalProject.description,
      creator_wallet_address: originalProject.creator_wallet_address, // Preserve original creator
      owner_wallet_address: buyer_wallet_address, // New owner is the buyer
      lighthouse_cid: originalProject.lighthouse_cid, // Same IPFS data
      metadata_cid: originalProject.metadata_cid, // Same metadata
      nft_status: 'draft', // New copy starts as draft
      nft_contract_address: null,
      nft_token_id: null,
      is_derived: true,
      derived_from_project_id: original_project_id,
    };

    const { data: createdProject, error: createError } = await supabaseClient
      .from('projects')
      .insert(newProject)
      .select()
      .single();

    if (createError || !createdProject) {
      console.error('Error creating new project:', createError);
      throw new Error('Failed to create project copy');
    }

    console.log('New project created:', createdProject.id);

    // Load project data from IPFS to create a snapshot
    try {
      const ipfsResponse = await fetch(
        `https://gateway.lighthouse.storage/ipfs/${originalProject.lighthouse_cid}`
      );
      
      if (ipfsResponse.ok) {
        const projectData = await ipfsResponse.json();
        
        // Create a snapshot of the copied project
        const { error: snapshotError } = await supabaseClient
          .from('project_snapshots')
          .insert({
            project_id: createdProject.id,
            snapshot_data: projectData,
            version: 1,
          });

        if (snapshotError) {
          console.error('Error creating snapshot:', snapshotError);
          // Don't fail the entire operation if snapshot fails
        } else {
          console.log('Project snapshot created');
        }
      }
    } catch (ipfsError) {
      console.error('Error loading from IPFS:', ipfsError);
      // Don't fail the entire operation if IPFS load fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        new_project_id: createdProject.id,
        project_name: createdProject.name,
        message: 'Project successfully duplicated for buyer',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in duplicate-project function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
