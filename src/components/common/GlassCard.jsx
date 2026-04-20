export default function GlassCard({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
