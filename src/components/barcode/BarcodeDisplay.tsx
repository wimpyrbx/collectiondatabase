import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeDisplayProps {
  value: string;
  width?: number;
  height?: number;
  format?: string;
  displayValue?: boolean;
  fontSize?: number;
  background?: string;
  lineColor?: string;
  margin?: number;
  className?: string;
}

export const BarcodeDisplay: React.FC<BarcodeDisplayProps> = ({
  value,
  width = 2,
  height = 50,
  format = 'CODE128',
  displayValue = true,
  fontSize = 12,
  background = '#ffffff',
  lineColor = '#000000',
  margin = 10,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize,
          background,
          lineColor,
          margin,
          valid: () => true // Always render something, even if invalid
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [value, width, height, format, displayValue, fontSize, background, lineColor, margin]);

  return (
    <canvas 
      ref={canvasRef} 
      className={className}
    />
  );
};

export default BarcodeDisplay; 