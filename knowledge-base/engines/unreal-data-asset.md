---
type: engine
slug: unreal-data-asset
title: Unreal DataAsset & DataTable Pattern
genre: any
engine: unreal
content_format: binary (.uasset) + CSV import
language: cpp
license: n/a (Unreal engine)
source_url: https://dev.epicgames.com/documentation/en-us/unreal-engine/data-driven-gameplay-elements-in-unreal-engine
last_analyzed: 2026-05-01
maturity: production
relevance_to_grandgames: medium
tags: [unreal, data-asset, datatable, csv, primary-asset, cpp, blueprints]
---

# Unreal DataAsset & DataTable Pattern

> Unreal's two-headed answer to data-driven content. **`UPrimaryDataAsset`** is class-derived (one asset = one entity, like Unity's ScriptableObject). **`UDataTable`** is row-based (one asset = many rows of a struct, like a CSV imported into the engine). Most production teams use both for different use cases.

## What it is

### UPrimaryDataAsset

A C++ class derived from `UPrimaryDataAsset`, with `UPROPERTY` reflection driving serialization, the editor UI, and the Asset Manager:

```cpp
UCLASS(BlueprintType)
class GAME_API UWeaponDefinition : public UPrimaryDataAsset {
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString DisplayName;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    int32 Damage = 0;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    float FireRate = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    UTexture2D* Icon = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, AssetBundles = "UI")
    TSoftObjectPtr<USkeletalMesh> WorldMesh;
};
```

Designers create instances in the editor (right-click → Miscellaneous → Data Asset → choose `WeaponDefinition`). Each instance is a `.uasset` file. The Asset Manager (`UAssetManager`) coordinates loading these by ID.

### UDataTable

A row-based asset where each row is an instance of a `USTRUCT`:

```cpp
USTRUCT(BlueprintType)
struct FWeaponRow : public FTableRowBase {
    GENERATED_BODY()
    UPROPERTY(EditAnywhere) FString DisplayName;
    UPROPERTY(EditAnywhere) int32 Damage = 0;
    UPROPERTY(EditAnywhere) float FireRate = 0.0f;
};
```

The asset is a single `.uasset` containing many rows, each addressable by `RowName` (an `FName`). DataTables can be imported from CSV or JSON, making them friendlier to spreadsheet workflows.

### When each is right

- **DataAsset** — when each entity is "a thing" with rich references (meshes, sounds, behavior trees). One per file. Often used for hero/boss/major item definitions.
- **DataTable** — when you have many similar rows (loot tables, stat curves, dialog lines, item catalogs). One file with hundreds of rows. Excel-friendly.

Many studios use both: DataAssets for unique content (hero classes), DataTables for arrays (loot drops, level XP curves).

## Why it exists

Same problem ScriptableObject solves on Unity: separate designer-editable data from C++ class definitions. Unreal's wrinkle: `UPROPERTY` reflection is tighter than Unity's serialization, with built-in support for soft references (`TSoftObjectPtr`), Asset Bundles (lazy loading subsets), and the Asset Manager's batch APIs.

DataTable specifically exists because Japanese studios (and many Western ones) live in Excel. The CSV/JSON import path lets balance designers work in their existing tools, then push to the game.

## Where it's used

- **Fortnite** — extensive use of both. Cosmetics catalog, weapon stats, quest definitions all driven by DataAssets and DataTables.
- **Borderlands 4** — same pattern.
- **Tekken 8** — character roster, move lists.
- **Epic's Lyra sample** — the canonical reference for "modern Unreal best practices." Read the source if you want to see DataAsset done right.

## Tradeoffs

### Strengths
- ✅ Reflection-driven editor UI for free (just add `UPROPERTY`)
- ✅ DataAsset Bundle support — load subsets without loading everything
- ✅ DataTable's CSV import is excellent for spreadsheet workflows
- ✅ Asset Manager gives you batch loading APIs

### Weaknesses
- ❌ **`.uasset` is binary.** Even worse for git than Unity's binary assets — diffs are unreadable, merges impossible, large files. Some teams enable text serialization (`*.uasset` becomes JSON-like) but it's still Unreal-specific.
- ❌ **C++ + UPROPERTY metadata is verbose.** The above 30-line class would be 8 lines in Unity. Unreal has Blueprint as an alternative, but Blueprint-defined DataAssets create their own merge problems.
- ❌ **Asset Manager has steep onboarding.** You configure Primary Asset Types, register classes, define Asset Bundles — significant complexity for a feature that's optional.
- ❌ **Hot-reload is shaky.** Live++ helps with C++ classes but data-asset changes still often require editor restart.

### The CSV escape hatch

For DataTables specifically, the CSV import path is the workflow most teams converge on:
1. Balance designers maintain a Google Sheet
2. Export to CSV (`comma-separated`, `tab-separated`, or JSON)
3. Re-import into Unreal (auto-updates the DataTable asset)

This sidesteps the binary `.uasset` merge problem for tabular content. **Boilergen fits this layer naturally** — generate CSV from YAML, drop into Unreal's import folder.

## How it informs Boilergen

A future `unreal-data-asset` plugin target could emit:

### Option A — DataAsset (one file per entity)

1. **Generate the `UCLASS` C++ header**:
   ```cpp
   UCLASS(BlueprintType)
   class GAME_API U{{pascalCase type}}_{{pascalCase id}} : public UPrimaryDataAsset {
       GENERATED_BODY()
   public:
       UPROPERTY(EditAnywhere) FString Id = TEXT("{{id}}");
       UPROPERTY(EditAnywhere) FString DisplayName = TEXT("{{name}}");
       // generated fields based on schema.data
   };
   ```

2. **Generate import-ready JSON or text-serialized .uasset**. Path B (CSV) is cleaner if the entity fits a row shape.

### Option B — DataTable rows (one CSV with all entities)

For batch content (all weapons in one file, all professions in another):

1. **Generate one `USTRUCT` definition** describing the row shape
2. **Generate or update a CSV** appending one row per Boilergen-managed entity
3. Unreal's auto-import updates the DataTable

This is **the simpler integration** — designers' existing CSV/Excel workflow, plus Boilergen-generated rows for tooling.

### Recommendation

Lead with the CSV/DataTable path. It's:
- Less Unreal-specific (CSV is universal)
- Easier git workflow (text diffs)
- Familiar to balance designers (Excel-native)
- One round-trip in Unreal (auto-import on file change)

The full DataAsset path is more powerful but only worth doing for studios that have specific needs (per-entity rich asset references, lazy loading via Asset Bundles).

## Anti-patterns to surface

- **Logic in DataAssets.** Same as ScriptableObject — don't put `Fire()` on `WeaponDefinition`. Logic in `AActor`/`UComponent` that *references* the DataAsset.
- **One mega-DataTable for everything.** A 5,000-row `MasterContentTable` becomes a hot file with constant merge conflicts. Split by content type.
- **Hand-editing CSV exported from a DataTable.** The DataTable is the source of truth, not the CSV. Edit in Unreal or in Excel-then-reimport, not both.
- **Soft references in DataTable rows that point to other DataTable rows.** Works but creates load-order coupling. Either denormalize, or use DataAssets where soft references are first-class.

## References

- **[Unreal — Data Asset Manager Overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-management-in-unreal-engine)** — start here for DataAsset / Asset Manager
- **[Data-Driven Gameplay Elements in Unreal](https://dev.epicgames.com/documentation/en-us/unreal-engine/data-driven-gameplay-elements-in-unreal-engine)** — covers DataTable
- **[DataTables in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/datatables-in-unreal-engine)**
- **[Lyra Sample Game source](https://dev.epicgames.com/documentation/en-us/unreal-engine/lyra-sample-game-in-unreal-engine)** — Epic's canonical "how to do it right" reference

## See also

- [`engines/unity-scriptable-object.md`](./unity-scriptable-object.md) — Unity's analogous pattern
- [`patterns/data-driven-content.md`](../patterns/data-driven-content.md) — the umbrella philosophy
- [`patterns/component-based-design.md`](../patterns/component-based-design.md) — what holds the data
