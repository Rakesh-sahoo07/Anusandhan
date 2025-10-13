import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const LIGHTHOUSE_API_KEY = Deno.env.get('LIGHTHOUSE_API_KEY');
    
    if (!LIGHTHOUSE_API_KEY) {
      console.error('LIGHTHOUSE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Lighthouse API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, name, mimeType } = await req.json();
    console.log('Uploading to Lighthouse:', { name, mimeType });

    // Convert data to JSON string if it's an object
    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Create form data for Lighthouse upload
    const formData = new FormData();
    const blob = new Blob([jsonData], { type: mimeType || 'application/json' });
    formData.append('file', blob, name);

    // Upload to Lighthouse
    const uploadResponse = await fetch('https://node.lighthouse.storage/api/v0/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LIGHTHOUSE_API_KEY}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Lighthouse upload failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to upload to Lighthouse', details: errorText }),
        { status: uploadResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uploadResult = await uploadResponse.json();
    console.log('Upload successful:', uploadResult);

    // Lighthouse returns { Name, Hash, Size }
    return new Response(
      JSON.stringify({
        success: true,
        cid: uploadResult.Hash,
        name: uploadResult.Name,
        size: uploadResult.Size,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lighthouse-upload function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
