import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PrintReportModal } from '../common/PrintReportModal';
import { ZaloReportModal } from '../common/ZaloReportModal';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Award,
  School,
  Printer,
  Calendar,
  PieChart,
  Layers,
  Download,
  FileSpreadsheet,
  LineChart,
  Share2,
} from 'lucide-react';

export const ReportsAnalytics: React.FC = () => {
  const {
    campuses,
    classes,
    scoreLogs,
    selectedWeek,
    setSelectedWeek,
    maxWeeks,
    settings,
    getWeeklyRankings,
    exportCurrentRankingsExcel,
    exportOfflineStandbyWorkbook,
  } = useApp();

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showZaloModal, setShowZaloModal] = useState(false);
  const [selectedClassTrendId, setSelectedClassTrendId] = useState<string>(classes[0]?.id || '');

  const rankings = useMemo(() => {
    return getWeeklyRankings(selectedWeek, 'all', 'all');
  }, [getWeeklyRankings, selectedWeek]);

  // Multi-week trend calculation for all weeks (1 to maxWeeks)
  const multiWeekTrend = useMemo(() => {
    const weeksList = Array.from({ length: maxWeeks }, (_, i) => i + 1);
    return weeksList.map((w) => {
      const wRanks = getWeeklyRankings(w, 'all', 'all');
      const avg =
        wRanks.length > 0
          ? Number((wRanks.reduce((sum, r) => sum + r.totalScore, 0) / wRanks.length).toFixed(1))
          : 100;
      return {
        week: w,
        avgScore: avg,
        totalClasses: wRanks.length,
      };
    });
  }, [getWeeklyRankings, maxWeeks]);

  // Specific class trend across weeks
  const classTrendData = useMemo(() => {
    if (!selectedClassTrendId) return [];
    const weeksList = Array.from({ length: maxWeeks }, (_, i) => i + 1);
    return weeksList.map((w) => {
      const wRanks = getWeeklyRankings(w, 'all', 'all');
      const index = wRanks.findIndex((r) => r.classItem.id === selectedClassTrendId);
      const found = index !== -1 ? wRanks[index] : null;
      return {
        week: w,
        score: found ? found.totalScore : 100,
        tier: found ? found.performanceTier : 'Chưa có',
        rank: index !== -1 ? index + 1 : '-',
      };
    });
  }, [getWeeklyRankings, maxWeeks, selectedClassTrendId]);

  // Campus comparison data
  const campusStats = useMemo(() => {
    return campuses.map((camp) => {
      const campRanks = rankings.filter((r) => r.campus.id === camp.id);
      const avg =
        campRanks.length > 0
          ? Number((campRanks.reduce((s, r) => s + r.totalScore, 0) / campRanks.length).toFixed(1))
          : 100;
      return {
        campus: camp,
        classCount: campRanks.length,
        avgScore: avg,
        highestScore: campRanks[0]?.totalScore || 100,
        lowestScore: campRanks[campRanks.length - 1]?.totalScore || 100,
      };
    });
  }, [campuses, rankings]);

  // Grade comparison data
  const gradeStats = useMemo(() => {
    return [6, 7, 8, 9].map((gr) => {
      const grRanks = rankings.filter((r) => r.classItem.grade === gr);
      const avg =
        grRanks.length > 0
          ? Number((grRanks.reduce((s, r) => s + r.totalScore, 0) / grRanks.length).toFixed(1))
          : 100;
      return {
        grade: gr,
        classCount: grRanks.length,
        avgScore: avg,
      };
    });
  }, [rankings]);

  // Top Violations across current week logs
  const topViolations = useMemo(() => {
    const weekLogs = scoreLogs.filter(
      (l) => Number(l.week) === Number(selectedWeek) && (l.type === 'penalty' || l.totalPoints < 0)
    );
    const map = new Map<string, { code: string; name: string; category: string; count: number; points: number }>();

    weekLogs.forEach((l) => {
      const existing = map.get(l.criteriaCode) || {
        code: l.criteriaCode,
        name: l.criteriaName,
        category: l.category,
        count: 0,
        points: 0,
      };
      existing.count += l.quantity;
      existing.points += Math.abs(l.totalPoints);
      map.set(l.criteriaCode, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  }, [scoreLogs, selectedWeek]);

  // Top Honors / Bonuses across current week logs
  const topBonuses = useMemo(() => {
    const weekLogs = scoreLogs.filter(
      (l) => Number(l.week) === Number(selectedWeek) && (l.type === 'bonus' || l.totalPoints > 0)
    );
    const map = new Map<string, { code: string; name: string; category: string; count: number; points: number }>();

    weekLogs.forEach((l) => {
      const existing = map.get(l.criteriaCode) || {
        code: l.criteriaCode,
        name: l.criteriaName,
        category: l.category,
        count: 0,
        points: 0,
      };
      existing.count += l.quantity;
      existing.points += Math.abs(l.totalPoints);
      map.set(l.criteriaCode, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  }, [scoreLogs, selectedWeek]);

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Xuất sắc': 0,
      'Tốt': 0,
      'Khá': 0,
      'Trung bình': 0,
      'Cần cố gắng': 0,
      'Chưa đủ dữ liệu': 0,
    };
    rankings.forEach((r) => {
      if (counts[r.performanceTier] !== undefined) {
        counts[r.performanceTier]++;
      }
    });
    return counts;
  }, [rankings]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">
            <BarChart3 size={16} />
            <span>Phân tích dữ liệu & Báo cáo chuyên sâu BGH</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Báo Cáo & Thống Kê Thi Đua Tuần {selectedWeek}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp dữ liệu đa chiều, biểu đồ xu hướng tiến độ nề nếp toàn trường năm học {settings.academicYear}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
            <Calendar size={15} className="text-slate-500" />
            <span className="text-slate-500 font-medium">Chọn Tuần:</span>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="font-bold text-indigo-700 bg-transparent focus:outline-hidden cursor-pointer"
            >
              {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Tuần {w}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowZaloModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Sao chép mẫu tin nhắn tóm tắt để gửi Zalo / Telegram"
          >
            <Share2 size={14} className="text-blue-600" />
            <span>Sao chép Zalo</span>
          </button>

          <button
            onClick={() => exportCurrentRankingsExcel('week', 'Toàn trường')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Xuất bảng xếp hạng tuần ra Excel"
          >
            <Download size={14} className="text-emerald-700" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={() => exportOfflineStandbyWorkbook(selectedWeek)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            title="Tải sổ chấm điểm tự động bằng Excel phòng ngừa mất mạng"
          >
            <FileSpreadsheet size={14} className="text-slate-600" />
            <span>Sổ Offline</span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
            title="Xem trước văn bản in, in báo cáo hoặc tải file PDF chính thức"
          >
            <Printer size={15} />
            <span>In / Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* Multi-week Trend Overview Chart & Class History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Multi-week Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <LineChart size={18} className="text-indigo-600" />
                <span>Xu hướng Điểm TB Toàn Trường qua các Tuần</span>
              </h3>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-semibold">
                Năm học {settings.academicYear}
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Biểu đồ thể hiện mức điểm trung bình nề nếp chung của toàn bộ {classes.length} lớp qua các tuần đã đánh giá.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-2">
              {multiWeekTrend.map((item) => (
                <div
                  key={item.week}
                  onClick={() => setSelectedWeek(item.week)}
                  className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                    selectedWeek === item.week
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className={`text-[11px] font-semibold ${selectedWeek === item.week ? 'text-indigo-200' : 'text-slate-500'}`}>
                    Tuần {item.week}
                  </div>
                  <div className={`text-base font-black tabular-nums mt-0.5 ${selectedWeek === item.week ? 'text-white' : 'text-indigo-700'}`}>
                    {item.avgScore}
                  </div>
                  <div className={`text-[9px] mt-0.5 ${selectedWeek === item.week ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {item.totalClasses} lớp
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Specific Class Trend Viewer */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-3">
              <TrendingUp size={18} className="text-indigo-600" />
              <span>Tiến độ Riêng của Lớp</span>
            </h3>

            <div className="mb-3">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Chọn lớp theo dõi:</label>
              <select
                value={selectedClassTrendId}
                onChange={(e) => setSelectedClassTrendId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    Lớp {cls.name} (Khối {cls.grade})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {classTrendData.map((ct) => (
                <div key={ct.week} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="font-medium text-slate-600">Tuần {ct.week}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400">Hạng #{ct.rank}</span>
                    <span className="font-extrabold text-indigo-700 tabular-nums">{ct.score} đ</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Campus Comparison Cards & Grade Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campus Comparison */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-4">
            <School size={18} className="text-indigo-600" />
            <span>So sánh Điểm trung bình giữa các Phân hiệu (Tuần {selectedWeek})</span>
          </h3>

          <div className="space-y-4">
            {campusStats.map((st) => {
              const maxScore = 120;
              const percent = Math.min(100, Math.max(10, (st.avgScore / maxScore) * 100));

              return (
                <div key={st.campus.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      {st.campus.name}{' '}
                      <span className="font-normal text-slate-400">({st.classCount} lớp)</span>
                    </span>
                    <span className="font-extrabold text-indigo-700 tabular-nums">
                      {st.avgScore} điểm
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Thấp nhất: {st.lowestScore} đ</span>
                    <span>Cao nhất: {st.highestScore} đ</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grade Comparison & Tier breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-3">
              <Layers size={18} className="text-indigo-600" />
              <span>Điểm TB theo Khối Lớp</span>
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {gradeStats.map((gr) => (
                <div
                  key={gr.grade}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center"
                >
                  <div className="text-xs font-bold text-slate-600">Khối {gr.grade}</div>
                  <div className="text-xl font-black text-indigo-700 tabular-nums mt-0.5">
                    {gr.avgScore} đ
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{gr.classCount} lớp</div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2.5">
              <PieChart size={16} className="text-indigo-600" />
              <span>Phân bổ Danh hiệu ({classes.length} Lớp)</span>
            </h3>
            <div className="space-y-1.5 text-xs">
              {Object.entries(tierCounts).map(([tier, count]) => (
                <div key={tier} className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="font-medium text-slate-700">{tier}</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {count} lớp ({Math.round((count / (classes.length || 1)) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Penalties vs Top 5 Bonuses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top 5 Violations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 text-rose-700">
              <AlertTriangle size={18} />
              <span>Top 5 Lỗi Vi Phạm Nhiều Nhất</span>
            </h3>
            <span className="text-xs text-slate-400">Tuần {selectedWeek}</span>
          </div>

          <div className="space-y-3">
            {topViolations.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Chưa ghi nhận vi phạm trong tuần này.
              </div>
            ) : (
              topViolations.map((v, i) => (
                <div
                  key={v.code}
                  className="p-3 rounded-xl border border-rose-100 bg-rose-50/30 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 leading-tight">{v.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Mã: {v.code} · Danh mục: {v.category}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-rose-700 tabular-nums">-{v.points} điểm</div>
                    <div className="text-[10px] text-slate-400">{v.count} lượt vi phạm</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top 5 Bonuses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 text-emerald-700">
              <Award size={18} />
              <span>Top 5 Thành Tích Biểu Dương</span>
            </h3>
            <span className="text-xs text-slate-400">Tuần {selectedWeek}</span>
          </div>

          <div className="space-y-3">
            {topBonuses.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Chưa ghi nhận thành tích khen thưởng trong tuần này.
              </div>
            ) : (
              topBonuses.map((b, i) => (
                <div
                  key={b.code}
                  className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 leading-tight">{b.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Mã: {b.code} · Danh mục: {b.category}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-emerald-700 tabular-nums">+{b.points} điểm</div>
                    <div className="text-[10px] text-slate-400">{b.count} lượt biểu dương</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Print Report Preview Modal */}
      {showPrintModal && (
        <PrintReportModal
          periodTitle={`Tuần ${selectedWeek}`}
          scopeTitle="Toàn trường"
          rankings={rankings}
          selectedCampusId="all"
          periodType="week"
          periodNumber={selectedWeek}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Zalo Report Modal */}
      {showZaloModal && (
        <ZaloReportModal
          selectedWeek={selectedWeek}
          academicYear={settings.academicYear}
          rankings={rankings}
          onClose={() => setShowZaloModal(false)}
        />
      )}
    </div>
  );
};
