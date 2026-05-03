---
type: engine
slug: unreal-enhanced-input
title: UE5 Enhanced Input — context mappings, action triggers, modifiers
engine: unreal
content_format: code
language: cpp
license: Unreal Engine EULA (engine code) / docs cited from Epic
source_url: https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine
last_analyzed: 2026-05-03
maturity: production
relevance_to_grandgames: medium
tags: [unreal, ue5, enhanced-input, input, gameplay]
---

# UE5 Enhanced Input — context mappings, action triggers, modifiers

> Unreal's modern input pipeline. Replaces the legacy `UInputComponent` axis/action-string model with asset-driven actions, stackable mapping contexts, composable modifiers, and rich triggers. Default in all UE5 templates from 5.1 onward; still the standard in 5.6.

## Why Enhanced Input replaced the legacy InputComponent

Legacy Unreal input bound string-named axes and actions inside `DefaultInput.ini`, then wired them in C++ via `BindAxis("MoveForward", ...)`. Renaming an axis broke the binding silently, contexts could not be swapped at runtime without manual gating, and there was no first-class way to compose transformations like dead-zones or per-context sensitivity. Enhanced Input separates **what triggers** (an `InputAction` asset — the abstract verb) from **what the action does** (a callback in the pawn/controller) and from **how the trigger maps to a key** (an `InputMappingContext` — pushed and popped on a runtime stack). This is essentially the same upgrade path Unity took going from the legacy `Input.GetAxis("Horizontal")` API to the new Input System package — but the UE version leans harder on the asset reference graph (no string keys at all once you adopt it) and on stackable, prioritised contexts so a vehicle/UI/gameplay overlay model is first-class instead of hand-rolled.

## Core concepts

### Input Action (`UInputAction`)

A standalone `.uasset`. Represents an abstract verb: **Jump**, **Look**, **Crouch**, **Interact**. Carries a value type (`bool`, `Axis1D`, `Axis2D`, `Axis3D`) and optional default modifiers/triggers. It does **not** know about keys — it knows only what kind of value it produces and when callbacks should fire. Per Epic's docs: "An Input Action is the communication link between Enhanced Input and your project's code." (dev.epicgames.com — Enhanced Input.)

### Input Mapping Context (`UInputMappingContext`)

A `.uasset` containing a list of `(Key → InputAction)` rows, each with its own per-row triggers and modifiers. IMCs are added to and removed from the local player's `UEnhancedInputLocalPlayerSubsystem` at runtime, with an integer **priority**. Higher-priority contexts win key conflicts. Example: a `IMC_Default` for on-foot, a `IMC_Vehicle` pushed when entering a car, a `IMC_UI` pushed at high priority when a menu opens.

### Triggers — when an action fires

Triggers describe **WHEN** the action fires given the underlying key/axis state. Built-ins per the docs:

- **Pressed** — fires once on key-down (default if no trigger is specified).
- **Released** — fires once on key-up.
- **Down** — fires every tick while the key is held.
- **Hold** — fires after the key has been held for N seconds.
- **Hold And Release** — fires on release if the hold time was met.
- **Tap** — fires on release if the press was shorter than N seconds.
- **Pulse** — fires every N seconds while held (auto-fire weapons, etc).
- **Chorded Action** — only fires while another `InputAction` is currently active (Shift+W).
- **Combo** — fires when a sequence of actions is performed in order within a window.

Triggers can be attached to the action asset (default for all mappings) or to a single row inside an IMC (override for one key on one context). Each trigger emits a sequence of **trigger events** (`ETriggerEvent::Started`, `Triggered`, `Completed`, `Canceled`, `Ongoing`) that your `BindAction` callback subscribes to — this is the key mental shift from legacy `IE_Pressed`/`IE_Released`/`IE_Repeat`.

Trigger events, in order of fire across one full press-and-release of e.g. a `Hold` trigger:

1. `Started` — the trigger left the inactive state (key just went down).
2. `Ongoing` — the trigger is evaluating but not yet satisfied (hold timer counting up).
3. `Triggered` — the trigger fired (hold time reached). Repeats for `Down`/`Pulse`.
4. `Completed` — the trigger finished cleanly (key released after hold met).
5. `Canceled` — the trigger ended without firing (key released before hold met).

### Modifiers — how the value is transformed

Modifiers transform the raw input value before the callback receives it. Built-ins:

- **Negate** — flip sign (used to map S → -1 on a forward axis).
- **Swizzle Input Axis Values** — reorder XYZ components (turn a 1D key press into the Y component of a 2D vector for WASD composition).
- **Dead Zone** — radial / axial dead-zone for analog sticks.
- **Scalar** — multiply by a constant or curve.
- **Smooth** — low-pass filter the input over time.
- **FOV Scaling** — scale mouse-look by current camera FOV (zoomed-in scope sensitivity).
- **To World Space** — re-express a local-space vector in world-space.
- **Modifier Collection** — grouping of the above as a reusable asset (5.3+).

Order matters: modifiers apply in the order listed on the row. Negate then Scalar is not the same as Scalar then Negate when the scalar is itself a curve.

## The runtime stack model

This is the part that the docs describe but few tutorials make obvious.

A local player owns a `UEnhancedInputLocalPlayerSubsystem`. The subsystem maintains an **ordered stack of active IMCs**, each with a priority integer. Every input frame:

1. The subsystem walks active contexts in priority order (highest first).
2. For each `(Key → Action)` row, if the row's triggers fire, the action's value is computed (with modifiers applied) and the action is marked **used for this frame**.
3. If a higher-priority context already consumed the key, lower-priority contexts do not see it (the default — actions are consumed per-key, not pass-through).
4. Bound C++/Blueprint callbacks receive their `FInputActionValue` and the `ETriggerEvent` phase that fired.

A context can be added with `AddMappingContext(IMC, Priority, Options)` and removed with `RemoveMappingContext(IMC)`. Options include `bIgnoreAllPressedKeysUntilRelease` to avoid stuck-held inputs leaking across a context swap. The same IMC can be added more than once at different priorities (rare, but legal — useful for split-screen where one IMC is shared but priority differs per local player).

**Concrete example** — a player driving a car while a quest dialog opens:

| Context | Priority | Owns |
|---|---|---|
| `IMC_Gameplay` | 0 | Move (WASD), Look (Mouse), Interact (E) |
| `IMC_Driving` | 10 | Throttle (W), Brake (S), Steer (A/D), Exit (F) |
| `IMC_DialogUI` | 100 | Advance (Space), Cancel (Esc), Cursor passthrough |

When the player enters the car, `IMC_Driving` is pushed at priority 10 — `W` now produces Throttle instead of Move because the higher-priority context's row consumes the key. When a dialog opens, `IMC_DialogUI` is pushed at 100 — Space advances the dialog instead of doing Jump (which it never would in this stack anyway, but Esc is now consumed and won't reach the pause menu logic). Closing the dialog removes that context; everything else is untouched. No manual `if (InMenu) return;` gates anywhere.

## C++ binding example

Per the standard pattern from Epic's "Lyra" sample and the documentation page, in your pawn/character:

```cpp
// MyCharacter.h
#include "InputActionValue.h"

UCLASS()
class GAME_API AMyCharacter : public ACharacter {
    GENERATED_BODY()

protected:
    UPROPERTY(EditDefaultsOnly, Category = "Input")
    TObjectPtr<class UInputMappingContext> DefaultMappingContext;

    UPROPERTY(EditDefaultsOnly, Category = "Input")
    TObjectPtr<class UInputAction> JumpAction;

    UPROPERTY(EditDefaultsOnly, Category = "Input")
    TObjectPtr<class UInputAction> MoveAction;

    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
    virtual void BeginPlay() override;

    void Move(const FInputActionValue& Value);
    void DoJump();
};

// MyCharacter.cpp
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"

void AMyCharacter::BeginPlay() {
    Super::BeginPlay();
    if (APlayerController* PC = Cast<APlayerController>(GetController())) {
        if (auto* Subsystem = ULocalPlayer::GetSubsystem<
                UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer())) {
            Subsystem->AddMappingContext(DefaultMappingContext, /*Priority=*/0);
        }
    }
}

void AMyCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) {
    if (auto* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent)) {
        EIC->BindAction(JumpAction, ETriggerEvent::Started,   this, &AMyCharacter::DoJump);
        EIC->BindAction(MoveAction, ETriggerEvent::Triggered, this, &AMyCharacter::Move);
    }
}

void AMyCharacter::Move(const FInputActionValue& Value) {
    const FVector2D Axis = Value.Get<FVector2D>();
    AddMovementInput(GetActorForwardVector(), Axis.Y);
    AddMovementInput(GetActorRightVector(),   Axis.X);
}

void AMyCharacter::DoJump() { Jump(); }
```

Three things to note about this pattern, all enforced by the type system:

1. The action assets are `UPROPERTY` references — rename the asset, the reference follows. No string lookup.
2. `ETriggerEvent::Started` vs `Triggered` vs `Completed` matches the trigger phase, not the key state directly.
3. `FInputActionValue` is type-tagged by the action's value type. A `bool` action's `.Get<FVector2D>()` returns zero — type mismatches are loud.

## Version timeline

| UE version | Status |
|---|---|
| 4.27 | Available as opt-in plugin (`EnhancedInput`); legacy InputComponent is the default. |
| 5.0 | Same — opt-in plugin, off by default. Lyra sample uses it and is the de-facto reference. |
| 5.1 | **Enabled by default** in all C++ and Blueprint templates. Legacy still functional. |
| 5.2 | Improved editor UI for IMC rows; `Player Mappable Key Settings` introduced (Experimental). |
| 5.3 | `UEnhancedInputUserSettings` shipped — first-class API for runtime key-rebinding UIs. Modifier Collection asset added. |
| 5.4 | Player-mappable keys cleanly span multiple IMCs; `UEnhancedPlayerInput` extension hooks. |
| 5.5 | User Settings promoted out of experimental; mappable-key save/load via SaveGame is the documented happy path. |
| 5.6 | Status (verified May 2026 via release-notes coverage and forum announcement): Enhanced Input remains the default and only recommended input pipeline. **No deprecation notices, no breaking API changes** specific to Enhanced Input in the 5.6 release notes — the headline 5.6 work was rendering (Fast Geometry Streaming, Nanite Foliage), MetaHuman GA, and Animation/Sequencer revamps. Legacy `UInputComponent` is still present but increasingly framed as carry-over only. |

## Player-mappable keys (5.3+ → GA in 5.5)

A common reason teams used to roll their own input layer was runtime key rebinding: legacy `UInputComponent` had no decent in-game "press a key to remap" UI path, so every shipping title built its own. Enhanced Input closes that gap with `UEnhancedInputUserSettings`.

The flow:

1. Mark IMC rows that should be player-mappable (checkbox in the editor) and give each one a stable `MappingName` (the rebinding system's identifier — survives key changes).
2. Register the IMC with the local player's `UEnhancedInputUserSettings` (one call from `BeginPlay` or game-instance init).
3. The user-settings object exposes `MapPlayerKey(MappingName, NewKey, FailureReason&)` — the API your settings UI calls when the player presses a new key.
4. Settings persist via the standard `USaveGame` slot — no separate ini file.
5. Multiple IMCs can share the same `MappingName`; remapping `Jump` once updates every IMC that exposes a `Jump` mapping (this is the 5.4+ improvement). Important for games with on-foot + vehicle + UI contexts that should all honour the same player choice.

Boilergen-relevant: a future `input-action` schema entry should optionally expose `mappable: true` and a `mapping_name` field, generating the player-settings registration boilerplate alongside the asset stubs.

## Blueprint vs C++ surface

Enhanced Input is symmetric across Blueprint and C++ — the same `UInputAction`/`UInputMappingContext` assets back both. Differences in practice:

- **Blueprint** — drag the action asset into the event graph, get an `EnhancedInputAction` event node with one pin per trigger phase (`Started`, `Triggered`, `Completed`, `Canceled`). The `Action Value` pin is typed automatically. Designers can prototype an entire control scheme without recompiling C++.
- **C++** — `BindAction(Action, ETriggerEvent::X, this, &Func)` per phase. The phase is explicit; the value is passed as `const FInputActionValue&`.
- **Hybrid** — common pattern: native pawn class binds the "infrastructure" actions (Move, Look, Jump, Crouch) in C++ for performance and refactor-safety; gameplay-feature plugins or designer-owned Blueprints bind the "feature" actions (Interact, UseAbility, OpenInventory) on top. Because the IMC is the single registry, both worlds see the same key map.

For Lyra-style projects this is taken further with `UGameFeatureAction_AddInputBinding` — Game Features can push their own IMCs and action bindings on the input stack at runtime, then withdraw them cleanly when the feature is deactivated. This is the modular-input story Epic recommends for any large game.

## Migration from legacy InputComponent

| Legacy concept | Enhanced Input equivalent |
|---|---|
| `DefaultInput.ini` axis/action strings | `UInputAction` assets (one per verb), `UInputMappingContext` assets (one per mode). |
| `BindAxis("MoveForward", this, &AMyChar::MoveForward)` | `EIC->BindAction(MoveAction, ETriggerEvent::Triggered, this, &AMyChar::Move)`. |
| `BindAction("Jump", IE_Pressed, this, &ACharacter::Jump)` | `EIC->BindAction(JumpAction, ETriggerEvent::Started, this, &ACharacter::Jump)`. |
| Float/bool callback parameter | `const FInputActionValue&` callback parameter; `.Get<T>()` for the typed value. |
| Per-pawn input config sprawl | Per-mode `UInputMappingContext`, pushed/popped via the local-player subsystem stack. |
| Hand-coded "if menu open, swallow input" | Push a high-priority IMC; lower-priority contexts stop seeing those keys for free. |
| String renames break silently | Asset references — rename propagates, missing reference is a hard load error. |
| Sensitivity / dead-zone / negate inline in C++ | Modifier list on the IMC row (data-driven, designer-editable). |

The asset-reference part is the headline win for refactors. Once your codebase is fully on Enhanced Input, you can grep `UInputAction*` or `UInputMappingContext*` in C++ and `Find Reference` on the asset in-editor and **see every consumer**. The legacy string pipeline could not offer this.

## Pitfalls

- **IMC priority interactions are opaque.** Two contexts mapping the same key at the same priority is undefined-ish — last-pushed tends to win, but rely on it at your peril. Spread priorities (0 / 10 / 100) and document who owns what.
- **Designer-by-asset workflow has a steeper Blueprint dependency than legacy.** A `UInputAction` is a `.uasset` reference your C++ pawn class points at — which means a content-only branch can break a code-side compile if the asset is moved/deleted. Lyra's convention is to keep input assets under `Content/Input/` with stable paths and treat them as part of the API surface.
- **Migration is a manual effort.** Epic ships **no codemod** for legacy → Enhanced Input. You re-author each axis/action as an `UInputAction`, build IMCs per gameplay mode, rewrite each `BindAxis`/`BindAction` call site, and verify trigger semantics match (legacy `IE_Pressed` ≠ `ETriggerEvent::Pressed` exactly — `Started` is what you usually want for a one-shot).
- **`FInputActionValue` is type-tagged.** Calling `.Get<float>()` on a `Axis2D` action returns the X component silently. Type mismatches don't crash; they produce wrong values. Match the action's value type in code.
- **Trigger phase confusion.** `Started` fires once at activation, `Triggered` fires every frame the trigger condition holds, `Completed` fires when it ends, `Canceled` fires on early termination. The wrong phase is the most common Enhanced Input bug — Move uses `Triggered`, Jump uses `Started`.
- **`bIgnoreAllPressedKeysUntilRelease`** when removing a context is the cure for "I held E to interact, the dialog opened, and now my Move-Forward thinks E is still down." Use it on context swaps where holds might leak.
- **Debugging is not obvious.** The console command `showdebug enhancedinput` (in PIE / packaged dev builds) overlays the live IMC stack, the resolved per-frame action values, and which trigger phase last fired. This is the fastest way to diagnose "my action just isn't firing" — usually the answer is a higher-priority context consumed the key, or the wrong trigger phase was bound. Lean on it before guessing.

## What this means for Boilergen

- **No UE plugin yet.** Per the current `ROADMAP.md`, GamesAI's Unreal coverage is RAG-only — knowledge-base entries (this one, `unreal-data-asset.md`, `unreal-version-matrix.md`) feed `ai-describe` answers; there is no `boilergen-unreal` codegen module.
- **If/when a UE plugin lands**, Enhanced Input maps very cleanly onto Boilergen's schema-driven asset generation. A schema entry type like:
  ```yaml
  - type: input-action
    name: Jump
    value_type: bool
    triggers: [Pressed]
  - type: input-action
    name: Move
    value_type: Axis2D
    triggers: [Triggered]
    modifiers: [DeadZone]
  - type: input-mapping-context
    name: IMC_Default
    bindings:
      - { key: SpaceBar, action: Jump }
      - { key: W, action: Move, modifiers: [Swizzle: YXZ] }
      - { key: S, action: Move, modifiers: [Swizzle: YXZ, Negate] }
  ```
  would generate `UInputAction` `.uasset` stubs + an `UInputMappingContext` `.uasset` + a header with the typed `UPROPERTY` references already wired — exactly the boilerplate humans get wrong (forgot the `Swizzle`, forgot the priority on `AddMappingContext`, used `Pressed` instead of `Started`).
- **For ai-describe today**, this entry is the canonical reference when a Grand Games engineer or OSS user asks "how does UE input work in 5.x" or "how do I migrate from legacy InputComponent." Keep `last_analyzed` fresh — Enhanced Input is the part of the engine most likely to gain new triggers/modifiers each minor release.

## References

- [Enhanced Input — Unreal Engine docs (5.7-current)](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine) — canonical reference; asset types, triggers, modifiers, subsystem.
- [Lyra Starter Game sample](https://dev.epicgames.com/documentation/en-us/unreal-engine/lyra-sample-game-in-unreal-engine) — production-grade Enhanced Input usage; the `Content/Input/` folder is the de-facto style guide.
- [Enhanced Input User Settings](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-user-settings-in-unreal-engine) — runtime key-rebinding API (5.3+, GA in 5.5).
- [Unreal Engine 5.6 release announcement](https://forums.unrealengine.com/t/unreal-engine-5-6-released/2538952) — confirms no Enhanced Input deprecations or breaking changes in 5.6.
- [Unreal Directive — "Enhanced Input: What you need to know"](https://unrealdirective.com/articles/enhanced-input-what-you-need-to-know/) — accessible community write-up; useful for new-team onboarding.
- Related entries in this knowledge base: [`unreal-data-asset.md`](./unreal-data-asset.md) (where the `UInputAction` asset model fits in the wider data-asset story), [`unreal-version-matrix.md`](./unreal-version-matrix.md) (engine-version compatibility table).
