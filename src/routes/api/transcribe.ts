import { createFileRoute } from "@tanstack/react-router";
import { transcribeAudio } from "@/lib/server/stt";

async function handle(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Audio form chahiye." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 200) {
    return Response.json({ error: "Awaaz record nahi hui." }, { status: 400 });
  }
  try {
    const result = await transcribeAudio(file);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ text: result.text });
  } catch {
    return Response.json({ error: "Transcription fail ho gayi." }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
