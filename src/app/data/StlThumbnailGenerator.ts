import React, { useState, useRef, ChangeEvent } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { Center, Stage } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

// Interface for the 3D model component props
interface StlModelProps {
  url: string;
}

// Separate component to safely use useLoader within the Canvas context
export function StlModel({ url }: StlModelProps): React.JSX.Element {
  // Explicitly passing STLLoader ensures the correct fallback buffer geometry types
  const geometry = useLoader(STLLoader, url);
  
  return React.createElement(
    'mesh',
    { geometry },
    React.createElement('meshStandardMaterial', {
      color: '#90caf9',
      roughness: 0.3,
    }),
  ) as React.JSX.Element;
}

export default function StlThumbnailGenerator(): React.JSX.Element {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  
  // Explicitly typing the ref to target HTMLCanvasElement instead of the generic Fiber layout
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Handle local file upload with React ChangeEvent mapping
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setThumbnail(null); // Reset previous thumbnail
    }
  };

  // 2. Capture the canvas context as an image
  const generateThumbnail = (): void => {
    if (!canvasRef.current) return;
    
    // Extract base64 image data directly from the Three.js canvas element
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setThumbnail(dataUrl);

    // Clean up virtual browser path memory
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
  };

  return React.createElement('div', { style: { padding: '20px', fontFamily: 'sans-serif' } },
    React.createElement('h3', null, 'Client-Side STL Thumbnail Generator (TS)'),
    React.createElement('input', { type: 'file', accept: '.stl', onChange: handleFileChange }),
    React.createElement('div', { style: { display: 'flex', gap: '40px', marginTop: '20px' } },
      fileUrl && React.createElement('div', null,
        React.createElement('h4', null, '1. 3D Render Engine'),
        React.createElement('div', { style: { width: '300px', height: '300px', border: '1px solid #ccc' } },
          React.createElement(Canvas, {
            ref: canvasRef,
            gl: { preserveDrawingBuffer: true },
            camera: { position: [0, 0, 5], fov: 50 },
            onCreated: (): void => { setTimeout(generateThumbnail, 500); },
          },
            React.createElement('color', { attach: 'background', args: ['#ffffff'] }),
            React.createElement(Stage, { environment: 'city', intensity: 0.6, adjustCamera: true },
              React.createElement(Center, null, React.createElement(StlModel, { url: fileUrl })),
            ),
          ),
        ),
      ),
      thumbnail && React.createElement('div', null,
        React.createElement('h4', null, '2. Generated PNG Thumbnail'),
        React.createElement('img', { src: thumbnail, alt: 'STL Preview Thumbnail', style: { width: '300px', height: '300px', border: '1px solid #4CAF50', objectFit: 'contain', backgroundColor: '#f9f9f9' } }),
        React.createElement('div', { style: { marginTop: '10px' } },
          React.createElement('a', { href: thumbnail, download: 'stl-thumbnail.png' },
            React.createElement('button', { style: { padding: '8px 12px', cursor: 'pointer' } }, 'Download PNG'),
          ),
        ),
      ),
    ),
  );
 
}
