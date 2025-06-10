# nima-testing.py

import numpy as np
from PIL import Image
from tensorflow.lite.python.interpreter import Interpreter  # use TF’s built-in TFLite Interpreter

# 1) Path to the TFLite model you downloaded
MODEL_PATH = "nima_mobilenet_v2_224_224.tflite"  # or "aesthetic_model.tflite" if you didn’t rename

# 2) Helper: load and preprocess an image (resize to 224×224, normalize to [0,1])
def load_and_preprocess(image_path):
    img = Image.open(image_path).convert("RGB").resize((224, 224))
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)

# 3) Compute NIMA aesthetic score (Expected value of the 10-class distribution)
def nima_score(image_path):
    input_data = load_and_preprocess(image_path)  # shape (1,224,224,3)

    # Load the TFLite model via TF’s Interpreter
    interpreter = Interpreter(model_path=MODEL_PATH)
    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    interpreter.set_tensor(input_details[0]['index'], input_data)
    interpreter.invoke()

    probs = interpreter.get_tensor(output_details[0]['index'])[0]  # shape (10,)

    ratings = np.arange(1, 11, dtype=np.float32)  # [1,2,…,10]
    score = float(np.dot(probs, ratings))
    return score

if __name__ == "__main__":
    image_path = "sfr.png"  # or whichever file you want to test
    try:
        s = nima_score(image_path)
        print(f"Aesthetic score (1–10): {s:.2f}")
    except FileNotFoundError:
        print(f"Image not found: {image_path}")
    except Exception as e:
        print("Error running NIMA model:", e)

