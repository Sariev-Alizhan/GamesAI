---
type: engine
slug: unity-addressables
title: Unity Addressables — async asset loading, content delivery, version migration
engine: unity
content_format: code
language: csharp
license: Unity Companion License (engine package) / docs from Unity
source_url: https://docs.unity3d.com/Packages/com.unity.addressables@latest
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: high
tags: [unity, addressables, asset-bundles, async, mobile, content-delivery]
---

# Unity Addressables — async asset loading, content delivery, version migration

> Notes on Unity's Addressables package as it exists in 2026 — what it
> actually does, the mobile content-delivery use case that matters for
> Grand Mobile, the memory-management discipline that catches every team
> at least once, and the realistic CDN options for the Russian market.
> Sourced from public Unity docs only.

## What Addressables is, vs Resources / AssetBundles

Addressables is Unity's modern asynchronous asset-loading and
content-delivery system. It sits one layer above the legacy AssetBundles
API and replaces the old `Resources` folder workflow. The current
package is **`com.unity.addressables` 2.11.x** (verified 2026-05-03 via
[docs.unity3d.com](https://docs.unity3d.com/Packages/com.unity.addressables@latest));
the 2.x line is the one to use on Unity 2022 LTS, Unity 6, and newer.
1.x is end-of-life for new projects but still ships in older codebases.

Compared to the predecessors:

- **`Resources/` folder** — synchronous load, everything ends up in the
  initial build, no eviction. Fine for prototypes, ruinous for mobile
  where install size matters.
- **AssetBundles (raw API)** — async and bundleable, but you hand-roll
  the manifest, dependency graph, version negotiation, caching, and
  load-handle bookkeeping. Worked, but every studio reinvented the same
  wheel and got the edge cases wrong.
- **Addressables** — wraps AssetBundles with a content catalog,
  per-asset addresses (string keys), labels, groups, profiles
  (local/remote/build paths), and an async handle API with reference
  counting. You opt into the complexity you need; common cases are a
  few lines.

The package is under the **Unity Companion License** (same as the
engine), so it's free to use under the standard Unity terms.

## Core concepts

The vocabulary is small but worth pinning down because the docs
overload the words "asset", "bundle", and "group".

- **Address** — a string key for a single asset. Default is the asset's
  path (`Assets/Heroes/Knight.prefab`) but you can rename it to anything
  (`hero/knight`).
- **Label** — a tag you attach to assets so you can load by category
  (`Addressables.LoadAssetsAsync<Sprite>("ui-icons", ...)`). Many
  assets, one label.
- **AssetReference** — a serializable struct field on a MonoBehaviour
  or ScriptableObject that the editor lets you drag-drop an addressable
  asset into. Type-safe (`AssetReferenceT<GameObject>`,
  `AssetReferenceTexture2D`). The runtime equivalent of "I know which
  asset I want at design time but I want async loading."
- **Group** — the build-time bucket that determines how assets are
  packed into bundles and where they're delivered from (local vs
  remote). Groups have a schema that controls compression, bundle mode
  (pack-together / pack-separately / pack-by-label), and content update
  behaviour.
- **Content catalog** — the JSON+hash file that maps every address to
  the bundle that contains it, plus dependency info. Ships with the
  build for local content, fetched from the CDN for remote content.
- **Profiles** — named sets of variables for local-build-path,
  local-load-path, remote-build-path, remote-load-path. You typically
  have a `Default` (local everything) and a `Production` profile that
  points the remote paths at your CDN URL.
- **AsyncOperationHandle / AsyncOperationHandle&lt;T&gt;** — the handle
  returned by every Addressables load call. Carries the ref-count, the
  loaded result, status, and is what you must release when done.
- **`Addressables.LoadAssetAsync<T>`** — the workhorse load API. Takes
  an address (string), label, or AssetReference; returns a handle.
- **ResourceManager** — the lower-level subsystem under Addressables
  that owns the actual bundle/asset cache and ref-counting. You rarely
  call it directly, but it's what's leaking when "Addressables is
  leaking."

## The mobile use case (critical for Grand Mobile)

This is the single most important Addressables story for a Russian
mobile market wedge:

- Ship a small initial APK / IPA — only the content needed for the
  tutorial, first session, and core UI.
- Mark everything else (later levels, character skins, event content,
  localized voice-over) as **remote** in its Addressables Group.
- At first launch (or on demand mid-session), the game fetches the
  content catalog from your CDN, then downloads only the bundles
  required for what the player is about to do.
- Live ops can publish new content (skins, events, balancing data
  packed as ScriptableObjects) by re-uploading changed bundles + a new
  catalog. **No store re-submission, no Apple / Google review delay.**

For a mobile multiplayer game the practical result is:

- Initial install drops from "hundreds of MB" to "tens of MB" — the
  first-launch cliff in Russian-market install funnels (slow LTE,
  cautious Wi-Fi tap-to-download prompt) gets dramatically smaller.
- Per-region content variants: an `ru` label vs `en` label, the
  catalog only resolves the bundles needed for the device locale.
- Hot-fixable data — if balancing is in a ScriptableObject loaded via
  Addressables, you can patch it without a binary release. (Combine
  with [unity-scriptable-object.md](unity-scriptable-object.md).)

Caveat: stores still have policies on remote-loaded **executable code**
(IL2CPP can't JIT, and on iOS especially you cannot ship code via
remote bundles). Remote Addressables is for **content** — meshes,
textures, audio, animations, prefabs, ScriptableObjects — not gameplay
DLLs. Stick to that and you're fine.

## Cloud Content Delivery (CCD) and the Russian-market constraint

Unity's official hosted CDN is **Cloud Content Delivery (CCD)**,
integrated with the Unity Dashboard. Drag-and-drop bundle uploads,
release / promote workflow, baked into the Editor. For a studio in a
permissive market it's the path of least resistance.

But CCD's edge is on Unity's own infrastructure, which historically
overlaps Azure / partner clouds, and a number of Unity Gaming Services
have been intermittently affected by sanctions / payment-rail issues
in the Russian market. **For Grand Games the safer defaults are:**

- **Cloudflare R2** — S3-compatible API, zero egress fees, Cloudflare
  has held up reasonably well for Russian-market reachability. Point
  Addressables remote-load-path at your R2 public URL; upload bundles
  with any S3 client.
- **AWS S3 + CloudFront** — works, but CloudFront edge in Russia is
  thin and S3 egress is metered. Acceptable for global games where
  Russia is one of many markets.
- **OCI Object Storage** (Oracle) — surprisingly viable, generous free
  tier, S3-compatible.
- **Self-hosted nginx / static file server** — for small studios this
  is a fine starting point. Addressables doesn't care; it's just HTTPS
  GETs of bundle files.

Whatever you pick, the Addressables side is identical: set the
`RemoteLoadPath` profile variable to your bucket / CDN URL, build the
content for production profile, and rsync / `aws s3 cp` the
`ServerData/<platform>/` output up.

## Asset memory lifecycle — the discipline that catches everyone

This is the **#1 source of "memory leak in build" tickets** with
Addressables. The rule is simple, the application is unforgiving:

> Every `LoadAssetAsync`, `LoadAssetsAsync`, `InstantiateAsync`,
> `LoadSceneAsync` call returns a handle. **You own that handle.** If
> you don't release it, Addressables holds the bundle forever.

Reference counting is automatic but not magical. The pattern:

```csharp
public class HeroLoader : MonoBehaviour
{
    public AssetReferenceT<GameObject> heroRef;

    private AsyncOperationHandle<GameObject> heroHandle;

    private async void OnEnable()
    {
        heroHandle = heroRef.LoadAssetAsync<GameObject>();
        var prefab = await heroHandle.Task;
        Instantiate(prefab, transform);
    }

    private void OnDisable()
    {
        if (heroHandle.IsValid())
            Addressables.Release(heroHandle);
    }
}
```

The footguns:

- **Forgetting `Release` on scene unload** — bundle stays resident,
  every scene reload doubles the memory. Use `OnDisable` /
  `OnDestroy`, or scene-tied lifetime managers.
- **Releasing too eagerly** — if two systems both loaded the same
  address, ref-count is 2, releasing once is correct. Releasing twice
  from one system unloads it from under the other.
- **`InstantiateAsync` + plain `Destroy()`** — see next section, this
  is the most common variant of the leak.

`Addressables.ClearDependencyCacheAsync(...)` exists for nuclear
"throw away cached bundle data on disk" scenarios, but day-to-day
discipline is just: load → release.

## AssetReference vs direct `Addressables.LoadAssetAsync`

Both work. The choice is about who knows the address.

**AssetReference** — designer/editor knows.

- Field on a MonoBehaviour or ScriptableObject:
  `public AssetReferenceT<GameObject> bossPrefab;`
- Editor shows a drag-drop slot constrained to addressable
  GameObjects.
- Type-safe at compile time, can't typo an address string.
- Addressables marks the asset addressable for you when you drop it
  in.
- **Use when** the link is design-time and won't change at runtime —
  hero prefabs, weapon icons, level scenes wired into a level
  manifest.

**Direct `Addressables.LoadAssetAsync<T>("address-string")`** —
runtime knows.

- The address comes from data: a server response, a player choice, a
  procedurally generated content key.
- No editor drag-drop, no compile-time check that the address exists.
- **Use when** the set of possible addresses is open-ended or
  data-driven — daily-event content, user-selected cosmetics from a
  catalog, modding support.

A typical project ends up with both: AssetReference for the static
spine of the game, direct loads for live-ops content keyed off the
backend.

## Build flow

The standard Addressables build pipeline:

1. **Per-platform content build** — `Window → Asset Management →
   Addressables → Groups → Build → New Build → Default Build Script`,
   or via `AddressableAssetSettings.BuildPlayerContent()` from a
   custom script. Outputs to `ServerData/<platform>/` (remote groups)
   and `Library/com.unity.addressables/aa/<platform>/` (local
   groups). One build per target platform — Android, iOS, WebGL,
   Standalone are all separate.
2. **Upload remote bundles to CDN** — `aws s3 sync`, `rclone`, or the
   CCD CLI, depending on host. Catalog goes up too.
3. **Build the player binary** — picks up the local groups and embeds
   the catalog URL pointing at your CDN.
4. **Ship binary** to store. Players install, game launches, fetches
   catalog from CDN, downloads remote bundles on demand.

Delta updates: the **Update a Previous Build** workflow generates
only the bundles whose contents changed since the last build, plus a
new catalog. Re-upload only those, players download only the diff.
This is what makes "live content patch" cheap.

CI/CD integration: there is a build-script API
(`AddressableAssetSettings.BuildPlayerContent` and friends) but the
docs are thin and the build-step ordering versus the player build is
fiddly. Most studios end up with a custom Editor script invoked from
a CI job. Plan a day for it.

## Common pitfalls

The repeating list, in roughly the order projects hit them:

- **Forgetting `Release` → memory leak.** Covered above; the lifecycle
  pattern in `OnEnable / OnDisable` (or coroutine / async-scope
  equivalents) catches 90% of cases.
- **`Addressables.InstantiateAsync` + plain `Destroy()`** — the
  instance-async API tracks the handle on the spawned GameObject. Plain
  `Destroy()` removes the GameObject but leaves the handle ref-count.
  **You must call `Addressables.ReleaseInstance(go)`** which both
  releases the handle and destroys the object. This is the single most
  common shape of the leak in real projects.
- **CI/CD integration is fiddly.** Build-script API exists but is not
  well-documented; expect to write and maintain your own Editor
  bootstrap script. Order matters: addressable content build *before*
  player build, with the right active profile.
- **Bundle-size strategy: pack-together vs pack-separately.**
  Pack-together = one big bundle per group, fewer HTTP requests, but a
  one-asset patch redownloads everything. Pack-separately = one bundle
  per asset, granular patches, but catalog bloats and per-asset HTTP
  overhead hurts on cold start. Pack-by-label is the usual middle
  ground (one bundle per label, e.g. `chapter-1`, `chapter-2`).
- **Sync wait on async load.** `WaitForCompletion()` exists but blocks
  the main thread; on a cold cache it can stall for seconds. Use only
  for boot-time critical loads where you've made a deliberate choice.
- **Scenes loaded via Addressables** behave slightly differently from
  `SceneManager.LoadScene` — release the scene handle to unload, don't
  rely on Unity's normal scene unload semantics.
- **Editor "Use Asset Database" play mode masks bugs.** The fast
  iteration mode skips the bundle layer; switch to "Use Existing
  Build" or "Simulate Groups" before declaring something works.

## What Boilergen could do (future)

Speculative, low priority — flagged for the roadmap not the current
sprint.

A future schema entry type — call it `asset-group` — could declare an
addressables group and the AssetReference fields a generated
component should expose. Schema sketch:

```yaml
type: asset-group
name: HeroRoster
group_settings:
  bundle_mode: pack-by-label
  remote: true
  labels: [hero, gameplay]
references:
  - field: heroPrefab
    asset_type: GameObject
  - field: heroPortrait
    asset_type: Sprite
```

The generator would emit a ScriptableObject definition with typed
`AssetReferenceT<>` fields plus an Editor script that creates the
matching addressables group with the right schema. This stays well
inside the no-final-art rule (it generates **wiring**, not assets) and
saves a class of boilerplate every Unity team writes.

Not on the near-term roadmap — Grand Games' first three modules
(boilergen / localization-assistant / schema-validator) take priority,
and Addressables tooling needs the engine-side schema work first.
Logged here so the option is documented.

## References

- [Unity Addressables 2.x manual](https://docs.unity3d.com/Packages/com.unity.addressables@latest) —
  current package documentation; verified 2026-05-03 at version 2.11.x.
- [Addressables package in the Unity Manual](https://docs.unity3d.com/Manual/com.unity.addressables.html) —
  engine-side overview and version compatibility table.
- [Cloud Content Delivery docs](https://docs.unity.com/ugs/manual/ccd/manual/) —
  Unity Gaming Services CCD, the official hosted option.
- [Unity Learn — Get started with Addressables](https://learn.unity.com/tutorial/get-started-with-addressables) —
  intro tutorial, current as of Unity 6.
- GDC talks (referenced from public Unity blog posts; verify before
  citing in production decisions): Unity has presented on
  Addressables at GDC and Unite multiple times between 2019 and 2024,
  generally framed as "from AssetBundles to Addressables" or live-ops
  content-delivery case studies.
- Cross-reference inside this knowledge base:
  [unity-version-matrix.md](unity-version-matrix.md),
  [unity-mobile-multiplayer.md](unity-mobile-multiplayer.md),
  [unity-scriptable-object.md](unity-scriptable-object.md).
