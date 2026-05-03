---
type: engine
slug: unity-ngo-deep-dive
title: Netcode for GameObjects 2.x — deep dive (NetworkVariable, RPCs, NetworkPrefabs, Relay)
engine: unity
content_format: code
language: csharp
license: MIT (Unity NGO is MIT)
source_url: https://docs-multiplayer.unity3d.com/netcode/current
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: critical
tags: [unity, ngo, netcode-for-gameobjects, multiplayer, networkbehaviour, relay]
---

# Netcode for GameObjects 2.x — deep dive

> Snapshot of NGO 2.x as of 2026-05-03. NGO is the default networking
> library for **Flump** (the in-house mobile FPS on Unity 6.3 LTS) and
> for any GamesAI codegen plugin that targets Unity multiplayer without
> a Photon dependency. This entry exists so AI Describe sessions and
> Claude Code agents stop inventing NGO APIs that don't exist (notably:
> there is no built-in CSP, no built-in lag compensation, and no host
> migration — generated code that pretends otherwise is wrong).

## 1. Version status (verified 2026-05-03)

- Latest stable: **NGO v2.11.2**, released **2026-05-01** (player-prefab
  assignment fix). Source: [GitHub releases](https://github.com/Unity-Technologies/com.unity.netcode.gameobjects/releases).
- Recent 2.x cadence: 2.11.0 (2026-03-23), 2.10.0 (2026-03-05), 2.9.x
  (Feb 2026), 2.8.x (Jan 2025) — roughly one minor every six weeks.
- Package id: `com.unity.netcode.gameobjects`. Editor support: **Unity
  2022.3 LTS and newer**, first-class on **Unity 6.0 / 6.1 / 6.3 LTS**
  (Flump ships against 6.3). License: MIT.
- Distinct from "Netcode for Entities" (`com.unity.netcode`, DOTS/ECS) —
  different package, different APIs. Do not confuse the two when
  generating code.

> When AI Describe is asked "what NGO version do we target?", the answer
> is **2.11.x** unless `manifest.json` pins older. Read it, don't assume.

## 2. NetworkBehaviour lifecycle

`NetworkBehaviour` is the base class every networked component derives
from. It replaces `MonoBehaviour` for spawn-aware logic. The lifecycle
is **not** the same as MonoBehaviour's `Awake` / `OnEnable` / `Start`,
and getting this wrong causes the single most common NGO bug: reading
`NetworkObject.OwnerClientId` before it's valid.

```csharp
using Unity.Netcode;
using UnityEngine;

public class PlayerController : NetworkBehaviour
{
    public override void OnNetworkSpawn()
    {
        // Called on server AND every client AFTER NetworkObject is registered
        // and ownership is assigned. Safe to read OwnerClientId, IsOwner,
        // IsServer, IsHost, IsClient here — NOT in Awake/Start.
        if (IsOwner)
        {
            // Local input wiring: bind camera, enable input action map.
        }
        if (IsServer)
        {
            // Server-only init: spawn weapon, write initial NetworkVariables.
        }
    }

    public override void OnNetworkDespawn()
    {
        // Called before NetworkObject is destroyed/despawned, on every peer
        // that had it spawned. Unsubscribe from NetworkVariable events here
        // to avoid leaks across scene transitions.
    }

    public override void OnGainedOwnership()
    {
        // Called when ownership transfers TO this peer at runtime
        // (NetworkObject.ChangeOwnership). Also fires after OnNetworkSpawn
        // for the initial owner. Use to enable local-only systems
        // (input, prediction-buffer, IK solver).
    }

    public override void OnLostOwnership()
    {
        // Called when ownership transfers AWAY. Tear down owner-only systems.
        // Don't assume IsOwner here — by the time this fires, IsOwner is false.
    }
}
```

Ordering rules:

- `Awake` / `OnEnable` fire **before** spawn. `IsSpawned` is false, NGO
  state is invalid — don't touch it.
- `OnNetworkSpawn` fires after the spawn message is processed.
  `IsSpawned` is true and ownership flags are valid from here on.
- `OnGainedOwnership` fires **after** `OnNetworkSpawn` for the initial
  owner — pick one entry point, don't duplicate work between the two.

## 3. NetworkVariable<T> patterns

`NetworkVariable<T>` is the per-instance synchronised value. Default
write permission is **Server**; default read is **Everyone**. Both can
be tightened on construction.

```csharp
public class PlayerHealth : NetworkBehaviour
{
    // Server-authoritative health. Default writePerm = Server, readPerm = Everyone.
    public NetworkVariable<int> Health = new NetworkVariable<int>(100);

    // Owner-writable cosmetic state (e.g. selected emote). Use sparingly —
    // owner-write means the client can lie. Validate elsewhere if it matters.
    public NetworkVariable<int> SelectedEmote = new NetworkVariable<int>(
        value: 0,
        readPerm: NetworkVariableReadPermission.Everyone,
        writePerm: NetworkVariableWritePermission.Owner);

    public override void OnNetworkSpawn()
    {
        Health.OnValueChanged += HandleHealthChanged;
        // IMPORTANT: subscribe AFTER spawn, unsubscribe in OnNetworkDespawn.
    }

    public override void OnNetworkDespawn()
    {
        Health.OnValueChanged -= HandleHealthChanged;
    }

    private void HandleHealthChanged(int previous, int current)
    {
        // Fires on EVERY peer (server + all clients), including the writer.
        // Use it for VFX, UI, audio — not for game logic that must run once.
    }

    [Rpc(SendTo.Server)]
    public void TakeDamageRpc(int amount)
    {
        // Server-authoritative mutation. Never decrement Health.Value
        // directly from a client — client-write is rejected by NGO when
        // writePerm is Server, and owner-write is still cheatable.
        if (!IsServer) return;
        Health.Value = Mathf.Max(0, Health.Value - amount);
    }
}
```

Custom serialisation for non-blittable types uses
`UserNetworkVariableSerialization<T>` (NGO 2.x) — register a
serialise / deserialise / duplicate triple at boot:

```csharp
[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
private static void RegisterCustomSerializers()
{
    UserNetworkVariableSerialization<MyStruct>.WriteValue = MyStruct.Write;
    UserNetworkVariableSerialization<MyStruct>.ReadValue = MyStruct.Read;
    UserNetworkVariableSerialization<MyStruct>.DuplicateValue = MyStruct.Duplicate;
}
```

For structs implementing `INetworkSerializable`, NGO auto-resolves
serialisation via source generators — no registration needed. Use
`FixedString32Bytes` / `FixedString64Bytes` (from `Unity.Collections`)
instead of `string` — `string` boxes and is bandwidth-noisy.

## 4. RPCs — unified [Rpc] attribute (NGO 2.0+)

NGO 2.0 introduced the unified `[Rpc]` attribute that subsumes both
`[ServerRpc]` and `[ClientRpc]`. The legacy attributes still work for
backwards compatibility, but new code should use `[Rpc]`.

```csharp
public class WeaponFire : NetworkBehaviour
{
    // === Unified [Rpc] (NGO 2.0+, recommended for new code) ===

    [Rpc(SendTo.Server)]
    private void RequestFireRpc(Vector3 origin, Vector3 direction)
    {
        // Runs on the server. By default RequireOwnership = true for
        // SendTo.Server, so only the owner client can invoke this.
    }

    [Rpc(SendTo.NotOwner)]
    private void PlayMuzzleFlashRpc()
    {
        // Runs on every peer EXCEPT the owner (the owner already fired
        // the local VFX). Useful for cosmetic broadcast.
    }

    [Rpc(SendTo.Everyone)]
    private void AnnounceKillRpc(ulong victimId)
    {
        // Runs on server + all clients including the caller.
    }

    [Rpc(SendTo.SpecifiedInParams)]
    private void WhisperRpc(string text, RpcParams rpcParams = default)
    {
        // Recipient set at call site:
        //   WhisperRpc("hi", RpcTarget.Single(targetClientId, RpcTargetUse.Temp));
    }

    [Rpc(SendTo.Server, RequireOwnership = false)]
    private void AdminCommandRpc(string cmd)
    {
        // Override the default ownership requirement. Be deliberate —
        // RequireOwnership = false means ANY client can invoke. Validate
        // sender authority server-side using ServerRpcParams or by
        // checking RpcParams.Receive.SenderClientId against your own
        // admin list.
    }

    // === Legacy attributes (still supported, do not mix in new code) ===

    [ServerRpc]
    private void LegacyServerRpc() { /* runs on server, owner-only by default */ }

    [ClientRpc]
    private void LegacyClientRpc() { /* runs on every client */ }
}
```

`SendTo` targets: `Server`, `NotServer`, `Owner` / `NotOwner`, `Me`
(local-only), `Everyone` / `NotMe`, `SpecifiedInParams` (defer to
runtime `RpcParams`).

Default `RequireOwnership` is **true** for server-targeted RPCs (legacy
`[ServerRpc]` and `[Rpc(SendTo.Server)]` alike). Set
`RequireOwnership = false` only deliberately — forgetting this is a
cheat surface. Do **not** mix `[ServerRpc]` and `[Rpc]` on the same
method; the unified `[Rpc]` requires the `Rpc` suffix on the method
name (not `ServerRpc` / `ClientRpc`).

## 5. NetworkPrefabsList registration

NGO 2.x registers spawnable prefabs through a **NetworkPrefabsList**
ScriptableObject referenced by NetworkManager. The legacy inline
"Network Prefabs" list on NetworkManager is deprecated; use the asset.

```text
Assets/
  Networking/
    NetworkPrefabsList.asset      // ScriptableObject, references prefabs
    Prefabs/
      Player.prefab               // root must have NetworkObject component
      Bullet.prefab
      LootDrop.prefab
```

Setup Boilergen should generate:

1. Create `NetworkPrefabsList` via `Assets > Create > Netcode > Network Prefabs List`.
2. Drag every spawnable prefab into the list.
3. Assign to `NetworkManager.NetworkConfig.Prefabs.NetworkPrefabsLists`.
4. Each prefab root needs a `NetworkObject` component and a stable
   `GlobalObjectIdHash` (Unity auto-assigns; do not copy-paste-rename
   prefab GUIDs).

Runtime spawn:

```csharp
var go = Instantiate(bulletPrefab);
go.GetComponent<NetworkObject>().Spawn(destroyWithScene: true);
// For player-owned objects:
go.GetComponent<NetworkObject>().SpawnAsPlayerObject(clientId);
// For ownership-transferred objects:
go.GetComponent<NetworkObject>().SpawnWithOwnership(clientId);
```

Common mistake: client `Instantiate`-ing and expecting the server to
know. Spawning is **server-only** — client requests via RPC, server
calls `.Spawn()`.

## 6. Connection approval and player object spawning

Connection approval lets the server validate joining clients (auth,
version, ban-list) before the player object exists. Enable
`NetworkConfig.ConnectionApproval = true` and register a callback.

```csharp
public class ServerBootstrap : MonoBehaviour
{
    [SerializeField] private NetworkManager networkManager;
    [SerializeField] private GameObject playerPrefab;

    private void Start()
    {
        networkManager.NetworkConfig.ConnectionApproval = true;
        networkManager.ConnectionApprovalCallback = ApproveConnection;
    }

    private void ApproveConnection(
        NetworkManager.ConnectionApprovalRequest request,
        NetworkManager.ConnectionApprovalResponse response)
    {
        // request.Payload = bytes the client sent in NetworkConfig.ConnectionData
        // Validate auth token, build version, region, etc.
        var token = System.Text.Encoding.UTF8.GetString(request.Payload);
        bool ok = AuthService.Validate(token);

        response.Approved = ok;
        response.CreatePlayerObject = ok;        // NGO will SpawnAsPlayerObject for you
        response.PlayerPrefabHash = null;        // null = use NetworkConfig default player prefab
        response.Position = SpawnPoints.Pick();
        response.Rotation = Quaternion.identity;
        response.Reason = ok ? null : "auth_failed"; // surfaced to client on disconnect
    }
}
```

If `CreatePlayerObject = false` (e.g. spectator-first), spawn the
player object yourself later via `NetworkManager.SpawnManager.InstantiateAndSpawn`.

## 7. Relay / Lobby / Multiplayer Services (UGS) integration

Unity Gaming Services (UGS) provides the canonical NAT-traversal and
matchmaking layer for NGO on mobile. The three relevant services:

- **Relay** — relayed peer-to-peer transport so mobile clients behind
  CGNAT can host without port-forwarding. Free up to a generous monthly
  cap; metered after.
- **Lobby** — pre-match room state, player list, ready check.
- **Matchmaker** / **Multiplay Hosting** — server-orchestrated match
  pools (replaces the deprecated Multiplay; see
  [unity-mobile-multiplayer.md](unity-mobile-multiplayer.md) §"Multiplay is dead").

Relay handshake (host side):

```csharp
using Unity.Services.Authentication;
using Unity.Services.Core;
using Unity.Services.Relay;
using Unity.Services.Relay.Models;
using Unity.Netcode.Transports.UTP;

public async Task<string> StartHostAsync(int maxPlayers)
{
    await UnityServices.InitializeAsync();
    if (!AuthenticationService.Instance.IsSignedIn)
        await AuthenticationService.Instance.SignInAnonymouslyAsync();

    Allocation alloc = await RelayService.Instance.CreateAllocationAsync(maxPlayers);
    string joinCode = await RelayService.Instance.GetJoinCodeAsync(alloc.AllocationId);

    var relayServer = new RelayServerData(alloc, "dtls"); // or "wss" for WebGL
    NetworkManager.Singleton.GetComponent<UnityTransport>().SetRelayServerData(relayServer);
    NetworkManager.Singleton.StartHost();
    return joinCode; // share with joiners out-of-band (Lobby, push, QR)
}
```

Mobile rules: use **DTLS** transport on iOS/Android (UDP+encryption,
survives carrier NAT); **wss** only for WebGL. Initialise UGS **once**
per process — re-init leaks tokens. Sign in anonymously for prototypes
but switch to Apple/Google/custom before launch — anonymous IDs don't
survive reinstalls.

Alternatives when UGS doesn't fit: **Edgegap** for dedicated-server
hosting (replaces Multiplay); **Photon Realtime** as a relay if already
on Photon elsewhere; self-hosted **TURN** + your own match list if RU
data-residency rules out UGS.

## 8. Anti-cheat: server-authoritative defaults

NGO is **server-authoritative by default** — server holds canonical
state, clients predict and render. The defaults get this right; bugs
come from developers loosening them.

Mistakes to flag in review (and refuse to generate):

- `NetworkVariable<T>` with `writePerm: Owner` for anything
  economy-relevant (currency, inventory, kill count). Owner-write
  means the client can lie.
- `[Rpc(SendTo.Server, RequireOwnership = false)]` without an
  explicit `SenderClientId` authority check. Any client can call.
- Trusting client-supplied positions in damage RPCs. The server must
  re-validate that the shooter could plausibly hit the target —
  distance check, line-of-sight raycast on the server's authoritative
  transform, weapon cooldown enforced server-side.
- Spawning prefabs from a client — clients cannot call `.Spawn()`,
  but they can request via RPC; the server still must validate cost
  / cooldown / inventory.
- Storing currency in `PlayerPrefs` and trusting it on connect —
  store on the server, fetch from your backend on session start.

NGO ships **no built-in anti-cheat**. Pair with the stack in
[unity-mobile-multiplayer.md](unity-mobile-multiplayer.md) §"Anti-cheat
for mobile" (Code Stage ACT, ByteProtector, server-side validation).
For shooters, also pair with FishNet-style lag compensation written
yourself — NGO's official samples demonstrate the pattern but ship no
turnkey component.

## 9. Mobile-specific NGO

Flump (Unity 6.3 LTS, NGO 2.11.x, 5v5 mobile FPS) operates inside
these budgets — they are starting points, profile against your title:

- **Tick rate:** `NetworkConfig.TickRate = 30` for action games on
  mobile. 60 doubles bandwidth and CPU for ~15-20% perceived
  smoothness gain — not worth it on cellular. 20 is fine for slower
  co-op.
- **Bandwidth budget:** target **<= 25 KB/s/client** average,
  **<= 50 KB/s** spike, on a 5v5. Above that, Russian/Kazakh 4G users
  start dropping packets.
- **Packet loss tolerance:** assume **3-8% loss** on mobile baselines,
  spikes to 20% on metro/transit. NGO's reliable channel handles
  retransmit; design RPC frequency so a 200 ms RTT spike doesn't
  cascade into a 2 s perceived freeze.
- **NetworkTransform interpolation:** keep `Interpolate = true` for
  remote players — extrapolation on NGO is naive and rubber-bands
  visibly on jittery mobile links.
- **Battery / thermals:** every Update-tick RPC costs joules. Batch
  cosmetic state into one RPC per second, not one per frame.
- **NetworkVariable churn:** avoid setting a `NetworkVariable<T>`
  every frame — each write is a delta sync. For frequently-changing
  state (position, rotation), use NetworkTransform; for everything
  else, set on change only.

## 10. Patterns from the Boss Room sample

[Boss Room](https://github.com/Unity-Technologies/com.unity.multiplayer.samples.coop)
is Unity's official 4-player vertical-slice co-op RPG built on NGO. It
is licensed under the **Unity Companion License** — reference-only,
**do not vendor** code into Boilergen output. Cite as architectural
inspiration.

Patterns worth borrowing (re-implement, do not copy):

- **Server-authoritative character actions** via an `Action` queue —
  the client sends an intent RPC, the server validates and broadcasts
  the resulting `Action` for all clients to play VFX/anim from a
  shared deterministic timeline. This isolates "did the action
  happen" (server) from "how does it look" (client).
- **Connection state machine** — Offline / Connecting / Connected /
  ClientReconnecting — replaces ad-hoc bools scattered across UI.
- **NetworkObject pooling** for projectiles / VFX prefabs to avoid
  per-spawn GC churn on mobile.
- **Anticipation pattern** — clients play a "pre-attack" anim
  immediately on input, server response either confirms (continues
  the anim) or cancels (interrupts to idle). Mitigates the visible
  RTT on mobile without claiming to be CSP.
- **Scene management via `NetworkSceneManager`** — never call
  `SceneManager.LoadScene` directly while a session is live; route
  through NGO so all peers transition together.

## 11. Common pitfalls

These are the bugs that recur in NGO codebases and the ones AI
Describe should call out in review:

1. **NetworkObject parent reparenting at runtime** — only allowed
   between `NetworkObject`-bearing parents, and only on the server.
   Reparenting under a non-networked transform throws and
   desynchronises clients. To reparent under a non-networked object,
   despawn-and-respawn instead.
2. **Scene transitions with active sessions** — using
   `SceneManager.LoadScene` instead of
   `NetworkManager.SceneManager.LoadScene` desynchronises clients
   silently. The server loads, clients don't.
3. **No host migration** — when the host disconnects, the session
   ends. NGO does **not** migrate. Design around it: dedicated server,
   short matches, or in-app reconnect-and-rejoin flow with state
   persisted server-side.
4. **No built-in CSP / lag compensation** — NGO is honest about this.
   Generated code that claims `[ClientPredicted]` or "rollback support"
   is fabricating an API. Use FishNet (see
   [fish-networking.md](fish-networking.md)) if you need built-in CSP,
   or implement the hit-rewind pattern yourself with snapshot history.
5. **`IsOwner` checked in `Awake`** — always false there. Move the
   check to `OnNetworkSpawn`.
6. **`NetworkObject.Spawn()` called on a client** — silently fails
   (or throws in 2.11+). Spawning is server-only.
7. **NetworkVariable subscribed in `Start`** — the variable may not
   have its first value yet, and you'll miss the initial sync. Subscribe
   in `OnNetworkSpawn`, unsubscribe in `OnNetworkDespawn`.
8. **Mixing `[ServerRpc]` and `[Rpc]` on overloads** — the source
   generator gets confused. Pick one attribute family per type.
9. **Forgetting `RequireOwnership = false` for admin/global RPCs** —
   non-owner calls will be silently rejected. Either set the flag and
   validate `SenderClientId`, or put the RPC on a server-owned object.
10. **`string` in `NetworkVariable<T>`** — works but is wasteful.
    Use `FixedString*` from `Unity.Collections`.
11. **Forgetting to assign the player prefab** — fixed in 2.11.2 to
    log instead of crash, but older 2.x versions silently fail to spawn
    the player object. Always set NetworkConfig.PlayerPrefab or use
    `ConnectionApprovalResponse.PlayerPrefabHash`.

## References

- Official docs: [docs-multiplayer.unity3d.com/netcode/current](https://docs-multiplayer.unity3d.com/netcode/current)
- Package manual: [docs.unity3d.com/Packages/com.unity.netcode.gameobjects@latest](https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@latest/)
- Source + releases: [github.com/Unity-Technologies/com.unity.netcode.gameobjects](https://github.com/Unity-Technologies/com.unity.netcode.gameobjects)
- Boss Room sample (UCL, reference only): [github.com/Unity-Technologies/com.unity.multiplayer.samples.coop](https://github.com/Unity-Technologies/com.unity.multiplayer.samples.coop)
- Unity Discussions netcode forum: [discussions.unity.com/c/multiplayer-networking](https://discussions.unity.com/c/multiplayer-networking)
- GDC talks on Unity netcode (search GDC Vault for "Netcode for GameObjects").
- Cross-references in this knowledge base:
  [unity-mobile-multiplayer.md](unity-mobile-multiplayer.md),
  [fish-networking.md](fish-networking.md),
  [unity-version-matrix.md](unity-version-matrix.md).

## Honest gaps in NGO

NGO 2.x is the right default for Unity multiplayer when you want
Unity-supported, MIT-licensed, UGS-integrated networking. It is **not**
the right default when:

- You need **client-side prediction in the box** — use FishNet, or
  Photon Fusion 2.
- You need **server-side lag compensation in the box** — same
  recommendation.
- You need **deterministic rollback** for competitive 1v1/team — use
  Photon Quantum 3.
- You need **host migration** — write a custom backend or use a
  dedicated-server model.
- You need **>50 CCU per server** for an action title — NGO scales,
  but FishNet's snapshot encoder is cheaper at scale per the
  StinkySteak benchmarks; profile both.

For Flump's 5v5 mobile FPS, NGO + UGS Relay + Edgegap dedicated servers
+ Code Stage ACT is the chosen stack, and that combination is what
GamesAI codegen plugins should target by default unless the project
config says otherwise.
