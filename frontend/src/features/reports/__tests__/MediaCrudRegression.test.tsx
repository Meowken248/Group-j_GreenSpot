import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { Step2MediaCapture } from "../components/Step2MediaCapture";
import { Step5ReviewAndSubmit } from "../components/Step5ReviewAndSubmit";
import { INITIAL_FORM_DATA } from "../types/report.types";
import * as service from "../services/reportService";
import { replaceQueueItem } from "../../offline/services/outboxQueueRepository";

vi.mock("../services/reportService", () => ({uploadMediaWithWatermark: vi.fn(), checkNearbyDuplicates: vi.fn(), submitIncidentReport: vi.fn()}));
vi.mock("../../offline/services/outboxQueueRepository", () => ({enqueueReport: vi.fn(), replaceQueueItem: vi.fn()}));

describe("Ảnh và gửi phản ánh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "onLine", {value: true, configurable: true});
    URL.createObjectURL = vi.fn(() => "blob:preview");
    vi.mocked(service.checkNearbyDuplicates).mockResolvedValue({has_duplicate: false, duplicate_count: 0, duplicates: []});
  });

  it("giữ cả hai ảnh khi upload kết thúc theo thứ tự ngược lại", async () => {
    const finish: ((value: any) => void)[] = [];
    vi.mocked(service.uploadMediaWithWatermark).mockImplementation(() => new Promise(r => finish.push(r)));
    function Harness() {
      const [data, setData] = useState(INITIAL_FORM_DATA);
      return <><Step2MediaCapture formData={data} onUpdateFormData={p => setData(d => ({...d, ...p}))} onPrevStep={vi.fn()} onNextStep={vi.fn()}/><output data-testid="media">{JSON.stringify(data.media)}</output></>;
    }
    const {container} = render(<Harness/>);
    fireEvent.change(container.querySelector('input[type="file"]')!, {target: {files: [
      new File(["a"], "a.png", {type: "image/png"}), new File(["b"], "b.png", {type: "image/png"}),
    ]}});
    expect(service.uploadMediaWithWatermark).toHaveBeenCalledTimes(2);
    await act(async () => { finish[1]({id: "b", file_url: "/uploads/b.png", media_type: "IMAGE"}); });
    await act(async () => { finish[0]({id: "a", file_url: "/uploads/a.png", media_type: "IMAGE"}); });
    const media = JSON.parse(screen.getByTestId("media").textContent!);
    expect(media).toHaveLength(2);
    expect(media.every((m: any) => !m.is_uploading)).toBe(true);
    expect(media.map((m: any) => m.file_url).join(" ")).toContain("/uploads/a.png");
    expect(media.map((m: any) => m.file_url).join(" ")).toContain("/uploads/b.png");
  });

  it("ảnh blob đã chụp offline phải được upload trước khi gửi online", async () => {
    vi.mocked(service.uploadMediaWithWatermark).mockResolvedValue({id: "a", file_url: "/uploads/a.png", thumbnail_url: "/uploads/a.png", media_type: "IMAGE"});
    vi.mocked(service.submitIncidentReport).mockRejectedValue(new Error("Dừng sau khi kiểm tra payload"));
    const formData = {...INITIAL_FORM_DATA, category_id: 1, title: "Rác", description: "Cần thu gom",
      location: {latitude: 10.77, longitude: 106.7, address_text: "Quận 1", is_within_hcmc: true},
      media: [{id: "offline", file_url: "blob:offline", thumbnail_url: "blob:offline", media_type: "IMAGE" as const, file: new File(["a"], "a.png", {type: "image/png"})}]};
    render(<Step5ReviewAndSubmit formData={formData} onNavigateStep={vi.fn()} onPrevStep={vi.fn()} onClearDraftAndReset={vi.fn()} onSessionExpired={vi.fn()} onGoHome={vi.fn()} onTrackIncident={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", {name: /🚀 Gửi phản ánh/}));
    await waitFor(() => expect(service.submitIncidentReport).toHaveBeenCalledTimes(1));
    expect(service.uploadMediaWithWatermark).toHaveBeenCalledTimes(1);
    expect(vi.mocked(service.submitIncidentReport).mock.calls[0][0].media[0].file_url).toBe("/uploads/a.png");
  });

  it("sửa mục hàng đợi khi có mạng vẫn qua giao dịch thay thế và kiểm tra phiên bản", async () => {
    vi.mocked(replaceQueueItem).mockRejectedValue(new Error("Phản ánh đã được thay đổi ở tab khác. Vui lòng tải lại trang."));
    const formData = {...INITIAL_FORM_DATA, category_id: 1, title: "Rác", description: "Cần thu gom",
      location: {latitude: 10.77, longitude: 106.7, address_text: "Quận 1", is_within_hcmc: true},
      media: [{id: "offline", file_url: "blob:offline", media_type: "IMAGE" as const, file: new File(["a"], "a.png", {type: "image/png"})}]};
    render(<Step5ReviewAndSubmit formData={formData} editingQueueItemId="old" editingQueueItemUpdatedAt={123} onNavigateStep={vi.fn()} onPrevStep={vi.fn()} onClearDraftAndReset={vi.fn()} onSessionExpired={vi.fn()} onGoHome={vi.fn()} onTrackIncident={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button", {name: /🚀 Gửi phản ánh/}));
    await screen.findByText(/Phản ánh đã được thay đổi ở tab khác/);
    expect(replaceQueueItem).toHaveBeenCalledWith("old", expect.objectContaining({title: "Rác"}), 123);
    expect(service.submitIncidentReport).not.toHaveBeenCalled();
  });
});
