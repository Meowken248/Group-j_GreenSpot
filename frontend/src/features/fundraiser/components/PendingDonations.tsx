import { useEffect, useRef, useState } from "react";
import type { FundraiserDonationItem } from "../types/fundraiser.types";
import { fundraiserService } from "../services/fundraiserService";

export function PendingDonations({campaignId, onConfirmed}: {campaignId: string; onConfirmed: () => Promise<void>}) {
  const [items, setItems] = useState<FundraiserDonationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const busyRef = useRef(false);
  const load = async () => setItems(await fundraiserService.getPendingDonations(campaignId));
  useEffect(() => {
    let active = true;
    fundraiserService.getPendingDonations(campaignId)
      .then(rows => { if (active) setItems(rows); })
      .catch(() => { if (active) setError("Không tải được các khoản chờ đối soát."); });
    return () => { active = false; };
  }, [campaignId]);
  const confirm = async (item: FundraiserDonationItem) => {
    if (busyRef.current || !window.confirm(`Chỉ xác nhận sau khi đã kiểm tra ngân hàng nhận đúng ${item.amount.toLocaleString("vi-VN")} đ, nội dung ${item.transaction_code}. Bạn đã đối soát khoản này?`)) return;
    busyRef.current = true;
    setProcessing(true);
    setError(null);
    try {
      await fundraiserService.confirmDonation(campaignId, item.donation_id);
      await load();
      await onConfirmed();
    } catch (err: unknown) {
      const detail = (err as {response?: {data?: {detail?: unknown}}}).response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Không thể xác nhận. Vui lòng tải lại danh sách.");
    } finally {
      busyRef.current = false;
      setProcessing(false);
    }
  };
  return <section className="pending-donations">
    <h4>Khoản chuyển tiền chờ đối soát</h4>
    {error && <p role="alert">{error}</p>}
    {items.length === 0 && !error && <p>Không có khoản chờ đối soát.</p>}
    {items.map(item => <div className="pending-donation-row" key={item.donation_id}>
      <span>{item.donor_name} · {item.amount.toLocaleString("vi-VN")} đ<br/>{item.transaction_code}</span>
      <button type="button" disabled={processing} onClick={() => { void confirm(item); }}>Xác nhận đã nhận tiền</button>
    </div>)}
  </section>;
}
