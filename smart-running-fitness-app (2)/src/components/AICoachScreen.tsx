import { useState, useRef, useEffect } from 'react';
import { UserProfile, DailyRecord } from '../types';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

interface Props {
  profile: UserProfile;
  todayRecord: DailyRecord;
  records: DailyRecord[];
  streak: number;
  totalDistance: number;
  totalSessions: number;
  onBack: () => void;
}

// ═══════════════════════════════════════════════
// 👉 GROQ API KEY (miễn phí, 14,400 req/ngày)
//    Lấy tại: https://console.groq.com/keys
// ═══════════════════════════════════════════════
const GROQ_API_KEY = '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';
const isAIConfigured = (GROQ_API_KEY as string) !== 'YOUR_GROQ_API_KEY' && (GROQ_API_KEY as string).length > 10;

// ═══════ Build context ═══════
function buildContext(p: UserProfile, t: DailyRecord, records: DailyRecord[], streak: number, totalDist: number, totalSess: number): string {
  const goalTxt = p.goal === 'lose' ? 'giảm cân' : p.goal === 'maintain' ? 'giữ dáng' : 'tăng thể lực';
  const week = records.slice(-7);
  const wCal = week.reduce((s, r) => s + r.calories, 0);
  const wSteps = week.reduce((s, r) => s + r.steps, 0);
  const wDist = week.reduce((s, r) => s + r.distance, 0);
  const wDays = week.filter(r => r.calories > 0).length;
  const totalCal = records.reduce((s, r) => s + r.calories, 0);
  const totalSteps = records.reduce((s, r) => s + r.steps, 0);
  const waterTarget = 8 + Math.floor(t.activeMinutes / 15);

  return `Bạn là "RunMate AI Coach" - huấn luyện viên chạy bộ AI thông minh.

NGUYÊN TẮC:
- Luôn trả lời bằng tiếng Việt
- Thân thiện, vui vẻ, dùng emoji phù hợp
- Ngắn gọn, dễ hiểu (tối đa 250 từ)
- Dựa trên DỮ LIỆU THẬT của người dùng bên dưới
- Đưa ra lời khuyên CỤ THỂ, có số liệu
- Nếu hỏi ngoài chủ đề sức khỏe/thể thao, nhẹ nhàng hướng về chạy bộ

NGƯỜI DÙNG:
- Tên: ${p.name}, Tuổi: ${p.age}, ${p.gender === 'male' ? 'Nam' : 'Nữ'}
- ${p.height}cm, ${p.weight}kg, BMI: ${p.bmi} (${p.bmiCategory})
- TDEE: ${p.tdee} kcal/ngày, Mục tiêu: ${goalTxt}
- Target: ${p.dailyCalorieTarget} kcal/ngày, ${p.dailyStepTarget} bước/ngày

HÔM NAY:
- Calo: ${t.calories}/${p.dailyCalorieTarget} (${Math.round(t.calories / p.dailyCalorieTarget * 100)}%)
- Bước: ${t.steps}/${p.dailyStepTarget}
- Quãng đường: ${t.distance.toFixed(2)} km, Vận động: ${t.activeMinutes} phút
- Nước: ${t.waterGlasses}/${waterTarget} ly

7 NGÀY GẦN NHẤT: ${wCal} kcal, ${wSteps} bước, ${wDist.toFixed(1)} km, ${wDays}/7 ngày tập

TỔNG: ${totalSess} buổi, ${totalDist.toFixed(1)} km, ${totalCal} kcal, ${totalSteps} bước, Streak: ${streak} ngày

CÔNG THỨC MET: Đi bộ=3.5×kg×giờ, Chạy=9.8×kg×giờ, Xe đạp=7.5×kg×giờ`;
}

// ═══════ Groq Chat ═══════
interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

let chatMessages: ChatMsg[] = [];

async function askAI(
  question: string,
  p: UserProfile, t: DailyRecord, records: DailyRecord[],
  streak: number, totalDist: number, totalSess: number,
): Promise<string> {
  try {
    if (chatMessages.length === 0) {
      chatMessages.push({
        role: 'system',
        content: buildContext(p, t, records, streak, totalDist, totalSess),
      });
    }

    chatMessages.push({ role: 'user', content: question });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: chatMessages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Xin lỗi, mình chưa hiểu. Thử hỏi cách khác nhé!';

    chatMessages.push({ role: 'assistant', content: reply });

    // Giới hạn history
    if (chatMessages.length > 20) {
      chatMessages = [chatMessages[0], ...chatMessages.slice(-16)];
    }

    return reply;
  } catch (err) {
    console.error('AI error:', err);
    return `⚠️ Lỗi kết nối AI. Vui lòng kiểm tra mạng và thử lại.\n\n💡 Dùng nút gợi ý nhanh bên dưới.`;
  }
}

// ═══════ Fallback offline ═══════
function genOffline(q: string, p: UserProfile, t: DailyRecord, records: DailyRecord[], streak: number, totalDist: number, totalSess: number): string {
  const lq = q.toLowerCase();
  const pct = Math.round((t.calories / p.dailyCalorieTarget) * 100);
  const remCal = Math.max(p.dailyCalorieTarget - t.calories, 0);
  const week = records.slice(-7);

  if (lq.match(/chào|hello|hi |hey/))
    return `👋 Chào ${p.name}! (Offline mode)\nDùng nút gợi ý bên dưới!\n💡 Thêm Groq API key để chat AI thông minh.`;

  if (lq.match(/tập gì|nên tập|gợi ý|bài tập/)) {
    if (remCal <= 0) return `✅ Đã đạt mục tiêu!\n• 🧘 Yoga 15p\n• 🚶 Đi dạo nhẹ`;
    return `🏃 Cần thêm ${remCal} kcal:\n• 🚶 Đi bộ: ~${Math.round(remCal / (3.5 * p.weight / 60))}p\n• 🏃 Chạy: ~${Math.round(remCal / (9.8 * p.weight / 60))}p`;
  }

  if (lq.match(/tiến độ|hôm nay/))
    return `📊 Hôm nay:\n🔥 ${t.calories}/${p.dailyCalorieTarget} (${pct}%)\n👣 ${t.steps.toLocaleString()}/${p.dailyStepTarget.toLocaleString()}\n📏 ${t.distance.toFixed(2)} km • ⏱️ ${t.activeMinutes}p\n💧 ${t.waterGlasses} ly • Streak: ${streak}`;

  if (lq.match(/tuần|thống kê/)) {
    const wCal = week.reduce((s, r) => s + r.calories, 0);
    return `📈 7 ngày: ${wCal.toLocaleString()} kcal, ${week.filter(r => r.calories > 0).length}/7 ngày\n🏆 Tổng: ${totalSess} buổi • ${totalDist.toFixed(1)} km`;
  }

  if (lq.match(/lười|động lực|chán|mệt/))
    return `💪 ${p.name}, đã tập ${totalSess} buổi, ${totalDist.toFixed(1)}km! Streak: ${streak}. Chỉ cần 10p đi bộ hôm nay!`;

  return `🤖 Thử: "Gợi ý tập" • "Tiến độ" • "Thống kê tuần" • "Lười quá"`;
}

// ═══════ Quick Buttons ═══════
const quickBtns = [
  { label: '📊 Tiến độ', text: 'Tiến độ hôm nay thế nào?' },
  { label: '🏃 Gợi ý tập', text: 'Hôm nay tôi nên tập bài gì?' },
  { label: '📈 Tuần', text: 'Phân tích thống kê 7 ngày' },
  { label: '🥗 Ăn gì', text: 'Gợi ý bữa ăn hôm nay' },
  { label: '💧 Nước', text: 'Tôi cần uống bao nhiêu nước?' },
  { label: '😊 Động lực', text: 'Cho tôi lời động viên' },
];

// ═══════ Component ═══════
export default function AICoachScreen({ profile, todayRecord, records, streak, totalDistance, totalSessions, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatMessages = []; }, [todayRecord.calories, todayRecord.steps]);

  useEffect(() => {
    if (messages.length === 0) {
      const w = isAIConfigured
        ? `👋 Chào ${profile.name}! Mình là **RunMate AI Coach** ✨\n\nMình biết toàn bộ dữ liệu tập luyện của bạn. Hỏi mình BẤT CỨ ĐIỀU GÌ về chạy bộ, sức khỏe, dinh dưỡng!\n\n💬 Thử: "Hôm nay tập gì?" hoặc "Lên kế hoạch giảm cân"`
        : `👋 Chào ${profile.name}! (Offline)\nDùng nút gợi ý bên dưới.\n💡 Thêm Groq API key để chat AI thông minh.`;
      setMessages([{ id: 'w', role: 'ai', text: w }]);
    }
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const send = async (txt?: string) => {
    const msg = (txt || input).trim();
    if (!msg || typing) return;

    setMessages(prev => [...prev, { id: 'u' + Date.now(), role: 'user', text: msg }]);
    setInput('');
    setTyping(true);

    let reply: string;
    if (isAIConfigured) {
      reply = await askAI(msg, profile, todayRecord, records, streak, totalDistance, totalSessions);
    } else {
      await new Promise(r => setTimeout(r, 500));
      reply = genOffline(msg, profile, todayRecord, records, streak, totalDistance, totalSessions);
    }

    setMessages(prev => [...prev, { id: 'a' + Date.now(), role: 'ai', text: reply }]);
    setTyping(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-5 pt-12 pb-4 shrink-0 rounded-b-3xl">
        <button onClick={onBack} className="mb-3 text-white/80 flex items-center gap-2 text-sm">
          <span>←</span> Quay lại
        </button>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center text-2xl">🤖</div>
          <div className="flex-1">
            <div className="font-bold text-lg">AI Coach</div>
            <div className="text-xs opacity-80 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
              {isAIConfigured ? 'Groq AI ⚡' : 'Offline mode'}
            </div>
          </div>
          {isAIConfigured && <div className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">⚡ AI</div>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'ai' && <span className="text-lg mr-1.5 mt-1">🤖</span>}
            <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
              m.role === 'user' ? 'bg-indigo-500 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
            }`}>{m.text}</div>
          </div>
        ))}
        {typing && (
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🤖</span>
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100 flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 bg-white border-t border-gray-100">
        <div className="px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto">
          {quickBtns.map(b => (
            <button key={b.text} onClick={() => send(b.text)} disabled={typing}
              className="shrink-0 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium active:scale-95 disabled:opacity-40">
              {b.label}
            </button>
          ))}
        </div>
        <div className="px-3 pb-5 pt-1 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={isAIConfigured ? 'Hỏi AI bất cứ điều gì...' : 'Hỏi AI Coach...'}
            disabled={typing}
            className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50" />
          <button onClick={() => send()} disabled={!input.trim() || typing}
            className="bg-indigo-500 text-white w-11 h-11 rounded-2xl flex items-center justify-center text-lg active:scale-90 disabled:opacity-40">
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
