import pandas as pd
import torch

from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix
)


MODEL_NAME = "textdetox/xlmr-large-toxicity-classifier-v2"

TEST_PATH = "datasets/processed/test.csv"


print("Loading test dataset...")

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


# --------------------------------------------------
# Prediction function
# --------------------------------------------------

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


# --------------------------------------------------
# Run predictions
# --------------------------------------------------

print("\nRunning predictions...")

predictions = []

for index, text in enumerate(df["text"]):

    prediction = predict(text)

    predictions.append(prediction)

    if (index + 1) % 100 == 0:
        print(
            f"Processed {index + 1}/{len(df)}"
        )


# --------------------------------------------------
# Metrics
# --------------------------------------------------

true_labels = df["toxic"].tolist()


accuracy = accuracy_score(
    true_labels,
    predictions
)


precision, recall, f1, _ = precision_recall_fscore_support(
    true_labels,
    predictions,
    average="binary",
    zero_division=0
)


print("\n========== BASELINE RESULTS ==========")

print(f"Accuracy : {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall   : {recall:.4f}")
print(f"F1 Score : {f1:.4f}")


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


# --------------------------------------------------
# Language-specific evaluation
# --------------------------------------------------

print("\n========== LANGUAGE RESULTS ==========")

for language in ["en", "hi", "hin"]:

    language_df = df[
        df["language"] == language
    ]

    language_predictions = [
        predictions[i]
        for i in language_df.index
    ]

    language_true = language_df["toxic"].tolist()

    language_accuracy = accuracy_score(
        language_true,
        language_predictions
    )

    _, _, language_f1, _ = precision_recall_fscore_support(
        language_true,
        language_predictions,
        average="binary",
        zero_division=0
    )

    print(
        f"{language}: "
        f"Accuracy={language_accuracy:.4f}, "
        f"F1={language_f1:.4f}"
    )