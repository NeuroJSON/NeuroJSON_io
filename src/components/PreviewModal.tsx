import React, { useEffect } from "react";

const PreviewModal: React.FC<{
  isOpen: boolean;
  dataKey: any;
  isInternal: boolean;
  onClose: () => void;
}> = ({ isOpen, dataKey, isInternal, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      console.log("🟢 Opening PreviewModal for:", dataKey);

      setTimeout(() => {
        // let canvas = document.querySelector("#canvas");

        // if (!canvas) {
        //   console.error("❌ Error: #canvas element not found in DOM!");
        //   return;
        // }

        if (typeof (window as any).previewdata === "function") {
          console.log("Calling previewdata to handle Three.js init...");
          (window as any).previewdata(dataKey, 0, isInternal, false);
        } else {
          console.error("❌ previewdata() is not defined!");
        }
      }, 100); // Small delay ensures modal is rendered first
    }
  }, [isOpen, dataKey]);

  if (!isOpen) return null;
  return (
    // <div className="preview-modal">
    //     <div className="modal-header">
    //         <h3>Preview</h3>
    //         <button className="close-btn" onClick={onClose}>×</button>
    //     </div>

    //     {/* ✅ Display Mode Section */}
    //     <div id="renderpanel" style={{ width: "100%", backgroundColor: "#222", padding: "10px", color: "#fff" }}>
    //         <b>Display Mode</b><br />
    //         <input type="radio" id="mip-radio-button" name="displaymode" value="mip" defaultChecked />
    //         <label htmlFor="mip-radio-button">MIP</label>
    //         <input type="radio" id="iso-radio-button" name="displaymode" value="iso" />
    //         <label htmlFor="iso-radio-button">Isosurface</label>

    //         {/* ✅ Colormap Section */}
    //         <b>Colormap</b><br />
    //         <label htmlFor="clim-low">Lower-bound</label>
    //         <input id="clim-low" type="range" min="1" step="0.25" max="100" defaultValue="50" disabled /><br />
    //         <label htmlFor="clim-hi">Upper-bound</label>
    //         <input id="clim-hi" type="range" min="1" step="0.25" max="100" defaultValue="50" disabled /><br />
    //         <label htmlFor="isothreshold">Threshold</label>
    //         <input id="isothreshold" type="range" min="0" step="0.01" max="1" defaultValue="0.5" disabled />
    //     </div>

    //     {/* ✅ Cross Sections Section */}
    //     <b>Cross Sections</b><br />
    //     <div className="controlrow">
    //         X
    //         <label htmlFor="cross-x-low">Min</label>
    //         <input id="cross-x-low" type="range" min="0" max="1" defaultValue="0" step="any" />
    //         <label htmlFor="cross-x-hi">Max</label>
    //         <input id="cross-x-hi" type="range" min="0" max="1" defaultValue="1" step="any" />
    //     </div>
    //     <div className="controlrow">
    //         Y
    //         <label htmlFor="cross-y-low">Min</label>
    //         <input id="cross-y-low" type="range" min="0" max="1" defaultValue="0" step="any" />
    //         <label htmlFor="cross-y-hi">Max</label>
    //         <input id="cross-y-hi" type="range" min="0" max="1" defaultValue="1" step="any" />
    //     </div>
    //     <div className="controlrow">
    //         Z
    //         <label htmlFor="cross-z-low">Min</label>
    //         <input id="cross-z-low" type="range" min="0" max="1" defaultValue="0" step="any" />
    //         <label htmlFor="cross-z-hi">Max</label>
    //         <input id="cross-z-hi" type="range" min="0" max="1" defaultValue="1" step="any" />
    //     </div>
    //     <div id="taxis">
    //         T
    //         <label htmlFor="cross-t">Time</label>
    //         <input id="cross-t" type="range" min="0" max="1" defaultValue="0" step="1" />
    //     </div>

    //     {/* ✅ Clip Plane Section */}
    //     <b>Clip Plane</b><br />
    //     <label htmlFor="camera-near">Near</label>
    //     <input id="camera-near" type="range" min="1" max="100" defaultValue="50" /><br />
    //     <label htmlFor="camera-far">Far</label>
    //     <input id="camera-far" type="range" min="1" max="100" defaultValue="50" />

    //     {/* ✅ View Section */}
    //     <b>View</b><br />
    //     <button id="neg-x-view">-X</button>
    //     <button id="pos-x-view">+X</button>
    //     <button id="neg-y-view">-Y</button>
    //     <button id="pos-y-view">+Y</button>
    //     <button id="neg-z-view">-Z</button>
    //     <button id="pos-z-view">+Z</button>

    //     {/* ✅ Ensure proper rendering with <canvas> */}
    //     <div
    //       id="canvas"
    //       style={{
    //         backgroundColor: '#000',
    //         width: '937px',
    //         height: '750px',
    //         border: '1px solid black',
    //         padding: 0,
    //         float: 'left',
    //       }}
    //     ></div>
    // </div>
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
    }}
  ></div>

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
      <b>Display Mode</b><br />
      <input type="radio" id="mip-radio-button" name="displaymode" value="mip" defaultChecked />
      <label htmlFor="mip-radio-button">MIP</label>
      <input type="radio" id="iso-radio-button" name="displaymode" value="iso" />
      <label htmlFor="iso-radio-button">Isosurface</label>

      <b>Colormap</b><br />
      <label htmlFor="clim-low">Lower-bound</label>
      <input id="clim-low" type="range" min="1" step="0.25" max="100" defaultValue="50" disabled /><br />
      <label htmlFor="clim-hi">Upper-bound</label>
      <input id="clim-hi" type="range" min="1" step="0.25" max="100" defaultValue="50" disabled /><br />
      <label htmlFor="isothreshold">Threshold</label>
      <input id="isothreshold" type="range" min="0" step="0.01" max="1" defaultValue="0.5" disabled />
    </div>

    <b>Cross Sections</b><br />
    <div className="controlrow">
      X
      <label htmlFor="cross-x-low">Min</label>
      <input id="cross-x-low" type="range" min="0" max="1" defaultValue="0" step="any" />
      <label htmlFor="cross-x-hi">Max</label>
      <input id="cross-x-hi" type="range" min="0" max="1" defaultValue="1" step="any" />
    </div>
    <div className="controlrow">
      Y
      <label htmlFor="cross-y-low">Min</label>
      <input id="cross-y-low" type="range" min="0" max="1" defaultValue="0" step="any" />
      <label htmlFor="cross-y-hi">Max</label>
      <input id="cross-y-hi" type="range" min="0" max="1" defaultValue="1" step="any" />
    </div>
    <div className="controlrow">
      Z
      <label htmlFor="cross-z-low">Min</label>
      <input id="cross-z-low" type="range" min="0" max="1" defaultValue="0" step="any" />
      <label htmlFor="cross-z-hi">Max</label>
      <input id="cross-z-hi" type="range" min="0" max="1" defaultValue="1" step="any" />
    </div>
    <div id="taxis">
      T
      <label htmlFor="cross-t">Time</label>
      <input id="cross-t" type="range" min="0" max="1" defaultValue="0" step="1" />
    </div>

    <b>Clip Plane</b><br />
    <label htmlFor="camera-near">Near</label>
    <input id="camera-near" type="range" min="1" max="100" defaultValue="50" /><br />
    <label htmlFor="camera-far">Far</label>
    <input id="camera-far" type="range" min="1" max="100" defaultValue="50" />

    <b>View</b><br />
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

