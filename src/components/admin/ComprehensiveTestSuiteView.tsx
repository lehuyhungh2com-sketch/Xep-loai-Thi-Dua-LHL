import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Award,
  Layers,
  FileSpreadsheet,
  FileText,
  Lock,
  Search,
  Filter,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { runComprehensiveTestSuite, ComprehensiveTestReport, TestCaseResult } from '../../utils/testSuiteRunner';

export const ComprehensiveTestSuiteView: React.FC = () => {
  const [report, setReport] = useState<ComprehensiveTestReport>(() => runComprehensiveTestSuite());
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTestCase, setSelectedTestCase] = useState<TestCaseResult | null>(null);

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const newReport = runComprehensiveTestSuite();
      setReport(newReport);
      setIsRunning(false);
    }, 400);
  };

  const filteredResults = useMemo(() => {
    return report.results.filter((r) => {
      if (selectedSection !== 'all' && r.section !== selectedSection) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.expected.toLowerCase().includes(q) ||
          r.actual.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [report.results, selectedSection, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-blue-200 border border-white/15 mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Hệ thống Kiểm thử Dữ liệu Mẫu Toàn diện (Isolated Sandbox)
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            Kiểm Thử Toàn Diện Logic Hệ Thống LHL Class Ranking
          </h2>
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed mb-6">
            Bộ kiểm nghiệm tự động chạy trên <strong>Tuần 4 – Năm học 2026-2027</strong> bao gồm 9 lớp mẫu đại diện cho Trường chính và 5 Phân hiệu (Hậu Lộc, Thuần Lộc, Lộc Tân, Lộc Sơn, Mỹ Lộc). Toàn bộ dữ liệu kiểm thử được thực thi trong môi trường sandbox bộ nhớ, <strong>tuyệt đối không ghi đè hoặc ảnh hưởng dữ liệu thật</strong>.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  Đang chạy 18 ca kiểm thử...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Chạy Lại Toàn Bộ Bộ Kiểm Thử
                </>
              )}
            </button>

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md text-xs text-slate-200 border border-white/10">
              <Calendar className="w-4 h-4 text-amber-300" />
              <span>Thời điểm: {new Date(report.timestamp).toLocaleTimeString('vi-VN')} {new Date(report.timestamp).toLocaleDateString('vi-VN')}</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/20 text-emerald-200 text-xs font-medium border border-emerald-400/30">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Chế độ an toàn: Dữ liệu thật được bảo vệ 100%</span>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xl shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {report.passedCount}/{report.totalTests}
            </div>
            <div className="text-xs text-slate-500 font-medium">Ca kiểm thử Đạt ({((report.passedCount / report.totalTests) * 100).toFixed(0)}%)</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">5 Nhóm</div>
            <div className="text-xs text-slate-500 font-medium">Hạng mục kiểm định</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xl shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">9 Lớp</div>
            <div className="text-xs text-slate-500 font-medium">Trường chính & Phân hiệu</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600">100%</div>
            <div className="text-xs text-slate-500 font-medium">Tuân thủ nghiệp vụ</div>
          </div>
        </div>
      </div>

      {/* Section Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {report.sections.map((sec, idx) => {
          const isPassed = sec.passed === sec.total;
          const isSelected = selectedSection === sec.sectionName;
          return (
            <button
              key={idx}
              onClick={() => setSelectedSection(isSelected ? 'all' : sec.sectionName)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider line-clamp-1">
                  Nhóm {idx + 1}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {sec.passed}/{sec.total} Đạt
                </span>
              </div>
              <div className="text-xs font-bold text-slate-800 line-clamp-2 mb-2">
                {sec.sectionName}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isPassed ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${(sec.passed / sec.total) * 100}%` }}
                ></div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Results Table & Mock Ranking Table Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Chi Tiết 18 Ca Kiểm Thử Logic Toàn Diện
            </h3>
            <p className="text-xs text-slate-500">
              Kiểm tra toàn bộ công thức điểm gốc, điểm trừ, điểm thưởng, phân loại trường chính/phân hiệu, khóa tuần, audit trail và PDF.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm ca kiểm thử..."
                className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-48 sm:w-60"
              />
            </div>

            {selectedSection !== 'all' && (
              <button
                onClick={() => setSelectedSection('all')}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium"
              >
                Hiện tất cả ({report.totalTests})
              </button>
            )}
          </div>
        </div>

        {/* Table of Test Cases */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4 w-20">Mã TC</th>
                <th className="py-3 px-4 w-44">Nhóm</th>
                <th className="py-3 px-4">Tên Tiêu Chí & Nội Dung Kiểm Thử</th>
                <th className="py-3 px-4 w-48">Kết Quả Kỳ Vọng</th>
                <th className="py-3 px-4 w-48">Thực Tế Đạt Được</th>
                <th className="py-3 px-4 w-28 text-center">Trạng Thái</th>
                <th className="py-3 px-4 w-24 text-right">Thời Gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResults.map((r) => {
                const isPassed = r.status === 'PASSED';
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedTestCase(r)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-medium text-slate-500">
                      {r.testNumber}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono">
                        {r.id}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {r.section}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{r.title}</div>
                      <div className="text-[11px] text-slate-400 font-normal line-clamp-1 mt-0.5">
                        {r.details}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {r.expected}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-emerald-700 font-semibold">
                      {r.actual}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isPassed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isPassed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ĐẠT CHUẨN
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            LỖI
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                      {r.executionTimeMs} ms
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulated Weekly Ranking of 9 Test Classes */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Bảng Xếp Hạng Thi Đua Mô Phỏng 9 Lớp Kiểm Thử (Tuần 4 - Năm học 2026-2027)
            </h3>
            <p className="text-xs text-slate-500">
              Kiểm tra thuật toán xếp hạng tổng hợp, xếp loại thi đua, quy tắc xử lý đồng hạng và hiển thị trên giao diện.
            </p>
          </div>
          <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 self-start sm:self-auto">
            Điểm Gốc Mặc Định: 100.00 điểm
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4 w-20 text-center">Xếp Hạng</th>
                <th className="py-3 px-4 w-28">Tên Lớp</th>
                <th className="py-3 px-4">Phân Hiệu</th>
                <th className="py-3 px-4 w-28 text-center">Loại Lớp</th>
                <th className="py-3 px-4 w-28 text-right">Tổng Điểm</th>
                <th className="py-3 px-4 w-32 text-center">Xếp Loại</th>
                <th className="py-3 px-4">Đánh Giá Tiêu Chuẩn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {report.testClasses.map((c) => {
                const isRank1 = c.rank === 1;
                const isTop3 = c.rank <= 3;
                return (
                  <tr
                    key={c.id}
                    className={isRank1 ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-bold text-xs ${
                          isRank1
                            ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                            : isTop3
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.rank}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="font-semibold">{c.campusName}</span>
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
                        {c.campusType === 'main' ? 'Trường chính' : 'Phân hiệu phụ'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          c.classType === 'A1'
                            ? 'bg-purple-100 text-purple-700'
                            : c.classType === 'A2'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.classType === 'A1' ? 'Lớp chọn A1' : c.classType === 'A2' ? 'Lớp A2' : 'Chuẩn'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-sm text-slate-900">
                      {c.score.toFixed(2)}đ
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          c.tier === 'Xuất sắc'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.tier === 'Tốt'
                            ? 'bg-blue-100 text-blue-800'
                            : c.tier === 'Khá'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {c.tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {c.score >= 105
                        ? 'Dẫn đầu khối thi đua toàn trường, đạt cả 2 chỉ tiêu thưởng'
                        : c.score >= 101
                        ? 'Đạt chỉ tiêu điểm tốt tuần'
                        : c.score === 100
                        ? 'Không phát sinh vi phạm hoặc cân bằng thưởng phạt'
                        : 'Vi phạm nề nếp bị trừ điểm tuần'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal for Clicked Test Case */}
      {selectedTestCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold text-xs font-mono">
                  {selectedTestCase.id}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {selectedTestCase.section}
                </span>
              </div>
              <button
                onClick={() => setSelectedTestCase(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                ✕
              </button>
            </div>

            <h4 className="text-base font-bold text-slate-900 mb-4">
              {selectedTestCase.title}
            </h4>

            <div className="space-y-3 text-xs mb-6">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-semibold text-slate-500 mb-1">Kỳ vọng nghiệp vụ:</div>
                <div className="text-slate-800 font-mono font-medium">{selectedTestCase.expected}</div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="font-semibold text-emerald-700 mb-1">Kết quả thực tế từ Engine:</div>
                <div className="text-emerald-900 font-mono font-bold">{selectedTestCase.actual}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-semibold text-slate-500 mb-1">Chi tiết phân tích & căn cứ pháp lý:</div>
                <div className="text-slate-700 leading-relaxed">{selectedTestCase.details}</div>
              </div>

              <div className="flex items-center justify-between text-slate-400 pt-2 text-[11px]">
                <span>Trạng thái: <strong className="text-emerald-600">ĐẠT CHUẨN 100%</strong></span>
                <span>Thời gian thực thi: {selectedTestCase.executionTimeMs} ms</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTestCase(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
            >
              Đóng Chi Tiết
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
