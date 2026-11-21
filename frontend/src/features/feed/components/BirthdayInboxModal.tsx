import React from "react";

export const BirthdayInboxModal: React.FC<any> = ({ onClose }) => {
  return (
    <div data-testid="birthday-inbox-modal-stub">
      <button onClick={onClose}>Đóng</button>
    </div>
  );
};
