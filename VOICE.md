# Chuski Dera — AI Voice Call Agent

Website Call button stays `tel:+923139235654`. WhatsApp is unchanged.

The AI cannot sit on a normal Jazz/Zong SIM by itself. Twilio answers a Twilio number, then you forward **+923139235654** to that Twilio number.

## What you must create (paid)

### 1. Twilio account

1. Open [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio) and sign up.
2. Verify your email and a phone number (Twilio will ask for this).
3. Add billing / a card. Voice minutes are billed by Twilio. Trial credit is usually a few dollars; after that you pay per incoming minute.
4. Console → **Account → API keys & tokens** (or dashboard home):
   - copy **Account SID**
   - copy **Auth Token**

### 2. Buy a Twilio voice number

1. Twilio Console → **Phone Numbers → Buy a number**.
2. Pakistan numbers are often not sold. Buy a **US / UK / other** number that supports **Voice**.
3. Copy that number, e.g. `+1…`.

This Twilio number is only the backend line. Customers still see and dial **+923139235654**.

### 3. Point the number at our agent

1. Open the purchased number → **Voice Configuration**.
2. A call comes in:
   - Webhook: `https://chuski-dera.vercel.app/api/voice/incoming`
   - HTTP **POST**
3. Status callback (optional):
   - `https://chuski-dera.vercel.app/api/voice/status`
   - HTTP **POST**
4. Save.

### 4. Put secrets on Vercel

Vercel → chuski-dera → Settings → Environment Variables. Production. Then Redeploy.

| Key | Value |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | from Twilio |
| `TWILIO_AUTH_TOKEN` | from Twilio |
| `TWILIO_VOICE_NUMBER` | the Twilio number, like `+1…` |
| `STAFF_FORWARD_NUMBER` | `+923139235654` or another staff phone |
| `BETTER_AUTH_URL` | `https://chuski-dera.vercel.app` |

Do **not** paste these into GitHub or chat.

### 5. Forward your real Pakistani number

On the **+923139235654** SIM (Jazz / Zong / Telenor / Ufone):

1. Open phone **Settings → Calls → Call forwarding**.
2. Turn on **Always forward** (or Busy + No answer if you want to pick up yourself first).
3. Forward to the **Twilio voice number** from step 2.

Now: customer taps Call on the site → phone dials +923139235654 → network forwards → Twilio → AI greeting.

To talk as staff again, turn forwarding **off**.

## What the agent does

- Greeting: *Assalam-o-Alaikum, Chuski Dera mein khush amdeed…*
- Urdu / Roman Urdu by default; English if the caller speaks English.
- Menu, prices, address, hours, Jhang delivery — from the live database only.
- Takes name, phone, address, items, qty, notes; repeats; confirms.
- Confirmed order lands in **Admin → Orders** as a new ticket.
- Call log + transcript: **Admin → Voice calls**.
- “Staff / insaan se baat” transfers to `STAFF_FORWARD_NUMBER`.
- No fake delivery-minute or payment promises.

## Test without customers

From any phone, call the **Twilio number** first. If the greeting plays, forwarding is the last step.

## Web AI Agent voice (Option A + optional clone)

Default is the **house voice family** (no personal clone):

- Urdu / Roman Urdu: `ur-PK-UzmaNeural`
- English: `en-IN-NeerjaNeural`
- Hindi / Punjabi: `hi-IN-SwaraNeural`

Replies stay audio-only. Language follows the latest customer utterance.

### Optional: voice cloning (ElevenLabs)

Clone is **off** until all three are true:

1. Audio owner permission (`VOICE_CLONE_PERMISSION=true`)
2. ElevenLabs API key
3. A cloned voice id

Steps:

1. Open [https://elevenlabs.io](https://elevenlabs.io) and create an account (paid after trial).
2. Profile → API key → copy the key. Do not paste it into GitHub or chat.
3. Put a permitted staff recording at `public/audio/reference.ogg` (or any local path).
4. Run:

```bash
VOICE_CLONE_PERMISSION=true ELEVENLABS_API_KEY=... node scripts/clone-voice.mjs public/audio/reference.ogg
```

5. Copy the printed `voice_id`.
6. Vercel → Environment Variables → Production:

| Key | Value |
| --- | --- |
| `VOICE_CLONE_PERMISSION` | `true` |
| `ELEVENLABS_API_KEY` | from ElevenLabs |
| `ELEVENLABS_VOICE_ID` | the cloned voice id |

7. Redeploy.

If any value is missing, the agent keeps the house voice. Check `/api/voice-clone-status` (no secrets are returned).
