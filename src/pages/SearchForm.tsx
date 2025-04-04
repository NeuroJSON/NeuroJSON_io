import React, { useEffect, useRef, useState } from "react";

// Define the form data type (simplified for the demo)
interface FormData {
  keyword: string;
  gender: string;
}

// Simplified schema with just two fields
const schema = {
  title: "Metadata Search",
  type: "object",
  properties: {
    keyword: { title: "Search keyword", type: "string" },
    gender: {
      title: "Subject gender",
      type: "string",
      enum: ["male", "female", "unknown", "any"],
      default: "any",
    },
  },
};

const SearchForm: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const jsonEditorRef = useRef<JSONEditorInstance | null>(null);
  const [counter, setCounter] = useState(0);
  const [showEditor, setShowEditor] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    keyword: "",
    gender: "any",
  });

  useEffect(() => {
    console.log("React formData state:", formData);
  }, [formData]);

  // Initialize jsoneditor using the global JSONEditor
  useEffect(() => {
    if (editorRef.current && typeof JSONEditor !== "undefined") {
      jsonEditorRef.current = new JSONEditor(editorRef.current, {
        schema,
        theme: "spectre",
        startval: { keyword: "visual AND memory", gender: "any" },
      });

      return () => {
        jsonEditorRef.current?.destroy();
        jsonEditorRef.current = null;
      };
    }
  }, [showEditor]);

  //   Function to trigger a re-render
  const handleIncrement = () => {
    setCounter((prev) => prev + 1);
  };

  const toggleEditor = () => {
    setShowEditor((prev) => !prev);
  };

  return (
    <div className="builder-wrapper">
      <h3 style={{ color: "white" }}>Demo: jsoneditor DOM Conflict in React</h3>

      {/* <button
        onClick={() => {
          const value = jsonEditorRef.current?.getValue();
            if (value) {
              console.log("User submitted:", value);
              setFormData(value); // Update React state
            }
        }}
        className="submit-btn"
        style={{ marginLeft: "10px" }}
      >
        Send / Submit
      </button> */}
      <button onClick={toggleEditor} className="submit-btn">
        {showEditor ? "Hide Editor" : "Show Editor"}
      </button>
      {/* JSONEditor container (conditionally rendered) */}
      {showEditor && (
        <>
          <div style={{ marginTop: "20px" }}>
            <h4 style={{ color: "white" }}>Simplified Search Form</h4>
            <div ref={editorRef} />
          </div>
          {/* Buttons */}
          <div style={{ marginBottom: "20px" }}>
            <button
              onClick={handleIncrement}
              className="submit-btn"
              style={{ marginRight: "10px" }}
            >
              Increment Counter (Trigger Re-render)
            </button>
          </div>

          <p style={{ color: "white" }}>Counter: {counter}</p>
        </>
      )}
    </div>
  );
};

export default SearchForm;
