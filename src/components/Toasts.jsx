// 상태가 바뀔 때 화면 위에 잠깐 뜨는 알림 미리보기 (실제 문자 발송은 하지 않음)
export default function Toasts({ items, onSelect }) {
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <button key={t.id} className="toast" style={{ borderLeftColor: t.color }} onClick={() => onSelect(t.drainId)}>
          <span className="toast-tag">알림 미리보기</span>
          <strong>{t.title}</strong>
          <span>{t.text}</span>
        </button>
      ))}
    </div>
  );
}
