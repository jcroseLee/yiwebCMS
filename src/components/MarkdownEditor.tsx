import React from "react";
import SimpleMDE from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";
import "./MarkdownEditor.css";

interface MarkdownEditorProps {
  value?: string;
  onChange?: (value: string) => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
}) => {
  return (
    <SimpleMDE
      value={value}
      onChange={onChange}
      options={{
        spellChecker: false,
        status: false,
        placeholder: "Write your article here...",
      }}
    />
  );
};
