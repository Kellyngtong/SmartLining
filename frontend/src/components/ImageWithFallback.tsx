import React, { useState } from 'react';
import '../styles/imageWithFallback.css';
import '../styles/langingPage.css';

const ERROR_IMG_SRC = 'frontend/public/assets/smartLiningPortada.jpeg';

export interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);
  const { src, alt, className = '', style, ...rest } = props;

  const handleError = () => setDidError(true);

  if (didError) {
    return (
      <div className={`image-fallback-wrapper ${className}`} style={style}>
        <div className="image-fallback-inner">
          <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
        </div>
      </div>
    );
  }

  return (
    <img src={src} alt={alt} className={className} style={style} {...rest} onError={handleError} />
  );
}
