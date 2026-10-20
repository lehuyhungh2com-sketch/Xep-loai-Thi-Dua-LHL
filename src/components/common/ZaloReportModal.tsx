import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageSquare } from 'lucide-react';
import { RankingEntry } from '../../types';

interface ZaloReportModalProps {
  selectedWeek: number;
  academicYear: string;
  rankings: RankingEntry[];
  onClose: () => void;
}

export const ZaloReportModal: React.FC<ZaloReportModalProps> = ({
  selectedWeek,
  academicYear,
  rankings,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  // Sort rankings by totalScore descending
  const sorted = [...rankings].sort((a, b) => b.totalScore - a.totalScore);
  const top3 = sorted.slice(0, 3);
  const bottom3 = [...sorted].reverse().slice(0, 3);

  const reportText = `🏫 TRƯỜNG THCS LÊ HỮU LẬP
📊 KẾT QUẢ THI ĐUA NỀ NẾP - TUẦN ${selectedWeek}
🗓️ Năm học: ${academicYear}
-----------------------------------
🥇 TOP 3 LỚP DẪN ĐẦU TUẦN:
${top3
  .map(
    (r, idx) =>
      `${idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} Lớp ${r.classItem.name} (${r.campus.name}): ${r.totalScore}đ [${r.performanceTier}]`
  )
  .join('\n')}

⚠️ CÁC LỚP CẦN CỐ GẮNG HƠN:
${bottom3
  .map(
    (r) =>
      `- Lớp ${r.classItem.name} (${r.campus.name}): ${r.totalScore}đ [${r.performanceTier}]`
  )
  .join('\n')}
-----------------------------------
📌 Đề nghị GVCN các lớp triển khai nhắc nhở học sinh nghiêm túc chấp hành nội quy nề nếp.
Trân trọng!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Share2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Sao chép Báo cáo Zalo / Telegram</h3>
              <p className="text-xs text-slate-500">Mẫu tin nhắn tóm tắt kết quả thi đua Tuần {selectedWeek}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Nội dung tin nhắn (Tự động định dạng):
          </label>
          <textarea
            readOnly
            value={reportText}
            rows={12}
            className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-800 focus:outline-hidden resize-none selection:bg-blue-100"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check size={16} />
                <span>Đã sao chép vào bộ nhớ tạm!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Sao chép Mẫu Zalo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
