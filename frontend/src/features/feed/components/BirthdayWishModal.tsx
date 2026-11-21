import React from "react";

export const MAX_WISH_LENGTH = 500;

export const BirthdayWishModal: React.FC<any> = ({ friend, onClose }) => {
  return (
    <div role="dialog" aria-modal="true" data-testid="birthday-wish-modal-stub">
      <h3>Gửi lời chúc đến {friend?.full_name}</h3>
      <button onClick={onClose}>Đóng</button>
    </div>
  );
};
