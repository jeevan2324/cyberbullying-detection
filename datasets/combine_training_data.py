import pandas as pd


TRAIN_PATH = "datasets/processed/train.csv"
CUSTOM_PATH = "datasets/custom/context_batch_01.csv"
OUTPUT_PATH = "datasets/processed/train_v1.csv"


print("Loading original training data...")

train_df = pd.read_csv(TRAIN_PATH)

print(f"Original training examples: {len(train_df)}")


print("\nLoading contextual dataset...")

custom_df = pd.read_csv(CUSTOM_PATH)

print(f"Contextual examples: {len(custom_df)}")


# Keep the columns required for model training
custom_df = custom_df[
    ["text", "language", "toxic"]
]


print("\nCombining datasets...")

combined_df = pd.concat(
    [train_df, custom_df],
    ignore_index=True
)


print(f"Before duplicate removal: {len(combined_df)}")


# Remove duplicate text
combined_df = combined_df.drop_duplicates(
    subset=["text"],
    keep="first"
)


combined_df = combined_df.reset_index(drop=True)


print(f"After duplicate removal: {len(combined_df)}")


# Save
combined_df.to_csv(
    OUTPUT_PATH,
    index=False
)


print("\n========== FINAL TRAINING DATA ==========")

print(f"Total examples: {len(combined_df)}")

print("\nLanguage distribution:")
print(combined_df["language"].value_counts())

print("\nToxicity distribution:")
print(combined_df["toxic"].value_counts())


print("\nSaved to:")
print(OUTPUT_PATH)