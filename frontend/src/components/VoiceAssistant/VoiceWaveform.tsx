import React, { useEffect, useRef, useState } from "react";
import "./VoiceAssistant.scss";

interface VoiceWaveformProps {
  stream?: MediaStream | null;
  isListening: boolean;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ stream, isListening }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0.5);

  useEffect(() => {
    if (!isListening) return;

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animationFrameId: number;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (stream && window.AudioContext) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContext = new AudioCtx();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const renderFrame = () => {
          if (!analyser || !ctx || !canvas) return;
          analyser.getByteFrequencyData(dataArray);

          // Tính mức độ âm lượng trung bình
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length / 255;
          setAudioLevel(avg);

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const barCount = 28;
          const barWidth = 6;
          const spacing = (canvas.width - barCount * barWidth) / (barCount - 1);
          const centerY = canvas.height / 2;

          for (let i = 0; i < barCount; i++) {
            const index = Math.floor((i / barCount) * dataArray.length);
            const value = dataArray[index] / 255; // 0.0 -> 1.0
            const dynamicHeight = Math.max(8, value * (canvas.height * 0.85));

            // Hiệu ứng dải màu gradient xanh lá cây mượt mà
            const gradient = ctx.createLinearGradient(0, centerY - dynamicHeight / 2, 0, centerY + dynamicHeight / 2);
            gradient.addColorStop(0, "#10b981");
            gradient.addColorStop(0.5, "#34d399");
            gradient.addColorStop(1, "#059669");

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(
              i * (barWidth + spacing),
              centerY - dynamicHeight / 2,
              barWidth,
              dynamicHeight,
              3
            );
            ctx.fill();
          }

          animationFrameId = requestAnimationFrame(renderFrame);
        };

        renderFrame();
      } catch (e) {
        console.warn("AudioContext init error:", e);
      }
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (source) source.disconnect();
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {});
      }
    };
  }, [stream, isListening]);

  return (
    <div className="voice-waveform-container" data-testid="voice-waveform">
      <canvas
        ref={canvasRef}
        width={360}
        height={100}
        className="waveform-canvas"
      />
      {/* CSS fallback wave bars khi canvas chưa render */}
      <div className="css-waveform-fallback" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, idx) => (
          <span
            key={idx}
            className="wave-bar"
            style={{
              animationDelay: `${(idx * 0.08).toFixed(2)}s`,
              height: `${Math.max(12, Math.sin((idx + 1) * 0.5) * 45 * (0.6 + audioLevel * 0.4))}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
