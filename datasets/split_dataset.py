import pandas as pd
from sklearn.model_selection import train_test_split


INPUT_PATH = "datasets/processed/toxicity_clean.csv"

TRAIN_PATH = "datasets/processed/train.csv"
VALIDATION_PATH = "datasets/processed/validation.csv"
TEST_PATH = "datasets/processed/test.csv"


print("Loading cleaned dataset...")

df = pd.read_csv(INPUT_PATH)

print(f"Total examples: {len(df)}")


# ------------------------------------------------
# Create a combined stratification column
# ------------------------------------------------

df["stratify_group"] = (
    df["language"].astype(str)
    + "_"
    + df["toxic"].astype(str)
)


# ------------------------------------------------
# First split:
# 70% training
# 30% temporary
# ------------------------------------------------

train_df, temp_df = train_test_split(
    df,
    test_size=0.30,
    random_state=42,
    stratify=df["stratify_group"]
)


# ------------------------------------------------
# Second split:
# 15% validation
# 15% test
# ------------------------------------------------

validation_df, test_df = train_test_split(
    temp_df,
    test_size=0.50,
    random_state=42,
    stratify=temp_df["stratify_group"]
)


# ------------------------------------------------
# Remove helper column
# ------------------------------------------------

train_df = train_df.drop(columns=["stratify_group"])
validation_df = validation_df.drop(columns=["stratify_group"])
test_df = test_df.drop(columns=["stratify_group"])


# ------------------------------------------------
# Save datasets
# ------------------------------------------------

train_df.to_csv(TRAIN_PATH, index=False)
validation_df.to_csv(VALIDATION_PATH, index=False)
test_df.to_csv(TEST_PATH, index=False)


# ------------------------------------------------
# Display results
# ------------------------------------------------

print("\n========== SPLIT SUMMARY ==========")

print(f"Training:   {len(train_df)}")
print(f"Validation: {len(validation_df)}")
print(f"Test:       {len(test_df)}")


print("\n========== TRAINING DISTRIBUTION ==========")

print(train_df.groupby(["language", "toxic"]).size())


print("\n========== VALIDATION DISTRIBUTION ==========")

print(validation_df.groupby(["language", "toxic"]).size())


print("\n========== TEST DISTRIBUTION ==========")

print(test_df.groupby(["language", "toxic"]).size())


print("\nFiles saved successfully:")
print(TRAIN_PATH)
print(VALIDATION_PATH)
print(TEST_PATH)