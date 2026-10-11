import pandas as pd


FILE_PATH = "datasets/custom/contextual_dataset.csv"


print("Loading custom dataset...")

df = pd.read_csv(FILE_PATH)


print("\n========== BASIC INFORMATION ==========")

print(f"Total examples: {len(df)}")

print("\nColumns:")
print(df.columns.tolist())


required_columns = [
    "text",
    "language",
    "toxic",
    "category",
    "context"
]

missing_columns = [
    column
    for column in required_columns
    if column not in df.columns
]

if missing_columns:
    print("\nERROR: Missing columns:")
    print(missing_columns)
    raise SystemExit(1)

print("\nAll required columns are present.")


print("\n========== EMPTY VALUES ==========")

print(df[required_columns].isnull().sum())


print("\n========== LABEL DISTRIBUTION ==========")

print(df["toxic"].value_counts())


print("\n========== LANGUAGE DISTRIBUTION ==========")

print(df["language"].value_counts())


print("\n========== CATEGORY DISTRIBUTION ==========")

print(df["category"].value_counts())


print("\n========== CONTEXT DISTRIBUTION ==========")

print(df["context"].value_counts())


print("\n========== DUPLICATES ==========")

duplicates = df["text"].duplicated().sum()

print(f"Duplicate texts: {duplicates}")


invalid_labels = df[
    ~df["toxic"].isin([0, 1])
]

print("\nInvalid labels:", len(invalid_labels))


print("\n========== VALIDATION COMPLETE ==========")

if (
    len(missing_columns) == 0
    and df[required_columns].isnull().sum().sum() == 0
    and invalid_labels.empty
    and duplicates == 0
):
    print("Dataset validation PASSED.")
else:
    print("Dataset validation needs attention.")