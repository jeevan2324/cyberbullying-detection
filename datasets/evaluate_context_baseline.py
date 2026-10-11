import pandas as pd
import torch

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification
)

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)


MODEL_NAME = "textdetox/xlmr-large-toxicity-classifier-v2"

TEST_PATH = "datasets/custom/contextual_test.csv"


print("Loading contextual test dataset...")

df = pd.read_csv(TEST_PATH)

print(f"Test examples: {len(df)}")


print("\nLoading tokenizer...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)


print("Loading model...")

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME
)

model.eval()


device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

model.to(device)

print(f"\nUsing device: {device}")


def predict(text):

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=256
    )

    inputs = {
        key: value.to(device)
        for key, value in inputs.items()
    }

    with torch.no_grad():

        outputs = model(**inputs)

        probabilities = torch.softmax(
            outputs.logits,
            dim=-1
        )

        prediction = torch.argmax(
            probabilities,
            dim=-1
        ).item()

    return prediction


print("\nRunning predictions...")

predictions = []

for text in df["text"]:

    prediction = predict(text)

    predictions.append(prediction)


true_labels = df["toxic"].tolist()


print("\n========== CONTEXTUAL BASELINE ==========")

accuracy = accuracy_score(
    true_labels,
    predictions
)

print(f"Accuracy: {accuracy:.4f}")


print("\n========== CLASSIFICATION REPORT ==========")

print(
    classification_report(
        true_labels,
        predictions,
        target_names=[
            "Non-toxic",
            "Toxic"
        ],
        zero_division=0
    )
)


print("\n========== CONFUSION MATRIX ==========")

print(
    confusion_matrix(
        true_labels,
        predictions
    )
)


print("\n========== LANGUAGE RESULTS ==========")

for language in ["en", "hi", "hin"]:

    language_indices = [
        i
        for i, value in enumerate(df["language"])
        if value == language
    ]

    language_true = [
        true_labels[i]
        for i in language_indices
    ]

    language_predictions = [
        predictions[i]
        for i in language_indices
    ]

    language_accuracy = accuracy_score(
        language_true,
        language_predictions
    )

    print(
        f"{language}: "
        f"Accuracy={language_accuracy:.4f}"
    )


print("\n========== MISCLASSIFIED EXAMPLES ==========")

for i in range(len(df)):

    if true_labels[i] != predictions[i]:

        print("\nText:", df.iloc[i]["text"])
        print("Language:", df.iloc[i]["language"])
        print("Expected:", true_labels[i])
        print("Predicted:", predictions[i])
        print("Category:", df.iloc[i]["category"])
        print("Context:", df.iloc[i]["context"])