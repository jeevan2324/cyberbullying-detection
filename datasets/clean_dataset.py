from datasets import load_dataset, concatenate_datasets


DATASET_NAME = "textdetox/multilingual_toxicity_dataset"

LANGUAGES = ["en", "hi", "hin"]


print("Loading datasets...")

datasets = []

for language in LANGUAGES:

    print(f"Loading: {language}")

    dataset = load_dataset(
        DATASET_NAME,
        split=language
    )

    dataset = dataset.map(
        lambda example: {
            "language": language
        }
    )

    datasets.append(dataset)


combined_dataset = concatenate_datasets(datasets)


print(f"\nOriginal dataset size: {len(combined_dataset)}")


# Convert to pandas for easier cleaning
df = combined_dataset.to_pandas()


# -----------------------------------------
# 1. Remove missing text
# -----------------------------------------

print("\nChecking missing text...")

before = len(df)

df = df.dropna(subset=["text"])

after = len(df)

print(f"Removed: {before - after}")


# -----------------------------------------
# 2. Remove empty text
# -----------------------------------------

print("\nChecking empty text...")

before = len(df)

df["text"] = df["text"].astype(str).str.strip()

df = df[df["text"] != ""]

after = len(df)

print(f"Removed: {before - after}")


# -----------------------------------------
# 3. Validate labels
# -----------------------------------------

print("\nChecking labels...")

valid_labels = [0, 1]

before = len(df)

df = df[df["toxic"].isin(valid_labels)]

after = len(df)

print(f"Removed invalid labels: {before - after}")


# -----------------------------------------
# 4. Remove exact duplicate text
# -----------------------------------------

print("\nRemoving duplicate text...")

before = len(df)

df = df.drop_duplicates(
    subset=["text"],
    keep="first"
)

after = len(df)

print(f"Removed duplicates: {before - after}")


# -----------------------------------------
# 5. Reset index
# -----------------------------------------

df = df.reset_index(drop=True)


# -----------------------------------------
# 6. Display final information
# -----------------------------------------

print("\n========== CLEAN DATASET ==========")

print(f"Final examples: {len(df)}")

print("\nLanguage distribution:")

print(df["language"].value_counts())


print("\nToxicity distribution:")

print(df["toxic"].value_counts())


# -----------------------------------------
# 7. Save dataset
# -----------------------------------------

output_path = "datasets/processed/toxicity_clean.csv"

df.to_csv(
    output_path,
    index=False
)


print("\nDataset saved to:")

print(output_path)