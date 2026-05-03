---
type: engine
slug: unity-animation-systems
title: Unity animation systems — Mecanim, Playables, Animation Rigging, Timeline
engine: unity
content_format: code
language: csharp
license: Unity Companion License / docs
source_url: https://docs.unity3d.com/Manual/AnimationOverview.html
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: medium
tags: [unity, mecanim, animator, playables, animation-rigging, timeline]
---

# Unity animation systems — Mecanim, Playables, Animation Rigging, Timeline

> Unity does not have **one** animation system in 2026 — it has four that
> coexist, overlap, and are chosen per use case. Mecanim is the high-level
> Animator state machine most teams start with; Playables is the lower-level
> graph API the same Animator is built on; Animation Rigging adds procedural
> constraints (IK, look-at, aim) on top of either; Timeline sequences clips,
> cinemachine cuts, audio and game-event signals into authored beats. Knowing
> which to reach for is the actual skill.

## 1. The four-system reality

A modern Unity character that aims a weapon, plays a hit-react, and triggers
a cinematic finisher will touch all four systems in one frame:

| System | Layer | Authored in | Runtime owner |
|---|---|---|---|
| Mecanim | high-level state machine | Animator window | `Animator` component |
| Playables API | low-level graph | C# code | `PlayableGraph` |
| Animation Rigging | procedural constraints | inspector + RigBuilder | `RigBuilder` component |
| Timeline | sequencing / cinematics | Timeline window | `PlayableDirector` component |

Mecanim **uses** Playables under the hood — the Animator state machine
compiles to a `PlayableGraph` at runtime. Animation Rigging **inserts**
constraint playables into that same graph after the Animator's output. Timeline
**owns its own graph** via `PlayableDirector` and can drive an Animator track,
which in turn replaces the Animator's normal state machine output for the
duration of the clip. Understanding this layering is what stops teams from
fighting the framework when, for example, an Animation Rigging constraint
"doesn't apply during a Timeline cinematic."

## 2. Mecanim — the default starting point

The Animator window is the high-level UI most teams meet first: states,
transitions, blend trees, parameters. It is the right tool when behaviour is
**state-shaped** — locomotion, weapon poses, hit reactions, mount/dismount.

Minimal setup:

```csharp
using UnityEngine;

public class PlayerLocomotion : MonoBehaviour {
    [SerializeField] private Animator animator;
    private static readonly int Speed = Animator.StringToHash("Speed");
    private static readonly int IsGrounded = Animator.StringToHash("IsGrounded");

    void Update() {
        animator.SetFloat(Speed, GetPlanarSpeed());
        animator.SetBool(IsGrounded, GroundCheck());
    }
}
```

Strengths:

- **Designer-readable.** The state machine graph is the design doc.
- **BlendTrees** handle direction/speed blending without code.
- **Sub-state machines** and **layers** support upper-body / lower-body splits.
- Integrates cleanly with humanoid retargeting (Avatar system).

Pitfalls (the real ones):

- **Hidden state explosion.** Any non-trivial character grows to 40+ states
  with crossing transitions; the graph becomes unreadable. Discipline (or
  layers + sub-state machines) is the only fix.
- **"Why won't it transition."** Transition conditions, exit-time, interruption
  source, transition duration, and current-frame parameter values all
  interact. The Animator window has a live debugger but it is hard to use at
  scale — see Pitfalls section.
- **Runtime cost.** Mecanim's per-frame overhead is higher than a hand-tuned
  Playables graph because it evaluates the entire state machine, transitions,
  and blend trees even when only one clip is actually playing.
- **String-based parameters.** Use `Animator.StringToHash` and cache; never
  pass raw strings each frame.

## 3. Playables API — drop down when Mecanim is in your way

The Playables API is the underlying graph: nodes (`Playable`s) connected to
outputs (`PlayableOutput`s), all owned by a `PlayableGraph`. For animation
specifically, an `AnimationPlayableOutput` writes onto an `Animator`.

Minimal example — play a single clip without a controller:

```csharp
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

public class PlayOneClip : MonoBehaviour {
    [SerializeField] private Animator animator;
    [SerializeField] private AnimationClip clip;
    private PlayableGraph graph;

    void Start() {
        graph = PlayableGraph.Create("PlayOneClip");
        var output = AnimationPlayableOutput.Create(graph, "Animation", animator);
        var clipPlayable = AnimationClipPlayable.Create(graph, clip);
        output.SetSourcePlayable(clipPlayable);
        graph.Play();
    }

    void OnDestroy() {
        if (graph.IsValid()) graph.Destroy();
    }
}
```

When to drop down to Playables:

- You need **fully data-driven** animation (clips chosen from a server payload,
  no Animator Controller asset to maintain).
- You want to **mix** N clips with weights you compute yourself (custom blend
  logic Mecanim's BlendTree can't express).
- You're building a **tool** (replay system, animation preview, cutscene
  authoring) where the state machine abstraction is in the way.
- You measured Mecanim overhead and need to cut it (rare for character work,
  more common for crowd / background actor systems).

Trade-offs:

- **No designer UI.** Everything is code or your own editor tooling.
- **Docs are thin** — the official Manual covers the API surface; community
  sources (Unity Forum threads, GitHub samples) fill the gaps.
- **Manual lifecycle.** You own `PlayableGraph.Destroy()`; leaks bite.

## 4. Animation Rigging — procedural constraints (Unity 2019.1+)

The Animation Rigging package adds **constraint components** that run as
animation jobs after the Animator's output. As of 2026 the current line is
`com.unity.animation.rigging` 1.3.x for Unity 2023.2 and later (verify against
your Unity 6.x package manifest).

Common constraints:

- **TwoBoneIKConstraint** — two-bone IK solver for hands, feet (foot-IK on
  uneven ground, hand-on-weapon-grip).
- **MultiAimConstraint** — chain of bones aim at a target (head/chest look-at,
  weapon barrel tracking).
- **ChainIKConstraint** — N-bone IK (spines, tails, tentacles).
- **OverrideTransform** — blend-overwrite a bone's TR/S.
- **DampedTransform** — secondary motion (cloth-like or follow-through).
- **MultiPositionConstraint / MultiRotationConstraint / MultiParentConstraint**
  — weighted blend of several reference transforms.

Setup is `RigBuilder` on the root GameObject, one or more `Rig` GameObjects as
children, and constraint components under each Rig.

Minimal code-side setup of a foot-IK constraint:

```csharp
using UnityEngine;
using UnityEngine.Animations.Rigging;

[RequireComponent(typeof(RigBuilder))]
public class FootIKSetup : MonoBehaviour {
    [SerializeField] private Rig rig;
    [SerializeField] private TwoBoneIKConstraint leftFootIK;
    [SerializeField] private Transform leftFootTarget;
    [SerializeField] private LayerMask groundMask;

    void LateUpdate() {
        if (Physics.Raycast(leftFootTarget.position + Vector3.up,
                            Vector3.down, out var hit, 2f, groundMask)) {
            leftFootTarget.position = hit.point;
            leftFootTarget.rotation = Quaternion.LookRotation(
                Vector3.ProjectOnPlane(leftFootTarget.forward, hit.normal),
                hit.normal);
            leftFootIK.weight = 1f;
        } else {
            leftFootIK.weight = 0f;
        }
    }
}
```

Real-world uses for an RP / shooter game:

- **Foot-IK on stairs and slopes** so feet plant correctly.
- **Aim look-at** so the upper body and head track the crosshair without
  bespoke aim animations per direction.
- **Lean-on-cover** — one-frame lean delta the locomotion clips don't carry.
- **Two-handed weapon grip** — left hand IK to a weapon-mounted target so a
  single one-handed reload anim works for any weapon model.

## 5. Timeline — sequencing and cinematics

Timeline is the director track system. A `PlayableDirector` component plays a
`TimelineAsset` containing tracks:

- **Animation track** — drives an Animator binding with clips.
- **Cinemachine track** — cuts between virtual cameras.
- **Audio track** — plays AudioClips on an AudioSource binding.
- **Activation track** — toggles GameObject active.
- **Signal track** — fires `SignalEmitter` markers that a `SignalReceiver` on
  any GameObject can route to a UnityEvent.
- **Control track** — nests another PlayableDirector or a particle system.
- **Custom playable tracks** — your own.

Triggering a Timeline from gameplay code:

```csharp
using UnityEngine;
using UnityEngine.Playables;

public class FinisherTrigger : MonoBehaviour {
    [SerializeField] private PlayableDirector finisher;

    public void Play() {
        finisher.time = 0;
        finisher.Play();
    }
}
```

Signal emitters are the standard way to fire game events at frame-accurate
points inside a cinematic — damage application, VFX spawn, sub-quest state
change. Hook them with a `SignalReceiver` component on the same GameObject as
the director and route each signal to a UnityEvent in the inspector.

## 6. Decision tree — which system for which job

| Use case | Reach for |
|---|---|
| Player locomotion blend (idle/walk/run/sprint) | **Mecanim** BlendTree |
| Weapon state (idle/aim/fire/reload) | **Mecanim** layer with masks |
| Hit reactions, dodges, finishers | **Mecanim** transitions, optionally **Timeline** for the finisher |
| Foot planting on uneven ground | **Animation Rigging** TwoBoneIK |
| Head/upper-body aim at crosshair | **Animation Rigging** MultiAim |
| Cinematic intro / outro / quest beats | **Timeline** + Cinemachine |
| Frame-accurate "deal damage at this frame" inside a cinematic | **Timeline** SignalEmitter |
| Crowd / NPC background animation at scale | **Playables API** direct |
| Replay / animation preview tool | **Playables API** direct |
| Server-driven emote system (clip name from network) | **Playables API** with `AnimationClipPlayable` |
| Non-humanoid procedural motion (tails, spines, ropes) | **Animation Rigging** ChainIK / DampedTransform |

## 7. Mobile constraints

Animation is one of the larger per-frame costs on mid-range Android. Notes
that matter for the Grand Mobile / mobile-MP target:

- **Mecanim GC pressure.** Transition evaluation can allocate if you pass
  string parameter names every frame. Always cache `Animator.StringToHash`
  results into `static readonly int` fields. Profile with the deep profiler;
  garbage from animation parameter setters is a common surprise.
- **Playables memory budget.** Each `PlayableGraph` and each clip playable
  carries fixed overhead. For pooled NPCs, share one graph per pool slot
  rather than per-instance.
- **Animation Rigging cost at scale.** Constraint jobs are Burst-compiled and
  fast individually, but a crowd of 50 NPCs each running foot-IK + aim is
  measurable. Disable rigs (`Rig.weight = 0` or disable the `RigBuilder`) on
  off-screen / distant NPCs.
- **Humanoid vs Generic rig.** Humanoid retargeting is convenient but adds
  per-frame retargeting cost. For mobile crowd actors, generic rigs are
  cheaper if you don't need cross-skeleton retargeting.
- **Animator culling mode.** Set `Animator.cullingMode =
  AnimatorCullingMode.CullCompletely` for distant background actors so they
  don't evaluate when off-camera — easy win.
- **Timeline at runtime** is heavier than direct Playables for short
  sequences; reserve it for authored cinematics, not gameplay-frequent loops.

## 8. Verify in 2026

Spot checks worth running before quoting any specific behaviour:

- **Unity 6.x LTS Animator changes.** As of 2026-05 verification against
  the live Unity 6.4 manual, Mecanim is documented as supported (no
  deprecation banner) and continues to be presented as the high-level
  animation entry point. The "Mecanim is being deprecated" rumour resurfaces
  every couple of years on Unity Forum and Reddit; treat it as **not true
  today** but recheck the Unity Multiplayer Center / Performance roadmap
  before betting a multi-year project on the Animator API surface.
- **Animation Rigging package version.** Official docs as of 2026-05 list
  `com.unity.animation.rigging` 1.3.1 as compatible with Unity Editor 2023.2+.
  Confirm against your project's Package Manager — Unity 6.x ships with newer
  patch versions and occasional API additions.
- **Playables stability.** The Playables API has been stable for several
  releases; new playable types occasionally land but the core graph contract
  hasn't shifted.
- **Timeline.** Stable. Watch for occasional changes to the runtime mutation
  API surface.

WebFetch targets when re-verifying:

- `https://docs.unity3d.com/Manual/AnimationOverview.html` — top-level
  animation manual (current version banner is the easy tell).
- `https://docs.unity3d.com/Packages/com.unity.animation.rigging@latest/manual/index.html` — current Animation Rigging manual.
- `https://docs.unity3d.com/Manual/Playables.html` — Playables overview.
- Unity blog posts tagged `animation` and `unity6`.

## 9. What Boilergen could do

A `unity-character` schema entry type could emit a coherent character setup
with all four systems wired together — this is one of the most repetitive
boilerplate areas in Unity character authoring:

- **AnimatorController stub** — a layered controller with Locomotion (blend
  tree), UpperBody (aim/fire/reload masks), and Reaction (hit-react)
  sub-state machines, parameters declared, transitions wired.
- **Animation Rigging RigBuilder** — a Rig GameObject preconfigured with
  TwoBoneIK foot constraints (left/right) and a MultiAim look-at on the
  upper-body chain, with target Transforms wired to placeholder names.
- **Timeline director** — an empty `TimelineAsset` with placeholder Animation,
  Cinemachine, Audio, and Signal tracks bound to the character — a
  ready-to-author finisher / intro slot.
- **C# wrappers** — the `static readonly int` parameter hash boilerplate, an
  `IFootIKDriver` and `IAimDriver` so designers can swap implementations.

Priority is **low** (this is not where the wedge is) but **feasibility is
high** — the artefacts are pure YAML/`.asset`/scene serialisation that
Boilergen can template the same way it does ScriptableObject definitions
today. Consider after RP module work and after the `unity-character` schema
itself exists.

## 10. Pitfalls

- **Mecanim debugger is hard to use at scale.** The Animator window's live
  state highlight and parameter inspector are fine for a 5-state controller
  and useless for a 40-state one. Build a runtime overlay (`OnGUI` or UI
  Toolkit) that prints current state per layer and the last few transitions
  with their trigger conditions — fastest single quality-of-life win for any
  team shipping a complex character.
- **Playables API has poor docs.** The official Manual covers the surface;
  community sources (Unity Forum threads, GitHub samples like UnityTechnologies
  Playables samples) fill the gaps. Expect to read source.
- **Animation Rigging breaks if rig hierarchy is mutated after build.**
  `RigBuilder.Build()` snapshots the bone hierarchy. If you reparent bones at
  runtime (procedural attachment, weapon swap that re-parents an arm), the
  constraints evaluate stale references — re-build the rig (`RigBuilder.Build()`
  again) after the hierarchy change.
- **Timeline runtime mutation API is awkward.** Adding/removing tracks or
  clips from a `TimelineAsset` at runtime is possible (`TimelineAsset.CreateTrack`,
  `TrackAsset.CreateClip`) but requires rebuilding the director's playable
  graph (`PlayableDirector.RebuildGraph()`). Most teams pre-author multiple
  TimelineAssets and swap whole assets rather than mutate one.
- **Layer weights vs Avatar masks.** Forgetting to set an Avatar mask on an
  upper-body layer is the single most common "why is my whole body T-posing
  during reload" cause.
- **Root motion and CharacterController don't mix automatically.** If you
  drive movement with `CharacterController.Move`, set
  `Animator.applyRootMotion = false` or apply root motion manually in
  `OnAnimatorMove`.

## 11. References

- Unity Manual — Animation: <https://docs.unity3d.com/Manual/AnimationOverview.html>
- Unity Manual — Playables: <https://docs.unity3d.com/Manual/Playables.html>
- Unity Manual — Timeline: <https://docs.unity3d.com/Packages/com.unity.timeline@latest>
- Animation Rigging package: <https://docs.unity3d.com/Packages/com.unity.animation.rigging@latest/manual/index.html>
- Unity Learn — Timeline tracks tutorial series (search "Timeline" on
  learn.unity.com).
- Unite / GDC talks worth searching: "Animation Rigging" (Unite
  Copenhagen 2019 introduced the package; later Unite talks covered foot-IK
  and crowd patterns), "Playables API deep dive" (multiple Unite years).
- Community: Unity Forum `Animation` subforum and the
  `UnityTechnologies/Playables` GitHub samples repo for Playables idioms the
  Manual omits.

---

*License note:* This entry paraphrases public Unity documentation under the
Unity Companion License and adds original commentary on usage trade-offs and
mobile constraints. No engine source is reproduced.
