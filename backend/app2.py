import io
from pathlib import Path

import numpy as np
import tensorflow as tf
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from PIL import Image, ImageEnhance, ImageFilter

app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR.parent / "model.h5"
TARGET_SHORT_SIDE = 2048
MAX_LONG_SIDE = 4096
GENERATOR_WORKING_LONG_SIDE = 768

gan_generator = None
model_load_error = None


class GANEnhancementGenerator:
    def __init__(self, model_path):
        self.model_path = model_path
        self.generator = tf.keras.models.load_model(str(model_path), compile=False)
        self.generator.trainable = False

        output_shape = getattr(self.generator, "output_shape", None)
        if output_shape is not None and output_shape[-1] != 24:
            raise ValueError(
                f"Expected GAN generator output with 24 enhancement channels, got {output_shape}"
            )

    def generate(self, image):
        working_image = resize_for_generator(image)
        input_tensor = preprocess(working_image)
        generated_tensor = self.generator(input_tensor, training=False)
        enhanced_tensor = apply_generator_enhancement(input_tensor, generated_tensor)
        result = postprocess(enhanced_tensor)
        return improve_clarity(image, Image.fromarray(result))


def _load_gan_generator():
    global gan_generator, model_load_error

    if not MODEL_PATH.exists():
        model_load_error = f"{MODEL_PATH.name} not found at project root"
        return False

    try:
        gan_generator = GANEnhancementGenerator(MODEL_PATH)
        print(f"Loaded GAN generator from {MODEL_PATH.name}")
        return True
    except Exception as err:
        model_load_error = f"Failed to load GAN generator: {err}"
        return False


if not _load_gan_generator():
    print(f"No model loaded: {model_load_error}")


def preprocess(image):
    image = np.array(image).astype("float32") / 255.0
    return np.expand_dims(image, axis=0)


def resize_for_generator(image):
    width, height = image.size
    longest_side = max(width, height)

    if longest_side <= GENERATOR_WORKING_LONG_SIDE:
        return image

    scale = GENERATOR_WORKING_LONG_SIDE / longest_side
    resized_size = (round(width * scale), round(height * scale))
    return image.resize(resized_size, Image.Resampling.LANCZOS)


def apply_generator_enhancement(image_tensor, generated_tensor):
    r1, r2, r3, r4, r5, r6, r7, r8 = tf.split(generated_tensor, 8, axis=-1)

    x = image_tensor + r1 * (tf.square(image_tensor) - image_tensor)
    x = x + r2 * (tf.square(x) - x)
    x = x + r3 * (tf.square(x) - x)
    enhanced = x + r4 * (tf.square(x) - x)
    x = enhanced + r5 * (tf.square(enhanced) - enhanced)
    x = x + r6 * (tf.square(x) - x)
    x = x + r7 * (tf.square(x) - x)
    enhanced = x + r8 * (tf.square(x) - x)

    return tf.clip_by_value(enhanced, 0.0, 1.0)


def postprocess(enhanced_tensor):
    enhanced = enhanced_tensor[0].numpy()
    return np.clip(enhanced * 255.0, 0, 255).astype("uint8")


def improve_clarity(original_image, enhanced_image):
    enhanced_image = enhanced_image.resize(original_image.size, Image.Resampling.LANCZOS)

    image = Image.blend(original_image, enhanced_image, 1.00)

    pixels = np.asarray(image).astype("float32")
    brightness = float(np.mean(pixels))
    if brightness < 95:
        image = ImageEnhance.Brightness(image).enhance(1.22)
    elif brightness < 135:
        image = ImageEnhance.Brightness(image).enhance(1.15)
    elif brightness < 170:
        image = ImageEnhance.Brightness(image).enhance(1.08)
    elif brightness > 190:
        image = ImageEnhance.Brightness(image).enhance(max(0.92, 205 / brightness))

    width, height = image.size
    shortest_side = min(width, height)
    longest_side = max(width, height)
    scale = max(1.0, TARGET_SHORT_SIDE / shortest_side)
    scale = min(scale, MAX_LONG_SIDE / longest_side)
    image = image.resize((round(width * scale), round(height * scale)), Image.Resampling.LANCZOS)

    image = ImageEnhance.Contrast(image).enhance(1.08)
    image = image.filter(ImageFilter.UnsharpMask(radius=0.8, percent=175, threshold=2))
    image = ImageEnhance.Sharpness(image).enhance(1.18)
    return image


@app.route("/")
def home():
    return "GAN enhancement backend is running"


@app.route("/enhance", methods=["POST"])
def enhance():
    if gan_generator is None:
        return jsonify({"error": f"GAN generator not loaded: {model_load_error}"}), 500

    try:
        if "image" not in request.files:
            return jsonify({"error": "No image file provided in 'image' field"}), 400

        file = request.files["image"]
        image = Image.open(file.stream).convert("RGB")

        img = gan_generator.generate(image)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)

        return send_file(buf, mimetype="image/png")

    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
