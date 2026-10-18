# Asolaria App Registration + Demo Runbook

Last updated: February 26, 2026

## 1) Lock Branding First (Single Source of Truth)

Use one high-resolution PNG as the master icon source, then regenerate all app icon targets from it.

```powershell
Set-Location C:\Users\acer\Asolaria
powershell -ExecutionPolicy Bypass -File .\tools\Sync-Asolaria-BrandIcons.ps1 `
  -SourceImagePath C:\path\to\AsolariaIcon.png `
  -ReinstallDesktopShortcuts
```

What this updates:
- `public/icons/asolaria-icon-192.png`
- `public/icons/asolaria-icon-512.png`
- `public/icons/asolaria-icon.ico`
- Android launcher icons in `C:\Users\acer\Asolaria-Android\AsolariaCompanion\app\src\main\res\mipmap-*`
- Android adaptive icon references (`mipmap-anydpi-v26/ic_launcher*.xml`)
- Desktop shortcuts (optional, when `-ReinstallDesktopShortcuts` is set)

## 2) Registration Sequence (Google Play)

1. Create app in Play Console (name, default language, app/game, free/paid).
2. Confirm signing setup (Play App Signing) and upload an AAB build.
3. Complete store listing assets:
   - app icon: 512 x 512 PNG
   - feature graphic: 1024 x 500 PNG/JPG
   - phone screenshots (real app UI, consistent branding)
   - short and full descriptions
4. Complete policy declarations:
   - App content section (privacy policy, ads, content rating, target audience)
   - Data safety form
5. Run testing track first (internal or closed), validate install + startup + phone connection flow.
6. Submit production rollout after all required checks show green in Play Console.

## 3) Demo Video Plan (YouTube, Unlisted)

Recommended final cut: 90-150 seconds, no dead time.

Shot list:
1. 0:00-0:12 Intro: problem + what Asolaria does.
2. 0:12-0:40 Desktop launch: one-button startup, dashboard online.
3. 0:40-1:10 Phone mode: live connect + bidirectional control proof.
4. 1:10-1:30 Safety/governance: approvals + role boundaries.
5. 1:30-1:50 Reliability: reconnect fallback (USB -> Wi-Fi -> carrier).
6. 1:50-2:10 Wrap: deployment status + next milestone.

Recording settings:
- 1920x1080 (or native 1080p), 30 fps minimum, 10+ Mbps bitrate.
- Capture real device interactions (no simulated UI overlays for core claims).
- Keep cursor/tap paths deliberate and slow enough to follow.

Publish settings:
- Visibility: `Unlisted` (for review and registration workflows).
- Title pattern: `Asolaria Demo - <build/version> - <YYYY-MM-DD>`.
- Description should include:
  - build/version hash
  - test environment summary
  - key capabilities shown

## 4) Submission Packet Checklist

- Final icon source PNG (master asset)
- Synced icon outputs (web + desktop + Android)
- Signed release build (AAB)
- Privacy policy URL
- Store listing text + screenshots + feature graphic
- Unlisted YouTube demo URL
- Test evidence (startup/connect/reconnect pass notes)

## 4.1) Enforce Gates Before Submission

```powershell
Set-Location C:\Users\acer\Asolaria
powershell -ExecutionPolicy Bypass -File .\tools\Test-Asolaria-PublishDemoGates.ps1
```

Gate inputs:
- checklist template: `docs/PUBLISH_DEMO_CHECKLIST.md`
- working checklist copy: `reports/release-demo/PUBLISH_DEMO_CHECKLIST.md`
- evidence files in `reports/release-demo` (`demo-video-url.txt`, `test-evidence.md`, `play-track-proof.txt`, `submission-packet.md`)

## 5) Official References

- Play Console app setup and release docs:  
  https://developer.android.com/distribute/play-console
- Play App Signing:  
  https://support.google.com/googleplay/android-developer/answer/9842756
- Data safety form overview:  
  https://support.google.com/googleplay/android-developer/answer/10787469
- YouTube upload videos:  
  https://support.google.com/youtube/answer/57407
