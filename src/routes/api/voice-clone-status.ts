import { createFileRoute } from "@tanstack/react-router";
import { voiceCloneStatus } from "@/lib/server/voice-clone";

export const Route = createFileRoute("/api/voice-clone-status")({
  server: {
    handlers: {
      GET: () => Response.json(voiceCloneStatus()),
    },
  },
});
