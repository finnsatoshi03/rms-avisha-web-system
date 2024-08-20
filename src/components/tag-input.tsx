/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Input } from "./ui/input";
import { ArrowBigUp } from "lucide-react";

interface TagInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
}

export function TagInput({ tags, setTags }: TagInputProps) {
  const [inputValue, setInputValue] = useState<string>("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue) {
      e.preventDefault();
      setTags([...tags, inputValue]);
      setInputValue("");
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-wrap gap-1 my-2">
      {tags.map((tag, index) => (
        <div
          key={index}
          className="px-4 py-0.5 rounded-full text-sm bg-gray-500 w-fit text-white"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="ml-1"
          >
            &times;
          </button>
        </div>
      ))}
      <div className="relative w-full">
        <Input
          className="mt-2 focus-visible:ring-0 focus-visible:ring-offset-0"
          value={inputValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setInputValue(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Add accessories..."
        />
        <div className="absolute flex items-center gap-1 right-2 top-4 text-xs px-3 py-1 rounded-md bg-slate-700 text-white">
          <ArrowBigUp size={14} strokeWidth={1.5} />
          Enter
        </div>
      </div>
    </div>
  );
}
