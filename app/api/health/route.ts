export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    ok: true,
    service: 'vahan-ai',
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store, private, max-age=0',
    },
  });
}
