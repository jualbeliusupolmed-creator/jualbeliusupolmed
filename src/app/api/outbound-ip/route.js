export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    
    return Response.json({ 
      pesan: "Ini adalah IP Outbound server Vercel Anda saat ini:",
      ip_outbound: data.ip 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
