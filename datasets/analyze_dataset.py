from datasets import load_dataset, concatenate_datasets


DATASET_NAME = "textdetox/multilingual_toxicity_dataset"

LANGUAGES = ["en", "hi", "hin"]


print("Loading datasets...")

datasets = []

for language in LANGUAGES:
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


print("\n========== DATASET SUMMARY ==========")

print(f"Total examples: {len(combined_dataset)}")

print("\nColumns:")
print(combined_dataset.column_names)


# -----------------------------------
# Language distribution
# -----------------------------------

print("\n========== LANGUAGE DISTRIBUTION ==========")

language_counts = {}

for example in combined_dataset:
    language = example["language"]

    if language not in language_counts:
        language_counts[language] = 0

    language_counts[language] += 1


for language, count in language_counts.items():
    print(f"{language}: {count}")


# -----------------------------------
# Toxicity distribution
# -----------------------------------

print("\n========== TOXICITY DISTRIBUTION ==========")

toxic_count = 0
non_toxic_count = 0

for example in combined_dataset:

    if example["toxic"] == 1:
        toxic_count += 1
    else:
        non_toxic_count += 1


print(f"Non-toxic: {non_toxic_count}")
print(f"Toxic:     {toxic_count}")


# -----------------------------------
# Percentage
# -----------------------------------

total = len(combined_dataset)

print("\n========== PERCENTAGE ==========")

print(
    f"Non-toxic: {(non_toxic_count / total) * 100:.2f}%"
)

print(
    f"Toxic: {(toxic_count / total) * 100:.2f}%"
)