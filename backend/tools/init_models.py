"""
Utility to check and initialize model checkpoints with the exact architectures from the notebooks.
Run this script to generate initial checkpoints for local verification if you have not yet
copied over your trained checkpoints from Google Colab.
"""

import os
import sys
from pathlib import Path

# Setup DLL path for Windows
base_dir = Path(__file__).resolve().parent.parent
dll_dir = base_dir / "dlls"
if dll_dir.exists():
    try:
        os.add_dll_directory(str(dll_dir))
        os.environ["PATH"] = str(dll_dir) + os.pathsep + os.environ.get("PATH", "")
    except Exception:
        pass

sys.path.insert(0, str(base_dir))

from app.ml.model_loader import (
    build_standard_unet,
    build_three_class_efficientnet,
    get_custom_objects,
    init_tf
)

def create_initial_checkpoints():
    print("Initializing TensorFlow & Keras...")
    tf, keras = init_tf()
    
    unet_dir = base_dir / "saved_models" / "unet"
    eff_dir = base_dir / "saved_models" / "efficientnet"
    unet_dir.mkdir(parents=True, exist_ok=True)
    eff_dir.mkdir(parents=True, exist_ok=True)
    
    unet_path = unet_dir / "model1_selected_best.keras"
    baseline_unet_path = unet_dir / "baseline_bce_dice_best.keras"
    eff_path = eff_dir / "best_three_class_model.keras"
    
    # 1. U-Net Checkpoint
    if not unet_path.exists() and not baseline_unet_path.exists():
        print(f"Creating Standard U-Net model from Notebook 1 architecture...")
        unet = build_standard_unet(input_shape=(256, 256, 3), base_filters=32)
        custom_objs = get_custom_objects()
        unet.compile(
            optimizer=keras.optimizers.Adam(learning_rate=1e-3),
            loss=custom_objs["bce_dice_loss"],
            metrics=[custom_objs["dice_coefficient"]]
        )
        unet.save(unet_path)
        unet.save(baseline_unet_path)
        print(f" Saved Standard U-Net checkpoint to: {unet_path}")
    else:
        print(f" U-Net checkpoint already exists.")
        
    # 2. Three-Class EfficientNetB0 Checkpoint
    if not eff_path.exists():
        print(f"Creating Three-Class EfficientNetB0 from Notebook 2 architecture...")
        eff = build_three_class_efficientnet(input_shape=(224, 224, 3))
        eff.compile(
            optimizer=keras.optimizers.Adam(learning_rate=3e-4),
            loss="sparse_categorical_crossentropy",
            metrics=["accuracy"]
        )
        eff.save(eff_path)
        print(f" Saved 3-Class EfficientNetB0 checkpoint to: {eff_path}")
    else:
        print(f" EfficientNetB0 checkpoint already exists.")

if __name__ == "__main__":
    create_initial_checkpoints()

