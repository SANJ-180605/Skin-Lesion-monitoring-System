"""
Exact 3-class label mapping from Model 2 notebook:
Model2_HAM10000_EfficientNetB0_Classification.ipynb
"""

THREE_CLASS_NAMES = [
    "Cancerous",
    "Precancerous / in situ",
    "Benign"
]

INDEX_TO_CLASS = {
    0: "Cancerous",
    1: "Precancerous / in situ",
    2: "Benign"
}

CLASS_TO_INDEX = {
    "Cancerous": 0,
    "Precancerous / in situ": 1,
    "Benign": 2
}

# Original HAM10000 mapping reference
HAM10000_TO_THREE_CLASS = {
    "mel": "Cancerous",
    "bcc": "Cancerous",
    "akiec": "Precancerous / in situ",
    "bkl": "Benign",
    "df": "Benign",
    "nv": "Benign",
    "vasc": "Benign"
}

HAM10000_TO_INDEX = {
    "mel": 0,
    "bcc": 0,
    "akiec": 1,
    "bkl": 2,
    "df": 2,
    "nv": 2,
    "vasc": 2
}

