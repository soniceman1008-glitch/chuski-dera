# Reference voice (optional clone)

Drop a permitted staff recording here as `reference.ogg`.

Do **not** clone this file unless the audio owner has given permission.

Then run:

```bash
VOICE_CLONE_PERMISSION=true ELEVENLABS_API_KEY=... node scripts/clone-voice.mjs public/audio/reference.ogg
```

Put the returned voice id on Vercel as `ELEVENLABS_VOICE_ID`.
