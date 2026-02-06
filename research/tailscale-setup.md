# Tailscale Setup for Mac Mini

**Research Date:** 2026-02-06  
**Researcher:** Fury

---

## Summary

Tailscale is a zero-config VPN that creates a secure network between your devices using WireGuard. For a Mac mini setup, the **Standalone variant** is the recommended installation method — it offers the most features, doesn't require an Apple ID, and provides faster security updates than the App Store version.

**Key Finding:** Since your Mac mini currently has no public ports exposed, Tailscale would primarily benefit you if you need remote access from outside your local network (e.g., while traveling, from a coffee shop, or accessing from another location entirely).

---

## Installation Steps (Standalone Variant — Recommended)

### 1. Download Tailscale
- **Direct download:** [https://pkgs.tailscale.com/stable/Tailscale-latest-macos.pkg](https://pkgs.tailscale.com/stable/Tailscale-latest-macos.pkg)
- **Requirements:** macOS 12.0 (Monterey) or later

### 2. Install
- Open the downloaded `.pkg` file
- Follow the onboarding flow
- Authorize the system extension when prompted (System Preferences → Security & Privacy)
- Allow VPN configuration installation

### 3. Sign In
- Use the menu bar icon (top right of screen)
- Sign in with your SSO identity provider or create a Tailscale account
- Tailscale supports Google, Microsoft, GitHub, Okta, and other SSO providers

### 4. Verify Connection
```bash
# Check status from CLI
/Applications/Tailscale.app/Contents/MacOS/Tailscale status
```

---

## Alternative Installation Methods

### Option 2: Homebrew (CLI-only, no GUI)
```bash
# Install via Homebrew
brew install --formula tailscale

# Start the daemon
sudo brew services start tailscale

# Connect to Tailscale
sudo tailscale up

# Check status
sudo tailscale status
```

**When to use:** Advanced users who prefer CLI control or need the machine to connect before user login (e.g., for remote VNC after power outage).

### Option 3: Mac App Store
- Search for "Tailscale" in the App Store
- **Drawbacks:** Requires Apple ID, sandboxed (less control), conflicts with Screen Time web filter
- **Only use if:** You can't install the Standalone variant or need App Store-managed updates

---

## Best Practices for Single-Node Setup

### 1. **Enable MagicDNS**
- Automatically enabled in most cases
- Allows you to reach your Mac mini by machine name (e.g., `ssh mac-mini` instead of `ssh 100.x.x.x`)

### 2. **Set a friendly machine name**
```bash
# Via CLI
sudo tailscale set --hostname mac-mini-home
```

### 3. **Enable Tailscale SSH (optional but recommended)**
- Eliminates need for SSH keys or passwords
- Uses Tailscale identity and ACLs for authentication
```bash
sudo tailscale up --ssh
```

### 4. **Disable key expiry for unattended machines**
- By default, Tailscale keys expire after 180 days
- For a Mac mini running 24/7, set the device to not expire in the Tailscale admin console
- Go to: [https://login.tailscale.com/admin/machines](https://login.tailscale.com/admin/machines) → select your Mac mini → "Disable key expiry"

### 5. **Auto-start on boot**
- The Standalone variant automatically starts on boot
- Verify: System Preferences → Users & Groups → Login Items (Tailscale should be listed)

---

## Remote Access Workflow

Once installed, accessing your Mac mini remotely:

```bash
# From any device on your Tailscale network
ssh username@mac-mini-home

# Or use the Tailscale IP
ssh username@100.x.x.x
```

You can also:
- Access local web services (e.g., `http://mac-mini-home:8080`)
- File share via SMB/AFP using the Tailscale IP
- Use Screen Sharing / VNC via Tailscale network

---

## Security Considerations

### ✅ Secure by Default
- **End-to-end encrypted:** Uses WireGuard protocol
- **Zero Trust:** Only devices you authorize can connect
- **No open firewall ports:** All connections are outbound; Tailscale coordinates via control plane
- **Identity-based:** Authentication tied to your SSO provider

### ⚠️ Gotchas
1. **System extension authorization required** — on first install, macOS will prompt you to allow Tailscale's system extension in Security & Privacy settings
2. **Does NOT replace your firewall** — Tailscale creates a secure network, but your Mac's firewall still applies
3. **Conflicts with other VPNs** — Can conflict with third-party VPNs or security tools that modify network stack
4. **macOS updates** — Occasionally a macOS update may require re-authorizing the system extension

### 🔐 Access Control
- Configure ACLs (Access Control Lists) in the Tailscale admin console to restrict which devices can reach your Mac mini
- Example: Limit SSH access to only your laptop and phone

---

## Do You Need Tailscale?

### ✅ You SHOULD install Tailscale if:
- You want secure remote access from outside your local network
- You travel and need to reach your Mac mini from coffee shops, hotels, etc.
- You have multiple devices (laptop, phone, Pi) and want them to securely communicate
- You want to eliminate port forwarding and dynamic DNS hassles

### ❌ You DON'T need Tailscale if:
- You only access your Mac mini from within your local network (same Wi-Fi)
- You already have a VPN or remote access solution that works for you
- You never need remote access

**Current Status:** You mentioned "we have no public ports currently" — this means you're not exposing anything to the internet. Tailscale would be useful if you want to access your Mac mini from outside your home network without opening ports or configuring a traditional VPN.

---

## Recommendation

**Install the Standalone variant** if you foresee needing remote access. It's low-overhead, secure, and easy to set up. If you don't need remote access now, you can skip it — there's no harm in waiting until the need arises.

**If you do install:**
1. Download the Standalone variant from [https://pkgs.tailscale.com/stable/#macos](https://pkgs.tailscale.com/stable/#macos)
2. Authorize the system extension
3. Sign in with your preferred SSO provider
4. Disable key expiry for the Mac mini in the admin console
5. Test remote access from your phone or laptop (connected to cellular, not your home Wi-Fi)

---

## References
- [Tailscale macOS Installation](https://tailscale.com/docs/install/mac) — Official installation guide
- [Three Ways to Run Tailscale on macOS](https://tailscale.com/docs/concepts/macos-variants) — Comparison of Standalone, App Store, and CLI variants
- [Tailscaled on macOS (GitHub Wiki)](https://github.com/tailscale/tailscale/wiki/Tailscaled-on-macOS) — Advanced CLI-only setup
- [Tailscale CLI Reference](https://tailscale.com/docs/reference/tailscale-cli) — Command-line usage

---

_Research complete. Ready for next task._
