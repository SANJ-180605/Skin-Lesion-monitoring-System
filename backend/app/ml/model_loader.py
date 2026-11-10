import os
import sys
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
import logging

logger = logging.getLogger("model_loader")

# Add Windows DLL search paths for TensorFlow
_project_root = Path(__file__).resolve().parent.parent.parent
_candidate_dlls = [
    _project_root / "dlls",
    Path(r"C:\Users\User1\.gemini\antigravity\scratch\dlls")
]
for _d in _candidate_dlls:
    if _d.exists():
        try:
            os.add_dll_directory(str(_d))
            os.environ["PATH"] = str(_d) + os.pathsep + os.environ.get("PATH", "")
        except Exception:
            pass

# Placeholders for TensorFlow modules to be initialized safely
tf = None
keras = None
unet_model = None
classification_model = None

unet_metadata: Dict[str, Any] = {
    "name": "Standard U-Net Skin Lesion Segmentation",
    "architecture": "Standard U-Net (4 encoder/decoder stages + skip connections)",
    "checkpoint_path": "",
    "input_shape": [256, 256, 3],
    "status": "not_loaded",
    "error_message": None
}

classification_metadata: Dict[str, Any] = {
    "name": "Three-Class HAM10000 EfficientNetB0",
    "architecture": "EfficientNetB0 (include_top=False) + GAP + Dropout(0.3) + Dense(3, softmax)",
    "checkpoint_path": "",
    "input_shape": [224, 224, 3],
    "classes": ["Cancerous", "Precancerous / in situ", "Benign"],
    "status": "not_loaded",
    "error_message": None
}

def init_tf():
    global tf, keras
    if tf is None:
        import tensorflow as _tf
        tf = _tf
        keras = _tf.keras
    return tf, keras

def get_custom_objects():
    """
    Returns custom loss and metric functions required by U-Net serialization
    as defined in Model1_Optimized_UNet_Skin_Lesion_Segmentation.ipynb
    """
    _tf, _keras = init_tf()
    EPS = 1e-7

    reg = getattr(_keras.utils, "register_keras_serializable", None) or getattr(_keras.saving, "register_keras_serializable", lambda **kwargs: lambda f: f)

    @reg(package="custom")
    def dice_coefficient(y_true, y_pred):
        y_true = _tf.cast(y_true, _tf.float32)
        y_pred = _tf.cast(y_pred, _tf.float32)
        y_true_f = _tf.reshape(y_true, [_tf.shape(y_true)[0], -1])
        y_pred_f = _tf.reshape(y_pred, [_tf.shape(y_pred)[0], -1])
        intersection = _tf.reduce_sum(y_true_f * y_pred_f, axis=1)
        denom = _tf.reduce_sum(y_true_f, axis=1) + _tf.reduce_sum(y_pred_f, axis=1)
        return _tf.reduce_mean((2.0 * intersection + EPS) / (denom + EPS))

    @reg(package="custom")
    def dice_loss(y_true, y_pred):
        return 1.0 - dice_coefficient(y_true, y_pred)

    @reg(package="custom")
    def bce_loss(y_true, y_pred):
        return _tf.reduce_mean(_keras.losses.binary_crossentropy(y_true, y_pred))

    @reg(package="custom")
    def bce_dice_loss(y_true, y_pred):
        return bce_loss(y_true, y_pred) + dice_loss(y_true, y_pred)

    return {
        "dice_coefficient": dice_coefficient,
        "dice_loss": dice_loss,
        "bce_loss": bce_loss,
        "bce_dice_loss": bce_dice_loss
    }

def build_standard_unet(input_shape=(256, 256, 3), base_filters=32):
    """
    Exact architecture from Notebook 1: Standard U-Net
    """
    _tf, _keras = init_tf()

    def conv_block(x, filters, name):
        x = _keras.layers.Conv2D(filters, 3, padding="same", use_bias=False, name=f"{name}_conv1")(x)
        x = _keras.layers.BatchNormalization(name=f"{name}_bn1")(x)
        x = _keras.layers.Activation("relu", name=f"{name}_relu1")(x)
        x = _keras.layers.Conv2D(filters, 3, padding="same", use_bias=False, name=f"{name}_conv2")(x)
        x = _keras.layers.BatchNormalization(name=f"{name}_bn2")(x)
        x = _keras.layers.Activation("relu", name=f"{name}_relu2")(x)
        return x

    inputs = _keras.Input(shape=input_shape, name="image")
    c1 = conv_block(inputs, base_filters, "enc1"); p1 = _keras.layers.MaxPooling2D()(c1)
    c2 = conv_block(p1, base_filters*2, "enc2"); p2 = _keras.layers.MaxPooling2D()(c2)
    c3 = conv_block(p2, base_filters*4, "enc3"); p3 = _keras.layers.MaxPooling2D()(c3)
    c4 = conv_block(p3, base_filters*8, "enc4"); p4 = _keras.layers.MaxPooling2D()(c4)
    bn = conv_block(p4, base_filters*16, "bottleneck")
    u4 = _keras.layers.UpSampling2D(interpolation="bilinear")(bn)
    u4 = _keras.layers.Concatenate()([u4, c4]); d4 = conv_block(u4, base_filters*8, "dec4")
    u3 = _keras.layers.UpSampling2D(interpolation="bilinear")(d4)
    u3 = _keras.layers.Concatenate()([u3, c3]); d3 = conv_block(u3, base_filters*4, "dec3")
    u2 = _keras.layers.UpSampling2D(interpolation="bilinear")(d3)
    u2 = _keras.layers.Concatenate()([u2, c2]); d2 = conv_block(u2, base_filters*2, "dec2")
    u1 = _keras.layers.UpSampling2D(interpolation="bilinear")(d2)
    u1 = _keras.layers.Concatenate()([u1, c1]); d1 = conv_block(u1, base_filters, "dec1")
    outputs = _keras.layers.Conv2D(1, 1, activation="sigmoid", dtype="float32", name="lesion_probability")(d1)
    return _keras.Model(inputs, outputs, name="standard_unet")

def build_three_class_efficientnet(input_shape=(224, 224, 3), weights=None):
    """
    Exact architecture from Notebook 2: Three-Class EfficientNetB0
    """
    _tf, _keras = init_tf()

    try:
        base3 = _keras.applications.EfficientNetB0(
            include_top=False,
            weights=weights,
            input_shape=input_shape
        )
    except Exception:
        base3 = _keras.applications.EfficientNetB0(
            include_top=False,
            weights=None,
            input_shape=input_shape
        )
    base3.trainable = False

    inputs3 = _keras.Input(shape=input_shape, name="image")
    x = base3(inputs3, training=False)
    x = _keras.layers.GlobalAveragePooling2D(name="gap")(x)
    x = _keras.layers.Dropout(0.3, name="dropout")(x)
    outputs3 = _keras.layers.Dense(3, activation="softmax", name="three_class_softmax")(x)

    model = _keras.Model(inputs3, outputs3, name="three_class_efficientnetb0")
    return model

def load_unet_model(primary_path: str, fallback_path: Optional[str] = None):
    """
    Loads the trained Standard U-Net model checkpoint with custom objects.
    Preserves notebook logic and class weights.
    """
    global tf, keras, unet_model, unet_metadata
    try:
        init_tf()
    except Exception as e:
        unet_metadata["status"] = "error"
        unet_metadata["error_message"] = f"TensorFlow import failed: {str(e)}"
        logger.error(unet_metadata["error_message"])
        return None

    custom_objs = get_custom_objects()

    paths_to_check = [Path(primary_path)]
    if fallback_path:
        paths_to_check.append(Path(fallback_path))
    base_dir = Path(__file__).resolve().parent.parent.parent
    paths_to_check.append(base_dir / "saved_models" / "unet" / "model1_selected_best.keras")
    paths_to_check.append(base_dir / "saved_models" / "unet" / "baseline_bce_dice_best.keras")
    paths_to_check.append(base_dir / "model1_artifacts" / "model1_selected_best.keras")
    paths_to_check.append(base_dir / "model1_artifacts" / "baseline_bce_dice_best.keras")

    chosen_path = None
    for p in paths_to_check:
        if p and p.exists() and p.is_file():
            chosen_path = p
            break

    if not chosen_path:
        unet_metadata["status"] = "missing_checkpoint"
        unet_metadata["checkpoint_path"] = str(primary_path)
        unet_metadata["error_message"] = (
            f"U-Net checkpoint not found at '{primary_path}'. "
            "Please copy your trained 'model1_selected_best.keras' or 'baseline_bce_dice_best.keras' "
            "into 'backend/saved_models/unet/' directory."
        )
        logger.warning(unet_metadata["error_message"])
        unet_model = None
        return None

    try:
        logger.info(f"Loading U-Net checkpoint from: {chosen_path}")
        unet_model = tf.keras.models.load_model(chosen_path, custom_objects=custom_objs, compile=False)
        unet_metadata["status"] = "loaded"
        unet_metadata["checkpoint_path"] = str(chosen_path)
        unet_metadata["error_message"] = None
        logger.info("U-Net model successfully loaded.")
        return unet_model
    except Exception as e:
        unet_metadata["status"] = "error"
        unet_metadata["checkpoint_path"] = str(chosen_path)
        unet_metadata["error_message"] = f"Failed to load U-Net checkpoint: {str(e)}"
        logger.error(unet_metadata["error_message"])
        unet_model = None
        return None

def load_classification_model(primary_path: str):
    """
    Loads the trained Three-Class EfficientNetB0 checkpoint.
    """
    global tf, keras, classification_model, classification_metadata
    try:
        init_tf()
    except Exception as e:
        classification_metadata["status"] = "error"
        classification_metadata["error_message"] = f"TensorFlow import failed: {str(e)}"
        logger.error(classification_metadata["error_message"])
        return None

    paths_to_check = [Path(primary_path)]
    base_dir = Path(__file__).resolve().parent.parent.parent
    paths_to_check.append(base_dir / "saved_models" / "efficientnet" / "best_three_class_model.keras")
    paths_to_check.append(base_dir / "best_three_class_model.keras")
    paths_to_check.append(base_dir / "ham10000_efficientnet_results" / "best_three_class_model.keras")

    chosen_path = None
    for p in paths_to_check:
        if p and p.exists() and p.is_file():
            chosen_path = p
            break

    if not chosen_path:
        classification_metadata["status"] = "missing_checkpoint"
        classification_metadata["checkpoint_path"] = str(primary_path)
        classification_metadata["error_message"] = (
            f"EfficientNetB0 3-class checkpoint not found at '{primary_path}'. "
            "Please copy your trained 'best_three_class_model.keras' into 'backend/saved_models/efficientnet/'."
        )
        logger.warning(classification_metadata["error_message"])
        classification_model = None
        return None

    try:
        logger.info(f"Loading 3-Class EfficientNetB0 from: {chosen_path}")
        classification_model = tf.keras.models.load_model(chosen_path, compile=False)
        classification_metadata["status"] = "loaded"
        classification_metadata["checkpoint_path"] = str(chosen_path)
        classification_metadata["error_message"] = None
        logger.info("3-Class EfficientNetB0 model successfully loaded.")
        return classification_model
    except Exception as e:
        classification_metadata["status"] = "error"
        classification_metadata["checkpoint_path"] = str(chosen_path)
        classification_metadata["error_message"] = f"Failed to load classification checkpoint: {str(e)}"
        logger.error(classification_metadata["error_message"])
        classification_model = None
        return None

def get_loaded_unet():
    return unet_model, unet_metadata

def get_loaded_classification():
    return classification_model, classification_metadata
