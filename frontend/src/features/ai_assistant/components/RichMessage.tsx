import React from "react";

/**
 * Renderer văn bản "markdown nhẹ" cho bong bóng chat của Trợ lý AI (Chức năng 24).
 *
 * Lý do: câu trả lời của Kira AI và của Fallback Engine đều dùng **in đậm**, *in nghiêng*,
 * gạch đầu dòng (•, -, *) và danh sách đánh số. Trước đây bubble render thuần text nên người
 * dùng thấy các ký tự ** và * thô. Component này chuyển chúng sang JSX (KHÔNG dùng
 * dangerouslySetInnerHTML nên an toàn với nội dung do LLM sinh ra).
 */
interface RichMessageProps {
  content: string;
}

const BULLET_PATTERN = /^[•\-*]\s+(.*)$/;
const NUMBERED_PATTERN = /^(\d{1,2})[.)]\s+(.*)$/;
const HEADING_PATTERN = /^#{1,6}\s+(.*)$/;
const INLINE_PATTERN = /\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/g;

/** Chuyển **bold**, `code`, *italic* trong một dòng thành ReactNode */
const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  const pattern = new RegExp(INLINE_PATTERN.source, "g");
  let cursor = 0;
  let match = pattern.exec(text);

  while (match !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }
    const key = `${keyPrefix}-${match.index}`;
    if (match[1] !== undefined) {
      nodes.push(<strong key={key}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      nodes.push(<code key={key}>{match[2]}</code>);
    } else if (match[3] !== undefined) {
      nodes.push(<em key={key}>{match[3]}</em>);
    }
    cursor = match.index + match[0].length;
    match = pattern.exec(text);
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
};

export const RichMessage: React.FC<RichMessageProps> = ({ content }) => {
  const lines = content.split(/\r?\n/);

  return (
    <div className="rich-message" data-testid="rich-message">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();

        // Dòng trống -> khoảng nghỉ giữa các đoạn
        if (!line) {
          return <div className="rich-gap" key={`gap-${index}`} aria-hidden="true" />;
        }

        // Tiêu đề markdown (#, ##, ...)
        const heading = line.match(HEADING_PATTERN);
        if (heading) {
          return (
            <div className="rich-heading" key={`heading-${index}`}>
              {renderInline(heading[1], `heading-${index}`)}
            </div>
          );
        }

        // Danh sách đánh số: 1. 2. 3.
        const numbered = line.match(NUMBERED_PATTERN);
        if (numbered) {
          return (
            <div className="rich-list-item" key={`num-${index}`}>
              <span className="rich-item-marker">{numbered[1]}.</span>
              <span className="rich-item-text">{renderInline(numbered[2], `num-${index}`)}</span>
            </div>
          );
        }

        // Gạch đầu dòng: •, -, *
        const bullet = line.match(BULLET_PATTERN);
        if (bullet) {
          return (
            <div className="rich-list-item" key={`bullet-${index}`}>
              <span className="rich-item-marker">•</span>
              <span className="rich-item-text">{renderInline(bullet[1], `bullet-${index}`)}</span>
            </div>
          );
        }

        // Đoạn văn thường
        return (
          <div className="rich-line" key={`line-${index}`}>
            {renderInline(line, `line-${index}`)}
          </div>
        );
      })}
    </div>
  );
};

export default RichMessage;
