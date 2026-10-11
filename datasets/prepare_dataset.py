from datasets import load_dataset, concatenate_datasets


DATASET_NAME = "textdetox/multilingual_toxicity_dataset"

LANGUAGES = [
    "en",
    "hi",
    "hin",
]


print("Loading selected languages...")

datasets = []

for language in LANGUAGES:
    print(f"Loading: {language}")

    dataset = load_dataset(
        DATASET_NAME,
        split=language
    )

    # Add language information
    dataset = dataset.map(
        lambda example: {
            "language": language
        }
    )

    datasets.append(dataset)


print("\nCombining datasets...")

combined_dataset = concatenate_datasets(datasets)

print("\nFinal dataset:")
print(combined_dataset)

print("\nNumber of examples:")
print(len(combined_dataset))

print("\nColumns:")
print(combined_dataset.column_names)

print("\nFirst 10 examples:")

for example in combined_dataset.select(range(10)):
    print(example)