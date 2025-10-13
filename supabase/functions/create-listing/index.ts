import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      projectId,
      price,
      sellerAddress,
      transactionHash,
    } = await req.json();

    console.log('Creating listing:', { projectId, price, sellerAddress });

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // Create NFT listing
    const { data: listing, error: listingError } = await supabase
      .from('nft_listings')
      .insert({
        project_id: projectId,
        price_pyusd: price,
        seller_wallet_address: sellerAddress,
        listing_status: 'active',
        transaction_hash: transactionHash,
      })
      .select()
      .single();

    if (listingError) {
      console.error('Error creating listing:', listingError);
      throw listingError;
    }

    // Update project status
    const { error: updateError } = await supabase
      .from('projects')
      .update({ nft_status: 'listed' })
      .eq('id', projectId);

    if (updateError) {
      console.error('Error updating project status:', updateError);
    }

    console.log('Listing created successfully:', listing);

    return new Response(
      JSON.stringify({
        success: true,
        listing,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-listing function:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
