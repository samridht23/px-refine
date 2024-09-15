import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as fal from "@fal-ai/serverless-client";

interface FalAiResponse {
  image: {
    url: string;
    width: number;
    height: number;
    file_name: string;
    file_size: number;
    content_type: string;
  };
  timings: {
    inference: number;
  };
}

// Configure Fal.ai with credentials
fal.config({
  credentials: import.meta.env.VITE_FAL_KEY,
});

interface ImageData {
  id: number;
  url: string;
  file: File; // Store the file to send in the POST request
}

const App = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null); // Track selected image
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);  // Track result image URL

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file) => {
      const url = URL.createObjectURL(file); // Create a URL for the image
      return { id: Date.now() + Math.random(), url, file }; // Add unique id and file
    });
    setImages((prevImages) => [...prevImages, ...newImages]); // Add new images to the list
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
  });

  const uploadImageAndGetUrl = async (file: File) => {
    const uploadUrl = "https://gachi.gay/api/upload"; // API URL
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const responseBody = await response.json(); // Get the response body as JSON

      if (response.ok) {
        try {
          const { link } = responseBody as { link: string }; // Extract the link from the response
          return link; // Return the image URL
        } catch (error) {
          console.error("Error extracting image URL from response:", error);
          return null;
        }
      } else {
        console.error("Failed to upload file, response status:", response.status);
        return null;
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    }
  };

  const handleUpscale = async () => {
    if (!selectedImage) return;

    try {
      // Upload the image and get the URL
      const imageUrl = await uploadImageAndGetUrl(selectedImage.file);

      if (imageUrl) {
        const response = await fal.subscribe("fal-ai/aura-sr", {
          input: {
            image_url: imageUrl, // Use the uploaded image URL
            upscaling_factor: 4,
            overlapping_tiles: true,
            checkpoint: "v2",
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === "IN_PROGRESS") {
              update.logs.map((log) => log.message).forEach(console.log);
            }
          },
        });

        console.log('Upscale result:', response);

        // Type the response as FalAiResponse
        const typedResponse = response as FalAiResponse;

        // Check if the 'image' key exists in the typed response
        if (typedResponse && typedResponse.image) {
          const resultImageUrl = typedResponse.image.url;
          setResultImageUrl(resultImageUrl); // Set the result image URL
        } else {
          console.error('Unexpected response format:', typedResponse);
        }
      }
    } catch (error) {
      console.error("Error upscaling image:", error);
    }
  };

  const handleRemoveBackground = async () => {
    if (!selectedImage) return;

    try {
      // Upload the image and get the URL
      const imageUrl = await uploadImageAndGetUrl(selectedImage.file);

      if (imageUrl) {
        // Make the API request for background removal
        const removalResponse = await fal.subscribe("fal-ai/birefnet", {
          input: {
            image_url: imageUrl, // Use base64 image
            model: "General Use (Light)",
            operating_resolution: "1024x1024",
            output_format: "png",
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === "IN_PROGRESS") {
              update.logs.map((log) => log.message).forEach(console.log);
            }
          },
        });

        console.log('Background removal result:', removalResponse);

        // Type the response as FalAiResponse
        const typedResponse = removalResponse as FalAiResponse;

        // Check if the 'image' key exists in the typed response
        if (typedResponse && typedResponse.image) {
          const resultImageUrl = typedResponse.image.url;
          setResultImageUrl(resultImageUrl); // Set the result image URL
        } else {
          console.error('Unexpected response format:', typedResponse);
        }
      }
    } catch (error) {
      console.error('Error removing background:', error);
    }
  };

  // Function to handle image selection
  const handleImageClick = (image: ImageData) => {
    setSelectedImage(image); // Set the selected image
    setResultImageUrl(null); // Clear the result image when a new image is selected
  };

  // Function to handle form submission and send image via fetch
  const handleSubmit = async () => {
    if (!selectedImage) return; // Return if no image is selected

    const formData = new FormData();
    formData.append('file', selectedImage.file); // Append the selected file

    try {
      const response = await fetch('https://your-api-endpoint.com/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      console.log('Image uploaded successfully:', data);
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  return (
    <div className="w-full">
      <div className="fixed w-full top-0 left-0 bg-[var(--bg)] border-x-[1px] border-[var(--border-muted)] h-14 flex items-center py-2 px-4 gap-3">
        <div>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
            <path fill="#fff" d="M0 8.818A9.002 9.002 0 0 1 8.818 0 9.002 9.002 0 0 1 0 8.818ZM8.818 18A9.002 9.002 0 0 1 0 9.182 9.002 9.002 0 0 1 8.818 18ZM18 9.182A9.002 9.002 0 0 1 9.182 18 9.002 9.002 0 0 1 18 9.182ZM9.182 0A9.002 9.002 0 0 1 18 8.818 9.002 9.002 0 0 1 9.182 0Z" />
          </svg>
        </div>
        <span className='font-semibold text-md'>PxRefine</span>
      </div>
      <div className="flex w-full divide-x h-[100vh]">
        <div className="border mt-14 divide-x w-full flex border-[var(--border-muted)] divide-[var(--border-muted)]">
          <div className="w-1/6 p-2">
            <div
              {...getRootProps()}
              className="border-[1px] border-[var(--border)] p-4 text-center cursor-pointer rounded-md bg-[var(--bg-muted)]"
            >
              <input {...getInputProps()} />
              <p className='text-xs text-[var(--text-subtle)] font-semibold'>Drag 'n' drop some files here, or click to select files</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className={`border-[1px] rounded-md border-[var(--border)] overflow-hidden cursor-pointer ${selectedImage?.id === image.id ? 'border-blue-500' : ''}`}
                  onClick={() => handleImageClick(image)} // Set the image as selected on click
                >
                  <img
                    src={image.url}
                    alt="Uploaded thumbnail"
                    className="w-full h-24 object-contain" // Use object-contain to maintain aspect ratio
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="w-5/6 flex flex-col">
            <div className="flex-1 flex flex-row divide-x-[1px] divide-[var(--border-muted)]">
              {/* Picture Preview */}
              <div className="w-1/2 flex flex-col items-center justify-center p-4">
                {selectedImage ? (
                  <div className="border w-full overflow-hidden mt-4">
                    <img
                      src={selectedImage.url}
                      alt="Selected large preview"
                      className="w-full h-full object-contain" // Use object-contain to maintain aspect ratio
                    />
                  </div>
                ) : (
                  <div className="text-[var(--text)] font-semibold">No image selected</div>
                )}
              </div>

              {/* AI prompt result */}
              <div className="w-1/2 flex flex-col items-center justify-center p-4">
                {resultImageUrl ? (
                  <div className="border w-full overflow-hidden mt-4">
                    <img
                      src={resultImageUrl}
                      alt="AI processed result"
                      className="w-full h-full object-contain" // Use object-contain to maintain aspect ratio
                    />
                  </div>
                ) : (
                  <div className="text-[var(--text)] font-semibold">No result yet</div>
                )}
              </div>
            </div>

            <div className="w-full flex items-center justify-center py-2 border-t-[1px] border-[var(--border-muted)] gap-2">
              <button
                className='rounded-md bg-[var(--bg-inverted)] h-full px-4 py-2 text-[var(--text-inverted)] items-center justify-center flex text-xs font-semibold'
                onClick={handleUpscale}
              >
                Upscale Image
              </button>
              <button
                className='rounded-md bg-[var(--bg-inverted)] h-full px-4 py-2 text-[var(--text-inverted)] items-center justify-center flex text-xs font-semibold'
                onClick={handleRemoveBackground}
              >
                Remove Background
              </button>
              <div className="flex w-1/2 p-2 border-[1px] border-[var(--border)] bg-[var(--bg-subtle)] rounded">
                <textarea
                  className="w-full h-full bg-[var(--bg-subtle)] outline-none resize-none placeholder:text-[var(--text-subtle)]"
                  placeholder="Write your prompt here"
                ></textarea>
                <button
                  className="flex items-center px-3 py-1 rounded bg-[var(--bg-inverted)] text-[var(--text-inverted)] text-xs"
                  onClick={handleSubmit}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
