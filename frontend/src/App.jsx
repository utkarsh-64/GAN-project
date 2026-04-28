import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:5000/enhance";
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [inputPreviewUrl, setInputPreviewUrl] = useState("");
  const [outputPreviewUrl, setOutputPreviewUrl] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fileSizeInMb = useMemo(() => {
    if (!selectedFile) return "";
    return `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`;
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (inputPreviewUrl) URL.revokeObjectURL(inputPreviewUrl);
      if (outputPreviewUrl) URL.revokeObjectURL(outputPreviewUrl);
    };
  }, [inputPreviewUrl, outputPreviewUrl]);

  const clearResult = () => {
    if (outputPreviewUrl) {
      URL.revokeObjectURL(outputPreviewUrl);
    }
    setOutputPreviewUrl("");
  };

  const resetAll = () => {
    if (inputPreviewUrl) URL.revokeObjectURL(inputPreviewUrl);
    if (outputPreviewUrl) URL.revokeObjectURL(outputPreviewUrl);

    setSelectedFile(null);
    setInputPreviewUrl("");
    setOutputPreviewUrl("");
    setErrorMessage("");
    setSuccessMessage("");
    setIsDragging(false);
  };

  const validateAndSetFile = (file) => {
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMessage("Please upload PNG, JPG, JPEG, or WEBP formats only.");
      setSuccessMessage("");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage("Image must be smaller than 50 MB.");
      setSuccessMessage("");
      return;
    }

    if (inputPreviewUrl) URL.revokeObjectURL(inputPreviewUrl);

    const newInputUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setInputPreviewUrl(newInputUrl);
    setErrorMessage("");
    setSuccessMessage("");
    clearResult();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    validateAndSetFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  const downloadEnhanced = () => {
    const a = document.createElement("a");
    a.href = outputPreviewUrl;
    a.download = "enhanced-image.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const enhanceImage = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select an image first.");
      return;
    }

    setIsEnhancing(true);
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let serverMessage = "Enhancement failed. Please try again.";
        try {
          const errorBody = await response.json();
          serverMessage = errorBody.error || serverMessage;
        } catch {
          serverMessage = `Enhancement failed with status ${response.status}.`;
        }
        throw new Error(serverMessage);
      }

      const blob = await response.blob();
      const outputUrl = URL.createObjectURL(blob);

      if (outputPreviewUrl) URL.revokeObjectURL(outputPreviewUrl);
      setOutputPreviewUrl(outputUrl);
      setSuccessMessage("✓ Enhancement complete! Compare the images below.");
    } catch (error) {
      setErrorMessage(error.message || "An unexpected error occurred.");
      setSuccessMessage("");
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <main className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">✨</div>
            <h1 className="app-title">LumiGAN</h1>
            <div className="brand-image" aria-hidden="true"></div>
          </div>
          <p className="app-tagline">Professional Low-Light Image Enhancement</p>
        </div>
      </header>

      {/* Main Content */}
      <section className="app-shell">
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-content">
            <p className="eyebrow">POWERED BY GENERATIVE AI</p>
            <h2 className="hero-title">Brighten Your Darkness</h2>
            <p className="hero-description">
              Transform underexposed photos into stunning, well-lit images using advanced
              neural networks. Perfect for night photography, dimly lit interiors, and more.
            </p>
            <div className="feature-pills">
              <span className="pill">🚀 Real-Time Processing</span>
              <span className="pill">🎨 Neural Enhancement</span>
              <span className="pill">📊 Before/After Comparison</span>
            </div>
          </div>
        </div>

        {/* Main Layout: Upload + Results */}
        <div className="main-layout">
          {/* Upload Bar */}
          <div className={`upload-bar ${outputPreviewUrl ? "has-results" : ""}`}>
            <div className="sidebar-header">
              <h3>Upload Image</h3>
            </div>

            <div
              className={`dropzone compact-dropzone ${isDragging ? "dropzone-active" : ""} ${inputPreviewUrl ? "has-file" : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {!inputPreviewUrl ? (
                <div className="compact-upload-content">
                  <div className="compact-upload-icon">📸</div>
                  <p className="compact-upload-text">Choose image</p>
                  <label className="upload-button compact-button" htmlFor="imagePicker">
                    <span>Select</span>
                  </label>
                  <input
                    id="imagePicker"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="file-preview compact-preview">
                  <img src={inputPreviewUrl} alt="Preview" className="preview-image compact-preview-image" />
                  <div className="file-meta">
                    <p className="file-name-compact">{selectedFile?.name}</p>
                    <p className="file-size-compact">{fileSizeInMb}</p>
                  </div>
                  <label className="change-button compact-button" htmlFor="imagePicker">
                    ↻
                  </label>
                  <input
                    id="imagePicker"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileChange}
                  />
                </div>
              )}
            </div>

            {/* Alerts */}
            {errorMessage && <div className="alert alert-error compact-alert">{errorMessage}</div>}
            {successMessage && <div className="alert alert-success compact-alert">{successMessage}</div>}

            {/* Action Button */}
            {inputPreviewUrl && !outputPreviewUrl && (
              <button
                className={`enhance-button compact-enhance-button ${isEnhancing ? "processing" : ""}`}
                onClick={enhanceImage}
                disabled={isEnhancing}
              >
                {isEnhancing ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  "✨ Enhance"
                )}
              </button>
            )}

            {/* Reset Button */}
            {outputPreviewUrl && (
              <button className="reset-button compact-reset-button" onClick={resetAll}>
                ↻ New Image
              </button>
            )}
          </div>

          {/* Results Section */}
          {outputPreviewUrl && (
            <div className="results-main">
              <h3 className="section-title">Results</h3>
              
              <div className="comparison-images">
                <div className="comparison-item">
                  <div className="comparison-label">Original</div>
                  <img src={inputPreviewUrl} alt="Original" className="comparison-image" />
                </div>
                <div className="comparison-item">
                  <div className="comparison-label">Enhanced</div>
                  <img src={outputPreviewUrl} alt="Enhanced" className="comparison-image" />
                </div>
              </div>

              <div className="result-actions">
                <button className="download-button" onClick={downloadEnhanced}>
                  ⬇️ Download Enhanced
                </button>
              </div>
            </div>
          )}
        </div>

        <section className="losses-section">
          <div className="losses-header">
            <div>
              <h3>Training Snapshot</h3>
              <p className="losses-subtitle">Last epoch metrics (Source to Target samples)</p>
            </div>
          </div>
          <div className="loss-grid">
            <div className="loss-card">
              <div className="loss-name">source_discr</div>
              <div className="loss-value">0.31682008504867554</div>
              <p className="loss-desc">
                Discriminator loss for the source domain. Lower means better real/fake separation.
              </p>
            </div>
            <div className="loss-card">
              <div className="loss-name">target_discr</div>
              <div className="loss-value">0.21157756447792053</div>
              <p className="loss-desc">
                Discriminator loss for the target domain. Lower means better real/fake separation.
              </p>
            </div>
            <div className="loss-card">
              <div className="loss-name">source_gener</div>
              <div className="loss-value">0.7708375255266825</div>
              <p className="loss-desc">
                Generator adversarial loss for source to target mapping. Lower is better.
              </p>
            </div>
            <div className="loss-card">
              <div className="loss-name">target_gener</div>
              <div className="loss-value">0.6412161688009897</div>
              <p className="loss-desc">
                Generator adversarial loss for target to source mapping. Lower is better.
              </p>
            </div>
            <div className="loss-card">
              <div className="loss-name">recon_target_loss</div>
              <div className="loss-value">0.05315116047859192</div>
              <p className="loss-desc">
                Cycle reconstruction loss for target domain consistency. Lower means better cycle match.
              </p>
            </div>
            <div className="loss-card">
              <div className="loss-name">recon_source_loss</div>
              <div className="loss-value">0.03360244259238243</div>
              <p className="loss-desc">
                Cycle reconstruction loss for source domain consistency. Lower means better cycle match.
              </p>
            </div>
            <div className="loss-card">
              <div className="loss-name">ident_target</div>
              <div className="loss-value">0.09518671035766602</div>
              <p className="loss-desc">
                Identity loss on target images. Encourages keeping colors and structure when already in target domain.
              </p>
            </div>
            <div className="loss-card">
              <div className="loss-name">ident_source</div>
              <div className="loss-value">0.049587182700634</div>
              <p className="loss-desc">
                Identity loss on source images. Encourages minimal change when already in source domain.
              </p>
            </div>
          </div>
        </section>

        {/* Empty State */}
        {!inputPreviewUrl && !outputPreviewUrl && !errorMessage && (
          <div className="empty-state">
            <div className="empty-icon">🌙</div>
            <p>Ready to enhance your low-light photos?</p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="app-footer">
        <p>LumiGAN © 2026 • Advanced Image Enhancement</p>
      </footer>
    </main>
  );
}

export default App;
