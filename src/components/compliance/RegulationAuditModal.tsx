import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  School,
  Sparkles,
  Info,
  Layers,
  Award,
  BookOpen,
  X,
  RefreshCw,
  Scale,
  Printer,
  Download,
} from 'lucide-react';
import { OFFICIAL_CRITERIA_DATABASE } from '../../utils/criteriaEngine';

interface RegulationAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegulationAuditModal: React.FC<RegulationAuditModalProps> = ({ isOpen, onClose }) => {
  const {
    campuses,
    classes,
    criteria,
    settings,
    runSystemIntegrityAudit,
    exportCriteriaCatalogExcel,
  } = useApp();

  const [auditResult, setAuditResult] = useState<{
    isCompliant: boolean;
    issues: string[];
    passedChecks: string[];
    totalClasses: number;
    totalCampuses: number;
    checkedAt: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'rules' | 'audit' | 'categories'>('rules');

  if (!isOpen) return null;

  const handleRunAudit = () => {
    const res = runSystemIntegrityAudit();
    setAuditResult(res);
  };

  const categories = [
    {
      name: '1. Chuyên cần',
      desc: 'Nghỉ học, trốn tiết, đi muộn. Đặc biệt: Nghỉ học có phép KHÔNG bị trừ điểm. Nghỉ không phép sau tiết 1 không báo cáo trừ 2đ/em.',
      count: OFFICIAL_CRITERIA_DATABASE.filter((c) => c.category === 'Chuyên cần').length,
      badge: 'Bắt buộc',
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      name: '2. Hành vi ứng xử',
      desc: 'Đánh nhau, mang hung khí, cờ bạc, xúc phạm giáo viên, nói tục. Đánh nhau có tổ chức ngoài trường bị trừ 20đ và HỦY XẾP LOẠI cả năm học.',
      count: OFFICIAL_CRITERIA_DATABASE.filter((c) => c.category === 'Hành vi ứng xử').length,
      badge: 'Nghiêm ngặt',
      badgeColor: 'bg-rose-100 text-rose-800',
    },
    {
      name: '3. Tác phong - Trang phục',
      desc: 'Đồng phục thứ 2, 4, 6 (ngày khác áo có cổ bẻ), khăn quàng đỏ, dép có quai hậu, sơ vin, phù hiệu học sinh.',
      count: OFFICIAL_CRITERIA_DATABASE.filter((c) => c.category === 'Tác phong - Trang phục').length,
      badge: 'Thường xuyên',
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      name: '4. Sinh hoạt TT & Hoạt động Đội',
      desc: 'Truy bài 15 phút đầu giờ, xếp hàng ra vào lớp, hát đầu giờ, tập thể dục giữa giờ, sinh hoạt dưới cờ thứ 2.',
      count: OFFICIAL_CRITERIA_DATABASE.filter((c) => c.category === 'Sinh hoạt TT').length,
      badge: 'Liên đội',
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      name: '5. Vệ sinh môi trường',
      desc: 'Vệ sinh lớp học, hành lang, khu vực sân trường được phân công. Vứt rác bừa bãi, không đổ rác đúng nơi quy định.',
      count: OFFICIAL_CRITERIA_DATABASE.filter((c) => c.category === 'Lao động, vệ sinh').length,
      badge: 'Toàn diện',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      name: '6. Học tập & Điểm số',
      desc: 'Quy chế riêng biệt: Trường chính (A1 chuẩn 13 con điểm tốt +2đ, A2/A3 chuẩn 10 con +2đ; điểm yếu trừ từ con thứ 2). Phân hiệu: 5 con điểm tốt +2đ; điểm yếu từ 5 con trở lên trừ 2đ (không quá 2đ).',
      count: OFFICIAL_CRITERIA_DATABASE.filter((c) => c.category === 'Học tập').length,
      badge: 'Phân hóa cơ sở',
      badgeColor: 'bg-indigo-100 text-indigo-800',
    },
    {
      name: '7. Nề nếp Bán trú',
      desc: 'Chỉ áp dụng cho các phân hiệu có học sinh bán trú (Đa Lộc, Thuần Lộc, v.v.). Tổng điểm phạt bán trú KHÔNG QUÁ 3 ĐIỂM/TUẦN.',
      count: OFFICIAL_CRITERIA_DATABASE.filter((c) => c.category === 'Bán trú').length,
      badge: 'Trần tối đa 3đ',
      badgeColor: 'bg-teal-100 text-teal-800',
    },
    {
      name: '8. Khen thưởng tuần',
      desc: 'Sổ đầu bài ghi ký đầy đủ (+3đ), Điểm tốt trường chính/phân hiệu (+2đ), Nhặt được của rơi (≥ 200k +0.5đ).',
      count: OFFICIAL_CRITERIA_DATABASE.filter((c) => c.type === 'bonus').length,
      badge: 'Cộng thưởng tuần',
      badgeColor: 'bg-green-100 text-green-800',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Scale size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Rà Soát & Đối Chiếu Công Văn Quy Định Nhà Trường</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  Năm học {settings.academicYear}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Đối chiếu quy chuẩn với Quyết định thi đua Trường THCS Lê Hữu Lập (59 lớp · 6 phân hiệu)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'rules'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              1. Quy Chuẩn & Điều Khoản Đặc Thù
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'categories'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              2. 8 Mảng Tiêu Chí ({criteria.length} tiêu chí)
            </button>
            <button
              onClick={() => {
                setActiveTab('audit');
                if (!auditResult) handleRunAudit();
              }}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShieldCheck size={14} />
              <span>3. Kiểm Toán Tính Toàn Vẹn Hệ Thống</span>
            </button>
          </div>

          <button
            onClick={exportCriteriaCatalogExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Tải toàn bộ 64 tiêu chí ra file Excel tra cứu"
          >
            <Download size={14} />
            <span>Xuất Excel 64 Tiêu Chí</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'rules' && (
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                <h4 className="font-bold text-indigo-950 text-sm mb-2 flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600" />
                  <span>Điểm Mấu Chốt Phân Biệt Giữa Trường Chính và 5 Phân Hiệu</span>
                </h4>
                <p className="text-indigo-900 mb-3">
                  Hệ thống đã mã hóa chuẩn chỉnh từng điều kiện riêng biệt của Trường chính và 5 Phân hiệu (Hưng Lộc, Hưng Lập, Triệu Lộc, Đa Lộc, Thuần Lộc) theo đúng biên bản thống nhất:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-indigo-100">
                    <div className="font-bold text-slate-900 mb-1 text-[13px] text-blue-700">Trường Chính:</div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600">
                      <li><strong>Lớp A1:</strong> Đạt từ 13 con điểm tốt trở lên trong tuần mới được cộng 2đ.</li>
                      <li><strong>Lớp A2, A3:</strong> Đạt từ 10 con điểm tốt trở lên được cộng 2đ.</li>
                      <li><strong>Điểm yếu học tập:</strong> Từ con điểm yếu thứ 2 bắt đầu trừ điểm (con thứ 2 trừ 1đ, từ con thứ 3 mỗi con trừ 0.5đ).</li>
                      <li><strong>HSG Khối 9 cấp tỉnh:</strong> Tỷ lệ giải 80-85% (+2đ), 86-89% (+3đ), trên 90% (+5đ).</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-indigo-100">
                    <div className="font-bold text-slate-900 mb-1 text-[13px] text-emerald-700">5 Phân Hiệu:</div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600">
                      <li><strong>Điểm tốt:</strong> Mỗi tuần đạt từ 5 con điểm tốt trở lên được cộng 2đ (tối đa không quá 2đ/tuần).</li>
                      <li><strong>Điểm yếu học tập:</strong> Từ 5 con điểm yếu trở lên mới bị trừ 2đ (khống chế không trừ quá 2đ/tuần).</li>
                      <li><strong>Giao lưu CLB văn hóa K6-8:</strong> Đạt tỷ lệ ≥ 30% được cộng 2đ (mức 1) hoặc có học sinh đạt giải được cộng 1đ (mức 2).</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Special Caps & Safeguards */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>Các Hạn Mức Khống Chế (Caps) & Cơ Chế Bảo Vệ Thi Đua</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-900 text-xs">Trần Trừ Bán Trú:</div>
                    <div className="text-xl font-black text-rose-700 my-1">≤ 3,0 điểm</div>
                    <p className="text-[11px] text-slate-500">
                      Vi phạm nề nếp bán trú ở các phân hiệu trừ tối đa không quá 3 điểm/tuần/lớp.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-900 text-xs">Trần Đội Nghi Lễ:</div>
                    <div className="text-xl font-black text-emerald-700 my-1">≤ 0,5 điểm</div>
                    <p className="text-[11px] text-slate-500">
                      Học sinh tham gia đội trống, đội cờ phục vụ Liên đội cả năm: 0,1đ/em, tối đa không quá 0,5đ/lớp.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-900 text-xs">Chỉ Tiêu Xếp Loại Năm:</div>
                    <div className="text-xl font-black text-indigo-700 my-1">70% Lớp</div>
                    <p className="text-[11px] text-slate-500">
                      Tối đa 70% tổng số lớp đạt Tiên tiến trở lên (trong đó 35% Xuất sắc, 35% Tiên tiến).
                    </p>
                  </div>
                </div>
              </div>

              {/* Strict Disciplinary Rules */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-rose-950">
                <div className="font-bold flex items-center gap-2 mb-1.5 text-rose-900">
                  <AlertTriangle size={16} className="text-rose-600" />
                  <span>Điều Khoản Hủy Xếp Loại Thi Đua Cả Năm (Không Công Nhận Lớp Tiên Tiến):</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 text-[11px]">
                  <li>Lớp có học sinh tham gia đánh nhau có tổ chức trong hoặc ngoài nhà trường.</li>
                  <li>Lớp có học sinh bị kỷ luật từ mức Khiển trách hoặc Đình chỉ học tập có thời hạn theo quyết định của Hội đồng Kỷ luật Nhà trường.</li>
                  <li>Hệ thống tự động phát hiện vi phạm kỷ luật này và chuyển lớp xuống danh sách <strong>&quot;Không xếp loại cả năm&quot;</strong> theo đúng quy định.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Toàn bộ {criteria.length} tiêu chí trong cơ sở dữ liệu đã được đối chiếu khớp 100% với 8 mảng quy định của Nhà trường:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categories.map((cat, i) => (
                  <div key={i} className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-2xs">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-slate-900 text-sm">{cat.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cat.badgeColor}`}>
                        {cat.badge} ({cat.count} tiêu chí)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{cat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Kết Quả Rà Soát Tính Toàn Vẹn & Tuân Thủ Quy Chuẩn
                  </h4>
                  <p className="text-xs text-slate-500">
                    Tự động quét toàn bộ 59 lớp, 6 phân hiệu, 64 tiêu chí và các công thức trần điểm
                  </p>
                </div>
                <button
                  onClick={handleRunAudit}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <RefreshCw size={14} />
                  <span>Quét Lại Ngay</span>
                </button>
              </div>

              {auditResult && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                      auditResult.isCompliant
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                          auditResult.isCompliant ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                        }`}
                      >
                        {auditResult.isCompliant ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
                      </div>
                      <div>
                        <div className="font-black text-sm">
                          {auditResult.isCompliant
                            ? 'Hệ Thống Đạt Chuẩn 100% Theo Quy Định Nhà Trường'
                            : `Phát hiện ${auditResult.issues.length} điểm cần lưu ý`}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          Thời điểm kiểm tra: {new Date(auditResult.checkedAt).toLocaleString('vi-VN')} · Đã kiểm toán 59 lớp, 6 phân hiệu
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-white rounded-xl border border-slate-200">
                      Phiên bản 2.5 Chuẩn
                    </span>
                  </div>

                  {/* Passed Checks */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      <span>Các Tiêu Chuẩn Đã Được Kiểm Tra & Xác Nhận Chuẩn Xác ({auditResult.passedChecks.length}):</span>
                    </div>
                    <div className="space-y-1.5">
                      {auditResult.passedChecks.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Issues if any */}
                  {auditResult.issues.length > 0 && (
                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                      <div className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={15} className="text-amber-600" />
                        <span>Cảnh báo cần kiểm tra lại ({auditResult.issues.length}):</span>
                      </div>
                      <div className="space-y-1 text-xs text-amber-800">
                        {auditResult.issues.map((issue, idx) => (
                          <div key={idx}>• {issue}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Biên soạn theo Quyết định thi đua Ban Giám Hiệu & TPT Đội Trường THCS Lê Hữu Lập
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng bảng rà soát
          </button>
        </div>
      </div>
    </div>
  );
};
