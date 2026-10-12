/**
 * BirthdayBanner (Widget Sinh nhật bạn bè hôm nay - Feature STT 17)
 * Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 142 - 145)
 */

import React, { useState } from "react";

interface BirthdayFriend {
  id: string;
  name: string;
  avatar?: string | null;
}

interface BirthdayBannerProps {
  onSendWish?: (friendName: string) => void;
}

export const BirthdayBanner: React.FC<BirthdayBannerProps> = ({ onSendWish }) => {
  const [wished, setWished] = useState(false);
  const sampleFriend: BirthdayFriend = {
    id: "bday-01",
    name: "Lê Hoàng Phúc",
    avatar: null,
  };

  const handleWish = () => {
    setWished(true);
    onSendWish?.(sampleFriend.name);
  };

  return (
    <div className="feed-birthday-banner">
      <div className="birthday-icon-badge">🎂</div>
      <div className="birthday-info-col">
        <h4 className="birthday-title">Sinh nhật bạn bè hôm nay</h4>
        <p className="birthday-desc">
          Hôm nay là sinh nhật của <strong>{sampleFriend.name}</strong>. Hãy gửi lời chúc sống xanh và thiệp sinh thái nhé!
        </p>
      </div>
      <div className="birthday-action-col">
        <button
          type="button"
          className={`btn-send-birthday-wish ${wished ? "wished" : ""}`}
          onClick={handleWish}
          disabled={wished}
        >
          {wished ? "🌱 Đã gửi lời chúc" : "🎉 Gửi lời chúc xanh"}
        </button>
      </div>
    </div>
  );
};
