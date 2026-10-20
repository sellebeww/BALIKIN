import { transact } from "@/server/store";
import { NextResponse } from "next/server";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const envelope = z.object({
  version: z.number().int().nonnegative(),
  action: z
    .object({
      type: z.string().min(1).max(40),
      id: z.string().max(200).optional(),
    })
    .passthrough(),
});
const response = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
export async function GET() {
  try {
    return response(await transact());
  } catch {
    return response(
      {
        error:
          "Penyimpanan lokal tidak dapat dibaca. Periksa berkas data; data tidak direset otomatis.",
      },
      500,
    );
  }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (
      request.headers.get("sec-fetch-site") === "cross-site" ||
      (origin &&
        new URL(origin).host !==
          (request.headers.get("host") ?? new URL(request.url).host))
    )
      return response({ error: "Origin tidak diizinkan." }, 403);
    if (
      request.headers.get("content-type")?.split(";")[0].trim() !==
      "application/json"
    )
      return response({ error: "Gunakan Content-Type application/json." }, 415);
    const reader = request.body?.getReader();
    if (!reader)
      return response({ error: "Isi permintaan wajib tersedia." }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        return response(
          { error: "Permintaan terlalu besar (maksimum 64 KB)." },
          413,
        );
      }
      chunks.push(value);
    }
    const body = envelope.parse(
      JSON.parse(Buffer.concat(chunks).toString("utf8")),
    );
    return response(await transact(body.action, body.version));
  } catch (e) {
    if (e instanceof z.ZodError)
      return response(
        {
          error: `Input tidak valid: ${e.issues.map((i) => i.path.join(".") || "permintaan").join(", ")}. Periksa batas dan tipe nilai.`,
        },
        400,
      );
    if (e instanceof SyntaxError)
      return response({ error: "Isi permintaan bukan JSON yang valid." }, 400);
    if ((e as { code?: string }).code === "VERSION_CONFLICT")
      return response({ error: (e as Error).message }, 409);
    if ((e as Error).cause || (e as NodeJS.ErrnoException).code)
      return response(
        {
          error:
            "Perubahan belum tersimpan. Penyimpanan lokal bermasalah; periksa berkas dan izin akses.",
        },
        500,
      );
    return response({ error: (e as Error).message }, 400);
  }
}
