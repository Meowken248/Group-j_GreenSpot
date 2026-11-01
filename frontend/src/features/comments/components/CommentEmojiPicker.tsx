import React, { useState, useEffect, useRef } from "react";

interface CommentEmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  className?: string;
}

interface EmojiCategory {
  id: string;
  label: string;
  icon: string;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    label: "Mặt cười",
    icon: "😊",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
      "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
      "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔",
      "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥",
      "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮",
      "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓",
      "🧐", "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "🥺", "😦",
      "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞",
      "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "💀", "💩"
    ],
  },
  {
    id: "eco",
    label: "Môi trường & Thiên nhiên",
    icon: "🌱",
    emojis: [
      "🌱", "🌿", "☘️", "🍀", "🍃", "🎋", "🪴", "🌲", "🌳", "🌴",
      "🌾", "💐", "🌷", "🌹", "🥀", "🌺", "🌸", "🌼", "🌻", "🌞",
      "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️",
      "❄️", "☃️", "🌬️", "💨", "💧", "💦", "🫧", "🌊", "🌍", "🌎",
      "🌏", "🏔️", "⛰️", "🌋", "🏕️", "🏜️", "🏝️", "🏞️", "♻️", "🚮",
      "🚯", "🚰", "🚲", "🚴", "🛵", "🛴", "🔋", "🔌", "💡", "☀️",
      "🐝", "🦋", "🐞", "🐦", "🦜", "🐢", "🐟", "🐬", "🐳", "🐋"
    ],
  },
  {
    id: "gestures",
    label: "Cử chỉ & Biểu tượng",
    icon: "👍",
    emojis: [
      "👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "🤳",
      "💪", "🦾", "✌️", "🤞", "🤟", "🤘", "👌", "🤌", "🤏", "👈",
      "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤙",
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "💔",
      "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
      "⭐", "🌟", "✨", "⚡", "🔥", "💥", "🎉", "🎊", "🏆", "🥇",
      "✅", "❌", "💯", "⚠️", "🔔", "📢", "💬", "💭", "🎯", "📌"
    ],
  },
];

export const CommentEmojiPicker: React.FC<CommentEmojiPickerProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<string>("smileys");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Đóng khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeTab) || EMOJI_CATEGORIES[0];

  const filteredEmojis = searchTerm.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((emoji) => emoji.includes(searchTerm.trim()))
    : currentCategory.emojis;

  return (
    <div
      ref={containerRef}
      className={`comment-emoji-picker-popover ${className}`}
      role="dialog"
      aria-label="Chọn biểu tượng cảm xúc"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header tab danh mục */}
      <div className="emoji-picker-tabs">
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`emoji-tab-btn ${activeTab === cat.id && !searchTerm ? "is-active" : ""}`}
            onClick={() => {
              setActiveTab(cat.id);
              setSearchTerm("");
            }}
            title={cat.label}
          >
            <span className="tab-icon">{cat.icon}</span>
            <span className="tab-label">{cat.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {/* Grid danh sách emojis */}
      <div className="emoji-grid-viewport">
        {filteredEmojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            className="emoji-btn-item"
            onClick={() => onSelectEmoji(emoji)}
            title={emoji}
            aria-label={`Chọn biểu tượng ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Footer gợi ý nhanh cho GreenSpot */}
      <div className="emoji-picker-quick-bar">
        <span className="quick-label">Gợi ý xanh:</span>
        {["🌱", "🌿", "🌍", "♻️", "💚", "👍", "👏"].map((ecoEmoji) => (
          <button
            key={ecoEmoji}
            type="button"
            className="quick-emoji-btn"
            onClick={() => onSelectEmoji(ecoEmoji)}
            title={ecoEmoji}
            aria-label={`Chọn biểu tượng ${ecoEmoji}`}
          >
            {ecoEmoji}
          </button>
        ))}
      </div>
    </div>
  );
};
