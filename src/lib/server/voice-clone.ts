/** Permission-gated clone. Never clone a voice without owner consent. */
export function isVoiceCloneEnabled() {
  return (
    process.env.VOICE_CLONE_PERMISSION === "true" &&
    Boolean(process.env.ELEVENLABS_API_KEY) &&
    Boolean(process.env.ELEVENLABS_VOICE_ID)
  );
}

export function voiceCloneStatus() {
  return {
    permission: process.env.VOICE_CLONE_PERMISSION === "true",
    hasKey: Boolean(process.env.ELEVENLABS_API_KEY),
    hasVoice: Boolean(process.env.ELEVENLABS_VOICE_ID),
    enabled: isVoiceCloneEnabled(),
    fallback: "house-uzma-neerja-swara",
  };
}
