// app/api/exchange-rate/route.ts

const CACHE = { rate: 0, ts: 0 };
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora

export async function GET() {
  const now = Date.now();

  // Retorna o cache se ainda for válido
  if (CACHE.rate && now - CACHE.ts < CACHE_DURATION) {
    return Response.json({ rate: CACHE.rate, cached: true });
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 } // cache do Next.js também
    });

    if (!res.ok) throw new Error('API de câmbio indisponível');

    const data = await res.json();
    const rate = data.rates?.MZN;

    if (!rate) throw new Error('Taxa MZN não encontrada');

    CACHE.rate = rate;
    CACHE.ts = now;

    return Response.json({ rate, cached: false });
  } catch (err) {
    // Fallback: usa o .env ou 64 como padrão
    const fallback = parseFloat(process.env.USD_TO_MT || '64') || 64;
    console.error('[exchange-rate] Erro ao buscar taxa:', err);
    return Response.json({ rate: fallback, cached: false, fallback: true });
  }
}
