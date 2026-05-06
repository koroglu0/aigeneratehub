# Fix: Android Cleartext HTTP — Network Error on Real Device / Emulator

## Problem

The app targets `http://` (plain HTTP) for the production API URL. Android 9+ (API level 28+) blocks cleartext HTTP traffic by default. This causes a **"Server could not be reached / Network Error"** on Android devices even though the backend ELB is healthy and reachable from desktop browsers/curl.

The backend ELB URL currently used:
```
http://aigene-Publi-jQozJJ2NSUHE-189461169.eu-north-1.elb.amazonaws.com
```

---

## Required Changes

### 1. `app.json` — Enable cleartext traffic (short-term fix)

Add `usesCleartextTraffic: true` inside the `android` block:

```json
{
  "expo": {
    "android": {
      "usesCleartextTraffic": true
    }
  }
}
```

This unblocks HTTP on Android so the app can reach the ELB over plain HTTP.

### 2. Rebuild the app

After editing `app.json`, a **native rebuild** is required — this is not an OTA update:

```bash
npx expo run:android
# or if using EAS Build:
eas build --platform android --profile production
```

---

## Notes for the Frontend Agent

- File to edit: `frontend/aigeneratehub-app/app.json`
- The `android` block may already exist — add `usesCleartextTraffic` inside it, do not duplicate the block.
- Do **not** change `EXPO_PUBLIC_API_URL` — it is already set correctly in the frontend `.env`.
- This is a temporary fix. The permanent solution is to provision an SSL certificate on the ELB and switch the URL to `https://` — but that requires infrastructure changes outside the frontend scope.
