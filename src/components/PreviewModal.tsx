/// <reference types="three" />
import { CircularProgress } from "@mui/material";
import React, { useEffect, useRef } from "react";

// Tell TS that THREE is available globally
declare const THREE: typeof import("three");

declare global {
  interface Window {
    scene: any;
    camera: any;
    renderer: any;
    previewdata: (...args: any[]) => void;
    [key: string]: any;
  }
}

const PreviewModal: React.FC<{
  isOpen: boolean;
  dataKey: any;
  isInternal: boolean;
  onClose: () => void;
  // isLoading: boolean; //add spinner
  previewIndex: number;
}> = ({ isOpen, dataKey, isInternal, onClose, previewIndex }) => {
  // Create a ref. This will give us a direct, stable reference to the container div. fix start------------
  // const canvasContainerRef = useRef<HTMLDivElement>(null);
  // fix end---------------------

  useEffect(() => {
    if (!isOpen) return;
    //add spinner
    // if (!isOpen || isLoading) return;

    // fix start-----------: Get the container element from the ref.
    // const container = canvasContainerRef.current;
    // if (!container) {
    //   // This can happen briefly on the first render, so we just wait for the next render.
    //   return;
    // }
    // // 3. Check for the required legacy functions on the window object.
    // if (
    //   typeof window.previewdata !== "function" ||
    //   typeof window.initcanvas_with_container !== "function"
    // ) {
    //   console.error(
    //     "❌ Legacy preview script functions are not available on the window object."
    //   );
    //   return;
    // }

    // window.previewdata(dataKey, previewIndex, isInternal, false);
    // fix end---------------------------------
    // clear old canvas
    const canvasDiv = document.getElementById("canvas");
    if (canvasDiv)
      while (canvasDiv.firstChild) canvasDiv.removeChild(canvasDiv.firstChild);

    // wait until div with ID canvas is in the DOM and also confirm the global function exists
    const interval = setInterval(() => {
      if (
        document.getElementById("canvas") &&
        typeof window.previewdata === "function"
      ) {
        clearInterval(interval);
        window.previewdata(dataKey, previewIndex, isInternal, false);
      }
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, [isOpen, dataKey, previewIndex, isInternal]);

  if (!isOpen) return null;
  return (
    <div
      className="preview-modal"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
        overflow: "hidden",
      }}
    >
      {/* Canvas Panel */}
      <div
        id="canvas"
        style={{
          backgroundColor: "#000",
          width: "950px",
          height: "750px",
          border: "1px solid black",
          marginRight: "24px",
          // New styles to center the spinner
          // display: "flex",
          // justifyContent: "center",
          // alignItems: "center",
        }}
      >
        {/* --- NEW: Conditional rendering of the spinner --- */}
        {/* {isLoading && <CircularProgress sx={{ color: "#fff" }} />} */}
      </div>
      {/* <div
        id="canvas"
        style={{
          backgroundColor: "#000",
          width: "950px",
          height: "750px",
          border: "1px solid black",
          marginRight: "24px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {isLoading && <CircularProgress sx={{ color: "#fff" }} />}
      </div> */}

      {/* Control Panel */}
      <div
        style={{
          width: "360px",
          backgroundColor: "#222",
          color: "#fff",
          padding: "20px",
          borderRadius: "8px",
          overflowY: "auto",
          maxHeight: "90vh",
          position: "relative",
        }}
      >
        {/* Close Button */}
        <button
          className="close-btn"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            fontSize: "20px",
            background: "transparent",
            border: "none",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        {/* Header */}
        <h3>Preview</h3>

        {/* Render Panel */}
        <div
          id="renderpanel"
          style={{ backgroundColor: "#222", padding: "10px", color: "#fff" }}
        >
          <b>Display Mode</b>
          <br />
          <input
            type="radio"
            id="mip-radio-button"
            name="displaymode"
            value="mip"
            defaultChecked
          />
          <label htmlFor="mip-radio-button">MIP</label>
          <input
            type="radio"
            id="iso-radio-button"
            name="displaymode"
            value="iso"
          />
          <label htmlFor="iso-radio-button">Isosurface</label>

          <b>Colormap</b>
          <br />
          <label htmlFor="clim-low">Lower-bound</label>
          <input
            id="clim-low"
            type="range"
            min="1"
            step="0.25"
            max="100"
            defaultValue="50"
            disabled
          />
          <br />
          <label htmlFor="clim-hi">Upper-bound</label>
          <input
            id="clim-hi"
            type="range"
            min="1"
            step="0.25"
            max="100"
            defaultValue="50"
            disabled
          />
          <br />
          <label htmlFor="isothreshold">Threshold</label>
          <input
            id="isothreshold"
            type="range"
            min="0"
            step="0.01"
            max="1"
            defaultValue="0.5"
            disabled
          />
        </div>

        <b>Cross Sections</b>
        <br />
        <div className="controlrow">
          X<label htmlFor="cross-x-low">Min</label>
          <input
            id="cross-x-low"
            type="range"
            min="0"
            max="1"
            defaultValue="0"
            step="any"
          />
          <label htmlFor="cross-x-hi">Max</label>
          <input
            id="cross-x-hi"
            type="range"
            min="0"
            max="1"
            defaultValue="1"
            step="any"
          />
        </div>
        <div className="controlrow">
          Y<label htmlFor="cross-y-low">Min</label>
          <input
            id="cross-y-low"
            type="range"
            min="0"
            max="1"
            defaultValue="0"
            step="any"
          />
          <label htmlFor="cross-y-hi">Max</label>
          <input
            id="cross-y-hi"
            type="range"
            min="0"
            max="1"
            defaultValue="1"
            step="any"
          />
        </div>
        <div className="controlrow">
          Z<label htmlFor="cross-z-low">Min</label>
          <input
            id="cross-z-low"
            type="range"
            min="0"
            max="1"
            defaultValue="0"
            step="any"
          />
          <label htmlFor="cross-z-hi">Max</label>
          <input
            id="cross-z-hi"
            type="range"
            min="0"
            max="1"
            defaultValue="1"
            step="any"
          />
        </div>
        <div id="taxis">
          T<label htmlFor="cross-t">Time</label>
          <input
            id="cross-t"
            type="range"
            min="0"
            max="1"
            defaultValue="0"
            step="1"
          />
        </div>

        <b>Clip Plane</b>
        <br />
        <label htmlFor="camera-near">Near</label>
        <input
          id="camera-near"
          type="range"
          min="1"
          max="100"
          defaultValue="50"
        />
        <br />
        <label htmlFor="camera-far">Far</label>
        <input
          id="camera-far"
          type="range"
          min="1"
          max="100"
          defaultValue="50"
        />

        <b>View</b>
        <br />
        <button id="neg-x-view">-X</button>
        <button id="pos-x-view">+X</button>
        <button id="neg-y-view">-Y</button>
        <button id="pos-y-view">+Y</button>
        <button id="neg-z-view">-Z</button>
        <button id="pos-z-view">+Z</button>
      </div>
    </div>
  );
};

export default PreviewModal;
