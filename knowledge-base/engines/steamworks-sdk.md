---
type: engine
slug: steamworks-sdk
title: Steamworks SDK — achievements, lobbies, P2P, OSS bindings landscape
engine: other
content_format: code
language: cpp
license: Steamworks SDK License (Valve) + MIT/BSD bindings
source_url: https://partner.steamgames.com/doc/sdk
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: medium
tags: [steam, steamworks, achievements, lobbies, p2p, distribution]
---

# Steamworks SDK — achievements, lobbies, P2P, OSS bindings landscape

> Steamworks SDK is the platform layer most PC games on Steam end up integrating. Strictly speaking it is **not** OSI-open — Valve ships it under a custom **Steamworks SDK License** that grants use only to developers shipping on Steam. The OSS story lives in the **bindings** (Facepunch.Steamworks, Steamworks.NET, GodotSteam, steamworks-rs) which sit on top of Valve's headers and re-expose them under permissive licenses (MIT / Apache-2.0). This entry is here so GamesAI can reason about Steam-distributed games (Flump, future Boilergen `steamworks-stubs` plugin) without conflating the proprietary SDK with the permissively-licensed wrappers.

## 1. What the Steamworks SDK is

Steamworks is Valve's first-party SDK for games distributed through Steam. It is a single C/C++ library (`steam_api64.dll` / `libsteam_api.so` / `libsteam_api.dylib`) plus a header set under `public/steam/` that exposes Steam's platform services to a running game process. The SDK ships as a zip from `partner.steamgames.com/downloads`, current at SDK **1.64** as of mid-2026 (Steamworks.NET tracks 1.64; steamworks-rs tracks 1.80 on its development branch). It includes the API headers, the `steamworksexample` reference game ("SpaceWar"), the `ContentBuilder` upload tool, and Steam DRM. Distribution requires a Steamworks Partner account (a Steam Direct fee per app, see §7) and acceptance of Valve's terms — the SDK is not redistributable as source.

## 2. Major Steamworks features and when you reach for each

| Feature | API surface | When you need it |
|---|---|---|
| **Stats + Achievements** | `ISteamUserStats` | Every shipped game; achievements are configured in the Steamworks partner panel and unlocked at runtime |
| **Leaderboards** | `ISteamUserStats::FindLeaderboard`, `UploadLeaderboardScore` | Score-attack / competitive games; cheap and good enough for indie use |
| **Lobbies** (matchmaking primitive) | `ISteamMatchmaking` | Co-op / small-session multiplayer — see §5 |
| **Steam Networking Sockets / SDR** | `ISteamNetworkingSockets`, `ISteamNetworkingMessages` | Any P2P or relayed gameplay traffic — see §4 |
| **Steam Cloud** | `ISteamRemoteStorage` | Cross-device save sync; quotas configured per-app in the partner panel |
| **Steam Workshop** (UGC) | `ISteamUGC` | Mods / maps / community content distribution — relevant for moddable RP servers |
| **Rich Presence + invites** | `ISteamFriends::SetRichPresence`, `InviteUserToGame` | "Join game" buttons in the friends list, Discord-style status strings |
| **Auth tickets** | `ISteamUser::GetAuthSessionTicket` | Verifying a Steam user from your own backend (don't trust the client SteamID alone) |
| **DRM / depot management** | `ContentBuilder`, `steam_appid.txt` | Build upload + branch management; not a runtime concern |

There are more (Inventory, Microtransactions, VR Input, Voice, Music) but the seven above cover what 95 % of indie titles actually integrate.

### Achievements and stats — the runtime loop

```cpp
// Init at game start (after SteamAPI_Init succeeded).
SteamUserStats()->RequestCurrentStats();

// On unlock event:
SteamUserStats()->SetAchievement("ACH_FIRST_KILL");
SteamUserStats()->StoreStats(); // batches changes; call once per frame max
```

Achievement IDs (`ACH_FIRST_KILL`) are defined web-side in the partner panel — see §6. The runtime call is just a string lookup; if the ID isn't registered on the partner site, `SetAchievement` silently no-ops.

### Leaderboards — async find-then-upload

```cpp
SteamAPICall_t h = SteamUserStats()->FindOrCreateLeaderboard(
    "Top Times",
    k_ELeaderboardSortMethodAscending,
    k_ELeaderboardDisplayTypeTimeMilliSeconds);
// ...later, in the FindLeaderboard callback:
SteamUserStats()->UploadLeaderboardScore(
    leaderboardHandle,
    k_ELeaderboardUploadScoreMethodKeepBest,
    /*score*/ 12345,
    /*details*/ nullptr, 0);
```

Leaderboards store up to 64 bytes of opaque "details" alongside each score (replay seed, loadout hash, anti-tamper signature). Use it — it costs nothing and makes "verify the top-100 isn't all cheaters" possible later.

### Workshop — UGC distribution

`ISteamUGC` covers the full UGC lifecycle: create item, upload content folder, set preview image and tags, publish, subscribe, download, query. Workshop content is hosted on Steam's CDN at no cost to the developer and the subscriber-side download is automatic — your game queries the list of subscribed items and reads them off disk.

For RP / moddable servers this is the natural mod-distribution channel on Steam. The qbcore / Garry's Mod / Project Zomboid pattern is roughly:
1. Player browses Workshop in-game (or on the website)
2. Subscribes to one or more items
3. On next launch, the game enumerates subscribed items via `GetSubscribedItems()` and loads them
4. Updates auto-download in the background

Workshop content type rendering / preview is the area with the most platform gaps (see §8) — the upload + subscribe + download flow itself works on all three platforms.

### Rich Presence + game invites

`SetRichPresence("status", "Defending Point B")` plus a `connect` token (`SetRichPresence("connect", "+lobby 12345")`) gets you:
- A line of text in the friends list under the player's name
- A right-click "Join Game" entry that re-launches the game with the `connect` value as a command-line argument
- A "+invite friend" button in the Steam overlay

This is how every multiplayer Steam game does friend invites. There is no separate notification system to wire up — the Steam overlay handles it.

### Auth tickets — verifying SteamID server-side

If your game has a backend (matchmaking service, leaderboard validator, currency wallet), **never trust the SteamID the client sends you.** The client process can claim to be anyone. The correct flow:

1. Client calls `SteamUser()->GetAuthSessionTicket(...)` and gets back a binary blob
2. Client posts the blob to your backend
3. Backend calls Steam's Web API (`AuthenticateUserTicket`) with your publisher Web API key
4. Steam returns the verified SteamID — *that* is the one to trust

The publisher Web API key lives only on your servers; it is **not** the same as the AppID and must never ship in the client.

## 3. Bindings that matter (verified May 2026)

The Valve SDK is C/C++. You almost never call it directly from a C# / Rust / Godot game — you go through one of these wrappers. All are permissively licensed; all wrap Valve's headers but **do not redistribute** them (you still have to drop in `steam_api64.dll` yourself).

| Binding | Language / engine | License | Maintenance (May 2026) | Notes |
|---|---|---|---|---|
| **Facepunch.Steamworks** | C# (.NET, Unity, Godot Mono) | MIT | Active — release April 23 2026 | Garry Newman / Rust devs' wrapper. Ergonomic, opinionated, single DLL, IL2CPP-compatible. Recommended default for Unity. |
| **Steamworks.NET** | C# (.NET, Unity, Godot Mono) | MIT | Active — `2025.163.0` released Dec 24 2025, tracks SDK 1.64 | Lower-level 1:1 mapping of the C API. Verbose, but closest to the Valve docs — good when you need an obscure call Facepunch hasn't wrapped. |
| **GodotSteam** | GDExtension for Godot 4.x | MIT | **Migrated** — GitHub repo archived April 4 2026, development continues on **Codeberg**. Latest release 4.18.1 supports Godot 4.6.2 + Steamworks 1.64. | Mainline binding for Godot. Update bookmarks if you had the GitHub URL. |
| **steamworks-rs** (`Noxime/steamworks-rs`) | Rust (usable from Bevy, custom engines) | Apache-2.0 OR MIT (dual) | Active — `v0.13.0` released April 14 2026, tracks SDK 1.80 | The de-facto Rust binding. Bevy projects typically wrap it in a small plugin crate; there is no official Bevy-Steamworks crate from the Bevy org. |
| **SteamShim / Lua wrappers** for FiveM | Lua / Node-side via FFI | varies | Sparse — no canonical maintained binding | FiveM uses its own Cfx auth, not Steam SDK; in practice servers identify players by their Steam HEX from `GetPlayerIdentifier` rather than calling Steamworks directly. If you need full SDK from a FiveM resource, expect to write a native Node addon. |

### Picking between Facepunch and Steamworks.NET

This is the question that comes up in Unity projects. Short version:

- **Use Facepunch.Steamworks** when you want it to feel like idiomatic C#: events instead of callbacks, `async`/`await` instead of `SteamAPICall_t`, `Lobby` / `Friend` / `App` as proper objects.
- **Use Steamworks.NET** when you want the call you just read in Valve's docs to exist, by name, in your code. Closer to C++. Easier to follow tutorials written against the partner docs.

Both are MIT, both compile to single DLLs, both work in Unity (Mono and IL2CPP) and Godot Mono. You cannot mix them in the same process.

Side-by-side on the same operation (unlock an achievement):

```csharp
// Facepunch.Steamworks
SteamUserStats.Achievements.First(a => a.Identifier == "ACH_FIRST_KILL").Trigger();
// or simply:
new Achievement("ACH_FIRST_KILL").Trigger();

// Steamworks.NET
SteamUserStats.SetAchievement("ACH_FIRST_KILL");
SteamUserStats.StoreStats();
```

Side-by-side on lobby creation:

```csharp
// Facepunch.Steamworks
var result = await SteamMatchmaking.CreateLobbyAsync(maxMembers: 4);
if (result.HasValue) {
    var lobby = result.Value;
    lobby.SetPublic();
    lobby.SetData("map", "de_dust2");
}

// Steamworks.NET
var call = SteamMatchmaking.CreateLobby(ELobbyType.k_ELobbyTypePublic, 4);
// Hook a CallResult<LobbyCreated_t> for the result, then:
SteamMatchmaking.SetLobbyData(lobbyID, "map", "de_dust2");
```

The Facepunch ergonomics win is real, but the Steamworks.NET version maps 1:1 to the partner docs — which matters when you're debugging by reading Valve's reference instead of a wrapper's README.

## 4. Steam Datagram Relay (SDR) — the right relay choice for indie multiplayer

Raw P2P over the open internet is painful: roughly a third of consumer NATs require a TURN-style relay because hole-punching fails. Running your own STUN/TURN cluster (coturn on a beefy VPS) costs money and bandwidth, and your relay's IP becomes a DDoS target.

**SDR** (Steam Datagram Relay) routes UDP traffic through Valve's global backbone instead. From the partner docs:

- All traffic is **authenticated, encrypted, and rate-limited** — you receive datagrams that have already been validated as coming from a real Steam user
- Player IPs are **never exposed** to other players or to your dedicated servers, which kills the entire class of "DDoS the streamer" attacks that plague open P2P games
- Valve's backbone often **routes faster than the public internet** — measured ping can drop because BGP-optimal paths beat ISP defaults
- **Free for Steam-distributed games.** No bandwidth bill, no relay cluster to babysit. This is the single best deal in indie multiplayer infrastructure.

The runtime API is `ISteamNetworkingSockets` (connection-oriented, TCP-shaped) and `ISteamNetworkingMessages` (message-oriented, UDP-shaped). Both transparently use SDR when the peer is reachable through Steam.

```cpp
// Server side — listen on an SDR-only socket (no public IP needed)
HSteamListenSocket sock = SteamNetworkingSockets()->CreateListenSocketP2P(
    /*virtualPort*/ 0, 0, nullptr);

// Client side — connect to the server's SteamID via SDR
SteamNetworkingIdentity id;
id.SetSteamID(serverSteamID);
SteamNetworkingSockets()->ConnectP2P(id, /*virtualPort*/ 0, 0, nullptr);
```

There is also a public open-source slice of this code (`ValveSoftware/GameNetworkingSockets` on GitHub, BSD-3-Clause) that you can use **outside Steam** — but the open-source build **does not include the SDR relay network** itself. SDR access is a Steamworks-licensee benefit, not an OSS one.

For Grand Mobile / Russian-market mobile, SDR is irrelevant — the wedge is mobile and Steam isn't in play. For Flump (Alizhan's PC Steam shooter) SDR is the obvious pick over rolling our own relay.

## 5. Steam Lobbies as matchmaking

Lobbies are Steam's **session discovery** primitive — small backend objects (think: chat-room with metadata) that players create, find, join, and use to negotiate a real gameplay connection. They are not the gameplay transport — once everyone's joined, you typically open an SDR socket between them.

Hard limits and shape:

- **Up to 250 members** per lobby (most games stay 2–16)
- Arbitrary **string/numeric metadata** keys, set by the owner, replicated to all members
- **Lobby list query** with filters: string equality, numeric comparison, near-value distance, available slots, geographic distance
- Search returns at most **50 lobbies** per query, sorted by geographic + near-filter distance
- **Skill-based matchmaking** can be layered on top (Steam exposes hooks for it via the matchmaking interface), but you implement the rating math yourself — Steam stores numbers, not Elo
- **No built-in anti-cheat** in lobbies. VAC is a separate subsystem; EAC / BattlEye / nProtect are third-party and integrated at the game level, not the lobby level
- **No persistent rooms.** A lobby evaporates when the last member leaves; if you want persistent groups, that's Steam Groups, a different API

Practical pattern for an RP / co-op title: lobby for discovery + chat + readying-up, then transition to a P2P SDR connection (or a dedicated server) for the actual gameplay tick. Lobbies are cheap; do not try to push gameplay state through `SetLobbyData`.

## 6. Achievements as schema-driven content

Achievement and stat definitions are **not** in your game binary — they live in the Steamworks partner panel:

```
Steamworks Partner site
  └── Your App
      └── Stats & Achievements
          └── Achievements
              ├── API Name: ACH_FIRST_KILL
              ├── Display Name (localized): "First Blood"
              ├── Description (localized): "Defeat your first enemy"
              ├── Hidden: false
              └── Icon (achieved / locked): 64x64 PNG
```

Once defined web-side, the runtime call is just `SetAchievement("ACH_FIRST_KILL")`. The partner panel is the source of truth; the binary just references IDs.

This is **schema-driven content** in exactly the shape Boilergen targets. A future `steamworks-stubs` plugin could take a YAML file like:

```yaml
# steamworks.achievements.yaml
app_id: 480
achievements:
  - id: ACH_FIRST_KILL
    display: "First Blood"
    description: "Defeat your first enemy"
    hidden: false
  - id: ACH_WIN_100
    display: "Centurion"
    description: "Win 100 matches"
    hidden: false
stats:
  - id: stat_kills_total
    type: int
  - id: stat_accuracy
    type: float
leaderboards:
  - id: lb_best_time
    sort: ascending
    display: time_milliseconds
```

…and emit:

- A C# enum / const class of achievement IDs (avoids stringly-typed `SetAchievement("ACH_FRST_KILL")` typos)
- An initialization helper that calls `RequestCurrentStats` + `FindOrCreateLeaderboard` for every declared leaderboard
- A CSV the dev pastes into the partner panel (Steam doesn't expose a public web API for achievement definition — partner panel only — so we generate the data, the human pastes it once)

Sketch of the generated C# (Steamworks.NET target):

```csharp
// AUTO-GENERATED by Boilergen steamworks-stubs plugin. Do not edit.
public static class Achievements {
    public const string FirstKill = "ACH_FIRST_KILL";
    public const string Win100    = "ACH_WIN_100";
}

public static class Stats {
    public const string KillsTotal = "stat_kills_total"; // int
    public const string Accuracy   = "stat_accuracy";    // float
}

public static class Leaderboards {
    public const string BestTime = "lb_best_time"; // ascending, time_milliseconds
}

public static class SteamworksBootstrap {
    public static void Initialize() {
        SteamUserStats.RequestCurrentStats();
        // Find/create handles for every leaderboard at startup so calls are sync later.
        SteamUserStats.FindOrCreateLeaderboard(
            Leaderboards.BestTime,
            ELeaderboardSortMethod.k_ELeaderboardSortMethodAscending,
            ELeaderboardDisplayType.k_ELeaderboardDisplayTypeTimeMilliSeconds);
    }
}
```

Both Facepunch.Steamworks and Steamworks.NET would be supported as targets, same as our Unity ScriptableObject vs MonoBehaviour split. The Facepunch variant emits `Achievement` instances and `await`-friendly bootstrap; the Steamworks.NET variant emits the const-class + sync-bootstrap shape above.

## 7. Pricing and posture

- **SDK itself: free.** Download from `partner.steamgames.com/downloads`, accept the Steamworks SDK License.
- **Steam Direct: $100 USD per app, one-time.** Recoupable from the first $1,000 of adjusted gross revenue. You pay this for each separate AppID you publish.
- **Revenue share: 30 % to Valve as the default tier**, with the standard tiered reductions: **25 % above $10 M lifetime gross**, **20 % above $50 M lifetime gross**. Same scale Epic, Apple, and Google have all variously copied or refused to copy.
- **Refund window: 2 hours played / 14 days owned.** Funded out of your half, not Valve's — factor it into wishlist-conversion math.
- **Steamworks Partner account** requires a tax interview, banking info, and a signed distribution agreement. None of this is OSS-friendly; Valve's terms are the cost of being on Steam.

## 8. Pitfalls

- **Steamworks SDK License is not OSI-open.** The SDK headers and binaries cannot be redistributed in your repo. CI/CD that needs them either fetches them from a private artifact store or reconstructs them at build time on the developer's machine. Bindings (Facepunch / Steamworks.NET / GodotSteam / steamworks-rs) are MIT/Apache and **can** be vendored — but they are useless without the Valve binaries next to them.
- **Closed platform reality.** Integrating Steamworks means accepting Valve's terms, Valve's revenue cut, and Valve's right to delist. For a regional-OSS-tooling project like GamesAI we treat Steam as one distribution path among many (itch.io, Epic, direct, regional stores like VK Play / MyGames in Russia, Yandex Games for HTML5) — never as the only path.
- **Linux / macOS feature gaps.** The base API works on all three; the rough spots are Workshop content type support (some content types only render on Windows) and SDR client perf on older macOS builds. Test before promising parity.
- **Bindings lag the SDK.** When Valve ships a new `ISteamX` interface, expect a few weeks before Facepunch / Steamworks.NET / GodotSteam pick it up. steamworks-rs is currently ahead at SDK 1.80; the C# wrappers are still on 1.64. If you need a brand-new call, you may have to P/Invoke it yourself.
- **Steam Cloud quota is *not* a fixed 1 GB.** It's whatever the developer sets in the partner panel ("Bytes per user" + "Files per user" on the Cloud Settings page). Set it to what your saves actually need; large quotas can be requested from Valve but require justification.
- **`steam_appid.txt` in shipping builds is a footgun.** It tells the SDK which AppID to bind to during local development. If you ship it to players you expose your AppID-binding mechanism and bypass the launcher check. Make sure your build pipeline strips it from release.
- **`SteamAPI_RunCallbacks()` must be called every frame** on the main thread. Forgetting it is the #1 reason "achievements don't unlock" / "lobby joins hang" — the API is async, callbacks won't fire on their own. Facepunch.Steamworks calls it for you when you call `SteamClient.RunCallbacks()`; Steamworks.NET requires you to call `SteamAPI.RunCallbacks()` yourself in `Update()`.
- **Achievement display strings are localized in the partner panel, not the binary.** Achievement names baked into your `.resx` / `.po` won't appear — Steam shows the strings *it* has for the user's Steam language. Keep the partner-panel localization in sync with your in-game strings; the localization-assistant module can drive both off the same source.
- **Stat aggregation runs daily, not in real time.** "Global stats" (`GetGlobalStat`, used for "X % of players have done Y") update once per day. If your design depends on real-time aggregation, build it server-side.
- **Lobby ownership transfer on disconnect is automatic but unordered.** When the lobby owner leaves, Steam picks a new owner from the remaining members — but which one is unspecified. If your game logic cares (e.g., the owner is the host of the gameplay session), handle the `LobbyChatUpdate_t` callback and re-elect deterministically.
- **VAC (Valve Anti-Cheat) is opt-in per game and irreversible per ban.** A VAC-banned account is banned from every game in the same VAC "module group" forever. If you enable VAC and ship false positives, you get review-bombed; if you don't enable it, cheaters proliferate. Most indie multiplayer games skip VAC and use a third-party (EAC / BattlEye) or just accept the cheat-load.

## 9. How this connects to Boilergen + GamesAI

**Direct fits:**

- A **`steamworks-stubs` Boilergen plugin** (planned, not yet sprinted) takes a `steamworks.achievements.yaml` and emits binding-aware initialization + ID constants for either Facepunch.Steamworks or Steamworks.NET. Same shape as our existing Unity ScriptableObject / MonoBehaviour split, just with two bindings as the target axis.
- **schema-validator** can already be pointed at a Steamworks YAML to enforce `app_id` is numeric, `id` matches `^[A-Z][A-Z0-9_]*$`, `sort` ∈ {ascending, descending}, etc. Adding a Steamworks JSON-schema is a 30-minute task once the YAML shape is finalized.
- **localization-assistant** is a clean fit for achievement display names + descriptions, which Steam wants per-language. Same workflow as in-game string tables.
- **AI Describe / RAG** consults this entry plus the bindings' README to pick correct API calls for the binding the user is actually using (Facepunch vs Steamworks.NET diverge enough that a generic "C# Steamworks snippet" is a coin-flip on whether it compiles).

**Direct downstream consumer:** **Flump** — Alizhan's personal Unity shooter, Steam-distributed. Achievements, leaderboards, Cloud saves, SDR-based P2P all in scope. This is the primary case `steamworks-stubs` would unblock.

**Where this is *not* the wedge:** **Grand Mobile.** Russian-market mobile multiplayer ships through MyGames / VK Play / Google Play / Huawei AppGallery, not Steam. The Steam toolchain is irrelevant there. RP-server-tooling (FiveM / qbcore) is also Steam-adjacent but not Steam-integrated — FiveM identifies players via Cfx, with Steam HEX as one of several optional identifiers. Don't over-invest in a Steamworks plugin until Flump's roadmap actually demands it.

## 10. References

- **Steamworks Partner documentation** — `https://partner.steamgames.com/doc/sdk` (SDK overview), `/doc/features/multiplayer/steamdatagramrelay` (SDR), `/doc/features/multiplayer/matchmaking` (lobbies), `/doc/features/cloud` (Cloud), `/doc/store/application/achievements` (achievements). Account-walled in places; the public bits are enough for orientation.
- **Facepunch.Steamworks** — `https://github.com/Facepunch/Facepunch.Steamworks` — MIT, latest release April 2026.
- **Steamworks.NET** — `https://github.com/rlabrecque/Steamworks.NET` — MIT, latest release `2025.163.0` (Dec 2025), tracks SDK 1.64.
- **GodotSteam** — historical: `https://github.com/GodotSteam/GodotSteam` (archived April 4 2026). Current: **Codeberg** (link in the GitHub archive notice). MIT, supports Godot 4.6.2 + Steamworks 1.64.
- **steamworks-rs** — `https://github.com/Noxime/steamworks-rs` — Apache-2.0 OR MIT, `v0.13.0` (April 2026), tracks SDK 1.80.
- **GameNetworkingSockets (open-source slice of SDR transport, no relay access)** — `https://github.com/ValveSoftware/GameNetworkingSockets` — BSD-3-Clause. Useful for non-Steam builds; useless as a P2P-NAT solution because the relay is Steam-only.
- **Valve's GDC talks on SDR** — Fletcher Dunn, "Overwatch Gameplay Networking" (2017) and follow-up SDR talks; recordings on the GDC Vault. Background on why relayed UDP beats raw P2P in the consumer-NAT-and-DDoS world.
- **Steamworks SDK License text** — included in the SDK download as `LICENSE`. Read it once before integrating; the redistribution clauses are the part that bites people.
